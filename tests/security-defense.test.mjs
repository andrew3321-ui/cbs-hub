import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { evaluateDefenseSignal, parseDefenseSignal } from "../domain/security-defense-policy.ts";
import { activeEdgeBlock, applyCloudflareChangeProposal, approveCloudflareChangeProposal, auditCloudflareDefensePosture, authenticateDefenseIngest, checkCloudflareDefenseConnector, configureCloudflareRateLimitProposal, connectCloudflareDefenseConnector, connectCloudflareWriteCredential, createDefenseConnector, disconnectCloudflareDefenseConnector, expireDefenseActions, ingestDefenseSignal, rollbackCloudflareChangeProposal, runDueCloudflareDefenseSync, runDueCloudflarePostureAudit, syncCloudflareDefenseConnector } from "../app/security-defense-service.ts";

function database() {
  const sqlite = new DatabaseSync(":memory:");
  for (const migration of ["0051_security_validation_agent.sql", "0052_security_agent_execution_queue.sql", "0053_security_agent_model_routing.sql", "0054_security_findings_workflow.sql", "0055_security_campaigns_and_remediation.sql", "0056_continuous_defense.sql", "0057_cloudflare_customer_connector.sql", "0058_cloudflare_security_events.sql", "0059_security_posture_control_plane.sql", "0060_cloudflare_controlled_changes.sql"]) sqlite.exec(readFileSync(new URL(`../drizzle/${migration}`, import.meta.url), "utf8"));
  const DB = {
    prepare(sql) {
      const statement = sqlite.prepare(sql);
      const bound = (values) => ({ first: async () => statement.get(...values) ?? null, all: async () => ({ results: statement.all(...values) }), run: async () => ({ meta: { changes: Number(statement.run(...values).changes) } }) });
      return { ...bound([]), bind: (...values) => bound(values) };
    },
    batch: async (statements) => Promise.all(statements.map((statement) => statement.run())),
  };
  return { sqlite, DB };
}

async function signature(secret, timestamp, body) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${body}`));
  return `sha256=${Array.from(new Uint8Array(signed), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

const signal = (overrides = {}) => ({
  eventId: "waf:event:00000001",
  occurredAt: new Date().toISOString(),
  type: "auth_failure_burst",
  confidence: "high",
  count: 30,
  windowSeconds: 120,
  sourceIp: "203.0.113.9",
  resource: "/api/auth/login",
  summary: "Trinta falhas de autenticação concentradas na mesma origem.",
  attributes: { provider: "cloudflare", rule: "auth-rate" },
  ...overrides,
});

test("defense policy only automates bounded and reversible source blocks", () => {
  const parsed = parseDefenseSignal(signal());
  assert.deepEqual(evaluateDefenseSignal(parsed).response, {
    action: "temporary_source_block",
    autonomy: "automatic_reversible",
    ttlSeconds: 900,
    reason: "Alta confiança, origem identificada e ao menos 20 falhas em até cinco minutos.",
  });
  const destructive = parseDefenseSignal(signal({ eventId: "edr:event:00000002", type: "destructive_activity", sourceIp: null }));
  assert.equal(evaluateDefenseSignal(destructive).response.autonomy, "human_approval");
  assert.equal(evaluateDefenseSignal(destructive).severity, "critical");
  for (const invalid of [
    signal({ type: "run_shell" }),
    signal({ freeTextCommand: "block everything" }),
    signal({ count: 0 }),
    signal({ sourceIp: "not-an-ip" }),
    signal({ occurredAt: new Date(Date.now() - 25 * 3600_000).toISOString() }),
  ]) assert.throws(() => parseDefenseSignal(invalid), /DEFENSE_/);
});

test("signed ingestion is idempotent and applies only local temporary containment", async () => {
  const { sqlite, DB } = database();
  try {
    const env = { DB, SECURITY_INGEST_SIGNING_KEY: "test-signing-key-with-more-than-thirty-two-characters", SECURITY_HASH_KEY: "test-hash-key-with-more-than-thirty-two-characters", PUBLIC_APP_URL: "https://cbshub.com.br" };
    const now = new Date().toISOString();
    const authorizationExpiresAt = new Date(Date.now() + 86400_000).toISOString();
    sqlite.prepare("INSERT INTO security_agent_scopes (id, workspace_id, domain, status, verification_token, created_by_user_id, verified_at, authorization_attested_at, authorization_expires_at, created_at, updated_at) VALUES ('scope', 42, 'cbshub.com.br', 'verified', 'token', 7, ?, ?, ?, ?, ?)").run(now, now, authorizationExpiresAt, now, now);
    const scope = { id: "scope", workspace_id: 42, domain: "cbshub.com.br", status: "verified", authorization_expires_at: authorizationExpiresAt };
    const connector = await createDefenseConnector(env, { scope, actorUserId: 7 });
    assert.equal(connector.enforcement, "cbshub_edge");
    assert.equal(sqlite.prepare("SELECT key_salt FROM security_defense_connectors").get().key_salt.includes(connector.ingestSecret), false);
    const body = JSON.stringify(signal());
    const timestamp = String(Math.floor(Date.now() / 1000));
    const request = new Request("https://cbshub.com.br/api/security/telemetry", { method: "POST", headers: { "x-cbshub-connector-id": connector.id, "x-cbshub-timestamp": timestamp, "x-cbshub-signature": await signature(connector.ingestSecret, timestamp, body) }, body });
    const authenticated = await authenticateDefenseIngest(env, request, body);
    const first = await ingestDefenseSignal(env, authenticated, JSON.parse(body));
    assert.equal(first.duplicate, false);
    assert.equal(first.action.status, "active");
    assert.equal(sqlite.prepare("SELECT status, auto_contained FROM security_defense_incidents").get().status, "contained");
    assert.equal(sqlite.prepare("SELECT source_hash FROM security_defense_signals").get().source_hash.includes("203.0.113.9"), false);
    const duplicate = await ingestDefenseSignal(env, authenticated, JSON.parse(body));
    assert.equal(duplicate.duplicate, true);
    assert.equal(sqlite.prepare("SELECT COUNT(*) total FROM security_defense_signals").get().total, 1);
    const block = await activeEdgeBlock(env, new Request("https://cbshub.com.br/api/auth/login", { headers: { "cf-connecting-ip": "203.0.113.9" } }));
    assert.ok(block?.id);
    sqlite.prepare("UPDATE security_response_actions SET expires_at = datetime('now', '-1 minute')").run();
    assert.equal((await expireDefenseActions(env)).expired, 1);
    assert.equal(sqlite.prepare("SELECT status FROM security_response_actions").get().status, "expired");
    const invalid = new Request("https://cbshub.com.br/api/security/telemetry", { headers: { "x-cbshub-connector-id": connector.id, "x-cbshub-timestamp": timestamp, "x-cbshub-signature": `sha256=${"0".repeat(64)}` } });
    await assert.rejects(authenticateDefenseIngest(env, invalid, body), /DEFENSE_INGEST_UNAUTHORIZED/);
  } finally { sqlite.close(); }
});

test("external scopes remain observe-only until their edge connector exists", async () => {
  const { sqlite, DB } = database();
  try {
    const env = { DB, SECURITY_INGEST_SIGNING_KEY: "test-signing-key-with-more-than-thirty-two-characters", SECURITY_HASH_KEY: "test-hash-key-with-more-than-thirty-two-characters", PUBLIC_APP_URL: "https://cbshub.com.br" };
    const connector = await createDefenseConnector(env, { scope: { id: "external", workspace_id: 42, domain: "client.example", status: "verified", authorization_expires_at: new Date(Date.now() + 86400_000).toISOString() }, actorUserId: 7 });
    assert.equal(connector.enforcement, "observe_only");
    const stored = sqlite.prepare("SELECT mode, enforcement FROM security_defense_connectors").get();
    assert.equal(stored.mode, "observe");
    assert.equal(stored.enforcement, "observe_only");
  } finally { sqlite.close(); }
});

test("Cloudflare customer connector validates the exact zone and encrypts its token", async () => {
  const { sqlite, DB } = database();
  try {
    const token = "cf_customer_token_that_must_never_be_stored_as_plaintext";
    const now = new Date().toISOString();
    const authorizationExpiresAt = new Date(Date.now() + 86400_000).toISOString();
    sqlite.prepare("INSERT INTO security_agent_scopes (id, workspace_id, domain, status, verification_token, created_by_user_id, verified_at, authorization_attested_at, authorization_expires_at, created_at, updated_at) VALUES ('customer-scope', 42, 'customer.example', 'verified', 'token', 7, ?, ?, ?, ?, ?)").run(now, now, authorizationExpiresAt, now, now);
    const scope = { id: "customer-scope", workspace_id: 42, domain: "customer.example", status: "verified", authorization_expires_at: authorizationExpiresAt };
    const env = { DB, SECURITY_CONNECTOR_ENCRYPTION_KEY: "connector-encryption-key-with-more-than-thirty-two-characters", SECURITY_HASH_KEY: "event-hash-key-with-more-than-thirty-two-characters" };
    const eventTime = new Date(Date.now() - 30_000).toISOString();
    const mutations = [];
    let rateRuleset = null;
    const fetcher = async (input, init = {}) => {
      const url = new URL(String(input));
      const method = String(init.method ?? "GET").toUpperCase();
      if (url.pathname.endsWith("/graphql")) {
        const request = JSON.parse(String(init.body));
        assert.match(request.query, /\$start: Time!.*\$end: Time!/);
        assert.doesNotMatch(request.query, /clientRequestQuery|userAgent/);
        if (request.variables.limit === 1) return Response.json({ data: { viewer: { zones: [{ firewallEventsAdaptive: [] }] } } });
        return Response.json({ data: { viewer: { zones: [{ firewallEventsAdaptive: [
          { action: "block", clientCountryName: "BR", clientIP: "198.51.100.8", clientRequestPath: "/login?secret=never", datetime: eventTime, source: "waf" },
          { action: "managed_challenge", clientCountryName: "BR", clientIP: "198.51.100.8", clientRequestPath: "/admin", datetime: new Date(Date.parse(eventTime) + 1_000).toISOString(), source: "waf" },
          { action: "allow", clientCountryName: "BR", clientIP: "198.51.100.9", clientRequestPath: "/", datetime: eventTime, source: "waf" },
        ] }] } } });
      }
      if (url.pathname.endsWith("/user/tokens/verify")) return Response.json({ success: true, result: { id: "token-id", status: "active" } });
      if (url.pathname.endsWith("/zones") && url.searchParams.get("name") === "customer.example") return Response.json({ success: true, result: [{ id: "zone-123", name: "customer.example", status: "active", account: { id: "account-123" } }] });
      if (url.pathname.endsWith("/zones/zone-123/rulesets/phases/http_ratelimit/entrypoint")) return rateRuleset ? Response.json({ success: true, result: rateRuleset }) : Response.json({ success: false }, { status: 404 });
      if (url.pathname.endsWith("/zones/zone-123/rulesets") && method === "POST") {
        const body = JSON.parse(String(init.body));
        mutations.push({ method, path: url.pathname, body });
        rateRuleset = { id: "rate-ruleset", name: body.name, kind: "zone", phase: "http_ratelimit", rules: [{ id: "cbshub-rule", ...body.rules[0] }] };
        return Response.json({ success: true, result: rateRuleset });
      }
      if (url.pathname.endsWith("/zones/zone-123/rulesets/rate-ruleset/rules/cbshub-rule") && method === "DELETE") {
        mutations.push({ method, path: url.pathname });
        rateRuleset.rules = [];
        return Response.json({ success: true, result: rateRuleset });
      }
      if (url.pathname.endsWith("/zones/zone-123/rulesets") && method === "GET") return Response.json({ success: true, result: rateRuleset ? [rateRuleset] : [] });
      if (url.pathname.endsWith("/zones/zone-123")) return Response.json({ success: true, result: { id: "zone-123", name: "customer.example", status: "active", account: { id: "account-123" } } });
      return Response.json({ success: false }, { status: 404 });
    };
    const connector = await connectCloudflareDefenseConnector(env, { scope, actorUserId: 7, apiToken: token }, fetcher);
    assert.equal(connector.provider, "cloudflare");
    assert.equal(connector.enforcement, "observe_only");
    assert.equal(connector.capabilities.rulesetsRead, true);
    assert.equal(connector.capabilities.analyticsRead, true);
    const stored = sqlite.prepare("SELECT * FROM security_defense_connectors WHERE provider = 'cloudflare'").get();
    assert.equal(JSON.stringify(stored).includes(token), false);
    assert.ok(stored.credential_ciphertext);
    assert.equal(stored.external_zone_id, "zone-123");
    const health = await checkCloudflareDefenseConnector(env, { workspaceId: 42, scope, connectorId: connector.id, actorUserId: 7 }, fetcher);
    assert.equal(health.status, "active");
    const firstSync = await syncCloudflareDefenseConnector(env, { workspaceId: 42, scopeId: scope.id, connectorId: connector.id, actorUserId: 7 }, fetcher);
    assert.deepEqual({ fetched: firstSync.fetched, mitigated: firstSync.mitigated, inserted: firstSync.inserted }, { fetched: 3, mitigated: 2, inserted: 2 });
    const secondSync = await syncCloudflareDefenseConnector(env, { workspaceId: 42, scopeId: scope.id, connectorId: connector.id, actorUserId: 7, now: Date.now() + 1_000 }, fetcher);
    assert.equal(secondSync.duplicates, 2);
    assert.equal(sqlite.prepare("SELECT COUNT(*) total FROM security_defense_signals").get().total, 2);
    assert.equal(sqlite.prepare("SELECT occurrence_count FROM security_defense_incidents").get().occurrence_count, 2);
    const syncState = sqlite.prepare("SELECT events_ingested_total, last_sync_at, next_sync_at, sync_lease_until FROM security_defense_connectors WHERE id = ?").get(connector.id);
    assert.equal(syncState.events_ingested_total, 2);
    assert.ok(syncState.last_sync_at && syncState.next_sync_at);
    assert.equal(syncState.sync_lease_until, null);
    assert.equal(JSON.stringify(sqlite.prepare("SELECT source_hash, attributes_json FROM security_defense_signals").all()).includes("198.51.100.8"), false);
    assert.equal(JSON.stringify(sqlite.prepare("SELECT details_json FROM security_defense_events WHERE event_type = 'cloudflare.events_collected'").all()).includes("198.51.100.8"), false);
    sqlite.prepare("UPDATE security_defense_connectors SET next_sync_at = datetime('now', '-1 minute') WHERE id = ?").run(connector.id);
    const scheduled = await runDueCloudflareDefenseSync(env, fetcher);
    assert.deepEqual({ attempted: scheduled.attempted, completed: scheduled.completed, failed: scheduled.failed, inserted: scheduled.inserted }, { attempted: 1, completed: 1, failed: 0, inserted: 0 });
    const posture = await auditCloudflareDefensePosture(env, { workspaceId: 42, scopeId: scope.id, connectorId: connector.id, actorUserId: 7 }, fetcher);
    assert.equal(posture.score, 30);
    assert.equal(posture.grade, "critical");
    assert.equal(sqlite.prepare("SELECT COUNT(*) total FROM security_defense_posture_snapshots").get().total, 1);
    assert.equal(sqlite.prepare("SELECT COUNT(*) total FROM security_defense_change_proposals").get().total, 2);
    const proposals = sqlite.prepare("SELECT preview_json FROM security_defense_change_proposals ORDER BY id").all();
    assert.equal(proposals.every((item) => JSON.parse(item.preview_json).externalMutation === false), true);
    sqlite.prepare("UPDATE security_defense_posture_snapshots SET observed_at = datetime('now', '-2 days')").run();
    const scheduledPosture = await runDueCloudflarePostureAudit(env, fetcher);
    assert.deepEqual(scheduledPosture, { attempted: 1, completed: 1, failed: 0 });
    assert.equal(sqlite.prepare("SELECT COUNT(*) total FROM security_defense_posture_snapshots").get().total, 2);
    assert.equal(sqlite.prepare("SELECT COUNT(*) total FROM security_defense_change_proposals").get().total, 2);
    const rateProposal = sqlite.prepare("SELECT id FROM security_defense_change_proposals WHERE category = 'rate_limit'").get();
    await connectCloudflareWriteCredential(env, { workspaceId: 42, scope, connectorId: connector.id, actorUserId: 7, apiToken: "cf_write_token_separate_from_the_read_credential" }, fetcher);
    assert.equal(mutations.length, 0);
    assert.equal(JSON.stringify(sqlite.prepare("SELECT * FROM security_defense_connectors WHERE id = ?").get(connector.id)).includes("cf_write_token_separate"), false);
    await assert.rejects(configureCloudflareRateLimitProposal(env, { workspaceId: 42, scopeId: scope.id, connectorId: connector.id, proposalId: rateProposal.id, actorUserId: 7, route: "/*", requestsPerMinute: 60 }), /CLOUDFLARE_ROUTE_INVALID/);
    const configured = await configureCloudflareRateLimitProposal(env, { workspaceId: 42, scopeId: scope.id, connectorId: connector.id, proposalId: rateProposal.id, actorUserId: 7, route: "/api/auth/login", requestsPerMinute: 60 });
    assert.equal(configured.preview.action, "managed_challenge");
    assert.equal(configured.preview.mitigationTimeout, 0);
    await approveCloudflareChangeProposal(env, { workspaceId: 42, scopeId: scope.id, connectorId: connector.id, proposalId: rateProposal.id, actorUserId: 7, approvalConfirmed: true });
    assert.equal(mutations.length, 0);
    const applied = await applyCloudflareChangeProposal(env, { workspaceId: 42, scopeId: scope.id, connectorId: connector.id, proposalId: rateProposal.id, actorUserId: 7, executionConfirmed: true }, fetcher);
    assert.equal(applied.verified, true);
    assert.equal(mutations.length, 1);
    assert.equal(mutations[0].body.rules[0].expression, '(http.request.uri.path eq "/api/auth/login")');
    assert.equal(mutations[0].body.rules[0].action, "managed_challenge");
    assert.equal(mutations[0].body.rules[0].ratelimit.mitigation_timeout, 0);
    assert.equal(sqlite.prepare("SELECT status, external_ruleset_id, external_rule_id FROM security_defense_change_proposals WHERE id = ?").get(rateProposal.id).status, "applied");
    const rolledBack = await rollbackCloudflareChangeProposal(env, { workspaceId: 42, scopeId: scope.id, connectorId: connector.id, proposalId: rateProposal.id, actorUserId: 7, rollbackConfirmed: true }, fetcher);
    assert.equal(rolledBack.removedRuleId, "cbshub-rule");
    assert.deepEqual(mutations[1], { method: "DELETE", path: "/client/v4/zones/zone-123/rulesets/rate-ruleset/rules/cbshub-rule" });
    assert.equal(sqlite.prepare("SELECT status FROM security_defense_change_proposals WHERE id = ?").get(rateProposal.id).status, "rolled_back");
    sqlite.prepare("UPDATE security_defense_change_proposals SET status = 'draft', base_fingerprint = NULL, external_ruleset_id = NULL, external_rule_id = NULL WHERE id = ?").run(rateProposal.id);
    await configureCloudflareRateLimitProposal(env, { workspaceId: 42, scopeId: scope.id, connectorId: connector.id, proposalId: rateProposal.id, actorUserId: 7, route: "/api/auth/session", requestsPerMinute: 80 });
    await approveCloudflareChangeProposal(env, { workspaceId: 42, scopeId: scope.id, connectorId: connector.id, proposalId: rateProposal.id, actorUserId: 7, approvalConfirmed: true });
    await assert.rejects(applyCloudflareChangeProposal(env, { workspaceId: 42, scopeId: scope.id, connectorId: connector.id, proposalId: rateProposal.id, actorUserId: 7, executionConfirmed: true }, fetcher), /CLOUDFLARE_CONFIGURATION_DRIFT/);
    assert.equal(mutations.length, 2);
    const drifted = sqlite.prepare("SELECT status, apply_error_code FROM security_defense_change_proposals WHERE id = ?").get(rateProposal.id);
    assert.equal(drifted.status, "draft");
    assert.equal(drifted.apply_error_code, "CLOUDFLARE_CONFIGURATION_DRIFT");
    await disconnectCloudflareDefenseConnector(env, { workspaceId: 42, scopeId: scope.id, connectorId: connector.id, actorUserId: 7 });
    const revoked = sqlite.prepare("SELECT status, credential_ciphertext, credential_iv, write_credential_ciphertext, write_credential_iv, external_account_id, external_zone_id FROM security_defense_connectors WHERE id = ?").get(connector.id);
    assert.equal(revoked.status, "revoked");
    assert.equal(revoked.credential_ciphertext, null);
    assert.equal(revoked.credential_iv, null);
    assert.equal(revoked.write_credential_ciphertext, null);
    assert.equal(revoked.write_credential_iv, null);
    assert.equal(revoked.external_account_id, null);
    assert.equal(revoked.external_zone_id, null);
  } finally { sqlite.close(); }
});

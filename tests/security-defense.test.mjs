import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { evaluateDefenseSignal, parseDefenseSignal } from "../domain/security-defense-policy.ts";
import { activeEdgeBlock, authenticateDefenseIngest, checkCloudflareDefenseConnector, connectCloudflareDefenseConnector, createDefenseConnector, disconnectCloudflareDefenseConnector, expireDefenseActions, ingestDefenseSignal } from "../app/security-defense-service.ts";

function database() {
  const sqlite = new DatabaseSync(":memory:");
  for (const migration of ["0051_security_validation_agent.sql", "0052_security_agent_execution_queue.sql", "0053_security_agent_model_routing.sql", "0054_security_findings_workflow.sql", "0055_security_campaigns_and_remediation.sql", "0056_continuous_defense.sql", "0057_cloudflare_customer_connector.sql"]) sqlite.exec(readFileSync(new URL(`../drizzle/${migration}`, import.meta.url), "utf8"));
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
    const env = { DB, SECURITY_CONNECTOR_ENCRYPTION_KEY: "connector-encryption-key-with-more-than-thirty-two-characters" };
    const fetcher = async (input) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/user/tokens/verify")) return Response.json({ success: true, result: { id: "token-id", status: "active" } });
      if (url.pathname.endsWith("/zones") && url.searchParams.get("name") === "customer.example") return Response.json({ success: true, result: [{ id: "zone-123", name: "customer.example", status: "active", account: { id: "account-123" } }] });
      if (url.pathname.endsWith("/zones/zone-123/rulesets")) return Response.json({ success: true, result: [] });
      if (url.pathname.endsWith("/zones/zone-123")) return Response.json({ success: true, result: { id: "zone-123", name: "customer.example", status: "active", account: { id: "account-123" } } });
      return Response.json({ success: false }, { status: 404 });
    };
    const connector = await connectCloudflareDefenseConnector(env, { scope, actorUserId: 7, apiToken: token }, fetcher);
    assert.equal(connector.provider, "cloudflare");
    assert.equal(connector.enforcement, "observe_only");
    assert.equal(connector.capabilities.rulesetsRead, true);
    const stored = sqlite.prepare("SELECT * FROM security_defense_connectors WHERE provider = 'cloudflare'").get();
    assert.equal(JSON.stringify(stored).includes(token), false);
    assert.ok(stored.credential_ciphertext);
    assert.equal(stored.external_zone_id, "zone-123");
    const health = await checkCloudflareDefenseConnector(env, { workspaceId: 42, scope, connectorId: connector.id, actorUserId: 7 }, fetcher);
    assert.equal(health.status, "active");
    await disconnectCloudflareDefenseConnector(env, { workspaceId: 42, scopeId: scope.id, connectorId: connector.id, actorUserId: 7 });
    const revoked = sqlite.prepare("SELECT status, credential_ciphertext, credential_iv, external_account_id, external_zone_id FROM security_defense_connectors WHERE id = ?").get(connector.id);
    assert.equal(revoked.status, "revoked");
    assert.equal(revoked.credential_ciphertext, null);
    assert.equal(revoked.credential_iv, null);
    assert.equal(revoked.external_account_id, null);
    assert.equal(revoked.external_zone_id, null);
  } finally { sqlite.close(); }
});

import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { campaignExecutionReadiness, parseRepositoryTarget, parseSecurityCampaignInput } from "../domain/security-campaign-policy.ts";
import { approveSecurityCampaign, createRemediationProposal, createSecurityCampaign, decideRemediationProposal, dispatchSecurityCampaign } from "../app/security-campaign-service.ts";

const futureCampaign = (now = Date.now()) => ({
  name: "Validação controlada em homologação", environment: "staging", techniques: ["safe_web_crawl", "sast"],
  windowStart: new Date(now + 10 * 60_000).toISOString(), windowEnd: new Date(now + 70 * 60_000).toISOString(),
  maxRequestsPerMinute: 20, maxTotalRequests: 200,
  stopConditions: { errorRatePercent: 10, consecutiveServerErrors: 5, unexpectedAuthentication: true }, authorizationConfirmed: true,
});

test("campaign policy rejects unbounded, destructive and unapproved work", () => {
  const now = Date.now();
  assert.deepEqual(parseSecurityCampaignInput(futureCampaign(now), now).techniques, ["safe_web_crawl", "sast"]);
  for (const mutate of [
    (data) => { data.authorizationConfirmed = false; },
    (data) => { data.techniques = ["brute_force"]; },
    (data) => { data.maxRequestsPerMinute = 61; },
    (data) => { data.environment = "production"; data.maxRequestsPerMinute = 31; },
    (data) => { data.windowEnd = new Date(now + 6 * 3600_000).toISOString(); },
    (data) => { data.stopConditions.unexpectedAuthentication = false; },
    (data) => { data.freeTextCommand = "run anything"; },
  ]) { const data = structuredClone(futureCampaign(now)); mutate(data); assert.throws(() => parseSecurityCampaignInput(data, now), /CAMPAIGN_/); }
  const readiness = campaignExecutionReadiness({ techniques: ["safe_web_crawl", "sast"] }, { isolatedRunner: false, repositoryConnector: false });
  assert.equal(readiness.ready, false);
  assert.deepEqual(readiness.blockers, ["ISOLATED_RUNNER_NOT_CONFIGURED", "REPOSITORY_CONNECTOR_NOT_CONFIGURED"]);
  assert.ok(readiness.blockedCapabilities.includes("data_exfiltration"));
});

test("repository target is fixed to GitHub pull-request flow", () => {
  const valid = { findingId: `saf_${crypto.randomUUID()}`, provider: "github", repository: "acme/portal", baseBranch: "main", approvalConfirmed: true };
  assert.equal(parseRepositoryTarget(valid).strategy, "pull_request_only");
  for (const mutate of [(data) => { data.provider = "shell"; }, (data) => { data.repository = "https://github.com/acme/portal"; }, (data) => { data.baseBranch = "../main"; }, (data) => { data.approvalConfirmed = false; }]) {
    const data = structuredClone(valid); mutate(data); assert.throws(() => parseRepositoryTarget(data), /REMEDIATION_/);
  }
});

test("campaign and remediation lifecycle remains audited without dispatch or external write", async () => {
  const sqlite = new DatabaseSync(":memory:");
  const originalFetch = globalThis.fetch;
  try {
    for (const migration of ["0051_security_validation_agent.sql", "0052_security_agent_execution_queue.sql", "0053_security_agent_model_routing.sql", "0054_security_findings_workflow.sql", "0055_security_campaigns_and_remediation.sql"]) sqlite.exec(readFileSync(new URL(`../drizzle/${migration}`, import.meta.url), "utf8"));
    const DB = {
      prepare(sql) {
        const statement = sqlite.prepare(sql);
        const bound = (values) => ({ first: async () => statement.get(...values) ?? null, all: async () => ({ results: statement.all(...values) }), run: async () => ({ meta: { changes: Number(statement.run(...values).changes) } }) });
        return { ...bound([]), bind: (...values) => bound(values) };
      },
      batch: async (statements) => Promise.all(statements.map((statement) => statement.run())),
    };
    const now = new Date().toISOString();
    const scope = { id: "scope", workspace_id: 42, domain: "example.com", status: "verified", verification_token: "expected", authorization_attested_at: now, authorization_expires_at: new Date(Date.now() + 86400_000).toISOString(), authorization_version: "test", monitoring_enabled: 0 };
    const messages = [];
    const env = { DB, SECURITY_SCAN_QUEUE: { send: async (message) => messages.push(message) } };
    const campaign = await createSecurityCampaign(env, scope, 7, futureCampaign());
    assert.equal(campaign.status, "draft");
    assert.equal(campaign.readiness.ready, false);
    const approved = await approveSecurityCampaign(env, { workspaceId: 42, scope, campaignId: campaign.id, actorUserId: 8, approvalConfirmed: true });
    assert.equal(approved.executionDispatched, false);
    assert.equal(sqlite.prepare("SELECT status FROM security_campaigns").get().status, "approved");
    assert.equal(sqlite.prepare("SELECT COUNT(*) total FROM security_campaign_events").get().total, 2);

    const passiveInput = { ...futureCampaign(), name: "Diagnóstico passivo autorizado", techniques: ["passive_external_posture"] };
    const passive = await createSecurityCampaign(env, scope, 7, passiveInput);
    await approveSecurityCampaign(env, { workspaceId: 42, scope, campaignId: passive.id, actorUserId: 8, approvalConfirmed: true });
    sqlite.prepare("UPDATE security_campaigns SET window_start = ?, window_end = ? WHERE id = ?").run(new Date(Date.now() - 60_000).toISOString(), new Date(Date.now() + 3600_000).toISOString(), passive.id);
    globalThis.fetch = async () => Response.json({ Answer: [{ type: 16, data: '"cbshub-verification=expected"' }] });
    const dispatched = await dispatchSecurityCampaign(env, { workspaceId: 42, scope, campaignId: passive.id, actorUserId: 8, executionConfirmed: true });
    assert.equal(dispatched.status, "queued");
    assert.equal(messages.length, 1);
    assert.match(sqlite.prepare("SELECT agent_job_id FROM security_campaigns WHERE id = ?").get(passive.id).agent_job_id, /^saj_/);

    const findingId = `saf_${crypto.randomUUID()}`;
    sqlite.prepare("INSERT INTO security_findings (id, workspace_id, scope_id, source_job_id, evidence_code, title, severity, status, first_observed_at, last_observed_at) VALUES (?, 42, 'scope', 'job', 'csp', 'CSP ausente', 'high', 'open', ?, ?)").run(findingId, now, now);
    const proposal = await createRemediationProposal(env, { workspaceId: 42, scopeId: "scope", actorUserId: 7, target: { findingId, provider: "github", repository: "acme/portal", baseBranch: "main", approvalConfirmed: true } });
    assert.equal(proposal.externalWritePerformed, false);
    assert.equal(proposal.strategy, "pull_request_only");
    const decision = await decideRemediationProposal(env, { workspaceId: 42, scopeId: "scope", remediationId: proposal.id, actorUserId: 8, decision: "approve", approvalConfirmed: true });
    assert.equal(decision.status, "approved");
    assert.equal(decision.externalWritePerformed, false);
    assert.equal(sqlite.prepare("SELECT COUNT(*) total FROM security_remediation_events").get().total, 2);
  } finally { globalThis.fetch = originalFetch; sqlite.close(); }
});

test("isolated runner receives a signed bounded manifest without arbitrary commands", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    for (const migration of ["0051_security_validation_agent.sql", "0052_security_agent_execution_queue.sql", "0053_security_agent_model_routing.sql", "0054_security_findings_workflow.sql", "0055_security_campaigns_and_remediation.sql", "0056_continuous_defense.sql"]) sqlite.exec(readFileSync(new URL(`../drizzle/${migration}`, import.meta.url), "utf8"));
    const DB = {
      prepare(sql) {
        const statement = sqlite.prepare(sql);
        const bound = (values) => ({ first: async () => statement.get(...values) ?? null, all: async () => ({ results: statement.all(...values) }), run: async () => ({ meta: { changes: Number(statement.run(...values).changes) } }) });
        return { ...bound([]), bind: (...values) => bound(values) };
      },
      batch: async (statements) => Promise.all(statements.map((statement) => statement.run())),
    };
    const requests = [];
    const runner = { fetch: async (request) => { requests.push(request); return Response.json({ jobId: "run_bounded-0001" }, { status: 202 }); } };
    const env = { DB, SECURITY_ACTIVE_RUNNER: runner, SECURITY_RUNNER_SIGNING_KEY: "runner-signing-key-with-more-than-thirty-two-characters" };
    const now = new Date().toISOString();
    const scope = { id: "scope", workspace_id: 42, domain: "example.com", status: "verified", verification_token: "expected", authorization_attested_at: now, authorization_expires_at: new Date(Date.now() + 86400_000).toISOString(), authorization_version: "test", monitoring_enabled: 0 };
    const input = { ...futureCampaign(), name: "TLS seguro em homologação", techniques: ["safe_web_crawl", "tls_configuration_review"] };
    const campaign = await createSecurityCampaign(env, scope, 7, input);
    assert.equal(campaign.readiness.ready, true);
    await approveSecurityCampaign(env, { workspaceId: 42, scope, campaignId: campaign.id, actorUserId: 8, approvalConfirmed: true });
    sqlite.prepare("UPDATE security_campaigns SET window_start = ?, window_end = ? WHERE id = ?").run(new Date(Date.now() - 60_000).toISOString(), new Date(Date.now() + 3600_000).toISOString(), campaign.id);
    const dispatched = await dispatchSecurityCampaign(env, { workspaceId: 42, scope, campaignId: campaign.id, actorUserId: 8, executionConfirmed: true });
    assert.equal(dispatched.executor, "isolated_runner");
    assert.equal(requests.length, 1);
    const request = requests[0];
    assert.match(request.headers.get("x-cbshub-signature"), /^sha256=[0-9a-f]{64}$/);
    const manifest = JSON.parse(await request.text());
    assert.deepEqual(manifest.techniques, ["safe_web_crawl", "tls_configuration_review"]);
    assert.deepEqual(manifest.budgets, { requestsPerMinute: 20, totalRequests: 200 });
    assert.equal(Object.hasOwn(manifest, "command"), false);
    assert.equal(sqlite.prepare("SELECT status, executor, runner_job_id FROM security_campaigns").get().runner_job_id, "run_bounded-0001");
  } finally { sqlite.close(); }
});

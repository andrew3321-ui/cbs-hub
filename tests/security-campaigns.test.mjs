import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { campaignExecutionReadiness, guidedWebCampaignInput, parseRepositoryTarget, parseSecurityCampaignInput } from "../domain/security-campaign-policy.ts";
import { approveSecurityCampaign, createRemediationProposal, createSecurityCampaign, decideRemediationProposal, dispatchDueGuidedSecurityCampaigns, dispatchSecurityCampaign, startGuidedSecurityCampaign } from "../app/security-campaign-service.ts";

const futureCampaign = (now = Date.now()) => ({
  name: "Validação controlada em homologação", environment: "staging", techniques: ["safe_web_crawl", "tls_configuration_review"],
  windowStart: new Date(now + 10 * 60_000).toISOString(), windowEnd: new Date(now + 70 * 60_000).toISOString(),
  maxRequestsPerMinute: 20, maxTotalRequests: 20,
  stopConditions: { errorRatePercent: 10, consecutiveServerErrors: 5, unexpectedAuthentication: true }, authorizationConfirmed: true,
});

test("campaign policy rejects unbounded, destructive and unapproved work", () => {
  const now = Date.now();
  assert.deepEqual(parseSecurityCampaignInput(futureCampaign(now), now).techniques, ["safe_web_crawl", "tls_configuration_review"]);
  assert.deepEqual(parseSecurityCampaignInput(guidedWebCampaignInput(now), now).techniques, ["safe_web_crawl", "tls_configuration_review", "web_control_probe"]);
  assert.equal(guidedWebCampaignInput(now).maxTotalRequests, 14);
  assert.deepEqual(parseSecurityCampaignInput({ ...futureCampaign(now), techniques: ["safe_web_crawl", "tls_configuration_review", "web_control_probe"] }, now).techniques, ["safe_web_crawl", "tls_configuration_review", "web_control_probe"]);
  for (const mutate of [
    (data) => { data.authorizationConfirmed = false; },
    (data) => { data.techniques = ["brute_force"]; },
    (data) => { data.techniques = ["safe_web_crawl", "sast"]; },
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
    for (const migration of ["0051_security_validation_agent.sql", "0052_security_agent_execution_queue.sql", "0053_security_agent_model_routing.sql", "0054_security_findings_workflow.sql", "0055_security_campaigns_and_remediation.sql", "0056_continuous_defense.sql", "0063_github_repository_security.sql", "0065_guided_security_campaigns.sql", "0066_campaign_specialist_pipeline.sql", "0067_agentic_pentest_sessions.sql"]) sqlite.exec(readFileSync(new URL(`../drizzle/${migration}`, import.meta.url), "utf8"));
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
    await assert.rejects(() => createRemediationProposal(env, { workspaceId: 42, scopeId: "scope", actorUserId: 7, target: { findingId, provider: "github", repository: "acme/portal", baseBranch: "main", approvalConfirmed: true } }), /REMEDIATION_REPOSITORY_NOT_AUTHORIZED/);
    sqlite.prepare("INSERT INTO github_connections (id, workspace_id, installation_id, account_login, status, created_by_user_id, created_at, updated_at) VALUES ('connection', 42, 100, 'acme', 'active', 7, ?, ?)").run(now, now);
    sqlite.prepare("INSERT INTO security_repositories (id, workspace_id, connection_id, github_id, full_name, default_branch, enabled, authorized_until, created_at, updated_at) VALUES ('repo', 42, 'connection', 101, 'acme/portal', 'main', 1, ?, ?, ?)").run(new Date(Date.now() + 86400_000).toISOString(), now, now);
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
    for (const migration of ["0051_security_validation_agent.sql", "0052_security_agent_execution_queue.sql", "0053_security_agent_model_routing.sql", "0054_security_findings_workflow.sql", "0055_security_campaigns_and_remediation.sql", "0056_continuous_defense.sql", "0062_isolated_security_runner.sql", "0065_guided_security_campaigns.sql", "0066_campaign_specialist_pipeline.sql", "0067_agentic_pentest_sessions.sql"]) sqlite.exec(readFileSync(new URL(`../drizzle/${migration}`, import.meta.url), "utf8"));
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
    const input = { ...futureCampaign(), name: "Controles web em homologação", techniques: ["safe_web_crawl", "tls_configuration_review", "web_control_probe"] };
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
    assert.deepEqual(manifest.techniques, ["safe_web_crawl", "tls_configuration_review", "web_control_probe"]);
    assert.deepEqual(manifest.budgets, { requestsPerMinute: 20, totalRequests: 20 });
    assert.equal(Object.hasOwn(manifest, "command"), false);
    assert.equal(sqlite.prepare("SELECT status, executor, runner_job_id FROM security_campaigns").get().runner_job_id, "run_bounded-0001");
    runner.fetch = async () => Response.json({ error: "Manifest rejected.", code: "RUNNER_POLICY_MISMATCH" }, { status: 400 });
    const rejected = await createSecurityCampaign(env, scope, 7, { ...input, name: "Validação incompatível" });
    await approveSecurityCampaign(env, { workspaceId: 42, scope, campaignId: rejected.id, actorUserId: 8, approvalConfirmed: true });
    sqlite.prepare("UPDATE security_campaigns SET window_start = ?, window_end = ? WHERE id = ?").run(new Date(Date.now() - 60_000).toISOString(), new Date(Date.now() + 3600_000).toISOString(), rejected.id);
    await assert.rejects(dispatchSecurityCampaign(env, { workspaceId: 42, scope, campaignId: rejected.id, actorUserId: 8, executionConfirmed: true }), /CAMPAIGN_RUNNER_POLICY_MISMATCH/);
    const rejectedState = sqlite.prepare("SELECT status, runner_job_id FROM security_campaigns WHERE id = ?").get(rejected.id);
    assert.equal(rejectedState.status, "approved");
    assert.equal(rejectedState.runner_job_id, null);
  } finally { sqlite.close(); }
});

test("guided web validation requires consent, schedules once, and rechecks authorization before runner dispatch", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    for (const migration of ["0051_security_validation_agent.sql", "0052_security_agent_execution_queue.sql", "0053_security_agent_model_routing.sql", "0054_security_findings_workflow.sql", "0055_security_campaigns_and_remediation.sql", "0056_continuous_defense.sql", "0062_isolated_security_runner.sql", "0065_guided_security_campaigns.sql", "0066_campaign_specialist_pipeline.sql", "0067_agentic_pentest_sessions.sql"]) sqlite.exec(readFileSync(new URL(`../drizzle/${migration}`, import.meta.url), "utf8"));
    const DB = {
      prepare(sql) {
        const statement = sqlite.prepare(sql);
        const bound = (values) => ({ first: async () => statement.get(...values) ?? null, all: async () => ({ results: statement.all(...values) }), run: async () => ({ meta: { changes: Number(statement.run(...values).changes) } }) });
        return { ...bound([]), bind: (...values) => bound(values) };
      },
      batch: async (statements) => Promise.all(statements.map((statement) => statement.run())),
    };
    const now = new Date().toISOString();
    const expires = new Date(Date.now() + 86400_000).toISOString();
    sqlite.prepare("INSERT INTO security_agent_scopes (id, workspace_id, domain, status, verification_token, created_by_user_id, authorization_attested_at, authorization_expires_at) VALUES ('scope', 42, 'example.com', 'verified', 'expected', 7, ?, ?)").run(now, expires);
    const scope = { id: "scope", workspace_id: 42, domain: "example.com", status: "verified", authorization_expires_at: expires };
    const requests = [];
    const env = { DB, SECURITY_ACTIVE_RUNNER: { fetch: async (request) => { requests.push(request); return Response.json({ jobId: `run_guided-${String(requests.length).padStart(4, "0")}` }, { status: 202 }); } }, SECURITY_RUNNER_SIGNING_KEY: "runner-signing-key-with-more-than-thirty-two-characters" };
    await assert.rejects(startGuidedSecurityCampaign(env, scope, 7, false), /CAMPAIGN_EXECUTION_CONFIRMATION_REQUIRED/);
    assert.equal(sqlite.prepare("SELECT COUNT(*) total FROM security_campaigns").get().total, 0);
    const campaign = await startGuidedSecurityCampaign(env, scope, 7, true);
    assert.equal(campaign.status, "approved");
    await assert.rejects(startGuidedSecurityCampaign(env, scope, 7, true), /CAMPAIGN_GUIDED_ALREADY_ACTIVE/);
    assert.deepEqual(await dispatchDueGuidedSecurityCampaigns(env), { checked: 0, queued: 0, failed: 0 });
    assert.equal(requests.length, 0);
    sqlite.prepare("UPDATE security_campaigns SET window_start = ?, window_end = ? WHERE id = ?").run(new Date(Date.now() - 60_000).toISOString(), new Date(Date.now() + 3600_000).toISOString(), campaign.id);
    await assert.rejects(dispatchSecurityCampaign(env, { workspaceId: 42, scope, campaignId: campaign.id, actorUserId: 7, executionConfirmed: true }), /CAMPAIGN_STATE_INVALID/);
    assert.deepEqual(await dispatchDueGuidedSecurityCampaigns(env), { checked: 1, queued: 1, failed: 0 });
    assert.equal(requests.length, 1);
    assert.equal(JSON.parse(await requests[0].text()).budgets.totalRequests, 14);
    assert.deepEqual(await dispatchDueGuidedSecurityCampaigns(env), { checked: 0, queued: 0, failed: 0 });
    assert.equal(requests.length, 1);
    sqlite.prepare("UPDATE security_campaigns SET status = 'completed' WHERE id = ?").run(campaign.id);
    const revoked = await startGuidedSecurityCampaign(env, scope, 7, true);
    sqlite.prepare("UPDATE security_campaigns SET window_start = ? WHERE id = ?").run(new Date(Date.now() - 60_000).toISOString(), revoked.id);
    sqlite.prepare("UPDATE security_agent_scopes SET status = 'revoked' WHERE id = 'scope'").run();
    assert.deepEqual(await dispatchDueGuidedSecurityCampaigns(env), { checked: 1, queued: 0, failed: 1 });
    assert.equal(requests.length, 1);
    assert.equal(sqlite.prepare("SELECT status, runner_error_code FROM security_campaigns WHERE id = ?").get(revoked.id).runner_error_code, "CAMPAIGN_SCOPE_NOT_AUTHORIZED");
  } finally { sqlite.close(); }
});

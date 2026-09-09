import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { hmacHex, parseRunnerManifest, SECURITY_RUNNER_MAX_REQUESTS, verifyRunnerSignature } from "../domain/security-runner-policy.ts";
import { executeRunnerManifest } from "../security-runner/executor.ts";
import { enqueue, processJob } from "../security-runner/worker.ts";
import { reconcileSecurityRunnerCampaigns } from "../app/security-campaign-service.ts";

const manifestInput = (now = Date.now()) => ({
  version: 1,
  campaignId: `sac_${crypto.randomUUID()}`,
  workspaceId: 42,
  scope: { domain: "example.com" },
  name: "Validação web autorizada",
  environment: "staging",
  techniques: ["safe_web_crawl", "tls_configuration_review"],
  policyVersion: "security-campaign-policy.2026-09-08.v2",
  window: { start: new Date(now - 60_000).toISOString(), end: new Date(now + 3600_000).toISOString() },
  budgets: { requestsPerMinute: 60, totalRequests: 10 },
  stopConditions: { errorRatePercent: 20, consecutiveServerErrors: 3, unexpectedAuthentication: true },
});

test("runner validates the exact signed manifest and enforces its independent hard cap", async () => {
  const now = Date.now();
  const manifest = manifestInput(now);
  assert.equal(parseRunnerManifest(manifest, now).scope.domain, "example.com");
  assert.throws(() => parseRunnerManifest({ ...manifest, techniques: ["brute_force"] }, now), /RUNNER_TECHNIQUES_INVALID/);
  assert.throws(() => parseRunnerManifest({ ...manifest, techniques: ["toString"] }, now), /RUNNER_TECHNIQUES_INVALID/);
  assert.throws(() => parseRunnerManifest({ ...manifest, budgets: { ...manifest.budgets, totalRequests: SECURITY_RUNNER_MAX_REQUESTS + 1 } }, now), /RUNNER_BUDGET_INVALID/);
  const body = JSON.stringify(manifest);
  const timestamp = String(Math.floor(now / 1000));
  const secret = "runner-test-signing-key-with-at-least-thirty-two-characters";
  const signature = `sha256=${await hmacHex(secret, `${timestamp}.${body}`)}`;
  assert.equal(await verifyRunnerSignature(secret, timestamp, signature, body, now), true);
  assert.equal(await verifyRunnerSignature(secret, timestamp, signature, `${body} `, now), false);
});

test("safe runner crawls only related HTTPS pages and persists aggregate evidence", async () => {
  const manifest = parseRunnerManifest(manifestInput());
  const targetRequests = [];
  const fetcher = async (input, init = {}) => {
    const url = new URL(String(input));
    if (url.hostname === "cloudflare-dns.com") return Response.json({ Answer: url.searchParams.get("type") === "A" ? [{ type: 1, data: "93.184.216.34" }] : [] });
    targetRequests.push({ url: url.toString(), method: init.method });
    if (url.pathname === "/robots.txt") return new Response("User-agent: *\nDisallow: /private", { headers: { "Content-Type": "text/plain" } });
    if (url.pathname === "/about") return new Response("<html>ok</html>", { headers: { "Content-Type": "text/html", "Strict-Transport-Security": "max-age=31536000" } });
    return new Response('<a href="/about">About</a><a href="/logout">Logout</a><a href="/private/data">Private</a><a href="https://example.com:8443/debug">Other port</a><a href="https://other.example.net/">Other</a>', { headers: { "Content-Type": "text/html", "Strict-Transport-Security": "max-age=31536000", "Content-Security-Policy": "default-src self" } });
  };
  const result = await executeRunnerManifest(manifest, { fetcher, sleep: async () => undefined });
  assert.equal(result.outcome, "completed");
  assert.equal(result.transport?.httpsReachable, true);
  assert.equal(result.crawl?.htmlPages, 2);
  assert.equal(result.crawl?.hstsCoveragePercent, 100);
  assert.equal(result.crawl?.cspCoveragePercent, 50);
  assert.equal(result.budget.consumed, 3);
  assert.deepEqual(targetRequests.map((item) => new URL(item.url).pathname), ["/robots.txt", "/", "/about"]);
  assert.equal(JSON.stringify(result).includes("/about"), false);
});

test("runner service queues an idempotent job only after signature and policy validation", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    for (const migration of ["0051_security_validation_agent.sql", "0052_security_agent_execution_queue.sql", "0053_security_agent_model_routing.sql", "0054_security_findings_workflow.sql", "0055_security_campaigns_and_remediation.sql", "0056_continuous_defense.sql", "0062_isolated_security_runner.sql"]) sqlite.exec(readFileSync(new URL(`../drizzle/${migration}`, import.meta.url), "utf8"));
    const DB = {
      prepare(sql) {
        const statement = sqlite.prepare(sql);
        const bound = (values) => ({ first: async () => statement.get(...values) ?? null, all: async () => ({ results: statement.all(...values) }), run: async () => ({ meta: { changes: Number(statement.run(...values).changes) } }) });
        return { ...bound([]), bind: (...values) => bound(values) };
      },
      batch: async (statements) => Promise.all(statements.map((statement) => statement.run())),
    };
    const queued = [];
    const secret = "runner-test-signing-key-with-at-least-thirty-two-characters";
    const body = JSON.stringify(manifestInput());
    const timestamp = String(Math.floor(Date.now() / 1000));
    const request = async () => new Request("https://security-runner.internal/v1/jobs", { method: "POST", headers: { "Content-Type": "application/json", "X-CBSHub-Timestamp": timestamp, "X-CBSHub-Signature": `sha256=${await hmacHex(secret, `${timestamp}.${body}`)}` }, body });
    const response = await enqueue(await request(), { DB, SECURITY_RUNNER_SIGNING_KEY: secret, ACTIVE_RUN_QUEUE: { send: async (message) => queued.push(message) } });
    assert.equal(response.status, 202);
    const payload = await response.json();
    assert.match(payload.jobId, /^run_[0-9a-f-]{36}$/);
    assert.equal(queued.length, 1);
    const duplicate = await enqueue(await request(), { DB, SECURITY_RUNNER_SIGNING_KEY: secret, ACTIVE_RUN_QUEUE: { send: async (message) => queued.push(message) } });
    assert.equal((await duplicate.json()).idempotent, true);
    assert.equal(queued.length, 1);
    const manifest = JSON.parse(body);
    const scopeId = `sas_${crypto.randomUUID()}`;
    sqlite.prepare(`INSERT INTO security_agent_scopes
      (id, workspace_id, domain, status, verification_token, created_by_user_id, authorization_basis, authorization_attested_at, authorization_expires_at, authorization_version)
      VALUES (?, 42, ?, 'verified', 'verification-token', 1, 'dns_control', datetime('now'), datetime('now', '+1 day'), 'test')`)
      .run(scopeId, manifest.scope.domain);
    sqlite.prepare(`INSERT INTO security_campaigns
      (id, workspace_id, scope_id, name, environment, techniques_json, policy_version, window_start, window_end, max_requests_per_minute, max_total_requests, stop_conditions_json, status, executor, runner_job_id)
      VALUES (?, 42, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'queued', 'isolated_runner', ?)`)
      .run(manifest.campaignId, scopeId, manifest.name, manifest.environment, JSON.stringify(manifest.techniques), manifest.policyVersion, manifest.window.start, manifest.window.end, manifest.budgets.requestsPerMinute, manifest.budgets.totalRequests, JSON.stringify(manifest.stopConditions), payload.jobId);
    const processed = await processJob({ DB, SECURITY_RUNNER_SIGNING_KEY: secret, ACTIVE_RUN_QUEUE: { send: async () => undefined } }, payload.jobId, async (manifest) => ({
      version: "security-runner.test", domain: manifest.scope.domain, techniques: manifest.techniques,
      startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), outcome: "completed", stopReason: null,
      budget: { ...manifest.budgets, consumed: 2 }, requests: { successful: 2, errors: 0, serverErrors: 0, statusCodes: { "200": 2 } },
      transport: { httpsReachable: true, status: 200, hstsObserved: true, cspObserved: true, limitation: "test" }, crawl: null, limitation: "test",
    }));
    assert.equal(processed, "done");
    assert.deepEqual({ ...sqlite.prepare("SELECT status, request_count, error_count FROM security_runner_jobs").get() }, { status: "completed", request_count: 2, error_count: 0 });
    assert.deepEqual(await reconcileSecurityRunnerCampaigns({ DB }, 42), { checked: 1, updated: 1 });
    const campaign = sqlite.prepare("SELECT status, runner_completed_at, runner_result_json FROM security_campaigns").get();
    assert.equal(campaign.status, "completed");
    assert.ok(campaign.runner_completed_at);
    assert.equal(JSON.parse(campaign.runner_result_json).budget.consumed, 2);

    const blockedManifest = manifestInput();
    const blockedBody = JSON.stringify(blockedManifest);
    const blockedTimestamp = String(Math.floor(Date.now() / 1000));
    const blockedRequest = new Request("https://security-runner.internal/v1/jobs", { method: "POST", headers: { "Content-Type": "application/json", "X-CBSHub-Timestamp": blockedTimestamp, "X-CBSHub-Signature": `sha256=${await hmacHex(secret, `${blockedTimestamp}.${blockedBody}`)}` }, body: blockedBody });
    const blockedResponse = await enqueue(blockedRequest, { DB, SECURITY_RUNNER_SIGNING_KEY: secret, ACTIVE_RUN_QUEUE: { send: async (message) => queued.push(message) } });
    const blockedPayload = await blockedResponse.json();
    const blockedScopeId = `sas_${crypto.randomUUID()}`;
    sqlite.prepare(`INSERT INTO security_agent_scopes
      (id, workspace_id, domain, status, verification_token, created_by_user_id, authorization_basis, authorization_attested_at, authorization_expires_at, authorization_version)
      VALUES (?, 42, ?, 'revoked', 'verification-token', 1, 'dns_control', datetime('now'), datetime('now', '+1 day'), 'test')`)
      .run(blockedScopeId, blockedManifest.scope.domain);
    sqlite.prepare(`INSERT INTO security_campaigns
      (id, workspace_id, scope_id, name, environment, techniques_json, policy_version, window_start, window_end, max_requests_per_minute, max_total_requests, stop_conditions_json, status, executor, runner_job_id)
      VALUES (?, 42, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'queued', 'isolated_runner', ?)`)
      .run(blockedManifest.campaignId, blockedScopeId, blockedManifest.name, blockedManifest.environment, JSON.stringify(blockedManifest.techniques), blockedManifest.policyVersion, blockedManifest.window.start, blockedManifest.window.end, blockedManifest.budgets.requestsPerMinute, blockedManifest.budgets.totalRequests, JSON.stringify(blockedManifest.stopConditions), blockedPayload.jobId);
    let executedWithoutAuthorization = false;
    assert.equal(await processJob({ DB, SECURITY_RUNNER_SIGNING_KEY: secret, ACTIVE_RUN_QUEUE: { send: async () => undefined } }, blockedPayload.jobId, async () => { executedWithoutAuthorization = true; throw new Error("unexpected"); }), "done");
    assert.equal(executedWithoutAuthorization, false);
    assert.deepEqual({ ...sqlite.prepare("SELECT status, error_code FROM security_runner_jobs WHERE id = ?").get(blockedPayload.jobId) }, { status: "failed", error_code: "RUNNER_SCOPE_AUTHORIZATION_INVALID" });
    sqlite.prepare("UPDATE security_runner_jobs SET status = 'running', lease_expires_at = ? WHERE id = ?").run(new Date(Date.now() - 3600_000).toISOString(), payload.jobId);
    let replayed = false;
    await processJob({ DB, ACTIVE_RUN_QUEUE: { send: async () => undefined } }, payload.jobId, async () => { replayed = true; throw new Error("unexpected replay"); });
    assert.equal(replayed, false);
    assert.equal(sqlite.prepare("SELECT error_code FROM security_runner_jobs WHERE id = ?").get(payload.jobId).error_code, "RUNNER_EXECUTION_INTERRUPTED");
  } finally { sqlite.close(); }
});

import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { hmacHex, parseRunnerManifest, SECURITY_RUNNER_MAX_REQUESTS, verifyRunnerSignature } from "../domain/security-runner-policy.ts";
import { SECURITY_CAMPAIGN_POLICY_VERSION } from "../domain/security-campaign-policy.ts";
import { executeRunnerManifest, verifyRunnerOwnership } from "../security-runner/executor.ts";
import securityRunnerWorker, { enqueue, processJob } from "../security-runner/worker.ts";
import { reconcileSecurityRunnerCampaigns } from "../app/security-campaign-service.ts";

const manifestInput = (now = Date.now()) => ({
  version: 1,
  campaignId: `sac_${crypto.randomUUID()}`,
  workspaceId: 42,
  scope: { domain: "example.com" },
  name: "Validação web autorizada",
  environment: "staging",
  techniques: ["safe_web_crawl", "tls_configuration_review"],
  policyVersion: SECURITY_CAMPAIGN_POLICY_VERSION,
  window: { start: new Date(now - 60_000).toISOString(), end: new Date(now + 3600_000).toISOString() },
  budgets: { requestsPerMinute: 60, totalRequests: 10 },
  stopConditions: { errorRatePercent: 20, consecutiveServerErrors: 3, unexpectedAuthentication: true },
});

test("runner probes public Worker custom domains through the edge", () => {
  const config = JSON.parse(readFileSync(new URL("../security-runner/wrangler.jsonc", import.meta.url), "utf8"));
  assert.ok(config.compatibility_flags.includes("global_fetch_strictly_public"));
});

test("runner health advertises the campaign policy it accepts", async () => {
  const response = await securityRunnerWorker.fetch(new Request("https://security-runner.internal/health"), { CF_VERSION_METADATA: { id: "test-release" } });
  assert.equal(response.status, 200);
  const state = await response.json();
  assert.equal(state.release, "test-release");
  assert.equal(state.status, "healthy");
  assert.ok(state.supportedPolicyVersions.includes(SECURITY_CAMPAIGN_POLICY_VERSION));
});

test("runner invokes the target fetcher without an incorrect this binding", async () => {
  const manifest = parseRunnerManifest({ ...manifestInput(), techniques: ["tls_configuration_review"], budgets: { requestsPerMinute: 60, totalRequests: 1 } });
  const fetcher = function(input) {
    assert.equal(this, undefined);
    const url = new URL(String(input));
    if (url.hostname === "cloudflare-dns.com") return Promise.resolve(Response.json({ Answer: [{ type: 1, data: "93.184.216.34" }] }));
    return Promise.resolve(new Response(null, { status: 200 }));
  };
  const result = await executeRunnerManifest(manifest, { fetcher });
  assert.equal(result.requests.successful, 1);
  assert.equal(result.transport?.httpsReachable, true);
  assert.deepEqual(result.requests.statusCodes, { "200": 1 });
});

test("runner validates the exact signed manifest and enforces its independent hard cap", async () => {
  const now = Date.now();
  const manifest = manifestInput(now);
  assert.equal(parseRunnerManifest(manifest, now).scope.domain, "example.com");
  assert.throws(() => parseRunnerManifest({ ...manifest, techniques: ["brute_force"] }, now), /RUNNER_TECHNIQUES_INVALID/);
  assert.throws(() => parseRunnerManifest({ ...manifest, techniques: ["toString"] }, now), /RUNNER_TECHNIQUES_INVALID/);
  const legacy = { ...manifest, policyVersion: "security-campaign-policy.2026-09-08.v2" };
  assert.equal(parseRunnerManifest(legacy, now).policyVersion, legacy.policyVersion);
  assert.throws(() => parseRunnerManifest({ ...legacy, techniques: ["web_control_probe"] }, now), /RUNNER_TECHNIQUES_INVALID/);
  assert.throws(() => parseRunnerManifest({ ...manifest, policyVersion: "untrusted-policy" }, now), /RUNNER_POLICY_MISMATCH/);
  assert.throws(() => parseRunnerManifest({ ...manifest, budgets: { ...manifest.budgets, totalRequests: SECURITY_RUNNER_MAX_REQUESTS + 1 } }, now), /RUNNER_BUDGET_INVALID/);
  const body = JSON.stringify(manifest);
  const timestamp = String(Math.floor(now / 1000));
  const secret = "runner-test-signing-key-with-at-least-thirty-two-characters";
  const signature = `sha256=${await hmacHex(secret, `${timestamp}.${body}`)}`;
  assert.equal(await verifyRunnerSignature(secret, timestamp, signature, body, now), true);
  assert.equal(await verifyRunnerSignature(secret, timestamp, signature, `${body} `, now), false);
});

test("web control probe uses only fixed HEAD and OPTIONS and never persists cookie values", async () => {
  const manifest = parseRunnerManifest({ ...manifestInput(), techniques: ["web_control_probe"] });
  const targetRequests = [];
  const fetcher = async (input, init = {}) => {
    const url = new URL(String(input));
    if (url.hostname === "cloudflare-dns.com") return Response.json({ Answer: url.searchParams.get("type") === "A" ? [{ type: 1, data: "93.184.216.34" }] : [] });
    targetRequests.push({ url: url.toString(), ...init });
    if (init.method === "HEAD") return new Response(null, { headers: { "Set-Cookie": "private-session=super-secret-value; Secure; HttpOnly; SameSite=Lax" } });
    assert.equal(new Headers(init.headers).get("origin"), "https://security-probe.invalid");
    assert.equal(new Headers(init.headers).get("access-control-request-method"), "GET");
    return new Response(null, { headers: {
      "Access-Control-Allow-Origin": "https://security-probe.invalid",
      "Access-Control-Allow-Credentials": "true",
      "Vary": "Accept-Encoding, Origin",
      "Allow": "GET, HEAD, OPTIONS, TRACE, DELETE, arbitrary-server-value",
    } });
  };
  const stages = [];
  const requestEvents = [];
  const result = await executeRunnerManifest(manifest, { fetcher, sleep: async () => undefined, onStage: async (stage, status, counts) => stages.push({ stage, status, counts }), onRequest: async (event) => requestEvents.push(event) });
  assert.equal(result.outcome, "completed");
  assert.equal(result.webProbe?.requestsCompleted, 2);
  assert.equal(result.webProbe?.cors.verdict, "credentialed_origin_reflection");
  assert.equal(result.webProbe?.cors.varyOrigin, true);
  assert.deepEqual(result.webProbe?.methods.riskyAdvertised, ["DELETE", "TRACE"]);
  assert.deepEqual(result.webProbe?.cookies, { observed: true, secureObserved: true, httpOnlyObserved: true, sameSiteObserved: true });
  assert.deepEqual(result.webProbe?.signals.map((signal) => signal.code), ["cors_credentialed_origin_reflection", "http_risky_methods_advertised"]);
  assert.equal(result.budget.consumed, 2);
  assert.deepEqual(targetRequests.map((request) => request.method), ["HEAD", "OPTIONS"]);
  assert.deepEqual(stages.map(({ stage, status }) => `${stage}:${status}`), ["web_control_probe:started", "web_control_probe:completed"]);
  assert.equal(stages[1].counts.requestsCompleted, 2);
  assert.deepEqual(requestEvents, [{ method: "HEAD", action: "Raiz autorizada", status: 200 }, { method: "OPTIONS", action: "Raiz autorizada", status: 200 }]);
  assert.ok(targetRequests.every((request) => request.url === "https://example.com/" && !new Headers(request.headers).has("cookie") && !request.body));
  assert.doesNotMatch(JSON.stringify(result), /private-session|super-secret-value|arbitrary-server-value/);
});

test("request log classifies pre-HTTP failures without persisting raw errors or URLs", async () => {
  const manifest = parseRunnerManifest({ ...manifestInput(), techniques: ["web_control_probe", "safe_web_crawl", "tls_configuration_review"] });
  const events = [];
  const fetcher = async (input) => {
    if (new URL(String(input)).hostname === "cloudflare-dns.com") return Response.json({ Answer: [{ type: 1, data: "93.184.216.34" }] });
    throw new Error("secret diagnostic details must not be logged");
  };
  const result = await executeRunnerManifest(manifest, { fetcher, sleep: async () => undefined, onRequest: async (event) => events.push(event) });
  assert.equal(result.stopReason, "error_rate_threshold");
  assert.equal(result.requests.errors, 5);
  assert.equal(result.requests.successful, 0);
  assert.equal(events.length, 5);
  assert.ok(events.every((event) => event.errorCategory === "network_or_tls" && !("status" in event)));
  assert.doesNotMatch(JSON.stringify(events), /secret diagnostic|https:\/\/example\.com/);
});

test("response body failures are distinguished from pre-HTTP failures", async () => {
  const manifest = parseRunnerManifest({ ...manifestInput(), techniques: ["safe_web_crawl"] });
  const events = [];
  const fetcher = async (input) => {
    const url = new URL(String(input));
    if (url.hostname === "cloudflare-dns.com") return Response.json({ Status: 0, Answer: url.searchParams.get("type") === "A" ? [{ type: 1, data: "93.184.216.34" }] : [] });
    if (url.pathname === "/robots.txt") return new Response("", { headers: { "Content-Type": "text/plain" } });
    return new Response(new ReadableStream({ start(controller) { controller.error(new Error("private body details")); } }), { headers: { "Content-Type": "text/html" } });
  };
  const result = await executeRunnerManifest(manifest, { fetcher, sleep: async () => undefined, onRequest: async (event) => events.push(event) });
  assert.equal(result.requests.successful, 2);
  assert.equal(result.requests.errors, 1);
  assert.equal(result.crawl?.pagesVisited, 0);
  assert.deepEqual(events.at(-1), { method: "GET", action: "Raiz autorizada", errorCategory: "response_read" });
  assert.doesNotMatch(JSON.stringify({ events, result }), /private body details/);
});

test("temporary DNS failure stops safely and retains earlier HTTP evidence", async () => {
  const manifest = parseRunnerManifest({ ...manifestInput(), techniques: ["web_control_probe", "safe_web_crawl", "tls_configuration_review"], budgets: { requestsPerMinute: 60, totalRequests: 20 } });
  const events = [];
  let dnsCalls = 0;
  let targetCalls = 0;
  const fetcher = async (input) => {
    const url = new URL(String(input));
    if (url.hostname === "cloudflare-dns.com") {
      dnsCalls += 1;
      if (dnsCalls > 4) throw new Error("private resolver diagnostics must not be logged");
      return Response.json({ Status: 0, Answer: url.searchParams.get("type") === "A" ? [{ type: 1, data: "93.184.216.34" }] : [] });
    }
    targetCalls += 1;
    return new Response(null, { status: 200, headers: { "Strict-Transport-Security": "max-age=31536000" } });
  };
  const result = await executeRunnerManifest(manifest, { fetcher, sleep: async () => undefined, onRequest: async (event) => events.push(event) });
  assert.equal(result.outcome, "stopped");
  assert.equal(result.stopReason, "dns_unavailable");
  assert.equal(result.budget.consumed, 2);
  assert.deepEqual(result.requests.statusCodes, { "200": 2 });
  assert.equal(result.transport?.httpsReachable, true);
  assert.equal(result.webProbe?.requestsCompleted, 2);
  assert.equal(targetCalls, 2);
  assert.deepEqual(events.at(-1), { method: "GET", action: "robots.txt", errorCategory: "dns_unavailable" });
  assert.doesNotMatch(JSON.stringify({ events, result }), /private resolver diagnostics/);
});

test("a truly unresolved domain stays inconclusive without reaching the target", async () => {
  const manifest = parseRunnerManifest({ ...manifestInput(), techniques: ["tls_configuration_review"] });
  let targetCalls = 0;
  const result = await executeRunnerManifest(manifest, { fetcher: async (input) => {
    if (new URL(String(input)).hostname === "cloudflare-dns.com") return Response.json({ Status: 3, Answer: [] });
    targetCalls += 1;
    return new Response(null);
  } });
  assert.equal(result.outcome, "stopped");
  assert.equal(result.stopReason, "domain_not_resolved");
  assert.equal(result.budget.consumed, 0);
  assert.equal(targetCalls, 0);
});

test("runner reserves external subrequests for the verified free-tier campaign", async () => {
  const manifest = parseRunnerManifest({ ...manifestInput(), techniques: ["safe_web_crawl"], budgets: { requestsPerMinute: 60, totalRequests: 20 } });
  let dnsCalls = 0;
  let targetCalls = 0;
  const links = Array.from({ length: 20 }, (_, index) => `<a href="/page-${index}">Page</a>`).join("");
  const fetcher = async (input) => {
    const url = new URL(String(input));
    if (url.hostname === "cloudflare-dns.com") {
      dnsCalls += 1;
      return Response.json({ Status: 0, Answer: url.searchParams.get("type") === "A" ? [{ type: 1, data: "93.184.216.34" }] : [] });
    }
    targetCalls += 1;
    return new Response(url.pathname === "/robots.txt" ? "" : url.pathname === "/" ? links : "<html>ok</html>", { headers: { "Content-Type": "text/html" } });
  };
  const result = await executeRunnerManifest(manifest, { fetcher, sleep: async () => undefined });
  assert.equal(result.outcome, "stopped");
  assert.equal(result.stopReason, "infrastructure_subrequest_budget");
  assert.equal(result.budget.consumed, 14);
  assert.equal(targetCalls, 14);
  assert.equal(dnsCalls, 28);
  assert.equal(result.requests.successful, 14);
  assert.equal(result.crawl?.pagesVisited, 13);
});

test("web control probe reports blocked responses as inconclusive without finding claims", async () => {
  const manifest = parseRunnerManifest({ ...manifestInput(), techniques: ["web_control_probe"] });
  const fetcher = async (input) => {
    const url = new URL(String(input));
    if (url.hostname === "cloudflare-dns.com") return Response.json({ Answer: [{ type: 1, data: "93.184.216.34" }] });
    return new Response(null, { status: 403, headers: { "Allow": "DELETE", "Set-Cookie": "edge=secret" } });
  };
  const result = await executeRunnerManifest(manifest, { fetcher, sleep: async () => undefined });
  assert.equal(result.webProbe?.cors.verdict, "inconclusive");
  assert.equal(result.webProbe?.methods.responseObserved, false);
  assert.equal(result.webProbe?.cookies.observed, false);
  assert.deepEqual(result.webProbe?.signals, []);
});

test("runner stops immediately when the target returns a rate limit", async () => {
  const manifest = parseRunnerManifest({ ...manifestInput(), techniques: ["web_control_probe", "safe_web_crawl"] });
  let targetRequests = 0;
  const fetcher = async (input) => {
    const url = new URL(String(input));
    if (url.hostname === "cloudflare-dns.com") return Response.json({ Answer: [{ type: 1, data: "93.184.216.34" }] });
    targetRequests += 1;
    return new Response(null, { status: 429 });
  };
  const result = await executeRunnerManifest(manifest, { fetcher, sleep: async () => undefined });
  assert.equal(result.outcome, "stopped");
  assert.equal(result.stopReason, "target_rate_limited");
  assert.equal(targetRequests, 1);
  assert.equal(result.webProbe?.cors.verdict, "inconclusive");
});

test("runner reconfirms an exact ownership TXT and fails closed on missing evidence", async () => {
  await verifyRunnerOwnership("example.com", "expected-token", async (input) => {
    const url = new URL(String(input));
    assert.equal(url.hostname, "cloudflare-dns.com");
    assert.equal(url.searchParams.get("name"), "_cbshub-verification.example.com");
    assert.equal(url.searchParams.get("type"), "TXT");
    return Response.json({ Status: 0, Answer: [{ type: 16, data: '"cbshub-verification=" "expected-token"' }] });
  });
  await assert.rejects(() => verifyRunnerOwnership("example.com", "expected-token", async () => Response.json({ Answer: [{ type: 16, data: '"cbshub-verification=wrong-token"' }] })), /RUNNER_SCOPE_VERIFICATION_LOST/);
  await assert.rejects(() => verifyRunnerOwnership("example.com", "expected-token", async () => { throw new Error("network unavailable"); }), /RUNNER_SCOPE_VERIFICATION_UNAVAILABLE/);
});

test("web control probe preserves a one-request budget and rejects private DNS targets", async () => {
  const manifest = parseRunnerManifest({ ...manifestInput(), techniques: ["web_control_probe"], budgets: { requestsPerMinute: 60, totalRequests: 1 } });
  let targetRequests = 0;
  const fetcher = async (input) => {
    const url = new URL(String(input));
    if (url.hostname === "cloudflare-dns.com") return Response.json({ Answer: [{ type: 1, data: "93.184.216.34" }] });
    targetRequests += 1;
    return new Response(null);
  };
  const result = await executeRunnerManifest(manifest, { fetcher, sleep: async () => undefined });
  assert.equal(targetRequests, 1);
  assert.equal(result.budget.consumed, 1);
  assert.equal(result.stopReason, "request_budget_reached");
  assert.equal(result.webProbe?.cors.verdict, "inconclusive");
  await assert.rejects(() => executeRunnerManifest(manifest, { fetcher: async (input) => {
    assert.equal(new URL(String(input)).hostname, "cloudflare-dns.com");
    return Response.json({ Answer: [{ type: 1, data: "127.0.0.1" }] });
  } }), /RUNNER_NON_PUBLIC_TARGET/);
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
      transport: { httpsReachable: true, status: 200, hstsObserved: true, cspObserved: true, limitation: "test" }, crawl: null, webProbe: null, limitation: "test",
    }), { ownershipFetcher: async () => Response.json({ Answer: [{ type: 16, data: '"cbshub-verification=verification-token"' }] }) });
    assert.equal(processed, "done");
    assert.deepEqual(sqlite.prepare("SELECT event_type FROM security_runner_events WHERE runner_job_id = ? AND event_type LIKE 'runner.stage_%' ORDER BY created_at, id").all(payload.jobId).map((row) => row.event_type).sort(), ["runner.stage_completed", "runner.stage_started"]);
    assert.deepEqual({ ...sqlite.prepare("SELECT status, request_count, error_count FROM security_runner_jobs").get() }, { status: "completed", request_count: 2, error_count: 0 });
    assert.deepEqual(await reconcileSecurityRunnerCampaigns({ DB }, 42), { checked: 1, updated: 1 });
    const campaign = sqlite.prepare("SELECT status, runner_completed_at, runner_result_json FROM security_campaigns").get();
    assert.equal(campaign.status, "completed");
    assert.ok(campaign.runner_completed_at);
    assert.equal(JSON.parse(campaign.runner_result_json).budget.consumed, 2);

    const partialManifest = manifestInput();
    const partialBody = JSON.stringify(partialManifest);
    const partialTimestamp = String(Math.floor(Date.now() / 1000));
    const partialRequest = new Request("https://security-runner.internal/v1/jobs", { method: "POST", headers: { "Content-Type": "application/json", "X-CBSHub-Timestamp": partialTimestamp, "X-CBSHub-Signature": `sha256=${await hmacHex(secret, `${partialTimestamp}.${partialBody}`)}` }, body: partialBody });
    const partialResponse = await enqueue(partialRequest, { DB, SECURITY_RUNNER_SIGNING_KEY: secret, ACTIVE_RUN_QUEUE: { send: async (message) => queued.push(message) } });
    const partialJob = await partialResponse.json();
    sqlite.prepare(`INSERT INTO security_campaigns
      (id, workspace_id, scope_id, name, environment, techniques_json, policy_version, window_start, window_end, max_requests_per_minute, max_total_requests, stop_conditions_json, status, executor, runner_job_id)
      VALUES (?, 42, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'queued', 'isolated_runner', ?)`)
      .run(partialManifest.campaignId, scopeId, partialManifest.name, partialManifest.environment, JSON.stringify(partialManifest.techniques), partialManifest.policyVersion, partialManifest.window.start, partialManifest.window.end, partialManifest.budgets.requestsPerMinute, partialManifest.budgets.totalRequests, JSON.stringify(partialManifest.stopConditions), partialJob.jobId);
    await processJob({ DB, SECURITY_RUNNER_SIGNING_KEY: secret, ACTIVE_RUN_QUEUE: { send: async () => undefined } }, partialJob.jobId, async (parsed) => ({
      version: "security-runner.test", domain: parsed.scope.domain, techniques: parsed.techniques,
      startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), outcome: "stopped", stopReason: "dns_unavailable",
      budget: { ...parsed.budgets, consumed: 2 }, requests: { successful: 2, errors: 0, serverErrors: 0, statusCodes: { "200": 2 } },
      transport: { httpsReachable: true, status: 200, hstsObserved: true, cspObserved: true, limitation: "test" }, crawl: { pagesVisited: 1, htmlPages: 1, redirectsObserved: 0, blockedRedirects: 0, skippedSensitiveLinks: 0, hstsCoveragePercent: 100, cspCoveragePercent: 100 }, webProbe: null, limitation: "test",
    }), { ownershipFetcher: async () => Response.json({ Answer: [{ type: 16, data: '"cbshub-verification=verification-token"' }] }) });
    assert.deepEqual({ ...sqlite.prepare("SELECT status, request_count, error_count FROM security_runner_jobs WHERE id = ?").get(partialJob.jobId) }, { status: "stopped", request_count: 2, error_count: 0 });
    assert.deepEqual(await reconcileSecurityRunnerCampaigns({ DB }, 42), { checked: 1, updated: 1 });
    const partialCampaign = sqlite.prepare("SELECT status, runner_result_json FROM security_campaigns WHERE id = ?").get(partialManifest.campaignId);
    assert.equal(partialCampaign.status, "review");
    assert.equal(JSON.parse(partialCampaign.runner_result_json).stopReason, "dns_unavailable");

    const blockedManifest = { ...manifestInput(), scope: { domain: "revoked.example.com" } };
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
    sqlite.prepare("UPDATE security_agent_scopes SET status = 'verified' WHERE id = ?").run(blockedScopeId);
    sqlite.prepare("UPDATE security_runner_jobs SET status = 'queued', attempt_count = 0 WHERE id = ?").run(blockedPayload.jobId);
    await processJob({ DB, ACTIVE_RUN_QUEUE: { send: async () => undefined } }, blockedPayload.jobId, async () => { executedWithoutAuthorization = true; throw new Error("unexpected"); }, { ownershipFetcher: async () => Response.json({ Answer: [] }) });
    assert.equal(executedWithoutAuthorization, false);
    assert.equal(sqlite.prepare("SELECT error_code FROM security_runner_jobs WHERE id = ?").get(blockedPayload.jobId).error_code, "RUNNER_SCOPE_VERIFICATION_LOST");
    sqlite.prepare("UPDATE security_runner_jobs SET status = 'running', lease_expires_at = ? WHERE id = ?").run(new Date(Date.now() - 3600_000).toISOString(), payload.jobId);
    let replayed = false;
    await processJob({ DB, ACTIVE_RUN_QUEUE: { send: async () => undefined } }, payload.jobId, async () => { replayed = true; throw new Error("unexpected replay"); });
    assert.equal(replayed, false);
    assert.equal(sqlite.prepare("SELECT error_code FROM security_runner_jobs WHERE id = ?").get(payload.jobId).error_code, "RUNNER_EXECUTION_INTERRUPTED");
  } finally { sqlite.close(); }
});

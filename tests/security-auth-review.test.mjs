import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { authReviewFindingIdentity, authReviewMarkerHash, classifyAuthReview, classifyAuthReviewRetest, parseAuthReviewExecution, parseAuthReviewMarker, parseAuthReviewMode, parseAuthReviewPath } from "../domain/security-auth-review-policy.ts";
import { authReviewAgentSnapshot, dispatchDueAuthReviewAgents, processAuthReviewAgentMessage, validateAuthReviewAgentFragment } from "../app/security-auth-review-agents.ts";
import { hmacHex } from "../domain/security-runner-policy.ts";
import { executeAuthenticatedAccessReview } from "../security-runner/executor.ts";
import { authenticatedAccessReview } from "../security-runner/worker.ts";
import { selectAuthReviewCandidates } from "../domain/security-auth-review-targets.ts";

test("repository inventory proposes only static GET routes and never authorizes execution", () => {
  const repositoryId = `srp_${crypto.randomUUID()}`;
  const routes = [
    { route: "/api/reports/summary", method: "GET", sourceFile: "app/api/reports/summary/route.ts", priority: "high" },
    { route: "/api/reports/:id", method: "GET", sourceFile: "app/api/reports/[id]/route.ts", priority: "high" },
    { route: "/api/reports/summary", method: "POST", sourceFile: "app/api/reports/summary/route.ts", priority: "high" },
    { route: "/api/delete/report", method: "GET", sourceFile: "app/api/delete/report/route.ts", priority: "high" },
    { route: "/api/public/status", method: "GET", sourceFile: "app/api/public/status/route.ts", priority: "low" },
  ];
  const candidates = selectAuthReviewCandidates([{ repositoryId, repositoryName: "owner/repo", coverageJson: JSON.stringify({ attackSurface: { routes } }) }]);
  assert.deepEqual(candidates.map((candidate) => candidate.path), ["/api/reports/summary"]);
  assert.deepEqual(selectAuthReviewCandidates([{ repositoryId, repositoryName: "owner/repo", coverageJson: "not-json" }]), []);
  assert.deepEqual(selectAuthReviewCandidates([{ repositoryId: "foreign", repositoryName: "owner/repo", coverageJson: JSON.stringify({ attackSurface: { routes } }) }]), []);
});

test("authenticated review accepts only a scoped read-only path and distinct test tokens", () => {
  assert.equal(parseAuthReviewPath("/api/reports/summary"), "/api/reports/summary");
  for (const path of ["https://example.com/admin", "/api/logout", "/api/login", "/api/public/status", "/api/delete/1", "/a?x=1", "/a//b", "/a/../b", "/%2e%2e/admin", "/a#fragment"]) {
    assert.throws(() => parseAuthReviewPath(path), /AUTH_REVIEW_PATH_INVALID/);
  }
  const input = { reviewId: `sarv_${crypto.randomUUID()}`, workspaceId: 1, scopeId: `sas_${crypto.randomUUID()}`, domain: "example.com", path: "/reports", limitedToken: "limited-test-token-123", privilegedToken: "privileged-test-token-456" };
  assert.equal(parseAuthReviewExecution(input).path, "/reports");
  assert.equal(parseAuthReviewMode("horizontal"), "horizontal");
  assert.equal(parseAuthReviewMode(undefined), "vertical");
  assert.throws(() => parseAuthReviewMode("privileged"), /AUTH_REVIEW_MODE_INVALID/);
  assert.equal(parseAuthReviewExecution({ ...input, reviewMode: "horizontal" }).reviewMode, "horizontal");
  assert.throws(() => parseAuthReviewExecution({ ...input, privilegedToken: input.limitedToken }), /AUTH_REVIEW_IDENTITIES_NOT_DISTINCT/);
  assert.throws(() => parseAuthReviewExecution({ ...input, path: "/reports", extra: "anything" }), /AUTH_REVIEW_INVALID/);
  assert.equal(parseAuthReviewMarker("CBSTEST-abcdefghijklmnop"), "CBSTEST-abcdefghijklmnop");
  assert.throws(() => parseAuthReviewMarker("customer@example.com"), /AUTH_REVIEW_MARKER_INVALID/);
});

test("classification never claims proof from status codes alone", () => {
  assert.equal(classifyAuthReview({ anonymous: 403, limited: 200, privileged: 200 }), "potential_access_gap");
  assert.equal(classifyAuthReview({ anonymous: 403, limited: 403, privileged: 200 }), "access_restricted");
  assert.equal(classifyAuthReview({ anonymous: 200, limited: 200, privileged: 200 }), "public_or_inconclusive");
  assert.equal(classifyAuthReview({ anonymous: null, limited: 200, privileged: 200 }), "inconclusive");
  assert.equal(classifyAuthReview({ anonymous: 403, limited: 200, privileged: 200 }, { anonymous: false, limited: true, privileged: true }), "verified_test_marker_exposure");
  assert.equal(classifyAuthReview({ anonymous: 403, limited: 200, privileged: 200 }, { anonymous: false, limited: false, privileged: true }), "inconclusive");
  assert.equal(classifyAuthReviewRetest("verified_test_marker_exposure", "access_restricted"), "no_longer_observed");
  assert.equal(classifyAuthReviewRetest("verified_test_marker_exposure", "verified_test_marker_exposure"), "still_observed");
  assert.equal(classifyAuthReviewRetest("potential_access_gap", "access_restricted"), "inconclusive");
});

test("finding identity deduplicates the same authorized path without storing its value in the evidence code", async () => {
  const scopeId = `sas_${crypto.randomUUID()}`;
  const one = await authReviewFindingIdentity(scopeId, "/reports/test-one", "horizontal", `sarv_${crypto.randomUUID()}`);
  const two = await authReviewFindingIdentity(scopeId, "/reports/test-one", "horizontal", `sarv_${crypto.randomUUID()}`);
  const other = await authReviewFindingIdentity(scopeId, "/reports/test-two", "horizontal", `sarv_${crypto.randomUUID()}`);
  assert.equal(one.findingId, two.findingId);
  assert.equal(one.evidenceCode, two.evidenceCode);
  assert.notEqual(one.eventId, two.eventId);
  assert.notEqual(one.findingId, other.findingId);
  assert.equal(one.evidenceCode.includes("reports"), false);
});

test("runner validates a synthetic marker without returning or persisting response content", async () => {
  const marker = "CBSTEST-abcdefghijklmnop";
  let target = 0;
  const fetcher = async (input) => {
    const url = new URL(String(input));
    if (url.hostname === "cloudflare-dns.com") return Response.json({ Status: 0, Answer: url.searchParams.get("type") === "A" ? [{ type: 1, data: "8.8.8.8" }] : [] });
    target += 1;
    return new Response(target === 1 ? "access denied" : `synthetic resource ${marker}`, { status: target === 1 ? 403 : 200, headers: { "Content-Type": "text/plain" } });
  };
  const result = await executeAuthenticatedAccessReview({ domain: "example.com", path: "/reports", limitedToken: "limited-test-token-123", privilegedToken: "privileged-test-token-456", marker }, fetcher);
  assert.equal(result.verdict, "verified_test_marker_exposure");
  assert.deepEqual(result.markerObserved, { anonymous: false, limited: true, privileged: true });
  assert.equal(JSON.stringify(result).includes(marker), false);
});

test("runner makes only three same-origin GET requests, never follows redirects or stores response bodies", async () => {
  const targetCalls = [];
  const statuses = [403, 200, 200];
  const fetcher = async (input, init) => {
    const url = new URL(String(input));
    if (url.hostname === "cloudflare-dns.com") return Response.json({ Status: 0, Answer: url.searchParams.get("type") === "A" ? [{ type: 1, data: "8.8.8.8" }] : [] });
    targetCalls.push({ url: url.toString(), method: init.method, redirect: init.redirect, token: init.headers.Authorization ?? null });
    return new Response("sensitive response body", { status: statuses[targetCalls.length - 1] });
  };
  const result = await executeAuthenticatedAccessReview({ domain: "example.com", path: "/reports", limitedToken: "limited-test-token-123", privilegedToken: "privileged-test-token-456" }, fetcher);
  assert.equal(result.verdict, "potential_access_gap");
  assert.equal(result.consumed, 3);
  assert.deepEqual(targetCalls.map((call) => [call.url, call.method, call.redirect]), Array(3).fill(["https://example.com/reports", "GET", "manual"]));
  assert.deepEqual(targetCalls.map((call) => call.token), [null, "Bearer limited-test-token-123", "Bearer privileged-test-token-456"]);
  assert.equal(JSON.stringify(result).includes("sensitive"), false);
});

test("runner stops after target rate limiting and does not send either token", async () => {
  let targets = 0;
  const fetcher = async (input) => {
    const url = new URL(String(input));
    if (url.hostname === "cloudflare-dns.com") return Response.json({ Status: 0, Answer: url.searchParams.get("type") === "A" ? [{ type: 1, data: "8.8.8.8" }] : [] });
    targets += 1;
    return new Response(null, { status: 429 });
  };
  const result = await executeAuthenticatedAccessReview({ domain: "example.com", path: "/reports", limitedToken: "limited-test-token-123", privilegedToken: "privileged-test-token-456" }, fetcher);
  assert.equal(targets, 1);
  assert.equal(result.verdict, "inconclusive");
  assert.equal(result.stopReason, "target_unavailable_or_rate_limited");
});

test("signed runner review rechecks scope, claims once and persists no credentials", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    for (const migration of ["0051_security_validation_agent.sql", "0052_security_agent_execution_queue.sql", "0054_security_findings_workflow.sql", "0068_authenticated_access_review.sql", "0069_auth_review_agent_pipeline.sql", "0070_auth_review_modes.sql"]) sqlite.exec(readFileSync(new URL(`../drizzle/${migration}`, import.meta.url), "utf8"));
    const DB = {
      async batch(statements) { sqlite.exec("BEGIN"); try { const results = []; for (const statement of statements) results.push(await statement.run()); sqlite.exec("COMMIT"); return results; } catch (error) { sqlite.exec("ROLLBACK"); throw error; } },
      prepare(sql) {
        const statement = sqlite.prepare(sql);
        const bound = (values) => ({ first: async () => statement.get(...values) ?? null, run: async () => ({ meta: { changes: Number(statement.run(...values).changes) } }) });
        return { ...bound([]), bind: (...values) => bound(values) };
      },
    };
    const scopeId = `sas_${crypto.randomUUID()}`;
    const reviewId = `sarv_${crypto.randomUUID()}`;
    sqlite.prepare(`INSERT INTO security_agent_scopes (id, workspace_id, domain, status, verification_token, created_by_user_id, authorization_basis, authorization_attested_at, authorization_expires_at, authorization_version)
      VALUES (?, 42, 'example.com', 'verified', 'ownership-test-token', 1, 'dns_control', datetime('now'), datetime('now', '+1 day'), 'test')`).run(scopeId);
    sqlite.prepare("INSERT INTO security_auth_reviews (id, workspace_id, scope_id, actor_user_id, path, bucket_start, status, marker_sha256, review_mode) VALUES (?, 42, ?, 1, '/reports', '2026-09-25T10:00:00.000Z', 'running', ?, 'horizontal')").run(reviewId, scopeId, await authReviewMarkerHash("CBSTEST-abcdefghijklmnop"));
    const secret = "runner-test-signing-key-with-at-least-thirty-two-characters";
    const body = JSON.stringify({ reviewId, workspaceId: 42, scopeId, domain: "example.com", path: "/reports", limitedToken: "limited-test-token-123", privilegedToken: "privileged-test-token-456", marker: "CBSTEST-abcdefghijklmnop", reviewMode: "horizontal" });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signed = () => new Request("https://security-runner.internal/v1/auth-review", { method: "POST", headers: { "X-CBSHub-Timestamp": timestamp, "X-CBSHub-Signature": `sha256=${"0".repeat(64)}` }, body });
    const rejected = await authenticatedAccessReview(signed(), { DB, SECURITY_RUNNER_SIGNING_KEY: secret });
    assert.equal(rejected.status, 401);
    assert.equal(sqlite.prepare("SELECT status FROM security_auth_reviews WHERE id = ?").get(reviewId).status, "running");
    const wrongBody = JSON.stringify({ ...JSON.parse(body), reviewMode: "vertical" });
    const wrongSignature = await hmacHex(secret, `${timestamp}.${wrongBody}`);
    const wrongMode = await authenticatedAccessReview(new Request("https://security-runner.internal/v1/auth-review", { method: "POST", headers: { "X-CBSHub-Timestamp": timestamp, "X-CBSHub-Signature": `sha256=${wrongSignature}` }, body: wrongBody }), { DB, SECURITY_RUNNER_SIGNING_KEY: secret });
    assert.equal(wrongMode.status, 403);
    assert.equal(sqlite.prepare("SELECT status FROM security_auth_reviews WHERE id = ?").get(reviewId).status, "running");
    const signature = await hmacHex(secret, `${timestamp}.${body}`);
    const request = () => new Request("https://security-runner.internal/v1/auth-review", { method: "POST", headers: { "X-CBSHub-Timestamp": timestamp, "X-CBSHub-Signature": `sha256=${signature}` }, body });
    let targetCount = 0;
    const targetFetcher = async (input) => {
      const url = new URL(String(input));
      if (url.hostname === "cloudflare-dns.com") return Response.json({ Status: 0, Answer: url.searchParams.get("type") === "A" ? [{ type: 1, data: "8.8.8.8" }] : [] });
      targetCount += 1;
      return new Response(targetCount === 1 ? "denied" : "synthetic CBSTEST-abcdefghijklmnop", { status: targetCount === 1 ? 403 : 200, headers: { "Content-Type": "text/plain" } });
    };
    const options = { ownershipFetcher: async () => Response.json({ Status: 0, Answer: [{ type: 16, data: '"cbshub-verification=ownership-test-token"' }] }), targetFetcher };
    const accepted = await authenticatedAccessReview(request(), { DB, SECURITY_RUNNER_SIGNING_KEY: secret }, options);
    assert.equal(accepted.status, 200);
    assert.equal(sqlite.prepare("SELECT status, verdict, limited_marker_observed FROM security_auth_reviews WHERE id = ?").get(reviewId).status, "completed");
    assert.equal(sqlite.prepare("SELECT verdict FROM security_auth_reviews WHERE id = ?").get(reviewId).verdict, "verified_test_marker_exposure");
    const finding = sqlite.prepare("SELECT id, source_job_id, severity, occurrence_count FROM security_findings WHERE workspace_id = 42").get();
    assert.equal(finding.source_job_id, reviewId);
    assert.equal(finding.severity, "medium");
    assert.equal(finding.occurrence_count, 1);
    assert.equal(sqlite.prepare("SELECT COUNT(*) total FROM security_finding_events WHERE finding_id = ?").get(finding.id).total, 1);
    assert.equal(await (await authenticatedAccessReview(request(), { DB, SECURITY_RUNNER_SIGNING_KEY: secret }, options)).status, 409);
    const secondId = `sarv_${crypto.randomUUID()}`;
    sqlite.prepare("INSERT INTO security_auth_reviews (id, workspace_id, scope_id, actor_user_id, path, bucket_start, status, marker_sha256, review_mode) VALUES (?, 42, ?, 1, '/reports', '2026-09-25T10:10:00.000Z', 'running', ?, 'horizontal')").run(secondId, scopeId, await authReviewMarkerHash("CBSTEST-abcdefghijklmnop"));
    const secondBody = JSON.stringify({ ...JSON.parse(body), reviewId: secondId });
    const secondSignature = await hmacHex(secret, `${timestamp}.${secondBody}`);
    targetCount = 0;
    const secondRequest = new Request("https://security-runner.internal/v1/auth-review", { method: "POST", headers: { "X-CBSHub-Timestamp": timestamp, "X-CBSHub-Signature": `sha256=${secondSignature}` }, body: secondBody });
    assert.equal((await authenticatedAccessReview(secondRequest, { DB, SECURITY_RUNNER_SIGNING_KEY: secret }, options)).status, 200);
    assert.equal(sqlite.prepare("SELECT COUNT(*) total FROM security_findings WHERE workspace_id = 42").get().total, 1);
    assert.equal(sqlite.prepare("SELECT occurrence_count FROM security_findings WHERE id = ?").get(finding.id).occurrence_count, 2);
    assert.equal(sqlite.prepare("SELECT COUNT(*) total FROM security_finding_events WHERE finding_id = ?").get(finding.id).total, 2);
    const persisted = JSON.stringify(sqlite.prepare("SELECT * FROM security_auth_reviews WHERE id = ?").get(reviewId));
    assert.equal(persisted.includes("limited-test-token"), false);
    assert.equal(persisted.includes("privileged-test-token"), false);
    assert.equal(persisted.includes("CBSTEST-abcdefghijklmnop"), false);
  } finally { sqlite.close(); }
});

test("retest compares only the same synthetic marker and never declares full remediation", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    for (const migration of ["0051_security_validation_agent.sql", "0052_security_agent_execution_queue.sql", "0054_security_findings_workflow.sql", "0068_authenticated_access_review.sql", "0069_auth_review_agent_pipeline.sql", "0070_auth_review_modes.sql"]) sqlite.exec(readFileSync(new URL(`../drizzle/${migration}`, import.meta.url), "utf8"));
    const DB = { async batch(statements) { sqlite.exec("BEGIN"); try { const results = []; for (const statement of statements) results.push(await statement.run()); sqlite.exec("COMMIT"); return results; } catch (error) { sqlite.exec("ROLLBACK"); throw error; } }, prepare(sql) { const statement = sqlite.prepare(sql); const bound = (values) => ({ first: async () => statement.get(...values) ?? null, run: async () => ({ meta: { changes: Number(statement.run(...values).changes) } }) }); return { ...bound([]), bind: (...values) => bound(values) }; } };
    const scopeId = `sas_${crypto.randomUUID()}`;
    const priorId = `sarv_${crypto.randomUUID()}`;
    const reviewId = `sarv_${crypto.randomUUID()}`;
    const marker = "CBSTEST-abcdefghijklmnop";
    const markerHash = await authReviewMarkerHash(marker);
    sqlite.prepare(`INSERT INTO security_agent_scopes (id, workspace_id, domain, status, verification_token, created_by_user_id, authorization_basis, authorization_attested_at, authorization_expires_at, authorization_version)
      VALUES (?, 42, 'example.com', 'verified', 'ownership-test-token', 1, 'dns_control', datetime('now'), datetime('now', '+1 day'), 'test')`).run(scopeId);
    const insert = sqlite.prepare("INSERT INTO security_auth_reviews (id, workspace_id, scope_id, actor_user_id, path, bucket_start, status, marker_sha256, retest_of_id, verdict) VALUES (?, 42, ?, 1, '/reports', ?, ?, ?, ?, ?)");
    insert.run(priorId, scopeId, "2026-09-25T10:00:00.000Z", "completed", markerHash, null, "verified_test_marker_exposure");
    insert.run(reviewId, scopeId, "2026-09-25T10:10:00.000Z", "running", markerHash, priorId, null);
    const secret = "runner-test-signing-key-with-at-least-thirty-two-characters";
    const body = JSON.stringify({ reviewId, workspaceId: 42, scopeId, domain: "example.com", path: "/reports", limitedToken: "limited-test-token-123", privilegedToken: "privileged-test-token-456", marker });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = await hmacHex(secret, `${timestamp}.${body}`);
    const request = () => new Request("https://security-runner.internal/v1/auth-review", { method: "POST", headers: { "X-CBSHub-Timestamp": timestamp, "X-CBSHub-Signature": `sha256=${signature}` }, body });
    let calls = 0;
    const targetFetcher = async (input) => {
      const url = new URL(String(input));
      if (url.hostname === "cloudflare-dns.com") return Response.json({ Status: 0, Answer: url.searchParams.get("type") === "A" ? [{ type: 1, data: "8.8.8.8" }] : [] });
      calls++;
      return new Response(calls === 3 ? marker : "denied", { status: calls === 3 ? 200 : 403 });
    };
    const result = await authenticatedAccessReview(request(), { DB, SECURITY_RUNNER_SIGNING_KEY: secret }, { ownershipFetcher: async () => Response.json({ Status: 0, Answer: [{ type: 16, data: '"cbshub-verification=ownership-test-token"' }] }), targetFetcher });
    assert.equal(result.status, 200);
    assert.equal((await result.json()).retestOutcome, "no_longer_observed");
    assert.equal(sqlite.prepare("SELECT retest_outcome FROM security_auth_reviews WHERE id = ?").get(reviewId).retest_outcome, "no_longer_observed");
    assert.equal(sqlite.prepare("SELECT COUNT(*) total FROM security_findings WHERE workspace_id = 42").get().total, 0);
    assert.equal(calls, 3);
  } finally { sqlite.close(); }
});

test("access and review agents use only redacted evidence, reject fabricated citations and claim once", async () => {
  const sqlite = new DatabaseSync(":memory:");
  const originalFetch = globalThis.fetch;
  try {
    for (const migration of ["0051_security_validation_agent.sql", "0052_security_agent_execution_queue.sql", "0068_authenticated_access_review.sql", "0069_auth_review_agent_pipeline.sql", "0070_auth_review_modes.sql"]) sqlite.exec(readFileSync(new URL(`../drizzle/${migration}`, import.meta.url), "utf8"));
    const DB = { prepare(sql) { const statement = sqlite.prepare(sql); const bound = (values) => ({ first: async () => statement.get(...values) ?? null, all: async () => ({ results: statement.all(...values) }), run: async () => ({ meta: { changes: Number(statement.run(...values).changes) } }) }); return { ...bound([]), bind: (...values) => bound(values) }; } };
    const scopeId = `sas_${crypto.randomUUID()}`;
    const reviewId = `sarv_${crypto.randomUUID()}`;
    sqlite.prepare("INSERT INTO security_agent_scopes (id, workspace_id, domain, status, verification_token, created_by_user_id, authorization_expires_at) VALUES (?, 42, 'example.com', 'verified', 'token', 1, datetime('now', '+1 day'))").run(scopeId);
    sqlite.prepare("INSERT INTO security_auth_reviews (id, workspace_id, scope_id, actor_user_id, path, bucket_start, status, anonymous_status, limited_status, privileged_status, anonymous_marker_observed, limited_marker_observed, privileged_marker_observed, verdict) VALUES (?, 42, ?, 1, '/reports', '2026-09-25T10:00:00.000Z', 'completed', 403, 200, 200, 0, 1, 1, 'verified_test_marker_exposure')").run(reviewId, scopeId);
    const queued = [];
    const calls = [];
    const env = { DB, OPENAI_API_KEY: "test-key", SECURITY_SCAN_QUEUE: { send: async (message) => queued.push(message) } };
    assert.deepEqual(await dispatchDueAuthReviewAgents(env), { queued: 1, unavailable: false });
    globalThis.fetch = async (_url, init) => {
      const body = JSON.parse(init.body);
      calls.push(body);
      return Response.json({ output_text: JSON.stringify({ summary: "Marcador sintético observado no papel limitado; exige revisão.", evidenceCodes: ["AUTH_SYNTHETIC_MARKER"], uncertainties: ["A amostra não confirma acesso a dados reais."], nextStep: "human_review" }), usage: { input_tokens: 80, output_tokens: 40 } });
    };
    assert.equal((await processAuthReviewAgentMessage(env, { version: 3, reviewId, workspaceId: 43 })).status, "already_claimed");
    assert.equal((await processAuthReviewAgentMessage(env, queued[0])).status, "completed");
    assert.equal(calls.length, 2);
    assert.equal(JSON.parse(calls[0].input).priorFragment, null);
    assert.match(JSON.parse(calls[1].input).priorFragment.summary, /Marcador sintético/);
    assert.equal(calls.every((call) => call.store === false && !call.tools && !call.input.includes("test-key") && !call.input.includes("/reports")), true);
    assert.equal(sqlite.prepare("SELECT analysis_status FROM security_auth_reviews WHERE id = ?").get(reviewId).analysis_status, "completed");
    assert.equal((await processAuthReviewAgentMessage(env, queued[0])).status, "already_claimed");
    const snapshot = authReviewAgentSnapshot({ ...sqlite.prepare("SELECT * FROM security_auth_reviews WHERE id = ?").get(reviewId) });
    assert.throws(() => validateAuthReviewAgentFragment({ summary: "Inventado", evidenceCodes: ["CVE_FAKE"], uncertainties: [], nextStep: "monitor" }, snapshot.codes), /AUTH_AGENT_OUTPUT_INVALID/);
  } finally { globalThis.fetch = originalFetch; sqlite.close(); }
});

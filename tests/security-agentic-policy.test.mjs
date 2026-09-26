import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { AGENTIC_MAX_TOTAL_REQUESTS, availableAgenticTests, mayContinueAgenticRun, validateAgenticProposal, validateAgenticRunnerEvidence, validateAgenticVerdict } from "../domain/security-agentic-policy.ts";

const service = fs.readFileSync(new URL("../app/security-agentic-pentest.ts", import.meta.url), "utf8");
const migration = fs.readFileSync(new URL("../drizzle/0067_agentic_pentest_sessions.sql", import.meta.url), "utf8");

test("planner may select only untried, budgeted, allowlisted probes", () => {
  assert.equal(AGENTIC_MAX_TOTAL_REQUESTS, 14);
  assert.deepEqual(availableAgenticTests(["web_control_probe"], 1), ["tls_configuration_review"]);
  assert.deepEqual(validateAgenticProposal({ testId: "tls_configuration_review", reason: "Confirmar o transporte HTTPS observado." }, ["tls_configuration_review"]).testId, "tls_configuration_review");
  assert.throws(() => validateAgenticProposal({ testId: "authenticated_access_review", reason: "Testar credenciais de acesso." }, ["tls_configuration_review"]), /AGENTIC_TEST_NOT_ALLOWED/);
  assert.throws(() => validateAgenticProposal({ testId: "tls_configuration_review", reason: "Confirmar transporte.", url: "https://example.com/admin" }, ["tls_configuration_review"]), /AGENTIC_PLAN_INVALID/);
  assert.throws(() => validateAgenticProposal({ testId: "web_control_probe", reason: "Repetir controle sem necessidade." }, ["tls_configuration_review"]), /AGENTIC_TEST_NOT_ALLOWED/);
});

test("verifier is evidence-bound and controller halts on target errors", () => {
  const evidence = new Set(["RUNNER_REQUESTS", "RUNNER_WEB_PROBE"]);
  const verdict = validateAgenticVerdict({ summary: "CORS inconclusivo nesta resposta.", confidence: "low", evidenceCodes: ["RUNNER_WEB_PROBE"], uncertainties: ["Faltam respostas de outras rotas."], nextFocus: "safe_web_crawl", continueTesting: true }, evidence);
  assert.equal(verdict.continueTesting, true);
  assert.throws(() => validateAgenticVerdict({ ...verdict, evidenceCodes: ["UNOBSERVED_CVE"] }, evidence), /AGENTIC_VERDICT_INVALID/);
  assert.throws(() => validateAgenticVerdict({ ...verdict, nextFocus: "scan arbitrary host" }, evidence), /AGENTIC_VERDICT_INVALID/);
  const base = { status: "completed", stopReason: null, successful: 2, remainingRequests: 10, completedTests: ["web_control_probe"], verdictContinue: true, windowEnd: new Date(Date.now() + 60_000).toISOString(), now: Date.now() };
  assert.equal(mayContinueAgenticRun(base), true);
  assert.equal(mayContinueAgenticRun({ ...base, status: "stopped", stopReason: "target_rate_limited" }), false);
  assert.equal(mayContinueAgenticRun({ ...base, status: "stopped", stopReason: "request_budget_reached", successful: 1 }), false);
  assert.equal(mayContinueAgenticRun({ ...base, remainingRequests: 0 }), false);
  assert.equal(mayContinueAgenticRun({ ...base, verdictContinue: false }), true);
  assert.equal(mayContinueAgenticRun({ ...base, completedTests: ["web_control_probe", "tls_configuration_review", "safe_web_crawl"], verdictContinue: false }), false);
});

test("runner evidence must match the planned domain, technique, job and budget", () => {
  const observation = { domain: "example.com", techniques: ["web_control_probe"], outcome: "completed", stopReason: null,
    budget: { consumed: 2, totalRequests: 2 }, requests: { successful: 2, errors: 0, serverErrors: 0, statusCodes: { "200": 2 } },
    transport: null, crawl: null, webProbe: { signals: [] } };
  const expected = { domain: "example.com", testId: "web_control_probe", requestCount: 2, jobStatus: "completed" };
  assert.doesNotThrow(() => validateAgenticRunnerEvidence(observation, expected));
  assert.doesNotThrow(() => validateAgenticRunnerEvidence({ ...observation, webProbe: { signals: [{ code: "cors_wildcard", severity: "low" }] } }, expected));
  for (const changed of [
    { domain: "foreign.example" }, { techniques: ["tls_configuration_review"] }, { outcome: "stopped", stopReason: null },
    { budget: { consumed: 3, totalRequests: 3 } }, { requests: { ...observation.requests, statusCodes: { "200": 1 } } },
    { transport: { httpsReachable: true } },
    { webProbe: { signals: [{ code: "fabricated_critical_issue" }] } },
  ]) assert.throws(() => validateAgenticRunnerEvidence({ ...observation, ...changed }, expected), /AGENTIC_EVIDENCE_INVALID/);
  assert.throws(() => validateAgenticRunnerEvidence(observation, { ...expected, requestCount: 1 }), /AGENTIC_EVIDENCE_INVALID/);
});

test("orchestrator persists steps and leases before dispatching signed runner campaigns", () => {
  assert.match(service, /lease_expires_at = \?/);
  assert.match(service, /phase = 'dispatching'/);
  assert.match(service, /dispatchSecurityCampaign\(env/);
  assert.match(service, /currentAuthorization\(scope\)/);
  assert.match(service, /validateAgenticProposal/);
  assert.match(service, /validateAgenticVerdict/);
  assert.match(migration, /CREATE UNIQUE INDEX `security_agentic_active_scope_idx`/);
  assert.match(migration, /CREATE UNIQUE INDEX `security_agentic_step_number_idx`/);
});

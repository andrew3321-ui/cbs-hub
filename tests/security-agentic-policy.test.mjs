import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { AGENTIC_MAX_TOTAL_REQUESTS, availableAgenticTests, mayContinueAgenticRun, validateAgenticProposal, validateAgenticVerdict } from "../domain/security-agentic-policy.ts";

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
  const verdict = validateAgenticVerdict({ summary: "CORS inconclusivo nesta resposta.", confidence: "low", evidenceCodes: ["RUNNER_WEB_PROBE"], uncertainties: ["Faltam respostas de outras rotas."], nextFocus: "Conferir outra sonda permitida.", continueTesting: true }, evidence);
  assert.equal(verdict.continueTesting, true);
  assert.throws(() => validateAgenticVerdict({ ...verdict, evidenceCodes: ["UNOBSERVED_CVE"] }, evidence), /AGENTIC_VERDICT_INVALID/);
  const base = { status: "completed", stopReason: null, successful: 2, remainingRequests: 10, completedTests: ["web_control_probe"], verdictContinue: true, windowEnd: new Date(Date.now() + 60_000).toISOString(), now: Date.now() };
  assert.equal(mayContinueAgenticRun(base), true);
  assert.equal(mayContinueAgenticRun({ ...base, status: "stopped", stopReason: "target_rate_limited" }), false);
  assert.equal(mayContinueAgenticRun({ ...base, status: "stopped", stopReason: "request_budget_reached", successful: 1 }), false);
  assert.equal(mayContinueAgenticRun({ ...base, remainingRequests: 0 }), false);
  assert.equal(mayContinueAgenticRun({ ...base, verdictContinue: false }), false);
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

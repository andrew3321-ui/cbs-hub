import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { advanceDueAgenticPentests, cancelAgenticPentest, startAgenticPentest } from "../app/security-agentic-pentest.ts";
import { enqueue } from "../security-runner/worker.ts";

function database() {
  const sqlite = new DatabaseSync(":memory:");
  for (const migration of ["0051_security_validation_agent.sql", "0052_security_agent_execution_queue.sql", "0053_security_agent_model_routing.sql", "0054_security_findings_workflow.sql", "0055_security_campaigns_and_remediation.sql", "0056_continuous_defense.sql", "0062_isolated_security_runner.sql", "0065_guided_security_campaigns.sql", "0066_campaign_specialist_pipeline.sql", "0067_agentic_pentest_sessions.sql"]) sqlite.exec(readFileSync(new URL(`../drizzle/${migration}`, import.meta.url), "utf8"));
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

test("agentic session verifies one probe before planning the next and stops after the second verdict", async () => {
  const { sqlite, DB } = database();
  const originalFetch = globalThis.fetch;
  const secret = "agentic-test-signing-key-with-at-least-thirty-two-characters";
  const sent = [];
  const scope = { id: `sas_${crypto.randomUUID()}`, workspace_id: 42, domain: "example.com", status: "verified", authorization_expires_at: new Date(Date.now() + 86_400_000).toISOString() };
  try {
    sqlite.prepare("INSERT INTO security_agent_scopes (id, workspace_id, domain, status, verification_token, created_by_user_id, authorization_basis, authorization_attested_at, authorization_expires_at, authorization_version) VALUES (?, 42, ?, 'verified', 'token', 1, 'dns_control', datetime('now'), ?, 'test')")
      .run(scope.id, scope.domain, scope.authorization_expires_at);
    const env = { DB, OPENAI_API_KEY: "test-key", SECURITY_RUNNER_SIGNING_KEY: secret, SECURITY_ACTIVE_RUNNER: { fetch: (request) => enqueue(request, { DB, SECURITY_RUNNER_SIGNING_KEY: secret, ACTIVE_RUN_QUEUE: { send: async (message) => sent.push(message) } }) } };
    const started = await startAgenticPentest(env, scope, 7, true);
    assert.equal(started.status, "scheduled");
    sqlite.prepare("UPDATE security_agentic_sessions SET window_start = ? WHERE id = ?").run(new Date(Date.now() - 60_000).toISOString(), started.id);
    let modelCalls = 0;
    globalThis.fetch = async (input) => {
      assert.equal(String(input), "https://api.openai.com/v1/responses");
      modelCalls++;
      const outputs = [
        { testId: "web_control_probe", reason: "Conferir controles web observáveis antes de seguir." },
        { summary: "Sonda de controles concluída com resposta observada.", confidence: "medium", evidenceCodes: ["RUNNER_REQUESTS", "RUNNER_WEB_PROBE"], uncertainties: [], nextFocus: "Conferir o transporte HTTPS.", continueTesting: true },
        { testId: "tls_configuration_review", reason: "Complementar o controle web com o estado de HTTPS." },
        { summary: "Transporte HTTPS observado na raiz.", confidence: "medium", evidenceCodes: ["RUNNER_REQUESTS", "RUNNER_TRANSPORT"], uncertainties: [], nextFocus: "Revisão humana da cobertura.", continueTesting: false },
      ];
      return Response.json({ output_text: JSON.stringify(outputs[modelCalls - 1]) });
    };
    assert.deepEqual(await advanceDueAgenticPentests(env), { checked: 1, advanced: 1, failed: 0 }, JSON.stringify(sqlite.prepare("SELECT status, phase, last_error_code FROM security_agentic_sessions WHERE id = ?").get(started.id)));
    const step = sqlite.prepare("SELECT * FROM security_agentic_steps WHERE session_id = ?").get(started.id);
    assert.equal(step.test_id, "web_control_probe");
    assert.equal(sent.length, 1);
    assert.equal(sqlite.prepare("SELECT status FROM security_agentic_sessions WHERE id = ?").get(started.id).status, "running");
    const result = { version: "test", domain: scope.domain, techniques: [step.test_id], startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), outcome: "completed", stopReason: null, budget: { requestsPerMinute: 10, totalRequests: 2, consumed: 2 }, requests: { successful: 2, errors: 0, serverErrors: 0, statusCodes: { "200": 2 } }, transport: null, crawl: null, webProbe: { requestsCompleted: 2, cors: { verdict: "restricted", allowCredentials: false, varyOrigin: false }, methods: { responseObserved: true, advertised: [], riskyAdvertised: [] }, cookies: { observed: false, secureObserved: false, httpOnlyObserved: false, sameSiteObserved: false }, signals: [] }, limitation: "test" };
    sqlite.prepare("UPDATE security_runner_jobs SET status = 'completed', result_json = ?, request_count = 2 WHERE campaign_id = ?").run(JSON.stringify(result), step.campaign_id);
    assert.deepEqual(await advanceDueAgenticPentests(env), { checked: 1, advanced: 1, failed: 0 });
    const afterFirst = sqlite.prepare("SELECT status, phase, consumed_requests, step_count FROM security_agentic_sessions WHERE id = ?").get(started.id);
    assert.deepEqual({ ...afterFirst }, { status: "running", phase: "planning", consumed_requests: 2, step_count: 1 });
    assert.equal(JSON.parse(sqlite.prepare("SELECT verdict_json FROM security_agentic_steps WHERE id = ?").get(step.id).verdict_json).evidenceCodes[1], "RUNNER_WEB_PROBE");
    assert.deepEqual(await advanceDueAgenticPentests(env), { checked: 1, advanced: 1, failed: 0 });
    const second = sqlite.prepare("SELECT * FROM security_agentic_steps WHERE session_id = ? AND step_no = 2").get(started.id);
    assert.equal(second.test_id, "tls_configuration_review");
    assert.equal(sent.length, 2);
    sqlite.prepare("UPDATE security_runner_jobs SET status = 'completed', result_json = ?, request_count = 1 WHERE campaign_id = ?").run(JSON.stringify({ ...result, techniques: [second.test_id], budget: { requestsPerMinute: 10, totalRequests: 1, consumed: 1 }, requests: { successful: 1, errors: 0, serverErrors: 0, statusCodes: { "200": 1 } }, transport: { httpsReachable: true, status: 200, hstsObserved: true, cspObserved: false, limitation: "test" }, webProbe: null }), second.campaign_id);
    assert.deepEqual(await advanceDueAgenticPentests(env), { checked: 1, advanced: 1, failed: 0 });
    const session = sqlite.prepare("SELECT status, phase, consumed_requests, step_count FROM security_agentic_sessions WHERE id = ?").get(started.id);
    assert.deepEqual({ ...session }, { status: "completed", phase: "done", consumed_requests: 3, step_count: 2 });
    assert.equal(modelCalls, 4);
    assert.equal(sent.length, 2);
  } finally { globalThis.fetch = originalFetch; sqlite.close(); }
});

test("cancellation prevents scheduled agentic probes", async () => {
  const { sqlite, DB } = database();
  const scope = { id: `sas_${crypto.randomUUID()}`, workspace_id: 42, domain: "example.com", status: "verified", authorization_expires_at: new Date(Date.now() + 86_400_000).toISOString() };
  try {
    const env = { DB, OPENAI_API_KEY: "test-key", SECURITY_RUNNER_SIGNING_KEY: "agentic-test-signing-key-with-at-least-thirty-two-characters", SECURITY_ACTIVE_RUNNER: { fetch: async () => Response.json({ jobId: "run_unused" }, { status: 202 }) } };
    const session = await startAgenticPentest(env, scope, 7, true);
    assert.equal((await cancelAgenticPentest(env, { workspaceId: 42, scopeId: scope.id, sessionId: session.id, actorUserId: 7 })).status, "cancelled");
    sqlite.prepare("UPDATE security_agentic_sessions SET window_start = ? WHERE id = ?").run(new Date(Date.now() - 60_000).toISOString(), session.id);
    assert.deepEqual(await advanceDueAgenticPentests(env), { checked: 0, advanced: 0, failed: 0 });
    assert.equal(sqlite.prepare("SELECT COUNT(*) total FROM security_agentic_steps").get().total, 0);
  } finally { sqlite.close(); }
});

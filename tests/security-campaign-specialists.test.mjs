import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { dispatchDueCampaignSpecialists, processCampaignSpecialistMessage } from "../app/security-campaign-specialists.ts";

function fixture() {
  const sqlite = new DatabaseSync(":memory:");
  for (const migration of ["0051_security_validation_agent.sql", "0052_security_agent_execution_queue.sql", "0053_security_agent_model_routing.sql", "0054_security_findings_workflow.sql", "0055_security_campaigns_and_remediation.sql", "0056_continuous_defense.sql", "0062_isolated_security_runner.sql", "0065_guided_security_campaigns.sql", "0066_campaign_specialist_pipeline.sql"]) {
    sqlite.exec(readFileSync(new URL(`../drizzle/${migration}`, import.meta.url), "utf8"));
  }
  const DB = {
    prepare(sql) {
      const statement = sqlite.prepare(sql);
      const bound = (values) => ({ first: async () => statement.get(...values) ?? null, all: async () => ({ results: statement.all(...values) }), run: async () => ({ meta: { changes: Number(statement.run(...values).changes) } }) });
      return { ...bound([]), bind: (...values) => bound(values) };
    },
    batch: async (statements) => Promise.all(statements.map((statement) => statement.run())),
  };
  const id = `sac_${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const expiry = new Date(Date.now() + 86400_000).toISOString();
  sqlite.prepare("INSERT INTO security_agent_scopes (id, workspace_id, domain, status, verification_token, created_by_user_id, authorization_attested_at, authorization_expires_at) VALUES ('scope', 42, 'example.com', 'verified', 'token', 7, ?, ?)").run(now, expiry);
  const evidence = {
    version: "test", domain: "example.com", techniques: ["safe_web_crawl", "web_control_probe"], outcome: "completed", stopReason: null,
    budget: { totalRequests: 20, consumed: 3 }, requests: { successful: 3, errors: 0, serverErrors: 0 },
    transport: { httpsReachable: true, status: 200, hstsObserved: false, cspObserved: true },
    crawl: { pagesVisited: 2, htmlPages: 1, hstsCoveragePercent: 0, cspCoveragePercent: 100 },
    webProbe: { requestsCompleted: 2, cors: { verdict: "restricted" }, methods: { riskyAdvertised: [] }, cookies: { observed: false, secureObserved: false, httpOnlyObserved: false, sameSiteObserved: false }, signals: [{ code: "HSTS_MISSING", severity: "medium", title: "HSTS não observado" }] },
  };
  sqlite.prepare(`INSERT INTO security_campaigns (id, workspace_id, scope_id, name, environment, techniques_json, policy_version, window_start, window_end, max_requests_per_minute, max_total_requests, stop_conditions_json, status, executor, runner_result_json, specialist_status)
    VALUES (?, 42, 'scope', 'Validação controlada', 'production', '["safe_web_crawl"]', 'v3', ?, ?, 10, 20, '{}', 'completed', 'isolated_runner', ?, 'pending')`)
    .run(id, now, expiry, JSON.stringify(evidence));
  return { sqlite, DB, id };
}

test("three specialists receive bounded evidence and only the previous validated fragment", async () => {
  const { sqlite, DB, id } = fixture();
  const originalFetch = globalThis.fetch;
  const queued = [];
  const calls = [];
  try {
    const env = { DB, OPENAI_API_KEY: "test-key", SECURITY_SCAN_QUEUE: { send: async (message) => queued.push(message) } };
    assert.deepEqual(await dispatchDueCampaignSpecialists(env), { queued: 1, unavailable: false });
    assert.deepEqual(queued, [{ version: 2, campaignId: id, workspaceId: 42 }]);
    globalThis.fetch = async (_url, init) => {
      const body = JSON.parse(init.body);
      calls.push(body);
      return Response.json({ output_text: JSON.stringify({ summary: `Fragmento ${calls.length}`, evidenceCodes: ["HSTS_MISSING"], uncertainties: ["Exige validação humana"], nextFocus: "Conferir controles" }), usage: { input_tokens: 120, output_tokens: 80 } });
    };
    assert.equal((await processCampaignSpecialistMessage(env, { version: 2, campaignId: id, workspaceId: 43 })).status, "already_claimed");
    assert.equal((await processCampaignSpecialistMessage(env, queued[0])).status, "completed");
    assert.equal(calls.length, 3);
    assert.equal(JSON.parse(calls[0].input).priorFragment, null);
    assert.equal(JSON.parse(calls[1].input).priorFragment.summary, "Fragmento 1");
    assert.equal(JSON.parse(calls[2].input).priorFragment.summary, "Fragmento 2");
    assert.equal(calls.every((call) => call.store === false && call.max_output_tokens === 1600 && !call.tools && typeof call.safety_identifier === "string"), true);
    const row = sqlite.prepare("SELECT specialist_status, specialist_result_json FROM security_campaigns WHERE id = ?").get(id);
    assert.equal(row.specialist_status, "completed");
    assert.equal(JSON.parse(row.specialist_result_json).remediation.fragment.summary, "Fragmento 3");
    assert.equal(sqlite.prepare("SELECT COUNT(*) total FROM security_campaign_events WHERE campaign_id = ? AND event_type = 'campaign.specialist_completed'").get(id).total, 3);
    assert.equal((await processCampaignSpecialistMessage(env, queued[0])).status, "already_claimed");
    assert.equal(calls.length, 3);
  } finally { globalThis.fetch = originalFetch; sqlite.close(); }
});

test("specialist output cannot cite evidence absent from the runner result", async () => {
  const { sqlite, DB, id } = fixture();
  const originalFetch = globalThis.fetch;
  try {
    const env = { DB, OPENAI_API_KEY: "test-key", SECURITY_SCAN_QUEUE: { send: async () => undefined } };
    await dispatchDueCampaignSpecialists(env);
    globalThis.fetch = async () => Response.json({ output_text: JSON.stringify({ summary: "Risco inventado", evidenceCodes: ["FABRICATED_CVE"], uncertainties: [], nextFocus: "" }) });
    const result = await processCampaignSpecialistMessage(env, { version: 2, campaignId: id, workspaceId: 42 });
    assert.equal(result.status, "failed");
    assert.equal(sqlite.prepare("SELECT specialist_error_code FROM security_campaigns WHERE id = ?").get(id).specialist_error_code, "SPECIALIST_OUTPUT_INVALID");
  } finally { globalThis.fetch = originalFetch; sqlite.close(); }
});

test("budget-limited review receives specialist triage with explicit partial coverage", async () => {
  const { sqlite, DB, id } = fixture();
  const originalFetch = globalThis.fetch;
  const queued = [];
  const calls = [];
  try {
    const evidence = JSON.parse(sqlite.prepare("SELECT runner_result_json FROM security_campaigns WHERE id = ?").get(id).runner_result_json);
    evidence.outcome = "stopped";
    evidence.stopReason = "infrastructure_subrequest_budget";
    evidence.crawl = { ...evidence.crawl, discoveredPages: 12, remainingPages: 10 };
    sqlite.prepare("UPDATE security_campaigns SET status = 'review', runner_result_json = ? WHERE id = ?").run(JSON.stringify(evidence), id);
    const env = { DB, OPENAI_API_KEY: "test-key", SECURITY_SCAN_QUEUE: { send: async (message) => queued.push(message) } };
    assert.deepEqual(await dispatchDueCampaignSpecialists(env), { queued: 1, unavailable: false });
    globalThis.fetch = async (_url, init) => {
      const body = JSON.parse(init.body);
      calls.push(body);
      return Response.json({ output_text: JSON.stringify({ summary: "Amostra parcial", evidenceCodes: ["RUNNER_CRAWL"], uncertainties: ["Páginas restantes sem análise"], nextFocus: "Validar cobertura" }) });
    };
    assert.equal((await processCampaignSpecialistMessage(env, queued[0])).status, "completed");
    assert.equal(calls.length, 3);
    assert.equal(JSON.parse(calls[0].input).observations.crawl.remainingPages, 10);
    assert.equal(JSON.parse(calls[0].input).observations.stopReason, "infrastructure_subrequest_budget");
    assert.match(calls[0].instructions, /cobertura é parcial/);
    assert.equal(sqlite.prepare("SELECT status FROM security_campaigns WHERE id = ?").get(id).status, "review");
  } finally { globalThis.fetch = originalFetch; sqlite.close(); }
});

test("review without enough evidence or with a DNS stop does not spend model calls", async () => {
  const { sqlite, DB, id } = fixture();
  try {
    const evidence = JSON.parse(sqlite.prepare("SELECT runner_result_json FROM security_campaigns WHERE id = ?").get(id).runner_result_json);
    evidence.outcome = "stopped";
    evidence.stopReason = "dns_unavailable";
    sqlite.prepare("UPDATE security_campaigns SET status = 'review', runner_result_json = ? WHERE id = ?").run(JSON.stringify(evidence), id);
    const queued = [];
    const env = { DB, OPENAI_API_KEY: "test-key", SECURITY_SCAN_QUEUE: { send: async (message) => queued.push(message) } };
    assert.deepEqual(await dispatchDueCampaignSpecialists(env), { queued: 0, unavailable: false });
    evidence.stopReason = "request_budget_reached";
    evidence.requests.successful = 1;
    sqlite.prepare("UPDATE security_campaigns SET runner_result_json = ? WHERE id = ?").run(JSON.stringify(evidence), id);
    assert.deepEqual(await dispatchDueCampaignSpecialists(env), { queued: 0, unavailable: false });
    assert.equal(queued.length, 0);
    assert.equal((await processCampaignSpecialistMessage(env, { version: 2, campaignId: id, workspaceId: 42 })).status, "already_claimed");
  } finally { sqlite.close(); }
});

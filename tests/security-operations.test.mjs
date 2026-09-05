import assert from "node:assert/strict";
import test from "node:test";
import { operationalPlaybooks, parseTelemetry, telemetryEvidence } from "../domain/security-operations.ts";
import { validateSecurityAssessment } from "../domain/security-assessment-validation.ts";
import { analyzeWithOpenAI, enqueueSecurityAgentJob, processSecurityAgentQueueMessage } from "../app/security-agent-service.ts";
import { updateSecurityFinding } from "../app/security-findings-service.ts";
import { securityEvaluationCases } from "./fixtures/security-agent-evaluation.mjs";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { securityKnowledgeForCode, securityKnowledgeForCodes, SECURITY_KNOWLEDGE_VERSION } from "../domain/security-knowledge.ts";

const fixtures = securityEvaluationCases();
const sample = () => structuredClone(fixtures[0].telemetry);
const assessment = (code = "bt-waf") => ({ executiveSummary: "Bloqueios reportados precisam de triagem.", riskLevel: "medium", confidence: "medium", priorities: [{ title: "Revisar WAF", severity: "medium", why: "Contagens informadas pelo operador.", recommendation: "Revise os logs originais e falsos positivos.", evidenceCodes: [code] }], positiveSignals: [], uncertainties: ["Sem logs originais."], limitations: ["Não confirma comprometimento."] });

test("telemetry rejects secrets, free text, unknown fields and missing metrics", () => {
  for (const mutate of [
    (data) => { data.apiKey = "secret"; },
    (data) => { data.metrics.rawLog = "password=secret"; },
    (data) => { data.metrics.failedLogins = "20"; },
    (data) => { delete data.metrics.mfaFailures; },
    (data) => { data.metrics.failedLogins = -1; },
    (data) => { data.metrics.failedLogins = 1.5; },
    (data) => { data.metrics.failedLogins = Infinity; },
    (data) => { data.metrics.failedLogins = 1000001; },
    (data) => { delete data.coverage.application; },
    (data) => { data.coverage.perimeter = "guessed"; },
    (data) => { data.coverage.rawSource = "secret"; },
  ]) { const data = sample(); mutate(data); assert.throws(() => parseTelemetry(data), /TELEMETRY_/); }
});

test("missing or partial source coverage can never be reported as a pass", async () => {
  const unavailable = sample(); unavailable.coverage.authentication = "unavailable";
  const partial = sample(); partial.coverage.application = "partial";
  assert.equal((await telemetryEvidence("example.com", unavailable)).checks.find((check) => check.code === "bt-auth").status, "unavailable");
  assert.equal((await telemetryEvidence("example.com", partial)).checks.find((check) => check.code === "bt-availability").status, "warning");
});

test("telemetry enforces consistent counts and bounded time windows", () => {
  const data = sample();
  data.metrics.wafBlocks = 900; data.metrics.serverErrors = 101;
  assert.throws(() => parseTelemetry(data), /COUNTS_INCONSISTENT/);
  for (const [start, end] of [[data.end, data.start], [data.start, data.start], ["bad", data.end], ["2020-01-01T00:00:00Z", "2020-01-01T01:00:00Z"], [data.start, "2099-01-01T00:00:00Z"]]) {
    assert.throws(() => parseTelemetry({ ...sample(), start, end }), /WINDOW_INVALID/);
  }
});

for (const fixture of fixtures) test(`blue-team regression: ${fixture.id}`, async () => {
  const evidence = await telemetryEvidence("example.com", parseTelemetry(fixture.telemetry));
  assert.deepEqual(evidence.checks.filter((check) => ["risk", "warning"].includes(check.status)).map((check) => check.code), fixture.alerts);
  assert.equal(evidence.source, "manual_telemetry");
  assert.equal(evidence.posture.score, undefined);
  const result = await analyzeWithOpenAI({}, 1, evidence);
  assert.equal(result.provider, "deterministic");
  assert.equal(result.assessment.confidence, "low");
  validateSecurityAssessment(result.assessment, evidence.checks.map((check) => check.code));
  assert.ok(operationalPlaybooks(evidence).every((book) => book.execution === "manual" && book.track === "blue_team"));
});

test("fingerprint includes time window and counts, not just risk statuses", async () => {
  const data = sample();
  const first = await telemetryEvidence("example.com", data);
  data.metrics.successfulLogins++;
  assert.notEqual(first.fingerprint, (await telemetryEvidence("example.com", data)).fingerprint);
});

test("knowledge catalog maps every emitted evidence code and keeps ATT&CK as hypothesis", async () => {
  const passiveCodes = ["public-dns", "mx", "spf", "dmarc", "https", "hsts", "csp", "browser-headers"];
  const blueCodes = (await telemetryEvidence("example.com", sample())).checks.map((check) => check.code);
  assert.match(SECURITY_KNOWLEDGE_VERSION, /^security-knowledge\./);
  assert.equal(securityKnowledgeForCodes([...passiveCodes, ...blueCodes]).length, passiveCodes.length + blueCodes.length);
  assert.equal(securityKnowledgeForCode("unknown"), null);
  for (const code of ["bt-auth", "bt-privilege"]) {
    const entry = securityKnowledgeForCode(code);
    assert.equal(entry.validationMethod, "manual_log_review");
    assert.ok(entry.references.filter((reference) => reference.framework === "MITRE ATT&CK").every((reference) => reference.relationship === "threat_hypothesis"));
    assert.match(entry.boundary, /não confirm/i);
  }
  const csp = securityKnowledgeForCode("csp");
  assert.match(csp.references[0].version, /2026-09-05/);
});

test("model output rejects fabricated evidence and malformed structured results", () => {
  assert.throws(() => validateSecurityAssessment(assessment("invented-cve"), ["bt-waf"]), /EVIDENCE_INVALID/);
  for (const mutate of [
    (data) => { data.priorities[0].evidenceCodes = []; },
    (data) => { data.riskLevel = "guaranteed-safe"; },
    (data) => { data.riskLevel = ["high"]; },
    (data) => { data.limitations = []; },
    (data) => { data.priorities = null; },
    (data) => { data.command = "arbitrary"; },
  ]) { const data = assessment(); mutate(data); assert.throws(() => validateSecurityAssessment(data, ["bt-waf"])); }
  validateSecurityAssessment(assessment(), ["bt-waf"]);
});

test("real provider path uses blue-team instructions and retains primary if review fails", async () => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "https://api.openai.com/v1/responses");
    calls.push(JSON.parse(options.body));
    if (calls.length === 2) return Response.json({}, { status: 503 });
    return Response.json({ id: "test-response", output_text: JSON.stringify({ ...assessment(), confidence: "low" }), usage: { input_tokens: 10, output_tokens: 20, total_tokens: 30 } });
  };
  try {
    const evidence = await telemetryEvidence("example.com", fixtures[3].telemetry);
    const result = await analyzeWithOpenAI({ OPENAI_API_KEY: "test-only" }, 42, evidence);
    assert.equal(result.provider, "openai_primary");
    assert.equal(result.primaryModel, "gpt-5.6-terra");
    assert.equal(result.reviewReason, "primary_low_confidence");
    assert.equal(calls[0].metadata.workflow, "blue_team_triage");
    assert.equal(calls[0].metadata.knowledge_version, SECURITY_KNOWLEDGE_VERSION);
    assert.equal(calls[1].metadata.workflow, "blue_team_review");
    assert.match(calls[0].instructions, /contagens fornecidas pelo operador/);
    assert.equal(calls[0].store, false);
    assert.equal(calls[0].tools, undefined);
    assert.equal(JSON.parse(calls[0].input).source, "manual_telemetry");
    assert.equal(JSON.parse(calls[0].input).knowledge.length, 4);
    assert.equal(result.usage.primary.totalTokens, 30);
  } finally { globalThis.fetch = original; }
});

test("provider fabricated citations fail validation before being returned", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ output_text: JSON.stringify(assessment("fabricated")) });
  try { await assert.rejects(analyzeWithOpenAI({ OPENAI_API_KEY: "test-only" }, 42, await telemetryEvidence("example.com", sample())), /ASSESSMENT_EVIDENCE_INVALID/); }
  finally { globalThis.fetch = original; }
});

test("unverified scope cannot enqueue telemetry or invoke model", async () => {
  const forbiddenDB = { prepare() { throw new Error("DB_MUST_NOT_BE_CALLED"); } };
  await assert.rejects(enqueueSecurityAgentJob({ DB: forbiddenDB }, { status: "pending" }, 1, "manual", sample()), /SCOPE_NOT_VERIFIED/);
});

test("blue-team lifecycle persists evidence on SQLite without moving passive monitoring schedule", async () => {
  const sqlite = new DatabaseSync(":memory:");
  const original = globalThis.fetch;
  try {
    for (const migration of ["0051_security_validation_agent.sql", "0052_security_agent_execution_queue.sql", "0053_security_agent_model_routing.sql", "0054_security_findings_workflow.sql", "0055_security_campaigns_and_remediation.sql"]) sqlite.exec(readFileSync(new URL(`../drizzle/${migration}`, import.meta.url), "utf8"));
    sqlite.exec("CREATE TABLE workspace_members (workspace_id integer, user_id integer, status text); INSERT INTO workspace_members VALUES (42, 7, 'active');");
    const timestamp = new Date().toISOString();
    sqlite.prepare("INSERT INTO security_agent_scopes (id, workspace_id, domain, status, verification_token, created_by_user_id, authorization_attested_at, authorization_expires_at, next_scan_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run("scope", 42, "example.com", "verified", "expected", 1, timestamp, new Date(Date.now() + 86400000).toISOString(), "2030-01-01 00:00:00");
    const DB = {
      prepare(sql) {
        const statement = sqlite.prepare(sql);
        const bound = (values) => ({
          first: async () => statement.get(...values) ?? null,
          all: async () => ({ results: statement.all(...values) }),
          run: async () => ({ meta: { changes: Number(statement.run(...values).changes) } }),
        });
        return { ...bound([]), bind: (...values) => bound(values) };
      },
      batch: async (statements) => Promise.all(statements.map((statement) => statement.run())),
    };
    const scope = sqlite.prepare("SELECT * FROM security_agent_scopes WHERE id = ?").get("scope");
    const messages = [];
    globalThis.fetch = async (url) => {
      assert.match(String(url), /cloudflare-dns/);
      return Response.json({ Answer: [{ type: 16, data: '"cbshub-verification=expected"' }] });
    };
    const env = { DB, SECURITY_SCAN_QUEUE: { send: async (message) => { messages.push(message); } } };
    const queued = await enqueueSecurityAgentJob(env, scope, 1, "manual", fixtures[3].telemetry);
    assert.equal(queued.status, "queued");
    assert.equal(messages.length, 1);
    await assert.rejects(enqueueSecurityAgentJob(env, scope, 1, "manual", sample()), /JOB_ALREADY_RUNNING/);
    const result = await processSecurityAgentQueueMessage(env, messages[0]);
    assert.equal(result.status, "completed");
    const saved = sqlite.prepare("SELECT * FROM security_agent_jobs WHERE id = ?").get(queued.id);
    assert.equal(saved.scan_mode, "blue_team");
    assert.equal(saved.provider, "deterministic");
    assert.equal(saved.finding_sync_status, "synced");
    assert.equal(JSON.parse(saved.evidence_json).source, "manual_telemetry");
    assert.equal(JSON.parse(saved.assessment_json).confidence, "low");
    const finding = sqlite.prepare("SELECT * FROM security_findings WHERE scope_id = ?").get("scope");
    assert.equal(finding.evidence_code, "bt-waf");
    assert.equal(finding.status, "open");
    assert.equal(finding.occurrence_count, 1);
    const updated = await updateSecurityFinding({ DB }, { workspaceId: 42, findingId: finding.id, actorUserId: 1, status: "mitigated", assignedUserId: 7, dueAt: "2030-01-01", resolutionSummary: "Regra revisada e retestada pelo analista." });
    assert.equal(updated.status, "mitigated");
    assert.equal(sqlite.prepare("SELECT assigned_user_id FROM security_findings WHERE id = ?").get(finding.id).assigned_user_id, 7);
    assert.equal(sqlite.prepare("SELECT COUNT(*) total FROM security_finding_events WHERE finding_id = ?").get(finding.id).total, 2);
    await assert.rejects(updateSecurityFinding({ DB }, { workspaceId: 42, findingId: finding.id, actorUserId: 1, status: "accepted_risk", assignedUserId: 999, dueAt: null, resolutionSummary: "Aceito formalmente pela gestão responsável." }), /ASSIGNEE_INVALID/);
    await assert.rejects(updateSecurityFinding({ DB }, { workspaceId: 42, findingId: finding.id, actorUserId: 1, status: "false_positive", assignedUserId: 7, dueAt: null, resolutionSummary: "curto" }), /RESOLUTION_INVALID/);
    await assert.rejects(updateSecurityFinding({ DB }, { workspaceId: 42, findingId: finding.id, actorUserId: 1, status: "accepted_risk", assignedUserId: 7, dueAt: null, resolutionSummary: "token=segredo-super-secreto" }), /RESOLUTION_INVALID/);
    assert.equal(sqlite.prepare("SELECT next_scan_at FROM security_agent_scopes").get().next_scan_at, "2030-01-01 00:00:00");
    assert.equal((await processSecurityAgentQueueMessage(env, messages[0])).status, "completed");
    assert.equal(sqlite.prepare("SELECT attempt_count FROM security_agent_jobs").get().attempt_count, 1);
    await assert.rejects(enqueueSecurityAgentJob(env, { ...scope, authorization_expires_at: "2020-01-01T00:00:00Z" }, 1, "manual", sample()), /SCOPE_AUTHORIZATION_EXPIRED/);
  } finally { globalThis.fetch = original; sqlite.close(); }
});

test("queue rechecks ownership before processing blue-team evidence", async () => {
  const original = globalThis.fetch;
  const job = { id: "job", scope_id: "scope", workspace_id: 42, scan_mode: "blue_team", status: "queued", attempt_count: 1, evidence_json: JSON.stringify({ telemetry: sample() }) };
  const scope = { id: "scope", workspace_id: 42, domain: "example.com", status: "verified", authorization_attested_at: new Date().toISOString(), authorization_expires_at: new Date(Date.now() + 86400000).toISOString(), verification_token: "expected" };
  const writes = [];
  const DB = {
    prepare(sql) {
      return {
        bind(...values) {
          return {
            first: async () => sql.includes("FROM security_agent_jobs") ? job : sql.includes("FROM security_campaigns") ? null : scope,
            run: async () => { writes.push({ sql, values }); return { meta: { changes: 1 } }; },
          };
        },
      };
    },
  };
  globalThis.fetch = async (url) => { assert.match(String(url), /cloudflare-dns/); return Response.json({ Answer: [] }); };
  try {
    const result = await processSecurityAgentQueueMessage({ DB, OPENAI_API_KEY: "test-only" }, { version: 1, jobId: "job", scopeId: "scope", workspaceId: 42 });
    assert.equal(result.status, "failed");
    assert.equal(result.errorCode, "SCOPE_VERIFICATION_LOST");
    assert.ok(writes.some((write) => write.sql.includes("monitoring_enabled = 0")));
  } finally { globalThis.fetch = original; }
});

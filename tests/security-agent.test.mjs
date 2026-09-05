import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const service = fs.readFileSync(new URL("../app/security-agent-service.ts", import.meta.url), "utf8");
const route = fs.readFileSync(new URL("../app/api/security-agent/route.ts", import.meta.url), "utf8");
const worker = fs.readFileSync(new URL("../worker/index.ts", import.meta.url), "utf8");
const migration = fs.readFileSync(new URL("../drizzle/0051_security_validation_agent.sql", import.meta.url), "utf8");
const queueMigration = fs.readFileSync(new URL("../drizzle/0052_security_agent_execution_queue.sql", import.meta.url), "utf8");
const routingMigration = fs.readFileSync(new URL("../drizzle/0053_security_agent_model_routing.sql", import.meta.url), "utf8");
const client = fs.readFileSync(new URL("../app/app/SecurityAgentCenter.tsx", import.meta.url), "utf8");
const wrangler = fs.readFileSync(new URL("../wrangler.migrations.jsonc", import.meta.url), "utf8");
const finalizer = fs.readFileSync(new URL("../scripts/finalize-workers-config.mjs", import.meta.url), "utf8");

test("security agent requires authenticated workspace and explicit authorization", () => {
  assert.match(route, /getCurrentUser/);
  assert.match(route, /getWorkspaceContext/);
  assert.match(route, /canManageWorkspace/);
  assert.match(route, /authorizationConfirmed !== true/);
  assert.match(route, /scopeLimitResponse/);
  assert.match(route, /scheduledMonitoringEnabled/);
  assert.match(route, /Verifique a titularidade do domínio/);
});

test("domain ownership is verified with a scoped DNS TXT record", () => {
  assert.match(service, /_cbshub-verification\.\$\{scope\.domain\}/);
  assert.match(service, /cbshub-verification=\$\{scope\.verification_token\}/);
  assert.match(service, /scope\.verified/);
  assert.match(service, /scope\.verification_lost/);
  assert.match(service, /monitoring_enabled = 0/);
  assert.match(migration, /security_agent_scopes_active_domain_idx/);
});

test("OpenAI runs only server-side with structured defensive output", () => {
  assert.match(service, /https:\/\/api\.openai\.com\/v1\/responses/);
  assert.match(service, /OPENAI_API_KEY/);
  assert.match(service, /store: false/);
  assert.match(service, /type: "json_schema"/);
  assert.match(service, /Não forneça payloads/);
  assert.doesNotMatch(client, /OPENAI_API_KEY|api\.openai\.com/);
});

test("model routing uses Terra by default and escalates objective cases to Sol", () => {
  assert.match(service, /defaultPrimaryModel = "gpt-5\.6-terra"/);
  assert.match(service, /defaultReviewModel = "gpt-5\.6-sol"/);
  assert.match(service, /reasoning: \{ effort \}/);
  assert.match(service, /effort: "medium"/);
  assert.match(service, /effort: "high"/);
  assert.match(service, /function reviewReason/);
  assert.match(service, /assessment\.confidence === "low"/);
  assert.match(service, /provider: "openai_reviewed"/);
  assert.match(service, /security_agent\.review_failed/);
  assert.doesNotMatch(service, /gpt-5\.4-mini/);
  assert.match(routingMigration, /primary_model/);
  assert.match(routingMigration, /review_model/);
  assert.match(routingMigration, /review_reason/);
  assert.match(routingMigration, /provider_usage_json/);
});

test("daily execution is opt-in, passive and auditable", () => {
  assert.match(worker, /runScheduledSecurityAgent/);
  assert.match(service, /monitoring_enabled = 1/);
  assert.match(service, /DAILY_SCAN_LIMIT/);
  assert.match(service, /JOB_ALREADY_RUNNING/);
  assert.match(service, /scan_mode.*'passive'/s);
  assert.match(migration, /security_agent_jobs/);
  assert.match(migration, /security_agent_events/);
  assert.match(client, /Monitorar diariamente/);
});

test("execution is queued, idempotently claimed and retried outside the request", () => {
  assert.match(route, /enqueueSecurityAgentJob/);
  assert.match(route, /status: job\.status === "queued" \? 202 : 200/);
  assert.match(service, /scan\.queued/);
  assert.match(service, /status = 'running', attempt_count = attempt_count \+ 1/);
  assert.match(service, /status: current\?\.status === "running" \? "leased"/);
  assert.match(service, /SECURITY_JOB_RETRY/);
  assert.match(worker, /async queue/);
  assert.match(worker, /processSecurityAgentQueueMessage/);
  assert.match(worker, /result\.status === "leased"/);
  assert.match(wrangler, /cbs-hub-security-scans/);
  assert.match(wrangler, /cbs-hub-security-scans-dlq/);
  assert.match(finalizer, /generated\.queues = production\.queues/);
  assert.match(queueMigration, /security_agent_jobs_queue_idx/);
});

test("authorization is time-bound and renewed with an explicit attestation", () => {
  assert.match(queueMigration, /authorization_expires_at/);
  assert.match(service, /authorizationValidityDays = 90/);
  assert.match(service, /scope\.authorization_expired/);
  assert.match(route, /renew_authorization/);
  assert.match(route, /authorizationConfirmed !== true/);
  assert.match(client, /Renovar autorização/);
});

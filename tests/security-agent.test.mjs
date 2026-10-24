import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const service = fs.readFileSync(new URL("../app/security-agent-service.ts", import.meta.url), "utf8");
const route = fs.readFileSync(new URL("../app/api/security-agent/route.ts", import.meta.url), "utf8");
const worker = fs.readFileSync(new URL("../worker/index.ts", import.meta.url), "utf8");
const migration = fs.readFileSync(new URL("../drizzle/0051_security_validation_agent.sql", import.meta.url), "utf8");
const queueMigration = fs.readFileSync(new URL("../drizzle/0052_security_agent_execution_queue.sql", import.meta.url), "utf8");
const routingMigration = fs.readFileSync(new URL("../drizzle/0053_security_agent_model_routing.sql", import.meta.url), "utf8");
const findingsMigration = fs.readFileSync(new URL("../drizzle/0054_security_findings_workflow.sql", import.meta.url), "utf8");
const campaignMigration = fs.readFileSync(new URL("../drizzle/0055_security_campaigns_and_remediation.sql", import.meta.url), "utf8");
const campaignService = fs.readFileSync(new URL("../app/security-campaign-service.ts", import.meta.url), "utf8");
const campaignPolicy = fs.readFileSync(new URL("../domain/security-campaign-policy.ts", import.meta.url), "utf8");
const client = fs.readFileSync(new URL("../app/app/SecurityAgentCenter.tsx", import.meta.url), "utf8");
const deliveryPanel = fs.readFileSync(new URL("../app/app/SecurityDeliveryPanel.tsx", import.meta.url), "utf8");
const agenticPanel = fs.readFileSync(new URL("../app/app/SecurityAgenticPentestPanel.tsx", import.meta.url), "utf8");
const agenticPage = fs.readFileSync(new URL("../app/app/pentest-agentivo/page.tsx", import.meta.url), "utf8");
const projectRemediationPanel = fs.readFileSync(new URL("../app/app/SecurityProjectRemediationPanel.tsx", import.meta.url), "utf8");
const repositoriesPanel = fs.readFileSync(new URL("../app/app/SecurityRepositoriesPanel.tsx", import.meta.url), "utf8");
const operationsPanel = fs.readFileSync(new URL("../app/app/SecurityOperationsPanel.tsx", import.meta.url), "utf8");
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
  assert.match(service, /normalizedTelemetry \? "blue_team" : \(requestedScanMode \?\? "passive"\)/);
  assert.match(migration, /security_agent_jobs/);
  assert.match(migration, /security_agent_events/);
  assert.match(client, /Monitorar diariamente/);
});

test("workspace separates product modules and hides model names from the interface", () => {
  for (const route of ["/app/autorizar", "/app/ativos", "/app/operacoes", "/app/projetos"]) {
    assert.match(client, new RegExp(route.replaceAll("/", "\\/")));
  }
  assert.doesNotMatch(client, /gpt-5\.[0-9]/);
  assert.doesNotMatch(client, /modelRouting\.primary/);
  assert.doesNotMatch(client, /primaryModel \?\?/);
});

test("operations lead with an authorized automatic scan and keep conservative controls advanced", () => {
  assert.match(client, /security-automatic-evaluation/);
  assert.match(client, /onClick=\{\(\) => void act\("run_scan", \{ scopeId: scope\.id \}\)\}/);
  assert.match(client, /scope\.status !== "verified" \|\| authorizationExpired/);
  assert.match(client, /security-advanced-tools/);
  assert.match(operationsPanel, /defaultValue="unavailable"/);
  assert.match(deliveryPanel, /setEnvironment\] = useState\("production"\)/);
  assert.match(deliveryPanel, /"safe_web_crawl", "tls_configuration_review", "web_control_probe"/);
  assert.match(deliveryPanel, /defaultValue=\{String\(SECURITY_ACTIVE_RUNNER_BASELINE_REQUESTS\)\}/);
});

test("pentest console distinguishes executed HTTP probes from specialist handoffs", () => {
  assert.match(deliveryPanel, /role="log"/);
  assert.match(deliveryPanel, /event\.details\?\.action \? `\$ /);
  assert.match(deliveryPanel, /campaign\.specialist_completed/);
  assert.match(deliveryPanel, /fragment\.nextFocus/);
  assert.match(deliveryPanel, /Não há shell remoto nem comandos livres executados pela IA/);
  assert.match(client, /view === "pentest" \|\| view === "agentic"/);
  assert.match(agenticPage, /renderSecurityWorkspace\("agentic", "\/app\/pentest-agentivo"\)/);
  assert.match(agenticPanel, /step\.verdict\?\.summary/);
  assert.match(agenticPanel, /campaignEvents\.filter\(\(event\) => stageByCampaign\.has\(event\.campaignId\)\)/);
  assert.match(agenticPanel, /role="log"/);
  assert.match(agenticPanel, /scope\.status === "verified" && scope\.authorizationCurrent/);
  assert.match(agenticPanel, /start_agentic_pentest/);
  assert.match(agenticPanel, /Até 14 requisições GET, HEAD ou OPTIONS/);
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

test("security findings are deduplicated, assignable and auditable", () => {
  assert.match(service, /syncSecurityFindings/);
  assert.match(findingsMigration, /security_findings_scope_evidence_idx/);
  assert.match(findingsMigration, /security_finding_events/);
  assert.match(route, /updateSecurityFinding/);
  assert.match(route, /workspace_members wm JOIN users/);
  assert.match(client, /SecurityFindingsBoard/);
});

test("pentest campaigns and remediation are approval gated and default to no external execution", () => {
  assert.match(campaignMigration, /security_campaigns/);
  assert.match(campaignMigration, /security_campaign_events/);
  assert.match(campaignMigration, /security_remediation_proposals/);
  assert.match(campaignMigration, /pull_request_only/);
  assert.match(campaignService, /approvalConfirmed !== true/);
  assert.match(campaignService, /executionDispatched: false/);
  assert.match(campaignService, /dispatchSecurityCampaign/);
  assert.match(campaignService, /techniques\[0\] !== "passive_external_posture"/);
  assert.match(campaignService, /externalWritePerformed: false/);
  assert.match(campaignPolicy, /denial_service/);
  assert.match(campaignPolicy, /brute_force/);
  assert.match(campaignPolicy, /data_exfiltration/);
  assert.match(route, /create_campaign/);
  assert.match(route, /create_remediation/);
  assert.match(client, /SecurityDeliveryPanel/);
  assert.match(client, /\/app\/pentest/);
  assert.match(deliveryPanel, /Log auditável/);
  assert.doesNotMatch(deliveryPanel, /Preparar correção por pull request/);
  assert.match(repositoriesPanel, /SecurityProjectRemediationPanel/);
  assert.match(projectRemediationPanel, /create_remediation/);
  assert.match(campaignService, /REMEDIATION_REPOSITORY_NOT_AUTHORIZED/);
});

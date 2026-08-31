import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const service = fs.readFileSync(new URL("../app/security-agent-service.ts", import.meta.url), "utf8");
const route = fs.readFileSync(new URL("../app/api/security-agent/route.ts", import.meta.url), "utf8");
const worker = fs.readFileSync(new URL("../worker/index.ts", import.meta.url), "utf8");
const migration = fs.readFileSync(new URL("../drizzle/0051_security_validation_agent.sql", import.meta.url), "utf8");
const client = fs.readFileSync(new URL("../app/app/SecurityAgentCenter.tsx", import.meta.url), "utf8");

test("security agent requires authenticated workspace and explicit authorization", () => {
  assert.match(route, /getCurrentUser/);
  assert.match(route, /getWorkspaceContext/);
  assert.match(route, /canManageWorkspace/);
  assert.match(route, /authorizationConfirmed !== true/);
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

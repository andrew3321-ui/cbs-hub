import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [migration, api, clientApi, center, clientPage, schema] = await Promise.all([
  readFile(new URL("../drizzle/0048_monthly_closing.sql", import.meta.url), "utf8"),
  readFile(new URL("../app/api/monthly-closing/route.ts", import.meta.url), "utf8"),
  readFile(new URL("../app/api/monthly-closing/client/route.ts", import.meta.url), "utf8"),
  readFile(new URL("../app/app/MonthlyClosingCenter.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/fechamento/[token]/ClientClosingDecision.tsx", import.meta.url), "utf8"),
  readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
]);

test("competências recorrentes possuem responsáveis e SLAs persistentes", () => {
  assert.match(migration, /monthly_closing_configs/);
  assert.match(migration, /preparation_sla_hours/);
  assert.match(migration, /review_sla_hours/);
  assert.match(center, /Responsáveis, SLA e requisitos/);
});

test("fila mensal é idempotente por workspace, empresa e competência", () => {
  assert.match(migration, /UNIQUE INDEX IF NOT EXISTS monthly_closing_cycles_workspace_company_period_idx/);
  assert.match(api, /action === "sync_queue"/);
  assert.match(api, /INSERT OR IGNORE INTO monthly_closing_cycles/);
});

test("documentos e fatos ausentes bloqueiam a entrega objetivamente", () => {
  for (const code of ["MISSING_DOCUMENTS", "MISSING_SNAPSHOT", "MISSING_CONCLUSION", "OPEN_PENDING_ITEMS"]) assert.match(api, new RegExp(code));
  assert.match(api, /Existem bloqueios objetivos antes da entrega/);
});

test("preparação, revisão e aprovação usam pessoas e assinatura da revisão atual", () => {
  assert.match(api, /preparador e revisor devem ser pessoas diferentes/);
  assert.match(api, /report_approvals/);
  assert.match(api, /revision = \? AND snapshot_hash = \?/);
});

test("lembretes diários não geram duplicatas", () => {
  assert.match(migration, /monthly_closing_reminders_dedupe_idx/);
  assert.match(api, /INSERT OR IGNORE INTO monthly_closing_reminders/);
  assert.match(center, /nenhuma duplicata foi criada/);
});

test("entrega externa armazena somente hash do token, expira e pode ser revogada", () => {
  assert.match(migration, /token_hash TEXT NOT NULL/);
  assert.doesNotMatch(migration, /\btoken TEXT/);
  assert.match(api, /sha256Hex\(token\)/);
  assert.match(clientApi, /revoked_at/);
  assert.match(clientApi, /expires_at/);
});

test("cliente pode aceitar, recusar ou solicitar alterações com trilha", () => {
  for (const decision of ["accepted", "rejected", "changes_requested"]) assert.match(clientApi, new RegExp(decision));
  assert.match(clientApi, /actor_type[^\n]+client/);
  assert.match(clientPage, /Como deseja prosseguir/);
});

test("reabertura preserva revisão e hash aprovados antes de iniciar outra versão", () => {
  assert.match(api, /reopened_from_revision/);
  assert.match(api, /preservedRevision/);
  assert.match(api, /preservedSnapshotHash/);
  assert.match(schema, /monthlyClosingEvents/);
});

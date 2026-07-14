import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("a experiência publicada contém identidade e rotas comerciais", async () => {
  const [landing, layout, pricing] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("app/planos/page.tsx", root), "utf8"),
  ]);

  assert.match(landing, /Margem Clara/);
  assert.match(landing, /href="\/planos"/);
  assert.match(layout, /Inteligência tributária/);
  assert.match(pricing, /Beta gratuito ativo/);
  assert.match(pricing, /PricingClient/);
  assert.doesNotMatch(`${landing}\n${layout}`, /codex-preview|_sites-preview|Your site is taking shape/i);
});

test("credenciais de cobrança permanecem somente no servidor", async () => {
  const [client, billing, hosting] = await Promise.all([
    readFile(new URL("app/planos/PricingClient.tsx", root), "utf8"),
    readFile(new URL("app/billing.ts", root), "utf8"),
    readFile(new URL(".openai/hosting.json", root), "utf8"),
  ]);

  assert.doesNotMatch(client, /MERCADO_PAGO_ACCESS_TOKEN|MERCADO_PAGO_WEBHOOK_SECRET/);
  assert.match(billing, /MERCADO_PAGO_ACCESS_TOKEN/);
  assert.match(billing, /validateMercadoPagoWebhook/);
  assert.doesNotMatch(hosting, /MERCADO_PAGO|ACCESS_TOKEN|WEBHOOK_SECRET/);
});

test("análises publicadas expõem versionamento e não afirmam homologação", async () => {
  const [app, report, methodology, scenariosApi, signing] = await Promise.all([
    readFile(new URL("app/app/MargemApp.tsx", root), "utf8"),
    readFile(new URL("app/relatorio/[token]/page.tsx", root), "utf8"),
    readFile(new URL("app/metodologia/page.tsx", root), "utf8"),
    readFile(new URL("app/api/scenarios/route.ts", root), "utf8"),
    readFile(new URL("app/scenario-signing.ts", root), "utf8"),
  ]);

  assert.doesNotMatch(app, /Ano teste 2026/);
  assert.match(app, /Origem da alíquota/);
  assert.match(report, /parseScenarioSnapshot/);
  assert.match(report, /Aguardando validação profissional/);
  assert.match(methodology, /Snapshot imutável por versão/);
  assert.match(scenariosApi, /hashScenarioInput/);
  assert.match(scenariosApi, /snapshotJson/);
  assert.match(signing, /SCENARIO_SIGNING_KEY_V1/);
  assert.match(report, /integrityBlocked/);
});

test("infraestrutura escalável evita N+1, duplicidade e falhas sem correlação", async () => {
  const [companiesApi, scenariosApi, schema, health, telemetry, client] = await Promise.all([
    readFile(new URL("app/api/companies/route.ts", root), "utf8"),
    readFile(new URL("app/api/scenarios/route.ts", root), "utf8"),
    readFile(new URL("db/schema.ts", root), "utf8"),
    readFile(new URL("app/api/health/route.ts", root), "utf8"),
    readFile(new URL("app/api-infrastructure.ts", root), "utf8"),
    readFile(new URL("app/app/MargemApp.tsx", root), "utf8"),
  ]);

  assert.match(companiesApi, /latestScenarioIds/);
  assert.match(companiesApi, /leftJoin\(latestScenarioIds/);
  assert.doesNotMatch(companiesApi, /rows\.map\(async \(company\).*db\.select/s);
  assert.match(scenariosApi, /clientRequestId/);
  assert.match(scenariosApi, /replayed: true/);
  assert.match(schema, /scenarios_request_key_idx/);
  assert.match(client, /pendingScenarioRequest/);
  assert.match(health, /scenarioSigningConfigured/);
  assert.match(telemetry, /X-Request-Id/);
  assert.doesNotMatch(health, /SCENARIO_SIGNING_KEY_V1/);
});

test("catálogo fiscal exige integridade, regressão e homologação antes da execução", async () => {
  const [client, rulesApi, ruleDefinition, schema] = await Promise.all([
    readFile(new URL("app/app/MargemApp.tsx", root), "utf8"),
    readFile(new URL("app/api/fiscal-rules/route.ts", root), "utf8"),
    readFile(new URL("domain/fiscal-rules.ts", root), "utf8"),
    readFile(new URL("db/schema.ts", root), "utf8"),
  ]);

  assert.match(client, /Catálogo fiscal versionado/);
  assert.match(client, /Sem cálculo automático de valor a recolher/);
  assert.match(rulesApi, /rule\.status === "approved"/);
  assert.match(rulesApi, /definition\.executionMode === "calculation"/);
  assert.match(rulesApi, /integrityStatus === "verified"/);
  assert.match(rulesApi, /testsPassed/);
  assert.match(ruleDefinition, /automaticNetPayableCalculation: false/);
  assert.doesNotMatch(ruleDefinition, /automaticNetPayableCalculation: true/);
  assert.match(schema, /fiscal_rule_sets_code_version_idx/);
});

test("apuração líquida mantém 2026 bloqueado e prepara fechamento auditável", async () => {
  const [client, determinationApi, determinationDomain, schema, health] = await Promise.all([
    readFile(new URL("app/app/MargemApp.tsx", root), "utf8"),
    readFile(new URL("app/api/tax-determination/route.ts", root), "utf8"),
    readFile(new URL("domain/tax-determination.ts", root), "utf8"),
    readFile(new URL("db/schema.ts", root), "utf8"),
    readFile(new URL("app/api/health/route.ts", root), "utf8"),
  ]);

  assert.match(client, /Apuração líquida sob controle/);
  assert.match(client, /não é valor a pagar/);
  assert.match(client, /Conciliação em três vias/i);
  assert.match(determinationApi, /netPayableEnabled: false/);
  assert.match(determinationApi, /writesEnabled: false/);
  assert.match(determinationDomain, /SIMULATION_ONLY_2026/);
  assert.match(determinationDomain, /input\.legalEffect === "production"/);
  assert.match(determinationDomain, /PENDING_CREDIT/);
  assert.match(schema, /tax_period_closures/);
  assert.match(schema, /tax_reconciliation_snapshots/);
  assert.match(health, /TAX_DETERMINATION_ENGINE_VERSION/);
});

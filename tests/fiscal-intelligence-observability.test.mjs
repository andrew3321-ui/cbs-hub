import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");

test("a data de referencia percorre formulario, validacao e execucao", () => {
  const component = read("../app/app/FiscalIntelligence.tsx");
  const service = read("../app/fiscal-intelligence-service.ts");
  const route = read("../app/api/fiscal-intelligence/route.ts");

  assert.match(component, /type="date"[^>]*value=\{form\.referenceDate\}/);
  assert.doesNotMatch(component, /fact\.key\s*!==\s*"referenceDate"/);
  assert.match(service, /\\d\{4\}-\\d\{2\}-\\d\{2\}/);
  assert.match(service, /overrides\.referenceDate\s*=\s*input\.referenceDate/);
  assert.match(route, /overrides\.referenceDate\s*\?\?/);
});

test("telemetria mede cobertura, duracao e falhas sem armazenar pergunta ou fatos", () => {
  const schema = read("../db/schema.ts");
  const service = read("../app/fiscal-intelligence-service.ts");
  const route = read("../app/api/fiscal-intelligence/route.ts");
  const migration = read("../drizzle/0032_wet_maximus.sql");
  const metricSchema = schema.slice(
    schema.indexOf("export const fiscalIntelligenceMetrics"),
    schema.indexOf("export const fiscalDossiers"),
  );

  assert.match(schema, /fiscalIntelligenceMetrics/);
  assert.match(schema, /coverageStatus:\s*text\("coverage_status"\)/);
  assert.match(schema, /durationMs:\s*integer\("duration_ms"\)/);
  assert.doesNotMatch(metricSchema, /(question|factsJson):/);
  assert.match(service, /loadFiscalIntelligenceObservability/);
  assert.match(service, /withoutCoverage/);
  assert.match(service, /perguntas e fatos fiscais n.o s.o armazenados/);
  assert.match(route, /coverageStatus\s*=\s*result\.status/);
  assert.match(route, /Date\.now\(\)\s*-\s*startedAt/);
  assert.match(migration, /CREATE TABLE `fiscal_intelligence_metrics`/);
  assert.match(migration, /fiscal_intelligence_metrics_workspace_coverage_idx/);
});

test("painel expoe os indicadores dos ultimos 30 dias e sua politica de dados", () => {
  const component = read("../app/app/FiscalIntelligence.tsx");
  const css = read("../app/globals.css");

  assert.match(component, /observability\.measuredQueries/);
  assert.match(component, /observability\.averageDurationMs/);
  assert.match(component, /observability\.withoutCoverage/);
  assert.match(component, /observability\.failedQueries/);
  assert.match(component, /observability\.dataPolicy/);
  assert.match(css, /\.intelligence-observability/);
});

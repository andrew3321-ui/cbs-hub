import assert from "node:assert/strict";
import test from "node:test";

import {
  buildConstructionElectricalDossier,
  hashStConstructionElectricalPriority,
  resolveConstructionElectricalOperation,
  searchConstructionElectricalRules,
  ST_CONSTRUCTION_ELECTRICAL_FACT_LABELS,
  ST_CONSTRUCTION_ELECTRICAL_PRODUCTS,
  ST_CONSTRUCTION_ELECTRICAL_ROUTES,
  stConstructionElectricalDossiers,
  stConstructionElectricalMetrics,
  stConstructionElectricalNegativeRuns,
  stConstructionElectricalReferenceRuns,
  stConstructionElectricalSources,
  validateStConstructionElectricalPriority,
} from "../domain/st-construction-electrical-priority.ts";

test("lote controla seis produtos, quatro famílias e duas rotas prioritárias", () => {
  const metrics = stConstructionElectricalMetrics();
  assert.deepEqual(metrics, {
    priorityProducts: 6,
    productFamilies: 4,
    priorityRoutes: 2,
    controlledCells: 12,
    reproducedMemories: 12,
    safeFailureScenarios: 5,
    officialSources: 10,
    coverage: { supported: 12, partial: 0, notSupported: 0 },
  });
  assert.equal(ST_CONSTRUCTION_ELECTRICAL_PRODUCTS.length, 6);
  assert.equal(ST_CONSTRUCTION_ELECTRICAL_ROUTES.length, 2);
  assert.equal(new Set(ST_CONSTRUCTION_ELECTRICAL_PRODUCTS.map((product) => product.cest)).size, 6);
});

test("todas as células suportadas reproduzem MVA, centavos, fonte e responsabilidade", () => {
  assert.equal(stConstructionElectricalReferenceRuns.length, 12);
  for (const run of stConstructionElectricalReferenceRuns) {
    assert.equal(run.result.status, "calculated_reference", run.key);
    assert.equal(run.result.coverageStatus, "supported", run.key);
    assert.ok(run.result.output?.destinationTotalCents > 0, run.key);
    assert.ok(run.result.parameters?.mvaAdjustedBps > run.result.parameters?.mvaOriginalBps, run.key);
    assert.ok(run.result.sourceCodes.length >= 4, run.key);
    assert.equal(run.result.responsibility, run.route === "SP-MG" ? "origin_remitter" : "destination_taxpayer");
  }
  assert.equal(stConstructionElectricalReferenceRuns.find((run) => run.key === "SP-MG:ARGAMASSA")?.result.output?.destinationTotalCents, 15_043);
  assert.equal(stConstructionElectricalReferenceRuns.find((run) => run.key === "SP-RJ:ARGAMASSA")?.result.output?.destinationTotalCents, 22_122);
});

test("uso, exceção, vigência, divergência e exclusão falham sem valor", () => {
  assert.deepEqual(stConstructionElectricalNegativeRuns.map((run) => run.code), [
    "use_consumption",
    "exception",
    "expired",
    "classification_mismatch",
    "explicit_exclusion",
  ]);
  for (const run of stConstructionElectricalNegativeRuns) {
    assert.equal(run.result.output, null, run.code);
    assert.notEqual(run.result.status, "calculated_reference", run.code);
    assert.ok(run.result.blockers.length > 0, run.code);
  }
});

test("qualquer fato ausente bloqueia e não vaza parâmetro ou memória", () => {
  const product = ST_CONSTRUCTION_ELECTRICAL_PRODUCTS[0];
  const facts = Object.fromEntries(Object.keys(ST_CONSTRUCTION_ELECTRICAL_FACT_LABELS).map((key) => [key, true]));
  facts.documentsConfirmed = false;
  const result = resolveConstructionElectricalOperation({
    route: "SP-MG",
    productCode: product.code,
    operationDate: "2026-07-30",
    ncm: product.exampleNcm,
    cest: product.cest,
    operationPriceCents: 100_000,
    discountsCents: 0,
    freightCents: 0,
    insuranceCents: 0,
    ipiCents: 0,
    otherExpensesCents: 0,
    ownIcmsBaseCents: 100_000,
    facts,
  });
  assert.equal(result.status, "blocked");
  assert.equal(result.output, null);
  assert.equal(result.parameters, null);
  assert.deepEqual(result.missingFacts, ["documentsConfirmed"]);
});

test("busca localiza produto e rota sem emprestar cobertura", () => {
  const exact = searchConstructionElectricalRules("Qual o ICMS-ST da argamassa de SP para MG?");
  assert.deepEqual(exact.map((item) => [item.productCode, item.route, item.status]), [["ARGAMASSA", "SP-MG", "supported"]]);
  const productOnly = searchConstructionElectricalRules("chuveiro elétrico");
  assert.equal(productOnly.length, 2);
  assert.ok(productOnly.every((item) => item.productCode === "ELECTRIC_WATER_HEATERS"));
  assert.deepEqual(searchConstructionElectricalRules("medicamento de SP para MG"), []);
});

test("dossiê preserva identidade, memória e somente fontes oficiais vinculadas", () => {
  assert.equal(stConstructionElectricalDossiers.length, 12);
  for (const item of stConstructionElectricalDossiers) {
    assert.equal(item.dossier.status, "calculated_reference");
    assert.ok(item.dossier.identity?.cest);
    assert.ok(item.dossier.calculation?.destinationTotalCents);
    assert.ok(item.dossier.evidence.length >= 4);
    assert.ok(item.dossier.evidence.every((source) => stConstructionElectricalSources.some((candidate) => candidate.code === source.code)));
  }
  const blocked = buildConstructionElectricalDossier(stConstructionElectricalNegativeRuns[3].result);
  assert.equal(blocked.calculation, null);
  assert.ok(blocked.blockers.includes("ncm_or_explicit_exclusion_mismatch"));
});

test("validação agregada e hash da versão são determinísticos", async () => {
  assert.deepEqual(validateStConstructionElectricalPriority(), { passed: true, errors: [] });
  const first = await hashStConstructionElectricalPriority();
  const second = await hashStConstructionElectricalPriority();
  assert.match(first, /^[0-9a-f]{64}$/);
  assert.equal(second, first);
});

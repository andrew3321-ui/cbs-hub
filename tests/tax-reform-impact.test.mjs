import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  calculateTaxReformImpact,
  createTaxReformImpactReport,
  hashTaxReformImpactModel,
  TAX_REFORM_REPORT_VERSION,
  taxReformImpactCasePasses,
  taxReformImpactReferenceCases,
  taxReformSources,
  taxReformTransitionRules,
} from "../domain/tax-reform-impact.ts";

test("todos os casos regressivos da transição reproduzem centavos esperados", () => {
  assert.equal(taxReformImpactReferenceCases.length, 5);
  assert.equal(taxReformImpactReferenceCases.every(taxReformImpactCasePasses), true);
});

test("ano-teste 2026 registra CBS e IBS sem inventar novo total a recolher", () => {
  const output = calculateTaxReformImpact(taxReformImpactReferenceCases[0].input);
  assert.equal(output.rates.cbsAppliedRateBps, 90);
  assert.equal(output.rates.ibsAppliedRateBps, 10);
  assert.equal(output.transition.cbsGrossCents, 90_000);
  assert.equal(output.transition.ibsGrossCents, 10_000);
  assert.equal(output.transition.cbsExposureCents, 0);
  assert.equal(output.transition.ibsExposureCents, 0);
  assert.equal(output.transition.totalExposureCents, output.current.totalCents);
  assert.equal(output.netPayableCents, null);
});

test("transição 2029 conserva 90% do ICMS/ISS e aplica 10% da referência IBS", () => {
  const output = calculateTaxReformImpact(taxReformImpactReferenceCases[1].input);
  assert.equal(output.rule.legacyIcmsIssShareBps, 9_000);
  assert.equal(output.rates.ibsAppliedRateBps, 180);
  assert.equal(output.transition.legacyIcmsIssCents, 1_080_000);
  assert.equal(output.transition.cbsExposureCents, 700_000);
  assert.equal(output.transition.ibsExposureCents, 80_000);
  assert.equal(output.transition.totalExposureCents, 1_860_000);
  assert.equal(output.impact.annualDeltaCents, 3_540_000);
});

test("cronograma de 2026 a 2033 está explícito, versionado e sem lacunas", () => {
  assert.deepEqual(taxReformTransitionRules.map((rule) => rule.targetYear), [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033]);
  assert.deepEqual(taxReformTransitionRules.slice(3).map((rule) => rule.legacyIcmsIssShareBps), [9_000, 8_000, 7_000, 6_000, 0]);
  for (const rule of taxReformTransitionRules) {
    assert.match(rule.version, /^\d+\.\d+\.\d+-\d{4}\.\d{2}$/);
    assert.equal(rule.sourceCodes.length >= 4, true);
  }
});

test("memórias anuais da transição fecham os valores recorrentes de 2027 a 2033", () => {
  const baseline = taxReformImpactReferenceCases[1].input;
  const expectedTotals = new Map([
    [2027, 1_890_000],
    [2028, 1_890_000],
    [2029, 1_860_000],
    [2030, 1_920_000],
    [2031, 1_980_000],
    [2032, 2_040_000],
    [2033, 2_400_000],
  ]);
  for (const [targetYear, expectedTotal] of expectedTotals) {
    const output = calculateTaxReformImpact({ ...baseline, targetYear });
    assert.equal(output.coverage, "supported", `cobertura ${targetYear}`);
    assert.equal(output.transition.totalExposureCents, expectedTotal, `total ${targetYear}`);
    assert.equal(output.netPayableCents, null, `líquido jurídico ${targetYear}`);
  }
});

test("dado ausente ou cenário não coberto falha fechado", () => {
  const missingRate = calculateTaxReformImpact(taxReformImpactReferenceCases[3].input);
  assert.equal(missingRate.coverage, "partial");
  assert.equal(missingRate.transition.totalExposureCents, null);
  assert.equal(missingRate.pendingFacts.includes("alíquota de referência integral do IBS"), true);

  const simples = calculateTaxReformImpact(taxReformImpactReferenceCases[4].input);
  assert.equal(simples.coverage, "unsupported");
  assert.equal(simples.transition.totalExposureCents, null);
  assert.equal(simples.issues.some((issue) => issue.code === "UNSUPPORTED_TAX_REGIME"), true);
});

test("memória contém fórmula, dado utilizado, natureza e unidades inteiras", () => {
  const output = calculateTaxReformImpact(taxReformImpactReferenceCases[1].input);
  assert.equal(output.memory.length >= 8, true);
  for (const line of output.memory) {
    assert.equal(line.formula.length > 0, true);
    assert.equal(line.dataUsed.length > 0, true);
    assert.equal(["official_rule", "accounting_input", "declared_premise", "derived"].includes(line.nature), true);
    assert.equal(line.amountCents === null || Number.isSafeInteger(line.amountCents), true);
    assert.equal(line.rateBps === null || Number.isInteger(line.rateBps), true);
  }
  const invalid = structuredClone(taxReformImpactReferenceCases[0].input);
  invalid.taxableBaseCents = 100.5;
  assert.throws(() => calculateTaxReformImpact(invalid), /invalid_tax_reform_impact_input/);
});

test("relatório versionado tem hashes determinísticos e evidencia alteração de entrada", async () => {
  const generatedAt = "2026-07-26T15:00:00.000Z";
  const first = await createTaxReformImpactReport(taxReformImpactReferenceCases[1].input, generatedAt);
  const same = await createTaxReformImpactReport(taxReformImpactReferenceCases[1].input, generatedAt);
  const changed = await createTaxReformImpactReport({
    ...taxReformImpactReferenceCases[1].input,
    projectedCbsCreditsCents: taxReformImpactReferenceCases[1].input.projectedCbsCreditsCents + 1,
  }, generatedAt);
  assert.equal(first.format, TAX_REFORM_REPORT_VERSION);
  assert.equal(first.reportHash, same.reportHash);
  assert.equal(first.inputHash, same.inputHash);
  assert.notEqual(first.reportHash, changed.reportHash);
  assert.notEqual(first.inputHash, changed.inputHash);
  assert.match(first.reportHash, /^[0-9a-f]{64}$/);
});

test("modelo e fontes oficiais possuem fingerprint estável", async () => {
  const first = await hashTaxReformImpactModel();
  const second = await hashTaxReformImpactModel();
  assert.equal(first, second);
  assert.match(first, /^[0-9a-f]{64}$/);
  assert.equal(taxReformSources.length >= 5, true);
  for (const source of taxReformSources) {
    const host = new URL(source.url).hostname;
    assert.equal(host === "www.planalto.gov.br" || host === "www.gov.br", true);
    assert.match(source.checkedAt, /^\d{4}-\d{2}-\d{2}$/);
  }
});

test("API e tela preservam entitlement, relatório imprimível e ausência de escrita fiscal", async () => {
  const [route, ui] = await Promise.all([
    readFile(new URL("../app/api/tax-reform-impact/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/app/TaxReformImpact.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(route, /withWorkspaceFeature\("taxDeterminationEnabled"/);
  assert.doesNotMatch(route, /\.insert\(|\.update\(|\.delete\(/);
  assert.match(route, /Cache-Control": "no-store"/);
  assert.match(ui, /Imprimir \/ salvar PDF/);
  assert.match(ui, /Baixar versão auditável \(JSON\)/);
  assert.match(ui, /RESULTADO OBJETIVO/);
  assert.match(ui, /MEMÓRIA DE CÁLCULO/);
  assert.match(ui, /FONTES OFICIAIS/);
});

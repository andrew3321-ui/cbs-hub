import assert from "node:assert/strict";
import test from "node:test";

import {
  IPI_TIPI_DEEP_VERSION,
  calculateIpiTipiDeepReference,
  findIpiTipiProfile,
  hashIpiTipiDeep,
  ipiTipiDeepMetrics,
  ipiTipiDeepSources,
  ipiTipiPriorityProfiles,
  runIpiTipiDeterministicCases,
  validateIpiTipiDeep,
} from "../domain/ipi-tipi-deep.ts";

const base = {
  ncm: "39232190",
  calculationDate: "2026-07-30",
  operation: "industrial_output",
  taxpayerRole: "industrial",
  productDescriptionConfirmed: true,
  exactNcmConfirmed: true,
  tipiVersionConfirmed: true,
  sectionChapterNotesConfirmed: true,
  taxpayerRoleConfirmed: true,
  operationDocumented: true,
  operationValueCents: 10_000_000,
  customsValueCents: null,
  importTaxCents: null,
  exchangeChargesCents: null,
  tipiExceptionCode: null,
  tipiExceptionConfirmed: false,
  noListedExceptionAppliesConfirmed: true,
  externalBenefit: "none",
  externalBenefitLegalReference: null,
  externalBenefitValidityConfirmed: false,
  nonTaxableReasonConfirmed: false,
};

test("V83 ranks fifteen exact priority NCM profiles with official TIPI evidence", () => {
  assert.equal(IPI_TIPI_DEEP_VERSION, "2026.07.30-v83");
  assert.equal(ipiTipiPriorityProfiles.length, 15);
  assert.deepEqual(ipiTipiPriorityProfiles.map((item) => item.rank), Array.from({ length: 15 }, (_, index) => index + 1));
  assert.ok(ipiTipiPriorityProfiles.every((item) => /^\d{8}$/.test(item.ncm)));
  assert.equal(findIpiTipiProfile("84.21.31.00")?.nominalRateBps, 520);
  assert.equal(findIpiTipiProfile("8421"), null);
});

test("standard industrial output calculates from exact NCM and operation value in cents", () => {
  const result = calculateIpiTipiDeepReference(base);
  assert.equal(result.status, "calculated_reference");
  assert.equal(result.profile?.ncm, "39232190");
  assert.equal(result.lines.find((item) => item.code === "tipi_rate")?.rateBps, 975);
  assert.equal(result.lines.find((item) => item.code === "ipi_due")?.amountCents, 975_000);
});

test("import clearance uses customs value plus import tax and exchange charges", () => {
  const result = calculateIpiTipiDeepReference({
    ...base,
    operation: "import_clearance",
    taxpayerRole: "importer",
    operationValueCents: null,
    customsValueCents: 8_000_000,
    importTaxCents: 1_000_000,
    exchangeChargesCents: 100_000,
  });
  assert.equal(result.status, "calculated_reference");
  assert.equal(result.lines.find((item) => item.code === "ipi_base")?.amountCents, 9_100_000);
  assert.equal(result.lines.find((item) => item.code === "ipi_due")?.amountCents, 887_250);
});

test("zero-rate NCM remains distinct from non-taxable commercial exit", () => {
  const zero = calculateIpiTipiDeepReference({ ...base, ncm: "61091000" });
  assert.equal(zero.status, "zero_rate_reference");
  assert.equal(zero.lines.find((item) => item.code === "ipi_due")?.amountCents, 0);

  const noIncidence = calculateIpiTipiDeepReference({
    ...base,
    operation: "non_taxable_exit",
    taxpayerRole: "ordinary_reseller",
    nonTaxableReasonConfirmed: true,
  });
  assert.equal(noIncidence.status, "not_taxable_reference");
  assert.equal(noIncidence.lines.find((item) => item.code === "ipi_due")?.amountCents, 0);
});

test("exact TIPI exceptions apply only after their descriptions and conditions are confirmed", () => {
  const sunscreen = calculateIpiTipiDeepReference({
    ...base,
    ncm: "33049990",
    tipiExceptionCode: "Ex 02",
    tipiExceptionConfirmed: true,
    noListedExceptionAppliesConfirmed: false,
  });
  assert.equal(sunscreen.status, "zero_rate_reference");
  assert.equal(sunscreen.appliedException?.description, "Preparados antissolares sem propriedades bronzeadoras");

  const bronze = calculateIpiTipiDeepReference({
    ...base,
    ncm: "33049990",
    tipiExceptionCode: "EX01",
    tipiExceptionConfirmed: true,
    noListedExceptionAppliesConfirmed: false,
  });
  assert.equal(bronze.status, "calculated_reference");
  assert.equal(bronze.lines.find((item) => item.code === "tipi_rate")?.rateBps, 780);
  assert.equal(bronze.lines.find((item) => item.code === "ipi_due")?.amountCents, 780_000);
});

test("generic NCM, divergent classification, missing notes and incompatible roles fail closed", () => {
  const generic = calculateIpiTipiDeepReference({ ...base, ncm: "3923" });
  assert.equal(generic.status, "blocked");
  assert.deepEqual(generic.lines, []);

  const divergent = calculateIpiTipiDeepReference({
    ...base,
    productDescriptionConfirmed: false,
    sectionChapterNotesConfirmed: false,
    taxpayerRole: "ordinary_reseller",
  });
  assert.equal(divergent.status, "blocked");
  assert.ok(divergent.blockers.some((item) => item.includes("descrição legal")));
  assert.ok(divergent.blockers.some((item) => item.toLowerCase().includes("notas")));
  assert.ok(divergent.blockers.some((item) => item.includes("incompatível")));
});

test("profiles with Ex require an explicit no-exception decision", () => {
  const result = calculateIpiTipiDeepReference({
    ...base,
    ncm: "85071090",
    noListedExceptionAppliesConfirmed: false,
  });
  assert.equal(result.status, "blocked");
  assert.ok(result.blockers.some((item) => item.includes("nenhuma exceção")));
});

test("external benefits never inherit a rate from TIPI without a dedicated legal rule", () => {
  const result = calculateIpiTipiDeepReference({
    ...base,
    externalBenefit: "suspension",
    externalBenefitLegalReference: "ADE nº 123/2026",
    externalBenefitValidityConfirmed: true,
  });
  assert.equal(result.status, "blocked");
  assert.ok(result.blockers.some((item) => item.includes("regra jurídica dedicada")));
});

test("all eighty deterministic cases reproduce their expected output", () => {
  const runs = runIpiTipiDeterministicCases();
  assert.equal(runs.length, 80);
  assert.ok(runs.every((item) => item.passed), JSON.stringify(runs.filter((item) => !item.passed)));
  assert.deepEqual(ipiTipiDeepMetrics(), {
    prioritizedNcms: 15,
    exactExceptions: 7,
    operations: 4,
    officialSources: 7,
    deterministicCases: 80,
    calculatedMemories: 20,
    safelyBlockedCases: 60,
  });
});

test("catalog validation, official sources and fingerprint are reproducible", async () => {
  assert.deepEqual(validateIpiTipiDeep(), { passed: true, errors: [] });
  assert.ok(ipiTipiDeepSources.every((item) => item.url.startsWith("https://") && item.legalReference.length > 10));
  const first = await hashIpiTipiDeep();
  assert.match(first, /^[0-9a-f]{64}$/);
  assert.equal(await hashIpiTipiDeep(), first);
});

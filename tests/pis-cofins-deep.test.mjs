import assert from "node:assert/strict";
import test from "node:test";

import {
  PIS_COFINS_DEEP_VERSION,
  PIS_COFINS_LC224_EFFECTIVE_FROM,
  calculatePisCofinsDeepReference,
  classifyPisCofinsProduct,
  hashPisCofinsDeep,
  pisCofinsCreditHypotheses,
  pisCofinsDeepMetrics,
  pisCofinsDeepSources,
  pisCofinsProductProfiles,
  validatePisCofinsDeep,
} from "../domain/pis-cofins-deep.ts";

const base = {
  regime: "cumulative",
  treatment: "general",
  role: "service_provider",
  ncm: null,
  calculationDate: "2026-07-30",
  revenueCents: 10_000_000,
  creditBaseCents: 0,
  creditKind: null,
  regimeConfirmed: true,
  roleConfirmed: true,
  exactNcmConfirmedInOfficialTable: false,
  operationDocumented: true,
  revenueSegregated: true,
  legalTreatmentConfirmed: false,
  post2026BenefitRateConfirmed: false,
  creditLegalHypothesisConfirmed: false,
  creditDocumented: false,
  acquisitionWasTaxed: false,
  linkedToTaxedActivity: false,
};

test("V81 ranks recurring product profiles as candidates, never as a final classification", () => {
  assert.equal(PIS_COFINS_DEEP_VERSION, "2026.07.31-v81");
  assert.equal(pisCofinsProductProfiles.length, 20);
  assert.deepEqual(pisCofinsProductProfiles.map((item) => item.rank), Array.from({ length: 20 }, (_, index) => index + 1));
  assert.ok(pisCofinsProductProfiles.every((item) => item.classificationPolicy === "candidate_requires_exact_ncm_official_table_role_and_date"));
  assert.equal(classifyPisCofinsProduct("40.11.10.00")[0]?.code, "TIRES");
  assert.equal(classifyPisCofinsProduct("1234").length, 0);
});

test("cumulative and non-cumulative memories separate debit and credit without presumed compensation", () => {
  const cumulative = calculatePisCofinsDeepReference(base);
  assert.equal(cumulative.status, "calculated_reference");
  assert.deepEqual(cumulative.lines.slice(0, 2).map((line) => line.amountCents), [65_000, 300_000]);

  const nonCumulative = calculatePisCofinsDeepReference({
    ...base,
    regime: "non_cumulative",
    creditBaseCents: 2_000_000,
    creditKind: "inputs",
    creditLegalHypothesisConfirmed: true,
    creditDocumented: true,
    acquisitionWasTaxed: true,
    linkedToTaxedActivity: true,
  });
  assert.equal(nonCumulative.status, "calculated_reference");
  assert.deepEqual(nonCumulative.lines.slice(0, 4).map((line) => line.amountCents), [165_000, 760_000, 33_000, 152_000]);
  assert.deepEqual(nonCumulative.lines.slice(4).map((line) => line.amountCents), [null, null]);
});

test("2026 special benefits require the LC 224 treatment and exact official classification", () => {
  assert.equal(PIS_COFINS_LC224_EFFECTIVE_FROM, "2026-04-01");
  const missing = calculatePisCofinsDeepReference({
    ...base,
    treatment: "monophase",
    role: "retailer",
    ncm: "40111000",
    exactNcmConfirmedInOfficialTable: true,
    legalTreatmentConfirmed: true,
  });
  assert.equal(missing.status, "blocked");
  assert.ok(missing.blockers.some((item) => item.includes("LC 224")));

  const documented = calculatePisCofinsDeepReference({
    ...base,
    treatment: "monophase",
    role: "retailer",
    ncm: "40111000",
    exactNcmConfirmedInOfficialTable: true,
    legalTreatmentConfirmed: true,
    post2026BenefitRateConfirmed: true,
    post2026PisRateBps: 0,
    post2026CofinsRateBps: 0,
  });
  assert.equal(documented.status, "calculated_reference");
  assert.deepEqual(documented.lines.slice(0, 2).map((line) => line.amountCents), [0, 0]);
});

test("manufacturer/importer rates and monophase resale credits fail closed", () => {
  const manufacturer = calculatePisCofinsDeepReference({
    ...base,
    treatment: "monophase",
    role: "manufacturer",
    ncm: "87089990",
    exactNcmConfirmedInOfficialTable: true,
    legalTreatmentConfirmed: true,
    post2026BenefitRateConfirmed: true,
    post2026PisRateBps: 230,
    post2026CofinsRateBps: 1080,
  });
  assert.equal(manufacturer.status, "blocked");
  assert.ok(manufacturer.blockers.some((item) => item.includes("alíquota concentrada específica")));

  const forbidden = calculatePisCofinsDeepReference({
    ...base,
    regime: "non_cumulative",
    treatment: "monophase",
    role: "retailer",
    ncm: "40111000",
    exactNcmConfirmedInOfficialTable: true,
    legalTreatmentConfirmed: true,
    post2026BenefitRateConfirmed: true,
    post2026PisRateBps: 0,
    post2026CofinsRateBps: 0,
    creditBaseCents: 2_000_000,
    creditKind: "resale_goods",
    creditLegalHypothesisConfirmed: true,
    creditDocumented: true,
    acquisitionWasTaxed: true,
    linkedToTaxedActivity: true,
  });
  assert.equal(forbidden.status, "blocked");
  assert.ok(forbidden.blockers.some((item) => item.includes("vedado")));
});

test("missing NCM, role, document, segregation and credit evidence block the output", () => {
  const missing = calculatePisCofinsDeepReference({
    ...base,
    treatment: "zero_rate",
    role: "retailer",
    roleConfirmed: false,
    ncm: null,
    operationDocumented: false,
    revenueSegregated: false,
    creditBaseCents: 100_000,
    creditKind: "inputs",
  });
  assert.equal(missing.status, "blocked");
  assert.ok(missing.blockers.length >= 8);
  assert.deepEqual(missing.lines, []);
});

test("official evidence, credit catalog, metrics, validation and fingerprint are reproducible", async () => {
  assert.equal(pisCofinsDeepSources.length, 11);
  assert.equal(pisCofinsCreditHypotheses.length, 9);
  assert.ok(pisCofinsDeepSources.every((item) => item.url.startsWith("https://")));
  assert.deepEqual(pisCofinsDeepMetrics(), {
    prioritizedProductProfiles: 20,
    creditHypotheses: 9,
    regimes: 2,
    specialTreatments: 3,
    deterministicCases: 40,
    calculatedMemories: 4,
    safelyBlockedCases: 36,
  });
  assert.deepEqual(validatePisCofinsDeep(), { passed: true, errors: [] });
  const first = await hashPisCofinsDeep();
  assert.match(first, /^[a-f0-9]{64}$/);
  assert.equal(await hashPisCofinsDeep(), first);
});

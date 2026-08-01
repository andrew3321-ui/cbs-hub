import assert from "node:assert/strict";
import test from "node:test";

import {
  hashStPharmaCosmeticsPriority,
  resolvePharmaCosmeticsOperation,
  stPharmaCosmeticsLegalRoutes,
  stPharmaCosmeticsMetrics,
  stPharmaCosmeticsStateRules,
  stPharmaCosmeticsVerificationCases,
  ST_PHARMA_COSMETICS_PRIORITY_EVIDENCE,
  ST_PHARMA_COSMETICS_PRODUCTS,
  ST_PHARMA_COSMETICS_ROUTES,
  validateStPharmaCosmeticsPriority,
} from "../domain/st-pharma-cosmetics-priority.ts";

const confirmedFacts = {
  exactProductConfirmed: true,
  operationDateConfirmed: true,
  partiesConfirmed: true,
  ordinaryResaleConfirmed: true,
  noSpecialTreatmentConfirmed: true,
  documentsConfirmed: true,
};

const profile = (destination, productCode) => {
  const result = stPharmaCosmeticsStateRules.find((item) => item.destination === destination && item.productCode === productCode);
  assert.ok(result, `missing profile ${destination}:${productCode}`);
  return result;
};

test("pharma and cosmetics catalogue closes legal routes and parameter profiles", () => {
  assert.deepEqual(validateStPharmaCosmeticsPriority(), { passed: true, errors: [] });
  assert.equal(ST_PHARMA_COSMETICS_PRODUCTS.length, 8);
  assert.deepEqual(new Set(ST_PHARMA_COSMETICS_PRODUCTS.map((item) => item.family)), new Set(["medicine", "cosmetics", "perfumery", "personal_hygiene"]));
  assert.equal(ST_PHARMA_COSMETICS_PRODUCTS.every((item) => item.cest && item.ncms.length > 0 && item.presentation && item.federalTreatment), true);
  assert.equal(ST_PHARMA_COSMETICS_ROUTES.length, 15);
  assert.equal(stPharmaCosmeticsLegalRoutes.length, 15);
  assert.equal(stPharmaCosmeticsStateRules.length, 64);
  assert.equal(ST_PHARMA_COSMETICS_PRIORITY_EVIDENCE.sourceCodes.length, 3);
  assert.deepEqual(stPharmaCosmeticsMetrics(), {
    rankedProducts: 8,
    rankedRoutes: 15,
    legalRouteProfiles: 15,
    parameterProfiles: 64,
    exactNoStProfiles: 20,
    conditionalProfiles: 26,
    explicitlyUnavailableProfiles: 18,
    controlledCells: 120,
    supportedCells: 76,
    partialCells: 26,
    notSupportedCells: 18,
    deterministicMemories: 76,
    safeFailures: 44,
    verificationCases: 180,
    positiveCases: 76,
    negativeCases: 104,
    temporalCases: 15,
    identityDivergentCases: 15,
    officialSources: 23,
  });
});

test("current SP medicine operation produces an explicit zero-ST memory, not an exemption", () => {
  const result = resolvePharmaCosmeticsOperation({
    route: "SP-SP",
    productCode: "REFERENCE_POSITIVE",
    operationDate: "2026-07-30",
    operationCents: 100_000,
    facts: confirmedFacts,
  });
  assert.equal(result.status, "ordinary_icms_no_st");
  assert.deepEqual(result.output, {
    operationCents: 100_000,
    icmsStBaseCents: 0,
    icmsStCents: 0,
    fcpStCents: 0,
    treatment: "ordinary_icms_no_st",
  });
  assert.match(result.limitation, /não significa isenção/i);
});

test("SP to MG protocol revocation does not leak a false zero-ST conclusion", () => {
  const result = resolvePharmaCosmeticsOperation({
    route: "SP-MG",
    productCode: "BEAUTY_CREAM",
    operationDate: "2026-07-30",
    operationCents: 250_000,
    facts: confirmedFacts,
  });
  assert.equal(result.status, "partial");
  assert.equal(result.output, null);
  assert.equal(result.cell?.treatment, "destination_entry_responsibility");
  assert.equal(result.cell?.sourceCodes.includes("SP-RC33735-2026"), true);
  assert.equal(result.cell?.sourceCodes.includes("MG-RICMS-ANEXO-VII"), true);
});

test("MG profiles preserve MVA, internal rate, FCP and PMPF gates", () => {
  assert.equal(profile("MG", "REFERENCE_POSITIVE").mvaOriginal.bps, 3824);
  assert.equal(profile("MG", "REFERENCE_POSITIVE").internalRate.bps, 1800);
  assert.equal(profile("MG", "GENERIC_POSITIVE").internalRate.bps, 1200);
  assert.equal(profile("MG", "REFERENCE_NEGATIVE").mvaOriginal.bps, 3300);
  assert.equal(profile("MG", "BEAUTY_CREAM").mvaOriginal.bps, 5960);
  assert.equal(profile("MG", "BEAUTY_CREAM").internalRate.bps, 2500);
  assert.equal(profile("MG", "BEAUTY_CREAM").fcpRate.bps, 200);
  assert.match(profile("MG", "PERFUME").baseMethod, /pmpf/i);
});

test("RJ profiles keep PMC discounts separate from current rates and MVA", () => {
  assert.equal(profile("RJ", "REFERENCE_POSITIVE").mvaOriginal.bps, 3824);
  assert.match(profile("RJ", "REFERENCE_POSITIVE").baseMethod, /2397/);
  assert.match(profile("RJ", "GENERIC_POSITIVE").baseMethod, /5099/);
  assert.equal(profile("RJ", "REFERENCE_NEGATIVE").mvaOriginal.bps, 3293);
  assert.match(profile("RJ", "REFERENCE_NEGATIVE").baseMethod, /1602/);
  assert.equal(profile("RJ", "PERFUME").mvaOriginal.bps, 5054);
  assert.equal(profile("RJ", "BEAUTY_CREAM").mvaOriginal.bps, 5779);
  assert.equal(profile("RJ", "PERFUME_DOOR_TO_DOOR").mvaOriginal.bps, 4965);
  assert.equal(profile("RJ", "PERFUME").internalRate.bps, 2500);
  assert.equal(profile("RJ", "PERFUME").fcpRate.bps, 200);
});

test("PR profiles expose exact conventional MVA and fail closed for unresolved door-to-door rule", () => {
  assert.equal(profile("PR", "PERFUME").mvaOriginal.bps, 4777);
  assert.equal(profile("PR", "BEAUTY_CREAM").mvaOriginal.bps, 5512);
  assert.equal(profile("PR", "PERFUME").internalRate.bps, 2500);
  assert.equal(profile("PR", "PERFUME").fcpRate.bps, 200);
  assert.equal(profile("PR", "REFERENCE_POSITIVE").internalRate.bps, 1950);
  assert.equal(profile("PR", "REFERENCE_POSITIVE").mvaOriginal.status, "case_specific");
  assert.equal(profile("PR", "PERFUME_DOOR_TO_DOOR").parameterStatus, "explicitly_unavailable");
  assert.equal(profile("PR", "PERFUME_DOOR_TO_DOOR").calculationReleased, false);

  const result = resolvePharmaCosmeticsOperation({
    route: "SP-PR",
    productCode: "PERFUME_DOOR_TO_DOOR",
    operationDate: "2026-07-30",
    operationCents: 100_000,
    facts: confirmedFacts,
  });
  assert.equal(result.coverageStatus, "not_supported");
  assert.equal(result.output, null);
});

test("SC current catalogue and conventional RS cosmetics produce explicit zero-ST memories", () => {
  for (const [route, productCode] of [["SP-SC", "REFERENCE_POSITIVE"], ["SP-SC", "SHAMPOO"], ["SP-RS", "DENTIFRICE"], ["SP-RS", "PERFUME"]]) {
    const result = resolvePharmaCosmeticsOperation({ route, productCode, operationDate: "2026-07-31", operationCents: 123_456, facts: confirmedFacts });
    assert.equal(result.status, "ordinary_icms_no_st", `${route}:${productCode}`);
    assert.equal(result.output?.icmsStCents, 0);
    assert.equal(result.output?.fcpStCents, 0);
  }
  assert.equal(profile("SC", "REFERENCE_POSITIVE").baseMethod, "not_applicable_no_st");
  assert.equal(profile("RS", "SHAMPOO").baseMethod, "not_applicable_no_st");
});

test("RS medicines expose official PMPF/MVA gates while GO and BA remain fail-closed", () => {
  assert.equal(profile("RS", "REFERENCE_POSITIVE").mvaOriginal.bps, 6560);
  assert.equal(profile("RS", "REFERENCE_POSITIVE").internalRate.bps, 1700);
  assert.match(profile("RS", "REFERENCE_POSITIVE").baseMethod, /pmpf/i);
  assert.equal(profile("GO", "BEAUTY_CREAM").parameterStatus, "explicitly_unavailable");
  assert.equal(profile("BA", "REFERENCE_POSITIVE").parameterStatus, "explicitly_unavailable");
  assert.equal(resolvePharmaCosmeticsOperation({ route: "SP-GO", productCode: "BEAUTY_CREAM", operationDate: "2026-07-31", operationCents: 100_000, facts: confirmedFacts }).output, null);
  assert.equal(resolvePharmaCosmeticsOperation({ route: "SP-BA", productCode: "REFERENCE_POSITIVE", operationDate: "2026-07-31", operationCents: 100_000, facts: confirmedFacts }).output, null);
});

test("180 verification cases cover positive, negative, temporal and identity-divergent paths", () => {
  assert.equal(stPharmaCosmeticsVerificationCases.length, 180);
  assert.equal(new Set(stPharmaCosmeticsVerificationCases.map((item) => item.key)).size, 180);
  assert.equal(stPharmaCosmeticsVerificationCases.filter((item) => item.category === "positive").length, 76);
  assert.equal(stPharmaCosmeticsVerificationCases.filter((item) => item.category === "temporal").length, 15);
  assert.equal(stPharmaCosmeticsVerificationCases.filter((item) => item.category === "identity_divergent").length, 15);
  assert.equal(stPharmaCosmeticsVerificationCases.every((item) => item.category === "positive" ? item.result.output !== null : item.result.output === null), true);
});

test("destination law, benefit, stale validity and missing documents fail closed", () => {
  const base = {
    route: "SP-SP",
    productCode: "BEAUTY_CREAM",
    operationDate: "2026-07-30",
    operationCents: 100_000,
    facts: confirmedFacts,
  };
  assert.equal(resolvePharmaCosmeticsOperation({ ...base, route: "SP-RJ" }).status, "partial");
  assert.equal(resolvePharmaCosmeticsOperation({ ...base, route: "SP-RJ" }).output, null);
  assert.equal(resolvePharmaCosmeticsOperation({ ...base, operationDate: "2026-03-31" }).output, null);
  assert.equal(resolvePharmaCosmeticsOperation({ ...base, facts: { ...confirmedFacts, noSpecialTreatmentConfirmed: false } }).output, null);
  assert.equal(resolvePharmaCosmeticsOperation({ ...base, facts: { ...confirmedFacts, documentsConfirmed: false } }).output, null);
});

test("priority base hash is stable and auditable", async () => {
  const first = await hashStPharmaCosmeticsPriority();
  assert.match(first, /^[0-9a-f]{64}$/);
  assert.equal(await hashStPharmaCosmeticsPriority(), first);
});

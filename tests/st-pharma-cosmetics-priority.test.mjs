import assert from "node:assert/strict";
import test from "node:test";

import {
  hashStPharmaCosmeticsPriority,
  resolvePharmaCosmeticsOperation,
  stPharmaCosmeticsLegalRoutes,
  stPharmaCosmeticsMetrics,
  stPharmaCosmeticsStateRules,
  ST_PHARMA_COSMETICS_PRODUCTS,
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
  assert.equal(ST_PHARMA_COSMETICS_PRODUCTS.length, 6);
  assert.deepEqual(new Set(ST_PHARMA_COSMETICS_PRODUCTS.map((item) => item.family)), new Set(["medicine", "cosmetics", "perfumery"]));
  assert.equal(ST_PHARMA_COSMETICS_PRODUCTS.every((item) => item.cest && item.ncms.length > 0 && item.federalTreatment), true);
  assert.equal(stPharmaCosmeticsLegalRoutes.length, 7);
  assert.equal(stPharmaCosmeticsStateRules.length, 24);
  assert.deepEqual(stPharmaCosmeticsMetrics(), {
    rankedProducts: 6,
    rankedRoutes: 7,
    legalRouteProfiles: 7,
    parameterProfiles: 24,
    exactNoStProfiles: 6,
    conditionalProfiles: 17,
    explicitlyUnavailableProfiles: 1,
    controlledCells: 42,
    supportedCells: 24,
    partialCells: 17,
    notSupportedCells: 1,
    deterministicMemories: 24,
    safeFailures: 18,
    officialSources: 14,
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

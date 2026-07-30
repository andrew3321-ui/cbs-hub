import assert from "node:assert/strict";
import test from "node:test";

import {
  hashStColdBeverageSpDestination,
  resolveColdBeverageSpDestinationOperation,
  stColdBeverageSpDestinationMetrics,
  stColdBeverageSpReferenceRuns,
  ST_COLD_BEVERAGES_SP_DESTINATION_ROUTES,
  ST_COLD_BEVERAGES_SP_PMPF_PROFILES,
  validateStColdBeverageSpDestination,
} from "../domain/st-cold-beverages-sp-destination.ts";

const confirmedFacts = {
  exactProfileConfirmed: true,
  unlistedBrandEligibilityConfirmed: true,
  normalTaxRegimeConfirmed: true,
  taxpayerResaleOperationConfirmed: true,
  substituteResponsibilityConfirmed: true,
  noProtocolExceptionConfirmed: true,
  ownTaxBaseConfirmed: true,
  noSpecialTreatmentConfirmed: true,
  documentsConfirmed: true,
};

const baseInput = {
  route: "MG-SP",
  profileCode: "UNLISTED_SOFT_DRINK_PET_1751_2000",
  operationDate: "2026-07-25",
  quantityUnits: 100,
  operationCents: 56_340,
  ownIcmsBaseCents: 56_340,
  importedQualified: false,
  facts: confirmedFacts,
};

test("V77 closes 70 exact PMPF cells for the seven priority origins into São Paulo", () => {
  assert.deepEqual(validateStColdBeverageSpDestination(), { passed: true, errors: [] });
  assert.deepEqual(stColdBeverageSpDestinationMetrics(), {
    inboundRoutes: 7,
    exactPmpfProfiles: 10,
    controlledCells: 70,
    reproducedMemories: 70,
    safeFailures: 0,
    officialSources: 7,
    coverage: { supported: 70, partial: 0, notSupported: 0 },
  });
  assert.equal(ST_COLD_BEVERAGES_SP_DESTINATION_ROUTES.every((route) => route.destination === "SP"), true);
  assert.equal(ST_COLD_BEVERAGES_SP_PMPF_PROFILES.some((profile) => profile.productCode === "WATER_GLASS"), false);
  assert.equal(ST_COLD_BEVERAGES_SP_PMPF_PROFILES.every((profile) => profile.ncms.length > 0 && profile.legalDescription && profile.commercialUnitUnits > 0), true);
  assert.equal(new Set(ST_COLD_BEVERAGES_SP_PMPF_PROFILES.map((profile) => profile.priorityRank)).size, 10);
  assert.equal(stColdBeverageSpReferenceRuns.every((run) => run.status === "calculated_reference" && run.output), true);
});

test("domestic PMPF memory reproduces the exact soft-drink calculation in cents", () => {
  const result = resolveColdBeverageSpDestinationOperation(baseInput);
  assert.equal(result.status, "calculated_reference");
  assert.deepEqual(result.parameters, {
    quantityUnits: 100,
    pmpfUnitCents: 939,
    pmpfLimitCents: 84_510,
    interstateRateBps: 1_200,
    internalRateBps: 1_800,
    fcpRateBps: 0,
    importedQualified: false,
  });
  assert.deepEqual(result.output, {
    stBaseCents: 93_900,
    ownIcmsCents: 6_761,
    presumedInternalIcmsCents: 16_902,
    icmsStCents: 10_141,
    fcpCents: 0,
    destinationTotalCents: 10_141,
  });
});

test("qualified imported merchandise uses 4% only when explicitly selected", () => {
  const result = resolveColdBeverageSpDestinationOperation({ ...baseInput, importedQualified: true });
  assert.equal(result.status, "calculated_reference");
  assert.equal(result.parameters?.interstateRateBps, 400);
  assert.equal(result.output?.ownIcmsCents, 2_254);
  assert.equal(result.output?.icmsStCents, 14_648);
});

test("integral pack uses the official pack price as one indivisible commercial unit", () => {
  const result = resolveColdBeverageSpDestinationOperation({
    ...baseInput,
    profileCode: "COCA_COLA_PACK_6_CAN_350",
    quantityUnits: 10,
    operationCents: 15_942,
    ownIcmsBaseCents: 15_942,
  });
  assert.equal(result.status, "calculated_reference");
  assert.equal(result.profile?.commercialUnit, "integral_pack");
  assert.equal(result.profile?.commercialUnitUnits, 6);
  assert.equal(result.output?.stBaseCents, 26_570);
});

test("the 90% legal gate abandons PMPF without fabricating the IVA fallback", () => {
  const result = resolveColdBeverageSpDestinationOperation({
    ...baseInput,
    operationCents: 84_510,
    ownIcmsBaseCents: 84_510,
  });
  assert.equal(result.status, "pmpf_fallback_required");
  assert.equal(result.output, null);
  assert.match(result.blockers[0], /90%|IVA-ST/);
});

test("unknown routes, stale dates, missing facts and unknown profiles fail closed", () => {
  assert.equal(resolveColdBeverageSpDestinationOperation({ ...baseInput, route: "SP-MG" }).status, "blocked");
  assert.equal(resolveColdBeverageSpDestinationOperation({ ...baseInput, operationDate: "2026-06-30" }).status, "blocked");
  assert.equal(resolveColdBeverageSpDestinationOperation({ ...baseInput, profileCode: "WATER_GLASS" }).status, "blocked");
  const missing = resolveColdBeverageSpDestinationOperation({
    ...baseInput,
    facts: { ...confirmedFacts, documentsConfirmed: false },
  });
  assert.equal(missing.status, "blocked");
  assert.equal(missing.missingFacts.length, 1);
  assert.equal(missing.output, null);
});

test("SP destination hash is stable and auditable", async () => {
  const first = await hashStColdBeverageSpDestination();
  assert.match(first, /^[0-9a-f]{64}$/);
  assert.equal(await hashStColdBeverageSpDestination(), first);
});

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

test("V69 closes 35 exact PMPF cells for the seven priority origins into São Paulo", () => {
  assert.deepEqual(validateStColdBeverageSpDestination(), { passed: true, errors: [] });
  assert.deepEqual(stColdBeverageSpDestinationMetrics(), {
    inboundRoutes: 7,
    exactPmpfProfiles: 5,
    controlledCells: 35,
    reproducedMemories: 35,
    safeFailures: 0,
    officialSources: 6,
  });
  assert.equal(ST_COLD_BEVERAGES_SP_DESTINATION_ROUTES.every((route) => route.destination === "SP"), true);
  assert.equal(ST_COLD_BEVERAGES_SP_PMPF_PROFILES.some((profile) => profile.productCode === "WATER_GLASS"), false);
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

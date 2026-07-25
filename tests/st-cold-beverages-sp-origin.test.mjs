import assert from "node:assert/strict";
import test from "node:test";

import {
  hashStColdBeverageSpOrigin,
  resolveColdBeverageSpOriginOperation,
  stColdBeverageSpOriginMetrics,
  stColdBeverageSpOriginReferenceRuns,
  ST_COLD_BEVERAGES_SP_ORIGIN_PMPF_PROFILES,
  ST_COLD_BEVERAGES_SP_ORIGIN_ROUTES,
  validateStColdBeverageSpOrigin,
} from "../domain/st-cold-beverages-sp-origin.ts";

const confirmedFacts = {
  exactProfileConfirmed: true,
  normalTaxRegimeConfirmed: true,
  taxpayerResaleOperationConfirmed: true,
  substituteResponsibilityConfirmed: true,
  noProtocolExceptionConfirmed: true,
  ownTaxBaseConfirmed: true,
  destinationRatesConfirmed: true,
  noSpecialTreatmentConfirmed: true,
  documentsConfirmed: true,
};

const mgInput = {
  route: "SP-MG",
  profileCode: "MG_COCA_COLA_PET_2000",
  operationDate: "2026-07-25",
  quantityUnits: 100,
  operationCents: 71_580,
  ownIcmsBaseCents: 71_580,
  importedQualified: false,
  facts: confirmedFacts,
};

const rjInput = {
  route: "SP-RJ",
  profileCode: "RJ_COCA_COLA_PET_1751_2000",
  operationDate: "2026-07-25",
  quantityUnits: 100,
  operationCents: 64_440,
  ownIcmsBaseCents: 64_440,
  importedQualified: false,
  facts: confirmedFacts,
};

test("V70 closes five exact PMPF profiles in each new SP outbound route", () => {
  assert.deepEqual(validateStColdBeverageSpOrigin(), { passed: true, errors: [] });
  assert.deepEqual(stColdBeverageSpOriginMetrics(), {
    outboundRoutes: 2,
    exactPmpfProfiles: 10,
    controlledCells: 10,
    reproducedMemories: 10,
    safeFailures: 0,
    officialSources: 10,
  });
  assert.deepEqual(ST_COLD_BEVERAGES_SP_ORIGIN_ROUTES.map((route) => route.route), ["SP-MG", "SP-RJ"]);
  assert.equal(ST_COLD_BEVERAGES_SP_ORIGIN_PMPF_PROFILES.filter((profile) => profile.destination === "MG").length, 5);
  assert.equal(ST_COLD_BEVERAGES_SP_ORIGIN_PMPF_PROFILES.filter((profile) => profile.destination === "RJ").length, 5);
  assert.equal(stColdBeverageSpOriginReferenceRuns.every((run) => run.status === "calculated_reference" && run.output), true);
});

test("SP to MG separates ICMS-ST and the 2% FEM in cents", () => {
  const result = resolveColdBeverageSpOriginOperation(mgInput);
  assert.equal(result.status, "calculated_reference");
  assert.deepEqual(result.parameters, {
    quantityUnits: 100,
    pmpfUnitCents: 1_193,
    pmpfLimitCents: 95_440,
    pmpfLimitBps: 8_000,
    fallbackComparison: "greater_than",
    interstateRateBps: 1_200,
    internalRateBps: 1_800,
    fcpRateBps: 200,
    importedQualified: false,
  });
  assert.deepEqual(result.output, {
    stBaseCents: 119_300,
    ownIcmsCents: 8_590,
    presumedInternalIcmsCents: 21_474,
    icmsStCents: 12_884,
    fcpCents: 2_386,
    destinationTotalCents: 15_270,
  });
});

test("SP to RJ uses the 20% internal rate and keeps FECP separate", () => {
  const result = resolveColdBeverageSpOriginOperation(rjInput);
  assert.equal(result.status, "calculated_reference");
  assert.equal(result.parameters?.internalRateBps, 2_000);
  assert.equal(result.parameters?.fcpRateBps, 200);
  assert.deepEqual(result.output, {
    stBaseCents: 107_400,
    ownIcmsCents: 7_733,
    presumedInternalIcmsCents: 21_480,
    icmsStCents: 13_747,
    fcpCents: 2_148,
    destinationTotalCents: 15_895,
  });
});

test("MG and RJ preserve their distinct 80% boundary rules", () => {
  const mgAtBoundary = resolveColdBeverageSpOriginOperation({
    ...mgInput,
    operationCents: 95_440,
    ownIcmsBaseCents: 95_440,
  });
  assert.equal(mgAtBoundary.status, "calculated_reference");
  const mgAboveBoundary = resolveColdBeverageSpOriginOperation({
    ...mgInput,
    operationCents: 95_441,
    ownIcmsBaseCents: 95_441,
  });
  assert.equal(mgAboveBoundary.status, "pmpf_fallback_required");

  const rjAtBoundary = resolveColdBeverageSpOriginOperation({
    ...rjInput,
    operationCents: 85_920,
    ownIcmsBaseCents: 85_920,
  });
  assert.equal(rjAtBoundary.status, "pmpf_fallback_required");
});

test("route/profile mismatch, stale date and missing evidence fail closed", () => {
  assert.equal(resolveColdBeverageSpOriginOperation({ ...mgInput, route: "SP-RJ" }).status, "blocked");
  assert.equal(resolveColdBeverageSpOriginOperation({ ...mgInput, operationDate: "2027-01-01" }).status, "blocked");
  assert.equal(resolveColdBeverageSpOriginOperation({ ...mgInput, profileCode: "MG_UNKNOWN" }).status, "blocked");
  const missing = resolveColdBeverageSpOriginOperation({
    ...mgInput,
    facts: { ...confirmedFacts, destinationRatesConfirmed: false },
  });
  assert.equal(missing.status, "blocked");
  assert.equal(missing.missingFacts.length, 1);
  assert.equal(missing.output, null);
});

test("qualified imported merchandise uses 4% only when explicitly confirmed", () => {
  const result = resolveColdBeverageSpOriginOperation({ ...mgInput, importedQualified: true });
  assert.equal(result.status, "calculated_reference");
  assert.equal(result.parameters?.interstateRateBps, 400);
  assert.equal(result.output?.ownIcmsCents, 2_863);
  assert.equal(result.output?.destinationTotalCents, 20_997);
});

test("SP origin beverage hash is stable and auditable", async () => {
  const first = await hashStColdBeverageSpOrigin();
  assert.match(first, /^[0-9a-f]{64}$/);
  assert.equal(await hashStColdBeverageSpOrigin(), first);
});

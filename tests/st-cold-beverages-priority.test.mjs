import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyColdBeverageApplicability,
  hashStColdBeveragePriority,
  resolveColdBeveragePriorityOperation,
  stColdBeverageApplicabilityMatrix,
  stColdBeverageMetrics,
  stColdBeverageRoutes,
  stColdBeverageSources,
  ST_COLD_BEVERAGE_PRODUCTS,
  validateStColdBeveragePriority,
} from "../domain/st-cold-beverages-priority.ts";

test("V68 structures 144 beverage product-route cells without releasing unsafe totals", () => {
  assert.deepEqual(validateStColdBeveragePriority(), { passed: true, errors: [] });
  assert.deepEqual(stColdBeverageMetrics(), {
    corridors: 12,
    directedRoutes: 24,
    productIdentities: 6,
    productRouteCells: 144,
    protocolScopedCells: 125,
    explicitExceptionCells: 19,
    finalCalculationsReleased: 0,
    officialSources: 5,
  });
  assert.equal(stColdBeverageApplicabilityMatrix.length, stColdBeverageRoutes.length * ST_COLD_BEVERAGE_PRODUCTS.length);
  assert.equal(stColdBeverageRoutes.every((route) => route.directionalSymmetryAssumed === false), true);
});

test("soft drinks, energy drinks and isotonic drinks stay in protocol triage on priority routes", () => {
  for (const route of stColdBeverageRoutes) {
    for (const productCode of ["SOFT_DRINK_PET", "SOFT_DRINK_CAN", "ENERGY_CAN", "ENERGY_PET", "ISOTONIC"]) {
      assert.equal(classifyColdBeverageApplicability(route.route, productCode, "2026-07-22")?.status, "protocol_scoped_parameters_pending");
    }
  }
});

test("water applies the current SP, PR, MG, SC and RS exceptions by direction and date", () => {
  assert.equal(classifyColdBeverageApplicability("SP-RJ", "WATER_GLASS", "2026-06-30")?.status, "protocol_scoped_parameters_pending");
  assert.equal(classifyColdBeverageApplicability("SP-RJ", "WATER_GLASS", "2026-07-01")?.status, "protocol_not_applicable");
  assert.equal(classifyColdBeverageApplicability("SP-PR", "WATER_GLASS", "2026-07-22")?.status, "protocol_not_applicable");
  assert.equal(classifyColdBeverageApplicability("RJ-MG", "WATER_GLASS", "2026-07-22")?.status, "protocol_not_applicable");
  assert.equal(classifyColdBeverageApplicability("MG-RJ", "WATER_GLASS", "2026-07-22")?.status, "protocol_scoped_parameters_pending");
  assert.equal(classifyColdBeverageApplicability("PR-SC", "WATER_GLASS", "2026-07-22")?.status, "protocol_not_applicable");
  assert.equal(classifyColdBeverageApplicability("BA-PE", "WATER_GLASS", "2026-07-22")?.status, "protocol_scoped_parameters_pending");
});

const confirmedFacts = {
  productIdentityConfirmed: true,
  taxpayerOperationConfirmed: true,
  responsiblePartyConfirmed: true,
  noProtocolExceptionConfirmed: true,
  destinationInternalTreatmentConfirmed: true,
  officialPriceMethodConfirmed: true,
  stateRatesConfirmed: true,
  documentsConfirmed: true,
};

test("the operation engine classifies scope but never fabricates a final beverage tax", () => {
  const scoped = resolveColdBeveragePriorityOperation({ route: "SP-MG", productCode: "SOFT_DRINK_PET", operationDate: "2026-07-22", facts: confirmedFacts });
  assert.equal(scoped.status, "scoped_parameters_pending");
  assert.equal(scoped.output, null);
  assert.match(scoped.blockers[0], /PMPF|MVA/);
  assert.equal(scoped.nextChecks.length, 3);

  const exception = resolveColdBeveragePriorityOperation({ route: "SP-RJ", productCode: "WATER_GLASS", operationDate: "2026-07-22", facts: confirmedFacts });
  assert.equal(exception.status, "protocol_not_applicable");
  assert.equal(exception.output, null);
  assert.match(exception.blockers[0], /01\/07\/2026/);
});

test("unknown data and missing facts fail closed", () => {
  const missing = resolveColdBeveragePriorityOperation({ route: "SP-MG", productCode: "SOFT_DRINK_PET", operationDate: "2026-07-22", facts: { ...confirmedFacts, documentsConfirmed: false } });
  assert.equal(missing.status, "blocked");
  assert.equal(missing.missingFacts.length, 1);
  assert.equal(missing.output, null);
  assert.equal(resolveColdBeveragePriorityOperation({ route: "XX-YY", productCode: "SOFT_DRINK_PET", operationDate: "2026-07-22", facts: confirmedFacts }).status, "blocked");
  assert.equal(resolveColdBeveragePriorityOperation({ route: "SP-MG", productCode: "UNKNOWN", operationDate: "2026-07-22", facts: confirmedFacts }).status, "blocked");
  assert.equal(resolveColdBeveragePriorityOperation({ route: "SP-MG", productCode: "SOFT_DRINK_PET", operationDate: "2027-01-01", facts: confirmedFacts }).status, "blocked");
});

test("official sources and matrix hash are stable and auditable", async () => {
  assert.equal(stColdBeverageSources.every((source) => source.url.startsWith("https://") && source.proves.length > 0), true);
  const fingerprint = await hashStColdBeveragePriority();
  assert.match(fingerprint, /^[0-9a-f]{64}$/);
  assert.equal(fingerprint, await hashStColdBeveragePriority());
});

import assert from "node:assert/strict";
import test from "node:test";

import {
  ISS_MUNICIPAL_100_NATIONAL_SOURCE,
  hashIssMunicipal100Expansion,
  issMunicipal100Cells,
  issMunicipal100Cities,
  issMunicipal100Metrics,
  issMunicipal100ReferenceCases,
  issMunicipal100ServiceItems,
  issMunicipal100Sources,
  validateIssMunicipal100Expansion,
} from "../domain/iss-municipal-100-expansion.ts";

test("V102 ranks 50 additional municipalities with official portals and explicit legal gaps", () => {
  assert.deepEqual(validateIssMunicipal100Expansion(), { passed: true, errors: [] });
  assert.equal(issMunicipal100Cities.length, 50);
  assert.deepEqual(issMunicipal100Cities.map((item) => item.rank), Array.from({ length: 50 }, (_, index) => index + 51));
  assert.equal(new Set(issMunicipal100Cities.map((item) => item.ibgeCode)).size, 50);
  assert.equal(issMunicipal100Sources.length, 50);
  assert.equal(new Set(issMunicipal100Sources.map((item) => item.url)).size, 50);
  assert.ok(issMunicipal100Sources.every((item) => item.url.startsWith("https://")));
  assert.ok(issMunicipal100Cities.every((item) => item.stage === "structured_partial" && item.calculationSupported === false));
  assert.ok(issMunicipal100Cities.every((item) => item.legalMap.portalUrl.startsWith("https://") && item.legalMap.version.length > 10));
});

test("ten recurring LC 116 items produce exactly 500 safe partial combinations", () => {
  assert.equal(issMunicipal100ServiceItems.length, 10);
  assert.deepEqual(new Set(issMunicipal100ServiceItems.map((item) => item.serviceProfile)), new Set([
    "CONSULTING", "ACCOUNTING", "INFORMATION_TECHNOLOGY", "ADVERTISING", "ENGINEERING",
    "HEALTH", "LAW", "MAINTENANCE", "CLEANING", "CONSTRUCTION",
  ]));
  assert.equal(issMunicipal100Cells.length, 500);
  assert.equal(new Set(issMunicipal100Cells.map((item) => item.code)).size, 500);
  assert.ok(issMunicipal100Cells.every((item) => item.coverageStatus === "partial" && item.calculationSupported === false));
  assert.ok(issMunicipal100Cells.every((item) => item.rate.bps === null && item.effectiveFrom === null && item.withholding.responsible === null));
  assert.ok(issMunicipal100Cells.every((item) => item.sourceCodes.includes(ISS_MUNICIPAL_100_NATIONAL_SOURCE.code) && item.sourceCodes.length === 2));
});

test("300 deterministic scenarios reproduce fail-closed behavior without a tax amount", async () => {
  assert.equal(issMunicipal100ReferenceCases.length, 300);
  assert.equal(new Set(issMunicipal100ReferenceCases.map((item) => item.code)).size, 300);
  assert.ok(issMunicipal100ReferenceCases.every((item) => item.expectedStatus === "blocked" && item.expectedTaxCents === null));
  assert.deepEqual(issMunicipal100Metrics(), {
    newMunicipalities: 50,
    totalDeepMunicipalities: 100,
    recurringServiceItems: 10,
    auditedCombinations: 500,
    deterministicCases: 300,
    calculatedMemories: 0,
    safelyBlockedCases: 300,
    supportedCells: 0,
    partialCells: 500,
  });
  assert.match(await hashIssMunicipal100Expansion(), /^[a-f0-9]{64}$/);
});

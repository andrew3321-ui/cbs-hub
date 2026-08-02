import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPublicCoverageIndicator,
  PUBLIC_COVERAGE_INDICATOR_CHECKED_AT,
  PUBLIC_COVERAGE_INDICATOR_VERSION,
} from "../domain/public-coverage-indicator.ts";
import { NATIONAL_COVERAGE_VERSION, recurringScenarios } from "../domain/national-tax-coverage.ts";

test("public coverage indicator exposes normalized matrix with sources and regression evidence", async () => {
  const indicator = await buildPublicCoverageIndicator();

  assert.equal(indicator.version, PUBLIC_COVERAGE_INDICATOR_VERSION);
  assert.equal(indicator.checkedAt, PUBLIC_COVERAGE_INDICATOR_CHECKED_AT);
  assert.equal(indicator.baseCoverageVersion, NATIONAL_COVERAGE_VERSION);
  assert.ok(indicator.matrix.length >= 100);
  assert.ok(indicator.matrix.some((item) => item.dimension === "uf" && item.uf === "SP"));
  assert.ok(indicator.matrix.some((item) => item.dimension === "municipality" && item.code === "MUN-3550308"));
  assert.ok(indicator.matrix.some((item) => item.code === "ISS-SERVICE-ISS-DF-17.01-PJ-STANDARD" && item.status === "supported"));
  assert.ok(indicator.matrix.some((item) => item.code === "ISS-SERVICE-ISS-REC-17.01-PJ-STANDARD" && item.status === "supported"));
  assert.ok(indicator.matrix.some((item) => item.code === "ISS-SERVICE-ISS-BEL-17.01-STANDARD" && item.status === "supported"));
  assert.ok(indicator.matrix.some((item) => item.dimension === "product" && item.code === "ST-AUTO_PARTS"));
  assert.ok(indicator.matrix.some((item) => item.dimension === "scenario" && item.code === "FED-IPI-TIPI"));
  assert.ok(indicator.matrix.every((item) => ["supported", "partial", "not_supported"].includes(item.status)));
  assert.ok(indicator.matrix.every((item) => item.version && item.checkedAt && item.officialSources.length > 0));
  assert.ok(indicator.matrix.every((item) => Object.hasOwn(item, "effectiveFrom") && Object.hasOwn(item, "effectiveTo")));
  assert.ok(indicator.matrix.some((item) => item.effectiveFrom));
  assert.ok(indicator.matrix.every((item) => item.officialSources.every((source) => source.url.startsWith("https://"))));
  assert.ok(indicator.matrix.every((item) => item.objectiveReason.length > 10));
  assert.ok(indicator.matrix.every((item) => item.regression.cases >= 900 && item.regression.failures === 0));
  assert.equal(indicator.maturityTotals.catalogued, indicator.matrix.length);
  assert.equal(indicator.maturityTotals.approved, 0);
  assert.equal(indicator.regressionTotals.failures, 0);
});

test("classification contract is shared across public surfaces without client data exposure", async () => {
  const indicator = await buildPublicCoverageIndicator();
  const expectedSurfaces = ["search", "calculation", "dossier", "report", "public_api"];

  for (const item of indicator.matrix) {
    assert.deepEqual(item.classificationContract.surfaces, expectedSurfaces);
    assert.equal(item.classificationContract.status, item.status);
    assert.equal(item.classificationContract.source, "public_coverage_indicator");
  }

  assert.deepEqual(indicator.classificationPolicy.surfaces, expectedSurfaces);
  assert.equal(indicator.privacy.clientDataIncluded, false);
  assert.ok(indicator.changeHistory.length >= 2);
  assert.ok(indicator.changeHistory.every((change) => change.clientDataExposed === false));
  assert.ok(indicator.changeHistory.every((change) => change.affectedCodes.length > 0));
  assert.ok(indicator.changeHistory.every((change) => !/\d{14}/.test(change.summary)));
  assert.ok(recurringScenarios.some((item) => item.code === "IRPJ-CSLL-REAL" && item.status === "partial"));
  assert.ok(recurringScenarios.some((item) => item.code === "IPI-TIPI" && item.status === "partial"));
});

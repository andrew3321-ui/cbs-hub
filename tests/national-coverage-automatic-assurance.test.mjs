import assert from "node:assert/strict";
import test from "node:test";

import {
  hashNationalCoverageAutomaticAssurance,
  validateNationalCoverageAutomatically,
} from "../domain/national-coverage-automatic-assurance.ts";

test("garantia automática libera somente uma base tecnicamente íntegra", () => {
  const assurance = validateNationalCoverageAutomatically();
  assert.equal(assurance.status, "automatically_verified");
  assert.equal(assurance.professionalOpinion, false);
  assert.equal(assurance.humanReviewRequired, false);
  assert.equal(assurance.metrics.modules, 8);
  assert.equal(assurance.metrics.modulesPassed, 8);
  assert.equal(assurance.metrics.totalRuns, 650);
  assert.equal(assurance.metrics.referenceReproduced, 5);
  assert.equal(assurance.metrics.safelyBlocked, 645);
  assert.equal(assurance.metrics.failed, 0);
  assert.deepEqual(assurance.errors, []);
});

test("hash da garantia cobre toda a base técnica agregada", async () => {
  const first = await hashNationalCoverageAutomaticAssurance();
  const second = await hashNationalCoverageAutomaticAssurance();
  assert.match(first, /^[0-9a-f]{64}$/);
  assert.equal(second, first);
});

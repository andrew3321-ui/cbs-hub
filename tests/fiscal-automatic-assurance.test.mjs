import assert from "node:assert/strict";
import test from "node:test";

import {
  FISCAL_AUTOMATED_ASSURANCE_VERSION,
  buildFiscalAutomaticAssurance,
} from "../domain/fiscal-automatic-assurance.ts";

test("automatic fiscal assurance proves only deterministic controls it can execute", async () => {
  const assurance = await buildFiscalAutomaticAssurance();
  assert.equal(assurance.version, FISCAL_AUTOMATED_ASSURANCE_VERSION);
  assert.equal(assurance.policy.humanReviewRequired, false);
  assert.equal(assurance.policy.professionalOpinion, false);
  assert.equal(assurance.metrics.total, 40);
  assert.equal(assurance.metrics.testPacks, 45);
  assert.equal(assurance.metrics.automaticallyVerified, 40);
  assert.equal(assurance.metrics.expectedBlocks, 12);
  assert.match(assurance.baseHash, /^[0-9a-f]{64}$/);
  for (const item of assurance.cases) {
    assert.equal(item.status, "automatically_verified", item.code);
    assert.ok(item.controls.length >= 5, item.code);
    assert.equal(item.controls.every((control) => control.passed), true, item.code);
    assert.ok(item.officialSourceCount >= 1, item.code);
  }
});

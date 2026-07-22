import assert from "node:assert/strict";
import test from "node:test";

import {
  hashStCementPriorityBatch,
  stCementPriorityBatchMetrics,
  stCementPrioritySources,
  stCementPriorityStateByDestination,
  stCementPriorityStates,
  validateStCementPriorityBatch,
} from "../domain/st-cement-priority-batch.ts";

test("V62 structures five priority cement destinations from official state sources", () => {
  assert.deepEqual(validateStCementPriorityBatch(), { passed: true, errors: [] });
  assert.deepEqual(stCementPriorityBatchMetrics(), {
    statesInBatch: 5,
    officialStateSources: 7,
    adjustedMvaTablesSourced: 5,
    productExceptionsStructured: 1,
    pmpfGatesStructured: 1,
    syntheticReferencesReproduced: 1,
  });
  assert.deepEqual(Object.fromEntries(stCementPriorityStates.map((state) => [state.destination, state.publishedAdjustedMvaBpsFor12])), { RJ: 3200, ES: 2723, BA: 3283, GO: 3037, MS: 2723 });
});

test("only the controlled RJ synthetic reference produces a value", () => {
  const rj = stCementPriorityStateByDestination.get("RJ");
  assert.equal(rj?.syntheticReference?.mvaAppliedBps, 3200);
  assert.equal(rj?.syntheticReference?.destinationTotalCents, 17_040);
  assert.equal(stCementPriorityStates.filter((state) => state.syntheticReference !== null).length, 1);
  assert.equal(stCementPriorityStates.filter((state) => state.destination !== "RJ").every((state) => state.remainingBlockers.length > 0), true);
});

test("state-specific product and base gates are explicit", () => {
  assert.deepEqual(stCementPriorityStateByDestination.get("ES")?.productExclusions, ["cimento branco"]);
  assert.equal(stCementPriorityStateByDestination.get("MS")?.calculationMethod, "pmpf_by_gtin_or_mva_fallback");
  assert.match(stCementPriorityStateByDestination.get("MS")?.remainingBlockers.join(" ") ?? "", /GTIN/);
});

test("priority batch sources and ledger are tamper evident", async () => {
  assert.equal(stCementPrioritySources.every((source) => source.url.startsWith("https://") && source.publisher.length > 0 && source.proves.length > 0), true);
  const fingerprint = await hashStCementPriorityBatch();
  assert.match(fingerprint, /^[0-9a-f]{64}$/);
  assert.equal(fingerprint, await hashStCementPriorityBatch());
});

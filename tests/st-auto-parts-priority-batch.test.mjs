import assert from "node:assert/strict";
import test from "node:test";

import {
  hashStAutoPartsPriorityBatch,
  stAutoPartsPriorityBatchMetrics,
  stAutoPartsPriorityRouteByDestination,
  stAutoPartsPriorityRoutes,
  stAutoPartsPrioritySources,
  validateStAutoPartsPriorityBatch,
} from "../domain/st-auto-parts-priority-batch.ts";
import { stSpCalculationRuns } from "../domain/st-sp-calculation-validation.ts";

test("V63 structures the six highest-priority SP auto-parts routes", () => {
  assert.deepEqual(validateStAutoPartsPriorityBatch(), { passed: true, errors: [] });
  assert.deepEqual(stAutoPartsPriorityBatchMetrics(), {
    routesInBatch: 6,
    activeAgreementRoutes: 3,
    outsideProtocolRoutes: 3,
    destinationMvaOverrides: 2,
    productIdentitiesFrozen: 6,
    syntheticReferencesReproduced: 1,
    officialSources: 7,
  });
  assert.deepEqual(stAutoPartsPriorityRoutes.filter((route) => route.agreementStatus === "protocol_41_active").map((route) => route.destination), ["RJ", "PR", "BA"]);
  assert.deepEqual(stAutoPartsPriorityRoutes.filter((route) => route.agreementStatus === "outside_protocol_41").map((route) => route.destination), ["SC", "RS", "GO"]);
});

test("withdrawn destinations never inherit an obsolete protocol calculation", () => {
  for (const uf of ["SC", "RS", "GO"]) {
    const route = stAutoPartsPriorityRouteByDestination.get(uf);
    assert.equal(route?.parameterMethod, "destination_own_treatment_required");
    assert.equal(route?.mvaOriginalBps, null);
    assert.equal(route?.syntheticReference, null);
  }
  const blocked = stSpCalculationRuns.filter((run) => ["SP-SC:AUTO_PARTS", "SP-RS:AUTO_PARTS", "SP-GO:AUTO_PARTS"].includes(run.key));
  assert.equal(blocked.every((run) => run.status === "blocked_protocol_not_applicable" && run.output === null), true);
});

test("the RJ controlled auto-parts reference reproduces every cent", () => {
  const reference = stAutoPartsPriorityRouteByDestination.get("RJ")?.syntheticReference;
  assert.equal(reference?.mvaAppliedBps, 8_896);
  assert.equal(reference?.stBaseCents, 188_960);
  assert.equal(reference?.icmsStCents, 25_792);
  assert.equal(reference?.fcpCents, 3_779);
  assert.equal(reference?.destinationTotalCents, 29_571);
  assert.equal(stAutoPartsPriorityRoutes.filter((route) => route.syntheticReference !== null).length, 1);
});

test("auto-parts sources and route ledger are tamper evident", async () => {
  assert.equal(stAutoPartsPrioritySources.every((source) => source.url.startsWith("https://") && source.proves.length > 0), true);
  const fingerprint = await hashStAutoPartsPriorityBatch();
  assert.match(fingerprint, /^[0-9a-f]{64}$/);
  assert.equal(fingerprint, await hashStAutoPartsPriorityBatch());
});

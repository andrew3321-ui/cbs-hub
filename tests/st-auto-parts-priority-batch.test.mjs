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

test("V65 structures every SP auto-parts route against the current protocol", () => {
  assert.deepEqual(validateStAutoPartsPriorityBatch(), { passed: true, errors: [] });
  assert.deepEqual(stAutoPartsPriorityBatchMetrics(), {
    routesInBatch: 26,
    activeAgreementRoutes: 15,
    outsideProtocolRoutes: 11,
    destinationMvaOverrides: 5,
    productIdentitiesFrozen: 26,
    syntheticReferencesReproduced: 1,
    officialSources: 7,
  });
  assert.deepEqual(stAutoPartsPriorityRoutes.filter((route) => route.agreementStatus === "protocol_41_active").map((route) => route.destination), ["AC", "AL", "AP", "AM", "BA", "DF", "MA", "MG", "MT", "PA", "PB", "PI", "PR", "RJ", "RR"]);
  assert.deepEqual(stAutoPartsPriorityRoutes.filter((route) => route.agreementStatus === "outside_protocol_41").map((route) => route.destination), ["CE", "ES", "GO", "MS", "PE", "RN", "RO", "RS", "SC", "SE", "TO"]);
});

test("every destination outside the current protocol fails closed", () => {
  for (const uf of ["CE", "ES", "GO", "MS", "PE", "RN", "RO", "RS", "SC", "SE", "TO"]) {
    const route = stAutoPartsPriorityRouteByDestination.get(uf);
    assert.equal(route?.parameterMethod, "destination_own_treatment_required");
    assert.equal(route?.mvaOriginalBps, null);
    assert.equal(route?.syntheticReference, null);
  }
  const blocked = stSpCalculationRuns.filter((run) => run.productCode === "REP-AUTO_PARTS" && run.status === "blocked_protocol_not_applicable");
  assert.equal(blocked.length, 11);
  assert.equal(blocked.every((run) => run.output === null), true);
});

test("destinations named by the current protocol use the correct MVA source", () => {
  for (const uf of ["AL", "BA", "MT", "PI", "PR"]) {
    const route = stAutoPartsPriorityRouteByDestination.get(uf);
    assert.equal(route?.parameterMethod, "destination_internal_mva");
    assert.equal(route?.mvaOriginalBps, null);
  }
  for (const uf of ["AC", "AP", "AM", "DF", "MA", "MG", "PA", "PB", "RJ", "RR"]) {
    const route = stAutoPartsPriorityRouteByDestination.get(uf);
    assert.equal(route?.parameterMethod, "protocol_mva");
    assert.equal(route?.mvaOriginalBps, 7_178);
  }
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

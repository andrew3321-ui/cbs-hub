import assert from "node:assert/strict";
import test from "node:test";

import {
  hashStAutoPartsHighUseCorridors,
  stAutoPartsHighUseCorridorMetrics,
  stAutoPartsHighUseRouteByKey,
  stAutoPartsHighUseRoutes,
  stAutoPartsHighUseSources,
  validateStAutoPartsHighUseCorridors,
} from "../domain/st-auto-parts-high-use-corridors.ts";

test("V66 audits twelve priority corridors as twenty-four independent directions", () => {
  assert.deepEqual(validateStAutoPartsHighUseCorridors(), { passed: true, errors: [] });
  assert.deepEqual(stAutoPartsHighUseCorridorMetrics(), {
    corridors: 12,
    directedRoutes: 24,
    activeAgreementRoutes: 10,
    outsideProtocolRoutes: 14,
    protocolMvaRoutes: 5,
    destinationMvaRoutes: 5,
    syntheticReferencesReproduced: 4,
    safelyBlocked: 20,
    scheduledLegalReviews: 7,
    officialSources: 10,
  });
  assert.equal(new Set(stAutoPartsHighUseRoutes.map((route) => route.route)).size, 24);
  assert.equal(stAutoPartsHighUseRoutes.every((route) => route.directionalSymmetryAssumed === false), true);
});

test("only the ten directions between current protocol parties are active", () => {
  assert.deepEqual(
    stAutoPartsHighUseRoutes.filter((route) => route.agreementStatus === "protocol_41_active").map((route) => route.route),
    ["SP-MG", "MG-SP", "SP-RJ", "RJ-SP", "SP-PR", "PR-SP", "SP-BA", "BA-SP", "MG-RJ", "RJ-MG"],
  );
  for (const key of ["SP-SC", "SC-SP", "SP-RS", "RS-SP", "SP-GO", "GO-SP", "PR-SC", "SC-PR", "SC-RS", "RS-SC", "BA-PE", "PE-BA", "GO-DF", "DF-GO"]) {
    const route = stAutoPartsHighUseRouteByKey.get(key);
    assert.equal(route?.agreementStatus, "outside_protocol_41");
    assert.equal(route?.mvaOriginalBps, null);
    assert.equal(route?.syntheticReference, null);
    assert.equal(route?.calculationStatus, "blocked_protocol_not_applicable");
  }
});

test("the destination controls which MVA source each active direction uses", () => {
  for (const key of ["MG-SP", "RJ-SP", "PR-SP", "BA-SP", "SP-PR"]) {
    assert.equal(stAutoPartsHighUseRouteByKey.get(key)?.parameterMethod, "destination_internal_mva");
    assert.equal(stAutoPartsHighUseRouteByKey.get(key)?.mvaOriginalBps, null);
  }
  for (const key of ["SP-MG", "SP-RJ", "SP-BA", "MG-RJ", "RJ-MG"]) {
    assert.equal(stAutoPartsHighUseRouteByKey.get(key)?.parameterMethod, "protocol_mva");
    assert.equal(stAutoPartsHighUseRouteByKey.get(key)?.mvaOriginalBps, 7_178);
  }
});

test("four MG and RJ synthetic references reproduce every cent", () => {
  for (const key of ["SP-MG", "RJ-MG"]) {
    const reference = stAutoPartsHighUseRouteByKey.get(key)?.syntheticReference;
    assert.equal(reference?.mvaAppliedBps, 8_435);
    assert.equal(reference?.destinationTotalCents, 21_183);
  }
  for (const key of ["SP-RJ", "MG-RJ"]) {
    const reference = stAutoPartsHighUseRouteByKey.get(key)?.syntheticReference;
    assert.equal(reference?.mvaAppliedBps, 8_896);
    assert.equal(reference?.destinationTotalCents, 29_571);
  }
  assert.equal(stAutoPartsHighUseRoutes.filter((route) => route.syntheticReference !== null).length, 4);
});

test("every destination-SP direction carries the October 2026 legal transition", () => {
  const destinationSp = stAutoPartsHighUseRoutes.filter((route) => route.destination === "SP");
  assert.equal(destinationSp.length, 7);
  assert.equal(destinationSp.every((route) => route.scheduledReview?.effectiveFrom === "2026-10-01"), true);
  assert.equal(stAutoPartsHighUseRoutes.filter((route) => route.destination !== "SP").every((route) => route.scheduledReview === null), true);
});

test("the directional ledger is backed by official HTTPS sources and a stable hash", async () => {
  assert.equal(stAutoPartsHighUseSources.every((source) => source.url.startsWith("https://") && source.proves.length > 0), true);
  const fingerprint = await hashStAutoPartsHighUseCorridors();
  assert.match(fingerprint, /^[0-9a-f]{64}$/);
  assert.equal(fingerprint, await hashStAutoPartsHighUseCorridors());
});

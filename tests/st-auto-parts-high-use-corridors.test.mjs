import assert from "node:assert/strict";
import test from "node:test";

import {
  hashStAutoPartsHighUseCorridors,
  resolveAutoPartsPriorityOperation,
  stAutoPartsHighUseCorridorMetrics,
  stAutoPartsHighUseRouteByKey,
  stAutoPartsHighUseRoutes,
  stAutoPartsHighUseSources,
  validateStAutoPartsHighUseCorridors,
} from "../domain/st-auto-parts-high-use-corridors.ts";

test("V67 audits twelve priority corridors and closes ten temporal references", () => {
  assert.deepEqual(validateStAutoPartsHighUseCorridors(), { passed: true, errors: [] });
  assert.deepEqual(stAutoPartsHighUseCorridorMetrics(), {
    corridors: 12,
    directedRoutes: 24,
    activeAgreementRoutes: 10,
    outsideProtocolRoutes: 14,
    protocolMvaRoutes: 5,
    destinationMvaRoutes: 5,
    syntheticReferencesReproduced: 10,
    safelyBlocked: 14,
    scheduledLegalReviews: 7,
    officialSources: 16,
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
    assert.equal(typeof stAutoPartsHighUseRouteByKey.get(key)?.mvaOriginalBps, "number");
  }
  for (const key of ["SP-MG", "SP-RJ", "SP-BA", "MG-RJ", "RJ-MG"]) {
    assert.equal(stAutoPartsHighUseRouteByKey.get(key)?.parameterMethod, "protocol_mva");
    assert.equal(stAutoPartsHighUseRouteByKey.get(key)?.mvaOriginalBps, 7_178);
  }
});

test("all ten active directions reproduce their controlled synthetic memories", () => {
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
  const additions = { "MG-SP": 21_255, "RJ-SP": 21_255, "SP-PR": 24_617, "PR-SP": 21_255, "SP-BA": 34_195, "BA-SP": 21_255 };
  for (const [key, expected] of Object.entries(additions)) assert.equal(stAutoPartsHighUseRouteByKey.get(key)?.syntheticReference?.destinationTotalCents, expected);
  assert.equal(stAutoPartsHighUseRoutes.filter((route) => route.syntheticReference !== null).length, 10);
});

const confirmedFacts = { productIdentityConfirmed: true, automotiveUseConfirmed: true, destinationInternalStConfirmed: true, taxpayerRolesConfirmed: true, noSpecialTreatmentConfirmed: true, priceBasisConfirmed: true, noSpecificRateExceptionConfirmed: true, documentsConfirmed: true };
const completeInput = { route: "MG-SP", operationDate: "2026-09-30", operationCents: 100_000, ownIcmsBaseCents: 100_000, cest: "01.075.00", ncm: "8708", importedQualified: false, commercialCondition: "standard", facts: confirmedFacts };

test("the temporal engine calculates before and stops after the São Paulo exclusion", () => {
  const before = resolveAutoPartsPriorityOperation(completeInput);
  assert.equal(before.status, "calculated_reference");
  assert.equal(before.output?.destinationTotalCents, 21_255);
  const after = resolveAutoPartsPriorityOperation({ ...completeInput, operationDate: "2026-10-01" });
  assert.equal(after.status, "st_not_applicable_after_state_exclusion");
  assert.equal(after.output, null);
  assert.equal(after.parameters, null);
});

test("missing facts, unknown products and outside routes fail closed without values", () => {
  const missing = resolveAutoPartsPriorityOperation({ ...completeInput, facts: { ...confirmedFacts, documentsConfirmed: false } });
  assert.equal(missing.status, "blocked");
  assert.equal(missing.output, null);
  assert.equal(missing.missingFacts.length, 1);
  assert.equal(resolveAutoPartsPriorityOperation({ ...completeInput, ncm: "8707" }).output, null);
  assert.equal(resolveAutoPartsPriorityOperation({ ...completeInput, route: "SP-SC" }).output, null);
  assert.equal(resolveAutoPartsPriorityOperation({ ...completeInput, operationDate: "" }).output, null);
});

test("fidelity and qualified import paths use explicit deterministic parameters", () => {
  const fidelity = resolveAutoPartsPriorityOperation({ ...completeInput, route: "SP-PR", commercialCondition: "fidelity" });
  assert.equal(fidelity.parameters?.mvaOriginalBps, 3_656);
  assert.equal(fidelity.output?.mvaAppliedBps, 4_928);
  assert.equal(fidelity.output?.destinationTotalCents, 17_110);
  const bahiaFidelity = resolveAutoPartsPriorityOperation({ ...completeInput, route: "SP-BA", commercialCondition: "fidelity" });
  assert.equal(bahiaFidelity.output?.mvaAppliedBps, 5_975);
  assert.equal(bahiaFidelity.output?.destinationTotalCents, 25_749);
  const saoPauloFidelity = resolveAutoPartsPriorityOperation({ ...completeInput, route: "BA-SP", commercialCondition: "fidelity" });
  assert.equal(saoPauloFidelity.output?.mvaAppliedBps, 5_796);
  assert.equal(saoPauloFidelity.output?.destinationTotalCents, 16_433);
  const imported = resolveAutoPartsPriorityOperation({ ...completeInput, route: "SP-BA", importedQualified: true });
  assert.equal(imported.parameters?.interstateRateBps, 400);
  assert.equal(imported.output?.destinationTotalCents, 38_523);
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

import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateRepresentativeStMemory,
  hashStSpMgLegalCatalog,
  stSpMgLegalMetrics,
  stSpMgLegalPackages,
  ST_GENERAL_MANDATORY_FACTS,
  validateStSpMgLegalCatalog,
} from "../domain/st-sp-mg-legal.ts";

test("V58 structures the 25 SP to MG ST legal gates without inventing final values", () => {
  const validation = validateStSpMgLegalCatalog();
  const metrics = stSpMgLegalMetrics();
  assert.deepEqual(validation.errors, []);
  assert.equal(validation.passed, true);
  assert.equal(stSpMgLegalPackages.length, 25);
  assert.equal(metrics.legalGatesStructured, 25);
  assert.equal(metrics.calculationsValidated, 3);
  assert.equal(metrics.calculationsBlocked, 22);
  assert.equal(stSpMgLegalPackages.every((item) => item.route === "SP-MG"), true);
  assert.equal(stSpMgLegalPackages.every((item) => item.mandatoryFacts.length === ST_GENERAL_MANDATORY_FACTS.length), true);
});

test("only a complete sourced representative rule can be marked calculation validated", () => {
  const validated = stSpMgLegalPackages.filter((item) => item.legalStatus === "calculation_validated");
  assert.deepEqual(validated.map((item) => item.segmentCode), ["AUTO_PARTS", "CEMENT", "PET_FOOD"]);
  assert.equal(validated[0].representativeRule?.cest, "01.075.00");
  assert.equal(validated[0].representativeRule?.ncm, "8708");
  assert.equal(validated[0].representativeRule?.mvaOriginalBps, 7_178);
  assert.deepEqual(validated.slice(1).map((item) => ({ code: item.segmentCode, cest: item.representativeRule?.cest, ncm: item.representativeRule?.ncm, mva: item.representativeRule?.mvaOriginalBps })), [
    { code: "CEMENT", cest: "05.001.00", ncm: "2523", mva: 2_000 },
    { code: "PET_FOOD", cest: "22.001.00", ncm: "2309", mva: 5_555 },
  ]);
  assert.equal(stSpMgLegalPackages.filter((item) => item.legalStatus !== "calculation_validated").every((item) => item.representativeRule === null), true);
});

test("cement and pet food reproduce final arithmetic for an explicit controlled operation", () => {
  const shared = { operationCents: 100_000, ownIcmsBaseCents: 100_000, interstateRateBps: 1_200, internalRateBps: 1_800, fcpRateBps: 0, adjustMva: true };
  assert.deepEqual(calculateRepresentativeStMemory({ ...shared, mvaOriginalBps: 2_000 }), {
    mvaAppliedBps: 2_878, stBaseCents: 128_780, ownIcmsCents: 12_000, presumedInternalIcmsCents: 23_180, icmsStCents: 11_180, fcpCents: 0, destinationTotalCents: 11_180,
  });
  assert.deepEqual(calculateRepresentativeStMemory({ ...shared, mvaOriginalBps: 5_555 }), {
    mvaAppliedBps: 6_693, stBaseCents: 166_930, ownIcmsCents: 12_000, presumedInternalIcmsCents: 30_047, icmsStCents: 18_047, fcpCents: 0, destinationTotalCents: 18_047,
  });
});

test("SP to MG ST legal catalog has a deterministic tamper-evident fingerprint", async () => {
  const first = await hashStSpMgLegalCatalog();
  const replay = await hashStSpMgLegalCatalog();
  assert.equal(first, replay);
  assert.match(first, /^[0-9a-f]{64}$/);
});

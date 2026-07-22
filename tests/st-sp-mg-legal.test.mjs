import assert from "node:assert/strict";
import test from "node:test";

import {
  hashStSpMgLegalCatalog,
  stSpMgLegalMetrics,
  stSpMgLegalPackages,
  ST_GENERAL_MANDATORY_FACTS,
  validateStSpMgLegalCatalog,
} from "../domain/st-sp-mg-legal.ts";

test("V57 structures the 25 SP to MG ST legal gates without inventing final values", () => {
  const validation = validateStSpMgLegalCatalog();
  const metrics = stSpMgLegalMetrics();
  assert.deepEqual(validation.errors, []);
  assert.equal(validation.passed, true);
  assert.equal(stSpMgLegalPackages.length, 25);
  assert.equal(metrics.legalGatesStructured, 25);
  assert.equal(metrics.calculationsValidated, 1);
  assert.equal(metrics.calculationsBlocked, 24);
  assert.equal(stSpMgLegalPackages.every((item) => item.route === "SP-MG"), true);
  assert.equal(stSpMgLegalPackages.every((item) => item.mandatoryFacts.length === ST_GENERAL_MANDATORY_FACTS.length), true);
});

test("only a complete sourced representative rule can be marked calculation validated", () => {
  const validated = stSpMgLegalPackages.filter((item) => item.legalStatus === "calculation_validated");
  assert.deepEqual(validated.map((item) => item.segmentCode), ["AUTO_PARTS"]);
  assert.equal(validated[0].representativeRule?.cest, "01.075.00");
  assert.equal(validated[0].representativeRule?.ncm, "8708");
  assert.equal(validated[0].representativeRule?.mvaOriginalBps, 7_178);
  assert.equal(stSpMgLegalPackages.filter((item) => item.legalStatus !== "calculation_validated").every((item) => item.representativeRule === null), true);
});

test("SP to MG ST legal catalog has a deterministic tamper-evident fingerprint", async () => {
  const first = await hashStSpMgLegalCatalog();
  const replay = await hashStSpMgLegalCatalog();
  assert.equal(first, replay);
  assert.match(first, /^[0-9a-f]{64}$/);
});

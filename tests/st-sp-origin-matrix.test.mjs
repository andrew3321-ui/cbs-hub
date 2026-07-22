import assert from "node:assert/strict";
import test from "node:test";

import { hashStSpOriginMatrix, stSpOriginCells, stSpOriginDestinations, stSpOriginMandatoryFacts, stSpOriginMatrixMetrics, validateStSpOriginMatrix } from "../domain/st-sp-origin-matrix.ts";

test("V59 structures every outgoing SP route across all 25 ST segments", () => {
  const validation = validateStSpOriginMatrix();
  const metrics = stSpOriginMatrixMetrics();
  assert.deepEqual(validation.errors, []);
  assert.equal(validation.passed, true);
  assert.equal(stSpOriginDestinations.length, 26);
  assert.equal(stSpOriginCells.length, 650);
  assert.equal(new Set(stSpOriginCells.map((cell) => cell.key)).size, 650);
  assert.equal(metrics.segments, 25);
  assert.equal(metrics.structuredCells, 650);
  assert.equal(metrics.mandatoryFacts, 18);
  assert.equal(stSpOriginMandatoryFacts.length, 18);
});

test("new routes fail closed while preserving only the three existing MG references", () => {
  const existing = stSpOriginCells.filter((cell) => cell.status === "existing_validated_reference");
  assert.deepEqual(existing.map((cell) => cell.key), ["SP-MG:AUTO_PARTS", "SP-MG:CEMENT", "SP-MG:PET_FOOD"]);
  assert.equal(stSpOriginCells.filter((cell) => cell.status === "structured_blocked").length, 647);
  assert.equal(stSpOriginCells.filter((cell) => cell.destination !== "MG").every((cell) => cell.status === "structured_blocked"), true);
});

test("every cell carries official destination routing, evidence and blockers", () => {
  const portals = new Map(stSpOriginDestinations.map((destination) => [destination.uf, destination.officialPortal]));
  assert.equal([...portals.values()].every((url) => url.startsWith("https://")), true);
  assert.equal(stSpOriginCells.every((cell) => cell.destinationSourceCode === `SEFAZ-${cell.destination}` && cell.requiredEvidence.length === 7 && cell.blockers.length > 0), true);
});

test("SP origin matrix fingerprint is stable", async () => {
  const first = await hashStSpOriginMatrix();
  assert.equal(first, await hashStSpOriginMatrix());
  assert.match(first, /^[0-9a-f]{64}$/);
});

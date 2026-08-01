import assert from "node:assert/strict";
import test from "node:test";
import {
  ICMS_OPERATION_BOOKS,
  hashIcmsOwnDifalFcpExpansion,
  icmsOwnDifalFcpExpansionMetrics,
  icmsOwnDifalFcpMatrix,
  icmsOwnDifalFcpReferenceCases,
  icmsOwnDifalFcpStateInventory,
  resolveIcmsOwnDifalFcpExpansion,
  validateIcmsOwnDifalFcpExpansion,
} from "../domain/icms-own-difal-fcp-expansion.ts";

test("structures 27 UFs, six operations and three validity periods", () => {
  assert.equal(icmsOwnDifalFcpStateInventory.length, 27);
  assert.equal(new Set(icmsOwnDifalFcpStateInventory.map((item) => item.uf)).size, 27);
  assert.equal(icmsOwnDifalFcpMatrix.length, 27 * 6 * 3);
  assert.ok(icmsOwnDifalFcpStateInventory.every((item) => item.modalSourceCode && item.legalDevice && item.effectiveFrom));
  assert.ok(icmsOwnDifalFcpStateInventory.every((item) => item.distinction.productSpecificRate.includes("não inferida")));
});

test("keeps own ICMS, DIFAL, FCP and return reversal in separate books", () => {
  assert.deepEqual(ICMS_OPERATION_BOOKS.map((item) => item.code), ["own_icms", "difal", "fcp", "return_reversal"]);
  const referenceCase = icmsOwnDifalFcpReferenceCases.find((item) => item.code === "RJ-14-RETURN");
  assert.ok(referenceCase);
  const result = resolveIcmsOwnDifalFcpExpansion(referenceCase.input);
  assert.equal(result.status, "calculated_return_reversal");
  assert.deepEqual(result.ledgers.map((item) => item.book), ["return_reversal", "difal", "fcp"]);
  assert.ok(result.ledgers.every((item) => item.direction === "reversal"));
  assert.deepEqual(result.ledgers.map((item) => item.amountCents), [12_000, 6_000, 2_000]);
});

test("does not recalculate returns without the original fiscal document", () => {
  const referenceCase = icmsOwnDifalFcpReferenceCases.find((item) => item.code === "SP-15-RETURN-NO-DOC");
  assert.ok(referenceCase);
  const result = resolveIcmsOwnDifalFcpExpansion(referenceCase.input);
  assert.equal(result.status, "blocked");
  assert.equal(result.ledgers.length, 0);
  assert.ok(result.blockers.some((blocker) => blocker.includes("Documento fiscal original")));
});

test("executes 540 independent positive, negative and temporal cases without value leakage", async () => {
  assert.equal(icmsOwnDifalFcpReferenceCases.length, 540);
  assert.equal(new Set(icmsOwnDifalFcpReferenceCases.map((item) => item.code)).size, 540);
  for (const referenceCase of icmsOwnDifalFcpReferenceCases) {
    const result = resolveIcmsOwnDifalFcpExpansion(referenceCase.input);
    assert.equal(result.status, referenceCase.expectedStatus, referenceCase.code);
    if (!["calculated_reference", "calculated_return_reversal"].includes(result.status)) assert.equal(result.ledgers.length, 0, referenceCase.code);
  }
  assert.deepEqual(validateIcmsOwnDifalFcpExpansion(), { passed: true, errors: [] });
  assert.match(await hashIcmsOwnDifalFcpExpansion(), /^[0-9a-f]{64}$/);
});

test("publishes honest expansion metrics", () => {
  const metrics = icmsOwnDifalFcpExpansionMetrics();
  assert.equal(metrics.states, 27);
  assert.equal(metrics.matrixCells, 486);
  assert.equal(metrics.deterministicCases, 540);
  assert.equal(metrics.returnMemories, 27);
  assert.equal(metrics.leakedValues, 0);
  assert.ok(metrics.calculatedMemories >= 80);
  assert.ok(metrics.safelyBlockedCases > 300);
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  ISS_RECURRING_PRIORITY_SOURCE,
  hashIssRecurringPriority,
  issRecurringPriorityCells,
  issRecurringPriorityItems,
  issRecurringPriorityMetrics,
  issRecurringPriorityMunicipalities,
  issRecurringPriorityReferenceCases,
  validateIssRecurringPriority,
} from "../domain/iss-recurring-priority.ts";

test("V89 audits twelve recurring services in fifteen priority municipalities", () => {
  assert.equal(issRecurringPriorityItems.length, 12);
  assert.equal(issRecurringPriorityMunicipalities.length, 15);
  assert.equal(issRecurringPriorityCells.length, 180);
  assert.equal(new Set(issRecurringPriorityCells.map((cell) => cell.code)).size, 180);
  assert.deepEqual(issRecurringPriorityMetrics(), {
    municipalities: 15,
    serviceItems: 12,
    auditedCells: 180,
    supportedCells: 0,
    partialCells: 180,
    notSupportedCells: 0,
    deterministicCases: 255,
    calculatedMemories: 0,
    safelyBlockedCases: 255,
  });
  assert.deepEqual(validateIssRecurringPriority(), { passed: true, errors: [] });
});

test("every cell preserves national incidence evidence but blocks unproved municipal outputs", () => {
  for (const cell of issRecurringPriorityCells) {
    assert.equal(cell.coverageStatus, "partial", cell.code);
    assert.equal(cell.calculationSupported, false, cell.code);
    assert.equal(cell.municipalClassifier.municipalItemCode, cell.lc116Item, cell.code);
    assert.equal(cell.municipalClassifier.subactivityCode, null, cell.code);
    assert.match(cell.municipalClassifier.evidenceReference, new RegExp(cell.lc116Item.replace(".", "\\.")), cell.code);
    assert.equal(cell.rate.bps, null, cell.code);
    assert.equal(cell.effectiveFrom, null, cell.code);
    assert.ok(cell.sourceCodes.includes(ISS_RECURRING_PRIORITY_SOURCE.code), cell.code);
    assert.ok(cell.sourceCodes.length >= 2, cell.code);
    assert.ok(cell.incidence.reference.includes(cell.lc116Item), cell.code);
    assert.ok(cell.blockers.includes("subatividade e código municipal exatos"), cell.code);
  }
});

test("the matrix carries explicit negative coverage for service, municipality, recipient, retention and date", () => {
  assert.equal(issRecurringPriorityReferenceCases.length, 255);
  assert.equal(new Set(issRecurringPriorityReferenceCases.map((reference) => reference.code)).size, 255);
  assert.deepEqual(
    new Set(issRecurringPriorityReferenceCases.map((reference) => reference.kind)),
    new Set(["catalog_baseline", "service_mismatch", "municipality_mismatch", "recipient_mismatch", "withholding_unknown", "date_missing"]),
  );
  assert.ok(issRecurringPriorityReferenceCases.every((reference) => reference.blockers.length >= 1));
  assert.ok(issRecurringPriorityReferenceCases.every((reference) => ["blocked", "not_supported"].includes(reference.expectedStatus)));
});

test("the catalog fingerprint is stable and source is official HTTPS", async () => {
  assert.equal(await hashIssRecurringPriority(), await hashIssRecurringPriority());
  assert.match(await hashIssRecurringPriority(), /^[a-f0-9]{64}$/);
  assert.match(ISS_RECURRING_PRIORITY_SOURCE.url, /^https:\/\/www\.planalto\.gov\.br\//);
});

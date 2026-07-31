import assert from "node:assert/strict";
import test from "node:test";

import {
  hashStColdBeveragePriorityAudit,
  stColdBeveragePriorityAuditCases,
  stColdBeveragePriorityAuditCells,
  stColdBeveragePriorityAuditMetrics,
  ST_COLD_BEVERAGES_AUDIT_MUTATIONS,
  validateStColdBeveragePriorityAudit,
} from "../domain/st-cold-beverages-priority-audit.ts";

test("V91 audits 96 product-route cells across the eight priority corridors", () => {
  assert.deepEqual(validateStColdBeveragePriorityAudit(), { passed: true, errors: [] });
  assert.deepEqual(stColdBeveragePriorityAuditMetrics(), { corridors: 8, directedRoutes: 16, products: 6, cells: 96, supported: 53, notSupported: 43, deterministicCases: 414, negativeGates: 361 });
  assert.equal(new Set(stColdBeveragePriorityAuditCells.map((cell) => cell.key)).size, 96);
});

test("supported cells require exact profiles and unsupported cells identify their blocker", () => {
  assert.equal(stColdBeveragePriorityAuditCells.filter((cell) => cell.status === "supported").every((cell) => cell.exactProfileCount > 0 && cell.sourceModule && cell.blocker === null), true);
  assert.equal(stColdBeveragePriorityAuditCells.filter((cell) => cell.status === "not_supported").every((cell) => cell.exactProfileCount === 0 && cell.blocker), true);
});

test("every supported cell carries all six fail-closed mutations", () => {
  for (const cell of stColdBeveragePriorityAuditCells.filter((item) => item.status === "supported")) {
    const kinds = new Set(stColdBeveragePriorityAuditCases.filter((item) => item.cellKey === cell.key).map((item) => item.kind));
    for (const mutation of ST_COLD_BEVERAGES_AUDIT_MUTATIONS) assert.equal(kinds.has(mutation), true, `${cell.key}:${mutation}`);
  }
  assert.equal(stColdBeveragePriorityAuditCases.every((item) => item.emittedValue === false), true);
});

test("priority audit hash is stable", async () => {
  const hash = await hashStColdBeveragePriorityAudit();
  assert.match(hash, /^[0-9a-f]{64}$/);
  assert.equal(await hashStColdBeveragePriorityAudit(), hash);
});

import assert from "node:assert/strict";
import test from "node:test";

import {
  FISCAL_REGRESSION_CASE_TARGET,
  executeExpandedFiscalRegressionCase,
  expandedFiscalRegressionCases,
  fiscalRegressionExpansionMetrics,
  hashFiscalRegressionExpansion,
  validateFiscalRegressionExpansion,
} from "../domain/fiscal-regression-expansion.ts";

test("V86 doubles every existing ST matrix cell with a controlled safety mutation", () => {
  const metrics = fiscalRegressionExpansionMetrics();
  assert.equal(expandedFiscalRegressionCases.length, 1_300);
  assert.equal(metrics.baselineCases, 650);
  assert.equal(metrics.safetyMutationCases, 650);
  assert.equal(metrics.deterministicCases, metrics.calculatedMemories + metrics.safelyBlockedCases);
  assert.equal(FISCAL_REGRESSION_CASE_TARGET, 2_000);
});

test("positive cases exist only for supported memories and reproduce exact cents", () => {
  const positive = expandedFiscalRegressionCases.filter((item) => item.kind === "positive");
  assert.ok(positive.length > 0);
  assert.ok(positive.every((item) => item.maturity === "supported" && item.expected.output !== null));
  for (const regressionCase of positive) {
    assert.deepEqual(executeExpandedFiscalRegressionCase(regressionCase), regressionCase.expected);
    assert.ok(Object.values(regressionCase.expected.output).every(Number.isSafeInteger));
  }
});

test("partial and unsupported cases never leak a final calculation", () => {
  const mutated = expandedFiscalRegressionCases.filter((item) => item.input.mutation !== null);
  assert.equal(mutated.length, 650);
  for (const regressionCase of mutated) {
    const actual = executeExpandedFiscalRegressionCase(regressionCase);
    assert.equal(actual.output, null);
    assert.match(actual.status, /^blocked_/);
    assert.ok(actual.blockers.length > 0);
  }
});

test("distribution covers every segment, route, maturity and required mutation", () => {
  const metrics = fiscalRegressionExpansionMetrics();
  assert.equal(Object.keys(metrics.segmentCounts).length, 25);
  assert.equal(Object.keys(metrics.routeCounts).length, 26);
  assert.ok(metrics.maturity.supported > 0);
  assert.ok(metrics.maturity.partial > 0);
  assert.ok(metrics.maturity.notSupported > 0);
  assert.deepEqual(metrics.mutations, {
    missingProductIdentity: 163,
    staleValidity: 163,
    unqualifiedImport: 162,
    unresolvedException: 162,
  });
});

test("every case links rule, official source, version and reference date", () => {
  assert.ok(expandedFiscalRegressionCases.every((item) => (
    item.ruleCode === "ST_SP_CALCULATION_RUNS"
    && item.ruleVersion.length > 10
    && /^\d{4}-\d{2}-\d{2}$/.test(item.referenceDate)
    && item.sourceReferences.length >= 3
    && item.sourceReferences.every((source) => source.code && source.checkedAt && source.url.startsWith("https://"))
  )));
});

test("expanded suite validation and evidence fingerprint are deterministic", async () => {
  const validation = validateFiscalRegressionExpansion();
  assert.equal(validation.passed, true, validation.errors.slice(0, 5).join(","));
  const first = await hashFiscalRegressionExpansion();
  const second = await hashFiscalRegressionExpansion();
  assert.equal(first, second);
  assert.match(first, /^[a-f0-9]{64}$/);
});

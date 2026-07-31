import assert from "node:assert/strict";
import test from "node:test";
import {
  applyExpansionProgress,
  expansionMetrics,
  expansionQueue,
  expansionTargets,
  fiscalExpansionBacklog,
  nextExpansionStage,
} from "../domain/fiscal-expansion.ts";
import { cityCoverage, coverageSources, recurringScenarios, stateCoverage, stSegments } from "../domain/national-tax-coverage.ts";
import { fiscalAutomaticAssuranceCapacity } from "../domain/fiscal-automatic-assurance.ts";

test("V79 preserves a deterministic national backlog without overstating coverage", () => {
  const byScope = (scope) => fiscalExpansionBacklog.filter((item) => item.scope === scope);
  assert.equal(byScope("icms").length, 27);
  assert.equal(byScope("iss").length, 50);
  assert.equal(byScope("st").length, 25);
  assert.equal(byScope("federal").length, recurringScenarios.length);
  assert.equal(byScope("sources").length, coverageSources.length + stateCoverage.length);
  assert.equal(fiscalExpansionBacklog.length, stateCoverage.length + cityCoverage.length + stSegments.length + recurringScenarios.length + coverageSources.length + stateCoverage.length);
  assert.ok(fiscalExpansionBacklog.every((item) => item.blockers.length && item.gates.length));
  assert.ok(fiscalExpansionBacklog.every((item) => item.supportStatus !== "supported"));
});

test("ordinary pipeline ends in server-side automatic verification", () => {
  assert.equal(nextExpansionStage("catalogued"), "source_connected");
  assert.equal(nextExpansionStage("source_connected"), "structured");
  assert.equal(nextExpansionStage("structured"), "tested");
  assert.equal(nextExpansionStage("tested"), "automatically_verified");
  assert.equal(nextExpansionStage("automatically_verified"), null);
  assert.equal(nextExpansionStage("blocked"), null);
});

test("monthly metrics expose actual gaps instead of converting targets into achievements", () => {
  const metrics = expansionMetrics(fiscalExpansionBacklog);
  assert.equal(metrics.actual.icmsBundles, 27);
  assert.equal(metrics.actual.issDeepCities, 50);
  assert.equal(metrics.actual.stRouteBundles, 25);
  assert.equal(metrics.actual.officialSources, coverageSources.length + stateCoverage.length);
  assert.equal(metrics.actual.testedBundles, fiscalAutomaticAssuranceCapacity().testPacks);
  assert.equal(metrics.actual.automaticTests, fiscalAutomaticAssuranceCapacity().automaticallyVerified);
  assert.equal(metrics.gaps.officialSources, expansionTargets.officialSources - metrics.actual.officialSources);
  assert.equal(metrics.gaps.automaticTests, expansionTargets.automaticTests - metrics.actual.automaticTests);
  assert.ok(metrics.progressPercent > 0 && metrics.progressPercent < 100);
});

test("progress overrides remain auditable and priority queue is stable", () => {
  const base = fiscalExpansionBacklog.find((item) => item.code === "ISS-3550308");
  assert.ok(base);
  const progressed = applyExpansionProgress(fiscalExpansionBacklog, [{ itemCode: base.code, stage: "structured", evidenceNote: "Lei municipal catalogada e fatos mínimos descritos.", evidenceReference: "RULE-ISS-SP-001", evidenceHash: "abc", updatedAt: "2026-07-17T12:00:00.000Z", updatedByUserId: 1 }]);
  assert.equal(progressed.find((item) => item.code === base.code)?.stage, "structured");
  const first = expansionQueue(progressed, 30).map((item) => item.code);
  const second = expansionQueue(progressed, 30).map((item) => item.code);
  assert.deepEqual(first, second);
  assert.ok(first.length > 0);
});

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

test("V52 creates a deterministic national backlog without overstating coverage", () => {
  const byScope = (scope) => fiscalExpansionBacklog.filter((item) => item.scope === scope);
  assert.equal(byScope("icms").length, 27);
  assert.equal(byScope("iss").length, 50);
  assert.equal(byScope("st").length, 8);
  assert.equal(byScope("federal").length, 7);
  assert.equal(byScope("sources").length, 65);
  assert.equal(fiscalExpansionBacklog.length, 157);
  assert.ok(fiscalExpansionBacklog.every((item) => item.blockers.length && item.gates.length));
  assert.ok(fiscalExpansionBacklog.every((item) => item.supportStatus !== "supported"));
});

test("ordinary pipeline ends at the professional gate and never auto-homologates", () => {
  assert.equal(nextExpansionStage("catalogued"), "source_connected");
  assert.equal(nextExpansionStage("source_connected"), "structured");
  assert.equal(nextExpansionStage("structured"), "tested");
  assert.equal(nextExpansionStage("tested"), "awaiting_professional");
  assert.equal(nextExpansionStage("awaiting_professional"), null);
  assert.equal(nextExpansionStage("homologated"), null);
  assert.equal(nextExpansionStage("blocked"), null);
});

test("monthly metrics expose actual gaps instead of converting targets into achievements", () => {
  const metrics = expansionMetrics(fiscalExpansionBacklog);
  assert.equal(metrics.actual.icmsBundles, 27);
  assert.equal(metrics.actual.issDeepCities, 15);
  assert.equal(metrics.actual.stRouteBundles, 1);
  assert.equal(metrics.actual.officialSources, 65);
  assert.equal(metrics.actual.testedBundles, 0);
  assert.equal(metrics.actual.professionalApprovals, 0);
  assert.equal(metrics.gaps.officialSources, expansionTargets.officialSources - 65);
  assert.equal(metrics.gaps.testedBundles, expansionTargets.testedBundles);
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

import assert from "node:assert/strict";
import test from "node:test";

import { hashRtc2027Readiness, reconcileRtcOfficialCalculator2027, resolveRtc2027Readiness, rtc2027ActInventory, rtc2027ReadinessCases, rtc2027ReadinessMetrics, rtc2027Sources, rtcOfficialCalculator2027Snapshot, rtcTransitionTimeline, TAX_REFORM_2027_READINESS_VERSION, validateRtc2027Readiness } from "../domain/tax-reform-2027-readiness.ts";

test("V107 inventories confirmed and pending official acts without anticipating the CBS rate", () => {
  assert.equal(TAX_REFORM_2027_READINESS_VERSION, "2026.08.01-v107");
  assert.equal(rtc2027ActInventory.filter((item) => item.status === "pending_official_act").length, 4);
  assert.ok(rtc2027ActInventory.some((item) => item.code === "CBS_2027_REFERENCE_RATE" && item.status === "pending_official_act"));
  assert.ok(rtc2027Sources.every((source) => source.url.startsWith("https://")));
});

test("transition timeline preserves every year from 2026 through 2033", () => {
  assert.deepEqual(rtcTransitionTimeline.map((item) => item.year), [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033]);
  assert.equal(rtcTransitionTimeline.find((item) => item.year === 2027).ibs, "10_bps_split_equally");
  assert.equal(rtcTransitionTimeline.find((item) => item.year === 2027).ipi, "zero_except_zfm");
});

test("official calculator beta fixture matches exact versions and cents but releases no legal conclusion", () => {
  const matched = reconcileRtcOfficialCalculator2027({ appVersion: rtcOfficialCalculator2027Snapshot.appVersion, databaseVersion: rtcOfficialCalculator2027Snapshot.databaseVersion, ...rtcOfficialCalculator2027Snapshot.response });
  assert.deepEqual(matched, { status: "matched_beta_fixture", differences: [], legalConclusionReleased: false });
  assert.equal(reconcileRtcOfficialCalculator2027({ appVersion: "changed", databaseVersion: rtcOfficialCalculator2027Snapshot.databaseVersion, ...rtcOfficialCalculator2027Snapshot.response }).status, "blocked_divergence");
});

test("all readiness gaps block safely and never generate payable tax", () => {
  assert.equal(rtc2027ReadinessCases.length, 264);
  assert.equal(new Set(rtc2027ReadinessCases.map((item) => item.code)).size, 264);
  for (const item of rtc2027ReadinessCases) {
    const result = resolveRtc2027Readiness(item.input);
    assert.equal(result.status, item.expectedStatus, item.code);
    assert.equal(result.fiscalConclusionReleased, false, item.code);
    assert.equal(result.netPayableCents, null, item.code);
  }
});

test("metrics, validation and fingerprint are reproducible", async () => {
  assert.deepEqual(rtc2027ReadinessMetrics(), { profiles: 12, acts: 12, confirmedActs: 7, pendingActs: 4, deterministicCases: 264, controlledReadinessCases: 24, calculatedMemories: 24, safelyBlockedCases: 240, calculatorFixtures: 1, fiscalConclusionsReleased: 0 });
  assert.deepEqual(validateRtc2027Readiness(), { passed: true, errors: [] });
  const first = await hashRtc2027Readiness();
  assert.match(first, /^[a-f0-9]{64}$/);
  assert.equal(await hashRtc2027Readiness(), first);
});

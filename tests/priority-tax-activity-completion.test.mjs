import assert from "node:assert/strict";
import test from "node:test";

import {
  ST_AUTO_PARTS_OPERATION_FACT_LABELS,
  stAutoPartsHighUseRoutes,
  stAutoPartsHighUseSources,
} from "../domain/st-auto-parts-high-use-corridors.ts";
import {
  ST_COLD_BEVERAGES_SP_FACT_LABELS,
  stColdBeverageSpReferenceRuns,
  stColdBeverageSpSources,
} from "../domain/st-cold-beverages-sp-destination.ts";
import {
  ST_COLD_BEVERAGES_SP_ORIGIN_FACT_LABELS,
  stColdBeverageSpOriginReferenceRuns,
  stColdBeverageSpOriginSources,
} from "../domain/st-cold-beverages-sp-origin.ts";
import {
  ST_COLD_BEVERAGES_SC_FACT_LABELS,
  stColdBeverageScReferenceRuns,
  stColdBeverageScNegativeRuns,
  stColdBeverageScSources,
} from "../domain/st-cold-beverages-sc-destination.ts";

function assertOfficialEvidence(sources) {
  assert.equal(sources.length > 0, true);
  for (const source of sources) {
    assert.match(source.url, /^https:\/\//);
    assert.match(source.checkedAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(source.proves.length > 0, true);
  }
}

test("P0 exact auto-parts scope has nine explicit facts and ten reproducible route memories", () => {
  assert.equal(Object.keys(ST_AUTO_PARTS_OPERATION_FACT_LABELS).length, 9);
  assert.match(ST_AUTO_PARTS_OPERATION_FACT_LABELS.taxpayerRolesConfirmed, /regimes/);
  assert.match(ST_AUTO_PARTS_OPERATION_FACT_LABELS.operationPurposeConfirmed, /revenda/);
  assert.match(ST_AUTO_PARTS_OPERATION_FACT_LABELS.operationPurposeConfirmed, /consumidor final/);
  assert.match(ST_AUTO_PARTS_OPERATION_FACT_LABELS.noSpecialTreatmentConfirmed, /benefícios/);

  const active = stAutoPartsHighUseRoutes.filter((route) => route.agreementStatus === "protocol_41_active");
  assert.equal(active.length, 10);
  assert.equal(active.every((route) =>
    route.mvaOriginalBps !== null
    && route.officialInternalRateBps !== null
    && route.officialFcpRateBps !== null
    && route.syntheticReference !== null
    && route.sourceCodes.length > 0), true);
  assertOfficialEvidence(stAutoPartsHighUseSources);
});

test("P0 exact beverage scope has explicit operation facts and 105 reproducible memories", () => {
  for (const labels of [ST_COLD_BEVERAGES_SP_FACT_LABELS, ST_COLD_BEVERAGES_SP_ORIGIN_FACT_LABELS]) {
    const combined = Object.values(labels).join(" ");
    assert.match(combined, /regime normal/);
    assert.match(combined, /revenda/);
    assert.match(combined, /consumidor final/);
    assert.match(combined, /benefício/);
    assert.match(combined, /redução/);
  }

  assert.equal(stColdBeverageSpReferenceRuns.length, 80);
  assert.equal(stColdBeverageSpOriginReferenceRuns.length, 10);
  assert.equal(stColdBeverageScReferenceRuns.length, 15);
  assert.equal(stColdBeverageScNegativeRuns.length, 30);
  for (const run of [...stColdBeverageSpReferenceRuns, ...stColdBeverageSpOriginReferenceRuns]) {
    assert.equal(run.status, "calculated_reference");
    assert.equal(run.output !== null, true);
    assert.equal(Number.isSafeInteger(run.output.destinationTotalCents), true);
  }
  assertOfficialEvidence(stColdBeverageSpSources);
  assertOfficialEvidence(stColdBeverageSpOriginSources);
  assert.equal(Object.keys(ST_COLD_BEVERAGES_SC_FACT_LABELS).length, 10);
  assertOfficialEvidence(stColdBeverageScSources);
});

test("P0 completion preserves fail-closed coverage outside the exact supported cells", () => {
  const blockedAutoParts = stAutoPartsHighUseRoutes.filter((route) => route.agreementStatus !== "protocol_41_active");
  assert.equal(blockedAutoParts.length, 14);
  assert.equal(blockedAutoParts.every((route) =>
    route.syntheticReference === null
    && route.calculationStatus.startsWith("blocked_")
    && route.remainingBlockers.length > 0), true);
});

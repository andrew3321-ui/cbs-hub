import assert from "node:assert/strict";
import test from "node:test";
import { buildScenarioSnapshot, hashScenarioInput, parseScenarioSnapshot, valuesFromSnapshot } from "../app/scenario-reliability.ts";

const storedInput = {
  revenueCents: 20_000_000,
  currentRateBps: 865,
  newRateBps: 1345,
  costRateBps: 5200,
  fixedCostsCents: 2_500_000,
  volumeLossBps: 500,
  priceAdjustmentBps: 800,
  targetYear: 2027,
  rateSource: "custom",
  sourceNote: "Memória de cálculo identificada pelo responsável.",
};

test("snapshot financeiro usa centavos e pontos-base serializáveis", () => {
  const snapshot = buildScenarioSnapshot(storedInput);
  const serialized = JSON.stringify(snapshot);
  const parsed = parseScenarioSnapshot(serialized);
  assert.ok(parsed);
  assert.equal(parsed.format, "cents-and-bps-v1");
  assert.ok(Number.isInteger(parsed.projectedMarginCents));
  assert.ok(!serialized.includes("Infinity"));
});

test("resultado congelado não muda quando uma entrada posterior muda", () => {
  const snapshot = buildScenarioSnapshot(storedInput);
  const frozen = valuesFromSnapshot(snapshot);
  const changed = buildScenarioSnapshot({ ...storedInput, newRateBps: 2500 });
  assert.notEqual(changed.projectedMarginCents, snapshot.projectedMarginCents);
  assert.equal(valuesFromSnapshot(snapshot).projectedMargin, frozen.projectedMargin);
});

test("hash é determinístico e cobre a proveniência", async () => {
  const first = await hashScenarioInput(storedInput);
  const same = await hashScenarioInput({ ...storedInput });
  const changedSource = await hashScenarioInput({ ...storedInput, sourceNote: "Outra memória de cálculo documentada." });
  assert.match(first, /^[0-9a-f]{64}$/);
  assert.equal(first, same);
  assert.notEqual(first, changedSource);
});

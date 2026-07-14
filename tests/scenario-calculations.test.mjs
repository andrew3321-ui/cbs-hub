import assert from "node:assert/strict";
import test from "node:test";
import { calculateScenarioValues } from "../app/scenario-calculations.ts";

const baseScenario = {
  revenue: 200_000,
  currentRate: 8.65,
  newRate: 13.45,
  costRate: 52,
  fixedCosts: 25_000,
  volumeLoss: 5,
  priceAdjustment: 8,
};

test("reajuste recomendado preserva o resultado mesmo com perda de volume", () => {
  const initial = calculateScenarioValues(baseScenario);
  const balanced = calculateScenarioValues({ ...baseScenario, priceAdjustment: initial.requiredPriceIncrease });
  assert.ok(initial.requiredPriceIncrease > 0);
  assert.ok(Math.abs(balanced.projectedMargin - balanced.currentMargin) < 0.01);
});

test("ponto de equilíbrio e margem de segurança usam a mesma base", () => {
  const values = calculateScenarioValues(baseScenario);
  const expectedSafety = (values.projectedRevenue - values.breakEvenRevenue) / values.projectedRevenue * 100;
  assert.ok(values.breakEvenRevenue > 0);
  assert.ok(Math.abs(values.marginOfSafetyRate - expectedSafety) < 0.0001);
});

test("impacto anual corresponde a doze resultados mensais", () => {
  const values = calculateScenarioValues(baseScenario);
  assert.ok(Math.abs(values.annualImpact - values.monthlyImpact * 12) < 0.0001);
});

test("sem mudança de premissas os resultados atual e projetado coincidem", () => {
  const values = calculateScenarioValues({ ...baseScenario, newRate: baseScenario.currentRate, priceAdjustment: 0, volumeLoss: 0 });
  assert.ok(Math.abs(values.projectedMargin - values.currentMargin) < 0.0001);
  assert.equal(values.requiredPriceIncrease, 0);
});

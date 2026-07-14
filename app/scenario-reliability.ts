import { calculateScenarioValues, type ScenarioInputs } from "./scenario-calculations.ts";

export const CALCULATION_ENGINE_VERSION = "mc-margin-1.0.0";
export const METHODOLOGY_VERSION = "rtc-foundation-2026.07";

export type RateSource = "custom" | "accountant" | "legacy_unverified";
export type ReviewStatus = "draft" | "ready_for_review";

export type ScenarioReliabilityInput = {
  revenueCents: number;
  currentRateBps: number;
  newRateBps: number;
  costRateBps: number;
  fixedCostsCents: number;
  volumeLossBps: number;
  priceAdjustmentBps: number;
  targetYear: number;
  rateSource: RateSource;
  sourceNote: string;
};

type ScenarioValues = ReturnType<typeof calculateScenarioValues>;

export type ScenarioSnapshot = {
  format: "cents-and-bps-v1";
  projectedRevenueCents: number;
  currentTaxCents: number;
  projectedTaxCents: number;
  currentMarginCents: number;
  projectedMarginCents: number;
  currentVariableCostsCents: number;
  projectedVariableCostsCents: number;
  deltaCents: number;
  breakEvenRevenueCents: number | null;
  monthlyImpactCents: number;
  annualImpactCents: number;
  volumeImpactRevenueCents: number;
  requiredPriceIncreaseBps: number;
  maxVolumeLossBps: number;
  marginOfSafetyBps: number;
  currentMarginRateBps: number;
  projectedMarginRateBps: number;
};

function cents(value: number) {
  return Math.round(value * 100);
}

function bps(value: number) {
  return Math.round(value * 100);
}

export function scenarioInputsFromStored(input: ScenarioReliabilityInput): ScenarioInputs {
  return {
    revenue: input.revenueCents / 100,
    currentRate: input.currentRateBps / 100,
    newRate: input.newRateBps / 100,
    costRate: input.costRateBps / 100,
    fixedCosts: input.fixedCostsCents / 100,
    volumeLoss: input.volumeLossBps / 100,
    priceAdjustment: input.priceAdjustmentBps / 100,
  };
}

export function buildScenarioSnapshot(input: ScenarioReliabilityInput): ScenarioSnapshot {
  const values = calculateScenarioValues(scenarioInputsFromStored(input));
  return {
    format: "cents-and-bps-v1",
    projectedRevenueCents: cents(values.projectedRevenue),
    currentTaxCents: cents(values.currentTax),
    projectedTaxCents: cents(values.projectedTax),
    currentMarginCents: cents(values.currentMargin),
    projectedMarginCents: cents(values.projectedMargin),
    currentVariableCostsCents: cents(values.currentVariableCosts),
    projectedVariableCostsCents: cents(values.projectedVariableCosts),
    deltaCents: cents(values.delta),
    breakEvenRevenueCents: Number.isFinite(values.breakEvenRevenue) ? cents(values.breakEvenRevenue) : null,
    monthlyImpactCents: cents(values.monthlyImpact),
    annualImpactCents: cents(values.annualImpact),
    volumeImpactRevenueCents: cents(values.volumeImpactRevenue),
    requiredPriceIncreaseBps: bps(values.requiredPriceIncrease),
    maxVolumeLossBps: bps(values.maxVolumeLoss),
    marginOfSafetyBps: bps(values.marginOfSafetyRate),
    currentMarginRateBps: bps(values.currentMarginRate),
    projectedMarginRateBps: bps(values.projectedMarginRate),
  };
}

export function valuesFromSnapshot(snapshot: ScenarioSnapshot): ScenarioValues {
  return {
    projectedRevenue: snapshot.projectedRevenueCents / 100,
    currentTax: snapshot.currentTaxCents / 100,
    projectedTax: snapshot.projectedTaxCents / 100,
    currentMargin: snapshot.currentMarginCents / 100,
    projectedMargin: snapshot.projectedMarginCents / 100,
    currentVariableCosts: snapshot.currentVariableCostsCents / 100,
    projectedVariableCosts: snapshot.projectedVariableCostsCents / 100,
    delta: snapshot.deltaCents / 100,
    requiredPriceIncrease: snapshot.requiredPriceIncreaseBps / 100,
    maxVolumeLoss: snapshot.maxVolumeLossBps / 100,
    breakEvenRevenue: snapshot.breakEvenRevenueCents === null ? Number.POSITIVE_INFINITY : snapshot.breakEvenRevenueCents / 100,
    marginOfSafetyRate: snapshot.marginOfSafetyBps / 100,
    monthlyImpact: snapshot.monthlyImpactCents / 100,
    annualImpact: snapshot.annualImpactCents / 100,
    volumeImpactRevenue: snapshot.volumeImpactRevenueCents / 100,
    currentMarginRate: snapshot.currentMarginRateBps / 100,
    projectedMarginRate: snapshot.projectedMarginRateBps / 100,
  };
}

export function parseScenarioSnapshot(value: string | null | undefined) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as ScenarioSnapshot;
    if (parsed.format !== "cents-and-bps-v1" || !Number.isInteger(parsed.currentTaxCents)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function resolveStoredScenarioValues(input: ScenarioReliabilityInput & { snapshotJson?: string | null }) {
  const snapshot = parseScenarioSnapshot(input.snapshotJson);
  return snapshot ? valuesFromSnapshot(snapshot) : calculateScenarioValues(scenarioInputsFromStored(input));
}

export async function hashScenarioInput(input: ScenarioReliabilityInput) {
  const canonical = JSON.stringify({
    revenueCents: input.revenueCents,
    currentRateBps: input.currentRateBps,
    newRateBps: input.newRateBps,
    costRateBps: input.costRateBps,
    fixedCostsCents: input.fixedCostsCents,
    volumeLossBps: input.volumeLossBps,
    priceAdjustmentBps: input.priceAdjustmentBps,
    targetYear: input.targetYear,
    rateSource: input.rateSource,
    sourceNote: input.sourceNote,
    calculationVersion: CALCULATION_ENGINE_VERSION,
    methodologyVersion: METHODOLOGY_VERSION,
  });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function rateSourceLabel(source: RateSource) {
  if (source === "accountant") return "Premissa fornecida por contador";
  if (source === "custom") return "Premissa informada pelo usuário";
  return "Registro legado sem origem verificada";
}

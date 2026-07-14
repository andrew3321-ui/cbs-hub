export type ScenarioInputs = {
  revenue: number;
  currentRate: number;
  newRate: number;
  costRate: number;
  fixedCosts: number;
  volumeLoss: number;
  priceAdjustment: number;
};

export function calculateScenarioValues({ revenue, currentRate, newRate, costRate, fixedCosts, volumeLoss, priceAdjustment }: ScenarioInputs) {
  const safeRevenue = Math.max(revenue || 0, 1);
  const currentRateDecimal = Math.min(Math.max(currentRate / 100, 0), 1);
  const newRateDecimal = Math.min(Math.max(newRate / 100, 0), 1);
  const variableCostRate = Math.min(Math.max(costRate / 100, 0), 1);
  const safeFixedCosts = Math.max(fixedCosts || 0, 0);
  const priceFactor = 1 + Math.max(priceAdjustment || 0, 0) / 100;
  const volumeRetention = 1 - Math.min(Math.max(volumeLoss || 0, 0), 95) / 100;
  const projectedRevenueBeforeVolume = safeRevenue * priceFactor;
  const projectedRevenue = projectedRevenueBeforeVolume * volumeRetention;
  const currentTax = safeRevenue * currentRateDecimal;
  const projectedTax = projectedRevenue * newRateDecimal;
  const currentVariableCosts = safeRevenue * variableCostRate;
  const projectedVariableCosts = currentVariableCosts * volumeRetention;
  const currentMargin = safeRevenue - currentVariableCosts - currentTax - safeFixedCosts;
  const projectedMargin = projectedRevenue - projectedVariableCosts - projectedTax - safeFixedCosts;
  const delta = projectedTax - currentTax;
  const currentContributionRate = 1 - currentRateDecimal - variableCostRate;
  const projectedContributionPerBaseReal = priceFactor * (1 - newRateDecimal) - variableCostRate;
  const requiredPriceIncrease = newRateDecimal >= 1 || volumeRetention <= 0
    ? 0
    : Math.max(0, (((currentContributionRate / volumeRetention + variableCostRate) / (1 - newRateDecimal)) - 1) * 100);
  const maxVolumeLoss = projectedContributionPerBaseReal <= 0
    ? 0
    : Math.min(95, Math.max(0, (1 - currentContributionRate / projectedContributionPerBaseReal) * 100));
  const projectedContributionRate = 1 - newRateDecimal - variableCostRate / priceFactor;
  const breakEvenRevenue = projectedContributionRate > 0 ? safeFixedCosts / projectedContributionRate : Number.POSITIVE_INFINITY;
  const marginOfSafetyRate = Number.isFinite(breakEvenRevenue) && projectedRevenue > 0 ? ((projectedRevenue - breakEvenRevenue) / projectedRevenue) * 100 : -100;
  const monthlyImpact = projectedMargin - currentMargin;

  return {
    projectedRevenue,
    currentTax,
    projectedTax,
    currentMargin,
    projectedMargin,
    currentVariableCosts,
    projectedVariableCosts,
    delta,
    requiredPriceIncrease,
    maxVolumeLoss,
    breakEvenRevenue,
    marginOfSafetyRate,
    monthlyImpact,
    annualImpact: monthlyImpact * 12,
    volumeImpactRevenue: projectedRevenueBeforeVolume - projectedRevenue,
    currentMarginRate: (currentMargin / safeRevenue) * 100,
    projectedMarginRate: (projectedMargin / projectedRevenue) * 100,
  };
}

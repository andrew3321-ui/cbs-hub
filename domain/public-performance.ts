export const PUBLIC_PERFORMANCE_VERSION = "public-performance.v1";

export const coreWebVitalBudgets = {
  LCP: { good: 2_500, poor: 4_000, unit: "ms" },
  INP: { good: 200, poor: 500, unit: "ms" },
  CLS: { good: 0.1, poor: 0.25, unit: "score" },
} as const;

export const publicAssetBudgets = {
  initialJavaScriptBytes: 330 * 1024,
  publicCssBytes: 330 * 1024,
  heroPosterBytes: 210 * 1024,
  showcaseVideoBytes: 6 * 1024 * 1024,
  publicHtmlBytes: 180 * 1024,
  redirectHops: 0,
  brokenLinks: 0,
} as const;

export type CoreWebVitalName = keyof typeof coreWebVitalBudgets;

export function classifyCoreWebVital(name: string, value: number) {
  const budget = coreWebVitalBudgets[name as CoreWebVitalName];
  if (!budget || !Number.isFinite(value) || value < 0) return "invalid" as const;
  if (value <= budget.good) return "good" as const;
  if (value <= budget.poor) return "needs-improvement" as const;
  return "poor" as const;
}

export function percentile(values: number[], percentileValue = 0.75) {
  const sorted = values.filter(Number.isFinite).sort((left, right) => left - right);
  if (!sorted.length) return null;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(percentileValue * sorted.length) - 1));
  return sorted[index];
}

export function normalizeWebVital(input: { name?: unknown; value?: unknown; rating?: unknown; deviceClass?: unknown; navigationType?: unknown }) {
  const name = typeof input.name === "string" && ["LCP", "INP", "CLS"].includes(input.name.toUpperCase()) ? input.name.toUpperCase() as CoreWebVitalName : null;
  const numericValue = typeof input.value === "number" ? input.value : Number(input.value);
  if (!name || !Number.isFinite(numericValue) || numericValue < 0 || numericValue > (name === "CLS" ? 10 : 120_000)) return null;
  const deviceClass = input.deviceClass === "mobile" ? "mobile" : "desktop";
  const navigationType = typeof input.navigationType === "string" ? input.navigationType.replace(/[^a-z-]/gi, "").slice(0, 30) : "navigate";
  return { name, value: numericValue, rating: classifyCoreWebVital(name, numericValue), deviceClass, navigationType };
}

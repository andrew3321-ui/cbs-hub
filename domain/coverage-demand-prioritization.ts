export const COVERAGE_DEMAND_VERSION = "2026.08.13-exp25-v1";

export type DemandTaxScope = "icms" | "st" | "iss" | "simples" | "pis_cofins" | "withholdings" | "ipi" | "reform" | "federal";

export type DemandCandidate = {
  itemCode: string;
  dimensionType: "topic" | "route" | "ncm" | "cest" | "city" | "service" | "module" | "catalog_gap";
  dimensionKey: string;
  taxScope: DemandTaxScope;
  frequency: number;
  workspaceCount: number;
  revenueCents: number;
  blockedCount: number;
  partialCount: number;
  supportedCount: number;
  riskScore: number;
  sourceHealthBps: number;
  currentCoverageBps: number;
  expectedCaseCount: number;
  sourceCodes: string[];
  ruleCodes: string[];
  testCodes: string[];
  implementationRef: string;
};

export type RankedDemandCandidate = DemandCandidate & {
  priorityScore: number;
  projectedGainBps: number;
  eligibleForGain: boolean;
  justification: string[];
  fingerprintMaterial: string;
};

const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, Number.isFinite(value) ? value : minimum));
const distinct = (values: string[]) => [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort();

function normalizedScore(value: number, ceiling: number) {
  return Math.round((clamp(value, 0, ceiling) / ceiling) * 10_000);
}

export function rankCoverageDemand(candidate: DemandCandidate): RankedDemandCandidate {
  const frequencyBps = normalizedScore(candidate.frequency, 100);
  const workspaceBps = normalizedScore(candidate.workspaceCount, 25);
  const revenueBps = normalizedScore(candidate.revenueCents, 500_000_000);
  const unmet = candidate.blockedCount + candidate.partialCount;
  const outcomeTotal = unmet + candidate.supportedCount;
  const unmetBps = outcomeTotal ? Math.round((unmet / outcomeTotal) * 10_000) : Math.max(0, 10_000 - candidate.currentCoverageBps);
  const sourceRiskBps = 10_000 - clamp(candidate.sourceHealthBps, 0, 10_000);
  const priorityScore = Math.round((
    frequencyBps * 25 + workspaceBps * 15 + revenueBps * 20 +
    clamp(candidate.riskScore, 0, 10_000) * 15 + unmetBps * 20 + sourceRiskBps * 5
  ) / 10_000);
  const sourceCodes = distinct(candidate.sourceCodes);
  const ruleCodes = distinct(candidate.ruleCodes);
  const testCodes = distinct(candidate.testCodes);
  const eligibleForGain = candidate.expectedCaseCount > 0 && sourceCodes.length > 0 && ruleCodes.length > 0 && testCodes.length > 0 && Boolean(candidate.implementationRef.trim());
  const projectedGainBps = eligibleForGain
    ? Math.min(10_000 - clamp(candidate.currentCoverageBps, 0, 10_000), Math.max(1, candidate.expectedCaseCount) * 40)
    : 0;
  return {
    ...candidate,
    sourceCodes,
    ruleCodes,
    testCodes,
    priorityScore,
    projectedGainBps,
    eligibleForGain,
    justification: [
      `${candidate.frequency} ocorrência(s) agregada(s) em ${candidate.workspaceCount} espaço(s) pseudonimizado(s)`,
      `${(candidate.revenueCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} de receita atendida vinculada sem identificar clientes`,
      `${unmet} resultado(s) parcial(is) ou bloqueado(s); risco ${Math.round(clamp(candidate.riskScore, 0, 10_000) / 100)}%`,
      `saúde das fontes ${Math.round(clamp(candidate.sourceHealthBps, 0, 10_000) / 100)}% e cobertura atual ${Math.round(clamp(candidate.currentCoverageBps, 0, 10_000) / 100)}%`,
      eligibleForGain ? `${candidate.expectedCaseCount} caso(s) esperado(s) com fonte, regra, teste e tarefa vinculados` : "ganho não contabilizado: faltam vínculos técnicos obrigatórios",
    ],
    fingerprintMaterial: JSON.stringify({
      version: COVERAGE_DEMAND_VERSION,
      itemCode: candidate.itemCode,
      dimensionType: candidate.dimensionType,
      dimensionKey: candidate.dimensionKey,
      taxScope: candidate.taxScope,
      frequency: candidate.frequency,
      workspaceCount: candidate.workspaceCount,
      revenueCents: candidate.revenueCents,
      blockedCount: candidate.blockedCount,
      partialCount: candidate.partialCount,
      supportedCount: candidate.supportedCount,
      riskScore: clamp(candidate.riskScore, 0, 10_000),
      sourceHealthBps: clamp(candidate.sourceHealthBps, 0, 10_000),
      currentCoverageBps: clamp(candidate.currentCoverageBps, 0, 10_000),
      expectedCaseCount: candidate.expectedCaseCount,
      sourceCodes,
      ruleCodes,
      testCodes,
      implementationRef: candidate.implementationRef,
      priorityScore,
      projectedGainBps,
    }),
  };
}

export function deduplicateCoverageBacklog(candidates: DemandCandidate[]) {
  const byIdentity = new Map<string, DemandCandidate>();
  for (const candidate of candidates) {
    const identity = `${candidate.dimensionType}:${candidate.dimensionKey}:${candidate.taxScope}`;
    const existing = byIdentity.get(identity);
    if (!existing) {
      byIdentity.set(identity, candidate);
      continue;
    }
    byIdentity.set(identity, {
      ...existing,
      frequency: existing.frequency + candidate.frequency,
      workspaceCount: Math.max(existing.workspaceCount, candidate.workspaceCount),
      revenueCents: Math.max(existing.revenueCents, candidate.revenueCents),
      blockedCount: existing.blockedCount + candidate.blockedCount,
      partialCount: existing.partialCount + candidate.partialCount,
      supportedCount: existing.supportedCount + candidate.supportedCount,
      riskScore: Math.max(existing.riskScore, candidate.riskScore),
      sourceHealthBps: Math.min(existing.sourceHealthBps, candidate.sourceHealthBps),
      currentCoverageBps: Math.max(existing.currentCoverageBps, candidate.currentCoverageBps),
      expectedCaseCount: Math.max(existing.expectedCaseCount, candidate.expectedCaseCount),
      sourceCodes: [...existing.sourceCodes, ...candidate.sourceCodes],
      ruleCodes: [...existing.ruleCodes, ...candidate.ruleCodes],
      testCodes: [...existing.testCodes, ...candidate.testCodes],
      implementationRef: existing.implementationRef || candidate.implementationRef,
    });
  }
  return [...byIdentity.values()].map(rankCoverageDemand).sort((left, right) => right.priorityScore - left.priorityScore || left.itemCode.localeCompare(right.itemCode));
}

export function summarizeCoverageGains(items: Array<{ projectedGainBps: number; eligibleForGain: boolean; status?: string; verifiedGainBps?: number }>) {
  return items.reduce((summary, item) => {
    summary.projectedGainBps += item.projectedGainBps;
    if (item.status === "verified") summary.verifiedGainBps += Math.max(0, item.verifiedGainBps ?? 0);
    if (!item.eligibleForGain) summary.ineligibleItems += 1;
    return summary;
  }, { projectedGainBps: 0, verifiedGainBps: 0, ineligibleItems: 0 });
}

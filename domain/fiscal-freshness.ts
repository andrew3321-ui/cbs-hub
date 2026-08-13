export const FISCAL_FRESHNESS_VERSION = "fiscal-freshness.v1";

export type FiscalCriticality = "critical" | "high" | "standard";
export type FiscalFreshnessStatus = "current" | "due_soon" | "overdue" | "unavailable" | "not_checked";
export type CoverageFreshnessEffect = "supported" | "partial" | "not_supported";

export const FISCAL_SOURCE_SLA: Record<FiscalCriticality, { hours: number; warningHours: number; label: string }> = {
  critical: { hours: 30, warningHours: 22, label: "Crítica" },
  high: { hours: 42, warningHours: 30, label: "Alta" },
  standard: { hours: 54, warningHours: 40, label: "Padrão" },
};

export type FiscalFreshnessInput = {
  criticality: FiscalCriticality;
  captureStatus: "checked" | "unavailable" | "not_checked";
  checkedAt: string | null;
  pendingChange: boolean;
  openIncident: boolean;
  now: Date;
};

function validDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function evaluateFiscalFreshness(input: FiscalFreshnessInput) {
  const sla = FISCAL_SOURCE_SLA[input.criticality];
  const checked = validDate(input.checkedAt);
  const ageMinutes = checked ? Math.max(0, Math.floor((input.now.getTime() - checked.getTime()) / 60_000)) : null;
  const ageHours = ageMinutes === null ? null : ageMinutes / 60;
  const deadlineAt = checked ? new Date(checked.getTime() + sla.hours * 3_600_000).toISOString() : null;
  let status: FiscalFreshnessStatus = "current";
  let reason = `Fonte conferida dentro do SLA de ${sla.hours} horas.`;

  if (input.captureStatus === "not_checked" || !checked) {
    status = "not_checked";
    reason = "A fonte ainda não possui captura-base verificável.";
  } else if (input.captureStatus === "unavailable" || input.openIncident) {
    status = "unavailable";
    reason = input.openIncident ? "Existe incidente aberto para a captura oficial." : "A última tentativa não conseguiu conferir a fonte oficial.";
  } else if ((ageHours ?? 0) > sla.hours) {
    status = "overdue";
    reason = `A última conferência ultrapassou o SLA de ${sla.hours} horas.`;
  } else if ((ageHours ?? 0) >= sla.warningHours) {
    status = "due_soon";
    reason = `A fonte está dentro da janela de atenção e vence em até ${Math.max(0, Math.ceil(sla.hours - (ageHours ?? 0)))} hora(s).`;
  }

  let coverageEffect: CoverageFreshnessEffect = "supported";
  if (status === "not_checked" || status === "unavailable" || status === "overdue") {
    coverageEffect = input.criticality === "critical" ? "not_supported" : "partial";
  } else if (status === "due_soon" || input.pendingChange) {
    coverageEffect = "partial";
  }
  if (input.pendingChange && coverageEffect === "supported") coverageEffect = "partial";

  return {
    status,
    reason: input.pendingChange ? `${reason} Há mudança pendente de decisão; a cobertura permanece rebaixada.` : reason,
    slaHours: sla.hours,
    warningHours: sla.warningHours,
    ageMinutes,
    deadlineAt,
    coverageEffect,
  };
}

export function summarizeDurations(values: number[]) {
  const finite = values.filter((value) => Number.isFinite(value) && value >= 0).sort((a, b) => a - b);
  if (!finite.length) return { samples: 0, averageMinutes: null, p95Minutes: null, maximumMinutes: null };
  const averageMinutes = Math.round(finite.reduce((sum, value) => sum + value, 0) / finite.length);
  const p95Minutes = Math.round(finite[Math.min(finite.length - 1, Math.ceil(finite.length * 0.95) - 1)]);
  return { samples: finite.length, averageMinutes, p95Minutes, maximumMinutes: Math.round(finite.at(-1) ?? 0) };
}

export function minutesBetween(start: string | null | undefined, end: string | null | undefined) {
  if (!start || !end) return null;
  const delta = new Date(end).getTime() - new Date(start).getTime();
  return Number.isFinite(delta) && delta >= 0 ? Math.round(delta / 60_000) : null;
}

export function publicFreshnessLevel(counts: { notSupported: number; partial: number; current: number }) {
  if (counts.notSupported > 0) return "degraded" as const;
  if (counts.partial > 0) return "attention" as const;
  return counts.current > 0 ? "current" as const : "insufficient_evidence" as const;
}

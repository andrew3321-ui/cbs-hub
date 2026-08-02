import {
  buildPublicCoverageIndicator,
  type PublicCoverageIndicator,
  type PublicCoverageMatrixEntry,
} from "./public-coverage-indicator.ts";
import type { CoverageStatus } from "./national-tax-coverage.ts";

export const PUBLIC_COVERAGE_PAGE_VERSION = "public-coverage-v1.0.0";

const taxGroups = [
  { code: "icms-st", title: "ICMS e ICMS/ST", taxes: ["ICMS", "ICMS/ST"], description: "Alíquotas estaduais, DIFAL, FCP, rotas, produtos, NCM, CEST e substituição tributária sem presumir simetria entre UFs." },
  { code: "iss", title: "ISS", taxes: ["ISS"], description: "Município, item da LC 116, código local, incidência, retenção, alíquota, deduções e vigência tratados por recorte exato." },
  { code: "simples", title: "Simples Nacional", taxes: ["Simples"], description: "Atividade efetiva, anexos, RBT12, fator R, sublimite e receitas segregadas antes de qualquer referência de DAS." },
  { code: "pis-cofins", title: "PIS/Cofins", taxes: ["PIS/Cofins"], description: "Regimes cumulativo e não cumulativo, monofásico, alíquota zero, créditos e livros independentes por operação." },
  { code: "retencoes", title: "Retenções", taxes: ["Retenções"], description: "IRRF, CSRF, INSS e ISS preservados em trilhas próprias, com base, fato gerador, responsável, dispensa e prazo separados." },
  { code: "ipi", title: "IPI/TIPI", taxes: ["IPI"], description: "NCM completo, descrição legal, Ex, operação, papel do contribuinte e vigência como fatos cumulativos." },
  { code: "reforma", title: "Reforma Tributária", taxes: ["IBS/CBS"], description: "Transição de 2026 a 2033, regimes setoriais e atos pendentes sem transformar referência técnica em saldo jurídico." },
] as const;

export type PublicCoverageTaxSummary = {
  code: string;
  title: string;
  description: string;
  entries: number;
  statusTotals: Record<CoverageStatus, number>;
  versions: string[];
  checkedAt: string;
  temporalEvidence: {
    explicit: number;
    pending: number;
    earliestFrom: string | null;
    latestTo: string | null;
  };
  officialSources: Array<{ code: string; title: string; publisher: string; url: string; checkedAt: string }>;
  blockers: string[];
};

export type PublicCoverageSummary = {
  pageVersion: string;
  indicatorVersion: string;
  baseCoverageVersion: string;
  checkedAt: string;
  totals: PublicCoverageIndicator["statusTotals"];
  maturityTotals: PublicCoverageIndicator["maturityTotals"];
  regression: PublicCoverageIndicator["regressionTotals"];
  taxGroups: PublicCoverageTaxSummary[];
  privacy: PublicCoverageIndicator["privacy"];
  classificationPolicy: PublicCoverageIndicator["classificationPolicy"];
};

function statusTotals(entries: PublicCoverageMatrixEntry[]) {
  return entries.reduce<Record<CoverageStatus, number>>((totals, item) => {
    totals[item.status] += 1;
    return totals;
  }, { supported: 0, partial: 0, not_supported: 0 });
}

function rankedSources(entries: PublicCoverageMatrixEntry[]) {
  const sources = new Map<string, { count: number; source: PublicCoverageMatrixEntry["officialSources"][number] }>();
  for (const entry of entries) for (const source of entry.officialSources) {
    const current = sources.get(source.code);
    sources.set(source.code, { count: (current?.count ?? 0) + 1, source });
  }
  return [...sources.values()]
    .sort((left, right) => right.count - left.count || left.source.code.localeCompare(right.source.code))
    .slice(0, 4)
    .map(({ source }) => source);
}

function summarizeGroup(group: typeof taxGroups[number], matrix: PublicCoverageMatrixEntry[]): PublicCoverageTaxSummary {
  const entries = matrix.filter((entry) => (group.taxes as readonly string[]).includes(entry.tax));
  if (!entries.length) throw new Error(`public_coverage_group_without_entries:${group.code}`);
  const explicitPeriods = entries.filter((entry) => entry.effectiveFrom);
  const fromDates = explicitPeriods.map((entry) => entry.effectiveFrom).filter((value): value is string => Boolean(value)).sort();
  const toDates = explicitPeriods.map((entry) => entry.effectiveTo).filter((value): value is string => Boolean(value)).sort();
  const blockers = [...new Set(entries.flatMap((entry) => entry.blockers).filter(Boolean))].slice(0, 3);
  return {
    code: group.code,
    title: group.title,
    description: group.description,
    entries: entries.length,
    statusTotals: statusTotals(entries),
    versions: [...new Set(entries.map((entry) => entry.version))].slice(0, 4),
    checkedAt: entries.map((entry) => entry.checkedAt).sort().at(-1) ?? "",
    temporalEvidence: {
      explicit: explicitPeriods.length,
      pending: entries.length - explicitPeriods.length,
      earliestFrom: fromDates[0] ?? null,
      latestTo: toDates.at(-1) ?? null,
    },
    officialSources: rankedSources(entries),
    blockers,
  };
}

export async function buildPublicCoverageSummary(): Promise<PublicCoverageSummary> {
  const indicator = await buildPublicCoverageIndicator();
  const result: PublicCoverageSummary = {
    pageVersion: PUBLIC_COVERAGE_PAGE_VERSION,
    indicatorVersion: indicator.version,
    baseCoverageVersion: indicator.baseCoverageVersion,
    checkedAt: indicator.checkedAt,
    totals: indicator.statusTotals,
    maturityTotals: indicator.maturityTotals,
    regression: indicator.regressionTotals,
    taxGroups: taxGroups.map((group) => summarizeGroup(group, indicator.matrix)),
    privacy: indicator.privacy,
    classificationPolicy: indicator.classificationPolicy,
  };
  if (result.taxGroups.some((group) => group.statusTotals.supported + group.statusTotals.partial + group.statusTotals.not_supported !== group.entries)) {
    throw new Error("public_coverage_status_total_mismatch");
  }
  return result;
}

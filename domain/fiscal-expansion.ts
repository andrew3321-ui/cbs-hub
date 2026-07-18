import {
  cityCoverage,
  coverageSources,
  recurringScenarios,
  stateCoverage,
  stSegments,
  type CoverageStatus,
} from "./national-tax-coverage.ts";
import { issDeepProfileByIbge, sourcesForIssDeepProfile } from "./iss-deep-coverage.ts";

export const FISCAL_EXPANSION_VERSION = "2026.07.18-v53";
export const FISCAL_EXPANSION_MONTH = "2026-07";

export type ExpansionScope = "icms" | "iss" | "st" | "federal" | "sources";
export type ExpansionStage = "catalogued" | "source_connected" | "structured" | "tested" | "awaiting_professional" | "homologated" | "blocked";

export type ExpansionItem = {
  code: string;
  scope: ExpansionScope;
  title: string;
  jurisdiction: string;
  supportStatus: CoverageStatus;
  defaultStage: ExpansionStage;
  impact: number;
  risk: number;
  readiness: number;
  priorityScore: number;
  sourceUrl: string | null;
  sourceTitle: string | null;
  blockers: string[];
  gates: string[];
};

export type ExpansionProgress = {
  itemCode: string;
  stage: ExpansionStage;
  evidenceNote: string;
  evidenceReference: string | null;
  evidenceHash: string | null;
  updatedAt: string;
  updatedByUserId: number;
};

export const expansionTargets = {
  month: FISCAL_EXPANSION_MONTH,
  icmsBundles: 27,
  issDeepCities: 25,
  stRouteBundles: 40,
  officialSources: 200,
  testedBundles: 100,
  professionalApprovals: 30,
} as const;

export const expansionStageOrder: ExpansionStage[] = [
  "catalogued",
  "source_connected",
  "structured",
  "tested",
  "awaiting_professional",
  "homologated",
];

export const expansionStageLabels: Record<ExpansionStage, string> = {
  catalogued: "Catalogado",
  source_connected: "Fonte conectada",
  structured: "Estruturado",
  tested: "Testado",
  awaiting_professional: "Aguardando profissional",
  homologated: "Homologado",
  blocked: "Bloqueado",
};

const stageWeight: Record<ExpansionStage, number> = {
  catalogued: 1,
  source_connected: 2,
  structured: 3,
  tested: 4,
  awaiting_professional: 5,
  homologated: 6,
  blocked: 0,
};

function score(stage: ExpansionStage, impact: number, risk: number, readiness: number) {
  const gap = Math.max(0, 6 - stageWeight[stage]);
  return impact * 35 + risk * 25 + gap * 25 + readiness * 15;
}

function gates(scope: ExpansionScope) {
  const common = [
    "fonte primária oficial identificada",
    "vigência e jurisdição registradas",
    "fatos obrigatórios e exceções descritos",
    "tratamento determinístico versionado",
    "casos de referência aprovados nos testes",
    "monitoramento da fonte ativo",
    "revisão independente por contador ou tributarista",
  ];
  if (scope === "sources") return ["URL oficial confirmada", "captura íntegra e hash registrados", "mudanças encaminhadas para revisão humana"];
  return common;
}

function makeItem(input: Omit<ExpansionItem, "priorityScore" | "gates">): ExpansionItem {
  return { ...input, priorityScore: score(input.defaultStage, input.impact, input.risk, input.readiness), gates: gates(input.scope) };
}

const icmsItems = stateCoverage.map((state) => makeItem({
  code: `ICMS-${state.uf}`,
  scope: "icms" as const,
  title: `ICMS geral — ${state.name}`,
  jurisdiction: state.uf,
  supportStatus: state.status,
  defaultStage: "source_connected" as const,
  impact: 5,
  risk: 5,
  readiness: 3,
  sourceUrl: state.officialPortal,
  sourceTitle: `Portal oficial da SEFAZ ${state.uf}`,
  blockers: state.blockers,
}));

const issItems = cityCoverage.map((city, index) => {
  const deepProfile = issDeepProfileByIbge.get(city.ibgeCode);
  const primarySource = deepProfile ? sourcesForIssDeepProfile(deepProfile)[0] : null;
  return makeItem({
    code: `ISS-${city.ibgeCode}`,
    scope: "iss" as const,
    title: `ISS — ${city.city}/${city.uf}`,
    jurisdiction: `${city.city}/${city.uf}`,
    supportStatus: city.status,
    defaultStage: deepProfile ? "structured" as const : "catalogued" as const,
    impact: index < 25 ? 5 : 4,
    risk: 4,
    readiness: deepProfile ? 4 : index < 25 ? 3 : 2,
    sourceUrl: primarySource?.url ?? null,
    sourceTitle: primarySource?.title ?? null,
    blockers: city.blockers,
  });
});

const stItems = stSegments.map((segment, index) => makeItem({
  code: `ST-${segment.code}`,
  scope: "st" as const,
  title: `ST — ${segment.name}`,
  jurisdiction: "Brasil · rotas estaduais",
  supportStatus: segment.status,
  defaultStage: segment.code === "AUTO_PARTS" ? "structured" as const : "catalogued" as const,
  impact: index < 5 ? 5 : 4,
  risk: 5,
  readiness: segment.code === "AUTO_PARTS" ? 4 : 2,
  sourceUrl: null,
  sourceTitle: null,
  blockers: segment.blockers,
}));

const federalItems = recurringScenarios.map((scenario) => makeItem({
  code: `FED-${scenario.code}`,
  scope: "federal" as const,
  title: `${scenario.tax} — ${scenario.title}`,
  jurisdiction: "Federal",
  supportStatus: scenario.status,
  defaultStage: scenario.status === "not_supported" ? "catalogued" as const : "structured" as const,
  impact: 5,
  risk: 5,
  readiness: scenario.status === "not_supported" ? 1 : 3,
  sourceUrl: null,
  sourceTitle: null,
  blockers: scenario.blockers,
}));

const nationalSourceItems = coverageSources.map((source) => makeItem({
  code: `SRC-${source.code}`,
  scope: "sources" as const,
  title: source.title,
  jurisdiction: source.code.startsWith("ISS-") ? "Municipal" : "Nacional",
  supportStatus: "partial" as const,
  defaultStage: "source_connected" as const,
  impact: 4,
  risk: 4,
  readiness: 5,
  sourceUrl: source.url,
  sourceTitle: source.publisher,
  blockers: ["fonte conectada não implica que todas as regras nela contidas estejam estruturadas ou homologadas"],
}));

const stateSourceItems = stateCoverage.map((state) => makeItem({
  code: `SRC-SEFAZ-${state.uf}`,
  scope: "sources" as const,
  title: `Portal oficial da SEFAZ — ${state.name}`,
  jurisdiction: state.uf,
  supportStatus: "partial" as const,
  defaultStage: "source_connected" as const,
  impact: 4,
  risk: 5,
  readiness: 4,
  sourceUrl: state.officialPortal,
  sourceTitle: `Administração tributária de ${state.name}`,
  blockers: ["o portal precisa ser decomposto em atos, vigências, produtos e exceções antes de gerar uma regra"],
}));

export const fiscalExpansionBacklog: ExpansionItem[] = [
  ...icmsItems,
  ...issItems,
  ...stItems,
  ...federalItems,
  ...nationalSourceItems,
  ...stateSourceItems,
].sort((a, b) => b.priorityScore - a.priorityScore || a.code.localeCompare(b.code));

export function isExpansionStage(value: unknown): value is ExpansionStage {
  return typeof value === "string" && [...expansionStageOrder, "blocked"].includes(value as ExpansionStage);
}

export function nextExpansionStage(stage: ExpansionStage): ExpansionStage | null {
  if (stage === "blocked" || stage === "homologated" || stage === "awaiting_professional") return null;
  const index = expansionStageOrder.indexOf(stage);
  const next = expansionStageOrder[index + 1] ?? null;
  return next === "homologated" ? null : next;
}

export function applyExpansionProgress(items: ExpansionItem[], progress: ExpansionProgress[]) {
  const byCode = new Map(progress.map((entry) => [entry.itemCode, entry]));
  return items.map((item) => {
    const entry = byCode.get(item.code) ?? null;
    const stage = !entry
      ? item.defaultStage
      : entry.stage === "blocked" || stageWeight[entry.stage] >= stageWeight[item.defaultStage]
        ? entry.stage
        : item.defaultStage;
    return { ...item, stage, progress: entry };
  });
}

export function expansionMetrics(items: Array<ExpansionItem & { stage?: ExpansionStage }>) {
  const stage = (item: ExpansionItem & { stage?: ExpansionStage }) => item.stage ?? item.defaultStage;
  const countAtLeast = (minimum: ExpansionStage, scope?: ExpansionScope) => {
    const threshold = stageWeight[minimum];
    return items.filter((item) => (!scope || item.scope === scope) && stageWeight[stage(item)] >= threshold).length;
  };
  const counts = Object.fromEntries(([...expansionStageOrder, "blocked"] as ExpansionStage[]).map((value) => [value, items.filter((item) => stage(item) === value).length])) as Record<ExpansionStage, number>;
  const weighted = items.reduce((sum, item) => sum + stageWeight[stage(item)], 0);
  const max = items.length * stageWeight.homologated;
  const actual = {
    icmsBundles: items.filter((item) => item.scope === "icms").length,
    issDeepCities: countAtLeast("structured", "iss"),
    stRouteBundles: countAtLeast("structured", "st"),
    officialSources: countAtLeast("source_connected", "sources"),
    testedBundles: countAtLeast("tested") - countAtLeast("tested", "sources"),
    professionalApprovals: counts.homologated,
  };
  return {
    totalItems: items.length,
    counts,
    actual,
    progressPercent: max ? Math.round((weighted / max) * 100) : 0,
    gaps: {
      icmsBundles: Math.max(0, expansionTargets.icmsBundles - actual.icmsBundles),
      issDeepCities: Math.max(0, expansionTargets.issDeepCities - actual.issDeepCities),
      stRouteBundles: Math.max(0, expansionTargets.stRouteBundles - actual.stRouteBundles),
      officialSources: Math.max(0, expansionTargets.officialSources - actual.officialSources),
      testedBundles: Math.max(0, expansionTargets.testedBundles - actual.testedBundles),
      professionalApprovals: Math.max(0, expansionTargets.professionalApprovals - actual.professionalApprovals),
    },
  };
}

export function expansionQueue(items: Array<ExpansionItem & { stage?: ExpansionStage }>, limit = 20) {
  return items
    .filter((item) => nextExpansionStage(item.stage ?? item.defaultStage) !== null)
    .sort((a, b) => b.priorityScore - a.priorityScore || a.code.localeCompare(b.code))
    .slice(0, limit);
}

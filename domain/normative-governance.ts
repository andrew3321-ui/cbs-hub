import { normativeMonitorSources, stateCoverage } from "./national-tax-coverage.ts";
import { issDeepCityProfiles, issDeepSources } from "./iss-deep-coverage.ts";

export const NORMATIVE_GOVERNANCE_VERSION = "normative-governance.v2";
export const NORMATIVE_MONITOR_BATCH_SIZE = 10;
export const NORMATIVE_MONITOR_SHARD_COUNT = 4;

export type GovernedSourceKind =
  | "legal_act"
  | "rate_table"
  | "technical_guidance"
  | "official_portal"
  | "official_news";

export type GovernedNormativeSource = {
  code: string;
  title: string;
  publisher: string;
  url: string;
  checkedAt: string;
  jurisdiction: string;
  legalDevice: string;
  sourceKind: GovernedSourceKind;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  verificationStatus: "rule_evidence" | "monitor_only";
  impactedRuleCodes: string[];
  criticality: "critical" | "high" | "standard";
  monitoringFrequency: "daily";
  officialAlternativeUrl: string | null;
  alternativeEvidenceScope: "technical_availability_only" | "not_available";
};

export type CapturedSourceState = {
  sourceCode: string;
  status: "checked" | "unavailable";
  contentHash: string | null;
  normalizedContentHash?: string | null;
  finalUrl?: string | null;
};

const DOSSIER_RULE_CODES = [
  "AUTO_PARTS_HIGH_USE_CORRIDORS",
  "COLD_BEVERAGES_SP_DESTINATION",
  "COLD_BEVERAGES_SP_ORIGIN",
] as const;

const nationalMetadata: Record<string, Pick<GovernedNormativeSource, "jurisdiction" | "legalDevice" | "sourceKind" | "effectiveFrom" | "effectiveTo" | "verificationStatus" | "impactedRuleCodes">> = {
  CONFAZ: {
    jurisdiction: "BR",
    legalDevice: "Repositório oficial de convênios, protocolos, ajustes e atos COTEPE; cada ato precisa ser individualizado antes de integrar uma regra.",
    sourceKind: "official_portal",
    effectiveFrom: null,
    effectiveTo: null,
    verificationStatus: "monitor_only",
    impactedRuleCodes: [...DOSSIER_RULE_CODES],
  },
  "LC-116-2003": {
    jurisdiction: "BR",
    legalDevice: "Lei Complementar nº 116/2003",
    sourceKind: "legal_act",
    effectiveFrom: "2003-08-01",
    effectiveTo: null,
    verificationStatus: "rule_evidence",
    impactedRuleCodes: ["ISS-DEEP-NATIONAL"],
  },
  "NFSE-NACIONAL": {
    jurisdiction: "BR",
    legalDevice: "Documentação técnica vigente do padrão nacional da NFS-e",
    sourceKind: "technical_guidance",
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
    verificationStatus: "rule_evidence",
    impactedRuleCodes: ["ISS-DEEP-NATIONAL"],
  },
  "NFE-PORTAL": {
    jurisdiction: "BR",
    legalDevice: "Manuais, notas técnicas e esquemas publicados no Portal Nacional da NF-e",
    sourceKind: "technical_guidance",
    effectiveFrom: null,
    effectiveTo: null,
    verificationStatus: "monitor_only",
    impactedRuleCodes: [...DOSSIER_RULE_CODES],
  },
  "EFD-ICMS-IPI": {
    jurisdiction: "BR",
    legalDevice: "Guia Prático EFD-ICMS/IPI v3.2.2",
    sourceKind: "technical_guidance",
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
    verificationStatus: "rule_evidence",
    impactedRuleCodes: [...DOSSIER_RULE_CODES],
  },
  "RTC-CALCULATOR": {
    jurisdiction: "BR",
    legalDevice: "Calculadora oficial de tributos sobre o consumo",
    sourceKind: "technical_guidance",
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
    verificationStatus: "rule_evidence",
    impactedRuleCodes: ["NATIONAL-COVERAGE-V27", "RTC-BR-2026-TEST"],
  },
  "RFB-NEWS": {
    jurisdiction: "BR",
    legalDevice: "Canal oficial de notícias; a publicação detectada precisa ser vinculada ao ato normativo correspondente.",
    sourceKind: "official_news",
    effectiveFrom: null,
    effectiveTo: null,
    verificationStatus: "monitor_only",
    impactedRuleCodes: ["NATIONAL-COVERAGE-V27", "RTC-BR-2026-TEST"],
  },
  "SIMPLES-NEWS": {
    jurisdiction: "BR",
    legalDevice: "Canal oficial de notícias do Simples Nacional; a publicação detectada precisa ser vinculada à resolução aplicável.",
    sourceKind: "official_news",
    effectiveFrom: null,
    effectiveTo: null,
    verificationStatus: "monitor_only",
    impactedRuleCodes: ["SIMPLES-PGDAS"],
  },
};

const issSourceByCode = new Map(issDeepSources.map((source) => [source.code, source]));
const issJurisdictionBySource = new Map<string, string>();
for (const profile of issDeepCityProfiles) {
  for (const sourceCode of profile.sourceCodes) issJurisdictionBySource.set(sourceCode, `${profile.city}/${profile.uf}`);
}

function yearFromTitle(title: string) {
  const year = title.match(/\b(19|20)\d{2}\b/)?.[0];
  return year ? `${year}-01-01` : null;
}

type GovernedNormativeSourceBase = Omit<GovernedNormativeSource, "criticality" | "monitoringFrequency" | "officialAlternativeUrl" | "alternativeEvidenceScope">;

function governedSource(source: typeof normativeMonitorSources[number]): GovernedNormativeSourceBase {
  const national = nationalMetadata[source.code];
  if (national) return { ...source, ...national };

  const state = source.code.match(/^SEFAZ-([A-Z]{2})$/)?.[1];
  if (state) {
    return {
      ...source,
      jurisdiction: state,
      legalDevice: `Portal normativo oficial da ${state}; dispositivo, vigência e conteúdo específico são obrigatórios antes de alterar cálculo.`,
      sourceKind: "official_portal",
      effectiveFrom: null,
      effectiveTo: null,
      verificationStatus: "monitor_only",
      impactedRuleCodes: [...DOSSIER_RULE_CODES],
    };
  }

  const iss = issSourceByCode.get(source.code);
  if (iss) {
    const effectiveFrom = yearFromTitle(iss.title);
    const isEvidence = effectiveFrom !== null;
    return {
      ...source,
      jurisdiction: issJurisdictionBySource.get(source.code) ?? "Município não identificado",
      legalDevice: iss.title,
      sourceKind: iss.kind === "municipal_law" ? "legal_act" : iss.kind === "rate_table" ? "rate_table" : "technical_guidance",
      effectiveFrom,
      effectiveTo: null,
      verificationStatus: isEvidence ? "rule_evidence" : "monitor_only",
      impactedRuleCodes: ["ISS-DEEP-NATIONAL"],
    };
  }

  return {
    ...source,
    jurisdiction: "BR",
    legalDevice: source.title,
    sourceKind: "official_portal",
    effectiveFrom: null,
    effectiveTo: null,
    verificationStatus: "monitor_only",
    impactedRuleCodes: ["NATIONAL-COVERAGE-V27"],
  };
}

const officialAuthorityAlternatives: Record<string, string> = {
  CONFAZ: "https://www.gov.br/confaz/pt-br/assuntos/legislacao",
  "NFE-PORTAL": "https://www.gov.br/nfe/pt-br",
  "RTC-CALCULATOR": "https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/reforma-tributaria-do-consumo",
  "RFB-NEWS": "https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/legislacao",
  "SIMPLES-NEWS": "https://www8.receita.fazenda.gov.br/SimplesNacional/Noticias/NoticiaCompleta.aspx",
};

function officialAlternative(source: GovernedNormativeSourceBase) {
  const declared = officialAuthorityAlternatives[source.code];
  if (declared && declared !== source.url) return declared;
  try {
    const root = new URL("/", source.url).toString();
    return root !== source.url ? root : null;
  } catch {
    return null;
  }
}

export const governedNormativeSources: GovernedNormativeSource[] = normativeMonitorSources.map(governedSource).map((source) => {
  const officialAlternativeUrl = officialAlternative(source);
  return {
    ...source,
    criticality: source.verificationStatus === "rule_evidence" ? "critical" : source.impactedRuleCodes.length > 1 ? "high" : "standard",
    monitoringFrequency: "daily",
    officialAlternativeUrl,
    alternativeEvidenceScope: officialAlternativeUrl ? "technical_availability_only" : "not_available",
  };
});

export function validateGovernedSourceCatalog(sources: readonly GovernedNormativeSource[] = governedNormativeSources) {
  const errors: string[] = [];
  const codes = new Set<string>();
  for (const source of sources) {
    if (codes.has(source.code)) errors.push(`duplicate_source:${source.code}`);
    codes.add(source.code);
    if (!source.code || !source.title || !source.publisher || !source.jurisdiction || !source.legalDevice) errors.push(`missing_metadata:${source.code}`);
    if (!/^https:\/\//.test(source.url)) errors.push(`non_https_source:${source.code}`);
    if (source.verificationStatus === "rule_evidence" && !source.effectiveFrom) errors.push(`missing_effective_from:${source.code}`);
    if (source.impactedRuleCodes.length === 0) errors.push(`missing_rule_impact:${source.code}`);
    if (source.monitoringFrequency !== "daily") errors.push(`non_daily_frequency:${source.code}`);
    if (!source.criticality) errors.push(`missing_criticality:${source.code}`);
    if (source.officialAlternativeUrl && (!source.officialAlternativeUrl.startsWith("https://") || source.officialAlternativeUrl === source.url)) errors.push(`invalid_official_alternative:${source.code}`);
  }
  return { passed: errors.length === 0, errors, sources: sources.length };
}

export function sourcesForMonitorDate(date: string, sources: readonly GovernedNormativeSource[] = governedNormativeSources, shard = 0, shardCount = 1) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("invalid_monitor_date");
  if (!Number.isInteger(shard) || !Number.isInteger(shardCount) || shard < 0 || shardCount < 1 || shard >= shardCount) throw new Error("invalid_monitor_shard");
  const ordered = [...sources].sort((left, right) => left.code.localeCompare(right.code));
  return {
    sources: ordered.filter((_, index) => index % shardCount === shard),
    offset: shard,
    totalSources: sources.length,
    cycleDays: 1,
    shard,
    shardCount,
  };
}

export function classifyCapturedChange(previous: CapturedSourceState | null, current: CapturedSourceState) {
  if (!previous) return "baseline" as const;
  if (previous.status === "unavailable" && current.status === "checked") return "recovered" as const;
  if (previous.status === "checked" && current.status === "unavailable") return "unavailable" as const;
  if (previous.finalUrl && current.finalUrl && previous.finalUrl !== current.finalUrl && previous.contentHash === current.contentHash) return "technical_change" as const;
  if (previous.contentHash && current.contentHash && previous.contentHash !== current.contentHash) {
    if (previous.normalizedContentHash && current.normalizedContentHash && previous.normalizedContentHash === current.normalizedContentHash) return "editorial_change" as const;
    return "potentially_normative_change" as const;
  }
  return "unchanged" as const;
}

export function ruleHealthStatus(input: { effectiveFrom: string; effectiveTo: string; sourceCount: number }, today: string) {
  if (input.sourceCount <= 0) return "missing_source" as const;
  if (input.effectiveFrom > today) return "future" as const;
  if (input.effectiveTo < today) return "expired" as const;
  const days = Math.floor((Date.parse(`${input.effectiveTo}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
  if (days <= 30) return "expiring" as const;
  return "current" as const;
}

export function monitoredStateCoverage() {
  return new Set(stateCoverage.map((state) => state.uf));
}

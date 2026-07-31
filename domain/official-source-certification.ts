import { federalPmeSources } from "./federal-pme-compliance.ts";
import { fiscalImportOfficialSources } from "./fiscal-batch-import.ts";
import { labSources } from "./deterministic-tax-lab.ts";
import { icmsGeneralSources } from "./icms-general-national.ts";
import { ipiTipiDeepSources } from "./ipi-tipi-deep.ts";
import { issDeepSources } from "./iss-deep-coverage.ts";
import { nfeAuditSources } from "./nfe-audit.ts";
import { legalReferences } from "./legal-reference-catalog.ts";
import { coverageSources, normativeMonitorSources } from "./national-tax-coverage.ts";
import { pisCofinsDeepSources } from "./pis-cofins-deep.ts";
import { serviceWithholdingSources } from "./service-withholdings-deep.ts";
import { simplesNationalSources } from "./simples-national-deep.ts";
import { stAutoPartsPrioritySources } from "./st-auto-parts-priority-batch.ts";
import { stAutoPartsHighUseSources } from "./st-auto-parts-high-use-corridors.ts";
import { ST_CEMENT_PRODUCT_SOURCE, ST_CEMENT_PROTOCOL_SOURCE } from "./st-cement-sp-routes.ts";
import { stCementPrioritySources } from "./st-cement-priority-batch.ts";
import { stColdBeverageSources } from "./st-cold-beverages-priority.ts";
import { stColdBeverageSpSources } from "./st-cold-beverages-sp-destination.ts";
import { stColdBeverageSpOriginSources } from "./st-cold-beverages-sp-origin.ts";
import { stConstructionElectricalSources } from "./st-construction-electrical-priority.ts";
import { stFoodCleaningPetSources } from "./st-food-cleaning-pet-priority.ts";
import { stPharmaCosmeticsSources } from "./st-pharma-cosmetics-priority.ts";
import { ST_REPRESENTATIVE_PRODUCTS_SOURCE } from "./st-representative-products.ts";
import { ST_MG_ANNEX_VII_SOURCE } from "./st-sp-mg-legal.ts";
import { taxReformSources } from "./tax-reform-impact.ts";
import { taxReformSectorSources } from "./tax-reform-sector-scenarios.ts";

export const OFFICIAL_SOURCE_CERTIFICATION_VERSION = "2026.07.30-v85";
export const OFFICIAL_SOURCE_CERTIFICATION_CHECKED_AT = "2026-07-30";

export type OfficialSourceClass = "primary" | "official_index" | "official_guidance";
export type OfficialSourceCertificationStatus = "confirmed" | "pending" | "unavailable";

export type OfficialSourceInventoryItem = {
  identity: string;
  code: string;
  title: string;
  publisher: string;
  url: string;
  host: string;
  sourceClass: OfficialSourceClass;
  taxes: string[];
  jurisdictions: string[];
  legalDevice: string;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  originalCheckedAt: string | null;
  recertifiedAt: string;
  impactedRuleCodes: string[];
  status: OfficialSourceCertificationStatus;
  pendingReasons: string[];
};

type SourceGroup = {
  sources: readonly unknown[];
  sourceClass: OfficialSourceClass;
  taxes: string[];
  jurisdictions: string[];
  impactedRuleCodes: string[];
};

const groups: SourceGroup[] = [
  { sources: legalReferences, sourceClass: "primary", taxes: ["MULTITRIBUTO"], jurisdictions: ["BR"], impactedRuleCodes: ["LEGAL_REFERENCE_CATALOG"] },
  { sources: Object.values(labSources), sourceClass: "official_guidance", taxes: ["MULTITRIBUTO"], jurisdictions: ["BR"], impactedRuleCodes: ["DETERMINISTIC_TAX_LAB"] },
  { sources: coverageSources, sourceClass: "official_guidance", taxes: ["MULTITRIBUTO"], jurisdictions: ["BR"], impactedRuleCodes: ["NATIONAL_COVERAGE"] },
  { sources: normativeMonitorSources, sourceClass: "official_index", taxes: ["MULTITRIBUTO"], jurisdictions: ["BR"], impactedRuleCodes: ["NORMATIVE_MONITOR"] },
  { sources: icmsGeneralSources, sourceClass: "primary", taxes: ["ICMS"], jurisdictions: ["BR"], impactedRuleCodes: ["ICMS_GENERAL_NATIONAL"] },
  { sources: issDeepSources, sourceClass: "primary", taxes: ["ISS"], jurisdictions: ["BR"], impactedRuleCodes: ["ISS_DEEP"] },
  { sources: simplesNationalSources, sourceClass: "primary", taxes: ["SIMPLES"], jurisdictions: ["BR"], impactedRuleCodes: ["SIMPLES_NATIONAL_DEEP"] },
  { sources: pisCofinsDeepSources, sourceClass: "primary", taxes: ["PIS", "COFINS"], jurisdictions: ["BR"], impactedRuleCodes: ["PIS_COFINS_DEEP"] },
  { sources: ipiTipiDeepSources, sourceClass: "primary", taxes: ["IPI"], jurisdictions: ["BR"], impactedRuleCodes: ["IPI_TIPI_DEEP"] },
  { sources: serviceWithholdingSources, sourceClass: "primary", taxes: ["IRRF", "CSRF", "INSS", "ISS"], jurisdictions: ["BR"], impactedRuleCodes: ["SERVICE_WITHHOLDINGS_DEEP"] },
  { sources: federalPmeSources, sourceClass: "primary", taxes: ["FEDERAIS"], jurisdictions: ["BR"], impactedRuleCodes: ["FEDERAL_PME_COMPLIANCE"] },
  { sources: nfeAuditSources, sourceClass: "official_guidance", taxes: ["DOCUMENTOS"], jurisdictions: ["BR"], impactedRuleCodes: ["NFE_AUDIT"] },
  { sources: fiscalImportOfficialSources, sourceClass: "official_guidance", taxes: ["DOCUMENTOS"], jurisdictions: ["BR"], impactedRuleCodes: ["FISCAL_BATCH_IMPORT"] },
  { sources: taxReformSources, sourceClass: "primary", taxes: ["CBS", "IBS", "ICMS", "ISS"], jurisdictions: ["BR"], impactedRuleCodes: ["RTC_TRANSITION_IMPACT"] },
  { sources: taxReformSectorSources, sourceClass: "primary", taxes: ["CBS", "IBS", "ICMS", "ISS", "PIS", "COFINS", "IPI", "IS"], jurisdictions: ["BR"], impactedRuleCodes: ["RTC_SECTOR_SCENARIOS"] },
  { sources: stAutoPartsPrioritySources, sourceClass: "primary", taxes: ["ICMS_ST"], jurisdictions: ["SP", "BR"], impactedRuleCodes: ["AUTO_PARTS_PRIORITY"] },
  { sources: stAutoPartsHighUseSources, sourceClass: "primary", taxes: ["ICMS_ST"], jurisdictions: ["BR"], impactedRuleCodes: ["AUTO_PARTS_HIGH_USE_CORRIDORS"] },
  { sources: [ST_CEMENT_PROTOCOL_SOURCE, ST_CEMENT_PRODUCT_SOURCE], sourceClass: "primary", taxes: ["ICMS_ST"], jurisdictions: ["BR"], impactedRuleCodes: ["ST_CEMENT_SP_ROUTES"] },
  { sources: stCementPrioritySources, sourceClass: "primary", taxes: ["ICMS_ST"], jurisdictions: ["RJ", "MG", "ES", "PR", "SC"], impactedRuleCodes: ["ST_CEMENT_PRIORITY"] },
  { sources: stColdBeverageSources, sourceClass: "primary", taxes: ["ICMS_ST"], jurisdictions: ["BR"], impactedRuleCodes: ["COLD_BEVERAGES_PRIORITY"] },
  { sources: stColdBeverageSpSources, sourceClass: "primary", taxes: ["ICMS_ST"], jurisdictions: ["SP"], impactedRuleCodes: ["COLD_BEVERAGES_SP_DESTINATION"] },
  { sources: stColdBeverageSpOriginSources, sourceClass: "primary", taxes: ["ICMS_ST"], jurisdictions: ["SP", "MG", "RJ"], impactedRuleCodes: ["COLD_BEVERAGES_SP_ORIGIN"] },
  { sources: stConstructionElectricalSources, sourceClass: "primary", taxes: ["ICMS_ST"], jurisdictions: ["SP", "MG", "RJ"], impactedRuleCodes: ["CONSTRUCTION_ELECTRICAL_PRIORITY"] },
  { sources: stFoodCleaningPetSources, sourceClass: "primary", taxes: ["ICMS_ST"], jurisdictions: ["SP", "MG", "RJ"], impactedRuleCodes: ["FOOD_CLEANING_PET_PRIORITY"] },
  { sources: stPharmaCosmeticsSources, sourceClass: "primary", taxes: ["ICMS_ST"], jurisdictions: ["SP", "MG", "RJ", "PR"], impactedRuleCodes: ["PHARMA_COSMETICS_PRIORITY"] },
  { sources: [ST_REPRESENTATIVE_PRODUCTS_SOURCE], sourceClass: "official_index", taxes: ["ICMS_ST"], jurisdictions: ["BR"], impactedRuleCodes: ["ST_REPRESENTATIVE_PRODUCTS"] },
  { sources: [ST_MG_ANNEX_VII_SOURCE], sourceClass: "primary", taxes: ["ICMS_ST"], jurisdictions: ["MG"], impactedRuleCodes: ["ST_SP_MG_LEGAL"] },
];

const officialHostSuffixes = [
  ".gov.br",
  ".leg.br",
  "gov.br",
  "leg.br",
  "legis.senado.gov.br",
  "nfe.fazenda.gov.br",
];

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function textArray(value: unknown) {
  return Array.isArray(value) ? value.map(text).filter(Boolean) : [];
}

function asRecord(value: unknown) {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function exactDate(value: unknown) {
  const normalized = text(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : null;
}

function sourceHost(url: string) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function isOfficialHost(host: string) {
  return officialHostSuffixes.some((suffix) => host === suffix || host.endsWith(suffix.startsWith(".") ? suffix : `.${suffix}`));
}

function inferredPublisher(record: Record<string, unknown>, host: string) {
  const declared = text(record.publisher) || text(record.issuer);
  if (declared) return declared;
  if (host.includes("confaz")) return "CONFAZ";
  if (host.includes("receita") || host.includes("sped")) return "Receita Federal";
  if (host.includes("nfe.fazenda")) return "Portal Nacional da NF-e";
  if (host.includes("senado")) return "Senado Federal";
  if (host.endsWith(".gov.br")) return "Órgão público emissor";
  return "";
}

function inferredLegalDevice(record: Record<string, unknown>) {
  return text(record.legalReference)
    || text(record.legalDevice)
    || text(record.scope)
    || textArray(record.proves)[0]
    || textArray(record.supports)[0]
    || text(record.title);
}

function sourceClassFor(record: Record<string, unknown>, fallback: OfficialSourceClass): OfficialSourceClass {
  const kind = text(record.kind);
  if (["manual", "official_guidance", "technical_guidance"].includes(kind)) return "official_guidance";
  if (["official_portal", "official_news"].includes(kind)) return "official_index";
  return fallback;
}

function effectiveFromFor(record: Record<string, unknown>) {
  return exactDate(record.effectiveFrom)
    || exactDate(record.publishedAt)
    || exactDate(record.validFrom)
    || exactDate(asRecord(record.period).from);
}

function effectiveToFor(record: Record<string, unknown>) {
  return exactDate(record.effectiveTo)
    || exactDate(record.validTo)
    || exactDate(asRecord(record.period).to);
}

function rawInventory() {
  const entries: OfficialSourceInventoryItem[] = [];
  for (const group of groups) {
    for (const raw of group.sources) {
      const record = asRecord(raw);
      const code = text(record.code);
      const title = text(record.title);
      const url = text(record.url);
      const host = sourceHost(url);
      const sourceClass = sourceClassFor(record, group.sourceClass);
      const legalDevice = inferredLegalDevice(record);
      const originalCheckedAt = exactDate(record.checkedAt);
      const effectiveFrom = effectiveFromFor(record);
      const pendingReasons: string[] = [];
      if (!code || !title) pendingReasons.push("identidade da fonte incompleta");
      if (!url.startsWith("https://")) pendingReasons.push("URL não usa HTTPS");
      if (!isOfficialHost(host)) pendingReasons.push("domínio oficial não reconhecido");
      if (!inferredPublisher(record, host)) pendingReasons.push("órgão emissor ausente");
      if (!legalDevice) pendingReasons.push("dispositivo ou escopo probatório ausente");
      if (!originalCheckedAt) pendingReasons.push("data de consulta ausente");
      if (sourceClass === "primary" && !effectiveFrom) pendingReasons.push("vigência inicial não estruturada");
      if (sourceClass === "official_index") pendingReasons.push("índice oficial não substitui o ato individualizado");
      entries.push({
        identity: `${code}@${url}`,
        code,
        title,
        publisher: inferredPublisher(record, host),
        url,
        host,
        sourceClass,
        taxes: [...group.taxes],
        jurisdictions: [...group.jurisdictions],
        legalDevice,
        effectiveFrom,
        effectiveTo: effectiveToFor(record),
        originalCheckedAt,
        recertifiedAt: OFFICIAL_SOURCE_CERTIFICATION_CHECKED_AT,
        impactedRuleCodes: [...group.impactedRuleCodes],
        status: pendingReasons.length ? "pending" : "confirmed",
        pendingReasons,
      });
    }
  }
  return entries;
}

function mergeValues(left: string[], right: string[]) {
  return Array.from(new Set([...left, ...right])).sort();
}

function sourceClassPriority(value: OfficialSourceClass) {
  return value === "primary" ? 3 : value === "official_guidance" ? 2 : 1;
}

export const officialSourceInventory: OfficialSourceInventoryItem[] = Array.from(
  rawInventory().reduce((map, item) => {
    const existing = map.get(item.identity);
    if (!existing) {
      map.set(item.identity, item);
      return map;
    }
    const richer = sourceClassPriority(item.sourceClass) > sourceClassPriority(existing.sourceClass) ? item : existing;
    const pendingReasons = mergeValues(existing.pendingReasons, item.pendingReasons)
      .filter((reason) => !(reason === "vigência inicial não estruturada" && (existing.effectiveFrom || item.effectiveFrom)));
    map.set(item.identity, {
      ...richer,
      publisher: existing.publisher || item.publisher,
      legalDevice: existing.legalDevice || item.legalDevice,
      effectiveFrom: existing.effectiveFrom || item.effectiveFrom,
      effectiveTo: existing.effectiveTo || item.effectiveTo,
      originalCheckedAt: existing.originalCheckedAt || item.originalCheckedAt,
      taxes: mergeValues(existing.taxes, item.taxes),
      jurisdictions: mergeValues(existing.jurisdictions, item.jurisdictions),
      impactedRuleCodes: mergeValues(existing.impactedRuleCodes, item.impactedRuleCodes),
      pendingReasons,
      status: pendingReasons.length ? "pending" : "confirmed",
    });
    return map;
  }, new Map<string, OfficialSourceInventoryItem>()).values(),
).map((item) => item.code === "ISS-CVL-RISS"
  ? {
      ...item,
      status: "unavailable" as const,
      pendingReasons: mergeValues(item.pendingReasons, ["URL oficial retornou HTTP 404 na recertificação; regra exata permanece bloqueada"]),
    }
  : item
).sort((a, b) => a.code.localeCompare(b.code) || a.url.localeCompare(b.url));

export const officialSourceLiveProbeSnapshot = {
  checkedAt: OFFICIAL_SOURCE_CERTIFICATION_CHECKED_AT,
  uniqueUrls: 285,
  checked: 206,
  pending: 78,
  unavailable: 1,
  unavailableSourceCodes: ["ISS-CVL-RISS"],
  policy: "HTTP 2xx confirma acessibilidade técnica na data; timeout, 403, 429 e 5xx permanecem pendentes; somente 404 e 410 bloqueiam o link como indisponível.",
} as const;

export function officialSourceAffectedRuleReport(items: readonly OfficialSourceInventoryItem[] = officialSourceInventory) {
  const report = new Map<string, { ruleCode: string; sources: number; confirmed: number; pending: number; unavailable: number }>();
  for (const item of items) {
    for (const ruleCode of item.impactedRuleCodes) {
      const current = report.get(ruleCode) ?? { ruleCode, sources: 0, confirmed: 0, pending: 0, unavailable: 0 };
      current.sources += 1;
      current[item.status] += 1;
      report.set(ruleCode, current);
    }
  }
  return Array.from(report.values()).sort((left, right) => left.ruleCode.localeCompare(right.ruleCode));
}

export function officialSourceCertificationMetrics(items: readonly OfficialSourceInventoryItem[] = officialSourceInventory) {
  const status = { confirmed: 0, pending: 0, unavailable: 0 };
  const sourceClass = { primary: 0, official_index: 0, official_guidance: 0 };
  const taxes = new Set<string>();
  const jurisdictions = new Set<string>();
  const impactedRules = new Set<string>();
  const hosts = new Set<string>();
  for (const item of items) {
    status[item.status] += 1;
    sourceClass[item.sourceClass] += 1;
    item.taxes.forEach((value) => taxes.add(value));
    item.jurisdictions.forEach((value) => jurisdictions.add(value));
    item.impactedRuleCodes.forEach((value) => impactedRules.add(value));
    if (item.host) hosts.add(item.host);
  }
  return {
    total: items.length,
    status,
    sourceClass,
    taxes: taxes.size,
    jurisdictions: jurisdictions.size,
    impactedRules: impactedRules.size,
    officialHosts: hosts.size,
  };
}

export function validateOfficialSourceCertification(items: readonly OfficialSourceInventoryItem[] = officialSourceInventory) {
  const errors: string[] = [];
  const identities = new Set<string>();
  for (const item of items) {
    if (identities.has(item.identity)) errors.push(`duplicate_identity:${item.identity}`);
    identities.add(item.identity);
    if (!item.code || !item.title || !item.url || !item.host) errors.push(`missing_identity:${item.identity}`);
    if (item.status === "confirmed" && item.pendingReasons.length) errors.push(`confirmed_with_pending_reason:${item.identity}`);
    if (item.status === "confirmed" && (!item.url.startsWith("https://") || !isOfficialHost(item.host))) errors.push(`confirmed_non_official:${item.identity}`);
    if (!item.legalDevice || !item.publisher || !item.recertifiedAt || !item.impactedRuleCodes.length) errors.push(`missing_governance:${item.identity}`);
  }
  return { passed: errors.length === 0, errors, sources: items.length };
}

export type SourceProbeResult = {
  identity: string;
  code: string;
  url: string;
  status: "checked" | "pending" | "unavailable";
  httpStatus: number | null;
  checkedAt: string;
};

export async function probeOfficialSourceInventory(
  fetcher: (url: string, init: RequestInit) => Promise<Pick<Response, "ok" | "status">>,
  items: readonly OfficialSourceInventoryItem[] = officialSourceInventory,
) {
  const unique = Array.from(new Map(items.map((item) => [item.url, item])).values());
  const results: SourceProbeResult[] = [];
  for (let offset = 0; offset < unique.length; offset += 10) {
    const batch = unique.slice(offset, offset + 10);
    const batchResults = await Promise.all(batch.map(async (item) => {
      try {
        let response = await fetcher(item.url, { method: "HEAD", redirect: "follow" });
        if ([403, 405].includes(response.status)) response = await fetcher(item.url, { method: "GET", redirect: "follow" });
        const status = response.ok
          ? "checked" as const
          : [404, 410].includes(response.status)
            ? "unavailable" as const
            : "pending" as const;
        return {
          identity: item.identity,
          code: item.code,
          url: item.url,
          status,
          httpStatus: response.status,
          checkedAt: OFFICIAL_SOURCE_CERTIFICATION_CHECKED_AT,
        };
      } catch {
        return {
          identity: item.identity,
          code: item.code,
          url: item.url,
          status: "pending" as const,
          httpStatus: null,
          checkedAt: OFFICIAL_SOURCE_CERTIFICATION_CHECKED_AT,
        };
      }
    }));
    results.push(...batchResults);
  }
  return results;
}

export async function hashOfficialSourceCertification(items: readonly OfficialSourceInventoryItem[] = officialSourceInventory) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify({
    version: OFFICIAL_SOURCE_CERTIFICATION_VERSION,
    checkedAt: OFFICIAL_SOURCE_CERTIFICATION_CHECKED_AT,
    items,
  })));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

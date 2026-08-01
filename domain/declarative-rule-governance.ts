import {
  evaluateFiscalReference,
  hashFiscalRuleContent,
  rtc2026ReferenceCases,
  rtc2026TestRule,
  type FiscalRuleDefinition,
} from "./fiscal-rules.ts";

export const DECLARATIVE_RULE_SCHEMA_VERSION = "declarative-fiscal-rule.v1";
export const DECLARATIVE_RULE_PIPELINE_VERSION = "rule-pipeline.v1";

export const allowedFormulaVocabulary = [
  "basis_times_rate_bps",
  "sum_components",
  "subtract_floor_zero",
  "conditional_treatment",
  "literal_bps",
  "never_calculate_net_payable",
] as const;

export type AllowedFormula = typeof allowedFormulaVocabulary[number];
export type DeclarativeRuleStatus = "draft" | "automatically_validated" | "canary" | "active" | "revoked";

export type DeclarativeRuleSource = {
  code: string;
  title: string;
  publisher: string;
  url: string;
  checkedAt: string;
  snapshotHash: string;
};

export type DeclarativeFiscalRule = {
  schemaVersion: typeof DECLARATIVE_RULE_SCHEMA_VERSION;
  pipelineVersion: typeof DECLARATIVE_RULE_PIPELINE_VERSION;
  ruleCode: string;
  version: string;
  tax: string[];
  jurisdiction: { country: "BR"; state: string | null; cityIbgeCode: string | null };
  selector: {
    operationCodes: string[];
    ncm: string[];
    cest: string[];
    serviceItems: string[];
    conditions: string[];
  };
  formulas: AllowedFormula[];
  parameters: Record<string, number | string | boolean | null>;
  effectiveFrom: string;
  effectiveTo: string;
  priority: number;
  continuousTimeline: boolean;
  sources: DeclarativeRuleSource[];
  predecessorHash: string | null;
  payload: FiscalRuleDefinition;
  safetyBoundary: string;
};

export type DeclarativeRuleVersion = {
  definition: DeclarativeFiscalRule;
  contentHash: string;
  status: DeclarativeRuleStatus;
  regressionFingerprint: string | null;
};

const officialHostSuffixes = [".gov.br", ".leg.br", "gov.br", "leg.br"];

function isOfficialUrl(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return url.protocol === "https:" && officialHostSuffixes.some((suffix) => host === suffix || host.endsWith(suffix.startsWith(".") ? suffix : `.${suffix}`));
  } catch {
    return false;
  }
}

function exactDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => [key, canonical(item)]));
  return value;
}

export function canonicalRuleJson(definition: DeclarativeFiscalRule) {
  return JSON.stringify(canonical(definition));
}

export async function sha256RuleValue(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function hashDeclarativeRule(definition: DeclarativeFiscalRule) {
  return sha256RuleValue(canonicalRuleJson(definition));
}

export function declarativeSelectorKey(definition: DeclarativeFiscalRule) {
  return JSON.stringify(canonical({ tax: definition.tax, jurisdiction: definition.jurisdiction, selector: definition.selector, priority: definition.priority }));
}

export function validateDeclarativeRule(definition: DeclarativeFiscalRule, expectedHash?: string) {
  const errors: string[] = [];
  if (definition.schemaVersion !== DECLARATIVE_RULE_SCHEMA_VERSION) errors.push("schema_version_changed");
  if (definition.pipelineVersion !== DECLARATIVE_RULE_PIPELINE_VERSION) errors.push("pipeline_version_changed");
  if (!/^[A-Z0-9][A-Z0-9._-]{2,79}$/.test(definition.ruleCode)) errors.push("invalid_rule_code");
  if (!/^[0-9A-Za-z][0-9A-Za-z._-]{2,63}$/.test(definition.version)) errors.push("invalid_version");
  if (!definition.tax.length || new Set(definition.tax).size !== definition.tax.length) errors.push("invalid_tax_scope");
  if (definition.jurisdiction.country !== "BR") errors.push("invalid_country");
  if (!exactDate(definition.effectiveFrom) || !exactDate(definition.effectiveTo) || definition.effectiveFrom > definition.effectiveTo) errors.push("invalid_effective_period");
  if (!Number.isInteger(definition.priority) || definition.priority < 0 || definition.priority > 10_000) errors.push("invalid_priority");
  if (!definition.formulas.length || definition.formulas.some((formula) => !allowedFormulaVocabulary.includes(formula))) errors.push("formula_outside_allowlist");
  if (!definition.sources.length) errors.push("missing_official_sources");
  for (const source of definition.sources) {
    if (!source.code || !source.title || !source.publisher || !isOfficialUrl(source.url)) errors.push(`invalid_official_source:${source.code || "unknown"}`);
    if (!exactDate(source.checkedAt) || !/^[0-9a-f]{64}$/.test(source.snapshotHash)) errors.push(`invalid_source_evidence:${source.code || "unknown"}`);
  }
  if (definition.predecessorHash !== null && !/^[0-9a-f]{64}$/.test(definition.predecessorHash)) errors.push("invalid_predecessor_hash");
  if (definition.safetyBoundary.length < 40 || !definition.safetyBoundary.includes("não")) errors.push("missing_safety_boundary");
  return { passed: errors.length === 0 && (!expectedHash || /^[0-9a-f]{64}$/.test(expectedHash)), errors };
}

function nextDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

export function validateDeclarativeTimeline(versions: readonly DeclarativeRuleVersion[]) {
  const errors: string[] = [];
  const groups = new Map<string, DeclarativeRuleVersion[]>();
  for (const version of versions.filter((item) => item.status !== "revoked")) {
    const key = declarativeSelectorKey(version.definition);
    groups.set(key, [...(groups.get(key) ?? []), version]);
  }
  for (const group of groups.values()) {
    const ordered = [...group].sort((left, right) => left.definition.effectiveFrom.localeCompare(right.definition.effectiveFrom) || left.definition.priority - right.definition.priority);
    for (let index = 1; index < ordered.length; index += 1) {
      const previous = ordered[index - 1];
      const current = ordered[index];
      if (current.definition.effectiveFrom <= previous.definition.effectiveTo) errors.push(`temporal_overlap:${previous.definition.ruleCode}@${previous.definition.version}:${current.definition.version}`);
      if ((previous.definition.continuousTimeline || current.definition.continuousTimeline) && current.definition.effectiveFrom !== nextDate(previous.definition.effectiveTo)) errors.push(`temporal_gap:${previous.definition.ruleCode}@${previous.definition.version}:${current.definition.version}`);
      if (current.definition.predecessorHash !== previous.contentHash) errors.push(`predecessor_mismatch:${current.definition.ruleCode}@${current.definition.version}`);
    }
  }
  return { passed: errors.length === 0, errors };
}

const nextStatuses: Record<DeclarativeRuleStatus, DeclarativeRuleStatus[]> = {
  draft: ["automatically_validated"],
  automatically_validated: ["canary"],
  canary: ["active"],
  active: ["revoked"],
  revoked: [],
};

export function assessRuleTransition(input: {
  from: DeclarativeRuleStatus;
  to: DeclarativeRuleStatus;
  validationPassed: boolean;
  timelinePassed: boolean;
  checksumMatches: boolean;
  regressionStatus: "passed" | "failed" | "not_run";
}) {
  const blockers: string[] = [];
  if (!nextStatuses[input.from].includes(input.to)) blockers.push(`invalid_transition:${input.from}:${input.to}`);
  if (!input.validationPassed) blockers.push("schema_or_source_validation_failed");
  if (!input.timelinePassed) blockers.push("temporal_validation_failed");
  if (!input.checksumMatches) blockers.push("checksum_mismatch");
  if (["canary", "active"].includes(input.to) && input.regressionStatus !== "passed") blockers.push("regression_not_passed");
  return { allowed: blockers.length === 0, blockers };
}

export function buildAtomicRollbackPlan(active: DeclarativeRuleVersion, target: DeclarativeRuleVersion) {
  const blockers: string[] = [];
  if (active.status !== "active") blockers.push("current_version_not_active");
  if (!['active', 'revoked'].includes(target.status)) blockers.push("rollback_target_never_active");
  if (active.definition.ruleCode !== target.definition.ruleCode) blockers.push("rollback_rule_mismatch");
  if (active.contentHash === target.contentHash) blockers.push("rollback_same_version");
  return {
    allowed: blockers.length === 0,
    blockers,
    operations: blockers.length ? [] : [
      { contentHash: active.contentHash, from: "active" as const, to: "revoked" as const },
      { contentHash: target.contentHash, from: target.status, to: "active" as const },
    ],
  };
}

const canarySourceCodes = ["RFB-RTC-TRANSITION", "RFB-RTC-2026", "LC-214-2025"];

export async function buildRtc2026DeclarativeCanary(): Promise<DeclarativeRuleVersion> {
  const sources = await Promise.all(rtc2026TestRule.sources.map(async (source, index) => ({
    code: canarySourceCodes[index],
    title: source.title,
    publisher: source.publisher,
    url: source.url,
    checkedAt: source.checkedAt,
    snapshotHash: await sha256RuleValue(JSON.stringify(canonical(source))),
  })));
  const definition: DeclarativeFiscalRule = {
    schemaVersion: DECLARATIVE_RULE_SCHEMA_VERSION,
    pipelineVersion: DECLARATIVE_RULE_PIPELINE_VERSION,
    ruleCode: rtc2026TestRule.ruleCode,
    version: "1.0.0-data-canary",
    tax: ["CBS", "IBS"],
    jurisdiction: { country: "BR", state: null, cityIbgeCode: null },
    selector: { operationCodes: ["standard_operations"], ncm: [], cest: [], serviceItems: [], conditions: ["target_year=2026"] },
    formulas: ["basis_times_rate_bps", "sum_components", "conditional_treatment", "never_calculate_net_payable"],
    parameters: { cbsRateBps: 90, ibsRateBps: 10, automaticNetPayableCalculation: false },
    effectiveFrom: "2026-01-01",
    effectiveTo: "2026-12-31",
    priority: 100,
    continuousTimeline: false,
    sources,
    predecessorHash: null,
    payload: rtc2026TestRule,
    safetyBoundary: "Texto jurídico detectado não promove parâmetros; o valor líquido não é calculado automaticamente.",
  };
  return { definition, contentHash: await hashDeclarativeRule(definition), status: "canary", regressionFingerprint: await hashFiscalRuleContent(JSON.stringify(rtc2026ReferenceCases)) };
}

export async function runRtc2026DeclarativeCanary(candidate?: DeclarativeRuleVersion) {
  const version = candidate ?? await buildRtc2026DeclarativeCanary();
  const validation = validateDeclarativeRule(version.definition, version.contentHash);
  const checksumMatches = await hashDeclarativeRule(version.definition) === version.contentHash;
  const cases = rtc2026ReferenceCases.map((referenceCase) => {
    const actual = evaluateFiscalReference(version.definition.payload, referenceCase.input);
    return { code: referenceCase.code, expected: referenceCase.expected, actual, passed: JSON.stringify(actual) === JSON.stringify(referenceCase.expected) };
  });
  return {
    passed: validation.passed && checksumMatches && cases.every((item) => item.passed),
    validation,
    checksumMatches,
    cases,
    resultFingerprint: await sha256RuleValue(JSON.stringify(cases)),
    safety: "Canário paralelo: comprova equivalência do módulo RTC 2026 sem ativar fórmula nova nem promover texto jurídico.",
  };
}

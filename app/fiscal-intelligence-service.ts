import { and, eq, gte, sql } from "drizzle-orm";
import {
  fiscalIntelligenceSeed,
  hashFiscalIntelligenceContent,
  parseFiscalIntelligenceDefinition,
  type FiscalIntelligenceOverrides,
} from "../domain/fiscal-intelligence";
import { ensureScenarioSchema, getDb } from "../db";
import { fiscalIntelligenceMetrics, fiscalKnowledgeBases } from "../db/schema";

const enumFields = {
  tax: ["ICMS", "ISS", "IPI", "PIS_COFINS", "SIMPLES", "IRPJ_CSLL", "IBS_CBS", "WITHHOLDINGS"],
  segment: ["auto_parts", "general_goods", "services", "industry", "general_business"],
  productOrigin: ["domestic", "imported", "unknown"],
  importRuleQualification: ["qualifies", "does_not_qualify", "unknown"],
  issuerTaxRegime: ["normal", "simples", "unknown"],
  recipientTaxpayer: ["yes", "no", "unknown"],
  purpose: ["resale", "industrialization", "use_consumption", "fixed_asset", "unknown"],
  automotiveUse: ["yes", "no", "unknown"],
  specialTreatment: ["none", "exists", "unknown"],
  operationType: ["goods", "service", "import", "export", "mixed", "unknown"],
  businessActivity: ["commerce", "industry", "service", "mixed", "unknown"],
  incomeTaxRegime: ["real", "presumed", "simples", "unknown"],
  pisCofinsRegime: ["cumulative", "non_cumulative", "monophase", "zero_rate", "unknown"],
  payerType: ["private_legal_entity", "public_entity", "individual", "unknown"],
  paymentRecipientType: ["legal_entity", "individual", "unknown"],
  serviceNature: ["professional", "cleaning_maintenance", "labor_assignment", "construction", "general", "unknown"],
} as const;

const states = new Set(["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"]);

export async function loadFiscalKnowledgeBase() {
  await ensureScenarioSchema();
  const [stored] = await getDb().select().from(fiscalKnowledgeBases).where(and(
    eq(fiscalKnowledgeBases.code, fiscalIntelligenceSeed.code),
    eq(fiscalKnowledgeBases.version, fiscalIntelligenceSeed.version),
  )).limit(1);
  if (!stored) throw new Error("fiscal_knowledge_unavailable");
  const computedHash = await hashFiscalIntelligenceContent(stored.contentJson);
  if (computedHash !== stored.contentHash) throw new Error("fiscal_knowledge_integrity_failure");
  return {
    stored,
    definition: parseFiscalIntelligenceDefinition(stored.contentJson),
    fingerprint: computedHash.slice(0, 12),
  };
}

export function parseFiscalOverrides(value: unknown): FiscalIntelligenceOverrides {
  if (value === undefined || value === null) return {};
  if (typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_facts");
  const input = value as Record<string, unknown>;
  const overrides: FiscalIntelligenceOverrides = {};
  for (const field of ["productDescription", "serviceItem", "cnae", "originMunicipality", "destinationMunicipality"] as const) {
    if (input[field] === undefined) continue;
    if (input[field] !== null && typeof input[field] !== "string") throw new Error(`invalid_${field}`);
    const maximum = field === "productDescription" ? 120 : field.includes("Municipality") ? 80 : 20;
    overrides[field] = typeof input[field] === "string" ? input[field].trim().slice(0, maximum) || null : null;
  }
  for (const field of ["ncm", "cest"] as const) {
    if (input[field] === undefined) continue;
    if (input[field] !== null && typeof input[field] !== "string") throw new Error(`invalid_${field}`);
    overrides[field] = typeof input[field] === "string" ? input[field].slice(0, 20) : null;
  }
  if (input.referenceDate !== undefined) {
    if (typeof input.referenceDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(input.referenceDate)) throw new Error("invalid_referenceDate");
    const parsed = new Date(`${input.referenceDate}T12:00:00Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== input.referenceDate) throw new Error("invalid_referenceDate");
    overrides.referenceDate = input.referenceDate;
  }
  for (const [field, allowed] of Object.entries(enumFields)) {
    const current = input[field];
    if (current === undefined) continue;
    if (typeof current !== "string" || !(allowed as readonly string[]).includes(current)) throw new Error(`invalid_${field}`);
    (overrides as Record<string, unknown>)[field] = current;
  }
  for (const field of ["originState", "destinationState"] as const) {
    const current = input[field];
    if (current === undefined) continue;
    if (current !== null && (typeof current !== "string" || !states.has(current.toUpperCase()))) throw new Error(`invalid_${field}`);
    overrides[field] = typeof current === "string" ? current.toUpperCase() : null;
  }
  return overrides;
}

export type FiscalIntelligenceMetricInput = {
  workspaceId: number;
  actorUserId: number;
  eventType: "completed" | "rejected" | "failed";
  outcome: string;
  coverageStatus: "supported" | "partial" | "not_supported" | "unknown";
  topicCode?: string | null;
  baseVersion?: string | null;
  durationMs: number;
  questionLengthBucket: "unknown" | "short" | "medium" | "long";
  factCount?: number;
  sourceCount?: number;
  clarificationCount?: number;
  errorCode?: string | null;
};

export async function recordFiscalIntelligenceMetric(input: FiscalIntelligenceMetricInput) {
  await ensureScenarioSchema();
  await getDb().insert(fiscalIntelligenceMetrics).values({
    workspaceId: input.workspaceId,
    actorUserId: input.actorUserId,
    eventType: input.eventType,
    outcome: input.outcome.slice(0, 40),
    coverageStatus: input.coverageStatus,
    topicCode: input.topicCode?.slice(0, 80) ?? null,
    baseVersion: input.baseVersion?.slice(0, 40) ?? null,
    durationMs: Math.max(0, Math.min(120_000, Math.round(input.durationMs))),
    questionLengthBucket: input.questionLengthBucket,
    factCount: Math.max(0, Math.min(40, Math.round(input.factCount ?? 0))),
    sourceCount: Math.max(0, Math.min(500, Math.round(input.sourceCount ?? 0))),
    clarificationCount: Math.max(0, Math.min(40, Math.round(input.clarificationCount ?? 0))),
    errorCode: input.errorCode?.slice(0, 80) ?? null,
  });
}

export async function loadFiscalIntelligenceObservability(workspaceId: number, now = Date.now()) {
  await ensureScenarioSchema();
  const since = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
  const [row] = await getDb().select({
    measuredQueries: sql<number>`coalesce(sum(case when ${fiscalIntelligenceMetrics.eventType} = 'completed' then 1 else 0 end), 0)`,
    averageDurationMs: sql<number>`coalesce(cast(avg(case when ${fiscalIntelligenceMetrics.eventType} = 'completed' then ${fiscalIntelligenceMetrics.durationMs} end) as integer), 0)`,
    maximumDurationMs: sql<number>`coalesce(max(case when ${fiscalIntelligenceMetrics.eventType} = 'completed' then ${fiscalIntelligenceMetrics.durationMs} end), 0)`,
    failedQueries: sql<number>`coalesce(sum(case when ${fiscalIntelligenceMetrics.eventType} = 'failed' then 1 else 0 end), 0)`,
    rejectedQueries: sql<number>`coalesce(sum(case when ${fiscalIntelligenceMetrics.eventType} = 'rejected' then 1 else 0 end), 0)`,
    withoutCoverage: sql<number>`coalesce(sum(case when ${fiscalIntelligenceMetrics.eventType} = 'completed' and ${fiscalIntelligenceMetrics.coverageStatus} = 'not_supported' then 1 else 0 end), 0)`,
    partialCoverage: sql<number>`coalesce(sum(case when ${fiscalIntelligenceMetrics.eventType} = 'completed' and ${fiscalIntelligenceMetrics.coverageStatus} = 'partial' then 1 else 0 end), 0)`,
    supportedCoverage: sql<number>`coalesce(sum(case when ${fiscalIntelligenceMetrics.eventType} = 'completed' and ${fiscalIntelligenceMetrics.coverageStatus} = 'supported' then 1 else 0 end), 0)`,
    lastMeasuredAt: sql<string | null>`max(${fiscalIntelligenceMetrics.createdAt})`,
  }).from(fiscalIntelligenceMetrics).where(and(
    eq(fiscalIntelligenceMetrics.workspaceId, workspaceId),
    gte(fiscalIntelligenceMetrics.createdAt, since),
  ));
  return {
    windowDays: 30,
    measuredQueries: Number(row?.measuredQueries ?? 0),
    averageDurationMs: Number(row?.averageDurationMs ?? 0),
    maximumDurationMs: Number(row?.maximumDurationMs ?? 0),
    failedQueries: Number(row?.failedQueries ?? 0),
    rejectedQueries: Number(row?.rejectedQueries ?? 0),
    withoutCoverage: Number(row?.withoutCoverage ?? 0),
    partialCoverage: Number(row?.partialCoverage ?? 0),
    supportedCoverage: Number(row?.supportedCoverage ?? 0),
    lastMeasuredAt: row?.lastMeasuredAt ?? null,
    dataPolicy: "Somente métricas técnicas agregáveis; perguntas e fatos fiscais não são armazenados.",
  };
}

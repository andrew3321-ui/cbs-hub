import { and, eq } from "drizzle-orm";
import {
  fiscalIntelligenceSeed,
  hashFiscalIntelligenceContent,
  parseFiscalIntelligenceDefinition,
  type FiscalIntelligenceOverrides,
} from "../domain/fiscal-intelligence";
import { ensureScenarioSchema, getDb } from "../db";
import { fiscalKnowledgeBases } from "../db/schema";

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

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
  productOrigin: ["domestic", "imported", "unknown"],
  importRuleQualification: ["qualifies", "does_not_qualify", "unknown"],
  issuerTaxRegime: ["normal", "simples", "unknown"],
  recipientTaxpayer: ["yes", "no", "unknown"],
  purpose: ["resale", "industrialization", "use_consumption", "fixed_asset", "unknown"],
  automotiveUse: ["yes", "no", "unknown"],
  specialTreatment: ["none", "exists", "unknown"],
} as const;

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
  if (input.productDescription !== undefined) {
    if (input.productDescription !== null && typeof input.productDescription !== "string") throw new Error("invalid_product_description");
    overrides.productDescription = typeof input.productDescription === "string" ? input.productDescription.trim().slice(0, 120) || null : null;
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
  return overrides;
}


import { and, eq } from "drizzle-orm";
import {
  evaluateFiscalQuestion,
  fiscalIntelligenceSeed,
  hashFiscalIntelligenceContent,
  parseFiscalIntelligenceDefinition,
  type FiscalIntelligenceOverrides,
} from "../../../domain/fiscal-intelligence";
import { ensureScenarioSchema, getDb } from "../../../db";
import { fiscalKnowledgeBases } from "../../../db/schema";
import { withApiTelemetry } from "../../api-infrastructure";
import { getCurrentUser } from "../../auth";

const enumFields = {
  productOrigin: ["domestic", "imported", "unknown"],
  importRuleQualification: ["qualifies", "does_not_qualify", "unknown"],
  issuerTaxRegime: ["normal", "simples", "unknown"],
  recipientTaxpayer: ["yes", "no", "unknown"],
  purpose: ["resale", "industrialization", "use_consumption", "fixed_asset", "unknown"],
  automotiveUse: ["yes", "no", "unknown"],
  specialTreatment: ["none", "exists", "unknown"],
} as const;

async function loadKnowledgeBase() {
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

function parseOverrides(value: unknown): FiscalIntelligenceOverrides {
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

async function getFiscalIntelligence() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para consultar a inteligência fiscal." }, { status: 401 });
  try {
    const { stored, definition, fingerprint } = await loadKnowledgeBase();
    return Response.json({
      knowledge: {
        code: stored.code,
        version: stored.version,
        name: stored.name,
        status: stored.status,
        scope: stored.scope,
        assuranceLevel: definition.assuranceLevel,
        engineVersion: definition.engineVersion,
        fingerprint,
        checkedAt: stored.checkedAt,
        sourceCount: stored.sourceCount,
        ruleCount: definition.rules.length,
        classificationCount: definition.productClassifications.length,
      },
      coverage: definition.coverage,
      sources: definition.sources,
      limitations: definition.limitations,
      examples: [
        "Qual a alíquota de ICMS para autopeças de SP para MG?",
        "Venda para revenda de peça nacional NCM 8708 e CEST 01.075.00, de SP para MG",
        "Autopeça importada de SP para MG com conteúdo de importação acima de 40%",
      ],
    }, { headers: { "Cache-Control": "private, max-age=60" } });
  } catch {
    return Response.json({ error: "A base manual não passou na verificação de integridade." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

async function searchFiscalIntelligence(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para consultar a inteligência fiscal." }, { status: 401 });
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Envie uma pergunta fiscal válida." }, { status: 400 });
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return Response.json({ error: "Envie uma pergunta fiscal válida." }, { status: 400 });
  const { question, facts } = payload as { question?: unknown; facts?: unknown };
  if (typeof question !== "string" || question.trim().length < 5 || question.length > 500) return Response.json({ error: "A pergunta deve ter entre 5 e 500 caracteres." }, { status: 400 });
  let overrides: FiscalIntelligenceOverrides;
  try {
    overrides = parseOverrides(facts);
  } catch {
    return Response.json({ error: "Revise os dados complementares da operação." }, { status: 400 });
  }
  try {
    const { stored, definition, fingerprint } = await loadKnowledgeBase();
    const referenceDate = new Date().toISOString().slice(0, 10);
    const result = evaluateFiscalQuestion(question.trim(), overrides, referenceDate, definition);
    return Response.json({
      result,
      knowledge: { code: stored.code, version: stored.version, status: stored.status, fingerprint, checkedAt: stored.checkedAt },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "A consulta foi interrompida porque a base não passou em todos os controles." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

export const GET = withApiTelemetry("GET /api/fiscal-intelligence", getFiscalIntelligence);
export const POST = withApiTelemetry("POST /api/fiscal-intelligence", searchFiscalIntelligence);

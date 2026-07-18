import {
  type FiscalIntelligenceOverrides,
} from "../../../domain/fiscal-intelligence";
import { evaluateExpandedFiscalQuestion, fiscalTopicCatalog } from "../../../domain/fiscal-intelligence-v24";
import { withApiTelemetry } from "../../api-infrastructure";
import { getCurrentUser } from "../../auth";
import { loadFiscalKnowledgeBase, parseFiscalOverrides } from "../../fiscal-intelligence-service";
import { withWorkspaceFeature } from "../../plan-entitlements";

async function getFiscalIntelligence() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para consultar a inteligência fiscal." }, { status: 401 });
  try {
    const { stored, definition, fingerprint } = await loadFiscalKnowledgeBase();
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
        topicCount: definition.nationalTopics.length,
      },
      coverage: definition.coverage,
      topics: fiscalTopicCatalog(definition),
      sources: definition.sources,
      limitations: definition.limitations,
      examples: [
        "Qual a alíquota de ICMS para autopeças de SP para MG?",
        "Qual o ICMS de mercadoria nacional de SP para BA?",
        "Onde é devido o ISS de consultoria prestada de Campinas para Belo Horizonte?",
        "Qual a alíquota de PIS e Cofins no regime cumulativo?",
        "Como destacar IBS e CBS em 2026?",
        "Consultoria entre duas empresas tem retenção de PIS, Cofins e CSLL?",
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
    overrides = parseFiscalOverrides(facts);
  } catch {
    return Response.json({ error: "Revise os dados complementares da operação." }, { status: 400 });
  }
  try {
    const { stored, definition, fingerprint } = await loadFiscalKnowledgeBase();
    const referenceDate = new Date().toISOString().slice(0, 10);
    const result = evaluateExpandedFiscalQuestion(question.trim(), overrides, referenceDate, definition);
    return Response.json({
      result,
      knowledge: { code: stored.code, version: stored.version, status: stored.status, fingerprint, checkedAt: stored.checkedAt },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "A consulta foi interrompida porque a base não passou em todos os controles." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

export const GET = withApiTelemetry("GET /api/fiscal-intelligence", withWorkspaceFeature("fiscalIntelligenceEnabled", getFiscalIntelligence));
export const POST = withApiTelemetry("POST /api/fiscal-intelligence", withWorkspaceFeature("fiscalIntelligenceEnabled", searchFiscalIntelligence));

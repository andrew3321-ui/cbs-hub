import { parseFiscalCalculationInputs, calculateFiscalMemory } from "../../../../domain/fiscal-dossier";
import {
  fiscalIntelligenceSeed,
  hashFiscalIntelligenceContent,
  parseFiscalIntelligenceDefinition,
  type FiscalIntelligenceOverrides,
} from "../../../../domain/fiscal-intelligence";
import { evaluateExpandedFiscalQuestion, fiscalTopicCatalog } from "../../../../domain/fiscal-intelligence-v24";
import { withApiTelemetry } from "../../../api-infrastructure";
import { loadFiscalKnowledgeBase, parseFiscalOverrides } from "../../../fiscal-intelligence-service";

const publicHeaders = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
};

async function loadPublicKnowledgeBase() {
  try {
    return await loadFiscalKnowledgeBase();
  } catch (error) {
    const fingerprint = await hashFiscalIntelligenceContent(fiscalIntelligenceSeed.contentJson);
    console.warn(JSON.stringify({
      event: "public_fiscal_intelligence.compiled_base_used",
      reason: error instanceof Error ? error.message : "unknown_error",
      version: fiscalIntelligenceSeed.version,
    }));
    return {
      stored: fiscalIntelligenceSeed,
      definition: parseFiscalIntelligenceDefinition(fiscalIntelligenceSeed.contentJson),
      fingerprint: fingerprint.slice(0, 12),
    };
  }
}

async function getPublicFiscalIntelligence() {
  try {
    const { stored, definition, fingerprint } = await loadPublicKnowledgeBase();
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
      topics: fiscalTopicCatalog(definition),
      sources: definition.sources,
      examples: [
        "Qual a alíquota de ICMS para autopeças de SP para MG?",
        "Onde é devido o ISS de consultoria prestada de Campinas para Belo Horizonte?",
        "Qual a alíquota de PIS e Cofins no regime cumulativo?",
        "Como destacar IBS e CBS em 2026?",
      ],
    }, { headers: publicHeaders });
  } catch (error) {
    console.error(JSON.stringify({
      event: "public_fiscal_intelligence.knowledge_unavailable",
      error: error instanceof Error ? error.message : "unknown_error",
    }));
    return Response.json({ error: "A base fiscal pública não passou na verificação de integridade." }, { status: 503, headers: publicHeaders });
  }
}

async function postPublicFiscalIntelligence(request: Request) {
  const payload = await request.json().catch(() => null) as {
    question?: unknown;
    facts?: unknown;
    calculation?: unknown;
  } | null;
  const question = typeof payload?.question === "string" ? payload.question.trim() : "";
  if (question.length < 5 || question.length > 500) {
    return Response.json({ error: "Descreva uma operação com 5 a 500 caracteres." }, { status: 400, headers: publicHeaders });
  }

  let facts: FiscalIntelligenceOverrides;
  try {
    facts = parseFiscalOverrides(payload?.facts);
  } catch {
    return Response.json({ error: "Revise os dados complementares da operação." }, { status: 400, headers: publicHeaders });
  }

  try {
    const { stored, definition, fingerprint } = await loadPublicKnowledgeBase();
    const referenceDate = facts.referenceDate ?? new Date().toISOString().slice(0, 10);
    const result = evaluateExpandedFiscalQuestion(question, facts, referenceDate, definition);
    let calculation = null;
    if (payload?.calculation !== undefined) {
      try {
        calculation = calculateFiscalMemory(result, parseFiscalCalculationInputs(payload.calculation));
      } catch {
        return Response.json({ error: "Revise os valores e percentuais da memória de cálculo." }, { status: 400, headers: publicHeaders });
      }
    }

    console.info(JSON.stringify({
      event: "public_fiscal_intelligence.completed",
      topicCode: result.topicCode,
      status: result.status,
      completeness: result.completeness.percentage,
      calculationStatus: calculation?.status ?? null,
    }));

    return Response.json({
      result,
      calculation,
      knowledge: { fingerprint, checkedAt: stored.checkedAt, version: stored.version },
    }, { headers: publicHeaders });
  } catch (error) {
    console.error(JSON.stringify({
      event: "public_fiscal_intelligence.analysis_unavailable",
      error: error instanceof Error ? error.message : "unknown_error",
    }));
    return Response.json({ error: "A análise foi interrompida porque a base não passou em todos os controles." }, { status: 503, headers: publicHeaders });
  }
}

export const GET = withApiTelemetry("GET /api/public/fiscal-intelligence", getPublicFiscalIntelligence);
export const POST = withApiTelemetry("POST /api/public/fiscal-intelligence", postPublicFiscalIntelligence);

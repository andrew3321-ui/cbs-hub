import {
  type FiscalIntelligenceOverrides,
} from "../../../domain/fiscal-intelligence";
import { evaluateExpandedFiscalQuestion, fiscalTopicCatalog } from "../../../domain/fiscal-intelligence-v24";
import { withApiTelemetry } from "../../api-infrastructure";
import { getCurrentUser } from "../../auth";
import {
  loadFiscalIntelligenceObservability,
  loadFiscalKnowledgeBase,
  parseFiscalOverrides,
  recordFiscalIntelligenceMetric,
  type FiscalIntelligenceMetricInput,
} from "../../fiscal-intelligence-service";
import { withWorkspaceFeature } from "../../plan-entitlements";
import { getWorkspaceContext } from "../../workspace";
import { recordIntelligenceCoverageDemand } from "../../coverage-demand-service";

function questionLengthBucket(length: number): FiscalIntelligenceMetricInput["questionLengthBucket"] {
  if (!length) return "unknown";
  if (length < 60) return "short";
  if (length < 180) return "medium";
  return "long";
}

async function recordSearchMetric(input: FiscalIntelligenceMetricInput) {
  try {
    await recordFiscalIntelligenceMetric(input);
    console.info(JSON.stringify({
      event: "fiscal_intelligence.search",
      workspaceId: input.workspaceId,
      eventType: input.eventType,
      outcome: input.outcome,
      coverageStatus: input.coverageStatus,
      topicCode: input.topicCode ?? null,
      durationMs: input.durationMs,
      errorCode: input.errorCode ?? null,
    }));
  } catch (error) {
    console.warn(JSON.stringify({
      event: "fiscal_intelligence.metric_failed",
      workspaceId: input.workspaceId,
      error: error instanceof Error ? error.name : "UnknownError",
    }));
  }
}

async function getFiscalIntelligence() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para consultar a inteligência fiscal." }, { status: 401 });
  const workspace = await getWorkspaceContext(user.id);
  if (!workspace) return Response.json({ error: "Espaço profissional não encontrado." }, { status: 403 });
  try {
    const { stored, definition, fingerprint } = await loadFiscalKnowledgeBase();
    const observability = await loadFiscalIntelligenceObservability(workspace.id).catch(() => null);
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
      observability,
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
  const startedAt = Date.now();
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para consultar a inteligência fiscal." }, { status: 401 });
  const workspace = await getWorkspaceContext(user.id);
  if (!workspace) return Response.json({ error: "Espaço profissional não encontrado." }, { status: 403 });
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    await recordSearchMetric({
      workspaceId: workspace.id, actorUserId: user.id, eventType: "rejected", outcome: "invalid_json",
      coverageStatus: "unknown", durationMs: Date.now() - startedAt, questionLengthBucket: "unknown", errorCode: "INVALID_JSON",
    });
    return Response.json({ error: "Envie uma pergunta fiscal válida." }, { status: 400 });
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    await recordSearchMetric({
      workspaceId: workspace.id, actorUserId: user.id, eventType: "rejected", outcome: "invalid_payload",
      coverageStatus: "unknown", durationMs: Date.now() - startedAt, questionLengthBucket: "unknown", errorCode: "INVALID_PAYLOAD",
    });
    return Response.json({ error: "Envie uma pergunta fiscal válida." }, { status: 400 });
  }
  const { question, facts } = payload as { question?: unknown; facts?: unknown };
  const questionBucket = questionLengthBucket(typeof question === "string" ? question.length : 0);
  if (typeof question !== "string" || question.trim().length < 5 || question.length > 500) {
    await recordSearchMetric({
      workspaceId: workspace.id, actorUserId: user.id, eventType: "rejected", outcome: "invalid_question",
      coverageStatus: "unknown", durationMs: Date.now() - startedAt, questionLengthBucket: questionBucket, errorCode: "INVALID_QUESTION",
    });
    return Response.json({ error: "A pergunta deve ter entre 5 e 500 caracteres." }, { status: 400 });
  }
  let overrides: FiscalIntelligenceOverrides;
  try {
    overrides = parseFiscalOverrides(facts);
  } catch {
    await recordSearchMetric({
      workspaceId: workspace.id, actorUserId: user.id, eventType: "rejected", outcome: "invalid_facts",
      coverageStatus: "unknown", durationMs: Date.now() - startedAt, questionLengthBucket: questionBucket, errorCode: "INVALID_FACTS",
    });
    return Response.json({ error: "Revise os dados complementares da operação." }, { status: 400 });
  }
  try {
    const { stored, definition, fingerprint } = await loadFiscalKnowledgeBase();
    const referenceDate = overrides.referenceDate ?? new Date().toISOString().slice(0, 10);
    const result = evaluateExpandedFiscalQuestion(question.trim(), overrides, referenceDate, definition);
    const coverageStatus = result.status === "out_of_scope" || result.topicCode === "TOPIC-ROUTER"
      ? "not_supported"
      : result.calculationEligible
        ? "supported"
        : "partial";
    await recordSearchMetric({
      workspaceId: workspace.id,
      actorUserId: user.id,
      eventType: "completed",
      outcome: result.status,
      coverageStatus,
      topicCode: result.topicCode,
      baseVersion: result.baseVersion,
      durationMs: Date.now() - startedAt,
      questionLengthBucket: questionBucket,
      factCount: Object.keys(overrides).length,
      sourceCount: result.sources.length,
      clarificationCount: result.clarifications.length,
    });
    await recordIntelligenceCoverageDemand({ workspaceId: workspace.id, topicCode: result.topicCode, facts: overrides, outcome: coverageStatus }).catch((error) => {
      console.warn(JSON.stringify({ event: "coverage_demand.signal_failed", surface: "fiscal_intelligence", error: error instanceof Error ? error.name : "UnknownError" }));
    });
    return Response.json({
      result,
      knowledge: { code: stored.code, version: stored.version, status: stored.status, fingerprint, checkedAt: stored.checkedAt },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    await recordSearchMetric({
      workspaceId: workspace.id,
      actorUserId: user.id,
      eventType: "failed",
      outcome: "control_failure",
      coverageStatus: "unknown",
      durationMs: Date.now() - startedAt,
      questionLengthBucket: questionBucket,
      factCount: Object.keys(overrides).length,
      errorCode: error instanceof Error ? error.name.toUpperCase().slice(0, 80) : "UNKNOWN_ERROR",
    });
    return Response.json({ error: "A consulta foi interrompida porque a base não passou em todos os controles." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

export const GET = withApiTelemetry("GET /api/fiscal-intelligence", withWorkspaceFeature("fiscalIntelligenceEnabled", getFiscalIntelligence));
export const POST = withApiTelemetry("POST /api/fiscal-intelligence", withWorkspaceFeature("fiscalIntelligenceEnabled", searchFiscalIntelligence));

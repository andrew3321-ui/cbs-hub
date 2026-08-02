import { evaluateExpandedFiscalQuestion } from "../../../../domain/fiscal-intelligence-v24";
import { withApiTelemetry } from "../../../api-infrastructure";
import { loadFiscalKnowledgeBase } from "../../../fiscal-intelligence-service";

function previewStatus(result: ReturnType<typeof evaluateExpandedFiscalQuestion>) {
  if (result.status === "out_of_scope" || result.topicCode === "TOPIC-ROUTER") {
    return { code: "not_supported", label: "Recorte ainda não identificado" } as const;
  }
  if (result.calculationEligible) return { code: "supported", label: "Recorte reconhecido" } as const;
  return { code: "partial", label: "Operação reconhecida · complete os fatos" } as const;
}

async function fiscalPreview(request: Request) {
  const payload = await request.json().catch(() => null) as { question?: unknown } | null;
  const question = typeof payload?.question === "string" ? payload.question.trim() : "";
  if (question.length < 5 || question.length > 500) {
    return Response.json(
      { error: "Descreva uma dúvida fiscal com 5 a 500 caracteres." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const { stored, definition, fingerprint } = await loadFiscalKnowledgeBase();
  const result = evaluateExpandedFiscalQuestion(question, {}, new Date().toISOString().slice(0, 10), definition);
  const status = previewStatus(result);
  const identifiedFacts = result.factViews
    .filter((fact) => fact.source === "question" && !/não (?:identificado|informado)/i.test(fact.value))
    .slice(0, 6)
    .map(({ key, label, value }) => ({ key, label, value }));
  const pendingFacts = result.clarifications.slice(0, 3).map(({ field, question: prompt }) => ({ field, prompt }));
  const finding = result.findings[0]
    ? {
        label: result.findings[0].label,
        value: result.findings[0].value,
        detail: result.findings[0].detail,
      }
    : null;
  const source = result.sources.find((item) => item.primary) ?? result.sources[0] ?? null;

  console.info(JSON.stringify({
    event: "public_fiscal_preview.completed",
    topicCode: result.topicCode,
    status: status.code,
    completeness: result.completeness.percentage,
    identifiedFactCount: identifiedFacts.length,
    pendingFactCount: result.clarifications.length,
  }));

  return Response.json({
    preview: {
      status,
      topicCode: result.topicCode,
      headline: result.headline,
      summary: result.summary,
      completeness: result.completeness,
      identifiedFacts,
      pendingFacts,
      pendingFactCount: result.clarifications.length,
      finding,
      source: source ? {
        title: source.title,
        publisher: source.publisher,
        url: source.url,
        legalReference: source.legalReference,
        checkedAt: source.checkedAt,
      } : null,
      knowledge: {
        version: stored.version,
        fingerprint: fingerprint.slice(0, 12),
        checkedAt: stored.checkedAt,
      },
      limitation: "Esta é uma prévia de triagem. A conclusão e a memória completa dependem dos fatos confirmados dentro da conta.",
    },
  }, { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } });
}

export const POST = withApiTelemetry("POST /api/public/fiscal-preview", fiscalPreview);

import { env } from "cloudflare:workers";
import { withApiTelemetry } from "../../../api-infrastructure";
import { createFiscalImpactRun, getFiscalImpactDashboard, reconcileFiscalImpactRun, rollbackFiscalImpactRun } from "../../../fiscal-impact-graph-service";
import { getPlatformAdminUser } from "../../../platform-admin";

function cleanId(value: unknown, maximum = 160) {
  const text = typeof value === "string" ? value.trim().slice(0, maximum) : "";
  return /^[A-Za-z0-9:._-]+$/.test(text) ? text : null;
}

async function readImpact(request: Request) {
  const admin = await getPlatformAdminUser();
  if (!admin) return Response.json({ error: "Área restrita ao administrador da plataforma." }, { status: 403 });
  const changeEventId = cleanId(new URL(request.url).searchParams.get("changeEventId"));
  return Response.json(await getFiscalImpactDashboard(env.DB, changeEventId), { headers: { "Cache-Control": "no-store" } });
}

async function mutateImpact(request: Request) {
  const admin = await getPlatformAdminUser();
  if (!admin) return Response.json({ error: "Área restrita ao administrador da plataforma." }, { status: 403 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const action = String(body.action ?? "");
    const changeEventId = cleanId(body.changeEventId);
    if (!changeEventId) return Response.json({ error: "Mudança normativa inválida." }, { status: 400 });
    if (action === "index") {
      const change = await env.DB.prepare("SELECT source_code, impacted_rule_codes_json, detected_at FROM normative_change_events WHERE id = ? LIMIT 1").bind(changeEventId).first<{ source_code: string; impacted_rule_codes_json: string; detected_at: string }>();
      const audit = await env.DB.prepare("SELECT event_data FROM normative_governance_audit_events WHERE change_event_id = ? AND event_type = 'fiscal_regression.affected_rules_reexecuted' ORDER BY created_at DESC, id DESC LIMIT 1").bind(changeEventId).first<{ event_data: string }>();
      if (!change || !audit) return Response.json({ error: "A mudança ainda não possui regressão fiscal verificável." }, { status: 409 });
      const impactedRuleCodes = JSON.parse(change.impacted_rule_codes_json) as string[];
      const regressionEvidence = JSON.parse(audit.event_data) as { fingerprint?: string; status?: string };
      if (regressionEvidence.status !== "automatically_verified" || !regressionEvidence.fingerprint || !/^[0-9a-f]{64}$/.test(regressionEvidence.fingerprint)) return Response.json({ error: "A regressão da mudança não permite indexação." }, { status: 409 });
      const result = await createFiscalImpactRun(env.DB, { changeEventId, sourceCode: change.source_code, impactedRuleCodes, regressionFingerprint: regressionEvidence.fingerprint, detectedAt: change.detected_at });
      return Response.json(result, { status: 201, headers: { "Cache-Control": "no-store" } });
    }
    if (action === "reconcile") {
      const releaseId = cleanId(body.releaseId);
      if (!releaseId) return Response.json({ error: "Release de resolução inválida." }, { status: 400 });
      return Response.json(await reconcileFiscalImpactRun(env.DB, changeEventId, releaseId), { headers: { "Cache-Control": "no-store" } });
    }
    if (action === "rollback") {
      const reason = typeof body.reason === "string" ? body.reason.trim().replace(/\s+/g, " ").slice(0, 1000) : "";
      if (reason.length < 20) return Response.json({ error: "Registre o motivo técnico do rollback." }, { status: 400 });
      const result = await rollbackFiscalImpactRun(env.DB, changeEventId, reason, admin.id);
      return Response.json(result, { status: result.status, headers: { "Cache-Control": "no-store" } });
    }
    return Response.json({ error: "Ação de impacto inválida." }, { status: 400 });
  } catch {
    return Response.json({ error: "Não foi possível processar o impacto fiscal." }, { status: 500 });
  }
}

export const GET = withApiTelemetry("GET /api/admin/fiscal-impact", readImpact);
export const POST = withApiTelemetry("POST /api/admin/fiscal-impact", mutateImpact);

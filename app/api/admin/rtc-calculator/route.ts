import { env } from "cloudflare:workers";
import { withApiTelemetry } from "../../../api-infrastructure";
import { getPlatformAdminUser } from "../../../platform-admin";
import {
  captureOfficialRtcCandidate,
  getRtcOfficialCalculatorDashboard,
  promoteOfficialRtcCandidate,
  rollbackOfficialRtcVersion,
} from "../../../rtc-official-calculator-service";

function cleanVersionId(value: unknown) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return /^[A-Za-z0-9:._-]{3,180}$/.test(normalized) ? normalized : null;
}

async function readDashboard() {
  const admin = await getPlatformAdminUser();
  if (!admin) return Response.json({ error: "Área restrita ao administrador da plataforma." }, { status: 403 });
  return Response.json(await getRtcOfficialCalculatorDashboard(env.DB), { headers: { "Cache-Control": "no-store" } });
}

async function mutate(request: Request) {
  const admin = await getPlatformAdminUser();
  if (!admin) return Response.json({ error: "Área restrita ao administrador da plataforma." }, { status: 403 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const action = String(body.action ?? "");
    if (action === "sync") return Response.json(await captureOfficialRtcCandidate(env.DB), { status: 201, headers: { "Cache-Control": "no-store" } });
    if (action === "promote") {
      const versionId = cleanVersionId(body.versionId);
      if (!versionId) return Response.json({ error: "Versão candidata inválida." }, { status: 400 });
      const result = await promoteOfficialRtcCandidate(env.DB, versionId, admin.id);
      return Response.json(result, { status: result.status, headers: { "Cache-Control": "no-store" } });
    }
    if (action === "rollback") {
      const activeId = cleanVersionId(body.activeId);
      const targetId = cleanVersionId(body.targetId);
      if (!activeId || !targetId) return Response.json({ error: "Versões de rollback inválidas." }, { status: 400 });
      const result = await rollbackOfficialRtcVersion(env.DB, activeId, targetId, admin.id);
      return Response.json(result, { status: result.status, headers: { "Cache-Control": "no-store" } });
    }
    return Response.json({ error: "Ação de reconciliação inválida." }, { status: 400 });
  } catch (error) {
    console.error(JSON.stringify({ event: "rtc.official_governance_failed", error: error instanceof Error ? error.name : "UnknownError" }));
    return Response.json({ error: "Não foi possível reconciliar a Calculadora oficial agora." }, { status: 502 });
  }
}

export const GET = withApiTelemetry("GET /api/admin/rtc-calculator", readDashboard);
export const POST = withApiTelemetry("POST /api/admin/rtc-calculator", mutate);

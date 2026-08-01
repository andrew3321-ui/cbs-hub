import { env } from "cloudflare:workers";
import { withApiTelemetry } from "../../../api-infrastructure";
import {
  advanceDeclarativeRule,
  ensureDeclarativeRuleSchema,
  listDeclarativeRules,
  rollbackDeclarativeRule,
  seedRtc2026DeclarativeCanary,
} from "../../../declarative-rule-governance-service";
import { getPlatformAdminUser } from "../../../platform-admin";
import type { DeclarativeRuleStatus } from "../../../../domain/declarative-rule-governance";

const transitionTargets: DeclarativeRuleStatus[] = ["automatically_validated", "canary", "active", "revoked"];

function cleanId(value: unknown) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return /^[A-Za-z0-9:._-]{3,160}$/.test(normalized) ? normalized : null;
}

async function requireAdmin() {
  return getPlatformAdminUser();
}

async function readGovernance() {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Área restrita ao administrador da plataforma." }, { status: 403 });
  await ensureDeclarativeRuleSchema(env.DB);
  await seedRtc2026DeclarativeCanary(env.DB);
  return Response.json(await listDeclarativeRules(env.DB), { headers: { "Cache-Control": "no-store" } });
}

async function mutateGovernance(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Área restrita ao administrador da plataforma." }, { status: 403 });
  try {
    await ensureDeclarativeRuleSchema(env.DB);
    await seedRtc2026DeclarativeCanary(env.DB);
    const body = await request.json() as Record<string, unknown>;
    const action = String(body.action ?? "");
    if (action === "advance") {
      const id = cleanId(body.id);
      const targetStatus = String(body.targetStatus ?? "") as DeclarativeRuleStatus;
      if (!id || !transitionTargets.includes(targetStatus)) return Response.json({ error: "Transição inválida." }, { status: 400 });
      const result = await advanceDeclarativeRule(env.DB, id, targetStatus, admin.id);
      return Response.json(result, { status: result.status, headers: { "Cache-Control": "no-store" } });
    }
    if (action === "rollback") {
      const activeId = cleanId(body.activeId);
      const targetId = cleanId(body.targetId);
      if (!activeId || !targetId) return Response.json({ error: "Versões de rollback inválidas." }, { status: 400 });
      const result = await rollbackDeclarativeRule(env.DB, activeId, targetId, admin.id);
      return Response.json(result, { status: result.status, headers: { "Cache-Control": "no-store" } });
    }
    return Response.json({ error: "Ação de governança inválida." }, { status: 400 });
  } catch {
    return Response.json({ error: "Não foi possível executar a governança declarativa." }, { status: 500 });
  }
}

export const GET = withApiTelemetry("GET /api/admin/declarative-rules", readGovernance);
export const POST = withApiTelemetry("POST /api/admin/declarative-rules", mutateGovernance);

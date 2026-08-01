import { env } from "cloudflare:workers";
import { getNormativeGovernanceDashboard } from "../../normative-governance-service";
import { withApiTelemetry } from "../../api-infrastructure";
import { getCurrentUser } from "../../auth";
import { isPlatformAdminEmail } from "../../platform-admin";
import { withWorkspaceFeature } from "../../plan-entitlements";
import { getWorkspaceContext } from "../../workspace";

const DAILY_SHARDS = 4;
const MONITOR_SAFETY_POLICY = "Nunca altera regra ou cálculo automaticamente; apenas registra evidência, sinaliza mudança e abre revisão.";

async function monitor() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para acessar o monitor normativo." }, { status: 401 });
  const workspace = await getWorkspaceContext(user.id);
  if (!workspace) return Response.json({ error: "Espaço contábil não encontrado." }, { status: 403 });

  const dashboard = await getNormativeGovernanceDashboard(env.DB, workspace.id);
  const limit = (count: number) => dashboard.runs.slice(0, count);
  return Response.json({
    ...dashboard,
    runs: limit(14),
    dailyShards: DAILY_SHARDS,
    monitorSafetyPolicy: MONITOR_SAFETY_POLICY,
    canReviewNormativeChanges: isPlatformAdminEmail(user.email),
  }, { headers: { "Cache-Control": "no-store" } });
}

export const GET = withApiTelemetry("GET /api/normative-monitor", withWorkspaceFeature("fiscalExpansionEnabled", monitor));

import { env } from "cloudflare:workers";
import { getNormativeGovernanceDashboard } from "../../normative-governance-service";
import { withApiTelemetry } from "../../api-infrastructure";
import { getCurrentUser } from "../../auth";
import { isPlatformAdminEmail } from "../../platform-admin";
import { withWorkspaceFeature } from "../../plan-entitlements";
import { getWorkspaceContext } from "../../workspace";
import { NORMATIVE_MONITOR_SHARD_COUNT } from "../../../domain/normative-governance";
import { getFiscalFreshnessDashboard } from "../../fiscal-freshness-service";

const MONITOR_SAFETY_POLICY = "Nunca altera regra ou cálculo automaticamente; apenas registra evidência, sinaliza mudança e abre revisão.";

async function monitor() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para acessar o monitor normativo." }, { status: 401 });
  const workspace = await getWorkspaceContext(user.id);
  if (!workspace) return Response.json({ error: "Espaço contábil não encontrado." }, { status: 403 });

  const [dashboard, freshnessDashboard] = await Promise.all([
    getNormativeGovernanceDashboard(env.DB, workspace.id),
    getFiscalFreshnessDashboard(env.DB),
  ]);
  const canReviewNormativeChanges = isPlatformAdminEmail(user.email);
  const freshness = canReviewNormativeChanges ? freshnessDashboard : {
    version: freshnessDashboard.version,
    generatedAt: freshnessDashboard.generatedAt,
    sla: freshnessDashboard.sla,
    metrics: freshnessDashboard.metrics,
    sources: freshnessDashboard.sources,
    impactedRules: freshnessDashboard.impactedRules,
    timing: freshnessDashboard.timing,
    policy: freshnessDashboard.policy,
    observations: [], alerts: [], summaries: [], incidents: [], releases: [],
  };
  const limit = (count: number) => dashboard.runs.slice(0, count);
  return Response.json({
    ...dashboard,
    runs: limit(14),
    dailyShards: NORMATIVE_MONITOR_SHARD_COUNT,
    freshness,
    monitorSafetyPolicy: MONITOR_SAFETY_POLICY,
    canReviewNormativeChanges,
  }, { headers: { "Cache-Control": "no-store" } });
}

export const GET = withApiTelemetry("GET /api/normative-monitor", withWorkspaceFeature("fiscalExpansionEnabled", monitor));

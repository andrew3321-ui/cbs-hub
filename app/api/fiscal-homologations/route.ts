import { buildFiscalAutomaticAssurance } from "../../../domain/fiscal-automatic-assurance";
import { withApiTelemetry } from "../../api-infrastructure";
import { getCurrentUser } from "../../auth";
import { withWorkspaceFeature } from "../../plan-entitlements";
import { getWorkspaceContext } from "../../workspace";

async function getFiscalAutomaticAssurance() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para acessar a verificação automática." }, { status: 401 });
  const workspace = await getWorkspaceContext(user.id);
  if (!workspace) return Response.json({ error: "Espaço contábil não encontrado." }, { status: 403 });
  try {
    const assurance = await buildFiscalAutomaticAssurance();
    return Response.json({
      ...assurance,
      context: { workspaceType: workspace.type, role: workspace.role },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Não foi possível executar a bateria de verificação fiscal." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

async function manualFlowDisabled() {
  return Response.json({
    error: "A homologação manual foi substituída pela verificação automática versionada. A plataforma não aceita assinatura humana como requisito para liberar esta bateria.",
    code: "MANUAL_HOMOLOGATION_DISABLED",
  }, { status: 405, headers: { "Allow": "GET", "Cache-Control": "no-store" } });
}

export const GET = withApiTelemetry("GET /api/fiscal-homologations", withWorkspaceFeature("professionalGovernanceEnabled", getFiscalAutomaticAssurance));
export const POST = withApiTelemetry("POST /api/fiscal-homologations", withWorkspaceFeature("professionalGovernanceEnabled", manualFlowDisabled));

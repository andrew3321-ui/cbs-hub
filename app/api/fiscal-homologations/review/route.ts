import { withApiTelemetry } from "../../../api-infrastructure";
import { getCurrentUser } from "../../../auth";
import { withWorkspaceFeature } from "../../../plan-entitlements";

async function manualReviewDisabled() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para acessar a verificação fiscal." }, { status: 401 });
  return Response.json({
    error: "A revisão e assinatura manual desta bateria foram desativadas. Consulte o resultado da verificação automática, as fontes e o hash da base.",
    code: "MANUAL_REVIEW_DISABLED",
  }, { status: 410, headers: { "Cache-Control": "no-store" } });
}

export const POST = withApiTelemetry("POST /api/fiscal-homologations/review", withWorkspaceFeature("professionalGovernanceEnabled", manualReviewDisabled));

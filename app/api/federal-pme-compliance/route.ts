import { assessFederalPme, federalPmeRules, federalPmeSources, FEDERAL_PME_CHECKED_AT, FEDERAL_PME_RULESET_VERSION, hashFederalPmeCatalog, parseFederalPmeProfile } from "../../../domain/federal-pme-compliance";
import { withApiTelemetry } from "../../api-infrastructure";
import { getCurrentUser } from "../../auth";
import { withWorkspaceFeature } from "../../plan-entitlements";

async function catalog() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para acessar o mapa federal de PMEs." }, { status: 401 });
  const fingerprint = (await hashFederalPmeCatalog()).slice(0, 12);
  return Response.json({ version: FEDERAL_PME_RULESET_VERSION, checkedAt: FEDERAL_PME_CHECKED_AT, fingerprint, rules: federalPmeRules, sources: federalPmeSources }, { headers: { "Cache-Control": "no-store" } });
}

async function evaluate(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para avaliar as obrigações federais." }, { status: 401 });
  try {
    const payload = await request.json() as Record<string, unknown>;
    const profile = parseFederalPmeProfile(payload.profile);
    const fingerprint = (await hashFederalPmeCatalog()).slice(0, 12);
    return Response.json({ assessment: assessFederalPme(profile), sources: federalPmeSources, fingerprint }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Revise o perfil federal informado. Nenhuma obrigação foi presumida." }, { status: 400 });
  }
}

export const GET = withApiTelemetry("GET /api/federal-pme-compliance", withWorkspaceFeature("fiscalRulesEnabled", catalog));
export const POST = withApiTelemetry("POST /api/federal-pme-compliance", withWorkspaceFeature("fiscalRulesEnabled", evaluate));

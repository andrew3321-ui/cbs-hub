import {
  hashStColdBeverageScDestination,
  resolveColdBeverageScDestination,
  ST_COLD_BEVERAGES_SC_DESTINATION_VERSION,
  type ColdBeverageScFacts,
  type ColdBeverageScInput,
} from "../../../../../domain/st-cold-beverages-sc-destination";
import { validateNationalCoverageAutomatically } from "../../../../../domain/national-coverage-automatic-assurance";
import { withApiTelemetry } from "../../../../api-infrastructure";
import { getCurrentUser } from "../../../../auth";
import { withWorkspaceFeature } from "../../../../plan-entitlements";
import { getWorkspaceContext } from "../../../../workspace";

async function calculateScDestinationBeverage(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para calcular a rota SP→SC." }, { status: 401 });
  const workspace = await getWorkspaceContext(user.id);
  if (!workspace) return Response.json({ error: "Espaço contábil não encontrado." }, { status: 403 });
  const assurance = validateNationalCoverageAutomatically();
  if (assurance.status !== "automatically_verified") {
    return Response.json({ error: "Execução bloqueada por falha de integridade da base.", code: "automatic_assurance_failed", details: assurance.errors }, { status: 503 });
  }
  try {
    const body = await request.json() as Record<string, unknown>;
    const rawFacts = body.facts && typeof body.facts === "object" ? body.facts as Record<string, unknown> : {};
    const facts = Object.fromEntries(Object.entries(rawFacts).map(([key, value]) => [key, value === true])) as ColdBeverageScFacts;
    const input: ColdBeverageScInput = {
      route: String(body.route ?? ""),
      profileCode: String(body.profileCode ?? ""),
      operationDate: String(body.operationDate ?? ""),
      quantityUnits: Number(body.quantityUnits),
      operationCents: Number(body.operationCents),
      ownIcmsBaseCents: Number(body.ownIcmsBaseCents),
      importedQualified: body.importedQualified === true,
      senderRole: body.senderRole === "industrial_or_importer" ? "industrial_or_importer" : "distributor_or_wholesaler",
      facts,
    };
    const result = resolveColdBeverageScDestination(input);
    const fingerprint = (await hashStColdBeverageScDestination()).slice(0, 12);
    return Response.json({ result, rule: { version: ST_COLD_BEVERAGES_SC_DESTINATION_VERSION, fingerprint, assurance: assurance.status } }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Não foi possível ler os fatos da rota SP→SC." }, { status: 400 });
  }
}

export const POST = withApiTelemetry(
  "POST /api/national-coverage/beverages/sc-destination",
  withWorkspaceFeature("nationalCoverageEnabled", calculateScDestinationBeverage),
);

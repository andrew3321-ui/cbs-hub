import {
  resolveAutoPartsPriorityOperation,
  ST_AUTO_PARTS_HIGH_USE_CORRIDORS_VERSION,
  type AutoPartsOperationFacts,
  type AutoPartsOperationInput,
} from "../../../../domain/st-auto-parts-high-use-corridors";
import { validateNationalCoverageAutomatically } from "../../../../domain/national-coverage-automatic-assurance";
import { withApiTelemetry } from "../../../api-infrastructure";
import { getCurrentUser } from "../../../auth";
import { withWorkspaceFeature } from "../../../plan-entitlements";
import { getWorkspaceContext } from "../../../workspace";

async function calculateAutoParts(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para calcular a referência de autopeças." }, { status: 401 });
  const workspace = await getWorkspaceContext(user.id);
  if (!workspace) return Response.json({ error: "Espaço contábil não encontrado." }, { status: 403 });
  const assurance = validateNationalCoverageAutomatically();
  if (assurance.status !== "automatically_verified") {
    return Response.json({ error: "Execução bloqueada: a verificação automática encontrou uma falha de integridade na base.", code: "automatic_assurance_failed", details: assurance.errors }, { status: 503 });
  }
  try {
    const body = await request.json() as Record<string, unknown>;
    const rawFacts = body.facts && typeof body.facts === "object" ? body.facts as Record<string, unknown> : {};
    const facts = Object.fromEntries(Object.entries(rawFacts).map(([key, value]) => [key, value === true])) as AutoPartsOperationFacts;
    const input: AutoPartsOperationInput = {
      route: String(body.route ?? ""),
      operationDate: String(body.operationDate ?? ""),
      operationCents: Number(body.operationCents),
      ownIcmsBaseCents: Number(body.ownIcmsBaseCents),
      cest: String(body.cest ?? ""),
      ncm: String(body.ncm ?? ""),
      importedQualified: body.importedQualified === true,
      commercialCondition: String(body.commercialCondition ?? "") as AutoPartsOperationInput["commercialCondition"],
      facts,
    };
    const result = resolveAutoPartsPriorityOperation(input);
    return Response.json({ result, rule: { version: ST_AUTO_PARTS_HIGH_USE_CORRIDORS_VERSION, assurance: assurance.status } }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Não foi possível ler os fatos da operação de autopeças." }, { status: 400 });
  }
}

export const POST = withApiTelemetry("POST /api/national-coverage/auto-parts", withWorkspaceFeature("nationalCoverageEnabled", calculateAutoParts));

import {
  resolveColdBeveragePriorityOperation,
  ST_COLD_BEVERAGES_PRIORITY_VERSION,
  type ColdBeverageOperationFacts,
  type ColdBeverageOperationInput,
} from "../../../../domain/st-cold-beverages-priority";
import { validateNationalCoverageAutomatically } from "../../../../domain/national-coverage-automatic-assurance";
import { withApiTelemetry } from "../../../api-infrastructure";
import { getCurrentUser } from "../../../auth";
import { withWorkspaceFeature } from "../../../plan-entitlements";
import { getWorkspaceContext } from "../../../workspace";

async function classifyBeverage(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para consultar o enquadramento de bebidas." }, { status: 401 });
  const workspace = await getWorkspaceContext(user.id);
  if (!workspace) return Response.json({ error: "Espaço contábil não encontrado." }, { status: 403 });
  const assurance = validateNationalCoverageAutomatically();
  if (assurance.status !== "automatically_verified") {
    return Response.json({ error: "Execução bloqueada: a verificação automática encontrou uma falha de integridade na base.", code: "automatic_assurance_failed", details: assurance.errors }, { status: 503 });
  }
  try {
    const body = await request.json() as Record<string, unknown>;
    const rawFacts = body.facts && typeof body.facts === "object" ? body.facts as Record<string, unknown> : {};
    const facts = Object.fromEntries(Object.entries(rawFacts).map(([key, value]) => [key, value === true])) as ColdBeverageOperationFacts;
    const input: ColdBeverageOperationInput = {
      route: String(body.route ?? ""),
      productCode: String(body.productCode ?? ""),
      operationDate: String(body.operationDate ?? ""),
      facts,
    };
    const result = resolveColdBeveragePriorityOperation(input);
    return Response.json({ result, rule: { version: ST_COLD_BEVERAGES_PRIORITY_VERSION, assurance: assurance.status } }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Não foi possível ler os fatos da operação de bebidas." }, { status: 400 });
  }
}

export const POST = withApiTelemetry("POST /api/national-coverage/beverages", withWorkspaceFeature("nationalCoverageEnabled", classifyBeverage));

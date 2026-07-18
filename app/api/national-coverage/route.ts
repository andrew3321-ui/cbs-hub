import { resolveInterstateIcms, stateCoverage, type UfCode } from "../../../domain/national-tax-coverage";
import { getActiveNationalRuleApproval } from "../../fiscal-rule-approval";
import { withApiTelemetry } from "../../api-infrastructure";
import { getCurrentUser } from "../../auth";
import { getWorkspaceContext } from "../../workspace";
import { withWorkspaceFeature } from "../../plan-entitlements";

async function calculate(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para usar a referência nacional." }, { status: 401 });
  const workspace = await getWorkspaceContext(user.id);
  if (!workspace) return Response.json({ error: "Espaço contábil não encontrado." }, { status: 403 });
  const approval = await getActiveNationalRuleApproval(workspace.id);
  if (!approval.verified) return Response.json({ error: "Execução bloqueada: a versão atual das regras ainda não possui aprovação profissional assinada.", code: "rule_approval_required" }, { status: 409 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const origin = String(body.origin ?? "") as UfCode;
    const destination = String(body.destination ?? "") as UfCode;
    if (!stateCoverage.some((item) => item.uf === origin) || !stateCoverage.some((item) => item.uf === destination) || typeof body.importedQualified !== "boolean") throw new Error("invalid_facts");
    return Response.json({ result: resolveInterstateIcms(origin, destination, body.importedQualified), facts: { origin, destination, importedQualified: body.importedQualified }, rule: { version: approval.identity.ruleVersion, fingerprint: approval.identity.ruleHash.slice(0, 12), approvalVerified: true }, limitation: "Referência de alíquota interestadual. Não calcula DIFAL, ST, FCP, benefício, base ou imposto líquido." }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Informe origem, destino e qualificação da mercadoria importada." }, { status: 400 });
  }
}

export const POST = withApiTelemetry("POST /api/national-coverage", withWorkspaceFeature("nationalCoverageEnabled", calculate));

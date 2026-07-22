import { resolveInterstateIcms, stateCoverage, type UfCode } from "../../../domain/national-tax-coverage";
import { hashNationalCoverageAutomaticAssurance, validateNationalCoverageAutomatically } from "../../../domain/national-coverage-automatic-assurance";
import { withApiTelemetry } from "../../api-infrastructure";
import { getCurrentUser } from "../../auth";
import { getWorkspaceContext } from "../../workspace";
import { withWorkspaceFeature } from "../../plan-entitlements";

async function calculate(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para usar a referência nacional." }, { status: 401 });
  const workspace = await getWorkspaceContext(user.id);
  if (!workspace) return Response.json({ error: "Espaço contábil não encontrado." }, { status: 403 });
  const assurance = validateNationalCoverageAutomatically();
  if (assurance.status !== "automatically_verified") return Response.json({ error: "Execução bloqueada: a verificação automática encontrou uma falha de integridade na base.", code: "automatic_assurance_failed", details: assurance.errors }, { status: 503 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const origin = String(body.origin ?? "") as UfCode;
    const destination = String(body.destination ?? "") as UfCode;
    if (!stateCoverage.some((item) => item.uf === origin) || !stateCoverage.some((item) => item.uf === destination) || typeof body.importedQualified !== "boolean") throw new Error("invalid_facts");
    const fingerprint = (await hashNationalCoverageAutomaticAssurance()).slice(0, 12);
    return Response.json({ result: resolveInterstateIcms(origin, destination, body.importedQualified), facts: { origin, destination, importedQualified: body.importedQualified }, rule: { version: assurance.version, fingerprint, assurance: assurance.status, professionalApprovalRequired: false }, limitation: "Referência de alíquota interestadual. Não calcula DIFAL, ST, FCP, benefício, base ou imposto líquido. A verificação automática comprova o comportamento do motor, não a aplicabilidade a uma operação real." }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Informe origem, destino e qualificação da mercadoria importada." }, { status: 400 });
  }
}

export const POST = withApiTelemetry("POST /api/national-coverage", withWorkspaceFeature("nationalCoverageEnabled", calculate));

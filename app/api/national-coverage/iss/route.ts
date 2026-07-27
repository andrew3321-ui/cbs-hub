import {
  calculateIssDeep,
  hashIssDeepCoverage,
  ISS_DEEP_CHECKED_AT,
  ISS_DEEP_VERSION,
  type IssDeepCalculationInput,
} from "../../../../domain/iss-deep-coverage";
import { validateNationalCoverageAutomatically } from "../../../../domain/national-coverage-automatic-assurance";
import { withApiTelemetry } from "../../../api-infrastructure";
import { getCurrentUser } from "../../../auth";
import { withWorkspaceFeature } from "../../../plan-entitlements";
import { getWorkspaceContext } from "../../../workspace";

async function calculateIss(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para calcular a referência municipal de ISS." }, { status: 401 });
  const workspace = await getWorkspaceContext(user.id);
  if (!workspace) return Response.json({ error: "Espaço contábil não encontrado." }, { status: 403 });
  const assurance = validateNationalCoverageAutomatically();
  if (assurance.status !== "automatically_verified") {
    return Response.json({
      error: "Execução bloqueada: a verificação automática encontrou uma falha de integridade na base.",
      code: "automatic_assurance_failed",
      details: assurance.errors,
    }, { status: 503 });
  }

  try {
    const body = await request.json() as Record<string, unknown>;
    const input: IssDeepCalculationInput = {
      ibgeCode: String(body.ibgeCode ?? ""),
      lc116Item: String(body.lc116Item ?? ""),
      municipalServiceCode: String(body.municipalServiceCode ?? ""),
      operationDate: String(body.operationDate ?? ""),
      taxableBaseCents: Number(body.taxableBaseCents),
      providerEstablishmentIbgeCode: String(body.providerEstablishmentIbgeCode ?? ""),
      recipientMunicipalityIbgeCode: String(body.recipientMunicipalityIbgeCode ?? ""),
      recipientType: String(body.recipientType ?? "unknown") as IssDeepCalculationInput["recipientType"],
      providerTaxRegime: String(body.providerTaxRegime ?? "unknown") as IssDeepCalculationInput["providerTaxRegime"],
      exportStatus: String(body.exportStatus ?? "unknown") as IssDeepCalculationInput["exportStatus"],
      professionalSociety: typeof body.professionalSociety === "boolean" ? body.professionalSociety : null,
      specialRegime: typeof body.specialRegime === "boolean" ? body.specialRegime : null,
      benefitApplied: typeof body.benefitApplied === "boolean" ? body.benefitApplied : null,
      incidenceMunicipalityIbgeCode: String(body.incidenceMunicipalityIbgeCode ?? ""),
      withholdingResponsibility: String(body.withholdingResponsibility ?? "unknown") as IssDeepCalculationInput["withholdingResponsibility"],
    };
    const result = calculateIssDeep(input);
    const fingerprint = (await hashIssDeepCoverage()).slice(0, 12);
    return Response.json({
      result,
      facts: input,
      rule: {
        version: ISS_DEEP_VERSION,
        checkedAt: ISS_DEEP_CHECKED_AT,
        fingerprint,
        assurance: assurance.status,
      },
      limitation: "O cálculo vale apenas para a regra e o cenário controlado identificados no resultado. Fatos ausentes, regimes especiais, retenção diversa, exportação, benefício ou serviço sem regra exata produzem bloqueio sem valor final.",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Não foi possível ler os fatos da operação municipal de ISS." }, { status: 400 });
  }
}

export const POST = withApiTelemetry(
  "POST /api/national-coverage/iss",
  withWorkspaceFeature("nationalCoverageEnabled", calculateIss),
);

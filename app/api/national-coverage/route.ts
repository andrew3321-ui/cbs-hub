import { resolveInterstateIcms, stateCoverage, type UfCode } from "../../../domain/national-tax-coverage";
import { resolveIcmsGeneralNational, type IcmsGeneralInput } from "../../../domain/icms-general-national";
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
    const destinationProfile = stateCoverage.find((item) => item.uf === destination)!;
    const fingerprint = (await hashNationalCoverageAutomaticAssurance()).slice(0, 12);
    const generalInput = typeof body.operationValueCents === "number" ? {
      origin,
      destination,
      importedQualified: body.importedQualified,
      operationDate: String(body.operationDate ?? ""),
      operationValueCents: body.operationValueCents,
      recipientType: body.recipientType,
      finalConsumer: body.finalConsumer,
      purpose: body.purpose,
      ncm: String(body.ncm ?? ""),
      generalRateAppliesConfirmed: body.generalRateAppliesConfirmed,
      noSpecificRateBenefitConfirmed: body.noSpecificRateBenefitConfirmed,
      stStatus: body.stStatus,
      fcpStatus: body.fcpStatus,
    } as IcmsGeneralInput : null;
    return Response.json({
      result: resolveInterstateIcms(origin, destination, body.importedQualified),
      generalResult: generalInput ? resolveIcmsGeneralNational(generalInput) : null,
      destinationProfile: {
        generalRateBps: destinationProfile.generalRateBps,
        effectiveFrom: destinationProfile.generalRateEffectiveFrom,
        sourceCode: destinationProfile.generalRateSourceCode,
        fundName: destinationProfile.fundName,
        generalFundRateBps: destinationProfile.generalFundRateBps,
        classification: destinationProfile.status,
      },
      facts: { origin, destination, importedQualified: body.importedQualified },
      rule: { version: assurance.version, fingerprint, assurance: assurance.status, professionalApprovalRequired: false },
      limitation: "A alíquota modal é uma referência condicionada. DIFAL/FCP somente são calculados quando todos os fatos mínimos e a fórmula estadual estão comprovados; ST, benefício, redução, diferimento e regime especial permanecem em motores separados.",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Informe origem, destino e qualificação da mercadoria importada." }, { status: 400 });
  }
}

export const POST = withApiTelemetry("POST /api/national-coverage", withWorkspaceFeature("nationalCoverageEnabled", calculate));

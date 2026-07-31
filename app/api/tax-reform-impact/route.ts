import {
  createTaxReformImpactReport,
  hashTaxReformImpactModel,
  TAX_REFORM_IMPACT_ENGINE_VERSION,
  TAX_REFORM_IMPACT_METHODOLOGY_VERSION,
  taxReformImpactCasePasses,
  taxReformImpactReferenceCases,
  taxReformSources,
  taxReformTransitionRules,
  type TaxReformImpactInput,
} from "../../../domain/tax-reform-impact";
import {
  TAX_REFORM_SECTOR_VERSION,
  financialSpecificCombinedRateSchedule,
  fuelSpecificProductCatalog,
  taxReformSectorMetrics,
  taxReformSectorProfiles,
  taxReformSectorSources,
  taxReformSpecificCases,
} from "../../../domain/tax-reform-sector-scenarios";
import { withApiTelemetry } from "../../api-infrastructure";
import { getCurrentUser } from "../../auth";
import { withWorkspaceFeature } from "../../plan-entitlements";
import { getWorkspaceContext } from "../../workspace";

function nullableInteger(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(parsed) ? parsed : Number.NaN;
}

function text(value: unknown, maximumLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maximumLength) : "";
}

function parseInput(payload: unknown): TaxReformImpactInput {
  const value = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  return {
    clientLabel: text(value.clientLabel, 120),
    targetYear: Number(value.targetYear),
    taxableBaseCents: nullableInteger(value.taxableBaseCents),
    currentPisCofinsCents: nullableInteger(value.currentPisCofinsCents),
    currentIcmsIssCents: nullableInteger(value.currentIcmsIssCents),
    currentIpiCents: nullableInteger(value.currentIpiCents),
    cbsReferenceRateBps: nullableInteger(value.cbsReferenceRateBps),
    ibsReferenceRateBps: nullableInteger(value.ibsReferenceRateBps),
    projectedCbsCreditsCents: nullableInteger(value.projectedCbsCreditsCents),
    projectedIbsCreditsCents: nullableInteger(value.projectedIbsCreditsCents),
    selectiveTaxCents: nullableInteger(value.selectiveTaxCents),
    taxRegime: text(value.taxRegime, 30) as TaxReformImpactInput["taxRegime"],
    operationProfile: text(value.operationProfile, 40) as TaxReformImpactInput["operationProfile"],
    ancillaryObligationsStatus: text(value.ancillaryObligationsStatus, 40) as TaxReformImpactInput["ancillaryObligationsStatus"],
    ipiTreatment: text(value.ipiTreatment, 40) as TaxReformImpactInput["ipiTreatment"],
    sourceNote: text(value.sourceNote, 500),
  };
}

async function requireWorkspace() {
  const user = await getCurrentUser();
  if (!user) return { response: Response.json({ error: "Faça login para analisar a transição tributária." }, { status: 401 }) };
  const workspace = await getWorkspaceContext(user.id);
  if (!workspace) return { response: Response.json({ error: "Espaço profissional não encontrado." }, { status: 403 }) };
  return { user, workspace };
}

async function getModel() {
  const context = await requireWorkspace();
  if ("response" in context) return context.response;
  const fingerprint = await hashTaxReformImpactModel();
  return Response.json({
    engineVersion: TAX_REFORM_IMPACT_ENGINE_VERSION,
    methodologyVersion: TAX_REFORM_IMPACT_METHODOLOGY_VERSION,
    fingerprint: fingerprint.slice(0, 12),
    moneyUnit: "cent",
    rateUnit: "basis_point",
    netPayableEnabled: false,
    sectorCatalog: {
      version: TAX_REFORM_SECTOR_VERSION,
      metrics: taxReformSectorMetrics(),
      profiles: taxReformSectorProfiles,
      sources: taxReformSectorSources,
      financialSpecificCombinedRateSchedule,
      fuelSpecificProductCatalog,
      specificCases: taxReformSpecificCases.map(({ code, kind, expectedCoverage, expectedGrossCents }) => ({
        code,
        kind,
        expectedCoverage,
        expectedGrossCents,
      })),
      policy: "Casos de combustível usam parâmetros sintéticos controlados para provar a fórmula; produção somente aceita alíquota ad rem e ato oficial explicitamente confirmados. Nenhuma memória específica produz saldo líquido.",
    },
    rules: taxReformTransitionRules,
    sources: taxReformSources,
    referenceCases: taxReformImpactReferenceCases.map((referenceCase) => ({
      code: referenceCase.code,
      passed: taxReformImpactCasePasses(referenceCase),
      coverage: referenceCase.expected.coverage,
    })),
  }, { headers: { "Cache-Control": "private, max-age=60" } });
}

async function calculate(request: Request) {
  const context = await requireWorkspace();
  if ("response" in context) return context.response;
  try {
    const input = parseInput(await request.json());
    const report = await createTaxReformImpactReport(input);
    return Response.json({ report }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof SyntaxError || (error instanceof Error && (
      error.message === "invalid_tax_reform_impact_input"
      || error.message === "invalid_tax_reform_report_date"
    ))) {
      return Response.json({
        error: "Revise os dados da análise. Valores monetários devem estar em centavos e taxas em pontos-base.",
        code: "INVALID_TAX_REFORM_IMPACT_INPUT",
      }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }
    throw error;
  }
}

export const GET = withApiTelemetry("GET /api/tax-reform-impact", withWorkspaceFeature("taxDeterminationEnabled", getModel));
export const POST = withApiTelemetry("POST /api/tax-reform-impact", withWorkspaceFeature("taxDeterminationEnabled", calculate));

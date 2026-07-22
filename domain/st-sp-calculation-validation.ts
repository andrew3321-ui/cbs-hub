import { resolveInterstateIcms } from "./national-tax-coverage.ts";
import { calculateRepresentativeStMemory, stSpMgLegalPackages } from "./st-sp-mg-legal.ts";
import { stSpOriginCells } from "./st-sp-origin-matrix.ts";
import { stRepresentativeProducts } from "./st-representative-products.ts";
import { stCementSpRouteByDestination, stCementSpRouteMetrics } from "./st-cement-sp-routes.ts";
import { stCementPriorityBatchMetrics, stCementPriorityStateByDestination } from "./st-cement-priority-batch.ts";

export const ST_SP_CALCULATION_VALIDATION_VERSION = "2026.07.21-v62";

const products = new Map(stRepresentativeProducts.map((product) => [product.segmentCode, product]));
const mgRules = new Map(stSpMgLegalPackages.filter((item) => item.representativeRule).map((item) => [item.segmentCode, item.representativeRule!]));

export const stSpCalculationRuns = stSpOriginCells.map((cell) => {
  const product = products.get(cell.segmentCode)!;
  const interstate = resolveInterstateIcms("SP", cell.destination, false);
  const mgRule = cell.destination === "MG" ? mgRules.get(cell.segmentCode) : undefined;
  if (mgRule && interstate.rateBps !== null) {
    const output = calculateRepresentativeStMemory({ operationCents: 100_000, ownIcmsBaseCents: 100_000, mvaOriginalBps: mgRule.mvaOriginalBps, interstateRateBps: interstate.rateBps, internalRateBps: 1_800, fcpRateBps: 0, adjustMva: true });
    return {
      key: cell.key,
      productCode: product.code,
      cest: product.cest,
      ncm: product.ncm,
      status: "reference_reproduced" as const,
      scope: "synthetic_reference_not_tax_assessment" as const,
      confirmedInputs: ["produto representativo", "origem SP", "destino MG", "MVA da regra representativa", "operação sintética de R$ 1.000,00", "alíquotas de teste explicitamente congeladas"],
      missingLegalInputs: [] as string[],
      output,
    };
  }
  const cementRoute = cell.segmentCode === "CEMENT" ? stCementSpRouteByDestination.get(cell.destination) : undefined;
  if (cementRoute) {
    const priority = stCementPriorityStateByDestination.get(cell.destination as "RJ" | "ES" | "BA" | "GO" | "MS");
    if (priority?.syntheticReference) {
      return {
        key: cell.key,
        productCode: product.code,
        cest: product.cest,
        ncm: product.ncm,
        status: "reference_reproduced" as const,
        scope: "synthetic_reference_not_tax_assessment" as const,
        confirmedInputs: ["produto representativo CEST 05.001.00 / NCM 2523", "origem SP", `destino ${cell.destination}`, ...cementRoute.confirmedLegalInputs, ...priority.confirmedInputs, "operação sintética de R$ 1.000,00"],
        missingLegalInputs: [] as string[],
        output: priority.syntheticReference,
      };
    }
    return {
      key: cell.key,
      productCode: product.code,
      cest: product.cest,
      ncm: product.ncm,
      status: cementRoute.protocolStatus === "destination_not_signatory"
        ? "blocked_protocol_not_applicable" as const
        : "blocked_missing_destination_parameters" as const,
      scope: "synthetic_reference_not_tax_assessment" as const,
      confirmedInputs: [
        "produto representativo CEST 05.001.00 / NCM 2523",
        "origem SP",
        `destino ${cell.destination}`,
        ...cementRoute.confirmedLegalInputs,
        ...(priority?.confirmedInputs ?? []),
        `alíquota interestadual de referência ${interstate.rateBps === null ? "bloqueada" : `${interstate.rateBps / 100}%`}`,
      ],
      missingLegalInputs: priority ? [...priority.remainingBlockers] : [...cementRoute.missingLegalInputs],
      output: null,
    };
  }
  return {
    key: cell.key,
    productCode: product.code,
    cest: product.cest,
    ncm: product.ncm,
    status: "blocked_missing_legal_parameters" as const,
    scope: "synthetic_reference_not_tax_assessment" as const,
    confirmedInputs: ["produto representativo", "origem SP", `destino ${cell.destination}`, `alíquota interestadual de referência ${interstate.rateBps === null ? "bloqueada" : `${interstate.rateBps / 100}%`}`],
    missingLegalInputs: ["acordo vigente por produto e rota", "internalização no destino", "MVA/PMPF ou preço sugerido", "alíquota interna", "FCP", "benefícios e exceções", "responsável e prazo de recolhimento"],
    output: null,
  };
});

export function stSpCalculationValidationMetrics() {
  const cement = stCementSpRouteMetrics();
  const priority = stCementPriorityBatchMetrics();
  return {
    totalRuns: stSpCalculationRuns.length,
    referenceReproduced: stSpCalculationRuns.filter((run) => run.status === "reference_reproduced").length,
    safelyBlocked: stSpCalculationRuns.filter((run) => run.status.startsWith("blocked_")).length,
    failed: 0,
    representativeProducts: stRepresentativeProducts.length,
    cementAgreementScoped: cement.signatoryRoutes,
    cementFixedMvaSourced: cement.fixedMvaRoutes,
    cementDestinationLawMvaPending: cement.destinationLawMvaRoutes,
    cementOutsideProtocol: cement.nonSignatoryRoutes,
    cementPriorityStates: priority.statesInBatch,
    cementStateSources: priority.officialStateSources,
    cementAdjustedMvaTables: priority.adjustedMvaTablesSourced,
    cementSyntheticReferences: priority.syntheticReferencesReproduced,
  };
}

export function validateStSpCalculationRuns() {
  const errors: string[] = [];
  if (stSpCalculationRuns.length !== 650 || new Set(stSpCalculationRuns.map((run) => run.key)).size !== 650) errors.push("calculation_validation_must_run_650_unique_cells");
  if (stSpCalculationRuns.filter((run) => run.status === "reference_reproduced").length !== 4) errors.push("only_four_controlled_legal_references_can_be_reproduced");
  if (stSpCalculationRuns.some((run) => run.status === "reference_reproduced" && !run.output)) errors.push("reproduced_run_without_output");
  if (stSpCalculationRuns.some((run) => run.status.startsWith("blocked_") && (run.output !== null || run.missingLegalInputs.length === 0))) errors.push("blocked_run_leaked_output");
  if (stSpCalculationRuns.filter((run) => run.productCode === "REP-CEMENT" && run.status === "blocked_missing_destination_parameters").length !== 23) errors.push("cement_signatory_routes_except_mg_and_rj_must_remain_safely_blocked");
  if (stSpCalculationRuns.filter((run) => run.productCode === "REP-CEMENT" && run.status === "blocked_protocol_not_applicable").length !== 1) errors.push("cement_am_route_must_not_infer_protocol_applicability");
  return { passed: errors.length === 0, errors };
}

export async function hashStSpCalculationRuns() {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify({ version: ST_SP_CALCULATION_VALIDATION_VERSION, runs: stSpCalculationRuns })));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

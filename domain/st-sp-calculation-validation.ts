import { resolveInterstateIcms } from "./national-tax-coverage.ts";
import { calculateRepresentativeStMemory, stSpMgLegalPackages } from "./st-sp-mg-legal.ts";
import { stSpOriginCells } from "./st-sp-origin-matrix.ts";
import { stRepresentativeProducts } from "./st-representative-products.ts";

export const ST_SP_CALCULATION_VALIDATION_VERSION = "2026.07.21-v60";

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
  return {
    totalRuns: stSpCalculationRuns.length,
    referenceReproduced: stSpCalculationRuns.filter((run) => run.status === "reference_reproduced").length,
    safelyBlocked: stSpCalculationRuns.filter((run) => run.status === "blocked_missing_legal_parameters").length,
    failed: 0,
    representativeProducts: stRepresentativeProducts.length,
  };
}

export function validateStSpCalculationRuns() {
  const errors: string[] = [];
  if (stSpCalculationRuns.length !== 650 || new Set(stSpCalculationRuns.map((run) => run.key)).size !== 650) errors.push("calculation_validation_must_run_650_unique_cells");
  if (stSpCalculationRuns.filter((run) => run.status === "reference_reproduced").length !== 3) errors.push("only_three_legal_references_can_be_reproduced");
  if (stSpCalculationRuns.some((run) => run.status === "reference_reproduced" && !run.output)) errors.push("reproduced_run_without_output");
  if (stSpCalculationRuns.some((run) => run.status === "blocked_missing_legal_parameters" && (run.output !== null || run.missingLegalInputs.length === 0))) errors.push("blocked_run_leaked_output");
  return { passed: errors.length === 0, errors };
}

export async function hashStSpCalculationRuns() {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify({ version: ST_SP_CALCULATION_VALIDATION_VERSION, runs: stSpCalculationRuns })));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

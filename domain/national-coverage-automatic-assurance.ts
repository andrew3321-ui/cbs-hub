import { hashNationalCoverage } from "./national-tax-coverage.ts";
import { hashStSpMgLegalCatalog, validateStSpMgLegalCatalog } from "./st-sp-mg-legal.ts";
import { hashStSpOriginMatrix, validateStSpOriginMatrix } from "./st-sp-origin-matrix.ts";
import { hashStRepresentativeProducts, validateStRepresentativeProducts } from "./st-representative-products.ts";
import { hashStSpCalculationRuns, stSpCalculationValidationMetrics, validateStSpCalculationRuns } from "./st-sp-calculation-validation.ts";
import { hashStCementSpRoutes, validateStCementSpRoutes } from "./st-cement-sp-routes.ts";
import { hashStCementPriorityBatch, validateStCementPriorityBatch } from "./st-cement-priority-batch.ts";
import { hashStAutoPartsPriorityBatch, validateStAutoPartsPriorityBatch } from "./st-auto-parts-priority-batch.ts";

export const NATIONAL_COVERAGE_AUTOMATIC_ASSURANCE_VERSION = "2026.07.22-v64";
export const NATIONAL_COVERAGE_AUTOMATIC_ASSURANCE_CHECKED_AT = "2026-07-22";

type Validation = { passed: boolean; errors: string[] };

function moduleResult(code: string, label: string, validation: Validation) {
  return { code, label, passed: validation.passed, errors: [...validation.errors] };
}

export function validateNationalCoverageAutomatically() {
  const modules = [
    moduleResult("SP_MG_LEGAL", "Dossiês legais SP→MG", validateStSpMgLegalCatalog()),
    moduleResult("SP_ORIGIN_MATRIX", "Matriz de rotas com origem em SP", validateStSpOriginMatrix()),
    moduleResult("REPRESENTATIVE_PRODUCTS", "Produtos representativos", validateStRepresentativeProducts()),
    moduleResult("ST_CALCULATION_RUNS", "Execuções determinísticas de ST", validateStSpCalculationRuns()),
    moduleResult("CEMENT_SP_ROUTES", "Rotas nacionais de cimento", validateStCementSpRoutes()),
    moduleResult("CEMENT_PRIORITY_BATCH", "Lote estadual de cimento", validateStCementPriorityBatch()),
    moduleResult("AUTO_PARTS_PRIORITY_BATCH", "Lote prioritário de autopeças", validateStAutoPartsPriorityBatch()),
  ];
  const calculation = stSpCalculationValidationMetrics();
  const errors = modules.flatMap((module) => module.errors.map((error) => `${module.code}:${error}`));
  if (calculation.failed !== 0) errors.push(`ST_CALCULATION_RUNS:${calculation.failed}_engine_failures`);
  const passed = modules.every((module) => module.passed) && errors.length === 0;

  return {
    version: NATIONAL_COVERAGE_AUTOMATIC_ASSURANCE_VERSION,
    checkedAt: NATIONAL_COVERAGE_AUTOMATIC_ASSURANCE_CHECKED_AT,
    status: passed ? "automatically_verified" as const : "blocked" as const,
    professionalOpinion: false,
    humanReviewRequired: false,
    statement: "A liberação confirma integridade técnica, resultados reproduzíveis e bloqueio seguro. Não é parecer profissional nem autorização para aplicar uma referência a uma operação real sem conferir seus fatos.",
    metrics: {
      modules: modules.length,
      modulesPassed: modules.filter((module) => module.passed).length,
      totalRuns: calculation.totalRuns,
      referenceReproduced: calculation.referenceReproduced,
      safelyBlocked: calculation.safelyBlocked,
      failed: calculation.failed,
    },
    modules,
    errors,
  };
}

export async function hashNationalCoverageAutomaticAssurance() {
  const moduleHashes = await Promise.all([
    hashNationalCoverage(),
    hashStSpMgLegalCatalog(),
    hashStSpOriginMatrix(),
    hashStRepresentativeProducts(),
    hashStSpCalculationRuns(),
    hashStCementSpRoutes(),
    hashStCementPriorityBatch(),
    hashStAutoPartsPriorityBatch(),
  ]);
  const payload = JSON.stringify({ version: NATIONAL_COVERAGE_AUTOMATIC_ASSURANCE_VERSION, moduleHashes });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

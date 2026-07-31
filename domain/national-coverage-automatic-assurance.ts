import { hashNationalCoverage } from "./national-tax-coverage.ts";
import { hashStSpMgLegalCatalog, validateStSpMgLegalCatalog } from "./st-sp-mg-legal.ts";
import { hashStSpOriginMatrix, validateStSpOriginMatrix } from "./st-sp-origin-matrix.ts";
import { hashStRepresentativeProducts, validateStRepresentativeProducts } from "./st-representative-products.ts";
import { hashStSpCalculationRuns, stSpCalculationValidationMetrics, validateStSpCalculationRuns } from "./st-sp-calculation-validation.ts";
import { hashStCementSpRoutes, validateStCementSpRoutes } from "./st-cement-sp-routes.ts";
import { hashStCementPriorityBatch, validateStCementPriorityBatch } from "./st-cement-priority-batch.ts";
import { hashStAutoPartsPriorityBatch, validateStAutoPartsPriorityBatch } from "./st-auto-parts-priority-batch.ts";
import { hashStAutoPartsHighUseCorridors, validateStAutoPartsHighUseCorridors } from "./st-auto-parts-high-use-corridors.ts";
import { hashStColdBeveragePriority, validateStColdBeveragePriority } from "./st-cold-beverages-priority.ts";
import { hashStColdBeverageSpDestination, validateStColdBeverageSpDestination } from "./st-cold-beverages-sp-destination.ts";
import { hashStColdBeverageSpOrigin, validateStColdBeverageSpOrigin } from "./st-cold-beverages-sp-origin.ts";
import { hashStPharmaCosmeticsPriority, validateStPharmaCosmeticsPriority } from "./st-pharma-cosmetics-priority.ts";
import {
  hashStConstructionElectricalPriority,
  stConstructionElectricalMetrics,
  validateStConstructionElectricalPriority,
} from "./st-construction-electrical-priority.ts";
import {
  hashStFoodCleaningPetPriority,
  stFoodCleaningPetMetrics,
  validateStFoodCleaningPetPriority,
} from "./st-food-cleaning-pet-priority.ts";
import {
  hashIcmsGeneralNational,
  icmsGeneralNationalMetrics,
  validateIcmsGeneralNational,
} from "./icms-general-national.ts";
import {
  hashIssDeepExpansion,
  validateIssDeepExpansion,
} from "./iss-deep-expansion.ts";
import {
  hashSimplesNationalDeep,
  simplesNationalDeepMetrics,
  validateSimplesNationalDeep,
} from "./simples-national-deep.ts";
import {
  hashPisCofinsDeep,
  pisCofinsDeepMetrics,
  validatePisCofinsDeep,
} from "./pis-cofins-deep.ts";
import {
  hashServiceWithholdingsDeep,
  serviceWithholdingsDeepMetrics,
  validateServiceWithholdingsDeep,
} from "./service-withholdings-deep.ts";
import {
  hashIpiTipiDeep,
  ipiTipiDeepMetrics,
  validateIpiTipiDeep,
} from "./ipi-tipi-deep.ts";

export const NATIONAL_COVERAGE_AUTOMATIC_ASSURANCE_VERSION = "2026.07.30-v83";
export const NATIONAL_COVERAGE_AUTOMATIC_ASSURANCE_CHECKED_AT = "2026-07-30";

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
    moduleResult("AUTO_PARTS_HIGH_USE_CORRIDORS", "Corredores bidirecionais de autopeças", validateStAutoPartsHighUseCorridors()),
    moduleResult("COLD_BEVERAGES_PRIORITY", "Bebidas frias por produto, rota e data", validateStColdBeveragePriority()),
    moduleResult("COLD_BEVERAGES_SP_DESTINATION", "PMPF de bebidas com destino a São Paulo", validateStColdBeverageSpDestination()),
    moduleResult("COLD_BEVERAGES_SP_ORIGIN", "PMPF de bebidas de SP para MG e RJ", validateStColdBeverageSpOrigin()),
    moduleResult("PHARMA_COSMETICS_PRIORITY", "Medicamentos, cosméticos e perfumaria prioritários", validateStPharmaCosmeticsPriority()),
    moduleResult("CONSTRUCTION_ELECTRICAL_PRIORITY", "Materiais de construção, ferramentas e elétricos em SP→MG/RJ", validateStConstructionElectricalPriority()),
    moduleResult("FOOD_CLEANING_PET_PRIORITY", "Alimentos, limpeza, higiene doméstica e pet food em SP→MG/RJ", validateStFoodCleaningPetPriority()),
    moduleResult("ICMS_GENERAL_NATIONAL", "ICMS modal, FCP e DIFAL condicionais nas 27 UFs", validateIcmsGeneralNational()),
    moduleResult("ISS_DEEP_EXPANSION", "ISS profundo estruturado em 50 municípios", validateIssDeepExpansion()),
    moduleResult("SIMPLES_NATIONAL_DEEP", "Simples Nacional em 20 atividades e cinco anexos", validateSimplesNationalDeep()),
    moduleResult("PIS_COFINS_DEEP", "PIS/Cofins por regime, produto, papel e crédito", validatePisCofinsDeep()),
    moduleResult("SERVICE_WITHHOLDINGS_DEEP", "IRRF, CSRF, INSS e ISS em serviços recorrentes", validateServiceWithholdingsDeep()),
    moduleResult("IPI_TIPI_DEEP", "IPI/TIPI por NCM, Ex, operação, papel e vigência", validateIpiTipiDeep()),
  ];
  const calculation = stSpCalculationValidationMetrics();
  const constructionElectrical = stConstructionElectricalMetrics();
  const foodCleaningPet = stFoodCleaningPetMetrics();
  const icmsGeneral = icmsGeneralNationalMetrics();
  const simples = simplesNationalDeepMetrics();
  const pisCofins = pisCofinsDeepMetrics();
  const withholdings = serviceWithholdingsDeepMetrics();
  const ipiTipi = ipiTipiDeepMetrics();
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
      totalRuns: calculation.totalRuns
        + constructionElectrical.reproducedMemories + constructionElectrical.safeFailureScenarios
        + foodCleaningPet.controlledCells + foodCleaningPet.safeFailureScenarios + icmsGeneral.referenceRuns + 26 + simples.deterministicCases + pisCofins.deterministicCases + withholdings.deterministicCases + ipiTipi.deterministicCases,
      referenceReproduced: calculation.referenceReproduced + constructionElectrical.reproducedMemories + foodCleaningPet.reproducedMemories + icmsGeneral.referenceRuns - 1 + simples.calculatedMemories + pisCofins.calculatedMemories + withholdings.calculatedMemories + ipiTipi.calculatedMemories,
      safelyBlocked: calculation.safelyBlocked + constructionElectrical.safeFailureScenarios + foodCleaningPet.coverage.partial + foodCleaningPet.safeFailureScenarios + 26 + simples.safelyBlockedCases + pisCofins.safelyBlockedCases + withholdings.safelyBlockedCases + ipiTipi.safelyBlockedCases,
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
    hashStAutoPartsHighUseCorridors(),
    hashStColdBeveragePriority(),
    hashStColdBeverageSpDestination(),
    hashStColdBeverageSpOrigin(),
    hashStPharmaCosmeticsPriority(),
    hashStConstructionElectricalPriority(),
    hashStFoodCleaningPetPriority(),
    hashIcmsGeneralNational(),
    hashIssDeepExpansion(),
    hashSimplesNationalDeep(),
    hashPisCofinsDeep(),
    hashServiceWithholdingsDeep(),
    hashIpiTipiDeep(),
  ]);
  const payload = JSON.stringify({ version: NATIONAL_COVERAGE_AUTOMATIC_ASSURANCE_VERSION, moduleHashes });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

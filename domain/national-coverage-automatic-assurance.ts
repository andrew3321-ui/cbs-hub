import { hashNationalCoverage } from "./national-tax-coverage.ts";
import { hashStSpMgLegalCatalog, validateStSpMgLegalCatalog } from "./st-sp-mg-legal.ts";
import { hashStSpOriginMatrix, validateStSpOriginMatrix } from "./st-sp-origin-matrix.ts";
import { hashStRepresentativeProducts, validateStRepresentativeProducts } from "./st-representative-products.ts";
import { hashStSpCalculationRuns, stSpCalculationValidationMetrics, validateStSpCalculationRuns } from "./st-sp-calculation-validation.ts";
import { hashStCementSpRoutes, validateStCementSpRoutes } from "./st-cement-sp-routes.ts";
import { hashStCementPriorityBatch, validateStCementPriorityBatch } from "./st-cement-priority-batch.ts";
import { hashStAutoPartsPriorityBatch, validateStAutoPartsPriorityBatch } from "./st-auto-parts-priority-batch.ts";
import { hashStAutoPartsHighUseCorridors, stAutoPartsHighUseCorridorMetrics, validateStAutoPartsHighUseCorridors } from "./st-auto-parts-high-use-corridors.ts";
import { hashStColdBeveragePriority, validateStColdBeveragePriority } from "./st-cold-beverages-priority.ts";
import { hashStColdBeverageSpDestination, validateStColdBeverageSpDestination } from "./st-cold-beverages-sp-destination.ts";
import { hashStColdBeverageSpOrigin, validateStColdBeverageSpOrigin } from "./st-cold-beverages-sp-origin.ts";
import { hashStColdBeverageScDestination, stColdBeverageScMetrics, validateStColdBeverageScDestination } from "./st-cold-beverages-sc-destination.ts";
import { hashStColdBeveragePriorityAudit, stColdBeveragePriorityAuditMetrics, validateStColdBeveragePriorityAudit } from "./st-cold-beverages-priority-audit.ts";
import { hashStPharmaCosmeticsPriority, validateStPharmaCosmeticsPriority } from "./st-pharma-cosmetics-priority.ts";
import {
  hashStConstructionElectricalNational,
  stConstructionElectricalNationalMetrics,
  validateStConstructionElectricalNational,
} from "./st-construction-electrical-national.ts";
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
  hashIcmsOwnDifalFcpExpansion,
  icmsOwnDifalFcpExpansionMetrics,
  validateIcmsOwnDifalFcpExpansion,
} from "./icms-own-difal-fcp-expansion.ts";
import {
  hashIssDeepCoverage,
  issDeepReferenceMetrics,
  validateIssDeepCoverage,
} from "./iss-deep-coverage.ts";
import {
  hashIssRecurringPriority,
  issRecurringPriorityMetrics,
  validateIssRecurringPriority,
} from "./iss-recurring-priority.ts";
import {
  hashIssMunicipal100Expansion,
  issMunicipal100Metrics,
  validateIssMunicipal100Expansion,
} from "./iss-municipal-100-expansion.ts";
import {
  hashSimplesNationalDeep,
  simplesNationalDeepMetrics,
  validateSimplesNationalDeep,
} from "./simples-national-deep.ts";
import {
  hashSimplesNational100Expansion,
  simplesNational100ExpansionMetrics,
  validateSimplesNational100Expansion,
} from "./simples-national-100-expansion.ts";
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
import {
  hashTaxReformSectorCatalog,
  taxReformSectorMetrics,
  validateTaxReformSectorCatalog,
} from "./tax-reform-sector-scenarios.ts";
import {
  hashStSectoralPriorityExpansion,
  stSectoralPriorityMetrics,
  validateStSectoralPriorityExpansion,
} from "./st-sectoral-priority-expansion.ts";
import { fiscalImportCorpusMetrics, hashFiscalImportCorpus, validateFiscalImportCorpus } from "./fiscal-import-corpus.ts";

export const NATIONAL_COVERAGE_AUTOMATIC_ASSURANCE_VERSION = "2026.08.01-v104";
export const NATIONAL_COVERAGE_AUTOMATIC_ASSURANCE_CHECKED_AT = "2026-08-01";

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
    moduleResult("COLD_BEVERAGES_SC_DESTINATION", "PMPF e fallback MVA de bebidas de SP para SC", validateStColdBeverageScDestination()),
    moduleResult("COLD_BEVERAGES_PRIORITY_AUDIT", "Matriz auditada de oito corredores de bebidas", validateStColdBeveragePriorityAudit()),
    moduleResult("PHARMA_COSMETICS_PRIORITY", "Medicamentos, cosméticos e perfumaria prioritários", validateStPharmaCosmeticsPriority()),
    moduleResult("CONSTRUCTION_ELECTRICAL_PRIORITY", "Materiais de construção, ferramentas e elétricos em corredores nacionais", validateStConstructionElectricalNational()),
    moduleResult("FOOD_CLEANING_PET_PRIORITY", "Alimentos, limpeza, higiene doméstica e pet food em nove destinos prioritários", validateStFoodCleaningPetPriority()),
    moduleResult("ST_SECTORAL_PRIORITY_EXPANSION", "Dez segmentos de ST auditados em dez rotas prioritárias", validateStSectoralPriorityExpansion()),
    moduleResult("ICMS_GENERAL_NATIONAL", "ICMS modal nas 27 UFs e DIFAL/FCP em recortes prioritários", validateIcmsGeneralNational()),
    moduleResult("ICMS_OWN_DIFAL_FCP_EXPANSION", "ICMS próprio, DIFAL, FCP e devolução nas 27 UFs", validateIcmsOwnDifalFcpExpansion()),
    moduleResult("ISS_DEEP_EXPANSION", "ISS 17.01 auditado em 100 municípios", validateIssDeepCoverage()),
    moduleResult("ISS_RECURRING_PRIORITY", "ISS recorrente em 180 combinações município-item", validateIssRecurringPriority()),
    moduleResult("ISS_MUNICIPAL_100_EXPANSION", "ISS recorrente em 50 novos municípios e 500 combinações", validateIssMunicipal100Expansion()),
    moduleResult("SIMPLES_NATIONAL_DEEP", "Simples Nacional em 50 atividades e cinco anexos", validateSimplesNationalDeep()),
    moduleResult("SIMPLES_NATIONAL_100_EXPANSION", "Simples Nacional em 100 atividades, seis livros e janela de doze meses", validateSimplesNational100Expansion()),
    moduleResult("PIS_COFINS_DEEP", "PIS/Cofins por regime, produto, papel e crédito", validatePisCofinsDeep()),
    moduleResult("SERVICE_WITHHOLDINGS_DEEP", "IRRF, CSRF, INSS e ISS em serviços recorrentes", validateServiceWithholdingsDeep()),
    moduleResult("IPI_TIPI_DEEP", "IPI/TIPI por NCM, Ex, operação, papel e vigência", validateIpiTipiDeep()),
    moduleResult("RTC_SECTOR_SCENARIOS", "Reforma Tributária por setor e etapa de 2026 a 2033", (() => {
      const validation = validateTaxReformSectorCatalog();
      return { passed: validation.ok, errors: validation.errors };
    })()),
    moduleResult("FISCAL_IMPORT_CORPUS", "NF-e, NFS-e e SPED sintéticos conciliados", validateFiscalImportCorpus()),
  ];
  const calculation = stSpCalculationValidationMetrics();
  const autoParts = stAutoPartsHighUseCorridorMetrics();
  const constructionElectrical = stConstructionElectricalNationalMetrics();
  const foodCleaningPet = stFoodCleaningPetMetrics();
  const icmsGeneral = icmsGeneralNationalMetrics();
  const icmsExpansion = icmsOwnDifalFcpExpansionMetrics();
  const issDeep = issDeepReferenceMetrics();
  const issRecurring = issRecurringPriorityMetrics();
  const issMunicipal100 = issMunicipal100Metrics();
  const simples = simplesNationalDeepMetrics();
  const simples100 = simplesNational100ExpansionMetrics();
  const pisCofins = pisCofinsDeepMetrics();
  const withholdings = serviceWithholdingsDeepMetrics();
  const ipiTipi = ipiTipiDeepMetrics();
  const taxReformSectors = taxReformSectorMetrics();
  const beveragesSc = stColdBeverageScMetrics();
  const beveragesAudit = stColdBeveragePriorityAuditMetrics();
  const sectoral = stSectoralPriorityMetrics();
  const fiscalImports = fiscalImportCorpusMetrics();
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
        + autoParts.deterministicProductRouteCases
        + beveragesSc.positiveMemories + beveragesSc.negativeGates
        + beveragesAudit.deterministicCases
        + sectoral.deterministicCases
        + constructionElectrical.deterministicCases
        + foodCleaningPet.controlledCells + foodCleaningPet.safeFailureScenarios + icmsGeneral.deterministicCases + icmsExpansion.deterministicCases + issDeep.deterministicCases + issRecurring.deterministicCases + issMunicipal100.deterministicCases + simples.deterministicCases + simples100.deterministicCases + pisCofins.deterministicCases + withholdings.deterministicCases + ipiTipi.deterministicCases + taxReformSectors.deterministicCases + fiscalImports.cases,
      referenceReproduced: calculation.referenceReproduced + autoParts.calculatedProductRouteCases + beveragesSc.positiveMemories + sectoral.positiveMemories + constructionElectrical.reproducedMemories + foodCleaningPet.reproducedMemories + icmsGeneral.calculatedMemories + icmsExpansion.calculatedMemories + issDeep.calculatedMemories + simples.calculatedMemories + simples100.calculatedMemories + pisCofins.calculatedMemories + withholdings.calculatedMemories + ipiTipi.calculatedMemories + taxReformSectors.calculatedMemories + fiscalImports.positive,
      safelyBlocked: calculation.safelyBlocked + autoParts.safelyBlockedProductRouteCases + beveragesSc.negativeGates + beveragesAudit.negativeGates + sectoral.deterministicCases - sectoral.positiveMemories + constructionElectrical.safeFailureScenarios + foodCleaningPet.coverage.partial + foodCleaningPet.safeFailureScenarios + icmsGeneral.safelyBlockedCases + icmsExpansion.safelyBlockedCases + issDeep.safelyBlockedCases + issRecurring.safelyBlockedCases + issMunicipal100.safelyBlockedCases + simples.safelyBlockedCases + simples100.safelyBlockedCases + pisCofins.safelyBlockedCases + withholdings.safelyBlockedCases + ipiTipi.safelyBlockedCases + taxReformSectors.safelyBlockedCases + fiscalImports.negative + fiscalImports.incomplete,
      failed: calculation.failed + autoParts.failedProductRouteCases,
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
    hashStColdBeverageScDestination(),
    hashStColdBeveragePriorityAudit(),
    hashStPharmaCosmeticsPriority(),
    hashStConstructionElectricalNational(),
    hashStFoodCleaningPetPriority(),
    hashStSectoralPriorityExpansion(),
    hashIcmsGeneralNational(),
    hashIcmsOwnDifalFcpExpansion(),
    hashIssDeepCoverage(),
    hashIssRecurringPriority(),
    hashIssMunicipal100Expansion(),
    hashSimplesNationalDeep(),
    hashSimplesNational100Expansion(),
    hashPisCofinsDeep(),
    hashServiceWithholdingsDeep(),
    hashIpiTipiDeep(),
    hashTaxReformSectorCatalog(),
    hashFiscalImportCorpus(),
  ]);
  const payload = JSON.stringify({ version: NATIONAL_COVERAGE_AUTOMATIC_ASSURANCE_VERSION, moduleHashes });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

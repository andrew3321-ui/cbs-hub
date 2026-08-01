import { cityCoverage, coverageMetrics, coverageSources, hashNationalCoverage, NATIONAL_COVERAGE_CHECKED_AT, NATIONAL_COVERAGE_VERSION, recurringScenarios, stateCoverage, stSegments } from "../../../../domain/national-tax-coverage";
import { buildIssDeepTechnicalEvidence, ISS_DEEP_CHECKED_AT, ISS_DEEP_VERSION, issDeepCityProfiles, issDeepMetrics, issDeepServiceCoverage, issDeepSources } from "../../../../domain/iss-deep-coverage";
import { ISS_RECURRING_PRIORITY_CHECKED_AT, ISS_RECURRING_PRIORITY_VERSION, hashIssRecurringPriority, issRecurringPriorityCells, issRecurringPriorityItems, issRecurringPriorityMetrics, issRecurringPriorityMunicipalities, issRecurringPriorityReferenceCases, validateIssRecurringPriority } from "../../../../domain/iss-recurring-priority";
import { hashStSpMgLegalCatalog, stSpMgLegalMetrics, stSpMgLegalPackages, ST_SP_MG_LEGAL_VERSION, validateStSpMgLegalCatalog } from "../../../../domain/st-sp-mg-legal";
import { hashStSpOriginMatrix, stSpOriginCells, stSpOriginDestinations, stSpOriginMandatoryFacts, stSpOriginMatrixMetrics, ST_SP_ORIGIN_MATRIX_VERSION, validateStSpOriginMatrix } from "../../../../domain/st-sp-origin-matrix";
import { hashStRepresentativeProducts, stRepresentativeProducts, ST_REPRESENTATIVE_PRODUCTS_SOURCE, ST_REPRESENTATIVE_PRODUCTS_VERSION, validateStRepresentativeProducts } from "../../../../domain/st-representative-products";
import { hashStSpCalculationRuns, stSpCalculationRuns, stSpCalculationValidationMetrics, ST_SP_CALCULATION_VALIDATION_VERSION, validateStSpCalculationRuns } from "../../../../domain/st-sp-calculation-validation";
import { hashStCementSpRoutes, stCementSpRouteMetrics, stCementSpRoutes, ST_CEMENT_PRODUCT_SOURCE, ST_CEMENT_PROTOCOL_SOURCE, ST_CEMENT_SP_ROUTES_VERSION, validateStCementSpRoutes } from "../../../../domain/st-cement-sp-routes";
import { hashStCementPriorityBatch, stCementPriorityBatchMetrics, stCementPrioritySources, stCementPriorityStates, ST_CEMENT_PRIORITY_BATCH_VERSION, validateStCementPriorityBatch } from "../../../../domain/st-cement-priority-batch";
import { hashStAutoPartsPriorityBatch, stAutoPartsPriorityBatchMetrics, stAutoPartsPriorityRoutes, stAutoPartsPrioritySources, ST_AUTO_PARTS_PRIORITY_BATCH_VERSION, validateStAutoPartsPriorityBatch } from "../../../../domain/st-auto-parts-priority-batch";
import { hashStAutoPartsHighUseCorridors, stAutoPartsHighUseCorridorMetrics, stAutoPartsHighUseRoutes, stAutoPartsHighUseSources, stAutoPartsProductRouteAuditCases, stAutoPartsProductRouteCells, ST_AUTO_PARTS_HIGH_USE_CORRIDORS_VERSION, ST_AUTO_PARTS_OPERATION_FACT_LABELS, ST_AUTO_PARTS_PRODUCT_CATALOG, ST_AUTO_PARTS_SP_EXCLUSION_FROM, ST_AUTO_PARTS_SUPPORTED_PERIOD, validateStAutoPartsHighUseCorridors } from "../../../../domain/st-auto-parts-high-use-corridors";
import { hashStColdBeveragePriority, stColdBeverageApplicabilityMatrix, stColdBeverageMetrics, stColdBeverageRoutes, stColdBeverageSources, ST_COLD_BEVERAGE_OPERATION_FACT_LABELS, ST_COLD_BEVERAGE_PRODUCTS, ST_COLD_BEVERAGES_PRIORITY_VERSION, ST_COLD_BEVERAGES_SP_WATER_EXCLUSION_FROM, ST_COLD_BEVERAGES_SUPPORTED_PERIOD, validateStColdBeveragePriority } from "../../../../domain/st-cold-beverages-priority";
import { hashStColdBeverageSpDestination, stColdBeverageSpDestinationMetrics, stColdBeverageSpReferenceRuns, stColdBeverageSpSources, ST_COLD_BEVERAGES_SP_DESTINATION_PERIOD, ST_COLD_BEVERAGES_SP_DESTINATION_ROUTES, ST_COLD_BEVERAGES_SP_DESTINATION_VERSION, ST_COLD_BEVERAGES_SP_FACT_LABELS, ST_COLD_BEVERAGES_SP_PMPF_PROFILES, validateStColdBeverageSpDestination } from "../../../../domain/st-cold-beverages-sp-destination";
import { hashStColdBeverageSpOrigin, stColdBeverageSpOriginMetrics, stColdBeverageSpOriginReferenceRuns, stColdBeverageSpOriginSources, ST_COLD_BEVERAGES_SP_ORIGIN_FACT_LABELS, ST_COLD_BEVERAGES_SP_ORIGIN_PERIOD, ST_COLD_BEVERAGES_SP_ORIGIN_PMPF_PROFILES, ST_COLD_BEVERAGES_SP_ORIGIN_ROUTES, ST_COLD_BEVERAGES_SP_ORIGIN_VERSION, validateStColdBeverageSpOrigin } from "../../../../domain/st-cold-beverages-sp-origin";
import { hashStColdBeverageScDestination, stColdBeverageScMetrics, stColdBeverageScNegativeRuns, stColdBeverageScReferenceRuns, stColdBeverageScSources, ST_COLD_BEVERAGES_SC_DESTINATION_PERIOD, ST_COLD_BEVERAGES_SC_DESTINATION_VERSION, ST_COLD_BEVERAGES_SC_FACT_LABELS, ST_COLD_BEVERAGES_SC_PMPF_PROFILES, ST_COLD_BEVERAGES_SC_ROUTE, validateStColdBeverageScDestination } from "../../../../domain/st-cold-beverages-sc-destination";
import { hashStColdBeveragePriorityAudit, stColdBeveragePriorityAuditCases, stColdBeveragePriorityAuditCells, stColdBeveragePriorityAuditMetrics, ST_COLD_BEVERAGES_AUDITED_CORRIDORS, ST_COLD_BEVERAGES_PRIORITY_AUDIT_VERSION, validateStColdBeveragePriorityAudit } from "../../../../domain/st-cold-beverages-priority-audit";
import { hashStPharmaCosmeticsPriority, stPharmaCosmeticsCoverageCells, stPharmaCosmeticsLegalRoutes, stPharmaCosmeticsMetrics, stPharmaCosmeticsReferenceRuns, stPharmaCosmeticsSources, stPharmaCosmeticsStateRules, ST_PHARMA_COSMETICS_FACT_LABELS, ST_PHARMA_COSMETICS_PRIORITY_CHECKED_AT, ST_PHARMA_COSMETICS_PRIORITY_EVIDENCE, ST_PHARMA_COSMETICS_PRIORITY_VERSION, ST_PHARMA_COSMETICS_PRODUCTS, ST_PHARMA_COSMETICS_ROUTES, validateStPharmaCosmeticsPriority } from "../../../../domain/st-pharma-cosmetics-priority";
import { hashStConstructionElectricalPriority, stConstructionElectricalDossiers, stConstructionElectricalMetrics, stConstructionElectricalNegativeRuns, stConstructionElectricalReferenceRuns, stConstructionElectricalSources, ST_CONSTRUCTION_ELECTRICAL_FACT_LABELS, ST_CONSTRUCTION_ELECTRICAL_PERIOD, ST_CONSTRUCTION_ELECTRICAL_PRODUCTS, ST_CONSTRUCTION_ELECTRICAL_ROUTES, ST_CONSTRUCTION_ELECTRICAL_VERSION, validateStConstructionElectricalPriority } from "../../../../domain/st-construction-electrical-priority";
import { hashStConstructionElectricalNational, stConstructionElectricalNationalCases, stConstructionElectricalNationalCells, stConstructionElectricalNationalMetrics, ST_CONSTRUCTION_ELECTRICAL_NATIONAL_CHECKED_AT, ST_CONSTRUCTION_ELECTRICAL_NATIONAL_IDENTITIES, ST_CONSTRUCTION_ELECTRICAL_NATIONAL_ROUTES, ST_CONSTRUCTION_ELECTRICAL_NATIONAL_SOURCES, ST_CONSTRUCTION_ELECTRICAL_NATIONAL_VERSION, ST_CONSTRUCTION_ELECTRICAL_PRIORITY_EVIDENCE, validateStConstructionElectricalNational } from "../../../../domain/st-construction-electrical-national";
import { hashStFoodCleaningPetPriority, stFoodCleaningPetDossiers, stFoodCleaningPetMetrics, stFoodCleaningPetMvaFallbackRun, stFoodCleaningPetNegativeRuns, stFoodCleaningPetReferenceRuns, stFoodCleaningPetSources, ST_FOOD_CLEANING_PET_FACT_LABELS, ST_FOOD_CLEANING_PET_PERIOD, ST_FOOD_CLEANING_PET_PRODUCTS, ST_FOOD_CLEANING_PET_ROUTES, ST_FOOD_CLEANING_PET_VERSION, validateStFoodCleaningPetPriority } from "../../../../domain/st-food-cleaning-pet-priority";
import { hashStSectoralPriorityExpansion, stSectoralPriorityCases, stSectoralPriorityCells, stSectoralPriorityMetrics, ST_SECTORAL_PRIORITY_EXPANSION_CHECKED_AT, ST_SECTORAL_PRIORITY_EXPANSION_VERSION, ST_SECTORAL_RANKED_ROUTES, ST_SECTORAL_REPRESENTATIVES, validateStSectoralPriorityExpansion } from "../../../../domain/st-sectoral-priority-expansion";
import { hashNationalCoverageAutomaticAssurance, validateNationalCoverageAutomatically } from "../../../../domain/national-coverage-automatic-assurance";
import { hashSimplesNationalDeep, simplesActivityProfiles, simplesAnnexTables, simplesEligibilityGates, simplesExclusionRules, simplesNationalDeepMetrics, simplesNationalReferenceCases, simplesNationalSources, simplesSegregationRules, SIMPLES_NATIONAL_DEEP_CHECKED_AT, SIMPLES_NATIONAL_DEEP_VERSION, validateSimplesNationalDeep } from "../../../../domain/simples-national-deep";
import { hashPisCofinsDeep, pisCofinsCreditHypotheses, pisCofinsDeepMetrics, pisCofinsDeepSources, pisCofinsProductProfiles, pisCofinsReferenceCases, PIS_COFINS_DEEP_CHECKED_AT, PIS_COFINS_DEEP_SUPPORTED_PERIOD, PIS_COFINS_DEEP_VERSION, PIS_COFINS_LC224_EFFECTIVE_FROM, validatePisCofinsDeep } from "../../../../domain/pis-cofins-deep";
import { hashServiceWithholdingsDeep, serviceWithholdingProfiles, serviceWithholdingReferenceCases, serviceWithholdingRuleControls, serviceWithholdingSources, serviceWithholdingsDeepMetrics, SERVICE_WITHHOLDINGS_DEEP_CHECKED_AT, SERVICE_WITHHOLDINGS_DEEP_SUPPORTED_PERIOD, SERVICE_WITHHOLDINGS_DEEP_VERSION, validateServiceWithholdingsDeep } from "../../../../domain/service-withholdings-deep";
import { hashIpiTipiDeep, ipiTipiDeepMetrics, ipiTipiDeepSources, ipiTipiDeterministicCases, ipiTipiPriorityProfiles, IPI_TIPI_DEEP_CHECKED_AT, IPI_TIPI_DEEP_SUPPORTED_PERIOD, IPI_TIPI_DEEP_VERSION, validateIpiTipiDeep } from "../../../../domain/ipi-tipi-deep";
import { financialSpecificCombinedRateSchedule, fuelSpecificProductCatalog, hashTaxReformSectorCatalog, taxReformSectorMetrics, taxReformSectorProfiles, taxReformSectorSources, taxReformSpecificCases, TAX_REFORM_SECTOR_CHECKED_AT, TAX_REFORM_SECTOR_VERSION, validateTaxReformSectorCatalog } from "../../../../domain/tax-reform-sector-scenarios";
import { buildPublicCoverageIndicator } from "../../../../domain/public-coverage-indicator";
import { buildFiscalRegressionReport } from "../../../../domain/fiscal-regression-assurance";
import { hashIcmsGeneralNational, icmsGeneralNationalMetrics, icmsGeneralReferenceRuns, icmsGeneralSources, icmsStateGeneralProfiles, ICMS_GENERAL_NATIONAL_CHECKED_AT, ICMS_GENERAL_NATIONAL_VERSION, validateIcmsGeneralNational } from "../../../../domain/icms-general-national";
import { withApiTelemetry } from "../../../api-infrastructure";
import { hashOfficialSourceCertification, officialSourceAffectedRuleReport, officialSourceCertificationMetrics, officialSourceInventory, officialSourceLiveProbeSnapshot, officialSourceTechnicalAlternatives, OFFICIAL_SOURCE_CERTIFICATION_CHECKED_AT, OFFICIAL_SOURCE_CERTIFICATION_VERSION, validateOfficialSourceCertification } from "../../../../domain/official-source-certification";
import { FISCAL_IMPORT_CORPUS_VERSION, fiscalImportCorpusFiles, fiscalImportCorpusMetrics, hashFiscalImportCorpus, validateFiscalImportCorpus } from "../../../../domain/fiscal-import-corpus";

async function publicCoverage() {
  const fingerprint = (await hashNationalCoverage()).slice(0, 12);
  const technicalEvidence = await buildIssDeepTechnicalEvidence();
  const issRecurringFingerprint = (await hashIssRecurringPriority()).slice(0, 12);
  const stValidation = validateStSpMgLegalCatalog();
  const stFingerprint = (await hashStSpMgLegalCatalog()).slice(0, 12);
  const spOriginValidation = validateStSpOriginMatrix();
  const spOriginFingerprint = (await hashStSpOriginMatrix()).slice(0, 12);
  const representativeFingerprint = (await hashStRepresentativeProducts()).slice(0, 12);
  const calculationFingerprint = (await hashStSpCalculationRuns()).slice(0, 12);
  const cementFingerprint = (await hashStCementSpRoutes()).slice(0, 12);
  const cementPriorityFingerprint = (await hashStCementPriorityBatch()).slice(0, 12);
  const autoPartsPriorityFingerprint = (await hashStAutoPartsPriorityBatch()).slice(0, 12);
  const autoPartsHighUseFingerprint = (await hashStAutoPartsHighUseCorridors()).slice(0, 12);
  const coldBeveragesFingerprint = (await hashStColdBeveragePriority()).slice(0, 12);
  const coldBeveragesSpFingerprint = (await hashStColdBeverageSpDestination()).slice(0, 12);
  const coldBeveragesSpOriginFingerprint = (await hashStColdBeverageSpOrigin()).slice(0, 12);
  const coldBeveragesScFingerprint = (await hashStColdBeverageScDestination()).slice(0, 12);
  const coldBeveragesAuditFingerprint = (await hashStColdBeveragePriorityAudit()).slice(0, 12);
  const pharmaCosmeticsFingerprint = (await hashStPharmaCosmeticsPriority()).slice(0, 12);
  const constructionElectricalFingerprint = (await hashStConstructionElectricalPriority()).slice(0, 12);
  const constructionElectricalNationalFingerprint = (await hashStConstructionElectricalNational()).slice(0, 12);
  const foodCleaningPetFingerprint = (await hashStFoodCleaningPetPriority()).slice(0, 12);
  const sectoralPriorityFingerprint = (await hashStSectoralPriorityExpansion()).slice(0, 12);
  const simplesNationalFingerprint = (await hashSimplesNationalDeep()).slice(0, 12);
  const pisCofinsFingerprint = (await hashPisCofinsDeep()).slice(0, 12);
  const serviceWithholdingsFingerprint = (await hashServiceWithholdingsDeep()).slice(0, 12);
  const ipiTipiFingerprint = (await hashIpiTipiDeep()).slice(0, 12);
  const taxReformSectorFingerprint = (await hashTaxReformSectorCatalog()).slice(0, 12);
  const icmsGeneralFingerprint = (await hashIcmsGeneralNational()).slice(0, 12);
  const automaticAssuranceFingerprint = (await hashNationalCoverageAutomaticAssurance()).slice(0, 12);
  const sourceCertificationFingerprint = (await hashOfficialSourceCertification()).slice(0, 12);
  const fiscalImportFingerprint = (await hashFiscalImportCorpus()).slice(0, 12);
  const regressionReport = await buildFiscalRegressionReport();
  const coverageIndicator = await buildPublicCoverageIndicator();
  return Response.json({
    version: NATIONAL_COVERAGE_VERSION,
    checkedAt: NATIONAL_COVERAGE_CHECKED_AT,
    fingerprint,
    automaticAssurance: {
      ...validateNationalCoverageAutomatically(),
      fingerprint: automaticAssuranceFingerprint,
    },
    regressionReport,
    coverageIndicator,
    sourceCertification: {
      version: OFFICIAL_SOURCE_CERTIFICATION_VERSION,
      checkedAt: OFFICIAL_SOURCE_CERTIFICATION_CHECKED_AT,
      fingerprint: sourceCertificationFingerprint,
      validation: validateOfficialSourceCertification(),
      metrics: officialSourceCertificationMetrics(),
      liveProbe: officialSourceLiveProbeSnapshot,
      technicalAlternatives: officialSourceTechnicalAlternatives,
      affectedRules: officialSourceAffectedRuleReport(),
      sources: officialSourceInventory,
      policy: "Fonte confirmada exige identidade, emissor, dispositivo, vigência e consulta estruturados. Restrição técnica do portal permanece pendente; URL definitivamente ausente bloqueia a evidência e nunca é promovida a regra suportada.",
    },
    fiscalImportCorpus: {
      version: FISCAL_IMPORT_CORPUS_VERSION,
      fingerprint: fiscalImportFingerprint,
      validation: validateFiscalImportCorpus(),
      metrics: fiscalImportCorpusMetrics(),
      files: fiscalImportCorpusFiles,
      policy: "Corpus exclusivamente sintético e anonimizado. O bruto importado é descartado; somente evidência minimizada, rejeições e conciliações com motores versionados são preservadas.",
    },
    metrics: coverageMetrics(),
    states: stateCoverage,
    icmsGeneral: {
      version: ICMS_GENERAL_NATIONAL_VERSION,
      checkedAt: ICMS_GENERAL_NATIONAL_CHECKED_AT,
      fingerprint: icmsGeneralFingerprint,
      validation: validateIcmsGeneralNational(),
      metrics: icmsGeneralNationalMetrics(),
      profiles: icmsStateGeneralProfiles,
      sources: icmsGeneralSources,
      referenceRuns: icmsGeneralReferenceRuns,
      policy: "A alíquota modal é referência geral, não conclusão fiscal. NCM, finalidade, destinatário, ST, benefício, redução, diferimento, FCP e método estadual do DIFAL são portões obrigatórios; fórmula não comprovada bloqueia o valor.",
    },
    cities: cityCoverage,
    issDeep: {
      version: ISS_DEEP_VERSION,
      checkedAt: ISS_DEEP_CHECKED_AT,
      metrics: issDeepMetrics,
      profiles: issDeepCityProfiles,
      serviceCoverage: issDeepServiceCoverage,
      sources: issDeepSources,
      technicalEvidence,
      policy: "Pacote estruturado não libera alíquota. Somente uma regra municipal exata, vigente, versionada e compatível com todos os fatos do cenário controlado libera memória determinística; qualquer divergência bloqueia o resultado.",
    },
    issRecurringPriority: {
      version: ISS_RECURRING_PRIORITY_VERSION,
      checkedAt: ISS_RECURRING_PRIORITY_CHECKED_AT,
      fingerprint: issRecurringFingerprint,
      validation: validateIssRecurringPriority(),
      metrics: issRecurringPriorityMetrics(),
      items: issRecurringPriorityItems,
      municipalities: issRecurringPriorityMunicipalities,
      cells: issRecurringPriorityCells,
      referenceCases: issRecurringPriorityReferenceCases,
      policy: "A célula auditada não é uma alíquota. Código, alíquota, vigência, incidência, tomador e retenção municipais precisam estar exatos antes de qualquer memória; ausência de prova mantém o status parcial e bloqueia o valor.",
    },
    stSegments,
    stSpMg: {
      version: ST_SP_MG_LEGAL_VERSION,
      fingerprint: stFingerprint,
      validation: stValidation,
      metrics: stSpMgLegalMetrics(),
      packages: stSpMgLegalPackages,
      policy: "Estruturado significa que os fatos legais obrigatórios, o capítulo e a fonte estão identificados. Cálculo validado exige um CEST/NCM representativo, âmbito SP→MG vigente, parâmetro de preço e testes determinísticos; os demais permanecem bloqueados.",
    },
    stSpOriginMatrix: {
      version: ST_SP_ORIGIN_MATRIX_VERSION,
      fingerprint: spOriginFingerprint,
      validation: spOriginValidation,
      metrics: stSpOriginMatrixMetrics(),
      mandatoryFacts: stSpOriginMandatoryFacts,
      destinations: stSpOriginDestinations,
      cells: stSpOriginCells,
      policy: "Matriz estruturada não significa cálculo liberado. Cada célula SP→UF permanece bloqueada até acordo, legislação do destino, parâmetros, exceções e teste determinístico estarem documentados.",
    },
    stRepresentativeProducts: {
      version: ST_REPRESENTATIVE_PRODUCTS_VERSION,
      fingerprint: representativeFingerprint,
      validation: validateStRepresentativeProducts(),
      source: ST_REPRESENTATIVE_PRODUCTS_SOURCE,
      products: stRepresentativeProducts,
      policy: "Um produto congela apenas uma identidade fiscal representativa. Ele não valida os demais produtos do segmento nem fornece parâmetros dos estados de destino.",
    },
    stSpCalculationValidation: {
      version: ST_SP_CALCULATION_VALIDATION_VERSION,
      fingerprint: calculationFingerprint,
      validation: validateStSpCalculationRuns(),
      metrics: stSpCalculationValidationMetrics(),
      runs: stSpCalculationRuns,
      policy: "As 650 células são executadas. Uma referência só gera memória quando todos os parâmetros jurídicos controlados existem; ausência de lei, acordo, MVA, alíquota ou FCP produz bloqueio sem valor final.",
    },
    stCementSpRoutes: {
      version: ST_CEMENT_SP_ROUTES_VERSION,
      fingerprint: cementFingerprint,
      validation: validateStCementSpRoutes(),
      metrics: stCementSpRouteMetrics(),
      sources: [ST_CEMENT_PROTOCOL_SOURCE, ST_CEMENT_PRODUCT_SOURCE],
      routes: stCementSpRoutes,
      policy: "O protocolo confirma âmbito, responsabilidade-base, formação da base, MVA original e prazo; o valor final permanece bloqueado até a legislação vigente do destino fornecer alíquota, FCP, base alternativa, benefícios e exceções do caso concreto.",
    },
    stCementPriorityBatch: {
      version: ST_CEMENT_PRIORITY_BATCH_VERSION,
      fingerprint: cementPriorityFingerprint,
      validation: validateStCementPriorityBatch(),
      metrics: stCementPriorityBatchMetrics(),
      sources: stCementPrioritySources,
      states: stCementPriorityStates,
      policy: "Parâmetro estadual estruturado não equivale a cálculo liberado. A referência do Rio de Janeiro é exclusivamente sintética; operações reais continuam condicionadas ao produto, GTIN, vigência, base aplicável, benefícios, regime do contribuinte e demais fatos documentados.",
    },
    stAutoPartsPriorityBatch: {
      version: ST_AUTO_PARTS_PRIORITY_BATCH_VERSION,
      fingerprint: autoPartsPriorityFingerprint,
      validation: validateStAutoPartsPriorityBatch(),
      metrics: stAutoPartsPriorityBatchMetrics(),
      sources: stAutoPartsPrioritySources,
      routes: stAutoPartsPriorityRoutes,
      policy: "As 26 rotas com origem em São Paulo foram confrontadas com a redação vigente do Protocolo 41/08. A plataforma distingue acordo interestadual vigente de tratamento próprio do destino; nenhum valor final é liberado sem parâmetros estaduais e fatos da operação.",
    },
    stAutoPartsHighUseCorridors: {
      version: ST_AUTO_PARTS_HIGH_USE_CORRIDORS_VERSION,
      fingerprint: autoPartsHighUseFingerprint,
      validation: validateStAutoPartsHighUseCorridors(),
      metrics: stAutoPartsHighUseCorridorMetrics(),
      supportedPeriod: ST_AUTO_PARTS_SUPPORTED_PERIOD,
      spExclusionFrom: ST_AUTO_PARTS_SP_EXCLUSION_FROM,
      operationFactLabels: ST_AUTO_PARTS_OPERATION_FACT_LABELS,
      products: ST_AUTO_PARTS_PRODUCT_CATALOG,
      productRouteCells: stAutoPartsProductRouteCells,
      productRouteAuditCases: stAutoPartsProductRouteAuditCases,
      sources: stAutoPartsHighUseSources,
      routes: stAutoPartsHighUseRoutes,
      policy: "Sete identidades fiscais são cruzadas com 24 sentidos, formando 168 células versionadas. As 70 células das dez rotas ativas têm memória condicional reproduzível; as 98 direções fora do acordo vigente são não suportadas, trazem motivo legal explícito e nunca emitem valor. Fatos ausentes bloqueiam o número e o destino São Paulo deixa de calcular esta ST a partir de 01/10/2026.",
    },
    stColdBeveragesPriority: {
      version: ST_COLD_BEVERAGES_PRIORITY_VERSION,
      fingerprint: coldBeveragesFingerprint,
      validation: validateStColdBeveragePriority(),
      metrics: stColdBeverageMetrics(),
      supportedPeriod: ST_COLD_BEVERAGES_SUPPORTED_PERIOD,
      spWaterExclusionFrom: ST_COLD_BEVERAGES_SP_WATER_EXCLUSION_FROM,
      operationFactLabels: ST_COLD_BEVERAGE_OPERATION_FACT_LABELS,
      products: ST_COLD_BEVERAGE_PRODUCTS,
      sources: stColdBeverageSources,
      routes: stColdBeverageRoutes,
      applicability: stColdBeverageApplicabilityMatrix,
      policy: "A prioridade dos corredores é uma heurística operacional interna, não estatística oficial de NF-e. Cada sentido e produto é conferido separadamente; 80 memórias com destino a São Paulo, 10 memórias SP→MG/RJ e 5 PMPF com 10 fallbacks SP→SC usam perfis exatos. Todas as demais combinações continuam bloqueadas.",
    },
    stColdBeveragesSpDestination: {
      version: ST_COLD_BEVERAGES_SP_DESTINATION_VERSION,
      fingerprint: coldBeveragesSpFingerprint,
      validation: validateStColdBeverageSpDestination(),
      metrics: stColdBeverageSpDestinationMetrics(),
      supportedPeriod: ST_COLD_BEVERAGES_SP_DESTINATION_PERIOD,
      factLabels: ST_COLD_BEVERAGES_SP_FACT_LABELS,
      routes: ST_COLD_BEVERAGES_SP_DESTINATION_ROUTES,
      profiles: ST_COLD_BEVERAGES_SP_PMPF_PROFILES,
      runs: stColdBeverageSpReferenceRuns,
      sources: stColdBeverageSpSources,
      policy: "Escopo fechado para dez perfis exatos — cinco genéricos legalmente elegíveis e cinco perfis listados de alto giro, inclusive pack integral — em oito origens prioritárias e operações de regime normal entre 01/07 e 31/12/2026. Água, Simples Nacional, perfil divergente, valor próprio a partir de 90% do PMPF ou qualquer fato ausente bloqueiam o número.",
    },
    stColdBeveragesSpOrigin: {
      version: ST_COLD_BEVERAGES_SP_ORIGIN_VERSION,
      fingerprint: coldBeveragesSpOriginFingerprint,
      validation: validateStColdBeverageSpOrigin(),
      metrics: stColdBeverageSpOriginMetrics(),
      supportedPeriod: ST_COLD_BEVERAGES_SP_ORIGIN_PERIOD,
      factLabels: ST_COLD_BEVERAGES_SP_ORIGIN_FACT_LABELS,
      routes: ST_COLD_BEVERAGES_SP_ORIGIN_ROUTES,
      profiles: ST_COLD_BEVERAGES_SP_ORIGIN_PMPF_PROFILES,
      runs: stColdBeverageSpOriginReferenceRuns,
      sources: stColdBeverageSpOriginSources,
      policy: "Escopo fechado para cinco perfis de alto giro em SP→MG e cinco em SP→RJ, sempre no regime normal e entre contribuintes. O motor preserva a diferença jurídica da trava de 80%, separa ICMS-ST e FCP e bloqueia qualquer perfil, vigência ou fato divergente.",
    },
    stColdBeveragesScDestination: {
      version: ST_COLD_BEVERAGES_SC_DESTINATION_VERSION,
      fingerprint: coldBeveragesScFingerprint,
      validation: validateStColdBeverageScDestination(),
      metrics: stColdBeverageScMetrics(),
      supportedPeriod: ST_COLD_BEVERAGES_SC_DESTINATION_PERIOD,
      factLabels: ST_COLD_BEVERAGES_SC_FACT_LABELS,
      route: ST_COLD_BEVERAGES_SC_ROUTE,
      profiles: ST_COLD_BEVERAGES_SC_PMPF_PROFILES,
      positiveRuns: stColdBeverageScReferenceRuns,
      negativeRuns: stColdBeverageScNegativeRuns,
      sources: stColdBeverageScSources,
      policy: "Recorte fechado SP→SC para cinco marca/GTIN/embalagem/volumes exatos entre 01/08 e 30/11/2026. O PMPF é usado abaixo de 90% da pauta e o fallback aplica MVA distinta por papel do remetente. Perfil, regime, interdependência, documento ou vigência divergente bloqueiam a memória.",
    },
    stColdBeveragesPriorityAudit: {
      version: ST_COLD_BEVERAGES_PRIORITY_AUDIT_VERSION,
      fingerprint: coldBeveragesAuditFingerprint,
      validation: validateStColdBeveragePriorityAudit(),
      metrics: stColdBeveragePriorityAuditMetrics(),
      corridors: ST_COLD_BEVERAGES_AUDITED_CORRIDORS,
      cells: stColdBeveragePriorityAuditCells,
      cases: stColdBeveragePriorityAuditCases,
      policy: "Os oito corredores comerciais de maior prioridade interna são auditados nos dois sentidos e nas seis identidades. Suportado exige perfil exato no módulo do destino; ausência de parâmetro estadual resulta em não suportado, nunca em valor emprestado.",
    },
    stSectoralPriorityExpansion: {
      version: ST_SECTORAL_PRIORITY_EXPANSION_VERSION,
      checkedAt: ST_SECTORAL_PRIORITY_EXPANSION_CHECKED_AT,
      fingerprint: sectoralPriorityFingerprint,
      validation: validateStSectoralPriorityExpansion(),
      metrics: stSectoralPriorityMetrics(),
      rankedRoutes: ST_SECTORAL_RANKED_ROUTES,
      representatives: ST_SECTORAL_REPRESENTATIVES,
      cells: stSectoralPriorityCells,
      cases: stSectoralPriorityCases,
      policy: "A matriz ranqueia dez rotas por segmento por heurística operacional interna. Somente células com identidade, fonte, vigência, responsabilidade e memória já congeladas são suportadas; qualquer lacuna bloqueia o valor e proíbe reutilizar parâmetros de outra UF ou do sentido inverso.",
    },
    ipiTipiDeep: {
      version: IPI_TIPI_DEEP_VERSION,
      checkedAt: IPI_TIPI_DEEP_CHECKED_AT,
      supportedPeriod: IPI_TIPI_DEEP_SUPPORTED_PERIOD,
      fingerprint: ipiTipiFingerprint,
      validation: validateIpiTipiDeep(),
      metrics: ipiTipiDeepMetrics(),
      profiles: ipiTipiPriorityProfiles,
      referenceCases: ipiTipiDeterministicCases,
      sources: ipiTipiDeepSources,
      policy: "Somente NCM de oito dígitos e descrição, notas, Ex, papel, operação e vigência confirmados liberam memória. Benefício externo e devolução exigem regra documental própria; nenhum prefixo ou rótulo aproximado herda alíquota.",
    },
    taxReformSectorDeep: {
      version: TAX_REFORM_SECTOR_VERSION,
      checkedAt: TAX_REFORM_SECTOR_CHECKED_AT,
      fingerprint: taxReformSectorFingerprint,
      validation: validateTaxReformSectorCatalog(),
      metrics: taxReformSectorMetrics(),
      profiles: taxReformSectorProfiles,
      financialSpecificCombinedRateSchedule,
      fuelSpecificProductCatalog,
      specificCases: taxReformSpecificCases,
      sources: taxReformSectorSources,
      policy: "Financeiro, combustíveis e imóveis usam memórias próprias. Ato, classificação, base, crédito, redutor, alíquota ou vigência pendentes bloqueiam o valor; parâmetros sintéticos da regressão nunca são promovidos a regra fiscal de produção.",
    },
    simplesNationalDeep: {
      version: SIMPLES_NATIONAL_DEEP_VERSION,
      checkedAt: SIMPLES_NATIONAL_DEEP_CHECKED_AT,
      fingerprint: simplesNationalFingerprint,
      validation: validateSimplesNationalDeep(),
      metrics: simplesNationalDeepMetrics(),
      profiles: simplesActivityProfiles,
      annexTables: simplesAnnexTables,
      segregations: simplesSegregationRules,
      eligibilityGates: simplesEligibilityGates,
      impediments: simplesExclusionRules,
      referenceCases: simplesNationalReferenceCases,
      sources: simplesNationalSources,
      policy: "CNAE somente localiza um perfil candidato. DAS em centavos exige atividade e anexo confirmados, RBT12, folha quando houver fator R, receita mensal segregada, período fechado, elegibilidade, sublimite e tratamentos especiais reconciliados.",
    },
    pisCofinsDeep: {
      version: PIS_COFINS_DEEP_VERSION,
      checkedAt: PIS_COFINS_DEEP_CHECKED_AT,
      supportedPeriod: PIS_COFINS_DEEP_SUPPORTED_PERIOD,
      lc224EffectiveFrom: PIS_COFINS_LC224_EFFECTIVE_FROM,
      fingerprint: pisCofinsFingerprint,
      validation: validatePisCofinsDeep(),
      metrics: pisCofinsDeepMetrics(),
      profiles: pisCofinsProductProfiles,
      creditHypotheses: pisCofinsCreditHypotheses,
      referenceCases: pisCofinsReferenceCases,
      sources: pisCofinsDeepSources,
      policy: "NCM exato na tabela oficial, papel na cadeia, documento, receita segregada, vínculo, incidência da aquisição e vigência são gates. Créditos com método específico nunca herdam automaticamente 1,65% e 7,60%.",
    },
    serviceWithholdingsDeep: {
      version: SERVICE_WITHHOLDINGS_DEEP_VERSION,
      checkedAt: SERVICE_WITHHOLDINGS_DEEP_CHECKED_AT,
      supportedPeriod: SERVICE_WITHHOLDINGS_DEEP_SUPPORTED_PERIOD,
      fingerprint: serviceWithholdingsFingerprint,
      validation: validateServiceWithholdingsDeep(),
      metrics: serviceWithholdingsDeepMetrics(),
      profiles: serviceWithholdingProfiles,
      ruleControls: serviceWithholdingRuleControls,
      referenceCases: serviceWithholdingReferenceCases,
      sources: serviceWithholdingSources,
      policy: "IRRF, CSRF, INSS e ISS são resolvidos em livros independentes. O líquido somente existe quando contrato, partes, regime, fatos, bases, cessão ou empreitada, CPRB, município, lei, responsabilidade e simultaneidade estão integralmente confirmados.",
    },
    stPharmaCosmeticsPriority: {
      version: ST_PHARMA_COSMETICS_PRIORITY_VERSION,
      checkedAt: ST_PHARMA_COSMETICS_PRIORITY_CHECKED_AT,
      fingerprint: pharmaCosmeticsFingerprint,
      validation: validateStPharmaCosmeticsPriority(),
      metrics: stPharmaCosmeticsMetrics(),
      priorityEvidence: ST_PHARMA_COSMETICS_PRIORITY_EVIDENCE,
      factLabels: ST_PHARMA_COSMETICS_FACT_LABELS,
      products: ST_PHARMA_COSMETICS_PRODUCTS,
      routes: ST_PHARMA_COSMETICS_ROUTES,
      legalRoutes: stPharmaCosmeticsLegalRoutes,
      stateRules: stPharmaCosmeticsStateRules,
      cells: stPharmaCosmeticsCoverageCells,
      runs: stPharmaCosmeticsReferenceRuns,
      sources: stPharmaCosmeticsSources,
      policy: "A ordem é uma heurística econômica e operacional documentada, não frequência oficial de NF-e. R$ 0,00 representa somente ICMS-ST não aplicável nos recortes estaduais comprovados; não é isenção. PMC, PMPF, MVA, FCP, benefícios e responsabilidade permanecem bloqueados quando a apresentação e o item estadual não estão integralmente fechados.",
    },
    stConstructionElectricalPriority: {
      version: ST_CONSTRUCTION_ELECTRICAL_VERSION,
      fingerprint: constructionElectricalFingerprint,
      validation: validateStConstructionElectricalPriority(),
      metrics: stConstructionElectricalMetrics(),
      supportedPeriod: ST_CONSTRUCTION_ELECTRICAL_PERIOD,
      factLabels: ST_CONSTRUCTION_ELECTRICAL_FACT_LABELS,
      products: ST_CONSTRUCTION_ELECTRICAL_PRODUCTS,
      routes: ST_CONSTRUCTION_ELECTRICAL_ROUTES,
      referenceRuns: stConstructionElectricalReferenceRuns,
      negativeRuns: stConstructionElectricalNegativeRuns,
      sources: stConstructionElectricalSources,
      dossiers: stConstructionElectricalDossiers,
      nationalExpansion: {
        version: ST_CONSTRUCTION_ELECTRICAL_NATIONAL_VERSION,
        checkedAt: ST_CONSTRUCTION_ELECTRICAL_NATIONAL_CHECKED_AT,
        fingerprint: constructionElectricalNationalFingerprint,
        validation: validateStConstructionElectricalNational(),
        metrics: stConstructionElectricalNationalMetrics(),
        priorityEvidence: ST_CONSTRUCTION_ELECTRICAL_PRIORITY_EVIDENCE,
        identities: ST_CONSTRUCTION_ELECTRICAL_NATIONAL_IDENTITIES,
        routes: ST_CONSTRUCTION_ELECTRICAL_NATIONAL_ROUTES,
        cells: stConstructionElectricalNationalCells,
        cases: stConstructionElectricalNationalCases,
        sources: ST_CONSTRUCTION_ELECTRICAL_NATIONAL_SOURCES,
        policy: "A matriz nacional separa identidade, destino, sentido e vigência. Somente SP→MG, SP→RJ e a retirada comprovada da ST em SP→SC liberam memória no recorte atual; as demais células permanecem parciais ou não suportadas sem reutilizar MVA, alíquota ou responsabilidade entre UFs.",
      },
      policy: "Escopo fechado para seis identidades fiscais de construção, acabamento, ferramentas e elétricos nas rotas SP→MG e SP→RJ. NCM/CEST, revenda, vigência, responsabilidade, MVA, alíquotas, FCP/FECP e exclusões são fatos obrigatórios; divergência ou ausência bloqueia o valor.",
    },
    stFoodCleaningPetPriority: {
      version: ST_FOOD_CLEANING_PET_VERSION,
      fingerprint: foodCleaningPetFingerprint,
      validation: validateStFoodCleaningPetPriority(),
      metrics: stFoodCleaningPetMetrics(),
      supportedPeriod: ST_FOOD_CLEANING_PET_PERIOD,
      factLabels: ST_FOOD_CLEANING_PET_FACT_LABELS,
      products: ST_FOOD_CLEANING_PET_PRODUCTS,
      routes: ST_FOOD_CLEANING_PET_ROUTES,
      referenceRuns: stFoodCleaningPetReferenceRuns,
      mvaFallbackRun: stFoodCleaningPetMvaFallbackRun,
      negativeRuns: stFoodCleaningPetNegativeRuns,
      sources: stFoodCleaningPetSources,
      dossiers: stFoodCleaningPetDossiers,
      policy: "Vinte e cinco identidades fiscais permanecem segregadas entre alimentos, limpeza, higiene doméstica e pet food em nove destinos prioritários. SP→MG possui 24 memórias por MVA e uma por PMPF vigente; as outras 200 células são catalogadas e bloqueadas até o fechamento estadual, sem receber parâmetros mineiros ou do sentido inverso. Produto, apresentação, operação, data, benefício ou documento divergente bloqueiam o valor.",
    },
    recurringScenarios,
    sources: coverageSources,
    legend: {
      supported: "Cenário com regra, fatos obrigatórios e testes automáticos disponíveis dentro do escopo indicado.",
      partial: "Triagem e parte da memória são suportadas; a conclusão depende de fatos ou homologação adicional.",
      not_supported: "O sistema identifica o tema, mas bloqueia cálculo ou conclusão.",
    },
    safety: "O indicador mede cobertura do produto, não garante aplicabilidade à operação concreta. Nenhuma regra parcial ou não suportada pode produzir conclusão definitiva.",
  }, { headers: { "Cache-Control": "no-store" } });
}

export const GET = withApiTelemetry("GET /api/public/coverage", publicCoverage);

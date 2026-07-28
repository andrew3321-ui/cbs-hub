import { cityCoverage, coverageMetrics, coverageSources, hashNationalCoverage, NATIONAL_COVERAGE_CHECKED_AT, NATIONAL_COVERAGE_VERSION, recurringScenarios, stateCoverage, stSegments } from "../../../../domain/national-tax-coverage";
import { buildIssDeepTechnicalEvidence, ISS_DEEP_CHECKED_AT, ISS_DEEP_VERSION, issDeepCityProfiles, issDeepMetrics, issDeepServiceCoverage, issDeepSources } from "../../../../domain/iss-deep-coverage";
import { hashStSpMgLegalCatalog, stSpMgLegalMetrics, stSpMgLegalPackages, ST_SP_MG_LEGAL_VERSION, validateStSpMgLegalCatalog } from "../../../../domain/st-sp-mg-legal";
import { hashStSpOriginMatrix, stSpOriginCells, stSpOriginDestinations, stSpOriginMandatoryFacts, stSpOriginMatrixMetrics, ST_SP_ORIGIN_MATRIX_VERSION, validateStSpOriginMatrix } from "../../../../domain/st-sp-origin-matrix";
import { hashStRepresentativeProducts, stRepresentativeProducts, ST_REPRESENTATIVE_PRODUCTS_SOURCE, ST_REPRESENTATIVE_PRODUCTS_VERSION, validateStRepresentativeProducts } from "../../../../domain/st-representative-products";
import { hashStSpCalculationRuns, stSpCalculationRuns, stSpCalculationValidationMetrics, ST_SP_CALCULATION_VALIDATION_VERSION, validateStSpCalculationRuns } from "../../../../domain/st-sp-calculation-validation";
import { hashStCementSpRoutes, stCementSpRouteMetrics, stCementSpRoutes, ST_CEMENT_PRODUCT_SOURCE, ST_CEMENT_PROTOCOL_SOURCE, ST_CEMENT_SP_ROUTES_VERSION, validateStCementSpRoutes } from "../../../../domain/st-cement-sp-routes";
import { hashStCementPriorityBatch, stCementPriorityBatchMetrics, stCementPrioritySources, stCementPriorityStates, ST_CEMENT_PRIORITY_BATCH_VERSION, validateStCementPriorityBatch } from "../../../../domain/st-cement-priority-batch";
import { hashStAutoPartsPriorityBatch, stAutoPartsPriorityBatchMetrics, stAutoPartsPriorityRoutes, stAutoPartsPrioritySources, ST_AUTO_PARTS_PRIORITY_BATCH_VERSION, validateStAutoPartsPriorityBatch } from "../../../../domain/st-auto-parts-priority-batch";
import { hashStAutoPartsHighUseCorridors, stAutoPartsHighUseCorridorMetrics, stAutoPartsHighUseRoutes, stAutoPartsHighUseSources, ST_AUTO_PARTS_HIGH_USE_CORRIDORS_VERSION, ST_AUTO_PARTS_OPERATION_FACT_LABELS, ST_AUTO_PARTS_SP_EXCLUSION_FROM, ST_AUTO_PARTS_SUPPORTED_PERIOD, validateStAutoPartsHighUseCorridors } from "../../../../domain/st-auto-parts-high-use-corridors";
import { hashStColdBeveragePriority, stColdBeverageApplicabilityMatrix, stColdBeverageMetrics, stColdBeverageRoutes, stColdBeverageSources, ST_COLD_BEVERAGE_OPERATION_FACT_LABELS, ST_COLD_BEVERAGE_PRODUCTS, ST_COLD_BEVERAGES_PRIORITY_VERSION, ST_COLD_BEVERAGES_SP_WATER_EXCLUSION_FROM, ST_COLD_BEVERAGES_SUPPORTED_PERIOD, validateStColdBeveragePriority } from "../../../../domain/st-cold-beverages-priority";
import { hashStColdBeverageSpDestination, stColdBeverageSpDestinationMetrics, stColdBeverageSpReferenceRuns, stColdBeverageSpSources, ST_COLD_BEVERAGES_SP_DESTINATION_PERIOD, ST_COLD_BEVERAGES_SP_DESTINATION_ROUTES, ST_COLD_BEVERAGES_SP_DESTINATION_VERSION, ST_COLD_BEVERAGES_SP_FACT_LABELS, ST_COLD_BEVERAGES_SP_PMPF_PROFILES, validateStColdBeverageSpDestination } from "../../../../domain/st-cold-beverages-sp-destination";
import { hashStColdBeverageSpOrigin, stColdBeverageSpOriginMetrics, stColdBeverageSpOriginReferenceRuns, stColdBeverageSpOriginSources, ST_COLD_BEVERAGES_SP_ORIGIN_FACT_LABELS, ST_COLD_BEVERAGES_SP_ORIGIN_PERIOD, ST_COLD_BEVERAGES_SP_ORIGIN_PMPF_PROFILES, ST_COLD_BEVERAGES_SP_ORIGIN_ROUTES, ST_COLD_BEVERAGES_SP_ORIGIN_VERSION, validateStColdBeverageSpOrigin } from "../../../../domain/st-cold-beverages-sp-origin";
import { hashNationalCoverageAutomaticAssurance, validateNationalCoverageAutomatically } from "../../../../domain/national-coverage-automatic-assurance";
import { buildPublicCoverageIndicator } from "../../../../domain/public-coverage-indicator";
import { buildFiscalRegressionReport } from "../../../../domain/fiscal-regression-assurance";
import { withApiTelemetry } from "../../../api-infrastructure";

async function publicCoverage() {
  const fingerprint = (await hashNationalCoverage()).slice(0, 12);
  const technicalEvidence = await buildIssDeepTechnicalEvidence();
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
  const automaticAssuranceFingerprint = (await hashNationalCoverageAutomaticAssurance()).slice(0, 12);
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
    metrics: coverageMetrics(),
    states: stateCoverage,
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
      sources: stAutoPartsHighUseSources,
      routes: stAutoPartsHighUseRoutes,
      policy: "Os 12 corredores prioritários são avaliados nos dois sentidos, totalizando 24 decisões independentes. Dez rotas ativas têm memória condicional reproduzível; fatos ausentes bloqueiam o número e o destino São Paulo deixa de calcular esta ST a partir de 01/10/2026.",
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
      policy: "A prioridade dos corredores é uma heurística operacional interna, não estatística oficial de NF-e. Cada sentido e produto é conferido separadamente; 35 memórias com destino a São Paulo e 10 memórias SP→MG/RJ usam perfis exatos das pautas vigentes. Todas as demais combinações continuam bloqueadas.",
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
      policy: "Escopo fechado somente para cinco perfis de “Demais marcas não listadas”, sete origens prioritárias e operações de regime normal entre 01/07 e 31/12/2026. Marca listada, água, Simples Nacional, valor próprio a partir de 90% do PMPF ou qualquer fato divergente bloqueiam o número.",
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

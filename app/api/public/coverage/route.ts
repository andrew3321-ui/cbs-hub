import { cityCoverage, coverageMetrics, coverageSources, hashNationalCoverage, NATIONAL_COVERAGE_CHECKED_AT, NATIONAL_COVERAGE_VERSION, recurringScenarios, stateCoverage, stSegments } from "../../../../domain/national-tax-coverage";
import { buildIssDeepTechnicalEvidence, issDeepCityProfiles, issDeepMetrics, issDeepSources } from "../../../../domain/iss-deep-coverage";
import { hashStSpMgLegalCatalog, stSpMgLegalMetrics, stSpMgLegalPackages, ST_SP_MG_LEGAL_VERSION, validateStSpMgLegalCatalog } from "../../../../domain/st-sp-mg-legal";
import { hashStSpOriginMatrix, stSpOriginCells, stSpOriginDestinations, stSpOriginMandatoryFacts, stSpOriginMatrixMetrics, ST_SP_ORIGIN_MATRIX_VERSION, validateStSpOriginMatrix } from "../../../../domain/st-sp-origin-matrix";
import { hashStRepresentativeProducts, stRepresentativeProducts, ST_REPRESENTATIVE_PRODUCTS_SOURCE, ST_REPRESENTATIVE_PRODUCTS_VERSION, validateStRepresentativeProducts } from "../../../../domain/st-representative-products";
import { hashStSpCalculationRuns, stSpCalculationRuns, stSpCalculationValidationMetrics, ST_SP_CALCULATION_VALIDATION_VERSION, validateStSpCalculationRuns } from "../../../../domain/st-sp-calculation-validation";
import { hashStCementSpRoutes, stCementSpRouteMetrics, stCementSpRoutes, ST_CEMENT_PRODUCT_SOURCE, ST_CEMENT_PROTOCOL_SOURCE, ST_CEMENT_SP_ROUTES_VERSION, validateStCementSpRoutes } from "../../../../domain/st-cement-sp-routes";
import { hashStCementPriorityBatch, stCementPriorityBatchMetrics, stCementPrioritySources, stCementPriorityStates, ST_CEMENT_PRIORITY_BATCH_VERSION, validateStCementPriorityBatch } from "../../../../domain/st-cement-priority-batch";
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
  return Response.json({
    version: NATIONAL_COVERAGE_VERSION,
    checkedAt: NATIONAL_COVERAGE_CHECKED_AT,
    fingerprint,
    metrics: coverageMetrics(),
    states: stateCoverage,
    cities: cityCoverage,
    issDeep: {
      metrics: issDeepMetrics,
      profiles: issDeepCityProfiles,
      sources: issDeepSources,
      technicalEvidence,
      policy: "Revisado tecnicamente significa estrutura, rastreabilidade e bloqueios do software testados. Não significa caso fiscal validado, homologação profissional ou cálculo exato liberado.",
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
    recurringScenarios,
    sources: coverageSources,
    legend: {
      supported: "Cenário com regra, fatos obrigatórios, testes e aprovação profissional disponíveis.",
      partial: "Triagem e parte da memória são suportadas; a conclusão depende de fatos ou homologação adicional.",
      not_supported: "O sistema identifica o tema, mas bloqueia cálculo ou conclusão.",
    },
    safety: "O indicador mede cobertura do produto, não garante aplicabilidade à operação concreta. Nenhuma regra parcial ou não suportada pode produzir conclusão definitiva.",
  }, { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" } });
}

export const GET = withApiTelemetry("GET /api/public/coverage", publicCoverage);

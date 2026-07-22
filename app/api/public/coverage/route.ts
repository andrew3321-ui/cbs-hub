import { cityCoverage, coverageMetrics, coverageSources, hashNationalCoverage, NATIONAL_COVERAGE_CHECKED_AT, NATIONAL_COVERAGE_VERSION, recurringScenarios, stateCoverage, stSegments } from "../../../../domain/national-tax-coverage";
import { buildIssDeepTechnicalEvidence, issDeepCityProfiles, issDeepMetrics, issDeepSources } from "../../../../domain/iss-deep-coverage";
import { hashStSpMgLegalCatalog, stSpMgLegalMetrics, stSpMgLegalPackages, ST_SP_MG_LEGAL_VERSION, validateStSpMgLegalCatalog } from "../../../../domain/st-sp-mg-legal";
import { withApiTelemetry } from "../../../api-infrastructure";

async function publicCoverage() {
  const fingerprint = (await hashNationalCoverage()).slice(0, 12);
  const technicalEvidence = await buildIssDeepTechnicalEvidence();
  const stValidation = validateStSpMgLegalCatalog();
  const stFingerprint = (await hashStSpMgLegalCatalog()).slice(0, 12);
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

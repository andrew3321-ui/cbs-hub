import { cityCoverage, coverageMetrics, coverageSources, hashNationalCoverage, NATIONAL_COVERAGE_CHECKED_AT, NATIONAL_COVERAGE_VERSION, recurringScenarios, stateCoverage, stSegments } from "../../../../domain/national-tax-coverage";
import { issDeepCityProfiles, issDeepMetrics, issDeepSources } from "../../../../domain/iss-deep-coverage";
import { withApiTelemetry } from "../../../api-infrastructure";

async function publicCoverage() {
  const fingerprint = (await hashNationalCoverage()).slice(0, 12);
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
      policy: "Estruturado significa fontes e portões técnicos conectados. Não significa testado, homologado ou liberado para cálculo exato.",
    },
    stSegments,
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

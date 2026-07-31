import { buildFiscalRegressionReport } from "./fiscal-regression-assurance.ts";
import { issDeepServiceCoverage } from "./iss-deep-coverage.ts";
import {
  ST_CONSTRUCTION_ELECTRICAL_CHECKED_AT,
  ST_CONSTRUCTION_ELECTRICAL_PRODUCTS,
  ST_CONSTRUCTION_ELECTRICAL_VERSION,
  stConstructionElectricalReferenceRuns,
  stConstructionElectricalSources,
} from "./st-construction-electrical-priority.ts";
import {
  ST_FOOD_CLEANING_PET_CHECKED_AT,
  ST_FOOD_CLEANING_PET_PRODUCTS,
  ST_FOOD_CLEANING_PET_VERSION,
  stFoodCleaningPetReferenceRuns,
  stFoodCleaningPetSources,
} from "./st-food-cleaning-pet-priority.ts";
import {
  cityCoverage,
  coverageSources,
  NATIONAL_COVERAGE_CHECKED_AT,
  NATIONAL_COVERAGE_VERSION,
  recurringScenarios,
  stateCoverage,
  stSegments,
  type CoverageSource,
  type CoverageStatus,
} from "./national-tax-coverage.ts";

export const PUBLIC_COVERAGE_INDICATOR_VERSION = "2026.07.31-v13";
export const PUBLIC_COVERAGE_INDICATOR_CHECKED_AT = "2026-07-31";

export type PublicCoverageMaturity = {
  catalogued: boolean;
  structured: boolean;
  tested: boolean;
  approved: boolean;
};

export type PublicCoverageSurface = "search" | "calculation" | "dossier" | "report" | "public_api";
export type PublicCoverageDimension = "uf" | "municipality" | "route" | "product" | "scenario";

export type PublicCoverageMatrixEntry = {
  code: string;
  tax: string;
  title: string;
  dimension: PublicCoverageDimension;
  jurisdiction: string;
  uf: string | null;
  municipality: string | null;
  route: string | null;
  product: string | null;
  version: string;
  status: CoverageStatus;
  maturity: PublicCoverageMaturity;
  checkedAt: string;
  officialSources: Array<Pick<CoverageSource, "code" | "title" | "publisher" | "url" | "checkedAt">>;
  regression: {
    cases: number;
    failures: number;
  };
  objectiveReason: string;
  blockers: string[];
  classificationContract: {
    status: CoverageStatus;
    surfaces: PublicCoverageSurface[];
    source: "public_coverage_indicator";
  };
};

export type PublicCoverageChange = {
  id: string;
  changedAt: string;
  version: string;
  summary: string;
  affectedCodes: string[];
  clientDataExposed: false;
};

export type PublicCoverageIndicator = {
  version: string;
  checkedAt: string;
  baseCoverageVersion: string;
  matrix: PublicCoverageMatrixEntry[];
  maturityTotals: {
    catalogued: number;
    structured: number;
    tested: number;
    approved: number;
  };
  statusTotals: Record<CoverageStatus, number>;
  regressionTotals: {
    cases: number;
    failures: number;
    modules: number;
  };
  changeHistory: PublicCoverageChange[];
  privacy: {
    clientDataIncluded: false;
    statement: string;
  };
  classificationPolicy: {
    surfaces: PublicCoverageSurface[];
    statement: string;
  };
};

const allSurfaces: PublicCoverageSurface[] = ["search", "calculation", "dossier", "report", "public_api"];

const fallbackSource = (code: string): CoverageSource => {
  const catalogued = coverageSources.find((source) => source.code === code);
  if (catalogued) return catalogued;
  const state = stateCoverage.find((item) => `SEFAZ-${item.uf}` === code);
  if (state) {
    return {
      code,
      title: `Portal oficial da SEFAZ - ${state.name}`,
      publisher: `Administracao tributaria de ${state.name}`,
      url: state.officialPortal,
      checkedAt: NATIONAL_COVERAGE_CHECKED_AT,
    };
  }
  if (code === "RFB-NEWS") {
    return {
      code,
      title: "Noticias e normas da Receita Federal",
      publisher: "Receita Federal do Brasil",
      url: "https://www.gov.br/receitafederal/pt-br/assuntos/noticias",
      checkedAt: PUBLIC_COVERAGE_INDICATOR_CHECKED_AT,
    };
  }
  return coverageSources[0];
};
const sourceByCode = (codes: string[]) => Array.from(new Map(codes.map((code) => {
  const source = fallbackSource(code);
  return [source.code, source];
})).values());

function maturity(item: Partial<PublicCoverageMaturity>): PublicCoverageMaturity {
  return {
    catalogued: item.catalogued === true,
    structured: item.structured === true,
    tested: item.tested === true,
    approved: false,
  };
}

function entry(input: Omit<PublicCoverageMatrixEntry, "classificationContract">): PublicCoverageMatrixEntry {
  return {
    ...input,
    classificationContract: {
      status: input.status,
      surfaces: allSurfaces,
      source: "public_coverage_indicator",
    },
  };
}

export async function buildPublicCoverageIndicator(): Promise<PublicCoverageIndicator> {
  const regressionReport = await buildFiscalRegressionReport();
  const regressionFailures = regressionReport.errors.length;
  const regressionCases = regressionReport.metrics.deterministicCases;
  const matrix: PublicCoverageMatrixEntry[] = [
    ...stateCoverage.map((item) => entry({
      code: `UF-${item.uf}`,
      tax: "ICMS",
      title: `${item.name} - cobertura estadual`,
      dimension: "uf" as const,
      jurisdiction: item.uf,
      uf: item.uf,
      municipality: null,
      route: null,
      product: null,
      version: NATIONAL_COVERAGE_VERSION,
      status: item.status,
      maturity: maturity({ catalogued: true, structured: true, tested: true }),
      checkedAt: NATIONAL_COVERAGE_CHECKED_AT,
      officialSources: sourceByCode([item.generalRateSourceCode, `SEFAZ-${item.uf}`, "LC-87-1996", "RSF-22-1989"]),
      regression: { cases: regressionCases, failures: regressionFailures },
      objectiveReason: item.blockers[0] ?? "Cobertura parcial por depender de regra estadual e fatos da operacao.",
      blockers: item.blockers,
    })),
    ...cityCoverage.map((item) => entry({
      code: `MUN-${item.ibgeCode}`,
      tax: "ISS",
      title: `${item.city}/${item.uf} - cobertura municipal`,
      dimension: "municipality" as const,
      jurisdiction: `${item.city}/${item.uf}`,
      uf: item.uf,
      municipality: item.city,
      route: null,
      product: null,
      version: NATIONAL_COVERAGE_VERSION,
      status: item.status,
      maturity: maturity({ catalogued: true, structured: item.depth === "structured", tested: item.depth === "structured" }),
      checkedAt: item.structuredAt ?? NATIONAL_COVERAGE_CHECKED_AT,
      officialSources: sourceByCode(item.officialSourceCodes.length ? item.officialSourceCodes : ["LC-116-2003"]),
      regression: { cases: regressionCases, failures: regressionFailures },
      objectiveReason: item.blockers[0] ?? "Aliquota exata e responsabilidade dependem do municipio e do servico.",
      blockers: item.blockers,
    })),
    ...issDeepServiceCoverage.map((item) => {
      const city = cityCoverage.find((candidate) => candidate.ibgeCode === item.ibgeCode);
      return entry({
        code: `ISS-SERVICE-${item.code}`,
        tax: "ISS",
        title: `${city?.city ?? item.ibgeCode}/${city?.uf ?? "--"} - serviço ${item.lc116Item}`,
        dimension: "municipality" as const,
        jurisdiction: `${city?.city ?? item.ibgeCode}/${city?.uf ?? "--"}`,
        uf: city?.uf ?? null,
        municipality: city?.city ?? null,
        route: null,
        product: item.description,
        version: item.version,
        status: item.coverageStatus,
        maturity: maturity({ catalogued: true, structured: true, tested: true }),
        checkedAt: item.checkedAt,
        officialSources: sourceByCode(item.sourceCodes),
        regression: { cases: regressionCases, failures: regressionFailures },
        objectiveReason: item.coverageStatus === "supported"
          ? `Recorte exato versionado para o item ${item.lc116Item}; somente o cenário controlado publicado pode calcular.`
          : item.blockers[0] ?? "O serviço municipal permanece bloqueado por regra exata ausente.",
        blockers: item.blockers,
      });
    }),
    ...stConstructionElectricalReferenceRuns.map((run) => {
      const product = ST_CONSTRUCTION_ELECTRICAL_PRODUCTS.find((item) => item.code === run.productCode);
      return entry({
        code: `ST-CONSTRUCTION-ELECTRICAL-${run.key}`,
        tax: "ICMS/ST",
        title: `${product?.label ?? run.productCode} - ${run.route}`,
        dimension: "route" as const,
        jurisdiction: run.route,
        uf: run.route.slice(-2),
        municipality: null,
        route: run.route,
        product: product?.label ?? run.productCode,
        version: ST_CONSTRUCTION_ELECTRICAL_VERSION,
        status: "supported",
        maturity: maturity({ catalogued: true, structured: true, tested: true }),
        checkedAt: ST_CONSTRUCTION_ELECTRICAL_CHECKED_AT,
        officialSources: stConstructionElectricalSources
          .filter((source) => run.result.sourceCodes.includes(source.code))
          .map(({ code, title, publisher, url, checkedAt }) => ({ code, title, publisher, url, checkedAt })),
        regression: { cases: regressionCases, failures: regressionFailures },
        objectiveReason: `Memória determinística em centavos reproduzida para CEST ${product?.cest ?? "não localizado"} na rota ${run.route}, com responsabilidade ${run.result.responsibility === "origin_remitter" ? "do remetente" : "do destinatário na entrada"}.`,
        blockers: [],
      });
    }),
    ...stFoodCleaningPetReferenceRuns.map((run) => {
      const product = ST_FOOD_CLEANING_PET_PRODUCTS.find((item) => item.code === run.productCode);
      return entry({
        code: `ST-FOOD-CLEANING-PET-${run.key}`,
        tax: "ICMS/ST",
        title: `${product?.label ?? run.productCode} - ${run.route}`,
        dimension: "route" as const,
        jurisdiction: run.route,
        uf: run.route.slice(-2),
        municipality: null,
        route: run.route,
        product: product?.label ?? run.productCode,
        version: ST_FOOD_CLEANING_PET_VERSION,
        status: run.result.coverageStatus,
        maturity: maturity({ catalogued: true, structured: true, tested: true }),
        checkedAt: ST_FOOD_CLEANING_PET_CHECKED_AT,
        officialSources: stFoodCleaningPetSources
          .filter((source) => run.result.sourceCodes.includes(source.code))
          .map(({ code, title, publisher, url, checkedAt }) => ({ code, title, publisher, url, checkedAt })),
        regression: { cases: regressionCases, failures: regressionFailures },
        objectiveReason: run.result.status === "calculated_reference"
          ? `Memória ${run.result.method?.toUpperCase()} reproduzida em centavos para o CEST ${product?.cest ?? "não localizado"} e sua apresentação exata.`
          : "Produto e rota estão catalogados, mas os parâmetros do destino fluminense ainda não foram fechados.",
        blockers: run.result.blockers,
      });
    }),
    ...stSegments.map((item) => entry({
      code: `ST-${item.code}`,
      tax: "ICMS/ST",
      title: item.name,
      dimension: "product" as const,
      jurisdiction: "Brasil",
      uf: null,
      municipality: null,
      route: item.routes[0] ?? null,
      product: item.name,
      version: NATIONAL_COVERAGE_VERSION,
      status: item.status,
      maturity: maturity({ catalogued: true, structured: true, tested: ["AUTO_PARTS", "BEVERAGES", "CEMENT"].includes(item.code) }),
      checkedAt: NATIONAL_COVERAGE_CHECKED_AT,
      officialSources: sourceByCode(["CONFAZ", "LC-87-1996"]),
      regression: { cases: regressionCases, failures: regressionFailures },
      objectiveReason: item.blockers[0] ?? "Segmento estruturado, mas calculo depende de rota, produto e parametros oficiais.",
      blockers: item.blockers,
    })),
    ...recurringScenarios.map((item) => entry({
      code: `FED-${item.code}`,
      tax: item.tax,
      title: item.title,
      dimension: "scenario" as const,
      jurisdiction: "Federal",
      uf: null,
      municipality: null,
      route: null,
      product: null,
      version: NATIONAL_COVERAGE_VERSION,
      status: item.status,
      maturity: maturity({ catalogued: true, structured: true, tested: true }),
      checkedAt: PUBLIC_COVERAGE_INDICATOR_CHECKED_AT,
      officialSources: sourceByCode(["RFB-NEWS"]),
      regression: { cases: regressionCases, failures: regressionFailures },
      objectiveReason: item.blockers[0] ?? "Rotina federal condicionada aos fatos do periodo e ao regime confirmado.",
      blockers: item.blockers,
    })),
  ];

  const maturityTotals = matrix.reduce((totals, item) => ({
    catalogued: totals.catalogued + Number(item.maturity.catalogued),
    structured: totals.structured + Number(item.maturity.structured),
    tested: totals.tested + Number(item.maturity.tested),
    approved: totals.approved + Number(item.maturity.approved),
  }), { catalogued: 0, structured: 0, tested: 0, approved: 0 });
  const statusTotals = matrix.reduce<Record<CoverageStatus, number>>((totals, item) => {
    totals[item.status] += 1;
    return totals;
  }, { supported: 0, partial: 0, not_supported: 0 });

  return {
    version: PUBLIC_COVERAGE_INDICATOR_VERSION,
    checkedAt: PUBLIC_COVERAGE_INDICATOR_CHECKED_AT,
    baseCoverageVersion: NATIONAL_COVERAGE_VERSION,
    matrix,
    maturityTotals,
    statusTotals,
    regressionTotals: {
      cases: regressionCases,
      failures: regressionFailures,
      modules: regressionReport.metrics.modules,
    },
    changeHistory: [
      {
        id: "st-sectoral-v92-ten-by-ten-audit",
        changedAt: "2026-07-31T00:00:00.000Z",
        version: PUBLIC_COVERAGE_INDICATOR_VERSION,
        summary: "Dez segmentos de ST foram cruzados com dez rotas prioritárias, formando 100 células públicas. Somente memórias já sustentadas por identidade, fonte, vigência, parâmetros e responsabilidade permanecem suportadas; todas as lacunas falham fechadas.",
        affectedCodes: ["ST_SECTORAL_PRIORITY_EXPANSION"],
        clientDataExposed: false,
      },
      {
        id: "cold-beverages-v91-priority-expansion",
        changedAt: "2026-07-31T00:00:00.000Z",
        version: PUBLIC_COVERAGE_INDICATOR_VERSION,
        summary: "Bebidas frias passaram a cobrir ES→SP nos dez perfis paulistas e SP→SC em cinco perfis exatos, com PMPF abaixo da trava de 90%, fallback por MVA conforme o papel do remetente e 30 mutações negativas que bloqueiam divergências.",
        affectedCodes: ["COLD_BEVERAGES_PRIORITY", "COLD_BEVERAGES_SP_DESTINATION", "COLD_BEVERAGES_SC_DESTINATION"],
        clientDataExposed: false,
      },
      {
        id: "auto-parts-v90-168-cell-audit",
        changedAt: "2026-07-31T00:00:00.000Z",
        version: PUBLIC_COVERAGE_INDICATOR_VERSION,
        summary: "As 168 células prioritárias de produto-rota de autopeças foram reauditadas. Setenta preservam memórias condicionais reproduzíveis e 98 fora do acordo interestadual vigente agora falham fechadas como não suportadas, com motivo jurídico explícito.",
        affectedCodes: ["AUTO_PARTS_HIGH_USE_CORRIDORS"],
        clientDataExposed: false,
      },
      {
        id: "iss-recurring-v89-180-cells",
        changedAt: "2026-07-31T00:00:00.000Z",
        version: PUBLIC_COVERAGE_INDICATOR_VERSION,
        summary: "Doze serviços recorrentes passaram a ser auditados em 15 municípios prioritários, formando 180 células públicas e parciais; nenhum código ou valor municipal foi presumido sem classificador, alíquota, vigência, incidência e retenção exatos.",
        affectedCodes: ["ISS-RECURRING-PRIORITY-V89"],
        clientDataExposed: false,
      },
      {
        id: "iss-17-01-v88-50-municipalities",
        changedAt: "2026-07-31T00:00:00.000Z",
        version: PUBLIC_COVERAGE_INDICATOR_VERSION,
        summary: "Os 50 municípios do recorte ISS 17.01 passaram a possuir matriz determinística de cenário controlado, classificador divergente, fronteira de vigência e mutação de retenção; cálculo continua restrito às 25 regras integralmente provadas.",
        affectedCodes: ["ISS-DEEP-NATIONAL", "ISS-DEEP-17.01-V88"],
        clientDataExposed: false,
      },
      {
        id: "icms-general-v87-priority-difal",
        changedAt: "2026-07-31T00:00:00.000Z",
        version: PUBLIC_COVERAGE_INDICATOR_VERSION,
        summary: "Doze UFs prioritárias passaram a possuir recorte controlado de DIFAL para consumidor final não contribuinte, com base única corrigida, fontes nacionais e estaduais, FCP classificado e bloqueio seguro para métodos não comprovados.",
        affectedCodes: ["UF-SP", "UF-MG", "UF-RJ", "UF-PR", "UF-SC", "UF-RS", "UF-BA", "UF-GO", "UF-PE", "UF-CE", "UF-ES", "UF-DF"],
        clientDataExposed: false,
      },
      {
        id: "icms-general-v78-27-ufs",
        changedAt: "2026-07-30T00:00:00.000Z",
        version: PUBLIC_COVERAGE_INDICATOR_VERSION,
        summary: "As 27 UFs passaram a publicar alíquota modal, vigência, fonte estadual e fundo próprio; DIFAL/FCP só calculam nos recortes cuja fórmula e hipótese foram confirmadas.",
        affectedCodes: stateCoverage.map((item) => `UF-${item.uf}`),
        clientDataExposed: false,
      },
      {
        id: "iss-deep-v75-25-exact-slices",
        changedAt: "2026-07-29T00:00:00.000Z",
        version: PUBLIC_COVERAGE_INDICATOR_VERSION,
        summary: "Os 25 municípios prioritários passaram a publicar um recorte exato e controlado de consultoria 17.01; nenhuma linha parcial é convertida em cálculo.",
        affectedCodes: issDeepServiceCoverage.map((item) => `ISS-SERVICE-${item.code}`),
        clientDataExposed: false,
      },
      {
        id: "coverage-indicator-v1",
        changedAt: "2026-07-28T00:00:00.000Z",
        version: PUBLIC_COVERAGE_INDICATOR_VERSION,
        summary: "Indicador publico normalizado passou a consolidar status, maturidade, fonte, regressao e motivo sem dados de clientes.",
        affectedCodes: ["public_api", "search", "calculation", "dossier", "report"],
        clientDataExposed: false,
      },
      {
        id: "federal-v33-sync",
        changedAt: "2026-07-27T00:00:00.000Z",
        version: "2026.07.27-v33",
        summary: "Cenarios federais recorrentes foram sincronizados com a memoria deterministica e permanecem condicionais, nao definitivos.",
        affectedCodes: recurringScenarios.map((item) => `FED-${item.code}`),
        clientDataExposed: false,
      },
    ],
    privacy: {
      clientDataIncluded: false,
      statement: "Historico e matriz publicos usam apenas codigos de regra, versoes, fontes oficiais, motivos e metricas agregadas; nenhum cliente, empresa, CNPJ, documento fiscal ou snapshot operacional e exposto.",
    },
    classificationPolicy: {
      surfaces: allSurfaces,
      statement: "A mesma classificacao supported, partial ou not_supported deve ser reutilizada na busca, calculo, dossie, relatorio e API publica. Divergencia entre superficies e regressao bloqueante.",
    },
  };
}

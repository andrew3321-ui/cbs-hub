export const ISS_MUNICIPAL_100_EXPANSION_VERSION = "2026.08.01-v102";
export const ISS_MUNICIPAL_100_EXPANSION_CHECKED_AT = "2026-08-01";

export const ISS_MUNICIPAL_100_NATIONAL_SOURCE = {
  code: "LC-116-2003-ISS-100",
  title: "Lei Complementar nº 116/2003 — incidência e lista nacional do ISS",
  publisher: "Presidência da República",
  url: "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp116.htm",
  kind: "municipal_law" as const,
  legalReference: "arts. 1º a 8º-A e lista anexa; não substitui código, alíquota, retenção ou vigência municipal",
};

export type IssMunicipal100Source = {
  code: string;
  title: string;
  publisher: string;
  url: string;
  kind: "municipal_law" | "rate_table" | "operational_guidance";
  legalReference: string;
};

type CitySeed = readonly [
  ibgeCode: string,
  city: string,
  uf: string,
  slug: string,
  officialPortalUrl: string,
  rankingBasis: string,
  exactKnownLaw?: string,
  exactKnownRegulation?: string,
];

const citySeeds: CitySeed[] = [
  ["3534401", "Osasco", "SP", "SP-OSASCO", "https://www.nfe.osasco.sp.gov.br/EissnfeWebApp/Portal/Legislacao.aspx", "polo metropolitano de serviços, varejo, logística e indústria", "Lei Complementar nº 404/2022 — Código Tributário Municipal", "Decreto nº 14.010/2023 — documentos fiscais eletrônicos do ISSQN"],
  ["3552205", "Sorocaba", "SP", "SP-SOROCABA", "https://noticias.sorocaba.sp.gov.br/jornal-do-municipio/", "polo industrial e tecnológico com serviços empresariais recorrentes"],
  ["3525904", "Jundiaí", "SP", "SP-JUNDIAI", "https://jundiai.sp.gov.br/financas/issqn/", "corredor logístico e empresarial entre São Paulo e Campinas", "Lei Complementar nº 460/2008 — legislação tributária municipal do ISSQN", "Decreto nº 27.250/2017 — NFS-e municipal"],
  ["3538709", "Piracicaba", "SP", "SP-PIRACICABA", "https://www.piracicaba.sp.gov.br/servicos/issqn/", "indústria, agronegócio e serviços técnicos regionais"],
  ["3506003", "Bauru", "SP", "SP-BAURU", "https://www2.bauru.sp.gov.br/financas/", "centro regional de saúde, educação e serviços empresariais"],
  ["3549805", "São José do Rio Preto", "SP", "SP-SAO-JOSE-DO-RIO-PRETO", "https://www.riopreto.sp.gov.br/servicos/issqn", "hub regional de saúde, tecnologia e serviços profissionais"],
  ["3530607", "Mogi das Cruzes", "SP", "SP-MOGI-DAS-CRUZES", "https://www.mogidascruzes.sp.gov.br/servico/financas", "economia metropolitana diversificada e serviços logísticos"],
  ["3513801", "Diadema", "SP", "SP-DIADEMA", "https://portal.diadema.sp.gov.br/financas/", "indústria do ABC e cadeia recorrente de manutenção e apoio"],
  ["3554102", "Taubaté", "SP", "SP-TAUBATE", "https://taubate.sp.gov.br/novo/secretarias/financas/", "eixo industrial do Vale do Paraíba e serviços técnicos"],
  ["3541000", "Praia Grande", "SP", "SP-PRAIA-GRANDE", "https://www.praiagrande.sp.gov.br/administracao/financas", "serviços, construção, turismo e mercado imobiliário litorâneo"],
  ["3505708", "Barueri", "SP", "SP-BARUERI", "https://portal.barueri.sp.gov.br/secretarias/secretaria-de-financas", "alta concentração de sedes corporativas, tecnologia e consultoria"],
  ["3552502", "Suzano", "SP", "SP-SUZANO", "https://www.suzano.sp.gov.br/web/financas/", "indústria, papel e celulose e serviços metropolitanos"],
  ["3516200", "Franca", "SP", "SP-FRANCA", "https://www.franca.sp.gov.br/administracao-municipal/administracao-direta/financas", "polo calçadista, tecnologia e serviços empresariais"],
  ["3526902", "Limeira", "SP", "SP-LIMEIRA", "https://www.limeira.sp.gov.br/secretarias/fazenda", "indústria, comércio atacadista e serviços técnicos"],
  ["3520509", "Indaiatuba", "SP", "SP-INDAIATUBA", "https://www.indaiatuba.sp.gov.br/fazenda/", "polo industrial e logístico de alta densidade empresarial"],
  ["3303500", "Nova Iguaçu", "RJ", "RJ-NOVA-IGUACU", "https://www.novaiguacu.rj.gov.br/semat/", "serviços e comércio do corredor metropolitano da Baixada"],
  ["3300456", "Belford Roxo", "RJ", "RJ-BELFORD-ROXO", "https://prefeituradebelfordroxo.rj.gov.br/secretaria/secretaria-municipal-de-fazenda/", "serviços metropolitanos e atividades de manutenção e construção"],
  ["3305109", "São João de Meriti", "RJ", "RJ-SAO-JOAO-DE-MERITI", "https://meriti.rj.gov.br/secretarias/fazenda/", "alta densidade empresarial e serviços na Baixada Fluminense"],
  ["3301009", "Campos dos Goytacazes", "RJ", "RJ-CAMPOS-DOS-GOYTACAZES", "https://www.campos.rj.gov.br/secretaria.php?id=19", "petróleo, saúde, construção e serviços regionais"],
  ["3303906", "Petrópolis", "RJ", "RJ-PETROPOLIS", "https://www.petropolis.rj.gov.br/pmp/index.php/secretarias/fazenda", "tecnologia, turismo, indústria e serviços profissionais"],
  ["3306305", "Volta Redonda", "RJ", "RJ-VOLTA-REDONDA", "https://www.voltaredonda.rj.gov.br/financas/", "indústria siderúrgica, manutenção e serviços técnicos"],
  ["3136702", "Juiz de Fora", "MG", "MG-JUIZ-DE-FORA", "https://www.pjf.mg.gov.br/secretarias/sf/", "hub regional de saúde, educação, tecnologia e consultoria"],
  ["3106705", "Betim", "MG", "MG-BETIM", "https://www.betim.mg.gov.br/portal/secretarias/37/secretaria-municipal-de-financas/", "indústria automotiva, logística e manutenção técnica"],
  ["3170107", "Uberaba", "MG", "MG-UBERABA", "https://portal.uberaba.mg.gov.br/secretaria/16/fazenda", "agronegócio, saúde e serviços empresariais regionais"],
  ["3143302", "Montes Claros", "MG", "MG-MONTES-CLAROS", "https://portal.montesclaros.mg.gov.br/secretaria/fazenda", "polo regional de saúde, indústria e serviços profissionais"],
  ["3131307", "Ipatinga", "MG", "MG-IPATINGA", "https://www.ipatinga.mg.gov.br/secretaria/fazenda", "cadeia siderúrgica, engenharia e manutenção industrial"],
  ["4115200", "Maringá", "PR", "PR-MARINGA", "https://www.maringa.pr.gov.br/fazenda/", "serviços empresariais, tecnologia, saúde e agronegócio"],
  ["4119905", "Ponta Grossa", "PR", "PR-PONTA-GROSSA", "https://www.pontagrossa.pr.gov.br/smf", "logística, indústria e serviços técnicos dos Campos Gerais"],
  ["4125506", "São José dos Pinhais", "PR", "PR-SAO-JOSE-DOS-PINHAIS", "https://www.sjp.pr.gov.br/secretarias/financas/", "automotivo, aeroporto, logística e serviços corporativos"],
  ["4108304", "Foz do Iguaçu", "PR", "PR-FOZ-DO-IGUACU", "https://www5.pmfi.pr.gov.br/orgao-15", "turismo, logística de fronteira e serviços profissionais"],
  ["4202404", "Blumenau", "SC", "SC-BLUMENAU", "https://www.blumenau.sc.gov.br/governo/secretaria-de-fazenda", "tecnologia, indústria têxtil e serviços empresariais"],
  ["4208203", "Itajaí", "SC", "SC-ITAJAI", "https://itajai.sc.gov.br/e/secretaria-fazenda", "porto, logística, comércio exterior e serviços técnicos"],
  ["4204202", "Chapecó", "SC", "SC-CHAPECO", "https://www.chapeco.sc.gov.br/secretaria/secretaria-da-fazenda", "agroindústria, logística e serviços empresariais regionais"],
  ["4304606", "Canoas", "RS", "RS-CANOAS", "https://www.canoas.rs.gov.br/secretarias/fazenda/", "indústria, logística metropolitana e manutenção"],
  ["4314407", "Pelotas", "RS", "RS-PELOTAS", "https://www.pelotas.com.br/fazenda", "serviços regionais, saúde, educação e tecnologia"],
  ["4313409", "Novo Hamburgo", "RS", "RS-NOVO-HAMBURGO", "https://www.novohamburgo.rs.gov.br/secretaria/secretaria-da-fazenda", "indústria calçadista, tecnologia e serviços profissionais"],
  ["4309209", "Gravataí", "RS", "RS-GRAVATAI", "https://gravatai.atende.net/cidadao/pagina/secretaria-municipal-da-fazenda", "automotivo, logística e serviços metropolitanos"],
  ["4323002", "Viamão", "RS", "RS-VIAMAO", "https://www.viamao.rs.gov.br/portal/secretarias/8/secretaria-municipal-da-fazenda/", "serviços metropolitanos, construção e manutenção"],
  ["2910800", "Feira de Santana", "BA", "BA-FEIRA-DE-SANTANA", "https://www.feiradesantana.ba.gov.br/servicos.asp?id=9", "entroncamento logístico, comércio e serviços regionais"],
  ["2905701", "Camaçari", "BA", "BA-CAMACARI", "https://www.camacari.ba.gov.br/secretaria-da-fazenda/", "polo petroquímico, indústria e manutenção especializada"],
  ["2918407", "Juazeiro", "BA", "BA-JUAZEIRO", "https://www.juazeiro.ba.gov.br/secretaria/secretaria-da-fazenda/", "agronegócio, logística e serviços regionais"],
  ["2609600", "Olinda", "PE", "PE-OLINDA", "https://www.olinda.pe.gov.br/secretarias/fazenda-e-administracao/", "serviços metropolitanos, turismo e economia criativa"],
  ["2610707", "Paulista", "PE", "PE-PAULISTA", "https://www.paulista.pe.gov.br/site/secretarias/fazenda", "indústria, comércio e serviços metropolitanos"],
  ["2604106", "Caruaru", "PE", "PE-CARUARU", "https://caruaru.pe.gov.br/secretaria/secretaria-da-fazenda/", "comércio regional, confecções e serviços profissionais"],
  ["2504009", "Campina Grande", "PB", "PB-CAMPINA-GRANDE", "https://campinagrande.pb.gov.br/secretaria-de-financas/", "tecnologia, educação, saúde e serviços empresariais"],
  ["2408003", "Mossoró", "RN", "RN-MOSSORO", "https://www.mossoro.rn.gov.br/secretarias/secretaria-municipal-da-fazenda/", "petróleo, agronegócio, saúde e serviços regionais"],
  ["2307650", "Maracanaú", "CE", "CE-MARACANAU", "https://www.maracanau.ce.gov.br/secretaria/secretaria-de-gestao-fazenda/", "distrito industrial, logística e manutenção técnica"],
  ["5201108", "Anápolis", "GO", "GO-ANAPOLIS", "https://www.anapolis.go.gov.br/secretaria/secretaria-municipal-de-economia/", "indústria farmacêutica, logística e serviços empresariais"],
  ["3205200", "Vila Velha", "ES", "ES-VILA-VELHA", "https://www.vilavelha.es.gov.br/secretaria/fazenda", "serviços, logística portuária, construção e comércio"],
  ["3205002", "Serra", "ES", "ES-SERRA", "https://www.serra.es.gov.br/secretaria/SEFA", "indústria, logística, construção e serviços metropolitanos"],
];

export const issMunicipal100ServiceItems = [
  { lc116Item: "17.01", serviceProfile: "CONSULTING", description: "Assessoria ou consultoria de qualquer natureza", incidenceRule: "provider_establishment_general_rule" },
  { lc116Item: "17.19", serviceProfile: "ACCOUNTING", description: "Contabilidade e serviços técnicos e auxiliares", incidenceRule: "provider_establishment_general_rule" },
  { lc116Item: "1.01", serviceProfile: "INFORMATION_TECHNOLOGY", description: "Análise e desenvolvimento de sistemas", incidenceRule: "provider_establishment_general_rule" },
  { lc116Item: "17.06", serviceProfile: "ADVERTISING", description: "Propaganda e publicidade", incidenceRule: "provider_establishment_general_rule" },
  { lc116Item: "7.01", serviceProfile: "ENGINEERING", description: "Engenharia, agronomia, arquitetura e congêneres", incidenceRule: "provider_establishment_general_rule" },
  { lc116Item: "4.01", serviceProfile: "HEALTH", description: "Medicina e biomedicina", incidenceRule: "provider_establishment_general_rule" },
  { lc116Item: "17.14", serviceProfile: "LAW", description: "Advocacia", incidenceRule: "provider_establishment_general_rule" },
  { lc116Item: "14.01", serviceProfile: "MAINTENANCE", description: "Manutenção, limpeza e revisão de máquinas e bens", incidenceRule: "provider_establishment_general_rule" },
  { lc116Item: "7.10", serviceProfile: "CLEANING", description: "Limpeza, manutenção e conservação de imóveis e ambientes", incidenceRule: "service_location_exception" },
  { lc116Item: "7.02", serviceProfile: "CONSTRUCTION", description: "Execução de obras de construção civil", incidenceRule: "service_location_exception" },
] as const;

const transparentBlockers = [
  "subitem e código municipal exatos",
  "alíquota municipal em pontos-base e respectiva vigência",
  "município de incidência confirmado pelos fatos da operação",
  "responsável tributário e hipótese municipal de retenção",
  "deduções, benefícios, sociedade profissional e regimes especiais",
] as const;

export const issMunicipal100Sources: IssMunicipal100Source[] = citySeeds.map((seed) => ({
  code: `ISS-${seed[3]}-PORTAL`,
  title: `Portal oficial de legislação e serviços tributários — ${seed[1]}/${seed[2]}`,
  publisher: `Prefeitura de ${seed[1]}`,
  url: seed[4],
  kind: "operational_guidance",
  legalReference: seed[6]
    ? `${seed[6]}; ${seed[7] ?? "regulamentação operacional a conferir no portal"}`
    : "índice oficial municipal mapeado; lei, regulamento, tabela e versão exatos do ISS permanecem pendentes de captura",
}));

export const issMunicipal100Cities = citySeeds.map((seed, index) => ({
  rank: index + 51,
  code: `ISS-DEEP-${seed[3]}`,
  ibgeCode: seed[0],
  city: seed[1],
  uf: seed[2],
  sourceCodes: [`ISS-${seed[3]}-PORTAL`],
  rankingBasis: seed[5],
  legalMap: {
    lawReference: seed[6] ?? "ato municipal exato do ISS pendente de captura no portal oficial",
    regulationReference: seed[7] ?? "regulamento municipal exato pendente de captura no portal oficial",
    portalUrl: seed[4],
    mappingStatus: seed[6] ? "law_located_regulation_may_be_pending" : "official_portal_mapped_exact_acts_pending",
    version: ISS_MUNICIPAL_100_EXPANSION_VERSION,
  },
  stage: "structured_partial" as const,
  calculationSupported: false as const,
  checkedAt: ISS_MUNICIPAL_100_EXPANSION_CHECKED_AT,
  version: ISS_MUNICIPAL_100_EXPANSION_VERSION,
  blockers: [...transparentBlockers],
}));

export const issMunicipal100Cells = issMunicipal100Cities.flatMap((municipality) =>
  issMunicipal100ServiceItems.map((item) => ({
    code: `ISS-100-${municipality.ibgeCode}-${item.lc116Item}`,
    municipalityCode: municipality.code,
    ibgeCode: municipality.ibgeCode,
    city: municipality.city,
    uf: municipality.uf,
    lc116Item: item.lc116Item,
    serviceProfile: item.serviceProfile,
    description: item.description,
    coverageStatus: "partial" as const,
    municipalClassifier: { status: "pending_exact_municipal_subitem" as const, code: null },
    rate: { status: "pending_exact_municipal_rate" as const, bps: null, legalRangeBps: [200, 500] as const },
    incidence: { status: "national_rule_mapped_municipal_confirmation_required" as const, nationalRule: item.incidenceRule },
    withholding: { status: "pending_operation_and_municipal_rule" as const, responsible: null },
    deductions: { status: "pending_exact_municipal_rule" as const, allowed: null },
    effectiveFrom: null,
    effectiveTo: null,
    sourceCodes: [ISS_MUNICIPAL_100_NATIONAL_SOURCE.code, ...municipality.sourceCodes],
    checkedAt: ISS_MUNICIPAL_100_EXPANSION_CHECKED_AT,
    version: ISS_MUNICIPAL_100_EXPANSION_VERSION,
    calculationSupported: false as const,
    blockers: [...transparentBlockers],
  })),
);

const caseKinds = [
  "controlled_pending_local_rule",
  "municipal_classifier_missing",
  "rate_and_validity_missing",
  "incidence_facts_missing",
  "withholding_responsibility_missing",
  "deduction_or_special_regime_unknown",
] as const;

export const issMunicipal100ReferenceCases = issMunicipal100Cities.flatMap((municipality) =>
  caseKinds.map((kind, index) => ({
    code: `ISS-100-${municipality.ibgeCode}-${kind.toUpperCase()}`,
    kind,
    cellCode: `ISS-100-${municipality.ibgeCode}-${issMunicipal100ServiceItems[index % issMunicipal100ServiceItems.length].lc116Item}`,
    expectedStatus: "blocked" as const,
    expectedCoverageStatus: "partial" as const,
    expectedTaxCents: null,
    blockers: [...transparentBlockers],
  })),
);

export function issMunicipal100Metrics() {
  return {
    newMunicipalities: issMunicipal100Cities.length,
    totalDeepMunicipalities: 50 + issMunicipal100Cities.length,
    recurringServiceItems: issMunicipal100ServiceItems.length,
    auditedCombinations: issMunicipal100Cells.length,
    deterministicCases: issMunicipal100ReferenceCases.length,
    calculatedMemories: 0,
    safelyBlockedCases: issMunicipal100ReferenceCases.length,
    supportedCells: 0,
    partialCells: issMunicipal100Cells.length,
  };
}

export function validateIssMunicipal100Expansion() {
  const errors: string[] = [];
  if (issMunicipal100Cities.length !== 50) errors.push("expected_50_new_municipalities");
  if (issMunicipal100ServiceItems.length !== 10) errors.push("expected_10_recurring_service_items");
  if (issMunicipal100Cells.length !== 500) errors.push("expected_500_municipality_service_cells");
  if (issMunicipal100ReferenceCases.length !== 300) errors.push("expected_300_deterministic_cases");
  if (new Set(issMunicipal100Cities.map((item) => item.ibgeCode)).size !== 50) errors.push("duplicate_ibge_code");
  if (new Set(issMunicipal100Sources.map((item) => item.code)).size !== 50) errors.push("duplicate_source_code");
  if (new Set(issMunicipal100Sources.map((item) => item.url)).size !== 50) errors.push("duplicate_source_url");
  if (new Set(issMunicipal100Cells.map((item) => item.code)).size !== 500) errors.push("duplicate_cell_code");
  if (new Set(issMunicipal100ReferenceCases.map((item) => item.code)).size !== 300) errors.push("duplicate_reference_case");
  for (const municipality of issMunicipal100Cities) {
    if (municipality.rank < 51 || municipality.rank > 100) errors.push(`${municipality.ibgeCode}:invalid_rank`);
    if (!municipality.rankingBasis.trim()) errors.push(`${municipality.ibgeCode}:ranking_basis_missing`);
    if (!municipality.legalMap.portalUrl.startsWith("https://")) errors.push(`${municipality.ibgeCode}:official_portal_missing`);
    if (municipality.calculationSupported || municipality.blockers.length < 5) errors.push(`${municipality.ibgeCode}:unsafe_release`);
  }
  for (const cell of issMunicipal100Cells) {
    if (!/^\d{1,2}\.\d{2}$/.test(cell.lc116Item)) errors.push(`${cell.code}:invalid_lc116_item`);
    if (cell.calculationSupported || cell.rate.bps !== null || cell.municipalClassifier.code !== null) errors.push(`${cell.code}:unproved_value_released`);
    if (!cell.sourceCodes.includes(ISS_MUNICIPAL_100_NATIONAL_SOURCE.code) || cell.sourceCodes.length < 2) errors.push(`${cell.code}:source_chain_missing`);
  }
  if (issMunicipal100ReferenceCases.some((item) => item.expectedStatus !== "blocked" || item.expectedTaxCents !== null || item.blockers.length < 5)) errors.push("unsafe_reference_case");
  return { passed: errors.length === 0, errors };
}

export async function hashIssMunicipal100Expansion() {
  const payload = JSON.stringify({
    version: ISS_MUNICIPAL_100_EXPANSION_VERSION,
    checkedAt: ISS_MUNICIPAL_100_EXPANSION_CHECKED_AT,
    nationalSource: ISS_MUNICIPAL_100_NATIONAL_SOURCE,
    sources: issMunicipal100Sources,
    cities: issMunicipal100Cities,
    items: issMunicipal100ServiceItems,
    cells: issMunicipal100Cells,
    cases: issMunicipal100ReferenceCases,
  });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

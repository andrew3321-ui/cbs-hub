export const ISS_DEEP_EXPANSION_VERSION = "2026.07.31-v79";
export const ISS_DEEP_EXPANSION_CHECKED_AT = "2026-07-30";

export type IssDeepExpansionSource = {
  code: string;
  title: string;
  publisher: string;
  url: string;
  kind: "municipal_law" | "rate_table" | "operational_guidance";
  legalReference: string;
};

export type IssDeepExpansionCity = {
  rank: number;
  code: string;
  ibgeCode: string;
  city: string;
  uf: string;
  sourceCodes: string[];
  priorityServiceItems: string[];
  rankingBasis: string;
  stage: "structured_partial";
  version: string;
  checkedAt: string;
  effectiveFrom: null;
  effectiveTo: null;
  calculationSupported: false;
  blockers: string[];
};

const commonBlockers = [
  "código municipal exato do serviço",
  "alíquota municipal versionada para o serviço",
  "vigência exata da regra de alíquota",
  "hipótese de retenção e responsável por tipo de tomador",
  "exceções, benefícios e regimes especiais aplicáveis",
] as const;

type ExpansionSeed = {
  ibgeCode: string;
  city: string;
  uf: string;
  slug: string;
  source: IssDeepExpansionSource;
  priorityServiceItems: string[];
  rankingBasis: string;
};

const seeds: ExpansionSeed[] = [
  {
    ibgeCode: "2211001", city: "Teresina", uf: "PI", slug: "PI-TERESINA",
    source: { code: "ISS-THE-CTM", title: "Código Tributário do Município de Teresina — compilado", publisher: "Prefeitura de Teresina", url: "https://legis.teresina.pi.gov.br/backups/ctmts/QhI4UEqMT3j7EzSEOkg5rkRnr0E5Twn2m2xhFU8u.pdf", kind: "municipal_law", legalReference: "CTMT compilado; ISSQN, lista municipal e anexos de serviços" },
    priorityServiceItems: ["17.01", "1.07", "14.01"], rankingBasis: "capital regional, serviços empresariais e demanda contábil recorrente",
  },
  {
    ibgeCode: "3549904", city: "São José dos Campos", uf: "SP", slug: "SP-SAO-JOSE-DOS-CAMPOS",
    source: { code: "ISS-SJC-LEGIS", title: "Lei Complementar nº 272/2003", publisher: "Prefeitura de São José dos Campos", url: "https://servicos.sjc.sp.gov.br/Legislacao/Arquivos/LeisComplementares/2003/LC_2003_00000272.pdf", kind: "municipal_law", legalReference: "Lei Complementar nº 272/2003 e alterações, ISSQN" },
    priorityServiceItems: ["1.07", "14.01", "17.01"], rankingBasis: "polo tecnológico e industrial de alto valor agregado",
  },
  {
    ibgeCode: "3518800", city: "Guarulhos", uf: "SP", slug: "SP-GUARULHOS",
    source: { code: "ISS-GRU-LEGIS", title: "Portal oficial de legislação municipal", publisher: "Prefeitura de Guarulhos", url: "https://www.guarulhos.sp.gov.br/legislacao", kind: "municipal_law", legalReference: "legislação tributária municipal, ISSQN e lista de serviços" },
    priorityServiceItems: ["16.02", "17.01", "14.01"], rankingBasis: "logística aeroportuária, indústria e serviços empresariais",
  },
  {
    ibgeCode: "3301702", city: "Duque de Caxias", uf: "RJ", slug: "RJ-DUQUE-DE-CAXIAS",
    source: { code: "ISS-DCX-CTM", title: "Lei Municipal nº 1.664/2002 — Código Tributário consolidado", publisher: "Prefeitura de Duque de Caxias", url: "https://pcteste.duquedecaxias.rj.gov.br/sitelegislacao.html", kind: "municipal_law", legalReference: "Lei nº 1.664/2002 consolidada em 2023 e regulamentação do ISSQN" },
    priorityServiceItems: ["17.01", "14.01", "7.02"], rankingBasis: "polo industrial, petróleo, logística e construção",
  },
  {
    ibgeCode: "4113700", city: "Londrina", uf: "PR", slug: "PR-LONDRINA",
    source: { code: "ISS-LDB-LEGIS", title: "Legislação tributária e tabela ISS 2026", publisher: "Prefeitura de Londrina", url: "https://portal.londrina.pr.gov.br/legislacao-tributaria", kind: "rate_table", legalReference: "Lei nº 7.303/1997 e tabela municipal de alíquotas do ISS 2026" },
    priorityServiceItems: ["17.01", "1.07", "4.02"], rankingBasis: "serviços empresariais, tecnologia e saúde regional",
  },
  {
    ibgeCode: "4104808", city: "Cascavel", uf: "PR", slug: "PR-CASCAVEL",
    source: { code: "ISS-CVL-RISS", title: "Decreto nº 5.711/2002 — Regulamento do ISSQN", publisher: "Prefeitura de Cascavel", url: "https://www.cascavel.pr.gov.br/arquivos/14072009_decreto_5711_-_2002.pdf", kind: "municipal_law", legalReference: "Decreto nº 5.711/2002 e Lei Complementar nº 1/2001" },
    priorityServiceItems: ["17.01", "14.01", "7.02"], rankingBasis: "agronegócio, logística e serviços regionais",
  },
  {
    ibgeCode: "3303302", city: "Niterói", uf: "RJ", slug: "RJ-NITEROI",
    source: { code: "ISS-NIT-TABELA", title: "Alíquotas de ISS e local da tributação", publisher: "Secretaria da Fazenda de Niterói", url: "https://www.fazenda.niteroi.rj.gov.br/site/aliquotas-de-iss-e-local-da-tributacao/", kind: "rate_table", legalReference: "Lei Municipal nº 2.597/2008; lista, alíquotas e local de tributação por competência" },
    priorityServiceItems: ["17.01", "1.07", "14.01"], rankingBasis: "serviços profissionais, tecnologia e cadeia de óleo e gás",
  },
  {
    ibgeCode: "3170206", city: "Uberlândia", uf: "MG", slug: "MG-UBERLANDIA",
    source: { code: "ISS-UDI-NFSE", title: "NFS-e — documentação tributária municipal", publisher: "Prefeitura de Uberlândia", url: "https://nfse.uberlandia.mg.gov.br/", kind: "operational_guidance", legalReference: "código de tributação municipal, alíquota, retenções e leiaute NFS-e" },
    priorityServiceItems: ["17.01", "1.07", "16.02"], rankingBasis: "logística nacional, tecnologia e serviços corporativos",
  },
  {
    ibgeCode: "3118601", city: "Contagem", uf: "MG", slug: "MG-CONTAGEM",
    source: { code: "ISS-CTG-CTM", title: "Código Tributário do Município de Contagem — compilado", publisher: "Prefeitura de Contagem", url: "https://fazenda.contagem.mg.gov.br/downloads/?chave=CTMC", kind: "municipal_law", legalReference: "Lei nº 1.611/1983, arts. 78-C, 90-B, 95 e 95-A; Anexo II-A" },
    priorityServiceItems: ["14.01", "17.01", "7.02"], rankingBasis: "grande concentração industrial e serviços de manutenção",
  },
  {
    ibgeCode: "3543402", city: "Ribeirão Preto", uf: "SP", slug: "SP-RIBEIRAO-PRETO",
    source: { code: "ISS-RAO-RISS", title: "Decreto nº 176/2020 — sistema e regulamento operacional do ISSQN", publisher: "Prefeitura de Ribeirão Preto", url: "https://www.saerp.ribeiraopreto.sp.gov.br/legislacao-municipal/pesquisa.xhtml?lei=39677", kind: "operational_guidance", legalReference: "Lei nº 2.415/1970 e Decreto nº 176/2020" },
    priorityServiceItems: ["17.01", "4.02", "1.07"], rankingBasis: "saúde, agronegócio, tecnologia e consultoria",
  },
  {
    ibgeCode: "3548500", city: "Santos", uf: "SP", slug: "SP-SANTOS",
    source: { code: "ISS-STS-TABELA-2026", title: "Códigos de atividade e alíquotas do ISSQN 2026", publisher: "Prefeitura de Santos", url: "https://www.santos.sp.gov.br/static/files_www/files/portal_files/SEFIN/alteracaocodigosatividadepara2026.pdf", kind: "rate_table", legalReference: "tabela municipal de códigos, itens e alíquotas vigente em 2026" },
    priorityServiceItems: ["20.01", "16.02", "17.01"], rankingBasis: "porto, logística e serviços empresariais",
  },
  {
    ibgeCode: "4209102", city: "Joinville", uf: "SC", slug: "SC-JOINVILLE",
    source: { code: "ISS-JOI-LEGIS", title: "NF-em — legislação municipal do ISSQN", publisher: "Prefeitura de Joinville", url: "https://nfem.joinville.sc.gov.br/jsp/externo/downloads.jsp", kind: "municipal_law", legalReference: "LCM nº 155/2003, LCM nº 286/2008 e Decreto nº 30.798/2018" },
    priorityServiceItems: ["14.01", "1.07", "17.01"], rankingBasis: "indústria, tecnologia e serviços corporativos",
  },
  {
    ibgeCode: "4305108", city: "Caxias do Sul", uf: "RS", slug: "RS-CAXIAS-DO-SUL",
    source: { code: "ISS-CXS-CTM", title: "Leis Complementares tributárias vigentes", publisher: "Prefeitura de Caxias do Sul", url: "https://caxias.rs.gov.br/servicos/receita/legislacao/leis-complementares-2/leis-complementares-vigentes", kind: "municipal_law", legalReference: "Lei Complementar nº 701/2022, Código Tributário Municipal" },
    priorityServiceItems: ["14.01", "17.01", "7.02"], rankingBasis: "indústria metalmecânica e serviços técnicos",
  },
  {
    ibgeCode: "3510609", city: "Carapicuíba", uf: "SP", slug: "SP-CARAPICUIBA",
    source: { code: "ISS-CAR-CTM", title: "Lei nº 2.968/2009 — Código Tributário Municipal", publisher: "Prefeitura de Carapicuíba", url: "https://carapicuiba.sp.gov.br/legislacao/view/2694/lei-n-29682009-de-28-de-dezembro-de-2009", kind: "municipal_law", legalReference: "Lei nº 2.968/2009, ISSQN, responsáveis, base, alíquotas e fiscalização" },
    priorityServiceItems: ["17.01", "1.07", "14.01"], rankingBasis: "densidade empresarial metropolitana e serviços recorrentes",
  },
  {
    ibgeCode: "3529401", city: "Mauá", uf: "SP", slug: "SP-MAUA",
    source: { code: "ISS-MAU-LEGIS", title: "Lei nº 3.648/2003 — ISSQN e legislação vinculada", publisher: "Prefeitura de Mauá", url: "https://sistemas.maua.sp.gov.br/legislaconsulta/detalhes.php?nlei=3648&tipolei=0", kind: "municipal_law", legalReference: "Lei nº 3.648/2003, Decreto nº 7.672/2012 e Código Tributário Municipal" },
    priorityServiceItems: ["14.01", "17.01", "7.02"], rankingBasis: "polo industrial do ABC e manutenção técnica",
  },
  {
    ibgeCode: "2919207", city: "Lauro de Freitas", uf: "BA", slug: "BA-LAURO-DE-FREITAS",
    source: { code: "ISS-LDF-CTM", title: "Leis tributárias municipais e alterações do CTM", publisher: "SEFAZ Lauro de Freitas", url: "https://sefaz.laurodefreitas.ba.gov.br/legislacao/leis.php", kind: "municipal_law", legalReference: "Lei Municipal nº 1.572/2015 e alterações até 2025" },
    priorityServiceItems: ["17.01", "1.07", "16.02"], rankingBasis: "serviços metropolitanos, tecnologia e logística aeroportuária",
  },
  {
    ibgeCode: "2933307", city: "Vitória da Conquista", uf: "BA", slug: "BA-VITORIA-DA-CONQUISTA",
    source: { code: "ISS-VDC-CTM", title: "Código Tributário e de Rendas municipal", publisher: "Prefeitura de Vitória da Conquista", url: "https://www.pmvc.ba.gov.br/legislacao/", kind: "municipal_law", legalReference: "Lei Complementar nº 2.645/2022 e alterações; lista e alíquotas do ISS" },
    priorityServiceItems: ["17.01", "4.02", "14.01"], rankingBasis: "serviços regionais, saúde e comércio atacadista",
  },
  {
    ibgeCode: "2611101", city: "Petrolina", uf: "PE", slug: "PE-PETROLINA",
    source: { code: "ISS-PNZ-CTM", title: "Código Tributário Municipal consolidado", publisher: "Prefeitura de Petrolina", url: "https://petrolina.pe.gov.br/wp-content/uploads/2026/01/cd59a452-7240-4cc0-bd60-e3c078a788e2-DISPOSICAO-PRELIMINAR.pdf", kind: "municipal_law", legalReference: "Código Tributário municipal com alterações até a LC nº 47/2025" },
    priorityServiceItems: ["17.01", "14.01", "7.02"], rankingBasis: "agronegócio exportador, serviços técnicos e construção",
  },
  {
    ibgeCode: "2607901", city: "Jaboatão dos Guararapes", uf: "PE", slug: "PE-JABOATAO",
    source: { code: "ISS-JAB-CTM", title: "Lei nº 155/1991 — Código Tributário Municipal compilado", publisher: "Prefeitura do Jaboatão dos Guararapes", url: "https://portaldatransparencia.jaboatao.pe.gov.br/pdf/renuncias-de-receitas/Lei-155-1991-CTM-Jaboatao-dos-Guararapes.pdf", kind: "municipal_law", legalReference: "Lei nº 155/1991, arts. 32 a 50 e alterações até 2025" },
    priorityServiceItems: ["17.01", "16.02", "7.02"], rankingBasis: "logística metropolitana, indústria e construção",
  },
  {
    ibgeCode: "5201405", city: "Aparecida de Goiânia", uf: "GO", slug: "GO-APARECIDA-DE-GOIANIA",
    source: { code: "ISS-APG-CTM", title: "Diário Oficial — Código Tributário Municipal", publisher: "Prefeitura de Aparecida de Goiânia", url: "https://webio.aparecida.go.gov.br/api/lict/download/136", kind: "municipal_law", legalReference: "Lei Complementar Municipal nº 46/2011 e alterações" },
    priorityServiceItems: ["14.01", "17.01", "16.02"], rankingBasis: "distrito industrial, logística e serviços empresariais",
  },
  {
    ibgeCode: "1500800", city: "Ananindeua", uf: "PA", slug: "PA-ANANINDEUA",
    source: { code: "ISS-ANA-CTM", title: "Leis e decretos municipais", publisher: "Prefeitura de Ananindeua", url: "https://www.ananindeua.pa.gov.br/leis_decretos.asp", kind: "municipal_law", legalReference: "Lei Complementar nº 2.181/2005, Código Tributário Municipal" },
    priorityServiceItems: ["17.01", "14.01", "16.02"], rankingBasis: "integração metropolitana, comércio e logística",
  },
  {
    ibgeCode: "5107602", city: "Rondonópolis", uf: "MT", slug: "MT-RONDONOPOLIS",
    source: { code: "ISS-ROO-CTM", title: "Gestão eletrônica do ISSQN e Código Tributário Municipal", publisher: "Prefeitura de Rondonópolis", url: "https://www.rondonopolis.mt.gov.br/servicos/nfse/", kind: "municipal_law", legalReference: "Lei nº 1.800/1990; ISSQN, lista de serviços e Decreto nº 13.191/2026" },
    priorityServiceItems: ["16.02", "17.01", "14.01"], rankingBasis: "terminal logístico, agronegócio e manutenção",
  },
  {
    ibgeCode: "5008305", city: "Três Lagoas", uf: "MS", slug: "MS-TRES-LAGOAS",
    source: { code: "ISS-TLG-PORTAL", title: "ISS eletrônico e legislação municipal", publisher: "Prefeitura de Três Lagoas", url: "https://www.treslagoas.ms.gov.br/prefeitura-disponibiliza-novo-sistema-para-informacoes-de-iss/", kind: "operational_guidance", legalReference: "Lei nº 1.067/1991, Código Tributário Municipal e regulamento do ISS" },
    priorityServiceItems: ["14.01", "17.01", "7.02"], rankingBasis: "celulose, indústria e serviços técnicos",
  },
  {
    ibgeCode: "1100205", city: "Porto Velho", uf: "RO", slug: "RO-PORTO-VELHO",
    source: { code: "ISS-PVH-CTRM", title: "Legislação tributária municipal vigente", publisher: "Prefeitura de Porto Velho", url: "https://crf.portovelho.ro.gov.br/pagina/legislacao", kind: "municipal_law", legalReference: "Lei Complementar nº 878/2021 e Decreto nº 18.749/2023" },
    priorityServiceItems: ["17.01", "14.01", "7.02"], rankingBasis: "capital regional, obras, energia e serviços empresariais",
  },
  {
    ibgeCode: "1200401", city: "Rio Branco", uf: "AC", slug: "AC-RIO-BRANCO",
    source: { code: "ISS-RBR-CTM", title: "Código Tributário e normas do ISSQN", publisher: "Controladoria-Geral de Rio Branco", url: "https://portalcgm.riobranco.ac.gov.br/lai/orientacoes/normas-para-retencao-do-issqn-devido-pela-prestacao-de-servicos-a-administracao-publica-municipal/", kind: "municipal_law", legalReference: "Lei nº 1.508/2003, LC nº 277/2023 e normas municipais de retenção" },
    priorityServiceItems: ["17.01", "14.01", "1.07"], rankingBasis: "capital estadual e concentração regional de serviços",
  },
];

export const issDeepExpansionSources = seeds.map((item) => item.source);

export const issDeepExpansionCities: IssDeepExpansionCity[] = seeds.map((item, index) => ({
  rank: index + 26,
  code: `ISS-DEEP-${item.slug}`,
  ibgeCode: item.ibgeCode,
  city: item.city,
  uf: item.uf,
  sourceCodes: [item.source.code],
  priorityServiceItems: [...item.priorityServiceItems],
  rankingBasis: item.rankingBasis,
  stage: "structured_partial",
  version: ISS_DEEP_EXPANSION_VERSION,
  checkedAt: ISS_DEEP_EXPANSION_CHECKED_AT,
  effectiveFrom: null,
  effectiveTo: null,
  calculationSupported: false,
  blockers: [...commonBlockers],
}));

export const issDeepExpansionByIbge = new Map(issDeepExpansionCities.map((item) => [item.ibgeCode, item]));

export function validateIssDeepExpansion() {
  const errors: string[] = [];
  const ranks = issDeepExpansionCities.map((item) => item.rank);
  if (issDeepExpansionCities.length !== 25) errors.push("expected_25_expansion_cities");
  if (new Set(issDeepExpansionCities.map((item) => item.ibgeCode)).size !== issDeepExpansionCities.length) errors.push("duplicate_ibge_code");
  if (new Set(issDeepExpansionSources.map((item) => item.code)).size !== issDeepExpansionSources.length) errors.push("duplicate_source_code");
  if (new Set(issDeepExpansionSources.map((item) => item.url)).size !== issDeepExpansionSources.length) errors.push("duplicate_source_url");
  if (ranks.some((rank, index) => rank !== index + 26)) errors.push("unstable_economic_ranking");
  for (const item of issDeepExpansionCities) {
    if (item.priorityServiceItems.length < 3) errors.push(`${item.ibgeCode}:priority_services_missing`);
    if (!item.rankingBasis.trim()) errors.push(`${item.ibgeCode}:ranking_basis_missing`);
    if (item.sourceCodes.length < 1) errors.push(`${item.ibgeCode}:official_source_missing`);
    if (item.calculationSupported || item.effectiveFrom !== null || item.effectiveTo !== null) errors.push(`${item.ibgeCode}:partial_rule_released`);
    if (item.blockers.length < 5) errors.push(`${item.ibgeCode}:transparent_blockers_missing`);
  }
  for (const source of issDeepExpansionSources) {
    if (!source.url.startsWith("https://")) errors.push(`${source.code}:non_https_source`);
    if (source.publisher.length < 8 || source.legalReference.length < 12) errors.push(`${source.code}:source_metadata_incomplete`);
  }
  return { passed: errors.length === 0, errors };
}

export async function hashIssDeepExpansion() {
  const payload = JSON.stringify({
    version: ISS_DEEP_EXPANSION_VERSION,
    checkedAt: ISS_DEEP_EXPANSION_CHECKED_AT,
    cities: issDeepExpansionCities,
    sources: issDeepExpansionSources,
  });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

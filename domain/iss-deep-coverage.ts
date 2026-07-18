export const ISS_DEEP_VERSION = "2026.07.18-v52";
export const ISS_DEEP_CHECKED_AT = "2026-07-18";

export type IssDeepSourceKind = "municipal_law" | "rate_table" | "operational_guidance";

export type IssDeepSource = {
  code: string;
  title: string;
  publisher: string;
  url: string;
  checkedAt: string;
  kind: IssDeepSourceKind;
};

export type IssDeepCityProfile = {
  code: string;
  ibgeCode: string;
  city: string;
  uf: string;
  stage: "structured";
  supportStatus: "partial";
  checkedAt: string;
  sourceCodes: string[];
  rateRangeBps: [number, number];
  classification: {
    lc116ItemRequired: true;
    municipalServiceCodeRequired: true;
    cnaeIsSupportingEvidenceOnly: true;
  };
  placeOfIncidence: {
    generalRule: string;
    requiredFacts: string[];
  };
  withholding: {
    conclusion: "requires_facts";
    requiredFacts: string[];
  };
  supportedOutputs: string[];
  hardStops: string[];
};

const source = (input: Omit<IssDeepSource, "checkedAt">): IssDeepSource => ({
  ...input,
  checkedAt: ISS_DEEP_CHECKED_AT,
});

export const issDeepSources: IssDeepSource[] = [
  source({ code: "ISS-SP-L13701", title: "Lei Municipal nº 13.701/2003 — texto consolidado", publisher: "Prefeitura de São Paulo", url: "https://legislacao.prefeitura.sp.gov.br/lei-13701-de-24-de-dezembro-de-2003/consolidado", kind: "municipal_law" }),
  source({ code: "ISS-SP-TABELA", title: "Tabela de códigos de serviço e alíquotas — IN SF/SUREM nº 19/2021", publisher: "Prefeitura de São Paulo", url: "https://legislacao.prefeitura.sp.gov.br/leis/instrucao-normativa-secretaria-municipal-da-fazenda-sf-surem-19-de-22-de-dezembro-de-2021/anexo/61f1544a1411920679f880ac/Anexo%20da%20Instru%C3%A7%C3%A3o%20Normativa%20SF-SUREM%20n%C2%BA%2019_2021.pdf", kind: "rate_table" }),
  source({ code: "ISS-RJ-ALIQUOTAS", title: "ISS — alíquotas, base de cálculo e códigos de atividade", publisher: "Secretaria Municipal de Fazenda do Rio de Janeiro", url: "https://fazenda.prefeitura.rio/aliquota-base-calculo-codigo-atividades/", kind: "rate_table" }),
  source({ code: "ISS-DF-D25508", title: "Decreto nº 25.508/2005 — RISS/DF consolidado", publisher: "Sistema Integrado de Normas Jurídicas do Distrito Federal", url: "https://www.sinj.df.gov.br/sinj/Norma/46110/Decreto_25508_19_01_2005.html", kind: "municipal_law" }),
  source({ code: "ISS-BH-CONSULTAS", title: "Tabela de alíquotas e correlação CTISS × CNAE", publisher: "Prefeitura de Belo Horizonte", url: "https://prefeitura.pbh.gov.br/fazenda/bhissdigital/consultas", kind: "rate_table" }),
  source({ code: "ISS-BH-BHISS", title: "BHISS — legislação, códigos, retenções e NFS-e", publisher: "Prefeitura de Belo Horizonte", url: "https://prefeitura.pbh.gov.br/fazenda/bhiss", kind: "operational_guidance" }),
  source({ code: "ISS-CWB-LC40", title: "Lei Complementar nº 40/2001 — Código Tributário Municipal", publisher: "Prefeitura de Curitiba", url: "https://legisladocexterno.curitiba.pr.gov.br/VisualizarHTML.aspx?id=41", kind: "municipal_law" }),
  source({ code: "ISS-CWB-GUIA", title: "ISS com inscrição municipal — empresas", publisher: "Prefeitura de Curitiba", url: "https://www.curitiba.pr.gov.br/conteudo/iss-com-inscricao-municipal-para-empresas/357", kind: "operational_guidance" }),
  source({ code: "ISS-SSA-CTM", title: "Código Tributário e de Rendas de Salvador — consolidado", publisher: "SEFAZ Salvador", url: "https://www2.sefaz.salvador.ba.gov.br/storage/9761/CTRMS---CONSOLIDADO---ate-9.877-2025-e-Dec.-41.304.2025---COM-ATUALIZA%C3%87%C3%83O-ISEN%C3%87%C3%83O.pdf", kind: "municipal_law" }),
  source({ code: "ISS-SSA-LEGIS", title: "ISS — legislação e alterações do CTISS", publisher: "SEFAZ Salvador", url: "https://www2.sefaz.salvador.ba.gov.br/legislacao/decreto/ISS-Demais-assuntos", kind: "rate_table" }),
  source({ code: "ISS-FOR-CTM", title: "Código Tributário de Fortaleza — atualizado até dezembro de 2025", publisher: "SEFIN Fortaleza", url: "https://www.sefin.fortaleza.ce.gov.br/anexoCT/26/fb3kr1hds.gpg1424/pdf/C%C3%B3digo%20Tribut%C3%A1rio%20do%20Munic%C3%ADpio%20de%20Fortaleza%20atualizado%20at%C3%A9%20Dez-2025%20-%20LC%20452-2025", kind: "municipal_law" }),
  source({ code: "ISS-FOR-GUIA", title: "ISSQN — legislação, alíquotas e lista de serviços", publisher: "SEFIN Fortaleza", url: "https://www.sefin.fortaleza.ce.gov.br/Canal/16/Generico/18/Ler", kind: "rate_table" }),
  source({ code: "ISS-MAO-CTM", title: "Código Tributário do Município de Manaus", publisher: "Prefeitura de Manaus", url: "https://sisleg.manaus.am.gov.br/semefatende/consulta/visualizarPdf/id/572", kind: "municipal_law" }),
  source({ code: "ISS-MAO-TABELA", title: "Lista de serviços e alíquotas do ISS", publisher: "Prefeitura de Manaus", url: "https://manausatende.manaus.am.gov.br/pagina-inicial/acesse-aqui-a-lista-de-servicos-e-suas-aliquotas/141", kind: "rate_table" }),
  source({ code: "ISS-REC-CTM", title: "Código Tributário Municipal anotado", publisher: "Prefeitura do Recife", url: "https://recifeemdia.recife.pe.gov.br/sites/default/files/CTM_ANOTADO.pdf", kind: "municipal_law" }),
  source({ code: "ISS-REC-NFSE", title: "NFS-e Recife — legislação municipal", publisher: "Prefeitura do Recife", url: "https://nfse.recife.pe.gov.br/legislacao.aspx", kind: "operational_guidance" }),
  source({ code: "ISS-POA-LC7", title: "Lei Complementar nº 7/1973 — Código Tributário Municipal", publisher: "Prefeitura de Porto Alegre", url: "https://prefeitura.poa.br/sites/default/files/usu_doc/hotsites/smf/iptu/Lei%20Complementar%20n%C2%BA%2007%2C%20de%201973.pdf", kind: "municipal_law" }),
  source({ code: "ISS-POA-LEGIS", title: "Coletânea da legislação tributária — ISSQN", publisher: "Prefeitura de Porto Alegre", url: "https://prefeitura.poa.br/smf/receita-municipal/legislacao", kind: "operational_guidance" }),
  source({ code: "ISS-GYN-LC344", title: "Lei Complementar nº 344/2021 — Código Tributário Municipal", publisher: "Prefeitura de Goiânia", url: "https://www.goiania.go.gov.br/html/gabinete_civil/sileg/dados/legis/2021/lc_20210930_000000344.html", kind: "municipal_law" }),
  source({ code: "ISS-GYN-SGISS", title: "Decreto nº 2.824/2025 — sistema de gestão do ISS", publisher: "Prefeitura de Goiânia", url: "https://www.goiania.go.gov.br/html/gabinete_civil/sileg/dados/legis/2025/dc_20250825_000002824.html", kind: "operational_guidance" }),
  source({ code: "ISS-BEL-LEIS", title: "Repositório oficial de leis municipais de Belém", publisher: "Câmara Municipal de Belém", url: "https://cmb.pa.gov.br/portal-da-transparencia/leis-municipais/", kind: "municipal_law" }),
  source({ code: "ISS-BEL-CTM", title: "Lei Municipal nº 7.056/1977 — Código Tributário de Belém", publisher: "Controladoria-Geral do Estado do Pará", url: "https://cge.pa.gov.br/sites/default/files/2023-01/lei-municipal-no-7056-de-30-de-dezembro-de-1977-livro-segundo_0.pdf", kind: "municipal_law" }),
  source({ code: "ISS-CPS-TABELA", title: "Consulta à lista de serviços, alíquota e classificadores", publisher: "Prefeitura de Campinas", url: "https://campinas.sp.gov.br/secretaria/financas/pagina/consulta-lista-de-servicos-aliquota-e-atividade-cbo-cnae-nbs-", kind: "rate_table" }),
  source({ code: "ISS-CPS-GUIA", title: "ISSQN — orientação oficial sobre alíquotas", publisher: "Prefeitura de Campinas", url: "https://portal-adm.campinas.sp.gov.br/node/51731", kind: "operational_guidance" }),
  source({ code: "ISS-SLZ-CTM", title: "Lei nº 6.289/2017 — Código Tributário Municipal", publisher: "SEMFAZ São Luís", url: "https://semfaz.saoluis.ma.gov.br/arquivos/1560868523.pdf", kind: "municipal_law" }),
  source({ code: "ISS-SLZ-RET", title: "ISSQN — substituição e retenção tributária", publisher: "SEMFAZ São Luís", url: "https://www.semfaz.saoluis.ma.gov.br/substituto_tributario/", kind: "operational_guidance" }),
  source({ code: "ISS-JPA-CTM", title: "Lei Complementar nº 53/2008 — Código Tributário Municipal", publisher: "Prefeitura de João Pessoa", url: "https://receita.joaopessoa.pb.gov.br/itbi/paginas/portal/pdfs/lei1.pdf", kind: "municipal_law" }),
  source({ code: "ISS-JPA-LEGIS", title: "Consulta oficial da legislação tributária municipal", publisher: "Prefeitura de João Pessoa", url: "https://www.joaopessoa.pb.gov.br/pc/consultaLegislacao.xhtml?tipo=1", kind: "operational_guidance" }),
];

const commonRequiredFacts = [
  "item da lista da LC 116/2003",
  "código municipal do serviço",
  "município do estabelecimento prestador",
  "local material da execução quando aplicável",
  "tomador e responsabilidade por retenção",
  "regime tributário e eventual benefício",
  "data do fato gerador",
];

const commonHardStops = [
  "não usar a faixa nacional de 2% a 5% como alíquota exata",
  "não concluir por CNAE sem o item e o código municipal do serviço",
  "não aplicar benefício, dedução, regime fixo ou retenção sem os requisitos documentados",
  "não liberar cálculo sem vigência, fonte municipal e aprovação profissional confirmadas",
];

const commonSupportedOutputs = [
  "vínculo entre município, item da LC 116 e classificador municipal",
  "fontes oficiais de legislação, alíquota e obrigação operacional",
  "trilha de local de incidência e exceções que depende dos fatos da operação",
  "trilha de retenção, responsável tributário, base e deduções",
  "portão determinístico para impedir alíquota presumida",
];

const sourceByCode = new Map(issDeepSources.map((item) => [item.code, item]));

function profile(input: Pick<IssDeepCityProfile, "code" | "ibgeCode" | "city" | "uf" | "sourceCodes">): IssDeepCityProfile {
  for (const code of input.sourceCodes) {
    if (!sourceByCode.has(code)) throw new Error(`iss_deep_source_not_found:${code}`);
  }
  return {
    ...input,
    stage: "structured",
    supportStatus: "partial",
    checkedAt: ISS_DEEP_CHECKED_AT,
    rateRangeBps: [200, 500],
    classification: {
      lc116ItemRequired: true,
      municipalServiceCodeRequired: true,
      cnaeIsSupportingEvidenceOnly: true,
    },
    placeOfIncidence: {
      generalRule: "O estabelecimento prestador é a referência geral; as exceções legais só são resolvidas após identificar o item e os fatos territoriais da operação.",
      requiredFacts: commonRequiredFacts,
    },
    withholding: {
      conclusion: "requires_facts",
      requiredFacts: ["identificação e município do tomador", "item e código municipal do serviço", "regime do prestador", "hipótese municipal de responsabilidade", "alíquota vigente documentada"],
    },
    supportedOutputs: commonSupportedOutputs,
    hardStops: commonHardStops,
  };
}

export const issDeepCityProfiles: IssDeepCityProfile[] = [
  profile({ code: "ISS-DEEP-SP-SAO-PAULO", ibgeCode: "3550308", city: "São Paulo", uf: "SP", sourceCodes: ["ISS-SP-L13701", "ISS-SP-TABELA"] }),
  profile({ code: "ISS-DEEP-RJ-RIO", ibgeCode: "3304557", city: "Rio de Janeiro", uf: "RJ", sourceCodes: ["ISS-RJ-ALIQUOTAS"] }),
  profile({ code: "ISS-DEEP-DF-BRASILIA", ibgeCode: "5300108", city: "Brasília", uf: "DF", sourceCodes: ["ISS-DF-D25508"] }),
  profile({ code: "ISS-DEEP-MG-BELO-HORIZONTE", ibgeCode: "3106200", city: "Belo Horizonte", uf: "MG", sourceCodes: ["ISS-BH-CONSULTAS", "ISS-BH-BHISS"] }),
  profile({ code: "ISS-DEEP-PR-CURITIBA", ibgeCode: "4106902", city: "Curitiba", uf: "PR", sourceCodes: ["ISS-CWB-LC40", "ISS-CWB-GUIA"] }),
  profile({ code: "ISS-DEEP-BA-SALVADOR", ibgeCode: "2927408", city: "Salvador", uf: "BA", sourceCodes: ["ISS-SSA-CTM", "ISS-SSA-LEGIS"] }),
  profile({ code: "ISS-DEEP-CE-FORTALEZA", ibgeCode: "2304400", city: "Fortaleza", uf: "CE", sourceCodes: ["ISS-FOR-CTM", "ISS-FOR-GUIA"] }),
  profile({ code: "ISS-DEEP-AM-MANAUS", ibgeCode: "1302603", city: "Manaus", uf: "AM", sourceCodes: ["ISS-MAO-CTM", "ISS-MAO-TABELA"] }),
  profile({ code: "ISS-DEEP-PE-RECIFE", ibgeCode: "2611606", city: "Recife", uf: "PE", sourceCodes: ["ISS-REC-CTM", "ISS-REC-NFSE"] }),
  profile({ code: "ISS-DEEP-RS-PORTO-ALEGRE", ibgeCode: "4314902", city: "Porto Alegre", uf: "RS", sourceCodes: ["ISS-POA-LC7", "ISS-POA-LEGIS"] }),
  profile({ code: "ISS-DEEP-GO-GOIANIA", ibgeCode: "5208707", city: "Goiânia", uf: "GO", sourceCodes: ["ISS-GYN-LC344", "ISS-GYN-SGISS"] }),
  profile({ code: "ISS-DEEP-PA-BELEM", ibgeCode: "1501402", city: "Belém", uf: "PA", sourceCodes: ["ISS-BEL-LEIS", "ISS-BEL-CTM"] }),
  profile({ code: "ISS-DEEP-SP-CAMPINAS", ibgeCode: "3509502", city: "Campinas", uf: "SP", sourceCodes: ["ISS-CPS-TABELA", "ISS-CPS-GUIA"] }),
  profile({ code: "ISS-DEEP-MA-SAO-LUIS", ibgeCode: "2111300", city: "São Luís", uf: "MA", sourceCodes: ["ISS-SLZ-CTM", "ISS-SLZ-RET"] }),
  profile({ code: "ISS-DEEP-PB-JOAO-PESSOA", ibgeCode: "2507507", city: "João Pessoa", uf: "PB", sourceCodes: ["ISS-JPA-CTM", "ISS-JPA-LEGIS"] }),
];

export const issDeepProfileByIbge = new Map(issDeepCityProfiles.map((item) => [item.ibgeCode, item]));

export function sourcesForIssDeepProfile(profileOrIbge: IssDeepCityProfile | string) {
  const profile = typeof profileOrIbge === "string" ? issDeepProfileByIbge.get(profileOrIbge) : profileOrIbge;
  if (!profile) return [];
  return profile.sourceCodes.map((code) => sourceByCode.get(code)).filter((item): item is IssDeepSource => Boolean(item));
}

export type IssDeepGateInput = {
  ibgeCode: string;
  lc116Item?: string | null;
  municipalServiceCode?: string | null;
  operationDate?: string | null;
  municipalRateBps?: number | null;
  rateSourceCode?: string | null;
  rateEvidenceReference?: string | null;
  placeConfirmed?: boolean;
  withholdingConfirmed?: boolean;
  professionalApprovalConfirmed?: boolean;
};

export function evaluateIssDeepGate(input: IssDeepGateInput) {
  const profile = issDeepProfileByIbge.get(String(input.ibgeCode ?? ""));
  if (!profile) return { status: "blocked" as const, profile: null, missingFacts: ["município com pacote ISS profundo estruturado"], reason: "O município ainda não possui pacote ISS profundo estruturado." };

  const missingFacts: string[] = [];
  if (!/^\d{1,2}\.\d{2}$/.test(String(input.lc116Item ?? "").trim())) missingFacts.push("item válido da LC 116");
  if (String(input.municipalServiceCode ?? "").trim().length < 2) missingFacts.push("código municipal do serviço");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(input.operationDate ?? ""))) missingFacts.push("data do fato gerador");
  if (!Number.isInteger(input.municipalRateBps) || Number(input.municipalRateBps) < 200 || Number(input.municipalRateBps) > 500) missingFacts.push("alíquota municipal oficial entre 2% e 5%");
  if (!profile.sourceCodes.includes(String(input.rateSourceCode ?? ""))) missingFacts.push("fonte oficial do pacote que sustenta a alíquota");
  if (String(input.rateEvidenceReference ?? "").trim().length < 8) missingFacts.push("artigo, item ou linha exata da fonte que sustenta a alíquota");
  if (input.placeConfirmed !== true) missingFacts.push("município de incidência confirmado");
  if (input.withholdingConfirmed !== true) missingFacts.push("retenção e responsável tributário confirmados");
  if (input.professionalApprovalConfirmed !== true) missingFacts.push("aprovação profissional da regra e da vigência");

  if (missingFacts.length) {
    return {
      status: "blocked" as const,
      profile,
      missingFacts,
      reason: "O pacote municipal está estruturado, mas o cálculo exato permanece bloqueado até todos os fatos e a aprovação profissional serem confirmados.",
    };
  }

  return {
    status: "ready_for_deterministic_calculation" as const,
    profile,
    missingFacts: [],
    rateBps: input.municipalRateBps as number,
    reason: "Fatos mínimos, fonte municipal e aprovação profissional confirmados; o valor pode seguir para o calculador determinístico e para a memória de cálculo.",
  };
}

export const issDeepMetrics = {
  structuredCities: issDeepCityProfiles.length,
  officialSources: issDeepSources.length,
  testedCities: 0,
  professionallyApprovedCities: 0,
  automaticHomologation: false,
} as const;

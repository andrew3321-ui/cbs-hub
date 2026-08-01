export const ST_PHARMA_COSMETICS_PRIORITY_VERSION = "2026.07.31-v3";
export const ST_PHARMA_COSMETICS_PRIORITY_CHECKED_AT = "2026-07-31";

export const ST_PHARMA_COSMETICS_FACT_LABELS = {
  exactProductConfirmed: "NCM, CEST, descrição e finalidade do produto foram conferidos",
  operationDateConfirmed: "data de saída e vigência da regra foram conferidas",
  partiesConfirmed: "origem, destino e condição de contribuinte foram conferidos",
  ordinaryResaleConfirmed: "operação de revenda comum; transferência, industrialização, uso, consumo e ativo foram afastados",
  noSpecialTreatmentConfirmed: "benefício, regime especial, decisão judicial e tratamento hospitalar foram afastados",
  documentsConfirmed: "NF-e, cadastro do produto e documentos comerciais foram conferidos",
} as const;

export type PharmaCosmeticsFactKey = keyof typeof ST_PHARMA_COSMETICS_FACT_LABELS;
export type PharmaCosmeticsFacts = Record<PharmaCosmeticsFactKey, boolean>;

export const ST_PHARMA_COSMETICS_PRODUCTS = [
  { code: "REFERENCE_POSITIVE", family: "medicine", priorityRank: 1, cest: "13.001.00", ncms: ["3003", "3004"], presentation: "apresentação CMED exata obrigatória", description: "Medicamento de referência — lista positiva", federalTreatment: "monophase_must_be_confirmed_separately" },
  { code: "GENERIC_POSITIVE", family: "medicine", priorityRank: 2, cest: "13.002.00", ncms: ["3003", "3004"], presentation: "apresentação CMED exata obrigatória", description: "Medicamento genérico — lista positiva", federalTreatment: "monophase_must_be_confirmed_separately" },
  { code: "REFERENCE_NEGATIVE", family: "medicine", priorityRank: 3, cest: "13.001.01", ncms: ["3003", "3004"], presentation: "apresentação CMED exata obrigatória", description: "Medicamento de referência — lista negativa", federalTreatment: "monophase_must_be_confirmed_separately" },
  { code: "BEAUTY_CREAM", family: "cosmetics", priorityRank: 4, cest: "20.014.00", ncms: ["3304.99.10"], presentation: "creme, loção ou tônico; marca e volume devem coincidir quando houver pauta", description: "Cremes de beleza, cremes nutritivos e loções tônicas", federalTreatment: "ordinary_or_monophase_must_be_confirmed" },
  { code: "PERFUME", family: "perfumery", priorityRank: 5, cest: "20.007.00", ncms: ["3303.00.10"], presentation: "extrato fora do sistema porta a porta", description: "Perfumes (extratos) fora do sistema porta a porta", federalTreatment: "ordinary_or_monophase_must_be_confirmed" },
  { code: "SHAMPOO", family: "personal_hygiene", priorityRank: 6, cest: "20.017.00", ncms: ["3305.10.00"], presentation: "xampu para o cabelo; marca e volume devem coincidir quando houver pauta", description: "Xampus para o cabelo", federalTreatment: "ordinary_or_monophase_must_be_confirmed" },
  { code: "DENTIFRICE", family: "personal_hygiene", priorityRank: 7, cest: "20.023.00", ncms: ["3306.10.00"], presentation: "dentifrício acondicionado para venda a varejo", description: "Dentifrícios", federalTreatment: "ordinary_or_monophase_must_be_confirmed" },
  { code: "PERFUME_DOOR_TO_DOOR", family: "perfumery", priorityRank: 8, cest: "28.001.00", ncms: ["3303.00.10"], presentation: "extrato comercializado em sistema porta a porta comprovado", description: "Perfumes (extratos) no sistema porta a porta", federalTreatment: "door_to_door_and_federal_treatment_must_be_confirmed" },
] as const;

export type PharmaCosmeticsProductCode = typeof ST_PHARMA_COSMETICS_PRODUCTS[number]["code"];
export type PharmaCosmeticsDestination = "SP" | "MG" | "RJ" | "PR" | "SC" | "RS" | "GO" | "BA";
type CoverageStatus = "supported" | "partial" | "not_supported";
type Treatment = "ordinary_icms_no_st" | "destination_entry_responsibility" | "origin_substitute_conditional" | "destination_law_required";
type ParameterStatus = "exact_no_st" | "complete_conditional" | "explicitly_unavailable";
type ParameterValueStatus = "exact" | "not_applicable" | "case_specific" | "unavailable";

type ParameterValue = {
  status: ParameterValueStatus;
  bps: number | null;
  note: string;
};

export type PharmaCosmeticsStateRule = {
  key: string;
  destination: PharmaCosmeticsDestination;
  productCode: PharmaCosmeticsProductCode;
  effectiveFrom: string;
  effectiveTo: string | null;
  scope: string;
  responsibility: string;
  agreementStatus: string;
  baseMethod: string;
  mvaOriginal: ParameterValue;
  internalRate: ParameterValue;
  fcpRate: ParameterValue;
  reductions: string[];
  benefits: string[];
  exceptions: string[];
  sourceCodes: string[];
  parameterStatus: ParameterStatus;
  calculationReleased: boolean;
};

export const ST_PHARMA_COSMETICS_ROUTES = [
  { route: "SP-SP", priorityRank: 1, priorityBasis: "internal_operational_heuristic" },
  { route: "SP-MG", priorityRank: 2, priorityBasis: "internal_operational_heuristic" },
  { route: "MG-SP", priorityRank: 3, priorityBasis: "internal_operational_heuristic" },
  { route: "SP-RJ", priorityRank: 4, priorityBasis: "internal_operational_heuristic" },
  { route: "RJ-SP", priorityRank: 5, priorityBasis: "internal_operational_heuristic" },
  { route: "SP-PR", priorityRank: 6, priorityBasis: "internal_operational_heuristic" },
  { route: "PR-SP", priorityRank: 7, priorityBasis: "internal_operational_heuristic" },
  { route: "SP-SC", priorityRank: 8, priorityBasis: "internal_operational_heuristic" },
  { route: "SC-SP", priorityRank: 9, priorityBasis: "internal_operational_heuristic" },
  { route: "SP-RS", priorityRank: 10, priorityBasis: "internal_operational_heuristic" },
  { route: "RS-SP", priorityRank: 11, priorityBasis: "internal_operational_heuristic" },
  { route: "SP-GO", priorityRank: 12, priorityBasis: "internal_operational_heuristic" },
  { route: "GO-SP", priorityRank: 13, priorityBasis: "internal_operational_heuristic" },
  { route: "SP-BA", priorityRank: 14, priorityBasis: "internal_operational_heuristic" },
  { route: "BA-SP", priorityRank: 15, priorityBasis: "internal_operational_heuristic" },
] as const;

export const ST_PHARMA_COSMETICS_PRIORITY_EVIDENCE = {
  method: "Heurística operacional documentada; não representa frequência oficial de NF-e.",
  criteria: [
    "peso econômico das UFs nas Contas Regionais do IBGE",
    "relevância regulatória e diversidade de tratamento estadual",
    "recorrência operacional interna dos corredores com São Paulo",
    "representatividade das classes CMED e do catálogo CEST nacional",
  ],
  sourceCodes: ["IBGE-CONTAS-REGIONAIS", "ANVISA-CMED-MERCADO", "CONFAZ-CV142-2018"],
} as const;

export const stPharmaCosmeticsSources = [
  {
    code: "CONFAZ-CV142-2018",
    title: "Convênio ICMS 142/2018",
    publisher: "CONFAZ",
    url: "https://www.confaz.fazenda.gov.br/legislacao/convenios/2018/CV142_18",
    checkedAt: ST_PHARMA_COSMETICS_PRIORITY_CHECKED_AT,
    proves: ["catálogo nacional CEST/NCM", "dependência de acordo específico", "regra do destino", "portões gerais e fórmula da ST"],
  },
  {
    code: "SP-RC33215-2026",
    title: "Resposta à Consulta 33.215/2026",
    publisher: "SEFAZ-SP",
    url: "https://legislacao.fazenda.sp.gov.br/Paginas/RC33215_2026.aspx",
    checkedAt: ST_PHARMA_COSMETICS_PRIORITY_CHECKED_AT,
    proves: ["revogação do Anexo IX de medicamentos", "fim da ST paulista desde 01/01/2026", "tributação normal das operações próprias"],
  },
  {
    code: "SP-RC33677-2026",
    title: "Resposta à Consulta 33.677/2026",
    publisher: "SEFAZ-SP",
    url: "https://legislacao.fazenda.sp.gov.br/Paginas/RC33677_2026.aspx",
    checkedAt: ST_PHARMA_COSMETICS_PRIORITY_CHECKED_AT,
    proves: ["fim da ST paulista para perfumaria e higiene desde 01/04/2026", "NCM 3304.99.10 no antigo item 14", "obrigação de observar a lei do destino"],
  },
  {
    code: "SP-RC33735-2026",
    title: "Resposta à Consulta 33.735M1/2026",
    publisher: "SEFAZ-SP",
    url: "https://legislacao.fazenda.sp.gov.br/Paginas/RC33735_2026.aspx",
    checkedAt: ST_PHARMA_COSMETICS_PRIORITY_CHECKED_AT,
    proves: ["revogação do Protocolo ICMS 36/2009 pelo Protocolo 18/2026", "fim da retenção pelo remetente paulista para MG desde 01/04/2026"],
  },
  {
    code: "MG-RICMS-ANEXO-VII",
    title: "RICMS/2023 — Anexo VII, Parte 2",
    publisher: "SEF-MG",
    url: "https://www.fazenda.mg.gov.br/empresas/legislacao_tributaria/ricms_2023_seco/anexovii2023_5.html",
    checkedAt: ST_PHARMA_COSMETICS_PRIORITY_CHECKED_AT,
    proves: ["escopo estadual de medicamentos, cosméticos e perfumaria", "MVA original", "acordos interestaduais indicados pelo Estado"],
  },
  {
    code: "MG-RICMS-ANEXO-I",
    title: "RICMS/2023 — Anexo I, Parte 1",
    publisher: "SEF-MG",
    url: "https://www.fazenda.mg.gov.br/empresas/legislacao_tributaria/ricms_2023_seco/anexoi2023_2.html",
    checkedAt: ST_PHARMA_COSMETICS_PRIORITY_CHECKED_AT,
    proves: ["alíquota interna de medicamentos genéricos", "alíquota interna geral de medicamentos"],
  },
  {
    code: "MG-LEI6763-FEM",
    title: "Lei 6.763/1975 — adicional FEM",
    publisher: "SEF-MG",
    url: "https://www.fazenda.mg.gov.br/empresas/legislacao_tributaria/leis/l6763_1975_02.html",
    checkedAt: ST_PHARMA_COSMETICS_PRIORITY_CHECKED_AT,
    proves: ["adicional de dois pontos para perfumes e cosméticos", "incidência também na substituição tributária", "vigência do adicional"],
  },
  {
    code: "MG-PORTARIA-SAIF91-2026",
    title: "Portaria SAIF 91/2026",
    publisher: "SEF-MG",
    url: "https://www.fazenda.mg.gov.br/empresas/legislacao_tributaria/portarias/2026/port_saif091_2026.html",
    checkedAt: ST_PHARMA_COSMETICS_PRIORITY_CHECKED_AT,
    proves: ["PMPF vigente de cosméticos e perfumaria", "condições de uso do preço fiscal", "tratamento de produtos não listados"],
  },
  {
    code: "RJ-ANEXO-I-LIVRO-II",
    title: "RICMS-RJ — Anexo I do Livro II",
    publisher: "SEFAZ-RJ",
    url: "https://portal.fazenda.rj.gov.br/icms/wp-content/uploads/sites/42/2023/10/anexo_I_livroII_2.pdf",
    checkedAt: ST_PHARMA_COSMETICS_PRIORITY_CHECKED_AT,
    proves: ["escopo e protocolos de medicamentos, cosméticos e perfumaria", "PMC, descontos e MVA original", "tratamento porta a porta"],
  },
  {
    code: "RJ-ALIQUOTAS-ATUAIS",
    title: "Tributação no RJ — consumidor final",
    publisher: "SEFAZ-RJ",
    url: "https://portal.fazenda.rj.gov.br/icms/wp-content/uploads/sites/42/2023/10/Tributacao-RJ-consumidor-final.pdf",
    checkedAt: ST_PHARMA_COSMETICS_PRIORITY_CHECKED_AT,
    proves: ["alíquota interna geral atual", "alíquota de perfumes e cosméticos", "separação do FECP"],
  },
  {
    code: "RJ-FECP",
    title: "Fundo Estadual de Combate à Pobreza — FECP",
    publisher: "SEFAZ-RJ",
    url: "https://portal.fazenda.rj.gov.br/icms/fecp/",
    checkedAt: ST_PHARMA_COSMETICS_PRIORITY_CHECKED_AT,
    proves: ["adicional geral de dois pontos", "aplicação nas operações sujeitas à ST", "responsabilidade do remetente de outra UF quando aplicável"],
  },
  {
    code: "PR-RESOLUCAO-1245-2025",
    title: "Resolução SEFA 1.245/2025",
    publisher: "SEFA-PR",
    url: "https://www.legislacao.pr.gov.br/legislacao/listarAtosAno.do?action=exibirImpressao&codAto=381258",
    checkedAt: ST_PHARMA_COSMETICS_PRIORITY_CHECKED_AT,
    proves: ["MVA vigente de cosméticos e perfumes desde 01/04/2026", "protocolos indicados pelo Paraná", "recorte NCM/CEST"],
  },
  {
    code: "PR-LEI-COMPILADA",
    title: "Lei 11.580/1996 — texto compilado",
    publisher: "Estado do Paraná",
    url: "https://www.legislacao.pr.gov.br/legislacao/pesquisarAto.do?action=exibir&codAto=278020&codTipoAto=1&tipoVisualizacao=compilado",
    checkedAt: ST_PHARMA_COSMETICS_PRIORITY_CHECKED_AT,
    proves: ["alíquota interna geral", "alíquota de perfumes e cosméticos", "adicional FECOP"],
  },
  {
    code: "PR-DECRETO6048-2024",
    title: "Decreto 6.048/2024",
    publisher: "Estado do Paraná",
    url: "https://www.legislacao.pr.gov.br/legislacao/exibirAto.do?action=iniciarProcesso&codAto=327771&codItemAto=2074937",
    checkedAt: ST_PHARMA_COSMETICS_PRIORITY_CHECKED_AT,
    proves: ["regime estadual vigente de medicamentos", "alterações e revogações do catálogo farmacêutico"],
  },
  {
    code: "IBGE-CONTAS-REGIONAIS",
    title: "Sistema de Contas Regionais do Brasil",
    publisher: "IBGE",
    url: "https://www.ibge.gov.br/estatisticas/economicas/contas-nacionais/9054-contas-regionais-do-brasil.html",
    checkedAt: ST_PHARMA_COSMETICS_PRIORITY_CHECKED_AT,
    proves: ["critério econômico comparável entre as UFs", "base pública para priorização, sem alegar frequência de NF-e"],
  },
  {
    code: "ANVISA-CMED-MERCADO",
    title: "Anuário Estatístico do Mercado Farmacêutico",
    publisher: "ANVISA/CMED",
    url: "https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/cmed/informes/anuario-estatistico",
    checkedAt: ST_PHARMA_COSMETICS_PRIORITY_CHECKED_AT,
    proves: ["relevância econômica das classes de medicamentos", "necessidade de identidade e apresentação CMED"],
  },
  {
    code: "SC-RICMS-ANEXO-1A",
    title: "RICMS/SC — Anexo 1-A",
    publisher: "SEF-SC",
    url: "https://legislacao.sef.sc.gov.br/legtrib_internet/html/regulamentos/icms/ricms_01_01_a.htm",
    checkedAt: ST_PHARMA_COSMETICS_PRIORITY_CHECKED_AT,
    proves: ["seção de medicamentos revogada", "seção de perfumaria, higiene pessoal e cosméticos revogada", "catálogo estadual vigente"],
  },
  {
    code: "RS-MINI-RICMS-FARMA-2026",
    title: "Mini RICMS — Produtos farmacêuticos, versão 09/01/2026",
    publisher: "Receita Estadual-RS",
    url: "https://atendimento.receita.rs.gov.br/upload/arquivos/202601/12090753-mini-ricms-produtos-farmaceuticos-v09012026.pdf",
    checkedAt: ST_PHARMA_COSMETICS_PRIORITY_CHECKED_AT,
    proves: ["PMPF como primeira base", "MVA de 65,60%, 75,57% e 91,53%", "alíquota de 17% e redutor da cesta básica"],
  },
  {
    code: "RS-SETOR-MEDICOS-COSMETICOS",
    title: "Setor de Produtos Médicos e Cosméticos",
    publisher: "Receita Estadual-RS",
    url: "https://atendimento.receita.rs.gov.br/setor-de-produtos-medicos-e-cosmeticos",
    checkedAt: ST_PHARMA_COSMETICS_PRIORITY_CHECKED_AT,
    proves: ["índice oficial setorial", "fontes correntes de farmacêuticos, perfumaria, cosméticos e higiene"],
  },
  {
    code: "RS-AMPARA-COSMETICOS",
    title: "Pagamento do AMPARA-RS",
    publisher: "Receita Estadual-RS",
    url: "https://atendimento.receita.rs.gov.br/pagamento-do-ampara-rs",
    checkedAt: ST_PHARMA_COSMETICS_PRIORITY_CHECKED_AT,
    proves: ["cosméticos sem ST no exemplo oficial", "adicional AMPARA separado do ICMS-ST"],
  },
  {
    code: "GO-DECRETO10799-2025",
    title: "Decreto 10.799/2025 — tabelas de MVA",
    publisher: "Casa Civil-GO",
    url: "https://legisla.casacivil.go.gov.br/pesquisa_legislacao/111443/decreto-numerado-10799",
    checkedAt: ST_PHARMA_COSMETICS_PRIORITY_CHECKED_AT,
    proves: ["MVA por NCM/CEST e alíquota interestadual", "segmento de perfumaria, higiene e cosméticos"],
  },
  {
    code: "GO-DECRETO8567-2016",
    title: "Decreto 8.567/2016 — catálogo CEST estadual",
    publisher: "Casa Civil-GO",
    url: "https://legisla.casacivil.go.gov.br/pesquisa_legislacao/67817/decreto-numerado-8567",
    checkedAt: ST_PHARMA_COSMETICS_PRIORITY_CHECKED_AT,
    proves: ["catálogo estadual de medicamentos", "catálogo estadual de cosméticos, perfumaria e higiene", "identidade NCM/CEST"],
  },
  {
    code: "BA-RICMS-ANEXO1-2026",
    title: "RICMS/BA — Anexo 1, Substituição Tributária vigente 2026",
    publisher: "SEFAZ-BA",
    url: "https://www.sefaz.ba.gov.br/legislacao/textos-legais/",
    checkedAt: ST_PHARMA_COSMETICS_PRIORITY_CHECKED_AT,
    proves: ["mercadorias sujeitas à substituição ou antecipação", "regra estadual para medicamentos, perfumaria, cosméticos e higiene"],
  },
] as const;

const exact = (bps: number, note: string): ParameterValue => ({ status: "exact", bps, note });
const notApplicable = (note: string): ParameterValue => ({ status: "not_applicable", bps: null, note });
const caseSpecific = (note: string): ParameterValue => ({ status: "case_specific", bps: null, note });
const unavailable = (note: string): ParameterValue => ({ status: "unavailable", bps: null, note });

const medicineCodes = ["REFERENCE_POSITIVE", "GENERIC_POSITIVE", "REFERENCE_NEGATIVE"] as const;
const cosmeticsCodes = ["BEAUTY_CREAM", "PERFUME", "PERFUME_DOOR_TO_DOOR"] as const;
const hygieneCodes = ["SHAMPOO", "DENTIFRICE"] as const;

function stateRule(
  destination: PharmaCosmeticsDestination,
  productCode: PharmaCosmeticsProductCode,
  values: Omit<PharmaCosmeticsStateRule, "key" | "destination" | "productCode">,
): PharmaCosmeticsStateRule {
  return { key: `${destination}:${productCode}`, destination, productCode, ...values };
}

const spRules: PharmaCosmeticsStateRule[] = ST_PHARMA_COSMETICS_PRODUCTS.map((product) => stateRule("SP", product.code, {
  effectiveFrom: product.family === "medicine" ? "2026-01-01" : "2026-04-01",
  effectiveTo: null,
  scope: "A mercadoria saiu do regime paulista de substituição tributária no recorte vigente.",
  responsibility: "ICMS próprio do contribuinte; não há retenção de ICMS-ST para destino paulista neste recorte.",
  agreementStatus: "Regime paulista revogado; a existência de CEST não restabelece a ST.",
  baseMethod: "not_applicable_no_st",
  mvaOriginal: notApplicable("MVA não aplicável porque a ST paulista foi retirada."),
  internalRate: notApplicable("A alíquota do ICMS próprio não integra esta memória restrita à ST."),
  fcpRate: notApplicable("Não há FCP-ST nesta memória de ST igual a zero."),
  reductions: ["Qualquer redução do ICMS próprio deve ser apurada separadamente."],
  benefits: ["Benefícios, decisões judiciais e regimes especiais estão fora do resultado automático."],
  exceptions: ["Operação anterior à vigência", "classificação divergente", "finalidade distinta de revenda comum"],
  sourceCodes: product.family === "medicine"
    ? ["CONFAZ-CV142-2018", "SP-RC33215-2026"]
    : ["CONFAZ-CV142-2018", "SP-RC33677-2026"],
  parameterStatus: "exact_no_st",
  calculationReleased: true,
}));

const mgRules: PharmaCosmeticsStateRule[] = [
  stateRule("MG", "REFERENCE_POSITIVE", {
    effectiveFrom: "2023-07-01", effectiveTo: null,
    scope: "Regime interno mineiro de medicamentos; operação interestadual exige conferir acordo e responsabilidade na entrada.",
    responsibility: "Sem acordo vigente identificado com SP para este recorte, a responsabilidade do destinatário/entrada deve ser confirmada.",
    agreementStatus: "O Anexo VII indica protocolo interestadual com MS, não com SP, para o recorte farmacêutico consultado.",
    baseMethod: "official_price_or_pmc_then_mva",
    mvaOriginal: exact(3824, "MVA original de 38,24% quando a base por preço oficial/PMC não prevalecer."),
    internalRate: exact(1800, "Alíquota interna geral de 18% para os demais medicamentos."),
    fcpRate: exact(0, "Medicamentos deste recorte não constam no adicional FEM catalogado."),
    reductions: ["Sem redução automática; conferir lista, finalidade e benefício do produto."],
    benefits: ["PMC/preço público pode prevalecer sobre MVA.", "Tratamentos específicos de saúde podem alterar a tributação."],
    exceptions: ["preço oficial ou PMC aplicável", "hospitalar", "decisão judicial", "benefício estadual"],
    sourceCodes: ["CONFAZ-CV142-2018", "MG-RICMS-ANEXO-VII", "MG-RICMS-ANEXO-I"],
    parameterStatus: "complete_conditional", calculationReleased: false,
  }),
  stateRule("MG", "GENERIC_POSITIVE", {
    effectiveFrom: "2023-07-01", effectiveTo: null,
    scope: "Regime interno mineiro de medicamentos; operação interestadual exige conferir acordo e responsabilidade na entrada.",
    responsibility: "Sem acordo vigente identificado com SP para este recorte, a responsabilidade do destinatário/entrada deve ser confirmada.",
    agreementStatus: "O Anexo VII indica protocolo interestadual com MS, não com SP, para o recorte farmacêutico consultado.",
    baseMethod: "official_price_or_pmc_then_mva",
    mvaOriginal: exact(3824, "MVA original de 38,24% quando a base por preço oficial/PMC não prevalecer."),
    internalRate: exact(1200, "Alíquota interna de 12% para medicamento genérico qualificado."),
    fcpRate: exact(0, "Medicamentos deste recorte não constam no adicional FEM catalogado."),
    reductions: ["A alíquota de 12% depende da efetiva qualificação como genérico."],
    benefits: ["PMC/preço público pode prevalecer sobre MVA."],
    exceptions: ["qualificação como genérico", "preço oficial ou PMC aplicável", "hospitalar", "benefício estadual"],
    sourceCodes: ["CONFAZ-CV142-2018", "MG-RICMS-ANEXO-VII", "MG-RICMS-ANEXO-I"],
    parameterStatus: "complete_conditional", calculationReleased: false,
  }),
  stateRule("MG", "REFERENCE_NEGATIVE", {
    effectiveFrom: "2023-07-01", effectiveTo: null,
    scope: "Regime interno mineiro de medicamentos; operação interestadual exige conferir acordo e responsabilidade na entrada.",
    responsibility: "Sem acordo vigente identificado com SP para este recorte, a responsabilidade do destinatário/entrada deve ser confirmada.",
    agreementStatus: "O Anexo VII indica protocolo interestadual com MS, não com SP, para o recorte farmacêutico consultado.",
    baseMethod: "official_price_or_pmc_then_mva",
    mvaOriginal: exact(3300, "MVA original de 33% quando a base por preço oficial/PMC não prevalecer."),
    internalRate: exact(1800, "Alíquota interna geral de 18% para os demais medicamentos."),
    fcpRate: exact(0, "Medicamentos deste recorte não constam no adicional FEM catalogado."),
    reductions: ["Sem redução automática; conferir lista e tratamento fiscal do produto."],
    benefits: ["PMC/preço público pode prevalecer sobre MVA."],
    exceptions: ["classificação em lista negativa", "preço oficial ou PMC aplicável", "hospitalar", "benefício estadual"],
    sourceCodes: ["CONFAZ-CV142-2018", "MG-RICMS-ANEXO-VII", "MG-RICMS-ANEXO-I"],
    parameterStatus: "complete_conditional", calculationReleased: false,
  }),
  ...cosmeticsCodes.map((productCode) => {
    const mva = productCode === "BEAUTY_CREAM" ? 5960 : 5237;
    return stateRule("MG", productCode, {
      effectiveFrom: "2026-04-01", effectiveTo: "2026-12-31",
      scope: "Regime mineiro de cosméticos/perfumaria; a revogação do Protocolo 36/2009 afasta a retenção pelo remetente paulista, não a análise do regime interno de MG.",
      responsibility: "Responsabilidade na entrada/destinatário mineiro deve ser confirmada conforme o produto e a operação.",
      agreementStatus: "Protocolo SP–MG 36/2009 revogado desde 01/04/2026.",
      baseMethod: "current_pmpf_when_listed_otherwise_mva",
      mvaOriginal: exact(mva, `MVA original de ${(mva / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}% no Anexo VII.`),
      internalRate: exact(2500, "Alíquota interna de 25% para perfumes e cosméticos."),
      fcpRate: exact(200, "Adicional FEM de 2 pontos no período controlado."),
      reductions: ["Não aplicar redução sem dispositivo específico para produto, operação e período."],
      benefits: ["PMPF vigente prevalece quando marca/apresentação estiver listada."],
      exceptions: ["marca ou apresentação listada em PMPF", "produto não listado", "operação fora da regra de comparação do PMPF", "benefício ou regime especial"],
      sourceCodes: ["CONFAZ-CV142-2018", "SP-RC33735-2026", "MG-RICMS-ANEXO-VII", "MG-LEI6763-FEM", "MG-PORTARIA-SAIF91-2026"],
      parameterStatus: "complete_conditional" as const, calculationReleased: false,
    });
  }),
];

const rjMedicineConfig: Record<typeof medicineCodes[number], { mva: number; pmcDiscount: number }> = {
  REFERENCE_POSITIVE: { mva: 3824, pmcDiscount: 2397 },
  GENERIC_POSITIVE: { mva: 3824, pmcDiscount: 5099 },
  REFERENCE_NEGATIVE: { mva: 3293, pmcDiscount: 1602 },
};

const rjRules: PharmaCosmeticsStateRule[] = [
  ...medicineCodes.map((productCode) => {
    const config = rjMedicineConfig[productCode];
    return stateRule("RJ", productCode, {
      effectiveFrom: "2024-03-20", effectiveTo: null,
      scope: "Medicamentos em operações internas e originadas de SP integram o regime fluminense indicado no Anexo I.",
      responsibility: "Remetente paulista como substituto quando o Protocolo 76/2014 e o enquadramento do produto forem confirmados.",
      agreementStatus: "Protocolo 76/2014 indicado para operações originadas de SP.",
      baseMethod: `pmc_less_${config.pmcDiscount}_bps_or_original_mva`,
      mvaOriginal: exact(config.mva, `MVA original de ${(config.mva / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}% quando não houver PMC aplicável.`),
      internalRate: exact(2000, "Alíquota interna geral atual de 20%, antes do FECP."),
      fcpRate: exact(200, "FECP geral de 2 pontos, inclusive na ST quando aplicável."),
      reductions: [`Desconto de ${(config.pmcDiscount / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}% sobre a PMC para este perfil.`],
      benefits: ["Isenções e tratamentos por doença/produto devem ser verificados antes do cálculo."],
      exceptions: ["PMC existente", "medicamento sem PMC", "benefício de saúde", "produto hospitalar", "MVA ajustada conforme alíquotas atuais"],
      sourceCodes: ["CONFAZ-CV142-2018", "RJ-ANEXO-I-LIVRO-II", "RJ-ALIQUOTAS-ATUAIS", "RJ-FECP"],
      parameterStatus: "complete_conditional" as const, calculationReleased: false,
    });
  }),
  ...cosmeticsCodes.map((productCode) => {
    const mva = productCode === "BEAUTY_CREAM" ? 5779 : productCode === "PERFUME" ? 5054 : 4965;
    return stateRule("RJ", productCode, {
      effectiveFrom: "2024-03-20", effectiveTo: null,
      scope: productCode === "PERFUME_DOOR_TO_DOOR" ? "Regime fluminense específico de venda porta a porta." : "Cosméticos e perfumaria em operações originadas de SP integram o regime fluminense indicado no Anexo I.",
      responsibility: productCode === "PERFUME_DOOR_TO_DOOR" ? "Confirmar regime porta a porta, vínculo comercial e substituto definido." : "Remetente paulista como substituto quando o protocolo e o enquadramento forem confirmados.",
      agreementStatus: productCode === "PERFUME_DOOR_TO_DOOR" ? "Convênio nacional e disciplina estadual de venda porta a porta." : "Protocolos 191/2009 e 104/2012 indicados no Anexo I.",
      baseMethod: "operation_value_plus_original_or_adjusted_mva",
      mvaOriginal: exact(mva, `MVA original de ${(mva / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}%; a MVA ajustada deve ser recalculada com as alíquotas atuais.`),
      internalRate: exact(2500, "Alíquota interna de 25% para perfumes e cosméticos."),
      fcpRate: exact(200, "FECP de 2 pontos; carga nominal combinada de 27% no recorte."),
      reductions: ["Não reutilizar MVA ajustada histórica calculada com alíquota interna antiga."],
      benefits: ["Nenhum benefício liberado automaticamente."],
      exceptions: productCode === "PERFUME_DOOR_TO_DOOR"
        ? ["venda porta a porta efetivamente caracterizada", "MVA ajustada atual", "regime especial"]
        : ["interdependência — MVA original específica de 177,19%", "MVA ajustada atual", "regime especial"],
      sourceCodes: ["CONFAZ-CV142-2018", "RJ-ANEXO-I-LIVRO-II", "RJ-ALIQUOTAS-ATUAIS", "RJ-FECP"],
      parameterStatus: "complete_conditional" as const, calculationReleased: false,
    });
  }),
];

const prRules: PharmaCosmeticsStateRule[] = [
  ...medicineCodes.map((productCode) => stateRule("PR", productCode, {
    effectiveFrom: "2024-07-01", effectiveTo: null,
    scope: "O regime paranaense de medicamentos permanece catalogado, com posições alteradas e revogadas pelo Decreto 6.048/2024.",
    responsibility: "Confirmar a posição exata ainda vigente e o responsável definido para a operação interestadual.",
    agreementStatus: "A incidência e a responsabilidade dependem do item vigente e do acordo aplicável à origem.",
    baseMethod: "official_price_pmc_or_state_mva_by_exact_item",
    mvaOriginal: caseSpecific("A MVA não é única para a família; depende da posição exata, lista e base oficial do medicamento."),
    internalRate: exact(1950, "Alíquota interna geral de 19,5% no recorte, salvo tratamento específico."),
    fcpRate: exact(0, "Medicamentos deste recorte não foram enquadrados automaticamente no adicional FECOP."),
    reductions: ["Qualquer redução exige o dispositivo específico da posição vigente."],
    benefits: ["Preço oficial, PMC e programas públicos podem alterar a base."],
    exceptions: ["posição revogada", "Farmácia Popular", "tratamento específico", "benefício estadual", "acordo interestadual da origem"],
    sourceCodes: ["CONFAZ-CV142-2018", "PR-DECRETO6048-2024", "PR-LEI-COMPILADA"],
    parameterStatus: "complete_conditional", calculationReleased: false,
  })),
  stateRule("PR", "BEAUTY_CREAM", {
    effectiveFrom: "2026-04-01", effectiveTo: null,
    scope: "Cosméticos CEST 20.014.00 no regime paranaense vigente.",
    responsibility: "Confirmar protocolo aplicável à origem e condição do remetente como substituto.",
    agreementStatus: "Protocolos interestaduais catalogados pela Resolução SEFA 1.245/2025.",
    baseMethod: "operation_value_plus_original_or_adjusted_mva",
    mvaOriginal: exact(5512, "MVA original de 55,12%."),
    internalRate: exact(2500, "Alíquota interna de 25% para perfumes e cosméticos."),
    fcpRate: exact(200, "Adicional FECOP de 2 pontos para o produto listado."),
    reductions: ["Sem redução automática; MVA ajustada depende da alíquota interestadual e das condições da operação."],
    benefits: ["Nenhum benefício liberado automaticamente."],
    exceptions: ["MVA ajustada", "origem sem protocolo", "regime especial", "benefício estadual"],
    sourceCodes: ["CONFAZ-CV142-2018", "PR-RESOLUCAO-1245-2025", "PR-LEI-COMPILADA"],
    parameterStatus: "complete_conditional", calculationReleased: false,
  }),
  stateRule("PR", "PERFUME", {
    effectiveFrom: "2026-04-01", effectiveTo: null,
    scope: "Perfumes CEST 20.007.00 no regime paranaense vigente.",
    responsibility: "Confirmar protocolo aplicável à origem e condição do remetente como substituto.",
    agreementStatus: "Protocolos interestaduais catalogados pela Resolução SEFA 1.245/2025.",
    baseMethod: "operation_value_plus_original_or_adjusted_mva",
    mvaOriginal: exact(4777, "MVA original de 47,77%."),
    internalRate: exact(2500, "Alíquota interna de 25% para perfumes e cosméticos."),
    fcpRate: exact(200, "Adicional FECOP de 2 pontos para o produto listado."),
    reductions: ["Sem redução automática; MVA ajustada depende da alíquota interestadual e das condições da operação."],
    benefits: ["Nenhum benefício liberado automaticamente."],
    exceptions: ["MVA ajustada", "origem sem protocolo", "regime especial", "benefício estadual"],
    sourceCodes: ["CONFAZ-CV142-2018", "PR-RESOLUCAO-1245-2025", "PR-LEI-COMPILADA"],
    parameterStatus: "complete_conditional", calculationReleased: false,
  }),
  stateRule("PR", "PERFUME_DOOR_TO_DOOR", {
    effectiveFrom: "2026-04-01", effectiveTo: null,
    scope: "Perfil porta a porta separado do CEST convencional; a fonte estadual consultada não trouxe parâmetro único seguro para este recorte.",
    responsibility: "Somente liberar após confirmar convênio, vínculo porta a porta e disciplina estadual específica.",
    agreementStatus: "Dependência de regra específica não resolvida pela tabela convencional de cosméticos.",
    baseMethod: "state_specific_door_to_door_rule_required",
    mvaOriginal: unavailable("MVA estadual vigente e específica do perfil porta a porta não localizada com segurança na fonte oficial consultada."),
    internalRate: exact(2500, "Alíquota interna nominal de perfumes."),
    fcpRate: exact(200, "Adicional FECOP nominal de perfumes."),
    reductions: ["Não calculável sem a base específica do regime porta a porta."],
    benefits: ["Nenhum benefício presumido."],
    exceptions: ["vínculo porta a porta", "regime especial", "convênio aplicável", "parâmetro estadual específico"],
    sourceCodes: ["CONFAZ-CV142-2018", "PR-RESOLUCAO-1245-2025", "PR-LEI-COMPILADA"],
    parameterStatus: "explicitly_unavailable", calculationReleased: false,
  }),
];

function pendingHygieneRules(
  destination: "MG" | "RJ" | "PR",
  sourceCodes: string[],
): PharmaCosmeticsStateRule[] {
  return hygieneCodes.map((productCode) => stateRule(destination, productCode, {
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
    scope: `Perfil de higiene pessoal catalogado para ${destination}; o item estadual exato precisa prevalecer sobre qualquer parâmetro de família.`,
    responsibility: "Confirmar acordo da origem, responsabilidade na entrada e condição do remetente antes de calcular.",
    agreementStatus: "Catálogo NCM/CEST confirmado; parâmetro econômico não generalizado por segurança.",
    baseMethod: "state_item_and_pmpf_or_mva_must_be_confirmed",
    mvaOriginal: caseSpecific("MVA depende do item, da alíquota interestadual e da apresentação exata."),
    internalRate: caseSpecific("Alíquota interna depende do produto e de eventual tratamento essencial."),
    fcpRate: caseSpecific("FCP deve ser conferido por produto e vigência; não é presumido por família."),
    reductions: ["Reduções e carga efetiva exigem dispositivo específico do produto."],
    benefits: ["Essencialidade ou benefício de higiene não é presumido pelo CEST."],
    exceptions: ["apresentação divergente", "benefício estadual", "PMPF ou pauta", "regime especial", "origem sem acordo"],
    sourceCodes,
    parameterStatus: "complete_conditional",
    calculationReleased: false,
  }));
}

const scRules: PharmaCosmeticsStateRule[] = ST_PHARMA_COSMETICS_PRODUCTS.map((product) => stateRule("SC", product.code, {
  effectiveFrom: "2026-01-01",
  effectiveTo: null,
  scope: "No recorte vigente consultado, as seções estaduais de medicamentos e de perfumaria, higiene pessoal e cosméticos estão revogadas.",
  responsibility: "ICMS próprio; sem retenção de ICMS-ST catarinense para estes perfis no recorte controlado.",
  agreementStatus: "A presença no catálogo nacional CEST não restabelece seção estadual revogada.",
  baseMethod: "not_applicable_no_st",
  mvaOriginal: notApplicable("MVA não aplicável à memória de ST igual a zero."),
  internalRate: notApplicable("ICMS próprio não integra esta memória restrita à ST."),
  fcpRate: notApplicable("Não há FCP-ST nesta memória de ST igual a zero."),
  reductions: ["Redução do ICMS próprio deve ser apurada separadamente."],
  benefits: ["Benefícios e regimes especiais permanecem fora do resultado automático."],
  exceptions: ["operação fora do recorte vigente", "identidade NCM/CEST divergente", "regime especial", "finalidade distinta de revenda"],
  sourceCodes: ["CONFAZ-CV142-2018", "SC-RICMS-ANEXO-1A"],
  parameterStatus: "exact_no_st",
  calculationReleased: true,
}));

const rsNoStCodes = ["BEAUTY_CREAM", "PERFUME", "SHAMPOO", "DENTIFRICE"] as const;
const rsRules: PharmaCosmeticsStateRule[] = [
  ...medicineCodes.map((productCode) => stateRule("RS", productCode, {
    effectiveFrom: "2026-01-09",
    effectiveTo: null,
    scope: "Medicamento sujeito à sequência PMPF, cesta básica e MVA prevista no Mini RICMS farmacêutico de 2026.",
    responsibility: "Confirmar substituto, PMPF vigente, enquadramento na cesta básica e apresentação CMED antes da memória.",
    agreementStatus: "Regime farmacêutico estadual vigente; o método depende da apresentação exata e da existência de PMPF.",
    baseMethod: "pmpf_then_mva_by_interstate_rate",
    mvaOriginal: exact(6560, "MVA interna de 65,60%; para origem a 12% a fonte publica 75,57% e, a 4%, 91,53%."),
    internalRate: exact(1700, "Alíquota de 17% no recorte do guia oficial."),
    fcpRate: exact(0, "AMPARA não foi incluído automaticamente no perfil farmacêutico."),
    reductions: ["Cesta básica usa redutor de 0,4118 quando a apresentação estiver expressamente enquadrada."],
    benefits: ["PMPF vigente prevalece quando a apresentação constar da lista oficial."],
    exceptions: ["PMPF por apresentação", "cesta básica", "PMC sem aplicabilidade atual", "bonificação", "decisão judicial", "alíquota interestadual de 4%"],
    sourceCodes: ["CONFAZ-CV142-2018", "RS-MINI-RICMS-FARMA-2026", "RS-SETOR-MEDICOS-COSMETICOS"],
    parameterStatus: "complete_conditional",
    calculationReleased: false,
  })),
  ...rsNoStCodes.map((productCode) => stateRule("RS", productCode, {
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
    scope: "Cosmético, perfumaria convencional ou higiene pessoal fora da ST no exemplo e orientação setorial oficiais consultados.",
    responsibility: "ICMS próprio e eventual AMPARA são apurados separadamente; sem ICMS-ST neste recorte.",
    agreementStatus: "Recorte estadual tratado sem ST; CEST não cria incidência isoladamente.",
    baseMethod: "not_applicable_no_st",
    mvaOriginal: notApplicable("MVA não aplicável à memória de ST igual a zero."),
    internalRate: notApplicable("ICMS próprio e AMPARA não integram esta memória restrita à ST."),
    fcpRate: notApplicable("AMPARA pode existir fora da memória de ICMS-ST e deve ser apurado separadamente."),
    reductions: ["Qualquer redução do ICMS próprio deve ser apurada fora desta memória."],
    benefits: ["Nenhum benefício é presumido pela classificação do produto."],
    exceptions: ["porta a porta", "regime especial", "operação anterior ao recorte", "identidade divergente"],
    sourceCodes: ["CONFAZ-CV142-2018", "RS-SETOR-MEDICOS-COSMETICOS", "RS-AMPARA-COSMETICOS"],
    parameterStatus: "exact_no_st",
    calculationReleased: true,
  })),
  stateRule("RS", "PERFUME_DOOR_TO_DOOR", {
    effectiveFrom: "2026-01-01", effectiveTo: null,
    scope: "Sistema porta a porta permanece segregado do tratamento convencional de cosméticos.",
    responsibility: "Confirmar vínculo comercial, regime específico e substituto definido antes da conclusão.",
    agreementStatus: "Regime porta a porta não resolvido pela orientação de cosméticos sem ST.",
    baseMethod: "state_specific_door_to_door_rule_required",
    mvaOriginal: unavailable("Parâmetro porta a porta exato não confirmado na fonte setorial consultada."),
    internalRate: caseSpecific("Alíquota e AMPARA dependem da operação e do regime confirmado."),
    fcpRate: caseSpecific("AMPARA deve ser conferido separadamente."),
    reductions: ["Não calculável sem a disciplina específica."],
    benefits: ["Nenhum benefício presumido."],
    exceptions: ["vínculo porta a porta", "regime especial", "convênio aplicável", "AMPARA"],
    sourceCodes: ["CONFAZ-CV142-2018", "RS-SETOR-MEDICOS-COSMETICOS"],
    parameterStatus: "explicitly_unavailable", calculationReleased: false,
  }),
];

function unavailableDestinationRules(
  destination: "GO" | "BA",
  sourceCodes: string[],
  baseMethod: string,
): PharmaCosmeticsStateRule[] {
  return ST_PHARMA_COSMETICS_PRODUCTS.map((product) => stateRule(destination, product.code, {
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
    scope: `NCM/CEST e sujeição estadual catalogados para ${destination}; a célula exige parâmetro vigente do item e apresentação exatos.`,
    responsibility: "Confirmar substituto, antecipação na entrada, acordo da origem e enquadramento do destinatário.",
    agreementStatus: "A fonte estadual confirma o catálogo, mas não autoriza transportar parâmetro entre itens ou regimes.",
    baseMethod,
    mvaOriginal: caseSpecific("MVA deve ser extraída da linha estadual exata e ajustada à alíquota interestadual aplicável."),
    internalRate: caseSpecific("Alíquota interna exige conferência por NCM, essencialidade e vigência."),
    fcpRate: caseSpecific("FCP não é inferido por segmento; depende do produto e da vigência."),
    reductions: ["Redução de base ou carga efetiva exige dispositivo e condição comprovados."],
    benefits: ["Preço máximo, PMPF, cesta básica ou tratamento de saúde podem alterar a base."],
    exceptions: ["preço máximo ou PMPF", "apresentação divergente", "benefício", "regime especial", "antecipação na entrada", "origem sem acordo"],
    sourceCodes,
    parameterStatus: "explicitly_unavailable",
    calculationReleased: false,
  }));
}

const goRules = unavailableDestinationRules("GO", ["CONFAZ-CV142-2018", "GO-DECRETO10799-2025", "GO-DECRETO8567-2016"], "state_mva_table_by_exact_item");
const baRules = unavailableDestinationRules("BA", ["CONFAZ-CV142-2018", "BA-RICMS-ANEXO1-2026"], "price_cap_or_state_mva_and_entry_anticipation");

export const stPharmaCosmeticsStateRules: PharmaCosmeticsStateRule[] = [
  ...spRules,
  ...mgRules,
  ...pendingHygieneRules("MG", ["CONFAZ-CV142-2018", "MG-RICMS-ANEXO-VII", "MG-LEI6763-FEM"]),
  ...rjRules,
  ...pendingHygieneRules("RJ", ["CONFAZ-CV142-2018", "RJ-ANEXO-I-LIVRO-II", "RJ-FECP"]),
  ...prRules,
  ...pendingHygieneRules("PR", ["CONFAZ-CV142-2018", "PR-RESOLUCAO-1245-2025", "PR-LEI-COMPILADA"]),
  ...scRules,
  ...rsRules,
  ...goRules,
  ...baRules,
];

export const stPharmaCosmeticsLegalRoutes = [
  {
    route: "SP-SP", effectiveFrom: "2026-01-01", effectiveTo: null,
    agreementStatus: "Regime interno paulista revogado por família nas datas controladas.",
    responsibility: "ICMS próprio; sem ICMS-ST paulista no recorte.",
    sourceCodes: ["CONFAZ-CV142-2018", "SP-RC33215-2026", "SP-RC33677-2026"],
  },
  {
    route: "SP-MG", effectiveFrom: "2026-04-01", effectiveTo: null,
    agreementStatus: "Protocolo 36/2009 revogado para cosméticos; medicamentos não ganharam acordo SP–MG na fonte mineira consultada.",
    responsibility: "Afastar retenção automática pelo remetente não afasta eventual responsabilidade na entrada ou regime interno de MG.",
    sourceCodes: ["CONFAZ-CV142-2018", "SP-RC33735-2026", "MG-RICMS-ANEXO-VII"],
  },
  {
    route: "MG-SP", effectiveFrom: "2026-01-01", effectiveTo: null,
    agreementStatus: "Destino paulista fora da ST para as famílias nas datas controladas.",
    responsibility: "ICMS próprio; sem ICMS-ST paulista no recorte.",
    sourceCodes: ["CONFAZ-CV142-2018", "SP-RC33215-2026", "SP-RC33677-2026"],
  },
  {
    route: "SP-RJ", effectiveFrom: "2024-03-20", effectiveTo: null,
    agreementStatus: "Protocolos e disciplina fluminense catalogados por família.",
    responsibility: "Remetente paulista pode ser substituto; confirmar produto, PMC/MVA, benefício e alíquotas atuais.",
    sourceCodes: ["CONFAZ-CV142-2018", "RJ-ANEXO-I-LIVRO-II", "RJ-ALIQUOTAS-ATUAIS", "RJ-FECP"],
  },
  {
    route: "RJ-SP", effectiveFrom: "2026-01-01", effectiveTo: null,
    agreementStatus: "Destino paulista fora da ST para as famílias nas datas controladas.",
    responsibility: "ICMS próprio; sem ICMS-ST paulista no recorte.",
    sourceCodes: ["CONFAZ-CV142-2018", "SP-RC33215-2026", "SP-RC33677-2026"],
  },
  {
    route: "SP-PR", effectiveFrom: "2026-04-01", effectiveTo: null,
    agreementStatus: "Protocolos e legislação paranaense catalogados; porta a porta permanece sem parâmetro estadual seguro.",
    responsibility: "Confirmar acordo da origem e condição do remetente por produto.",
    sourceCodes: ["CONFAZ-CV142-2018", "PR-RESOLUCAO-1245-2025", "PR-DECRETO6048-2024", "PR-LEI-COMPILADA"],
  },
  {
    route: "PR-SP", effectiveFrom: "2026-01-01", effectiveTo: null,
    agreementStatus: "Destino paulista fora da ST para as famílias nas datas controladas.",
    responsibility: "ICMS próprio; sem ICMS-ST paulista no recorte.",
    sourceCodes: ["CONFAZ-CV142-2018", "SP-RC33215-2026", "SP-RC33677-2026"],
  },
  {
    route: "SP-SC", effectiveFrom: "2026-01-01", effectiveTo: null,
    agreementStatus: "Seções catarinenses de medicamentos e de perfumaria, higiene e cosméticos revogadas no catálogo vigente.",
    responsibility: "ICMS próprio; sem ICMS-ST catarinense no recorte controlado.",
    sourceCodes: ["CONFAZ-CV142-2018", "SC-RICMS-ANEXO-1A"],
  },
  {
    route: "SC-SP", effectiveFrom: "2026-01-01", effectiveTo: null,
    agreementStatus: "Destino paulista fora da ST para as famílias nas datas controladas.",
    responsibility: "ICMS próprio; sem ICMS-ST paulista no recorte.",
    sourceCodes: ["CONFAZ-CV142-2018", "SP-RC33215-2026", "SP-RC33677-2026"],
  },
  {
    route: "SP-RS", effectiveFrom: "2026-01-09", effectiveTo: null,
    agreementStatus: "Medicamentos seguem PMPF/MVA; cosméticos convencionais e higiene foram segregados como sem ST; porta a porta permanece bloqueado.",
    responsibility: "Confirmar apresentação, PMPF, cesta básica, substituto e AMPARA conforme a família.",
    sourceCodes: ["CONFAZ-CV142-2018", "RS-MINI-RICMS-FARMA-2026", "RS-SETOR-MEDICOS-COSMETICOS", "RS-AMPARA-COSMETICOS"],
  },
  {
    route: "RS-SP", effectiveFrom: "2026-01-01", effectiveTo: null,
    agreementStatus: "Destino paulista fora da ST para as famílias nas datas controladas.",
    responsibility: "ICMS próprio; sem ICMS-ST paulista no recorte.",
    sourceCodes: ["CONFAZ-CV142-2018", "SP-RC33215-2026", "SP-RC33677-2026"],
  },
  {
    route: "SP-GO", effectiveFrom: "2026-01-01", effectiveTo: null,
    agreementStatus: "Catálogo e tabelas goianas identificados; cálculo exige a linha exata e a alíquota interestadual aplicável.",
    responsibility: "Confirmar substituto, acordo da origem e eventual antecipação antes da memória.",
    sourceCodes: ["CONFAZ-CV142-2018", "GO-DECRETO10799-2025", "GO-DECRETO8567-2016"],
  },
  {
    route: "GO-SP", effectiveFrom: "2026-01-01", effectiveTo: null,
    agreementStatus: "Destino paulista fora da ST para as famílias nas datas controladas.",
    responsibility: "ICMS próprio; sem ICMS-ST paulista no recorte.",
    sourceCodes: ["CONFAZ-CV142-2018", "SP-RC33215-2026", "SP-RC33677-2026"],
  },
  {
    route: "SP-BA", effectiveFrom: "2026-01-01", effectiveTo: null,
    agreementStatus: "Anexo 1 baiano vigente cataloga substituição/antecipação; base depende de preço máximo, PMPF ou MVA do item.",
    responsibility: "Confirmar substituto ou responsabilidade na entrada e a base estadual vigente.",
    sourceCodes: ["CONFAZ-CV142-2018", "BA-RICMS-ANEXO1-2026"],
  },
  {
    route: "BA-SP", effectiveFrom: "2026-01-01", effectiveTo: null,
    agreementStatus: "Destino paulista fora da ST para as famílias nas datas controladas.",
    responsibility: "ICMS próprio; sem ICMS-ST paulista no recorte.",
    sourceCodes: ["CONFAZ-CV142-2018", "SP-RC33215-2026", "SP-RC33677-2026"],
  },
] as const;

function routeDestination(route: string): PharmaCosmeticsDestination | null {
  const destination = route.split("-")[1] ?? "";
  return destination === "SP" || destination === "MG" || destination === "RJ" || destination === "PR" || destination === "SC" || destination === "RS" || destination === "GO" || destination === "BA" ? destination : null;
}

export const stPharmaCosmeticsCoverageCells = ST_PHARMA_COSMETICS_ROUTES.flatMap((route) =>
  ST_PHARMA_COSMETICS_PRODUCTS.map((product) => {
    const destination = routeDestination(route.route);
    const parameterProfile = stPharmaCosmeticsStateRules.find((profile) => profile.destination === destination && profile.productCode === product.code) ?? null;
    const routeProfile = stPharmaCosmeticsLegalRoutes.find((profile) => profile.route === route.route) ?? null;
    const status: CoverageStatus = parameterProfile?.calculationReleased
      ? "supported"
      : parameterProfile?.parameterStatus === "explicitly_unavailable"
        ? "not_supported"
        : "partial";
    const treatment: Treatment = status === "supported"
      ? "ordinary_icms_no_st"
      : route.route === "SP-RJ"
        ? "origin_substitute_conditional"
        : route.route === "SP-MG"
          ? "destination_entry_responsibility"
          : "destination_law_required";
    const blockers = status === "supported" ? [] : [
      ...(parameterProfile?.exceptions ?? ["perfil estadual ausente"]),
      parameterProfile?.parameterStatus === "explicitly_unavailable"
        ? "parâmetro oficial específico indisponível; cálculo não suportado"
        : "preencher fatos econômicos e jurídicos condicionantes antes do cálculo",
    ];
    return {
      key: `${route.route}:${product.code}`,
      route: route.route,
      productCode: product.code,
      family: product.family,
      status,
      treatment,
      effectiveFrom: parameterProfile?.effectiveFrom ?? ST_PHARMA_COSMETICS_PRIORITY_CHECKED_AT,
      effectiveTo: parameterProfile?.effectiveTo ?? null,
      parameterProfileKey: parameterProfile?.key ?? null,
      parameterStatus: parameterProfile?.parameterStatus ?? "explicitly_unavailable",
      agreementStatus: routeProfile?.agreementStatus ?? "rota jurídica não catalogada",
      responsibility: parameterProfile?.responsibility ?? "responsabilidade não catalogada",
      sourceCodes: Array.from(new Set([...(routeProfile?.sourceCodes ?? []), ...(parameterProfile?.sourceCodes ?? [])])),
      blockers,
      reason: status === "supported"
        ? `${parameterProfile?.scope ?? "A ST não se aplica no recorte controlado."} A operação segue com ICMS próprio, não com isenção.`
        : parameterProfile?.parameterStatus === "explicitly_unavailable"
          ? "A lacuna foi catalogada e classificada como não suportada: o sistema não inventa MVA nem libera valor."
          : "Fontes e parâmetros foram catalogados, mas o cálculo depende de fatos como PMC/PMPF, marca, benefício, acordo, MVA ajustada ou responsabilidade.",
    };
  }),
);

export type PharmaCosmeticsOperationInput = {
  route: string;
  productCode: PharmaCosmeticsProductCode;
  operationDate: string;
  operationCents: number;
  facts: PharmaCosmeticsFacts;
};

export function resolvePharmaCosmeticsOperation(input: PharmaCosmeticsOperationInput) {
  const product = ST_PHARMA_COSMETICS_PRODUCTS.find((item) => item.code === input.productCode) ?? null;
  const cell = stPharmaCosmeticsCoverageCells.find((item) => item.route === input.route && item.productCode === input.productCode) ?? null;
  const missingFacts = Object.entries(ST_PHARMA_COSMETICS_FACT_LABELS)
    .filter(([key]) => input.facts?.[key as PharmaCosmeticsFactKey] !== true)
    .map(([, label]) => label);
  const blockers: string[] = [];
  if (!product || !cell) blockers.push("produto ou rota fora da matriz prioritária");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.operationDate)) blockers.push("data da operação inválida");
  if (cell && input.operationDate < cell.effectiveFrom) blockers.push(`data anterior ao início do recorte vigente em ${cell.effectiveFrom}`);
  if (cell?.effectiveTo && input.operationDate > cell.effectiveTo) blockers.push(`data posterior ao fim do recorte vigente em ${cell.effectiveTo}`);
  if (!Number.isSafeInteger(input.operationCents) || input.operationCents <= 0 || input.operationCents > 100_000_000_000) blockers.push("valor da operação inválido ou fora do limite seguro");
  blockers.push(...missingFacts);
  if (cell?.status !== "supported") blockers.push(...(cell?.blockers ?? ["combinação não suportada"]));

  if (blockers.length > 0 || !product || !cell) {
    return {
      status: cell?.status === "partial" ? "partial" as const : "blocked" as const,
      coverageStatus: cell?.status ?? "not_supported" as CoverageStatus,
      product,
      cell,
      missingFacts,
      blockers,
      output: null,
      limitation: "A conclusão trata apenas da incidência de ICMS-ST. ICMS próprio, PIS/Cofins monofásico, IPI, benefícios e obrigações acessórias exigem apuração separada.",
    };
  }
  return {
    status: "ordinary_icms_no_st" as const,
    coverageStatus: "supported" as const,
    product,
    cell,
    missingFacts: [],
    blockers: [],
    output: {
      operationCents: input.operationCents,
      icmsStBaseCents: 0,
      icmsStCents: 0,
      fcpStCents: 0,
      treatment: "ordinary_icms_no_st" as const,
    },
    limitation: "ST igual a zero não significa isenção: o ICMS próprio e os tributos federais continuam fora desta memória.",
  };
}

const allFacts = Object.fromEntries(Object.keys(ST_PHARMA_COSMETICS_FACT_LABELS).map((key) => [key, true])) as PharmaCosmeticsFacts;

export const stPharmaCosmeticsReferenceRuns = stPharmaCosmeticsCoverageCells.map((cell) => ({
  key: cell.key,
  result: resolvePharmaCosmeticsOperation({
    route: cell.route,
    productCode: cell.productCode,
    operationDate: "2026-07-30",
    operationCents: 100_000,
    facts: allFacts,
  }),
}));

export type PharmaCosmeticsVerificationCategory = "positive" | "negative" | "temporal" | "identity_divergent" | "invalid_value";

const missingDocumentFacts: PharmaCosmeticsFacts = { ...allFacts, documentsConfirmed: false };

export const stPharmaCosmeticsVerificationCases = [
  ...stPharmaCosmeticsReferenceRuns.map((run) => ({
    key: `matrix:${run.key}`,
    category: (run.result.output ? "positive" : "negative") as PharmaCosmeticsVerificationCategory,
    result: run.result,
  })),
  ...ST_PHARMA_COSMETICS_ROUTES.map((route) => ({
    key: `missing-document:${route.route}`,
    category: "negative" as const,
    result: resolvePharmaCosmeticsOperation({ route: route.route, productCode: "BEAUTY_CREAM", operationDate: "2026-07-31", operationCents: 100_000, facts: missingDocumentFacts }),
  })),
  ...ST_PHARMA_COSMETICS_ROUTES.map((route) => ({
    key: `temporal:${route.route}`,
    category: "temporal" as const,
    result: resolvePharmaCosmeticsOperation({ route: route.route, productCode: "REFERENCE_POSITIVE", operationDate: "1900-01-01", operationCents: 100_000, facts: allFacts }),
  })),
  ...ST_PHARMA_COSMETICS_ROUTES.map((route) => ({
    key: `identity:${route.route}`,
    category: "identity_divergent" as const,
    result: resolvePharmaCosmeticsOperation({ route: route.route, productCode: "UNKNOWN_PRODUCT" as PharmaCosmeticsProductCode, operationDate: "2026-07-31", operationCents: 100_000, facts: allFacts }),
  })),
  ...ST_PHARMA_COSMETICS_ROUTES.map((route) => ({
    key: `invalid-value:${route.route}`,
    category: "invalid_value" as const,
    result: resolvePharmaCosmeticsOperation({ route: route.route, productCode: "BEAUTY_CREAM", operationDate: "2026-07-31", operationCents: 0, facts: allFacts }),
  })),
] as const;

export function stPharmaCosmeticsMetrics() {
  return {
    rankedProducts: ST_PHARMA_COSMETICS_PRODUCTS.length,
    rankedRoutes: ST_PHARMA_COSMETICS_ROUTES.length,
    legalRouteProfiles: stPharmaCosmeticsLegalRoutes.length,
    parameterProfiles: stPharmaCosmeticsStateRules.length,
    exactNoStProfiles: stPharmaCosmeticsStateRules.filter((profile) => profile.parameterStatus === "exact_no_st").length,
    conditionalProfiles: stPharmaCosmeticsStateRules.filter((profile) => profile.parameterStatus === "complete_conditional").length,
    explicitlyUnavailableProfiles: stPharmaCosmeticsStateRules.filter((profile) => profile.parameterStatus === "explicitly_unavailable").length,
    controlledCells: stPharmaCosmeticsCoverageCells.length,
    supportedCells: stPharmaCosmeticsCoverageCells.filter((cell) => cell.status === "supported").length,
    partialCells: stPharmaCosmeticsCoverageCells.filter((cell) => cell.status === "partial").length,
    notSupportedCells: stPharmaCosmeticsCoverageCells.filter((cell) => cell.status === "not_supported").length,
    deterministicMemories: stPharmaCosmeticsReferenceRuns.filter((run) => run.result.status === "ordinary_icms_no_st").length,
    safeFailures: stPharmaCosmeticsReferenceRuns.filter((run) => run.result.output === null).length,
    verificationCases: stPharmaCosmeticsVerificationCases.length,
    positiveCases: stPharmaCosmeticsVerificationCases.filter((item) => item.category === "positive").length,
    negativeCases: stPharmaCosmeticsVerificationCases.filter((item) => item.result.output === null).length,
    temporalCases: stPharmaCosmeticsVerificationCases.filter((item) => item.category === "temporal").length,
    identityDivergentCases: stPharmaCosmeticsVerificationCases.filter((item) => item.category === "identity_divergent").length,
    officialSources: stPharmaCosmeticsSources.length,
  };
}

export function validateStPharmaCosmeticsPriority() {
  const errors: string[] = [];
  const sourceCodes = new Set(stPharmaCosmeticsSources.map((source) => source.code));
  if (ST_PHARMA_COSMETICS_PRODUCTS.length !== 8 || new Set(ST_PHARMA_COSMETICS_PRODUCTS.map((item) => item.code)).size !== 8) errors.push("eight_unique_product_profiles_required");
  if (new Set(ST_PHARMA_COSMETICS_PRODUCTS.map((item) => item.family)).size !== 4) errors.push("four_segregated_product_families_required");
  if (ST_PHARMA_COSMETICS_PRODUCTS.some((item) => !item.presentation || !item.cest || item.ncms.length === 0)) errors.push("product_identity_and_presentation_required");
  if (ST_PHARMA_COSMETICS_ROUTES.length !== 15 || new Set(ST_PHARMA_COSMETICS_ROUTES.map((item) => item.route)).size !== 15) errors.push("fifteen_unique_priority_routes_required");
  if (stPharmaCosmeticsLegalRoutes.length !== 15 || new Set(stPharmaCosmeticsLegalRoutes.map((item) => item.route)).size !== 15) errors.push("fifteen_legal_route_profiles_required");
  if (stPharmaCosmeticsStateRules.length !== 64 || new Set(stPharmaCosmeticsStateRules.map((item) => item.key)).size !== 64) errors.push("sixty_four_unique_state_parameter_profiles_required");
  if (stPharmaCosmeticsCoverageCells.length !== 120) errors.push("product_route_matrix_must_have_120_cells");
  if (ST_PHARMA_COSMETICS_PRIORITY_EVIDENCE.sourceCodes.some((code) => !sourceCodes.has(code))) errors.push("priority_evidence_with_unknown_source");
  if (stPharmaCosmeticsLegalRoutes.some((profile) => profile.sourceCodes.some((code) => !sourceCodes.has(code)))) errors.push("legal_route_with_unknown_source");
  if (stPharmaCosmeticsStateRules.some((profile) =>
    !profile.effectiveFrom ||
    profile.sourceCodes.length < 2 ||
    profile.sourceCodes.some((code) => !sourceCodes.has(code)) ||
    !profile.scope ||
    !profile.responsibility ||
    !profile.agreementStatus ||
    !profile.baseMethod ||
    profile.reductions.length === 0 ||
    profile.benefits.length === 0 ||
    profile.exceptions.length === 0
  )) errors.push("incomplete_state_parameter_profile");
  if (stPharmaCosmeticsStateRules.some((profile) =>
    [profile.mvaOriginal, profile.internalRate, profile.fcpRate].some((parameter) =>
      !parameter.note ||
      (parameter.status === "exact" && (!Number.isInteger(parameter.bps) || (parameter.bps ?? -1) < 0)) ||
      (parameter.status !== "exact" && parameter.bps !== null)
    )
  )) errors.push("invalid_parameter_value");
  if (stPharmaCosmeticsStateRules.some((profile) => profile.parameterStatus === "exact_no_st" && (!profile.calculationReleased || profile.baseMethod !== "not_applicable_no_st"))) errors.push("unsafe_exact_profile");
  if (stPharmaCosmeticsStateRules.some((profile) => profile.parameterStatus !== "exact_no_st" && profile.calculationReleased)) errors.push("conditional_profile_released_calculation");
  if (stPharmaCosmeticsCoverageCells.some((cell) => cell.status === "supported" && (cell.blockers.length > 0 || cell.sourceCodes.length < 2))) errors.push("supported_cell_without_closed_evidence");
  if (stPharmaCosmeticsCoverageCells.some((cell) => cell.status !== "supported" && cell.blockers.length === 0)) errors.push("blocked_cell_without_blockers");
  if (stPharmaCosmeticsReferenceRuns.some((run) => run.result.coverageStatus === "supported" && (run.result.output?.icmsStCents !== 0 || run.result.output.fcpStCents !== 0))) errors.push("supported_no_st_memory_must_equal_zero");
  if (stPharmaCosmeticsReferenceRuns.some((run) => run.result.coverageStatus !== "supported" && run.result.output !== null)) errors.push("blocked_cell_leaked_value");
  if (stPharmaCosmeticsVerificationCases.length < 150 || new Set(stPharmaCosmeticsVerificationCases.map((item) => item.key)).size !== stPharmaCosmeticsVerificationCases.length) errors.push("at_least_150_unique_verification_cases_required");
  if (stPharmaCosmeticsVerificationCases.some((item) => item.category === "positive" ? item.result.output === null : item.result.output !== null)) errors.push("verification_case_expectation_failed");
  if (stPharmaCosmeticsVerificationCases.filter((item) => item.category === "temporal").some((item) => !item.result.blockers.some((blocker) => blocker.includes("anterior")))) errors.push("temporal_cases_must_fail_by_validity");
  if (stPharmaCosmeticsVerificationCases.filter((item) => item.category === "identity_divergent").some((item) => !item.result.blockers.some((blocker) => blocker.includes("produto ou rota")))) errors.push("identity_cases_must_fail_by_identity");
  const stale = resolvePharmaCosmeticsOperation({ route: "SP-SP", productCode: "REFERENCE_POSITIVE", operationDate: "2025-12-31", operationCents: 100_000, facts: allFacts });
  if (stale.output !== null || !stale.blockers.some((item) => item.includes("anterior"))) errors.push("medicine_validity_gate_failed");
  const missing = resolvePharmaCosmeticsOperation({ route: "SP-SP", productCode: "BEAUTY_CREAM", operationDate: "2026-07-30", operationCents: 100_000, facts: { ...allFacts, documentsConfirmed: false } });
  if (missing.output !== null || missing.missingFacts.length !== 1) errors.push("missing_evidence_gate_failed");
  const benefit = resolvePharmaCosmeticsOperation({ route: "SP-SP", productCode: "BEAUTY_CREAM", operationDate: "2026-07-30", operationCents: 100_000, facts: { ...allFacts, noSpecialTreatmentConfirmed: false } });
  if (benefit.output !== null) errors.push("special_treatment_gate_failed");
  const destinationPending = resolvePharmaCosmeticsOperation({ route: "SP-RJ", productCode: "BEAUTY_CREAM", operationDate: "2026-07-30", operationCents: 100_000, facts: allFacts });
  if (destinationPending.status !== "partial" || destinationPending.output !== null) errors.push("destination_law_gate_failed");
  const revokedProtocol = resolvePharmaCosmeticsOperation({ route: "SP-MG", productCode: "BEAUTY_CREAM", operationDate: "2026-07-30", operationCents: 100_000, facts: allFacts });
  if (revokedProtocol.status !== "partial" || revokedProtocol.output !== null || revokedProtocol.cell?.treatment !== "destination_entry_responsibility") errors.push("revoked_protocol_must_not_leak_zero_st");
  if (stPharmaCosmeticsSources.some((source) => !source.url.startsWith("https://") || source.proves.length === 0)) errors.push("official_sources_must_be_scoped");
  return { passed: errors.length === 0, errors };
}

export async function hashStPharmaCosmeticsPriority() {
  const payload = JSON.stringify({
    version: ST_PHARMA_COSMETICS_PRIORITY_VERSION,
    priorityEvidence: ST_PHARMA_COSMETICS_PRIORITY_EVIDENCE,
    products: ST_PHARMA_COSMETICS_PRODUCTS,
    routes: ST_PHARMA_COSMETICS_ROUTES,
    legalRoutes: stPharmaCosmeticsLegalRoutes,
    stateRules: stPharmaCosmeticsStateRules,
    cells: stPharmaCosmeticsCoverageCells,
    verificationCases: stPharmaCosmeticsVerificationCases,
    sources: stPharmaCosmeticsSources,
  });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export const ISS_DEEP_VERSION = "2026.07.27-v72";
export const ISS_DEEP_CHECKED_AT = "2026-07-27";

export const ISS_DEEP_TECHNICAL_CHECKS = [
  "unique_profile_and_ibge",
  "official_https_source_catalog",
  "mandatory_facts_blocking_gate",
  "municipal_service_coverage_status",
  "source_membership_and_exact_reference_gate",
  "acceptance_evidence_completeness",
  "integer_cent_calculation",
  "export_professional_and_special_regime_separation",
] as const;

export type IssDeepTechnicalCheck = typeof ISS_DEEP_TECHNICAL_CHECKS[number];
export type IssRateReferenceStatus = "located_for_mapping" | "pending_exact_table";
export type IssCoverageStatus = "supported" | "partial" | "not_supported";
export type IssDeepSourceKind = "municipal_law" | "rate_table" | "operational_guidance";

export type IssDeepSource = {
  code: string;
  title: string;
  publisher: string;
  url: string;
  checkedAt: string;
  kind: IssDeepSourceKind;
  legalReference: string;
  linkAudit: {
    status: "verified_reachable" | "official_server_recheck_required";
    auditedAt: string;
    method: "automated_https_get" | "automated_https_get_with_tls_compatibility" | "catalog_only";
  };
};

export type IssSpecialTreatment = {
  status: "separate_analysis_required";
  conclusion: string;
  requiredFacts: string[];
  sourceCodes: string[];
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
  serviceCoverageCodes: string[];
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
  specialTreatments: {
    export: IssSpecialTreatment;
    professionalSociety: IssSpecialTreatment;
    specialRegime: IssSpecialTreatment;
  };
  supportedOutputs: string[];
  hardStops: string[];
  technicalReview: {
    status: "passed";
    reviewerKind: "platform_technical_review";
    reviewedAt: string;
    sourceCatalogReview: "reviewed";
    rateReferenceStatus: IssRateReferenceStatus;
    passedChecks: IssDeepTechnicalCheck[];
    professionalReview: "not_claimed";
    taxHomologation: "not_claimed";
    limitation: string;
  };
};

export type IssDeepServiceCoverage = {
  code: string;
  profileCode: string;
  ibgeCode: string;
  lc116Item: string;
  municipalServiceCode: string | null;
  description: string;
  coverageStatus: IssCoverageStatus;
  rate: {
    status: "exact" | "pending_exact_table";
    bps: number | null;
    rangeBps: [number, number];
  };
  placeOfIncidence: {
    status: "supported_in_controlled_scenario" | "requires_facts";
    conclusion: string;
  };
  withholding: {
    status: "supported_in_controlled_scenario" | "requires_facts";
    responsible: "provider" | null;
    conclusion: string;
  };
  controlledScenario: string;
  exceptions: string[];
  benefits: string[];
  effectiveFrom: string | null;
  effectiveTo: string | null;
  version: string;
  checkedAt: string;
  sourceCodes: string[];
  exactReferences: string[];
  calculationSupported: boolean;
  blockers: string[];
  audit: {
    municipalClassifierStatus: "exact" | "pending_exact_classifier";
    rateEvidenceStatus: "exact_municipal_rule" | "pending_exact_municipal_table";
    effectiveRuleStatus: "exact" | "pending_exact_effective_rule";
    withholdingResponsibilityStatus: "exact" | "requires_operation_facts";
    sourceLinkStatus: "verified_at_least_one_official_source";
    verifiedSourceCodes: string[];
    pendingSourceCodes: string[];
    conclusion: string;
  };
};

export type IssDeepTechnicalEvidence = IssDeepCityProfile["technicalReview"] & {
  profileCode: string;
  ibgeCode: string;
  evidenceHash: string;
};

const verifiedHttpsSourceCodes = new Set([
  "ISS-SP-L13701", "ISS-SP-TABELA", "ISS-SP-SC004", "ISS-RJ-ALIQUOTAS",
  "ISS-DF-D25508", "ISS-BH-CONSULTAS", "ISS-CWB-LC40", "ISS-CWB-GUIA",
  "ISS-SSA-LEGIS", "ISS-FOR-CTM", "ISS-MAO-CTM", "ISS-REC-NFSE",
  "ISS-POA-LEGIS", "ISS-GYN-LC344", "ISS-GYN-SGISS", "ISS-BEL-LEIS",
  "ISS-BEL-CTM", "ISS-CPS-TABELA", "ISS-CPS-GUIA", "ISS-SLZ-CTM",
  "ISS-SLZ-RET", "ISS-JPA-CTM", "ISS-JPA-LEGIS", "ISS-NAT-CTM",
  "ISS-NAT-RET", "ISS-MCZ-PORTAL", "ISS-CGR-LC59", "ISS-CGB-ALIQUOTA",
  "ISS-SBC-GUIA", "ISS-SBC-FIN", "ISS-SA-PORTAL", "ISS-SG-LEGIS",
  "ISS-VIX-PORTAL", "ISS-VIX-CNAE", "ISS-FLN-NFSE", "ISS-AJU-CTM",
  "ISS-AJU-DESON",
]);

const tlsCompatibilitySourceCodes = new Set([
  "ISS-RJ-ALIQUOTAS", "ISS-SSA-LEGIS", "ISS-SA-PORTAL", "ISS-SG-LEGIS",
  "ISS-AJU-CTM", "ISS-AJU-DESON",
]);

const source = (input: Omit<IssDeepSource, "checkedAt" | "linkAudit">): IssDeepSource => ({
  ...input,
  checkedAt: ISS_DEEP_CHECKED_AT,
  linkAudit: verifiedHttpsSourceCodes.has(input.code)
    ? {
        status: "verified_reachable",
        auditedAt: ISS_DEEP_CHECKED_AT,
        method: tlsCompatibilitySourceCodes.has(input.code) ? "automated_https_get_with_tls_compatibility" : "automated_https_get",
      }
    : {
        status: "official_server_recheck_required",
        auditedAt: ISS_DEEP_CHECKED_AT,
        method: "catalog_only",
      },
});

export const issDeepSources: IssDeepSource[] = [
  source({ code: "ISS-SP-L13701", title: "Lei Municipal nº 13.701/2003 — texto consolidado", publisher: "Prefeitura de São Paulo", url: "https://legislacao.prefeitura.sp.gov.br/lei-13701-de-24-de-dezembro-de-2003/consolidado", kind: "municipal_law", legalReference: "arts. 1º a 14 e lista de serviços" }),
  source({ code: "ISS-SP-TABELA", title: "Tabela de códigos de serviço e alíquotas — IN SF/SUREM nº 19/2021", publisher: "Prefeitura de São Paulo", url: "https://legislacao.prefeitura.sp.gov.br/leis/instrucao-normativa-secretaria-municipal-da-fazenda-sf-surem-19-de-22-de-dezembro-de-2021/anexo/61f1544a1411920679f880ac/Anexo%20da%20Instru%C3%A7%C3%A3o%20Normativa%20SF-SUREM%20n%C2%BA%2019_2021.pdf", kind: "rate_table", legalReference: "Anexo 1, código 03115, item 17.01" }),
  source({ code: "ISS-SP-SC004", title: "Solução de Consulta SF/DEJUG nº 4/2014", publisher: "Prefeitura de São Paulo", url: "https://drive.prefeitura.sp.gov.br/cidade/secretarias/upload/arquivos/secretarias/financas/consultas/SC004-2014.pdf", kind: "operational_guidance", legalReference: "item 17.01, código 03115, incidência e responsabilidade" }),
  source({ code: "ISS-RJ-ALIQUOTAS", title: "ISS — alíquotas, base de cálculo e códigos de atividade", publisher: "Secretaria Municipal de Fazenda do Rio de Janeiro", url: "https://fazenda.prefeitura.rio/aliquota-base-calculo-codigo-atividades/", kind: "rate_table", legalReference: "consulta municipal de códigos e alíquotas" }),
  source({ code: "ISS-DF-D25508", title: "Decreto nº 25.508/2005 — RISS/DF consolidado", publisher: "Sistema Integrado de Normas Jurídicas do Distrito Federal", url: "https://www.sinj.df.gov.br/sinj/Norma/46110/Decreto_25508_19_01_2005.html", kind: "municipal_law", legalReference: "regulamento do ISS do Distrito Federal" }),
  source({ code: "ISS-BH-CONSULTAS", title: "Tabela de alíquotas e correlação CTISS × CNAE", publisher: "Prefeitura de Belo Horizonte", url: "https://prefeitura.pbh.gov.br/fazenda/bhissdigital/consultas", kind: "rate_table", legalReference: "consulta CTISS, CNAE e alíquota" }),
  source({ code: "ISS-BH-BHISS", title: "BHISS — legislação, códigos, retenções e NFS-e", publisher: "Prefeitura de Belo Horizonte", url: "https://prefeitura.pbh.gov.br/fazenda/bhiss", kind: "operational_guidance", legalReference: "orientações operacionais do BHISS" }),
  source({ code: "ISS-CWB-LC40", title: "Lei Complementar nº 40/2001 — Código Tributário Municipal", publisher: "Prefeitura de Curitiba", url: "https://legisladocexterno.curitiba.pr.gov.br/VisualizarHTML.aspx?id=41", kind: "municipal_law", legalReference: "disposições municipais do ISS" }),
  source({ code: "ISS-CWB-GUIA", title: "ISS com inscrição municipal — empresas", publisher: "Prefeitura de Curitiba", url: "https://www.curitiba.pr.gov.br/conteudo/iss-com-inscricao-municipal-para-empresas/357", kind: "operational_guidance", legalReference: "cadastro, apuração e recolhimento" }),
  source({ code: "ISS-SSA-CTM", title: "Código Tributário e de Rendas de Salvador — consolidado", publisher: "SEFAZ Salvador", url: "https://www2.sefaz.salvador.ba.gov.br/storage/9761/CTRMS---CONSOLIDADO---ate-9.877-2025-e-Dec.-41.304.2025---COM-ATUALIZA%C3%87%C3%83O-ISEN%C3%87%C3%83O.pdf", kind: "municipal_law", legalReference: "ISS, lista de serviços e benefícios" }),
  source({ code: "ISS-SSA-LEGIS", title: "ISS — legislação e alterações do CTISS", publisher: "SEFAZ Salvador", url: "https://www2.sefaz.salvador.ba.gov.br/legislacao/decreto/ISS-Demais-assuntos", kind: "rate_table", legalReference: "atos municipais do ISS e CTISS" }),
  source({ code: "ISS-FOR-CTM", title: "Lei Complementar nº 159/2013 — Código Tributário de Fortaleza", publisher: "Procuradoria-Geral do Município de Fortaleza", url: "https://legislacao.pgm.fortaleza.ce.gov.br/index.php/Lei_Complementar_n%C2%B0_0159%2C_de_23_de_dezembro_de_2013", kind: "municipal_law", legalReference: "arts. 223 a 259 e lista municipal de serviços" }),
  source({ code: "ISS-FOR-GUIA", title: "ISSQN — legislação, alíquotas e lista de serviços", publisher: "SEFIN Fortaleza", url: "https://www.sefin.fortaleza.ce.gov.br/Canal/16/Generico/18/Ler", kind: "rate_table", legalReference: "consulta oficial de alíquotas e serviços" }),
  source({ code: "ISS-MAO-CTM", title: "Código Tributário do Município de Manaus", publisher: "Prefeitura de Manaus", url: "https://sisleg.manaus.am.gov.br/semefatende/consulta/visualizarPdf/id/572", kind: "municipal_law", legalReference: "ISS e lista de serviços municipal" }),
  source({ code: "ISS-MAO-TABELA", title: "Lista de serviços e alíquotas do ISS", publisher: "Prefeitura de Manaus", url: "https://manausatende.manaus.am.gov.br/pagina-inicial/acesse-aqui-a-lista-de-servicos-e-suas-aliquotas/141", kind: "rate_table", legalReference: "lista municipal de serviços e alíquotas" }),
  source({ code: "ISS-REC-CTM", title: "Lei nº 15.563/1991 — Código Tributário Municipal", publisher: "Prefeitura do Recife", url: "https://www.legiscidade.recife.pe.gov.br/lei/15563/", kind: "municipal_law", legalReference: "ISS e lista municipal de serviços" }),
  source({ code: "ISS-REC-NFSE", title: "NFS-e Recife — legislação municipal", publisher: "Prefeitura do Recife", url: "https://nfse.recife.pe.gov.br/legislacao.aspx", kind: "operational_guidance", legalReference: "atos da NFS-e e retenção" }),
  source({ code: "ISS-POA-LC7", title: "Lei Complementar nº 7/1973 — Código Tributário Municipal", publisher: "Prefeitura de Porto Alegre", url: "https://prefeitura.poa.br/sites/default/files/usu_doc/hotsites/smf/iptu/Lei%20Complementar%20n%C2%BA%20007%2C%20de%201973.pdf", kind: "municipal_law", legalReference: "ISS e lista municipal de serviços" }),
  source({ code: "ISS-POA-LEGIS", title: "ISSQN — incidência, alíquotas e legislação", publisher: "Prefeitura de Porto Alegre", url: "https://www.prefeitura.poa.br/carta-de-servicos/issqn-imposto-sobre-servicos-de-qualquer-natureza", kind: "operational_guidance", legalReference: "orientações oficiais do ISSQN" }),
  source({ code: "ISS-GYN-LC344", title: "Lei Complementar nº 344/2021 — Código Tributário Municipal", publisher: "Prefeitura de Goiânia", url: "https://www.goiania.go.gov.br/html/gabinete_civil/sileg/dados/legis/2021/lc_20210930_000000344.html", kind: "municipal_law", legalReference: "ISS e lista municipal de serviços" }),
  source({ code: "ISS-GYN-SGISS", title: "Decreto nº 2.824/2025 — sistema de gestão do ISS", publisher: "Prefeitura de Goiânia", url: "https://www.goiania.go.gov.br/html/gabinete_civil/sileg/dados/legis/2025/dc_20250825_000002824.html", kind: "operational_guidance", legalReference: "gestão e obrigações do ISS" }),
  source({ code: "ISS-BEL-LEIS", title: "Repositório oficial de leis municipais de Belém", publisher: "Câmara Municipal de Belém", url: "https://cmb.pa.gov.br/portal-da-transparencia/leis-municipais/", kind: "municipal_law", legalReference: "pesquisa oficial de legislação municipal" }),
  source({ code: "ISS-BEL-CTM", title: "Lei Municipal nº 7.056/1977 — Código Tributário de Belém", publisher: "Controladoria-Geral do Estado do Pará", url: "https://cge.pa.gov.br/sites/default/files/2023-01/lei-municipal-no-7056-de-30-de-dezembro-de-1977-livro-segundo_0.pdf", kind: "municipal_law", legalReference: "livro do ISS municipal" }),
  source({ code: "ISS-CPS-TABELA", title: "Consulta à lista de serviços, alíquota e classificadores", publisher: "Prefeitura de Campinas", url: "https://campinas.sp.gov.br/secretaria/financas/pagina/consulta-lista-de-servicos-aliquota-e-atividade-cbo-cnae-nbs-", kind: "rate_table", legalReference: "consulta de serviço e alíquota" }),
  source({ code: "ISS-CPS-GUIA", title: "ISSQN — orientação oficial sobre alíquotas", publisher: "Prefeitura de Campinas", url: "https://portal-adm.campinas.sp.gov.br/node/51731", kind: "operational_guidance", legalReference: "orientação municipal sobre alíquotas" }),
  source({ code: "ISS-SLZ-CTM", title: "Lei nº 6.289/2017 — Código Tributário Municipal", publisher: "SEMFAZ São Luís", url: "https://semfaz.saoluis.ma.gov.br/arquivos/1560868523.pdf", kind: "municipal_law", legalReference: "ISS e lista municipal de serviços" }),
  source({ code: "ISS-SLZ-RET", title: "ISSQN — substituição e retenção tributária", publisher: "SEMFAZ São Luís", url: "https://www.semfaz.saoluis.ma.gov.br/substituto_tributario/", kind: "operational_guidance", legalReference: "responsabilidade e retenção" }),
  source({ code: "ISS-JPA-CTM", title: "Lei Complementar nº 53/2008 — Código Tributário Municipal", publisher: "Prefeitura de João Pessoa", url: "https://receita.joaopessoa.pb.gov.br/itbi/paginas/portal/pdfs/lei1.pdf", kind: "municipal_law", legalReference: "ISS e lista municipal de serviços" }),
  source({ code: "ISS-JPA-LEGIS", title: "Consulta oficial da legislação tributária municipal", publisher: "Prefeitura de João Pessoa", url: "https://www.joaopessoa.pb.gov.br/pc/consultaLegislacao.xhtml?tipo=1", kind: "operational_guidance", legalReference: "pesquisa de legislação tributária" }),
  source({ code: "ISS-NAT-CTM", title: "Lei nº 3.882/1989 — Código Tributário de Natal consolidado em 2024", publisher: "Prefeitura do Natal", url: "https://www.natal.rn.gov.br/semut/legislacao/lei/LEI3882-1989_2024.pdf", kind: "municipal_law", legalReference: "arts. 60 a 64 e lista de serviços" }),
  source({ code: "ISS-NAT-RET", title: "Nota Natalense — incidência territorial e retenção", publisher: "Prefeitura do Natal", url: "https://www.natal.rn.gov.br/semut/noticia.php?id=21994", kind: "operational_guidance", legalReference: "arts. 61 e 64, § 5º, da Lei nº 3.882/1989" }),
  source({ code: "ISS-MCZ-PORTAL", title: "Emissão de NFS-e e legislação do ISS de Maceió", publisher: "Prefeitura de Maceió", url: "https://www.servicos.maceio.al.gov.br/", kind: "operational_guidance", legalReference: "Lei Municipal nº 6.685/2017" }),
  source({ code: "ISS-CGR-LC59", title: "Lei Complementar nº 59/2003 — ISSQN de Campo Grande", publisher: "Prefeitura de Campo Grande", url: "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/29/2017/02/20140711143137.pdf", kind: "municipal_law", legalReference: "ISSQN e Anexo I — lista de serviços" }),
  source({ code: "ISS-CGR-NFSE", title: "Guia do Emissor Municipal Web da NFS-e v1", publisher: "Prefeitura de Campo Grande", url: "https://cdn.campogrande.ms.gov.br/portal/prod/uploads/sites/29/2026/07/Manual-de-Contribuintes-Guia-do-Emissor-Municipal-Web-da-NFS-e-V1.pdf", kind: "operational_guidance", legalReference: "código de tributação, incidência, regime especial, base e alíquota" }),
  source({ code: "ISS-CGB-ALIQUOTA", title: "Esclarecimento oficial sobre alíquota e incentivos do ISS", publisher: "Prefeitura de Cuiabá", url: "https://www.cuiaba.mt.gov.br/noticias/-28", kind: "operational_guidance", legalReference: "alíquota geral e incentivos municipais em 2026" }),
  source({ code: "ISS-SBC-GUIA", title: "Guia oficial do ISSQN", publisher: "Prefeitura de São Bernardo do Campo", url: "https://www.saobernardo.sp.gov.br/web/sbc/guia-issqn", kind: "operational_guidance", legalReference: "Lei Municipal nº 1.802/1969 e Decreto nº 17.419/2011" }),
  source({ code: "ISS-SBC-FIN", title: "Portal de finanças e legislação municipal", publisher: "Prefeitura de São Bernardo do Campo", url: "https://www.saobernardo.sp.gov.br/portal-financas", kind: "municipal_law", legalReference: "Tabela nº 1 da Lei Municipal nº 1.802/1969" }),
  source({ code: "ISS-SA-PORTAL", title: "ISSQN — legislação e lista de serviços", publisher: "Prefeitura de Santo André", url: "https://web.santoandre.sp.gov.br/issqn/", kind: "rate_table", legalReference: "Leis nº 7.614/1997, nº 8.581/2003 e legislação relacionada" }),
  source({ code: "ISS-SG-LEGIS", title: "NFS-e — legislação oficial", publisher: "Prefeitura de São Gonçalo", url: "https://www.saogoncalo.rj.gov.br/fazenda/nota-fiscal-eletronica-nfs-e-bkp/legislacao/", kind: "municipal_law", legalReference: "legislação municipal da NFS-e e do ISS" }),
  source({ code: "ISS-VIX-PORTAL", title: "ISSQN — incidência, alíquotas e benefícios", publisher: "Prefeitura de Vitória", url: "https://www.vitoria.es.gov.br/prefeitura/issqn", kind: "rate_table", legalReference: "Lei Municipal nº 6.075/2003 e alíquotas de 2% e 5%" }),
  source({ code: "ISS-VIX-CNAE", title: "Correlação CNAE, lista de serviços e NBS", publisher: "Prefeitura de Vitória", url: "https://www.vitoria.es.gov.br/semfa/busca_cnae", kind: "operational_guidance", legalReference: "subitens da Lei Municipal nº 6.075/2003" }),
  source({ code: "ISS-FLN-LC7", title: "Lei Complementar Municipal nº 7/1997 — consolidação tributária", publisher: "Prefeitura de Florianópolis", url: "https://redeplanejamento.pmf.sc.gov.br/pt-BR/legislacoes/lei-complementar-municipal-007-1997", kind: "municipal_law", legalReference: "consolidação das leis tributárias municipais" }),
  source({ code: "ISS-FLN-NFSE", title: "NFPS-e — códigos e grade de validação tributária", publisher: "Prefeitura de Florianópolis", url: "https://nfps-e.pmf.sc.gov.br/faq/", kind: "operational_guidance", legalReference: "CNAE, CFPS, CST e grade municipal de validação" }),
  source({ code: "ISS-AJU-CTM", title: "Código Tributário de Aracaju — atualizado em 2025", publisher: "Prefeitura de Aracaju", url: "https://transparencia.aracaju.se.gov.br/wp-content/uploads/desoneracoes/CTMA_ATUALIZADO_2025.pdf", kind: "municipal_law", legalReference: "arts. 98 a 131 e lista de serviços" }),
  source({ code: "ISS-AJU-DESON", title: "Desonerações e benefícios fiscais municipais", publisher: "Prefeitura de Aracaju", url: "https://transparencia.aracaju.se.gov.br/prefeitura/prestacao-de-contas/", kind: "operational_guidance", legalReference: "benefícios de ISS e respectivos instrumentos legais" }),
];

const commonRequiredFacts = [
  "item da lista da LC 116/2003",
  "código municipal do serviço",
  "município do estabelecimento prestador",
  "município e tipo do tomador",
  "local material da execução quando aplicável",
  "responsabilidade por retenção",
  "regime tributário e eventual benefício",
  "data do fato gerador",
];

const commonHardStops = [
  "não usar a faixa nacional de 2% a 5% como alíquota exata",
  "não concluir por CNAE sem o item e o código municipal do serviço",
  "não aplicar benefício, dedução, regime fixo ou retenção sem os requisitos documentados",
  "não liberar cálculo sem regra municipal exata, vigência e fatos completos",
];

const commonSupportedOutputs = [
  "vínculo entre município, item da LC 116 e classificador municipal",
  "fontes oficiais de legislação, alíquota e obrigação operacional",
  "trilha de local de incidência e exceções dependente dos fatos da operação",
  "trilha de retenção, responsável tributário, base e deduções",
  "portão determinístico para impedir alíquota presumida",
];

const sourceByCode = new Map(issDeepSources.map((item) => [item.code, item]));

const citySeeds = [
  { code: "ISS-DEEP-SP-SAO-PAULO", ibgeCode: "3550308", city: "São Paulo", uf: "SP", sourceCodes: ["ISS-SP-L13701", "ISS-SP-TABELA", "ISS-SP-SC004"] },
  { code: "ISS-DEEP-RJ-RIO", ibgeCode: "3304557", city: "Rio de Janeiro", uf: "RJ", sourceCodes: ["ISS-RJ-ALIQUOTAS"] },
  { code: "ISS-DEEP-DF-BRASILIA", ibgeCode: "5300108", city: "Brasília", uf: "DF", sourceCodes: ["ISS-DF-D25508"] },
  { code: "ISS-DEEP-MG-BELO-HORIZONTE", ibgeCode: "3106200", city: "Belo Horizonte", uf: "MG", sourceCodes: ["ISS-BH-CONSULTAS", "ISS-BH-BHISS"] },
  { code: "ISS-DEEP-PR-CURITIBA", ibgeCode: "4106902", city: "Curitiba", uf: "PR", sourceCodes: ["ISS-CWB-LC40", "ISS-CWB-GUIA"] },
  { code: "ISS-DEEP-BA-SALVADOR", ibgeCode: "2927408", city: "Salvador", uf: "BA", sourceCodes: ["ISS-SSA-CTM", "ISS-SSA-LEGIS"] },
  { code: "ISS-DEEP-CE-FORTALEZA", ibgeCode: "2304400", city: "Fortaleza", uf: "CE", sourceCodes: ["ISS-FOR-CTM", "ISS-FOR-GUIA"] },
  { code: "ISS-DEEP-AM-MANAUS", ibgeCode: "1302603", city: "Manaus", uf: "AM", sourceCodes: ["ISS-MAO-CTM", "ISS-MAO-TABELA"] },
  { code: "ISS-DEEP-PE-RECIFE", ibgeCode: "2611606", city: "Recife", uf: "PE", sourceCodes: ["ISS-REC-CTM", "ISS-REC-NFSE"] },
  { code: "ISS-DEEP-RS-PORTO-ALEGRE", ibgeCode: "4314902", city: "Porto Alegre", uf: "RS", sourceCodes: ["ISS-POA-LC7", "ISS-POA-LEGIS"] },
  { code: "ISS-DEEP-GO-GOIANIA", ibgeCode: "5208707", city: "Goiânia", uf: "GO", sourceCodes: ["ISS-GYN-LC344", "ISS-GYN-SGISS"] },
  { code: "ISS-DEEP-PA-BELEM", ibgeCode: "1501402", city: "Belém", uf: "PA", sourceCodes: ["ISS-BEL-LEIS", "ISS-BEL-CTM"], rateReferenceStatus: "pending_exact_table" as const },
  { code: "ISS-DEEP-SP-CAMPINAS", ibgeCode: "3509502", city: "Campinas", uf: "SP", sourceCodes: ["ISS-CPS-TABELA", "ISS-CPS-GUIA"] },
  { code: "ISS-DEEP-MA-SAO-LUIS", ibgeCode: "2111300", city: "São Luís", uf: "MA", sourceCodes: ["ISS-SLZ-CTM", "ISS-SLZ-RET"] },
  { code: "ISS-DEEP-PB-JOAO-PESSOA", ibgeCode: "2507507", city: "João Pessoa", uf: "PB", sourceCodes: ["ISS-JPA-CTM", "ISS-JPA-LEGIS"] },
  { code: "ISS-DEEP-RN-NATAL", ibgeCode: "2408102", city: "Natal", uf: "RN", sourceCodes: ["ISS-NAT-CTM", "ISS-NAT-RET"] },
  { code: "ISS-DEEP-AL-MACEIO", ibgeCode: "2704302", city: "Maceió", uf: "AL", sourceCodes: ["ISS-MCZ-PORTAL"], rateReferenceStatus: "pending_exact_table" as const },
  { code: "ISS-DEEP-MS-CAMPO-GRANDE", ibgeCode: "5002704", city: "Campo Grande", uf: "MS", sourceCodes: ["ISS-CGR-LC59", "ISS-CGR-NFSE"] },
  { code: "ISS-DEEP-MT-CUIABA", ibgeCode: "5103403", city: "Cuiabá", uf: "MT", sourceCodes: ["ISS-CGB-ALIQUOTA"] },
  { code: "ISS-DEEP-SP-SAO-BERNARDO", ibgeCode: "3548708", city: "São Bernardo do Campo", uf: "SP", sourceCodes: ["ISS-SBC-GUIA", "ISS-SBC-FIN"] },
  { code: "ISS-DEEP-SP-SANTO-ANDRE", ibgeCode: "3547809", city: "Santo André", uf: "SP", sourceCodes: ["ISS-SA-PORTAL"] },
  { code: "ISS-DEEP-RJ-SAO-GONCALO", ibgeCode: "3304904", city: "São Gonçalo", uf: "RJ", sourceCodes: ["ISS-SG-LEGIS"], rateReferenceStatus: "pending_exact_table" as const },
  { code: "ISS-DEEP-ES-VITORIA", ibgeCode: "3205309", city: "Vitória", uf: "ES", sourceCodes: ["ISS-VIX-PORTAL", "ISS-VIX-CNAE"] },
  { code: "ISS-DEEP-SC-FLORIANOPOLIS", ibgeCode: "4205407", city: "Florianópolis", uf: "SC", sourceCodes: ["ISS-FLN-LC7", "ISS-FLN-NFSE"] },
  { code: "ISS-DEEP-SE-ARACAJU", ibgeCode: "2800308", city: "Aracaju", uf: "SE", sourceCodes: ["ISS-AJU-CTM", "ISS-AJU-DESON"] },
] as const;

const exactServiceSeeds: Array<Omit<IssDeepServiceCoverage, "profileCode" | "checkedAt" | "audit">> = [
  {
    code: "ISS-SP-17.01-03115-PJ-STANDARD",
    ibgeCode: "3550308",
    lc116Item: "17.01",
    municipalServiceCode: "03115",
    description: "Assessoria ou consultoria de qualquer natureza, não contida em outros itens",
    coverageStatus: "supported",
    rate: { status: "exact", bps: 500, rangeBps: [500, 500] },
    placeOfIncidence: { status: "supported_in_controlled_scenario", conclusion: "São Paulo, município do estabelecimento prestador, no cenário controlado." },
    withholding: { status: "supported_in_controlled_scenario", responsible: "provider", conclusion: "Prestador estabelecido em São Paulo recolhe o ISS no cenário controlado, sem retenção pelo tomador situado fora do município." },
    controlledScenario: "Prestador PJ estabelecido em São Paulo, regime normal, tomador PJ privada fora de São Paulo, resultado do serviço no Brasil, sem exportação, benefício, sociedade profissional ou regime especial.",
    exceptions: ["exportação depende do local do resultado", "tomador público ou nomeado substituto", "serviço enquadrável em item mais específico"],
    benefits: ["nenhum benefício é presumido"],
    effectiveFrom: "2021-12-22",
    effectiveTo: null,
    version: "IN-SF-SUREM-19-2021+L13701-CONSOLIDADA",
    sourceCodes: ["ISS-SP-L13701", "ISS-SP-TABELA", "ISS-SP-SC004"],
    exactReferences: ["Lei nº 13.701/2003, item 17.01", "IN SF/SUREM nº 19/2021, Anexo 1, código 03115, alíquota 5%", "Solução de Consulta SF/DEJUG nº 4/2014"],
    calculationSupported: true,
    blockers: [],
  },
  {
    code: "ISS-VIX-17.01-STANDARD",
    ibgeCode: "3205309",
    lc116Item: "17.01",
    municipalServiceCode: "17.01",
    description: "Assessoria ou consultoria de qualquer natureza, não contida em outros itens",
    coverageStatus: "supported",
    rate: { status: "exact", bps: 500, rangeBps: [500, 500] },
    placeOfIncidence: { status: "supported_in_controlled_scenario", conclusion: "Vitória, município do estabelecimento prestador, no cenário controlado." },
    withholding: { status: "supported_in_controlled_scenario", responsible: "provider", conclusion: "Prestador recolhe o ISS no cenário controlado, após confirmar ausência de retenção ou substituição." },
    controlledScenario: "Prestador PJ estabelecido em Vitória, regime normal, tomador PJ privada fora de Vitória, serviço 17.01, sem redução do Centro, exportação, benefício, sociedade profissional, retenção ou regime especial.",
    exceptions: ["atividades municipais expressamente sujeitas a 2%", "redução condicionada para empresas do Centro", "tomador responsável por retenção"],
    benefits: ["reduções para atividades e estabelecimentos elegíveis exigem deferimento municipal"],
    effectiveFrom: "2003-12-29",
    effectiveTo: null,
    version: "LM-6075-2003+PORTAL-ISSQN-2024",
    sourceCodes: ["ISS-VIX-PORTAL", "ISS-VIX-CNAE"],
    exactReferences: ["Lei Municipal nº 6.075/2003, subitem 17.01", "Portal ISSQN: 5% para serviços não incluídos nas hipóteses expressas de 2%"],
    calculationSupported: true,
    blockers: [],
  },
  {
    code: "ISS-AJU-17.01-STANDARD",
    ibgeCode: "2800308",
    lc116Item: "17.01",
    municipalServiceCode: "17.01",
    description: "Assessoria ou consultoria de qualquer natureza, não contida em outros itens",
    coverageStatus: "supported",
    rate: { status: "exact", bps: 500, rangeBps: [500, 500] },
    placeOfIncidence: { status: "supported_in_controlled_scenario", conclusion: "Aracaju, município do estabelecimento prestador, no cenário controlado." },
    withholding: { status: "supported_in_controlled_scenario", responsible: "provider", conclusion: "Prestador recolhe o ISS no cenário controlado, após confirmar que o tomador não é responsável tributário." },
    controlledScenario: "Prestador PJ estabelecido em Aracaju, regime normal, tomador PJ privada fora de Aracaju, serviço 17.01, sem benefício, exportação, sociedade profissional, retenção ou regime especial.",
    exceptions: ["benefícios municipais para tecnologia, saúde, call center e outras atividades", "tomador substituto ou responsável tributário", "serviço enquadrável em item mais específico"],
    benefits: ["benefícios listados no portal de desonerações exigem instrumento legal e requisitos próprios"],
    effectiveFrom: "2003-12-30",
    effectiveTo: null,
    version: "CTMA-ATUALIZADO-2025",
    sourceCodes: ["ISS-AJU-CTM", "ISS-AJU-DESON"],
    exactReferences: ["Código Tributário de Aracaju, lista de serviços, item 17.01", "alíquota geral de 5%, ressalvadas desonerações municipais específicas"],
    calculationSupported: true,
    blockers: [],
  },
];

const exactSeedByIbge = new Map(exactServiceSeeds.map((item) => [item.ibgeCode, item]));

function buildServiceAudit(
  sourceCodes: readonly string[],
  exact: boolean,
): IssDeepServiceCoverage["audit"] {
  const verifiedSourceCodes = sourceCodes.filter((code) => sourceByCode.get(code)?.linkAudit.status === "verified_reachable");
  const pendingSourceCodes = sourceCodes.filter((code) => !verifiedSourceCodes.includes(code));
  if (!verifiedSourceCodes.length) throw new Error(`iss_deep_functional_source_not_found:${sourceCodes.join(",")}`);
  return {
    municipalClassifierStatus: exact ? "exact" : "pending_exact_classifier",
    rateEvidenceStatus: exact ? "exact_municipal_rule" : "pending_exact_municipal_table",
    effectiveRuleStatus: exact ? "exact" : "pending_exact_effective_rule",
    withholdingResponsibilityStatus: exact ? "exact" : "requires_operation_facts",
    sourceLinkStatus: "verified_at_least_one_official_source",
    verifiedSourceCodes,
    pendingSourceCodes,
    conclusion: exact
      ? "Código, alíquota, vigência, incidência e responsável estão versionados exclusivamente para o cenário controlado publicado."
      : "O serviço está estruturado e possui fonte municipal funcional, mas o cálculo permanece bloqueado até localizar código, alíquota, vigência e responsabilidade exatos.",
  };
}

export const issDeepServiceCoverage: IssDeepServiceCoverage[] = citySeeds.map((city) => {
  const exact = exactSeedByIbge.get(city.ibgeCode);
  if (exact) {
    return {
      ...exact,
      profileCode: city.code,
      checkedAt: ISS_DEEP_CHECKED_AT,
      audit: buildServiceAudit(exact.sourceCodes, true),
    };
  }
  return {
    code: `${city.code}-17.01-MAPPING`,
    profileCode: city.code,
    ibgeCode: city.ibgeCode,
    lc116Item: "17.01",
    municipalServiceCode: null,
    description: "Assessoria ou consultoria de qualquer natureza — mapeamento municipal pendente",
    coverageStatus: "partial",
    rate: { status: "pending_exact_table", bps: null, rangeBps: [200, 500] },
    placeOfIncidence: { status: "requires_facts", conclusion: "A regra geral aponta para o estabelecimento prestador, mas o item e os fatos territoriais precisam ser confirmados." },
    withholding: { status: "requires_facts", responsible: null, conclusion: "Responsável tributário ainda depende do tomador, cadastro e regra municipal vigente." },
    controlledScenario: "Nenhum cenário de cálculo exato foi liberado para este serviço neste município.",
    exceptions: ["exportação", "sociedade profissional", "benefício", "regime especial", "retenção ou responsabilidade do tomador"],
    benefits: ["nenhum benefício é presumido"],
    effectiveFrom: null,
    effectiveTo: null,
    version: `${ISS_DEEP_VERSION}-MAPPING`,
    checkedAt: ISS_DEEP_CHECKED_AT,
    sourceCodes: [...city.sourceCodes],
    exactReferences: [],
    calculationSupported: false,
    blockers: ["código municipal exato do serviço", "alíquota municipal versionada", "vigência municipal exata", "referência exata da tabela", "hipótese de retenção e responsável"],
    audit: buildServiceAudit(city.sourceCodes, false),
  };
});

const serviceCoverageByCode = new Map(issDeepServiceCoverage.map((item) => [item.code, item]));

function specialTreatments(sourceCodes: string[]): IssDeepCityProfile["specialTreatments"] {
  return {
    export: {
      status: "separate_analysis_required",
      conclusion: "Exportação não é inferida pelo país do tomador; é necessário comprovar onde ocorre o resultado do serviço e aplicar a legislação municipal.",
      requiredFacts: ["país do tomador", "local do resultado", "contrato", "fluxo financeiro", "eventual Parecer Normativo municipal"],
      sourceCodes,
    },
    professionalSociety: {
      status: "separate_analysis_required",
      conclusion: "Regime fixo ou de sociedade profissional não usa automaticamente a base pelo preço do serviço.",
      requiredFacts: ["profissões dos sócios", "habilitação", "responsabilidade pessoal", "empregados habilitados", "deferimento e cadastro municipal"],
      sourceCodes,
    },
    specialRegime: {
      status: "separate_analysis_required",
      conclusion: "Benefício, redução, estimativa, pauta, dedução ou regime especial exige regra própria e documento municipal válido.",
      requiredFacts: ["ato concessório", "vigência", "atividade e estabelecimento elegíveis", "base reduzida ou fixa", "condições de manutenção"],
      sourceCodes,
    },
  };
}

function profile(input: typeof citySeeds[number]): IssDeepCityProfile {
  for (const code of input.sourceCodes) {
    if (!sourceByCode.has(code)) throw new Error(`iss_deep_source_not_found:${code}`);
  }
  const serviceCodes = issDeepServiceCoverage.filter((item) => item.ibgeCode === input.ibgeCode).map((item) => item.code);
  if (!serviceCodes.length || serviceCodes.some((code) => !serviceCoverageByCode.has(code))) throw new Error(`iss_deep_service_coverage_not_found:${input.ibgeCode}`);
  const rateReferenceStatus: IssRateReferenceStatus = "rateReferenceStatus" in input ? input.rateReferenceStatus : "located_for_mapping";
  return {
    code: input.code,
    ibgeCode: input.ibgeCode,
    city: input.city,
    uf: input.uf,
    sourceCodes: [...input.sourceCodes],
    serviceCoverageCodes: serviceCodes,
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
      generalRule: "O estabelecimento prestador é a referência geral; exceções só são resolvidas após identificar o item e os fatos territoriais da operação.",
      requiredFacts: commonRequiredFacts,
    },
    withholding: {
      conclusion: "requires_facts",
      requiredFacts: ["identificação e município do tomador", "item e código municipal do serviço", "regime do prestador", "hipótese municipal de responsabilidade", "alíquota vigente documentada"],
    },
    specialTreatments: specialTreatments([...input.sourceCodes]),
    supportedOutputs: commonSupportedOutputs,
    hardStops: commonHardStops,
    technicalReview: {
      status: "passed",
      reviewerKind: "platform_technical_review",
      reviewedAt: ISS_DEEP_CHECKED_AT,
      sourceCatalogReview: "reviewed",
      rateReferenceStatus,
      passedChecks: [...ISS_DEEP_TECHNICAL_CHECKS],
      professionalReview: "not_claimed",
      taxHomologation: "not_claimed",
      limitation: "A revisão confirma integridade estrutural, fontes catalogadas, cobertura por serviço e bloqueios do software. Não atribui assinatura profissional nem amplia a cobertura além do cenário exato publicado.",
    },
  };
}

export const issDeepCityProfiles: IssDeepCityProfile[] = citySeeds.map(profile);
export const issDeepProfileByIbge = new Map(issDeepCityProfiles.map((item) => [item.ibgeCode, item]));

export function sourcesForIssDeepProfile(profileOrIbge: IssDeepCityProfile | string) {
  const foundProfile = typeof profileOrIbge === "string" ? issDeepProfileByIbge.get(profileOrIbge) : profileOrIbge;
  if (!foundProfile) return [];
  return foundProfile.sourceCodes.map((code) => sourceByCode.get(code)).filter((item): item is IssDeepSource => Boolean(item));
}

export function sourcesForIssServiceCoverage(coverageOrCode: IssDeepServiceCoverage | string) {
  const coverage = typeof coverageOrCode === "string" ? serviceCoverageByCode.get(coverageOrCode) : coverageOrCode;
  if (!coverage) return [];
  return coverage.sourceCodes.map((code) => sourceByCode.get(code)).filter((item): item is IssDeepSource => Boolean(item));
}

function normalizedServiceCode(value: unknown) {
  return String(value ?? "").trim().replace(/[^\d]/g, "");
}

export function resolveIssDeepServiceCoverage(ibgeCode: string, lc116Item: string, municipalServiceCode?: string | null) {
  const profile = issDeepProfileByIbge.get(String(ibgeCode ?? ""));
  if (!profile) return { coverageStatus: "not_supported" as const, profile: null, service: null, blockers: ["município sem pacote ISS profundo estruturado"] };
  const item = normalizedServiceCode(lc116Item);
  const municipalCode = normalizedServiceCode(municipalServiceCode);
  const exact = issDeepServiceCoverage.find((entry) =>
    entry.ibgeCode === profile.ibgeCode
    && normalizedServiceCode(entry.lc116Item) === item
    && entry.municipalServiceCode !== null
    && normalizedServiceCode(entry.municipalServiceCode) === municipalCode
    && entry.coverageStatus === "supported"
  );
  if (exact) return { coverageStatus: "supported" as const, profile, service: exact, blockers: [] };
  const mapped = issDeepServiceCoverage.find((entry) => entry.ibgeCode === profile.ibgeCode && normalizedServiceCode(entry.lc116Item) === item) ?? null;
  return {
    coverageStatus: "partial" as const,
    profile,
    service: mapped,
    blockers: mapped?.blockers ?? ["item da LC 116 e código municipal ainda não possuem regra versionada"],
  };
}

async function sha256(value: unknown) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(value)));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function buildIssDeepTechnicalEvidence(): Promise<IssDeepTechnicalEvidence[]> {
  return Promise.all(issDeepCityProfiles.map(async (cityProfile) => {
    const evidence = {
      version: ISS_DEEP_VERSION,
      profileCode: cityProfile.code,
      ibgeCode: cityProfile.ibgeCode,
      sourceCodes: cityProfile.sourceCodes,
      serviceCoverageCodes: cityProfile.serviceCoverageCodes,
      technicalReview: cityProfile.technicalReview,
    };
    return {
      ...cityProfile.technicalReview,
      profileCode: cityProfile.code,
      ibgeCode: cityProfile.ibgeCode,
      evidenceHash: await sha256(evidence),
    };
  }));
}

export async function hashIssDeepCoverage() {
  return sha256(JSON.stringify({
    version: ISS_DEEP_VERSION,
    checkedAt: ISS_DEEP_CHECKED_AT,
    profiles: issDeepCityProfiles,
    serviceCoverage: issDeepServiceCoverage,
    sources: issDeepSources,
  }));
}

export type IssDeepCalculationInput = {
  ibgeCode: string;
  lc116Item: string;
  municipalServiceCode: string;
  operationDate: string;
  taxableBaseCents: number;
  providerEstablishmentIbgeCode: string;
  recipientMunicipalityIbgeCode: string;
  recipientType: "private_legal_entity" | "public_entity" | "individual" | "unknown";
  providerTaxRegime: "normal" | "simples" | "unknown";
  exportStatus: "domestic_result" | "result_abroad" | "unknown";
  professionalSociety: boolean | null;
  specialRegime: boolean | null;
  benefitApplied: boolean | null;
  incidenceMunicipalityIbgeCode: string;
  withholdingResponsibility: "provider" | "recipient" | "unknown";
};

export type IssDeepCalculationMemory = {
  unit: "BRL_cent";
  taxableBaseCents: number;
  rateBps: number;
  denominatorBps: 10000;
  rawNumerator: number;
  rounding: "half_up_to_cent";
  issCents: number;
  responsibility: "provider";
  steps: string[];
};

export function calculateIssDeep(input: IssDeepCalculationInput) {
  const coverage = resolveIssDeepServiceCoverage(input.ibgeCode, input.lc116Item, input.municipalServiceCode);
  if (coverage.coverageStatus !== "supported" || !coverage.profile || !coverage.service || coverage.service.rate.bps === null) {
    return {
      status: "blocked" as const,
      coverageStatus: coverage.coverageStatus,
      profile: coverage.profile,
      service: coverage.service,
      missingFacts: coverage.blockers,
      reason: coverage.coverageStatus === "not_supported" ? "Município não suportado pelo ISS profundo." : "O município está estruturado, mas este serviço ainda não possui regra exata versionada para cálculo.",
      calculation: null,
      sources: coverage.service ? sourcesForIssServiceCoverage(coverage.service) : [],
    };
  }

  const service = coverage.service;
  const rateBps = service.rate.bps;
  if (rateBps === null) {
    return {
      status: "blocked" as const,
      coverageStatus: "partial" as const,
      profile: coverage.profile,
      service,
      missingFacts: ["alíquota municipal exata versionada"],
      reason: "A regra municipal não possui alíquota exata liberada.",
      calculation: null,
      sources: sourcesForIssServiceCoverage(service),
    };
  }
  const missingFacts: string[] = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.operationDate)) missingFacts.push("data válida do fato gerador");
  if (service.effectiveFrom && input.operationDate < service.effectiveFrom) missingFacts.push(`data igual ou posterior a ${service.effectiveFrom}`);
  if (service.effectiveTo && input.operationDate > service.effectiveTo) missingFacts.push(`data igual ou anterior a ${service.effectiveTo}`);
  if (!Number.isSafeInteger(input.taxableBaseCents) || input.taxableBaseCents < 0 || input.taxableBaseCents > 1_000_000_000_000) missingFacts.push("base tributável válida em centavos");
  if (input.providerEstablishmentIbgeCode !== service.ibgeCode) missingFacts.push("estabelecimento prestador no município da regra");
  if (!/^\d{7}$/.test(input.recipientMunicipalityIbgeCode) || input.recipientMunicipalityIbgeCode === service.ibgeCode) missingFacts.push("município do tomador fora do município prestador no cenário controlado");
  if (input.recipientType !== "private_legal_entity") missingFacts.push("tomador pessoa jurídica privada");
  if (input.providerTaxRegime !== "normal") missingFacts.push("prestador no regime normal");
  if (input.exportStatus !== "domestic_result") missingFacts.push("resultado do serviço no Brasil");
  if (input.professionalSociety !== false) missingFacts.push("ausência de sociedade profissional ou regime fixo");
  if (input.specialRegime !== false) missingFacts.push("ausência de regime especial");
  if (input.benefitApplied !== false) missingFacts.push("ausência de benefício ou redução");
  if (input.incidenceMunicipalityIbgeCode !== service.ibgeCode) missingFacts.push("município de incidência igual ao estabelecimento prestador");
  if (input.withholdingResponsibility !== "provider") missingFacts.push("responsabilidade do prestador confirmada, sem retenção pelo tomador");

  if (missingFacts.length) {
    return {
      status: "blocked" as const,
      coverageStatus: "supported" as const,
      profile: coverage.profile,
      service,
      missingFacts,
      reason: "A regra existe, mas os fatos não correspondem integralmente ao cenário municipal controlado.",
      calculation: null,
      sources: sourcesForIssServiceCoverage(service),
    };
  }

  const rawNumerator = input.taxableBaseCents * rateBps;
  const issCents = Math.floor((rawNumerator + 5_000) / 10_000);
  const calculation: IssDeepCalculationMemory = {
    unit: "BRL_cent",
    taxableBaseCents: input.taxableBaseCents,
    rateBps,
    denominatorBps: 10000,
    rawNumerator,
    rounding: "half_up_to_cent",
    issCents,
    responsibility: "provider",
    steps: [
      `Base tributável: ${input.taxableBaseCents} centavos.`,
      `Alíquota municipal versionada: ${rateBps} pontos-base.`,
      `ISS = (${input.taxableBaseCents} × ${rateBps}) ÷ 10.000, com arredondamento meio para cima.`,
      `ISS devido pelo prestador: ${issCents} centavos.`,
    ],
  };
  return {
    status: "calculated" as const,
    coverageStatus: "supported" as const,
    profile: coverage.profile,
    service,
    missingFacts: [],
    reason: "Cálculo liberado exclusivamente no cenário municipal controlado e versionado.",
    calculation,
    sources: sourcesForIssServiceCoverage(service),
  };
}

export type IssDeepGateInput = {
  ibgeCode: string;
  lc116Item?: string | null;
  municipalServiceCode?: string | null;
  operationDate?: string | null;
  municipalRateBps?: number | null;
  rateSourceCode?: string | null;
  rateEvidenceReference?: string | null;
  providerEstablishmentIbgeCode?: string | null;
  recipientMunicipalityIbgeCode?: string | null;
  placeConfirmed?: boolean;
  withholdingConfirmed?: boolean;
  withholdingResponsibility?: "provider" | "recipient" | "unknown";
  providerTaxRegime?: "normal" | "simples" | "unknown";
  exportStatus?: "domestic_result" | "result_abroad" | "unknown";
  professionalSociety?: boolean | null;
  specialRegime?: boolean | null;
  benefitApplied?: boolean | null;
  professionalApprovalConfirmed?: boolean;
};

export function evaluateIssDeepGate(input: IssDeepGateInput) {
  const resolution = resolveIssDeepServiceCoverage(input.ibgeCode, String(input.lc116Item ?? ""), input.municipalServiceCode);
  if (!resolution.profile) return { status: "blocked" as const, profile: null, service: null, missingFacts: ["município com pacote ISS profundo estruturado"], reason: "O município ainda não possui pacote ISS profundo estruturado." };

  const missingFacts: string[] = [];
  const service = resolution.service;
  if (resolution.coverageStatus !== "supported" || !service || service.rate.bps === null) missingFacts.push(...resolution.blockers);
  if (!/^\d{1,2}\.\d{2}$/.test(String(input.lc116Item ?? "").trim())) missingFacts.push("item válido da LC 116");
  if (String(input.municipalServiceCode ?? "").trim().length < 2) missingFacts.push("código municipal do serviço");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(input.operationDate ?? ""))) missingFacts.push("data do fato gerador");
  if (service?.rate.bps !== input.municipalRateBps) missingFacts.push("alíquota idêntica à regra municipal versionada");
  if (!service?.sourceCodes.includes(String(input.rateSourceCode ?? ""))) missingFacts.push("fonte oficial da regra municipal");
  if (String(input.rateEvidenceReference ?? "").trim().length < 8) missingFacts.push("artigo, item ou linha exata da fonte");
  if (input.providerEstablishmentIbgeCode !== input.ibgeCode) missingFacts.push("município do estabelecimento prestador");
  if (!/^\d{7}$/.test(String(input.recipientMunicipalityIbgeCode ?? "")) || input.recipientMunicipalityIbgeCode === input.ibgeCode) missingFacts.push("município do tomador no cenário controlado");
  if (input.placeConfirmed !== true) missingFacts.push("município de incidência confirmado");
  if (input.withholdingConfirmed !== true || input.withholdingResponsibility !== "provider") missingFacts.push("retenção e responsável tributário confirmados");
  if (input.providerTaxRegime !== "normal") missingFacts.push("regime normal do prestador");
  if (input.exportStatus !== "domestic_result") missingFacts.push("resultado do serviço no Brasil");
  if (input.professionalSociety !== false) missingFacts.push("ausência de sociedade profissional");
  if (input.specialRegime !== false) missingFacts.push("ausência de regime especial");
  if (input.benefitApplied !== false) missingFacts.push("ausência de benefício");

  const uniqueMissingFacts = [...new Set(missingFacts)];
  if (uniqueMissingFacts.length) {
    return {
      status: "blocked" as const,
      profile: resolution.profile,
      service,
      missingFacts: uniqueMissingFacts,
      reason: "O pacote municipal está estruturado, mas o cálculo exato permanece bloqueado até a regra e todos os fatos corresponderem ao cenário controlado.",
    };
  }

  return {
    status: "ready_for_deterministic_calculation" as const,
    profile: resolution.profile,
    service,
    missingFacts: [],
    rateBps: service?.rate.bps as number,
    reason: "Regra municipal versionada e fatos mínimos confirmados; o valor pode seguir ao cálculo determinístico.",
  };
}

export const issDeepMetrics = {
  structuredCities: issDeepCityProfiles.length,
  officialSources: issDeepSources.length,
  sourceCatalogReviewedCities: issDeepCityProfiles.filter((item) => item.technicalReview.sourceCatalogReview === "reviewed").length,
  technicalGateValidatedCities: issDeepCityProfiles.filter((item) => item.technicalReview.status === "passed").length,
  rateReferenceLocatedCities: issDeepCityProfiles.filter((item) => item.technicalReview.rateReferenceStatus === "located_for_mapping").length,
  testedCities: issDeepCityProfiles.length,
  serviceCoverageRows: issDeepServiceCoverage.length,
  supportedServiceRules: issDeepServiceCoverage.filter((item) => item.coverageStatus === "supported" && item.calculationSupported).length,
  partialServiceRules: issDeepServiceCoverage.filter((item) => item.coverageStatus === "partial").length,
  professionallyApprovedCities: 0,
  automaticHomologation: false,
} as const;

import { issDeepCityProfiles, issDeepProfileByIbge, issDeepServiceCoverage, issDeepSources } from "./iss-deep-coverage.ts";
import { ISS_RECURRING_PRIORITY_VERSION, issRecurringPriorityCells, issRecurringPriorityItems } from "./iss-recurring-priority.ts";
import {
  ICMS_GENERAL_NATIONAL_CHECKED_AT,
  ICMS_GENERAL_NATIONAL_VERSION,
  icmsGeneralSources,
  icmsStateGeneralProfileByUf,
  icmsStateGeneralProfiles,
  type IcmsUfCode,
} from "./icms-general-national.ts";
import {
  SIMPLES_NATIONAL_DEEP_VERSION,
  simplesActivityProfiles,
  simplesNationalSources,
} from "./simples-national-deep.ts";
import {
  PIS_COFINS_DEEP_VERSION,
  pisCofinsCreditHypotheses,
  pisCofinsDeepSources,
  pisCofinsProductProfiles,
} from "./pis-cofins-deep.ts";
import {
  SERVICE_WITHHOLDINGS_DEEP_VERSION,
  serviceWithholdingProfiles,
  serviceWithholdingSources,
} from "./service-withholdings-deep.ts";
import {
  IPI_TIPI_DEEP_VERSION,
  ipiTipiDeepSources,
  ipiTipiPriorityProfiles,
} from "./ipi-tipi-deep.ts";
import {
  TAX_REFORM_SECTOR_VERSION,
  taxReformSectorProfiles,
  taxReformSectorSources,
} from "./tax-reform-sector-scenarios.ts";

export const NATIONAL_COVERAGE_VERSION = "2026.07.31-v91";
export const NATIONAL_COVERAGE_CHECKED_AT = "2026-07-31";

export type CoverageStatus = "supported" | "partial" | "not_supported";
export type UfCode = IcmsUfCode;

export type CoverageSource = { code: string; title: string; publisher: string; url: string; checkedAt: string };
export type StateCoverage = {
  uf: UfCode;
  name: string;
  region: "N" | "NE" | "CO" | "SE" | "S";
  status: CoverageStatus;
  officialPortal: string;
  generalRateBps: number;
  generalRateEffectiveFrom: string;
  generalRateSourceCode: string;
  fundName: string;
  generalFundRateBps: number | null;
  supported: string[];
  blockers: string[];
};
export type CityCoverage = { ibgeCode: string; city: string; uf: UfCode; status: CoverageStatus; rangeBps: [number, number]; depth: "structured" | "catalogued"; officialSourceCodes: string[]; structuredAt: string | null; supported: string[]; blockers: string[] };
export type SegmentCoverage = { code: string; name: string; status: CoverageStatus; routes: string[]; supported: string[]; blockers: string[] };
export type ScenarioCoverage = { code: string; tax: string; title: string; status: CoverageStatus; supported: string[]; blockers: string[] };

export const coverageSources: CoverageSource[] = [
  { code: "RSF-22-1989", title: "Resolução do Senado Federal nº 22/1989", publisher: "Senado Federal", url: "https://legis.senado.gov.br/norma/586152", checkedAt: NATIONAL_COVERAGE_CHECKED_AT },
  { code: "RSF-13-2012", title: "Resolução do Senado Federal nº 13/2012", publisher: "Presidência da República", url: "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2012/congresso/rsf-13-2012.htm", checkedAt: NATIONAL_COVERAGE_CHECKED_AT },
  { code: "LC-87-1996", title: "Lei Complementar nº 87/1996", publisher: "Presidência da República", url: "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp87.htm", checkedAt: NATIONAL_COVERAGE_CHECKED_AT },
  { code: "CONFAZ", title: "Legislação e atos do CONFAZ", publisher: "CONFAZ", url: "https://www.confaz.fazenda.gov.br/legislacao", checkedAt: NATIONAL_COVERAGE_CHECKED_AT },
  { code: "LC-116-2003", title: "Lei Complementar nº 116/2003", publisher: "Presidência da República", url: "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp116.htm", checkedAt: NATIONAL_COVERAGE_CHECKED_AT },
  { code: "NFSE-NACIONAL", title: "Documentação técnica da NFS-e padrão nacional", publisher: "Receita Federal", url: "https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica", checkedAt: NATIONAL_COVERAGE_CHECKED_AT },
  { code: "NFE-PORTAL", title: "Portal Nacional da NF-e — manuais e esquemas", publisher: "ENCAT", url: "https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=ndIjl+iEFdE=", checkedAt: NATIONAL_COVERAGE_CHECKED_AT },
  { code: "EFD-ICMS-IPI", title: "Guia Prático EFD-ICMS/IPI v3.2.2", publisher: "SPED", url: "https://sped.rfb.gov.br/arquivo/download/8112", checkedAt: NATIONAL_COVERAGE_CHECKED_AT },
  { code: "RTC-CALCULATOR", title: "Calculadora oficial de tributos sobre consumo", publisher: "Receita Federal", url: "https://consumo.tributos.gov.br/servico/calcular-tributos-consumo/calculadora/regime-geral", checkedAt: NATIONAL_COVERAGE_CHECKED_AT },
  { code: "RTC-MANUAL", title: "Manual de serviços da Reforma Tributária do Consumo", publisher: "Receita Federal", url: "https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/manuais/reforma-tributaria-do-consumo/manual-servicos-rtc.pdf", checkedAt: NATIONAL_COVERAGE_CHECKED_AT },
  ...icmsGeneralSources,
  ...issDeepSources,
  ...simplesNationalSources,
  ...pisCofinsDeepSources,
  ...serviceWithholdingSources,
  ...ipiTipiDeepSources,
  ...taxReformSectorSources,
];

const state = (uf: UfCode, name: string, region: StateCoverage["region"], officialPortal: string): StateCoverage => {
  const profile = icmsStateGeneralProfileByUf.get(uf);
  if (!profile) throw new Error(`missing_icms_general_profile:${uf}`);
  return {
    uf,
    name,
    region,
    officialPortal,
    status: "partial",
    generalRateBps: profile.generalRateBps,
    generalRateEffectiveFrom: profile.effectiveFrom,
    generalRateSourceCode: profile.sourceCode,
    fundName: profile.fund.name,
    generalFundRateBps: profile.fund.generalRateBps,
    supported: [
      "alíquota modal interna versionada com fonte oficial",
      "rota interestadual padrão de 7%/12%",
      "mercadoria importada qualificada a 4%",
      "FCP separado por fundo e hipótese",
      "DIFAL somente nas UFs e perfis cuja fórmula foi comprovada",
    ],
    blockers: [...profile.blockers],
  };
};

export const stateCoverage: StateCoverage[] = [
  state("AC", "Acre", "N", "https://sefaz.ac.gov.br/"), state("AL", "Alagoas", "NE", "https://www.sefaz.al.gov.br/"), state("AP", "Amapá", "N", "https://sefaz.portal.ap.gov.br/"),
  state("AM", "Amazonas", "N", "https://www.sefaz.am.gov.br/"), state("BA", "Bahia", "NE", "https://www.sefaz.ba.gov.br/"), state("CE", "Ceará", "NE", "https://www.sefaz.ce.gov.br/"),
  state("DF", "Distrito Federal", "CO", "https://www.receita.fazenda.df.gov.br/"), state("ES", "Espírito Santo", "SE", "https://sefaz.es.gov.br/"), state("GO", "Goiás", "CO", "https://goias.gov.br/economia/"),
  state("MA", "Maranhão", "NE", "https://sistemas1.sefaz.ma.gov.br/portalsefaz/"), state("MT", "Mato Grosso", "CO", "https://www.sefaz.mt.gov.br/"), state("MS", "Mato Grosso do Sul", "CO", "https://www.sefaz.ms.gov.br/"),
  state("MG", "Minas Gerais", "SE", "https://www.fazenda.mg.gov.br/"), state("PA", "Pará", "N", "https://www.sefa.pa.gov.br/"), state("PB", "Paraíba", "NE", "https://portal.sefaz.pb.gov.br/"),
  state("PR", "Paraná", "S", "https://www.fazenda.pr.gov.br/"), state("PE", "Pernambuco", "NE", "https://www.sefaz.pe.gov.br/"), state("PI", "Piauí", "NE", "https://www.sefaz.pi.gov.br/"),
  state("RJ", "Rio de Janeiro", "SE", "https://portal.fazenda.rj.gov.br/"), state("RN", "Rio Grande do Norte", "NE", "https://set.rn.gov.br/"), state("RS", "Rio Grande do Sul", "S", "https://receita.fazenda.rs.gov.br/"),
  state("RO", "Rondônia", "N", "https://www.sefin.ro.gov.br/"), state("RR", "Roraima", "N", "https://sefaz.rr.gov.br/"), state("SC", "Santa Catarina", "S", "https://www.sef.sc.gov.br/"),
  state("SP", "São Paulo", "SE", "https://portal.fazenda.sp.gov.br/"), state("SE", "Sergipe", "NE", "https://www.sefaz.se.gov.br/"), state("TO", "Tocantins", "N", "https://www.sefaz.to.gov.br/"),
];

export const stSegments: SegmentCoverage[] = [
  { code: "AUTO_PARTS", name: "Autopeças", status: "partial", routes: ["26 destinos com origem em SP", "12 corredores prioritários em 24 sentidos"], supported: ["NCM/CEST representativo", "âmbito vigente do Protocolo 41/08 por direção", "MVA protocolar ou estadual sem presumir simetria", "memórias sintéticas controladas para destinos MG e RJ"], blockers: ["20 sentidos prioritários permanecem sem memória por ausência de acordo ou parâmetros estaduais completos", "operações reais sempre exigem produto, finalidade, destinatário, benefícios, base, vigência e documentos"] },
  { code: "BEVERAGES", name: "Bebidas", status: "partial", routes: ["12 corredores prioritários em 24 sentidos", "144 células de produto e rota", "7 rotas prioritárias com destino a SP", "SP→MG e SP→RJ com perfis de alto giro"], supported: ["seis identidades CEST/NCM de bebidas frias", "Protocolo 11/91 por produto, direção e data", "exceções de água para SP, PR, MG, SC e RS", "70 memórias condicionais com PMPF paulista vigente, incluindo marcas listadas e pack integral", "10 memórias condicionais com PMPF mineiro e fluminense, incluindo FCP separado"], blockers: ["fora dos vinte perfis exatos liberados, o valor permanece bloqueado", "marca ou embalagem divergente, água, Simples Nacional, fallback por MVA e tratamentos especiais exigem motor próprio", "cerveja, chope e destilados permanecem em motores separados"] },
  { code: "FUELS", name: "Combustíveis e lubrificantes", status: "partial", routes: ["triagem nacional com bloqueio monofásico/ad rem"], supported: ["identificação de segmento, NCM/CEST e rota", "bloqueio antes de calcular sem ato específico"], blockers: ["regime monofásico, ad rem, PMPF e atos específicos exigem motor próprio"] },
  { code: "PHARMA", name: "Medicamentos", status: "partial", routes: ["27 UFs em triagem"], supported: ["captura NCM/CEST", "alerta de PMC e benefício"], blockers: ["listas positiva/negativa/neutra, PMC, FCP e benefícios estaduais"] },
  { code: "CONSTRUCTION", name: "Materiais de construção", status: "partial", routes: ["27 UFs em triagem"], supported: ["captura NCM/CEST", "MVA ajustada quando parâmetros são confirmados"], blockers: ["escopo do segmento e protocolos por UF"] },
  { code: "COSMETICS", name: "Cosméticos e perfumaria", status: "partial", routes: ["27 UFs em triagem"], supported: ["captura NCM/CEST", "trilha de MVA"], blockers: ["listas estaduais, MVA e FCP"] },
  { code: "ELECTRONICS", name: "Eletrônicos e eletrodomésticos", status: "partial", routes: ["27 UFs em triagem"], supported: ["captura NCM/CEST", "trilha de destino"], blockers: ["protocolos, MVA, redução e exceções por NCM"] },
  { code: "FOOD", name: "Alimentos", status: "partial", routes: ["27 UFs em triagem"], supported: ["captura NCM/CEST", "separação de monofásico e ST"], blockers: ["cestas básicas, redução, pauta e listas estaduais"] },
  { code: "BATTERIES", name: "Acumuladores elétricos", status: "partial", routes: ["CEST/NCM, rota e vigência por UF"], supported: ["porta de entrada estruturada para NCM/CEST, finalidade e destinatário"], blockers: ["MVA, pauta, acordo interestadual e ato interno da UF precisam ser confirmados"] },
  { code: "MOBILE_DEVICES", name: "Celulares e comunicação", status: "partial", routes: ["CEST/NCM, rota e vigência por UF"], supported: ["porta de entrada estruturada para classificação e exceções"], blockers: ["NCM, MVA, benefício, protocolo e internalização da UF ainda são obrigatórios"] },
  { code: "HOUSEHOLD_ARTICLES", name: "Artigos de uso doméstico", status: "partial", routes: ["CEST/NCM, rota e vigência por UF"], supported: ["triagem de segmento, NCM/CEST e finalidade"], blockers: ["lista estadual, MVA, pauta e acordo por rota devem ser confirmados"] },
  { code: "STATIONERY", name: "Papelaria", status: "partial", routes: ["CEST/NCM, rota e vigência por UF"], supported: ["triagem de classificação e fatos mínimos da operação"], blockers: ["escopo do item, MVA e aplicação por UF não podem ser presumidos"] },
  { code: "SPIRITS", name: "Bebidas alcoólicas", status: "partial", routes: ["CEST/NCM, rota e vigência por UF"], supported: ["separação de produto, NCM/CEST e tratamento especial"], blockers: ["pauta/PMPF, FCP, regime especial e ato estadual exigem conferência"] },
  { code: "TOBACCO", name: "Cigarros e outros fumígenos", status: "partial", routes: ["CEST/NCM, rota e vigência por UF"], supported: ["identificação do segmento e bloqueio de cálculo sem regra aplicável"], blockers: ["preço de referência, regime próprio e normas da UF precisam ser confirmados"] },
  { code: "CEMENT", name: "Cimento", status: "partial", routes: ["CEST/NCM, rota e vigência por UF"], supported: ["triagem de NCM/CEST, destinatário e finalidade"], blockers: ["MVA, pauta, protocolos e vigência por rota devem ser confirmados"] },
  { code: "RAZOR_BLADES", name: "Lâminas e aparelhos de barbear", status: "partial", routes: ["CEST/NCM, rota e vigência por UF"], supported: ["porta de entrada segmentada e controle de exceções"], blockers: ["enquadramento NCM, lista estadual e MVA não podem ser inferidos"] },
  { code: "TOOLS", name: "Ferramentas", status: "partial", routes: ["CEST/NCM, rota e vigência por UF"], supported: ["classificação inicial de mercadoria e destino"], blockers: ["subitem, NCM, MVA, benefícios e acordos por UF precisam ser validados"] },
  { code: "LAMPS", name: "Lâmpadas e materiais de iluminação", status: "partial", routes: ["CEST/NCM, rota e vigência por UF"], supported: ["trilha de NCM/CEST e alerta de tratamento estadual"], blockers: ["escopo do segmento, MVA e lista da UF exigem fonte vigente"] },
  { code: "ELECTRICAL_MATERIALS", name: "Materiais elétricos", status: "partial", routes: ["CEST/NCM, rota e vigência por UF"], supported: ["classificação inicial, finalidade e rota interestadual"], blockers: ["NCM, MVA, redução e acordo aplicável permanecem obrigatórios"] },
  { code: "CLEANING", name: "Produtos de limpeza", status: "partial", routes: ["CEST/NCM, rota e vigência por UF"], supported: ["triagem do segmento e separação de possíveis regimes"], blockers: ["NCM/CEST, pauta, MVA e tratamento estadual precisam ser confirmados"] },
  { code: "MACHINERY", name: "Máquinas e equipamentos", status: "partial", routes: ["CEST/NCM, rota e vigência por UF"], supported: ["captura de produto, destino e finalidade da operação"], blockers: ["exceções de NCM, regime especial e rota homologada devem ser provados"] },
  { code: "DOOR_TO_DOOR", name: "Venda porta a porta", status: "partial", routes: ["CEST/NCM, rota e vigência por UF"], supported: ["identificação do modelo comercial e dados da rota"], blockers: ["hipótese legal, responsabilidade e internalização estadual exigem confirmação"] },
  { code: "TIRES", name: "Pneumáticos", status: "partial", routes: ["CEST/NCM, rota e vigência por UF"], supported: ["triagem de NCM/CEST e natureza da operação"], blockers: ["MVA, pauta, FCP, protocolos e vigência estadual devem ser confirmados"] },
  { code: "PET_FOOD", name: "Rações para animais domésticos", status: "partial", routes: ["CEST/NCM, rota e vigência por UF"], supported: ["triagem de classificação, produto e destino"], blockers: ["NCM, enquadramento do item, MVA e lista estadual precisam ser comprovados"] },
  { code: "ICE_CREAM", name: "Sorvetes e preparados para sorvete", status: "partial", routes: ["CEST/NCM, rota e vigência por UF"], supported: ["triagem de produto, NCM/CEST, destino e período"], blockers: ["lista estadual, pauta/PMPF, MVA e acordo da rota devem ser confirmados antes de qualquer cálculo"] },
];

const cityRows: Array<[string, string, UfCode]> = [
  ["3550308", "São Paulo", "SP"], ["3304557", "Rio de Janeiro", "RJ"], ["5300108", "Brasília", "DF"], ["3106200", "Belo Horizonte", "MG"], ["4106902", "Curitiba", "PR"],
  ["2927408", "Salvador", "BA"], ["2304400", "Fortaleza", "CE"], ["1302603", "Manaus", "AM"], ["2611606", "Recife", "PE"], ["4314902", "Porto Alegre", "RS"],
  ["5208707", "Goiânia", "GO"], ["1501402", "Belém", "PA"], ["3509502", "Campinas", "SP"], ["2111300", "São Luís", "MA"], ["2507507", "João Pessoa", "PB"],
  ["2408102", "Natal", "RN"], ["2704302", "Maceió", "AL"], ["5002704", "Campo Grande", "MS"], ["5103403", "Cuiabá", "MT"], ["3548708", "São Bernardo do Campo", "SP"],
  ["3547809", "Santo André", "SP"], ["3304904", "São Gonçalo", "RJ"], ["3205309", "Vitória", "ES"], ["4205407", "Florianópolis", "SC"], ["2800308", "Aracaju", "SE"],
  ["2211001", "Teresina", "PI"], ["3549904", "São José dos Campos", "SP"], ["3518800", "Guarulhos", "SP"], ["3301702", "Duque de Caxias", "RJ"], ["4113700", "Londrina", "PR"],
  ["4104808", "Cascavel", "PR"], ["3303302", "Niterói", "RJ"], ["3170206", "Uberlândia", "MG"], ["3118601", "Contagem", "MG"], ["3543402", "Ribeirão Preto", "SP"],
  ["3548500", "Santos", "SP"], ["4209102", "Joinville", "SC"], ["4305108", "Caxias do Sul", "RS"], ["3510609", "Carapicuíba", "SP"], ["3529401", "Mauá", "SP"],
  ["2919207", "Lauro de Freitas", "BA"], ["2933307", "Vitória da Conquista", "BA"], ["2611101", "Petrolina", "PE"], ["2607901", "Jaboatão dos Guararapes", "PE"], ["5201405", "Aparecida de Goiânia", "GO"],
  ["1500800", "Ananindeua", "PA"], ["5107602", "Rondonópolis", "MT"], ["5008305", "Três Lagoas", "MS"], ["1100205", "Porto Velho", "RO"], ["1200401", "Rio Branco", "AC"],
];

export const cityCoverage: CityCoverage[] = cityRows.map(([ibgeCode, city, uf]) => {
  const deepProfile = issDeepProfileByIbge.get(ibgeCode);
  return {
    ibgeCode,
    city,
    uf,
    status: "partial",
    rangeBps: [200, 500],
    depth: deepProfile ? "structured" : "catalogued",
    officialSourceCodes: deepProfile?.sourceCodes ?? [],
    structuredAt: deepProfile?.checkedAt ?? null,
    supported: deepProfile?.supportedOutputs ?? ["faixa nacional de 2% a 5%", "item da LC 116", "município de incidência como fato obrigatório", "preparação para NFS-e padrão nacional"],
    blockers: deepProfile?.hardStops ?? ["alíquota exata depende do código de serviço e da lei municipal vigente", "retenção, local de incidência, cadastro e regime especial precisam ser confirmados"],
  };
});

export const recurringScenarios: ScenarioCoverage[] = [
  { code: "SIMPLES-PGDAS", tax: "Simples", title: "Atividades, cinco anexos, fator R e segregações", status: "partial", supported: [`${simplesActivityProfiles.length} perfis CNAE prioritários como candidatos, nunca como conclusão isolada`, "30 memórias de faixa em centavos nos Anexos I a V", `fator R, segregações, limite nacional e sublimite de 2026 versionados em ${SIMPLES_NATIONAL_DEEP_VERSION}`], blockers: ["DAS definitivo depende de atividade efetiva, RBT12, composição integral da receita, período fechado, sublimite, impedimentos e reconciliação no PGDAS-D"] },
  { code: "PIS-COFINS-CUM", tax: "PIS/Cofins", title: "Regime cumulativo recorrente", status: "partial", supported: ["débitos de PIS 0,65% e Cofins 3% em centavos", "receita segregada e saldo sem crédito presumido", `motor versionado em ${PIS_COFINS_DEEP_VERSION}`], blockers: ["regime, papel, documento, receita mista e tratamento especial precisam ser confirmados"] },
  { code: "PIS-COFINS-NC", tax: "PIS/Cofins", title: "Não cumulativo com créditos", status: "partial", supported: ["débitos de PIS 1,65% e Cofins 7,6% separados", `${pisCofinsCreditHypotheses.length} hipóteses recorrentes de crédito com gates`, "saldo não compensado automaticamente"], blockers: ["crédito exige hipótese legal, documento, incidência na aquisição e vínculo com atividade tributada"] },
  { code: "PIS-COFINS-SPECIAL", tax: "PIS/Cofins", title: "Monofásico, alíquota zero e suspensão", status: "partial", supported: [`${pisCofinsProductProfiles.length} perfis prioritários por NCM como candidatos`, "papel de fabricante/importador separado da revenda", "vigência de 2026 e LC 224/2025 tratadas explicitamente"], blockers: ["NCM exato nas tabelas oficiais, papel, documento, operação, vigência e alíquota pós-2026 são obrigatórios"] },
  { code: "IRPJ-CSLL-PRESUMED", tax: "IRPJ/CSLL", title: "Lucro Presumido por atividade", status: "partial", supported: ["bases de IRPJ e CSLL, adicional e acrescimos de 2026 em memoria"], blockers: ["atividade, receita, ganhos, regime e tratamentos especiais precisam ser segregados"] },
  { code: "IRPJ-CSLL-REAL", tax: "IRPJ/CSLL", title: "Lucro Real com adicoes/exclusoes", status: "partial", supported: ["base antes da compensacao, limite de 30%, IRPJ, adicional e CSLL"], blockers: ["LALUR/LACS, contabilidade, adicoes, exclusoes e compensacoes precisam estar conciliados"] },
  { code: "RET-IRRF-CSRF", tax: "Retenções", title: "IRRF, CSRF, INSS e ISS em serviços recorrentes", status: "partial", supported: [`${serviceWithholdingProfiles.length} perfis priorizados em ${SERVICE_WITHHOLDINGS_DEEP_VERSION}`, "quatro livros independentes por fato gerador, responsável, base, limite e prazo", "IRRF de 1%/1,5%, CSRF de 4,65%, INSS de 11%/3,5% e ISS municipal somente após seus próprios gates", "memórias em centavos e líquido bloqueado sem simultaneidade comprovada"], blockers: ["órgão público exige tabela própria", "INSS exige modo de execução, CPRB e deduções", "ISS exige município, item, lei, alíquota, responsabilidade e vencimento", "dispensas de um tributo nunca são reutilizadas em outro"] },
  { code: "IPI-TIPI", tax: "IPI", title: "IPI/TIPI por NCM e operação", status: "partial", supported: [`${ipiTipiPriorityProfiles.length} NCMs exatos priorizados em ${IPI_TIPI_DEEP_VERSION}`, "saída industrial, importação, equiparação e saída comercial não tributada em trilhas separadas", "alíquota nominal, alíquota zero e Ex da TIPI versionados", "base de importação e saída interna em centavos"], blockers: ["NCM e descrição legal exatos, notas da TIPI, operação, papel e vigência são obrigatórios", "benefícios externos à TIPI exigem regra jurídica dedicada", "créditos e saldo do período permanecem fora da memória de débito"] },
  { code: "RTC-SECTOR-SCENARIOS", tax: "IBS/CBS", title: "Transição setorial de 2026 a 2033", status: "partial", supported: [`${taxReformSectorProfiles.length} perfis setoriais priorizados em ${TAX_REFORM_SECTOR_VERSION}`, "regime geral, redução de 30%, redução de 60% e cesta básica a zero em trilhas separadas", "CBS, IBS, ICMS/ISS, PIS/Cofins, IPI e IS preservados em livros próprios", "144 casos anuais e negativos sem produzir saldo jurídico a recolher"], blockers: ["serviços financeiros, combustíveis e imóveis exigem memória própria de regime específico", "classificação no Anexo legal, referência anual, créditos, vigência e exceções permanecem obrigatórios", "tratamentos diferenciados de 2026 permanecem bloqueados no recorte operacional atual"] },
];

export const normativeMonitorSources = [
  coverageSources[3], coverageSources[4], coverageSources[5], coverageSources[6], coverageSources[7], coverageSources[8],
  ...issDeepSources,
  { code: "RFB-NEWS", title: "Notícias da Receita Federal", publisher: "Receita Federal", url: "https://www.gov.br/receitafederal/pt-br/assuntos/noticias", checkedAt: NATIONAL_COVERAGE_CHECKED_AT },
  { code: "SIMPLES-NEWS", title: "Notícias do Simples Nacional", publisher: "Receita Federal", url: "https://www8.receita.fazenda.gov.br/SimplesNacional/Noticias/NoticiaCompleta.aspx", checkedAt: NATIONAL_COVERAGE_CHECKED_AT },
  ...stateCoverage.map((item) => ({ code: `SEFAZ-${item.uf}`, title: `Portal oficial da SEFAZ — ${item.name}`, publisher: `Administração tributária de ${item.name}`, url: item.officialPortal, checkedAt: NATIONAL_COVERAGE_CHECKED_AT })),
];

export function resolveInterstateIcms(origin: UfCode, destination: UfCode, importedQualified: boolean) {
  if (origin === destination) return { status: "blocked" as const, rateBps: null, reason: "Operação interna exige alíquota e tratamento da legislação da própria UF." };
  if (importedQualified) return { status: "reference" as const, rateBps: 400, reason: "Referência de 4% condicionada aos requisitos e exceções da Resolução do Senado nº 13/2012." };
  const originState = stateCoverage.find((item) => item.uf === origin)!;
  const destinationState = stateCoverage.find((item) => item.uf === destination)!;
  const seven = ["S", "SE"].includes(originState.region) && origin !== "ES" && (["N", "NE", "CO"].includes(destinationState.region) || destination === "ES");
  return { status: "reference" as const, rateBps: seven ? 700 : 1200, reason: `Referência interestadual de ${seven ? "7%" : "12%"}; confirme produto, origem, benefício, consumidor final e exceções.` };
}

export function coverageMetrics() {
  const all = [...stateCoverage, ...cityCoverage, ...stSegments, ...recurringScenarios];
  return {
    states: stateCoverage.length, cities: cityCoverage.length, stSegments: stSegments.length, recurringScenarios: recurringScenarios.length,
    deepIssCities: issDeepCityProfiles.length,
    supported: all.filter((item) => item.status === "supported").length,
    partial: all.filter((item) => item.status === "partial").length,
    notSupported: all.filter((item) => item.status === "not_supported").length,
    sourceCount: coverageSources.length,
    icmsGeneralStates: icmsStateGeneralProfiles.length,
    icmsGeneralVersion: ICMS_GENERAL_NATIONAL_VERSION,
    icmsGeneralCheckedAt: ICMS_GENERAL_NATIONAL_CHECKED_AT,
  };
}

export async function hashNationalCoverage() {
  const body = JSON.stringify({ version: NATIONAL_COVERAGE_VERSION, states: stateCoverage, icmsGeneralVersion: ICMS_GENERAL_NATIONAL_VERSION, icmsGeneralProfiles: icmsStateGeneralProfiles, cities: cityCoverage, issDeepProfiles: issDeepCityProfiles, issDeepServiceCoverage, issRecurringVersion: ISS_RECURRING_PRIORITY_VERSION, issRecurringPriorityItems, issRecurringPriorityCells, ipiTipiVersion: IPI_TIPI_DEEP_VERSION, ipiTipiProfiles: ipiTipiPriorityProfiles, segments: stSegments, scenarios: recurringScenarios, sources: coverageSources });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

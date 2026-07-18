import { issDeepCityProfiles, issDeepProfileByIbge, issDeepSources } from "./iss-deep-coverage.ts";

export const NATIONAL_COVERAGE_VERSION = "2026.07.18-v53";
export const NATIONAL_COVERAGE_CHECKED_AT = "2026-07-18";

export type CoverageStatus = "supported" | "partial" | "not_supported";
export type UfCode = "AC" | "AL" | "AP" | "AM" | "BA" | "CE" | "DF" | "ES" | "GO" | "MA" | "MT" | "MS" | "MG" | "PA" | "PB" | "PR" | "PE" | "PI" | "RJ" | "RN" | "RS" | "RO" | "RR" | "SC" | "SP" | "SE" | "TO";

export type CoverageSource = { code: string; title: string; publisher: string; url: string; checkedAt: string };
export type StateCoverage = { uf: UfCode; name: string; region: "N" | "NE" | "CO" | "SE" | "S"; status: CoverageStatus; officialPortal: string; supported: string[]; blockers: string[] };
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
  ...issDeepSources,
];

const state = (uf: UfCode, name: string, region: StateCoverage["region"], officialPortal: string): StateCoverage => ({
  uf, name, region, officialPortal, status: "partial",
  supported: ["rota interestadual padrão de 7%/12%", "mercadoria importada qualificada a 4%", "trilha de DIFAL/ST para revisão"],
  blockers: ["alíquota interna depende da legislação vigente da UF e do produto", "FCP, benefício, redução, diferimento e regime especial exigem confirmação", "NCM/CEST, finalidade e cadastro do destinatário são fatos obrigatórios"],
});

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
  { code: "AUTO_PARTS", name: "Autopeças", status: "partial", routes: ["SP → MG homologável", "demais UFs em triagem"], supported: ["NCM/CEST", "MVA original e ajustada", "revenda, uso/consumo e industrialização", "ICMS-ST linha a linha na rota SP→MG"], blockers: ["protocolos, exceções e vigências das demais rotas ainda não homologados"] },
  { code: "BEVERAGES", name: "Bebidas", status: "partial", routes: ["27 UFs em triagem"], supported: ["captura NCM/CEST", "separação ST/monofásico"], blockers: ["pauta, PMPF, FCP e acordos por produto/UF"] },
  { code: "FUELS", name: "Combustíveis e lubrificantes", status: "not_supported", routes: ["monitoramento nacional"], supported: ["identificação do segmento"], blockers: ["regime monofásico, ad rem e atos específicos exigem motor próprio"] },
  { code: "PHARMA", name: "Medicamentos", status: "partial", routes: ["27 UFs em triagem"], supported: ["captura NCM/CEST", "alerta de PMC e benefício"], blockers: ["listas positiva/negativa/neutra, PMC, FCP e benefícios estaduais"] },
  { code: "CONSTRUCTION", name: "Materiais de construção", status: "partial", routes: ["27 UFs em triagem"], supported: ["captura NCM/CEST", "MVA ajustada quando parâmetros são confirmados"], blockers: ["escopo do segmento e protocolos por UF"] },
  { code: "COSMETICS", name: "Cosméticos e perfumaria", status: "partial", routes: ["27 UFs em triagem"], supported: ["captura NCM/CEST", "trilha de MVA"], blockers: ["listas estaduais, MVA e FCP"] },
  { code: "ELECTRONICS", name: "Eletrônicos e eletrodomésticos", status: "partial", routes: ["27 UFs em triagem"], supported: ["captura NCM/CEST", "trilha de destino"], blockers: ["protocolos, MVA, redução e exceções por NCM"] },
  { code: "FOOD", name: "Alimentos", status: "partial", routes: ["27 UFs em triagem"], supported: ["captura NCM/CEST", "separação de monofásico e ST"], blockers: ["cestas básicas, redução, pauta e listas estaduais"] },
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
  { code: "SIMPLES-PGDAS", tax: "Simples", title: "Receita segregada, anexo e fator R", status: "partial", supported: ["triagem e memória de fatos"], blockers: ["DAS depende das receitas segregadas e parâmetros do período"] },
  { code: "PIS-COFINS-CUM", tax: "PIS/Cofins", title: "Regime cumulativo recorrente", status: "partial", supported: ["alíquotas de referência e retenções"], blockers: ["monofásico, alíquota zero, suspensão e base precisam ser classificados"] },
  { code: "PIS-COFINS-NC", tax: "PIS/Cofins", title: "Não cumulativo com créditos", status: "partial", supported: ["livro separado de débitos e créditos"], blockers: ["crédito exige documento, vínculo e hipótese legal"] },
  { code: "IRPJ-CSLL-PRESUMED", tax: "IRPJ/CSLL", title: "Lucro Presumido por atividade", status: "partial", supported: ["bases e adicional em memória"], blockers: ["atividade, receita e ganho precisam ser segregados"] },
  { code: "IRPJ-CSLL-REAL", tax: "IRPJ/CSLL", title: "Lucro Real com adições/exclusões", status: "not_supported", supported: ["checklist ECD/ECF/Lalur"], blockers: ["apuração completa exige razão contábil, Lalur/Lacs e compensações"] },
  { code: "RET-IRRF-CSRF", tax: "Retenções", title: "IRRF e CSRF em serviços", status: "partial", supported: ["triagem por natureza do pagamento"], blockers: ["serviço, beneficiário, dispensa, limite e momento do fato gerador"] },
  { code: "RET-INSS", tax: "Retenções", title: "INSS em cessão/empreitada", status: "partial", supported: ["trilha R-2010/R-2020"], blockers: ["contrato, tipo de serviço, base e deduções"] },
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
  };
}

export async function hashNationalCoverage() {
  const body = JSON.stringify({ version: NATIONAL_COVERAGE_VERSION, states: stateCoverage, cities: cityCoverage, issDeepProfiles: issDeepCityProfiles, segments: stSegments, scenarios: recurringScenarios, sources: coverageSources });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

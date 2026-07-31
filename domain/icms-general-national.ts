export const ICMS_GENERAL_NATIONAL_VERSION = "2026.07.31-v78";
export const ICMS_GENERAL_NATIONAL_CHECKED_AT = "2026-07-30";

export type IcmsUfCode =
  | "AC" | "AL" | "AP" | "AM" | "BA" | "CE" | "DF" | "ES" | "GO"
  | "MA" | "MT" | "MS" | "MG" | "PA" | "PB" | "PR" | "PE" | "PI"
  | "RJ" | "RN" | "RS" | "RO" | "RR" | "SC" | "SP" | "SE" | "TO";

export type IcmsGeneralSource = {
  code: string;
  title: string;
  publisher: string;
  url: string;
  checkedAt: string;
  legalDevice: string;
};

export type DifalMethod = "single_base" | "double_base" | "state_rule_required";
export type FundStatus = "general_confirmed" | "product_specific" | "not_general" | "not_catalogued";

export type IcmsStateGeneralProfile = {
  uf: IcmsUfCode;
  generalRateBps: number;
  effectiveFrom: string;
  sourceCode: string;
  legalDevice: string;
  fund: {
    name: string;
    status: FundStatus;
    generalRateBps: number | null;
    sourceCode: string | null;
    hypothesis: string;
  };
  difal: {
    taxpayer: DifalMethod;
    nonTaxpayer: DifalMethod;
    sourceCode: string | null;
  };
  classification: "partial";
  blockers: string[];
};

const source = (
  code: string,
  title: string,
  publisher: string,
  url: string,
  legalDevice: string,
): IcmsGeneralSource => ({
  code,
  title,
  publisher,
  url,
  checkedAt: ICMS_GENERAL_NATIONAL_CHECKED_AT,
  legalDevice,
});

export const icmsGeneralSources: IcmsGeneralSource[] = [
  source("ICMS-AC-GENERAL", "Tabela oficial de alíquotas internas do Acre", "SEFAZ/AC", "https://sefaz.ac.gov.br/2021/?mdocs-file=16465", "Lei Complementar estadual nº 55/1997, art. 18"),
  source("ICMS-AL-GENERAL", "Lei nº 9.776/2025", "Assembleia Legislativa de Alagoas", "https://sapl.al.al.leg.br/media/sapl/public/normajuridica/2025/3699/lei_no_9.776_de_22_de_dezembro_de_2025.pdf", "Lei estadual nº 5.900/1996, art. 17, I, b"),
  source("ICMS-AP-GENERAL", "Diário Oficial do Estado do Amapá — referência interna vigente", "Governo do Amapá", "https://diofe.portal.ap.gov.br/portal/edicoes/visualizar_pdf/10013/", "RICMS/AP e atos vigentes da SEFAZ/AP"),
  source("ICMS-AM-GENERAL", "Diário Oficial Eletrônico da SEFAZ/AM", "SEFAZ/AM", "https://online.sefaz.am.gov.br/doe/toPdf.asp?idPublicacao=2106", "Lei Complementar estadual nº 19/1997, art. 12, I, b"),
  source("ICMS-BA-GENERAL", "Lei nº 7.014/1996 consolidada", "SEFAZ/BA", "https://mbusca.sefaz.ba.gov.br/DITRI/leis/leis_estaduais/legest_1996_7014_icmscomnotas.pdf", "Lei estadual nº 7.014/1996, art. 15, I"),
  source("ICMS-CE-GENERAL", "Lei nº 18.665/2023", "Assembleia Legislativa do Ceará", "https://www2.al.ce.gov.br/legislativo/legislacao5/leis2023/18665.htm", "Lei estadual nº 12.670/1996, art. 44, I, g"),
  source("ICMS-DF-GENERAL", "Decreto nº 45.490/2024", "Sistema Integrado de Normas Jurídicas do DF", "https://www.sinj.df.gov.br/sinj/Norma/5396e13424d840828817e82d3291af8d/Decreto_45490_15_02_2024.html", "Lei distrital nº 1.254/1996, art. 18"),
  source("ICMS-DF-DIFAL", "Parecer fiscal publicado no DODF nº 205/2024", "Secretaria de Economia do DF", "https://www.economia.df.gov.br/documents/d/seec/dodf-205-24-10-2024-integra", "Lei distrital nº 1.254/1996, art. 13, §§ 6º e 7º"),
  source("ICMS-ES-GENERAL", "Parecer normativo sobre alíquota interna", "SEFAZ/ES", "https://internet.sefaz.es.gov.br/informacoes/tributacao/detalharParecer.php?numero=202100609&tipo=7", "Lei estadual nº 7.000/2001, art. 20"),
  source("ICMS-GO-GENERAL", "Comunicado oficial sobre a alíquota modal", "Secretaria da Economia de Goiás", "https://goias.gov.br/economia/goias-mantera-menor-aliquota-de-icms-do-pais/", "Lei estadual nº 11.651/1991, art. 27"),
  source("ICMS-MA-GENERAL", "Lei nº 12.426/2024 e tramitação oficial", "Assembleia Legislativa do Maranhão", "https://www.al.ma.leg.br/sitealema/wp-content/uploads/2025/04/DIARIO_066_23.04.2025-2.pdf", "Lei estadual nº 7.799/2002, art. 23, III"),
  source("ICMS-MT-GENERAL", "Documento oficial de alíquotas do ICMS", "SEFAZ/MT", "https://app1.sefaz.mt.gov.br/04256E4C004D9CE4/BDFDF560841CF35E04256CA7004FCD3E/962C500B8C1F7A4484257673004ABAB0", "Lei estadual nº 7.098/1998, art. 14; RICMS/MT, art. 95"),
  source("ICMS-MT-DIFAL", "Orientação oficial de DIFAL para consumidor final", "SEFAZ/MT", "https://app1.sefaz.mt.gov.br/04256E4C004D9CE4/A846E70F044285D7042572F9004EEAA2/1FD72E1EFECC8B3A04258ABD0063EB97", "RICMS/MT, arts. 72 e 96"),
  source("ICMS-MS-GENERAL", "Instrução normativa de cálculo do DIFAL", "SEFAZ/MS", "https://www.spdo.ms.gov.br/diariodoe/Index/Download/DO11125_05_04_2023", "Lei estadual nº 1.810/1997, arts. 41 e 41-A"),
  source("ICMS-MG-GENERAL", "RICMS/MG — Anexo I", "SEFAZ/MG", "https://www.fazenda.mg.gov.br/empresas/legislacao_tributaria/ricms_2023_seco/anexoi2023_2.html", "Decreto estadual nº 48.589/2023, Anexo I, item 7"),
  source("ICMS-PA-GENERAL", "Alteração oficial da alíquota modal", "Assembleia Legislativa do Pará", "https://www.alepa.pa.gov.br/Comunicacao/Noticia/5255/alepa-aprova-pl-que-reajusta-aliquota-de-icms-mas-projeto-mantem-preco-da-cesta-basica", "Lei estadual nº 5.530/1989, art. 12"),
  source("ICMS-PB-GENERAL", "Lei nº 6.379/1996 consolidada", "SEFAZ/PB", "https://www.sefaz.pb.gov.br/legislacao/64-leis/icms/13798-lei-n-6-379-de-2-de-dezembro-de-1996-atualizada-em-06-09-2023", "Lei estadual nº 6.379/1996, art. 13"),
  source("ICMS-PR-GENERAL", "Decreto nº 5.143/2024", "SEFA/PR", "https://www.sefanet.pr.gov.br/dados/SEFADOCUMENTOS/102202405143.pdf", "Lei estadual nº 11.580/1996, art. 14, VIII"),
  source("ICMS-PE-GENERAL", "Lei nº 18.305/2023", "SEFAZ/PE", "https://www.sefaz.pe.gov.br/Legislacao/Tributaria/Documents/legislacao/Leis_Tributarias/2023/Lei18305_2023.htm", "Lei estadual nº 15.730/2016, art. 15-A"),
  source("ICMS-PI-GENERAL", "Decreto de atualização da alíquota modal", "Diário Oficial do Piauí", "https://www.diario.pi.gov.br/doe/files/diarios/anexo/ac417cb0-9f16-4b74-962f-cf16b5bd029e/DOEPI_79_2025.pdf", "Lei estadual nº 4.257/1989, art. 23"),
  source("ICMS-RJ-GENERAL", "Alíquotas internas e FECP", "SEFAZ/RJ", "https://portal.fazenda.rj.gov.br/pagamentos/aliquotas-internas/", "Lei estadual nº 2.657/1996 e Lei Complementar estadual nº 210/2023"),
  source("ICMS-RJ-FECP", "Fundo Estadual de Combate à Pobreza — FECP", "SEFAZ/RJ", "https://portal.fazenda.rj.gov.br/icms/fecp/", "Lei Complementar estadual nº 210/2023"),
  source("ICMS-RN-GENERAL", "Comunicado: alteração da alíquota modal para 20%", "SEFAZ/RN", "https://wp.sistemas.cotic.rn.gov.br/download-file?filePath=%2Fremote.php%2Fdav%2Ffiles%2Fgovernodorn%2FSEFAZ-GOVRN%2FAnexos%2520de%2520Mat%25c3%25a9rias%2FComunicado%2520altera%25c3%25a7%25c3%25a3o%2520al%25c3%25adquota%2520modal%2520para%252020.pdf", "Lei estadual nº 11.999/2024"),
  source("ICMS-RS-GENERAL", "Portal oficial da legislação estadual", "Governo do Estado do Rio Grande do Sul", "https://www.estado.rs.gov.br/legislacao", "Lei estadual nº 8.820/1989, art. 12"),
  source("ICMS-RO-GENERAL", "Instrução normativa estadual com memória de cálculo", "SEFIN/RO", "https://legislacao.sefin.ro.gov.br/Download?arquivo=cd2590be34d34255524a127553a46e27.pdf&nome=RC25-1_SEFIN_SUPEL_CGE+-+Dispoe+sobre+os+procedimentos+para+a+fruicao+do+beneficio+fiscal+de+isencao+do+ICMS+nas+vendas+para+orgaos+publicos.pdf", "Lei estadual nº 688/1996, art. 27"),
  source("ICMS-RR-GENERAL", "Lei nº 59/1993 consolidada", "SEFAZ/RR", "https://www.sefaz.rr.gov.br/downloads?catid=475&id=24844&m=0&task=download.send", "Lei estadual nº 59/1993, art. 32"),
  source("ICMS-SC-GENERAL", "RICMS/SC", "SEF/SC", "https://legislacao.sef.sc.gov.br/legtrib_internet/html/regulamentos/icms/ricms_01_00.htm", "Decreto estadual nº 2.870/2001, art. 26"),
  source("ICMS-SP-GENERAL", "Referência oficial da alíquota padrão paulista", "SEFAZ/SP", "https://portal.fazenda.sp.gov.br/servicos/comex/Paginas/LeilaoRFB.aspx", "RICMS/SP, art. 52, I"),
  source("ICMS-SE-GENERAL", "Lei nº 3.796/1996 consolidada", "Assembleia Legislativa de Sergipe", "https://aleselegis.al.se.leg.br/Arquivo/Documents/legislacao/html/l37961996.html", "Lei estadual nº 3.796/1996, art. 18"),
  source("ICMS-TO-GENERAL", "Código Tributário do Tocantins consolidado", "Assembleia Legislativa do Tocantins", "https://www.al.to.leg.br/arquivos/lei_1287-2001_68306.PDF", "Lei estadual nº 1.287/2001, art. 27"),
];

const fund = (
  name: string,
  status: FundStatus = "product_specific",
  generalRateBps: number | null = null,
  sourceCode: string | null = null,
  hypothesis = "O adicional depende do produto, NCM, hipótese legal e eventuais exclusões estaduais.",
) => ({ name, status, generalRateBps, sourceCode, hypothesis });

const profile = (
  uf: IcmsUfCode,
  generalRateBps: number,
  effectiveFrom: string,
  sourceCode: string,
  legalDevice: string,
  fundProfile: IcmsStateGeneralProfile["fund"],
  taxpayer: DifalMethod = "state_rule_required",
  nonTaxpayer: DifalMethod = "state_rule_required",
  difalSourceCode: string | null = null,
): IcmsStateGeneralProfile => ({
  uf,
  generalRateBps,
  effectiveFrom,
  sourceCode,
  legalDevice,
  fund: fundProfile,
  difal: { taxpayer, nonTaxpayer, sourceCode: difalSourceCode },
  classification: "partial",
  blockers: [
    "A alíquota modal não substitui a classificação do NCM, alíquota específica, redução, benefício, diferimento ou regime especial.",
    "O FCP somente entra na memória quando a hipótese do produto estiver expressamente confirmada.",
    "ST e antecipação são motores separados e bloqueiam esta referência geral.",
  ],
});

export const icmsStateGeneralProfiles: IcmsStateGeneralProfile[] = [
  profile("AC", 1900, "2023-04-01", "ICMS-AC-GENERAL", "LC estadual nº 55/1997, art. 18", fund("FECEP/AC")),
  profile("AL", 2050, "2026-04-01", "ICMS-AL-GENERAL", "Lei estadual nº 5.900/1996, art. 17, I, b", fund("FECOEP/AL")),
  profile("AP", 1800, "2024-01-01", "ICMS-AP-GENERAL", "RICMS/AP", fund("Fundo de Combate à Pobreza do Amapá", "not_catalogued")),
  profile("AM", 2000, "2023-03-29", "ICMS-AM-GENERAL", "LC estadual nº 19/1997, art. 12, I, b", fund("FMPES/AM")),
  profile("BA", 2050, "2024-02-07", "ICMS-BA-GENERAL", "Lei estadual nº 7.014/1996, art. 15, I", fund("FUNCEP/BA")),
  profile("CE", 2000, "2024-01-01", "ICMS-CE-GENERAL", "Lei estadual nº 12.670/1996, art. 44, I, g", fund("FECOP/CE")),
  profile("DF", 2000, "2024-01-22", "ICMS-DF-GENERAL", "Lei distrital nº 1.254/1996, art. 18", fund("Fundo de Combate à Pobreza do DF", "product_specific"), "double_base", "single_base", "ICMS-DF-DIFAL"),
  profile("ES", 1700, "2002-01-01", "ICMS-ES-GENERAL", "Lei estadual nº 7.000/2001, art. 20", fund("Fundo Estadual de Combate à Pobreza do ES", "product_specific")),
  profile("GO", 1900, "2024-04-01", "ICMS-GO-GENERAL", "Lei estadual nº 11.651/1991, art. 27", fund("PROTEGE GOIÁS")),
  profile("MA", 2300, "2025-02-23", "ICMS-MA-GENERAL", "Lei estadual nº 7.799/2002, art. 23, III", fund("FUMACOP/MA")),
  profile("MT", 1700, "2012-01-01", "ICMS-MT-GENERAL", "Lei estadual nº 7.098/1998, art. 14", fund("FECEP/MT", "product_specific", null, "ICMS-MT-DIFAL"), "state_rule_required", "single_base", "ICMS-MT-DIFAL"),
  profile("MS", 1700, "1998-01-01", "ICMS-MS-GENERAL", "Lei estadual nº 1.810/1997, art. 41", fund("FECOMP/MS", "product_specific", null, "ICMS-MS-GENERAL"), "double_base", "state_rule_required", "ICMS-MS-GENERAL"),
  profile("MG", 1800, "2023-07-01", "ICMS-MG-GENERAL", "Decreto estadual nº 48.589/2023, Anexo I, item 7", fund("FEM/MG")),
  profile("PA", 1900, "2023-03-16", "ICMS-PA-GENERAL", "Lei estadual nº 5.530/1989, art. 12", fund("FECOP/PA")),
  profile("PB", 2000, "2024-01-01", "ICMS-PB-GENERAL", "Lei estadual nº 6.379/1996, art. 13", fund("FUNCEP/PB")),
  profile("PR", 1950, "2024-03-18", "ICMS-PR-GENERAL", "Lei estadual nº 11.580/1996, art. 14, VIII", fund("FECOP/PR")),
  profile("PE", 2050, "2024-01-01", "ICMS-PE-GENERAL", "Lei estadual nº 15.730/2016, art. 15-A", fund("FECEP/PE")),
  profile("PI", 2250, "2025-04-01", "ICMS-PI-GENERAL", "Lei estadual nº 4.257/1989, art. 23", fund("FECOP/PI")),
  profile("RJ", 2000, "2024-03-20", "ICMS-RJ-GENERAL", "Lei estadual nº 2.657/1996 e LC estadual nº 210/2023", fund("FECP/RJ", "general_confirmed", 200, "ICMS-RJ-FECP", "Adicional geral de 2 p.p.; exceções e alíquotas específicas continuam prevalecendo.")),
  profile("RN", 2000, "2025-03-20", "ICMS-RN-GENERAL", "Lei estadual nº 11.999/2024", fund("FECOP/RN")),
  profile("RS", 1700, "2022-01-01", "ICMS-RS-GENERAL", "Lei estadual nº 8.820/1989, art. 12", fund("AMPARA/RS")),
  profile("RO", 1950, "2024-01-12", "ICMS-RO-GENERAL", "Lei estadual nº 688/1996, art. 27", fund("FECOEP/RO")),
  profile("RR", 2000, "2023-03-30", "ICMS-RR-GENERAL", "Lei estadual nº 59/1993, art. 32", fund("FECP/RR")),
  profile("SC", 1700, "2012-01-01", "ICMS-SC-GENERAL", "RICMS/SC, art. 26, I", fund("Sem adicional geral catalogado", "not_general", 0, "ICMS-SC-GENERAL", "Não há adicional geral nesta camada; tratamentos específicos continuam sujeitos à legislação estadual.")),
  profile("SP", 1800, "2001-01-01", "ICMS-SP-GENERAL", "RICMS/SP, art. 52, I", fund("FECOEP/SP")),
  profile("SE", 1900, "2023-03-20", "ICMS-SE-GENERAL", "Lei estadual nº 3.796/1996, art. 18", fund("FECOEP/SE")),
  profile("TO", 2000, "2024-01-01", "ICMS-TO-GENERAL", "Lei estadual nº 1.287/2001, art. 27", fund("FECOEP/TO")),
];

export const icmsStateGeneralProfileByUf = new Map(icmsStateGeneralProfiles.map((item) => [item.uf, item]));

export type IcmsGeneralInput = {
  origin: IcmsUfCode;
  destination: IcmsUfCode;
  operationDate: string;
  operationValueCents: number;
  importedQualified: boolean;
  recipientType: "taxpayer" | "non_taxpayer";
  finalConsumer: boolean;
  purpose: "resale" | "industrialization" | "use_consumption" | "fixed_asset";
  ncm: string;
  generalRateAppliesConfirmed: boolean;
  noSpecificRateBenefitConfirmed: boolean;
  stStatus: "not_applicable_confirmed" | "applicable" | "unknown";
  fcpStatus: "not_applicable_confirmed" | "general_confirmed" | "unknown";
};

export type IcmsGeneralResult =
  | {
      status: "calculated_reference";
      coverageStatus: "partial";
      kind: "internal" | "interstate" | "difal_taxpayer" | "difal_non_taxpayer";
      ratesBps: { interstate: number | null; internal: number; fcp: number };
      amountsCents: {
        operation: number;
        originBase: number;
        destinationBase: number;
        originIcms: number;
        destinationDifal: number;
        destinationFcp: number;
        destinationTotal: number;
      };
      method: "direct_internal" | "interstate_reference" | "single_base" | "double_base";
      responsibility: "origin_remitter" | "destination_taxpayer" | "own_internal";
      sourceCodes: string[];
      blockers: [];
    }
  | {
      status: "not_applicable";
      coverageStatus: "partial";
      reason: string;
      interstateRateBps: number | null;
      sourceCodes: string[];
      blockers: [];
    }
  | {
      status: "route_to_st" | "blocked";
      coverageStatus: "partial";
      reason: string;
      sourceCodes: string[];
      blockers: string[];
    };

function roundRatio(numerator: bigint, denominator: bigint) {
  return Number((numerator + denominator / 2n) / denominator);
}

function applyBps(cents: number, bps: number) {
  return roundRatio(BigInt(cents) * BigInt(bps), 10_000n);
}

function grossUp(netCents: number, rateBps: number) {
  return roundRatio(BigInt(netCents) * 10_000n, BigInt(10_000 - rateBps));
}

function interstateRateBps(origin: IcmsUfCode, destination: IcmsUfCode, importedQualified: boolean) {
  if (importedQualified) return 400;
  const south = new Set<IcmsUfCode>(["PR", "RS", "SC"]);
  const southeast = new Set<IcmsUfCode>(["ES", "MG", "RJ", "SP"]);
  const northNortheastCenterWestOrEs = new Set<IcmsUfCode>(["AC", "AL", "AP", "AM", "BA", "CE", "DF", "GO", "MA", "MT", "MS", "PA", "PB", "PE", "PI", "RN", "RO", "RR", "SE", "TO", "ES"]);
  return (south.has(origin) || (southeast.has(origin) && origin !== "ES")) && northNortheastCenterWestOrEs.has(destination) ? 700 : 1200;
}

function baseBlockers(input: IcmsGeneralInput, destination: IcmsStateGeneralProfile) {
  const blockers: string[] = [];
  if (!["taxpayer", "non_taxpayer"].includes(input.recipientType)) blockers.push("Tipo de destinatário inválido.");
  if (!["resale", "industrialization", "use_consumption", "fixed_asset"].includes(input.purpose)) blockers.push("Finalidade da operação inválida.");
  if (!["not_applicable_confirmed", "applicable", "unknown"].includes(input.stStatus)) blockers.push("Situação de ST inválida.");
  if (!["not_applicable_confirmed", "general_confirmed", "unknown"].includes(input.fcpStatus)) blockers.push("Situação de FCP inválida.");
  if (typeof input.finalConsumer !== "boolean") blockers.push("Condição de consumidor final inválida.");
  if (typeof input.importedQualified !== "boolean") blockers.push("Qualificação de importado inválida.");
  if (!/^\d{8}$/.test(input.operationDate.replaceAll("-", ""))) blockers.push("Data da operação inválida.");
  if (!Number.isInteger(input.operationValueCents) || input.operationValueCents <= 0) blockers.push("Valor da operação deve ser informado em centavos inteiros positivos.");
  if (!/^\d{8}$/.test(input.ncm.replace(/\D/g, ""))) blockers.push("NCM completo de 8 dígitos é obrigatório.");
  if (input.operationDate < destination.effectiveFrom) blockers.push(`A referência modal de ${destination.uf} somente está versionada a partir de ${destination.effectiveFrom}.`);
  if (!input.generalRateAppliesConfirmed) blockers.push("Confirme que a alíquota modal é aplicável ao NCM e à operação.");
  if (!input.noSpecificRateBenefitConfirmed) blockers.push("Confirme a inexistência de alíquota específica, redução, benefício, diferimento ou regime especial.");
  if (input.stStatus === "unknown") blockers.push("Confirme se a mercadoria está ou não sujeita a ST/antecipação.");
  if (input.fcpStatus === "unknown") blockers.push(`Confirme a incidência do ${destination.fund.name} para o produto.`);
  if (input.fcpStatus === "general_confirmed" && destination.fund.generalRateBps === null) blockers.push(`O ${destination.fund.name} é produto-específico e não possui percentual geral liberado nesta camada.`);
  return blockers;
}

export function resolveIcmsGeneralNational(input: IcmsGeneralInput): IcmsGeneralResult {
  const destination = icmsStateGeneralProfileByUf.get(input.destination);
  if (!destination) return { status: "blocked", coverageStatus: "partial", reason: "UF de destino não catalogada.", sourceCodes: [], blockers: ["UF de destino inválida."] };
  const sourceCodes = Array.from(new Set([destination.sourceCode, destination.fund.sourceCode].filter((item): item is string => Boolean(item))));
  if (input.stStatus === "applicable") {
    return {
      status: "route_to_st",
      coverageStatus: "partial",
      reason: "A operação foi encaminhada ao motor de substituição tributária; a alíquota modal não pode substituir NCM, CEST, MVA, pauta ou acordo da rota.",
      sourceCodes,
      blockers: ["Use o motor de ST com NCM, CEST, produto, rota, vigência, finalidade e cadastro do destinatário."],
    };
  }
  const blockers = baseBlockers(input, destination);
  if (blockers.length) return { status: "blocked", coverageStatus: "partial", reason: "A referência geral permanece bloqueada até confirmar todos os fatos mínimos.", sourceCodes, blockers };

  const fcpBps = input.fcpStatus === "general_confirmed" ? destination.fund.generalRateBps ?? 0 : 0;
  const amount = input.operationValueCents;
  if (input.origin === input.destination) {
    const internal = applyBps(amount, destination.generalRateBps);
    const fcp = applyBps(amount, fcpBps);
    return {
      status: "calculated_reference",
      coverageStatus: "partial",
      kind: "internal",
      ratesBps: { interstate: null, internal: destination.generalRateBps, fcp: fcpBps },
      amountsCents: { operation: amount, originBase: amount, destinationBase: amount, originIcms: internal, destinationDifal: 0, destinationFcp: fcp, destinationTotal: internal + fcp },
      method: "direct_internal",
      responsibility: "own_internal",
      sourceCodes,
      blockers: [],
    };
  }

  const interstate = interstateRateBps(input.origin, input.destination, input.importedQualified);
  if (!input.finalConsumer || input.purpose === "resale" || input.purpose === "industrialization") {
    return {
      status: "not_applicable",
      coverageStatus: "partial",
      reason: "DIFAL não aplicável neste recorte de finalidade; a operação permanece apenas com a referência interestadual, sem substituir regras de ST ou antecipação.",
      interstateRateBps: interstate,
      sourceCodes: [destination.sourceCode],
      blockers: [],
    };
  }

  const method = input.recipientType === "taxpayer" ? destination.difal.taxpayer : destination.difal.nonTaxpayer;
  if (method === "state_rule_required") {
    return {
      status: "blocked",
      coverageStatus: "partial",
      reason: `A fórmula de DIFAL para destinatário ${input.recipientType === "taxpayer" ? "contribuinte" : "não contribuinte"} em ${input.destination} ainda exige comprovação estadual específica.`,
      sourceCodes,
      blockers: ["Não calcular pela simples diferença de alíquotas; confirmar base única/dupla, imposto por dentro, responsabilidade e vencimento na legislação do destino."],
    };
  }

  const originTaxOnOriginBase = applyBps(amount, interstate);
  const netOfOriginTax = amount - originTaxOnOriginBase;
  const destinationBase = grossUp(netOfOriginTax, destination.generalRateBps);
  const destinationInternal = applyBps(destinationBase, destination.generalRateBps);
  const originIcms = method === "single_base" ? applyBps(destinationBase, interstate) : originTaxOnOriginBase;
  const difal = Math.max(destinationInternal - originIcms, 0);
  const fcp = applyBps(destinationBase, fcpBps);
  return {
    status: "calculated_reference",
    coverageStatus: "partial",
    kind: input.recipientType === "taxpayer" ? "difal_taxpayer" : "difal_non_taxpayer",
    ratesBps: { interstate, internal: destination.generalRateBps, fcp: fcpBps },
    amountsCents: {
      operation: amount,
      originBase: amount,
      destinationBase,
      originIcms,
      destinationDifal: difal,
      destinationFcp: fcp,
      destinationTotal: difal + fcp,
    },
    method,
    responsibility: input.recipientType === "taxpayer" ? "destination_taxpayer" : "origin_remitter",
    sourceCodes: Array.from(new Set([...sourceCodes, destination.difal.sourceCode].filter((item): item is string => Boolean(item)))),
    blockers: [],
  };
}

export const icmsGeneralReferenceRuns: Array<{ code: string; input: IcmsGeneralInput; expectedStatus: IcmsGeneralResult["status"] }> = [
  {
    code: "INTERSTATE-7",
    input: { origin: "SP", destination: "BA", operationDate: "2026-07-30", operationValueCents: 100_000, importedQualified: false, recipientType: "taxpayer", finalConsumer: false, purpose: "resale", ncm: "87089990", generalRateAppliesConfirmed: true, noSpecificRateBenefitConfirmed: true, stStatus: "not_applicable_confirmed", fcpStatus: "not_applicable_confirmed" },
    expectedStatus: "not_applicable",
  },
  {
    code: "DF-DIFAL-TAXPAYER",
    input: { origin: "SP", destination: "DF", operationDate: "2026-07-30", operationValueCents: 100_000, importedQualified: false, recipientType: "taxpayer", finalConsumer: true, purpose: "fixed_asset", ncm: "84713012", generalRateAppliesConfirmed: true, noSpecificRateBenefitConfirmed: true, stStatus: "not_applicable_confirmed", fcpStatus: "not_applicable_confirmed" },
    expectedStatus: "calculated_reference",
  },
  {
    code: "RJ-INTERNAL-FECP",
    input: { origin: "RJ", destination: "RJ", operationDate: "2026-07-30", operationValueCents: 100_000, importedQualified: false, recipientType: "taxpayer", finalConsumer: false, purpose: "resale", ncm: "84713012", generalRateAppliesConfirmed: true, noSpecificRateBenefitConfirmed: true, stStatus: "not_applicable_confirmed", fcpStatus: "general_confirmed" },
    expectedStatus: "calculated_reference",
  },
  {
    code: "ST-SAFE-ROUTE",
    input: { origin: "SP", destination: "MG", operationDate: "2026-07-30", operationValueCents: 100_000, importedQualified: false, recipientType: "taxpayer", finalConsumer: false, purpose: "resale", ncm: "87089990", generalRateAppliesConfirmed: true, noSpecificRateBenefitConfirmed: true, stStatus: "applicable", fcpStatus: "unknown" },
    expectedStatus: "route_to_st",
  },
];

export function validateIcmsGeneralNational() {
  const errors: string[] = [];
  if (icmsStateGeneralProfiles.length !== 27 || new Set(icmsStateGeneralProfiles.map((item) => item.uf)).size !== 27) errors.push("state_profiles_not_27");
  if (icmsGeneralSources.some((item) => !item.url.startsWith("https://") || !item.legalDevice || item.checkedAt !== ICMS_GENERAL_NATIONAL_CHECKED_AT)) errors.push("invalid_source_metadata");
  for (const item of icmsStateGeneralProfiles) {
    if (!icmsGeneralSources.some((candidate) => candidate.code === item.sourceCode)) errors.push(`${item.uf}:missing_general_source`);
    if (item.generalRateBps < 1_700 || item.generalRateBps > 2_300) errors.push(`${item.uf}:invalid_general_rate`);
    if (item.fund.status === "general_confirmed" && (!item.fund.generalRateBps || !item.fund.sourceCode)) errors.push(`${item.uf}:invalid_general_fund`);
  }
  for (const run of icmsGeneralReferenceRuns) {
    const result = resolveIcmsGeneralNational(run.input);
    if (result.status !== run.expectedStatus) errors.push(`${run.code}:unexpected_${result.status}`);
  }
  return { passed: errors.length === 0, errors };
}

export function icmsGeneralNationalMetrics() {
  return {
    states: icmsStateGeneralProfiles.length,
    officialSources: icmsGeneralSources.length,
    difalTaxpayerMethods: icmsStateGeneralProfiles.filter((item) => item.difal.taxpayer !== "state_rule_required").length,
    difalNonTaxpayerMethods: icmsStateGeneralProfiles.filter((item) => item.difal.nonTaxpayer !== "state_rule_required").length,
    generalFundRates: icmsStateGeneralProfiles.filter((item) => item.fund.status === "general_confirmed").length,
    productSpecificFunds: icmsStateGeneralProfiles.filter((item) => item.fund.status === "product_specific").length,
    referenceRuns: icmsGeneralReferenceRuns.length,
  };
}

export async function hashIcmsGeneralNational() {
  const payload = JSON.stringify({
    version: ICMS_GENERAL_NATIONAL_VERSION,
    checkedAt: ICMS_GENERAL_NATIONAL_CHECKED_AT,
    profiles: icmsStateGeneralProfiles,
    sources: icmsGeneralSources,
    runs: icmsGeneralReferenceRuns.map((run) => ({ code: run.code, input: run.input, result: resolveIcmsGeneralNational(run.input) })),
  });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

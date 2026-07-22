import { calculateRepresentativeStMemory } from "./st-sp-mg-legal.ts";

export const ST_AUTO_PARTS_PRIORITY_BATCH_VERSION = "2026.07.21-v63";
export const ST_AUTO_PARTS_PRIORITY_BATCH_CHECKED_AT = "2026-07-21";

type PriorityDestination = "RJ" | "PR" | "SC" | "RS" | "GO" | "BA";

export type StAutoPartsPrioritySource = {
  code: string;
  title: string;
  publisher: string;
  url: string;
  checkedAt: typeof ST_AUTO_PARTS_PRIORITY_BATCH_CHECKED_AT;
  proves: string[];
};

export const stAutoPartsPrioritySources: StAutoPartsPrioritySource[] = [
  {
    code: "CONFAZ-PROTOCOL-41-2008",
    title: "Protocolo ICMS 41/08 — operações interestaduais com autopeças",
    publisher: "CONFAZ",
    url: "https://www.confaz.fazenda.gov.br/legislacao/protocolos/2008/pt041_08",
    checkedAt: ST_AUTO_PARTS_PRIORITY_BATCH_CHECKED_AT,
    proves: ["destinos atualmente abrangidos", "retirada de GO, SC e RS", "uso especificamente automotivo", "exceções por destinatário", "base por preço ou MVA", "prazo-base de recolhimento"],
  },
  {
    code: "CONFAZ-CONV-142-2018-ANNEX-II",
    title: "Convênio ICMS 142/18 — Anexo II, autopeças",
    publisher: "CONFAZ",
    url: "https://www.confaz.fazenda.gov.br/legislacao/convenios/2018/CV142_18",
    checkedAt: ST_AUTO_PARTS_PRIORITY_BATCH_CHECKED_AT,
    proves: ["segmento nacional de autopeças", "CEST e NCM passíveis de ST", "identidade do caso CEST 01.075.00 / NCM 8708"],
  },
  {
    code: "RJ-RICMS-LIVRO-II-ANNEX-I-AUTO-PARTS",
    title: "RICMS/RJ — Livro II, Anexo I, autopeças",
    publisher: "SEFAZ-RJ",
    url: "https://portal.fazenda.rj.gov.br/icms/wp-content/uploads/sites/42/2023/10/anexo_I_livroII_2.pdf",
    checkedAt: ST_AUTO_PARTS_PRIORITY_BATCH_CHECKED_AT,
    proves: ["CEST 01.075.00", "NCM 8708", "MVA original de 71,78% nos demais casos", "MVA ajustada de 88,96% para operação interestadual de 12%"],
  },
  {
    code: "RJ-ICMS-INTERNAL-RATES-FECP",
    title: "Alíquotas internas do ICMS e FECP",
    publisher: "SEFAZ-RJ",
    url: "https://portal.fazenda.rj.gov.br/pagamentos/aliquotas-internas/",
    checkedAt: ST_AUTO_PARTS_PRIORITY_BATCH_CHECKED_AT,
    proves: ["alíquota interna padrão de 20%", "adicional geral de FECP de 2%"],
  },
  {
    code: "BA-RICMS-ANNEX-I-2026",
    title: "RICMS/BA — Anexo 1 vigente em 2026",
    publisher: "SEFAZ-BA",
    url: "https://mbusca.sefaz.ba.gov.br/ditri/normas_complementares/decretos/decreto_2012_13780_ricms_anexo_1_vigente_2026.pdf",
    checkedAt: ST_AUTO_PARTS_PRIORITY_BATCH_CHECKED_AT,
    proves: ["internalização estadual do segmento", "tabela baiana a ser consultada por CEST e NCM", "necessidade de autorização em hipóteses de fidelidade"],
  },
  {
    code: "PR-RICMS-DECREE-7871-2017",
    title: "Regulamento do ICMS do Paraná — Decreto 7.871/2017",
    publisher: "Governo do Paraná",
    url: "https://www.legislacao.pr.gov.br/legislacao/listarAtosAno.do?action=exibir&codAto=182608&codTipoAto=11&tipoVisualizacao=original",
    checkedAt: ST_AUTO_PARTS_PRIORITY_BATCH_CHECKED_AT,
    proves: ["regulamento estadual de destino", "necessidade de conferir a redação consolidada do Anexo IX antes do cálculo"],
  },
  {
    code: "SC-RICMS-ANNEX-1A-CURRENT",
    title: "RICMS/SC — Anexo 1-A vigente",
    publisher: "SEF-SC",
    url: "https://legislacao.sef.sc.gov.br/html/regulamentos/icms/ricms_01_01_a.htm",
    checkedAt: ST_AUTO_PARTS_PRIORITY_BATCH_CHECKED_AT,
    proves: ["Seção II de autopeças revogada", "impossibilidade de reutilizar tabela histórica como regra atual"],
  },
];

const sourceByCode = new Map(stAutoPartsPrioritySources.map((source) => [source.code, source]));

export type StAutoPartsPriorityRoute = {
  destination: PriorityDestination;
  route: `SP-${PriorityDestination}`;
  agreementStatus: "protocol_41_active" | "outside_protocol_41";
  agreementReason: string;
  product: { cest: "01.075.00"; ncm: "8708"; description: string; scope: "representative_identity_only" };
  parameterMethod: "protocol_mva" | "destination_internal_mva" | "destination_own_treatment_required";
  mvaOriginalBps: number | null;
  adjustedMvaBpsFor12: number | null;
  officialInternalRateBps: number | null;
  officialFcpRateBps: number | null;
  sourceCodes: string[];
  confirmedInputs: string[];
  remainingBlockers: string[];
  syntheticReference: null | ReturnType<typeof calculateRepresentativeStMemory>;
};

const representativeProduct = {
  cest: "01.075.00" as const,
  ncm: "8708" as const,
  description: "Partes e acessórios dos veículos automóveis das posições 8701 a 8705",
  scope: "representative_identity_only" as const,
};

const rjReference = calculateRepresentativeStMemory({
  operationCents: 100_000,
  ownIcmsBaseCents: 100_000,
  mvaOriginalBps: 7_178,
  interstateRateBps: 1_200,
  internalRateBps: 2_000,
  fcpRateBps: 200,
  adjustMva: true,
});

const commonRealOperationBlockers = [
  "confirmar descrição, NCM, CEST e uso especificamente automotivo",
  "confirmar regime e papel do remetente e do destinatário",
  "afastar industrialização, transferência não varejista, benefício e regime especial",
  "confirmar vigência, preço sugerido ou base por MVA, frete e demais componentes",
];

export const stAutoPartsPriorityRoutes: StAutoPartsPriorityRoute[] = [
  {
    destination: "RJ",
    route: "SP-RJ",
    agreementStatus: "protocol_41_active",
    agreementReason: "Rio de Janeiro permanece entre os destinos da cláusula primeira do Protocolo 41/08.",
    product: representativeProduct,
    parameterMethod: "protocol_mva",
    mvaOriginalBps: 7_178,
    adjustedMvaBpsFor12: 8_896,
    officialInternalRateBps: 2_000,
    officialFcpRateBps: 200,
    sourceCodes: ["CONFAZ-PROTOCOL-41-2008", "CONFAZ-CONV-142-2018-ANNEX-II", "RJ-RICMS-LIVRO-II-ANNEX-I-AUTO-PARTS", "RJ-ICMS-INTERNAL-RATES-FECP"],
    confirmedInputs: ["destino abrangido", "identidade representativa CEST 01.075.00 / NCM 8708", "MVA original e ajustada", "alíquota interna padrão", "FECP geral"],
    remainingBlockers: [...commonRealOperationBlockers, "confirmar que a operação não se enquadra na MVA de fidelidade de 36,56%"],
    syntheticReference: rjReference,
  },
  {
    destination: "PR",
    route: "SP-PR",
    agreementStatus: "protocol_41_active",
    agreementReason: "Paraná permanece entre os destinos do Protocolo 41/08, mas o próprio protocolo remete a MVA à legislação interna paranaense.",
    product: representativeProduct,
    parameterMethod: "destination_internal_mva",
    mvaOriginalBps: null,
    adjustedMvaBpsFor12: null,
    officialInternalRateBps: null,
    officialFcpRateBps: null,
    sourceCodes: ["CONFAZ-PROTOCOL-41-2008", "CONFAZ-CONV-142-2018-ANNEX-II", "PR-RICMS-DECREE-7871-2017"],
    confirmedInputs: ["destino abrangido", "identidade representativa", "MVA obrigatoriamente definida pela lei interna do Paraná"],
    remainingBlockers: [...commonRealOperationBlockers, "localizar a posição vigente do CEST 01.075.00 no Anexo IX consolidado", "confirmar alíquota interna e FCP"],
    syntheticReference: null,
  },
  {
    destination: "BA",
    route: "SP-BA",
    agreementStatus: "protocol_41_active",
    agreementReason: "Bahia permanece entre os destinos do Protocolo 41/08, com MVA remetida à legislação interna desde novembro de 2024.",
    product: representativeProduct,
    parameterMethod: "destination_internal_mva",
    mvaOriginalBps: null,
    adjustedMvaBpsFor12: null,
    officialInternalRateBps: null,
    officialFcpRateBps: null,
    sourceCodes: ["CONFAZ-PROTOCOL-41-2008", "CONFAZ-CONV-142-2018-ANNEX-II", "BA-RICMS-ANNEX-I-2026"],
    confirmedInputs: ["destino abrangido", "identidade representativa", "MVA obrigatoriamente definida pela lei interna da Bahia"],
    remainingBlockers: [...commonRealOperationBlockers, "congelar a linha vigente do CEST 01.075.00 na tabela baiana", "confirmar alíquota interna, FCP e autorização de fidelidade"],
    syntheticReference: null,
  },
  {
    destination: "SC",
    route: "SP-SC",
    agreementStatus: "outside_protocol_41",
    agreementReason: "Santa Catarina denunciou os Protocolos 41/08 e 97/10 em 2020; a seção estadual de autopeças consta como revogada.",
    product: representativeProduct,
    parameterMethod: "destination_own_treatment_required",
    mvaOriginalBps: null,
    adjustedMvaBpsFor12: null,
    officialInternalRateBps: null,
    officialFcpRateBps: null,
    sourceCodes: ["CONFAZ-PROTOCOL-41-2008", "SC-RICMS-ANNEX-1A-CURRENT"],
    confirmedInputs: ["rota fora do Protocolo 41/08", "Seção II estadual de autopeças revogada"],
    remainingBlockers: ["não aplicar MVA histórica", "determinar tratamento próprio vigente da operação em SC", "confirmar antecipação, DIFAL ou tributação normal conforme os fatos"],
    syntheticReference: null,
  },
  {
    destination: "RS",
    route: "SP-RS",
    agreementStatus: "outside_protocol_41",
    agreementReason: "Rio Grande do Sul foi excluído do Protocolo 41/08 com efeitos a partir de 1º de novembro de 2024.",
    product: representativeProduct,
    parameterMethod: "destination_own_treatment_required",
    mvaOriginalBps: null,
    adjustedMvaBpsFor12: null,
    officialInternalRateBps: null,
    officialFcpRateBps: null,
    sourceCodes: ["CONFAZ-PROTOCOL-41-2008", "CONFAZ-CONV-142-2018-ANNEX-II"],
    confirmedInputs: ["rota excluída do Protocolo 41/08 desde 01/11/2024", "identidade representativa congelada apenas para triagem"],
    remainingBlockers: ["não aplicar protocolo ou MVA anteriores à exclusão", "determinar tratamento próprio vigente no RS", "confirmar antecipação, DIFAL ou tributação normal conforme os fatos"],
    syntheticReference: null,
  },
  {
    destination: "GO",
    route: "SP-GO",
    agreementStatus: "outside_protocol_41",
    agreementReason: "Goiás denunciou os Protocolos 41/08 e 97/10 em 2017 e não integra a relação atual de destinos.",
    product: representativeProduct,
    parameterMethod: "destination_own_treatment_required",
    mvaOriginalBps: null,
    adjustedMvaBpsFor12: null,
    officialInternalRateBps: null,
    officialFcpRateBps: null,
    sourceCodes: ["CONFAZ-PROTOCOL-41-2008", "CONFAZ-CONV-142-2018-ANNEX-II"],
    confirmedInputs: ["rota fora do Protocolo 41/08", "identidade representativa congelada apenas para triagem"],
    remainingBlockers: ["não aplicar MVA do protocolo denunciado", "determinar tratamento próprio vigente em Goiás", "confirmar antecipação, DIFAL ou tributação normal conforme os fatos"],
    syntheticReference: null,
  },
];

export const stAutoPartsPriorityRouteByDestination = new Map(stAutoPartsPriorityRoutes.map((route) => [route.destination, route]));

export function stAutoPartsPriorityBatchMetrics() {
  return {
    routesInBatch: stAutoPartsPriorityRoutes.length,
    activeAgreementRoutes: stAutoPartsPriorityRoutes.filter((route) => route.agreementStatus === "protocol_41_active").length,
    outsideProtocolRoutes: stAutoPartsPriorityRoutes.filter((route) => route.agreementStatus === "outside_protocol_41").length,
    destinationMvaOverrides: stAutoPartsPriorityRoutes.filter((route) => route.parameterMethod === "destination_internal_mva").length,
    productIdentitiesFrozen: stAutoPartsPriorityRoutes.filter((route) => route.product.scope === "representative_identity_only").length,
    syntheticReferencesReproduced: stAutoPartsPriorityRoutes.filter((route) => route.syntheticReference !== null).length,
    officialSources: stAutoPartsPrioritySources.length,
  };
}

export function validateStAutoPartsPriorityBatch() {
  const errors: string[] = [];
  if (stAutoPartsPriorityRoutes.length !== 6 || new Set(stAutoPartsPriorityRoutes.map((route) => route.destination)).size !== 6) errors.push("auto_parts_priority_batch_must_have_six_unique_routes");
  if (stAutoPartsPrioritySources.length !== 7 || new Set(stAutoPartsPrioritySources.map((source) => source.code)).size !== 7) errors.push("auto_parts_sources_must_be_unique");
  if (stAutoPartsPrioritySources.some((source) => !source.url.startsWith("https://") || source.proves.length === 0)) errors.push("auto_parts_source_must_be_https_with_scope");
  for (const route of stAutoPartsPriorityRoutes) {
    if (route.sourceCodes.some((code) => !sourceByCode.has(code))) errors.push(`unknown_auto_parts_source:${route.destination}`);
    if (route.remainingBlockers.length === 0) errors.push(`real_operation_gate_required:${route.destination}`);
    if (route.product.cest !== "01.075.00" || route.product.ncm !== "8708") errors.push(`representative_identity_changed:${route.destination}`);
  }
  if (stAutoPartsPriorityRoutes.filter((route) => route.agreementStatus === "protocol_41_active").map((route) => route.destination).join(",") !== "RJ,PR,BA") errors.push("active_protocol_routes_changed");
  if (stAutoPartsPriorityRoutes.filter((route) => route.agreementStatus === "outside_protocol_41").map((route) => route.destination).join(",") !== "SC,RS,GO") errors.push("outside_protocol_routes_changed");
  const rj = stAutoPartsPriorityRouteByDestination.get("RJ");
  if (rj?.syntheticReference?.mvaAppliedBps !== 8_896 || rj.syntheticReference.destinationTotalCents !== 29_571) errors.push("rj_auto_parts_reference_did_not_reproduce");
  if (stAutoPartsPriorityRoutes.some((route) => route.destination !== "RJ" && route.syntheticReference !== null)) errors.push("only_rj_auto_parts_reference_can_be_reproduced_in_v63");
  return { passed: errors.length === 0, errors };
}

export async function hashStAutoPartsPriorityBatch() {
  const payload = JSON.stringify({ version: ST_AUTO_PARTS_PRIORITY_BATCH_VERSION, sources: stAutoPartsPrioritySources, routes: stAutoPartsPriorityRoutes });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

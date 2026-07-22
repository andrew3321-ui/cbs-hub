import { calculateRepresentativeStMemory } from "./st-sp-mg-legal.ts";

export const ST_AUTO_PARTS_PRIORITY_BATCH_VERSION = "2026.07.22-v65";
export const ST_AUTO_PARTS_PRIORITY_BATCH_CHECKED_AT = "2026-07-22";

export const ST_AUTO_PARTS_DESTINATIONS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT",
  "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "TO",
] as const;

export type AutoPartsDestination = typeof ST_AUTO_PARTS_DESTINATIONS[number];

export const ST_AUTO_PARTS_PROTOCOL_41_DESTINATIONS = [
  "AC", "AL", "AP", "AM", "BA", "DF", "MA", "MG", "MT", "PA", "PB", "PI", "PR", "RJ", "RR",
] as const satisfies readonly AutoPartsDestination[];

export const ST_AUTO_PARTS_DESTINATION_MVA_UFS = ["AL", "BA", "MT", "PI", "PR"] as const satisfies readonly AutoPartsDestination[];
export const ST_AUTO_PARTS_SP_PROTOCOL_EXCLUDED_CESTS_2026 = ["01.015.00"] as const;

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
    proves: [
      "15 destinos atualmente abrangidos nas saídas de São Paulo",
      "11 destinos fora da relação vigente",
      "uso especificamente automotivo e sujeição interna no destino",
      "MVA original de 36,56% em fidelidade ou 71,78% nos demais casos",
      "MVA definida pela legislação de AL, BA, MT, PI e PR",
      "exceções por industrialização, transferência e destinatário",
      "CEST 01.015.00 fora do protocolo quando São Paulo é origem ou destino desde 2026",
    ],
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
const activeDestinationSet = new Set<AutoPartsDestination>(ST_AUTO_PARTS_PROTOCOL_41_DESTINATIONS);
const destinationMvaSet = new Set<AutoPartsDestination>(ST_AUTO_PARTS_DESTINATION_MVA_UFS);

export type StAutoPartsPriorityRoute = {
  destination: AutoPartsDestination;
  route: `SP-${AutoPartsDestination}`;
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
  "confirmar que a mercadoria está sujeita à ST nas operações internas do destino",
  "confirmar regime e papel do remetente e do destinatário",
  "afastar industrialização, transferência não varejista, benefício e regime especial",
  "confirmar vigência, preço sugerido ou base por MVA, frete e demais componentes",
];

const outsideReasons: Partial<Record<AutoPartsDestination, string>> = {
  ES: "Espírito Santo denunciou o Protocolo 41/08 com efeitos em 2022 e não consta na relação vigente de destinos.",
  GO: "Goiás denunciou os Protocolos 41/08 e 97/10 em 2017 e não integra a relação atual de destinos.",
  RS: "Rio Grande do Sul foi excluído do Protocolo 41/08 com efeitos a partir de 1º de novembro de 2024.",
  SC: "Santa Catarina denunciou os Protocolos 41/08 e 97/10 em 2020; a seção estadual de autopeças consta como revogada.",
};

function buildAutoPartsRoute(destination: AutoPartsDestination): StAutoPartsPriorityRoute {
  const active = activeDestinationSet.has(destination);
  const destinationMva = destinationMvaSet.has(destination);
  const agreementStatus = active ? "protocol_41_active" as const : "outside_protocol_41" as const;
  const parameterMethod = !active
    ? "destination_own_treatment_required" as const
    : destinationMva
      ? "destination_internal_mva" as const
      : "protocol_mva" as const;

  const route: StAutoPartsPriorityRoute = {
    destination,
    route: `SP-${destination}`,
    agreementStatus,
    agreementReason: active
      ? `${destination} consta na relação vigente da cláusula primeira do Protocolo 41/08 para operações interestaduais de autopeças.`
      : outsideReasons[destination] ?? `${destination} não consta na relação vigente de destinos da cláusula primeira do Protocolo 41/08.`,
    product: representativeProduct,
    parameterMethod,
    mvaOriginalBps: active && !destinationMva ? 7_178 : null,
    adjustedMvaBpsFor12: null,
    officialInternalRateBps: null,
    officialFcpRateBps: null,
    sourceCodes: ["CONFAZ-PROTOCOL-41-2008", "CONFAZ-CONV-142-2018-ANNEX-II"],
    confirmedInputs: active
      ? [
          "destino abrangido pelo texto vigente do Protocolo 41/08",
          "identidade representativa CEST 01.075.00 / NCM 8708",
          destinationMva ? "MVA obrigatoriamente definida pela legislação interna do destino" : "MVA original protocolar de 71,78% nos demais casos",
        ]
      : ["rota fora da relação vigente do Protocolo 41/08", "identidade representativa congelada apenas para triagem"],
    remainingBlockers: active
      ? [
          ...commonRealOperationBlockers,
          destinationMva ? `congelar a linha estadual vigente de ${destination} para o CEST 01.075.00` : "confirmar se a operação usa MVA de fidelidade de 36,56% ou MVA geral de 71,78%",
          "confirmar alíquota interna, FCP e MVA ajustada publicados pelo destino",
        ]
      : [
          "não aplicar automaticamente o Protocolo 41/08 nem MVA histórica",
          `determinar o tratamento próprio vigente da operação em ${destination}`,
          "confirmar ST interna, antecipação, DIFAL ou tributação normal conforme os fatos",
        ],
    syntheticReference: null,
  };

  if (destination === "RJ") {
    route.adjustedMvaBpsFor12 = 8_896;
    route.officialInternalRateBps = 2_000;
    route.officialFcpRateBps = 200;
    route.sourceCodes.push("RJ-RICMS-LIVRO-II-ANNEX-I-AUTO-PARTS", "RJ-ICMS-INTERNAL-RATES-FECP");
    route.confirmedInputs = ["destino abrangido", "identidade representativa CEST 01.075.00 / NCM 8708", "MVA original e ajustada", "alíquota interna padrão", "FECP geral"];
    route.remainingBlockers = [...commonRealOperationBlockers, "confirmar que a operação não se enquadra na MVA de fidelidade de 36,56%"];
    route.syntheticReference = rjReference;
  } else if (destination === "PR") {
    route.sourceCodes.push("PR-RICMS-DECREE-7871-2017");
  } else if (destination === "BA") {
    route.sourceCodes.push("BA-RICMS-ANNEX-I-2026");
  } else if (destination === "SC") {
    route.sourceCodes.push("SC-RICMS-ANNEX-1A-CURRENT");
  }

  return route;
}

export const stAutoPartsPriorityRoutes: StAutoPartsPriorityRoute[] = ST_AUTO_PARTS_DESTINATIONS.map(buildAutoPartsRoute);
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
  if (stAutoPartsPriorityRoutes.length !== 26 || new Set(stAutoPartsPriorityRoutes.map((route) => route.destination)).size !== 26) errors.push("auto_parts_batch_must_have_twenty_six_unique_routes");
  if (stAutoPartsPrioritySources.length !== 7 || new Set(stAutoPartsPrioritySources.map((source) => source.code)).size !== 7) errors.push("auto_parts_sources_must_be_unique");
  if (stAutoPartsPrioritySources.some((source) => !source.url.startsWith("https://") || source.proves.length === 0)) errors.push("auto_parts_source_must_be_https_with_scope");
  for (const route of stAutoPartsPriorityRoutes) {
    if (route.sourceCodes.some((code) => !sourceByCode.has(code))) errors.push(`unknown_auto_parts_source:${route.destination}`);
    if (route.remainingBlockers.length === 0) errors.push(`real_operation_gate_required:${route.destination}`);
    if (route.product.cest !== "01.075.00" || route.product.ncm !== "8708") errors.push(`representative_identity_changed:${route.destination}`);
    if (route.agreementStatus === "outside_protocol_41" && (route.mvaOriginalBps !== null || route.syntheticReference !== null)) errors.push(`outside_route_leaked_protocol_value:${route.destination}`);
  }
  const active = stAutoPartsPriorityRoutes.filter((route) => route.agreementStatus === "protocol_41_active").map((route) => route.destination);
  const outside = stAutoPartsPriorityRoutes.filter((route) => route.agreementStatus === "outside_protocol_41").map((route) => route.destination);
  if (active.join(",") !== ST_AUTO_PARTS_PROTOCOL_41_DESTINATIONS.join(",")) errors.push("active_protocol_routes_changed");
  if (active.length !== 15 || outside.length !== 11) errors.push("protocol_route_partition_changed");
  if (stAutoPartsPriorityRoutes.filter((route) => route.parameterMethod === "destination_internal_mva").map((route) => route.destination).join(",") !== ST_AUTO_PARTS_DESTINATION_MVA_UFS.join(",")) errors.push("destination_mva_routes_changed");
  const rj = stAutoPartsPriorityRouteByDestination.get("RJ");
  if (rj?.syntheticReference?.mvaAppliedBps !== 8_896 || rj.syntheticReference.destinationTotalCents !== 29_571) errors.push("rj_auto_parts_reference_did_not_reproduce");
  if (stAutoPartsPriorityRoutes.some((route) => route.destination !== "RJ" && route.syntheticReference !== null)) errors.push("only_rj_auto_parts_reference_can_be_reproduced_in_v65");
  if (!ST_AUTO_PARTS_SP_PROTOCOL_EXCLUDED_CESTS_2026.includes("01.015.00")) errors.push("sp_2026_cest_exception_missing");
  return { passed: errors.length === 0, errors };
}

export async function hashStAutoPartsPriorityBatch() {
  const payload = JSON.stringify({
    version: ST_AUTO_PARTS_PRIORITY_BATCH_VERSION,
    protocolDestinations: ST_AUTO_PARTS_PROTOCOL_41_DESTINATIONS,
    destinationMvaUfs: ST_AUTO_PARTS_DESTINATION_MVA_UFS,
    excludedCests2026: ST_AUTO_PARTS_SP_PROTOCOL_EXCLUDED_CESTS_2026,
    sources: stAutoPartsPrioritySources,
    routes: stAutoPartsPriorityRoutes,
  });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

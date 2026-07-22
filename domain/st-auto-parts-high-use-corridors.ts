import { calculateRepresentativeStMemory } from "./st-sp-mg-legal.ts";

export const ST_AUTO_PARTS_HIGH_USE_CORRIDORS_VERSION = "2026.07.22-v66";
export const ST_AUTO_PARTS_HIGH_USE_CORRIDORS_CHECKED_AT = "2026-07-22";

export const ST_AUTO_PARTS_HIGH_USE_CORRIDORS = [
  ["SP", "MG"],
  ["SP", "RJ"],
  ["SP", "PR"],
  ["SP", "SC"],
  ["SP", "RS"],
  ["SP", "GO"],
  ["SP", "BA"],
  ["MG", "RJ"],
  ["PR", "SC"],
  ["SC", "RS"],
  ["BA", "PE"],
  ["GO", "DF"],
] as const;

export type StAutoPartsHighUseUf = typeof ST_AUTO_PARTS_HIGH_USE_CORRIDORS[number][number];

export const ST_AUTO_PARTS_PROTOCOL_41_CURRENT_PARTIES = [
  "AC", "AL", "AP", "AM", "BA", "DF", "MA", "MG", "MT", "PA", "PB", "PI", "PR", "RJ", "RR", "SP",
] as const;

export const ST_AUTO_PARTS_PROTOCOL_41_DESTINATION_MVA_UFS = ["AL", "MT", "PI", "PR", "SP"] as const;

export type StAutoPartsHighUseSource = {
  code: string;
  title: string;
  publisher: string;
  url: string;
  checkedAt: typeof ST_AUTO_PARTS_HIGH_USE_CORRIDORS_CHECKED_AT;
  proves: string[];
};

export const stAutoPartsHighUseSources: StAutoPartsHighUseSource[] = [
  {
    code: "CONFAZ-PROTOCOL-41-2008",
    title: "Protocolo ICMS 41/08 — operações interestaduais com autopeças",
    publisher: "CONFAZ",
    url: "https://www.confaz.fazenda.gov.br/legislacao/protocolos/2008/pt041_08",
    checkedAt: ST_AUTO_PARTS_HIGH_USE_CORRIDORS_CHECKED_AT,
    proves: [
      "unidades federadas atualmente alcançadas pelo protocolo",
      "uso especificamente automotivo e sujeição interna no destino",
      "MVA original de 36,56% em fidelidade ou 71,78% nos demais casos",
      "MVA definida pela legislação interna de AL, MT, PI, PR e SP",
      "denúncias de GO e SC e exclusão do RS",
      "exceções de destinatário e do CEST 01.015.00 quando São Paulo é origem ou destino",
    ],
  },
  {
    code: "CONFAZ-CONV-142-2018-ANNEX-II",
    title: "Convênio ICMS 142/18 — Anexo II, autopeças",
    publisher: "CONFAZ",
    url: "https://www.confaz.fazenda.gov.br/legislacao/convenios/2018/CV142_18",
    checkedAt: ST_AUTO_PARTS_HIGH_USE_CORRIDORS_CHECKED_AT,
    proves: ["identidade nacional do segmento", "CEST 01.075.00", "NCM 8708", "descrição do produto representativo"],
  },
  {
    code: "MG-RICMS-2023-ANNEX-VII-AUTO-PARTS",
    title: "RICMS/MG 2023 — Anexo VII, autopeças",
    publisher: "SEF-MG",
    url: "https://www.fazenda.mg.gov.br/empresas/legislacao_tributaria/ricms_2023_seco/anexovii2023_4.html",
    checkedAt: ST_AUTO_PARTS_HIGH_USE_CORRIDORS_CHECKED_AT,
    proves: ["âmbito interestadual vigente incluindo RJ e SP", "CEST 01.075.00 / NCM 8708", "MVA original de 71,78%"],
  },
  {
    code: "RJ-RICMS-LIVRO-II-ANNEX-I-AUTO-PARTS",
    title: "RICMS/RJ — Livro II, Anexo I, autopeças",
    publisher: "SEFAZ-RJ",
    url: "https://portal.fazenda.rj.gov.br/icms/wp-content/uploads/sites/42/2023/10/anexo_I_livroII_2.pdf",
    checkedAt: ST_AUTO_PARTS_HIGH_USE_CORRIDORS_CHECKED_AT,
    proves: ["CEST 01.075.00 / NCM 8708", "MVA original de 71,78%", "MVA ajustada de 88,96% na operação de 12%"],
  },
  {
    code: "RJ-ICMS-INTERNAL-RATES-FECP",
    title: "Alíquotas internas do ICMS e FECP",
    publisher: "SEFAZ-RJ",
    url: "https://portal.fazenda.rj.gov.br/pagamentos/aliquotas-internas/",
    checkedAt: ST_AUTO_PARTS_HIGH_USE_CORRIDORS_CHECKED_AT,
    proves: ["alíquota interna padrão de 20%", "adicional geral de FECP de 2%"],
  },
  {
    code: "SP-PORTARIA-CAT-68-2019-ANNEX-XIV",
    title: "Portaria CAT 68/2019 — Anexo XIV, autopeças",
    publisher: "SEFAZ-SP",
    url: "https://legislacao.fazenda.sp.gov.br/Paginas/Portaria-CAT-68-de-2019.aspx",
    checkedAt: ST_AUTO_PARTS_HIGH_USE_CORRIDORS_CHECKED_AT,
    proves: ["CEST 01.075.00 / NCM 8708 na lista paulista atual", "revogação do Anexo XIV com efeitos em 1º de outubro de 2026"],
  },
  {
    code: "BA-RICMS-ANNEX-I-2026",
    title: "RICMS/BA — Anexo 1 vigente em 2026",
    publisher: "SEFAZ-BA",
    url: "https://mbusca.sefaz.ba.gov.br/ditri/normas_complementares/decretos/decreto_2012_13780_ricms_anexo_1_vigente_2026.pdf",
    checkedAt: ST_AUTO_PARTS_HIGH_USE_CORRIDORS_CHECKED_AT,
    proves: ["fonte estadual de destino para conferir lista, alíquota, FCP, benefícios e exceções"],
  },
  {
    code: "PR-RICMS-DECREE-7871-2017",
    title: "Regulamento do ICMS do Paraná — Decreto 7.871/2017",
    publisher: "Governo do Paraná",
    url: "https://www.legislacao.pr.gov.br/legislacao/listarAtosAno.do?action=exibir&codAto=182608&codTipoAto=11&tipoVisualizacao=original",
    checkedAt: ST_AUTO_PARTS_HIGH_USE_CORRIDORS_CHECKED_AT,
    proves: ["fonte estadual obrigatória para a MVA de destino e demais parâmetros do Paraná"],
  },
  {
    code: "SC-RICMS-ANNEX-1A-CURRENT",
    title: "RICMS/SC — Anexo 1-A vigente",
    publisher: "SEF-SC",
    url: "https://legislacao.sef.sc.gov.br/html/regulamentos/icms/ricms_01_01_a.htm",
    checkedAt: ST_AUTO_PARTS_HIGH_USE_CORRIDORS_CHECKED_AT,
    proves: ["seção estadual de autopeças revogada", "tabela histórica não pode ser reutilizada como regra atual"],
  },
  {
    code: "PE-AUTO-PARTS-CONSOLIDATED",
    title: "Autopeças — legislação consolidada por assunto",
    publisher: "SEFAZ-PE",
    url: "https://www.sefaz.pe.gov.br/Legislacao/Tributaria/Consolidada-Por-Assunto/Paginas/Autopecas.aspx",
    checkedAt: ST_AUTO_PARTS_HIGH_USE_CORRIDORS_CHECKED_AT,
    proves: ["tratamento estadual no Anexo 37, artigos 99 a 101, do Decreto 44.650/2017", "regra própria deve ser conferida fora do Protocolo 41/08"],
  },
];

const sourceByCode = new Map(stAutoPartsHighUseSources.map((source) => [source.code, source]));
const currentPartySet = new Set<string>(ST_AUTO_PARTS_PROTOCOL_41_CURRENT_PARTIES);
const destinationMvaSet = new Set<string>(ST_AUTO_PARTS_PROTOCOL_41_DESTINATION_MVA_UFS);

const representativeProduct = {
  cest: "01.075.00" as const,
  ncm: "8708" as const,
  description: "Partes e acessórios dos veículos automóveis das posições 8701 a 8705",
  scope: "representative_identity_only" as const,
};

const mgReference = calculateRepresentativeStMemory({
  operationCents: 100_000,
  ownIcmsBaseCents: 100_000,
  mvaOriginalBps: 7_178,
  interstateRateBps: 1_200,
  internalRateBps: 1_800,
  fcpRateBps: 0,
  adjustMva: true,
});

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
  "confirmar sujeição à ST nas operações internas do destino",
  "confirmar regime e papel do remetente e do destinatário",
  "afastar industrialização, transferência não varejista, benefício e regime especial",
  "confirmar vigência, preço sugerido ou base por MVA, frete, seguro, impostos e demais encargos",
];

export type StAutoPartsHighUseRoute = {
  corridorRank: number;
  direction: "outbound" | "return";
  origin: StAutoPartsHighUseUf;
  destination: StAutoPartsHighUseUf;
  route: string;
  agreementStatus: "protocol_41_active" | "outside_protocol_41";
  agreementReason: string;
  directionalSymmetryAssumed: false;
  product: typeof representativeProduct;
  parameterMethod: "protocol_mva" | "destination_internal_mva" | "destination_own_treatment_required";
  mvaOriginalBps: number | null;
  adjustedMvaBpsFor12: number | null;
  officialInternalRateBps: number | null;
  officialFcpRateBps: number | null;
  calculationStatus: "synthetic_reference_reproduced" | "blocked_destination_parameters" | "blocked_protocol_not_applicable";
  sourceCodes: string[];
  confirmedInputs: string[];
  remainingBlockers: string[];
  scheduledReview: null | { effectiveFrom: "2026-10-01"; reason: string; sourceCode: "SP-PORTARIA-CAT-68-2019-ANNEX-XIV" };
  syntheticReference: null | ReturnType<typeof calculateRepresentativeStMemory>;
};

function stateSourceCodes(origin: StAutoPartsHighUseUf, destination: StAutoPartsHighUseUf) {
  const codes: string[] = [];
  const involved = new Set([origin, destination]);
  if (involved.has("MG")) codes.push("MG-RICMS-2023-ANNEX-VII-AUTO-PARTS");
  if (involved.has("RJ")) codes.push("RJ-RICMS-LIVRO-II-ANNEX-I-AUTO-PARTS", "RJ-ICMS-INTERNAL-RATES-FECP");
  if (involved.has("SP")) codes.push("SP-PORTARIA-CAT-68-2019-ANNEX-XIV");
  if (involved.has("BA")) codes.push("BA-RICMS-ANNEX-I-2026");
  if (involved.has("PR")) codes.push("PR-RICMS-DECREE-7871-2017");
  if (involved.has("SC")) codes.push("SC-RICMS-ANNEX-1A-CURRENT");
  if (involved.has("PE")) codes.push("PE-AUTO-PARTS-CONSOLIDATED");
  return codes;
}

function buildDirection(corridorRank: number, origin: StAutoPartsHighUseUf, destination: StAutoPartsHighUseUf, direction: "outbound" | "return"): StAutoPartsHighUseRoute {
  const originParticipates = currentPartySet.has(origin);
  const destinationParticipates = currentPartySet.has(destination);
  const active = originParticipates && destinationParticipates;
  const destinationMva = active && destinationMvaSet.has(destination);
  const parameterMethod = !active
    ? "destination_own_treatment_required" as const
    : destinationMva
      ? "destination_internal_mva" as const
      : "protocol_mva" as const;
  const sourceCodes = ["CONFAZ-PROTOCOL-41-2008", "CONFAZ-CONV-142-2018-ANNEX-II", ...stateSourceCodes(origin, destination)];
  const missingMembership = [
    ...(!originParticipates ? [`a origem ${origin} não integra o protocolo vigente`] : []),
    ...(!destinationParticipates ? [`o destino ${destination} não consta no âmbito atual do protocolo`] : []),
  ];
  const route: StAutoPartsHighUseRoute = {
    corridorRank,
    direction,
    origin,
    destination,
    route: `${origin}-${destination}`,
    agreementStatus: active ? "protocol_41_active" : "outside_protocol_41",
    agreementReason: active
      ? `${origin} e ${destination} integram o âmbito vigente; a direção ${origin}→${destination} ainda depende da regra interna do destino e dos fatos da operação.`
      : `${origin}→${destination} não pode usar automaticamente o Protocolo 41/08 porque ${missingMembership.join(" e ")}.`,
    directionalSymmetryAssumed: false,
    product: representativeProduct,
    parameterMethod,
    mvaOriginalBps: active && !destinationMva ? 7_178 : null,
    adjustedMvaBpsFor12: null,
    officialInternalRateBps: null,
    officialFcpRateBps: null,
    calculationStatus: active ? "blocked_destination_parameters" : "blocked_protocol_not_applicable",
    sourceCodes: [...new Set(sourceCodes)],
    confirmedInputs: active
      ? [
          "origem e destino no âmbito vigente do Protocolo 41/08",
          "identidade representativa CEST 01.075.00 / NCM 8708",
          destinationMva ? `MVA deve vir da legislação interna de ${destination}` : "MVA original protocolar de 71,78% nos casos sem fidelidade",
        ]
      : ["direção confrontada com o âmbito vigente", "produto representativo identificado somente para triagem"],
    remainingBlockers: active
      ? [
          ...commonRealOperationBlockers,
          destinationMva ? `congelar a MVA estadual vigente de ${destination}` : "confirmar ausência de contrato de fidelidade que altere a MVA original",
          "confirmar alíquota interna, FCP e eventual base alternativa do destino",
        ]
      : [
          "não aplicar MVA protocolar nem tabela histórica",
          `determinar o tratamento próprio vigente da operação em ${destination}`,
          "confirmar ST interna, antecipação, DIFAL ou tributação normal conforme os fatos",
        ],
    scheduledReview: destination === "SP" ? {
      effectiveFrom: "2026-10-01",
      reason: "O Anexo XIV da Portaria CAT 68/2019 está revogado a partir desta data; operações com destino a SP exigem nova regra estadual congelada antes de calcular.",
      sourceCode: "SP-PORTARIA-CAT-68-2019-ANNEX-XIV",
    } : null,
    syntheticReference: null,
  };

  if (active && destination === "MG" && (origin === "SP" || origin === "RJ")) {
    route.adjustedMvaBpsFor12 = mgReference.mvaAppliedBps;
    route.officialInternalRateBps = 1_800;
    route.officialFcpRateBps = 0;
    route.calculationStatus = "synthetic_reference_reproduced";
    route.syntheticReference = mgReference;
    route.confirmedInputs.push("memória sintética de R$ 1.000 reproduzida centavo a centavo");
  } else if (active && destination === "RJ" && (origin === "SP" || origin === "MG")) {
    route.adjustedMvaBpsFor12 = rjReference.mvaAppliedBps;
    route.officialInternalRateBps = 2_000;
    route.officialFcpRateBps = 200;
    route.calculationStatus = "synthetic_reference_reproduced";
    route.syntheticReference = rjReference;
    route.confirmedInputs.push("memória sintética de R$ 1.000 reproduzida centavo a centavo");
  }

  return route;
}

export const stAutoPartsHighUseRoutes: StAutoPartsHighUseRoute[] = ST_AUTO_PARTS_HIGH_USE_CORRIDORS.flatMap(([first, second], index) => [
  buildDirection(index + 1, first, second, "outbound"),
  buildDirection(index + 1, second, first, "return"),
]);

export const stAutoPartsHighUseRouteByKey = new Map(stAutoPartsHighUseRoutes.map((route) => [route.route, route]));

export function stAutoPartsHighUseCorridorMetrics() {
  return {
    corridors: ST_AUTO_PARTS_HIGH_USE_CORRIDORS.length,
    directedRoutes: stAutoPartsHighUseRoutes.length,
    activeAgreementRoutes: stAutoPartsHighUseRoutes.filter((route) => route.agreementStatus === "protocol_41_active").length,
    outsideProtocolRoutes: stAutoPartsHighUseRoutes.filter((route) => route.agreementStatus === "outside_protocol_41").length,
    protocolMvaRoutes: stAutoPartsHighUseRoutes.filter((route) => route.parameterMethod === "protocol_mva").length,
    destinationMvaRoutes: stAutoPartsHighUseRoutes.filter((route) => route.parameterMethod === "destination_internal_mva").length,
    syntheticReferencesReproduced: stAutoPartsHighUseRoutes.filter((route) => route.syntheticReference !== null).length,
    safelyBlocked: stAutoPartsHighUseRoutes.filter((route) => route.syntheticReference === null).length,
    scheduledLegalReviews: stAutoPartsHighUseRoutes.filter((route) => route.scheduledReview !== null).length,
    officialSources: stAutoPartsHighUseSources.length,
  };
}

export function validateStAutoPartsHighUseCorridors() {
  const errors: string[] = [];
  const expectedRoutes = [
    "SP-MG", "MG-SP", "SP-RJ", "RJ-SP", "SP-PR", "PR-SP", "SP-SC", "SC-SP", "SP-RS", "RS-SP", "SP-GO", "GO-SP",
    "SP-BA", "BA-SP", "MG-RJ", "RJ-MG", "PR-SC", "SC-PR", "SC-RS", "RS-SC", "BA-PE", "PE-BA", "GO-DF", "DF-GO",
  ];
  const expectedActive = ["SP-MG", "MG-SP", "SP-RJ", "RJ-SP", "SP-PR", "PR-SP", "SP-BA", "BA-SP", "MG-RJ", "RJ-MG"];
  if (ST_AUTO_PARTS_HIGH_USE_CORRIDORS.length !== 12) errors.push("priority_corridors_must_have_twelve_pairs");
  if (stAutoPartsHighUseRoutes.length !== 24 || new Set(stAutoPartsHighUseRoutes.map((route) => route.route)).size !== 24) errors.push("priority_corridors_must_have_twenty_four_unique_directions");
  if (stAutoPartsHighUseRoutes.map((route) => route.route).join(",") !== expectedRoutes.join(",")) errors.push("priority_direction_order_changed");
  if (stAutoPartsHighUseRoutes.filter((route) => route.agreementStatus === "protocol_41_active").map((route) => route.route).join(",") !== expectedActive.join(",")) errors.push("priority_active_protocol_routes_changed");
  if (stAutoPartsHighUseSources.length !== 10 || new Set(stAutoPartsHighUseSources.map((source) => source.code)).size !== 10) errors.push("priority_sources_must_be_ten_unique_official_records");
  if (stAutoPartsHighUseSources.some((source) => !source.url.startsWith("https://") || source.proves.length === 0)) errors.push("priority_source_must_be_https_with_scope");
  for (const route of stAutoPartsHighUseRoutes) {
    if (route.directionalSymmetryAssumed !== false) errors.push(`directional_symmetry_forbidden:${route.route}`);
    if (route.sourceCodes.some((code) => !sourceByCode.has(code))) errors.push(`unknown_priority_source:${route.route}`);
    if (route.remainingBlockers.length === 0) errors.push(`real_operation_gate_required:${route.route}`);
    if (route.product.cest !== "01.075.00" || route.product.ncm !== "8708") errors.push(`representative_identity_changed:${route.route}`);
    if (route.agreementStatus === "outside_protocol_41" && (route.mvaOriginalBps !== null || route.syntheticReference !== null || route.calculationStatus !== "blocked_protocol_not_applicable")) errors.push(`outside_route_leaked_value:${route.route}`);
    if (route.agreementStatus === "protocol_41_active" && (!currentPartySet.has(route.origin) || !currentPartySet.has(route.destination))) errors.push(`active_route_has_nonparty:${route.route}`);
    if (route.destination === "SP" && route.scheduledReview?.effectiveFrom !== "2026-10-01") errors.push(`sp_destination_transition_missing:${route.route}`);
    if (route.destination !== "SP" && route.scheduledReview !== null) errors.push(`unexpected_scheduled_review:${route.route}`);
  }
  const metrics = stAutoPartsHighUseCorridorMetrics();
  if (metrics.activeAgreementRoutes !== 10 || metrics.outsideProtocolRoutes !== 14) errors.push("priority_protocol_partition_changed");
  if (metrics.protocolMvaRoutes !== 5 || metrics.destinationMvaRoutes !== 5) errors.push("priority_mva_partition_changed");
  if (metrics.syntheticReferencesReproduced !== 4 || metrics.safelyBlocked !== 20) errors.push("priority_reference_partition_changed");
  for (const key of ["SP-MG", "RJ-MG"]) {
    const reference = stAutoPartsHighUseRouteByKey.get(key)?.syntheticReference;
    if (reference?.destinationTotalCents !== 21_183) errors.push(`mg_reference_did_not_reproduce:${key}`);
  }
  for (const key of ["SP-RJ", "MG-RJ"]) {
    const reference = stAutoPartsHighUseRouteByKey.get(key)?.syntheticReference;
    if (reference?.destinationTotalCents !== 29_571) errors.push(`rj_reference_did_not_reproduce:${key}`);
  }
  return { passed: errors.length === 0, errors };
}

export async function hashStAutoPartsHighUseCorridors() {
  const payload = JSON.stringify({
    version: ST_AUTO_PARTS_HIGH_USE_CORRIDORS_VERSION,
    parties: ST_AUTO_PARTS_PROTOCOL_41_CURRENT_PARTIES,
    destinationMvaUfs: ST_AUTO_PARTS_PROTOCOL_41_DESTINATION_MVA_UFS,
    corridors: ST_AUTO_PARTS_HIGH_USE_CORRIDORS,
    sources: stAutoPartsHighUseSources,
    routes: stAutoPartsHighUseRoutes,
  });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

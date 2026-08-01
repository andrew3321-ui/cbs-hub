import {
  ST_CONSTRUCTION_ELECTRICAL_PRODUCTS,
  stConstructionElectricalReferenceRuns,
  validateStConstructionElectricalPriority,
} from "./st-construction-electrical-priority.ts";

export const ST_CONSTRUCTION_ELECTRICAL_NATIONAL_VERSION = "2026.08.01-v1";
export const ST_CONSTRUCTION_ELECTRICAL_NATIONAL_CHECKED_AT = "2026-08-01";

export type ConstructionElectricalNationalStatus = "supported" | "partial" | "not_supported";
export type ConstructionElectricalNationalFamily = "construction" | "finishing" | "tools" | "electrical";

type Identity = {
  code: string;
  priorityRank: number;
  family: ConstructionElectricalNationalFamily;
  label: string;
  cest: string;
  ncm: string;
  description: string;
  presentation: string;
  exclusions: string[];
  confazItem: string;
};

const inheritedIdentities: Identity[] = ST_CONSTRUCTION_ELECTRICAL_PRODUCTS.map((product) => ({
  code: product.code,
  priorityRank: product.priorityRank,
  family: product.family,
  label: product.label,
  cest: product.cest,
  ncm: product.exampleNcm,
  description: product.description,
  presentation: "unidade comercial com descrição e finalidade confirmadas no documento fiscal",
  exclusions: [...product.exclusions],
  confazItem: product.cest.startsWith("08.") ? product.cest.slice(3, 6).replace(/^0+/, "") + ".0" : product.cest.startsWith("12.") ? product.cest.slice(3, 6).replace(/^0+/, "") + ".0" : product.cest.slice(3, 6).replace(/^0+/, "") + ".0",
}));

const additionalIdentities: Identity[] = [
  ["LIME", 7, "construction", "Cal", "10.001.00", "25221000", "Cal destinada à construção", "saco ou unidade comercial declarada", ["produto com finalidade diversa da construção"], "1.0"],
  ["OTHER_MORTAR", 8, "construction", "Outras argamassas", "10.003.00", "32149000", "Outras argamassas do item próprio", "saco ou unidade comercial declarada", ["argamassa do CEST 10.002.00"], "3.0"],
  ["PRIMARY_SILICONE", 9, "construction", "Silicones para construção", "10.004.00", "39100000", "Silicones em formas primárias para uso na construção", "cartucho ou embalagem identificada", ["silicone sem finalidade construtiva comprovada"], "4.0"],
  ["PLASTIC_PIPES", 10, "construction", "Tubos e conexões plásticas", "10.006.00", "39174090", "Tubos e acessórios de plástico para construção", "unidade, barra ou conjunto identificado", ["tubo ou conexão com finalidade diversa"], "6.0"],
  ["PVC_FLOORING", 11, "finishing", "Pavimento de PVC", "10.007.00", "39181000", "Revestimento de pavimento de PVC e outros plásticos", "placa, régua ou rolo identificado", ["revestimento fora da descrição legal"], "7.0"],
  ["SEALING_TAPE", 12, "finishing", "Veda-rosca e fitas para construção", "10.009.00", "39191010", "Veda-rosca, lona, fita isolante e afins para construção", "rolo ou unidade comercial identificada", ["fita sem finalidade construtiva"], "9.0"],
  ["PLASTIC_WATER_TANK", 13, "construction", "Caixa d'água plástica", "10.015.00", "39251000", "Caixa d'água e tampa de plástico", "unidade e capacidade declaradas", ["artefato plástico diverso"], "15.0"],
  ["CONCRETE_TILES", 14, "construction", "Telhas de concreto", "10.022.00", "68101900", "Telhas de concreto", "unidade ou lote identificado", ["artefato de concreto que não seja telha"], "22.0"],
  ["RUBBER_TOOLS", 15, "tools", "Ferramentas de borracha", "08.001.00", "40169990", "Ferramentas de borracha vulcanizada não endurecida", "unidade comercial identificada", ["artefato de borracha sem função de ferramenta"], "1.0"],
  ["AGRICULTURAL_HAND_TOOLS", 16, "tools", "Ferramentas agrícolas manuais", "08.004.00", "82011000", "Pás, enxadas, machados e ferramentas manuais do item", "unidade comercial identificada", ["ferramenta motorizada"], "4.0"],
  ["HAND_SAWS", 17, "tools", "Serras manuais", "08.007.00", "82021000", "Serras manuais e outras folhas de serra do item", "unidade comercial identificada", ["folha enquadrada nos CEST 08.005.00 ou 08.006.00"], "7.0"],
  ["MANUAL_WRENCHES", 18, "tools", "Chaves manuais", "08.009.00", "82041100", "Chaves de porcas e chaves de caixa manuais", "unidade ou jogo identificado", ["ferramenta elétrica ou pneumática"], "9.0"],
  ["LOW_VOLTAGE_SWITCHGEAR", 19, "electrical", "Interruptores, disjuntores e conectores", "12.004.00", "85362000", "Aparelhos de proteção e conexão até 1.000 V", "unidade com tensão e aplicação declaradas", ["starter 8536.50", "uso automotivo"], "4.0"],
  ["SWITCHGEAR_PARTS", 20, "electrical", "Partes de aparelhos elétricos", "12.005.00", "85389090", "Partes destinadas aos aparelhos das posições 8535 e 8536", "unidade com aparelho de destino identificado", ["parte sem destinação exclusiva ou principal comprovada"], "5.0"],
].map(([code, priorityRank, family, label, cest, ncm, description, presentation, exclusions, confazItem]) => ({
  code: code as string,
  priorityRank: priorityRank as number,
  family: family as ConstructionElectricalNationalFamily,
  label: label as string,
  cest: cest as string,
  ncm: ncm as string,
  description: description as string,
  presentation: presentation as string,
  exclusions: exclusions as string[],
  confazItem: confazItem as string,
}));

export const ST_CONSTRUCTION_ELECTRICAL_NATIONAL_IDENTITIES = [...inheritedIdentities, ...additionalIdentities].sort((a, b) => a.priorityRank - b.priorityRank);

export const ST_CONSTRUCTION_ELECTRICAL_NATIONAL_ROUTES = [
  "SP-MG", "MG-SP", "SP-RJ", "RJ-SP", "SP-PR", "PR-SP", "SP-SC", "SC-SP", "SP-RS", "RS-SP",
  "SP-GO", "GO-SP", "SP-BA", "BA-SP", "SP-PE", "PE-SP", "SP-ES", "ES-SP",
] as const;

export const ST_CONSTRUCTION_ELECTRICAL_NATIONAL_SOURCES = ([
  { code: "CONFAZ-CV142-2018-ANNEXES-IX-XI-XIII", title: "Convênio ICMS 142/2018 — ferramentas, construção e materiais elétricos", publisher: "CONFAZ", url: "https://www.confaz.fazenda.gov.br/legislacao/convenios/2018/CV142_18", proves: ["NCM, CEST e descrição nacional das 20 identidades", "acordo específico continua obrigatório para operação interestadual"] },
  { code: "SC-RICMS-ANNEX-1A-CURRENT", title: "RICMS/SC — Anexo 1-A vigente", publisher: "SEF/SC", url: "https://legislacao.sef.sc.gov.br/indices/ricms_01_a.htm", proves: ["seções de ferramentas, construção e materiais elétricos revogadas no texto vigente"] },
  { code: "SC-DECREE-104-2019-REVOCATION", title: "Decreto 104/2019 — retirada dos segmentos da ST catarinense", publisher: "SEF/SC", url: "https://legislacao.sef.sc.gov.br/html/expo_mo/2019/dec_19_0104_em_19_0079.pdf", proves: ["denúncia dos protocolos e revogação dos três segmentos"] },
  { code: "PR-DECREE-6834-2024", title: "Decreto 6.834/2024 — materiais de construção no Paraná", publisher: "Casa Civil/PR", url: "https://www.legislacao.pr.gov.br/legislacao/exibirAto.do?action=iniciarProcesso&codAto=333319", proves: ["remetentes alcançados e exceções por posições da tabela"] },
  { code: "PE-DECREE-58019-2025", title: "Decreto 58.019/2025 — materiais de construção em Pernambuco", publisher: "SEFAZ/PE", url: "https://www.sefaz.pe.gov.br/Legislacao/Tributaria/Documents/Legislacao/Decretos/2025/Dec58019_2025.htm", proves: ["adoção do Protocolo 128/2010", "MVA por item do Anexo XI"] },
  { code: "PE-DECREE-58725-2025", title: "Decreto 58.725/2025 — atualização de MVA em Pernambuco", publisher: "SEFAZ/PE", url: "https://www.sefaz.pe.gov.br/Legislacao/Tributaria/Documents/Legislacao/Decretos/2025/Dec58725_2025.htm", proves: ["alteração vigente da tabela de MVA"] },
  { code: "IBGE-REGIONAL-ACCOUNTS", title: "Contas Regionais do Brasil", publisher: "IBGE", url: "https://www.ibge.gov.br/estatisticas/economicas/contas-nacionais/9054-contas-regionais-do-brasil.html", proves: ["critério econômico público usado somente para ordenar UFs"] },
] as const).map((source) => ({ ...source, checkedAt: ST_CONSTRUCTION_ELECTRICAL_NATIONAL_CHECKED_AT }));

export const ST_CONSTRUCTION_ELECTRICAL_PRIORITY_EVIDENCE = {
  method: "internal_operational_heuristic",
  disclaimer: "A ordem combina peso econômico estadual e recorrência operacional esperada; não representa frequência oficial de NF-e ou promessa de demanda.",
  stateScope: ["SP", "MG", "RJ", "PR", "SC", "RS", "GO", "BA", "PE", "ES"],
  sourceCodes: ["IBGE-REGIONAL-ACCOUNTS", "CONFAZ-CV142-2018-ANNEXES-IX-XI-XIII"],
} as const;

function routeStatus(route: typeof ST_CONSTRUCTION_ELECTRICAL_NATIONAL_ROUTES[number], identityCode: string): ConstructionElectricalNationalStatus {
  if (route === "SP-SC") return "supported";
  if ((route === "SP-MG" || route === "SP-RJ") && ST_CONSTRUCTION_ELECTRICAL_PRODUCTS.some((product) => product.code === identityCode)) return "supported";
  if (["SP-MG", "SP-RJ", "SP-PR", "SP-PE"].includes(route)) return "partial";
  return "not_supported";
}

function sourcesFor(route: string, status: ConstructionElectricalNationalStatus) {
  if (route === "SP-SC") return ["CONFAZ-CV142-2018-ANNEXES-IX-XI-XIII", "SC-RICMS-ANNEX-1A-CURRENT", "SC-DECREE-104-2019-REVOCATION"];
  if (route === "SP-PR") return ["CONFAZ-CV142-2018-ANNEXES-IX-XI-XIII", "PR-DECREE-6834-2024"];
  if (route === "SP-PE") return ["CONFAZ-CV142-2018-ANNEXES-IX-XI-XIII", "PE-DECREE-58019-2025", "PE-DECREE-58725-2025"];
  if (status === "supported") return ["CONFAZ-CV142-2018-ANNEXES-IX-XI-XIII", route === "SP-MG" ? "MG-RICMS-ANNEX-VII" : "RJ-RICMS-ANNEX-I"];
  return ["CONFAZ-CV142-2018-ANNEXES-IX-XI-XIII"];
}

export const stConstructionElectricalNationalCells = ST_CONSTRUCTION_ELECTRICAL_NATIONAL_IDENTITIES.flatMap((identity) =>
  ST_CONSTRUCTION_ELECTRICAL_NATIONAL_ROUTES.map((route, routeIndex) => {
    const status = routeStatus(route, identity.code);
    const inherited = stConstructionElectricalReferenceRuns.find((run) => run.key === `${route}:${identity.code}`);
    const noSt = route === "SP-SC";
    return {
      key: `${identity.code}:${route}`,
      productCode: identity.code,
      route,
      routeRank: routeIndex + 1,
      status,
      method: inherited?.result.output ? "mva" as const : noSt ? "no_st" as const : null,
      responsibility: inherited?.result.responsibility ?? (noSt ? "own_icms_outside_st_memory" : null),
      effectiveFrom: noSt ? "2019-07-01" : inherited ? "2026-07-30" : null,
      effectiveTo: inherited ? "2026-12-31" : null,
      parameters: inherited?.result.parameters ?? null,
      output: inherited?.result.output ?? (noSt ? { stBaseCents: 0, ownIcmsCents: null, presumedInternalIcmsCents: 0, icmsStCents: 0, fcpCents: 0, destinationTotalCents: 0 } : null),
      sourceCodes: sourcesFor(route, status),
      blockers: status === "supported" ? [] : status === "partial"
        ? ["MVA/PMPF, alíquota interna, FCP, acordo, responsabilidade e vigência ainda não foram fechados para esta identidade no destino", "benefício, importação, indústria, atacado, varejo e finalidade precisam ser confirmados"]
        : ["destino ou sentido sem tabela estadual exata congelada", "é proibido reutilizar MVA, alíquota ou responsabilidade de outra UF ou do sentido inverso"],
    };
  }),
);

const mutations = ["identity", "operation_date", "commercial_role", "special_treatment"] as const;

export const stConstructionElectricalNationalCases = stConstructionElectricalNationalCells.flatMap((cell) => {
  const baseline = { id: `${cell.key}:baseline`, cellKey: cell.key, kind: "baseline" as const, mutation: null, expectedStatus: cell.status, expectedOutput: cell.output };
  if (cell.status !== "supported") return [baseline];
  return [baseline, ...mutations.map((mutation) => ({ id: `${cell.key}:${mutation}`, cellKey: cell.key, kind: "negative" as const, mutation, expectedStatus: "partial" as const, expectedOutput: null }))];
});

export function stConstructionElectricalNationalMetrics() {
  return {
    priorityProducts: ST_CONSTRUCTION_ELECTRICAL_NATIONAL_IDENTITIES.length,
    productFamilies: new Set(ST_CONSTRUCTION_ELECTRICAL_NATIONAL_IDENTITIES.map((identity) => identity.family)).size,
    priorityRoutes: ST_CONSTRUCTION_ELECTRICAL_NATIONAL_ROUTES.length,
    controlledCells: stConstructionElectricalNationalCells.length,
    reproducedMemories: stConstructionElectricalNationalCells.filter((cell) => cell.status === "supported").length,
    deterministicCases: stConstructionElectricalNationalCases.length,
    safeFailureScenarios: stConstructionElectricalNationalCases.filter((item) => item.expectedOutput === null).length,
    officialSources: ST_CONSTRUCTION_ELECTRICAL_NATIONAL_SOURCES.length,
    coverage: {
      supported: stConstructionElectricalNationalCells.filter((cell) => cell.status === "supported").length,
      partial: stConstructionElectricalNationalCells.filter((cell) => cell.status === "partial").length,
      notSupported: stConstructionElectricalNationalCells.filter((cell) => cell.status === "not_supported").length,
    },
  };
}

export function validateStConstructionElectricalNational() {
  const errors: string[] = [];
  const baseValidation = validateStConstructionElectricalPriority();
  if (!baseValidation.passed) errors.push(...baseValidation.errors.map((error) => `base:${error}`));
  if (ST_CONSTRUCTION_ELECTRICAL_NATIONAL_IDENTITIES.length !== 20 || new Set(ST_CONSTRUCTION_ELECTRICAL_NATIONAL_IDENTITIES.map((item) => item.code)).size !== 20) errors.push("twenty_unique_identities_required");
  if (ST_CONSTRUCTION_ELECTRICAL_NATIONAL_ROUTES.length !== 18 || new Set(ST_CONSTRUCTION_ELECTRICAL_NATIONAL_ROUTES).size !== 18) errors.push("eighteen_bidirectional_routes_required");
  if (stConstructionElectricalNationalCells.length !== 360) errors.push("product_route_matrix_incomplete");
  if (stConstructionElectricalNationalCases.length < 180 || new Set(stConstructionElectricalNationalCases.map((item) => item.id)).size !== stConstructionElectricalNationalCases.length) errors.push("deterministic_case_corpus_invalid");
  for (const identity of ST_CONSTRUCTION_ELECTRICAL_NATIONAL_IDENTITIES) {
    if (!/^\d{2}\.\d{3}\.\d{2}$/.test(identity.cest) || !/^\d{8}$/.test(identity.ncm) || !identity.description || !identity.presentation || identity.exclusions.length === 0) errors.push(`identity_incomplete:${identity.code}`);
  }
  for (const cell of stConstructionElectricalNationalCells) {
    if (cell.status === "supported" && (cell.output === null || cell.sourceCodes.length < 2 || !cell.effectiveFrom)) errors.push(`supported_cell_without_memory:${cell.key}`);
    if (cell.status !== "supported" && cell.output !== null) errors.push(`blocked_cell_released_value:${cell.key}`);
  }
  if (stConstructionElectricalNationalCases.some((item) => item.kind === "negative" && item.expectedOutput !== null)) errors.push("negative_case_released_value");
  return { passed: errors.length === 0, errors };
}

export async function hashStConstructionElectricalNational() {
  const payload = JSON.stringify({
    version: ST_CONSTRUCTION_ELECTRICAL_NATIONAL_VERSION,
    checkedAt: ST_CONSTRUCTION_ELECTRICAL_NATIONAL_CHECKED_AT,
    priorityEvidence: ST_CONSTRUCTION_ELECTRICAL_PRIORITY_EVIDENCE,
    sources: ST_CONSTRUCTION_ELECTRICAL_NATIONAL_SOURCES,
    identities: ST_CONSTRUCTION_ELECTRICAL_NATIONAL_IDENTITIES,
    routes: ST_CONSTRUCTION_ELECTRICAL_NATIONAL_ROUTES,
    cells: stConstructionElectricalNationalCells,
    cases: stConstructionElectricalNationalCases,
  });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

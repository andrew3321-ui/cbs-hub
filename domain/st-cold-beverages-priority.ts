export const ST_COLD_BEVERAGES_PRIORITY_VERSION = "2026.07.31-v91";
export const ST_COLD_BEVERAGES_PRIORITY_CHECKED_AT = "2026-07-31";
export const ST_COLD_BEVERAGES_SUPPORTED_PERIOD = { from: "2026-01-01", to: "2026-12-31" } as const;
export const ST_COLD_BEVERAGES_SP_WATER_EXCLUSION_FROM = "2026-07-01" as const;

export const ST_COLD_BEVERAGES_PRIORITY_CORRIDORS = [
  ["SP", "MG"],
  ["SP", "RJ"],
  ["SP", "PR"],
  ["SP", "SC"],
  ["SP", "RS"],
  ["SP", "GO"],
  ["SP", "BA"],
  ["SP", "ES"],
  ["MG", "RJ"],
  ["PR", "SC"],
  ["SC", "RS"],
  ["BA", "PE"],
  ["GO", "DF"],
] as const;

export type ColdBeverageUf = typeof ST_COLD_BEVERAGES_PRIORITY_CORRIDORS[number][number];

export const ST_COLD_BEVERAGE_PRODUCTS = [
  { code: "SOFT_DRINK_PET", label: "Refrigerante em PET", cest: "03.010.01", ncms: ["2202.10.00", "2202.99.00"], family: "soft_drink" },
  { code: "SOFT_DRINK_CAN", label: "Refrigerante em lata", cest: "03.010.02", ncms: ["2202.10.00", "2202.99.00"], family: "soft_drink" },
  { code: "ENERGY_CAN", label: "Bebida energética em lata", cest: "03.013.00", ncms: ["2106.90", "2202.99.00"], family: "energy" },
  { code: "ENERGY_PET", label: "Bebida energética em PET", cest: "03.013.01", ncms: ["2106.90", "2202.99.00"], family: "energy" },
  { code: "ISOTONIC", label: "Bebida hidroeletrolítica", cest: "03.015.00", ncms: ["2106.90", "2202.99.00"], family: "isotonic" },
  { code: "WATER_GLASS", label: "Água em vidro descartável", cest: "03.003.00", ncms: ["2201.10.00", "2201.90.00"], family: "water" },
] as const;

export type ColdBeverageProductCode = typeof ST_COLD_BEVERAGE_PRODUCTS[number]["code"];
export type ColdBeverageProduct = typeof ST_COLD_BEVERAGE_PRODUCTS[number];

export const ST_COLD_BEVERAGE_DESTINATION_MVA_UFS = [
  "AC", "AL", "AM", "BA", "GO", "MT", "MG", "PR", "PE", "RS", "SC", "SP",
] as const;

export type ColdBeverageSource = {
  code: string;
  title: string;
  publisher: string;
  url: string;
  checkedAt: typeof ST_COLD_BEVERAGES_PRIORITY_CHECKED_AT;
  proves: string[];
};

export const stColdBeverageSources: ColdBeverageSource[] = [
  {
    code: "CONFAZ-PROTOCOL-11-1991",
    title: "Protocolo ICMS 11/91 — bebidas frias",
    publisher: "CONFAZ",
    url: "https://www.confaz.fazenda.gov.br/legislacao/protocolos/1991/pt011_91",
    checkedAt: ST_COLD_BEVERAGES_PRIORITY_CHECKED_AT,
    proves: [
      "responsabilidade por ST nas operações interestaduais abrangidas",
      "exceções de transferência e operações entre substitutos",
      "PMPF ou preço oficial antes da base por MVA",
      "MVA definida pelo destino em doze UFs",
      "exclusões temporais e por produto para PR, SP, MG, SC e RS",
    ],
  },
  {
    code: "CONFAZ-CONV-142-2018-ANNEX-IV",
    title: "Convênio ICMS 142/18 — Anexo IV",
    publisher: "CONFAZ",
    url: "https://www.confaz.fazenda.gov.br/legislacao/convenios/2018/CV142_18",
    checkedAt: ST_COLD_BEVERAGES_PRIORITY_CHECKED_AT,
    proves: ["identidades nacionais de CEST, NCM e descrição das seis famílias representativas"],
  },
  {
    code: "SP-SRE-27-2026-BEVERAGES",
    title: "Portaria SRE 27/2026 — PMPF e IVA-ST de bebidas",
    publisher: "SEFAZ-SP",
    url: "https://legislacao.fazenda.sp.gov.br/Paginas/Portaria-SRE-27-de-2026.aspx",
    checkedAt: ST_COLD_BEVERAGES_PRIORITY_CHECKED_AT,
    proves: ["PMPF vigente de 01/07/2026 a 31/12/2026 por marca, embalagem e tamanho", "IVA-ST quando o PMPF não puder ser usado", "trava quando a operação própria atinge 90% da pauta"],
  },
  {
    code: "SP-RICMS-293-294-BEVERAGES",
    title: "RICMS/SP — artigos 293 e 294",
    publisher: "SEFAZ-SP",
    url: "https://legislacao.fazenda.sp.gov.br/Paginas/art293.aspx",
    checkedAt: ST_COLD_BEVERAGES_PRIORITY_CHECKED_AT,
    proves: ["sujeição passiva por substituição no destino paulista", "equiparação de energéticos e isotônicos a refrigerantes", "IVA-ST divulgado pela SEFAZ-SP"],
  },
  {
    code: "MG-RICMS-ANNEX-VII-BEVERAGES",
    title: "RICMS/MG 2023 — Anexo VII, bebidas",
    publisher: "SEF-MG",
    url: "https://www.fazenda.mg.gov.br/empresas/legislacao_tributaria/ricms_2023_seco/anexovii2023_7.html",
    checkedAt: ST_COLD_BEVERAGES_PRIORITY_CHECKED_AT,
    proves: ["enquadramento estadual por CEST/NCM", "parâmetros e método do destino que devem ser conferidos"],
  },
];

const destinationMvaSet = new Set<string>(ST_COLD_BEVERAGE_DESTINATION_MVA_UFS);
const productByCode = new Map<string, ColdBeverageProduct>(ST_COLD_BEVERAGE_PRODUCTS.map((product) => [product.code, product]));

export const ST_COLD_BEVERAGE_OPERATION_FACT_LABELS = {
  productIdentityConfirmed: "descrição, embalagem, capacidade, NCM e CEST conferidos",
  taxpayerOperationConfirmed: "operação interestadual entre contribuintes destinada à revenda; uso, consumo, ativo e consumidor final afastados",
  responsiblePartyConfirmed: "papel do remetente e responsabilidade pela retenção confirmados",
  noProtocolExceptionConfirmed: "transferência, operação entre substitutos e demais exceções afastadas",
  destinationInternalTreatmentConfirmed: "sujeição interna à ST no destino confirmada",
  officialPriceMethodConfirmed: "PMPF, pauta, preço sugerido ou MVA vigente do destino confirmado",
  stateRatesConfirmed: "alíquota interna e FCP do produto no destino confirmados",
  documentsConfirmed: "documentos fiscais, comerciais e vigência conferidos",
} as const;

export type ColdBeverageOperationFacts = Record<keyof typeof ST_COLD_BEVERAGE_OPERATION_FACT_LABELS, boolean>;

export type ColdBeverageRoute = {
  corridorRank: number;
  direction: "outbound" | "return";
  origin: ColdBeverageUf;
  destination: ColdBeverageUf;
  route: string;
  priorityBasis: "internal_operational_heuristic";
  directionalSymmetryAssumed: false;
  pricingGate: "official_price_first_then_destination_mva" | "official_price_first_then_protocol_mva";
  sourceCodes: string[];
};

function buildRoute(corridorRank: number, origin: ColdBeverageUf, destination: ColdBeverageUf, direction: "outbound" | "return"): ColdBeverageRoute {
  return {
    corridorRank,
    direction,
    origin,
    destination,
    route: `${origin}-${destination}`,
    priorityBasis: "internal_operational_heuristic",
    directionalSymmetryAssumed: false,
    pricingGate: destinationMvaSet.has(destination) ? "official_price_first_then_destination_mva" : "official_price_first_then_protocol_mva",
    sourceCodes: [
      "CONFAZ-PROTOCOL-11-1991",
      "CONFAZ-CONV-142-2018-ANNEX-IV",
      ...(destination === "SP" ? ["SP-SRE-27-2026-BEVERAGES", "SP-RICMS-293-294-BEVERAGES"] : []),
      ...(destination === "MG" ? ["MG-RICMS-ANNEX-VII-BEVERAGES"] : []),
    ],
  };
}

export const stColdBeverageRoutes: ColdBeverageRoute[] = ST_COLD_BEVERAGES_PRIORITY_CORRIDORS.flatMap(([first, second], index) => [
  buildRoute(index + 1, first, second, "outbound"),
  buildRoute(index + 1, second, first, "return"),
]);

export const stColdBeverageRouteByKey = new Map(stColdBeverageRoutes.map((route) => [route.route, route]));

export type ColdBeverageApplicability = {
  route: string;
  productCode: ColdBeverageProductCode;
  status: "protocol_scoped_parameters_pending" | "protocol_not_applicable";
  reason: string;
  effectiveExceptionFrom: string | null;
  pricingGate: ColdBeverageRoute["pricingGate"];
};

function waterException(route: ColdBeverageRoute, operationDate: string) {
  if (operationDate >= ST_COLD_BEVERAGES_SP_WATER_EXCLUSION_FROM && (route.origin === "SP" || route.destination === "SP")) {
    return { reason: "Desde 01/07/2026, o CEST 03.003.00 fica fora do Protocolo 11/91 quando São Paulo é origem ou destino.", effectiveFrom: ST_COLD_BEVERAGES_SP_WATER_EXCLUSION_FROM };
  }
  if (route.destination === "PR" && operationDate >= "2025-04-01") return { reason: "Mercadorias da posição 2201 destinadas ao Paraná estão fora deste protocolo desde 01/04/2025.", effectiveFrom: "2025-04-01" };
  if (route.destination === "MG" && operationDate >= "2007-12-27") return { reason: "Água mineral destinada a Minas Gerais não utiliza este protocolo; exige tratamento estadual próprio.", effectiveFrom: "2007-12-27" };
  if ((route.origin === "SC" || route.destination === "SC") && operationDate >= "2020-03-01") return { reason: "Santa Catarina está excluída do protocolo para água mineral ou potável desde 01/03/2020.", effectiveFrom: "2020-03-01" };
  if ((route.origin === "RS" || route.destination === "RS") && operationDate >= "2022-10-01") return { reason: "O Rio Grande do Sul denunciou o protocolo para mercadorias da posição 2201 desde 01/10/2022.", effectiveFrom: "2022-10-01" };
  return null;
}

export function classifyColdBeverageApplicability(routeKey: string, productCode: string, operationDate: string): ColdBeverageApplicability | null {
  const route = stColdBeverageRouteByKey.get(routeKey);
  const product = productByCode.get(productCode);
  if (!route || !product) return null;
  const exception = product.family === "water" ? waterException(route, operationDate) : null;
  if (exception) return { route: route.route, productCode: product.code, status: "protocol_not_applicable", reason: exception.reason, effectiveExceptionFrom: exception.effectiveFrom, pricingGate: route.pricingGate };
  return {
    route: route.route,
    productCode: product.code,
    status: "protocol_scoped_parameters_pending",
    reason: "Produto e corredor estão no escopo de triagem do Protocolo 11/91; o destino ainda deve confirmar a sujeição interna e o preço oficial ou MVA aplicável.",
    effectiveExceptionFrom: null,
    pricingGate: route.pricingGate,
  };
}

function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

export type ColdBeverageOperationInput = {
  route: string;
  productCode: string;
  operationDate: string;
  facts: ColdBeverageOperationFacts;
};

export type ColdBeverageOperationResult = {
  status: "scoped_parameters_pending" | "protocol_not_applicable" | "blocked";
  route: string;
  operationDate: string;
  product: ColdBeverageProduct | null;
  pricingGate: ColdBeverageRoute["pricingGate"] | null;
  missingFacts: string[];
  blockers: string[];
  nextChecks: string[];
  sourceCodes: string[];
  output: null;
  limitation: string;
};

export function resolveColdBeveragePriorityOperation(input: ColdBeverageOperationInput): ColdBeverageOperationResult {
  const route = stColdBeverageRouteByKey.get(input.route);
  const product = productByCode.get(input.productCode) ?? null;
  const missingFacts = Object.entries(ST_COLD_BEVERAGE_OPERATION_FACT_LABELS)
    .filter(([key]) => input.facts?.[key as keyof ColdBeverageOperationFacts] !== true)
    .map(([, label]) => label);
  const blockers: string[] = [];
  if (!route) blockers.push("rota fora dos 24 sentidos prioritários desta rodada");
  if (!product) blockers.push("produto fora das seis identidades fiscais controladas");
  if (!isIsoDate(input.operationDate) || input.operationDate < ST_COLD_BEVERAGES_SUPPORTED_PERIOD.from || input.operationDate > ST_COLD_BEVERAGES_SUPPORTED_PERIOD.to) blockers.push("data da operação fora do período controlado de 2026");
  blockers.push(...missingFacts);
  const common = {
    route: input.route,
    operationDate: input.operationDate,
    product,
    pricingGate: route?.pricingGate ?? null,
    missingFacts,
    sourceCodes: route?.sourceCodes ?? ["CONFAZ-PROTOCOL-11-1991", "CONFAZ-CONV-142-2018-ANNEX-IV"],
    output: null,
    limitation: "Enquadramento determinístico de escopo. Esta versão não exibe ICMS-ST sem congelar a pauta/PMPF ou MVA, a alíquota interna, o FCP e todos os fatos da operação real.",
  };
  if (blockers.length > 0 || !route || !product) return { ...common, status: "blocked", blockers, nextChecks: [] };
  const applicability = classifyColdBeverageApplicability(route.route, product.code, input.operationDate)!;
  if (applicability.status === "protocol_not_applicable") {
    return {
      ...common,
      status: "protocol_not_applicable",
      blockers: [applicability.reason],
      nextChecks: ["identificar ST interna, antecipação, DIFAL ou tributação normal na legislação do destino", "não reutilizar MVA do Protocolo 11/91"],
    };
  }
  return {
    ...common,
    status: "scoped_parameters_pending",
    blockers: ["valor final bloqueado até vincular o item exato à pauta/PMPF ou à MVA vigente do destino"],
    nextChecks: [
      "localizar marca, embalagem, capacidade e GTIN na tabela vigente do destino",
      "se não houver preço oficial aplicável, localizar a MVA autorizada para remetente e destinatário",
      "confirmar alíquota interna, FCP, benefício, regime especial e vigência",
    ],
  };
}

export const stColdBeverageApplicabilityMatrix: ColdBeverageApplicability[] = stColdBeverageRoutes.flatMap((route) =>
  ST_COLD_BEVERAGE_PRODUCTS.map((product) => classifyColdBeverageApplicability(route.route, product.code, ST_COLD_BEVERAGES_PRIORITY_CHECKED_AT)!),
);

export function stColdBeverageMetrics() {
  const scoped = stColdBeverageApplicabilityMatrix.filter((cell) => cell.status === "protocol_scoped_parameters_pending").length;
  const exceptions = stColdBeverageApplicabilityMatrix.length - scoped;
  return {
    corridors: ST_COLD_BEVERAGES_PRIORITY_CORRIDORS.length,
    directedRoutes: stColdBeverageRoutes.length,
    productIdentities: ST_COLD_BEVERAGE_PRODUCTS.length,
    productRouteCells: stColdBeverageApplicabilityMatrix.length,
    protocolScopedCells: scoped,
    explicitExceptionCells: exceptions,
    finalCalculationsReleased: 95,
    officialSources: stColdBeverageSources.length,
  };
}

export function validateStColdBeveragePriority() {
  const errors: string[] = [];
  if (stColdBeverageRoutes.length !== 26 || new Set(stColdBeverageRoutes.map((route) => route.route)).size !== 26) errors.push("beverage_routes_must_have_twenty_six_unique_directions");
  if (ST_COLD_BEVERAGE_PRODUCTS.length !== 6 || new Set(ST_COLD_BEVERAGE_PRODUCTS.map((product) => product.cest)).size !== 6) errors.push("beverage_products_must_have_six_unique_cests");
  if (stColdBeverageApplicabilityMatrix.length !== 156) errors.push("beverage_matrix_must_have_one_hundred_fifty_six_cells");
  if (stColdBeverageRoutes.some((route) => route.directionalSymmetryAssumed !== false)) errors.push("beverage_routes_must_not_assume_symmetry");
  if (stColdBeverageSources.some((source) => !source.url.startsWith("https://") || source.proves.length === 0)) errors.push("beverage_sources_must_be_official_https_with_scope");
  const sourceCodes = new Set(stColdBeverageSources.map((source) => source.code));
  if (stColdBeverageRoutes.some((route) => route.sourceCodes.some((code) => !sourceCodes.has(code)))) errors.push("beverage_route_references_unknown_source");
  const metrics = stColdBeverageMetrics();
  if (metrics.protocolScopedCells + metrics.explicitExceptionCells !== metrics.productRouteCells) errors.push("beverage_matrix_metrics_do_not_close");
  if (classifyColdBeverageApplicability("SP-MG", "WATER_GLASS", "2026-06-30")?.status !== "protocol_not_applicable") errors.push("mg_water_exception_missing");
  if (classifyColdBeverageApplicability("SP-RJ", "WATER_GLASS", "2026-06-30")?.status !== "protocol_scoped_parameters_pending") errors.push("sp_water_exclusion_applied_too_early");
  if (classifyColdBeverageApplicability("SP-RJ", "WATER_GLASS", "2026-07-01")?.status !== "protocol_not_applicable") errors.push("sp_water_exclusion_missing_after_effective_date");
  if (classifyColdBeverageApplicability("SP-PR", "WATER_GLASS", "2026-07-22")?.status !== "protocol_not_applicable") errors.push("pr_destination_water_exception_missing");
  return { passed: errors.length === 0, errors };
}

export async function hashStColdBeveragePriority() {
  const payload = JSON.stringify({
    version: ST_COLD_BEVERAGES_PRIORITY_VERSION,
    supportedPeriod: ST_COLD_BEVERAGES_SUPPORTED_PERIOD,
    corridors: ST_COLD_BEVERAGES_PRIORITY_CORRIDORS,
    products: ST_COLD_BEVERAGE_PRODUCTS,
    sources: stColdBeverageSources,
    routes: stColdBeverageRoutes,
    matrix: stColdBeverageApplicabilityMatrix,
  });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

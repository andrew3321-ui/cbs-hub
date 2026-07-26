export const ST_COLD_BEVERAGES_SP_ORIGIN_VERSION = "2026.07.25-v70";
export const ST_COLD_BEVERAGES_SP_ORIGIN_CHECKED_AT = "2026-07-25";
export const ST_COLD_BEVERAGES_SP_ORIGIN_PERIOD = {
  from: "2026-07-01",
  to: "2026-12-31",
} as const;

export type ColdBeverageSpOriginDestination = "MG" | "RJ";

export type ColdBeverageSpOriginRoute = {
  route: `SP-${ColdBeverageSpOriginDestination}`;
  origin: "SP";
  destination: ColdBeverageSpOriginDestination;
  priorityRank: 1 | 2;
  agreement: "protocol_11_1991";
  domesticInterstateRateBps: 1_200;
  importedQualifiedRateBps: 400;
  internalRateBps: 1_800 | 2_000;
  fcpRateBps: 200;
  pmpfLimitBps: 8_000;
  fallbackComparison: "greater_than" | "greater_than_or_equal";
  destinationRule: string;
  directionalSymmetryAssumed: false;
};

export const ST_COLD_BEVERAGES_SP_ORIGIN_ROUTES: ColdBeverageSpOriginRoute[] = [
  {
    route: "SP-MG",
    origin: "SP",
    destination: "MG",
    priorityRank: 1,
    agreement: "protocol_11_1991",
    domesticInterstateRateBps: 1_200,
    importedQualifiedRateBps: 400,
    internalRateBps: 1_800,
    fcpRateBps: 200,
    pmpfLimitBps: 8_000,
    fallbackComparison: "greater_than",
    destinationRule: "RICMS/MG, Anexo VII, Parte 1, art. 58",
    directionalSymmetryAssumed: false,
  },
  {
    route: "SP-RJ",
    origin: "SP",
    destination: "RJ",
    priorityRank: 2,
    agreement: "protocol_11_1991",
    domesticInterstateRateBps: 1_200,
    importedQualifiedRateBps: 400,
    internalRateBps: 2_000,
    fcpRateBps: 200,
    pmpfLimitBps: 8_000,
    fallbackComparison: "greater_than_or_equal",
    destinationRule: "Resolução SEFAZ/RJ 358/2018, art. 4º, IV",
    directionalSymmetryAssumed: false,
  },
];

export type ColdBeverageSpOriginProfileCode =
  | "MG_COCA_COLA_PET_2000"
  | "MG_COCA_COLA_CAN_350"
  | "MG_RED_BULL_CAN_250_270"
  | "MG_MONSTER_CAN_473_500"
  | "MG_GATORADE_PET_500_520"
  | "RJ_COCA_COLA_PET_1751_2000"
  | "RJ_COCA_COLA_CAN_271_400"
  | "RJ_RED_BULL_CAN_UP_TO_310"
  | "RJ_MONSTER_CAN_361_660"
  | "RJ_GATORADE_PET_401_660";

export type ColdBeverageSpOriginProfile = {
  code: ColdBeverageSpOriginProfileCode;
  destination: ColdBeverageSpOriginDestination;
  family: "refrigerante" | "energetico" | "isotonico";
  label: string;
  brand: string;
  packageType: "PET" | "LATA";
  volumeRange: string;
  cest: "03.010.01" | "03.010.02" | "03.013.00" | "03.015.00";
  pmpfCents: number;
  legalTableItem: string;
  effectiveFrom: typeof ST_COLD_BEVERAGES_SP_ORIGIN_PERIOD.from;
  effectiveTo: typeof ST_COLD_BEVERAGES_SP_ORIGIN_PERIOD.to;
};

export const ST_COLD_BEVERAGES_SP_ORIGIN_PMPF_PROFILES: ColdBeverageSpOriginProfile[] = [
  {
    code: "MG_COCA_COLA_PET_2000",
    destination: "MG",
    family: "refrigerante",
    label: "Coca-Cola original · PET descartável de 2.000 ml",
    brand: "Coca-Cola / Coca-Cola Menos Açúcar",
    packageType: "PET",
    volumeRange: "2.000 ml",
    cest: "03.010.01",
    pmpfCents: 1_193,
    legalTableItem: "Portaria SAIF 93/2026, Anexo I, item 483",
    effectiveFrom: ST_COLD_BEVERAGES_SP_ORIGIN_PERIOD.from,
    effectiveTo: ST_COLD_BEVERAGES_SP_ORIGIN_PERIOD.to,
  },
  {
    code: "MG_COCA_COLA_CAN_350",
    destination: "MG",
    family: "refrigerante",
    label: "Coca-Cola original · lata de 350 ml",
    brand: "Coca-Cola",
    packageType: "LATA",
    volumeRange: "350 ml",
    cest: "03.010.02",
    pmpfCents: 497,
    legalTableItem: "Portaria SAIF 93/2026, Anexo I, item 75",
    effectiveFrom: ST_COLD_BEVERAGES_SP_ORIGIN_PERIOD.from,
    effectiveTo: ST_COLD_BEVERAGES_SP_ORIGIN_PERIOD.to,
  },
  {
    code: "MG_RED_BULL_CAN_250_270",
    destination: "MG",
    family: "energetico",
    label: "Red Bull original · lata de 250 a 270 ml",
    brand: "Red Bull",
    packageType: "LATA",
    volumeRange: "250 a 270 ml",
    cest: "03.013.00",
    pmpfCents: 1_130,
    legalTableItem: "Portaria SAIF 93/2026, Anexo III, item 44",
    effectiveFrom: ST_COLD_BEVERAGES_SP_ORIGIN_PERIOD.from,
    effectiveTo: ST_COLD_BEVERAGES_SP_ORIGIN_PERIOD.to,
  },
  {
    code: "MG_MONSTER_CAN_473_500",
    destination: "MG",
    family: "energetico",
    label: "Monster · lata de 473 a 500 ml",
    brand: "Monster",
    packageType: "LATA",
    volumeRange: "473 a 500 ml",
    cest: "03.013.00",
    pmpfCents: 1_078,
    legalTableItem: "Portaria SAIF 93/2026, Anexo III, item 105",
    effectiveFrom: ST_COLD_BEVERAGES_SP_ORIGIN_PERIOD.from,
    effectiveTo: ST_COLD_BEVERAGES_SP_ORIGIN_PERIOD.to,
  },
  {
    code: "MG_GATORADE_PET_500_520",
    destination: "MG",
    family: "isotonico",
    label: "Gatorade · PET descartável de 500 a 520 ml",
    brand: "Gatorade",
    packageType: "PET",
    volumeRange: "500 a 520 ml",
    cest: "03.015.00",
    pmpfCents: 605,
    legalTableItem: "Portaria SAIF 93/2026, Anexo II, item 8",
    effectiveFrom: ST_COLD_BEVERAGES_SP_ORIGIN_PERIOD.from,
    effectiveTo: ST_COLD_BEVERAGES_SP_ORIGIN_PERIOD.to,
  },
  {
    code: "RJ_COCA_COLA_PET_1751_2000",
    destination: "RJ",
    family: "refrigerante",
    label: "Coca-Cola original · PET de 1.751 a 2.000 ml",
    brand: "Coca-Cola Original / Coca-Cola Menos Açúcar",
    packageType: "PET",
    volumeRange: "1.751 a 2.000 ml",
    cest: "03.010.01",
    pmpfCents: 1_074,
    legalTableItem: "Portaria SUBEREC 433/2025, Anexo Único, subitem 2.2.26",
    effectiveFrom: ST_COLD_BEVERAGES_SP_ORIGIN_PERIOD.from,
    effectiveTo: ST_COLD_BEVERAGES_SP_ORIGIN_PERIOD.to,
  },
  {
    code: "RJ_COCA_COLA_CAN_271_400",
    destination: "RJ",
    family: "refrigerante",
    label: "Coca-Cola original · lata de 271 a 400 ml",
    brand: "Coca-Cola Original / Coca-Cola Menos Açúcar",
    packageType: "LATA",
    volumeRange: "271 a 400 ml",
    cest: "03.010.02",
    pmpfCents: 500,
    legalTableItem: "Portaria SUBEREC 433/2025, Anexo Único, subitem 2.2.30",
    effectiveFrom: ST_COLD_BEVERAGES_SP_ORIGIN_PERIOD.from,
    effectiveTo: ST_COLD_BEVERAGES_SP_ORIGIN_PERIOD.to,
  },
  {
    code: "RJ_RED_BULL_CAN_UP_TO_310",
    destination: "RJ",
    family: "energetico",
    label: "Red Bull · lata de até 310 ml",
    brand: "Red Bull",
    packageType: "LATA",
    volumeRange: "até 310 ml",
    cest: "03.013.00",
    pmpfCents: 1_094,
    legalTableItem: "Portaria SUBEREC 433/2025, Anexo Único, subitem 3.29",
    effectiveFrom: ST_COLD_BEVERAGES_SP_ORIGIN_PERIOD.from,
    effectiveTo: ST_COLD_BEVERAGES_SP_ORIGIN_PERIOD.to,
  },
  {
    code: "RJ_MONSTER_CAN_361_660",
    destination: "RJ",
    family: "energetico",
    label: "Monster · lata de 361 a 660 ml",
    brand: "Monster",
    packageType: "LATA",
    volumeRange: "361 a 660 ml",
    cest: "03.013.00",
    pmpfCents: 986,
    legalTableItem: "Portaria SUBEREC 433/2025, Anexo Único, subitem 3.25",
    effectiveFrom: ST_COLD_BEVERAGES_SP_ORIGIN_PERIOD.from,
    effectiveTo: ST_COLD_BEVERAGES_SP_ORIGIN_PERIOD.to,
  },
  {
    code: "RJ_GATORADE_PET_401_660",
    destination: "RJ",
    family: "isotonico",
    label: "Gatorade · PET de 401 a 660 ml",
    brand: "Gatorade",
    packageType: "PET",
    volumeRange: "401 a 660 ml",
    cest: "03.015.00",
    pmpfCents: 652,
    legalTableItem: "Portaria SUBEREC 433/2025, Anexo Único, subitem 4.1.4",
    effectiveFrom: ST_COLD_BEVERAGES_SP_ORIGIN_PERIOD.from,
    effectiveTo: ST_COLD_BEVERAGES_SP_ORIGIN_PERIOD.to,
  },
];

export const ST_COLD_BEVERAGES_SP_ORIGIN_FACT_LABELS = {
  exactProfileConfirmed: "marca, apresentação, volume, NCM/CEST e GTIN coincidem com o perfil selecionado",
  normalTaxRegimeConfirmed: "remetente está no regime normal e o débito próprio segue a alíquota interestadual informada",
  taxpayerResaleOperationConfirmed: "operação entre contribuintes destinada à revenda; uso, consumo, ativo e consumidor final afastados",
  substituteResponsibilityConfirmed: "responsabilidade do remetente paulista pela retenção em favor do destino foi confirmada",
  noProtocolExceptionConfirmed: "transferência, interdependência e demais hipóteses de inaplicabilidade foram afastadas",
  ownTaxBaseConfirmed: "valor da operação e base do ICMS próprio, com frete e encargos, foram conferidos",
  destinationRatesConfirmed: "alíquota interna e adicional do fundo estadual foram conferidos para o produto",
  noSpecialTreatmentConfirmed: "benefício, decisão, regime especial, redução e alíquota específica foram afastados",
  documentsConfirmed: "NF-e, cadastro, contrato, GTIN e documentos comerciais foram conferidos",
} as const;

export type ColdBeverageSpOriginFacts = Record<keyof typeof ST_COLD_BEVERAGES_SP_ORIGIN_FACT_LABELS, boolean>;

export const stColdBeverageSpOriginSources = [
  {
    code: "CONFAZ-PROTOCOL-11-1991",
    title: "Protocolo ICMS 11/91 — bebidas frias",
    publisher: "CONFAZ",
    url: "https://www.confaz.fazenda.gov.br/legislacao/protocolos/1991/pt011_91",
    proves: ["responsabilidade interestadual", "dedução do imposto próprio", "direção da operação"],
  },
  {
    code: "MG-SAIF-93-2026",
    title: "Portaria SAIF 93/2026 — PMPF mineiro",
    publisher: "SEF/MG",
    url: "https://www.fazenda.mg.gov.br/empresas/legislacao_tributaria/portarias/2026/port_saif093_2026.html",
    proves: ["PMPF de refrigerantes, isotônicos e energéticos", "vigência de 01/07/2026 a 31/12/2026"],
  },
  {
    code: "MG-SAIF-93-2026-ANNEX",
    title: "Anexos consolidados da Portaria SAIF 93/2026",
    publisher: "SEF/MG",
    url: "https://www.fazenda.mg.gov.br/empresas/legislacao_tributaria/portarias/2026/port_saif093_2026_anexos.pdf",
    proves: ["cinco perfis e valores mineiros exatos", "alterações consolidadas até a Portaria SAIF 100/2026"],
  },
  {
    code: "MG-RICMS-ANNEX-VII-ART-58",
    title: "RICMS/MG — Anexo VII, arts. 57 a 62",
    publisher: "SEF/MG",
    url: "https://www.fazenda.mg.gov.br/empresas/legislacao_tributaria/ricms_2023_seco/anexovii2023_3.html",
    proves: ["fallback quando a operação interestadual supera 80% do PMPF", "exceção de interdependência"],
  },
  {
    code: "MG-LAW-6763-FEM",
    title: "Lei 6.763/1975 — adicional FEM",
    publisher: "SEF/MG",
    url: "https://www.fazenda.mg.gov.br/empresas/legislacao_tributaria/leis/l6763_1975_02.html",
    proves: ["adicional de 2% para refrigerantes, isotônicos e energéticos até 31/12/2026"],
  },
  {
    code: "RJ-SUBEREC-433-2025",
    title: "Portaria SUBEREC 433/2025 — PMPF fluminense consolidado",
    publisher: "SEFAZ-RJ",
    url: "https://legislacao.fazenda.rj.gov.br/portaria-suberec-no-433-de-26-de-dezembro-de-2025/",
    proves: ["cinco perfis e valores fluminenses exatos", "efeitos a partir de 01/01/2026"],
  },
  {
    code: "RJ-RESOLUTION-358-2018",
    title: "Resolução SEFAZ 358/2018 — metodologia do PMPF",
    publisher: "SEFAZ-RJ",
    url: "https://legislacao.fazenda.rj.gov.br/wcc338767/",
    proves: ["aplicação interestadual do PMPF", "dedução do imposto próprio", "fallback a partir de 80% do PMPF"],
  },
  {
    code: "RJ-INTERNAL-RATES-2026",
    title: "Alíquotas internas do Estado do Rio de Janeiro",
    publisher: "SEFAZ-RJ",
    url: "https://portal.fazenda.rj.gov.br/pagamentos/aliquotas-internas/",
    proves: ["alíquota geral de 20%", "adicional FECP de 2%"],
  },
  {
    code: "RSF-22-1989-INTERSTATE-RATES",
    title: "Resolução do Senado Federal 22/1989",
    publisher: "Senado Federal",
    url: "https://legis.senado.gov.br/norma/586152",
    proves: ["alíquota interestadual doméstica de 12% de SP para MG e RJ"],
  },
  {
    code: "RSF-13-2012-IMPORTED-RATE",
    title: "Resolução do Senado Federal 13/2012",
    publisher: "Senado Federal",
    url: "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2012/congresso/rsf-13-2012.htm",
    proves: ["alíquota de 4% condicionada aos requisitos e exceções para mercadorias importadas"],
  },
].map((source) => ({ ...source, checkedAt: ST_COLD_BEVERAGES_SP_ORIGIN_CHECKED_AT }));

const routeByKey = new Map(ST_COLD_BEVERAGES_SP_ORIGIN_ROUTES.map((route) => [route.route, route]));
const profileByCode = new Map(ST_COLD_BEVERAGES_SP_ORIGIN_PMPF_PROFILES.map((profile) => [profile.code, profile]));

function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function roundDivide(numerator: number, denominator: number) {
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator) || denominator <= 0) {
    throw new Error("unsafe_sp_origin_beverage_calculation");
  }
  return Math.floor((numerator + Math.floor(denominator / 2)) / denominator);
}

export type ColdBeverageSpOriginOperationInput = {
  route: string;
  profileCode: string;
  operationDate: string;
  quantityUnits: number;
  operationCents: number;
  ownIcmsBaseCents: number;
  importedQualified: boolean;
  facts: ColdBeverageSpOriginFacts;
};

export type ColdBeverageSpOriginOperationResult = {
  status: "calculated_reference" | "pmpf_fallback_required" | "blocked";
  route: string;
  operationDate: string;
  profile: ColdBeverageSpOriginProfile | null;
  missingFacts: string[];
  blockers: string[];
  parameters: null | {
    quantityUnits: number;
    pmpfUnitCents: number;
    pmpfLimitCents: number;
    pmpfLimitBps: number;
    fallbackComparison: ColdBeverageSpOriginRoute["fallbackComparison"];
    interstateRateBps: number;
    internalRateBps: number;
    fcpRateBps: number;
    importedQualified: boolean;
  };
  output: null | {
    stBaseCents: number;
    ownIcmsCents: number;
    presumedInternalIcmsCents: number;
    icmsStCents: number;
    fcpCents: number;
    destinationTotalCents: number;
  };
  sourceCodes: string[];
  limitation: string;
};

export function resolveColdBeverageSpOriginOperation(
  input: ColdBeverageSpOriginOperationInput,
): ColdBeverageSpOriginOperationResult {
  const route = routeByKey.get(input.route);
  const profile = profileByCode.get(input.profileCode as ColdBeverageSpOriginProfileCode) ?? null;
  const missingFacts = Object.entries(ST_COLD_BEVERAGES_SP_ORIGIN_FACT_LABELS)
    .filter(([key]) => input.facts?.[key as keyof ColdBeverageSpOriginFacts] !== true)
    .map(([, label]) => label);
  const blockers: string[] = [];

  if (!route) blockers.push("rota fora do lote prioritário SP→MG e SP→RJ");
  if (!profile) blockers.push("produto fora dos dez perfis exatos controlados");
  if (route && profile && route.destination !== profile.destination) {
    blockers.push("o perfil selecionado pertence a outro estado de destino");
  }
  if (!isIsoDate(input.operationDate)
    || input.operationDate < ST_COLD_BEVERAGES_SP_ORIGIN_PERIOD.from
    || input.operationDate > ST_COLD_BEVERAGES_SP_ORIGIN_PERIOD.to) {
    blockers.push("data fora da vigência controlada de 01/07/2026 a 31/12/2026");
  }
  if (!Number.isSafeInteger(input.quantityUnits) || input.quantityUnits <= 0 || input.quantityUnits > 1_000_000) {
    blockers.push("quantidade inválida ou acima do limite controlado");
  }
  if (!Number.isSafeInteger(input.operationCents) || input.operationCents <= 0 || input.operationCents > 100_000_000_000) {
    blockers.push("valor da operação inválido ou acima do limite controlado");
  }
  if (!Number.isSafeInteger(input.ownIcmsBaseCents) || input.ownIcmsBaseCents <= 0 || input.ownIcmsBaseCents > 100_000_000_000) {
    blockers.push("base do ICMS próprio inválida ou acima do limite controlado");
  }
  blockers.push(...missingFacts);

  const baseResult = {
    route: input.route,
    operationDate: input.operationDate,
    profile,
    missingFacts,
    sourceCodes: stColdBeverageSpOriginSources.map((source) => source.code),
    limitation: "Memória determinística restrita ao perfil, destino, vigência e fatos confirmados. Não cobre Simples Nacional, marca ou embalagem divergente, cerveja, água, benefício, regime especial, MVA de fallback nem operação destinada a consumidor final.",
  };
  if (blockers.length > 0 || !route || !profile) {
    return { ...baseResult, status: "blocked", blockers, parameters: null, output: null };
  }

  const stBaseCents = profile.pmpfCents * input.quantityUnits;
  if (!Number.isSafeInteger(stBaseCents)) {
    return { ...baseResult, status: "blocked", blockers: ["base PMPF excede o limite seguro do cálculo"], parameters: null, output: null };
  }
  const pmpfLimitCents = roundDivide(stBaseCents * route.pmpfLimitBps, 10_000);
  const interstateRateBps = input.importedQualified ? route.importedQualifiedRateBps : route.domesticInterstateRateBps;
  const parameters = {
    quantityUnits: input.quantityUnits,
    pmpfUnitCents: profile.pmpfCents,
    pmpfLimitCents,
    pmpfLimitBps: route.pmpfLimitBps,
    fallbackComparison: route.fallbackComparison,
    interstateRateBps,
    internalRateBps: route.internalRateBps,
    fcpRateBps: route.fcpRateBps,
    importedQualified: input.importedQualified,
  };
  const scaledOperation = input.operationCents * 10_000;
  const scaledLimit = stBaseCents * route.pmpfLimitBps;
  const fallbackRequired = route.fallbackComparison === "greater_than"
    ? scaledOperation > scaledLimit
    : scaledOperation >= scaledLimit;

  if (fallbackRequired) {
    const comparator = route.fallbackComparison === "greater_than" ? "superou" : "atingiu ou superou";
    return {
      ...baseResult,
      status: "pmpf_fallback_required",
      blockers: [`o valor da operação própria ${comparator} 80% do PMPF; ${route.destination} exige abandonar a pauta e aplicar a MVA prevista na legislação de destino`],
      parameters,
      output: null,
    };
  }

  const ownIcmsCents = roundDivide(input.ownIcmsBaseCents * interstateRateBps, 10_000);
  const presumedInternalIcmsCents = roundDivide(stBaseCents * route.internalRateBps, 10_000);
  const icmsStCents = Math.max(0, presumedInternalIcmsCents - ownIcmsCents);
  const fcpCents = roundDivide(stBaseCents * route.fcpRateBps, 10_000);

  return {
    ...baseResult,
    status: "calculated_reference",
    blockers: [],
    parameters,
    output: {
      stBaseCents,
      ownIcmsCents,
      presumedInternalIcmsCents,
      icmsStCents,
      fcpCents,
      destinationTotalCents: icmsStCents + fcpCents,
    },
  };
}

const allFactsConfirmed = Object.fromEntries(
  Object.keys(ST_COLD_BEVERAGES_SP_ORIGIN_FACT_LABELS).map((key) => [key, true]),
) as ColdBeverageSpOriginFacts;

export const stColdBeverageSpOriginReferenceRuns = ST_COLD_BEVERAGES_SP_ORIGIN_PMPF_PROFILES.map((profile) => {
  const route = `SP-${profile.destination}`;
  const quantityUnits = 100;
  const stBaseCents = profile.pmpfCents * quantityUnits;
  const operationCents = roundDivide(stBaseCents * 6_000, 10_000);
  const result = resolveColdBeverageSpOriginOperation({
    route,
    profileCode: profile.code,
    operationDate: ST_COLD_BEVERAGES_SP_ORIGIN_CHECKED_AT,
    quantityUnits,
    operationCents,
    ownIcmsBaseCents: operationCents,
    importedQualified: false,
    facts: allFactsConfirmed,
  });
  return {
    key: `${route}:${profile.code}`,
    route,
    profileCode: profile.code,
    scenario: "100 unidades, operação e base própria a 60% do PMPF, mercadoria nacional, regime normal" as const,
    status: result.status,
    output: result.output,
  };
});

export function stColdBeverageSpOriginMetrics() {
  return {
    outboundRoutes: ST_COLD_BEVERAGES_SP_ORIGIN_ROUTES.length,
    exactPmpfProfiles: ST_COLD_BEVERAGES_SP_ORIGIN_PMPF_PROFILES.length,
    controlledCells: stColdBeverageSpOriginReferenceRuns.length,
    reproducedMemories: stColdBeverageSpOriginReferenceRuns.filter((run) => run.status === "calculated_reference").length,
    safeFailures: stColdBeverageSpOriginReferenceRuns.filter((run) => run.status !== "calculated_reference").length,
    officialSources: stColdBeverageSpOriginSources.length,
  };
}

export function validateStColdBeverageSpOrigin() {
  const errors: string[] = [];
  if (ST_COLD_BEVERAGES_SP_ORIGIN_ROUTES.length !== 2
    || new Set(ST_COLD_BEVERAGES_SP_ORIGIN_ROUTES.map((route) => route.route)).size !== 2) {
    errors.push("sp_origin_must_have_two_unique_routes");
  }
  if (ST_COLD_BEVERAGES_SP_ORIGIN_ROUTES.some((route) =>
    route.origin !== "SP"
    || route.directionalSymmetryAssumed !== false
    || route.pmpfLimitBps !== 8_000
    || route.fcpRateBps !== 200)) {
    errors.push("sp_origin_routes_have_invalid_legal_parameters");
  }
  if (ST_COLD_BEVERAGES_SP_ORIGIN_PMPF_PROFILES.length !== 10
    || new Set(ST_COLD_BEVERAGES_SP_ORIGIN_PMPF_PROFILES.map((profile) => profile.code)).size !== 10) {
    errors.push("sp_origin_must_have_ten_unique_profiles");
  }
  for (const destination of ["MG", "RJ"] as const) {
    if (ST_COLD_BEVERAGES_SP_ORIGIN_PMPF_PROFILES.filter((profile) => profile.destination === destination).length !== 5) {
      errors.push(`sp_origin_${destination.toLowerCase()}_must_have_five_profiles`);
    }
  }
  if (ST_COLD_BEVERAGES_SP_ORIGIN_PMPF_PROFILES.some((profile) =>
    profile.pmpfCents <= 0
    || profile.effectiveFrom !== ST_COLD_BEVERAGES_SP_ORIGIN_PERIOD.from
    || profile.effectiveTo !== ST_COLD_BEVERAGES_SP_ORIGIN_PERIOD.to)) {
    errors.push("sp_origin_profiles_have_invalid_scope");
  }
  if (stColdBeverageSpOriginReferenceRuns.length !== 10) errors.push("sp_origin_matrix_must_have_ten_cells");
  if (stColdBeverageSpOriginReferenceRuns.some((run) => run.status !== "calculated_reference" || !run.output)) {
    errors.push("sp_origin_reference_memory_failed");
  }
  if (stColdBeverageSpOriginSources.some((source) => !source.url.startsWith("https://") || source.proves.length === 0)) {
    errors.push("sp_origin_sources_must_be_official_https_with_scope");
  }
  const metrics = stColdBeverageSpOriginMetrics();
  if (metrics.reproducedMemories + metrics.safeFailures !== metrics.controlledCells) {
    errors.push("sp_origin_metrics_do_not_close");
  }
  for (const route of ST_COLD_BEVERAGES_SP_ORIGIN_ROUTES) {
    const profile = ST_COLD_BEVERAGES_SP_ORIGIN_PMPF_PROFILES.find((item) => item.destination === route.destination)!;
    const stBaseCents = profile.pmpfCents * 100;
    const pmpfLimitCents = roundDivide(stBaseCents * route.pmpfLimitBps, 10_000);
    const regressionInput: ColdBeverageSpOriginOperationInput = {
      route: route.route,
      profileCode: profile.code,
      operationDate: ST_COLD_BEVERAGES_SP_ORIGIN_CHECKED_AT,
      quantityUnits: 100,
      operationCents: pmpfLimitCents,
      ownIcmsBaseCents: pmpfLimitCents,
      importedQualified: false,
      facts: allFactsConfirmed,
    };
    const atBoundary = resolveColdBeverageSpOriginOperation(regressionInput);
    const expectedBoundaryStatus = route.fallbackComparison === "greater_than"
      ? "calculated_reference"
      : "pmpf_fallback_required";
    if (atBoundary.status !== expectedBoundaryStatus || (expectedBoundaryStatus !== "calculated_reference" && atBoundary.output !== null)) {
      errors.push(`sp_origin_${route.destination.toLowerCase()}_boundary_gate_failed`);
    }
    const overBoundary = resolveColdBeverageSpOriginOperation({
      ...regressionInput,
      operationCents: pmpfLimitCents + 1,
      ownIcmsBaseCents: pmpfLimitCents + 1,
    });
    if (overBoundary.status !== "pmpf_fallback_required" || overBoundary.output !== null) {
      errors.push(`sp_origin_${route.destination.toLowerCase()}_fallback_gate_failed`);
    }
  }
  const firstProfile = ST_COLD_BEVERAGES_SP_ORIGIN_PMPF_PROFILES[0];
  const negativeInput: ColdBeverageSpOriginOperationInput = {
    route: "SP-MG",
    profileCode: firstProfile.code,
    operationDate: "2027-01-01",
    quantityUnits: 100,
    operationCents: 1,
    ownIcmsBaseCents: 1,
    importedQualified: false,
    facts: { ...allFactsConfirmed, documentsConfirmed: false },
  };
  const blocked = resolveColdBeverageSpOriginOperation(negativeInput);
  if (blocked.status !== "blocked" || blocked.output !== null || blocked.missingFacts.length !== 1) {
    errors.push("sp_origin_validity_and_evidence_gates_failed");
  }
  return { passed: errors.length === 0, errors };
}

export async function hashStColdBeverageSpOrigin() {
  const payload = JSON.stringify({
    version: ST_COLD_BEVERAGES_SP_ORIGIN_VERSION,
    period: ST_COLD_BEVERAGES_SP_ORIGIN_PERIOD,
    routes: ST_COLD_BEVERAGES_SP_ORIGIN_ROUTES,
    profiles: ST_COLD_BEVERAGES_SP_ORIGIN_PMPF_PROFILES,
    facts: ST_COLD_BEVERAGES_SP_ORIGIN_FACT_LABELS,
    sources: stColdBeverageSpOriginSources,
    runs: stColdBeverageSpOriginReferenceRuns,
  });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

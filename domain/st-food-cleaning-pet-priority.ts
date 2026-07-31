import { calculateRepresentativeStMemory } from "./st-sp-mg-legal.ts";

export const ST_FOOD_CLEANING_PET_VERSION = "2026.07.30-v74";
export const ST_FOOD_CLEANING_PET_CHECKED_AT = "2026-07-30";
export const ST_FOOD_CLEANING_PET_PERIOD = { from: "2026-07-30", to: "2026-09-30" } as const;

export type FoodCleaningPetFamily = "food" | "cleaning" | "household_hygiene" | "pet_food";
export type FoodCleaningPetRouteCode = "SP-MG" | "SP-RJ";
export type FoodCleaningPetProductCode =
  | "WHITE_CHOCOLATE_1KG"
  | "FILLED_CHOCOLATE_1KG"
  | "CHOCOLATE_POWDER_1KG"
  | "BLEACH"
  | "POWDER_DETERGENT"
  | "FABRIC_SOFTENER"
  | "DOGCHOW_ABOVE_5KG";

type OfficialSource = {
  code: string;
  title: string;
  publisher: string;
  url: string;
  checkedAt: typeof ST_FOOD_CLEANING_PET_CHECKED_AT;
  proves: string[];
};

export const stFoodCleaningPetSources: OfficialSource[] = [
  {
    code: "CONFAZ-CV142-2018",
    title: "Convênio ICMS 142/2018 — segmentos, NCM e CEST",
    publisher: "CONFAZ",
    url: "https://www.confaz.fazenda.gov.br/legislacao/convenios/2018/CV142_18",
    checkedAt: ST_FOOD_CLEANING_PET_CHECKED_AT,
    proves: ["identidade nacional dos segmentos 11, 17 e 22", "correspondência cumulativa entre descrição, NCM e CEST"],
  },
  {
    code: "MG-RICMS-ANNEX-VII-CURRENT",
    title: "RICMS/MG 2023 — Anexo VII consolidado",
    publisher: "SEF/MG",
    url: "https://www.fazenda.mg.gov.br/empresas/legislacao_tributaria/ricms2023/anexovii2023.pdf",
    checkedAt: ST_FOOD_CLEANING_PET_CHECKED_AT,
    proves: ["âmbitos SP→MG", "MVA dos capítulos 11, 17 e 22", "fórmula de MVA ajustada", "responsabilidade e prazos"],
  },
  {
    code: "MG-RICMS-ANNEX-I-RATES",
    title: "RICMS/MG 2023 — Anexo I, alíquotas",
    publisher: "SEF/MG",
    url: "https://www.fazenda.mg.gov.br/empresas/legislacao_tributaria/ricms_2023_seco/anexoi2023_2.html",
    checkedAt: ST_FOOD_CLEANING_PET_CHECKED_AT,
    proves: ["alíquota interna geral de 18% para operação não especificada em item próprio"],
  },
  {
    code: "MG-LAW-24471-2023-FEM",
    title: "Lei mineira nº 24.471/2023 — FEM e essencialidade da ração pet",
    publisher: "SEF/MG",
    url: "https://www.fazenda.mg.gov.br/empresas/legislacao_tributaria/leis/2023/l24471_2023.html",
    checkedAt: ST_FOOD_CLEANING_PET_CHECKED_AT,
    proves: ["catálogo legal do adicional FEM", "ração tipo pet não é tratada como bem supérfluo"],
  },
  {
    code: "MG-SAIF-74-2026-PET",
    title: "Portaria SAIF nº 74/2026 — PMPF de rações secas tipo pet",
    publisher: "SEF/MG",
    url: "https://www.fazenda.mg.gov.br/empresas/legislacao_tributaria/portarias/2026/port_saif074_2026.html",
    checkedAt: ST_FOOD_CLEANING_PET_CHECKED_AT,
    proves: ["PMPF obrigatório entre 01/04/2026 e 30/09/2026", "base por peso líquido", "fallback para MVA quando a operação própria alcança o PMPF"],
  },
  {
    code: "MG-SAIF-74-2026-PET-ANNEX",
    title: "Anexo da Portaria SAIF nº 74/2026 — tabela PMPF",
    publisher: "SEF/MG",
    url: "https://www.fazenda.mg.gov.br/empresas/legislacao_tributaria/portarias/2026/port_saif074_2026_anexo.pdf",
    checkedAt: ST_FOOD_CLEANING_PET_CHECKED_AT,
    proves: ["DOGCHOW acima de 5 kg com PMPF de R$ 13,75 por kg", "identidade de produto e apresentação"],
  },
  {
    code: "CONFAZ-PT28-2009",
    title: "Protocolo ICMS 28/2009 — produtos alimentícios",
    publisher: "CONFAZ",
    url: "https://www.confaz.fazenda.gov.br/legislacao/protocolos/2009/pt028_09",
    checkedAt: ST_FOOD_CLEANING_PET_CHECKED_AT,
    proves: ["acordo interestadual de produtos alimentícios entre SP e MG"],
  },
  {
    code: "CONFAZ-PT33-2009",
    title: "Protocolo ICMS 33/2009 — materiais de limpeza",
    publisher: "CONFAZ",
    url: "https://www.confaz.fazenda.gov.br/legislacao/protocolos/2009/pt033_09",
    checkedAt: ST_FOOD_CLEANING_PET_CHECKED_AT,
    proves: ["acordo interestadual de materiais de limpeza entre SP e MG"],
  },
  {
    code: "CONFAZ-PT26-2004",
    title: "Protocolo ICMS 26/2004 — rações para animais domésticos",
    publisher: "CONFAZ",
    url: "https://www.confaz.fazenda.gov.br/legislacao/protocolos/2004/pt026_04",
    checkedAt: ST_FOOD_CLEANING_PET_CHECKED_AT,
    proves: ["responsabilidade do remetente nas operações SP→MG com ração pet", "inaplicabilidades do acordo"],
  },
  {
    code: "RJ-RICMS-ST-PORTAL",
    title: "Legislação de substituição tributária do Rio de Janeiro",
    publisher: "SEFAZ-RJ",
    url: "https://portal.fazenda.rj.gov.br/icms/substituicao-tributaria/",
    checkedAt: ST_FOOD_CLEANING_PET_CHECKED_AT,
    proves: ["fonte oficial de destino para a próxima rodada de parâmetros", "impossibilidade de emprestar a tabela mineira à rota SP→RJ"],
  },
];

export type FoodCleaningPetProduct = {
  code: FoodCleaningPetProductCode;
  priorityRank: number;
  family: FoodCleaningPetFamily;
  label: string;
  cest: string;
  ncm: string;
  presentation: string;
  description: string;
  searchTerms: string[];
  mgMvaOriginalBps: number;
  petPmpfProfile: null | { product: string; weightBand: "above_5kg"; pmpfPerKgCents: number };
  exclusions: string[];
  sourceCodes: string[];
};

export const ST_FOOD_CLEANING_PET_PRODUCTS: FoodCleaningPetProduct[] = [
  {
    code: "WHITE_CHOCOLATE_1KG",
    priorityRank: 1,
    family: "food",
    label: "Chocolate branco",
    cest: "17.001.00",
    ncm: "17049010",
    presentation: "embalagem de conteúdo inferior ou igual a 1 kg",
    description: "Chocolate branco, exceto ovo de páscoa do CEST 17.005.00",
    searchTerms: ["chocolate branco"],
    mgMvaOriginalBps: 7_788,
    petPmpfProfile: null,
    exclusions: ["embalagem acima de 1 kg", "ovo de páscoa", "cobertura classificada em outro CEST"],
    sourceCodes: ["CONFAZ-CV142-2018", "MG-RICMS-ANNEX-VII-CURRENT", "CONFAZ-PT28-2009"],
  },
  {
    code: "FILLED_CHOCOLATE_1KG",
    priorityRank: 2,
    family: "food",
    label: "Chocolate recheado",
    cest: "17.002.00",
    ncm: "18063110",
    presentation: "tablete, barra ou pau, recheado, em embalagem inferior ou igual a 1 kg",
    description: "Chocolate recheado no recorte exato da tabela mineira",
    searchTerms: ["chocolate recheado", "barra recheada"],
    mgMvaOriginalBps: 7_121,
    petPmpfProfile: null,
    exclusions: ["embalagem acima de 1 kg", "produto não recheado", "preparação de NCM diverso"],
    sourceCodes: ["CONFAZ-CV142-2018", "MG-RICMS-ANNEX-VII-CURRENT", "CONFAZ-PT28-2009"],
  },
  {
    code: "CHOCOLATE_POWDER_1KG",
    priorityRank: 3,
    family: "food",
    label: "Achocolatado em pó",
    cest: "17.006.00",
    ncm: "18069000",
    presentation: "embalagem inferior ou igual a 1 kg, exceto cápsulas",
    description: "Achocolatado em pó, fora do CEST específico de cápsulas",
    searchTerms: ["achocolatado", "chocolate em po"],
    mgMvaOriginalBps: 2_500,
    petPmpfProfile: null,
    exclusions: ["cápsulas", "embalagem acima de 1 kg", "cacau em pó do NCM 1806.10.00"],
    sourceCodes: ["CONFAZ-CV142-2018", "MG-RICMS-ANNEX-VII-CURRENT", "CONFAZ-PT28-2009"],
  },
  {
    code: "BLEACH",
    priorityRank: 4,
    family: "household_hygiene",
    label: "Água sanitária e alvejante",
    cest: "11.001.00",
    ncm: "34025000",
    presentation: "produto doméstico compatível com a descrição legal",
    description: "Água sanitária, branqueador ou outro alvejante",
    searchTerms: ["agua sanitaria", "alvejante", "branqueador"],
    mgMvaOriginalBps: 6_500,
    petPmpfProfile: null,
    exclusions: ["desinfetante ou sanitizante classificado em CEST próprio", "produto industrial fora da descrição"],
    sourceCodes: ["CONFAZ-CV142-2018", "MG-RICMS-ANNEX-VII-CURRENT", "CONFAZ-PT33-2009"],
  },
  {
    code: "POWDER_DETERGENT",
    priorityRank: 5,
    family: "cleaning",
    label: "Detergente em pó",
    cest: "11.004.00",
    ncm: "34025000",
    presentation: "pó, flocos, palhetas, grânulos ou forma semelhante",
    description: "Detergente em pó, inclusive com propriedade desinfetante ou sanitizante",
    searchTerms: ["detergente em po", "sabao em po"],
    mgMvaOriginalBps: 4_088,
    petPmpfProfile: null,
    exclusions: ["detergente líquido", "agente de superfície em CEST residual"],
    sourceCodes: ["CONFAZ-CV142-2018", "MG-RICMS-ANNEX-VII-CURRENT", "CONFAZ-PT33-2009"],
  },
  {
    code: "FABRIC_SOFTENER",
    priorityRank: 6,
    family: "household_hygiene",
    label: "Amaciante",
    cest: "11.008.00",
    ncm: "38099190",
    presentation: "amaciante ou suavizante para roupas",
    description: "Amaciante ou suavizante no recorte do capítulo 11",
    searchTerms: ["amaciante", "suavizante"],
    mgMvaOriginalBps: 3_500,
    petPmpfProfile: null,
    exclusions: ["preparação têxtil de uso industrial com descrição divergente"],
    sourceCodes: ["CONFAZ-CV142-2018", "MG-RICMS-ANNEX-VII-CURRENT", "CONFAZ-PT33-2009"],
  },
  {
    code: "DOGCHOW_ABOVE_5KG",
    priorityRank: 7,
    family: "pet_food",
    label: "DOGCHOW acima de 5 kg",
    cest: "22.001.00",
    ncm: "23090000",
    presentation: "ração seca para cães em embalagem acima de 5 kg",
    description: "Produto DOGCHOW constante da pauta mineira vigente",
    searchTerms: ["dogchow", "dog chow", "racao pet", "racao para cachorro"],
    mgMvaOriginalBps: 5_555,
    petPmpfProfile: { product: "DOGCHOW", weightBand: "above_5kg", pmpfPerKgCents: 1_375 },
    exclusions: ["ração úmida", "ração de animal que não seja doméstico", "produto ou faixa de peso diferente da pauta"],
    sourceCodes: ["CONFAZ-CV142-2018", "MG-RICMS-ANNEX-VII-CURRENT", "MG-SAIF-74-2026-PET", "MG-SAIF-74-2026-PET-ANNEX", "CONFAZ-PT26-2004"],
  },
];

export const ST_FOOD_CLEANING_PET_ROUTES = [
  {
    route: "SP-MG" as const,
    priorityRank: 1,
    origin: "SP" as const,
    destination: "MG" as const,
    coverageStatus: "supported" as const,
    responsibility: "origin_remitter" as const,
    internalRateBps: 1_800,
    interstateRateBps: 1_200,
    fcpRateBps: 0,
    sourceCodes: ["MG-RICMS-ANNEX-VII-CURRENT", "MG-RICMS-ANNEX-I-RATES", "MG-LAW-24471-2023-FEM"],
    blockers: [] as string[],
  },
  {
    route: "SP-RJ" as const,
    priorityRank: 2,
    origin: "SP" as const,
    destination: "RJ" as const,
    coverageStatus: "partial" as const,
    responsibility: null,
    internalRateBps: null,
    interstateRateBps: 1_200,
    fcpRateBps: null,
    sourceCodes: ["RJ-RICMS-ST-PORTAL"],
    blockers: ["MVA/PMPF ou pauta fluminense por produto e apresentação", "alíquota interna e FECP", "responsabilidade e acordo vigente por segmento", "reduções, benefícios e exceções"],
  },
] as const;

export const ST_FOOD_CLEANING_PET_FACT_LABELS = {
  exactIdentity: "Descrição, NCM, CEST e apresentação coincidem integralmente.",
  domesticGoods: "Mercadoria nacional com alíquota interestadual de 12%.",
  ordinaryRegime: "Remetente no regime normal; Simples Nacional exige memória própria.",
  taxpayerRecipient: "Destinatário contribuinte do ICMS.",
  resalePurpose: "Finalidade de revenda confirmada.",
  noBenefitOrReduction: "Sem benefício, redução, diferimento, regime especial ou transferência alcançada por exceção.",
  documentsConfirmed: "NF-e e documentos confirmam valores, partes, finalidade, origem, peso e data.",
} as const;

export type FoodCleaningPetInput = {
  route: FoodCleaningPetRouteCode;
  productCode: FoodCleaningPetProductCode;
  operationDate: string;
  ncm: string;
  cest: string;
  operationPriceCents: number;
  discountsCents: number;
  freightCents: number;
  insuranceCents: number;
  ipiCents: number;
  otherExpensesCents: number;
  ownIcmsBaseCents: number;
  weightGrams: number | null;
  forceMvaFallback: boolean;
  facts: Record<keyof typeof ST_FOOD_CLEANING_PET_FACT_LABELS, boolean>;
};

export type FoodCleaningPetResult = {
  status: "calculated_reference" | "blocked" | "not_applicable";
  coverageStatus: "supported" | "partial" | "not_supported";
  method: "mva" | "pmpf" | null;
  route: FoodCleaningPetRouteCode;
  productCode: FoodCleaningPetProductCode;
  responsibility: "origin_remitter" | null;
  missingFacts: string[];
  blockers: string[];
  parameters: null | {
    mvaOriginalBps: number | null;
    mvaAdjustedBps: number | null;
    pmpfPerKgCents: number | null;
    interstateRateBps: number;
    internalRateBps: number;
    fcpRateBps: number;
  };
  output: null | {
    mvaAppliedBps: number | null;
    stBaseCents: number;
    ownIcmsCents: number;
    presumedInternalIcmsCents: number;
    icmsStCents: number;
    fcpCents: number;
    destinationTotalCents: number;
  };
  sourceCodes: string[];
  version: typeof ST_FOOD_CLEANING_PET_VERSION;
};

const productByCode = new Map(ST_FOOD_CLEANING_PET_PRODUCTS.map((product) => [product.code, product]));
const routeByCode = new Map(ST_FOOD_CLEANING_PET_ROUTES.map((route) => [route.route, route]));
const sourceByCode = new Map(stFoodCleaningPetSources.map((source) => [source.code, source]));

function roundDivide(numerator: number, denominator: number) {
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator) || denominator <= 0) throw new Error("unsafe_food_cleaning_pet_calculation");
  return Math.floor((numerator + Math.floor(denominator / 2)) / denominator);
}

function validMoney(values: number[]) {
  return values.every((value) => Number.isSafeInteger(value) && value >= 0);
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}

export function resolveFoodCleaningPetOperation(input: FoodCleaningPetInput): FoodCleaningPetResult {
  const product = productByCode.get(input.productCode);
  const route = routeByCode.get(input.route);
  const missingFacts = Object.entries(input.facts).filter(([, confirmed]) => confirmed !== true).map(([fact]) => fact);
  const blockers: string[] = [];
  if (!product || !route) blockers.push("product_or_route_not_catalogued");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.operationDate) || input.operationDate < ST_FOOD_CLEANING_PET_PERIOD.from || input.operationDate > ST_FOOD_CLEANING_PET_PERIOD.to) blockers.push("operation_date_outside_versioned_period");
  if (product && input.cest !== product.cest) blockers.push("cest_mismatch");
  if (product && input.ncm.replace(/\D/g, "") !== product.ncm) blockers.push("ncm_mismatch");
  if (missingFacts.length > 0) blockers.push("mandatory_facts_missing");
  if (!validMoney([input.operationPriceCents, input.discountsCents, input.freightCents, input.insuranceCents, input.ipiCents, input.otherExpensesCents, input.ownIcmsBaseCents]) || input.operationPriceCents <= 0 || input.ownIcmsBaseCents <= 0) blockers.push("invalid_monetary_components");
  const operationCompositionCents = input.operationPriceCents - input.discountsCents + input.freightCents + input.insuranceCents + input.ipiCents + input.otherExpensesCents;
  if (!Number.isSafeInteger(operationCompositionCents) || operationCompositionCents <= 0) blockers.push("invalid_operation_composition");
  if (product?.petPmpfProfile && (!Number.isSafeInteger(input.weightGrams) || (input.weightGrams ?? 0) <= 5_000)) blockers.push("pet_weight_or_presentation_mismatch");
  if (!input.facts.resalePurpose) {
    return {
      status: "not_applicable",
      coverageStatus: "not_supported",
      method: null,
      route: input.route,
      productCode: input.productCode,
      responsibility: route?.responsibility ?? null,
      missingFacts,
      blockers: unique([...blockers, "resale_rule_not_applicable"]),
      parameters: null,
      output: null,
      sourceCodes: unique([...(product?.sourceCodes ?? []), ...(route?.sourceCodes ?? [])]),
      version: ST_FOOD_CLEANING_PET_VERSION,
    };
  }
  if (route?.coverageStatus !== "supported") blockers.push("route_parameters_not_closed");
  if (blockers.length > 0 || !product || !route || route.internalRateBps === null || route.fcpRateBps === null) {
    return {
      status: "blocked",
      coverageStatus: product && route ? route.coverageStatus : "not_supported",
      method: null,
      route: input.route,
      productCode: input.productCode,
      responsibility: route?.responsibility ?? null,
      missingFacts,
      blockers: unique([...blockers, ...(route?.blockers ?? [])]),
      parameters: null,
      output: null,
      sourceCodes: unique([...(product?.sourceCodes ?? []), ...(route?.sourceCodes ?? [])]),
      version: ST_FOOD_CLEANING_PET_VERSION,
    };
  }

  const commonSources = unique([...product.sourceCodes, ...route.sourceCodes]);
  const petProfile = product.petPmpfProfile;
  const ownPricePerKgCents = petProfile && input.weightGrams ? roundDivide(operationCompositionCents * 1_000, input.weightGrams) : null;
  const usePmpf = Boolean(petProfile && !input.forceMvaFallback && ownPricePerKgCents !== null && ownPricePerKgCents < petProfile.pmpfPerKgCents);
  if (usePmpf && petProfile && input.weightGrams) {
    const stBaseCents = roundDivide(input.weightGrams * petProfile.pmpfPerKgCents, 1_000);
    const ownIcmsCents = roundDivide(input.ownIcmsBaseCents * route.interstateRateBps, 10_000);
    const presumedInternalIcmsCents = roundDivide(stBaseCents * route.internalRateBps, 10_000);
    const icmsStCents = Math.max(0, presumedInternalIcmsCents - ownIcmsCents);
    const fcpCents = roundDivide(stBaseCents * route.fcpRateBps, 10_000);
    return {
      status: "calculated_reference",
      coverageStatus: "supported",
      method: "pmpf",
      route: route.route,
      productCode: product.code,
      responsibility: route.responsibility,
      missingFacts: [],
      blockers: [],
      parameters: { mvaOriginalBps: null, mvaAdjustedBps: null, pmpfPerKgCents: petProfile.pmpfPerKgCents, interstateRateBps: route.interstateRateBps, internalRateBps: route.internalRateBps, fcpRateBps: route.fcpRateBps },
      output: { mvaAppliedBps: null, stBaseCents, ownIcmsCents, presumedInternalIcmsCents, icmsStCents, fcpCents, destinationTotalCents: icmsStCents + fcpCents },
      sourceCodes: commonSources,
      version: ST_FOOD_CLEANING_PET_VERSION,
    };
  }

  const output = calculateRepresentativeStMemory({
    operationCents: operationCompositionCents,
    ownIcmsBaseCents: input.ownIcmsBaseCents,
    mvaOriginalBps: product.mgMvaOriginalBps,
    interstateRateBps: route.interstateRateBps,
    internalRateBps: route.internalRateBps,
    fcpRateBps: route.fcpRateBps,
    adjustMva: true,
  });
  return {
    status: "calculated_reference",
    coverageStatus: "supported",
    method: "mva",
    route: route.route,
    productCode: product.code,
    responsibility: route.responsibility,
    missingFacts: [],
    blockers: [],
    parameters: { mvaOriginalBps: product.mgMvaOriginalBps, mvaAdjustedBps: output.mvaAppliedBps, pmpfPerKgCents: petProfile?.pmpfPerKgCents ?? null, interstateRateBps: route.interstateRateBps, internalRateBps: route.internalRateBps, fcpRateBps: route.fcpRateBps },
    output,
    sourceCodes: commonSources,
    version: ST_FOOD_CLEANING_PET_VERSION,
  };
}

const allFacts = Object.fromEntries(Object.keys(ST_FOOD_CLEANING_PET_FACT_LABELS).map((key) => [key, true])) as FoodCleaningPetInput["facts"];

function referenceInput(product: FoodCleaningPetProduct, route: (typeof ST_FOOD_CLEANING_PET_ROUTES)[number]): FoodCleaningPetInput {
  const pet = Boolean(product.petPmpfProfile);
  return {
    route: route.route,
    productCode: product.code,
    operationDate: ST_FOOD_CLEANING_PET_CHECKED_AT,
    ncm: product.ncm,
    cest: product.cest,
    operationPriceCents: pet ? 10_000 : 100_000,
    discountsCents: 0,
    freightCents: 0,
    insuranceCents: 0,
    ipiCents: 0,
    otherExpensesCents: 0,
    ownIcmsBaseCents: pet ? 10_000 : 100_000,
    weightGrams: pet ? 10_000 : null,
    forceMvaFallback: false,
    facts: { ...allFacts },
  };
}

export const stFoodCleaningPetReferenceRuns = ST_FOOD_CLEANING_PET_ROUTES.flatMap((route) =>
  ST_FOOD_CLEANING_PET_PRODUCTS.map((product) => ({
    key: `${route.route}:${product.code}`,
    route: route.route,
    productCode: product.code,
    result: resolveFoodCleaningPetOperation(referenceInput(product, route)),
  })),
);

const mgRoute = ST_FOOD_CLEANING_PET_ROUTES[0];
const petProduct = ST_FOOD_CLEANING_PET_PRODUCTS.find((product) => product.code === "DOGCHOW_ABOVE_5KG")!;
const foodProduct = ST_FOOD_CLEANING_PET_PRODUCTS[0];

export const stFoodCleaningPetNegativeRuns = [
  { code: "benefit", result: resolveFoodCleaningPetOperation({ ...referenceInput(foodProduct, mgRoute), facts: { ...allFacts, noBenefitOrReduction: false } }) },
  { code: "exception", result: resolveFoodCleaningPetOperation({ ...referenceInput(foodProduct, mgRoute), facts: { ...allFacts, resalePurpose: false } }) },
  { code: "expired", result: resolveFoodCleaningPetOperation({ ...referenceInput(foodProduct, mgRoute), operationDate: "2026-10-01" }) },
  { code: "missing_data", result: resolveFoodCleaningPetOperation({ ...referenceInput(foodProduct, mgRoute), facts: { ...allFacts, documentsConfirmed: false } }) },
  { code: "classification_mismatch", result: resolveFoodCleaningPetOperation({ ...referenceInput(foodProduct, mgRoute), cest: "17.005.00" }) },
  { code: "pet_presentation_mismatch", result: resolveFoodCleaningPetOperation({ ...referenceInput(petProduct, mgRoute), weightGrams: 5_000 }) },
] as const;

export const stFoodCleaningPetMvaFallbackRun = resolveFoodCleaningPetOperation({
  ...referenceInput(petProduct, mgRoute),
  operationPriceCents: 15_000,
  ownIcmsBaseCents: 15_000,
  forceMvaFallback: true,
});

export function searchFoodCleaningPetRules(query: string) {
  const normalized = query.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const products = ST_FOOD_CLEANING_PET_PRODUCTS.filter((product) => product.searchTerms.some((term) => normalized.includes(term)));
  const routes = ST_FOOD_CLEANING_PET_ROUTES.filter((route) => normalized.includes(route.destination.toLowerCase()) || normalized.includes(route.destination === "MG" ? "minas gerais" : "rio de janeiro"));
  const selectedRoutes = routes.length ? routes : ST_FOOD_CLEANING_PET_ROUTES;
  return products.flatMap((product) => selectedRoutes.map((route) => ({
    productCode: product.code,
    family: product.family,
    route: route.route,
    status: route.coverageStatus,
    cest: product.cest,
    ncm: product.ncm,
    presentation: product.presentation,
    blockers: [...route.blockers],
    version: ST_FOOD_CLEANING_PET_VERSION,
  })));
}

export function buildFoodCleaningPetDossier(result: FoodCleaningPetResult) {
  const product = productByCode.get(result.productCode);
  const route = routeByCode.get(result.route);
  return {
    schemaVersion: "food-cleaning-pet-dossier.v1",
    ruleVersion: ST_FOOD_CLEANING_PET_VERSION,
    status: result.status,
    coverageStatus: result.coverageStatus,
    identity: product ? { code: product.code, family: product.family, label: product.label, cest: product.cest, ncm: product.ncm, presentation: product.presentation } : null,
    route: route ? { route: route.route, responsibility: route.responsibility } : null,
    method: result.method,
    parameters: result.parameters,
    calculation: result.output,
    blockers: result.blockers,
    evidence: result.sourceCodes.map((code) => sourceByCode.get(code)).filter((source): source is OfficialSource => Boolean(source)),
    limitation: "Memória condicionada ao recorte exato. Não classifica mercadoria divergente nem substitui conferência documental da operação.",
  };
}

export const stFoodCleaningPetDossiers = stFoodCleaningPetReferenceRuns.map((run) => ({ key: run.key, dossier: buildFoodCleaningPetDossier(run.result) }));

export function stFoodCleaningPetMetrics() {
  return {
    priorityProducts: ST_FOOD_CLEANING_PET_PRODUCTS.length,
    productFamilies: new Set(ST_FOOD_CLEANING_PET_PRODUCTS.map((product) => product.family)).size,
    priorityRoutes: ST_FOOD_CLEANING_PET_ROUTES.length,
    controlledCells: stFoodCleaningPetReferenceRuns.length,
    reproducedMemories: stFoodCleaningPetReferenceRuns.filter((run) => run.result.status === "calculated_reference").length,
    mvaMemories: stFoodCleaningPetReferenceRuns.filter((run) => run.result.method === "mva").length + (stFoodCleaningPetMvaFallbackRun.status === "calculated_reference" ? 1 : 0),
    pmpfMemories: stFoodCleaningPetReferenceRuns.filter((run) => run.result.method === "pmpf").length,
    safeFailureScenarios: stFoodCleaningPetNegativeRuns.filter((run) => run.result.output === null).length,
    officialSources: stFoodCleaningPetSources.length,
    coverage: {
      supported: stFoodCleaningPetReferenceRuns.filter((run) => run.result.coverageStatus === "supported").length,
      partial: stFoodCleaningPetReferenceRuns.filter((run) => run.result.coverageStatus === "partial").length,
      notSupported: stFoodCleaningPetReferenceRuns.filter((run) => run.result.coverageStatus === "not_supported").length,
    },
  };
}

export function validateStFoodCleaningPetPriority() {
  const errors: string[] = [];
  if (ST_FOOD_CLEANING_PET_PRODUCTS.length !== 7 || new Set(ST_FOOD_CLEANING_PET_PRODUCTS.map((product) => product.code)).size !== 7) errors.push("seven_unique_products_required");
  if (new Set(ST_FOOD_CLEANING_PET_PRODUCTS.map((product) => product.family)).size !== 4) errors.push("four_segregated_families_required");
  if (ST_FOOD_CLEANING_PET_ROUTES.length !== 2) errors.push("two_priority_routes_required");
  if (stFoodCleaningPetSources.some((source) => !source.url.startsWith("https://") || source.proves.length === 0)) errors.push("official_source_without_scope");
  for (const product of ST_FOOD_CLEANING_PET_PRODUCTS) {
    if (!/^\d{2}\.\d{3}\.\d{2}$/.test(product.cest) || !/^\d{8}$/.test(product.ncm) || !product.presentation || product.exclusions.length === 0) errors.push(`incomplete_product:${product.code}`);
    if (product.sourceCodes.some((code) => !sourceByCode.has(code))) errors.push(`unknown_product_source:${product.code}`);
  }
  const supported = stFoodCleaningPetReferenceRuns.filter((run) => run.route === "SP-MG");
  if (supported.some((run) => run.result.status !== "calculated_reference" || run.result.output === null)) errors.push("mg_reference_not_reproduced");
  const partial = stFoodCleaningPetReferenceRuns.filter((run) => run.route === "SP-RJ");
  if (partial.some((run) => run.result.status !== "blocked" || run.result.output !== null || run.result.coverageStatus !== "partial")) errors.push("rj_partial_cell_leaked_value");
  if (stFoodCleaningPetNegativeRuns.some((run) => run.result.output !== null || run.result.status === "calculated_reference")) errors.push("negative_gate_released_value");
  if (stFoodCleaningPetMvaFallbackRun.method !== "mva" || stFoodCleaningPetMvaFallbackRun.output === null) errors.push("pet_mva_fallback_not_reproduced");
  if (supported.find((run) => run.productCode === "DOGCHOW_ABOVE_5KG")?.result.method !== "pmpf") errors.push("pet_pmpf_not_reproduced");
  if (searchFoodCleaningPetRules("detergente em pó de SP para MG").length !== 1) errors.push("search_did_not_narrow_product_and_route");
  return { passed: errors.length === 0, errors };
}

export async function hashStFoodCleaningPetPriority() {
  const payload = JSON.stringify({
    version: ST_FOOD_CLEANING_PET_VERSION,
    period: ST_FOOD_CLEANING_PET_PERIOD,
    sources: stFoodCleaningPetSources,
    products: ST_FOOD_CLEANING_PET_PRODUCTS,
    routes: ST_FOOD_CLEANING_PET_ROUTES,
    runs: stFoodCleaningPetReferenceRuns,
    fallback: stFoodCleaningPetMvaFallbackRun,
    negativeRuns: stFoodCleaningPetNegativeRuns,
  });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

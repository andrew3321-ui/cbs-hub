import { calculateRepresentativeStMemory } from "./st-sp-mg-legal.ts";

export const ST_CONSTRUCTION_ELECTRICAL_VERSION = "2026.07.30-v72";
export const ST_CONSTRUCTION_ELECTRICAL_CHECKED_AT = "2026-07-30";
export const ST_CONSTRUCTION_ELECTRICAL_PERIOD = { from: "2026-07-30", to: "2026-12-31" } as const;

export type ConstructionElectricalProductCode =
  | "ARGAMASSA"
  | "PVC_FINISHING"
  | "MANUAL_TOOLS"
  | "TRANSFORMERS"
  | "ELECTRIC_WATER_HEATERS"
  | "CONSTRUCTION_CABLES";

export type ConstructionElectricalRouteCode = "SP-MG" | "SP-RJ";
export type ConstructionElectricalFamily = "construction" | "finishing" | "tools" | "electrical";

type OfficialSource = {
  code: string;
  title: string;
  publisher: string;
  url: string;
  checkedAt: typeof ST_CONSTRUCTION_ELECTRICAL_CHECKED_AT;
  proves: string[];
};

export const stConstructionElectricalSources: OfficialSource[] = [
  {
    code: "CONFAZ-CV142-2018",
    title: "Convênio ICMS 142/2018 — segmentos sujeitos à substituição tributária",
    publisher: "CONFAZ",
    url: "https://www.confaz.fazenda.gov.br/legislacao/convenios/2018/CV142_18",
    checkedAt: ST_CONSTRUCTION_ELECTRICAL_CHECKED_AT,
    proves: ["identidade CEST nacional dos segmentos de ferramentas, construção e materiais elétricos", "regra geral de correspondência entre descrição, NCM e CEST"],
  },
  {
    code: "MG-RICMS-ANNEX-VII-PART-4",
    title: "RICMS/MG 2023 — Anexo VII, ferramentas e materiais de construção",
    publisher: "SEF/MG",
    url: "https://www.fazenda.mg.gov.br/empresas/legislacao_tributaria/ricms_2023_seco/anexovii2023_4.html",
    checkedAt: ST_CONSTRUCTION_ELECTRICAL_CHECKED_AT,
    proves: ["âmbito SP→MG dos Protocolos 27/09 e 32/09", "NCM, CEST, descrição, MVA e exceções de ferramentas e construção"],
  },
  {
    code: "MG-RICMS-ANNEX-VII-PART-5",
    title: "RICMS/MG 2023 — Anexo VII, materiais elétricos",
    publisher: "SEF/MG",
    url: "https://www.fazenda.mg.gov.br/empresas/legislacao_tributaria/ricms_2023_seco/anexovii2023_5.html",
    checkedAt: ST_CONSTRUCTION_ELECTRICAL_CHECKED_AT,
    proves: ["âmbito SP→MG do Protocolo 39/09", "NCM, CEST, descrição, MVA e exclusões de materiais elétricos"],
  },
  {
    code: "MG-RICMS-ANNEX-VII-FORMULA",
    title: "RICMS/MG 2023 — Anexo VII, formação da base e MVA ajustada",
    publisher: "SEF/MG",
    url: "https://www.fazenda.mg.gov.br/empresas/legislacao_tributaria/ricms_2023_seco/anexovii2023_2.html",
    checkedAt: ST_CONSTRUCTION_ELECTRICAL_CHECKED_AT,
    proves: ["composição da base de cálculo", "fórmula da MVA ajustada", "hipóteses de inaplicabilidade e regime especial"],
  },
  {
    code: "MG-LAW-6763-RATES",
    title: "Lei mineira nº 6.763/1975 — alíquotas internas e interestaduais",
    publisher: "SEF/MG",
    url: "https://www.fazenda.mg.gov.br/empresas/legislacao_tributaria/leis/l6763_1975_02.html",
    checkedAt: ST_CONSTRUCTION_ELECTRICAL_CHECKED_AT,
    proves: ["alíquota interna geral de 18%", "alíquota interestadual de 12% entre Sul e Sudeste", "catálogo legal do adicional destinado ao FEM"],
  },
  {
    code: "RJ-RICMS-LIVRO-II-ANNEX-I",
    title: "RICMS/RJ — Livro II, Anexo I, mercadorias e MVA de ST",
    publisher: "SEFAZ-RJ",
    url: "https://portal.fazenda.rj.gov.br/icms/wp-content/uploads/sites/42/2023/10/anexo_I_livroII_2.pdf",
    checkedAt: ST_CONSTRUCTION_ELECTRICAL_CHECKED_AT,
    proves: ["aquisição no RJ procedente de UF não signatária", "NCM, CEST, descrição, MVA original e MVA ajustada a 12%"],
  },
  {
    code: "RJ-INTERNAL-RATES-FECP",
    title: "Alíquotas internas do ICMS e FECP no Rio de Janeiro",
    publisher: "SEFAZ-RJ",
    url: "https://portal.fazenda.rj.gov.br/pagamentos/aliquotas-internas/",
    checkedAt: ST_CONSTRUCTION_ELECTRICAL_CHECKED_AT,
    proves: ["alíquota geral de ICMS de 20%", "adicional geral de FECP de 2%", "recolhimento separado dos valores"],
  },
  {
    code: "CONFAZ-PT196-2009",
    title: "Protocolo ICMS 196/2009 — materiais de construção",
    publisher: "CONFAZ",
    url: "https://www.confaz.fazenda.gov.br/legislacao/protocolos/2009/pt196_09",
    checkedAt: ST_CONSTRUCTION_ELECTRICAL_CHECKED_AT,
    proves: ["responsabilidade nas operações entre signatários", "exclusões por CEST e finalidade", "ausência de São Paulo entre os signatários do recorte RJ"],
  },
  {
    code: "CONFAZ-PT193-2009",
    title: "Protocolo ICMS 193/2009 — ferramentas",
    publisher: "CONFAZ",
    url: "https://www.confaz.fazenda.gov.br/legislacao/protocolos/2009/pt193_09",
    checkedAt: ST_CONSTRUCTION_ELECTRICAL_CHECKED_AT,
    proves: ["responsabilidade nas operações entre signatários", "inaplicabilidades", "ausência de São Paulo entre os signatários"],
  },
  {
    code: "CONFAZ-PT198-2009",
    title: "Protocolo ICMS 198/2009 — materiais elétricos",
    publisher: "CONFAZ",
    url: "https://www.confaz.fazenda.gov.br/legislacao/protocolos/2009/pt198_09",
    checkedAt: ST_CONSTRUCTION_ELECTRICAL_CHECKED_AT,
    proves: ["responsabilidade nas operações entre signatários", "inaplicabilidades", "ausência de São Paulo entre os signatários"],
  },
];

type RouteParameter = {
  mvaOriginalBps: number;
  publishedAdjustedMvaBpsFor12: number;
};

export type ConstructionElectricalProduct = {
  code: ConstructionElectricalProductCode;
  priorityRank: number;
  family: ConstructionElectricalFamily;
  label: string;
  cest: string;
  ncmScope: string[];
  exampleNcm: string;
  description: string;
  searchTerms: string[];
  excludedNcmPrefixes: string[];
  exclusions: string[];
  routeParameters: Record<ConstructionElectricalRouteCode, RouteParameter>;
  sourceCodes: string[];
};

export const ST_CONSTRUCTION_ELECTRICAL_PRODUCTS: ConstructionElectricalProduct[] = [
  {
    code: "ARGAMASSA",
    priorityRank: 1,
    family: "construction",
    label: "Argamassas",
    cest: "10.002.00",
    ncmScope: ["3816.00.1", "3824.50.00"],
    exampleNcm: "38245000",
    description: "Argamassas classificadas no recorte legal indicado",
    searchTerms: ["argamassa", "argamassas", "rejunte"],
    excludedNcmPrefixes: [],
    exclusions: ["outras argamassas do CEST 10.003.00 exigem identidade própria"],
    routeParameters: {
      "SP-MG": { mvaOriginalBps: 4_000, publishedAdjustedMvaBpsFor12: 5_024 },
      "SP-RJ": { mvaOriginalBps: 4_100, publishedAdjustedMvaBpsFor12: 5_510 },
    },
    sourceCodes: ["CONFAZ-CV142-2018", "MG-RICMS-ANNEX-VII-PART-4", "RJ-RICMS-LIVRO-II-ANNEX-I"],
  },
  {
    code: "PVC_FINISHING",
    priorityRank: 2,
    family: "finishing",
    label: "Forros e acabamentos de PVC",
    cest: "10.005.00",
    ncmScope: ["3916"],
    exampleNcm: "39162000",
    description: "Revestimentos, forros, sancas e afins de PVC para uso na construção",
    searchTerms: ["forro pvc", "sanca pvc", "revestimento pvc", "acabamento pvc"],
    excludedNcmPrefixes: [],
    exclusions: ["uso diverso da construção não herda este enquadramento"],
    routeParameters: {
      "SP-MG": { mvaOriginalBps: 5_000, publishedAdjustedMvaBpsFor12: 6_098 },
      "SP-RJ": { mvaOriginalBps: 5_700, publishedAdjustedMvaBpsFor12: 7_270 },
    },
    sourceCodes: ["CONFAZ-CV142-2018", "MG-RICMS-ANNEX-VII-PART-4", "RJ-RICMS-LIVRO-II-ANNEX-I"],
  },
  {
    code: "MANUAL_TOOLS",
    priorityRank: 3,
    family: "tools",
    label: "Ferramentas manuais",
    cest: "08.010.00",
    ncmScope: ["8205"],
    exampleNcm: "82055900",
    description: "Ferramentas manuais do NCM 8205 descritas no CEST 08.010.00",
    searchTerms: ["ferramenta manual", "ferramentas manuais", "torno de apertar", "sargento", "bigorna", "maçarico"],
    excludedNcmPrefixes: [],
    exclusions: ["acessórios e partes de máquinas-ferramentas", "produto enquadrado em outro CEST do capítulo de ferramentas"],
    routeParameters: {
      "SP-MG": { mvaOriginalBps: 4_500, publishedAdjustedMvaBpsFor12: 5_561 },
      "SP-RJ": { mvaOriginalBps: 6_000, publishedAdjustedMvaBpsFor12: 7_600 },
    },
    sourceCodes: ["CONFAZ-CV142-2018", "MG-RICMS-ANNEX-VII-PART-4", "RJ-RICMS-LIVRO-II-ANNEX-I"],
  },
  {
    code: "TRANSFORMERS",
    priorityRank: 4,
    family: "electrical",
    label: "Transformadores e bobinas",
    cest: "12.001.00",
    ncmScope: ["8504"],
    exampleNcm: "85043300",
    description: "Transformadores, bobinas de reatância e de autoindução admitidos no CEST 12.001.00",
    searchTerms: ["transformador", "transformadores", "bobina de reatancia", "autoinducao"],
    excludedNcmPrefixes: ["85041000", "85044010", "85044040"],
    exclusions: ["demais transformadores da subposição 8504.3 fora da descrição legal", "reatores para lâmpadas de descarga", "carregadores de acumuladores", "UPS ou no-break", "uso automotivo"],
    routeParameters: {
      "SP-MG": { mvaOriginalBps: 5_000, publishedAdjustedMvaBpsFor12: 6_098 },
      "SP-RJ": { mvaOriginalBps: 5_000, publishedAdjustedMvaBpsFor12: 6_500 },
    },
    sourceCodes: ["CONFAZ-CV142-2018", "MG-RICMS-ANNEX-VII-PART-5", "RJ-RICMS-LIVRO-II-ANNEX-I"],
  },
  {
    code: "ELECTRIC_WATER_HEATERS",
    priorityRank: 5,
    family: "electrical",
    label: "Chuveiros e aquecedores elétricos",
    cest: "12.002.00",
    ncmScope: ["8516"],
    exampleNcm: "85161000",
    description: "Aquecedores elétricos de água, chuveiros, duchas, torneiras e resistências abrangidos",
    searchTerms: ["chuveiro eletrico", "ducha eletrica", "torneira eletrica", "aquecedor de agua", "resistencia de chuveiro"],
    excludedNcmPrefixes: ["851660"],
    exclusions: ["fornos, fogareiros, chapas de cocção, grelhas e assadeiras da posição 8516.60"],
    routeParameters: {
      "SP-MG": { mvaOriginalBps: 4_500, publishedAdjustedMvaBpsFor12: 5_561 },
      "SP-RJ": { mvaOriginalBps: 4_400, publishedAdjustedMvaBpsFor12: 5_840 },
    },
    sourceCodes: ["CONFAZ-CV142-2018", "MG-RICMS-ANNEX-VII-PART-5", "RJ-RICMS-LIVRO-II-ANNEX-I"],
  },
  {
    code: "CONSTRUCTION_CABLES",
    priorityRank: 6,
    family: "electrical",
    label: "Fios e cabos para construção",
    cest: "12.007.00",
    ncmScope: ["8544", "7605", "7614"],
    exampleNcm: "85444900",
    description: "Fios, cabos e condutores do CEST 12.007.00, inclusive para uso na construção",
    searchTerms: ["fio eletrico", "cabo eletrico", "condutor eletrico", "cabo de cobre", "cabo de aluminio"],
    excludedNcmPrefixes: ["854430"],
    exclusions: ["fios e cabos de uso automotivo"],
    routeParameters: {
      "SP-MG": { mvaOriginalBps: 4_000, publishedAdjustedMvaBpsFor12: 5_024 },
      "SP-RJ": { mvaOriginalBps: 4_100, publishedAdjustedMvaBpsFor12: 5_510 },
    },
    sourceCodes: ["CONFAZ-CV142-2018", "MG-RICMS-ANNEX-VII-PART-5", "RJ-RICMS-LIVRO-II-ANNEX-I"],
  },
];

export type ConstructionElectricalRoute = {
  route: ConstructionElectricalRouteCode;
  corridorRank: number;
  origin: "SP";
  destination: "MG" | "RJ";
  legalTreatment: "remitter_withholds_under_destination_protocol" | "destination_entry_liability";
  responsibility: "origin_remitter" | "destination_taxpayer";
  internalRateBps: number;
  fcpRateBps: number;
  interstateRateBps: 1200;
  agreementCodes: Record<ConstructionElectricalFamily, string>;
  sourceCodes: string[];
  explanation: string;
};

export const ST_CONSTRUCTION_ELECTRICAL_ROUTES: ConstructionElectricalRoute[] = [
  {
    route: "SP-MG",
    corridorRank: 1,
    origin: "SP",
    destination: "MG",
    legalTreatment: "remitter_withholds_under_destination_protocol",
    responsibility: "origin_remitter",
    internalRateBps: 1_800,
    fcpRateBps: 0,
    interstateRateBps: 1_200,
    agreementCodes: {
      construction: "PROTOCOLO-ICMS-32-2009",
      finishing: "PROTOCOLO-ICMS-32-2009",
      tools: "PROTOCOLO-ICMS-27-2009",
      electrical: "PROTOCOLO-ICMS-39-2009",
    },
    sourceCodes: ["MG-RICMS-ANNEX-VII-PART-4", "MG-RICMS-ANNEX-VII-PART-5", "MG-RICMS-ANNEX-VII-FORMULA", "MG-LAW-6763-RATES"],
    explanation: "A tabela mineira inclui São Paulo no âmbito destes capítulos. O recorte usa a alíquota interna geral de 18% e exige confirmação documental de que não há FEM, benefício, redução ou regime especial.",
  },
  {
    route: "SP-RJ",
    corridorRank: 2,
    origin: "SP",
    destination: "RJ",
    legalTreatment: "destination_entry_liability",
    responsibility: "destination_taxpayer",
    internalRateBps: 2_000,
    fcpRateBps: 200,
    interstateRateBps: 1_200,
    agreementCodes: {
      construction: "RJ-ENTRY-NON-SIGNATORY-PT196-2009",
      finishing: "RJ-ENTRY-NON-SIGNATORY-PT196-2009",
      tools: "RJ-ENTRY-NON-SIGNATORY-PT193-2009",
      electrical: "RJ-ENTRY-NON-SIGNATORY-PT198-2009",
    },
    sourceCodes: ["RJ-RICMS-LIVRO-II-ANNEX-I", "RJ-INTERNAL-RATES-FECP", "CONFAZ-PT196-2009", "CONFAZ-PT193-2009", "CONFAZ-PT198-2009"],
    explanation: "São Paulo não integra os protocolos RJ usados neste recorte. O Anexo I fluminense alcança a aquisição procedente de UF não signatária, com responsabilidade de entrada do contribuinte destinatário; o sistema não atribui retenção ao remetente paulista.",
  },
];

export const ST_CONSTRUCTION_ELECTRICAL_FACT_LABELS = {
  exactIdentity: "Descrição, NCM completo e CEST correspondem exatamente ao produto.",
  domesticGoods: "Mercadoria nacional sujeita à alíquota interestadual de 12%.",
  ordinaryRegime: "Remetente no regime normal; Simples Nacional exige memória própria.",
  taxpayerRecipient: "Destinatário é contribuinte do ICMS.",
  resalePurpose: "Mercadoria adquirida para revenda; uso, consumo, ativo e industrialização seguem trilhas distintas.",
  noSpecialTreatment: "Não há benefício, redução, diferimento, regime especial ou transferência alcançada por exceção.",
  mvaMethodConfirmed: "MVA é o método aplicável; não existe PMPF, pauta ou preço sugerido prevalente.",
  documentsConfirmed: "NF-e e documentos da operação confirmam valores, partes, finalidade, origem e vigência.",
} as const;

export type ConstructionElectricalInput = {
  route: ConstructionElectricalRouteCode;
  productCode: ConstructionElectricalProductCode;
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
  facts: Record<keyof typeof ST_CONSTRUCTION_ELECTRICAL_FACT_LABELS, boolean>;
};

export type ConstructionElectricalResult = {
  status: "calculated_reference" | "blocked" | "not_applicable";
  coverageStatus: "supported" | "partial" | "not_supported";
  route: ConstructionElectricalRouteCode;
  productCode: ConstructionElectricalProductCode;
  operationDate: string;
  responsibility: ConstructionElectricalRoute["responsibility"] | null;
  missingFacts: string[];
  blockers: string[];
  parameters: null | {
    mvaOriginalBps: number;
    mvaAdjustedBps: number;
    interstateRateBps: number;
    internalRateBps: number;
    fcpRateBps: number;
  };
  output: null | ReturnType<typeof calculateRepresentativeStMemory>;
  sourceCodes: string[];
  version: typeof ST_CONSTRUCTION_ELECTRICAL_VERSION;
  limitation: string;
};

const productByCode = new Map(ST_CONSTRUCTION_ELECTRICAL_PRODUCTS.map((product) => [product.code, product]));
const routeByCode = new Map(ST_CONSTRUCTION_ELECTRICAL_ROUTES.map((route) => [route.route, route]));
const sourceByCode = new Map(stConstructionElectricalSources.map((source) => [source.code, source]));

function normalizeNcm(value: string) {
  return value.replace(/\D/g, "");
}

function ncmMatches(product: ConstructionElectricalProduct, ncm: string) {
  const normalized = normalizeNcm(ncm);
  const accepted = product.ncmScope.some((scope) => normalized.startsWith(normalizeNcm(scope)));
  const excluded = product.excludedNcmPrefixes.some((scope) => normalized.startsWith(normalizeNcm(scope)));
  return normalized.length === 8 && accepted && !excluded;
}

function validMoney(values: number[]) {
  return values.every((value) => Number.isSafeInteger(value) && value >= 0);
}

export function resolveConstructionElectricalOperation(input: ConstructionElectricalInput): ConstructionElectricalResult {
  const product = productByCode.get(input.productCode);
  const route = routeByCode.get(input.route);
  const missingFacts = Object.entries(input.facts).filter(([, confirmed]) => confirmed !== true).map(([fact]) => fact);
  const blockers: string[] = [];
  if (!product || !route) blockers.push("product_or_route_not_catalogued");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.operationDate) || input.operationDate < ST_CONSTRUCTION_ELECTRICAL_PERIOD.from || input.operationDate > ST_CONSTRUCTION_ELECTRICAL_PERIOD.to) blockers.push("operation_date_outside_versioned_period");
  if (product && input.cest !== product.cest) blockers.push("cest_mismatch");
  if (product && !ncmMatches(product, input.ncm)) blockers.push("ncm_or_explicit_exclusion_mismatch");
  if (missingFacts.length > 0) blockers.push("mandatory_facts_missing");
  const money = [input.operationPriceCents, input.discountsCents, input.freightCents, input.insuranceCents, input.ipiCents, input.otherExpensesCents, input.ownIcmsBaseCents];
  if (!validMoney(money) || input.operationPriceCents <= 0 || input.ownIcmsBaseCents <= 0) blockers.push("invalid_monetary_components");
  const operationCompositionCents = input.operationPriceCents - input.discountsCents + input.freightCents + input.insuranceCents + input.ipiCents + input.otherExpensesCents;
  if (!Number.isSafeInteger(operationCompositionCents) || operationCompositionCents <= 0) blockers.push("invalid_operation_composition");
  if (!input.facts.resalePurpose) {
    return {
      status: "not_applicable",
      coverageStatus: "not_supported",
      route: input.route,
      productCode: input.productCode,
      operationDate: input.operationDate,
      responsibility: route?.responsibility ?? null,
      missingFacts,
      blockers: Array.from(new Set([...blockers, "resale_mva_not_applicable_to_declared_purpose"])),
      parameters: null,
      output: null,
      sourceCodes: Array.from(new Set([...(product?.sourceCodes ?? []), ...(route?.sourceCodes ?? [])])),
      version: ST_CONSTRUCTION_ELECTRICAL_VERSION,
      limitation: "O motor não converte a MVA de revenda em cálculo de uso, consumo, ativo ou industrialização.",
    };
  }
  if (blockers.length > 0 || !product || !route) {
    return {
      status: "blocked",
      coverageStatus: product && route ? "partial" : "not_supported",
      route: input.route,
      productCode: input.productCode,
      operationDate: input.operationDate,
      responsibility: route?.responsibility ?? null,
      missingFacts,
      blockers: Array.from(new Set(blockers)),
      parameters: null,
      output: null,
      sourceCodes: Array.from(new Set([...(product?.sourceCodes ?? []), ...(route?.sourceCodes ?? [])])),
      version: ST_CONSTRUCTION_ELECTRICAL_VERSION,
      limitation: "Nenhum valor é liberado enquanto identidade fiscal, vigência, método, partes, finalidade e documentos não coincidirem.",
    };
  }
  const parameter = product.routeParameters[route.route];
  const output = calculateRepresentativeStMemory({
    operationCents: operationCompositionCents,
    ownIcmsBaseCents: input.ownIcmsBaseCents,
    mvaOriginalBps: parameter.mvaOriginalBps,
    interstateRateBps: route.interstateRateBps,
    internalRateBps: route.internalRateBps,
    fcpRateBps: route.fcpRateBps,
    adjustMva: true,
  });
  return {
    status: "calculated_reference",
    coverageStatus: "supported",
    route: route.route,
    productCode: product.code,
    operationDate: input.operationDate,
    responsibility: route.responsibility,
    missingFacts: [],
    blockers: [],
    parameters: {
      mvaOriginalBps: parameter.mvaOriginalBps,
      mvaAdjustedBps: output.mvaAppliedBps,
      interstateRateBps: route.interstateRateBps,
      internalRateBps: route.internalRateBps,
      fcpRateBps: route.fcpRateBps,
    },
    output,
    sourceCodes: Array.from(new Set([...product.sourceCodes, ...route.sourceCodes])),
    version: ST_CONSTRUCTION_ELECTRICAL_VERSION,
    limitation: "Memória determinística condicionada aos fatos declarados. A responsabilidade indicada diferencia retenção do remetente e recolhimento de entrada pelo destinatário.",
  };
}

const allFacts = Object.fromEntries(Object.keys(ST_CONSTRUCTION_ELECTRICAL_FACT_LABELS).map((key) => [key, true])) as ConstructionElectricalInput["facts"];

function referenceInput(product: ConstructionElectricalProduct, route: ConstructionElectricalRoute): ConstructionElectricalInput {
  return {
    route: route.route,
    productCode: product.code,
    operationDate: ST_CONSTRUCTION_ELECTRICAL_CHECKED_AT,
    ncm: product.exampleNcm,
    cest: product.cest,
    operationPriceCents: 100_000,
    discountsCents: 0,
    freightCents: 0,
    insuranceCents: 0,
    ipiCents: 0,
    otherExpensesCents: 0,
    ownIcmsBaseCents: 100_000,
    facts: { ...allFacts },
  };
}

export const stConstructionElectricalReferenceRuns = ST_CONSTRUCTION_ELECTRICAL_ROUTES.flatMap((route) =>
  ST_CONSTRUCTION_ELECTRICAL_PRODUCTS.map((product) => ({
    key: `${route.route}:${product.code}`,
    route: route.route,
    productCode: product.code,
    result: resolveConstructionElectricalOperation(referenceInput(product, route)),
  })),
);

export const stConstructionElectricalNegativeRuns = [
  {
    code: "use_consumption",
    result: resolveConstructionElectricalOperation({ ...referenceInput(ST_CONSTRUCTION_ELECTRICAL_PRODUCTS[0], ST_CONSTRUCTION_ELECTRICAL_ROUTES[0]), facts: { ...allFacts, resalePurpose: false } }),
  },
  {
    code: "exception",
    result: resolveConstructionElectricalOperation({ ...referenceInput(ST_CONSTRUCTION_ELECTRICAL_PRODUCTS[0], ST_CONSTRUCTION_ELECTRICAL_ROUTES[0]), facts: { ...allFacts, noSpecialTreatment: false } }),
  },
  {
    code: "expired",
    result: resolveConstructionElectricalOperation({ ...referenceInput(ST_CONSTRUCTION_ELECTRICAL_PRODUCTS[0], ST_CONSTRUCTION_ELECTRICAL_ROUTES[0]), operationDate: "2027-01-01" }),
  },
  {
    code: "classification_mismatch",
    result: resolveConstructionElectricalOperation({ ...referenceInput(ST_CONSTRUCTION_ELECTRICAL_PRODUCTS[0], ST_CONSTRUCTION_ELECTRICAL_ROUTES[0]), ncm: "87089990" }),
  },
  {
    code: "explicit_exclusion",
    result: resolveConstructionElectricalOperation({ ...referenceInput(ST_CONSTRUCTION_ELECTRICAL_PRODUCTS[3], ST_CONSTRUCTION_ELECTRICAL_ROUTES[1]), ncm: "85044040" }),
  },
] as const;

export function searchConstructionElectricalRules(query: string) {
  const normalized = query.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const routes = ST_CONSTRUCTION_ELECTRICAL_ROUTES.filter((route) => normalized.includes(route.destination.toLowerCase()) || normalized.includes(route.destination === "MG" ? "minas gerais" : "rio de janeiro"));
  const products = ST_CONSTRUCTION_ELECTRICAL_PRODUCTS.filter((product) => product.searchTerms.some((term) => normalized.includes(term.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase())));
  const selectedRoutes = routes.length ? routes : ST_CONSTRUCTION_ELECTRICAL_ROUTES;
  return products.flatMap((product) => selectedRoutes.map((route) => {
    const run = stConstructionElectricalReferenceRuns.find((item) => item.productCode === product.code && item.route === route.route)!;
    return {
      productCode: product.code,
      label: product.label,
      route: route.route,
      cest: product.cest,
      ncmScope: product.ncmScope,
      status: run.result.coverageStatus,
      sourceCodes: run.result.sourceCodes,
      version: ST_CONSTRUCTION_ELECTRICAL_VERSION,
    };
  }));
}

export function buildConstructionElectricalDossier(result: ConstructionElectricalResult) {
  const product = productByCode.get(result.productCode);
  const route = routeByCode.get(result.route);
  return {
    schemaVersion: "construction-electrical-dossier.v1",
    ruleVersion: ST_CONSTRUCTION_ELECTRICAL_VERSION,
    status: result.status,
    coverageStatus: result.coverageStatus,
    identity: product ? { code: product.code, label: product.label, cest: product.cest, ncmScope: product.ncmScope, description: product.description } : null,
    route: route ? { route: route.route, responsibility: route.responsibility, treatment: route.legalTreatment } : null,
    calculation: result.output,
    parameters: result.parameters,
    blockers: result.blockers,
    evidence: result.sourceCodes.map((code) => sourceByCode.get(code)).filter((source): source is OfficialSource => Boolean(source)),
    limitations: [result.limitation, "Não constitui classificação fiscal formal, declaração, guia de recolhimento ou parecer profissional."],
  };
}

export const stConstructionElectricalDossiers = stConstructionElectricalReferenceRuns.map((run) => ({
  key: run.key,
  dossier: buildConstructionElectricalDossier(run.result),
}));

export function stConstructionElectricalMetrics() {
  return {
    priorityProducts: ST_CONSTRUCTION_ELECTRICAL_PRODUCTS.length,
    productFamilies: new Set(ST_CONSTRUCTION_ELECTRICAL_PRODUCTS.map((product) => product.family)).size,
    priorityRoutes: ST_CONSTRUCTION_ELECTRICAL_ROUTES.length,
    controlledCells: stConstructionElectricalReferenceRuns.length,
    reproducedMemories: stConstructionElectricalReferenceRuns.filter((run) => run.result.status === "calculated_reference").length,
    safeFailureScenarios: stConstructionElectricalNegativeRuns.filter((run) => run.result.output === null).length,
    officialSources: stConstructionElectricalSources.length,
    coverage: {
      supported: stConstructionElectricalReferenceRuns.filter((run) => run.result.coverageStatus === "supported").length,
      partial: stConstructionElectricalReferenceRuns.filter((run) => run.result.coverageStatus === "partial").length,
      notSupported: stConstructionElectricalReferenceRuns.filter((run) => run.result.coverageStatus === "not_supported").length,
    },
  };
}

export function validateStConstructionElectricalPriority() {
  const errors: string[] = [];
  if (ST_CONSTRUCTION_ELECTRICAL_PRODUCTS.length !== 6 || new Set(ST_CONSTRUCTION_ELECTRICAL_PRODUCTS.map((product) => product.code)).size !== 6) errors.push("six_unique_priority_products_required");
  if (new Set(ST_CONSTRUCTION_ELECTRICAL_PRODUCTS.map((product) => product.family)).size !== 4) errors.push("four_product_families_required");
  if (ST_CONSTRUCTION_ELECTRICAL_ROUTES.length !== 2 || new Set(ST_CONSTRUCTION_ELECTRICAL_ROUTES.map((route) => route.route)).size !== 2) errors.push("two_unique_priority_routes_required");
  if (stConstructionElectricalSources.some((source) => !source.url.startsWith("https://") || source.proves.length === 0)) errors.push("official_source_without_scope");
  for (const product of ST_CONSTRUCTION_ELECTRICAL_PRODUCTS) {
    if (!/^\d{2}\.\d{3}\.\d{2}$/.test(product.cest) || product.ncmScope.length === 0 || product.exclusions.length === 0) errors.push(`incomplete_product_identity:${product.code}`);
    if (product.sourceCodes.some((code) => !sourceByCode.has(code))) errors.push(`unknown_product_source:${product.code}`);
  }
  for (const route of ST_CONSTRUCTION_ELECTRICAL_ROUTES) {
    if (route.sourceCodes.some((code) => !sourceByCode.has(code))) errors.push(`unknown_route_source:${route.route}`);
  }
  for (const run of stConstructionElectricalReferenceRuns) {
    const product = productByCode.get(run.productCode)!;
    const expectedMva = product.routeParameters[run.route].publishedAdjustedMvaBpsFor12;
    if (run.result.status !== "calculated_reference" || run.result.output === null) errors.push(`reference_not_reproduced:${run.key}`);
    if (run.result.output?.mvaAppliedBps !== expectedMva) errors.push(`adjusted_mva_mismatch:${run.key}`);
    if (run.result.sourceCodes.length < 4) errors.push(`insufficient_evidence:${run.key}`);
  }
  if (stConstructionElectricalNegativeRuns.some((run) => run.result.output !== null || run.result.status === "calculated_reference")) errors.push("negative_gate_released_value");
  if (searchConstructionElectricalRules("argamassa de SP para MG").length !== 1) errors.push("search_index_did_not_narrow_product_and_route");
  if (stConstructionElectricalDossiers.some((item) => item.dossier.evidence.length === 0 || item.dossier.calculation === null)) errors.push("dossier_not_reproducible");
  return { passed: errors.length === 0, errors };
}

export async function hashStConstructionElectricalPriority() {
  const payload = JSON.stringify({
    version: ST_CONSTRUCTION_ELECTRICAL_VERSION,
    period: ST_CONSTRUCTION_ELECTRICAL_PERIOD,
    sources: stConstructionElectricalSources,
    products: ST_CONSTRUCTION_ELECTRICAL_PRODUCTS,
    routes: ST_CONSTRUCTION_ELECTRICAL_ROUTES,
    runs: stConstructionElectricalReferenceRuns,
    negativeRuns: stConstructionElectricalNegativeRuns,
  });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

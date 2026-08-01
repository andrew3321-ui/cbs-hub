import { calculateRepresentativeStMemory } from "./st-sp-mg-legal.ts";

export const ST_FOOD_CLEANING_PET_VERSION = "2026.08.01-v101";
export const ST_FOOD_CLEANING_PET_CHECKED_AT = "2026-08-01";
export const ST_FOOD_CLEANING_PET_PERIOD = { from: "2026-08-01", to: "2026-09-30" } as const;

export type FoodCleaningPetFamily = "food" | "cleaning" | "household_hygiene" | "pet_food";
export type FoodCleaningPetRouteCode = "SP-MG" | "SP-RJ" | "SP-PR" | "SP-SC" | "SP-RS" | "SP-GO" | "SP-BA" | "SP-PE" | "MG-SP";
export type FoodCleaningPetProductCode =
  | "WHITE_CHOCOLATE_1KG"
  | "FILLED_CHOCOLATE_1KG"
  | "UNFILLED_CHOCOLATE_2KG"
  | "OTHER_CHOCOLATE_1KG"
  | "CHOCOLATE_POWDER_1KG"
  | "INDUSTRIALIZED_BREAD"
  | "PANETTONE"
  | "WHEAT_BISCUIT"
  | "CREAM_CRACKER_WHEAT"
  | "WAFER_UNCOATED"
  | "WAFER_COATED"
  | "TOASTED_BREAD"
  | "BLEACH"
  | "POWDER_SOAP_SANITIZER"
  | "LIQUID_SOAP_SANITIZER"
  | "POWDER_DETERGENT"
  | "LIQUID_DETERGENT_DISHES"
  | "LIQUID_DETERGENT_LAUNDRY"
  | "MULTIPURPOSE_CLEANER"
  | "FABRIC_SOFTENER"
  | "CLEANING_SPONGE"
  | "CLEANING_ALCOHOL"
  | "STEEL_WOOL"
  | "TRASH_BAGS_100L"
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
  { code: "CONFAZ-CV142-2018", title: "Convênio ICMS 142/2018 — segmentos, NCM e CEST", publisher: "CONFAZ", url: "https://www.confaz.fazenda.gov.br/legislacao/convenios/2018/CV142_18", checkedAt: ST_FOOD_CLEANING_PET_CHECKED_AT, proves: ["identidade nacional dos segmentos 11, 17 e 22", "descrição, NCM e CEST devem coincidir cumulativamente"] },
  { code: "MG-RICMS-ANNEX-VII-CURRENT", title: "RICMS/MG 2023 — Anexo VII consolidado", publisher: "SEF/MG", url: "https://www.fazenda.mg.gov.br/empresas/legislacao_tributaria/ricms2023/anexovii2023.pdf", checkedAt: ST_FOOD_CLEANING_PET_CHECKED_AT, proves: ["âmbito SP→MG", "MVA dos capítulos 11, 17 e 22", "fórmula de MVA ajustada", "responsabilidade"] },
  { code: "MG-RICMS-ANNEX-I-RATES", title: "RICMS/MG 2023 — Anexo I, alíquotas", publisher: "SEF/MG", url: "https://www.fazenda.mg.gov.br/empresas/legislacao_tributaria/ricms_2023_seco/anexoi2023_2.html", checkedAt: ST_FOOD_CLEANING_PET_CHECKED_AT, proves: ["alíquota interna geral de 18% no recorte modelado"] },
  { code: "MG-LAW-24471-2023-FEM", title: "Lei mineira nº 24.471/2023 — FEM", publisher: "SEF/MG", url: "https://www.fazenda.mg.gov.br/empresas/legislacao_tributaria/leis/2023/l24471_2023.html", checkedAt: ST_FOOD_CLEANING_PET_CHECKED_AT, proves: ["catálogo do adicional FEM", "ração pet fora do recorte de bem supérfluo modelado"] },
  { code: "MG-SAIF-74-2026-PET", title: "Portaria SAIF nº 74/2026 — PMPF de rações secas tipo pet", publisher: "SEF/MG", url: "https://www.fazenda.mg.gov.br/empresas/legislacao_tributaria/portarias/2026/port_saif074_2026.html", checkedAt: ST_FOOD_CLEANING_PET_CHECKED_AT, proves: ["PMPF de 01/04/2026 a 30/09/2026", "base por peso líquido", "fallback para MVA"] },
  { code: "MG-SAIF-74-2026-PET-ANNEX", title: "Anexo da Portaria SAIF nº 74/2026 — tabela PMPF", publisher: "SEF/MG", url: "https://www.fazenda.mg.gov.br/empresas/legislacao_tributaria/portarias/2026/port_saif074_2026_anexo.pdf", checkedAt: ST_FOOD_CLEANING_PET_CHECKED_AT, proves: ["DOGCHOW acima de 5 kg a R$ 13,75 por kg", "produto e apresentação"] },
  { code: "CONFAZ-PT28-2009", title: "Protocolo ICMS 28/2009 — produtos alimentícios", publisher: "CONFAZ", url: "https://www.confaz.fazenda.gov.br/legislacao/protocolos/2009/pt028_09", checkedAt: ST_FOOD_CLEANING_PET_CHECKED_AT, proves: ["acordo interestadual de alimentos entre SP e MG"] },
  { code: "CONFAZ-PT33-2009", title: "Protocolo ICMS 33/2009 — materiais de limpeza", publisher: "CONFAZ", url: "https://www.confaz.fazenda.gov.br/legislacao/protocolos/2009/pt033_09", checkedAt: ST_FOOD_CLEANING_PET_CHECKED_AT, proves: ["acordo interestadual de limpeza entre SP e MG"] },
  { code: "CONFAZ-PT26-2004", title: "Protocolo ICMS 26/2004 — rações para animais domésticos", publisher: "CONFAZ", url: "https://www.confaz.fazenda.gov.br/legislacao/protocolos/2004/pt026_04", checkedAt: ST_FOOD_CLEANING_PET_CHECKED_AT, proves: ["responsabilidade do remetente em SP→MG", "inaplicabilidades do acordo"] },
  { code: "RJ-RICMS-ST-ANNEX-I", title: "Livro II do RICMS/RJ — Anexo I de mercadorias sujeitas à ST", publisher: "SEFAZ/RJ", url: "https://portal.fazenda.rj.gov.br/icms/wp-content/uploads/sites/42/2023/10/anexo_I_livroII_2.pdf", checkedAt: ST_FOOD_CLEANING_PET_CHECKED_AT, proves: ["fonte estadual de NCM, CEST e MVA", "parâmetro fluminense não pode ser substituído pelo mineiro"] },
  { code: "PR-RICMS-PORTAL", title: "Regulamento do ICMS do Paraná", publisher: "SEFA/PR", url: "https://www.fazenda.pr.gov.br/Pagina/Regulamento-do-ICMS", checkedAt: ST_FOOD_CLEANING_PET_CHECKED_AT, proves: ["fonte oficial do destino Paraná", "necessidade de fechar Anexo IX, vigência e parâmetro por item"] },
  { code: "SC-RICMS-PORTAL", title: "Legislação tributária de Santa Catarina", publisher: "SEF/SC", url: "https://legislacao.sef.sc.gov.br/", checkedAt: ST_FOOD_CLEANING_PET_CHECKED_AT, proves: ["fonte oficial do destino Santa Catarina", "necessidade de verificar manutenção ou retirada da ST por segmento"] },
  { code: "RS-RICMS-PORTAL", title: "Legislação tributária do Rio Grande do Sul", publisher: "SEFAZ/RS", url: "https://www.legislacao.sefaz.rs.gov.br/", checkedAt: ST_FOOD_CLEANING_PET_CHECKED_AT, proves: ["fonte oficial do destino Rio Grande do Sul", "necessidade de fechar apêndice e vigência por item"] },
  { code: "GO-RICMS-PORTAL", title: "Legislação tributária de Goiás", publisher: "Casa Civil/GO", url: "https://legisla.casacivil.go.gov.br/", checkedAt: ST_FOOD_CLEANING_PET_CHECKED_AT, proves: ["fonte oficial do destino Goiás", "necessidade de fechar anexos e parâmetros por item"] },
  { code: "BA-RICMS-PORTAL", title: "Legislação tributária da Bahia", publisher: "SEFAZ/BA", url: "https://www.sefaz.ba.gov.br/", checkedAt: ST_FOOD_CLEANING_PET_CHECKED_AT, proves: ["fonte oficial do destino Bahia", "necessidade de fechar MVA, alíquota e FCP por item"] },
  { code: "PE-RICMS-PORTAL", title: "Legislação tributária de Pernambuco", publisher: "SEFAZ/PE", url: "https://www.sefaz.pe.gov.br/Legislacao/Tributaria/Pages/default.aspx", checkedAt: ST_FOOD_CLEANING_PET_CHECKED_AT, proves: ["fonte oficial do destino Pernambuco", "necessidade de fechar decreto e parâmetro por item"] },
  { code: "SP-RICMS-PORTAL", title: "Legislação tributária de São Paulo", publisher: "SEFAZ/SP", url: "https://legislacao.fazenda.sp.gov.br/", checkedAt: ST_FOOD_CLEANING_PET_CHECKED_AT, proves: ["fonte oficial do destino São Paulo", "necessidade de conferir vigência e listas após alterações de 2026"] },
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
  effectiveFrom: typeof ST_FOOD_CLEANING_PET_PERIOD.from;
  effectiveTo: typeof ST_FOOD_CLEANING_PET_PERIOD.to;
  exclusions: string[];
  sourceCodes: string[];
};

const foodSources = ["CONFAZ-CV142-2018", "CONFAZ-PT28-2009"];
const cleaningSources = ["CONFAZ-CV142-2018", "CONFAZ-PT33-2009"];

function product(
  priorityRank: number,
  code: FoodCleaningPetProductCode,
  family: FoodCleaningPetFamily,
  label: string,
  cest: string,
  ncm: string,
  presentation: string,
  description: string,
  mgMvaOriginalBps: number,
  searchTerms: string[],
  exclusions: string[],
  sourceCodes: string[],
  petPmpfProfile: FoodCleaningPetProduct["petPmpfProfile"] = null,
): FoodCleaningPetProduct {
  return { priorityRank, code, family, label, cest, ncm, presentation, description, mgMvaOriginalBps, searchTerms, exclusions, sourceCodes, petPmpfProfile, effectiveFrom: ST_FOOD_CLEANING_PET_PERIOD.from, effectiveTo: ST_FOOD_CLEANING_PET_PERIOD.to };
}

export const ST_FOOD_CLEANING_PET_PRODUCTS: FoodCleaningPetProduct[] = [
  product(1, "WHITE_CHOCOLATE_1KG", "food", "Chocolate branco", "17.001.00", "17049010", "embalagem de até 1 kg", "Chocolate branco, exceto ovo de Páscoa do CEST 17.005.00", 7_788, ["chocolate branco"], ["acima de 1 kg", "ovo de páscoa", "cobertura de outro CEST"], foodSources),
  product(2, "FILLED_CHOCOLATE_1KG", "food", "Chocolate recheado", "17.002.00", "18063110", "tablete, barra ou pau recheado de até 1 kg", "Chocolate recheado no recorte exato da tabela mineira", 7_121, ["chocolate recheado", "barra recheada"], ["acima de 1 kg", "produto não recheado", "NCM diverso"], foodSources),
  product(3, "UNFILLED_CHOCOLATE_2KG", "food", "Chocolate não recheado", "17.003.00", "18063210", "tablete, barra ou pau não recheado de até 2 kg", "Chocolate não recheado em apresentação legal específica", 6_994, ["chocolate nao recheado", "barra de chocolate"], ["recheado", "acima de 2 kg", "preparação de NCM diverso"], foodSources),
  product(4, "OTHER_CHOCOLATE_1KG", "food", "Outras preparações com cacau", "17.004.00", "18069000", "embalagem de até 1 kg", "Chocolate ou preparação com cacau fora dos CEST específicos", 4_000, ["preparacao com cacau", "outro chocolate"], ["CEST específico 17.005.01, 17.006.00, 17.006.02, 17.007.00 ou 17.109.00", "acima de 1 kg"], foodSources),
  product(5, "CHOCOLATE_POWDER_1KG", "food", "Achocolatado em pó", "17.006.00", "18069000", "embalagem de até 1 kg, exceto cápsulas", "Achocolatado em pó fora do CEST específico de cápsulas", 2_500, ["achocolatado", "chocolate em po"], ["cápsulas", "acima de 1 kg", "cacau em pó 1806.10.00"], foodSources),
  product(6, "INDUSTRIALIZED_BREAD", "food", "Pão industrializado", "17.050.00", "19052090", "pão industrializado, exceto panetone e bolo de forma", "Pão industrializado, inclusive de especiarias", 2_500, ["pao industrializado", "pao de especiarias"], ["panetone", "bolo de forma", "pão francês"] , foodSources),
  product(7, "PANETTONE", "food", "Panetone", "17.052.00", "19052010", "panetone classificado no NCM 1905.20.10", "Panetone na identidade legal específica", 2_500, ["panetone"], ["bolo de forma", "outro pão industrializado"], foodSources),
  product(8, "WHEAT_BISCUIT", "food", "Biscoito de farinha de trigo", "17.053.00", "19053100", "biscoito derivado de trigo, fora dos tipos populares excluídos", "Biscoito de trigo não enquadrado como cream cracker, água e sal, maisena ou maria popular", 3_500, ["biscoito de trigo", "bolacha de trigo"], ["cream cracker", "água e sal", "maisena ou maria popular sem cacau/recheio/cobertura"], foodSources),
  product(9, "CREAM_CRACKER_WHEAT", "food", "Cream cracker de trigo", "17.056.00", "19059020", "cream cracker ou água e sal derivado de trigo", "Biscoito cream cracker ou água e sal derivado de trigo", 2_500, ["cream cracker", "agua e sal"], ["não derivado de trigo", "outra bolacha"], foodSources),
  product(10, "WAFER_UNCOATED", "food", "Waffle ou wafer sem cobertura", "17.057.00", "19053200", "sem cobertura", "Waffle ou wafer sem cobertura", 4_500, ["wafer sem cobertura", "waffle sem cobertura"], ["com cobertura", "biscoito de outro NCM"], foodSources),
  product(11, "WAFER_COATED", "food", "Waffle ou wafer com cobertura", "17.058.00", "19053200", "com cobertura", "Waffle ou wafer com cobertura", 3_500, ["wafer com cobertura", "waffle com cobertura"], ["sem cobertura", "biscoito de outro NCM"], foodSources),
  product(12, "TOASTED_BREAD", "food", "Torrada e pão torrado", "17.059.00", "19054000", "torrada, pão torrado ou produto semelhante", "Torradas e produtos semelhantes torrados", 2_500, ["torrada", "pao torrado"], ["pão não torrado", "biscoito ou wafer"], foodSources),
  product(13, "BLEACH", "household_hygiene", "Água sanitária e alvejante", "11.001.00", "34025000", "produto doméstico compatível com a descrição legal", "Água sanitária, branqueador ou outro alvejante", 6_500, ["agua sanitaria", "alvejante", "branqueador"], ["desinfetante de outro CEST", "produto industrial fora da descrição"], cleaningSources),
  product(14, "POWDER_SOAP_SANITIZER", "cleaning", "Sabão ou sanitizante em pó", "11.002.00", "34012090", "pó, flocos, palhetas, grânulos ou forma semelhante para lavar roupas", "Sabão, desinfetante ou sanitizante sólido para roupas", 4_088, ["sabao em po", "sanitizante em po"], ["produto líquido", "finalidade diversa de lavar roupas"], cleaningSources),
  product(15, "LIQUID_SOAP_SANITIZER", "cleaning", "Sabão ou sanitizante líquido", "11.003.00", "34012090", "líquido para lavar roupas", "Sabão, desinfetante ou sanitizante líquido para roupas", 4_088, ["sabao liquido", "sanitizante liquido"], ["produto em pó", "finalidade diversa de lavar roupas"], cleaningSources),
  product(16, "POWDER_DETERGENT", "cleaning", "Detergente em pó", "11.004.00", "34025000", "pó, flocos, palhetas, grânulos ou forma semelhante", "Detergente em pó, inclusive desinfetante ou sanitizante", 4_088, ["detergente em po"], ["detergente líquido", "agente residual"], cleaningSources),
  product(17, "LIQUID_DETERGENT_DISHES", "cleaning", "Detergente líquido, exceto roupas", "11.005.00", "34025000", "líquido para limpeza que não seja de roupas", "Detergente líquido, exceto o destinado a lavar roupas", 4_088, ["detergente liquido", "detergente de louca"], ["produto para lavar roupas", "detergente em pó"], cleaningSources),
  product(18, "LIQUID_DETERGENT_LAUNDRY", "cleaning", "Detergente líquido para roupas", "11.006.00", "34025000", "líquido para lavar roupas", "Detergente líquido para roupas, inclusive sanitizante", 4_088, ["detergente liquido para roupa", "lava roupas liquido"], ["detergente de louça", "produto em pó"], cleaningSources),
  product(19, "MULTIPURPOSE_CLEANER", "cleaning", "Limpador multiuso", "11.007.00", "34025000", "embalagem de até 50 litros ou 50 kg", "Preparação para lavagem ou limpeza, inclusive multiuso, fora dos CEST específicos", 4_088, ["limpador multiuso", "produto multiuso"], ["CEST 11.001, 11.004, 11.005 ou 11.006", "embalagem acima de 50 litros ou kg"], cleaningSources),
  product(20, "FABRIC_SOFTENER", "household_hygiene", "Amaciante", "11.008.00", "38099190", "amaciante ou suavizante para roupas", "Amaciante ou suavizante no capítulo 11", 3_500, ["amaciante", "suavizante"], ["preparação têxtil industrial divergente"], cleaningSources),
  product(21, "CLEANING_SPONGE", "household_hygiene", "Esponja para limpeza", "11.009.00", "39241000", "esponja doméstica para limpeza", "Esponja para limpeza na NCM representativa catalogada", 5_500, ["esponja de limpeza", "esponja domestica"], ["esponja industrial", "palha de aço do CEST 11.011.00"], cleaningSources),
  product(22, "CLEANING_ALCOHOL", "household_hygiene", "Álcool etílico para limpeza", "11.010.00", "22071090", "álcool etílico destinado à limpeza", "Álcool etílico para limpeza", 3_500, ["alcool de limpeza", "alcool etilico"], ["bebida alcoólica", "combustível", "finalidade não doméstica"], cleaningSources),
  product(23, "STEEL_WOOL", "household_hygiene", "Palha de aço", "11.011.00", "73231000", "uso doméstico para limpeza ou polimento", "Palha de aço e artefato semelhante de uso doméstico", 3_500, ["palha de aco", "esponja de aco"], ["uso industrial", "esponja não metálica do CEST 11.009.00"], cleaningSources),
  product(24, "TRASH_BAGS_100L", "household_hygiene", "Saco de lixo até 100 litros", "11.012.00", "39232190", "conteúdo nominal de até 100 litros", "Saco de lixo de plástico no recorte de até 100 litros", 6_500, ["saco de lixo", "sacos de lixo"], ["acima de 100 litros", "embalagem com finalidade diversa"], cleaningSources),
  product(25, "DOGCHOW_ABOVE_5KG", "pet_food", "DOGCHOW acima de 5 kg", "22.001.00", "23090000", "ração seca para cães em embalagem acima de 5 kg", "Produto DOGCHOW constante da pauta mineira vigente", 5_555, ["dogchow", "dog chow", "racao pet", "racao para cachorro"], ["ração úmida", "animal não doméstico", "produto ou peso diferente da pauta"], ["CONFAZ-CV142-2018", "CONFAZ-PT26-2004", "MG-SAIF-74-2026-PET", "MG-SAIF-74-2026-PET-ANNEX"], { product: "DOGCHOW", weightBand: "above_5kg", pmpfPerKgCents: 1_375 }),
];

const openRouteBlockers = [
  "MVA, PMPF ou pauta do destino por identidade e apresentação exatas",
  "alíquota interna e FCP/FECP vigentes no destino",
  "acordo, responsabilidade, benefício, exceção e vigência por segmento",
  "proibido reutilizar parâmetro mineiro ou do sentido inverso",
];

function partialRoute(route: Exclude<FoodCleaningPetRouteCode, "SP-MG">, priorityRank: number, origin: string, destination: string, interstateRateBps: number, sourceCode: string) {
  return { route, priorityRank, origin, destination, coverageStatus: "partial" as const, responsibility: null, internalRateBps: null, interstateRateBps, fcpRateBps: null, sourceCodes: [sourceCode], blockers: [...openRouteBlockers] };
}

export const ST_FOOD_CLEANING_PET_ROUTES = [
  { route: "SP-MG" as const, priorityRank: 1, origin: "SP", destination: "MG", coverageStatus: "supported" as const, responsibility: "origin_remitter" as const, internalRateBps: 1_800, interstateRateBps: 1_200, fcpRateBps: 0, sourceCodes: ["MG-RICMS-ANNEX-VII-CURRENT", "MG-RICMS-ANNEX-I-RATES", "MG-LAW-24471-2023-FEM"], blockers: [] as string[] },
  partialRoute("SP-RJ", 2, "SP", "RJ", 1_200, "RJ-RICMS-ST-ANNEX-I"),
  partialRoute("SP-PR", 3, "SP", "PR", 1_200, "PR-RICMS-PORTAL"),
  partialRoute("SP-SC", 4, "SP", "SC", 1_200, "SC-RICMS-PORTAL"),
  partialRoute("SP-RS", 5, "SP", "RS", 1_200, "RS-RICMS-PORTAL"),
  partialRoute("SP-GO", 6, "SP", "GO", 1_200, "GO-RICMS-PORTAL"),
  partialRoute("SP-BA", 7, "SP", "BA", 700, "BA-RICMS-PORTAL"),
  partialRoute("SP-PE", 8, "SP", "PE", 700, "PE-RICMS-PORTAL"),
  partialRoute("MG-SP", 9, "MG", "SP", 1_200, "SP-RICMS-PORTAL"),
] as const;

export const ST_FOOD_CLEANING_PET_FACT_LABELS = {
  exactIdentity: "Descrição, NCM, CEST e apresentação coincidem integralmente.",
  domesticGoods: "Mercadoria nacional e alíquota interestadual compatível com a origem e destino.",
  ordinaryRegime: "Remetente no regime normal; Simples Nacional exige memória própria.",
  taxpayerRecipient: "Destinatário contribuinte do ICMS.",
  resalePurpose: "Finalidade de revenda confirmada.",
  noBenefitOrReduction: "Sem benefício, redução, diferimento, regime especial ou exceção aplicável.",
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
  parameters: null | { mvaOriginalBps: number | null; mvaAdjustedBps: number | null; pmpfPerKgCents: number | null; interstateRateBps: number; internalRateBps: number; fcpRateBps: number };
  output: null | { mvaAppliedBps: number | null; stBaseCents: number; ownIcmsCents: number; presumedInternalIcmsCents: number; icmsStCents: number; fcpCents: number; destinationTotalCents: number };
  sourceCodes: string[];
  version: typeof ST_FOOD_CLEANING_PET_VERSION;
};

const productByCode = new Map(ST_FOOD_CLEANING_PET_PRODUCTS.map((item) => [item.code, item]));
const routeByCode = new Map(ST_FOOD_CLEANING_PET_ROUTES.map((item) => [item.route, item]));
const sourceByCode = new Map(stFoodCleaningPetSources.map((item) => [item.code, item]));

function roundDivide(numerator: number, denominator: number) {
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator) || denominator <= 0) throw new Error("unsafe_food_cleaning_pet_calculation");
  return Math.floor((numerator + Math.floor(denominator / 2)) / denominator);
}
function validMoney(values: number[]) { return values.every((value) => Number.isSafeInteger(value) && value >= 0); }
function unique(values: string[]) { return Array.from(new Set(values)); }
function evidenceCodes(productItem: FoodCleaningPetProduct | undefined, routeItem: (typeof ST_FOOD_CLEANING_PET_ROUTES)[number] | undefined) {
  return unique([...(productItem?.sourceCodes ?? []), ...(routeItem?.sourceCodes ?? [])]);
}

export function resolveFoodCleaningPetOperation(input: FoodCleaningPetInput): FoodCleaningPetResult {
  const productItem = productByCode.get(input.productCode);
  const routeItem = routeByCode.get(input.route);
  const missingFacts = Object.entries(input.facts).filter(([, confirmed]) => confirmed !== true).map(([fact]) => fact);
  const blockers: string[] = [];
  if (!productItem || !routeItem) blockers.push("product_or_route_not_catalogued");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.operationDate) || input.operationDate < ST_FOOD_CLEANING_PET_PERIOD.from || input.operationDate > ST_FOOD_CLEANING_PET_PERIOD.to) blockers.push("operation_date_outside_versioned_period");
  if (productItem && input.cest !== productItem.cest) blockers.push("cest_mismatch");
  if (productItem && input.ncm.replace(/\D/g, "") !== productItem.ncm) blockers.push("ncm_mismatch");
  if (missingFacts.length) blockers.push("mandatory_facts_missing");
  if (!validMoney([input.operationPriceCents, input.discountsCents, input.freightCents, input.insuranceCents, input.ipiCents, input.otherExpensesCents, input.ownIcmsBaseCents]) || input.operationPriceCents <= 0 || input.ownIcmsBaseCents <= 0) blockers.push("invalid_monetary_components");
  const operationCompositionCents = input.operationPriceCents - input.discountsCents + input.freightCents + input.insuranceCents + input.ipiCents + input.otherExpensesCents;
  if (!Number.isSafeInteger(operationCompositionCents) || operationCompositionCents <= 0) blockers.push("invalid_operation_composition");
  if (productItem?.petPmpfProfile && (!Number.isSafeInteger(input.weightGrams) || (input.weightGrams ?? 0) <= 5_000)) blockers.push("pet_weight_or_presentation_mismatch");
  if (!input.facts.resalePurpose) return { status: "not_applicable", coverageStatus: "not_supported", method: null, route: input.route, productCode: input.productCode, responsibility: routeItem?.responsibility ?? null, missingFacts, blockers: unique([...blockers, "resale_rule_not_applicable"]), parameters: null, output: null, sourceCodes: evidenceCodes(productItem, routeItem), version: ST_FOOD_CLEANING_PET_VERSION };
  if (routeItem?.coverageStatus !== "supported") blockers.push("route_parameters_not_closed");
  if (blockers.length || !productItem || !routeItem || routeItem.internalRateBps === null || routeItem.fcpRateBps === null) return { status: "blocked", coverageStatus: productItem && routeItem ? routeItem.coverageStatus : "not_supported", method: null, route: input.route, productCode: input.productCode, responsibility: routeItem?.responsibility ?? null, missingFacts, blockers: unique([...blockers, ...(routeItem?.blockers ?? [])]), parameters: null, output: null, sourceCodes: evidenceCodes(productItem, routeItem), version: ST_FOOD_CLEANING_PET_VERSION };

  const commonSources = evidenceCodes(productItem, routeItem);
  const petProfile = productItem.petPmpfProfile;
  const ownPricePerKgCents = petProfile && input.weightGrams ? roundDivide(operationCompositionCents * 1_000, input.weightGrams) : null;
  const usePmpf = Boolean(petProfile && !input.forceMvaFallback && ownPricePerKgCents !== null && ownPricePerKgCents < petProfile.pmpfPerKgCents);
  if (usePmpf && petProfile && input.weightGrams) {
    const stBaseCents = roundDivide(input.weightGrams * petProfile.pmpfPerKgCents, 1_000);
    const ownIcmsCents = roundDivide(input.ownIcmsBaseCents * routeItem.interstateRateBps, 10_000);
    const presumedInternalIcmsCents = roundDivide(stBaseCents * routeItem.internalRateBps, 10_000);
    const icmsStCents = Math.max(0, presumedInternalIcmsCents - ownIcmsCents);
    const fcpCents = roundDivide(stBaseCents * routeItem.fcpRateBps, 10_000);
    return { status: "calculated_reference", coverageStatus: "supported", method: "pmpf", route: routeItem.route, productCode: productItem.code, responsibility: routeItem.responsibility, missingFacts: [], blockers: [], parameters: { mvaOriginalBps: null, mvaAdjustedBps: null, pmpfPerKgCents: petProfile.pmpfPerKgCents, interstateRateBps: routeItem.interstateRateBps, internalRateBps: routeItem.internalRateBps, fcpRateBps: routeItem.fcpRateBps }, output: { mvaAppliedBps: null, stBaseCents, ownIcmsCents, presumedInternalIcmsCents, icmsStCents, fcpCents, destinationTotalCents: icmsStCents + fcpCents }, sourceCodes: commonSources, version: ST_FOOD_CLEANING_PET_VERSION };
  }
  const output = calculateRepresentativeStMemory({ operationCents: operationCompositionCents, ownIcmsBaseCents: input.ownIcmsBaseCents, mvaOriginalBps: productItem.mgMvaOriginalBps, interstateRateBps: routeItem.interstateRateBps, internalRateBps: routeItem.internalRateBps, fcpRateBps: routeItem.fcpRateBps, adjustMva: true });
  return { status: "calculated_reference", coverageStatus: "supported", method: "mva", route: routeItem.route, productCode: productItem.code, responsibility: routeItem.responsibility, missingFacts: [], blockers: [], parameters: { mvaOriginalBps: productItem.mgMvaOriginalBps, mvaAdjustedBps: output.mvaAppliedBps, pmpfPerKgCents: petProfile?.pmpfPerKgCents ?? null, interstateRateBps: routeItem.interstateRateBps, internalRateBps: routeItem.internalRateBps, fcpRateBps: routeItem.fcpRateBps }, output, sourceCodes: commonSources, version: ST_FOOD_CLEANING_PET_VERSION };
}

const allFacts = Object.fromEntries(Object.keys(ST_FOOD_CLEANING_PET_FACT_LABELS).map((key) => [key, true])) as FoodCleaningPetInput["facts"];
function referenceInput(productItem: FoodCleaningPetProduct, routeItem: (typeof ST_FOOD_CLEANING_PET_ROUTES)[number]): FoodCleaningPetInput {
  const pet = Boolean(productItem.petPmpfProfile);
  return { route: routeItem.route, productCode: productItem.code, operationDate: ST_FOOD_CLEANING_PET_CHECKED_AT, ncm: productItem.ncm, cest: productItem.cest, operationPriceCents: pet ? 10_000 : 100_000, discountsCents: 0, freightCents: 0, insuranceCents: 0, ipiCents: 0, otherExpensesCents: 0, ownIcmsBaseCents: pet ? 10_000 : 100_000, weightGrams: pet ? 10_000 : null, forceMvaFallback: false, facts: { ...allFacts } };
}

export const stFoodCleaningPetReferenceRuns = ST_FOOD_CLEANING_PET_ROUTES.flatMap((routeItem) => ST_FOOD_CLEANING_PET_PRODUCTS.map((productItem) => ({ key: `${routeItem.route}:${productItem.code}`, route: routeItem.route, productCode: productItem.code, result: resolveFoodCleaningPetOperation(referenceInput(productItem, routeItem)) })));

const mgRoute = ST_FOOD_CLEANING_PET_ROUTES[0];
const petProduct = ST_FOOD_CLEANING_PET_PRODUCTS.find((item) => item.code === "DOGCHOW_ABOVE_5KG")!;
const foodProduct = ST_FOOD_CLEANING_PET_PRODUCTS[0];
export const stFoodCleaningPetNegativeRuns = [
  { code: "benefit", result: resolveFoodCleaningPetOperation({ ...referenceInput(foodProduct, mgRoute), facts: { ...allFacts, noBenefitOrReduction: false } }) },
  { code: "exception", result: resolveFoodCleaningPetOperation({ ...referenceInput(foodProduct, mgRoute), facts: { ...allFacts, resalePurpose: false } }) },
  { code: "expired", result: resolveFoodCleaningPetOperation({ ...referenceInput(foodProduct, mgRoute), operationDate: "2026-10-01" }) },
  { code: "missing_data", result: resolveFoodCleaningPetOperation({ ...referenceInput(foodProduct, mgRoute), facts: { ...allFacts, documentsConfirmed: false } }) },
  { code: "classification_mismatch", result: resolveFoodCleaningPetOperation({ ...referenceInput(foodProduct, mgRoute), cest: "17.005.00" }) },
  { code: "pet_presentation_mismatch", result: resolveFoodCleaningPetOperation({ ...referenceInput(petProduct, mgRoute), weightGrams: 5_000 }) },
  { code: "invalid_money", result: resolveFoodCleaningPetOperation({ ...referenceInput(foodProduct, mgRoute), operationPriceCents: -1 }) },
] as const;
export const stFoodCleaningPetMvaFallbackRun = resolveFoodCleaningPetOperation({ ...referenceInput(petProduct, mgRoute), operationPriceCents: 15_000, ownIcmsBaseCents: 15_000, forceMvaFallback: true });

const routeAliases: Record<FoodCleaningPetRouteCode, string[]> = {
  "SP-MG": ["sp para mg", "sao paulo para minas gerais", "sp-mg", "para mg", "para minas gerais"], "SP-RJ": ["sp para rj", "sao paulo para rio de janeiro", "sp-rj", "para rj", "para rio de janeiro"], "SP-PR": ["sp para pr", "sao paulo para parana", "sp-pr", "para pr", "para parana"], "SP-SC": ["sp para sc", "sao paulo para santa catarina", "sp-sc", "para sc", "para santa catarina"], "SP-RS": ["sp para rs", "sao paulo para rio grande do sul", "sp-rs", "para rs", "para rio grande do sul"], "SP-GO": ["sp para go", "sao paulo para goias", "sp-go", "para go", "para goias"], "SP-BA": ["sp para ba", "sao paulo para bahia", "sp-ba", "para ba", "para bahia"], "SP-PE": ["sp para pe", "sao paulo para pernambuco", "sp-pe", "para pe", "para pernambuco"], "MG-SP": ["mg para sp", "minas gerais para sao paulo", "mg-sp", "de mg para sp", "de minas gerais para sao paulo"],
};
export function searchFoodCleaningPetRules(query: string) {
  const normalized = query.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const products = ST_FOOD_CLEANING_PET_PRODUCTS.filter((item) => item.searchTerms.some((term) => normalized.includes(term.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase())));
  const routes = ST_FOOD_CLEANING_PET_ROUTES.filter((item) => routeAliases[item.route].some((alias) => normalized.includes(alias)));
  return (products.length ? products : ST_FOOD_CLEANING_PET_PRODUCTS).flatMap((productItem) => (routes.length ? routes : ST_FOOD_CLEANING_PET_ROUTES).map((routeItem) => ({ productCode: productItem.code, family: productItem.family, route: routeItem.route, status: routeItem.coverageStatus, cest: productItem.cest, ncm: productItem.ncm, presentation: productItem.presentation, blockers: [...routeItem.blockers], version: ST_FOOD_CLEANING_PET_VERSION })));
}

export function buildFoodCleaningPetDossier(result: FoodCleaningPetResult) {
  const productItem = productByCode.get(result.productCode);
  const routeItem = routeByCode.get(result.route);
  return { schemaVersion: "food-cleaning-pet-dossier.v2", ruleVersion: ST_FOOD_CLEANING_PET_VERSION, status: result.status, coverageStatus: result.coverageStatus, identity: productItem ? { code: productItem.code, family: productItem.family, label: productItem.label, cest: productItem.cest, ncm: productItem.ncm, presentation: productItem.presentation, effectiveFrom: productItem.effectiveFrom, effectiveTo: productItem.effectiveTo } : null, route: routeItem ? { route: routeItem.route, origin: routeItem.origin, destination: routeItem.destination, responsibility: routeItem.responsibility } : null, method: result.method, parameters: result.parameters, calculation: result.output, blockers: result.blockers, evidence: result.sourceCodes.map((code) => sourceByCode.get(code)).filter((source): source is OfficialSource => Boolean(source)), limitation: "Memória condicionada ao recorte exato. Não classifica mercadoria divergente nem substitui conferência documental da operação." };
}
export const stFoodCleaningPetDossiers = stFoodCleaningPetReferenceRuns.map((run) => ({ key: run.key, dossier: buildFoodCleaningPetDossier(run.result) }));

export function stFoodCleaningPetMetrics() {
  const blockedCells = stFoodCleaningPetReferenceRuns.filter((run) => run.result.output === null).length;
  return { priorityProducts: ST_FOOD_CLEANING_PET_PRODUCTS.length, productFamilies: new Set(ST_FOOD_CLEANING_PET_PRODUCTS.map((item) => item.family)).size, priorityRoutes: ST_FOOD_CLEANING_PET_ROUTES.length, controlledCells: stFoodCleaningPetReferenceRuns.length, reproducedMemories: stFoodCleaningPetReferenceRuns.filter((run) => run.result.status === "calculated_reference").length, mvaMemories: stFoodCleaningPetReferenceRuns.filter((run) => run.result.method === "mva").length + (stFoodCleaningPetMvaFallbackRun.status === "calculated_reference" ? 1 : 0), pmpfMemories: stFoodCleaningPetReferenceRuns.filter((run) => run.result.method === "pmpf").length, safeFailureScenarios: blockedCells + stFoodCleaningPetNegativeRuns.filter((run) => run.result.output === null).length, officialSources: stFoodCleaningPetSources.length, coverage: { supported: stFoodCleaningPetReferenceRuns.filter((run) => run.result.coverageStatus === "supported").length, partial: stFoodCleaningPetReferenceRuns.filter((run) => run.result.coverageStatus === "partial").length, notSupported: stFoodCleaningPetReferenceRuns.filter((run) => run.result.coverageStatus === "not_supported").length } };
}

export function validateStFoodCleaningPetPriority() {
  const errors: string[] = [];
  if (ST_FOOD_CLEANING_PET_PRODUCTS.length !== 25 || new Set(ST_FOOD_CLEANING_PET_PRODUCTS.map((item) => item.code)).size !== 25) errors.push("twenty_five_unique_products_required");
  if (new Set(ST_FOOD_CLEANING_PET_PRODUCTS.map((item) => item.family)).size !== 4) errors.push("four_segregated_families_required");
  if (ST_FOOD_CLEANING_PET_ROUTES.length !== 9 || new Set(ST_FOOD_CLEANING_PET_ROUTES.map((item) => item.destination)).size !== 9) errors.push("nine_priority_destinations_required");
  if (stFoodCleaningPetReferenceRuns.length < 200) errors.push("two_hundred_controlled_cases_required");
  if (stFoodCleaningPetSources.some((source) => !source.url.startsWith("https://") || source.proves.length === 0)) errors.push("official_source_without_scope");
  for (const productItem of ST_FOOD_CLEANING_PET_PRODUCTS) {
    if (!/^\d{2}\.\d{3}\.\d{2}$/.test(productItem.cest) || !/^\d{8}$/.test(productItem.ncm) || !productItem.presentation || productItem.exclusions.length === 0 || !Number.isSafeInteger(productItem.mgMvaOriginalBps) || productItem.effectiveFrom !== ST_FOOD_CLEANING_PET_PERIOD.from || productItem.effectiveTo !== ST_FOOD_CLEANING_PET_PERIOD.to) errors.push(`incomplete_product:${productItem.code}`);
    if (productItem.sourceCodes.some((code) => !sourceByCode.has(code))) errors.push(`unknown_product_source:${productItem.code}`);
  }
  const supported = stFoodCleaningPetReferenceRuns.filter((run) => run.route === "SP-MG");
  if (supported.length !== 25 || supported.some((run) => run.result.status !== "calculated_reference" || run.result.output === null)) errors.push("mg_reference_not_reproduced");
  const openCells = stFoodCleaningPetReferenceRuns.filter((run) => run.route !== "SP-MG");
  if (openCells.length !== 200 || openCells.some((run) => run.result.status !== "blocked" || run.result.output !== null || run.result.coverageStatus !== "partial" || !run.result.blockers.includes("route_parameters_not_closed"))) errors.push("open_route_leaked_value");
  if (stFoodCleaningPetNegativeRuns.some((run) => run.result.output !== null || run.result.status === "calculated_reference")) errors.push("negative_gate_released_value");
  if (stFoodCleaningPetMvaFallbackRun.method !== "mva" || stFoodCleaningPetMvaFallbackRun.output === null) errors.push("pet_mva_fallback_not_reproduced");
  if (supported.find((run) => run.productCode === "DOGCHOW_ABOVE_5KG")?.result.method !== "pmpf") errors.push("pet_pmpf_not_reproduced");
  if (searchFoodCleaningPetRules("detergente em pó de SP para MG").length !== 1) errors.push("search_did_not_narrow_product_and_route");
  return { passed: errors.length === 0, errors };
}

export async function hashStFoodCleaningPetPriority() {
  const payload = JSON.stringify({ version: ST_FOOD_CLEANING_PET_VERSION, period: ST_FOOD_CLEANING_PET_PERIOD, sources: stFoodCleaningPetSources, products: ST_FOOD_CLEANING_PET_PRODUCTS, routes: ST_FOOD_CLEANING_PET_ROUTES, runs: stFoodCleaningPetReferenceRuns, fallback: stFoodCleaningPetMvaFallbackRun, negativeRuns: stFoodCleaningPetNegativeRuns });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

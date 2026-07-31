export const TAX_REFORM_SECTOR_VERSION = "2026.07.31-v97";
export const TAX_REFORM_SECTOR_CHECKED_AT = "2026-07-31";

export type TaxReformSectorCode =
  | "REGULAR_GOODS_B2B"
  | "REGULAR_SERVICES_B2B"
  | "PROFESSIONAL_COUNCIL_SERVICES"
  | "EDUCATION_SERVICES"
  | "HEALTH_SERVICES"
  | "HUMAN_FOOD_REDUCED"
  | "BASIC_FOOD_BASKET_ZERO"
  | "MEDICINES_REDUCED"
  | "MEDICAL_DEVICES_REDUCED"
  | "FINANCIAL_SERVICES_SPECIFIC"
  | "FUELS_SPECIFIC"
  | "REAL_ESTATE_SPECIFIC";

export type TaxReformSectorTreatment =
  | "standard"
  | "reduction_30"
  | "reduction_60"
  | "zero_rate"
  | "specific_regime";

export type TaxReformSectorSource = {
  code: string;
  title: string;
  publisher: string;
  url: string;
  legalReference: string;
  checkedAt: string;
};

export type TaxReformSectorProfile = {
  rank: number;
  code: TaxReformSectorCode;
  title: string;
  recurringOperation: string;
  treatment: TaxReformSectorTreatment;
  standardRateShareBps: number | null;
  exactClassificationRequired: boolean;
  supportedFrom: number | null;
  sourceCodes: string[];
  requiredEvidence: string[];
  blockers: string[];
  version: string;
  checkedAt: string;
};

export type TaxReformSectorInput = {
  sectorCode: TaxReformSectorCode;
  targetYear: number;
  taxableBaseCents: number | null;
  currentPisCofinsCents: number | null;
  currentIcmsIssCents: number | null;
  currentIpiCents: number | null;
  cbsReferenceRateBps: number | null;
  ibsReferenceRateBps: number | null;
  cbsCreditsCents: number | null;
  ibsCreditsCents: number | null;
  selectiveTaxCents: number | null;
  sectorEligibilityConfirmed: boolean;
  exactClassificationConfirmed: boolean;
  officialSourceVersionConfirmed: boolean;
  operationDocumented: boolean;
  creditsEvidenceConfirmed: boolean;
  noSpecificExceptionConfirmed: boolean;
  noZfmIpiExceptionConfirmed: boolean;
  ancillaryObligations2026Confirmed: boolean;
};

export type TaxReformSectorLine = {
  code: string;
  label: string;
  formula: string;
  amountCents: number | null;
  rateBps: number | null;
  book: "PIS_COFINS" | "ICMS_ISS" | "IPI" | "CBS" | "IBS" | "IS" | "TOTAL";
};

export type TaxReformSectorResult = {
  coverage: "supported" | "partial" | "unsupported";
  profile: TaxReformSectorProfile | null;
  targetYear: number;
  lines: TaxReformSectorLine[];
  blockers: string[];
  warnings: string[];
  sourceCodes: string[];
  resultObjective: string;
  totalExposureCents: number | null;
  netPayableCents: null;
  version: string;
  checkedAt: string;
};

export const taxReformSectorSources: TaxReformSectorSource[] = [
  {
    code: "RTC-EC-132",
    title: "Emenda Constitucional nº 132/2023",
    publisher: "Presidência da República",
    url: "https://www.planalto.gov.br/ccivil_03/constituicao/emendas/emc/emc132.htm",
    legalReference: "instituição do IBS e da CBS e transição do sistema de tributação do consumo",
    checkedAt: TAX_REFORM_SECTOR_CHECKED_AT,
  },
  {
    code: "RTC-LC-214-COMPILED",
    title: "Lei Complementar nº 214/2025 — texto compilado",
    publisher: "Presidência da República",
    url: "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214compilado.htm",
    legalReference: "arts. 125, 127, 128, 143, 172 a 180, 181 a 212 e regimes específicos do IBS e da CBS",
    checkedAt: TAX_REFORM_SECTOR_CHECKED_AT,
  },
  {
    code: "RTC-LC-227-2026",
    title: "Lei Complementar nº 227/2026",
    publisher: "Presidência da República",
    url: "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp227.htm",
    legalReference: "fixação da soma anual das alíquotas dos serviços financeiros e atualização dos regimes de combustíveis e imóveis",
    checkedAt: TAX_REFORM_SECTOR_CHECKED_AT,
  },
  {
    code: "RTC-RFB-TRANSITION",
    title: "Entenda a Reforma Tributária do Consumo",
    publisher: "Receita Federal",
    url: "https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/reforma-tributaria-do-consumo/entenda",
    legalReference: "cronograma oficial de 2026 a 2033 e percentuais remanescentes de ICMS e ISS",
    checkedAt: TAX_REFORM_SECTOR_CHECKED_AT,
  },
  {
    code: "RTC-RFB-2026",
    title: "Orientações da Reforma Tributária para 2026",
    publisher: "Receita Federal",
    url: "https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/reforma-tributaria-do-consumo/orientacoes-2026",
    legalReference: "destaque de CBS 0,9% e IBS 0,1% e dispensa condicionada no ano-teste",
    checkedAt: TAX_REFORM_SECTOR_CHECKED_AT,
  },
  {
    code: "RTC-CGIBS-DERE",
    title: "Documentação técnica oficial da DeRE",
    publisher: "Comitê Gestor do IBS",
    url: "https://www.cgibs.gov.br/cgibs-e-receita-federal-publicam-documentacao-tecnica-oficial-da-declaracao-de-regimes-especificos-dere",
    legalReference: "declaração dos regimes específicos de serviços financeiros, planos de saúde e concursos de prognósticos",
    checkedAt: TAX_REFORM_SECTOR_CHECKED_AT,
  },
  {
    code: "RTC-RFB-CALCULATOR",
    title: "Calculadora oficial de tributos sobre consumo",
    publisher: "Receita Federal",
    url: "https://consumo.tributos.gov.br/servico/calcular-tributos-consumo/calculadora/regime-geral",
    legalReference: "reconciliação oficial da memória de CBS e IBS no regime geral",
    checkedAt: TAX_REFORM_SECTOR_CHECKED_AT,
  },
];

function profile(
  rank: number,
  code: TaxReformSectorCode,
  title: string,
  recurringOperation: string,
  treatment: TaxReformSectorTreatment,
  standardRateShareBps: number | null,
  exactClassificationRequired: boolean,
  supportedFrom: number | null,
  legalBlockers: string[] = [],
): TaxReformSectorProfile {
  return {
    rank,
    code,
    title,
    recurringOperation,
    treatment,
    standardRateShareBps,
    exactClassificationRequired,
    supportedFrom,
    sourceCodes: treatment === "specific_regime"
      ? ["RTC-EC-132", "RTC-LC-214-COMPILED", "RTC-LC-227-2026", "RTC-RFB-TRANSITION", "RTC-CGIBS-DERE"]
      : ["RTC-EC-132", "RTC-LC-214-COMPILED", "RTC-RFB-TRANSITION", "RTC-RFB-2026", "RTC-RFB-CALCULATOR"],
    requiredEvidence: [
      "setor e operação enquadrados no dispositivo legal",
      ...(exactClassificationRequired ? ["classificação exata no Anexo legal aplicável"] : []),
      "documento e base da operação reconciliados",
      "alíquotas de referência identificadas como premissas quando ainda não fixadas",
      "créditos de CBS e IBS separados e documentalmente comprovados",
      "vigência e ausência de exceção específica confirmadas",
    ],
    blockers: legalBlockers,
    version: TAX_REFORM_SECTOR_VERSION,
    checkedAt: TAX_REFORM_SECTOR_CHECKED_AT,
  };
}

export const taxReformSectorProfiles: TaxReformSectorProfile[] = [
  profile(1, "REGULAR_GOODS_B2B", "Comércio e indústria no regime regular", "venda B2B de mercadoria no regime geral", "standard", 10_000, false, 2026),
  profile(2, "REGULAR_SERVICES_B2B", "Serviços empresariais no regime regular", "prestação B2B sujeita ao regime geral", "standard", 10_000, false, 2026),
  profile(3, "PROFESSIONAL_COUNCIL_SERVICES", "Serviços intelectuais fiscalizados por conselho", "serviço profissional que cumpra todos os requisitos do art. 127", "reduction_30", 7_000, true, 2027),
  profile(4, "EDUCATION_SERVICES", "Serviços de educação", "serviço de educação classificado no recorte legal", "reduction_60", 4_000, true, 2027),
  profile(5, "HEALTH_SERVICES", "Serviços de saúde", "serviço de saúde classificado no recorte legal", "reduction_60", 4_000, true, 2027),
  profile(6, "HUMAN_FOOD_REDUCED", "Alimentos com redução de 60%", "venda de alimento classificado no Anexo de redução", "reduction_60", 4_000, true, 2027),
  profile(7, "BASIC_FOOD_BASKET_ZERO", "Cesta Básica Nacional", "venda de produto destinado à alimentação humana relacionado no Anexo I", "zero_rate", 0, true, 2027),
  profile(8, "MEDICINES_REDUCED", "Medicamentos com redução de 60%", "venda de medicamento classificado no Anexo aplicável", "reduction_60", 4_000, true, 2027),
  profile(9, "MEDICAL_DEVICES_REDUCED", "Dispositivos médicos com redução de 60%", "venda de dispositivo classificado no Anexo aplicável", "reduction_60", 4_000, true, 2027),
  profile(10, "FINANCIAL_SERVICES_SPECIFIC", "Serviços financeiros", "operações dos arts. 181 a 233", "specific_regime", null, true, 2027, ["usar a memória específica V97; nunca herdar base, alíquota ou crédito do regime geral"]),
  profile(11, "FUELS_SPECIFIC", "Combustíveis", "operações monofásicas dos arts. 172 a 180", "specific_regime", null, true, 2027, ["usar a memória específica V97 com produto, unidade, ato e alíquotas ad rem exatos"]),
  profile(12, "REAL_ESTATE_SPECIFIC", "Operações com bens imóveis", "operações dos arts. 251 a 265", "specific_regime", null, true, 2027, ["usar a memória específica V97 com fato gerador, base e redutores próprios"]),
];

const transition = [
  { year: 2026, pisCofinsShareBps: 10_000, icmsIssShareBps: 10_000, ibsShareBps: 0 },
  { year: 2027, pisCofinsShareBps: 0, icmsIssShareBps: 10_000, ibsShareBps: 0 },
  { year: 2028, pisCofinsShareBps: 0, icmsIssShareBps: 10_000, ibsShareBps: 0 },
  { year: 2029, pisCofinsShareBps: 0, icmsIssShareBps: 9_000, ibsShareBps: 1_000 },
  { year: 2030, pisCofinsShareBps: 0, icmsIssShareBps: 8_000, ibsShareBps: 2_000 },
  { year: 2031, pisCofinsShareBps: 0, icmsIssShareBps: 7_000, ibsShareBps: 3_000 },
  { year: 2032, pisCofinsShareBps: 0, icmsIssShareBps: 6_000, ibsShareBps: 4_000 },
  { year: 2033, pisCofinsShareBps: 0, icmsIssShareBps: 0, ibsShareBps: 10_000 },
] as const;

function validMoney(value: number | null) {
  return value !== null && Number.isSafeInteger(value) && value >= 0 && value <= 100_000_000_000_000;
}

function validRate(value: number | null) {
  return value !== null && Number.isInteger(value) && value >= 0 && value <= 5_000;
}

function multiply(value: number, bps: number) {
  const output = (BigInt(value) * BigInt(bps) + 5_000n) / 10_000n;
  if (output > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("tax_reform_sector_overflow");
  return Number(output);
}

function sum(values: number[]) {
  const total = values.reduce((accumulator, value) => accumulator + value, 0);
  if (!Number.isSafeInteger(total)) throw new Error("tax_reform_sector_overflow");
  return total;
}

function baseRates(year: number, cbsReferenceRateBps: number | null, ibsReferenceRateBps: number | null) {
  if (year === 2026) return { cbs: 90, ibs: 10 };
  const cbs = validRate(cbsReferenceRateBps)
    ? year <= 2028 ? Math.max(0, cbsReferenceRateBps! - 10) : cbsReferenceRateBps!
    : null;
  const rule = transition.find((item) => item.year === year);
  const ibs = year <= 2028
    ? 10
    : validRate(ibsReferenceRateBps) && rule
      ? multiply(ibsReferenceRateBps!, rule.ibsShareBps)
      : null;
  return { cbs, ibs };
}

export const financialSpecificCombinedRateSchedule = [
  { year: 2027, combinedRateBps: 1_085 },
  { year: 2028, combinedRateBps: 1_085 },
  { year: 2029, combinedRateBps: 1_100 },
  { year: 2030, combinedRateBps: 1_115 },
  { year: 2031, combinedRateBps: 1_130 },
  { year: 2032, combinedRateBps: 1_150 },
  { year: 2033, combinedRateBps: 1_250 },
] as const;

export const fuelSpecificProductCatalog = [
  "GASOLINE_AND_STREAMS",
  "EAC",
  "DIESEL_AND_STREAMS",
  "BIODIESEL_B100",
  "LPG_AND_LGNG",
  "EHC",
  "AVIATION_KEROSENE",
  "FUEL_OIL",
  "PROCESSED_NATURAL_GAS",
  "BIOMETHANE",
  "CNG",
  "OTHER_ANP_JOINT_ACT",
] as const;

export type TaxReformSpecificOperation =
  | "financial_credit_exchange_securities"
  | "financial_factoring_securitization"
  | "fuel_monophase"
  | "real_estate_sale"
  | "real_estate_rent";

export type TaxReformSpecificRegimeInput = {
  sectorCode: Extract<TaxReformSectorCode, "FINANCIAL_SERVICES_SPECIFIC" | "FUELS_SPECIFIC" | "REAL_ESTATE_SPECIFIC">;
  operationCode: TaxReformSpecificOperation;
  targetYear: number;
  effectiveDate: string;
  exactClassificationConfirmed: boolean;
  taxpayerRoleConfirmed: boolean;
  operationDocumented: boolean;
  officialSourceVersionConfirmed: boolean;
  pendingRegulationDecision: boolean;
  futureRateEstimated: boolean;
  cbsCreditsCents: number | null;
  ibsCreditsCents: number | null;
  creditsEvidenceConfirmed: boolean;
  grossRevenueCents: number | null;
  legalDeductionsCents: number | null;
  fuelProductCode: typeof fuelSpecificProductCatalog[number] | null;
  fuelQuantityMilliUnits: number | null;
  fuelUnitCode: string | null;
  fuelCbsRateTenThousandthRealPerUnit: number | null;
  fuelIbsRateTenThousandthRealPerUnit: number | null;
  officialRateActReference: string | null;
  officialRateActValidityConfirmed: boolean;
  realEstateOperationValueCents: number | null;
  realEstateAdjustmentReducerCents: number | null;
  realEstateSocialReducerCents: number | null;
  realEstateNonTaxBaseExclusionsCents: number | null;
  realEstateCbsReferenceRateBps: number | null;
  realEstateIbsReferenceRateBps: number | null;
  socialReducerIpcaUpdateConfirmed: boolean;
};

export type TaxReformSpecificRegimeLine = {
  code: string;
  label: string;
  formula: string;
  amountCents: number | null;
  rateBps: number | null;
  book: "IBS_CBS_COMBINED" | "CBS" | "IBS" | "CREDIT_CBS" | "CREDIT_IBS" | "FUEL_QUANTITY";
};

export type TaxReformSpecificRegimeResult = {
  coverage: "supported" | "partial";
  sectorCode: TaxReformSpecificRegimeInput["sectorCode"];
  operationCode: TaxReformSpecificOperation;
  targetYear: number;
  taxableBaseCents: number | null;
  quantityMilliUnits: number | null;
  lines: TaxReformSpecificRegimeLine[];
  blockers: string[];
  warnings: string[];
  legalControls: string[];
  sourceCodes: string[];
  totalGrossCents: number | null;
  netPayableCents: null;
  version: string;
  checkedAt: string;
};

const specificLegalControls = {
  FINANCIAL_SERVICES_SPECIFIC: [
    "LC 214 arts. 181 a 191: classificação, receitas, deduções, créditos e DeRE próprios",
    "LC 214 arts. 192 e 193: bases controladas para margem financeira e factoring/securitização",
    "LC 214 art. 233 com LC 227/2026: soma anual das alíquotas de 2027 a 2033",
  ],
  FUELS_SPECIFIC: [
    "LC 214 art. 172: lista fechada de combustíveis e ato conjunto para outros produtos",
    "LC 214 art. 173: base por quantidade e unidade própria",
    "LC 214 art. 174: alíquota nacional ad rem diferenciada por produto e divulgada em ato competente",
  ],
  REAL_ESTATE_SPECIFIC: [
    "LC 214 arts. 251 a 255: contribuinte, operação, fato gerador e valor da operação",
    "LC 214 arts. 257 a 260: redutor de ajuste e redutor social individualizados por imóvel",
    "LC 214 art. 261: redução de 50% e redução de 70% para locação, cessão e arrendamento",
  ],
} as const;

function validPositiveInteger(value: number | null, maximum = 100_000_000_000_000) {
  return value !== null && Number.isSafeInteger(value) && value > 0 && value <= maximum;
}

function quantityTaxCents(quantityMilliUnits: number, rateTenThousandthRealPerUnit: number) {
  const numerator = BigInt(quantityMilliUnits) * BigInt(rateTenThousandthRealPerUnit);
  const output = (numerator + 50_000n) / 100_000n;
  if (output > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("tax_reform_specific_overflow");
  return Number(output);
}

function specificBlocked(
  input: TaxReformSpecificRegimeInput,
  blockers: string[],
  sourceCodes: string[],
): TaxReformSpecificRegimeResult {
  return {
    coverage: "partial",
    sectorCode: input.sectorCode,
    operationCode: input.operationCode,
    targetYear: input.targetYear,
    taxableBaseCents: null,
    quantityMilliUnits: null,
    lines: [],
    blockers: [...new Set(blockers)],
    warnings: [],
    legalControls: [...specificLegalControls[input.sectorCode]],
    sourceCodes,
    totalGrossCents: null,
    netPayableCents: null,
    version: TAX_REFORM_SECTOR_VERSION,
    checkedAt: TAX_REFORM_SECTOR_CHECKED_AT,
  };
}

export function calculateTaxReformSpecificRegime(
  input: TaxReformSpecificRegimeInput,
): TaxReformSpecificRegimeResult {
  const blockers: string[] = [];
  const sourceCodes = ["RTC-EC-132", "RTC-LC-214-COMPILED", "RTC-LC-227-2026", "RTC-RFB-TRANSITION"];
  if (!Number.isInteger(input.targetYear) || input.targetYear < 2027 || input.targetYear > 2033) blockers.push("ano fora do recorte regulamentado de 2027 a 2033");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.effectiveDate) || Number(input.effectiveDate.slice(0, 4)) !== input.targetYear) blockers.push("data da operação ausente, inválida ou incompatível com o ano");
  if (!input.exactClassificationConfirmed) blockers.push("classificação legal exata do regime e da operação não confirmada");
  if (!input.taxpayerRoleConfirmed) blockers.push("papel do contribuinte no regime específico não confirmado");
  if (!input.operationDocumented) blockers.push("documento e fato gerador não reconciliados");
  if (!input.officialSourceVersionConfirmed) blockers.push("versão e vigência das fontes oficiais não confirmadas");
  if (input.pendingRegulationDecision) blockers.push("ato ou decisão regulamentar ainda pendente");
  if (input.futureRateEstimated) blockers.push("alíquota futura estimada é proibida");
  if (!validMoney(input.cbsCreditsCents) || !validMoney(input.ibsCreditsCents) || !input.creditsEvidenceConfirmed) blockers.push("créditos de CBS e IBS não comprovados em livros separados");

  if (input.sectorCode === "FINANCIAL_SERVICES_SPECIFIC") {
    sourceCodes.push("RTC-CGIBS-DERE");
    if (!["financial_credit_exchange_securities", "financial_factoring_securitization"].includes(input.operationCode)) blockers.push("operação financeira fora dos recortes dos arts. 192 e 193");
    if (!validMoney(input.grossRevenueCents) || !validMoney(input.legalDeductionsCents)) blockers.push("receita e deduções legais em centavos ausentes ou inválidas");
    if (validMoney(input.grossRevenueCents) && validMoney(input.legalDeductionsCents) && input.legalDeductionsCents! > input.grossRevenueCents!) blockers.push("deduções legais excedem a receita do período");
    const schedule = financialSpecificCombinedRateSchedule.find((item) => item.year === input.targetYear);
    if (!schedule) blockers.push("soma anual das alíquotas financeiras não fixada no cronograma controlado");
    if (blockers.length || !schedule) return specificBlocked(input, blockers, sourceCodes);
    const base = input.grossRevenueCents! - input.legalDeductionsCents!;
    const totalGrossCents = multiply(base, schedule.combinedRateBps);
    return {
      coverage: "supported", sectorCode: input.sectorCode, operationCode: input.operationCode, targetYear: input.targetYear,
      taxableBaseCents: base, quantityMilliUnits: null,
      lines: [
        { code: "FINANCIAL-COMBINED-GROSS", label: "IBS e CBS brutos combinados", formula: `(receitas − deduções legais) × ${schedule.combinedRateBps} bps`, amountCents: totalGrossCents, rateBps: schedule.combinedRateBps, book: "IBS_CBS_COMBINED" },
        { code: "FINANCIAL-CBS-CREDIT-EVIDENCE", label: "Crédito CBS comprovado, sem encontro automático", formula: "livro CBS separado", amountCents: input.cbsCreditsCents, rateBps: null, book: "CREDIT_CBS" },
        { code: "FINANCIAL-IBS-CREDIT-EVIDENCE", label: "Crédito IBS comprovado, sem encontro automático", formula: "livro IBS separado", amountCents: input.ibsCreditsCents, rateBps: null, book: "CREDIT_IBS" },
      ],
      blockers: [],
      warnings: ["A LC fixa a soma anual; a memória não inventa a repartição entre CBS e IBS nem produz saldo líquido."],
      legalControls: [...specificLegalControls[input.sectorCode]], sourceCodes: [...new Set(sourceCodes)],
      totalGrossCents, netPayableCents: null, version: TAX_REFORM_SECTOR_VERSION, checkedAt: TAX_REFORM_SECTOR_CHECKED_AT,
    };
  }

  if (input.sectorCode === "FUELS_SPECIFIC") {
    if (input.operationCode !== "fuel_monophase") blockers.push("operação incompatível com o regime monofásico de combustíveis");
    if (!input.fuelProductCode || !fuelSpecificProductCatalog.includes(input.fuelProductCode)) blockers.push("combustível fora da lista exata do art. 172");
    if (!validPositiveInteger(input.fuelQuantityMilliUnits)) blockers.push("quantidade positiva em milésimos da unidade não informada");
    if (!input.fuelUnitCode?.trim()) blockers.push("unidade própria do combustível não confirmada");
    if (!validPositiveInteger(input.fuelCbsRateTenThousandthRealPerUnit, 1_000_000_000) || !validPositiveInteger(input.fuelIbsRateTenThousandthRealPerUnit, 1_000_000_000)) blockers.push("alíquotas específicas ad rem da CBS e do IBS ausentes");
    if (!input.officialRateActReference?.trim() || !input.officialRateActValidityConfirmed) blockers.push("ato competente e vigência das alíquotas ad rem não confirmados");
    if (input.fuelProductCode === "OTHER_ANP_JOINT_ACT" && !input.officialRateActReference?.includes("ATO-CONJUNTO")) blockers.push("outro combustível exige ato conjunto RFB/CGIBS e autorização ANP");
    if (blockers.length) return specificBlocked(input, blockers, sourceCodes);
    const cbsGross = quantityTaxCents(input.fuelQuantityMilliUnits!, input.fuelCbsRateTenThousandthRealPerUnit!);
    const ibsGross = quantityTaxCents(input.fuelQuantityMilliUnits!, input.fuelIbsRateTenThousandthRealPerUnit!);
    const totalGrossCents = sum([cbsGross, ibsGross]);
    return {
      coverage: "supported", sectorCode: input.sectorCode, operationCode: input.operationCode, targetYear: input.targetYear,
      taxableBaseCents: null, quantityMilliUnits: input.fuelQuantityMilliUnits,
      lines: [
        { code: "FUEL-QUANTITY", label: "Quantidade na unidade legal", formula: `${input.fuelQuantityMilliUnits} milésimos de ${input.fuelUnitCode}`, amountCents: null, rateBps: null, book: "FUEL_QUANTITY" },
        { code: "FUEL-CBS-GROSS", label: "CBS monofásica bruta", formula: "quantidade × alíquota CBS ad rem do ato informado", amountCents: cbsGross, rateBps: null, book: "CBS" },
        { code: "FUEL-IBS-GROSS", label: "IBS monofásico bruto", formula: "quantidade × alíquota IBS ad rem do ato informado", amountCents: ibsGross, rateBps: null, book: "IBS" },
        { code: "FUEL-CBS-CREDIT-EVIDENCE", label: "Crédito CBS comprovado, sem encontro automático", formula: "livro CBS separado", amountCents: input.cbsCreditsCents, rateBps: null, book: "CREDIT_CBS" },
        { code: "FUEL-IBS-CREDIT-EVIDENCE", label: "Crédito IBS comprovado, sem encontro automático", formula: "livro IBS separado", amountCents: input.ibsCreditsCents, rateBps: null, book: "CREDIT_IBS" },
      ],
      blockers: [],
      warnings: ["O motor não armazena uma alíquota futura presumida: usa somente valores e ato oficial explicitamente confirmados na entrada."],
      legalControls: [...specificLegalControls[input.sectorCode]], sourceCodes: [...new Set(sourceCodes)],
      totalGrossCents, netPayableCents: null, version: TAX_REFORM_SECTOR_VERSION, checkedAt: TAX_REFORM_SECTOR_CHECKED_AT,
    };
  }

  if (!["real_estate_sale", "real_estate_rent"].includes(input.operationCode)) blockers.push("operação imobiliária fora dos recortes de alienação e locação");
  if (!validMoney(input.realEstateOperationValueCents)
    || !validMoney(input.realEstateAdjustmentReducerCents)
    || !validMoney(input.realEstateSocialReducerCents)
    || !validMoney(input.realEstateNonTaxBaseExclusionsCents)) blockers.push("valor, redutores e exclusões da base imobiliária incompletos");
  const deductions = validMoney(input.realEstateAdjustmentReducerCents) && validMoney(input.realEstateSocialReducerCents) && validMoney(input.realEstateNonTaxBaseExclusionsCents)
    ? sum([input.realEstateAdjustmentReducerCents!, input.realEstateSocialReducerCents!, input.realEstateNonTaxBaseExclusionsCents!])
    : null;
  if (deductions !== null && validMoney(input.realEstateOperationValueCents) && deductions > input.realEstateOperationValueCents!) blockers.push("redutores e exclusões excedem o valor da operação");
  if (input.realEstateSocialReducerCents! > 0 && !input.socialReducerIpcaUpdateConfirmed) blockers.push("atualização mensal do redutor social pelo IPCA não confirmada");
  if (!validRate(input.realEstateCbsReferenceRateBps) || !validRate(input.realEstateIbsReferenceRateBps)) blockers.push("alíquotas oficiais de referência da CBS e do IBS não informadas");
  if (!input.officialRateActReference?.trim() || !input.officialRateActValidityConfirmed) blockers.push("ato e vigência das alíquotas de referência não confirmados");
  if (input.operationCode === "real_estate_rent" && input.realEstateAdjustmentReducerCents !== 0) blockers.push("redutor de ajuste é exclusivo da alienação neste recorte");
  if (blockers.length || deductions === null) return specificBlocked(input, blockers, sourceCodes);
  const base = input.realEstateOperationValueCents! - deductions;
  const remainingRateShareBps = input.operationCode === "real_estate_rent" ? 3_000 : 5_000;
  const cbsRate = multiply(input.realEstateCbsReferenceRateBps!, remainingRateShareBps);
  const ibsRate = multiply(input.realEstateIbsReferenceRateBps!, remainingRateShareBps);
  const cbsGross = multiply(base, cbsRate);
  const ibsGross = multiply(base, ibsRate);
  const totalGrossCents = sum([cbsGross, ibsGross]);
  return {
    coverage: "supported", sectorCode: input.sectorCode, operationCode: input.operationCode, targetYear: input.targetYear,
    taxableBaseCents: base, quantityMilliUnits: null,
    lines: [
      { code: "REAL-ESTATE-CBS-GROSS", label: "CBS imobiliária bruta", formula: `base após redutores × ${remainingRateShareBps} bps da alíquota de referência`, amountCents: cbsGross, rateBps: cbsRate, book: "CBS" },
      { code: "REAL-ESTATE-IBS-GROSS", label: "IBS imobiliário bruto", formula: `base após redutores × ${remainingRateShareBps} bps da alíquota de referência`, amountCents: ibsGross, rateBps: ibsRate, book: "IBS" },
      { code: "REAL-ESTATE-CBS-CREDIT-EVIDENCE", label: "Crédito CBS comprovado, sem encontro automático", formula: "livro CBS separado", amountCents: input.cbsCreditsCents, rateBps: null, book: "CREDIT_CBS" },
      { code: "REAL-ESTATE-IBS-CREDIT-EVIDENCE", label: "Crédito IBS comprovado, sem encontro automático", formula: "livro IBS separado", amountCents: input.ibsCreditsCents, rateBps: null, book: "CREDIT_IBS" },
    ],
    blockers: [],
    warnings: ["Redutor social é informado já atualizado pelo IPCA; a memória não usa automaticamente os valores nominais históricos."],
    legalControls: [...specificLegalControls[input.sectorCode]], sourceCodes: [...new Set(sourceCodes)],
    totalGrossCents, netPayableCents: null, version: TAX_REFORM_SECTOR_VERSION, checkedAt: TAX_REFORM_SECTOR_CHECKED_AT,
  };
}

export function findTaxReformSectorProfile(code: TaxReformSectorCode | string) {
  return taxReformSectorProfiles.find((item) => item.code === code) ?? null;
}

export function calculateTaxReformSectorScenario(input: TaxReformSectorInput): TaxReformSectorResult {
  const profile = findTaxReformSectorProfile(input.sectorCode);
  const rule = transition.find((item) => item.year === input.targetYear);
  const blockers: string[] = [];
  const warnings: string[] = [];
  if (!profile) blockers.push("setor fora do catálogo versionado");
  if (!rule) blockers.push("ano fora do cronograma legal de 2026 a 2033");
  if (!input.sectorEligibilityConfirmed) blockers.push("enquadramento setorial e operação não confirmados");
  if (profile?.exactClassificationRequired && !input.exactClassificationConfirmed) blockers.push("classificação exata no Anexo legal não confirmada");
  if (!input.officialSourceVersionConfirmed) blockers.push("versão e vigência das fontes oficiais não confirmadas");
  if (!input.operationDocumented) blockers.push("documento e base da operação não reconciliados");
  if (!input.noSpecificExceptionConfirmed) blockers.push("exceções e condições específicas não foram descartadas");
  if (!validMoney(input.taxableBaseCents)) blockers.push("base tributável em centavos ausente ou inválida");
  if (!validMoney(input.currentPisCofinsCents) || !validMoney(input.currentIcmsIssCents) || !validMoney(input.currentIpiCents)) blockers.push("livros legados incompletos");
  if (input.targetYear > 2026 && (!validRate(input.cbsReferenceRateBps) || !validRate(input.ibsReferenceRateBps))) blockers.push("alíquotas de referência da CBS e do IBS não informadas como premissas");
  if (input.targetYear > 2026 && (!validMoney(input.cbsCreditsCents) || !validMoney(input.ibsCreditsCents) || !input.creditsEvidenceConfirmed)) blockers.push("créditos de CBS e IBS não comprovados em livros separados");
  if (input.targetYear > 2026 && (!validMoney(input.selectiveTaxCents))) blockers.push("Imposto Seletivo não confirmado, ainda que zero");
  if (input.targetYear > 2026 && !input.noZfmIpiExceptionConfirmed) blockers.push("exceção de IPI da Zona Franca de Manaus não decidida");
  if (input.targetYear === 2026 && !input.ancillaryObligations2026Confirmed) blockers.push("obrigações acessórias do ano-teste não confirmadas");
  if (profile?.treatment === "specific_regime") blockers.push(...profile.blockers);
  if (profile?.supportedFrom && input.targetYear < profile.supportedFrom) blockers.push("tratamento diferenciado ainda não liberado neste recorte anual");

  const unsupported = profile?.treatment === "specific_regime";
  const sourceCodes = profile?.sourceCodes ?? ["RTC-EC-132", "RTC-LC-214-COMPILED"];
  if (blockers.length || !profile || !rule || unsupported) {
    return {
      coverage: unsupported ? "unsupported" : "partial",
      profile,
      targetYear: input.targetYear,
      lines: [],
      blockers: [...new Set(blockers)],
      warnings,
      sourceCodes,
      resultObjective: unsupported
        ? "Regime específico catalogado, mas sem memória numérica: a fórmula padrão permanece bloqueada."
        : "Cenário parcial: nenhum valor anual foi liberado enquanto existirem fatos pendentes.",
      totalExposureCents: null,
      netPayableCents: null,
      version: TAX_REFORM_SECTOR_VERSION,
      checkedAt: TAX_REFORM_SECTOR_CHECKED_AT,
    };
  }

  const rates = baseRates(input.targetYear, input.cbsReferenceRateBps, input.ibsReferenceRateBps);
  if (rates.cbs === null || rates.ibs === null || profile.standardRateShareBps === null) {
    return {
      coverage: "partial",
      profile,
      targetYear: input.targetYear,
      lines: [],
      blockers: ["taxas anuais não puderam ser resolvidas"],
      warnings,
      sourceCodes,
      resultObjective: "Taxas anuais não resolvidas; memória bloqueada.",
      totalExposureCents: null,
      netPayableCents: null,
      version: TAX_REFORM_SECTOR_VERSION,
      checkedAt: TAX_REFORM_SECTOR_CHECKED_AT,
    };
  }

  const sectorCbsRate = multiply(rates.cbs, profile.standardRateShareBps);
  const sectorIbsRate = multiply(rates.ibs, profile.standardRateShareBps);
  const base = input.taxableBaseCents!;
  const legacyPisCofins = multiply(input.currentPisCofinsCents!, rule.pisCofinsShareBps);
  const legacyIcmsIss = multiply(input.currentIcmsIssCents!, rule.icmsIssShareBps);
  const legacyIpi = input.targetYear === 2026 ? input.currentIpiCents! : 0;
  const cbsGross = multiply(base, sectorCbsRate);
  const ibsGross = multiply(base, sectorIbsRate);
  const cbsCredits = input.targetYear === 2026 ? 0 : input.cbsCreditsCents!;
  const ibsCredits = input.targetYear === 2026 ? 0 : input.ibsCreditsCents!;
  const cbsExposure = input.targetYear === 2026 ? 0 : Math.max(0, cbsGross - cbsCredits);
  const ibsExposure = input.targetYear === 2026 ? 0 : Math.max(0, ibsGross - ibsCredits);
  const selectiveTax = input.targetYear === 2026 ? 0 : input.selectiveTaxCents!;
  const total = sum([legacyPisCofins, legacyIcmsIss, legacyIpi, cbsExposure, ibsExposure, selectiveTax]);
  warnings.push("Alíquotas de referência futuras são premissas declaradas até sua fixação oficial.");
  warnings.push("A exposição não é valor jurídico líquido a recolher e deve ser reconciliada com a Calculadora oficial.");
  const lines: TaxReformSectorLine[] = [
    { code: "LEGACY-PIS-COFINS", label: "PIS/Cofins remanescente", formula: `Livro PIS/Cofins × ${rule.pisCofinsShareBps} bps`, amountCents: legacyPisCofins, rateBps: rule.pisCofinsShareBps, book: "PIS_COFINS" },
    { code: "LEGACY-ICMS-ISS", label: "ICMS/ISS remanescente", formula: `Livro ICMS/ISS × ${rule.icmsIssShareBps} bps`, amountCents: legacyIcmsIss, rateBps: rule.icmsIssShareBps, book: "ICMS_ISS" },
    { code: "LEGACY-IPI", label: "IPI remanescente", formula: input.targetYear === 2026 ? "IPI legado mantido no ano-teste" : "IPI zerado após confirmação de ausência de exceção ZFM", amountCents: legacyIpi, rateBps: null, book: "IPI" },
    { code: "CBS-GROSS", label: "CBS bruta setorial", formula: `Base × taxa anual CBS × ${profile.standardRateShareBps} bps do tratamento setorial`, amountCents: cbsGross, rateBps: sectorCbsRate, book: "CBS" },
    { code: "CBS-EXPOSURE", label: "CBS após crédito comprovado", formula: input.targetYear === 2026 ? "Dispensa condicionada do ano-teste" : "Máximo entre zero e CBS bruta − crédito CBS", amountCents: cbsExposure, rateBps: null, book: "CBS" },
    { code: "IBS-GROSS", label: "IBS bruto setorial", formula: `Base × taxa anual IBS × ${profile.standardRateShareBps} bps do tratamento setorial`, amountCents: ibsGross, rateBps: sectorIbsRate, book: "IBS" },
    { code: "IBS-EXPOSURE", label: "IBS após crédito comprovado", formula: input.targetYear === 2026 ? "Dispensa condicionada do ano-teste" : "Máximo entre zero e IBS bruto − crédito IBS", amountCents: ibsExposure, rateBps: null, book: "IBS" },
    { code: "SELECTIVE-TAX", label: "Imposto Seletivo confirmado", formula: input.targetYear === 2026 ? "Não iniciado" : "Valor informado e reconciliado, inclusive zero", amountCents: selectiveTax, rateBps: null, book: "IS" },
    { code: "TRANSITION-TOTAL", label: "Exposição total da transição", formula: "Soma dos seis livros sem compensação cruzada", amountCents: total, rateBps: null, book: "TOTAL" },
  ];
  return {
    coverage: "supported",
    profile,
    targetYear: input.targetYear,
    lines,
    blockers: [],
    warnings,
    sourceCodes,
    resultObjective: `${profile.title} em ${input.targetYear}: exposição setorial reproduzida em centavos, sem produzir saldo jurídico a recolher.`,
    totalExposureCents: total,
    netPayableCents: null,
    version: TAX_REFORM_SECTOR_VERSION,
    checkedAt: TAX_REFORM_SECTOR_CHECKED_AT,
  };
}

function completeInput(profile: TaxReformSectorProfile, targetYear: number): TaxReformSectorInput {
  return {
    sectorCode: profile.code,
    targetYear,
    taxableBaseCents: 10_000_000,
    currentPisCofinsCents: 365_000,
    currentIcmsIssCents: 1_200_000,
    currentIpiCents: 0,
    cbsReferenceRateBps: targetYear === 2026 ? null : 900,
    ibsReferenceRateBps: targetYear === 2026 ? null : 1_800,
    cbsCreditsCents: targetYear === 2026 ? null : 200_000,
    ibsCreditsCents: targetYear === 2026 ? null : 100_000,
    selectiveTaxCents: targetYear === 2026 ? null : 0,
    sectorEligibilityConfirmed: true,
    exactClassificationConfirmed: true,
    officialSourceVersionConfirmed: true,
    operationDocumented: true,
    creditsEvidenceConfirmed: true,
    noSpecificExceptionConfirmed: true,
    noZfmIpiExceptionConfirmed: true,
    ancillaryObligations2026Confirmed: true,
  };
}

export type TaxReformSectorCase = {
  code: string;
  input: TaxReformSectorInput;
  expectedCoverage: TaxReformSectorResult["coverage"];
};

function baselineCoverage(profile: TaxReformSectorProfile, year: number): TaxReformSectorResult["coverage"] {
  if (profile.treatment === "specific_regime") return "unsupported";
  if (profile.supportedFrom && year < profile.supportedFrom) return "partial";
  return "supported";
}

export const taxReformSectorCases: TaxReformSectorCase[] = [
  ...taxReformSectorProfiles.flatMap((item) => transition.map(({ year }) => ({
    code: `${item.code}-${year}`,
    input: completeInput(item, year),
    expectedCoverage: baselineCoverage(item, year),
  }))),
  ...taxReformSectorProfiles.flatMap((item) => {
    const base = completeInput(item, 2033);
    const expectedFailure = item.treatment === "specific_regime" ? "unsupported" as const : "partial" as const;
    return [
      { code: `${item.code}-MISSING-SECTOR`, input: { ...base, sectorEligibilityConfirmed: false }, expectedCoverage: expectedFailure },
      { code: `${item.code}-MISSING-CLASSIFICATION`, input: { ...base, exactClassificationConfirmed: false }, expectedCoverage: item.treatment === "specific_regime" ? "unsupported" as const : item.exactClassificationRequired ? "partial" as const : "supported" as const },
      { code: `${item.code}-PENDING-CREDIT`, input: { ...base, creditsEvidenceConfirmed: false }, expectedCoverage: expectedFailure },
      { code: `${item.code}-MISSING-SOURCE`, input: { ...base, officialSourceVersionConfirmed: false }, expectedCoverage: expectedFailure },
    ];
  }),
];

function specificInput(
  sectorCode: TaxReformSpecificRegimeInput["sectorCode"],
  operationCode: TaxReformSpecificOperation,
  targetYear: number,
): TaxReformSpecificRegimeInput {
  return {
    sectorCode,
    operationCode,
    targetYear,
    effectiveDate: `${targetYear}-07-31`,
    exactClassificationConfirmed: true,
    taxpayerRoleConfirmed: true,
    operationDocumented: true,
    officialSourceVersionConfirmed: true,
    pendingRegulationDecision: false,
    futureRateEstimated: false,
    cbsCreditsCents: 0,
    ibsCreditsCents: 0,
    creditsEvidenceConfirmed: true,
    grossRevenueCents: 10_000_000,
    legalDeductionsCents: 1_000_000,
    fuelProductCode: "GASOLINE_AND_STREAMS",
    fuelQuantityMilliUnits: 1_000_000,
    fuelUnitCode: "L",
    fuelCbsRateTenThousandthRealPerUnit: 100,
    fuelIbsRateTenThousandthRealPerUnit: 50,
    officialRateActReference: "ATO-OFICIAL-CONTROLADO",
    officialRateActValidityConfirmed: true,
    realEstateOperationValueCents: 10_000_000,
    realEstateAdjustmentReducerCents: operationCode === "real_estate_rent" ? 0 : 1_000_000,
    realEstateSocialReducerCents: operationCode === "real_estate_rent" ? 60_000 : 500_000,
    realEstateNonTaxBaseExclusionsCents: operationCode === "real_estate_rent" ? 100_000 : 0,
    realEstateCbsReferenceRateBps: 900,
    realEstateIbsReferenceRateBps: 1_800,
    socialReducerIpcaUpdateConfirmed: true,
  };
}

export type TaxReformSpecificCase = {
  code: string;
  kind: "positive" | "negative" | "boundary" | "validity_change";
  input: TaxReformSpecificRegimeInput;
  expectedCoverage: TaxReformSpecificRegimeResult["coverage"];
  expectedGrossCents: number | null;
};

const financialCases: TaxReformSpecificCase[] = [
  ...(["financial_credit_exchange_securities", "financial_factoring_securitization"] as const).flatMap((operationCode) => [
    ...financialSpecificCombinedRateSchedule.map(({ year, combinedRateBps }) => ({
      code: `${operationCode}-${year}-POSITIVE`,
      kind: "positive" as const,
      input: specificInput("FINANCIAL_SERVICES_SPECIFIC", operationCode, year),
      expectedCoverage: "supported" as const,
      expectedGrossCents: multiply(9_000_000, combinedRateBps),
    })),
    {
      code: `${operationCode}-MISSING-SOURCE`, kind: "negative" as const,
      input: { ...specificInput("FINANCIAL_SERVICES_SPECIFIC", operationCode, 2033), officialSourceVersionConfirmed: false },
      expectedCoverage: "partial" as const, expectedGrossCents: null,
    },
    {
      code: `${operationCode}-MISSING-CLASSIFICATION`, kind: "negative" as const,
      input: { ...specificInput("FINANCIAL_SERVICES_SPECIFIC", operationCode, 2033), exactClassificationConfirmed: false },
      expectedCoverage: "partial" as const, expectedGrossCents: null,
    },
    {
      code: `${operationCode}-PENDING-CREDIT`, kind: "negative" as const,
      input: { ...specificInput("FINANCIAL_SERVICES_SPECIFIC", operationCode, 2033), creditsEvidenceConfirmed: false },
      expectedCoverage: "partial" as const, expectedGrossCents: null,
    },
    {
      code: `${operationCode}-EXCESS-DEDUCTION`, kind: "boundary" as const,
      input: { ...specificInput("FINANCIAL_SERVICES_SPECIFIC", operationCode, 2033), legalDeductionsCents: 10_000_001 },
      expectedCoverage: "partial" as const, expectedGrossCents: null,
    },
  ]),
  {
    code: "FINANCIAL-BEFORE-SCHEDULE", kind: "validity_change",
    input: specificInput("FINANCIAL_SERVICES_SPECIFIC", "financial_credit_exchange_securities", 2026),
    expectedCoverage: "partial", expectedGrossCents: null,
  },
  {
    code: "FINANCIAL-AFTER-SCHEDULE", kind: "validity_change",
    input: specificInput("FINANCIAL_SERVICES_SPECIFIC", "financial_credit_exchange_securities", 2034),
    expectedCoverage: "partial", expectedGrossCents: null,
  },
];

const fuelCases: TaxReformSpecificCase[] = [
  ...fuelSpecificProductCatalog.flatMap((fuelProductCode) => {
    const officialRateActReference = fuelProductCode === "OTHER_ANP_JOINT_ACT"
      ? "ATO-CONJUNTO-RFB-CGIBS-ANP-CONTROLADO"
      : "ATO-OFICIAL-CONTROLADO";
    const base = { ...specificInput("FUELS_SPECIFIC", "fuel_monophase", 2027), fuelProductCode, officialRateActReference };
    return [
      {
        code: `FUEL-${fuelProductCode}-POSITIVE`, kind: "positive" as const, input: base,
        expectedCoverage: "supported" as const, expectedGrossCents: 1_500,
      },
      {
        code: `FUEL-${fuelProductCode}-MISSING-ACT`, kind: "negative" as const,
        input: { ...base, officialRateActReference: null, officialRateActValidityConfirmed: false },
        expectedCoverage: "partial" as const, expectedGrossCents: null,
      },
      {
        code: `FUEL-${fuelProductCode}-MISSING-CLASSIFICATION`, kind: "negative" as const,
        input: { ...base, exactClassificationConfirmed: false },
        expectedCoverage: "partial" as const, expectedGrossCents: null,
      },
    ];
  }),
  {
    code: "FUEL-MISSING-QUANTITY", kind: "boundary",
    input: { ...specificInput("FUELS_SPECIFIC", "fuel_monophase", 2027), fuelQuantityMilliUnits: 0 },
    expectedCoverage: "partial", expectedGrossCents: null,
  },
  {
    code: "FUEL-MISSING-UNIT", kind: "negative",
    input: { ...specificInput("FUELS_SPECIFIC", "fuel_monophase", 2027), fuelUnitCode: null },
    expectedCoverage: "partial", expectedGrossCents: null,
  },
  {
    code: "FUEL-ESTIMATED-FUTURE-RATE", kind: "validity_change",
    input: { ...specificInput("FUELS_SPECIFIC", "fuel_monophase", 2027), futureRateEstimated: true },
    expectedCoverage: "partial", expectedGrossCents: null,
  },
  {
    code: "FUEL-PENDING-ACT", kind: "validity_change",
    input: { ...specificInput("FUELS_SPECIFIC", "fuel_monophase", 2027), pendingRegulationDecision: true },
    expectedCoverage: "partial", expectedGrossCents: null,
  },
];

const realEstateCases: TaxReformSpecificCase[] = [
  ...(["real_estate_sale", "real_estate_rent"] as const).flatMap((operationCode) => [
    ...financialSpecificCombinedRateSchedule.map(({ year }) => ({
      code: `${operationCode}-${year}-POSITIVE`,
      kind: "positive" as const,
      input: specificInput("REAL_ESTATE_SPECIFIC", operationCode, year),
      expectedCoverage: "supported" as const,
      expectedGrossCents: operationCode === "real_estate_rent" ? 797_040 : 1_147_500,
    })),
    {
      code: `${operationCode}-MISSING-RATE-ACT`, kind: "negative" as const,
      input: { ...specificInput("REAL_ESTATE_SPECIFIC", operationCode, 2033), officialRateActReference: null, officialRateActValidityConfirmed: false },
      expectedCoverage: "partial" as const, expectedGrossCents: null,
    },
    {
      code: `${operationCode}-MISSING-IPCA`, kind: "negative" as const,
      input: { ...specificInput("REAL_ESTATE_SPECIFIC", operationCode, 2033), socialReducerIpcaUpdateConfirmed: false },
      expectedCoverage: "partial" as const, expectedGrossCents: null,
    },
    {
      code: `${operationCode}-PENDING-REGULATION`, kind: "validity_change" as const,
      input: { ...specificInput("REAL_ESTATE_SPECIFIC", operationCode, 2033), pendingRegulationDecision: true },
      expectedCoverage: "partial" as const, expectedGrossCents: null,
    },
    {
      code: `${operationCode}-DEDUCTIONS-OVER-VALUE`, kind: "boundary" as const,
      input: { ...specificInput("REAL_ESTATE_SPECIFIC", operationCode, 2033), realEstateSocialReducerCents: 10_000_001 },
      expectedCoverage: "partial" as const, expectedGrossCents: null,
    },
  ]),
  {
    code: "REAL-ESTATE-BEFORE-SCHEDULE", kind: "validity_change",
    input: specificInput("REAL_ESTATE_SPECIFIC", "real_estate_sale", 2026),
    expectedCoverage: "partial", expectedGrossCents: null,
  },
  {
    code: "REAL-ESTATE-AFTER-SCHEDULE", kind: "validity_change",
    input: specificInput("REAL_ESTATE_SPECIFIC", "real_estate_sale", 2034),
    expectedCoverage: "partial", expectedGrossCents: null,
  },
];

export const taxReformSpecificCases: TaxReformSpecificCase[] = [
  ...financialCases,
  ...fuelCases,
  ...realEstateCases,
];

export function taxReformSpecificCasePasses(testCase: TaxReformSpecificCase) {
  const result = calculateTaxReformSpecificRegime(testCase.input);
  return result.coverage === testCase.expectedCoverage
    && result.totalGrossCents === testCase.expectedGrossCents
    && result.netPayableCents === null
    && (result.coverage === "supported" ? result.lines.length >= 3 : result.lines.length === 0);
}

export function taxReformSectorCasePasses(testCase: TaxReformSectorCase) {
  const result = calculateTaxReformSectorScenario(testCase.input);
  return result.coverage === testCase.expectedCoverage
    && result.netPayableCents === null
    && (result.coverage === "supported" ? result.totalExposureCents !== null && result.lines.length === 9 : result.totalExposureCents === null && result.lines.length === 0);
}

export function taxReformSectorMetrics() {
  const results = taxReformSectorCases.map((item) => calculateTaxReformSectorScenario(item.input));
  const specificResults = taxReformSpecificCases.map((item) => calculateTaxReformSpecificRegime(item.input));
  return {
    profiles: taxReformSectorProfiles.length,
    years: transition.length,
    specificRegimes: 3,
    specificCases: taxReformSpecificCases.length,
    deterministicCases: taxReformSectorCases.length + taxReformSpecificCases.length,
    calculatedMemories: results.filter((item) => item.coverage === "supported").length + specificResults.filter((item) => item.coverage === "supported").length,
    safelyBlockedCases: results.filter((item) => item.coverage !== "supported").length + specificResults.filter((item) => item.coverage !== "supported").length,
    officialSources: taxReformSectorSources.length,
  };
}

export function validateTaxReformSectorCatalog() {
  const errors: string[] = [];
  if (taxReformSectorProfiles.length !== 12) errors.push("profile_count_mismatch");
  if (new Set(taxReformSectorProfiles.map((item) => item.code)).size !== taxReformSectorProfiles.length) errors.push("duplicate_profile_code");
  if (!taxReformSectorProfiles.every((item, index) => item.rank === index + 1 && item.sourceCodes.length >= 4 && item.requiredEvidence.length >= 5)) errors.push("profile_evidence_incomplete");
  if (!taxReformSectorSources.every((item) => item.url.startsWith("https://") && item.legalReference.length > 20 && item.checkedAt === TAX_REFORM_SECTOR_CHECKED_AT)) errors.push("source_metadata_invalid");
  if (taxReformSectorCases.length !== 144) errors.push("case_count_mismatch");
  if (!taxReformSectorCases.every(taxReformSectorCasePasses)) errors.push("case_regression_failed");
  if (taxReformSpecificCases.length !== 88) errors.push("specific_case_count_mismatch");
  if (!taxReformSpecificCases.every(taxReformSpecificCasePasses)) errors.push("specific_case_regression_failed");
  if (taxReformSpecificCases.filter((item) => item.expectedCoverage === "supported").length !== 40) errors.push("specific_positive_memory_count_mismatch");
  if (!["positive", "negative", "boundary", "validity_change"].every((kind) => taxReformSpecificCases.some((item) => item.kind === kind))) errors.push("specific_case_kinds_incomplete");
  if (financialSpecificCombinedRateSchedule.map((item) => item.combinedRateBps).join(",") !== "1085,1085,1100,1115,1130,1150,1250") errors.push("financial_rate_schedule_mismatch");
  if (fuelSpecificProductCatalog.length !== 12) errors.push("fuel_catalog_mismatch");
  if (taxReformSpecificCases.some((item) => item.expectedCoverage === "supported" && (item.input.futureRateEstimated || item.input.pendingRegulationDecision))) errors.push("future_or_pending_parameter_released");
  const standard2026 = calculateTaxReformSectorScenario(completeInput(taxReformSectorProfiles[0], 2026));
  if (standard2026.coverage !== "supported" || standard2026.totalExposureCents !== 1_565_000) errors.push("standard_2026_failed");
  const standard2033 = calculateTaxReformSectorScenario(completeInput(taxReformSectorProfiles[0], 2033));
  if (standard2033.coverage !== "supported" || standard2033.totalExposureCents !== 2_400_000) errors.push("standard_2033_failed");
  const professional2033 = calculateTaxReformSectorScenario(completeInput(taxReformSectorProfiles[2], 2033));
  if (professional2033.coverage !== "supported" || professional2033.lines.find((item) => item.code === "CBS-GROSS")?.rateBps !== 630) errors.push("professional_reduction_failed");
  const education2033 = calculateTaxReformSectorScenario(completeInput(taxReformSectorProfiles[3], 2033));
  if (education2033.coverage !== "supported" || education2033.lines.find((item) => item.code === "IBS-GROSS")?.rateBps !== 720) errors.push("education_reduction_failed");
  const basket2033 = calculateTaxReformSectorScenario(completeInput(taxReformSectorProfiles[6], 2033));
  if (basket2033.coverage !== "supported" || basket2033.totalExposureCents !== 0) errors.push("zero_rate_failed");
  return { ok: errors.length === 0, errors };
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function hashTaxReformSectorCatalog() {
  return sha256(JSON.stringify({
    version: TAX_REFORM_SECTOR_VERSION,
    sources: taxReformSectorSources,
    profiles: taxReformSectorProfiles,
    cases: taxReformSectorCases.map(({ code, expectedCoverage, input }) => ({ code, expectedCoverage, input })),
    financialSpecificCombinedRateSchedule,
    fuelSpecificProductCatalog,
    specificCases: taxReformSpecificCases.map(({ code, kind, expectedCoverage, expectedGrossCents, input }) => ({ code, kind, expectedCoverage, expectedGrossCents, input })),
  }));
}

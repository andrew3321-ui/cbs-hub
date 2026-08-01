import {
  IPI_TIPI_DEEP_SUPPORTED_PERIOD,
  ipiTipiDeepSources,
  ipiTipiPriorityProfiles,
  type IpiExternalBenefit,
  type IpiOperation,
  type IpiTaxpayerRole,
  type IpiTipiSource,
} from "./ipi-tipi-deep.ts";

export const IPI_TIPI_100_EXPANSION_VERSION = "2026.08.01-v106";
export const IPI_TIPI_100_EXPANSION_CHECKED_AT = "2026-08-01";

export type IpiTipi100Treatment = "taxed" | "zero_rate" | "not_taxed";
export type IpiTipi100Exception = {
  code: string;
  description: string;
  treatment: IpiTipi100Treatment;
  rateBps: number | null;
  sourceCodes: string[];
};

export type IpiTipi100Profile = {
  rank: number;
  ncm: string;
  description: string;
  nominalTreatment: IpiTipi100Treatment;
  nominalRateBps: number | null;
  exceptions: IpiTipi100Exception[];
  sourceCodes: string[];
  legalReference: string;
  classificationNotes: string[];
  effectiveFrom: string;
  effectiveTo: string;
  priorityBasis: "recurrence_in_existing_cbshub_modules_and_official_tipi_2026";
  version: string;
  checkedAt: string;
};

export type IpiTipi100Input = {
  ncm: string | null;
  calculationDate: string;
  operation: IpiOperation;
  taxpayerRole: IpiTaxpayerRole;
  exactNcmConfirmed: boolean;
  legalDescriptionConfirmed: boolean;
  sectionAndChapterNotesConfirmed: boolean;
  tipiVersionConfirmed: boolean;
  operationDocumented: boolean;
  taxpayerRoleConfirmed: boolean;
  operationValueCents: number | null;
  customsValueCents: number | null;
  importTaxCents: number | null;
  exchangeChargesCents: number | null;
  exceptionCode: string | null;
  exceptionDescriptionConfirmed: boolean;
  noExceptionAppliesConfirmed: boolean;
  externalBenefit: IpiExternalBenefit;
  externalBenefitLegalReference: string | null;
  externalBenefitValidityConfirmed: boolean;
  originalDocumentConfirmed: boolean;
  originalIpiCents: number | null;
};

export type IpiTipi100Line = {
  book: "internal_debit" | "customs_debit" | "return_reversal";
  code: string;
  direction: "debit" | "reversal";
  formula: string;
  amountCents: number | null;
  rateBps: number | null;
};

export type IpiTipi100Result = {
  status: "calculated_reference" | "zero_rate_reference" | "not_taxed_reference" | "return_reversal_reference" | "blocked";
  profile: IpiTipi100Profile | null;
  appliedException: IpiTipi100Exception | null;
  lines: IpiTipi100Line[];
  blockers: string[];
  warnings: string[];
  sourceCodes: string[];
  version: string;
  checkedAt: string;
};

export const ipiTipi100ExpansionSources: IpiTipiSource[] = [...ipiTipiDeepSources];

function ex(code: string, description: string, rateBps: number | null): IpiTipi100Exception {
  return {
    code,
    description,
    treatment: rateBps === null ? "not_taxed" : rateBps === 0 ? "zero_rate" : "taxed",
    rateBps,
    sourceCodes: ["IPI-RFB-TIPI-CONSOLIDATED"],
  };
}

function profile(
  rank: number,
  ncm: string,
  description: string,
  rateBps: number | null,
  exceptions: IpiTipi100Exception[] = [],
): IpiTipi100Profile {
  return {
    rank,
    ncm,
    description,
    nominalTreatment: rateBps === null ? "not_taxed" : rateBps === 0 ? "zero_rate" : "taxed",
    nominalRateBps: rateBps,
    exceptions,
    sourceCodes: ["IPI-D11158-TIPI", "IPI-RFB-TIPI-CONSOLIDATED", "IPI-RFB-NCM", "IPI-D7212-RIPI"],
    legalReference: `TIPI consolidada em 2026 — NCM ${ncm.slice(0, 4)}.${ncm.slice(4, 6)}.${ncm.slice(6)}`,
    classificationNotes: [
      "A seleção decorre de recorrência nos módulos fiscais do CBSHub e confirmação na TIPI oficial de 2026, não de volume econômico presumido.",
      "NCM, descrição, notas, Ex, papel, operação e vigência são cumulativos.",
      "Benefício externo, suspensão ou não incidência fora da própria TIPI exigem fundamento dedicado.",
    ],
    effectiveFrom: IPI_TIPI_DEEP_SUPPORTED_PERIOD.from,
    effectiveTo: IPI_TIPI_DEEP_SUPPORTED_PERIOD.to,
    priorityBasis: "recurrence_in_existing_cbshub_modules_and_official_tipi_2026",
    version: IPI_TIPI_100_EXPANSION_VERSION,
    checkedAt: IPI_TIPI_100_EXPANSION_CHECKED_AT,
  };
}

export const ipiTipi100AdditionalProfiles: IpiTipi100Profile[] = [
  profile(51, "39181000", "Revestimentos de pisos, paredes ou tetos, de polímeros de cloreto de vinila", 0),
  profile(52, "19053200", "Waffles e wafers", 0),
  profile(53, "34012090", "Outros sabões em outras formas", 325),
  profile(54, "85044040", "Equipamento de alimentação ininterrupta de energia (UPS ou no-break)", 975),
  profile(55, "18069000", "Outros chocolates e preparações alimentícias contendo cacau", 325, [ex("EX01", "Achocolatados em pó ou grânulos destinados à mistura com água ou leite", 0)]),
  profile(56, "39251000", "Reservatórios, cisternas, cubas e recipientes análogos de plástico, acima de 300 l", 0),
  profile(57, "39191010", "Chapas, folhas, tiras, fitas e outras formas planas autoadesivas, de polipropileno", 975, [ex("EX01", "Fitas autoadesivas em rolos", 1500)]),
  profile(58, "39174090", "Outros acessórios para tubos, de plástico", 0),
  profile(59, "85362000", "Disjuntores para tensão não superior a 1.000 V", 650),
  profile(60, "82021000", "Serras manuais", 520),
  profile(61, "82011000", "Pás", 0),
  profile(62, "40169990", "Outras obras de borracha vulcanizada não endurecida", 1170, [
    ex("EX01", "Sapatas", 0),
    ex("EX02", "Partes dos produtos das posições 86.08, 87.10 e 87.13", 0),
    ex("EX03", "Viras para calçados", 325),
  ]),
  profile(63, "82041100", "Chaves de porcas manuais, de abertura fixa", 520),
  profile(64, "68101900", "Outras telhas, ladrilhos, placas e artigos semelhantes de cimento ou concreto", 0),
  profile(65, "04069090", "Outros queijos", 0),
  profile(66, "12019000", "Outras sementes de soja", null),
  profile(67, "04072100", "Ovos de aves Gallus domesticus, para consumo", null),
  profile(68, "03028990", "Outros peixes frescos ou refrigerados", 0),
  profile(69, "25221000", "Cal viva", null),
  profile(70, "32149000", "Outros mástiques, cimentos de resina e composições não refratárias", 0),
  profile(71, "85389090", "Outras partes destinadas aos aparelhos das posições 85.35, 85.36 ou 85.37", 975),
  profile(72, "85043300", "Transformadores de potência superior a 16 kVA e não superior a 500 kVA", 0),
  profile(73, "85041000", "Reatores para lâmpadas ou tubos de descarga", 325),
  profile(74, "38245000", "Argamassas e concretos não refratários", 0),
  profile(75, "39162000", "Monofilamentos, varas, bastões e perfis de polímeros de cloreto de vinila", 650, [ex("EX01", "Forros de PVC utilizados na construção civil", 325)]),
  profile(76, "85044010", "Carregadores de acumuladores", 500),
  profile(77, "85161000", "Aquecedores elétricos de água, incluindo os de imersão", 1300, [ex("EX01", "Chuveiro elétrico", 0)]),
  profile(78, "85444900", "Outros condutores elétricos para tensão não superior a 1.000 V", 0, [ex("EX01", "Para tensão não superior a 80 V", 325)]),
  profile(79, "19052090", "Outros pães de especiarias", 0),
  profile(80, "19052010", "Panetone", 0),
  profile(81, "19053100", "Bolachas e biscoitos adicionados de edulcorantes", 0),
  profile(82, "17049010", "Chocolate branco", 325),
  profile(83, "18063110", "Chocolate recheado, em tabletes, barras ou paus", 325),
  profile(84, "18063210", "Chocolate não recheado, em tabletes, barras ou paus", 325),
  profile(85, "22071090", "Outro álcool etílico não desnaturado com teor alcoólico igual ou superior a 80%", 0, [
    ex("EX01", "Para fins carburantes, com especificações da ANP", null),
    ex("EX02", "Retificado (álcool neutro)", 520),
  ]),
  profile(86, "19059020", "Bolachas e biscoitos", 0),
  profile(87, "19054000", "Torradas, pão torrado e produtos semelhantes torrados", 0),
  profile(88, "38099190", "Outros agentes de acabamento ou produtos auxiliares para a indústria têxtil", 0),
  profile(89, "10019900", "Outros trigos e mistura de trigo com centeio", null),
  profile(90, "87084090", "Partes de caixas de marchas e suas partes", 325),
  profile(91, "87085099", "Outras partes de eixos motores ou não motores", 325),
  profile(92, "87082999", "Outras partes e acessórios de carroçarias de veículos", 325),
  profile(93, "70091000", "Espelhos retrovisores para veículos", 975, [ex("EX01", "Para ônibus ou caminhões", 195)]),
  profile(94, "84254200", "Outros macacos hidráulicos", 0),
  profile(95, "40169300", "Juntas, gaxetas e semelhantes, de borracha vulcanizada", 520),
  profile(96, "04012010", "Leite UHT", null),
  profile(97, "04022110", "Leite integral em pó, grânulos ou outras formas sólidas", 0),
  profile(98, "11010010", "Farinha de trigo", null),
  profile(99, "10063021", "Arroz polido ou brunido", null),
  profile(100, "07133319", "Outros feijões comuns secos, em grão", null),
];

export const ipiTipi100Profiles = [...ipiTipiPriorityProfiles, ...ipiTipi100AdditionalProfiles];

export const IPI_EXTERNAL_TREATMENT_CONTROLS = [
  { code: "reduction", required: ["ato e dispositivo", "percentual ou nova alíquota", "beneficiário", "produto", "operação", "vigência"] },
  { code: "exemption", required: ["ato e dispositivo", "produto", "destinação", "beneficiário", "condição", "vigência"] },
  { code: "suspension", required: ["ato e dispositivo", "hipótese", "prazo", "condição resolutória", "CST", "vigência"] },
  { code: "immunity", required: ["fundamento constitucional/legal", "produto", "operação", "destinação", "prova documental"] },
].map((item) => ({ ...item, calculationWithoutDedicatedRule: false as const }));

function normalizeNcm(value: string | null) {
  return (value ?? "").replace(/\D/g, "");
}

function normalizeEx(value: string | null) {
  const normalized = (value ?? "").replace(/[^a-z0-9]/gi, "").toUpperCase();
  const match = normalized.match(/^(?:EX)?(\d+)$/);
  return match ? `EX${match[1].padStart(2, "0")}` : normalized;
}

function safeMoney(value: number | null, field: string) {
  if (value === null || !Number.isSafeInteger(value) || value < 0) throw new Error(`invalid_${field}`);
  return value;
}

function multiplyCents(value: number, rateBps: number) {
  const amount = (BigInt(value) * BigInt(rateBps) + 5_000n) / 10_000n;
  if (amount > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("unsafe_ipi_amount");
  return Number(amount);
}

function blocked(profile: IpiTipi100Profile | null, blockers: string[], appliedException: IpiTipi100Exception | null = null): IpiTipi100Result {
  return {
    status: "blocked",
    profile,
    appliedException,
    lines: [],
    blockers: [...new Set(blockers)],
    warnings: ["NCM semelhante ou descrição comercial nunca herdam alíquota.", "Crédito, estorno, compensação e saldo do período permanecem fora desta memória."],
    sourceCodes: profile?.sourceCodes ?? ["IPI-RFB-TIPI-CONSOLIDATED", "IPI-RFB-NCM"],
    version: IPI_TIPI_100_EXPANSION_VERSION,
    checkedAt: IPI_TIPI_100_EXPANSION_CHECKED_AT,
  };
}

function roleMatches(operation: IpiOperation, role: IpiTaxpayerRole) {
  if (operation === "industrial_output") return role === "industrial";
  if (operation === "import_clearance") return role === "importer";
  if (operation === "equiparated_output") return role === "equiparated_industrial";
  if (operation === "return_output") return true;
  return role === "ordinary_reseller";
}

export function resolveIpiTipi100Expansion(input: IpiTipi100Input): IpiTipi100Result {
  const ncm = normalizeNcm(input.ncm);
  const profile = ipiTipi100AdditionalProfiles.find((item) => item.ncm === ncm) ?? null;
  const blockers: string[] = [];
  if (ncm.length !== 8 || !input.exactNcmConfirmed) blockers.push("NCM exato de oito dígitos não confirmado");
  if (!profile) blockers.push("NCM fora dos cinquenta novos perfis oficiais");
  if (!input.legalDescriptionConfirmed) blockers.push("descrição legal não confirmada");
  if (!input.sectionAndChapterNotesConfirmed) blockers.push("notas de classificação não conferidas");
  if (!input.tipiVersionConfirmed) blockers.push("versão consolidada da TIPI não confirmada");
  if (!input.operationDocumented) blockers.push("operação e documento não confirmados");
  if (!input.taxpayerRoleConfirmed || !roleMatches(input.operation, input.taxpayerRole)) blockers.push("papel do contribuinte não confirmado ou incompatível");
  if (input.calculationDate < IPI_TIPI_DEEP_SUPPORTED_PERIOD.from || input.calculationDate > IPI_TIPI_DEEP_SUPPORTED_PERIOD.to) blockers.push("data fora da vigência controlada");

  const requestedEx = normalizeEx(input.exceptionCode);
  const appliedException = profile?.exceptions.find((item) => item.code === requestedEx) ?? null;
  if (requestedEx && (!appliedException || !input.exceptionDescriptionConfirmed)) blockers.push("Ex não localizado ou descrição/condição não confirmada");
  if (!requestedEx && profile?.exceptions.length && !input.noExceptionAppliesConfirmed) blockers.push("aplicabilidade dos Ex não confirmada");
  if (input.externalBenefit !== "none") blockers.push("benefício externo exige regra jurídica dedicada, fundamento exato e vigência própria");

  if (input.operation === "return_output") {
    let original: number | null = null;
    try { original = safeMoney(input.originalIpiCents, "original_ipi"); } catch { blockers.push("valor original do IPI não confirmado"); }
    if (!input.originalDocumentConfirmed) blockers.push("documento fiscal original e devolução não conciliados");
    if (blockers.length || !profile || original === null) return blocked(profile, blockers, appliedException);
    return {
      status: "return_reversal_reference",
      profile,
      appliedException,
      lines: [{ book: "return_reversal", code: "ipi_return_reversal", direction: "reversal", formula: "reprodução do IPI comprovado no documento original", amountCents: original, rateBps: null }],
      blockers: [],
      warnings: ["A devolução não recalcula alíquota, base ou crédito; apenas reproduz o documento original conciliado."],
      sourceCodes: [...new Set([...profile.sourceCodes, "IPI-D7212-RIPI", "IPI-EFD-ICMS-IPI"])],
      version: IPI_TIPI_100_EXPANSION_VERSION,
      checkedAt: IPI_TIPI_100_EXPANSION_CHECKED_AT,
    };
  }

  let baseCents: number | null = null;
  if (input.operation === "import_clearance") {
    try {
      baseCents = safeMoney(input.customsValueCents, "customs_value") + safeMoney(input.importTaxCents, "import_tax") + safeMoney(input.exchangeChargesCents, "exchange_charges");
      if (!Number.isSafeInteger(baseCents)) throw new Error("unsafe_import_base");
    } catch { blockers.push("base aduaneira incompleta ou inválida"); }
  } else {
    try { baseCents = safeMoney(input.operationValueCents, "operation_value"); } catch { blockers.push("base interna incompleta ou inválida"); }
  }
  if (blockers.length || !profile || baseCents === null) return blocked(profile, blockers, appliedException);

  const treatment = appliedException?.treatment ?? profile.nominalTreatment;
  const rateBps = appliedException ? appliedException.rateBps : profile.nominalRateBps;
  const dueCents = rateBps === null ? 0 : multiplyCents(baseCents, rateBps);
  const book = input.operation === "import_clearance" ? "customs_debit" as const : "internal_debit" as const;
  return {
    status: treatment === "not_taxed" ? "not_taxed_reference" : treatment === "zero_rate" ? "zero_rate_reference" : "calculated_reference",
    profile,
    appliedException,
    lines: [
      { book, code: "ipi_base", direction: "debit", formula: input.operation === "import_clearance" ? "valor aduaneiro + II + encargos cambiais" : "valor total da operação interna", amountCents: baseCents, rateBps: null },
      { book, code: "tipi_rate", direction: "debit", formula: treatment === "not_taxed" ? "TIPI marca NT" : appliedException ? `TIPI ${profile.ncm} ${appliedException.code}` : `TIPI ${profile.ncm}`, amountCents: null, rateBps },
      { book, code: "ipi_due", direction: "debit", formula: treatment === "not_taxed" ? "sem incidência na própria TIPI" : "base em centavos × alíquota em pontos-base", amountCents: dueCents, rateBps },
    ],
    blockers: [],
    warnings: ["A memória não calcula crédito, estorno ou saldo do período.", "Qualquer mudança de NCM, descrição, Ex, papel, operação ou data exige nova execução."],
    sourceCodes: [...new Set([...profile.sourceCodes, ...(appliedException?.sourceCodes ?? []), "IPI-RFB-ORIENTATION", ...(input.operation === "import_clearance" ? ["IPI-RFB-IMPORT"] : [])])],
    version: IPI_TIPI_100_EXPANSION_VERSION,
    checkedAt: IPI_TIPI_100_EXPANSION_CHECKED_AT,
  };
}

function completeInput(profile: IpiTipi100Profile): IpiTipi100Input {
  return {
    ncm: profile.ncm,
    calculationDate: "2026-08-01",
    operation: "industrial_output",
    taxpayerRole: "industrial",
    exactNcmConfirmed: true,
    legalDescriptionConfirmed: true,
    sectionAndChapterNotesConfirmed: true,
    tipiVersionConfirmed: true,
    operationDocumented: true,
    taxpayerRoleConfirmed: true,
    operationValueCents: 10_000_000,
    customsValueCents: null,
    importTaxCents: null,
    exchangeChargesCents: null,
    exceptionCode: null,
    exceptionDescriptionConfirmed: false,
    noExceptionAppliesConfirmed: true,
    externalBenefit: "none",
    externalBenefitLegalReference: null,
    externalBenefitValidityConfirmed: false,
    originalDocumentConfirmed: false,
    originalIpiCents: null,
  };
}

export const ipiTipi100ExpansionCases = [
  ...ipiTipi100AdditionalProfiles.flatMap((profile) => {
    const base = completeInput(profile);
    const positiveStatus = profile.nominalTreatment === "not_taxed" ? "not_taxed_reference" as const : profile.nominalTreatment === "zero_rate" ? "zero_rate_reference" as const : "calculated_reference" as const;
    return [
      { code: `${profile.ncm}:industrial`, kind: "industrial", input: base, expectedStatus: positiveStatus },
      { code: `${profile.ncm}:import`, kind: "import", input: { ...base, operation: "import_clearance" as const, taxpayerRole: "importer" as const, operationValueCents: null, customsValueCents: 8_000_000, importTaxCents: 1_000_000, exchangeChargesCents: 100_000 }, expectedStatus: positiveStatus },
      { code: `${profile.ncm}:equiparated`, kind: "equiparated", input: { ...base, operation: "equiparated_output" as const, taxpayerRole: "equiparated_industrial" as const }, expectedStatus: positiveStatus },
      { code: `${profile.ncm}:return`, kind: "return", input: { ...base, operation: "return_output" as const, originalDocumentConfirmed: true, originalIpiCents: 97_500 }, expectedStatus: "return_reversal_reference" as const },
      { code: `${profile.ncm}:benefit`, kind: "benefit", input: { ...base, externalBenefit: "suspension" as const, externalBenefitLegalReference: "controle sem regra dedicada", externalBenefitValidityConfirmed: true }, expectedStatus: "blocked" as const },
      { code: `${profile.ncm}:identity`, kind: "identity", input: { ...base, exactNcmConfirmed: false, legalDescriptionConfirmed: false }, expectedStatus: "blocked" as const },
      { code: `${profile.ncm}:before`, kind: "temporal", input: { ...base, calculationDate: "2026-01-29" }, expectedStatus: "blocked" as const },
      { code: `${profile.ncm}:after`, kind: "temporal", input: { ...base, calculationDate: "2027-01-01" }, expectedStatus: "blocked" as const },
    ];
  }),
  ...ipiTipi100AdditionalProfiles.flatMap((profile) => profile.exceptions.map((exceptionItem) => ({
    code: `${profile.ncm}:${exceptionItem.code}`,
    kind: "exception",
    input: { ...completeInput(profile), exceptionCode: exceptionItem.code, exceptionDescriptionConfirmed: true, noExceptionAppliesConfirmed: false },
    expectedStatus: exceptionItem.treatment === "not_taxed" ? "not_taxed_reference" as const : exceptionItem.treatment === "zero_rate" ? "zero_rate_reference" as const : "calculated_reference" as const,
  }))),
];

export function ipiTipi100ExpansionMetrics() {
  const results = ipiTipi100ExpansionCases.map((item) => resolveIpiTipi100Expansion(item.input));
  return {
    priorNcms: ipiTipiPriorityProfiles.length,
    newNcms: ipiTipi100AdditionalProfiles.length,
    totalNcms: ipiTipi100Profiles.length,
    newExceptions: ipiTipi100AdditionalProfiles.reduce((total, profile) => total + profile.exceptions.length, 0),
    totalExceptions: ipiTipiPriorityProfiles.reduce((total, profile) => total + profile.exceptions.length, 0) + ipiTipi100AdditionalProfiles.reduce((total, profile) => total + profile.exceptions.length, 0),
    deterministicCases: results.length,
    calculatedMemories: results.filter((result) => result.status !== "blocked").length,
    safelyBlockedCases: results.filter((result) => result.status === "blocked").length,
  };
}

export function validateIpiTipi100Expansion() {
  const errors: string[] = [];
  if (ipiTipi100AdditionalProfiles.length !== 50 || ipiTipi100Profiles.length !== 100) errors.push("expected_100_ncms");
  if (new Set(ipiTipi100Profiles.map((profile) => profile.ncm)).size !== 100) errors.push("duplicate_ncm");
  if (ipiTipi100AdditionalProfiles.some((profile, index) => profile.rank !== index + 51 || !/^\d{8}$/.test(profile.ncm))) errors.push("rank_or_ncm_invalid");
  if (ipiTipi100AdditionalProfiles.some((profile) => profile.sourceCodes.length < 4 || !profile.legalReference || profile.effectiveFrom !== IPI_TIPI_DEEP_SUPPORTED_PERIOD.from || profile.effectiveTo !== IPI_TIPI_DEEP_SUPPORTED_PERIOD.to)) errors.push("profile_evidence_incomplete");
  if (IPI_EXTERNAL_TREATMENT_CONTROLS.some((control) => control.calculationWithoutDedicatedRule)) errors.push("external_benefit_control_unsafe");
  if (ipiTipi100ExpansionCases.length < 300 || new Set(ipiTipi100ExpansionCases.map((item) => item.code)).size !== ipiTipi100ExpansionCases.length) errors.push("case_target_not_reached");
  for (const item of ipiTipi100ExpansionCases) {
    const result = resolveIpiTipi100Expansion(item.input);
    if (result.status !== item.expectedStatus) errors.push(`${item.code}:status_diverged`);
    if (result.status === "blocked" && result.lines.length) errors.push(`${item.code}:blocked_value_leak`);
  }
  if (!ipiTipi100ExpansionSources.every((source) => source.url.startsWith("https://") && source.legalReference)) errors.push("source_metadata_invalid");
  return { passed: errors.length === 0, errors };
}

export async function hashIpiTipi100Expansion() {
  const payload = JSON.stringify({ version: IPI_TIPI_100_EXPANSION_VERSION, sources: ipiTipi100ExpansionSources, profiles: ipiTipi100AdditionalProfiles, externalControls: IPI_EXTERNAL_TREATMENT_CONTROLS, cases: ipiTipi100ExpansionCases.map((item) => ({ code: item.code, expectedStatus: item.expectedStatus, result: resolveIpiTipi100Expansion(item.input) })) });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

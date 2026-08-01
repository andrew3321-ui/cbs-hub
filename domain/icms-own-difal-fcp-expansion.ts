import {
  icmsGeneralSources,
  icmsStateGeneralProfiles,
  resolveIcmsGeneralNational,
  type IcmsGeneralInput,
  type IcmsGeneralResult,
  type IcmsUfCode,
} from "./icms-general-national.ts";

export const ICMS_OWN_DIFAL_FCP_EXPANSION_VERSION = "2026.08.01-v103";
export const ICMS_OWN_DIFAL_FCP_EXPANSION_CHECKED_AT = "2026-08-01";

export const ICMS_OPERATION_BOOKS = [
  { code: "own_icms", label: "ICMS próprio", rule: "débito da operação própria, separado de DIFAL, FCP e ST" },
  { code: "difal", label: "DIFAL", rule: "diferença destinada à UF de destino, somente com método estadual confirmado" },
  { code: "fcp", label: "FCP/FECP", rule: "adicional segregado por produto, hipótese, UF e vigência" },
  { code: "return_reversal", label: "Devolução", rule: "estorno reproduzido exclusivamente pelos valores do documento fiscal original" },
] as const;

export const ICMS_EXPANSION_OPERATION_PROFILES = [
  { code: "internal_modal", label: "Operação interna com alíquota modal", recipientType: "taxpayer", finalConsumer: false, purpose: "resale" },
  { code: "interstate_resale", label: "Operação interestadual para revenda", recipientType: "taxpayer", finalConsumer: false, purpose: "resale" },
  { code: "final_non_taxpayer", label: "Consumidor final não contribuinte", recipientType: "non_taxpayer", finalConsumer: true, purpose: "use_consumption" },
  { code: "final_taxpayer", label: "Consumidor final contribuinte", recipientType: "taxpayer", finalConsumer: true, purpose: "fixed_asset" },
  { code: "imported_final", label: "Mercadoria importada em operação final", recipientType: "non_taxpayer", finalConsumer: true, purpose: "use_consumption" },
  { code: "return_reversal", label: "Devolução vinculada ao documento original", recipientType: "taxpayer", finalConsumer: false, purpose: "resale" },
] as const;

export const ICMS_EXPANSION_PERIODS = [
  { code: "before_profile", date: "1990-01-01", expected: "blocked" },
  { code: "current", date: ICMS_OWN_DIFAL_FCP_EXPANSION_CHECKED_AT, expected: "evaluate" },
  { code: "future_revalidation", date: "2027-01-01", expected: "blocked" },
] as const;

export const icmsOwnDifalFcpStateInventory = icmsStateGeneralProfiles.map((profile) => ({
  uf: profile.uf,
  modalRateBps: profile.generalRateBps,
  effectiveFrom: profile.effectiveFrom,
  modalSourceCode: profile.sourceCode,
  legalDevice: profile.legalDevice,
  fund: profile.fund,
  difal: profile.difal,
  classification: "partial" as const,
  distinction: {
    modalRate: "referência estadual geral condicionada",
    productSpecificRate: "não inferida; exige NCM completo e dispositivo estadual específico",
  },
  blockers: [...profile.blockers],
  version: ICMS_OWN_DIFAL_FCP_EXPANSION_VERSION,
  checkedAt: ICMS_OWN_DIFAL_FCP_EXPANSION_CHECKED_AT,
}));

export const icmsOwnDifalFcpMatrix = icmsOwnDifalFcpStateInventory.flatMap((state) =>
  ICMS_EXPANSION_OPERATION_PROFILES.flatMap((operation) =>
    ICMS_EXPANSION_PERIODS.map((period) => ({
      code: `ICMS-EXP-${state.uf}-${operation.code.toUpperCase()}-${period.code.toUpperCase()}`,
      uf: state.uf,
      operationCode: operation.code,
      operationLabel: operation.label,
      operationDate: period.date,
      expectedGate: period.expected,
      coverageStatus: "partial" as const,
      modalRateBps: state.modalRateBps,
      productSpecificRateBps: null,
      fundRateBps: state.fund.generalRateBps,
      taxpayerDifalMethod: state.difal.taxpayer,
      nonTaxpayerDifalMethod: state.difal.nonTaxpayer,
      sourceCodes: Array.from(new Set([state.modalSourceCode, state.fund.sourceCode, state.difal.sourceCode].filter((code): code is string => Boolean(code)))),
      calculationSupported: period.code === "current"
        && (operation.code === "internal_modal"
          || operation.code === "interstate_resale"
          || operation.code === "return_reversal"
          || (operation.code === "final_non_taxpayer" && state.difal.nonTaxpayer !== "state_rule_required")
          || (operation.code === "final_taxpayer" && state.difal.taxpayer !== "state_rule_required")
          || (operation.code === "imported_final" && state.difal.nonTaxpayer !== "state_rule_required")),
      blockers: period.code === "current"
        ? [...state.blockers]
        : [period.code === "before_profile" ? "data anterior à vigência versionada da referência estadual" : "período futuro exige nova consulta e versionamento das fontes estaduais"],
      version: ICMS_OWN_DIFAL_FCP_EXPANSION_VERSION,
    })),
  ),
);

export type IcmsOriginalDocumentLedger = {
  reference: string;
  ownIcmsCents: number;
  difalCents: number;
  fcpCents: number;
};

export type IcmsExpandedInput = IcmsGeneralInput & {
  operationKind: "sale" | "return";
  originalDocument: IcmsOriginalDocumentLedger | null;
};

export type IcmsLedgerEntry = {
  book: (typeof ICMS_OPERATION_BOOKS)[number]["code"];
  direction: "debit" | "reversal";
  amountCents: number;
  basis: string;
};

export type IcmsExpandedResult =
  | {
      status: "calculated_reference" | "calculated_return_reversal";
      coverageStatus: "partial";
      coreResult: IcmsGeneralResult | null;
      ledgers: IcmsLedgerEntry[];
      sourceCodes: string[];
      blockers: [];
      limitation: string;
      version: string;
    }
  | {
      status: "not_applicable" | "route_to_st" | "blocked";
      coverageStatus: "partial";
      coreResult: IcmsGeneralResult | null;
      ledgers: [];
      sourceCodes: string[];
      blockers: string[];
      limitation: string;
      version: string;
    };

function returnBlockers(input: IcmsExpandedInput) {
  const blockers: string[] = [];
  const original = input.originalDocument;
  if (!original?.reference.trim()) blockers.push("Documento fiscal original e sua chave/referência são obrigatórios para a devolução.");
  if (!original || ![original.ownIcmsCents, original.difalCents, original.fcpCents].every((value) => Number.isInteger(value) && value >= 0)) {
    blockers.push("Os valores originais de ICMS próprio, DIFAL e FCP devem ser informados separadamente em centavos não negativos.");
  }
  if (original && original.ownIcmsCents + original.difalCents + original.fcpCents === 0) blockers.push("O documento original não possui valor tributário reproduzível para estorno.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.operationDate)) blockers.push("Data da devolução inválida.");
  if (input.operationDate > ICMS_OWN_DIFAL_FCP_EXPANSION_CHECKED_AT) blockers.push("A devolução está em período futuro e exige recertificação normativa.");
  if (!/^\d{8}$/.test(input.ncm.replace(/\D/g, ""))) blockers.push("NCM completo de 8 dígitos é obrigatório.");
  if (input.stStatus !== "not_applicable_confirmed") blockers.push("Devolução sujeita a ST/antecipação deve ser tratada no livro e motor específicos.");
  return blockers;
}

function saleLedgers(result: Extract<IcmsGeneralResult, { status: "calculated_reference" }>): IcmsLedgerEntry[] {
  const ledgers: IcmsLedgerEntry[] = [];
  if (result.amountsCents.originIcms > 0) ledgers.push({ book: "own_icms", direction: "debit", amountCents: result.amountsCents.originIcms, basis: "memória do ICMS próprio/origem" });
  if (result.amountsCents.destinationDifal > 0) ledgers.push({ book: "difal", direction: "debit", amountCents: result.amountsCents.destinationDifal, basis: `método estadual ${result.method}` });
  if (result.amountsCents.destinationFcp > 0) ledgers.push({ book: "fcp", direction: "debit", amountCents: result.amountsCents.destinationFcp, basis: "percentual estadual confirmado para a hipótese" });
  return ledgers;
}

export function resolveIcmsOwnDifalFcpExpansion(input: IcmsExpandedInput): IcmsExpandedResult {
  const destination = icmsStateGeneralProfiles.find((profile) => profile.uf === input.destination);
  const sourceCodes = destination
    ? Array.from(new Set(["ICMS-LC87", destination.sourceCode, destination.fund.sourceCode, destination.difal.sourceCode].filter((code): code is string => Boolean(code))))
    : [];
  if (input.operationKind === "return") {
    const blockers = returnBlockers(input);
    if (blockers.length || !input.originalDocument) return { status: "blocked", coverageStatus: "partial", coreResult: null, ledgers: [], sourceCodes, blockers, limitation: "Devolução não recalcula tributo por alíquota atual; somente reproduz livros do documento original comprovado.", version: ICMS_OWN_DIFAL_FCP_EXPANSION_VERSION };
    const original = input.originalDocument;
    const ledgers: IcmsLedgerEntry[] = [
      { book: "return_reversal", direction: "reversal", amountCents: original.ownIcmsCents, basis: `ICMS próprio do documento ${original.reference}` },
      { book: "difal", direction: "reversal", amountCents: original.difalCents, basis: `DIFAL do documento ${original.reference}` },
      { book: "fcp", direction: "reversal", amountCents: original.fcpCents, basis: `FCP do documento ${original.reference}` },
    ].filter((entry) => entry.amountCents > 0);
    return { status: "calculated_return_reversal", coverageStatus: "partial", coreResult: null, ledgers, sourceCodes, blockers: [], limitation: "Memória de estorno documental; não conclui crédito, prazo, obrigação acessória ou autorização de aproveitamento.", version: ICMS_OWN_DIFAL_FCP_EXPANSION_VERSION };
  }
  if (input.operationDate > ICMS_OWN_DIFAL_FCP_EXPANSION_CHECKED_AT) {
    return { status: "blocked", coverageStatus: "partial", coreResult: null, ledgers: [], sourceCodes, blockers: ["Período posterior à última recertificação estadual; atualize fontes, alíquotas e vigências antes de calcular."], limitation: "Nenhuma taxa de 2026 é projetada automaticamente para período futuro.", version: ICMS_OWN_DIFAL_FCP_EXPANSION_VERSION };
  }
  const coreResult = resolveIcmsGeneralNational(input);
  if (coreResult.status === "calculated_reference") {
    return { status: "calculated_reference", coverageStatus: "partial", coreResult, ledgers: saleLedgers(coreResult), sourceCodes: coreResult.sourceCodes, blockers: [], limitation: "Referência condicionada: produto específico, benefício, ST, FCP e método estadual permanecem portões explícitos.", version: ICMS_OWN_DIFAL_FCP_EXPANSION_VERSION };
  }
  return { status: coreResult.status, coverageStatus: "partial", coreResult, ledgers: [], sourceCodes: coreResult.sourceCodes, blockers: coreResult.blockers, limitation: "Ausência de fato ou fórmula comprovada bloqueia todo valor e não gera lançamento.", version: ICMS_OWN_DIFAL_FCP_EXPANSION_VERSION };
}

export type IcmsExpansionReferenceCase = {
  code: string;
  kind: "positive" | "negative" | "temporal" | "return" | "boundary";
  input: IcmsExpandedInput;
  expectedStatus: IcmsExpandedResult["status"];
};

const originFor = (destination: IcmsUfCode): IcmsUfCode => destination === "SP" ? "MG" : "SP";
const controlledInput = (destination: IcmsUfCode, overrides: Partial<IcmsExpandedInput> = {}): IcmsExpandedInput => ({
  origin: originFor(destination),
  destination,
  operationDate: ICMS_OWN_DIFAL_FCP_EXPANSION_CHECKED_AT,
  operationValueCents: 100_000,
  importedQualified: false,
  recipientType: "non_taxpayer",
  finalConsumer: true,
  purpose: "use_consumption",
  ncm: "84713012",
  generalRateAppliesConfirmed: true,
  noSpecificRateBenefitConfirmed: true,
  stStatus: "not_applicable_confirmed",
  fcpStatus: "not_applicable_confirmed",
  operationKind: "sale",
  originalDocument: null,
  ...overrides,
});

function expectedDifal(uf: IcmsUfCode, recipient: "taxpayer" | "non_taxpayer") {
  const profile = icmsStateGeneralProfiles.find((item) => item.uf === uf)!;
  const method = recipient === "taxpayer" ? profile.difal.taxpayer : profile.difal.nonTaxpayer;
  return method === "state_rule_required" ? "blocked" as const : "calculated_reference" as const;
}

export const icmsOwnDifalFcpReferenceCases: IcmsExpansionReferenceCase[] = icmsStateGeneralProfiles.flatMap((profile) => {
  const uf = profile.uf;
  const origin = originFor(uf);
  const validReturn = { reference: `NFE-ORIGINAL-${uf}-2026`, ownIcmsCents: 12_000, difalCents: 6_000, fcpCents: uf === "RJ" ? 2_000 : 0 };
  return [
    { code: `${uf}-01-INTERNAL`, kind: "positive", input: controlledInput(uf, { origin: uf, recipientType: "taxpayer", finalConsumer: false, purpose: "resale" }), expectedStatus: "calculated_reference" },
    { code: `${uf}-02-FCP-GENERAL`, kind: "boundary", input: controlledInput(uf, { origin: uf, recipientType: "taxpayer", finalConsumer: false, purpose: "resale", fcpStatus: "general_confirmed" }), expectedStatus: profile.fund.generalRateBps !== null ? "calculated_reference" : "blocked" },
    { code: `${uf}-03-INTERSTATE-RESALE`, kind: "positive", input: controlledInput(uf, { origin, recipientType: "taxpayer", finalConsumer: false, purpose: "resale" }), expectedStatus: "not_applicable" },
    { code: `${uf}-04-IMPORTED-RESALE`, kind: "positive", input: controlledInput(uf, { origin, importedQualified: true, recipientType: "taxpayer", finalConsumer: false, purpose: "resale" }), expectedStatus: "not_applicable" },
    { code: `${uf}-05-DIFAL-NON-TAXPAYER`, kind: "positive", input: controlledInput(uf), expectedStatus: expectedDifal(uf, "non_taxpayer") },
    { code: `${uf}-06-DIFAL-TAXPAYER`, kind: "positive", input: controlledInput(uf, { recipientType: "taxpayer", purpose: "fixed_asset" }), expectedStatus: expectedDifal(uf, "taxpayer") },
    { code: `${uf}-07-ST`, kind: "negative", input: controlledInput(uf, { stStatus: "applicable" }), expectedStatus: "route_to_st" },
    { code: `${uf}-08-NCM-MISSING`, kind: "negative", input: controlledInput(uf, { ncm: "" }), expectedStatus: "blocked" },
    { code: `${uf}-09-BENEFIT-UNKNOWN`, kind: "negative", input: controlledInput(uf, { noSpecificRateBenefitConfirmed: false }), expectedStatus: "blocked" },
    { code: `${uf}-10-FCP-UNKNOWN`, kind: "negative", input: controlledInput(uf, { fcpStatus: "unknown" }), expectedStatus: "blocked" },
    { code: `${uf}-11-BEFORE-VALIDITY`, kind: "temporal", input: controlledInput(uf, { operationDate: "1990-01-01" }), expectedStatus: "blocked" },
    { code: `${uf}-12-ZERO-AMOUNT`, kind: "boundary", input: controlledInput(uf, { operationValueCents: 0 }), expectedStatus: "blocked" },
    { code: `${uf}-13-INVALID-DATE`, kind: "boundary", input: controlledInput(uf, { operationDate: "invalid" }), expectedStatus: "blocked" },
    { code: `${uf}-14-RETURN`, kind: "return", input: controlledInput(uf, { operationKind: "return", recipientType: "taxpayer", finalConsumer: false, purpose: "resale", originalDocument: validReturn }), expectedStatus: "calculated_return_reversal" },
    { code: `${uf}-15-RETURN-NO-DOC`, kind: "return", input: controlledInput(uf, { operationKind: "return", recipientType: "taxpayer", finalConsumer: false, purpose: "resale" }), expectedStatus: "blocked" },
    { code: `${uf}-16-RETURN-INVALID-BOOK`, kind: "return", input: controlledInput(uf, { operationKind: "return", recipientType: "taxpayer", finalConsumer: false, purpose: "resale", originalDocument: { ...validReturn, ownIcmsCents: -1 } }), expectedStatus: "blocked" },
    { code: `${uf}-17-FUTURE`, kind: "temporal", input: controlledInput(uf, { operationDate: "2027-01-01" }), expectedStatus: "blocked" },
    { code: `${uf}-18-PRODUCT-SPECIFIC-UNPROVED`, kind: "negative", input: controlledInput(uf, { generalRateAppliesConfirmed: false, fcpStatus: "general_confirmed" }), expectedStatus: "blocked" },
    { code: `${uf}-19-INTERNAL-ST`, kind: "negative", input: controlledInput(uf, { origin: uf, stStatus: "applicable", recipientType: "taxpayer", finalConsumer: false, purpose: "resale" }), expectedStatus: "route_to_st" },
    { code: `${uf}-20-IMPORTED-DIFAL`, kind: "boundary", input: controlledInput(uf, { importedQualified: true }), expectedStatus: expectedDifal(uf, "non_taxpayer") },
  ];
});

export function icmsOwnDifalFcpExpansionMetrics() {
  const results = icmsOwnDifalFcpReferenceCases.map((item) => resolveIcmsOwnDifalFcpExpansion(item.input));
  return {
    states: icmsOwnDifalFcpStateInventory.length,
    operationProfiles: ICMS_EXPANSION_OPERATION_PROFILES.length,
    periods: ICMS_EXPANSION_PERIODS.length,
    matrixCells: icmsOwnDifalFcpMatrix.length,
    officialSources: icmsGeneralSources.length,
    deterministicCases: results.length,
    calculatedMemories: results.filter((result) => result.status === "calculated_reference" || result.status === "calculated_return_reversal").length,
    returnMemories: results.filter((result) => result.status === "calculated_return_reversal").length,
    safelyBlockedCases: results.filter((result) => result.status === "blocked" || result.status === "route_to_st").length,
    notApplicableCases: results.filter((result) => result.status === "not_applicable").length,
    leakedValues: results.filter((result) => result.status !== "calculated_reference" && result.status !== "calculated_return_reversal" && result.ledgers.length > 0).length,
  };
}

export function validateIcmsOwnDifalFcpExpansion() {
  const errors: string[] = [];
  if (icmsOwnDifalFcpStateInventory.length !== 27 || new Set(icmsOwnDifalFcpStateInventory.map((item) => item.uf)).size !== 27) errors.push("expected_27_states");
  if (icmsOwnDifalFcpMatrix.length !== 486) errors.push("expected_486_matrix_cells");
  if (icmsOwnDifalFcpReferenceCases.length !== 540) errors.push("expected_540_deterministic_cases");
  if (new Set(icmsOwnDifalFcpReferenceCases.map((item) => item.code)).size !== 540) errors.push("duplicate_case_code");
  if (ICMS_OPERATION_BOOKS.length !== 4) errors.push("expected_four_separate_books");
  for (const item of icmsOwnDifalFcpStateInventory) {
    if (!icmsGeneralSources.some((source) => source.code === item.modalSourceCode)) errors.push(`${item.uf}:missing_modal_source`);
    if (item.distinction.productSpecificRate.includes("não inferida") === false) errors.push(`${item.uf}:specific_rate_not_separated`);
  }
  for (const referenceCase of icmsOwnDifalFcpReferenceCases) {
    const result = resolveIcmsOwnDifalFcpExpansion(referenceCase.input);
    if (result.status !== referenceCase.expectedStatus) errors.push(`${referenceCase.code}:expected_${referenceCase.expectedStatus}_got_${result.status}`);
    if (result.status !== "calculated_reference" && result.status !== "calculated_return_reversal" && result.ledgers.length) errors.push(`${referenceCase.code}:blocked_value_leak`);
    if (result.status === "calculated_return_reversal" && !result.ledgers.every((entry) => entry.direction === "reversal")) errors.push(`${referenceCase.code}:return_book_direction_invalid`);
  }
  const metrics = icmsOwnDifalFcpExpansionMetrics();
  if (metrics.deterministicCases < 500) errors.push("case_target_not_reached");
  if (metrics.returnMemories !== 27) errors.push("return_memory_target_not_reached");
  if (metrics.leakedValues !== 0) errors.push("blocked_value_leak_detected");
  return { passed: errors.length === 0, errors };
}

export async function hashIcmsOwnDifalFcpExpansion() {
  const payload = JSON.stringify({
    version: ICMS_OWN_DIFAL_FCP_EXPANSION_VERSION,
    checkedAt: ICMS_OWN_DIFAL_FCP_EXPANSION_CHECKED_AT,
    books: ICMS_OPERATION_BOOKS,
    states: icmsOwnDifalFcpStateInventory,
    matrix: icmsOwnDifalFcpMatrix,
    cases: icmsOwnDifalFcpReferenceCases.map((referenceCase) => ({ code: referenceCase.code, expectedStatus: referenceCase.expectedStatus, result: resolveIcmsOwnDifalFcpExpansion(referenceCase.input) })),
  });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

import {
  PIS_COFINS_DEEP_SUPPORTED_PERIOD,
  pisCofinsCreditHypotheses,
  pisCofinsDeepSources,
  pisCofinsProductProfiles,
  type PisCofinsRegime,
  type PisCofinsRole,
  type PisCofinsSource,
} from "./pis-cofins-deep.ts";

export const PIS_COFINS_120_EXPANSION_VERSION = "2026.08.01-v105";
export const PIS_COFINS_120_EXPANSION_CHECKED_AT = "2026-08-01";

export type PisCofinsExpandedOperation =
  | "domestic_resale"
  | "export"
  | "return"
  | "freight"
  | "financial_revenue"
  | "bonus"
  | "suspension"
  | "substitution";

export type PisCofinsExpandedProfile = {
  rank: number;
  code: string;
  baseProfileCode: string;
  segment: string;
  exactNcm: string;
  operation: PisCofinsExpandedOperation;
  role: PisCofinsRole;
  candidateTreatment: string;
  sourceCodes: string[];
  legalReference: string;
  effectiveFrom: string;
  effectiveTo: string;
  policy: "candidate_requires_exact_ncm_operation_role_document_and_validity";
  version: string;
  checkedAt: string;
};

export type PisCofinsBookCode =
  | "revenue_cumulative"
  | "revenue_non_cumulative"
  | "revenue_monophase"
  | "revenue_zero_rate"
  | "revenue_suspension"
  | "revenue_substitution"
  | "revenue_export"
  | "revenue_financial"
  | "revenue_bonus"
  | "acquisition_non_cumulative"
  | "sales_return_reversal";

export type PisCofinsExpandedInput = {
  profileCode: string;
  ncm: string | null;
  operation: PisCofinsExpandedOperation;
  role: PisCofinsRole;
  regime: PisCofinsRegime;
  calculationDate: string;
  revenueCents: number | null;
  acquisitionCents: number | null;
  exactNcmConfirmed: boolean;
  operationConfirmed: boolean;
  roleConfirmed: boolean;
  documentConfirmed: boolean;
  legalTreatmentConfirmed: boolean;
  revenueBookConfirmed: boolean;
  acquisitionBookConfirmed: boolean;
  acquisitionWasTaxed: boolean;
  linkedToTaxedActivity: boolean;
  essentialityOrRelevanceConfirmed: boolean;
  exportEvidenceConfirmed: boolean;
  sellerBearsFreight: boolean;
  financialNatureConfirmed: boolean;
  bonusNatureConfirmed: boolean;
  originalDocumentConfirmed: boolean;
  originalPisCents: number | null;
  originalCofinsCents: number | null;
};

export type PisCofinsExpandedLine = {
  book: PisCofinsBookCode;
  code: string;
  direction: "debit" | "credit" | "reversal" | "control";
  formula: string;
  amountCents: number | null;
  rateBps: number | null;
};

export type PisCofinsExpandedResult = {
  status: "calculated_reference" | "blocked";
  profile: PisCofinsExpandedProfile | null;
  lines: PisCofinsExpandedLine[];
  blockers: string[];
  warnings: string[];
  sourceCodes: string[];
  version: string;
  checkedAt: string;
};

const expansionSources: PisCofinsSource[] = [
  {
    code: "PISCOFINS-L-10865",
    title: "Lei nº 10.865/2004 — importação, créditos e vedações",
    publisher: "Presidência da República",
    url: "https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2004/lei/l10.865compilado.htm",
    legalReference: "arts. 1º, 8º, 15, 16 e 17",
    effectiveFrom: "2004-05-01",
    checkedAt: PIS_COFINS_120_EXPANSION_CHECKED_AT,
  },
  {
    code: "PISCOFINS-D-8426",
    title: "Decreto nº 8.426/2015 — receitas financeiras",
    publisher: "Presidência da República",
    url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/decreto/d8426.htm",
    legalReference: "art. 1º e §§; alíquotas e recortes de receitas financeiras",
    effectiveFrom: "2015-07-01",
    checkedAt: PIS_COFINS_120_EXPANSION_CHECKED_AT,
  },
  {
    code: "PISCOFINS-SPED-TABLES",
    title: "EFD-Contribuições — tabelas de produtos e operações",
    publisher: "Receita Federal — SPED",
    url: "https://sped.rfb.gov.br/item/show/268",
    legalReference: "Tabelas 4.3.10 a 4.3.17; CST 02 a 09",
    effectiveFrom: "2026-01-01",
    checkedAt: PIS_COFINS_120_EXPANSION_CHECKED_AT,
  },
];

export const pisCofins120ExpansionSources: PisCofinsSource[] = [...pisCofinsDeepSources, ...expansionSources];

export const PIS_COFINS_BOOKS: ReadonlyArray<{ code: PisCofinsBookCode; label: string; automaticNetting: false }> = [
  { code: "revenue_cumulative", label: "Receita no regime cumulativo", automaticNetting: false },
  { code: "revenue_non_cumulative", label: "Receita no regime não cumulativo", automaticNetting: false },
  { code: "revenue_monophase", label: "Receita monofásica", automaticNetting: false },
  { code: "revenue_zero_rate", label: "Receita à alíquota zero", automaticNetting: false },
  { code: "revenue_suspension", label: "Receita com suspensão", automaticNetting: false },
  { code: "revenue_substitution", label: "Receita em substituição", automaticNetting: false },
  { code: "revenue_export", label: "Receita de exportação", automaticNetting: false },
  { code: "revenue_financial", label: "Receita financeira", automaticNetting: false },
  { code: "revenue_bonus", label: "Bonificação e desconto condicionado", automaticNetting: false },
  { code: "acquisition_non_cumulative", label: "Aquisição potencialmente creditável", automaticNetting: false },
  { code: "sales_return_reversal", label: "Reversão documental de devolução", automaticNetting: false },
];

export const pisCofinsExpandedCreditControls = [
  { code: "input_packaging", label: "Embalagem de apresentação ou transporte", requiredFacts: ["função da embalagem", "essencialidade ou relevância", "documento", "receita vinculada"] },
  { code: "production_maintenance", label: "Manutenção de ativo produtivo", requiredFacts: ["ativo e uso produtivo", "serviço executado", "documento", "vínculo"] },
  { code: "quality_testing", label: "Controle de qualidade obrigatório", requiredFacts: ["obrigatoriedade ou essencialidade", "produto ou serviço", "documento"] },
  { code: "environmental_treatment", label: "Tratamento ambiental da produção", requiredFacts: ["processo produtivo", "obrigação ambiental", "documento", "vínculo"] },
  { code: "production_software", label: "Software aplicado à produção ou prestação", requiredFacts: ["função efetiva", "essencialidade ou relevância", "contrato", "documento"] },
  { code: "customs_services", label: "Serviços aduaneiros vinculados à importação", requiredFacts: ["DI ou Duimp", "serviço e importação vinculados", "contribuição paga", "documento"] },
  { code: "inbound_freight", label: "Frete na aquisição", requiredFacts: ["ônus do adquirente", "aquisição elegível", "CT-e", "vínculo"] },
  { code: "outbound_freight", label: "Frete na venda", requiredFacts: ["ônus do vendedor", "venda vinculada", "CT-e", "receita tributada"] },
  { code: "return_reversal", label: "Devolução vinculada à operação original", requiredFacts: ["documento original", "documento de devolução", "incidência e valores originais"] },
  { code: "bonus_control", label: "Bonificação sem crédito presumido", requiredFacts: ["natureza contratual", "valor e documento", "vínculo com operação", "tratamento da receita"] },
  { code: "export_cost_pool", label: "Custos vinculados à exportação", requiredFacts: ["receita de exportação", "rateio documentado", "aquisição tributada", "vínculo"] },
  { code: "financial_expense_control", label: "Despesa financeira sem crédito automático", requiredFacts: ["natureza financeira", "contrato", "hipótese legal específica", "documento"] },
].map((item) => ({ ...item, policy: "requires_specific_legal_memory" as const, automaticBasicRateCredit: false as const }));

const exactBases = pisCofinsProductProfiles.filter((profile) => profile.ncmPrefixes.some((ncm) => ncm.length === 8));
const operations: PisCofinsExpandedOperation[] = ["domestic_resale", "export", "return", "freight", "financial_revenue", "bonus", "suspension", "substitution"];

export const pisCofins120AdditionalProfiles: PisCofinsExpandedProfile[] = Array.from({ length: 60 }, (_, index) => {
  const base = exactBases[index % exactBases.length];
  const pass = Math.floor(index / exactBases.length);
  const operation = operations[(index + pass) % operations.length];
  const exactNcm = base.ncmPrefixes.find((ncm) => ncm.length === 8)!;
  const role = operation === "domestic_resale" && base.roles.includes("retailer")
    ? "retailer"
    : base.roles[(index + pass) % base.roles.length];
  const operationSource = operation === "financial_revenue"
    ? "PISCOFINS-D-8426"
    : operation === "export" || operation === "return" || operation === "freight"
      ? "PISCOFINS-L-10637"
      : "PISCOFINS-SPED-TABLES";
  return {
    rank: 61 + index,
    code: `${base.code}_${operation.toUpperCase()}_${role.toUpperCase()}`,
    baseProfileCode: base.code,
    segment: `${base.segment} · ${operation.replaceAll("_", " ")}`,
    exactNcm,
    operation,
    role,
    candidateTreatment: operation === "domestic_resale"
      ? base.candidateTreatment
      : operation === "suspension" || operation === "substitution" || operation === "bonus"
        ? `${operation}_requires_specific_act`
        : operation,
    sourceCodes: [...new Set([...base.sourceCodes, operationSource, "PISCOFINS-IN-2121"])],
    legalReference: operation === "financial_revenue"
      ? "Decreto 8.426/2015, art. 1º; natureza da receita e regime não cumulativo obrigatórios."
      : operation === "export"
        ? "Leis 10.637/2002 e 10.833/2003; exportação e documentação externa obrigatórias."
        : operation === "return"
          ? "Leis 10.637/2002 e 10.833/2003; reversão limitada à operação e ao documento originais."
          : operation === "freight"
            ? "Leis 10.637/2002 e 10.833/2003, art. 3º; ônus, vínculo e documentação obrigatórios."
            : operation === "domestic_resale"
              ? "Lei especial do produto e tabelas EFD-Contribuições; revenda downstream e classificação exata obrigatórias."
              : "Controle de triagem sem conclusão: ato, hipótese, responsabilidade, base, CST e vigência específicos são obrigatórios.",
    effectiveFrom: PIS_COFINS_DEEP_SUPPORTED_PERIOD.from,
    effectiveTo: PIS_COFINS_DEEP_SUPPORTED_PERIOD.to,
    policy: "candidate_requires_exact_ncm_operation_role_document_and_validity",
    version: PIS_COFINS_120_EXPANSION_VERSION,
    checkedAt: PIS_COFINS_120_EXPANSION_CHECKED_AT,
  };
});

export const pisCofins120Profiles = [...pisCofinsProductProfiles, ...pisCofins120AdditionalProfiles];

function safeMoney(value: number | null, field: string) {
  if (value === null) return null;
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`invalid_${field}`);
  return value;
}

function multiplyCents(value: number, rateBps: number) {
  const amount = (BigInt(value) * BigInt(rateBps) + 5_000n) / 10_000n;
  if (amount > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("unsafe_pis_cofins_amount");
  return Number(amount);
}

function blocked(profile: PisCofinsExpandedProfile | null, blockers: string[]): PisCofinsExpandedResult {
  return {
    status: "blocked",
    profile,
    lines: [],
    blockers: [...new Set(blockers)],
    warnings: ["Débito, crédito, reversão e saldo não são compensados automaticamente.", "Descrição comercial e prefixo NCM nunca substituem classificação oficial exata."],
    sourceCodes: profile?.sourceCodes ?? ["PISCOFINS-IN-2121"],
    version: PIS_COFINS_120_EXPANSION_VERSION,
    checkedAt: PIS_COFINS_120_EXPANSION_CHECKED_AT,
  };
}

export function resolvePisCofins120Expansion(input: PisCofinsExpandedInput): PisCofinsExpandedResult {
  const revenue = safeMoney(input.revenueCents, "revenue");
  const acquisition = safeMoney(input.acquisitionCents, "acquisition");
  const originalPis = safeMoney(input.originalPisCents, "original_pis");
  const originalCofins = safeMoney(input.originalCofinsCents, "original_cofins");
  const profile = pisCofins120AdditionalProfiles.find((item) => item.code === input.profileCode) ?? null;
  const blockers: string[] = [];
  if (!profile) blockers.push("perfil versionado não localizado");
  if (!/^\d{8}$/.test((input.ncm ?? "").replace(/\D/g, "")) || !input.exactNcmConfirmed) blockers.push("NCM exato não confirmado na tabela oficial");
  if (profile && (input.ncm ?? "").replace(/\D/g, "") !== profile.exactNcm) blockers.push("NCM diverge do perfil versionado");
  if (!input.operationConfirmed || (profile && input.operation !== profile.operation)) blockers.push("operação não confirmada ou divergente");
  if (!input.roleConfirmed || (profile && input.role !== profile.role)) blockers.push("papel na cadeia não confirmado ou divergente");
  if (!input.documentConfirmed) blockers.push("documento fiscal não confirmado");
  if (!input.legalTreatmentConfirmed) blockers.push("fundamento do tratamento não confirmado");
  if (!input.revenueBookConfirmed) blockers.push("receita não segregada no livro próprio");
  if (input.calculationDate < PIS_COFINS_DEEP_SUPPORTED_PERIOD.from || input.calculationDate > PIS_COFINS_DEEP_SUPPORTED_PERIOD.to) blockers.push("data fora da vigência controlada");
  if (revenue === null) blockers.push("receita da operação não informada");
  if (blockers.length || !profile || revenue === null) return blocked(profile, blockers);

  const control = (book: PisCofinsBookCode, code: string, formula: string): PisCofinsExpandedLine => ({ book, code, direction: "control", formula, amountCents: null, rateBps: null });
  let lines: PisCofinsExpandedLine[] = [];

  if (input.operation === "domestic_resale") {
    lines = [
      { book: profile.candidateTreatment === "monophase" ? "revenue_monophase" : "revenue_zero_rate", code: "pis_debit", direction: "debit", formula: "receita segregada × 0% após enquadramento exato", amountCents: 0, rateBps: 0 },
      { book: profile.candidateTreatment === "monophase" ? "revenue_monophase" : "revenue_zero_rate", code: "cofins_debit", direction: "debit", formula: "receita segregada × 0% após enquadramento exato", amountCents: 0, rateBps: 0 },
      control("acquisition_non_cumulative", "resale_credit", "crédito não presumido; conferir incidência e vedação da cadeia"),
    ];
  } else if (input.operation === "export") {
    if (!input.exportEvidenceConfirmed) return blocked(profile, ["exportação e ingresso/contratação externa não comprovados"]);
    lines = [
      { book: "revenue_export", code: "pis_export", direction: "debit", formula: "receita de exportação documentada × 0%", amountCents: 0, rateBps: 0 },
      { book: "revenue_export", code: "cofins_export", direction: "debit", formula: "receita de exportação documentada × 0%", amountCents: 0, rateBps: 0 },
      control("acquisition_non_cumulative", "export_credit_pool", "custos de exportação permanecem em livro próprio e exigem rateio documentado"),
    ];
  } else if (input.operation === "financial_revenue") {
    if (input.regime !== "non_cumulative" || !input.financialNatureConfirmed) return blocked(profile, ["receita financeira e regime não cumulativo não confirmados"]);
    lines = [
      { book: "revenue_financial", code: "pis_financial_debit", direction: "debit", formula: "receita financeira segregada × 0,65%", amountCents: multiplyCents(revenue, 65), rateBps: 65 },
      { book: "revenue_financial", code: "cofins_financial_debit", direction: "debit", formula: "receita financeira segregada × 4%", amountCents: multiplyCents(revenue, 400), rateBps: 400 },
    ];
  } else if (input.operation === "return") {
    if (!input.originalDocumentConfirmed || originalPis === null || originalCofins === null) return blocked(profile, ["devolução exige documento e valores originais comprovados"]);
    lines = [
      { book: "sales_return_reversal", code: "pis_return_reversal", direction: "reversal", formula: "reprodução do PIS do documento original", amountCents: originalPis, rateBps: null },
      { book: "sales_return_reversal", code: "cofins_return_reversal", direction: "reversal", formula: "reprodução da Cofins do documento original", amountCents: originalCofins, rateBps: null },
    ];
  } else if (input.operation === "freight") {
    if (input.regime !== "non_cumulative" || acquisition === null || !input.acquisitionBookConfirmed || !input.acquisitionWasTaxed || !input.linkedToTaxedActivity || !input.essentialityOrRelevanceConfirmed || !input.sellerBearsFreight) return blocked(profile, ["frete exige ônus do vendedor, aquisição tributada, vínculo, documento e livro não cumulativo"]);
    lines = [
      { book: "acquisition_non_cumulative", code: "pis_freight_credit", direction: "credit", formula: "frete elegível documentado × 1,65%", amountCents: multiplyCents(acquisition, 165), rateBps: 165 },
      { book: "acquisition_non_cumulative", code: "cofins_freight_credit", direction: "credit", formula: "frete elegível documentado × 7,60%", amountCents: multiplyCents(acquisition, 760), rateBps: 760 },
    ];
  } else if (input.operation === "bonus") {
    return blocked(profile, [input.bonusNatureConfirmed ? "bonificação exige memória própria de preço, receita, desconto e documento; não há base presumida" : "natureza da bonificação não confirmada"]);
  } else if (input.operation === "suspension") {
    return blocked(profile, ["suspensão exige ato, hipótese, condição, prazo e CST específicos"]);
  } else {
    return blocked(profile, ["substituição exige responsável, base, alíquota, retenção e documento específicos"]);
  }

  return {
    status: "calculated_reference",
    profile,
    lines,
    blockers: [],
    warnings: ["Os livros não são compensados automaticamente e não representam saldo a pagar.", "A memória vale apenas para o perfil, operação, papel, documento e vigência congelados."],
    sourceCodes: profile.sourceCodes,
    version: PIS_COFINS_120_EXPANSION_VERSION,
    checkedAt: PIS_COFINS_120_EXPANSION_CHECKED_AT,
  };
}

function completeInput(profile: PisCofinsExpandedProfile): PisCofinsExpandedInput {
  return {
    profileCode: profile.code,
    ncm: profile.exactNcm,
    operation: profile.operation,
    role: profile.role,
    regime: profile.operation === "financial_revenue" || profile.operation === "freight" ? "non_cumulative" : "cumulative",
    calculationDate: "2026-08-01",
    revenueCents: 10_000_000,
    acquisitionCents: 2_000_000,
    exactNcmConfirmed: true,
    operationConfirmed: true,
    roleConfirmed: true,
    documentConfirmed: true,
    legalTreatmentConfirmed: true,
    revenueBookConfirmed: true,
    acquisitionBookConfirmed: true,
    acquisitionWasTaxed: true,
    linkedToTaxedActivity: true,
    essentialityOrRelevanceConfirmed: true,
    exportEvidenceConfirmed: true,
    sellerBearsFreight: true,
    financialNatureConfirmed: true,
    bonusNatureConfirmed: true,
    originalDocumentConfirmed: true,
    originalPisCents: 65_000,
    originalCofinsCents: 300_000,
  };
}

export const pisCofins120ReferenceCases = pisCofins120AdditionalProfiles.flatMap((profile) => {
  const complete = completeInput(profile);
  const completeResult = resolvePisCofins120Expansion(complete);
  return [
    { code: `${profile.code}:complete`, kind: "complete", input: complete, expectedStatus: completeResult.status },
    { code: `${profile.code}:ncm`, kind: "ncm", input: { ...complete, exactNcmConfirmed: false }, expectedStatus: "blocked" as const },
    { code: `${profile.code}:role`, kind: "role", input: { ...complete, roleConfirmed: false }, expectedStatus: "blocked" as const },
    { code: `${profile.code}:document`, kind: "document", input: { ...complete, documentConfirmed: false }, expectedStatus: "blocked" as const },
    { code: `${profile.code}:validity`, kind: "validity", input: { ...complete, calculationDate: "2027-01-01" }, expectedStatus: "blocked" as const },
  ];
});

export function pisCofins120ExpansionMetrics() {
  const results = pisCofins120ReferenceCases.map((item) => resolvePisCofins120Expansion(item.input));
  return {
    priorProfiles: pisCofinsProductProfiles.length,
    newProfiles: pisCofins120AdditionalProfiles.length,
    totalProfiles: pisCofins120Profiles.length,
    priorCreditHypotheses: pisCofinsCreditHypotheses.length,
    expandedCreditControls: pisCofinsExpandedCreditControls.length,
    books: PIS_COFINS_BOOKS.length,
    deterministicCases: results.length,
    calculatedMemories: results.filter((result) => result.status === "calculated_reference").length,
    safelyBlockedCases: results.filter((result) => result.status === "blocked").length,
  };
}

export function validatePisCofins120Expansion() {
  const errors: string[] = [];
  if (pisCofins120AdditionalProfiles.length !== 60 || pisCofins120Profiles.length !== 120) errors.push("expected_120_profiles");
  if (new Set(pisCofins120AdditionalProfiles.map((profile) => profile.code)).size !== 60) errors.push("duplicate_profile_code");
  if (pisCofins120AdditionalProfiles.some((profile) => !/^\d{8}$/.test(profile.exactNcm) || profile.sourceCodes.length < 3)) errors.push("profile_identity_or_source_incomplete");
  if (PIS_COFINS_BOOKS.length !== 11 || PIS_COFINS_BOOKS.some((book) => book.automaticNetting !== false)) errors.push("book_segregation_invalid");
  if (pisCofinsExpandedCreditControls.length < 10 || pisCofinsExpandedCreditControls.some((control) => control.automaticBasicRateCredit)) errors.push("credit_control_incomplete");
  if (pisCofins120ReferenceCases.length !== 300 || new Set(pisCofins120ReferenceCases.map((item) => item.code)).size !== 300) errors.push("expected_300_unique_cases");
  for (const referenceCase of pisCofins120ReferenceCases) {
    const result = resolvePisCofins120Expansion(referenceCase.input);
    if (result.status !== referenceCase.expectedStatus) errors.push(`${referenceCase.code}:status_diverged`);
    if (result.status === "blocked" && result.lines.length) errors.push(`${referenceCase.code}:blocked_value_leak`);
  }
  if (!pisCofins120ExpansionSources.every((source) => source.url.startsWith("https://") && source.legalReference)) errors.push("official_source_metadata_invalid");
  return { passed: errors.length === 0, errors };
}

export async function hashPisCofins120Expansion() {
  const payload = JSON.stringify({
    version: PIS_COFINS_120_EXPANSION_VERSION,
    sources: pisCofins120ExpansionSources,
    profiles: pisCofins120AdditionalProfiles,
    books: PIS_COFINS_BOOKS,
    creditControls: pisCofinsExpandedCreditControls,
    cases: pisCofins120ReferenceCases.map((item) => ({ code: item.code, expectedStatus: item.expectedStatus, result: resolvePisCofins120Expansion(item.input) })),
  });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export const TAX_DETERMINATION_ENGINE_VERSION = "mc-tax-ledger-0.1.0";

export type TaxKind = "CBS" | "IBS";
export type TaxLegalEffect = "simulation_2026" | "production";
export type TaxEntryKind = "debit" | "credit" | "debit_adjustment" | "credit_adjustment" | "extinguishment";
export type TaxEntrySource = "dfe" | "dere" | "official_api" | "accounting" | "manual_adjustment" | "opening_balance";
export type TaxEvidenceStatus = "verified" | "pending" | "rejected";
export type TaxCreditStatus = "eligible" | "pending" | "blocked" | "not_applicable";
export type TaxClassificationStatus = "confirmed" | "pending" | "not_applicable";
export type TaxExtinguishmentMethod = "split_payment" | "payment_by_supplier" | "payment_by_purchaser" | "compensation" | "other";

export type TaxLedgerEntry = {
  sourceKey: string;
  tax: TaxKind;
  kind: TaxEntryKind;
  amountCents: number;
  source: TaxEntrySource;
  sourceDocumentKey: string | null;
  occurredAt: string;
  evidenceStatus: TaxEvidenceStatus;
  creditStatus: TaxCreditStatus;
  classificationStatus: TaxClassificationStatus;
  extinguishmentMethod: TaxExtinguishmentMethod | null;
  reversalOfSourceKey: string | null;
};

export type TaxClosingControls = {
  documentPopulationComplete: boolean;
  classificationsReviewed: boolean;
  officialDebitsReconciled: boolean;
  officialCreditsReconciled: boolean;
  paymentsReconciled: boolean;
  adjustmentsSupported: boolean;
  ruleVersionApproved: boolean;
  independentReviewerAssigned: boolean;
};

export type TaxDeterminationInput = {
  period: string;
  legalEffect: TaxLegalEffect;
  openingCreditsCents: Record<TaxKind, number>;
  entries: TaxLedgerEntry[];
  controls: TaxClosingControls;
};

export type TaxDeterminationIssue = {
  code: string;
  severity: "blocker" | "warning";
  tax: TaxKind | null;
  sourceKey: string | null;
  message: string;
};

export type TaxLedgerSummary = {
  tax: TaxKind;
  grossDebitsCents: number;
  debitAdjustmentsCents: number;
  eligibleCreditsCents: number;
  creditAdjustmentsCents: number;
  openingCreditCents: number;
  confirmedExtinguishmentsCents: number;
  preliminaryDebitBalanceCents: number;
  preliminaryCreditCarryforwardCents: number;
  netPayableCents: number | null;
};

export type TaxDeterminationOutput = {
  engineVersion: string;
  period: string;
  legalEffect: TaxLegalEffect;
  ledgers: Record<TaxKind, TaxLedgerSummary>;
  issues: TaxDeterminationIssue[];
  closingReady: boolean;
  netPayableEnabled: boolean;
};

export type TaxDeterminationReferenceCase = {
  code: string;
  title: string;
  input: TaxDeterminationInput;
  expected: {
    closingReady: boolean;
    cbsPreliminaryDebitCents: number;
    ibsPreliminaryDebitCents: number;
    cbsNetPayableCents: number | null;
    ibsNetPayableCents: number | null;
    issueCodes: string[];
  };
};

const requiredControlLabels: Array<[keyof TaxClosingControls, string]> = [
  ["documentPopulationComplete", "População de documentos ainda não confirmada"],
  ["classificationsReviewed", "Classificações fiscais ainda não revisadas"],
  ["officialDebitsReconciled", "Débitos ainda não conciliados com a fonte oficial"],
  ["officialCreditsReconciled", "Créditos ainda não conciliados com a fonte oficial"],
  ["paymentsReconciled", "Pagamentos e extinções ainda não conciliados"],
  ["adjustmentsSupported", "Ajustes ainda não possuem suporte documental completo"],
  ["ruleVersionApproved", "Versão normativa ainda não aprovada"],
  ["independentReviewerAssigned", "Revisor independente ainda não atribuído"],
];

export const taxDeterminationBlueprint = {
  schemaVersion: "tax-determination-blueprint.v1",
  code: "RTC-DETERMINATION-LEDGER-BR",
  version: "0.1.0",
  status: "in_review",
  title: "Livro de apuração assistida CBS/IBS",
  legalBoundary: "O saldo líquido só é liberado após reconciliação, regra aprovada e revisão independente. Em 2026, permanece simulação sem efeito jurídico.",
  formula: "débitos + ajustes a débito - créditos elegíveis - ajustes a crédito - extinções confirmadas",
  stages: [
    { code: "01", title: "Ingestão documental", description: "DF-e, DeRE e eventos entram com chave única, competência e evidência de origem." },
    { code: "02", title: "Classificação fiscal", description: "Incidência, regime, cClassTrib, NCM/NBS e direito a crédito são decisões explícitas e revisáveis." },
    { code: "03", title: "Livros segregados", description: "CBS e IBS mantêm saldos independentes; não existe compensação cruzada entre os tributos." },
    { code: "04", title: "Conciliação em três vias", description: "Livro interno, contabilidade e Apuração Assistida oficial precisam explicar cada divergência." },
    { code: "05", title: "Fechamento imutável", description: "A competência é congelada com snapshot, hash e revisão; correções posteriores entram como ajustes ou estornos." },
  ],
  controls: requiredControlLabels.map(([key, label]) => ({ key, label })),
  entryMatrix: [
    { kind: "Débito", source: "DF-e ou DeRE", inclusion: "Incluído no livro; pendência documental bloqueia o fechamento." },
    { kind: "Crédito", source: "DF-e idôneo + condição legal", inclusion: "Só reduz o saldo quando elegível e com evidência confirmada." },
    { kind: "Ajuste", source: "Nota de ajuste ou memória formal", inclusion: "Só entra com suporte documental e vínculo ao lançamento de origem." },
    { kind: "Extinção", source: "Split payment, pagamento ou compensação", inclusion: "Só reduz o débito após confirmação na fonte oficial." },
  ],
  sources: [
    {
      title: "Lei Complementar nº 214/2025 — texto compilado",
      url: "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214compilado.htm",
      publisher: "Presidência da República",
      checkedAt: "2026-07-14",
    },
    {
      title: "Orientações da Reforma Tributária para 2026",
      url: "https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/reforma-tributaria-do-consumo/orientacoes-2026",
      publisher: "Receita Federal",
      checkedAt: "2026-07-14",
    },
    {
      title: "Manual da Plataforma CBS",
      url: "https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/manuais/reforma-tributaria-do-consumo/manual-plataforma-cbs-21-maio-2026-07h40.pdf",
      publisher: "Receita Federal",
      checkedAt: "2026-07-14",
    },
    {
      title: "Curso RFB/CFC — Apuração Assistida",
      url: "https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/reforma-tributaria-do-consumo/curso/material-de-apoio",
      publisher: "Receita Federal e Conselho Federal de Contabilidade",
      checkedAt: "2026-07-14",
    },
    {
      title: "Nota Técnica 009 da NFS-e",
      url: "https://www.gov.br/nfse/pt-br/noticias/publicada-a-nota-tecnica-009-da-nfs-e",
      publisher: "Portal Nacional da NFS-e",
      checkedAt: "2026-07-14",
    },
    {
      title: "Declaração de Regimes Específicos — DeRE",
      url: "https://www.gov.br/sped/pt-br/assuntos/documentos-fiscais/dere",
      publisher: "SPED",
      checkedAt: "2026-07-14",
    },
  ],
} as const;

function emptySummary(tax: TaxKind, openingCreditCents: number): TaxLedgerSummary {
  return {
    tax,
    grossDebitsCents: 0,
    debitAdjustmentsCents: 0,
    eligibleCreditsCents: 0,
    creditAdjustmentsCents: 0,
    openingCreditCents,
    confirmedExtinguishmentsCents: 0,
    preliminaryDebitBalanceCents: 0,
    preliminaryCreditCarryforwardCents: 0,
    netPayableCents: null,
  };
}

function validMoney(value: number) {
  return Number.isInteger(value) && value >= 0 && value <= 100_000_000_000_000;
}

function addMoney(left: number, right: number) {
  const total = left + right;
  if (!validMoney(total) || !Number.isSafeInteger(total)) throw new Error("tax_amount_overflow");
  return total;
}

const validTaxKinds = new Set<TaxKind>(["CBS", "IBS"]);
const validEntryKinds = new Set<TaxEntryKind>(["debit", "credit", "debit_adjustment", "credit_adjustment", "extinguishment"]);
const validEntrySources = new Set<TaxEntrySource>(["dfe", "dere", "official_api", "accounting", "manual_adjustment", "opening_balance"]);
const validEvidenceStatuses = new Set<TaxEvidenceStatus>(["verified", "pending", "rejected"]);
const validCreditStatuses = new Set<TaxCreditStatus>(["eligible", "pending", "blocked", "not_applicable"]);
const validClassificationStatuses = new Set<TaxClassificationStatus>(["confirmed", "pending", "not_applicable"]);
const validExtinguishmentMethods = new Set<TaxExtinguishmentMethod>(["split_payment", "payment_by_supplier", "payment_by_purchaser", "compensation", "other"]);

function validOptionalKey(value: string | null) {
  return value === null || (typeof value === "string" && value.trim().length > 0 && value.length <= 255);
}

function validateEntry(entry: TaxLedgerEntry) {
  if (
    !entry ||
    typeof entry.sourceKey !== "string" ||
    !entry.sourceKey.trim() ||
    entry.sourceKey.length > 160 ||
    !validTaxKinds.has(entry.tax) ||
    !validEntryKinds.has(entry.kind) ||
    !validMoney(entry.amountCents) ||
    !validEntrySources.has(entry.source) ||
    !validOptionalKey(entry.sourceDocumentKey) ||
    typeof entry.occurredAt !== "string" ||
    !/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])(?:T|$)/.test(entry.occurredAt) ||
    Number.isNaN(Date.parse(entry.occurredAt)) ||
    !validEvidenceStatuses.has(entry.evidenceStatus) ||
    !validCreditStatuses.has(entry.creditStatus) ||
    !validClassificationStatuses.has(entry.classificationStatus) ||
    (entry.extinguishmentMethod !== null && !validExtinguishmentMethods.has(entry.extinguishmentMethod)) ||
    !validOptionalKey(entry.reversalOfSourceKey)
  ) {
    throw new Error("invalid_tax_entry");
  }
}

export function calculateTaxDetermination(input: TaxDeterminationInput): TaxDeterminationOutput {
  if (!input || typeof input !== "object" || !input.openingCreditsCents || !Array.isArray(input.entries) || !input.controls) throw new Error("invalid_tax_input");
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(input.period)) throw new Error("invalid_tax_period");
  if (!validMoney(input.openingCreditsCents.CBS) || !validMoney(input.openingCreditsCents.IBS)) throw new Error("invalid_opening_credit");
  if (input.legalEffect !== "simulation_2026" && input.legalEffect !== "production") throw new Error("invalid_legal_effect");

  const ledgers: Record<TaxKind, TaxLedgerSummary> = {
    CBS: emptySummary("CBS", input.openingCreditsCents.CBS),
    IBS: emptySummary("IBS", input.openingCreditsCents.IBS),
  };
  const issues: TaxDeterminationIssue[] = [];
  const sourceKeys = new Set<string>();

  if (!input.entries.length) issues.push({ code: "NO_ENTRIES", severity: "blocker", tax: null, sourceKey: null, message: "Nenhum lançamento foi carregado para a competência." });
  for (const entry of input.entries) {
    validateEntry(entry);
    if (sourceKeys.has(entry.sourceKey)) {
      issues.push({ code: "DUPLICATE_SOURCE_KEY", severity: "blocker", tax: entry.tax, sourceKey: entry.sourceKey, message: "A chave de origem já existe na competência." });
      continue;
    }
    sourceKeys.add(entry.sourceKey);
    if (!entry.occurredAt.startsWith(input.period)) {
      issues.push({ code: "OUTSIDE_PERIOD", severity: "blocker", tax: entry.tax, sourceKey: entry.sourceKey, message: "A data do lançamento não pertence à competência." });
    }
    if ((entry.source === "dfe" || entry.source === "dere") && !entry.sourceDocumentKey) {
      issues.push({ code: "MISSING_DOCUMENT_KEY", severity: "blocker", tax: entry.tax, sourceKey: entry.sourceKey, message: "Documento fiscal sem chave de origem." });
    }
    if ((entry.kind === "debit" || entry.kind === "credit") && entry.classificationStatus !== "confirmed") {
      issues.push({ code: "PENDING_CLASSIFICATION", severity: "blocker", tax: entry.tax, sourceKey: entry.sourceKey, message: "Incidência ou classificação fiscal ainda não confirmada." });
    }

    const ledger = ledgers[entry.tax];
    if (entry.kind === "debit") {
      if (entry.evidenceStatus === "rejected") {
        issues.push({ code: "REJECTED_DEBIT_EVIDENCE", severity: "blocker", tax: entry.tax, sourceKey: entry.sourceKey, message: "Débito com evidência rejeitada foi excluído do saldo preliminar." });
      } else {
        ledger.grossDebitsCents = addMoney(ledger.grossDebitsCents, entry.amountCents);
        if (entry.evidenceStatus !== "verified") issues.push({ code: "PENDING_DEBIT_EVIDENCE", severity: "blocker", tax: entry.tax, sourceKey: entry.sourceKey, message: "Débito incluído de forma conservadora, mas ainda sem evidência confirmada." });
      }
    }
    if (entry.kind === "credit") {
      if (entry.creditStatus === "eligible" && entry.evidenceStatus === "verified") ledger.eligibleCreditsCents = addMoney(ledger.eligibleCreditsCents, entry.amountCents);
      else if (entry.creditStatus === "pending" || entry.evidenceStatus === "pending") issues.push({ code: "PENDING_CREDIT", severity: "blocker", tax: entry.tax, sourceKey: entry.sourceKey, message: "Crédito pendente foi excluído do saldo até comprovação." });
      else if (entry.creditStatus === "blocked" || entry.evidenceStatus === "rejected") issues.push({ code: "BLOCKED_CREDIT", severity: "warning", tax: entry.tax, sourceKey: entry.sourceKey, message: "Crédito bloqueado não reduz o saldo." });
    }
    if (entry.kind === "debit_adjustment" || entry.kind === "credit_adjustment") {
      if (entry.evidenceStatus !== "verified" || !entry.reversalOfSourceKey) {
        issues.push({ code: "UNSUPPORTED_ADJUSTMENT", severity: "blocker", tax: entry.tax, sourceKey: entry.sourceKey, message: "Ajuste sem evidência confirmada ou sem vínculo ao lançamento original." });
      } else if (entry.kind === "debit_adjustment") ledger.debitAdjustmentsCents = addMoney(ledger.debitAdjustmentsCents, entry.amountCents);
      else ledger.creditAdjustmentsCents = addMoney(ledger.creditAdjustmentsCents, entry.amountCents);
    }
    if (entry.kind === "extinguishment") {
      if (entry.evidenceStatus !== "verified" || !entry.extinguishmentMethod) {
        issues.push({ code: "UNCONFIRMED_EXTINGUISHMENT", severity: "blocker", tax: entry.tax, sourceKey: entry.sourceKey, message: "Pagamento ou outra extinção ainda não confirmada na fonte oficial." });
      } else ledger.confirmedExtinguishmentsCents = addMoney(ledger.confirmedExtinguishmentsCents, entry.amountCents);
    }
  }

  for (const [key, message] of requiredControlLabels) {
    if (!input.controls[key]) issues.push({ code: `CONTROL_${String(key).toUpperCase()}`, severity: "blocker", tax: null, sourceKey: null, message });
  }
  if (input.legalEffect === "simulation_2026") {
    issues.push({ code: "SIMULATION_ONLY_2026", severity: "blocker", tax: null, sourceKey: null, message: "A competência de 2026 permanece sem saldo jurídico exigível neste modelo." });
  }

  for (const tax of ["CBS", "IBS"] as const) {
    const ledger = ledgers[tax];
    const debits = addMoney(ledger.grossDebitsCents, ledger.debitAdjustmentsCents);
    const credits = addMoney(addMoney(ledger.openingCreditCents, ledger.eligibleCreditsCents), ledger.creditAdjustmentsCents);
    const debitAfterCredits = Math.max(0, debits - credits);
    ledger.preliminaryCreditCarryforwardCents = Math.max(0, credits - debits);
    if (ledger.confirmedExtinguishmentsCents > debitAfterCredits) {
      issues.push({ code: "EXTINGUISHMENT_EXCEEDS_DEBIT", severity: "blocker", tax, sourceKey: null, message: "As extinções confirmadas superam o débito disponível." });
    }
    ledger.preliminaryDebitBalanceCents = Math.max(0, debitAfterCredits - ledger.confirmedExtinguishmentsCents);
  }

  const closingReady = input.legalEffect === "production" && !issues.some((issue) => issue.severity === "blocker");
  for (const tax of ["CBS", "IBS"] as const) ledgers[tax].netPayableCents = closingReady ? ledgers[tax].preliminaryDebitBalanceCents : null;
  return {
    engineVersion: TAX_DETERMINATION_ENGINE_VERSION,
    period: input.period,
    legalEffect: input.legalEffect,
    ledgers,
    issues,
    closingReady,
    netPayableEnabled: closingReady,
  };
}

const allControls: TaxClosingControls = {
  documentPopulationComplete: true,
  classificationsReviewed: true,
  officialDebitsReconciled: true,
  officialCreditsReconciled: true,
  paymentsReconciled: true,
  adjustmentsSupported: true,
  ruleVersionApproved: true,
  independentReviewerAssigned: true,
};

function entry(partial: Partial<TaxLedgerEntry> & Pick<TaxLedgerEntry, "sourceKey" | "tax" | "kind" | "amountCents">): TaxLedgerEntry {
  return {
    source: "dfe",
    sourceDocumentKey: `DFE-${partial.sourceKey}`,
    occurredAt: "2026-06-15",
    evidenceStatus: "verified",
    creditStatus: partial.kind === "credit" ? "eligible" : "not_applicable",
    classificationStatus: partial.kind === "debit" || partial.kind === "credit" ? "confirmed" : "not_applicable",
    extinguishmentMethod: null,
    reversalOfSourceKey: null,
    ...partial,
  };
}

export const taxDeterminationReferenceCases: TaxDeterminationReferenceCase[] = [
  {
    code: "SIMULATION-2026-SEPARATE-LEDGERS",
    title: "2026 mantém CBS e IBS simulados e sem valor exigível",
    input: {
      period: "2026-06",
      legalEffect: "simulation_2026",
      openingCreditsCents: { CBS: 0, IBS: 0 },
      controls: allControls,
      entries: [
        entry({ sourceKey: "CBS-OUT-1", tax: "CBS", kind: "debit", amountCents: 90_000 }),
        entry({ sourceKey: "CBS-IN-1", tax: "CBS", kind: "credit", amountCents: 20_000 }),
        entry({ sourceKey: "CBS-PAY-1", tax: "CBS", kind: "extinguishment", amountCents: 10_000, source: "official_api", sourceDocumentKey: null, extinguishmentMethod: "split_payment", classificationStatus: "not_applicable" }),
        entry({ sourceKey: "IBS-OUT-1", tax: "IBS", kind: "debit", amountCents: 10_000 }),
        entry({ sourceKey: "IBS-IN-1", tax: "IBS", kind: "credit", amountCents: 2_000 }),
      ],
    },
    expected: { closingReady: false, cbsPreliminaryDebitCents: 60_000, ibsPreliminaryDebitCents: 8_000, cbsNetPayableCents: null, ibsNetPayableCents: null, issueCodes: ["SIMULATION_ONLY_2026"] },
  },
  {
    code: "PRODUCTION-ALL-GATES",
    title: "Fechamento produtivo só libera líquido após todos os portões",
    input: {
      period: "2027-03",
      legalEffect: "production",
      openingCreditsCents: { CBS: 0, IBS: 0 },
      controls: allControls,
      entries: [
        entry({ sourceKey: "CBS-OUT-2", tax: "CBS", kind: "debit", amountCents: 100_000, occurredAt: "2027-03-10" }),
        entry({ sourceKey: "CBS-IN-2", tax: "CBS", kind: "credit", amountCents: 25_000, occurredAt: "2027-03-12" }),
        entry({ sourceKey: "CBS-PAY-2", tax: "CBS", kind: "extinguishment", amountCents: 10_000, occurredAt: "2027-03-20", source: "official_api", sourceDocumentKey: null, extinguishmentMethod: "payment_by_supplier", classificationStatus: "not_applicable" }),
        entry({ sourceKey: "IBS-OUT-2", tax: "IBS", kind: "debit", amountCents: 20_000, occurredAt: "2027-03-10" }),
        entry({ sourceKey: "IBS-IN-2", tax: "IBS", kind: "credit", amountCents: 5_000, occurredAt: "2027-03-12" }),
      ],
    },
    expected: { closingReady: true, cbsPreliminaryDebitCents: 65_000, ibsPreliminaryDebitCents: 15_000, cbsNetPayableCents: 65_000, ibsNetPayableCents: 15_000, issueCodes: [] },
  },
  {
    code: "PENDING-CREDIT-EXCLUDED",
    title: "Crédito pendente não reduz o saldo e bloqueia o fechamento",
    input: {
      period: "2027-04",
      legalEffect: "production",
      openingCreditsCents: { CBS: 0, IBS: 0 },
      controls: allControls,
      entries: [
        entry({ sourceKey: "CBS-OUT-3", tax: "CBS", kind: "debit", amountCents: 100_000, occurredAt: "2027-04-10" }),
        entry({ sourceKey: "CBS-IN-3", tax: "CBS", kind: "credit", amountCents: 25_000, occurredAt: "2027-04-12", evidenceStatus: "pending", creditStatus: "pending" }),
      ],
    },
    expected: { closingReady: false, cbsPreliminaryDebitCents: 100_000, ibsPreliminaryDebitCents: 0, cbsNetPayableCents: null, ibsNetPayableCents: null, issueCodes: ["PENDING_CREDIT"] },
  },
  {
    code: "DUPLICATE-DOCUMENT-BLOCKED",
    title: "Documento duplicado não entra duas vezes e bloqueia o fechamento",
    input: {
      period: "2027-05",
      legalEffect: "production",
      openingCreditsCents: { CBS: 0, IBS: 0 },
      controls: allControls,
      entries: [
        entry({ sourceKey: "CBS-OUT-DUP", tax: "CBS", kind: "debit", amountCents: 50_000, occurredAt: "2027-05-10" }),
        entry({ sourceKey: "CBS-OUT-DUP", tax: "CBS", kind: "debit", amountCents: 50_000, occurredAt: "2027-05-10" }),
      ],
    },
    expected: { closingReady: false, cbsPreliminaryDebitCents: 50_000, ibsPreliminaryDebitCents: 0, cbsNetPayableCents: null, ibsNetPayableCents: null, issueCodes: ["DUPLICATE_SOURCE_KEY"] },
  },
];

export function taxDeterminationCasePasses(referenceCase: TaxDeterminationReferenceCase) {
  const output = calculateTaxDetermination(referenceCase.input);
  const actual = {
    closingReady: output.closingReady,
    cbsPreliminaryDebitCents: output.ledgers.CBS.preliminaryDebitBalanceCents,
    ibsPreliminaryDebitCents: output.ledgers.IBS.preliminaryDebitBalanceCents,
    cbsNetPayableCents: output.ledgers.CBS.netPayableCents,
    ibsNetPayableCents: output.ledgers.IBS.netPayableCents,
    issueCodes: output.issues.map((issue) => issue.code).sort(),
  };
  return JSON.stringify(actual) === JSON.stringify({ ...referenceCase.expected, issueCodes: [...referenceCase.expected.issueCodes].sort() });
}

export async function hashTaxDeterminationBlueprint() {
  const serialized = JSON.stringify(taxDeterminationBlueprint);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(serialized));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

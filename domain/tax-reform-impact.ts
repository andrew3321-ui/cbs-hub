export const TAX_REFORM_IMPACT_ENGINE_VERSION = "mc-rtc-impact-1.0.0";
export const TAX_REFORM_IMPACT_METHODOLOGY_VERSION = "rtc-transition-2026.07";
export const TAX_REFORM_REPORT_VERSION = "tax-reform-impact-report.v1";

export type TaxReformCoverage = "supported" | "partial" | "unsupported";
export type TaxReformRegime = "regular" | "simples" | "mei" | "specific";
export type TaxReformOperationProfile = "standard" | "reduced_rate" | "specific_regime" | "fuel" | "financial" | "real_estate";
export type AncillaryObligationsStatus = "confirmed_compliant" | "not_confirmed" | "unknown";
export type IpiTransitionTreatment = "not_applicable" | "zfm_exception" | "unknown";

export type TaxReformImpactInput = {
  clientLabel: string;
  targetYear: number;
  taxableBaseCents: number | null;
  currentPisCofinsCents: number | null;
  currentIcmsIssCents: number | null;
  currentIpiCents: number | null;
  cbsReferenceRateBps: number | null;
  ibsReferenceRateBps: number | null;
  projectedCbsCreditsCents: number | null;
  projectedIbsCreditsCents: number | null;
  selectiveTaxCents: number | null;
  taxRegime: TaxReformRegime;
  operationProfile: TaxReformOperationProfile;
  ancillaryObligationsStatus: AncillaryObligationsStatus;
  ipiTreatment: IpiTransitionTreatment;
  sourceNote: string;
};

export type TaxReformSource = {
  code: string;
  title: string;
  publisher: string;
  url: string;
  legalReference: string;
  sourceUpdatedAt: string | null;
  checkedAt: string;
};

export type TaxReformTransitionRule = {
  code: string;
  version: string;
  targetYear: number;
  effectiveFrom: string;
  effectiveTo: string;
  legacyPisCofinsShareBps: number;
  legacyIcmsIssShareBps: number;
  cbsMode: "test_90_bps" | "reference_minus_10_bps" | "full_reference";
  ibsMode: "test_10_bps" | "fixed_10_bps" | "reference_share";
  ibsReferenceShareBps: number;
  ipiMode: "legacy" | "zero_except_zfm";
  selectiveTaxMode: "not_started" | "confirmed_input";
  sourceCodes: string[];
};

export type TaxReformIssue = {
  code: string;
  severity: "blocker" | "warning";
  message: string;
};

export type TaxReformMemoryLine = {
  code: string;
  label: string;
  formula: string;
  dataUsed: string;
  amountCents: number | null;
  rateBps: number | null;
  nature: "official_rule" | "accounting_input" | "declared_premise" | "derived";
};

export type TaxReformImpactCalculation = {
  engineVersion: typeof TAX_REFORM_IMPACT_ENGINE_VERSION;
  methodologyVersion: typeof TAX_REFORM_IMPACT_METHODOLOGY_VERSION;
  rule: TaxReformTransitionRule;
  coverage: TaxReformCoverage;
  conclusionNature: "documentary_test" | "financial_projection" | "blocked";
  resultObjective: string;
  inputs: TaxReformImpactInput;
  rates: {
    cbsAppliedRateBps: number | null;
    ibsAppliedRateBps: number | null;
    legacyIcmsIssShareBps: number;
  };
  current: {
    pisCofinsCents: number | null;
    icmsIssCents: number | null;
    ipiCents: number | null;
    totalCents: number | null;
    effectiveRateBps: number | null;
  };
  transition: {
    legacyPisCofinsCents: number | null;
    legacyIcmsIssCents: number | null;
    legacyIpiCents: number | null;
    cbsGrossCents: number | null;
    cbsCreditsCents: number | null;
    cbsExposureCents: number | null;
    ibsGrossCents: number | null;
    ibsCreditsCents: number | null;
    ibsExposureCents: number | null;
    selectiveTaxCents: number | null;
    totalExposureCents: number | null;
    effectiveRateBps: number | null;
  };
  impact: {
    monthlyDeltaCents: number | null;
    annualDeltaCents: number | null;
    direction: "increase" | "reduction" | "neutral" | "blocked";
  };
  memory: TaxReformMemoryLine[];
  issues: TaxReformIssue[];
  pendingFacts: string[];
  sources: TaxReformSource[];
  legalBoundary: string;
  netPayableCents: null;
};

export type TaxReformImpactReport = TaxReformImpactCalculation & {
  format: typeof TAX_REFORM_REPORT_VERSION;
  generatedAt: string;
  inputHash: string;
  reportHash: string;
};

export const taxReformSources: TaxReformSource[] = [
  {
    code: "EC-132-2023",
    title: "Emenda Constitucional nº 132/2023",
    publisher: "Presidência da República",
    url: "https://www.planalto.gov.br/ccivil_03/constituicao/emendas/emc/emc132.htm",
    legalReference: "instituição do IBS/CBS e transição constitucional",
    sourceUpdatedAt: null,
    checkedAt: "2026-07-26",
  },
  {
    code: "LC-214-2025",
    title: "Lei Complementar nº 214/2025 · texto compilado",
    publisher: "Presidência da República",
    url: "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214compilado.htm",
    legalReference: "normas gerais do IBS, CBS, IS e transição",
    sourceUpdatedAt: null,
    checkedAt: "2026-07-26",
  },
  {
    code: "RFB-RTC-TRANSITION",
    title: "Entenda a Reforma Tributária do Consumo",
    publisher: "Receita Federal",
    url: "https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/reforma-tributaria-do-consumo/entenda",
    legalReference: "cronograma oficial de 2026 a 2033",
    sourceUpdatedAt: "2026-07-03",
    checkedAt: "2026-07-26",
  },
  {
    code: "RFB-RTC-2026",
    title: "Orientações da Reforma Tributária para 2026",
    publisher: "Receita Federal",
    url: "https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/reforma-tributaria-do-consumo/orientacoes-2026",
    legalReference: "documentos fiscais, obrigações e dispensa condicionada no ano-teste",
    sourceUpdatedAt: "2026-05-06",
    checkedAt: "2026-07-26",
  },
  {
    code: "RFB-RTC-CALCULATOR",
    title: "Manual de serviços da Reforma Tributária do Consumo",
    publisher: "Receita Federal",
    url: "https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/manuais/reforma-tributaria-do-consumo/manual-servicos-rtc.pdf",
    legalReference: "motor oficial versionado para CBS, IBS e IS",
    sourceUpdatedAt: null,
    checkedAt: "2026-07-26",
  },
];

const commonSources = ["EC-132-2023", "LC-214-2025", "RFB-RTC-TRANSITION", "RFB-RTC-CALCULATOR"];

function transitionRule(
  targetYear: number,
  values: Omit<TaxReformTransitionRule, "code" | "version" | "targetYear" | "effectiveFrom" | "effectiveTo" | "sourceCodes">,
): TaxReformTransitionRule {
  return {
    code: `RTC-BR-TRANSITION-${targetYear}`,
    version: "1.0.0-2026.07",
    targetYear,
    effectiveFrom: `${targetYear}-01-01`,
    effectiveTo: `${targetYear}-12-31`,
    ...values,
    sourceCodes: targetYear === 2026 ? [...commonSources, "RFB-RTC-2026"] : commonSources,
  };
}

export const taxReformTransitionRules: TaxReformTransitionRule[] = [
  transitionRule(2026, { legacyPisCofinsShareBps: 10_000, legacyIcmsIssShareBps: 10_000, cbsMode: "test_90_bps", ibsMode: "test_10_bps", ibsReferenceShareBps: 0, ipiMode: "legacy", selectiveTaxMode: "not_started" }),
  transitionRule(2027, { legacyPisCofinsShareBps: 0, legacyIcmsIssShareBps: 10_000, cbsMode: "reference_minus_10_bps", ibsMode: "fixed_10_bps", ibsReferenceShareBps: 0, ipiMode: "zero_except_zfm", selectiveTaxMode: "confirmed_input" }),
  transitionRule(2028, { legacyPisCofinsShareBps: 0, legacyIcmsIssShareBps: 10_000, cbsMode: "reference_minus_10_bps", ibsMode: "fixed_10_bps", ibsReferenceShareBps: 0, ipiMode: "zero_except_zfm", selectiveTaxMode: "confirmed_input" }),
  transitionRule(2029, { legacyPisCofinsShareBps: 0, legacyIcmsIssShareBps: 9_000, cbsMode: "full_reference", ibsMode: "reference_share", ibsReferenceShareBps: 1_000, ipiMode: "zero_except_zfm", selectiveTaxMode: "confirmed_input" }),
  transitionRule(2030, { legacyPisCofinsShareBps: 0, legacyIcmsIssShareBps: 8_000, cbsMode: "full_reference", ibsMode: "reference_share", ibsReferenceShareBps: 2_000, ipiMode: "zero_except_zfm", selectiveTaxMode: "confirmed_input" }),
  transitionRule(2031, { legacyPisCofinsShareBps: 0, legacyIcmsIssShareBps: 7_000, cbsMode: "full_reference", ibsMode: "reference_share", ibsReferenceShareBps: 3_000, ipiMode: "zero_except_zfm", selectiveTaxMode: "confirmed_input" }),
  transitionRule(2032, { legacyPisCofinsShareBps: 0, legacyIcmsIssShareBps: 6_000, cbsMode: "full_reference", ibsMode: "reference_share", ibsReferenceShareBps: 4_000, ipiMode: "zero_except_zfm", selectiveTaxMode: "confirmed_input" }),
  transitionRule(2033, { legacyPisCofinsShareBps: 0, legacyIcmsIssShareBps: 0, cbsMode: "full_reference", ibsMode: "reference_share", ibsReferenceShareBps: 10_000, ipiMode: "zero_except_zfm", selectiveTaxMode: "confirmed_input" }),
];

const maximumMoneyCents = 100_000_000_000_000;

function validMoneyOrNull(value: number | null) {
  return value === null || (Number.isSafeInteger(value) && value >= 0 && value <= maximumMoneyCents);
}

function validRateOrNull(value: number | null) {
  return value === null || (Number.isInteger(value) && value >= 0 && value <= 5_000);
}

function addKnown(...values: Array<number | null>) {
  if (values.some((value) => value === null)) return null;
  const total = values.reduce<number>((sum, value) => sum + Number(value), 0);
  if (!Number.isSafeInteger(total) || total > maximumMoneyCents) throw new Error("tax_reform_amount_overflow");
  return total;
}

function multiplyCents(value: number, rateBps: number) {
  const rounded = (BigInt(value) * BigInt(rateBps) + 5_000n) / 10_000n;
  const result = Number(rounded);
  if (!Number.isSafeInteger(result) || result > maximumMoneyCents) throw new Error("tax_reform_amount_overflow");
  return result;
}

function effectiveRate(amountCents: number | null, baseCents: number | null) {
  if (amountCents === null || baseCents === null || baseCents <= 0) return null;
  return Number((BigInt(amountCents) * 10_000n + BigInt(Math.floor(baseCents / 2))) / BigInt(baseCents));
}

function requireMoney(input: TaxReformImpactInput, key: keyof TaxReformImpactInput, label: string, issues: TaxReformIssue[], pendingFacts: string[]) {
  if (input[key] !== null) return;
  issues.push({ code: `MISSING_${String(key).toUpperCase()}`, severity: "blocker", message: `${label} não foi informado.` });
  pendingFacts.push(label);
}

function appliedRates(rule: TaxReformTransitionRule, input: TaxReformImpactInput, issues: TaxReformIssue[], pendingFacts: string[]) {
  let cbsAppliedRateBps: number | null = null;
  let ibsAppliedRateBps: number | null = null;
  if (rule.cbsMode === "test_90_bps") cbsAppliedRateBps = 90;
  else if (input.cbsReferenceRateBps === null) {
    issues.push({ code: "MISSING_CBS_REFERENCE_RATE", severity: "blocker", message: "A alíquota de referência da CBS ainda não foi informada como premissa." });
    pendingFacts.push("alíquota de referência da CBS");
  } else if (rule.cbsMode === "reference_minus_10_bps" && input.cbsReferenceRateBps < 10) {
    issues.push({ code: "INVALID_CBS_REFERENCE_RATE", severity: "blocker", message: "A referência da CBS precisa ser igual ou superior à redução transitória de 0,1 p.p." });
  } else cbsAppliedRateBps = rule.cbsMode === "reference_minus_10_bps" ? input.cbsReferenceRateBps - 10 : input.cbsReferenceRateBps;

  if (rule.ibsMode === "test_10_bps" || rule.ibsMode === "fixed_10_bps") ibsAppliedRateBps = 10;
  else if (input.ibsReferenceRateBps === null) {
    issues.push({ code: "MISSING_IBS_REFERENCE_RATE", severity: "blocker", message: "A alíquota de referência integral do IBS ainda não foi informada como premissa." });
    pendingFacts.push("alíquota de referência integral do IBS");
  } else ibsAppliedRateBps = multiplyCents(input.ibsReferenceRateBps, rule.ibsReferenceShareBps);
  return { cbsAppliedRateBps, ibsAppliedRateBps };
}

export function assertTaxReformImpactInput(input: TaxReformImpactInput) {
  if (
    !input
    || typeof input !== "object"
    || typeof input.clientLabel !== "string"
    || input.clientLabel.length > 120
    || !Number.isInteger(input.targetYear)
    || !taxReformTransitionRules.some((rule) => rule.targetYear === input.targetYear)
    || ![
      input.taxableBaseCents,
      input.currentPisCofinsCents,
      input.currentIcmsIssCents,
      input.currentIpiCents,
      input.projectedCbsCreditsCents,
      input.projectedIbsCreditsCents,
      input.selectiveTaxCents,
    ].every(validMoneyOrNull)
    || !validRateOrNull(input.cbsReferenceRateBps)
    || !validRateOrNull(input.ibsReferenceRateBps)
    || !["regular", "simples", "mei", "specific"].includes(input.taxRegime)
    || !["standard", "reduced_rate", "specific_regime", "fuel", "financial", "real_estate"].includes(input.operationProfile)
    || !["confirmed_compliant", "not_confirmed", "unknown"].includes(input.ancillaryObligationsStatus)
    || !["not_applicable", "zfm_exception", "unknown"].includes(input.ipiTreatment)
    || typeof input.sourceNote !== "string"
    || input.sourceNote.length > 500
  ) throw new Error("invalid_tax_reform_impact_input");
}

export function calculateTaxReformImpact(input: TaxReformImpactInput): TaxReformImpactCalculation {
  assertTaxReformImpactInput(input);
  const rule = taxReformTransitionRules.find((item) => item.targetYear === input.targetYear)!;
  const issues: TaxReformIssue[] = [];
  const pendingFacts: string[] = [];

  requireMoney(input, "taxableBaseCents", "base tributável mensal", issues, pendingFacts);
  requireMoney(input, "currentPisCofinsCents", "PIS/Cofins atual da competência", issues, pendingFacts);
  requireMoney(input, "currentIcmsIssCents", "ICMS/ISS atual da competência", issues, pendingFacts);
  requireMoney(input, "currentIpiCents", "IPI atual da competência", issues, pendingFacts);
  if (input.taxableBaseCents === 0) issues.push({ code: "ZERO_TAXABLE_BASE", severity: "blocker", message: "A base tributável precisa ser maior que zero." });
  if (input.sourceNote.trim().length < 10) {
    issues.push({ code: "MISSING_SOURCE_NOTE", severity: "blocker", message: "Descreva a origem contábil das premissas utilizadas." });
    pendingFacts.push("origem contábil das premissas");
  }
  if (input.taxRegime !== "regular") {
    issues.push({ code: "UNSUPPORTED_TAX_REGIME", severity: "blocker", message: "Esta primeira versão cobre somente empresas no regime regular de IBS/CBS." });
  }
  if (input.operationProfile !== "standard") {
    issues.push({ code: "UNSUPPORTED_OPERATION_PROFILE", severity: "blocker", message: "Operações com redução, regime específico, combustíveis, finanças ou imóveis exigem regras próprias e não herdam a operação padrão." });
  }

  const { cbsAppliedRateBps, ibsAppliedRateBps } = appliedRates(rule, input, issues, pendingFacts);
  if (input.targetYear === 2026) {
    if (input.ancillaryObligationsStatus === "unknown") {
      issues.push({ code: "MISSING_ANCILLARY_STATUS", severity: "blocker", message: "Confirme se as obrigações acessórias aplicáveis de 2026 foram cumpridas." });
      pendingFacts.push("cumprimento das obrigações acessórias de 2026");
    } else if (input.ancillaryObligationsStatus === "not_confirmed") {
      issues.push({ code: "ANCILLARY_COMPLIANCE_NOT_CONFIRMED", severity: "warning", message: "Sem confirmação das obrigações, a dispensa de recolhimento do ano-teste não pode ser presumida." });
    }
  } else {
    requireMoney(input, "projectedCbsCreditsCents", "créditos de CBS estimados para o ano-alvo", issues, pendingFacts);
    requireMoney(input, "projectedIbsCreditsCents", "créditos de IBS estimados para o ano-alvo", issues, pendingFacts);
    requireMoney(input, "selectiveTaxCents", "Imposto Seletivo confirmado, ainda que zero", issues, pendingFacts);
    if (input.ipiTreatment === "unknown") {
      issues.push({ code: "MISSING_IPI_TREATMENT", severity: "blocker", message: "Confirme se existe exceção de IPI vinculada à Zona Franca de Manaus." });
      pendingFacts.push("tratamento do IPI na transição");
    }
  }

  const currentTotalCents = addKnown(input.currentPisCofinsCents, input.currentIcmsIssCents, input.currentIpiCents);
  const base = input.taxableBaseCents;
  const cbsGrossCents = base !== null && cbsAppliedRateBps !== null ? multiplyCents(base, cbsAppliedRateBps) : null;
  const ibsGrossCents = base !== null && ibsAppliedRateBps !== null ? multiplyCents(base, ibsAppliedRateBps) : null;
  let legacyPisCofinsCents = input.currentPisCofinsCents === null ? null : multiplyCents(input.currentPisCofinsCents, rule.legacyPisCofinsShareBps);
  const legacyIcmsIssCents = input.currentIcmsIssCents === null ? null : multiplyCents(input.currentIcmsIssCents, rule.legacyIcmsIssShareBps);
  const legacyIpiCents = input.currentIpiCents === null
    ? null
    : rule.ipiMode === "legacy" || input.ipiTreatment === "zfm_exception" ? input.currentIpiCents : input.ipiTreatment === "not_applicable" ? 0 : null;
  const cbsCreditsCents = input.targetYear === 2026 ? 0 : input.projectedCbsCreditsCents;
  const ibsCreditsCents = input.targetYear === 2026 ? 0 : input.projectedIbsCreditsCents;
  let cbsExposureCents = cbsGrossCents !== null && cbsCreditsCents !== null ? Math.max(0, cbsGrossCents - cbsCreditsCents) : null;
  let ibsExposureCents = ibsGrossCents !== null && ibsCreditsCents !== null ? Math.max(0, ibsGrossCents - ibsCreditsCents) : null;
  const selectiveTaxCents = input.targetYear === 2026 ? 0 : input.selectiveTaxCents;

  if (input.targetYear === 2026 && input.ancillaryObligationsStatus === "confirmed_compliant") {
    cbsExposureCents = 0;
    ibsExposureCents = 0;
  } else if (input.targetYear === 2026 && input.ancillaryObligationsStatus === "not_confirmed") {
    const testTotal = addKnown(cbsGrossCents, ibsGrossCents);
    if (testTotal !== null && input.currentPisCofinsCents !== null && testTotal <= input.currentPisCofinsCents) {
      legacyPisCofinsCents = input.currentPisCofinsCents - testTotal;
    } else {
      issues.push({ code: "PIS_COFINS_OFFSET_NOT_CLOSED", severity: "blocker", message: "O destaque teste supera ou não pode ser conciliado com o PIS/Cofins informado; outros efeitos não serão presumidos." });
      pendingFacts.push("conciliação do destaque teste com PIS/Cofins");
    }
  }

  const hasBlocker = issues.some((issue) => issue.severity === "blocker");
  const unsupported = issues.some((issue) => ["UNSUPPORTED_TAX_REGIME", "UNSUPPORTED_OPERATION_PROFILE"].includes(issue.code));
  const coverage: TaxReformCoverage = unsupported ? "unsupported" : hasBlocker ? "partial" : "supported";
  const calculatedTransitionTotal = addKnown(
    legacyPisCofinsCents,
    legacyIcmsIssCents,
    legacyIpiCents,
    cbsExposureCents,
    ibsExposureCents,
    selectiveTaxCents,
  );
  const totalExposureCents = hasBlocker ? null : calculatedTransitionTotal;
  const monthlyDeltaCents = currentTotalCents !== null && totalExposureCents !== null ? totalExposureCents - currentTotalCents : null;
  const annualDeltaCents = monthlyDeltaCents === null ? null : monthlyDeltaCents * 12;
  const direction = monthlyDeltaCents === null ? "blocked" : monthlyDeltaCents > 0 ? "increase" : monthlyDeltaCents < 0 ? "reduction" : "neutral";
  const resultObjective = coverage === "unsupported"
    ? "Cenário fora da cobertura desta regra; nenhum impacto final foi calculado."
    : monthlyDeltaCents === null
      ? "Conclusão financeira bloqueada até o preenchimento das pendências listadas."
      : direction === "neutral"
        ? "A exposição mensal projetada é igual ao valor atual nas premissas registradas."
        : `A exposição mensal projetada apresenta ${direction === "increase" ? "aumento" : "redução"} de ${Math.abs(monthlyDeltaCents)} centavos.`;

  const testCollectionWaived = input.targetYear === 2026 && input.ancillaryObligationsStatus === "confirmed_compliant";
  const memory: TaxReformMemoryLine[] = [
    { code: "CURRENT-PIS-COFINS", label: "PIS/Cofins atual", formula: "Valor líquido informado na competência", dataUsed: `${input.currentPisCofinsCents ?? "pendente"} centavos`, amountCents: input.currentPisCofinsCents, rateBps: null, nature: "accounting_input" },
    { code: "CURRENT-TOTAL", label: "Total atual informado", formula: "PIS/Cofins atual + ICMS/ISS atual + IPI atual", dataUsed: `${input.currentPisCofinsCents ?? "pendente"} + ${input.currentIcmsIssCents ?? "pendente"} + ${input.currentIpiCents ?? "pendente"} centavos`, amountCents: currentTotalCents, rateBps: effectiveRate(currentTotalCents, base), nature: "derived" },
    { code: "LEGACY-PIS-COFINS", label: "PIS/Cofins remanescente", formula: input.targetYear === 2026 && input.ancillaryObligationsStatus === "not_confirmed" ? "PIS/Cofins atual − destaques teste conciliáveis" : "PIS/Cofins atual × percentual remanescente", dataUsed: `${input.currentPisCofinsCents ?? "pendente"} centavos · etapa ${input.targetYear}`, amountCents: legacyPisCofinsCents, rateBps: rule.legacyPisCofinsShareBps, nature: "official_rule" },
    { code: "CURRENT-ICMS-ISS", label: "ICMS/ISS atual", formula: "Valor líquido informado × percentual remanescente", dataUsed: `${input.currentIcmsIssCents ?? "pendente"} centavos × ${rule.legacyIcmsIssShareBps} bps`, amountCents: legacyIcmsIssCents, rateBps: rule.legacyIcmsIssShareBps, nature: "official_rule" },
    { code: "LEGACY-IPI", label: "IPI remanescente", formula: rule.ipiMode === "legacy" ? "IPI atual mantido no ano-teste" : "IPI zerado, salvo exceção ZFM confirmada", dataUsed: `${input.currentIpiCents ?? "pendente"} centavos · tratamento ${input.ipiTreatment}`, amountCents: legacyIpiCents, rateBps: null, nature: "official_rule" },
    { code: "CBS-GROSS", label: "CBS bruta projetada", formula: "Base tributável × alíquota CBS aplicável", dataUsed: `${base ?? "pendente"} centavos × ${cbsAppliedRateBps ?? "pendente"} bps`, amountCents: cbsGrossCents, rateBps: cbsAppliedRateBps, nature: cbsAppliedRateBps === 90 ? "official_rule" : "declared_premise" },
    { code: "CBS-EXPOSURE", label: "Exposição CBS após créditos", formula: testCollectionWaived ? "Exposição zerada pela dispensa condicionada do ano-teste" : "Máximo entre zero e CBS bruta − créditos informados", dataUsed: testCollectionWaived ? `obrigações acessórias: ${input.ancillaryObligationsStatus}` : `${cbsGrossCents ?? "pendente"} − ${cbsCreditsCents ?? "pendente"} centavos`, amountCents: cbsExposureCents, rateBps: null, nature: testCollectionWaived ? "official_rule" : "derived" },
    { code: "IBS-GROSS", label: "IBS bruto projetado", formula: "Base tributável × alíquota IBS da etapa", dataUsed: `${base ?? "pendente"} centavos × ${ibsAppliedRateBps ?? "pendente"} bps`, amountCents: ibsGrossCents, rateBps: ibsAppliedRateBps, nature: rule.ibsMode === "reference_share" ? "declared_premise" : "official_rule" },
    { code: "IBS-EXPOSURE", label: "Exposição IBS após créditos", formula: testCollectionWaived ? "Exposição zerada pela dispensa condicionada do ano-teste" : "Máximo entre zero e IBS bruto − créditos informados", dataUsed: testCollectionWaived ? `obrigações acessórias: ${input.ancillaryObligationsStatus}` : `${ibsGrossCents ?? "pendente"} − ${ibsCreditsCents ?? "pendente"} centavos`, amountCents: ibsExposureCents, rateBps: null, nature: testCollectionWaived ? "official_rule" : "derived" },
    { code: "SELECTIVE-TAX", label: "Imposto Seletivo", formula: rule.selectiveTaxMode === "not_started" ? "Não iniciado nesta etapa" : "Valor confirmado como premissa, inclusive quando zero", dataUsed: `${selectiveTaxCents ?? "pendente"} centavos`, amountCents: selectiveTaxCents, rateBps: null, nature: rule.selectiveTaxMode === "not_started" ? "official_rule" : "declared_premise" },
    { code: "TRANSITION-TOTAL", label: "Exposição total na transição", formula: "Legados remanescentes + CBS + IBS + IPI + IS", dataUsed: `Regra ${rule.code}@${rule.version}`, amountCents: totalExposureCents, rateBps: effectiveRate(totalExposureCents, base), nature: "derived" },
    { code: "MONTHLY-DELTA", label: "Impacto financeiro mensal", formula: "Exposição da transição − total atual", dataUsed: `${totalExposureCents ?? "bloqueado"} − ${currentTotalCents ?? "pendente"} centavos`, amountCents: monthlyDeltaCents, rateBps: null, nature: "derived" },
    { code: "ANNUAL-DELTA", label: "Impacto financeiro anualizado", formula: "Impacto mensal × 12 competências", dataUsed: `${monthlyDeltaCents ?? "bloqueado"} × 12 centavos`, amountCents: annualDeltaCents, rateBps: null, nature: "derived" },
  ];

  return {
    engineVersion: TAX_REFORM_IMPACT_ENGINE_VERSION,
    methodologyVersion: TAX_REFORM_IMPACT_METHODOLOGY_VERSION,
    rule,
    coverage,
    conclusionNature: hasBlocker ? "blocked" : input.targetYear === 2026 ? "documentary_test" : "financial_projection",
    resultObjective,
    inputs: { ...input, clientLabel: input.clientLabel.trim(), sourceNote: input.sourceNote.trim() },
    rates: { cbsAppliedRateBps, ibsAppliedRateBps, legacyIcmsIssShareBps: rule.legacyIcmsIssShareBps },
    current: {
      pisCofinsCents: input.currentPisCofinsCents,
      icmsIssCents: input.currentIcmsIssCents,
      ipiCents: input.currentIpiCents,
      totalCents: currentTotalCents,
      effectiveRateBps: effectiveRate(currentTotalCents, base),
    },
    transition: {
      legacyPisCofinsCents,
      legacyIcmsIssCents,
      legacyIpiCents,
      cbsGrossCents,
      cbsCreditsCents,
      cbsExposureCents,
      ibsGrossCents,
      ibsCreditsCents,
      ibsExposureCents,
      selectiveTaxCents,
      totalExposureCents,
      effectiveRateBps: effectiveRate(totalExposureCents, base),
    },
    impact: { monthlyDeltaCents, annualDeltaCents, direction },
    memory,
    issues,
    pendingFacts: [...new Set(pendingFacts)],
    sources: taxReformSources.filter((source) => rule.sourceCodes.includes(source.code)),
    legalBoundary: "A memória calcula exposição financeira com valores contábeis e alíquotas de referência declaradas. Ela não classifica a operação, não substitui a Calculadora oficial e nunca produz valor jurídico líquido a recolher.",
    netPayableCents: null,
  };
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function createTaxReformImpactReport(input: TaxReformImpactInput, generatedAt = new Date().toISOString()): Promise<TaxReformImpactReport> {
  if (!Number.isFinite(Date.parse(generatedAt))) throw new Error("invalid_tax_reform_report_date");
  const calculation = calculateTaxReformImpact(input);
  const inputHash = await sha256(JSON.stringify({
    ...calculation.inputs,
    ruleCode: calculation.rule.code,
    ruleVersion: calculation.rule.version,
    engineVersion: calculation.engineVersion,
    methodologyVersion: calculation.methodologyVersion,
  }));
  const reportWithoutHash = {
    format: TAX_REFORM_REPORT_VERSION,
    ...calculation,
    generatedAt,
    inputHash,
  };
  return { ...reportWithoutHash, reportHash: await sha256(JSON.stringify(reportWithoutHash)) };
}

export function hashTaxReformImpactModel() {
  return sha256(JSON.stringify({
    engineVersion: TAX_REFORM_IMPACT_ENGINE_VERSION,
    methodologyVersion: TAX_REFORM_IMPACT_METHODOLOGY_VERSION,
    rules: taxReformTransitionRules,
    sources: taxReformSources,
    referenceCases: taxReformImpactReferenceCases.map(({ code, input, expected }) => ({ code, input, expected })),
  }));
}

const completeBaseInput: TaxReformImpactInput = {
  clientLabel: "Empresa de referência",
  targetYear: 2026,
  taxableBaseCents: 10_000_000,
  currentPisCofinsCents: 365_000,
  currentIcmsIssCents: 1_200_000,
  currentIpiCents: 0,
  cbsReferenceRateBps: null,
  ibsReferenceRateBps: null,
  projectedCbsCreditsCents: null,
  projectedIbsCreditsCents: null,
  selectiveTaxCents: null,
  taxRegime: "regular",
  operationProfile: "standard",
  ancillaryObligationsStatus: "confirmed_compliant",
  ipiTreatment: "not_applicable",
  sourceNote: "Valores líquidos extraídos da apuração mensal conferida.",
};

export const taxReformImpactReferenceCases = [
  {
    code: "RTC-2026-COMPLIANT",
    input: completeBaseInput,
    expected: { coverage: "supported", transitionTotalCents: 1_565_000, monthlyDeltaCents: 0, cbsGrossCents: 90_000, ibsGrossCents: 10_000 },
  },
  {
    code: "RTC-2029-STANDARD",
    input: { ...completeBaseInput, targetYear: 2029, cbsReferenceRateBps: 900, ibsReferenceRateBps: 1_800, projectedCbsCreditsCents: 200_000, projectedIbsCreditsCents: 100_000, selectiveTaxCents: 0 },
    expected: { coverage: "supported", transitionTotalCents: 1_860_000, monthlyDeltaCents: 295_000, cbsGrossCents: 900_000, ibsGrossCents: 180_000 },
  },
  {
    code: "RTC-2033-FULL",
    input: { ...completeBaseInput, targetYear: 2033, cbsReferenceRateBps: 900, ibsReferenceRateBps: 1_800, projectedCbsCreditsCents: 200_000, projectedIbsCreditsCents: 100_000, selectiveTaxCents: 0 },
    expected: { coverage: "supported", transitionTotalCents: 2_400_000, monthlyDeltaCents: 835_000, cbsGrossCents: 900_000, ibsGrossCents: 1_800_000 },
  },
  {
    code: "RTC-MISSING-RATE",
    input: { ...completeBaseInput, targetYear: 2030, cbsReferenceRateBps: 900, ibsReferenceRateBps: null, projectedCbsCreditsCents: 200_000, projectedIbsCreditsCents: 100_000, selectiveTaxCents: 0 },
    expected: { coverage: "partial", transitionTotalCents: null, monthlyDeltaCents: null, cbsGrossCents: 900_000, ibsGrossCents: null },
  },
  {
    code: "RTC-SIMPLES-UNSUPPORTED",
    input: { ...completeBaseInput, taxRegime: "simples" as TaxReformRegime },
    expected: { coverage: "unsupported", transitionTotalCents: null, monthlyDeltaCents: null, cbsGrossCents: 90_000, ibsGrossCents: 10_000 },
  },
] as const;

export function taxReformImpactCasePasses(referenceCase: typeof taxReformImpactReferenceCases[number]) {
  const output = calculateTaxReformImpact(referenceCase.input);
  return JSON.stringify({
    coverage: output.coverage,
    transitionTotalCents: output.transition.totalExposureCents,
    monthlyDeltaCents: output.impact.monthlyDeltaCents,
    cbsGrossCents: output.transition.cbsGrossCents,
    ibsGrossCents: output.transition.ibsGrossCents,
  }) === JSON.stringify(referenceCase.expected);
}

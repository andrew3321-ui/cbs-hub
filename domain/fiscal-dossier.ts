import type { FiscalIntelligenceResult } from "./fiscal-intelligence";

export const FISCAL_DOSSIER_ENGINE_VERSION = "cbshub-fiscal-dossier-0.1.0";
export const FISCAL_DOSSIER_SCHEMA_VERSION = "fiscal-dossier.v1";

const MAX_MONEY_CENTS = 100_000_000_000;

export type FiscalCalculationInputs = {
  operationPriceCents: number;
  discountsGrantedCents: number;
  freightCents: number;
  insuranceCents: number;
  ipiCents: number;
  otherExpensesCents: number;
  ownIcmsBaseCents: number;
  internalRateBps: number;
  fcpRateBps: number;
  ratesConfirmed: boolean;
  priceMethod: "mva";
};

export type FiscalCalculationLine = {
  code: string;
  label: string;
  formula: string;
  basis: string;
  amountCents: number | null;
  percentageBps: number | null;
  sourceCodes: string[];
  status: "calculated" | "parameter" | "not_applicable" | "blocked";
};

export type FiscalCalculationMemory = {
  schemaVersion: "fiscal-calculation-memory.v1";
  engineVersion: string;
  status: "calculated_conditional" | "needs_information" | "not_applicable";
  statusLabel: string;
  legalEffect: "technical_memory_not_filing_instruction";
  calculationType: "icms_st_resale" | "icms_st_difal" | "own_icms_reference" | "not_supported";
  inputs: FiscalCalculationInputs;
  parameters: {
    interstateRateBps: number | null;
    internalRateBps: number;
    fcpRateBps: number;
    mvaOriginalBps: number | null;
    mvaAppliedBps: number | null;
    mvaWasAdjusted: boolean;
  };
  totals: {
    operationCompositionCents: number;
    ownIcmsReferenceCents: number | null;
    stBaseCents: number | null;
    presumedInternalIcmsCents: number | null;
    icmsStCents: number | null;
    difalCents: number | null;
    fcpCents: number | null;
    destinationTotalCents: number | null;
  };
  lines: FiscalCalculationLine[];
  blockers: string[];
  warnings: string[];
  requiredConfirmations: string[];
  disclaimer: string;
};

export type FiscalDossierSnapshot = {
  schemaVersion: "fiscal-dossier.v1";
  engineVersion: string;
  generatedAt: string;
  title: string;
  question: string;
  scope: string;
  assurance: {
    level: "professional_review_required";
    factsComplete: boolean;
    ratesConfirmed: boolean;
    calculationStatus: FiscalCalculationMemory["status"];
    reviewRequired: true;
  };
  determination: {
    status: FiscalIntelligenceResult["status"];
    headline: string;
    summary: string;
    baseCode: string;
    baseVersion: string;
    engineVersion: string;
    facts: FiscalIntelligenceResult["facts"];
    findings: FiscalIntelligenceResult["findings"];
    decisionTrace: FiscalIntelligenceResult["decisionTrace"];
  };
  calculation: FiscalCalculationMemory;
  evidence: {
    sources: FiscalIntelligenceResult["sources"];
    limitations: string[];
  };
};

function assertInteger(name: string, value: unknown, minimum: number, maximum: number) {
  if (!Number.isSafeInteger(value) || Number(value) < minimum || Number(value) > maximum) throw new Error(`invalid_${name}`);
  return Number(value);
}

export function parseFiscalCalculationInputs(value: unknown): FiscalCalculationInputs {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_calculation_inputs");
  const input = value as Record<string, unknown>;
  return {
    operationPriceCents: assertInteger("operation_price", input.operationPriceCents, 1, MAX_MONEY_CENTS),
    discountsGrantedCents: assertInteger("discounts_granted", input.discountsGrantedCents ?? 0, 0, MAX_MONEY_CENTS),
    freightCents: assertInteger("freight", input.freightCents ?? 0, 0, MAX_MONEY_CENTS),
    insuranceCents: assertInteger("insurance", input.insuranceCents ?? 0, 0, MAX_MONEY_CENTS),
    ipiCents: assertInteger("ipi", input.ipiCents ?? 0, 0, MAX_MONEY_CENTS),
    otherExpensesCents: assertInteger("other_expenses", input.otherExpensesCents ?? 0, 0, MAX_MONEY_CENTS),
    ownIcmsBaseCents: assertInteger("own_icms_base", input.ownIcmsBaseCents, 1, MAX_MONEY_CENTS),
    internalRateBps: assertInteger("internal_rate", input.internalRateBps, 1, 3_500),
    fcpRateBps: assertInteger("fcp_rate", input.fcpRateBps ?? 0, 0, 400),
    ratesConfirmed: input.ratesConfirmed === true,
    priceMethod: input.priceMethod === "mva" ? "mva" : (() => { throw new Error("invalid_price_method"); })(),
  };
}

function roundDivide(numerator: number, denominator: number) {
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator) || denominator <= 0) throw new Error("unsafe_calculation_range");
  return Math.floor((numerator + Math.floor(denominator / 2)) / denominator);
}

function multiplyByBps(cents: number, bps: number) {
  return roundDivide(cents * bps, 10_000);
}

function applyMva(cents: number, mvaBps: number) {
  return roundDivide(cents * (10_000 + mvaBps), 10_000);
}

export function adjustedMvaBps(originalMvaBps: number, interstateRateBps: number, internalRateBps: number) {
  if (![originalMvaBps, interstateRateBps, internalRateBps].every(Number.isInteger) || internalRateBps >= 10_000) throw new Error("invalid_mva_parameters");
  const adjustedCoefficientBps = roundDivide(
    (10_000 + originalMvaBps) * (10_000 - interstateRateBps),
    10_000 - internalRateBps,
  );
  return Math.max(0, adjustedCoefficientBps - 10_000);
}

function parseRateBps(result: FiscalIntelligenceResult) {
  const ownRate = result.findings.find((finding) => finding.nature === "own_rate")?.value;
  if (ownRate) {
    const numeric = Number(ownRate.replace("%", "").replace(",", "."));
    if (Number.isFinite(numeric)) return Math.round(numeric * 100);
  }
  if (result.facts.productOrigin === "domestic") return 1_200;
  if (result.facts.productOrigin === "imported" && result.facts.importRuleQualification === "qualifies") return 400;
  if (result.facts.productOrigin === "imported" && result.facts.importRuleQualification === "does_not_qualify") return 1_200;
  return null;
}

function parseMvaBps(result: FiscalIntelligenceResult) {
  const parameter = result.findings.find((finding) => finding.nature === "table_parameter")?.value;
  if (!parameter) return null;
  const numeric = Number(parameter.replace("%", "").replace(",", "."));
  return Number.isFinite(numeric) ? Math.round(numeric * 100) : null;
}

function emptyTotals(operationCompositionCents: number): FiscalCalculationMemory["totals"] {
  return {
    operationCompositionCents,
    ownIcmsReferenceCents: null,
    stBaseCents: null,
    presumedInternalIcmsCents: null,
    icmsStCents: null,
    difalCents: null,
    fcpCents: null,
    destinationTotalCents: null,
  };
}

export function calculateFiscalMemory(result: FiscalIntelligenceResult, inputs: FiscalCalculationInputs): FiscalCalculationMemory {
  const blockers: string[] = [];
  const warnings = [
    "Valores monetários declarados pelo usuário; esta versão ainda não confere XML de NF-e.",
    "A memória não considera benefício fiscal, regime especial, PMPF ou preço sugerido não informado.",
    "Arredondamentos são feitos em centavos e a memória deve ser revisada contra a escrituração e a legislação vigente.",
  ];
  const requiredConfirmations = [
    "Descrição, NCM e CEST correspondem exatamente à mercadoria.",
    "A finalidade, o regime do remetente e a condição do destinatário foram confirmados.",
    "A alíquota interna e a incidência ou não de FCP foram verificadas para a mercadoria.",
    "A composição do preço inclui todas as parcelas transferíveis cobradas do destinatário.",
  ];
  const interstateRateBps = parseRateBps(result);
  const mvaOriginalBps = parseMvaBps(result);
  const operationCompositionCents = [
    inputs.operationPriceCents,
    inputs.discountsGrantedCents,
    inputs.freightCents,
    inputs.insuranceCents,
    inputs.ipiCents,
    inputs.otherExpensesCents,
  ].reduce((sum, current) => sum + current, 0);
  if (!Number.isSafeInteger(operationCompositionCents) || operationCompositionCents > MAX_MONEY_CENTS) blockers.push("A composição monetária ultrapassa o limite seguro desta versão.");
  if (result.status === "out_of_scope") blockers.push("A operação está fora da cobertura atual do motor.");
  if (result.completeness.percentage !== 100) blockers.push("Todos os fatos mínimos precisam estar confirmados antes do cálculo.");
  if (!inputs.ratesConfirmed) blockers.push("Confirme expressamente a alíquota interna e o tratamento do FCP.");
  if (!interstateRateBps) blockers.push("A alíquota interestadual ainda não foi determinada.");
  if (result.facts.specialTreatment === "exists") blockers.push("O benefício ou regime especial informado impede usar a fórmula geral.");
  if (result.facts.recipientTaxpayer === "no") blockers.push("O DIFAL para consumidor final não contribuinte ainda não está calculado nesta versão do dossiê.");

  const lines: FiscalCalculationLine[] = [{
    code: "OPERATION-COMPOSITION",
    label: "Composição da operação para a memória",
    formula: "preço praticado + descontos concedidos + frete + seguro + IPI + outras despesas",
    basis: "RICMS/MG, Anexo VII, Parte 1, art. 20, I, b, 2",
    amountCents: operationCompositionCents,
    percentageBps: null,
    sourceCodes: ["MG-RICMS-ANNEX-VII"],
    status: "calculated",
  }];

  const initialTotals = emptyTotals(operationCompositionCents);
  if (blockers.length) return {
    schemaVersion: "fiscal-calculation-memory.v1",
    engineVersion: FISCAL_DOSSIER_ENGINE_VERSION,
    status: "needs_information",
    statusLabel: "Cálculo bloqueado por premissa",
    legalEffect: "technical_memory_not_filing_instruction",
    calculationType: "not_supported",
    inputs,
    parameters: { interstateRateBps, internalRateBps: inputs.internalRateBps, fcpRateBps: inputs.fcpRateBps, mvaOriginalBps, mvaAppliedBps: null, mvaWasAdjusted: false },
    totals: initialTotals,
    lines,
    blockers,
    warnings,
    requiredConfirmations,
    disclaimer: "Memória técnica bloqueada. Não use os valores para emissão, recolhimento ou escrituração enquanto houver premissas pendentes.",
  };

  const ownIcmsReferenceCents = multiplyByBps(inputs.ownIcmsBaseCents, interstateRateBps!);
  lines.push({
    code: "OWN-ICMS-REFERENCE",
    label: result.facts.issuerTaxRegime === "simples" ? "Parcela interestadual para dedução técnica" : "ICMS próprio de referência",
    formula: "base confirmada do ICMS próprio × alíquota interestadual",
    basis: result.facts.issuerTaxRegime === "simples" ? "Convênio ICMS 142/2018, cláusula décima terceira" : "Resoluções do Senado 22/1989 e 13/2012",
    amountCents: ownIcmsReferenceCents,
    percentageBps: interstateRateBps,
    sourceCodes: result.facts.issuerTaxRegime === "simples" ? ["CONFAZ-CONVENIO-142-2018"] : [interstateRateBps === 400 ? "RSF-13-2012" : "RSF-22-1989"],
    status: "calculated",
  });

  const stLocated = result.findings.some((finding) => finding.nature === "st_scope");
  if (result.facts.purpose === "resale" && stLocated && mvaOriginalBps !== null) {
    const shouldAdjustMva = result.facts.issuerTaxRegime !== "simples" && inputs.internalRateBps > interstateRateBps!;
    const mvaAppliedBps = shouldAdjustMva ? adjustedMvaBps(mvaOriginalBps, interstateRateBps!, inputs.internalRateBps) : mvaOriginalBps;
    const stBaseCents = applyMva(operationCompositionCents, mvaAppliedBps);
    const presumedInternalIcmsCents = multiplyByBps(stBaseCents, inputs.internalRateBps);
    const icmsStCents = Math.max(0, presumedInternalIcmsCents - ownIcmsReferenceCents);
    const fcpCents = multiplyByBps(stBaseCents, inputs.fcpRateBps);
    const destinationTotalCents = icmsStCents + fcpCents;
    lines.push(
      {
        code: "MVA-APPLIED",
        label: shouldAdjustMva ? "MVA ajustada aplicada" : "MVA original aplicada",
        formula: shouldAdjustMva ? "[(1 + MVA original) × (1 − alíquota interestadual) ÷ (1 − alíquota interna)] − 1" : "MVA constante da tabela mineira",
        basis: shouldAdjustMva ? "RICMS/MG, Anexo VII, Parte 1, art. 20, § 5º" : result.facts.issuerTaxRegime === "simples" ? "RICMS/MG, Anexo VII, Parte 1, art. 20, § 6º" : "RICMS/MG, Anexo VII, Parte 2, Capítulo 1",
        amountCents: null,
        percentageBps: mvaAppliedBps,
        sourceCodes: ["MG-RICMS-ANNEX-VII"],
        status: "parameter",
      },
      {
        code: "ST-PRESUMED-BASE",
        label: "Base presumida do ICMS-ST",
        formula: "composição da operação × (1 + MVA aplicada)",
        basis: "RICMS/MG, Anexo VII, Parte 1, art. 20, I, b, 2",
        amountCents: stBaseCents,
        percentageBps: mvaAppliedBps,
        sourceCodes: ["MG-RICMS-ANNEX-VII"],
        status: "calculated",
      },
      {
        code: "ST-PRESUMED-INTERNAL-ICMS",
        label: "ICMS presumido nas operações internas",
        formula: "base presumida × alíquota interna confirmada",
        basis: "RICMS/MG, Anexo VII, Parte 1, art. 22, I",
        amountCents: presumedInternalIcmsCents,
        percentageBps: inputs.internalRateBps,
        sourceCodes: ["MG-RICMS-ANNEX-VII", "MG-RICMS-ANNEX-I"],
        status: "calculated",
      },
      {
        code: "ICMS-ST-DUE",
        label: "ICMS-ST condicionado",
        formula: "ICMS presumido interno − parcela da operação própria",
        basis: "RICMS/MG, Anexo VII, Parte 1, art. 22, I",
        amountCents: icmsStCents,
        percentageBps: null,
        sourceCodes: ["MG-RICMS-ANNEX-VII"],
        status: "calculated",
      },
      {
        code: "FCP-ST",
        label: "FCP-ST conforme parâmetro confirmado",
        formula: "base presumida × percentual de FCP informado",
        basis: "Parâmetro declarado pelo responsável; conferir incidência específica da mercadoria",
        amountCents: fcpCents,
        percentageBps: inputs.fcpRateBps,
        sourceCodes: [],
        status: inputs.fcpRateBps ? "calculated" : "not_applicable",
      },
    );
    return {
      schemaVersion: "fiscal-calculation-memory.v1",
      engineVersion: FISCAL_DOSSIER_ENGINE_VERSION,
      status: "calculated_conditional",
      statusLabel: "Memória calculada · revisão obrigatória",
      legalEffect: "technical_memory_not_filing_instruction",
      calculationType: "icms_st_resale",
      inputs,
      parameters: { interstateRateBps, internalRateBps: inputs.internalRateBps, fcpRateBps: inputs.fcpRateBps, mvaOriginalBps, mvaAppliedBps, mvaWasAdjusted: shouldAdjustMva },
      totals: { operationCompositionCents, ownIcmsReferenceCents, stBaseCents, presumedInternalIcmsCents, icmsStCents, difalCents: null, fcpCents, destinationTotalCents },
      lines,
      blockers,
      warnings,
      requiredConfirmations,
      disclaimer: "Memória técnica condicionada aos fatos e parâmetros declarados. Exige revisão do contador antes de emissão, recolhimento, escrituração ou entrega ao cliente.",
    };
  }

  if (result.facts.purpose === "use_consumption" || result.facts.purpose === "fixed_asset") {
    const grossedInternalBaseCents = roundDivide((operationCompositionCents - ownIcmsReferenceCents) * 10_000, 10_000 - inputs.internalRateBps);
    const internalIcmsCents = multiplyByBps(grossedInternalBaseCents, inputs.internalRateBps);
    const originReferenceCents = multiplyByBps(operationCompositionCents, interstateRateBps!);
    const difalCents = Math.max(0, internalIcmsCents - originReferenceCents);
    const fcpCents = multiplyByBps(grossedInternalBaseCents, inputs.fcpRateBps);
    lines.push({
      code: "ICMS-ST-DIFAL",
      label: "Diferencial para uso, consumo ou ativo",
      formula: "[(V oper − ICMS origem) ÷ (1 − alíquota interna)] × alíquota interna − (V oper × alíquota interestadual)",
      basis: "RICMS/MG, Anexo VII, Parte 1, art. 22, II",
      amountCents: difalCents,
      percentageBps: null,
      sourceCodes: ["MG-RICMS-ANNEX-VII"],
      status: "calculated",
    });
    return {
      schemaVersion: "fiscal-calculation-memory.v1",
      engineVersion: FISCAL_DOSSIER_ENGINE_VERSION,
      status: "calculated_conditional",
      statusLabel: "DIFAL calculado · revisão obrigatória",
      legalEffect: "technical_memory_not_filing_instruction",
      calculationType: "icms_st_difal",
      inputs,
      parameters: { interstateRateBps, internalRateBps: inputs.internalRateBps, fcpRateBps: inputs.fcpRateBps, mvaOriginalBps, mvaAppliedBps: null, mvaWasAdjusted: false },
      totals: { operationCompositionCents, ownIcmsReferenceCents, stBaseCents: grossedInternalBaseCents, presumedInternalIcmsCents: internalIcmsCents, icmsStCents: null, difalCents, fcpCents, destinationTotalCents: difalCents + fcpCents },
      lines,
      blockers,
      warnings,
      requiredConfirmations,
      disclaimer: "DIFAL técnico condicionado aos valores informados. A incidência de FCP e particularidades do adquirente devem ser confirmadas pelo contador.",
    };
  }

  lines.push({
    code: "ST-NOT-APPLIED",
    label: "ICMS-ST não calculado",
    formula: "sem fórmula de operações subsequentes",
    basis: "Finalidade ou enquadramento informado não acionou a memória de ST",
    amountCents: null,
    percentageBps: null,
    sourceCodes: ["CONFAZ-PROTOCOL-41-2008"],
    status: "not_applicable",
  });
  return {
    schemaVersion: "fiscal-calculation-memory.v1",
    engineVersion: FISCAL_DOSSIER_ENGINE_VERSION,
    status: "calculated_conditional",
    statusLabel: "Referência própria calculada · sem ST",
    legalEffect: "technical_memory_not_filing_instruction",
    calculationType: "own_icms_reference",
    inputs,
    parameters: { interstateRateBps, internalRateBps: inputs.internalRateBps, fcpRateBps: inputs.fcpRateBps, mvaOriginalBps, mvaAppliedBps: null, mvaWasAdjusted: false },
    totals: { ...initialTotals, ownIcmsReferenceCents, destinationTotalCents: 0 },
    lines,
    blockers,
    warnings,
    requiredConfirmations,
    disclaimer: "Apenas a referência da operação própria foi calculada. A ausência de ST nesta memória precisa ser confirmada pelo responsável.",
  };
}

export async function createFiscalDossierSnapshot(question: string, result: FiscalIntelligenceResult, inputs: FiscalCalculationInputs, generatedAt = new Date().toISOString()) {
  const calculation = calculateFiscalMemory(result, inputs);
  const snapshot: FiscalDossierSnapshot = {
    schemaVersion: FISCAL_DOSSIER_SCHEMA_VERSION,
    engineVersion: FISCAL_DOSSIER_ENGINE_VERSION,
    generatedAt,
    title: `${result.facts.productDescription ?? "Autopeça"} · ${result.facts.originState ?? "?"}→${result.facts.destinationState ?? "?"}`,
    question,
    scope: `${result.baseCode}:${result.baseVersion}`,
    assurance: {
      level: "professional_review_required",
      factsComplete: result.completeness.percentage === 100,
      ratesConfirmed: inputs.ratesConfirmed,
      calculationStatus: calculation.status,
      reviewRequired: true,
    },
    determination: {
      status: result.status,
      headline: result.headline,
      summary: result.summary,
      baseCode: result.baseCode,
      baseVersion: result.baseVersion,
      engineVersion: result.engineVersion,
      facts: result.facts,
      findings: result.findings,
      decisionTrace: result.decisionTrace,
    },
    calculation,
    evidence: { sources: result.sources, limitations: result.limitations },
  };
  const serialized = JSON.stringify(snapshot);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(serialized));
  const inputHash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return { snapshot, inputHash };
}

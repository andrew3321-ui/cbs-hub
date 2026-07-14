export type FiscalRuleStatus = "draft" | "in_review" | "approved" | "retired";

export type FiscalRuleDefinition = {
  schemaVersion: "fiscal-rule.v1";
  ruleCode: string;
  version: string;
  jurisdiction: "BR";
  effectiveFrom: string;
  effectiveTo: string;
  executionMode: "reference_only" | "calculation";
  operationScope: "standard_operations";
  components: Array<{ tax: "CBS" | "IBS"; rateBps: number }>;
  treatment: {
    compliantAncillaryObligations: "conditional_waiver";
    otherwise: "offset_against_pis_cofins";
    automaticNetPayableCalculation: false;
  };
  limitations: string[];
  sources: Array<{ title: string; url: string; publisher: string; sourceUpdatedAt: string | null; checkedAt: string }>;
};

export type FiscalReferenceInput = {
  taxableBaseCents: number;
  ancillaryObligationsStatus: "confirmed_compliant" | "not_confirmed";
};

export type FiscalReferenceOutput = {
  cbsHighlightedCents: number;
  ibsHighlightedCents: number;
  totalHighlightedCents: number;
  collectionTreatment: "conditional_waiver" | "offset_against_pis_cofins";
  netPayableCents: null;
};

export type FiscalReferenceCase = {
  code: string;
  title: string;
  input: FiscalReferenceInput;
  expected: FiscalReferenceOutput;
};

export const rtc2026TestRule: FiscalRuleDefinition = {
  schemaVersion: "fiscal-rule.v1",
  ruleCode: "RTC-BR-2026-TEST",
  version: "1.0.0",
  jurisdiction: "BR",
  effectiveFrom: "2026-01-01",
  effectiveTo: "2026-12-31",
  executionMode: "reference_only",
  operationScope: "standard_operations",
  components: [
    { tax: "CBS", rateBps: 90 },
    { tax: "IBS", rateBps: 10 },
  ],
  treatment: {
    compliantAncillaryObligations: "conditional_waiver",
    otherwise: "offset_against_pis_cofins",
    automaticNetPayableCalculation: false,
  },
  limitations: [
    "Não classifica NCM, NBS, CST ou cClassTrib.",
    "Não decide se as obrigações acessórias foram integralmente cumpridas.",
    "Não calcula saldo líquido de PIS/Cofins ou valor efetivamente recolhível.",
    "Não abrange regimes diferenciados, específicos, imunidades ou reduções.",
  ],
  sources: [
    {
      title: "Entenda a Reforma Tributária do Consumo",
      url: "https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/reforma-tributaria-do-consumo/entenda",
      publisher: "Receita Federal",
      sourceUpdatedAt: "2026-07-03",
      checkedAt: "2026-07-14",
    },
    {
      title: "Orientações da Reforma Tributária para 2026",
      url: "https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/reforma-tributaria-do-consumo/orientacoes-2026",
      publisher: "Receita Federal",
      sourceUpdatedAt: "2026-05-06",
      checkedAt: "2026-07-14",
    },
    {
      title: "Lei Complementar nº 214/2025",
      url: "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214compilado.htm",
      publisher: "Presidência da República",
      sourceUpdatedAt: null,
      checkedAt: "2026-07-14",
    },
  ],
};

export const rtc2026ReferenceCases: FiscalReferenceCase[] = [
  {
    code: "BASE-100K-NOT-CONFIRMED",
    title: "Base de R$ 100 mil sem confirmação de obrigações",
    input: { taxableBaseCents: 10_000_000, ancillaryObligationsStatus: "not_confirmed" },
    expected: { cbsHighlightedCents: 90_000, ibsHighlightedCents: 10_000, totalHighlightedCents: 100_000, collectionTreatment: "offset_against_pis_cofins", netPayableCents: null },
  },
  {
    code: "BASE-100K-COMPLIANT",
    title: "Base de R$ 100 mil com conformidade confirmada",
    input: { taxableBaseCents: 10_000_000, ancillaryObligationsStatus: "confirmed_compliant" },
    expected: { cbsHighlightedCents: 90_000, ibsHighlightedCents: 10_000, totalHighlightedCents: 100_000, collectionTreatment: "conditional_waiver", netPayableCents: null },
  },
  {
    code: "ROUNDING-1234-56",
    title: "Arredondamento monetário sobre R$ 1.234,56",
    input: { taxableBaseCents: 123_456, ancillaryObligationsStatus: "not_confirmed" },
    expected: { cbsHighlightedCents: 1_111, ibsHighlightedCents: 123, totalHighlightedCents: 1_234, collectionTreatment: "offset_against_pis_cofins", netPayableCents: null },
  },
];

export const rtc2026RuleSeed = {
  code: rtc2026TestRule.ruleCode,
  version: rtc2026TestRule.version,
  name: "RTC 2026 · alíquotas de teste",
  jurisdiction: rtc2026TestRule.jurisdiction,
  status: "in_review" as FiscalRuleStatus,
  effectiveFrom: rtc2026TestRule.effectiveFrom,
  effectiveTo: rtc2026TestRule.effectiveTo,
  contentJson: JSON.stringify(rtc2026TestRule),
  sourceCount: rtc2026TestRule.sources.length,
};

export function evaluateFiscalReference(definition: FiscalRuleDefinition, input: FiscalReferenceInput): FiscalReferenceOutput {
  assertFiscalRuleDefinition(definition);
  if (definition.ruleCode !== "RTC-BR-2026-TEST") throw new Error("unsupported_fiscal_rule");
  if (!Number.isInteger(input.taxableBaseCents) || input.taxableBaseCents < 0 || input.taxableBaseCents > 100_000_000_000) throw new Error("invalid_taxable_base");
  if (input.ancillaryObligationsStatus !== "confirmed_compliant" && input.ancillaryObligationsStatus !== "not_confirmed") throw new Error("invalid_ancillary_obligations_status");
  const rate = (tax: "CBS" | "IBS") => definition.components.find((component) => component.tax === tax)?.rateBps ?? 0;
  const cbsHighlightedCents = Math.round(input.taxableBaseCents * rate("CBS") / 10_000);
  const ibsHighlightedCents = Math.round(input.taxableBaseCents * rate("IBS") / 10_000);
  return {
    cbsHighlightedCents,
    ibsHighlightedCents,
    totalHighlightedCents: cbsHighlightedCents + ibsHighlightedCents,
    collectionTreatment: input.ancillaryObligationsStatus === "confirmed_compliant" ? definition.treatment.compliantAncillaryObligations : definition.treatment.otherwise,
    netPayableCents: null,
  };
}

export function parseFiscalRuleDefinition(value: string) {
  const parsed = JSON.parse(value) as FiscalRuleDefinition;
  assertFiscalRuleDefinition(parsed);
  return parsed;
}

function assertFiscalRuleDefinition(definition: FiscalRuleDefinition) {
  const componentTaxes = Array.isArray(definition?.components) ? definition.components.map((component) => component.tax) : [];
  const componentsValid = componentTaxes.length === 2
    && new Set(componentTaxes).size === 2
    && componentTaxes.includes("CBS")
    && componentTaxes.includes("IBS")
    && definition.components.every((component) => Number.isInteger(component.rateBps) && component.rateBps >= 0 && component.rateBps <= 10_000);
  const sourcesValid = Array.isArray(definition?.sources)
    && definition.sources.length > 0
    && definition.sources.every((source) => source.title && source.publisher && /^https:\/\//.test(source.url) && /^\d{4}-\d{2}-\d{2}$/.test(source.checkedAt));
  if (
    definition?.schemaVersion !== "fiscal-rule.v1"
    || definition.jurisdiction !== "BR"
    || !/^\d{4}-\d{2}-\d{2}$/.test(definition.effectiveFrom)
    || !/^\d{4}-\d{2}-\d{2}$/.test(definition.effectiveTo)
    || !["reference_only", "calculation"].includes(definition.executionMode)
    || definition.operationScope !== "standard_operations"
    || definition.treatment?.automaticNetPayableCalculation !== false
    || !Array.isArray(definition.limitations)
    || !componentsValid
    || !sourcesValid
  ) throw new Error("invalid_fiscal_rule_definition");
}

export async function hashFiscalRuleContent(contentJson: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(contentJson));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function referenceCasePasses(definition: FiscalRuleDefinition, referenceCase: FiscalReferenceCase) {
  return JSON.stringify(evaluateFiscalReference(definition, referenceCase.input)) === JSON.stringify(referenceCase.expected);
}

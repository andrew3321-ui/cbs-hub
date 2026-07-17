import { resolveInterstateIcms, type UfCode } from "./national-tax-coverage.ts";

export const DETERMINISTIC_TAX_LAB_VERSION = "2026.07.17-v31";
export const DETERMINISTIC_TAX_LAB_CHECKED_AT = "2026-07-17";

export type LabModule = "simples_annex_i" | "pis_cofins" | "iss" | "icms_difal" | "rtc_2026";
export type LabIssue = { code: string; severity: "blocker" | "warning"; message: string };
export type LabLine = { code: string; label: string; formula: string; amountCents: number | null; rateBps?: number | null };
export type LabSource = { code: string; title: string; publisher: string; url: string; checkedAt: string };
export type LabResult = {
  module: LabModule;
  title: string;
  status: "calculated_reference" | "blocked" | "not_supported";
  summary: string;
  lines: LabLine[];
  issues: LabIssue[];
  sources: LabSource[];
  facts: Array<{ label: string; confirmed: boolean }>;
  engineVersion: string;
  disclaimer: string;
};

const checkedAt = DETERMINISTIC_TAX_LAB_CHECKED_AT;
export const labSources = {
  simples: { code: "LC-123-2006", title: "Lei Complementar nº 123/2006 — Anexo I", publisher: "Presidência da República", url: "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm", checkedAt },
  pgdas: { code: "CGSN-140-2018", title: "Resolução CGSN nº 140/2018", publisher: "Receita Federal", url: "https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=92278&naoPublicado=&visao=original", checkedAt },
  pisCofins: { code: "RFB-PIS-COFINS", title: "Orientações sobre PIS/Pasep e Cofins", publisher: "Receita Federal", url: "https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/tributos/pis-pasep-cofins", checkedAt },
  pisLaw: { code: "LEI-10637-2002", title: "Lei nº 10.637/2002", publisher: "Presidência da República", url: "https://www.planalto.gov.br/ccivil_03/leis/2002/l10637compilado.htm", checkedAt },
  cofinsLaw: { code: "LEI-9718-1998", title: "Lei nº 9.718/1998", publisher: "Presidência da República", url: "https://www.planalto.gov.br/ccivil_03/leis/l9718compilada.htm", checkedAt },
  iss: { code: "LC-116-2003", title: "Lei Complementar nº 116/2003", publisher: "Presidência da República", url: "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp116.htm", checkedAt },
  difal: { code: "LC-190-2022", title: "Lei Complementar nº 190/2022", publisher: "Presidência da República", url: "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp190.htm", checkedAt },
  rtc: { code: "RFB-RTC-2026", title: "Entenda a Reforma Tributária do Consumo", publisher: "Receita Federal", url: "https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/reforma-tributaria-do-consumo/entenda", checkedAt },
  rtcCalculator: { code: "RTC-CALCULATOR", title: "Calculadora oficial de tributos sobre consumo", publisher: "Receita Federal", url: "https://consumo.tributos.gov.br/servico/calcular-tributos-consumo/calculadora/regime-geral", checkedAt },
} satisfies Record<string, LabSource>;

const disclaimer = "Referência matemática determinística, sem IA. A conclusão fiscal depende dos fatos, da legislação vigente e da aprovação do profissional responsável.";

function safeInteger(value: unknown, field: string, min = 0, max = Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(value) || Number(value) < min || Number(value) > max) throw new Error(`invalid_${field}`);
  return Number(value);
}

export function multiplyCentsByBps(cents: number, bps: number) {
  safeInteger(cents, "cents"); safeInteger(bps, "bps", 0, 10000);
  return Number((BigInt(cents) * BigInt(bps) + BigInt(5000)) / BigInt(10000));
}

function facts(items: Array<[string, boolean]>) {
  return items.map(([label, confirmed]) => ({ label, confirmed }));
}

function missingFacts(items: Array<{ label: string; confirmed: boolean }>) {
  return items.filter((item) => !item.confirmed).map((item, index) => ({ code: `fact_${index + 1}`, severity: "blocker" as const, message: `Confirme: ${item.label}.` }));
}

function result(module: LabModule, title: string, lines: LabLine[], issues: LabIssue[], sources: LabSource[], verifiedFacts: LabResult["facts"], summary: string): LabResult {
  return { module, title, status: issues.some((item) => item.severity === "blocker") ? "blocked" : "calculated_reference", summary, lines, issues, sources, facts: verifiedFacts, engineVersion: DETERMINISTIC_TAX_LAB_VERSION, disclaimer };
}

const annexI = [
  { from: 0, to: 18_000_000, nominalBps: 400, deductionCents: 0 },
  { from: 18_000_001, to: 36_000_000, nominalBps: 730, deductionCents: 594_000 },
  { from: 36_000_001, to: 72_000_000, nominalBps: 950, deductionCents: 1_386_000 },
  { from: 72_000_001, to: 180_000_000, nominalBps: 1070, deductionCents: 2_250_000 },
  { from: 180_000_001, to: 360_000_000, nominalBps: 1430, deductionCents: 8_730_000 },
  { from: 360_000_001, to: 480_000_000, nominalBps: 1900, deductionCents: 37_800_000 },
] as const;

export type SimplesAnnexIInput = { rbt12Cents: number; monthlySegregatedRevenueCents: number; annexConfirmed: boolean; revenueSegregated: boolean; periodClosed: boolean; noSpecialTreatment: boolean };
export function calculateSimplesAnnexI(input: SimplesAnnexIInput): LabResult {
  const rbt12 = safeInteger(input.rbt12Cents, "rbt12", 1, 480_000_000);
  const revenue = safeInteger(input.monthlySegregatedRevenueCents, "revenue");
  const bracketIndex = annexI.findIndex((item) => rbt12 >= item.from && rbt12 <= item.to);
  const bracket = annexI[bracketIndex];
  if (!bracket) throw new Error("rbt12_out_of_annex_i");
  const numerator = BigInt(rbt12) * BigInt(bracket.nominalBps) - BigInt(bracket.deductionCents) * BigInt(10000);
  const effectiveRatePpm = Number((numerator * BigInt(100) + BigInt(rbt12) / BigInt(2)) / BigInt(rbt12));
  const estimatedCents = Number((BigInt(revenue) * BigInt(effectiveRatePpm) + BigInt(500_000)) / BigInt(1_000_000));
  const verifiedFacts = facts([["atividade de comércio enquadrada no Anexo I", input.annexConfirmed], ["receita do mês segregada por tratamento tributário", input.revenueSegregated], ["RBT12 e período conferidos", input.periodClosed], ["ST, monofásico, antecipação, exportação e demais tratamentos especiais excluídos", input.noSpecialTreatment]]);
  const issues: LabIssue[] = [...missingFacts(verifiedFacts), { code: "pgdas_required", severity: "warning", message: "O valor exibido é uma referência do Anexo I e deve ser reconciliado com o PGDAS-D e a segregação efetiva da receita." }];
  const effectiveRateBps = Math.round(effectiveRatePpm / 100);
  return result("simples_annex_i", "Simples Nacional — Anexo I", [
    { code: "rbt12", label: "Receita bruta acumulada em 12 meses", formula: "RBT12 informada", amountCents: rbt12 },
    { code: "nominal", label: `Alíquota nominal — faixa ${bracketIndex + 1}`, formula: "Tabela oficial do Anexo I", amountCents: null, rateBps: bracket.nominalBps },
    { code: "deduction", label: "Parcela a deduzir", formula: "Tabela oficial do Anexo I", amountCents: bracket.deductionCents },
    { code: "effective", label: "Alíquota efetiva de referência", formula: "(RBT12 × alíquota nominal − parcela a deduzir) ÷ RBT12", amountCents: null, rateBps: effectiveRateBps },
    { code: "das_reference", label: "DAS estimado sobre a receita segregada", formula: "Receita segregada × alíquota efetiva", amountCents: estimatedCents, rateBps: effectiveRateBps },
  ], issues, [labSources.simples, labSources.pgdas], verifiedFacts, `Faixa ${bracketIndex + 1}; alíquota efetiva aproximada de ${(effectiveRatePpm / 10000).toFixed(4)}%.`);
}

export type PisCofinsInput = { regime: "cumulative" | "non_cumulative"; taxableRevenueCents: number; eligibleCreditBaseCents: number; regimeConfirmed: boolean; revenueClassified: boolean; specialTreatmentsExcluded: boolean; creditsDocumented: boolean };
export function calculatePisCofins(input: PisCofinsInput): LabResult {
  const revenue = safeInteger(input.taxableRevenueCents, "taxable_revenue");
  const creditBase = safeInteger(input.eligibleCreditBaseCents, "credit_base", 0, revenue * 20 + 1);
  if (!(["cumulative", "non_cumulative"] as string[]).includes(input.regime)) throw new Error("invalid_regime");
  const nonCumulative = input.regime === "non_cumulative";
  const pisRate = nonCumulative ? 165 : 65;
  const cofinsRate = nonCumulative ? 760 : 300;
  const pisDebit = multiplyCentsByBps(revenue, pisRate);
  const cofinsDebit = multiplyCentsByBps(revenue, cofinsRate);
  const pisCredit = nonCumulative ? multiplyCentsByBps(creditBase, pisRate) : 0;
  const cofinsCredit = nonCumulative ? multiplyCentsByBps(creditBase, cofinsRate) : 0;
  const verifiedFacts = facts([["regime cumulativo ou não cumulativo confirmado", input.regimeConfirmed], ["receitas tributadas corretamente classificadas", input.revenueClassified], ["monofásico, alíquota zero, suspensão, exportação e exceções excluídos", input.specialTreatmentsExcluded], ["créditos possuem hipótese legal e documento", !nonCumulative || input.creditsDocumented]]);
  const issues: LabIssue[] = [...missingFacts(verifiedFacts)];
  if (!nonCumulative && creditBase > 0) issues.push({ code: "credit_ignored", severity: "warning", message: "A base de crédito foi ignorada no regime cumulativo." });
  return result("pis_cofins", "PIS/Pasep e Cofins", [
    { code: "pis_debit", label: "PIS/Pasep sobre receitas", formula: "Receita tributável × alíquota padrão", amountCents: pisDebit, rateBps: pisRate },
    { code: "cofins_debit", label: "Cofins sobre receitas", formula: "Receita tributável × alíquota padrão", amountCents: cofinsDebit, rateBps: cofinsRate },
    { code: "pis_credit", label: "Crédito de PIS/Pasep informado", formula: nonCumulative ? "Base elegível confirmada × 1,65%" : "Não aplicável ao cumulativo", amountCents: pisCredit, rateBps: nonCumulative ? pisRate : 0 },
    { code: "cofins_credit", label: "Crédito de Cofins informado", formula: nonCumulative ? "Base elegível confirmada × 7,60%" : "Não aplicável ao cumulativo", amountCents: cofinsCredit, rateBps: nonCumulative ? cofinsRate : 0 },
    { code: "balance", label: "Saldo matemático de referência", formula: "Débitos − créditos informados", amountCents: Math.max(0, pisDebit + cofinsDebit - pisCredit - cofinsCredit), rateBps: null },
  ], issues, [labSources.pisCofins, labSources.pisLaw, labSources.cofinsLaw], verifiedFacts, `${nonCumulative ? "Regime não cumulativo" : "Regime cumulativo"}; separação auditável entre débitos e créditos.`);
}

export type IssInput = { serviceBaseCents: number; deductionsCents: number; municipalRateBps: number; withheld: boolean; serviceItemConfirmed: boolean; placeConfirmed: boolean; municipalRateConfirmed: boolean; municipalLawReference: string };
export function calculateIss(input: IssInput): LabResult {
  const base = safeInteger(input.serviceBaseCents, "service_base");
  const deductions = safeInteger(input.deductionsCents, "deductions", 0, base);
  const rate = safeInteger(input.municipalRateBps, "municipal_rate", 200, 500);
  const netBase = base - deductions;
  const tax = multiplyCentsByBps(netBase, rate);
  const lawConfirmed = String(input.municipalLawReference ?? "").trim().length >= 8;
  const verifiedFacts = facts([["item do serviço na lista da LC 116 confirmado", input.serviceItemConfirmed], ["município de incidência e responsabilidade confirmados", input.placeConfirmed], ["alíquota conferida na lei municipal vigente", input.municipalRateConfirmed], ["referência da lei municipal registrada", lawConfirmed]]);
  const issues: LabIssue[] = [...missingFacts(verifiedFacts)];
  if (deductions > 0) issues.push({ code: "deduction_review", severity: "warning", message: "Toda dedução da base do ISS exige hipótese legal e documentação." });
  return result("iss", "ISS — cálculo municipal parametrizado", [
    { code: "gross_base", label: "Preço do serviço informado", formula: "Base bruta", amountCents: base },
    { code: "deductions", label: "Deduções documentadas", formula: "Deduções informadas", amountCents: deductions },
    { code: "net_base", label: "Base líquida de referência", formula: "Base bruta − deduções", amountCents: netBase },
    { code: "iss", label: input.withheld ? "ISS retido pelo tomador" : "ISS de referência do prestador", formula: "Base líquida × alíquota municipal confirmada", amountCents: tax, rateBps: rate },
    { code: "provider_payable", label: "Valor atribuído ao prestador neste fluxo", formula: input.withheld ? "Retenção integral informada" : "Sem retenção informada", amountCents: input.withheld ? 0 : tax },
  ], issues, [labSources.iss], verifiedFacts, `Alíquota municipal parametrizada de ${(rate / 100).toFixed(2)}%; o sistema não inventa a taxa do município.`);
}

export type IcmsDifalInput = { baseCents: number; origin: UfCode; destination: UfCode; importedQualified: boolean; destinationInternalRateBps: number; fcpRateBps: number; finalConsumer: boolean; recipientNonTaxpayer: boolean; destinationLawReference: string; ratesConfirmed: boolean };
export function calculateIcmsDifal(input: IcmsDifalInput): LabResult {
  const base = safeInteger(input.baseCents, "base");
  const internalRate = safeInteger(input.destinationInternalRateBps, "internal_rate", 0, 4000);
  const fcpRate = safeInteger(input.fcpRateBps, "fcp_rate", 0, 500);
  const interstate = resolveInterstateIcms(input.origin, input.destination, input.importedQualified);
  const interstateRate = interstate.rateBps ?? 0;
  const difalRate = Math.max(0, internalRate - interstateRate);
  const lawConfirmed = String(input.destinationLawReference ?? "").trim().length >= 8;
  const verifiedFacts = facts([["destinatário é consumidor final", input.finalConsumer], ["destinatário não é contribuinte do ICMS", input.recipientNonTaxpayer], ["alíquota interna e FCP do destino foram conferidos", input.ratesConfirmed], ["referência oficial da UF de destino registrada", lawConfirmed], ["origem e destino são UFs diferentes", input.origin !== input.destination]]);
  const issues: LabIssue[] = [...missingFacts(verifiedFacts), { code: "basis_method", severity: "warning", message: "Memória pela diferença simples. Base por dentro, benefício, redução, produto, FCP e regras da UF podem alterar o resultado." }];
  if (internalRate < interstateRate) issues.push({ code: "rate_inconsistency", severity: "blocker", message: "A alíquota interna informada é menor que a interestadual; revise os fatos antes de usar a memória." });
  return result("icms_difal", "ICMS — comparativo-base de DIFAL", [
    { code: "interstate", label: "ICMS interestadual de referência", formula: "Base × alíquota interestadual", amountCents: multiplyCentsByBps(base, interstateRate), rateBps: interstateRate },
    { code: "difal", label: "Diferencial de alíquotas — diferença simples", formula: "Base × (alíquota interna − interestadual)", amountCents: multiplyCentsByBps(base, difalRate), rateBps: difalRate },
    { code: "fcp", label: "FCP parametrizado", formula: "Base × alíquota FCP confirmada", amountCents: multiplyCentsByBps(base, fcpRate), rateBps: fcpRate },
    { code: "destination_total", label: "Total matemático atribuído ao destino", formula: "DIFAL + FCP", amountCents: multiplyCentsByBps(base, difalRate) + multiplyCentsByBps(base, fcpRate) },
  ], issues, [labSources.difal], verifiedFacts, `${input.origin} → ${input.destination}; interestadual de ${(interstateRate / 100).toFixed(2)}% e diferença simples de ${(difalRate / 100).toFixed(2)}%.`);
}

export type Rtc2026Input = { taxableOperationCents: number; pisCofinsPayableCents: number; yearConfirmed: boolean; accessoryObligationsConfirmed: boolean; operationClassified: boolean };
export function calculateRtc2026(input: Rtc2026Input): LabResult {
  const base = safeInteger(input.taxableOperationCents, "taxable_operation");
  const pisCofins = safeInteger(input.pisCofinsPayableCents, "pis_cofins_payable");
  const cbs = multiplyCentsByBps(base, 90);
  const ibs = multiplyCentsByBps(base, 10);
  const total = cbs + ibs;
  const verifiedFacts = facts([["período de teste de 2026 confirmado", input.yearConfirmed], ["operação enquadrada e base confirmada", input.operationClassified], ["obrigações acessórias e condições de dispensa/compensação verificadas", input.accessoryObligationsConfirmed]]);
  const issues: LabIssue[] = [...missingFacts(verifiedFacts), { code: "official_calculator", severity: "warning", message: "Reconcilie a memória com a Calculadora oficial da Reforma Tributária do Consumo." }];
  return result("rtc_2026", "Reforma Tributária — referência do teste de 2026", [
    { code: "cbs", label: "CBS destacada de referência", formula: "Base informada × 0,90%", amountCents: cbs, rateBps: 90 },
    { code: "ibs", label: "IBS destacado de referência", formula: "Base informada × 0,10%", amountCents: ibs, rateBps: 10 },
    { code: "total", label: "Total destacado no teste", formula: "CBS + IBS", amountCents: total, rateBps: 100 },
    { code: "compensation_limit", label: "Limite matemático comparável a PIS/Cofins", formula: "Menor entre destaque CBS/IBS e PIS/Cofins informado", amountCents: Math.min(total, pisCofins) },
    { code: "net_payable", label: "Valor líquido a recolher", formula: "Não determinado: depende das condições legais e acessórias", amountCents: null },
  ], issues, [labSources.rtc, labSources.rtcCalculator], verifiedFacts, "Destaques de teste de 0,90% CBS e 0,10% IBS; nenhum valor líquido é presumido pelo motor.");
}

export type LabInput =
  | ({ module: "simples_annex_i" } & SimplesAnnexIInput)
  | ({ module: "pis_cofins" } & PisCofinsInput)
  | ({ module: "iss" } & IssInput)
  | ({ module: "icms_difal" } & IcmsDifalInput)
  | ({ module: "rtc_2026" } & Rtc2026Input);

export function calculateTaxLab(input: LabInput): LabResult {
  switch (input.module) {
    case "simples_annex_i": return calculateSimplesAnnexI(input);
    case "pis_cofins": return calculatePisCofins(input);
    case "iss": return calculateIss(input);
    case "icms_difal": return calculateIcmsDifal(input);
    case "rtc_2026": return calculateRtc2026(input);
    default: throw new Error("unsupported_module");
  }
}

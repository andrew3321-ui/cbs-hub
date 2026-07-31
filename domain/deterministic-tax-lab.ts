import { resolveInterstateIcms, type UfCode } from "./national-tax-coverage.ts";

export const DETERMINISTIC_TAX_LAB_VERSION = "2026.07.27-v33";
export const DETERMINISTIC_TAX_LAB_CHECKED_AT = "2026-07-27";

export type LabModule = "simples_annex_i" | "simples_services" | "pis_cofins" | "pis_cofins_special" | "presumed_profit_2026" | "real_profit_federal" | "federal_withholdings" | "ipi_tipi" | "iss" | "icms_difal" | "rtc_2026";
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
  simples: { code: "LC-123-2006", title: "Lei Complementar nº 123/2006 — Anexos I, III e V", publisher: "Presidência da República", url: "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm", checkedAt },
  pgdas: { code: "CGSN-140-2018", title: "Resolução CGSN nº 140/2018 — versão anotada", publisher: "Receita Federal", url: "https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=92278&visao=anotado", checkedAt },
  irpj: { code: "RFB-IRPJ", title: "IRPJ — alíquotas e adicional", publisher: "Receita Federal", url: "https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/tributos/IRPJ", checkedAt },
  csll: { code: "RFB-CSLL", title: "CSLL — resultado presumido", publisher: "Receita Federal", url: "https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/tributos/CSLL", checkedAt },
  lc224: { code: "LC-224-2025", title: "Lei Complementar nº 224/2025", publisher: "Presidência da República", url: "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp224.htm", checkedAt },
  decree12808: { code: "D-12808-2025", title: "Decreto nº 12.808/2025", publisher: "Presidência da República", url: "https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/decreto/d12808.htm", checkedAt },
  presumedFaq2026: { code: "RFB-BENEFITS-FAQ-V4", title: "Perguntas e respostas — redução de incentivos e benefícios V4", publisher: "Receita Federal", url: "https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/perguntas-e-respostas/beneficios-fiscais/perguntas-e-respostas-reducao-dos-incentivos-e-beneficios-tributarios.pdf/@@download/file", checkedAt },
  pisCofins: { code: "RFB-PIS-COFINS", title: "Orientações sobre PIS/Pasep e Cofins", publisher: "Receita Federal", url: "https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/tributos/pis-pasep-cofins", checkedAt },
  cumulativePisCofinsLaw: { code: "LEI-9718-1998", title: "Lei nº 9.718/1998 — regime cumulativo", publisher: "Presidência da República", url: "https://www.planalto.gov.br/ccivil_03/leis/l9718compilada.htm", checkedAt },
  pisNonCumulativeLaw: { code: "LEI-10637-2002", title: "Lei nº 10.637/2002 — PIS não cumulativo", publisher: "Presidência da República", url: "https://www.planalto.gov.br/ccivil_03/leis/2002/l10637compilado.htm", checkedAt },
  cofinsNonCumulativeLaw: { code: "LEI-10833-2003", title: "Lei nº 10.833/2003 — Cofins não cumulativa", publisher: "Presidência da República", url: "https://www.planalto.gov.br/ccivil_03/leis/2003/l10.833.htm", checkedAt },
  law9430: { code: "LEI-9430-1996", title: "Lei nº 9.430/1996", publisher: "Presidência da República", url: "https://www.planalto.gov.br/ccivil_03/leis/l9430.htm", checkedAt },
  rir2018: { code: "D-9580-2018", title: "Decreto nº 9.580/2018", publisher: "Presidência da República", url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/decreto/d9580.htm", checkedAt },
  inssCessao: { code: "LEI-8212-1991", title: "Lei nº 8.212/1991", publisher: "Presidência da República", url: "https://www.planalto.gov.br/ccivil_03/leis/l8212cons.htm", checkedAt },
  ipi: { code: "RFB-TIPI-2026", title: "TIPI", publisher: "Receita Federal", url: "https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/legislacao/tipi-tabela-de-incidencia-do-imposto-sobre-produtos-industrializados", checkedAt },
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

const annexIII = [
  { from: 0, to: 18_000_000, nominalBps: 600, deductionCents: 0 },
  { from: 18_000_001, to: 36_000_000, nominalBps: 1120, deductionCents: 936_000 },
  { from: 36_000_001, to: 72_000_000, nominalBps: 1350, deductionCents: 1_764_000 },
  { from: 72_000_001, to: 180_000_000, nominalBps: 1600, deductionCents: 3_564_000 },
  { from: 180_000_001, to: 360_000_000, nominalBps: 2100, deductionCents: 12_564_000 },
  { from: 360_000_001, to: 480_000_000, nominalBps: 3300, deductionCents: 64_800_000 },
] as const;

const annexV = [
  { from: 0, to: 18_000_000, nominalBps: 1550, deductionCents: 0 },
  { from: 18_000_001, to: 36_000_000, nominalBps: 1800, deductionCents: 450_000 },
  { from: 36_000_001, to: 72_000_000, nominalBps: 1950, deductionCents: 990_000 },
  { from: 72_000_001, to: 180_000_000, nominalBps: 2050, deductionCents: 1_710_000 },
  { from: 180_000_001, to: 360_000_000, nominalBps: 2300, deductionCents: 6_210_000 },
  { from: 360_000_001, to: 480_000_000, nominalBps: 3050, deductionCents: 54_000_000 },
] as const;

type AnnexTable = ReadonlyArray<{ from: number; to: number; nominalBps: number; deductionCents: number }>;
function roundBigIntDivide(numerator: bigint, denominator: bigint) {
  if (numerator < 0n || denominator <= 0n) throw new Error("invalid_fiscal_ratio");
  const result = (numerator + denominator / 2n) / denominator;
  if (result > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("unsafe_fiscal_ratio");
  return Number(result);
}

function formatBps(rateBps: number) {
  const whole = Math.floor(rateBps / 100);
  return `${whole},${String(rateBps % 100).padStart(2, "0")}%`;
}

function annexCalculation(rbt12: number, revenue: number, table: AnnexTable) {
  const bracketIndex = table.findIndex((item) => rbt12 >= item.from && rbt12 <= item.to);
  const bracket = table[bracketIndex];
  if (!bracket) throw new Error("rbt12_out_of_supported_annex");
  // Money remains in cents and rates in basis points. The rational numerator
  // avoids an intermediate floating-point percentage and only rounds at each
  // published output boundary.
  const effectiveBpsNumerator = BigInt(rbt12) * BigInt(bracket.nominalBps)
    - BigInt(bracket.deductionCents) * 10_000n;
  const effectiveRateBps = roundBigIntDivide(effectiveBpsNumerator, BigInt(rbt12));
  const estimatedCents = roundBigIntDivide(
    BigInt(revenue) * effectiveBpsNumerator,
    BigInt(rbt12) * 10_000n,
  );
  return { bracketIndex, bracket, effectiveRateBps, estimatedCents };
}

export type SimplesAnnexIInput = { rbt12Cents: number; monthlySegregatedRevenueCents: number; annexConfirmed: boolean; revenueSegregated: boolean; periodClosed: boolean; noSpecialTreatment: boolean };
export function calculateSimplesAnnexI(input: SimplesAnnexIInput): LabResult {
  const rbt12 = safeInteger(input.rbt12Cents, "rbt12", 1, 480_000_000);
  const revenue = safeInteger(input.monthlySegregatedRevenueCents, "revenue");
  const { bracketIndex, bracket, effectiveRateBps, estimatedCents } = annexCalculation(rbt12, revenue, annexI);
  const verifiedFacts = facts([["atividade de comércio enquadrada no Anexo I", input.annexConfirmed], ["receita do mês segregada por tratamento tributário", input.revenueSegregated], ["RBT12 e período conferidos", input.periodClosed], ["ST, monofásico, antecipação, exportação e demais tratamentos especiais excluídos", input.noSpecialTreatment]]);
  const issues: LabIssue[] = [...missingFacts(verifiedFacts), { code: "pgdas_required", severity: "warning", message: "O valor exibido é uma referência do Anexo I e deve ser reconciliado com o PGDAS-D e a segregação efetiva da receita." }];
  return result("simples_annex_i", "Simples Nacional — Anexo I", [
    { code: "rbt12", label: "Receita bruta acumulada em 12 meses", formula: "RBT12 informada", amountCents: rbt12 },
    { code: "nominal", label: `Alíquota nominal — faixa ${bracketIndex + 1}`, formula: "Tabela oficial do Anexo I", amountCents: null, rateBps: bracket.nominalBps },
    { code: "deduction", label: "Parcela a deduzir", formula: "Tabela oficial do Anexo I", amountCents: bracket.deductionCents },
    { code: "effective", label: "Alíquota efetiva de referência", formula: "(RBT12 × alíquota nominal − parcela a deduzir) ÷ RBT12", amountCents: null, rateBps: effectiveRateBps },
    { code: "das_reference", label: "DAS estimado sobre a receita segregada", formula: "Receita segregada × alíquota efetiva", amountCents: estimatedCents, rateBps: effectiveRateBps },
  ], issues, [labSources.simples, labSources.pgdas], verifiedFacts, `Faixa ${bracketIndex + 1}; alíquota efetiva aproximada de ${formatBps(effectiveRateBps)}.`);
}

export type SimplesServicesInput = { rbt12Cents: number; fs12Cents: number; monthlySegregatedRevenueCents: number; activitySubjectToFactorR: boolean; payrollReconciled: boolean; revenueSegregated: boolean; noSpecialTreatment: boolean };
export function calculateSimplesServices(input: SimplesServicesInput): LabResult {
  const rbt12 = safeInteger(input.rbt12Cents, "rbt12", 1, 480_000_000);
  const fs12 = safeInteger(input.fs12Cents, "fs12");
  const revenue = safeInteger(input.monthlySegregatedRevenueCents, "revenue");
  const usesAnnexIII = BigInt(fs12) * BigInt(100) >= BigInt(rbt12) * BigInt(28);
  const annexName = usesAnnexIII ? "III" : "V";
  const { bracketIndex, bracket, effectiveRateBps, estimatedCents } = annexCalculation(rbt12, revenue, usesAnnexIII ? annexIII : annexV);
  const factorRBps = roundBigIntDivide(BigInt(fs12) * 10_000n, BigInt(rbt12));
  const verifiedFacts = facts([["atividade está sujeita ao fator R", input.activitySubjectToFactorR], ["FS12 inclui salários, pró-labore, contribuição patronal e FGTS aplicáveis", input.payrollReconciled], ["receita do serviço foi segregada", input.revenueSegregated], ["retenção, exportação, ISS fixo e demais tratamentos especiais foram excluídos", input.noSpecialTreatment]]);
  const issues: LabIssue[] = [...missingFacts(verifiedFacts), { code: "pgdas_required", severity: "warning", message: "O enquadramento e o valor devem ser reconciliados no PGDAS-D. Nem todo serviço usa fator R, e escritórios contábeis possuem tratamento próprio para atividades típicas." }];
  return result("simples_services", `Simples — serviços pelo Anexo ${annexName}`, [
    { code: "fs12", label: "Folha e encargos em 12 meses", formula: "FS12 informada e reconciliada", amountCents: fs12 },
    { code: "rbt12", label: "Receita bruta em 12 meses", formula: "RBT12 dos mercados interno e externo", amountCents: rbt12 },
    { code: "factor_r", label: "Fator R", formula: "FS12 ÷ RBT12; Anexo III se ≥ 28%", amountCents: null, rateBps: factorRBps },
    { code: "nominal", label: `Alíquota nominal — Anexo ${annexName}, faixa ${bracketIndex + 1}`, formula: `Tabela oficial do Anexo ${annexName}`, amountCents: null, rateBps: bracket.nominalBps },
    { code: "deduction", label: "Parcela a deduzir", formula: `Tabela oficial do Anexo ${annexName}`, amountCents: bracket.deductionCents },
    { code: "effective", label: "Alíquota efetiva de referência", formula: "(RBT12 × alíquota nominal − parcela a deduzir) ÷ RBT12", amountCents: null, rateBps: effectiveRateBps },
    { code: "das_reference", label: "DAS estimado sobre o serviço segregado", formula: "Receita segregada × alíquota efetiva", amountCents: estimatedCents, rateBps: effectiveRateBps },
  ], issues, [labSources.simples, labSources.pgdas], verifiedFacts, `Fator R de ${formatBps(factorRBps)}; enquadramento matemático no Anexo ${annexName}.`);
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
  ], issues, nonCumulative ? [labSources.pisCofins, labSources.pisNonCumulativeLaw, labSources.cofinsNonCumulativeLaw] : [labSources.pisCofins, labSources.cumulativePisCofinsLaw], verifiedFacts, `${nonCumulative ? "Regime não cumulativo" : "Regime cumulativo"}; separação auditável entre débitos e créditos.`);
}

export type PisCofinsSpecialInput = {
  treatment: "monophase_resale" | "zero_rate" | "suspension" | "export";
  classifiedRevenueCents: number;
  treatmentConfirmed: boolean;
  productOrServiceClassified: boolean;
  legalBasisDocumented: boolean;
  noMixedRevenue: boolean;
};
export function calculatePisCofinsSpecial(input: PisCofinsSpecialInput): LabResult {
  if (!(["monophase_resale", "zero_rate", "suspension", "export"] as string[]).includes(input.treatment)) throw new Error("invalid_pis_cofins_treatment");
  const revenue = safeInteger(input.classifiedRevenueCents, "classified_revenue");
  const verifiedFacts = facts([
    ["tratamento especial de PIS/Cofins confirmado para a receita", input.treatmentConfirmed],
    ["produto, NCM, serviço ou operação classificados", input.productOrServiceClassified],
    ["base legal específica e documento de suporte registrados", input.legalBasisDocumented],
    ["não há receita mista sem segregação no mesmo valor", input.noMixedRevenue],
  ]);
  const issues: LabIssue[] = [...missingFacts(verifiedFacts)];
  const treatmentLabel = {
    monophase_resale: "revenda monofásica",
    zero_rate: "alíquota zero",
    suspension: "suspensão",
    export: "exportação",
  }[input.treatment];
  return result("pis_cofins_special", "PIS/Cofins — tratamento especial", [
    { code: "classified_revenue", label: "Receita classificada", formula: "Valor segregado para o tratamento especial", amountCents: revenue },
    { code: "pis_reference", label: "PIS/Pasep de referência", formula: `${treatmentLabel}: débito não calculado no módulo geral`, amountCents: 0, rateBps: 0 },
    { code: "cofins_reference", label: "Cofins de referência", formula: `${treatmentLabel}: débito não calculado no módulo geral`, amountCents: 0, rateBps: 0 },
    { code: "blocked_general_balance", label: "Saldo geral bloqueado para esta receita", formula: "Receita especial exige trilha própria e não entra no PIS/Cofins padrão", amountCents: null },
  ], issues, [labSources.pisCofins, labSources.cumulativePisCofinsLaw, labSources.pisNonCumulativeLaw, labSources.cofinsNonCumulativeLaw], verifiedFacts, `${treatmentLabel}; a receita fica segregada para não inflar o saldo padrão.`);
}

export type PresumedProfit2026Input = { quarter: 1 | 2 | 3 | 4; commerceRevenueCents: number; serviceRevenueCents: number; fullyTaxableAdditionsCents: number; regimeConfirmed: boolean; activitiesSeparated: boolean; revenueReconciled: boolean; specialActivitiesExcluded: boolean };
export function calculatePresumedProfit2026(input: PresumedProfit2026Input): LabResult {
  const quarter = safeInteger(input.quarter, "quarter", 1, 4) as 1 | 2 | 3 | 4;
  const commerce = safeInteger(input.commerceRevenueCents, "commerce_revenue");
  const services = safeInteger(input.serviceRevenueCents, "service_revenue");
  const additions = safeInteger(input.fullyTaxableAdditionsCents, "fully_taxable_additions");
  const totalRevenue = commerce + services;
  safeInteger(totalRevenue, "total_revenue", 1);
  const quarterlyLimit = 125_000_000;
  const normalTotal = Math.min(totalRevenue, quarterlyLimit);
  const normalCommerce = totalRevenue <= quarterlyLimit ? commerce : Number((BigInt(normalTotal) * BigInt(commerce) + BigInt(totalRevenue) / BigInt(2)) / BigInt(totalRevenue));
  const normalServices = Math.min(services, normalTotal - normalCommerce);
  const excessCommerce = commerce - normalCommerce;
  const excessServices = services - normalServices;
  const csllUpliftApplies = quarter >= 2;

  const irpjPresumedBase = multiplyCentsByBps(normalCommerce, 800) + multiplyCentsByBps(excessCommerce, 880) + multiplyCentsByBps(normalServices, 3200) + multiplyCentsByBps(excessServices, 3520) + additions;
  const csllPresumedBase = multiplyCentsByBps(normalCommerce, 1200) + multiplyCentsByBps(excessCommerce, csllUpliftApplies ? 1320 : 1200) + multiplyCentsByBps(normalServices, 3200) + multiplyCentsByBps(excessServices, csllUpliftApplies ? 3520 : 3200) + additions;
  const irpjBaseTax = multiplyCentsByBps(irpjPresumedBase, 1500);
  const irpjAdditionalBase = Math.max(0, irpjPresumedBase - 6_000_000);
  const irpjAdditional = multiplyCentsByBps(irpjAdditionalBase, 1000);
  const csll = multiplyCentsByBps(csllPresumedBase, 900);
  const verifiedFacts = facts([["opção válida pelo Lucro Presumido em 2026", input.regimeConfirmed], ["receitas de comércio e serviços foram separadas", input.activitiesSeparated], ["receita trimestral e acréscimos foram conciliados", input.revenueReconciled], ["combustíveis, transporte, hospitalares, instituições financeiras, exterior e regimes especiais foram excluídos", input.specialActivitiesExcluded]]);
  const issues: LabIssue[] = [...missingFacts(verifiedFacts), { code: "limited_scope", severity: "warning", message: "Motor limitado às atividades gerais de comércio (IRPJ 8% / CSLL 12%) e serviços em geral (32% / 32%). Ganhos e receitas integralmente tributáveis devem ser informados separadamente." }, { code: "2026_uplift", severity: "warning", message: `Em 2026, o acréscimo dos coeficientes vale para o IRPJ desde o 1º trimestre e para a CSLL desde o 2º trimestre; cálculo atual: ${quarter}º trimestre.` }];
  return result("presumed_profit_2026", `Lucro Presumido — ${quarter}º trimestre de 2026`, [
    { code: "revenue", label: "Receita sujeita aos coeficientes", formula: "Comércio + serviços informados", amountCents: totalRevenue },
    { code: "normal_limit", label: "Parcela no limite trimestral normal", formula: "Até R$ 1.250.000, rateado entre as atividades", amountCents: normalTotal },
    { code: "excess", label: "Parcela com coeficientes acrescidos", formula: "Receita sujeita aos coeficientes − limite proporcional", amountCents: Math.max(0, totalRevenue - normalTotal) },
    { code: "irpj_base", label: "Base presumida do IRPJ", formula: "Comércio 8%/8,8% + serviços 32%/35,2% + acréscimos integrais", amountCents: irpjPresumedBase },
    { code: "irpj_15", label: "IRPJ à alíquota geral", formula: "Base presumida do IRPJ × 15%", amountCents: irpjBaseTax, rateBps: 1500 },
    { code: "irpj_additional", label: "Adicional do IRPJ", formula: "10% sobre a base trimestral que exceder R$ 60.000", amountCents: irpjAdditional, rateBps: 1000 },
    { code: "irpj_total", label: "IRPJ trimestral de referência", formula: "IRPJ 15% + adicional", amountCents: irpjBaseTax + irpjAdditional },
    { code: "csll_base", label: "Base presumida da CSLL", formula: `Comércio 12%/${csllUpliftApplies ? "13,2%" : "12%"} + serviços 32%/${csllUpliftApplies ? "35,2%" : "32%"} + acréscimos integrais`, amountCents: csllPresumedBase },
    { code: "csll", label: "CSLL trimestral de referência", formula: "Base presumida da CSLL × 9%", amountCents: csll, rateBps: 900 },
    { code: "combined", label: "IRPJ + CSLL de referência", formula: "Soma dos tributos calculados; não inclui PIS/Cofins", amountCents: irpjBaseTax + irpjAdditional + csll },
  ], issues, [labSources.irpj, labSources.csll, labSources.lc224, labSources.decree12808, labSources.presumedFaq2026], verifiedFacts, `Limite trimestral de R$ 1,25 milhão aplicado proporcionalmente; acréscimos de 2026 tratados por tributo e trimestre.`);
}

export type RealProfitFederalInput = {
  quarter: 1 | 2 | 3 | 4;
  accountingProfitCents: number;
  additionsCents: number;
  exclusionsCents: number;
  lossCompensationCents: number;
  regimeConfirmed: boolean;
  lalurReconciled: boolean;
  additionsExclusionsSupported: boolean;
  compensationLimitChecked: boolean;
};
export function calculateRealProfitFederal(input: RealProfitFederalInput): LabResult {
  safeInteger(input.quarter, "quarter", 1, 4);
  const profit = safeInteger(input.accountingProfitCents, "accounting_profit");
  const additions = safeInteger(input.additionsCents, "additions");
  const exclusions = safeInteger(input.exclusionsCents, "exclusions", 0, profit + additions);
  const beforeCompensation = Math.max(0, profit + additions - exclusions);
  const maximumCompensation = multiplyCentsByBps(beforeCompensation, 3000);
  const requestedCompensation = safeInteger(input.lossCompensationCents, "loss_compensation", 0, beforeCompensation);
  const acceptedCompensation = Math.min(requestedCompensation, maximumCompensation);
  const taxableBase = beforeCompensation - acceptedCompensation;
  const irpj = multiplyCentsByBps(taxableBase, 1500);
  const additionalBase = Math.max(0, taxableBase - 6_000_000);
  const irpjAdditional = multiplyCentsByBps(additionalBase, 1000);
  const csll = multiplyCentsByBps(taxableBase, 900);
  const verifiedFacts = facts([
    ["opção ou obrigatoriedade pelo Lucro Real confirmada", input.regimeConfirmed],
    ["LALUR/LACS e contabilidade conciliados", input.lalurReconciled],
    ["adições e exclusões possuem suporte documental", input.additionsExclusionsSupported],
    ["limite de compensação de prejuízo fiscal foi conferido", input.compensationLimitChecked],
  ]);
  const issues: LabIssue[] = [...missingFacts(verifiedFacts)];
  if (requestedCompensation > maximumCompensation) issues.push({ code: "loss_compensation_capped", severity: "warning", message: "A compensação informada excede 30% da base e foi limitada na memória." });
  return result("real_profit_federal", "Lucro Real — IRPJ/CSLL", [
    { code: "accounting_profit", label: "Lucro contábil antes dos tributos", formula: "Valor informado", amountCents: profit },
    { code: "additions", label: "Adições controladas", formula: "Adições LALUR/LACS suportadas", amountCents: additions },
    { code: "exclusions", label: "Exclusões controladas", formula: "Exclusões LALUR/LACS suportadas", amountCents: exclusions },
    { code: "before_compensation", label: "Base antes da compensação", formula: "Lucro + adições - exclusões", amountCents: beforeCompensation },
    { code: "loss_compensation", label: "Compensação aceita", formula: "Menor entre valor informado e 30% da base", amountCents: acceptedCompensation, rateBps: 3000 },
    { code: "taxable_base", label: "Base tributável IRPJ/CSLL", formula: "Base antes da compensação - compensação aceita", amountCents: taxableBase },
    { code: "irpj_15", label: "IRPJ à alíquota geral", formula: "Base × 15%", amountCents: irpj, rateBps: 1500 },
    { code: "irpj_additional", label: "Adicional do IRPJ", formula: "10% sobre a base trimestral que exceder R$ 60.000", amountCents: irpjAdditional, rateBps: 1000 },
    { code: "csll", label: "CSLL de referência", formula: "Base × 9%", amountCents: csll, rateBps: 900 },
    { code: "combined", label: "IRPJ + CSLL de referência", formula: "IRPJ 15% + adicional + CSLL", amountCents: irpj + irpjAdditional + csll },
  ], issues, [labSources.irpj, labSources.csll, labSources.law9430, labSources.rir2018], verifiedFacts, "Recorte trimestral de Lucro Real com adições, exclusões e compensação em centavos.");
}

export type FederalWithholdingsInput = {
  grossPaymentCents: number;
  irrfApplies: boolean;
  irrfRateBps?: number | null;
  csrfApplies: boolean;
  inssApplies: boolean;
  inssRateBps?: number | null;
  issWithheld: boolean;
  issRateBps: number;
  serviceNatureConfirmed: boolean;
  payerResponsible: boolean;
  beneficiaryRegimeChecked: boolean;
  municipalResponsibilityChecked: boolean;
  basesReconciled?: boolean;
  paymentEventsConfirmed?: boolean;
  simultaneousDeductionsConfirmed?: boolean;
};
export function calculateFederalWithholdings(input: FederalWithholdingsInput): LabResult {
  const gross = safeInteger(input.grossPaymentCents, "gross_payment");
  const issRate = safeInteger(input.issRateBps, "iss_rate", 0, 500);
  const irrfRate = input.irrfApplies && Number.isSafeInteger(input.irrfRateBps) ? safeInteger(input.irrfRateBps, "irrf_rate", 0, 150) : null;
  const inssRate = input.inssApplies && Number.isSafeInteger(input.inssRateBps) ? safeInteger(input.inssRateBps, "inss_rate", 0, 1100) : null;
  const irrf = input.irrfApplies && irrfRate !== null ? multiplyCentsByBps(gross, irrfRate) : input.irrfApplies ? null : 0;
  const csrf = input.csrfApplies ? multiplyCentsByBps(gross, 465) : 0;
  const inss = input.inssApplies && inssRate !== null ? multiplyCentsByBps(gross, inssRate) : input.inssApplies ? null : 0;
  const iss = input.issWithheld ? multiplyCentsByBps(gross, issRate) : 0;
  const verifiedFacts = facts([
    ["natureza do serviço e hipótese de retenção confirmadas", input.serviceNatureConfirmed],
    ["responsável pela retenção identificado", input.payerResponsible],
    ["regime do beneficiário e dispensas foram verificados", input.beneficiaryRegimeChecked],
    ["responsabilidade municipal do ISS foi conferida", !input.issWithheld || input.municipalResponsibilityChecked],
    ["bases de IRRF, CSRF, INSS e ISS foram conciliadas separadamente", input.basesReconciled === true],
    ["pagamento, crédito, emissão e prestação foram classificados por tributo", input.paymentEventsConfirmed === true],
  ]);
  const issues: LabIssue[] = [...missingFacts(verifiedFacts)];
  if (input.irrfApplies && irrfRate === null) issues.push({ code: "irrf_rate_required", severity: "blocker", message: "Informe 1% ou 1,5% somente após classificar a natureza e o código do IRRF." });
  if (input.inssApplies && ![350, 1100].includes(inssRate ?? -1)) issues.push({ code: "inss_rate_required", severity: "blocker", message: "Informe 11% ou 3,5% após confirmar cessão/empreitada, CPRB, base e deduções." });
  if (!input.simultaneousDeductionsConfirmed) issues.push({ code: "net_payment_blocked", severity: "warning", message: "O líquido permanece bloqueado até confirmar que todas as retenções pertencem ao mesmo pagamento e podem ser deduzidas simultaneamente." });
  const canCalculateNet = issues.every((issue) => issue.severity !== "blocker") && input.simultaneousDeductionsConfirmed === true && irrf !== null && inss !== null;
  const total = canCalculateNet ? irrf + csrf + inss + iss : null;
  return result("federal_withholdings", "Retenções — IRRF, CSRF, INSS e ISS", [
    { code: "gross_payment", label: "Valor bruto do pagamento", formula: "Valor informado", amountCents: gross },
    { code: "irrf", label: "IRRF retido", formula: input.irrfApplies ? "Base própria × alíquota confirmada de 1% ou 1,5%" : "Hipótese não marcada", amountCents: irrf, rateBps: input.irrfApplies ? irrfRate : 0 },
    { code: "csrf", label: "CSRF retida", formula: input.csrfApplies ? "Base × 4,65%" : "Hipótese não marcada", amountCents: csrf, rateBps: input.csrfApplies ? 465 : 0 },
    { code: "inss", label: "INSS retido", formula: input.inssApplies ? "Base própria × 11% ou 3,5% conforme CPRB" : "Hipótese não marcada", amountCents: inss, rateBps: input.inssApplies ? inssRate : 0 },
    { code: "iss", label: "ISS retido", formula: input.issWithheld ? "Base × alíquota municipal informada" : "Sem retenção municipal informada", amountCents: iss, rateBps: input.issWithheld ? issRate : 0 },
    { code: "net_payment", label: "Pagamento líquido de referência", formula: canCalculateNet ? "Bruto − retenções simultâneas e conciliadas" : "Bloqueado: livros ou fatos ainda não conciliados", amountCents: total === null ? null : Math.max(0, gross - total) },
  ], issues, [labSources.rir2018, labSources.law9430, labSources.cofinsNonCumulativeLaw, labSources.inssCessao, labSources.iss], verifiedFacts, "IRRF, CSRF, INSS e ISS mantidos em livros independentes; dispensa ou base de um tributo não é emprestada a outro.");
}

export type IpiTipiInput = {
  operation: "industrial_output" | "import";
  ipiBaseCents: number;
  ipiRateBps: number;
  ncmConfirmed: boolean;
  tipiRateConfirmed: boolean;
  industrializationOrImportConfirmed: boolean;
  exemptionsExcluded: boolean;
};
export function calculateIpiTipi(input: IpiTipiInput): LabResult {
  if (!(["industrial_output", "import"] as string[]).includes(input.operation)) throw new Error("invalid_ipi_operation");
  const base = safeInteger(input.ipiBaseCents, "ipi_base");
  const rate = safeInteger(input.ipiRateBps, "ipi_rate", 0, 40000);
  const ipi = multiplyCentsByBps(base, rate);
  const verifiedFacts = facts([
    ["NCM e produto foram classificados", input.ncmConfirmed],
    ["alíquota da TIPI vigente foi confirmada", input.tipiRateConfirmed],
    ["industrialização ou importação é relevante na operação", input.industrializationOrImportConfirmed],
    ["isenção, imunidade, suspensão, ZFM e regimes especiais foram excluídos", input.exemptionsExcluded],
  ]);
  const issues: LabIssue[] = [...missingFacts(verifiedFacts)];
  return result("ipi_tipi", "IPI/TIPI — referência por NCM", [
    { code: "ipi_base", label: "Base do IPI", formula: "Valor da operação/base de importação informada", amountCents: base },
    { code: "tipi_rate", label: "Alíquota TIPI informada", formula: "Alíquota conferida na TIPI vigente", amountCents: null, rateBps: rate },
    { code: "ipi_reference", label: "IPI de referência", formula: "Base × alíquota TIPI", amountCents: ipi, rateBps: rate },
  ], issues, [labSources.ipi], verifiedFacts, `${input.operation === "import" ? "Importação" : "Saída industrial"} com NCM obrigatório e alíquota parametrizada.`);
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
  | ({ module: "simples_services" } & SimplesServicesInput)
  | ({ module: "pis_cofins" } & PisCofinsInput)
  | ({ module: "pis_cofins_special" } & PisCofinsSpecialInput)
  | ({ module: "presumed_profit_2026" } & PresumedProfit2026Input)
  | ({ module: "real_profit_federal" } & RealProfitFederalInput)
  | ({ module: "federal_withholdings" } & FederalWithholdingsInput)
  | ({ module: "ipi_tipi" } & IpiTipiInput)
  | ({ module: "iss" } & IssInput)
  | ({ module: "icms_difal" } & IcmsDifalInput)
  | ({ module: "rtc_2026" } & Rtc2026Input);

export function calculateTaxLab(input: LabInput): LabResult {
  switch (input.module) {
    case "simples_annex_i": return calculateSimplesAnnexI(input);
    case "simples_services": return calculateSimplesServices(input);
    case "pis_cofins": return calculatePisCofins(input);
    case "pis_cofins_special": return calculatePisCofinsSpecial(input);
    case "presumed_profit_2026": return calculatePresumedProfit2026(input);
    case "real_profit_federal": return calculateRealProfitFederal(input);
    case "federal_withholdings": return calculateFederalWithholdings(input);
    case "ipi_tipi": return calculateIpiTipi(input);
    case "iss": return calculateIss(input);
    case "icms_difal": return calculateIcmsDifal(input);
    case "rtc_2026": return calculateRtc2026(input);
    default: throw new Error("unsupported_module");
  }
}

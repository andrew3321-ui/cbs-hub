import {
  calculateTaxLab,
  DETERMINISTIC_TAX_LAB_CHECKED_AT,
  DETERMINISTIC_TAX_LAB_VERSION,
  type LabInput,
  type LabResult,
  type LabSource,
} from "./deterministic-tax-lab.ts";

export const FISCAL_SIMULATION_SUITE_VERSION = "2026.07.18-v54";
export const FISCAL_SIMULATION_BASE_CODE = "DETERMINISTIC-TAX-LAB-SIMULATIONS";
export const FISCAL_SIMULATION_REFERENCE_DATE = "2026-07-18T12:00:00.000Z";

type ExpectedLine = {
  code: string;
  amountCents?: number | null;
  rateBps?: number | null;
};

export type FiscalSimulationCase = {
  code: string;
  title: string;
  moduleLabel: string;
  profile: string;
  scenario: string;
  operationPeriod: string;
  kind: "calculated_reference" | "expected_block";
  input: LabInput;
  expected: {
    status: LabResult["status"];
    lines: ExpectedLine[];
    blockerCount: number;
  };
  expectedProfessionalConclusion: string;
  additionalSources?: LabSource[];
};

export type FiscalSimulationRun = {
  case: FiscalSimulationCase;
  output: LabResult;
  passed: boolean;
  checks: Array<{ code: string; passed: boolean; expected: string; actual: string }>;
  sourceCodes: string[];
};

const municipalSources = {
  saoPaulo: {
    code: "SP-IN-SUREM-19-2021",
    title: "IN SF/SUREM nº 19/2021 — tabela de códigos e alíquotas do ISS",
    publisher: "Prefeitura de São Paulo",
    url: "https://legislacao.prefeitura.sp.gov.br/leis/instrucao-normativa-secretaria-municipal-da-fazenda-sf-surem-19-de-22-de-dezembro-de-2021/anexo/61f1544a1411920679f880ac/Anexo%20da%20Instru%C3%A7%C3%A3o%20Normativa%20SF-SUREM%20n%C2%BA%2019_2021.pdf",
    checkedAt: DETERMINISTIC_TAX_LAB_CHECKED_AT,
  },
  recife: {
    code: "RECIFE-LEI-15563",
    title: "Lei Municipal nº 15.563/1991 — Código Tributário do Recife",
    publisher: "Prefeitura do Recife",
    url: "https://www.legiscidade.recife.pe.gov.br/lei/15563/",
    checkedAt: DETERMINISTIC_TAX_LAB_CHECKED_AT,
  },
  curitiba: {
    code: "CURITIBA-LC-40-2001",
    title: "Lei Complementar Municipal nº 40/2001 — ISS",
    publisher: "Prefeitura de Curitiba",
    url: "https://legisladocexterno.curitiba.pr.gov.br/VisualizarHTML.aspx?id=41",
    checkedAt: DETERMINISTIC_TAX_LAB_CHECKED_AT,
  },
  minasGerais: {
    code: "MG-RICMS-ANNEX-I",
    title: "RICMS/MG 2023 — Anexo I — Alíquotas",
    publisher: "Secretaria de Estado de Fazenda de Minas Gerais",
    url: "https://www.fazenda.mg.gov.br/empresas/legislacao_tributaria/ricms2023/anexoi2023.pdf",
    checkedAt: DETERMINISTIC_TAX_LAB_CHECKED_AT,
  },
} satisfies Record<string, LabSource>;

export const fiscalSimulationCases: FiscalSimulationCase[] = [
  {
    code: "SIM-COMMERCE-STARTER",
    title: "Comércio pequeno na primeira faixa do Simples",
    moduleLabel: "Simples · Anexo I",
    profile: "Loja fictícia de utilidades domésticas",
    scenario: "RBT12 de R$ 120 mil e receita segregada de R$ 10 mil no mês, sem ST ou monofásico.",
    operationPeriod: "06/2026",
    kind: "calculated_reference",
    input: { module: "simples_annex_i", rbt12Cents: 12_000_000, monthlySegregatedRevenueCents: 1_000_000, annexConfirmed: true, revenueSegregated: true, periodClosed: true, noSpecialTreatment: true },
    expected: { status: "calculated_reference", lines: [{ code: "effective", rateBps: 400 }, { code: "das_reference", amountCents: 40_000 }], blockerCount: 0 },
    expectedProfessionalConclusion: "A memória deve selecionar a faixa 1, aplicar 4% e manter o alerta de reconciliação no PGDAS-D.",
  },
  {
    code: "SIM-COMMERCE-GROWTH",
    title: "Comércio em crescimento na quarta faixa",
    moduleLabel: "Simples · Anexo I",
    profile: "Distribuidora fictícia de material de escritório",
    scenario: "RBT12 de R$ 1,5 milhão e receita segregada de R$ 120 mil.",
    operationPeriod: "06/2026",
    kind: "calculated_reference",
    input: { module: "simples_annex_i", rbt12Cents: 150_000_000, monthlySegregatedRevenueCents: 12_000_000, annexConfirmed: true, revenueSegregated: true, periodClosed: true, noSpecialTreatment: true },
    expected: { status: "calculated_reference", lines: [{ code: "nominal", rateBps: 1070 }, { code: "effective", rateBps: 920 }, { code: "das_reference", amountCents: 1_104_000 }], blockerCount: 0 },
    expectedProfessionalConclusion: "A fórmula deve reproduzir a quarta faixa e o DAS de referência sem tratá-lo como apuração definitiva.",
  },
  {
    code: "SIM-COMMERCE-UNSEGREGATED",
    title: "Comércio com receita não segregada",
    moduleLabel: "Simples · bloqueio",
    profile: "Autopeças fictícia com possível receita sujeita a ST",
    scenario: "O valor existe, mas anexo, segregação, fechamento e tratamentos especiais não foram confirmados.",
    operationPeriod: "06/2026",
    kind: "expected_block",
    input: { module: "simples_annex_i", rbt12Cents: 150_000_000, monthlySegregatedRevenueCents: 12_000_000, annexConfirmed: false, revenueSegregated: false, periodClosed: false, noSpecialTreatment: false },
    expected: { status: "blocked", lines: [{ code: "das_reference", amountCents: 1_104_000 }], blockerCount: 4 },
    expectedProfessionalConclusion: "O motor pode exibir a memória matemática, mas deve bloquear o uso porque os quatro fatos mínimos não foram confirmados.",
  },
  {
    code: "SIM-FACTOR-R-BOUNDARY",
    title: "Serviço exatamente no limite de 28% do fator R",
    moduleLabel: "Simples · fator R",
    profile: "Consultoria fictícia com folha reconciliada",
    scenario: "RBT12 de R$ 1,2 milhão, FS12 de R$ 336 mil e receita mensal de R$ 100 mil.",
    operationPeriod: "06/2026",
    kind: "calculated_reference",
    input: { module: "simples_services", rbt12Cents: 120_000_000, fs12Cents: 33_600_000, monthlySegregatedRevenueCents: 10_000_000, activitySubjectToFactorR: true, payrollReconciled: true, revenueSegregated: true, noSpecialTreatment: true },
    expected: { status: "calculated_reference", lines: [{ code: "factor_r", rateBps: 2800 }, { code: "effective", rateBps: 1303 }, { code: "das_reference", amountCents: 1_303_000 }], blockerCount: 0 },
    expectedProfessionalConclusion: "No limite inclusivo de 28%, o caso deve seguir para o Anexo III.",
  },
  {
    code: "SIM-FACTOR-R-BELOW",
    title: "Serviço abaixo do limite do fator R",
    moduleLabel: "Simples · fator R",
    profile: "Agência fictícia com fator R de 25%",
    scenario: "Mesma receita do caso-limite, mas FS12 de R$ 300 mil.",
    operationPeriod: "06/2026",
    kind: "calculated_reference",
    input: { module: "simples_services", rbt12Cents: 120_000_000, fs12Cents: 30_000_000, monthlySegregatedRevenueCents: 10_000_000, activitySubjectToFactorR: true, payrollReconciled: true, revenueSegregated: true, noSpecialTreatment: true },
    expected: { status: "calculated_reference", lines: [{ code: "factor_r", rateBps: 2500 }, { code: "effective", rateBps: 1908 }, { code: "das_reference", amountCents: 1_907_500 }], blockerCount: 0 },
    expectedProfessionalConclusion: "Abaixo de 28%, o caso deve seguir para o Anexo V e produzir carga maior que o caso-limite.",
  },
  {
    code: "SIM-PISCOFINS-CUMULATIVE",
    title: "PIS/Cofins cumulativo sem tratamento especial",
    moduleLabel: "PIS/Cofins",
    profile: "Prestadora fictícia no lucro presumido",
    scenario: "Receita tributável de R$ 80 mil, sem créditos da sistemática não cumulativa.",
    operationPeriod: "06/2026",
    kind: "calculated_reference",
    input: { module: "pis_cofins", regime: "cumulative", taxableRevenueCents: 8_000_000, eligibleCreditBaseCents: 0, regimeConfirmed: true, revenueClassified: true, specialTreatmentsExcluded: true, creditsDocumented: false },
    expected: { status: "calculated_reference", lines: [{ code: "pis_debit", amountCents: 52_000, rateBps: 65 }, { code: "cofins_debit", amountCents: 240_000, rateBps: 300 }, { code: "balance", amountCents: 292_000 }], blockerCount: 0 },
    expectedProfessionalConclusion: "A referência combinada deve totalizar 3,65%, sem criar crédito no regime cumulativo.",
  },
  {
    code: "SIM-PISCOFINS-NONCUMULATIVE",
    title: "PIS/Cofins não cumulativo com crédito documentado",
    moduleLabel: "PIS/Cofins",
    profile: "Indústria fictícia no lucro real",
    scenario: "Receita de R$ 150 mil e base elegível documentada de R$ 60 mil.",
    operationPeriod: "06/2026",
    kind: "calculated_reference",
    input: { module: "pis_cofins", regime: "non_cumulative", taxableRevenueCents: 15_000_000, eligibleCreditBaseCents: 6_000_000, regimeConfirmed: true, revenueClassified: true, specialTreatmentsExcluded: true, creditsDocumented: true },
    expected: { status: "calculated_reference", lines: [{ code: "pis_debit", amountCents: 247_500, rateBps: 165 }, { code: "cofins_debit", amountCents: 1_140_000, rateBps: 760 }, { code: "pis_credit", amountCents: 99_000, rateBps: 165 }, { code: "cofins_credit", amountCents: 456_000, rateBps: 760 }, { code: "balance", amountCents: 832_500 }], blockerCount: 0 },
    expectedProfessionalConclusion: "Débito e crédito devem permanecer separados e o saldo deve ser a diferença exata.",
  },
  {
    code: "SIM-PISCOFINS-CREDIT-NO-DOC",
    title: "Crédito de PIS/Cofins sem documentação",
    moduleLabel: "PIS/Cofins · bloqueio",
    profile: "Indústria fictícia com crédito informado, mas não comprovado",
    scenario: "Os valores são iguais ao caso anterior; a confirmação documental está ausente.",
    operationPeriod: "06/2026",
    kind: "expected_block",
    input: { module: "pis_cofins", regime: "non_cumulative", taxableRevenueCents: 15_000_000, eligibleCreditBaseCents: 6_000_000, regimeConfirmed: true, revenueClassified: true, specialTreatmentsExcluded: true, creditsDocumented: false },
    expected: { status: "blocked", lines: [{ code: "balance", amountCents: 832_500 }], blockerCount: 1 },
    expectedProfessionalConclusion: "O saldo matemático não pode ser liberado enquanto a elegibilidade e a documentação do crédito estiverem pendentes.",
  },
  {
    code: "SIM-PRESUMED-MIXED",
    title: "Lucro presumido com comércio e serviços",
    moduleLabel: "IRPJ/CSLL · 2026",
    profile: "Empresa fictícia com atividades mistas",
    scenario: "No trimestre: R$ 1,44 milhão de comércio e R$ 360 mil de serviços, sem acréscimos integrais.",
    operationPeriod: "2º trimestre/2026",
    kind: "calculated_reference",
    input: { module: "presumed_profit_2026", quarter: 2, commerceRevenueCents: 144_000_000, serviceRevenueCents: 36_000_000, fullyTaxableAdditionsCents: 0, regimeConfirmed: true, activitiesSeparated: true, revenueReconciled: true, specialActivitiesExcluded: true },
    expected: { status: "calculated_reference", lines: [{ code: "irpj_total", amountCents: 5_336_000 }, { code: "csll", amountCents: 2_671_200 }, { code: "combined", amountCents: 8_007_200 }], blockerCount: 0 },
    expectedProfessionalConclusion: "As receitas devem usar percentuais de presunção separados e os controles de 2026 devem permanecer evidenciados.",
  },
  {
    code: "SIM-PRESUMED-NOT-SEPARATED",
    title: "Lucro presumido com atividades não separadas",
    moduleLabel: "IRPJ/CSLL · bloqueio",
    profile: "Empresa fictícia sem conciliação por atividade",
    scenario: "A receita total foi informada, mas comércio e serviços não foram confirmados como segregados.",
    operationPeriod: "2º trimestre/2026",
    kind: "expected_block",
    input: { module: "presumed_profit_2026", quarter: 2, commerceRevenueCents: 144_000_000, serviceRevenueCents: 36_000_000, fullyTaxableAdditionsCents: 0, regimeConfirmed: true, activitiesSeparated: false, revenueReconciled: true, specialActivitiesExcluded: true },
    expected: { status: "blocked", lines: [{ code: "combined", amountCents: 8_007_200 }], blockerCount: 1 },
    expectedProfessionalConclusion: "O motor deve bloquear o resultado apesar de conseguir reproduzir a matemática, pois as atividades não foram segregadas.",
  },
  {
    code: "SIM-ISS-SP-ADMIN-IMOVEIS",
    title: "ISS de administração de imóveis em São Paulo",
    moduleLabel: "ISS municipal",
    profile: "Administradora fictícia estabelecida em São Paulo",
    scenario: "Serviço 17.11, código municipal 03212, preço de R$ 40 mil, alíquota oficial parametrizada de 5%.",
    operationPeriod: "06/2026",
    kind: "calculated_reference",
    input: { module: "iss", serviceBaseCents: 4_000_000, deductionsCents: 0, municipalRateBps: 500, withheld: false, serviceItemConfirmed: true, placeConfirmed: true, municipalRateConfirmed: true, municipalLawReference: "IN SF/SUREM 19/2021, código 03212" },
    expected: { status: "calculated_reference", lines: [{ code: "iss", amountCents: 200_000, rateBps: 500 }, { code: "provider_payable", amountCents: 200_000 }], blockerCount: 0 },
    expectedProfessionalConclusion: "Com item, município e taxa confirmados, a memória deve calcular 5% sem presumir retenção.",
    additionalSources: [municipalSources.saoPaulo],
  },
  {
    code: "SIM-ISS-RECIFE-LAB",
    title: "ISS de análises clínicas no Recife",
    moduleLabel: "ISS municipal",
    profile: "Laboratório fictício estabelecido no Recife",
    scenario: "Serviço 4.02, preço de R$ 50 mil, sem deduções e alíquota municipal de 2%.",
    operationPeriod: "06/2026",
    kind: "calculated_reference",
    input: { module: "iss", serviceBaseCents: 5_000_000, deductionsCents: 0, municipalRateBps: 200, withheld: false, serviceItemConfirmed: true, placeConfirmed: true, municipalRateConfirmed: true, municipalLawReference: "Lei Recife 15.563/1991, art. 116, I" },
    expected: { status: "calculated_reference", lines: [{ code: "iss", amountCents: 100_000, rateBps: 200 }, { code: "provider_payable", amountCents: 100_000 }], blockerCount: 0 },
    expectedProfessionalConclusion: "O serviço 4.02 deve reproduzir a alíquota municipal de 2% registrada no caso.",
    additionalSources: [municipalSources.recife],
  },
  {
    code: "SIM-ISS-CURITIBA-RETAINED",
    title: "ISS retido sobre sinalização em Curitiba",
    moduleLabel: "ISS municipal",
    profile: "Prestadora fictícia de sinalização para tomador responsável",
    scenario: "Serviço 7.10, preço de R$ 80 mil, taxa de 5% e retenção integral informada.",
    operationPeriod: "06/2026",
    kind: "calculated_reference",
    input: { module: "iss", serviceBaseCents: 8_000_000, deductionsCents: 0, municipalRateBps: 500, withheld: true, serviceItemConfirmed: true, placeConfirmed: true, municipalRateConfirmed: true, municipalLawReference: "LC Curitiba 40/2001, arts. 4º e 8º" },
    expected: { status: "calculated_reference", lines: [{ code: "iss", amountCents: 400_000, rateBps: 500 }, { code: "provider_payable", amountCents: 0 }], blockerCount: 0 },
    expectedProfessionalConclusion: "O ISS calculado deve ser atribuído ao fluxo de retenção, sem duplicar valor a pagar pelo prestador.",
    additionalSources: [municipalSources.curitiba],
  },
  {
    code: "SIM-ISS-MISSING-LAW",
    title: "ISS sem referência da lei municipal",
    moduleLabel: "ISS · bloqueio",
    profile: "Prestadora fictícia com taxa digitada sem prova oficial",
    scenario: "Base de R$ 30 mil e taxa de 5%, mas a lei municipal e a confirmação do percentual não foram registradas.",
    operationPeriod: "06/2026",
    kind: "expected_block",
    input: { module: "iss", serviceBaseCents: 3_000_000, deductionsCents: 0, municipalRateBps: 500, withheld: false, serviceItemConfirmed: true, placeConfirmed: true, municipalRateConfirmed: false, municipalLawReference: "" },
    expected: { status: "blocked", lines: [{ code: "iss", amountCents: 150_000, rateBps: 500 }], blockerCount: 2 },
    expectedProfessionalConclusion: "A matemática pode ser exibida como diagnóstico, mas o caso deve permanecer bloqueado até anexar e confirmar a lei municipal.",
  },
  {
    code: "SIM-DIFAL-SP-MG",
    title: "DIFAL de consumidor final não contribuinte SP → MG",
    moduleLabel: "ICMS · DIFAL",
    profile: "Varejista paulista fictício vendendo a consumidor mineiro",
    scenario: "Base de R$ 100 mil, mercadoria nacional, interna parametrizada de 18% e FCP de 2%.",
    operationPeriod: "06/2026",
    kind: "calculated_reference",
    input: { module: "icms_difal", baseCents: 10_000_000, origin: "SP", destination: "MG", importedQualified: false, destinationInternalRateBps: 1800, fcpRateBps: 200, finalConsumer: true, recipientNonTaxpayer: true, destinationLawReference: "RICMS/MG Anexo I — hipótese controlada", ratesConfirmed: true },
    expected: { status: "calculated_reference", lines: [{ code: "interstate", amountCents: 1_200_000, rateBps: 1200 }, { code: "difal", amountCents: 600_000, rateBps: 600 }, { code: "fcp", amountCents: 200_000, rateBps: 200 }, { code: "destination_total", amountCents: 800_000 }], blockerCount: 0 },
    expectedProfessionalConclusion: "A memória simples deve separar ICMS interestadual, DIFAL e FCP, preservando o alerta sobre base por dentro e regras do produto.",
    additionalSources: [municipalSources.minasGerais],
  },
  {
    code: "SIM-DIFAL-IMPORTED",
    title: "DIFAL com mercadoria importada enquadrada em 4%",
    moduleLabel: "ICMS · DIFAL",
    profile: "E-commerce fictício com mercadoria importada qualificada",
    scenario: "Mesma rota SP → MG; alíquota interestadual de 4%, interna parametrizada de 18% e FCP de 2%.",
    operationPeriod: "06/2026",
    kind: "calculated_reference",
    input: { module: "icms_difal", baseCents: 10_000_000, origin: "SP", destination: "MG", importedQualified: true, destinationInternalRateBps: 1800, fcpRateBps: 200, finalConsumer: true, recipientNonTaxpayer: true, destinationLawReference: "RICMS/MG Anexo I — hipótese controlada", ratesConfirmed: true },
    expected: { status: "calculated_reference", lines: [{ code: "interstate", amountCents: 400_000, rateBps: 400 }, { code: "difal", amountCents: 1_400_000, rateBps: 1400 }, { code: "fcp", amountCents: 200_000, rateBps: 200 }, { code: "destination_total", amountCents: 1_600_000 }], blockerCount: 0 },
    expectedProfessionalConclusion: "O caso deve trocar somente a referência interestadual para 4% e recalcular a diferença, sem confundir FCP com DIFAL.",
    additionalSources: [municipalSources.minasGerais],
  },
  {
    code: "SIM-DIFAL-RATES-NOT-CONFIRMED",
    title: "DIFAL com taxas do destino não confirmadas",
    moduleLabel: "ICMS · bloqueio",
    profile: "Venda fictícia sem conferência da legislação do produto",
    scenario: "Os percentuais foram digitados, mas a conferência da alíquota interna e do FCP não foi declarada.",
    operationPeriod: "06/2026",
    kind: "expected_block",
    input: { module: "icms_difal", baseCents: 10_000_000, origin: "SP", destination: "MG", importedQualified: false, destinationInternalRateBps: 1800, fcpRateBps: 200, finalConsumer: true, recipientNonTaxpayer: true, destinationLawReference: "RICMS/MG Anexo I — pendente por produto", ratesConfirmed: false },
    expected: { status: "blocked", lines: [{ code: "destination_total", amountCents: 800_000 }], blockerCount: 1 },
    expectedProfessionalConclusion: "O sistema deve bloquear a memória até a taxa interna e o FCP serem confirmados para o produto concreto.",
    additionalSources: [municipalSources.minasGerais],
  },
  {
    code: "SIM-RTC-2026-COMPLIANT",
    title: "Destaques de CBS e IBS no ano-teste de 2026",
    moduleLabel: "Reforma Tributária",
    profile: "Operação B2B fictícia com base de R$ 100 mil",
    scenario: "Obrigações acessórias e classificação confirmadas; PIS/Cofins informado de R$ 3.650.",
    operationPeriod: "06/2026",
    kind: "calculated_reference",
    input: { module: "rtc_2026", taxableOperationCents: 10_000_000, pisCofinsPayableCents: 365_000, yearConfirmed: true, accessoryObligationsConfirmed: true, operationClassified: true },
    expected: { status: "calculated_reference", lines: [{ code: "cbs", amountCents: 90_000, rateBps: 90 }, { code: "ibs", amountCents: 10_000, rateBps: 10 }, { code: "total", amountCents: 100_000, rateBps: 100 }, { code: "compensation_limit", amountCents: 100_000 }, { code: "net_payable", amountCents: null }], blockerCount: 0 },
    expectedProfessionalConclusion: "A plataforma deve calcular os destaques do teste, limitar a comparação e nunca inventar valor líquido a recolher.",
  },
  {
    code: "SIM-RTC-2026-COMPENSATION-CAP",
    title: "Limite de comparação abaixo do destaque CBS/IBS",
    moduleLabel: "Reforma Tributária",
    profile: "Operação fictícia com PIS/Cofins informado inferior ao destaque",
    scenario: "Base de R$ 100 mil e PIS/Cofins informado de R$ 500.",
    operationPeriod: "06/2026",
    kind: "calculated_reference",
    input: { module: "rtc_2026", taxableOperationCents: 10_000_000, pisCofinsPayableCents: 50_000, yearConfirmed: true, accessoryObligationsConfirmed: true, operationClassified: true },
    expected: { status: "calculated_reference", lines: [{ code: "total", amountCents: 100_000 }, { code: "compensation_limit", amountCents: 50_000 }, { code: "net_payable", amountCents: null }], blockerCount: 0 },
    expectedProfessionalConclusion: "A comparação deve usar o menor valor e continuar sem produzir recolhimento líquido.",
  },
  {
    code: "SIM-RTC-2026-MISSING-OBLIGATION",
    title: "RTC 2026 sem confirmação das obrigações acessórias",
    moduleLabel: "Reforma Tributária · bloqueio",
    profile: "Operação fictícia com destaque calculável, mas sem evidência acessória",
    scenario: "Ano e operação foram confirmados; condições de dispensa e obrigações acessórias não.",
    operationPeriod: "06/2026",
    kind: "expected_block",
    input: { module: "rtc_2026", taxableOperationCents: 10_000_000, pisCofinsPayableCents: 365_000, yearConfirmed: true, accessoryObligationsConfirmed: false, operationClassified: true },
    expected: { status: "blocked", lines: [{ code: "total", amountCents: 100_000 }, { code: "net_payable", amountCents: null }], blockerCount: 1 },
    expectedProfessionalConclusion: "Os destaques podem aparecer na memória, mas a conclusão deve ficar bloqueada e o líquido continuar indeterminado.",
  },
];

function display(value: unknown) {
  return value === null ? "null" : typeof value === "undefined" ? "não exigido" : String(value);
}

export function runFiscalSimulation(simulation: FiscalSimulationCase): FiscalSimulationRun {
  const output = calculateTaxLab(simulation.input);
  const checks: FiscalSimulationRun["checks"] = [];
  checks.push({ code: "status", passed: output.status === simulation.expected.status, expected: simulation.expected.status, actual: output.status });
  const blockers = output.issues.filter((issue) => issue.severity === "blocker");
  checks.push({ code: "blocker_count", passed: blockers.length === simulation.expected.blockerCount, expected: String(simulation.expected.blockerCount), actual: String(blockers.length) });
  for (const expectedLine of simulation.expected.lines) {
    const actualLine = output.lines.find((line) => line.code === expectedLine.code);
    checks.push({ code: `line_${expectedLine.code}_exists`, passed: Boolean(actualLine), expected: "presente", actual: actualLine ? "presente" : "ausente" });
    if (!actualLine) continue;
    if (Object.hasOwn(expectedLine, "amountCents")) checks.push({ code: `line_${expectedLine.code}_amount`, passed: actualLine.amountCents === expectedLine.amountCents, expected: display(expectedLine.amountCents), actual: display(actualLine.amountCents) });
    if (Object.hasOwn(expectedLine, "rateBps")) checks.push({ code: `line_${expectedLine.code}_rate`, passed: actualLine.rateBps === expectedLine.rateBps, expected: display(expectedLine.rateBps), actual: display(actualLine.rateBps) });
  }
  const sourceCodes = Array.from(new Set([...output.sources, ...(simulation.additionalSources ?? [])].map((source) => source.code))).sort();
  return { case: simulation, output, passed: checks.every((check) => check.passed), checks, sourceCodes };
}

export function runFiscalSimulationSuite() {
  return fiscalSimulationCases.map(runFiscalSimulation);
}

export function getFiscalSimulationCase(code: string) {
  return fiscalSimulationCases.find((simulation) => simulation.code === code) ?? null;
}

export function simulationEvidenceSources(simulation: FiscalSimulationCase, output: LabResult) {
  return Array.from(new Map([...output.sources, ...(simulation.additionalSources ?? [])].map((source) => [source.code, source])).values());
}

export async function fiscalSimulationBaseHash() {
  const payload = JSON.stringify({
    suiteVersion: FISCAL_SIMULATION_SUITE_VERSION,
    engineVersion: DETERMINISTIC_TAX_LAB_VERSION,
    cases: fiscalSimulationCases.map(({ code, input, expected, additionalSources = [] }) => ({ code, input, expected, sourceCodes: additionalSources.map((source) => source.code) })),
  });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

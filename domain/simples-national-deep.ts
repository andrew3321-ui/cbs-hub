export const SIMPLES_NATIONAL_DEEP_VERSION = "2026.07.31-v80";
export const SIMPLES_NATIONAL_DEEP_CHECKED_AT = "2026-07-30";
export const SIMPLES_NATIONAL_LIMIT_CENTS = 480_000_000;
export const SIMPLES_NATIONAL_2026_SUBLIMIT_CENTS = 360_000_000;

export type SimplesAnnex = "I" | "II" | "III" | "IV" | "V";
export type SimplesSource = {
  code: string;
  title: string;
  publisher: string;
  url: string;
  legalReference: string;
  checkedAt: string;
};
export type SimplesActivityProfile = {
  rank: number;
  cnae: string;
  activity: string;
  annexCandidates: SimplesAnnex[];
  factorR: "required" | "not_applicable";
  treatment: "commerce" | "industry" | "service" | "construction_or_labor_assignment";
  sourceCodes: string[];
  segregations: string[];
  hardStops: string[];
  classificationPolicy: "candidate_requires_effective_activity_confirmation";
  effectiveFrom: "2018-01-01";
  checkedAt: string;
  version: string;
};
export type SimplesCalculationInput = {
  cnae: string;
  declaredAnnex: SimplesAnnex;
  rbt12Cents: number | null;
  monthlyRevenueCents: number | null;
  fs12Cents?: number | null;
  activityConfirmed: boolean;
  annexConfirmed: boolean;
  revenueCompositionConfirmed: boolean;
  periodClosed: boolean;
  eligibilityConfirmed: boolean;
  under2026SublimitConfirmed: boolean;
  noSpecialTreatment: boolean;
};
export type SimplesCalculationLine = {
  code: string;
  label: string;
  formula: string;
  amountCents: number | null;
  rateBps: number | null;
};
export type SimplesCalculationResult = {
  status: "calculated_reference" | "blocked";
  profile: SimplesActivityProfile | null;
  resolvedAnnex: SimplesAnnex | null;
  bracket: number | null;
  factorRBps: number | null;
  lines: SimplesCalculationLine[];
  blockers: string[];
  warnings: string[];
  sourceCodes: string[];
  version: string;
  checkedAt: string;
};

export const simplesNationalSources: SimplesSource[] = [
  {
    code: "SIMPLES-LC-123",
    title: "Lei Complementar nº 123/2006 — texto compilado",
    publisher: "Presidência da República",
    url: "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm",
    legalReference: "arts. 3º, 17 a 20 e Anexos I a V",
    checkedAt: SIMPLES_NATIONAL_DEEP_CHECKED_AT,
  },
  {
    code: "SIMPLES-CGSN-140",
    title: "Resolução CGSN nº 140/2018 — texto compilado",
    publisher: "Receita Federal do Brasil",
    url: "https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=92278&visao=compilado",
    legalReference: "arts. 2º, 9º a 12, 15, 22 e 25 a 28",
    checkedAt: SIMPLES_NATIONAL_DEEP_CHECKED_AT,
  },
  {
    code: "SIMPLES-PERGUNTAO-2026",
    title: "Perguntas e Respostas do Simples Nacional",
    publisher: "Portal do Simples Nacional",
    url: "https://www8.receita.fazenda.gov.br/SimplesNacional/Arquivos/manual/PerguntaoSN.pdf",
    legalReference: "receita bruta, sublimites, atividades, segregações e fator R",
    checkedAt: SIMPLES_NATIONAL_DEEP_CHECKED_AT,
  },
  {
    code: "SIMPLES-SUBLIMITE-2026",
    title: "Sublimite do Simples Nacional para 2026",
    publisher: "Comitê Gestor do Simples Nacional",
    url: "https://www8.receita.fazenda.gov.br/simplesnacional/noticias/NoticiaCompleta.aspx?id=94c10cc2-7eb5-4ef0-bfb2-5479e72caff8",
    legalReference: "Portaria CGSN nº 54/2025 — R$ 3.600.000 em todas as UFs e no DF",
    checkedAt: SIMPLES_NATIONAL_DEEP_CHECKED_AT,
  },
  {
    code: "CNAE-CONCLA",
    title: "Busca oficial da Classificação Nacional de Atividades Econômicas",
    publisher: "IBGE / CONCLA",
    url: "https://concla.ibge.gov.br/busca-online-cnae.html",
    legalReference: "descrições e notas explicativas das subclasses CNAE",
    checkedAt: SIMPLES_NATIONAL_DEEP_CHECKED_AT,
  },
];

type AnnexBracket = {
  fromCents: number;
  toCents: number;
  nominalBps: number;
  deductionCents: number;
};

const limits = [
  [0, 18_000_000],
  [18_000_001, 36_000_000],
  [36_000_001, 72_000_000],
  [72_000_001, 180_000_000],
  [180_000_001, 360_000_000],
  [360_000_001, 480_000_000],
] as const;

function table(rates: readonly number[], deductions: readonly number[]): AnnexBracket[] {
  return limits.map(([fromCents, toCents], index) => ({
    fromCents,
    toCents,
    nominalBps: rates[index],
    deductionCents: deductions[index],
  }));
}

export const simplesAnnexTables: Record<SimplesAnnex, AnnexBracket[]> = {
  I: table([400, 730, 950, 1070, 1430, 1900], [0, 594_000, 1_386_000, 2_250_000, 8_730_000, 37_800_000]),
  II: table([450, 780, 1000, 1120, 1470, 3000], [0, 594_000, 1_386_000, 2_250_000, 8_550_000, 72_000_000]),
  III: table([600, 1120, 1350, 1600, 2100, 3300], [0, 936_000, 1_764_000, 3_564_000, 12_564_000, 64_800_000]),
  IV: table([450, 900, 1020, 1400, 2200, 3300], [0, 810_000, 1_242_000, 3_978_000, 18_378_000, 82_800_000]),
  V: table([1550, 1800, 1950, 2050, 2300, 3050], [0, 450_000, 990_000, 1_710_000, 6_210_000, 54_000_000]),
};

const commonStops = [
  "CNAE não substitui a confirmação da atividade efetivamente exercida",
  "receitas de atividades ou tratamentos diferentes precisam ser segregadas",
  "impedimentos societários, cadastrais, fiscais e de atividade precisam ser descartados",
] as const;
const tradeSegregations = ["ICMS-ST/antecipação com encerramento", "PIS/Cofins monofásico", "exportação", "vendas canceladas e descontos incondicionais"];
const serviceSegregations = ["ISS retido ou devido fora do estabelecimento", "exportação de serviços", "receita sujeita a fator R", "atividade de outro anexo"];

function profile(
  rank: number,
  cnae: string,
  activity: string,
  annexCandidates: SimplesAnnex[],
  factorR: SimplesActivityProfile["factorR"],
  treatment: SimplesActivityProfile["treatment"],
  segregations: string[],
  extraStops: string[] = [],
): SimplesActivityProfile {
  return {
    rank,
    cnae,
    activity,
    annexCandidates,
    factorR,
    treatment,
    sourceCodes: ["SIMPLES-LC-123", "SIMPLES-CGSN-140", "SIMPLES-PERGUNTAO-2026", "CNAE-CONCLA"],
    segregations,
    hardStops: [...commonStops, ...extraStops],
    classificationPolicy: "candidate_requires_effective_activity_confirmation",
    effectiveFrom: "2018-01-01",
    checkedAt: SIMPLES_NATIONAL_DEEP_CHECKED_AT,
    version: SIMPLES_NATIONAL_DEEP_VERSION,
  };
}

export const simplesActivityProfiles: SimplesActivityProfile[] = [
  profile(1, "4711302", "Supermercados", ["I"], "not_applicable", "commerce", tradeSegregations),
  profile(2, "4530703", "Comércio varejista de peças e acessórios novos para veículos", ["I"], "not_applicable", "commerce", tradeSegregations),
  profile(3, "4781400", "Comércio varejista de artigos do vestuário e acessórios", ["I"], "not_applicable", "commerce", tradeSegregations),
  profile(4, "1091102", "Fabricação de produtos de padaria e confeitaria com predominância própria", ["II"], "not_applicable", "industry", [...tradeSegregations, "receita de revenda no Anexo I", "IPI e industrialização por encomenda"]),
  profile(5, "3101200", "Fabricação de móveis com predominância de madeira", ["II"], "not_applicable", "industry", [...tradeSegregations, "receita de revenda no Anexo I", "IPI e benefícios de produto"]),
  profile(6, "6920601", "Atividades de contabilidade", ["III"], "not_applicable", "service", serviceSegregations, ["atividade típica contábil e regra municipal de ISS precisam coincidir"]),
  profile(7, "4520001", "Serviços de manutenção e reparação mecânica de veículos", ["III"], "not_applicable", "service", [...serviceSegregations, "peças e mercadorias comercializadas no Anexo I"]),
  profile(8, "9602501", "Cabeleireiros, manicure e pedicure", ["III"], "not_applicable", "service", [...serviceSegregations, "produtos revendidos no Anexo I", "modelo salão-parceiro"]),
  profile(9, "8599604", "Treinamento em desenvolvimento profissional e gerencial", ["III"], "not_applicable", "service", serviceSegregations),
  profile(10, "6201501", "Desenvolvimento de programas de computador sob encomenda", ["III", "V"], "required", "service", serviceSegregations),
  profile(11, "6204000", "Consultoria em tecnologia da informação", ["III", "V"], "required", "service", serviceSegregations),
  profile(12, "7020400", "Consultoria em gestão empresarial", ["III", "V"], "required", "service", serviceSegregations),
  profile(13, "7311400", "Agências de publicidade", ["III", "V"], "required", "service", [...serviceSegregations, "valores de terceiros e receitas próprias"]),
  profile(14, "7112000", "Serviços de engenharia", ["III", "V"], "required", "service", serviceSegregations, ["obra executada, projeto e cessão de mão de obra não podem ser confundidos"]),
  profile(15, "8630503", "Atividade médica ambulatorial restrita a consultas", ["III", "V"], "required", "service", serviceSegregations),
  profile(16, "8630504", "Atividade odontológica", ["III", "V"], "required", "service", serviceSegregations),
  profile(17, "7500100", "Atividades veterinárias", ["III", "V"], "required", "service", [...serviceSegregations, "medicamentos e mercadorias revendidos"]),
  profile(18, "4120400", "Construção de edifícios", ["IV"], "not_applicable", "construction_or_labor_assignment", serviceSegregations, ["CPP patronal permanece fora do DAS", "empreitada e cessão de mão de obra exigem fatos próprios"]),
  profile(19, "4321500", "Instalação e manutenção elétrica", ["IV"], "not_applicable", "construction_or_labor_assignment", serviceSegregations, ["CPP patronal permanece fora do DAS", "obra e manutenção isolada precisam ser distinguidas"]),
  profile(20, "8121400", "Limpeza em prédios e domicílios", ["IV"], "not_applicable", "construction_or_labor_assignment", serviceSegregations, ["CPP patronal permanece fora do DAS", "cessão de mão de obra e retenção previdenciária"]),
];

export const simplesActivityProfileByCnae = new Map(simplesActivityProfiles.map((item) => [item.cnae, item]));

export const simplesSegregationRules = [
  { code: "ordinary", label: "Receita comum do anexo confirmado", effect: "entra na memória do anexo somente depois da composição completa" },
  { code: "icms_st", label: "ICMS-ST ou antecipação com encerramento", effect: "segregar a parcela estadual conforme a hipótese comprovada" },
  { code: "pis_cofins_monophase", label: "PIS/Cofins monofásico", effect: "segregar somente produto e receita abrangidos pela legislação específica" },
  { code: "export", label: "Exportação", effect: "separar mercado externo e comprovar o resultado da operação" },
  { code: "iss_withheld", label: "ISS retido ou devido a outro município", effect: "segregar município, responsabilidade e valor do serviço" },
  { code: "mixed_activity", label: "Atividades em anexos diferentes", effect: "manter receita mensal própria para cada atividade e anexo" },
] as const;

export const simplesEligibilityGates = [
  "receita bruta global dentro do limite de R$ 4.800.000",
  "sócios, participações e receita global de empresas relacionadas conferidos",
  "natureza jurídica e atividade sem vedação aplicável",
  "débitos e cadastros fiscais regularizados para a opção",
  "receitas de matriz e filiais consolidadas",
] as const;

export const simplesExclusionRules = [
  { code: "annual_limit", fact: "receita bruta global ultrapassa R$ 4.800.000", consequence: "bloquear o DAS e determinar o efeito temporal do excesso conforme a proporção e o período", sourceCodes: ["SIMPLES-LC-123", "SIMPLES-CGSN-140"] },
  { code: "ownership_structure", fact: "sócio, participação societária ou receita global relacionada incompatível", consequence: "bloquear elegibilidade até conferir toda a estrutura societária", sourceCodes: ["SIMPLES-LC-123", "SIMPLES-CGSN-140"] },
  { code: "forbidden_activity", fact: "atividade efetiva alcançada por vedação legal", consequence: "bloquear opção ou permanência sem inferir apenas pelo CNAE", sourceCodes: ["SIMPLES-LC-123", "SIMPLES-CGSN-140", "CNAE-CONCLA"] },
  { code: "tax_debt_or_registration", fact: "débito ou irregularidade cadastral relevante não saneada", consequence: "bloquear a afirmação de elegibilidade e direcionar para conferência oficial", sourceCodes: ["SIMPLES-LC-123", "SIMPLES-CGSN-140"] },
  { code: "sublimit", fact: "receita acumulada ultrapassa R$ 3.600.000 em 2026", consequence: "separar ICMS e ISS do DAS na data de efeito legal, preservando os demais tributos até análise do limite nacional", sourceCodes: ["SIMPLES-CGSN-140", "SIMPLES-SUBLIMITE-2026"] },
] as const;

function safeMoney(value: number, field: string, min = 0, max = Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new Error(`invalid_${field}`);
  return value;
}

function roundDivide(numerator: bigint, denominator: bigint) {
  if (denominator <= 0n || numerator < 0n) throw new Error("invalid_simples_ratio");
  const rounded = (numerator + denominator / 2n) / denominator;
  if (rounded > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("unsafe_simples_ratio");
  return Number(rounded);
}

function calculateAnnex(annex: SimplesAnnex, rbt12Cents: number, monthlyRevenueCents: number) {
  const bracketIndex = simplesAnnexTables[annex].findIndex((item) => rbt12Cents >= item.fromCents && rbt12Cents <= item.toCents);
  const bracket = simplesAnnexTables[annex][bracketIndex];
  if (!bracket) throw new Error("rbt12_out_of_simples_limit");
  const effectiveNumerator = BigInt(rbt12Cents) * BigInt(bracket.nominalBps)
    - BigInt(bracket.deductionCents) * 10_000n;
  return {
    bracketIndex,
    bracket,
    effectiveRateBps: roundDivide(effectiveNumerator, BigInt(rbt12Cents)),
    referenceCents: roundDivide(BigInt(monthlyRevenueCents) * effectiveNumerator, BigInt(rbt12Cents) * 10_000n),
  };
}

export function resolveSimplesActivity(cnae: string) {
  return simplesActivityProfileByCnae.get(cnae.replace(/\D/g, "")) ?? null;
}

export function calculateSimplesNationalDeepReference(input: SimplesCalculationInput): SimplesCalculationResult {
  const profile = resolveSimplesActivity(input.cnae);
  const blockers: string[] = [];
  const warnings = [
    "A memória é uma referência determinística e precisa ser reconciliada no PGDAS-D.",
    "CNAE é um indício; contrato, notas fiscais e atividade efetivamente exercida prevalecem.",
  ];
  const rbt12 = input.rbt12Cents;
  const revenue = input.monthlyRevenueCents;

  if (!profile) blockers.push("CNAE fora dos 20 perfis prioritários estruturados");
  if (rbt12 === null) blockers.push("RBT12 não informado");
  if (revenue === null) blockers.push("receita mensal e sua composição não informadas");
  if (!input.activityConfirmed) blockers.push("atividade efetivamente exercida não confirmada");
  if (!input.annexConfirmed) blockers.push("anexo não confirmado pelos fatos da atividade");
  if (!input.revenueCompositionConfirmed) blockers.push("composição e segregações da receita não confirmadas");
  if (!input.periodClosed) blockers.push("período de apuração não fechado");
  if (!input.eligibilityConfirmed) blockers.push("elegibilidade, impedimentos e receita global não conferidos");
  if (!input.under2026SublimitConfirmed) blockers.push("sublimite de ICMS/ISS de 2026 não conferido");
  if (!input.noSpecialTreatment) blockers.push("tratamento especial exige segregação própria no PGDAS-D");

  if (rbt12 !== null) {
    safeMoney(rbt12, "rbt12", 1);
    if (rbt12 > SIMPLES_NATIONAL_LIMIT_CENTS) blockers.push("RBT12 excede o limite nacional de R$ 4.800.000");
    if (rbt12 > SIMPLES_NATIONAL_2026_SUBLIMIT_CENTS) blockers.push("ICMS e ISS devem ser tratados fora do DAS após o sublimite de 2026");
  }
  if (revenue !== null) safeMoney(revenue, "monthly_revenue");
  if (profile && !profile.annexCandidates.includes(input.declaredAnnex)) blockers.push("anexo declarado incompatível com o perfil candidato");

  let factorRBps: number | null = null;
  let resolvedAnnex: SimplesAnnex | null = profile && profile.annexCandidates.includes(input.declaredAnnex) ? input.declaredAnnex : null;
  if (profile?.factorR === "required") {
    if (rbt12 === null || input.fs12Cents === null || input.fs12Cents === undefined) {
      blockers.push("FS12 ausente para atividade sujeita ao fator R");
      resolvedAnnex = null;
    } else {
      const fs12 = safeMoney(input.fs12Cents, "fs12");
      factorRBps = roundDivide(BigInt(fs12) * 10_000n, BigInt(rbt12));
      const factorAnnex: SimplesAnnex = BigInt(fs12) * 100n >= BigInt(rbt12) * 28n ? "III" : "V";
      resolvedAnnex = factorAnnex;
      if (input.declaredAnnex !== factorAnnex) blockers.push(`fator R conduz ao Anexo ${factorAnnex}, divergente do anexo declarado`);
    }
  } else if (input.fs12Cents !== null && input.fs12Cents !== undefined) {
    safeMoney(input.fs12Cents, "fs12");
    warnings.push("FS12 foi preservada como evidência, mas não altera o anexo deste perfil.");
  }

  if (blockers.length || rbt12 === null || revenue === null || resolvedAnnex === null) {
    return {
      status: "blocked",
      profile,
      resolvedAnnex,
      bracket: null,
      factorRBps,
      lines: [],
      blockers: [...new Set(blockers)],
      warnings,
      sourceCodes: profile?.sourceCodes ?? ["SIMPLES-LC-123", "SIMPLES-CGSN-140"],
      version: SIMPLES_NATIONAL_DEEP_VERSION,
      checkedAt: SIMPLES_NATIONAL_DEEP_CHECKED_AT,
    };
  }

  const calculation = calculateAnnex(resolvedAnnex, rbt12, revenue);
  return {
    status: "calculated_reference",
    profile,
    resolvedAnnex,
    bracket: calculation.bracketIndex + 1,
    factorRBps,
    lines: [
      { code: "rbt12", label: "RBT12", formula: "receita bruta acumulada confirmada", amountCents: rbt12, rateBps: null },
      { code: "monthly_revenue", label: "Receita mensal segregada", formula: "receita ordinária do anexo confirmado", amountCents: revenue, rateBps: null },
      { code: "nominal", label: "Alíquota nominal", formula: `Anexo ${resolvedAnnex}, faixa ${calculation.bracketIndex + 1}`, amountCents: null, rateBps: calculation.bracket.nominalBps },
      { code: "deduction", label: "Parcela a deduzir", formula: `Anexo ${resolvedAnnex}, faixa ${calculation.bracketIndex + 1}`, amountCents: calculation.bracket.deductionCents, rateBps: null },
      { code: "effective", label: "Alíquota efetiva", formula: "(RBT12 × nominal − parcela a deduzir) ÷ RBT12", amountCents: null, rateBps: calculation.effectiveRateBps },
      { code: "reference", label: "DAS de referência", formula: "receita mensal segregada × alíquota efetiva", amountCents: calculation.referenceCents, rateBps: calculation.effectiveRateBps },
    ],
    blockers: [],
    warnings,
    sourceCodes: profile.sourceCodes,
    version: SIMPLES_NATIONAL_DEEP_VERSION,
    checkedAt: SIMPLES_NATIONAL_DEEP_CHECKED_AT,
  };
}

export function simplesNationalDeepMetrics() {
  return {
    prioritizedActivities: simplesActivityProfiles.length,
    annexes: Object.keys(simplesAnnexTables).length,
    annexBracketMemories: Object.values(simplesAnnexTables).reduce((total, brackets) => total + brackets.length, 0),
    segregationRules: simplesSegregationRules.length,
    eligibilityGates: simplesEligibilityGates.length,
    exclusionRules: simplesExclusionRules.length,
    deterministicCases: simplesActivityProfiles.length + 30 + 7,
    calculatedMemories: simplesActivityProfiles.length + 30,
    safelyBlockedCases: 7,
  };
}

export function validateSimplesNationalDeep() {
  const errors: string[] = [];
  if (simplesActivityProfiles.length !== 20) errors.push("twenty_priority_activities_required");
  if (new Set(simplesActivityProfiles.map((item) => item.cnae)).size !== 20) errors.push("duplicate_cnae");
  if (Object.values(simplesAnnexTables).some((brackets) => brackets.length !== 6)) errors.push("six_brackets_per_annex_required");
  if (new Set(simplesNationalSources.map((item) => item.code)).size !== simplesNationalSources.length) errors.push("duplicate_source_code");
  if (!simplesNationalSources.every((item) => item.url.startsWith("https://") && item.checkedAt === SIMPLES_NATIONAL_DEEP_CHECKED_AT)) errors.push("official_source_metadata_invalid");
  if (!simplesActivityProfiles.some((item) => item.annexCandidates.includes("II"))) errors.push("annex_ii_uncovered");
  if (!simplesActivityProfiles.some((item) => item.annexCandidates.includes("IV"))) errors.push("annex_iv_uncovered");
  if (!simplesActivityProfiles.some((item) => item.factorR === "required")) errors.push("factor_r_profiles_missing");
  for (const item of simplesActivityProfiles) {
    if (!/^\d{7}$/.test(item.cnae)) errors.push(`${item.cnae}:invalid_cnae`);
    if (item.sourceCodes.length < 4 || item.segregations.length < 4 || item.hardStops.length < 3) errors.push(`${item.cnae}:profile_incomplete`);
    if (item.effectiveFrom !== "2018-01-01" || item.checkedAt !== SIMPLES_NATIONAL_DEEP_CHECKED_AT || item.version !== SIMPLES_NATIONAL_DEEP_VERSION) errors.push(`${item.cnae}:validity_metadata_incomplete`);
  }
  if (simplesExclusionRules.length < 5 || simplesExclusionRules.some((item) => item.sourceCodes.length < 2)) errors.push("exclusion_rules_incomplete");

  const completeInput = {
    rbt12Cents: 120_000_000,
    monthlyRevenueCents: 10_000_000,
    activityConfirmed: true,
    annexConfirmed: true,
    revenueCompositionConfirmed: true,
    periodClosed: true,
    eligibilityConfirmed: true,
    under2026SublimitConfirmed: true,
    noSpecialTreatment: true,
  } as const;
  for (const item of simplesActivityProfiles) {
    const declaredAnnex = item.factorR === "required" ? "III" : item.annexCandidates[0];
    const output = calculateSimplesNationalDeepReference({
      ...completeInput,
      cnae: item.cnae,
      declaredAnnex,
      fs12Cents: item.factorR === "required" ? 33_600_000 : null,
    });
    if (output.status !== "calculated_reference" || output.lines.at(-1)?.amountCents === null) errors.push(`${item.cnae}:reference_not_reproduced`);
  }
  const missingRbt = calculateSimplesNationalDeepReference({
    ...completeInput,
    cnae: "4711302",
    declaredAnnex: "I",
    rbt12Cents: null,
  });
  if (missingRbt.status !== "blocked" || !missingRbt.blockers.includes("RBT12 não informado")) errors.push("missing_rbt12_not_blocked");

  return { passed: errors.length === 0, errors };
}

export async function hashSimplesNationalDeep() {
  const payload = JSON.stringify({
    version: SIMPLES_NATIONAL_DEEP_VERSION,
    checkedAt: SIMPLES_NATIONAL_DEEP_CHECKED_AT,
    sources: simplesNationalSources,
    annexTables: simplesAnnexTables,
    activities: simplesActivityProfiles,
    segregations: simplesSegregationRules,
    eligibility: simplesEligibilityGates,
    exclusions: simplesExclusionRules,
  });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

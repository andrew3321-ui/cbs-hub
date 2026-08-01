import {
  SIMPLES_NATIONAL_2026_SUBLIMIT_CENTS,
  SIMPLES_NATIONAL_LIMIT_CENTS,
  simplesActivityProfiles,
  simplesAnnexTables,
  simplesNationalSources,
  type SimplesActivityProfile,
  type SimplesAnnex,
} from "./simples-national-deep.ts";

export const SIMPLES_NATIONAL_100_EXPANSION_VERSION = "2026.08.01-v104";
export const SIMPLES_NATIONAL_100_EXPANSION_CHECKED_AT = "2026-08-01";

export const simplesNational100ExpansionSources = [
  ...simplesNationalSources,
  {
    code: "SIMPLES-PGDAS-MANUAL-V4",
    title: "Manual do PGDAS-D e DEFIS — versão 4",
    publisher: "Portal do Simples Nacional",
    url: "https://www8.receita.fazenda.gov.br/SimplesNacional/Arquivos/manual/MANUAL_PGDAS-D_2018_V4.pdf",
    legalReference: "RBT12, FS12, fator R, início de atividade e segregação de receitas",
    checkedAt: SIMPLES_NATIONAL_100_EXPANSION_CHECKED_AT,
  },
  {
    code: "SIMPLES-COSIT-24-FACTOR-R",
    title: "Solução de Consulta Cosit nº 24/2026 — fator R",
    publisher: "Receita Federal do Brasil",
    url: "https://normas.receita.fazenda.gov.br/sijut2consulta/normas.receita.fazenda.gov.br/sijut2consulta/anexoOutros.action?idArquivoBinario=78278",
    legalReference: "art. 26 da Resolução CGSN nº 140/2018; composição da FS12 e janela de doze meses",
    checkedAt: SIMPLES_NATIONAL_100_EXPANSION_CHECKED_AT,
  },
  {
    code: "SIMPLES-IN-RFB-2110-ANNEX-IV",
    title: "IN RFB nº 2.110/2022 — contribuição patronal no Anexo IV",
    publisher: "Receita Federal do Brasil",
    url: "https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=126687",
    legalReference: "arts. 170 e seguintes; CPP fora do DAS nas atividades do Anexo IV",
    checkedAt: SIMPLES_NATIONAL_100_EXPANSION_CHECKED_AT,
  },
];

type ProfileSeed = readonly [
  cnae: string,
  activity: string,
  annexCandidates: readonly SimplesAnnex[],
  factorR: SimplesActivityProfile["factorR"],
  treatment: SimplesActivityProfile["treatment"],
];

const profileSeeds: ProfileSeed[] = [
  ["4530701", "Comércio por atacado de peças e acessórios novos para veículos", ["I"], "not_applicable", "commerce"],
  ["4511101", "Comércio por atacado de automóveis e utilitários novos", ["I"], "not_applicable", "commerce"],
  ["4644301", "Comércio atacadista de medicamentos e drogas de uso humano", ["I"], "not_applicable", "commerce"],
  ["4646001", "Comércio atacadista de cosméticos e produtos de perfumaria", ["I"], "not_applicable", "commerce"],
  ["4639701", "Comércio atacadista de produtos alimentícios em geral", ["I"], "not_applicable", "commerce"],
  ["4635401", "Comércio atacadista de água, cerveja e bebidas", ["I"], "not_applicable", "commerce"],
  ["4679699", "Comércio atacadista de materiais de construção em geral", ["I"], "not_applicable", "commerce"],
  ["4691500", "Comércio atacadista de mercadorias em geral", ["I"], "not_applicable", "commerce"],
  ["4712100", "Comércio varejista de minimercados, mercearias e armazéns", ["I"], "not_applicable", "commerce"],
  ["4721102", "Padaria e confeitaria com predominância de revenda", ["I"], "not_applicable", "commerce"],
  ["4722901", "Comércio varejista de carnes e açougues", ["I"], "not_applicable", "commerce"],
  ["4754701", "Comércio varejista de móveis", ["I"], "not_applicable", "commerce"],
  ["4782201", "Comércio varejista de calçados", ["I"], "not_applicable", "commerce"],
  ["4791001", "Comércio varejista por correspondência ou internet", ["I"], "not_applicable", "commerce"],
  ["4763601", "Comércio varejista de artigos esportivos", ["I"], "not_applicable", "commerce"],
  ["1012101", "Abate de bovinos sob inspeção sanitária", ["II"], "not_applicable", "industry"],
  ["1013901", "Fabricação de produtos de carne", ["II"], "not_applicable", "industry"],
  ["1031700", "Fabricação de conservas de frutas", ["II"], "not_applicable", "industry"],
  ["1071600", "Fabricação de açúcar em bruto", ["II"], "not_applicable", "industry"],
  ["1099604", "Fabricação de alimentos e pratos prontos", ["II"], "not_applicable", "industry"],
  ["1121600", "Fabricação de águas envasadas", ["II"], "not_applicable", "industry"],
  ["1351100", "Fabricação de artefatos têxteis para uso doméstico", ["II"], "not_applicable", "industry"],
  ["1811301", "Impressão de jornais, livros e publicações", ["II"], "not_applicable", "industry"],
  ["2813500", "Fabricação de válvulas, registros e dispositivos", ["II"], "not_applicable", "industry"],
  ["3292202", "Fabricação de equipamentos de segurança e proteção", ["II"], "not_applicable", "industry"],
  ["6202300", "Desenvolvimento e licenciamento de programas customizáveis", ["III", "V"], "required", "service"],
  ["6203100", "Desenvolvimento e licenciamento de programas não customizáveis", ["III", "V"], "required", "service"],
  ["6311900", "Tratamento de dados, provedores e hospedagem", ["III", "V"], "required", "service"],
  ["6319400", "Portais, provedores de conteúdo e serviços de informação", ["III", "V"], "required", "service"],
  ["7111100", "Serviços de arquitetura", ["III", "V"], "required", "service"],
  ["7119701", "Serviços de cartografia, topografia e geodésia", ["III", "V"], "required", "service"],
  ["7119703", "Serviços de desenho técnico", ["III", "V"], "required", "service"],
  ["7490104", "Atividades de intermediação e agenciamento profissional", ["III", "V"], "required", "service"],
  ["7490199", "Outras atividades profissionais, científicas e técnicas", ["III", "V"], "required", "service"],
  ["8640202", "Laboratórios clínicos", ["III", "V"], "required", "service"],
  ["8640203", "Serviços de diagnóstico por imagem", ["III", "V"], "required", "service"],
  ["8650004", "Atividades de fisioterapia", ["III", "V"], "required", "service"],
  ["8650003", "Atividades de psicologia e psicanálise", ["III", "V"], "required", "service"],
  ["8650002", "Atividades de profissionais da nutrição", ["III", "V"], "required", "service"],
  ["9313100", "Atividades de condicionamento físico", ["III", "V"], "required", "service"],
  ["8591100", "Ensino de esportes", ["III"], "not_applicable", "service"],
  ["8593700", "Ensino de idiomas", ["III"], "not_applicable", "service"],
  ["9512600", "Reparação de equipamentos de comunicação", ["III"], "not_applicable", "service"],
  ["9521500", "Reparação e manutenção de equipamentos eletroeletrônicos", ["III"], "not_applicable", "service"],
  ["9601701", "Lavanderias", ["III"], "not_applicable", "service"],
  ["4222701", "Construção de redes de abastecimento de água", ["IV"], "not_applicable", "construction_or_labor_assignment"],
  ["4299599", "Outras obras de engenharia civil", ["IV"], "not_applicable", "construction_or_labor_assignment"],
  ["4313400", "Obras de terraplenagem", ["IV"], "not_applicable", "construction_or_labor_assignment"],
  ["4322301", "Instalações hidráulicas, sanitárias e de gás", ["IV"], "not_applicable", "construction_or_labor_assignment"],
  ["4330404", "Serviços de pintura de edifícios", ["IV"], "not_applicable", "construction_or_labor_assignment"],
];

const tradeSegregations = ["ICMS-ST", "PIS/Cofins monofásico", "exportação", "receita não tributada", "venda cancelada"];
const serviceSegregations = ["ISS retido", "exportação de serviços", "receita não tributada", "atividade de outro anexo", "retenções fora do DAS"];

export const simplesNational100AdditionalProfiles = profileSeeds.map((seed, index) => ({
  rank: index + 51,
  cnae: seed[0],
  activity: seed[1],
  annexCandidates: [...seed[2]],
  factorR: seed[3],
  treatment: seed[4],
  sourceCodes: ["SIMPLES-LC-123", "SIMPLES-CGSN-140", "SIMPLES-PERGUNTAO-2026", "CNAE-CONCLA"],
  segregations: seed[4] === "commerce" || seed[4] === "industry" ? [...tradeSegregations] : [...serviceSegregations],
  hardStops: [
    "CNAE é candidato de triagem e não conclui o anexo sem a atividade efetivamente exercida",
    "receitas por atividade, operação e tratamento precisam ser segregadas",
    "impedimentos, sublimite, início de atividade e regime precisam ser confirmados",
    ...(seed[4] === "construction_or_labor_assignment" ? ["CPP patronal do Anexo IV permanece fora do DAS e não é estimada sem folha real"] : []),
  ],
  classificationPolicy: "candidate_requires_effective_activity_confirmation" as const,
  effectiveFrom: "2018-01-01" as const,
  checkedAt: SIMPLES_NATIONAL_100_EXPANSION_CHECKED_AT,
  version: SIMPLES_NATIONAL_100_EXPANSION_VERSION,
  calculationSupported: true,
}));

export const simplesNational100Profiles = [
  ...simplesActivityProfiles.map((profile) => ({ ...profile, calculationSupported: true })),
  ...simplesNational100AdditionalProfiles,
];

export const SIMPLES_REVENUE_BOOKS = [
  "ordinary",
  "icms_st",
  "pis_cofins_monophase",
  "iss_withheld",
  "export",
  "non_taxed",
] as const;

export type SimplesRevenueBook = Record<(typeof SIMPLES_REVENUE_BOOKS)[number], number>;
export type SimplesMonthlyWindow = {
  grossRevenueCents: number[];
  salariesCents: number[];
  proLaboreCents: number[];
  employerContributionCents: number[];
  fgtsCents: number[];
};

export type Simples100ExpansionInput = {
  cnae: string;
  declaredAnnex: SimplesAnnex;
  calculationPeriod: string;
  monthsInActivity: number;
  monthlyWindow: SimplesMonthlyWindow | null;
  revenueBooks: SimplesRevenueBook;
  activityConfirmed: boolean;
  annexConfirmed: boolean;
  eligibilityConfirmed: boolean;
  revenueSegregationConfirmed: boolean;
  periodClosed: boolean;
  startActivityAnnualizationConfirmed: boolean;
};

type LedgerLine = { code: string; amountCents: number | null; treatment: string };

export type Simples100ExpansionResult = {
  status: "calculated_reference" | "blocked";
  profileCode: string | null;
  resolvedAnnex: SimplesAnnex | null;
  rbt12Cents: number | null;
  fs12Cents: number | null;
  factorRBps: number | null;
  ordinaryReferenceCents: number | null;
  revenueLedgers: LedgerLine[];
  outsideDasLedgers: LedgerLine[];
  blockers: string[];
  sourceCodes: string[];
  version: string;
};

function isMoney(value: number) {
  return Number.isSafeInteger(value) && value >= 0;
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function roundDivide(numerator: bigint, denominator: bigint) {
  if (denominator <= 0n) throw new Error("invalid_denominator");
  return Number((numerator + denominator / 2n) / denominator);
}

function annexReference(annex: SimplesAnnex, rbt12Cents: number, revenueCents: number) {
  const bracket = simplesAnnexTables[annex].find((item) => rbt12Cents >= item.fromCents && rbt12Cents <= item.toCents);
  if (!bracket) return null;
  const numerator = BigInt(rbt12Cents) * BigInt(bracket.nominalBps) - BigInt(bracket.deductionCents) * 10_000n;
  return roundDivide(BigInt(revenueCents) * numerator, BigInt(rbt12Cents) * 10_000n);
}

export function resolveSimplesNational100Expansion(input: Simples100ExpansionInput): Simples100ExpansionResult {
  const profile = simplesNational100Profiles.find((item) => item.cnae === input.cnae.replace(/\D/g, "")) ?? null;
  const blockers: string[] = [];
  if (!profile) blockers.push("CNAE fora dos 100 perfis documentados");
  if (!/^\d{4}-\d{2}$/.test(input.calculationPeriod)) blockers.push("período de apuração inválido");
  if (!Number.isInteger(input.monthsInActivity) || input.monthsInActivity < 1 || input.monthsInActivity > 12) blockers.push("meses de atividade devem estar entre 1 e 12");
  if (!input.activityConfirmed) blockers.push("atividade efetivamente exercida não confirmada");
  if (!input.annexConfirmed || (profile && !profile.annexCandidates.includes(input.declaredAnnex))) blockers.push("anexo não confirmado ou incompatível com o perfil candidato");
  if (!input.eligibilityConfirmed) blockers.push("elegibilidade, impedimentos e receita global não conferidos");
  if (!input.revenueSegregationConfirmed) blockers.push("receitas especiais não foram segregadas e conciliadas");
  if (!input.periodClosed) blockers.push("período de apuração não fechado");
  if (input.monthsInActivity < 12 && !input.startActivityAnnualizationConfirmed) blockers.push("anualização de início de atividade não confirmada");
  const window = input.monthlyWindow;
  if (!window) blockers.push("janela mensal de RBT12 e FS12 ausente");
  const arrays = window ? [window.grossRevenueCents, window.salariesCents, window.proLaboreCents, window.employerContributionCents, window.fgtsCents] : [];
  if (window && arrays.some((values) => values.length !== input.monthsInActivity || values.some((value) => !isMoney(value)))) blockers.push("janela mensal possui quantidade ou valor inválido");
  if (!SIMPLES_REVENUE_BOOKS.every((book) => isMoney(input.revenueBooks[book]))) blockers.push("livro mensal de receitas inválido");

  let rbt12Cents: number | null = null;
  let fs12Cents: number | null = null;
  let factorRBps: number | null = null;
  let resolvedAnnex: SimplesAnnex | null = profile ? input.declaredAnnex : null;
  if (window && !arrays.some((values) => values.length !== input.monthsInActivity || values.some((value) => !isMoney(value)))) {
    const rawRbt = sum(window.grossRevenueCents);
    const rawFs = sum(window.salariesCents) + sum(window.proLaboreCents) + sum(window.employerContributionCents) + sum(window.fgtsCents);
    rbt12Cents = input.monthsInActivity < 12 ? roundDivide(BigInt(rawRbt) * 12n, BigInt(input.monthsInActivity)) : rawRbt;
    fs12Cents = input.monthsInActivity < 12 ? roundDivide(BigInt(rawFs) * 12n, BigInt(input.monthsInActivity)) : rawFs;
    if (rbt12Cents > SIMPLES_NATIONAL_LIMIT_CENTS) blockers.push("RBT12 anualizada excede o limite nacional");
    if (rbt12Cents > SIMPLES_NATIONAL_2026_SUBLIMIT_CENTS) blockers.push("ICMS e ISS precisam ser tratados fora do DAS após o sublimite de 2026");
    if (profile?.factorR === "required") {
      factorRBps = rbt12Cents > 0 ? roundDivide(BigInt(fs12Cents) * 10_000n, BigInt(rbt12Cents)) : 100;
      resolvedAnnex = factorRBps >= 2_800 ? "III" : "V";
      if (resolvedAnnex !== input.declaredAnnex) blockers.push(`fator R conduz ao Anexo ${resolvedAnnex}, divergente do anexo declarado`);
    }
  }

  const revenueLedgers = SIMPLES_REVENUE_BOOKS.map((book) => ({
    code: book,
    amountCents: input.revenueBooks[book],
    treatment: book === "ordinary" ? "base ordinária do anexo confirmado" : "segregação própria no PGDAS-D; sem exclusão presumida de todos os tributos",
  }));
  const outsideDasLedgers: LedgerLine[] = resolvedAnnex === "IV"
    ? [{ code: "cpp_annex_iv", amountCents: null, treatment: "CPP fora do DAS; depende da folha, rubricas e regras previdenciárias reais" }]
    : [];
  const ordinaryReferenceCents = blockers.length || !rbt12Cents || !resolvedAnnex
    ? null
    : annexReference(resolvedAnnex, rbt12Cents, input.revenueBooks.ordinary);
  return {
    status: blockers.length ? "blocked" : "calculated_reference",
    profileCode: profile?.cnae ?? null,
    resolvedAnnex,
    rbt12Cents,
    fs12Cents,
    factorRBps,
    ordinaryReferenceCents,
    revenueLedgers,
    outsideDasLedgers,
    blockers,
    sourceCodes: ["SIMPLES-LC-123", "SIMPLES-CGSN-140", "SIMPLES-PERGUNTAO-2026", "SIMPLES-PGDAS-MANUAL-V4", "SIMPLES-COSIT-24-FACTOR-R", "SIMPLES-IN-RFB-2110-ANNEX-IV", "CNAE-CONCLA"],
    version: SIMPLES_NATIONAL_100_EXPANSION_VERSION,
  };
}

const monthly = (value: number) => Array.from({ length: 12 }, () => value);
const completeInput = (profile: (typeof simplesNational100AdditionalProfiles)[number]): Simples100ExpansionInput => ({
  cnae: profile.cnae,
  declaredAnnex: profile.factorR === "required" ? "III" : profile.annexCandidates[0],
  calculationPeriod: "2026-08",
  monthsInActivity: 12,
  monthlyWindow: {
    grossRevenueCents: monthly(10_000_000),
    salariesCents: monthly(profile.factorR === "required" ? 2_000_000 : 1_000_000),
    proLaboreCents: monthly(profile.factorR === "required" ? 500_000 : 200_000),
    employerContributionCents: monthly(profile.factorR === "required" ? 200_000 : 100_000),
    fgtsCents: monthly(profile.factorR === "required" ? 100_000 : 80_000),
  },
  revenueBooks: { ordinary: 10_000_000, icms_st: 0, pis_cofins_monophase: 0, iss_withheld: 0, export: 0, non_taxed: 0 },
  activityConfirmed: true,
  annexConfirmed: true,
  eligibilityConfirmed: true,
  revenueSegregationConfirmed: true,
  periodClosed: true,
  startActivityAnnualizationConfirmed: true,
});

export type Simples100ReferenceCase = {
  code: string;
  kind: "complete" | "activity" | "window" | "factor_r" | "segregation" | "activity_start";
  input: Simples100ExpansionInput;
  expectedStatus: "calculated_reference" | "blocked";
};

export const simplesNational100ReferenceCases: Simples100ReferenceCase[] = simplesNational100AdditionalProfiles.flatMap((profile) => {
  const complete = completeInput(profile);
  const factorInput = profile.factorR === "required"
    ? { ...complete, monthlyWindow: { ...complete.monthlyWindow!, salariesCents: monthly(2_000_000), proLaboreCents: monthly(500_000), employerContributionCents: monthly(200_000), fgtsCents: monthly(100_000) } }
    : complete;
  return [
    { code: `${profile.cnae}-01-COMPLETE`, kind: "complete", input: complete, expectedStatus: "calculated_reference" },
    { code: `${profile.cnae}-02-ACTIVITY`, kind: "activity", input: { ...complete, activityConfirmed: false }, expectedStatus: "blocked" },
    { code: `${profile.cnae}-03-WINDOW`, kind: "window", input: { ...complete, monthlyWindow: null }, expectedStatus: "blocked" },
    { code: `${profile.cnae}-04-FACTOR-R`, kind: "factor_r", input: factorInput, expectedStatus: "calculated_reference" },
    { code: `${profile.cnae}-05-SEGREGATION`, kind: "segregation", input: { ...complete, revenueBooks: { ...complete.revenueBooks, pis_cofins_monophase: 1_000_000 }, revenueSegregationConfirmed: false }, expectedStatus: "blocked" },
    { code: `${profile.cnae}-06-START`, kind: "activity_start", input: { ...complete, monthsInActivity: 3, monthlyWindow: { grossRevenueCents: monthly(10_000_000).slice(0, 3), salariesCents: monthly(1_000_000).slice(0, 3), proLaboreCents: monthly(200_000).slice(0, 3), employerContributionCents: monthly(100_000).slice(0, 3), fgtsCents: monthly(80_000).slice(0, 3) }, startActivityAnnualizationConfirmed: false }, expectedStatus: "blocked" },
  ];
});

export function simplesNational100ExpansionMetrics() {
  const results = simplesNational100ReferenceCases.map((item) => resolveSimplesNational100Expansion(item.input));
  return {
    priorProfiles: simplesActivityProfiles.length,
    newProfiles: simplesNational100AdditionalProfiles.length,
    totalProfiles: simplesNational100Profiles.length,
    revenueBooks: SIMPLES_REVENUE_BOOKS.length,
    deterministicCases: results.length,
    calculatedMemories: results.filter((result) => result.status === "calculated_reference").length,
    safelyBlockedCases: results.filter((result) => result.status === "blocked").length,
    factorRProfiles: simplesNational100Profiles.filter((profile) => profile.factorR === "required").length,
    annexIvProfiles: simplesNational100Profiles.filter((profile) => profile.annexCandidates.includes("IV")).length,
  };
}

export function validateSimplesNational100Expansion() {
  const errors: string[] = [];
  if (simplesNational100AdditionalProfiles.length !== 50 || simplesNational100Profiles.length !== 100) errors.push("expected_100_profiles");
  if (new Set(simplesNational100Profiles.map((profile) => profile.cnae)).size !== 100) errors.push("duplicate_cnae");
  if (simplesNational100ReferenceCases.length !== 300 || new Set(simplesNational100ReferenceCases.map((item) => item.code)).size !== 300) errors.push("expected_300_unique_cases");
  if (SIMPLES_REVENUE_BOOKS.length !== 6) errors.push("expected_six_revenue_books");
  if (simplesNational100ExpansionSources.some((source) => !source.url.startsWith("https://") || !source.legalReference)) errors.push("invalid_source_metadata");
  for (const profile of simplesNational100AdditionalProfiles) {
    if (!/^\d{7}$/.test(profile.cnae) || profile.rank < 51 || profile.rank > 100) errors.push(`${profile.cnae}:invalid_profile`);
    if (profile.classificationPolicy !== "candidate_requires_effective_activity_confirmation" || profile.hardStops.length < 3) errors.push(`${profile.cnae}:unsafe_classification`);
  }
  for (const referenceCase of simplesNational100ReferenceCases) {
    const result = resolveSimplesNational100Expansion(referenceCase.input);
    if (result.status !== referenceCase.expectedStatus) errors.push(`${referenceCase.code}:unexpected_${result.status}`);
    if (result.status === "blocked" && result.ordinaryReferenceCents !== null) errors.push(`${referenceCase.code}:blocked_das_leak`);
    if (result.resolvedAnnex === "IV" && (result.outsideDasLedgers[0]?.amountCents !== null || result.outsideDasLedgers[0]?.code !== "cpp_annex_iv")) errors.push(`${referenceCase.code}:annex_iv_cpp_estimated`);
  }
  const metrics = simplesNational100ExpansionMetrics();
  if (metrics.deterministicCases < 300 || metrics.calculatedMemories < 100 || metrics.safelyBlockedCases < 150) errors.push("case_distribution_target_not_reached");
  return { passed: errors.length === 0, errors };
}

export async function hashSimplesNational100Expansion() {
  const payload = JSON.stringify({
    version: SIMPLES_NATIONAL_100_EXPANSION_VERSION,
    sources: simplesNational100ExpansionSources,
    profiles: simplesNational100Profiles,
    revenueBooks: SIMPLES_REVENUE_BOOKS,
    cases: simplesNational100ReferenceCases.map((referenceCase) => ({ code: referenceCase.code, expectedStatus: referenceCase.expectedStatus, result: resolveSimplesNational100Expansion(referenceCase.input) })),
  });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

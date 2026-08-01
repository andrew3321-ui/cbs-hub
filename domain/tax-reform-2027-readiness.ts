import { taxReformSectorProfiles, type TaxReformSectorCode } from "./tax-reform-sector-scenarios.ts";

export const TAX_REFORM_2027_READINESS_VERSION = "2026.08.01-v107";
export const TAX_REFORM_2027_READINESS_CHECKED_AT = "2026-08-01";

export type Rtc2027Source = {
  code: string;
  title: string;
  publisher: string;
  url: string;
  legalReference: string;
  checkedAt: string;
};

export const rtc2027Sources: Rtc2027Source[] = [
  { code: "RTC27-EC132", title: "Emenda Constitucional nº 132/2023", publisher: "Presidência da República", url: "https://www.planalto.gov.br/ccivil_03/constituicao/emendas/emc/emc132.htm", legalReference: "instituição e transição do IBS, CBS e IS", checkedAt: TAX_REFORM_2027_READINESS_CHECKED_AT },
  { code: "RTC27-LC214", title: "Lei Complementar nº 214/2025 — texto compilado", publisher: "Presidência da República", url: "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214compilado.htm", legalReference: "arts. 14, 125 a 180, 181 a 265 e 343 a 372", checkedAt: TAX_REFORM_2027_READINESS_CHECKED_AT },
  { code: "RTC27-LC227", title: "Lei Complementar nº 227/2026", publisher: "Presidência da República", url: "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp227.htm", legalReference: "CGIBS, regulamento do IBS e regimes específicos", checkedAt: TAX_REFORM_2027_READINESS_CHECKED_AT },
  { code: "RTC27-RIBS6", title: "Resolução CGIBS nº 6/2026", publisher: "CGIBS", url: "https://www.cgibs.gov.br/upload/arquivos/202604/30084927-res-cgibs-n-6-30-abr-2026-regulamenta-o-ibs.pdf", legalReference: "IBS 2027 de 0,05% estadual e 0,05% municipal e Regulamento Único", checkedAt: TAX_REFORM_2027_READINESS_CHECKED_AT },
  { code: "RTC27-D13075", title: "Decreto nº 13.075/2026", publisher: "Receita Federal", url: "https://www.gov.br/receitafederal/pt-br/assuntos/noticias/emissao-do-cnpj-e-de-documentos-fiscais-por-pessoas-fisicas-contribuintes-da-cbs-comecara-em-1o-de-janeiro-de-2027/", legalReference: "CNPJ e documentos fiscais de pessoas físicas contribuintes da CBS a partir de 2027", checkedAt: TAX_REFORM_2027_READINESS_CHECKED_AT },
  { code: "RTC27-CGSN186", title: "Resolução CGSN nº 186/2026", publisher: "Comitê Gestor do Simples Nacional", url: "https://www8.receita.fazenda.gov.br/SIMPLESNACIONAL/noticias/noticiacompleta.aspx?id=C739E03C-8482-473F-8E82-F38EC3B13637", legalReference: "opção 2027 pelo Simples e pelo regime regular do IBS/CBS", checkedAt: TAX_REFORM_2027_READINESS_CHECKED_AT },
  { code: "RTC27-RFB-TRANSITION", title: "Entenda a Reforma Tributária do Consumo", publisher: "Receita Federal", url: "https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/reforma-tributaria-do-consumo/entenda", legalReference: "cronograma oficial de 2026 a 2033", checkedAt: TAX_REFORM_2027_READINESS_CHECKED_AT },
  { code: "RTC27-CALC-SWAGGER", title: "Calculadora oficial — documentação OpenAPI", publisher: "Receita Federal", url: "https://piloto-cbs.tributos.gov.br/servico/calculadora-consumo/api/swagger-ui/index.html", legalReference: "motor oficial beta de CBS, IBS e IS", checkedAt: TAX_REFORM_2027_READINESS_CHECKED_AT },
  { code: "RTC27-CALC-VERSION", title: "Calculadora oficial — versão dos dados abertos", publisher: "Receita Federal", url: "https://piloto-cbs.tributos.gov.br/servico/calculadora-consumo/api/calculadora/dados-abertos/versao", legalReference: "versão pública do aplicativo e banco normativo", checkedAt: TAX_REFORM_2027_READINESS_CHECKED_AT },
  { code: "RTC27-CALC-FAQ", title: "FAQ oficial da Calculadora RTC v1.4", publisher: "Receita Federal", url: "https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/apresentacoes/reforma-tributaria-do-consumo/faq-calculadora-v1-4.pdf", legalReference: "módulo offline, API interna e ausência de API pública online garantida", checkedAt: TAX_REFORM_2027_READINESS_CHECKED_AT },
];

export type Rtc2027ActStatus = "confirmed" | "pending_official_act" | "beta_conformance_only";
export const rtc2027ActInventory = [
  { code: "CONSTITUTIONAL_TRANSITION", status: "confirmed", requiredForConclusion: true, sourceCodes: ["RTC27-EC132", "RTC27-LC214"] },
  { code: "IBS_2027_10_BPS_SPLIT", status: "confirmed", requiredForConclusion: true, sourceCodes: ["RTC27-LC214", "RTC27-RIBS6"] },
  { code: "CBS_2027_REFERENCE_RATE", status: "pending_official_act", requiredForConclusion: true, sourceCodes: ["RTC27-LC214"] },
  { code: "GOVERNMENT_PURCHASE_REDUCER_2027", status: "pending_official_act", requiredForConclusion: true, sourceCodes: ["RTC27-LC214"] },
  { code: "SELECTIVE_TAX_2027_RATES", status: "pending_official_act", requiredForConclusion: true, sourceCodes: ["RTC27-LC214"] },
  { code: "FUEL_AD_REM_RATES_2027", status: "pending_official_act", requiredForConclusion: true, sourceCodes: ["RTC27-LC214"] },
  { code: "FINANCIAL_COMBINED_RATE_2027", status: "confirmed", requiredForConclusion: true, sourceCodes: ["RTC27-LC227"] },
  { code: "REAL_ESTATE_REDUCERS", status: "confirmed", requiredForConclusion: true, sourceCodes: ["RTC27-LC214", "RTC27-RIBS6"] },
  { code: "IPI_ZERO_EXCEPT_ZFM_2027", status: "confirmed", requiredForConclusion: true, sourceCodes: ["RTC27-LC214", "RTC27-RFB-TRANSITION"] },
  { code: "PF_CNPJ_AND_DFE_2027", status: "confirmed", requiredForConclusion: true, sourceCodes: ["RTC27-D13075"] },
  { code: "SIMPLES_2027_OPTION_WINDOW", status: "confirmed", requiredForConclusion: true, sourceCodes: ["RTC27-CGSN186"] },
  { code: "OFFICIAL_CALCULATOR_2027", status: "beta_conformance_only", requiredForConclusion: false, sourceCodes: ["RTC27-CALC-SWAGGER", "RTC27-CALC-VERSION", "RTC27-CALC-FAQ"] },
] as const satisfies readonly { code: string; status: Rtc2027ActStatus; requiredForConclusion: boolean; sourceCodes: readonly string[] }[];

export const rtcTransitionTimeline = [
  { year: 2026, pisCofins: "legacy", icmsIssShareBps: 10_000, cbs: "test_90_bps", ibs: "test_10_bps", ipi: "legacy", selectiveTax: "not_started" },
  { year: 2027, pisCofins: "extinguished", icmsIssShareBps: 10_000, cbs: "official_reference_minus_10_bps", ibs: "10_bps_split_equally", ipi: "zero_except_zfm", selectiveTax: "starts" },
  { year: 2028, pisCofins: "extinguished", icmsIssShareBps: 10_000, cbs: "official_reference_minus_10_bps", ibs: "10_bps_split_equally", ipi: "zero_except_zfm", selectiveTax: "active" },
  { year: 2029, pisCofins: "extinguished", icmsIssShareBps: 9_000, cbs: "official_reference", ibs: "10_percent_reference", ipi: "zero_except_zfm", selectiveTax: "active" },
  { year: 2030, pisCofins: "extinguished", icmsIssShareBps: 8_000, cbs: "official_reference", ibs: "20_percent_reference", ipi: "zero_except_zfm", selectiveTax: "active" },
  { year: 2031, pisCofins: "extinguished", icmsIssShareBps: 7_000, cbs: "official_reference", ibs: "30_percent_reference", ipi: "zero_except_zfm", selectiveTax: "active" },
  { year: 2032, pisCofins: "extinguished", icmsIssShareBps: 6_000, cbs: "official_reference", ibs: "40_percent_reference", ipi: "zero_except_zfm", selectiveTax: "active" },
  { year: 2033, pisCofins: "extinguished", icmsIssShareBps: 0, cbs: "official_reference", ibs: "full_reference", ipi: "zero_except_zfm", selectiveTax: "active" },
] as const;

export const rtcOfficialCalculator2027Snapshot = {
  capturedAt: "2026-08-01",
  environment: "apr",
  appVersion: "1.2.4-b0e47264",
  databaseVersion: "V0039",
  databaseDate: "2026-07-08",
  request: { effectiveDate: "2027-01-15", municipalityIbge: 3550308, uf: "SP", cst: "000", cClassTrib: "000001", baseCents: 100_000 },
  response: { cbsRateBps: 840, cbsCents: 84_000, ibsStateRateBps: 5, ibsStateCents: 500, ibsMunicipalRateBps: 5, ibsMunicipalCents: 500, ibsTotalCents: 1_000 },
  legalConclusion: false,
  policy: "Conformidade técnica com o ambiente beta não substitui a resolução do Senado que fixará a alíquota de referência da CBS de 2027.",
  sourceCodes: ["RTC27-CALC-SWAGGER", "RTC27-CALC-VERSION", "RTC27-LC214", "RTC27-RIBS6"],
} as const;

export type RtcCalculatorObservation = { appVersion: string; databaseVersion: string; cbsRateBps: number; cbsCents: number; ibsStateRateBps: number; ibsStateCents: number; ibsMunicipalRateBps: number; ibsMunicipalCents: number; ibsTotalCents: number };
export function reconcileRtcOfficialCalculator2027(observation: RtcCalculatorObservation) {
  const expected = rtcOfficialCalculator2027Snapshot.response;
  const differences = Object.entries(expected).flatMap(([key, value]) => observation[key as keyof RtcCalculatorObservation] === value ? [] : [`${key}:${observation[key as keyof RtcCalculatorObservation]}!=${value}`]);
  if (observation.appVersion !== rtcOfficialCalculator2027Snapshot.appVersion) differences.push("app_version_diverged");
  if (observation.databaseVersion !== rtcOfficialCalculator2027Snapshot.databaseVersion) differences.push("database_version_diverged");
  return { status: differences.length ? "blocked_divergence" as const : "matched_beta_fixture" as const, differences, legalConclusionReleased: false as const };
}

export type Rtc2027ReadinessInput = {
  sectorCode: TaxReformSectorCode | string;
  effectiveDate: string;
  exactClassificationConfirmed: boolean;
  operationDocumented: boolean;
  officialSourceVersionConfirmed: boolean;
  cbsReferenceResolutionConfirmed: boolean;
  cbsReferenceRateBps: number | null;
  governmentReducerResolvedOrNotApplicable: boolean;
  selectiveTaxResolvedOrNotApplicable: boolean;
  fuelAdRemResolvedOrNotApplicable: boolean;
  simplifiedRegimeChoiceResolvedOrNotApplicable: boolean;
  naturalPersonRegistrationResolvedOrNotApplicable: boolean;
  ipiZfmClassificationConfirmed: boolean;
  creditsDocumented: boolean;
  calculatorSnapshotMatched: boolean;
};

export type Rtc2027ReadinessStatus = "controlled_readiness" | "blocked_pending_act" | "blocked_divergence" | "blocked_missing_fact";
export function resolveRtc2027Readiness(input: Rtc2027ReadinessInput) {
  const profile = taxReformSectorProfiles.find((item) => item.code === input.sectorCode) ?? null;
  const missing: string[] = [];
  const pendingActs: string[] = [];
  const divergences: string[] = [];
  if (!profile) missing.push("setor fora do catálogo versionado");
  if (!/^2027-\d{2}-\d{2}$/.test(input.effectiveDate)) missing.push("data fora de 2027");
  if (!input.exactClassificationConfirmed) missing.push("classificação legal exata não confirmada");
  if (!input.operationDocumented) missing.push("operação, documento e base não reconciliados");
  if (!input.officialSourceVersionConfirmed) divergences.push("versão das fontes oficiais não confirmada");
  if (!input.cbsReferenceResolutionConfirmed || !Number.isInteger(input.cbsReferenceRateBps) || input.cbsReferenceRateBps! < 10) pendingActs.push("resolução do Senado com alíquota de referência da CBS 2027");
  if (!input.governmentReducerResolvedOrNotApplicable) pendingActs.push("redutor de compras governamentais");
  if (!input.selectiveTaxResolvedOrNotApplicable) pendingActs.push("ato e alíquota do Imposto Seletivo");
  if (!input.fuelAdRemResolvedOrNotApplicable) pendingActs.push("ato ad rem de combustíveis");
  if (!input.simplifiedRegimeChoiceResolvedOrNotApplicable) missing.push("opção 2027 do Simples/regime regular não comprovada");
  if (!input.naturalPersonRegistrationResolvedOrNotApplicable) missing.push("CNPJ e documento fiscal da pessoa física contribuinte não comprovados");
  if (!input.ipiZfmClassificationConfirmed) missing.push("exceção de IPI/ZFM não decidida");
  if (!input.creditsDocumented) missing.push("créditos CBS e IBS não documentados em livros separados");
  if (!input.calculatorSnapshotMatched) divergences.push("memória divergente ou versão distinta da Calculadora oficial beta");
  const status: Rtc2027ReadinessStatus = divergences.length ? "blocked_divergence" : missing.length ? "blocked_missing_fact" : pendingActs.length ? "blocked_pending_act" : "controlled_readiness";
  return {
    status,
    profile,
    missing,
    pendingActs,
    divergences,
    fiscalConclusionReleased: false as const,
    netPayableCents: null,
    resultObjective: status === "controlled_readiness" ? "Controles de 2027 prontos para reexecução quando o caso real for informado; nenhuma guia ou conclusão jurídica foi emitida." : "Conclusão de 2027 bloqueada até eliminar todas as lacunas listadas.",
    sourceCodes: [...new Set(["RTC27-EC132", "RTC27-LC214", "RTC27-LC227", "RTC27-RIBS6", ...(profile?.code === "FINANCIAL_SERVICES_SPECIFIC" ? ["RTC27-LC227"] : []), ...(profile?.code === "FUELS_SPECIFIC" ? ["RTC27-LC214"] : []), ...(profile?.code === "REAL_ESTATE_SPECIFIC" ? ["RTC27-RIBS6"] : [])])],
    version: TAX_REFORM_2027_READINESS_VERSION,
    checkedAt: TAX_REFORM_2027_READINESS_CHECKED_AT,
  };
}

const completeInput = (sectorCode: TaxReformSectorCode): Rtc2027ReadinessInput => ({ sectorCode, effectiveDate: "2027-07-01", exactClassificationConfirmed: true, operationDocumented: true, officialSourceVersionConfirmed: true, cbsReferenceResolutionConfirmed: true, cbsReferenceRateBps: 850, governmentReducerResolvedOrNotApplicable: true, selectiveTaxResolvedOrNotApplicable: true, fuelAdRemResolvedOrNotApplicable: true, simplifiedRegimeChoiceResolvedOrNotApplicable: true, naturalPersonRegistrationResolvedOrNotApplicable: true, ipiZfmClassificationConfirmed: true, creditsDocumented: true, calculatorSnapshotMatched: true });

const mutations: readonly { code: string; expectedStatus: Rtc2027ReadinessStatus; mutate: (input: Rtc2027ReadinessInput) => Rtc2027ReadinessInput }[] = [
  { code: "READY", expectedStatus: "controlled_readiness", mutate: (input) => input },
  { code: "BEFORE", expectedStatus: "blocked_missing_fact", mutate: (input) => ({ ...input, effectiveDate: "2026-12-31" }) },
  { code: "AFTER", expectedStatus: "blocked_missing_fact", mutate: (input) => ({ ...input, effectiveDate: "2028-01-01" }) },
  { code: "CLASSIFICATION", expectedStatus: "blocked_missing_fact", mutate: (input) => ({ ...input, exactClassificationConfirmed: false }) },
  { code: "DOCUMENT", expectedStatus: "blocked_missing_fact", mutate: (input) => ({ ...input, operationDocumented: false }) },
  { code: "SOURCE", expectedStatus: "blocked_divergence", mutate: (input) => ({ ...input, officialSourceVersionConfirmed: false }) },
  { code: "CBS-ACT", expectedStatus: "blocked_pending_act", mutate: (input) => ({ ...input, cbsReferenceResolutionConfirmed: false }) },
  { code: "CBS-RATE-NULL", expectedStatus: "blocked_pending_act", mutate: (input) => ({ ...input, cbsReferenceRateBps: null }) },
  { code: "CBS-RATE-INVALID", expectedStatus: "blocked_pending_act", mutate: (input) => ({ ...input, cbsReferenceRateBps: 9 }) },
  { code: "GOV-REDUCER", expectedStatus: "blocked_pending_act", mutate: (input) => ({ ...input, governmentReducerResolvedOrNotApplicable: false }) },
  { code: "SELECTIVE-TAX", expectedStatus: "blocked_pending_act", mutate: (input) => ({ ...input, selectiveTaxResolvedOrNotApplicable: false }) },
  { code: "FUEL-ACT", expectedStatus: "blocked_pending_act", mutate: (input) => ({ ...input, fuelAdRemResolvedOrNotApplicable: false }) },
  { code: "SIMPLES-CHOICE", expectedStatus: "blocked_missing_fact", mutate: (input) => ({ ...input, simplifiedRegimeChoiceResolvedOrNotApplicable: false }) },
  { code: "PF-REGISTRATION", expectedStatus: "blocked_missing_fact", mutate: (input) => ({ ...input, naturalPersonRegistrationResolvedOrNotApplicable: false }) },
  { code: "IPI-ZFM", expectedStatus: "blocked_missing_fact", mutate: (input) => ({ ...input, ipiZfmClassificationConfirmed: false }) },
  { code: "CREDITS", expectedStatus: "blocked_missing_fact", mutate: (input) => ({ ...input, creditsDocumented: false }) },
  { code: "CALCULATOR", expectedStatus: "blocked_divergence", mutate: (input) => ({ ...input, calculatorSnapshotMatched: false }) },
  { code: "MULTI-PENDING", expectedStatus: "blocked_pending_act", mutate: (input) => ({ ...input, cbsReferenceResolutionConfirmed: false, selectiveTaxResolvedOrNotApplicable: false }) },
  { code: "MULTI-MISSING", expectedStatus: "blocked_missing_fact", mutate: (input) => ({ ...input, operationDocumented: false, creditsDocumented: false }) },
  { code: "DIVERGENCE-PRECEDENCE", expectedStatus: "blocked_divergence", mutate: (input) => ({ ...input, officialSourceVersionConfirmed: false, cbsReferenceResolutionConfirmed: false }) },
  { code: "MISSING-PRECEDENCE", expectedStatus: "blocked_missing_fact", mutate: (input) => ({ ...input, exactClassificationConfirmed: false, cbsReferenceResolutionConfirmed: false }) },
  { code: "ALL-GATES", expectedStatus: "controlled_readiness", mutate: (input) => ({ ...input }) },
];

export const rtc2027ReadinessCases = taxReformSectorProfiles.flatMap((profile) => mutations.map((mutation) => ({ code: `${profile.code}:${mutation.code}`, kind: mutation.code === "READY" || mutation.code === "ALL-GATES" ? "positive" as const : mutation.code === "BEFORE" || mutation.code === "AFTER" ? "temporal" as const : "negative" as const, input: mutation.mutate(completeInput(profile.code)), expectedStatus: mutation.expectedStatus })));

export function rtc2027ReadinessMetrics() {
  const results = rtc2027ReadinessCases.map((item) => resolveRtc2027Readiness(item.input));
  const controlledReadinessCases = results.filter((item) => item.status === "controlled_readiness").length;
  return { profiles: taxReformSectorProfiles.length, acts: rtc2027ActInventory.length, confirmedActs: rtc2027ActInventory.filter((item) => item.status === "confirmed").length, pendingActs: rtc2027ActInventory.filter((item) => item.status === "pending_official_act").length, deterministicCases: results.length, controlledReadinessCases, calculatedMemories: controlledReadinessCases, safelyBlockedCases: results.filter((item) => item.status !== "controlled_readiness").length, calculatorFixtures: 1, fiscalConclusionsReleased: 0 };
}

export function validateRtc2027Readiness() {
  const errors: string[] = [];
  if (rtcTransitionTimeline.length !== 8 || rtcTransitionTimeline[0].year !== 2026 || rtcTransitionTimeline.at(-1)?.year !== 2033) errors.push("transition_timeline_incomplete");
  if (rtc2027ActInventory.filter((item) => item.status === "pending_official_act").length < 4) errors.push("pending_act_inventory_incomplete");
  if (rtc2027ReadinessCases.length < 250 || new Set(rtc2027ReadinessCases.map((item) => item.code)).size !== rtc2027ReadinessCases.length) errors.push("case_target_or_uniqueness_failed");
  for (const item of rtc2027ReadinessCases) {
    const result = resolveRtc2027Readiness(item.input);
    if (result.status !== item.expectedStatus) errors.push(`${item.code}:status_diverged`);
    if (result.fiscalConclusionReleased || result.netPayableCents !== null) errors.push(`${item.code}:fiscal_conclusion_leaked`);
  }
  if (!rtc2027Sources.every((source) => source.url.startsWith("https://") && source.legalReference && source.checkedAt === TAX_REFORM_2027_READINESS_CHECKED_AT)) errors.push("official_source_metadata_invalid");
  const match = reconcileRtcOfficialCalculator2027({ appVersion: rtcOfficialCalculator2027Snapshot.appVersion, databaseVersion: rtcOfficialCalculator2027Snapshot.databaseVersion, ...rtcOfficialCalculator2027Snapshot.response });
  if (match.status !== "matched_beta_fixture" || match.legalConclusionReleased) errors.push("official_calculator_fixture_failed");
  return { passed: errors.length === 0, errors };
}

export async function hashRtc2027Readiness() {
  const payload = JSON.stringify({ version: TAX_REFORM_2027_READINESS_VERSION, sources: rtc2027Sources, acts: rtc2027ActInventory, timeline: rtcTransitionTimeline, calculator: rtcOfficialCalculator2027Snapshot, cases: rtc2027ReadinessCases.map((item) => ({ code: item.code, expectedStatus: item.expectedStatus, result: resolveRtc2027Readiness(item.input) })) });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

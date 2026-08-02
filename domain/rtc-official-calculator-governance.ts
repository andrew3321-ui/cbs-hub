export const RTC_OFFICIAL_GOVERNANCE_VERSION = "rtc-official-governance.v1";
export const RTC_OFFICIAL_CORPUS_VERSION = "rtc-official-2026-integral.v1";
export const RTC_OFFICIAL_CHECKED_AT = "2026-08-01";

export const RTC_OFFICIAL_API_BASE = "https://piloto-cbs.tributos.gov.br/servico/calculadora-consumo/api";

export const rtcOfficialPackageManifest = {
  publisher: "Receita Federal do Brasil",
  product: "Calculadora de Tributos sobre o Consumo",
  applicationVersion: "1.2.4-b0e47264",
  databaseVersion: "V0039",
  databaseDate: "2026-07-08",
  environment: "apr",
  offlinePageUrl: "https://piloto-cbs.tributos.gov.br/servico/calculadora-consumo/calculadora/calculadora-offline",
  versionUrl: `${RTC_OFFICIAL_API_BASE}/calculadora/dados-abertos/versao`,
  openApiUrl: `${RTC_OFFICIAL_API_BASE}/api-docs`,
  dockerPackageUrl: "https://obs-13820-calcpr-apr.obsv3.br-df-1.hcs.serpro.gov.br/calculadora.zip",
  jarPackageUrl: "https://obs-13820-calcpr-apr.obsv3.br-df-1.hcs.serpro.gov.br/calculadora-jar.zip",
  execution: {
    javaVersion: 21,
    command: "java -jar api-regime-geral.jar --spring.profiles.active=offline",
    cloudflareWorkerCompatible: false,
    adapter: "A suíte oficial roda fora do Worker; o Worker sincroniza dados abertos e executa somente o adaptador determinístico gratuito versionado.",
  },
  licensing: {
    portalNotice: ["CC0-1.0", "MIT"],
    packageLicenseConfirmedInsideArtifact: false,
    redistributionAllowedByCbshub: false,
    policy: "O CBSHub referencia o download oficial e não redistribui o binário enquanto a licença interna do pacote não for confirmada no artefato.",
  },
} as const;

export type RtcDatasetDefinition = {
  code: string;
  path: string;
  effectiveDate: string;
  minimumRecords: number;
  kind: "catalog" | "rate" | "legal_memory";
};

export const rtcOfficialDatasetDefinitions: readonly RtcDatasetDefinition[] = [
  { code: "cbs_ibs_cst", path: "/calculadora/dados-abertos/situacoes-tributarias/cbs-ibs?data=2026-01-01", effectiveDate: "2026-01-01", minimumRecords: 18, kind: "catalog" },
  { code: "cbs_ibs_cclass", path: "/calculadora/dados-abertos/classificacoes-tributarias/cbs-ibs?data=2026-01-01", effectiveDate: "2026-01-01", minimumRecords: 164, kind: "catalog" },
  { code: "is_cst", path: "/calculadora/dados-abertos/situacoes-tributarias/imposto-seletivo?data=2027-01-01", effectiveDate: "2027-01-01", minimumRecords: 7, kind: "catalog" },
  { code: "is_cclass", path: "/calculadora/dados-abertos/classificacoes-tributarias/imposto-seletivo?data=2027-01-01", effectiveDate: "2027-01-01", minimumRecords: 30, kind: "catalog" },
  { code: "union_rate_2026", path: "/calculadora/dados-abertos/aliquota-uniao?data=2026-01-01", effectiveDate: "2026-01-01", minimumRecords: 1, kind: "rate" },
  { code: "sp_state_rate_2026", path: "/calculadora/dados-abertos/aliquota-uf?codigoUf=35&data=2026-01-01", effectiveDate: "2026-01-01", minimumRecords: 1, kind: "rate" },
  { code: "sp_city_rate_2026", path: "/calculadora/dados-abertos/aliquota-municipio?codigoMunicipio=3550308&data=2026-01-01", effectiveDate: "2026-01-01", minimumRecords: 1, kind: "rate" },
  { code: "legal_foundations_2026", path: "/calculadora/dados-abertos/fundamentacoes-legais?data=2026-01-01", effectiveDate: "2026-01-01", minimumRecords: 164, kind: "legal_memory" },
] as const;

export type RtcOfficialFixture = {
  code: string;
  baseCents: number;
  expected: { cbsCents: number; ibsStateCents: number; ibsMunicipalCents: number; ibsTotalCents: number };
};

export const rtcOfficialComparisonCorpus: readonly RtcOfficialFixture[] = [
  { code: "integral_rounds_zero", baseCents: 1, expected: { cbsCents: 0, ibsStateCents: 0, ibsMunicipalCents: 0, ibsTotalCents: 0 } },
  { code: "integral_one_real", baseCents: 100, expected: { cbsCents: 1, ibsStateCents: 0, ibsMunicipalCents: 0, ibsTotalCents: 0 } },
  { code: "integral_fractional", baseCents: 12_345, expected: { cbsCents: 111, ibsStateCents: 12, ibsMunicipalCents: 0, ibsTotalCents: 12 } },
  { code: "integral_thousand", baseCents: 100_000, expected: { cbsCents: 900, ibsStateCents: 100, ibsMunicipalCents: 0, ibsTotalCents: 100 } },
  { code: "integral_rounding_boundary", baseCents: 999_999, expected: { cbsCents: 9_000, ibsStateCents: 1_000, ibsMunicipalCents: 0, ibsTotalCents: 1_000 } },
] as const;

export type RtcObservedFixture = {
  code: string;
  cst: string;
  cClassTrib: string;
  cbsCents: number;
  ibsStateCents: number;
  ibsMunicipalCents: number;
  ibsTotalCents: number;
  cbsMemory: string;
  ibsStateMemory: string;
  xml: string;
};

export type RtcCandidateInput = {
  version: { applicationVersion: string; databaseVersion: string; databaseDate: string; environment: string };
  datasets: readonly { code: string; recordCount: number; contentHash: string }[];
  observations: readonly RtcObservedFixture[];
};

export function officialRtcFixtureRequest(fixture: RtcOfficialFixture) {
  return {
    id: `cbshub-${fixture.code}`,
    versao: "0.0.1",
    dhFatoGerador: "2026-01-15T12:00:00-03:00",
    municipio: 3550308,
    uf: "SP",
    itens: [{ numero: 1, ncm: "87089990", cst: "000", cClassTrib: "000001", baseCalculo: Number((fixture.baseCents / 100).toFixed(2)), quantidade: 1, unidade: "UN" }],
  };
}

function xmlHasTag(xml: string, tag: string, value: string) {
  return new RegExp(`<${tag}>\\s*${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*</${tag}>`).test(xml);
}

export function reconcileRtcOfficialCandidate(input: RtcCandidateInput) {
  const differences: string[] = [];
  if (input.version.applicationVersion !== rtcOfficialPackageManifest.applicationVersion) differences.push("application_version_changed");
  if (input.version.databaseVersion !== rtcOfficialPackageManifest.databaseVersion) differences.push("database_version_changed");
  if (input.version.databaseDate !== rtcOfficialPackageManifest.databaseDate) differences.push("database_date_changed");
  if (input.version.environment !== rtcOfficialPackageManifest.environment) differences.push("environment_changed");

  for (const definition of rtcOfficialDatasetDefinitions) {
    const dataset = input.datasets.find((item) => item.code === definition.code);
    if (!dataset) differences.push(`${definition.code}:missing`);
    else {
      if (dataset.recordCount < definition.minimumRecords) differences.push(`${definition.code}:record_count_below_baseline`);
      if (!/^[a-f0-9]{64}$/.test(dataset.contentHash)) differences.push(`${definition.code}:invalid_hash`);
    }
  }

  for (const fixture of rtcOfficialComparisonCorpus) {
    const observed = input.observations.find((item) => item.code === fixture.code);
    if (!observed) {
      differences.push(`${fixture.code}:missing`);
      continue;
    }
    if (observed.cst !== "000") differences.push(`${fixture.code}:cst`);
    if (observed.cClassTrib !== "000001") differences.push(`${fixture.code}:cclass`);
    for (const key of ["cbsCents", "ibsStateCents", "ibsMunicipalCents", "ibsTotalCents"] as const) {
      if (observed[key] !== fixture.expected[key]) differences.push(`${fixture.code}:${key}:${observed[key]}!=${fixture.expected[key]}`);
    }
    if (!observed.cbsMemory.includes("LC 214/2025") || !observed.ibsStateMemory.includes("LC 214/2025")) differences.push(`${fixture.code}:legal_memory`);
    if (!xmlHasTag(observed.xml, "CST", "000") || !xmlHasTag(observed.xml, "cClassTrib", "000001")) differences.push(`${fixture.code}:xml_classification`);
    if (!xmlHasTag(observed.xml, "vCBS", (fixture.expected.cbsCents / 100).toFixed(2))) differences.push(`${fixture.code}:xml_cbs`);
    if (!xmlHasTag(observed.xml, "vIBSUF", (fixture.expected.ibsStateCents / 100).toFixed(2))) differences.push(`${fixture.code}:xml_ibs_state`);
  }

  return {
    status: differences.length ? "blocked_divergence" as const : "zero_divergence" as const,
    differences,
    promotionAllowed: differences.length === 0,
    runtimeReplacementAllowed: false as const,
    comparedCases: rtcOfficialComparisonCorpus.length,
    comparedDatasets: rtcOfficialDatasetDefinitions.length,
  };
}

export function assessRtcPromotion(input: { currentStatus: string; reconciliationStatus: string; differenceCount: number; fingerprintMatches: boolean }) {
  const blockers: string[] = [];
  if (input.currentStatus !== "canary") blockers.push("candidate_not_in_canary");
  if (input.reconciliationStatus !== "zero_divergence") blockers.push("reconciliation_not_clean");
  if (input.differenceCount !== 0) blockers.push("differences_present");
  if (!input.fingerprintMatches) blockers.push("fingerprint_mismatch");
  return { allowed: blockers.length === 0, blockers };
}

export function assessRtcRollback(input: { activeStatus: string; targetStatus: string; targetReconciliationStatus: string; sameVersion: boolean }) {
  const blockers: string[] = [];
  if (input.activeStatus !== "active") blockers.push("source_not_active");
  if (!['active', 'revoked'].includes(input.targetStatus)) blockers.push("target_never_active");
  if (input.targetReconciliationStatus !== "zero_divergence") blockers.push("target_not_reconciled");
  if (input.sameVersion) blockers.push("same_version");
  return { allowed: blockers.length === 0, blockers };
}

export async function hashRtcOfficialPayload(value: unknown) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(value)));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function rtcOfficialPublicIndicator() {
  return {
    version: RTC_OFFICIAL_GOVERNANCE_VERSION,
    checkedAt: RTC_OFFICIAL_CHECKED_AT,
    officialApplicationVersion: rtcOfficialPackageManifest.applicationVersion,
    officialDatabaseVersion: rtcOfficialPackageManifest.databaseVersion,
    corpusVersion: RTC_OFFICIAL_CORPUS_VERSION,
    status: "reconciled_reference" as const,
    deterministicCases: rtcOfficialComparisonCorpus.length,
    synchronizedDatasets: rtcOfficialDatasetDefinitions.length,
    fingerprint: (await hashRtcOfficialPayload({ manifest: rtcOfficialPackageManifest, datasets: rtcOfficialDatasetDefinitions, corpus: rtcOfficialComparisonCorpus })).slice(0, 12),
    safety: "Versão ou centavo divergente bloqueia a promoção; o binário oficial não é redistribuído nem executado dentro do Worker.",
  };
}

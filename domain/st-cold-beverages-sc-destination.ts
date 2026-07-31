import type { ColdBeverageProductCode } from "./st-cold-beverages-priority.ts";

export const ST_COLD_BEVERAGES_SC_DESTINATION_VERSION = "2026.07.31-v91";
export const ST_COLD_BEVERAGES_SC_DESTINATION_CHECKED_AT = "2026-07-31";
export const ST_COLD_BEVERAGES_SC_DESTINATION_PERIOD = { from: "2026-08-01", to: "2026-11-30" } as const;
export const ST_COLD_BEVERAGES_SC_INTERNAL_RATE_BPS = 1_700;
export const ST_COLD_BEVERAGES_SC_FCP_RATE_BPS = 0;
export const ST_COLD_BEVERAGES_SC_PMPF_LIMIT_BPS = 9_000;
export const ST_COLD_BEVERAGES_SC_MVA_DISTRIBUTOR_BPS = 8_024;
export const ST_COLD_BEVERAGES_SC_MVA_INDUSTRIAL_BPS = 15_446;

export const ST_COLD_BEVERAGES_SC_ROUTE = {
  route: "SP-SC", origin: "SP", destination: "SC",
  domesticInterstateRateBps: 1_200, importedQualifiedRateBps: 400,
  directionalSymmetryAssumed: false,
} as const;

export type ColdBeverageScSenderRole = "distributor_or_wholesaler" | "industrial_or_importer";
export type ColdBeverageScProfile = {
  code: string;
  productCode: Exclude<ColdBeverageProductCode, "WATER_GLASS">;
  label: string;
  gtin: string;
  packageType: "PET" | "LATA";
  volumeMl: number;
  pmpfCents: number;
  legalTableItem: string;
  effectiveFrom: string;
  effectiveTo: string;
};

export const ST_COLD_BEVERAGES_SC_PMPF_PROFILES: ColdBeverageScProfile[] = [
  { code: "SC_COCA_COLA_PET_2000", productCode: "SOFT_DRINK_PET", label: "Coca-Cola original · PET 2 L", gtin: "7894900011517", packageType: "PET", volumeMl: 2_000, pmpfCents: 1_192, legalTableItem: "Ato DIAT 43/2026, Anexo II, item 02.001-03", effectiveFrom: "2026-08-01", effectiveTo: "2026-11-30" },
  { code: "SC_COCA_COLA_CAN_350", productCode: "SOFT_DRINK_CAN", label: "Coca-Cola original · lata 350 ml", gtin: "7894900010015", packageType: "LATA", volumeMl: 350, pmpfCents: 492, legalTableItem: "Ato DIAT 43/2026, Anexo II, item 02.001-05", effectiveFrom: "2026-08-01", effectiveTo: "2026-11-30" },
  { code: "SC_RED_BULL_CAN_250", productCode: "ENERGY_CAN", label: "Red Bull Energy Drink · lata 250 ml", gtin: "611269991000", packageType: "LATA", volumeMl: 250, pmpfCents: 1_080, legalTableItem: "Ato DIAT 34/2026, Anexo III, item 11.179-05", effectiveFrom: "2026-08-01", effectiveTo: "2026-11-30" },
  { code: "SC_ELEV_PET_2000", productCode: "ENERGY_PET", label: "Elev Original · PET 2 L", gtin: "7896436102516", packageType: "PET", volumeMl: 2_000, pmpfCents: 976, legalTableItem: "Ato DIAT 34/2026, Anexo III, item 11.216-04", effectiveFrom: "2026-08-01", effectiveTo: "2026-11-30" },
  { code: "SC_GATORADE_LIME_500", productCode: "ISOTONIC", label: "Gatorade Lima-Limão · PET 500 ml", gtin: "7892840808037", packageType: "PET", volumeMl: 500, pmpfCents: 579, legalTableItem: "Ato DIAT 12/2026, Anexo IV, item 01.001-02", effectiveFrom: "2026-08-01", effectiveTo: "2026-11-30" },
];

export const ST_COLD_BEVERAGES_SC_FACT_LABELS = {
  exactBrandConfirmed: "marca e variante coincidem com a pauta",
  exactPackageConfirmed: "embalagem coincide com a pauta",
  exactVolumeConfirmed: "volume coincide com a pauta",
  exactGtinConfirmed: "GTIN coincide com a pauta",
  normalRegimeConfirmed: "regime normal confirmado",
  taxpayerResaleConfirmed: "operação entre contribuintes para revenda confirmada",
  responsibilityConfirmed: "responsabilidade do remetente pela retenção confirmada",
  noInterdependenceConfirmed: "interdependência e preço controlado afastados",
  ownBaseConfirmed: "base própria e encargos conferidos",
  documentsConfirmed: "NF-e e documentos comerciais conferidos",
} as const;
export type ColdBeverageScFacts = Record<keyof typeof ST_COLD_BEVERAGES_SC_FACT_LABELS, boolean>;

export const stColdBeverageScSources = [
  { code: "SC-ATO-DIAT-12-2026", title: "Ato DIAT 12/2026 — PMPF de bebidas", publisher: "SEF-SC", url: "https://legislacao.sef.sc.gov.br/html/atos_diat/2026/atodiat_26_012.htm", proves: ["vigência geral até 30/11/2026", "PMPF de isotônicos", "fallback regulamentar"] },
  { code: "SC-ATO-DIAT-43-2026-ANNEX-II", title: "Ato DIAT 43/2026 — Anexo II", publisher: "SEF-SC", url: "https://legislacao.sef.sc.gov.br/html/Atos_Diat/2026/AtoDiat_26_043_Anexo_II.pdf", proves: ["PMPF e GTIN de Coca-Cola PET 2 L e lata 350 ml a partir de 01/08/2026"] },
  { code: "SC-ATO-DIAT-34-2026-ANNEX-III", title: "Ato DIAT 34/2026 — Anexo III", publisher: "SEF-SC", url: "https://legislacao.sef.sc.gov.br/html/Atos_Diat/2026/AtoDiat_26_034_Anexo_III.pdf", proves: ["PMPF e GTIN de Red Bull 250 ml e Elev PET 2 L"] },
  { code: "SC-RICMS-ANNEX-1A-BEVERAGES", title: "RICMS/SC — Anexo 1-A, Seção IV", publisher: "SEF-SC", url: "https://legislacao.sef.sc.gov.br/html/regulamentos/icms/ricms_01_01_a_pas.htm", proves: ["MVA de 80,24% para distribuidor/atacadista", "MVA de 154,46% para industrial/importador"] },
  { code: "SC-RICMS-ANNEX-3-ART-42", title: "RICMS/SC — Anexo 3, arts. 19 e 42", publisher: "SEF-SC", url: "https://legislacao.sef.sc.gov.br/legtrib_internet/html/regulamentos/icms/ricms_01_03_pas.htm", proves: ["PMPF como base", "fallback por MVA para operação própria a 90% da pauta", "dedução do imposto próprio"] },
  { code: "SC-RICMS-INTERNAL-RATE", title: "RICMS/SC — alíquotas internas", publisher: "SEF-SC", url: "https://legislacao.sef.sc.gov.br/legtrib_internet/html/regulamentos/icms/ricms_01_00.htm", proves: ["alíquota interna controlada de 17%"] },
].map((source) => ({ ...source, checkedAt: ST_COLD_BEVERAGES_SC_DESTINATION_CHECKED_AT }));

const profileByCode = new Map(ST_COLD_BEVERAGES_SC_PMPF_PROFILES.map((profile) => [profile.code, profile]));
const allFacts = Object.fromEntries(Object.keys(ST_COLD_BEVERAGES_SC_FACT_LABELS).map((key) => [key, true])) as ColdBeverageScFacts;
function roundDivide(numerator: number, denominator: number) { return Math.floor((numerator + Math.floor(denominator / 2)) / denominator); }
function validDate(value: string) { return /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= ST_COLD_BEVERAGES_SC_DESTINATION_PERIOD.from && value <= ST_COLD_BEVERAGES_SC_DESTINATION_PERIOD.to; }

export type ColdBeverageScInput = {
  route: string; profileCode: string; operationDate: string; quantityUnits: number; operationCents: number; ownIcmsBaseCents: number;
  importedQualified: boolean; senderRole: ColdBeverageScSenderRole; facts: ColdBeverageScFacts;
};
export type ColdBeverageScResult = {
  status: "calculated_pmpf" | "calculated_mva_fallback" | "blocked";
  method: "pmpf" | "mva_fallback" | null;
  profile: ColdBeverageScProfile | null;
  blockers: string[];
  missingFacts: string[];
  parameters: null | { interstateRateBps: number; internalRateBps: number; fcpRateBps: 0; pmpfLimitCents: number; mvaBps: number | null; senderRole: ColdBeverageScSenderRole };
  output: null | { stBaseCents: number; ownIcmsCents: number; presumedInternalIcmsCents: number; icmsStCents: number; fcpCents: 0; destinationTotalCents: number };
  sourceCodes: string[];
};

export function resolveColdBeverageScDestination(input: ColdBeverageScInput): ColdBeverageScResult {
  const profile = profileByCode.get(input.profileCode) ?? null;
  const missingFacts = Object.entries(ST_COLD_BEVERAGES_SC_FACT_LABELS).filter(([key]) => input.facts?.[key as keyof ColdBeverageScFacts] !== true).map(([, label]) => label);
  const blockers: string[] = [];
  if (input.route !== ST_COLD_BEVERAGES_SC_ROUTE.route) blockers.push("rota fora do recorte SP→SC");
  if (!profile) blockers.push("marca, GTIN, embalagem ou volume fora dos cinco perfis exatos");
  if (!validDate(input.operationDate)) blockers.push("data fora da vigência comum de 01/08/2026 a 30/11/2026");
  if (!Number.isSafeInteger(input.quantityUnits) || input.quantityUnits <= 0 || input.quantityUnits > 1_000_000) blockers.push("quantidade inválida");
  if (!Number.isSafeInteger(input.operationCents) || input.operationCents <= 0 || input.operationCents > 100_000_000_000) blockers.push("valor da operação inválido");
  if (!Number.isSafeInteger(input.ownIcmsBaseCents) || input.ownIcmsBaseCents <= 0 || input.ownIcmsBaseCents > 100_000_000_000) blockers.push("base própria inválida");
  if (input.senderRole !== "distributor_or_wholesaler" && input.senderRole !== "industrial_or_importer") blockers.push("papel do remetente inválido");
  blockers.push(...missingFacts);
  const sourceCodes = stColdBeverageScSources.map((source) => source.code);
  if (blockers.length || !profile) return { status: "blocked", method: null, profile, blockers, missingFacts, parameters: null, output: null, sourceCodes };
  const pmpfBaseCents = profile.pmpfCents * input.quantityUnits;
  const pmpfLimitCents = roundDivide(pmpfBaseCents * ST_COLD_BEVERAGES_SC_PMPF_LIMIT_BPS, 10_000);
  const useFallback = input.operationCents >= pmpfLimitCents;
  const mvaBps = useFallback ? (input.senderRole === "industrial_or_importer" ? ST_COLD_BEVERAGES_SC_MVA_INDUSTRIAL_BPS : ST_COLD_BEVERAGES_SC_MVA_DISTRIBUTOR_BPS) : null;
  const stBaseCents = useFallback ? roundDivide(input.operationCents * (10_000 + mvaBps!), 10_000) : pmpfBaseCents;
  const interstateRateBps = input.importedQualified ? ST_COLD_BEVERAGES_SC_ROUTE.importedQualifiedRateBps : ST_COLD_BEVERAGES_SC_ROUTE.domesticInterstateRateBps;
  const ownIcmsCents = roundDivide(input.ownIcmsBaseCents * interstateRateBps, 10_000);
  const presumedInternalIcmsCents = roundDivide(stBaseCents * ST_COLD_BEVERAGES_SC_INTERNAL_RATE_BPS, 10_000);
  const icmsStCents = Math.max(0, presumedInternalIcmsCents - ownIcmsCents);
  return {
    status: useFallback ? "calculated_mva_fallback" : "calculated_pmpf", method: useFallback ? "mva_fallback" : "pmpf", profile, blockers: [], missingFacts: [], sourceCodes,
    parameters: { interstateRateBps, internalRateBps: ST_COLD_BEVERAGES_SC_INTERNAL_RATE_BPS, fcpRateBps: 0, pmpfLimitCents, mvaBps, senderRole: input.senderRole },
    output: { stBaseCents, ownIcmsCents, presumedInternalIcmsCents, icmsStCents, fcpCents: 0, destinationTotalCents: icmsStCents },
  };
}

export const stColdBeverageScReferenceRuns = ST_COLD_BEVERAGES_SC_PMPF_PROFILES.flatMap((profile) => {
  const quantityUnits = 100;
  const pmpf = profile.pmpfCents * quantityUnits;
  const low = roundDivide(pmpf * 6_000, 10_000);
  const high = roundDivide(pmpf * 9_500, 10_000);
  const common = { route: "SP-SC", profileCode: profile.code, operationDate: "2026-08-01", quantityUnits, importedQualified: false, facts: allFacts };
  return [
    { key: `${profile.code}:pmpf`, result: resolveColdBeverageScDestination({ ...common, operationCents: low, ownIcmsBaseCents: low, senderRole: "distributor_or_wholesaler" }) },
    { key: `${profile.code}:mva-distributor`, result: resolveColdBeverageScDestination({ ...common, operationCents: high, ownIcmsBaseCents: high, senderRole: "distributor_or_wholesaler" }) },
    { key: `${profile.code}:mva-industrial`, result: resolveColdBeverageScDestination({ ...common, operationCents: high, ownIcmsBaseCents: high, senderRole: "industrial_or_importer" }) },
  ];
});

export const stColdBeverageScNegativeRuns = ST_COLD_BEVERAGES_SC_PMPF_PROFILES.flatMap((profile) => {
  const common = { route: "SP-SC", profileCode: profile.code, operationDate: "2026-08-01", quantityUnits: 100, operationCents: profile.pmpfCents * 60, ownIcmsBaseCents: profile.pmpfCents * 60, importedQualified: false, senderRole: "distributor_or_wholesaler" as const, facts: allFacts };
  return [
    resolveColdBeverageScDestination({ ...common, profileCode: `${profile.code}-BRAND-DIVERGENT` }),
    resolveColdBeverageScDestination({ ...common, facts: { ...allFacts, exactPackageConfirmed: false } }),
    resolveColdBeverageScDestination({ ...common, facts: { ...allFacts, exactVolumeConfirmed: false } }),
    resolveColdBeverageScDestination({ ...common, facts: { ...allFacts, normalRegimeConfirmed: false } }),
    resolveColdBeverageScDestination({ ...common, facts: { ...allFacts, noInterdependenceConfirmed: false } }),
    resolveColdBeverageScDestination({ ...common, operationDate: "2026-12-01" }),
  ];
});

export function stColdBeverageScMetrics() { return { routes: 1, exactProfiles: 5, positiveMemories: stColdBeverageScReferenceRuns.length, negativeGates: stColdBeverageScNegativeRuns.length, officialSources: stColdBeverageScSources.length, pmpfMemories: 5, mvaFallbackMemories: 10, fcpRateBps: 0 }; }
export function validateStColdBeverageScDestination() {
  const errors: string[] = [];
  if (ST_COLD_BEVERAGES_SC_PMPF_PROFILES.length !== 5 || new Set(ST_COLD_BEVERAGES_SC_PMPF_PROFILES.map((p) => p.gtin)).size !== 5) errors.push("sc_profiles_must_have_five_unique_gtins");
  if (stColdBeverageScReferenceRuns.length !== 15 || stColdBeverageScReferenceRuns.some((run) => !run.result.output || run.result.status === "blocked")) errors.push("sc_positive_memories_failed");
  if (stColdBeverageScReferenceRuns.filter((run) => run.result.status === "calculated_pmpf").length !== 5) errors.push("sc_pmpf_memories_failed");
  if (stColdBeverageScReferenceRuns.filter((run) => run.result.status === "calculated_mva_fallback").length !== 10) errors.push("sc_mva_fallback_memories_failed");
  if (stColdBeverageScNegativeRuns.length !== 30 || stColdBeverageScNegativeRuns.some((run) => run.status !== "blocked" || run.output !== null)) errors.push("sc_negative_gates_failed");
  if (stColdBeverageScSources.some((source) => !source.url.startsWith("https://") || !source.proves.length)) errors.push("sc_sources_invalid");
  const distributor = stColdBeverageScReferenceRuns.find((run) => run.key.endsWith("mva-distributor"))?.result.output?.stBaseCents ?? 0;
  const industrial = stColdBeverageScReferenceRuns.find((run) => run.key.endsWith("mva-industrial"))?.result.output?.stBaseCents ?? 0;
  if (industrial <= distributor) errors.push("sc_sender_role_mva_not_applied");
  return { passed: errors.length === 0, errors };
}
export async function hashStColdBeverageScDestination() {
  const payload = JSON.stringify({ version: ST_COLD_BEVERAGES_SC_DESTINATION_VERSION, period: ST_COLD_BEVERAGES_SC_DESTINATION_PERIOD, route: ST_COLD_BEVERAGES_SC_ROUTE, profiles: ST_COLD_BEVERAGES_SC_PMPF_PROFILES, facts: ST_COLD_BEVERAGES_SC_FACT_LABELS, sources: stColdBeverageScSources, positive: stColdBeverageScReferenceRuns, negative: stColdBeverageScNegativeRuns });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

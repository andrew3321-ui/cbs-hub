import {
  stColdBeverageRoutes,
  type ColdBeverageProductCode,
} from "./st-cold-beverages-priority.ts";

export const ST_COLD_BEVERAGES_SP_DESTINATION_VERSION = "2026.07.25-v69";
export const ST_COLD_BEVERAGES_SP_DESTINATION_CHECKED_AT = "2026-07-25";
export const ST_COLD_BEVERAGES_SP_DESTINATION_PERIOD = {
  from: "2026-07-01",
  to: "2026-12-31",
} as const;

export const ST_COLD_BEVERAGES_SP_INTERNAL_RATE_BPS = 1_800;
export const ST_COLD_BEVERAGES_SP_FCP_RATE_BPS = 0;
export const ST_COLD_BEVERAGES_SP_PMPF_LIMIT_BPS = 9_000;

export const ST_COLD_BEVERAGES_SP_DESTINATION_ROUTES = stColdBeverageRoutes
  .filter((route) => route.destination === "SP")
  .map((route) => ({
    corridorRank: route.corridorRank,
    origin: route.origin,
    destination: "SP" as const,
    route: route.route,
    agreement: "protocol_11_1991" as const,
    domesticInterstateRateBps: 1_200 as const,
    importedQualifiedRateBps: 400 as const,
    directionalSymmetryAssumed: false as const,
  }));

export type ColdBeverageSpProfileCode =
  | "UNLISTED_SOFT_DRINK_PET_1751_2000"
  | "UNLISTED_SOFT_DRINK_CAN_311_360"
  | "UNLISTED_ENERGY_CAN_311_360"
  | "UNLISTED_ENERGY_PET_ABOVE_1500"
  | "UNLISTED_ISOTONIC_PET_401_660";

export type ColdBeverageSpProfile = {
  code: ColdBeverageSpProfileCode;
  productCode: Exclude<ColdBeverageProductCode, "WATER_GLASS">;
  label: string;
  cest: string;
  brandRule: "demais_marcas_nao_listadas";
  packageType: "PET" | "LATA";
  volumeRange: string;
  pmpfCents: number;
  legalTableItem: string;
  effectiveFrom: typeof ST_COLD_BEVERAGES_SP_DESTINATION_PERIOD.from;
  effectiveTo: typeof ST_COLD_BEVERAGES_SP_DESTINATION_PERIOD.to;
};

export const ST_COLD_BEVERAGES_SP_PMPF_PROFILES: ColdBeverageSpProfile[] = [
  {
    code: "UNLISTED_SOFT_DRINK_PET_1751_2000",
    productCode: "SOFT_DRINK_PET",
    label: "Refrigerante de marca não listada · PET de 1.751 a 2.000 ml",
    cest: "03.010.01",
    brandRule: "demais_marcas_nao_listadas",
    packageType: "PET",
    volumeRange: "1.751 a 2.000 ml",
    pmpfCents: 939,
    legalTableItem: "Anexo I, Capítulo I, item 3.509",
    effectiveFrom: ST_COLD_BEVERAGES_SP_DESTINATION_PERIOD.from,
    effectiveTo: ST_COLD_BEVERAGES_SP_DESTINATION_PERIOD.to,
  },
  {
    code: "UNLISTED_SOFT_DRINK_CAN_311_360",
    productCode: "SOFT_DRINK_CAN",
    label: "Refrigerante de marca não listada · lata de 311 a 360 ml",
    cest: "03.010.02",
    brandRule: "demais_marcas_nao_listadas",
    packageType: "LATA",
    volumeRange: "311 a 360 ml",
    pmpfCents: 454,
    legalTableItem: "Anexo I, Capítulo I, item 3.515",
    effectiveFrom: ST_COLD_BEVERAGES_SP_DESTINATION_PERIOD.from,
    effectiveTo: ST_COLD_BEVERAGES_SP_DESTINATION_PERIOD.to,
  },
  {
    code: "UNLISTED_ENERGY_CAN_311_360",
    productCode: "ENERGY_CAN",
    label: "Energético de marca não listada · lata de 311 a 360 ml",
    cest: "03.013.00",
    brandRule: "demais_marcas_nao_listadas",
    packageType: "LATA",
    volumeRange: "311 a 360 ml",
    pmpfCents: 1_445,
    legalTableItem: "Anexo II, Capítulo I, Tabela 2, item 2.131",
    effectiveFrom: ST_COLD_BEVERAGES_SP_DESTINATION_PERIOD.from,
    effectiveTo: ST_COLD_BEVERAGES_SP_DESTINATION_PERIOD.to,
  },
  {
    code: "UNLISTED_ENERGY_PET_ABOVE_1500",
    productCode: "ENERGY_PET",
    label: "Energético de marca não listada · PET acima de 1.500 ml",
    cest: "03.013.01",
    brandRule: "demais_marcas_nao_listadas",
    packageType: "PET",
    volumeRange: "acima de 1.500 ml",
    pmpfCents: 1_055,
    legalTableItem: "Anexo II, Capítulo I, Tabela 2, item 2.135",
    effectiveFrom: ST_COLD_BEVERAGES_SP_DESTINATION_PERIOD.from,
    effectiveTo: ST_COLD_BEVERAGES_SP_DESTINATION_PERIOD.to,
  },
  {
    code: "UNLISTED_ISOTONIC_PET_401_660",
    productCode: "ISOTONIC",
    label: "Isotônico de marca não listada · PET de 401 a 660 ml",
    cest: "03.015.00",
    brandRule: "demais_marcas_nao_listadas",
    packageType: "PET",
    volumeRange: "401 a 660 ml",
    pmpfCents: 599,
    legalTableItem: "Anexo II, Capítulo I, Tabela 1, item 1.12",
    effectiveFrom: ST_COLD_BEVERAGES_SP_DESTINATION_PERIOD.from,
    effectiveTo: ST_COLD_BEVERAGES_SP_DESTINATION_PERIOD.to,
  },
];

export const ST_COLD_BEVERAGES_SP_FACT_LABELS = {
  exactProfileConfirmed: "marca, embalagem, volume, descrição e CEST coincidem com o perfil selecionado",
  unlistedBrandEligibilityConfirmed: "a marca não possui preço próprio na pauta e pode usar “Demais marcas não listadas”",
  normalTaxRegimeConfirmed: "remetente está no regime normal e o débito próprio segue a alíquota interestadual informada",
  taxpayerResaleOperationConfirmed: "operação interestadual entre contribuintes destinada à revenda; uso, consumo, ativo e consumidor final afastados",
  substituteResponsibilityConfirmed: "responsabilidade pela retenção em favor de São Paulo confirmada",
  noProtocolExceptionConfirmed: "transferência, operação entre substitutos e demais exceções foram afastadas",
  ownTaxBaseConfirmed: "valor da operação e base do ICMS próprio, com frete e encargos aplicáveis, foram conferidos",
  noSpecialTreatmentConfirmed: "benefício, decisão, regime especial, redução e alíquota específica foram afastados",
  documentsConfirmed: "NF-e, cadastro, contrato, GTIN e documentos comerciais foram conferidos",
} as const;

export type ColdBeverageSpFacts = Record<keyof typeof ST_COLD_BEVERAGES_SP_FACT_LABELS, boolean>;

export const stColdBeverageSpSources = [
  {
    code: "CONFAZ-PROTOCOL-11-1991",
    title: "Protocolo ICMS 11/91 — bebidas frias",
    publisher: "CONFAZ",
    url: "https://www.confaz.fazenda.gov.br/legislacao/protocolos/1991/pt011_91",
    checkedAt: ST_COLD_BEVERAGES_SP_DESTINATION_CHECKED_AT,
    proves: ["responsabilidade interestadual", "cálculo pelo preço oficial menos o ICMS próprio", "MVA da legislação paulista quando o PMPF não puder ser usado"],
  },
  {
    code: "SP-SRE-27-2026-BEVERAGES",
    title: "Portaria SRE 27/2026 — pauta paulista vigente",
    publisher: "SEFAZ-SP",
    url: "https://legislacao.fazenda.sp.gov.br/Paginas/Portaria-SRE-27-de-2026.aspx",
    checkedAt: ST_COLD_BEVERAGES_SP_DESTINATION_CHECKED_AT,
    proves: ["PMPF de 01/07/2026 a 31/12/2026", "cinco perfis exatos de marcas não listadas", "trava de 90% e fallback para IVA-ST"],
  },
  {
    code: "SP-RICMS-293-294-BEVERAGES",
    title: "RICMS/SP — artigos 293 e 294",
    publisher: "SEFAZ-SP",
    url: "https://legislacao.fazenda.sp.gov.br/Paginas/art293.aspx",
    checkedAt: ST_COLD_BEVERAGES_SP_DESTINATION_CHECKED_AT,
    proves: ["sujeição passiva por substituição", "equiparação de energéticos e isotônicos a refrigerantes", "IVA-ST divulgado pela SEFAZ-SP"],
  },
  {
    code: "SP-RICMS-52-56C-RATES",
    title: "RICMS/SP — artigos 52 a 56-C",
    publisher: "SEFAZ-SP",
    url: "https://legislacao.fazenda.sp.gov.br/Paginas/art052.aspx",
    checkedAt: ST_COLD_BEVERAGES_SP_DESTINATION_CHECKED_AT,
    proves: ["alíquota interna geral de 18%", "FECOEP restrito a bebidas alcoólicas da posição 2203 e fumo, sem incidência nestes cinco perfis não alcoólicos"],
  },
  {
    code: "RSF-22-1989-INTERSTATE-RATES",
    title: "Resolução do Senado Federal 22/1989",
    publisher: "Senado Federal",
    url: "https://legis.senado.gov.br/norma/586152",
    checkedAt: ST_COLD_BEVERAGES_SP_DESTINATION_CHECKED_AT,
    proves: ["alíquota interestadual doméstica de 12% nas sete rotas controladas com destino a São Paulo"],
  },
  {
    code: "RSF-13-2012-IMPORTED-RATE",
    title: "Resolução do Senado Federal 13/2012",
    publisher: "Senado Federal",
    url: "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2012/congresso/rsf-13-2012.htm",
    checkedAt: ST_COLD_BEVERAGES_SP_DESTINATION_CHECKED_AT,
    proves: ["alíquota interestadual de 4% condicionada aos requisitos e exceções para bens e mercadorias importados"],
  },
];

const routeByKey = new Map(ST_COLD_BEVERAGES_SP_DESTINATION_ROUTES.map((route) => [route.route, route]));
const profileByCode = new Map(ST_COLD_BEVERAGES_SP_PMPF_PROFILES.map((profile) => [profile.code, profile]));

function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function roundDivide(numerator: number, denominator: number) {
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator) || denominator <= 0) {
    throw new Error("unsafe_sp_beverage_calculation");
  }
  return Math.floor((numerator + Math.floor(denominator / 2)) / denominator);
}

export type ColdBeverageSpOperationInput = {
  route: string;
  profileCode: string;
  operationDate: string;
  quantityUnits: number;
  operationCents: number;
  ownIcmsBaseCents: number;
  importedQualified: boolean;
  facts: ColdBeverageSpFacts;
};

export type ColdBeverageSpOperationResult = {
  status: "calculated_reference" | "pmpf_fallback_required" | "blocked";
  route: string;
  operationDate: string;
  profile: ColdBeverageSpProfile | null;
  missingFacts: string[];
  blockers: string[];
  parameters: null | {
    quantityUnits: number;
    pmpfUnitCents: number;
    pmpfLimitCents: number;
    interstateRateBps: number;
    internalRateBps: number;
    fcpRateBps: number;
    importedQualified: boolean;
  };
  output: null | {
    stBaseCents: number;
    ownIcmsCents: number;
    presumedInternalIcmsCents: number;
    icmsStCents: number;
    fcpCents: 0;
    destinationTotalCents: number;
  };
  sourceCodes: string[];
  limitation: string;
};

export function resolveColdBeverageSpDestinationOperation(input: ColdBeverageSpOperationInput): ColdBeverageSpOperationResult {
  const route = routeByKey.get(input.route);
  const profile = profileByCode.get(input.profileCode as ColdBeverageSpProfileCode) ?? null;
  const missingFacts = Object.entries(ST_COLD_BEVERAGES_SP_FACT_LABELS)
    .filter(([key]) => input.facts?.[key as keyof ColdBeverageSpFacts] !== true)
    .map(([, label]) => label);
  const blockers: string[] = [];
  if (!route) blockers.push("rota fora dos sete corredores prioritários com destino a São Paulo");
  if (!profile) blockers.push("produto fora dos cinco perfis exatos da pauta paulista controlada");
  if (!isIsoDate(input.operationDate)
    || input.operationDate < ST_COLD_BEVERAGES_SP_DESTINATION_PERIOD.from
    || input.operationDate > ST_COLD_BEVERAGES_SP_DESTINATION_PERIOD.to) {
    blockers.push("data fora da vigência controlada da Portaria SRE 27/2026");
  }
  if (!Number.isSafeInteger(input.quantityUnits) || input.quantityUnits <= 0 || input.quantityUnits > 1_000_000) {
    blockers.push("quantidade inválida ou acima do limite controlado");
  }
  if (!Number.isSafeInteger(input.operationCents) || input.operationCents <= 0 || input.operationCents > 100_000_000_000) {
    blockers.push("valor da operação inválido ou acima do limite controlado");
  }
  if (!Number.isSafeInteger(input.ownIcmsBaseCents) || input.ownIcmsBaseCents <= 0 || input.ownIcmsBaseCents > 100_000_000_000) {
    blockers.push("base do ICMS próprio inválida ou acima do limite controlado");
  }
  blockers.push(...missingFacts);

  const baseResult = {
    route: input.route,
    operationDate: input.operationDate,
    profile,
    missingFacts,
    sourceCodes: stColdBeverageSpSources.map((source) => source.code),
    limitation: "Memória determinística condicionada a um perfil exato de PMPF e a remetente no regime normal. Não cobre Simples Nacional, marca com preço próprio, embalagem divergente, benefício, decisão, regime especial, IVA-ST de fallback nem água.",
  };
  if (blockers.length > 0 || !route || !profile) {
    return { ...baseResult, status: "blocked", blockers, parameters: null, output: null };
  }

  const stBaseCents = profile.pmpfCents * input.quantityUnits;
  if (!Number.isSafeInteger(stBaseCents)) {
    return { ...baseResult, status: "blocked", blockers: ["base PMPF excede o limite seguro do cálculo"], parameters: null, output: null };
  }
  const pmpfLimitCents = roundDivide(stBaseCents * ST_COLD_BEVERAGES_SP_PMPF_LIMIT_BPS, 10_000);
  const interstateRateBps = input.importedQualified ? route.importedQualifiedRateBps : route.domesticInterstateRateBps;
  const parameters = {
    quantityUnits: input.quantityUnits,
    pmpfUnitCents: profile.pmpfCents,
    pmpfLimitCents,
    interstateRateBps,
    internalRateBps: ST_COLD_BEVERAGES_SP_INTERNAL_RATE_BPS,
    fcpRateBps: ST_COLD_BEVERAGES_SP_FCP_RATE_BPS,
    importedQualified: input.importedQualified,
  };

  if (input.operationCents * 10_000 >= stBaseCents * ST_COLD_BEVERAGES_SP_PMPF_LIMIT_BPS) {
    return {
      ...baseResult,
      status: "pmpf_fallback_required",
      blockers: ["o valor da operação própria atingiu ou superou 90% do PMPF; a Portaria SRE 27/2026 manda abandonar a pauta e usar o IVA-ST aplicável"],
      parameters,
      output: null,
    };
  }

  const ownIcmsCents = roundDivide(input.ownIcmsBaseCents * interstateRateBps, 10_000);
  const presumedInternalIcmsCents = roundDivide(stBaseCents * ST_COLD_BEVERAGES_SP_INTERNAL_RATE_BPS, 10_000);
  const icmsStCents = Math.max(0, presumedInternalIcmsCents - ownIcmsCents);
  return {
    ...baseResult,
    status: "calculated_reference",
    blockers: [],
    parameters,
    output: {
      stBaseCents,
      ownIcmsCents,
      presumedInternalIcmsCents,
      icmsStCents,
      fcpCents: 0,
      destinationTotalCents: icmsStCents,
    },
  };
}

const allFactsConfirmed = Object.fromEntries(
  Object.keys(ST_COLD_BEVERAGES_SP_FACT_LABELS).map((key) => [key, true]),
) as ColdBeverageSpFacts;

export const stColdBeverageSpReferenceRuns = ST_COLD_BEVERAGES_SP_DESTINATION_ROUTES.flatMap((route) =>
  ST_COLD_BEVERAGES_SP_PMPF_PROFILES.map((profile) => {
    const quantityUnits = 100;
    const stBaseCents = profile.pmpfCents * quantityUnits;
    const operationCents = roundDivide(stBaseCents * 6_000, 10_000);
    const result = resolveColdBeverageSpDestinationOperation({
      route: route.route,
      profileCode: profile.code,
      operationDate: ST_COLD_BEVERAGES_SP_DESTINATION_CHECKED_AT,
      quantityUnits,
      operationCents,
      ownIcmsBaseCents: operationCents,
      importedQualified: false,
      facts: allFactsConfirmed,
    });
    return {
      key: `${route.route}:${profile.code}`,
      route: route.route,
      profileCode: profile.code,
      scenario: "100 unidades, operação e base própria a 60% do PMPF, mercadoria nacional, regime normal" as const,
      status: result.status,
      output: result.output,
    };
  }),
);

export function stColdBeverageSpDestinationMetrics() {
  return {
    inboundRoutes: ST_COLD_BEVERAGES_SP_DESTINATION_ROUTES.length,
    exactPmpfProfiles: ST_COLD_BEVERAGES_SP_PMPF_PROFILES.length,
    controlledCells: stColdBeverageSpReferenceRuns.length,
    reproducedMemories: stColdBeverageSpReferenceRuns.filter((run) => run.status === "calculated_reference").length,
    safeFailures: stColdBeverageSpReferenceRuns.filter((run) => run.status !== "calculated_reference").length,
    officialSources: stColdBeverageSpSources.length,
  };
}

export function validateStColdBeverageSpDestination() {
  const errors: string[] = [];
  if (ST_COLD_BEVERAGES_SP_DESTINATION_ROUTES.length !== 7
    || new Set(ST_COLD_BEVERAGES_SP_DESTINATION_ROUTES.map((route) => route.route)).size !== 7) {
    errors.push("sp_destination_must_have_seven_unique_inbound_routes");
  }
  if (ST_COLD_BEVERAGES_SP_DESTINATION_ROUTES.some((route) => route.destination !== "SP" || route.directionalSymmetryAssumed !== false)) {
    errors.push("sp_destination_routes_must_be_directional_and_end_in_sp");
  }
  if (ST_COLD_BEVERAGES_SP_PMPF_PROFILES.length !== 5
    || new Set(ST_COLD_BEVERAGES_SP_PMPF_PROFILES.map((profile) => profile.code)).size !== 5) {
    errors.push("sp_destination_must_have_five_unique_profiles");
  }
  if (ST_COLD_BEVERAGES_SP_PMPF_PROFILES.some((profile) =>
    profile.pmpfCents <= 0
    || profile.effectiveFrom !== ST_COLD_BEVERAGES_SP_DESTINATION_PERIOD.from
    || profile.effectiveTo !== ST_COLD_BEVERAGES_SP_DESTINATION_PERIOD.to)) {
    errors.push("sp_destination_profiles_have_invalid_scope");
  }
  if (stColdBeverageSpReferenceRuns.length !== 35) errors.push("sp_destination_matrix_must_have_thirty_five_cells");
  if (stColdBeverageSpReferenceRuns.some((run) => run.status !== "calculated_reference" || !run.output)) {
    errors.push("sp_destination_reference_memory_failed");
  }
  if (stColdBeverageSpSources.some((source) => !source.url.startsWith("https://") || source.proves.length === 0)) {
    errors.push("sp_destination_sources_must_be_official_https_with_scope");
  }
  const metrics = stColdBeverageSpDestinationMetrics();
  if (metrics.reproducedMemories + metrics.safeFailures !== metrics.controlledCells) {
    errors.push("sp_destination_metrics_do_not_close");
  }
  const reference = stColdBeverageSpReferenceRuns[0];
  const profile = ST_COLD_BEVERAGES_SP_PMPF_PROFILES[0];
  const stBaseCents = profile.pmpfCents * 100;
  const pmpfLimitCents = roundDivide(stBaseCents * ST_COLD_BEVERAGES_SP_PMPF_LIMIT_BPS, 10_000);
  const regressionInput: ColdBeverageSpOperationInput = {
    route: reference.route,
    profileCode: profile.code,
    operationDate: ST_COLD_BEVERAGES_SP_DESTINATION_CHECKED_AT,
    quantityUnits: 100,
    operationCents: pmpfLimitCents - 1,
    ownIcmsBaseCents: pmpfLimitCents - 1,
    importedQualified: false,
    facts: allFactsConfirmed,
  };
  if (resolveColdBeverageSpDestinationOperation(regressionInput).output === null) {
    errors.push("sp_destination_positive_boundary_failed");
  }
  const atBoundary = resolveColdBeverageSpDestinationOperation({
    ...regressionInput,
    operationCents: pmpfLimitCents,
    ownIcmsBaseCents: pmpfLimitCents,
  });
  if (atBoundary.status !== "pmpf_fallback_required" || atBoundary.output !== null) {
    errors.push("sp_destination_pmpf_boundary_gate_failed");
  }
  const stale = resolveColdBeverageSpDestinationOperation({
    ...regressionInput,
    operationDate: "2026-06-30",
  });
  if (stale.status !== "blocked" || stale.output !== null) errors.push("sp_destination_validity_gate_failed");
  const missingEvidence = resolveColdBeverageSpDestinationOperation({
    ...regressionInput,
    facts: { ...allFactsConfirmed, documentsConfirmed: false },
  });
  if (missingEvidence.status !== "blocked" || missingEvidence.output !== null || missingEvidence.missingFacts.length !== 1) {
    errors.push("sp_destination_evidence_gate_failed");
  }
  return { passed: errors.length === 0, errors };
}

export async function hashStColdBeverageSpDestination() {
  const payload = JSON.stringify({
    version: ST_COLD_BEVERAGES_SP_DESTINATION_VERSION,
    period: ST_COLD_BEVERAGES_SP_DESTINATION_PERIOD,
    routes: ST_COLD_BEVERAGES_SP_DESTINATION_ROUTES,
    profiles: ST_COLD_BEVERAGES_SP_PMPF_PROFILES,
    facts: ST_COLD_BEVERAGES_SP_FACT_LABELS,
    sources: stColdBeverageSpSources,
    runs: stColdBeverageSpReferenceRuns,
  });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

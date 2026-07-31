import {
  ST_PHARMA_COSMETICS_PRODUCTS,
  stPharmaCosmeticsCoverageCells,
  stPharmaCosmeticsReferenceRuns,
} from "./st-pharma-cosmetics-priority.ts";
import {
  ST_CONSTRUCTION_ELECTRICAL_PRODUCTS,
  ST_CONSTRUCTION_ELECTRICAL_ROUTES,
  stConstructionElectricalReferenceRuns,
} from "./st-construction-electrical-priority.ts";
import {
  ST_FOOD_CLEANING_PET_PRODUCTS,
  ST_FOOD_CLEANING_PET_ROUTES,
  stFoodCleaningPetReferenceRuns,
} from "./st-food-cleaning-pet-priority.ts";

export const ST_SECTORAL_PRIORITY_EXPANSION_VERSION = "2026.07.31-v92";
export const ST_SECTORAL_PRIORITY_EXPANSION_CHECKED_AT = "2026-07-31";

export const ST_SECTORAL_RANKED_ROUTES = [
  "SP-MG",
  "MG-SP",
  "SP-RJ",
  "RJ-SP",
  "SP-PR",
  "PR-SP",
  "SP-SC",
  "SC-SP",
  "SP-BA",
  "BA-SP",
] as const;

export type SectoralPriorityRoute = typeof ST_SECTORAL_RANKED_ROUTES[number];
export type SectoralPriorityStatus = "supported" | "partial" | "not_supported";
export type SectoralPrioritySegment =
  | "medicine"
  | "cosmetics"
  | "perfumery"
  | "construction"
  | "tools"
  | "electrical"
  | "food"
  | "cleaning"
  | "household_hygiene"
  | "pet_food";

type Representative = {
  segment: SectoralPrioritySegment;
  module: "pharma_cosmetics" | "construction_electrical" | "food_cleaning_pet";
  productCode: string;
  description: string;
  ncm: string;
  cest: string;
  exclusions: string[];
};

function pharmaRepresentative(segment: "medicine" | "cosmetics" | "perfumery", productCode: "REFERENCE_POSITIVE" | "BEAUTY_CREAM" | "PERFUME"): Representative {
  const product = ST_PHARMA_COSMETICS_PRODUCTS.find((item) => item.code === productCode)!;
  return {
    segment,
    module: "pharma_cosmetics",
    productCode,
    description: product.description,
    ncm: product.ncms.join("/"),
    cest: product.cest,
    exclusions: ["descrição, finalidade ou lista fiscal divergente", "tratamento federal deve ser apurado separadamente"],
  };
}

function constructionRepresentative(segment: "construction" | "tools" | "electrical", productCode: "ARGAMASSA" | "MANUAL_TOOLS" | "TRANSFORMERS"): Representative {
  const product = ST_CONSTRUCTION_ELECTRICAL_PRODUCTS.find((item) => item.code === productCode)!;
  return {
    segment,
    module: "construction_electrical",
    productCode,
    description: product.description,
    ncm: product.exampleNcm,
    cest: product.cest,
    exclusions: [...product.exclusions],
  };
}

function foodRepresentative(segment: "food" | "cleaning" | "household_hygiene" | "pet_food", productCode: "WHITE_CHOCOLATE_1KG" | "POWDER_DETERGENT" | "BLEACH" | "DOGCHOW_ABOVE_5KG"): Representative {
  const product = ST_FOOD_CLEANING_PET_PRODUCTS.find((item) => item.code === productCode)!;
  return {
    segment,
    module: "food_cleaning_pet",
    productCode,
    description: product.description,
    ncm: product.ncm,
    cest: product.cest,
    exclusions: [...product.exclusions],
  };
}

export const ST_SECTORAL_REPRESENTATIVES: Representative[] = [
  pharmaRepresentative("medicine", "REFERENCE_POSITIVE"),
  pharmaRepresentative("cosmetics", "BEAUTY_CREAM"),
  pharmaRepresentative("perfumery", "PERFUME"),
  constructionRepresentative("construction", "ARGAMASSA"),
  constructionRepresentative("tools", "MANUAL_TOOLS"),
  constructionRepresentative("electrical", "TRANSFORMERS"),
  foodRepresentative("food", "WHITE_CHOCOLATE_1KG"),
  foodRepresentative("cleaning", "POWDER_DETERGENT"),
  foodRepresentative("household_hygiene", "BLEACH"),
  foodRepresentative("pet_food", "DOGCHOW_ABOVE_5KG"),
];

type FrozenLegalSnapshot = {
  protocolCodes: string[];
  mvaOriginalBps: number | null;
  mvaAdjustedBps: number | null;
  internalRateBps: number | null;
  fcpRateBps: number | null;
  responsibility: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  sourceCodes: string[];
};

type Baseline = {
  status: SectoralPriorityStatus;
  blockers: string[];
  legal: FrozenLegalSnapshot | null;
  output: unknown | null;
  sourceRunKey: string | null;
};

function baselineFor(representative: Representative, route: SectoralPriorityRoute): Baseline {
  if (representative.module === "pharma_cosmetics") {
    const cell = stPharmaCosmeticsCoverageCells.find((item) => item.route === route && item.productCode === representative.productCode);
    const run = stPharmaCosmeticsReferenceRuns.find((item) => item.key === `${route}:${representative.productCode}`);
    if (!cell || !run) return absentBaseline(route);
    return {
      status: cell.status,
      blockers: [...cell.blockers],
      legal: cell.status === "supported" ? {
        protocolCodes: cell.sourceCodes.filter((code) => code.includes("PROTO") || code.includes("CONFAZ") || code.includes("RC")),
        mvaOriginalBps: null,
        mvaAdjustedBps: null,
        internalRateBps: null,
        fcpRateBps: null,
        responsibility: cell.responsibility,
        effectiveFrom: cell.effectiveFrom,
        effectiveTo: cell.effectiveTo,
        sourceCodes: [...cell.sourceCodes],
      } : null,
      output: run.result.output,
      sourceRunKey: run.key,
    };
  }
  if (representative.module === "construction_electrical") {
    const run = stConstructionElectricalReferenceRuns.find((item) => item.route === route && item.productCode === representative.productCode);
    if (!run) return absentBaseline(route);
    const routeProfile = ST_CONSTRUCTION_ELECTRICAL_ROUTES.find((item) => item.route === route)!;
    return {
      status: run.result.coverageStatus,
      blockers: [...run.result.blockers],
      legal: run.result.coverageStatus === "supported" && run.result.parameters ? {
        protocolCodes: Object.values(routeProfile.agreementCodes),
        mvaOriginalBps: run.result.parameters.mvaOriginalBps,
        mvaAdjustedBps: run.result.parameters.mvaAdjustedBps,
        internalRateBps: run.result.parameters.internalRateBps,
        fcpRateBps: run.result.parameters.fcpRateBps,
        responsibility: run.result.responsibility ?? "responsibility_not_frozen",
        effectiveFrom: "2026-07-30",
        effectiveTo: "2026-12-31",
        sourceCodes: [...run.result.sourceCodes],
      } : null,
      output: run.result.output,
      sourceRunKey: run.key,
    };
  }
  const run = stFoodCleaningPetReferenceRuns.find((item) => item.route === route && item.productCode === representative.productCode);
  if (!run) return absentBaseline(route);
  const routeProfile = ST_FOOD_CLEANING_PET_ROUTES.find((item) => item.route === route)!;
  return {
    status: run.result.coverageStatus,
    blockers: [...run.result.blockers],
    legal: run.result.coverageStatus === "supported" && run.result.parameters ? {
      protocolCodes: routeProfile.sourceCodes.filter((code) => code.includes("PROTO") || code.includes("CONFAZ")),
      mvaOriginalBps: run.result.parameters.mvaOriginalBps,
      mvaAdjustedBps: run.result.parameters.mvaAdjustedBps,
      internalRateBps: run.result.parameters.internalRateBps,
      fcpRateBps: run.result.parameters.fcpRateBps,
      responsibility: run.result.responsibility ?? "responsibility_not_frozen",
      effectiveFrom: "2026-07-30",
      effectiveTo: "2026-09-30",
      sourceCodes: [...run.result.sourceCodes],
    } : null,
    output: run.result.output,
    sourceRunKey: run.key,
  };
}

function absentBaseline(route: SectoralPriorityRoute): Baseline {
  return {
    status: "not_supported",
    blockers: [
      `rota ${route} sem protocolo e parâmetros estaduais exatos congelados para este produto`,
      "MVA ou preço oficial, alíquota interna, FCP, vigência, exceções e responsabilidade precisam ser comprovados no destino",
      "é proibido reutilizar parâmetro de outra UF ou do sentido inverso",
    ],
    legal: null,
    output: null,
    sourceRunKey: null,
  };
}

export const stSectoralPriorityCells = ST_SECTORAL_REPRESENTATIVES.flatMap((representative) =>
  ST_SECTORAL_RANKED_ROUTES.map((route, routeIndex) => {
    const baseline = baselineFor(representative, route);
    return {
      key: `${representative.segment}:${route}:${representative.productCode}`,
      segment: representative.segment,
      route,
      routeRank: routeIndex + 1,
      priorityBasis: "internal_operational_heuristic" as const,
      identity: {
        productCode: representative.productCode,
        description: representative.description,
        ncm: representative.ncm,
        cest: representative.cest,
        exclusions: [...representative.exclusions],
      },
      status: baseline.status,
      blockers: baseline.status === "supported" ? [] : baseline.blockers.length ? baseline.blockers : ["célula condicional sem fechamento de todos os fatos jurídicos"],
      legal: baseline.legal,
      expectedMemory: baseline.status === "supported" ? {
        sourceRunKey: baseline.sourceRunKey!,
        output: baseline.output,
      } : null,
    };
  }),
);

export type SectoralSafetyMutation = "classification" | "operation_date" | "benefit" | "responsibility";

export const stSectoralPriorityCases = stSectoralPriorityCells.flatMap((cell) => {
  const baseline = {
    id: `${cell.key}:baseline`,
    cellKey: cell.key,
    kind: "baseline" as const,
    mutation: null,
    expectedStatus: cell.status,
    expectedOutput: cell.expectedMemory?.output ?? null,
    blockers: [...cell.blockers],
  };
  if (cell.status !== "supported") return [baseline];
  return [
    baseline,
    ...(["classification", "operation_date", "benefit", "responsibility"] as const).map((mutation) => ({
      id: `${cell.key}:${mutation}`,
      cellKey: cell.key,
      kind: "negative" as const,
      mutation,
      expectedStatus: "partial" as const,
      expectedOutput: null,
      blockers: [`mutação de ${mutation} invalida a memória positiva e exige nova prova`],
    })),
  ];
});

export function stSectoralPriorityMetrics() {
  return {
    segments: ST_SECTORAL_REPRESENTATIVES.length,
    rankedRoutesPerSegment: ST_SECTORAL_RANKED_ROUTES.length,
    controlledCells: stSectoralPriorityCells.length,
    deterministicCases: stSectoralPriorityCases.length,
    positiveMemories: stSectoralPriorityCells.filter((cell) => cell.status === "supported").length,
    negativeGates: stSectoralPriorityCases.filter((item) => item.kind === "negative").length,
    coverage: {
      supported: stSectoralPriorityCells.filter((cell) => cell.status === "supported").length,
      partial: stSectoralPriorityCells.filter((cell) => cell.status === "partial").length,
      notSupported: stSectoralPriorityCells.filter((cell) => cell.status === "not_supported").length,
    },
  };
}

export function validateStSectoralPriorityExpansion() {
  const errors: string[] = [];
  if (ST_SECTORAL_REPRESENTATIVES.length !== 10 || new Set(ST_SECTORAL_REPRESENTATIVES.map((item) => item.segment)).size !== 10) errors.push("ten_unique_segments_required");
  if (ST_SECTORAL_RANKED_ROUTES.length !== 10 || new Set(ST_SECTORAL_RANKED_ROUTES).size !== 10) errors.push("ten_unique_routes_required");
  if (stSectoralPriorityCells.length !== 100 || new Set(stSectoralPriorityCells.map((item) => item.key)).size !== 100) errors.push("hundred_unique_cells_required");
  for (const cell of stSectoralPriorityCells) {
    if (!cell.identity.description || !cell.identity.ncm || !/^\d{2}\.\d{3}\.\d{2}$/.test(cell.identity.cest) || cell.identity.exclusions.length === 0) errors.push(`${cell.key}:incomplete_identity`);
    if (cell.status === "supported") {
      if (!cell.expectedMemory || cell.expectedMemory.output === null || !cell.legal || cell.legal.sourceCodes.length < 2 || !cell.legal.responsibility) errors.push(`${cell.key}:supported_without_closed_memory`);
    } else if (cell.expectedMemory !== null || cell.blockers.length === 0) errors.push(`${cell.key}:blocked_cell_leaked_memory_or_reason`);
  }
  const supported = stSectoralPriorityCells.filter((cell) => cell.status === "supported");
  for (const cell of supported) {
    const mutations = stSectoralPriorityCases.filter((item) => item.cellKey === cell.key && item.kind === "negative");
    if (mutations.length !== 4 || new Set(mutations.map((item) => item.mutation)).size !== 4 || mutations.some((item) => item.expectedOutput !== null)) errors.push(`${cell.key}:four_safe_mutations_required`);
  }
  if (stSectoralPriorityCases.some((item) => item.kind === "negative" && item.expectedOutput !== null)) errors.push("negative_case_leaked_value");
  return { passed: errors.length === 0, errors };
}

export async function hashStSectoralPriorityExpansion() {
  const payload = JSON.stringify({
    version: ST_SECTORAL_PRIORITY_EXPANSION_VERSION,
    checkedAt: ST_SECTORAL_PRIORITY_EXPANSION_CHECKED_AT,
    cells: stSectoralPriorityCells,
    cases: stSectoralPriorityCases,
  });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

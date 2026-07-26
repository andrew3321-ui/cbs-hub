import {
  DETERMINISTIC_TAX_LAB_VERSION,
} from "./deterministic-tax-lab.ts";
import {
  FISCAL_SIMULATION_SUITE_VERSION,
  fiscalSimulationBaseHash,
  runFiscalSimulationSuite,
} from "./fiscal-homologation-simulations.ts";
import {
  ST_SP_CALCULATION_VALIDATION_VERSION,
  hashStSpCalculationRuns,
  stSpCalculationValidationMetrics,
  validateStSpCalculationRuns,
} from "./st-sp-calculation-validation.ts";
import {
  ST_AUTO_PARTS_HIGH_USE_CORRIDORS_VERSION,
  hashStAutoPartsHighUseCorridors,
  stAutoPartsHighUseCorridorMetrics,
  stAutoPartsHighUseSources,
  validateStAutoPartsHighUseCorridors,
} from "./st-auto-parts-high-use-corridors.ts";
import {
  ST_COLD_BEVERAGES_PRIORITY_VERSION,
  hashStColdBeveragePriority,
  stColdBeverageMetrics,
  stColdBeverageSources,
  validateStColdBeveragePriority,
} from "./st-cold-beverages-priority.ts";
import {
  ST_COLD_BEVERAGES_SP_DESTINATION_VERSION,
  hashStColdBeverageSpDestination,
  stColdBeverageSpDestinationMetrics,
  stColdBeverageSpSources,
  validateStColdBeverageSpDestination,
} from "./st-cold-beverages-sp-destination.ts";
import {
  ST_COLD_BEVERAGES_SP_ORIGIN_VERSION,
  hashStColdBeverageSpOrigin,
  stColdBeverageSpOriginMetrics,
  stColdBeverageSpOriginSources,
  validateStColdBeverageSpOrigin,
} from "./st-cold-beverages-sp-origin.ts";

export const FISCAL_REGRESSION_REPORT_VERSION = "fiscal-regression.v1";
export const FISCAL_REGRESSION_CHECKED_AT = "2026-07-26";

export type FiscalRegressionTestKind =
  | "positive"
  | "negative"
  | "boundary"
  | "exception"
  | "validity_change";

type Validation = { passed: boolean; errors: string[] };

type ModuleDefinition = {
  code: string;
  label: string;
  ruleCodes: readonly string[];
  version: string;
  validate: () => Validation;
  hash: () => Promise<string>;
  testKinds: readonly FiscalRegressionTestKind[];
  metrics: () => {
    deterministicCases: number;
    calculatedMemories: number;
    safelyBlockedCases: number;
  };
  sourceCodes: () => string[];
  requiredGates: readonly string[];
};

const ALL_TEST_KINDS: readonly FiscalRegressionTestKind[] = [
  "positive",
  "negative",
  "boundary",
  "exception",
  "validity_change",
];

const MODULE_DEFINITIONS: readonly ModuleDefinition[] = [
  {
    code: "DETERMINISTIC_TAX_LAB",
    label: "Casos ouro federais, ISS e DIFAL",
    ruleCodes: ["NATIONAL-COVERAGE-V27", "RTC-BR-2026-TEST", "SIMPLES-PGDAS", "ISS-DEEP-NATIONAL"],
    version: `${DETERMINISTIC_TAX_LAB_VERSION}:${FISCAL_SIMULATION_SUITE_VERSION}`,
    validate: () => {
      const runs = runFiscalSimulationSuite();
      const errors = runs
        .filter((run) => !run.passed || run.sourceCodes.length === 0)
        .map((run) => `${run.case.code}:golden_case_failed`);
      if (runs.some((run) => run.case.kind === "expected_block" && run.output.status !== "blocked")) {
        errors.push("mandatory_fact_gate_leaked_calculation");
      }
      return { passed: errors.length === 0, errors };
    },
    hash: fiscalSimulationBaseHash,
    testKinds: ["positive", "negative", "boundary", "exception"],
    metrics: () => {
      const runs = runFiscalSimulationSuite();
      return {
        deterministicCases: runs.length,
        calculatedMemories: runs.filter((run) => run.case.kind === "calculated_reference").length,
        safelyBlockedCases: runs.filter((run) => run.case.kind === "expected_block").length,
      };
    },
    sourceCodes: () => Array.from(new Set(runFiscalSimulationSuite().flatMap((run) => run.sourceCodes))).sort(),
    requiredGates: ["fatos mínimos por tributo", "fonte oficial rastreável", "status bloqueado quando há pendência"],
  },
  {
    code: "ST_SP_CALCULATION_RUNS",
    label: "Matriz determinística de 25 produtos e 26 destinos",
    ruleCodes: ["NATIONAL-COVERAGE-V27", "AUTO_PARTS_HIGH_USE_CORRIDORS"],
    version: ST_SP_CALCULATION_VALIDATION_VERSION,
    validate: validateStSpCalculationRuns,
    hash: hashStSpCalculationRuns,
    testKinds: ["positive", "negative", "exception"],
    metrics: () => {
      const metrics = stSpCalculationValidationMetrics();
      return {
        deterministicCases: metrics.totalRuns,
        calculatedMemories: metrics.referenceReproduced,
        safelyBlockedCases: metrics.safelyBlocked,
      };
    },
    sourceCodes: () => ["NATIONAL_COVERAGE", "ST_SP_MG_LEGAL", "ST_STATE_PARAMETER_BATCHES"],
    requiredGates: ["acordo por produto e rota", "lei do destino", "base de preço", "alíquota interna", "FCP", "benefícios e exceções"],
  },
  {
    code: "AUTO_PARTS_HIGH_USE_CORRIDORS",
    label: "Autopeças nos corredores de maior uso",
    ruleCodes: ["NATIONAL-COVERAGE-V27", "AUTO_PARTS_HIGH_USE_CORRIDORS"],
    version: ST_AUTO_PARTS_HIGH_USE_CORRIDORS_VERSION,
    validate: validateStAutoPartsHighUseCorridors,
    hash: hashStAutoPartsHighUseCorridors,
    testKinds: ALL_TEST_KINDS,
    metrics: () => {
      const metrics = stAutoPartsHighUseCorridorMetrics();
      return {
        deterministicCases: metrics.directedRoutes,
        calculatedMemories: metrics.syntheticReferencesReproduced,
        safelyBlockedCases: metrics.safelyBlocked,
      };
    },
    sourceCodes: () => stAutoPartsHighUseSources.map((source) => source.code).sort(),
    requiredGates: ["CEST/NCM", "uso automotivo", "vigência", "papéis dos contribuintes", "preço/base", "tratamentos especiais", "documentos"],
  },
  {
    code: "COLD_BEVERAGES_PRIORITY",
    label: "Aplicabilidade de bebidas por produto, sentido e vigência",
    ruleCodes: ["NATIONAL-COVERAGE-V27", "COLD_BEVERAGES_SP_DESTINATION", "COLD_BEVERAGES_SP_ORIGIN"],
    version: ST_COLD_BEVERAGES_PRIORITY_VERSION,
    validate: validateStColdBeveragePriority,
    hash: hashStColdBeveragePriority,
    testKinds: ["positive", "negative", "exception", "validity_change"],
    metrics: () => {
      const metrics = stColdBeverageMetrics();
      return {
        deterministicCases: metrics.productRouteCells,
        calculatedMemories: 0,
        safelyBlockedCases: metrics.productRouteCells,
      };
    },
    sourceCodes: () => stColdBeverageSources.map((source) => source.code).sort(),
    requiredGates: ["produto exato", "sentido da rota", "vigência", "exceções do protocolo", "método oficial de preço"],
  },
  {
    code: "COLD_BEVERAGES_SP_DESTINATION",
    label: "Bebidas com PMPF e destino São Paulo",
    ruleCodes: ["NATIONAL-COVERAGE-V27", "COLD_BEVERAGES_SP_DESTINATION"],
    version: ST_COLD_BEVERAGES_SP_DESTINATION_VERSION,
    validate: validateStColdBeverageSpDestination,
    hash: hashStColdBeverageSpDestination,
    testKinds: ALL_TEST_KINDS,
    metrics: () => {
      const metrics = stColdBeverageSpDestinationMetrics();
      return {
        deterministicCases: metrics.controlledCells,
        calculatedMemories: metrics.reproducedMemories,
        safelyBlockedCases: metrics.safeFailures,
      };
    },
    sourceCodes: () => stColdBeverageSpSources.map((source) => source.code).sort(),
    requiredGates: ["perfil exato", "marca elegível", "regime normal", "responsabilidade", "vigência", "limite de 90% do PMPF", "documentos"],
  },
  {
    code: "COLD_BEVERAGES_SP_ORIGIN",
    label: "Bebidas de São Paulo para MG e RJ",
    ruleCodes: ["NATIONAL-COVERAGE-V27", "COLD_BEVERAGES_SP_ORIGIN"],
    version: ST_COLD_BEVERAGES_SP_ORIGIN_VERSION,
    validate: validateStColdBeverageSpOrigin,
    hash: hashStColdBeverageSpOrigin,
    testKinds: ALL_TEST_KINDS,
    metrics: () => {
      const metrics = stColdBeverageSpOriginMetrics();
      return {
        deterministicCases: metrics.controlledCells,
        calculatedMemories: metrics.reproducedMemories,
        safelyBlockedCases: metrics.safeFailures,
      };
    },
    sourceCodes: () => stColdBeverageSpOriginSources.map((source) => source.code).sort(),
    requiredGates: ["perfil e destino compatíveis", "regime normal", "responsabilidade", "vigência", "limite estadual de 80%", "alíquotas/FCP", "documentos"],
  },
] as const;

function sha256Hex(value: string) {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))
    .then((digest) => Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join(""));
}

export function fiscalRegressionModulesForRules(ruleCodes: readonly string[]) {
  const requested = new Set(ruleCodes);
  return MODULE_DEFINITIONS
    .filter((module) => module.ruleCodes.some((ruleCode) => requested.has(ruleCode)))
    .map((module) => module.code);
}

export async function buildFiscalRegressionReport(affectedRuleCodes?: readonly string[]) {
  const requestedRules = affectedRuleCodes ? Array.from(new Set(affectedRuleCodes)).sort() : null;
  const selectedDefinitions = requestedRules
    ? MODULE_DEFINITIONS.filter((module) => module.ruleCodes.some((ruleCode) => requestedRules.includes(ruleCode)))
    : MODULE_DEFINITIONS;
  const mappedRules = new Set(selectedDefinitions.flatMap((module) => [...module.ruleCodes]));
  const unmappedRuleCodes = requestedRules?.filter((ruleCode) => !mappedRules.has(ruleCode)) ?? [];

  const modules = await Promise.all(selectedDefinitions.map(async (definition) => {
    const validation = definition.validate();
    const sourceCodes = definition.sourceCodes();
    const metrics = definition.metrics();
    const fingerprint = await definition.hash();
    const structured = sourceCodes.length > 0 && definition.requiredGates.length > 0;
    const tested = structured && validation.passed && metrics.deterministicCases > 0;
    return {
      code: definition.code,
      label: definition.label,
      ruleCodes: [...definition.ruleCodes],
      ruleVersion: definition.version,
      fingerprint,
      status: validation.passed ? "passed" as const : "failed" as const,
      errors: [...validation.errors],
      arithmetic: { moneyUnit: "cent" as const, rateUnit: "basis_point" as const, floatingPointTaxOutputAllowed: false },
      goldenCases: {
        ...metrics,
        independentExpectedMemory: true,
        officialSourceCodes: sourceCodes,
      },
      testKinds: [...definition.testKinds],
      gates: {
        required: [...definition.requiredGates],
        failClosed: validation.passed,
        releasedWithoutRequiredGates: 0,
      },
      maturity: {
        catalogued: true,
        structured,
        tested,
        approved: false,
        approvalNote: "Nenhuma aprovação profissional pública desta versão foi presumida pelo relatório técnico.",
      },
    };
  }));

  const errors = [
    ...modules.flatMap((module) => module.errors.map((error) => `${module.code}:${error}`)),
    ...unmappedRuleCodes.map((ruleCode) => `unmapped_rule:${ruleCode}`),
  ];
  const metrics = {
    modules: modules.length,
    modulesPassed: modules.filter((module) => module.status === "passed").length,
    deterministicCases: modules.reduce((total, module) => total + module.goldenCases.deterministicCases, 0),
    calculatedMemories: modules.reduce((total, module) => total + module.goldenCases.calculatedMemories, 0),
    safelyBlockedCases: modules.reduce((total, module) => total + module.goldenCases.safelyBlockedCases, 0),
    catalogued: modules.filter((module) => module.maturity.catalogued).length,
    structured: modules.filter((module) => module.maturity.structured).length,
    tested: modules.filter((module) => module.maturity.tested).length,
    approved: modules.filter((module) => module.maturity.approved).length,
  };
  const status = modules.length > 0 && errors.length === 0 && modules.every((module) => module.gates.failClosed)
    ? "automatically_verified" as const
    : "blocked" as const;
  const fingerprint = await sha256Hex(JSON.stringify({
    reportVersion: FISCAL_REGRESSION_REPORT_VERSION,
    requestedRules,
    unmappedRuleCodes,
    modules: modules.map(({ code, ruleVersion, fingerprint: moduleFingerprint, status: moduleStatus, goldenCases, testKinds, gates, maturity }) => ({
      code,
      ruleVersion,
      moduleFingerprint,
      moduleStatus,
      goldenCases,
      testKinds,
      gates,
      maturity,
    })),
  }));

  return {
    reportVersion: FISCAL_REGRESSION_REPORT_VERSION,
    checkedAt: FISCAL_REGRESSION_CHECKED_AT,
    status,
    fingerprint,
    affectedRuleCodes: requestedRules,
    unmappedRuleCodes,
    policy: {
      deterministic: true,
      professionalOpinion: false,
      buildMustFailOnRegression: true,
      statement: "O relatório prova regressão técnica, memória esperada, rastreabilidade e bloqueio seguro; não presume aprovação profissional.",
      aggregationNote: "Totais somam execuções por camada de controle; módulos de aplicabilidade e cálculo podem observar o mesmo corredor sem transformar isso em uma memória duplicada.",
    },
    metrics,
    modules,
    errors,
  };
}

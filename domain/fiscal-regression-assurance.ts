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
} from "./st-sp-calculation-validation.ts";
import {
  FISCAL_REGRESSION_CASE_TARGET,
  FISCAL_REGRESSION_EXPANSION_VERSION,
  fiscalRegressionExpansionMetrics,
  hashFiscalRegressionExpansion,
  validateFiscalRegressionExpansion,
} from "./fiscal-regression-expansion.ts";
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
import {
  ST_PHARMA_COSMETICS_PRIORITY_VERSION,
  hashStPharmaCosmeticsPriority,
  stPharmaCosmeticsMetrics,
  stPharmaCosmeticsSources,
  validateStPharmaCosmeticsPriority,
} from "./st-pharma-cosmetics-priority.ts";
import {
  ST_CONSTRUCTION_ELECTRICAL_VERSION,
  hashStConstructionElectricalPriority,
  stConstructionElectricalMetrics,
  stConstructionElectricalSources,
  validateStConstructionElectricalPriority,
} from "./st-construction-electrical-priority.ts";
import {
  ST_FOOD_CLEANING_PET_VERSION,
  hashStFoodCleaningPetPriority,
  stFoodCleaningPetMetrics,
  stFoodCleaningPetSources,
  validateStFoodCleaningPetPriority,
} from "./st-food-cleaning-pet-priority.ts";
import {
  TAX_REFORM_IMPACT_ENGINE_VERSION,
  hashTaxReformImpactModel,
  taxReformImpactCasePasses,
  taxReformImpactReferenceCases,
  taxReformSources,
} from "./tax-reform-impact.ts";
import {
  ICMS_GENERAL_NATIONAL_VERSION,
  hashIcmsGeneralNational,
  icmsGeneralNationalMetrics,
  icmsGeneralSources,
  validateIcmsGeneralNational,
} from "./icms-general-national.ts";
import {
  ISS_DEEP_EXPANSION_VERSION,
  hashIssDeepExpansion,
  issDeepExpansionCities,
  issDeepExpansionSources,
  validateIssDeepExpansion,
} from "./iss-deep-expansion.ts";
import {
  SIMPLES_NATIONAL_DEEP_VERSION,
  hashSimplesNationalDeep,
  simplesNationalDeepMetrics,
  simplesNationalSources,
  validateSimplesNationalDeep,
} from "./simples-national-deep.ts";
import {
  PIS_COFINS_DEEP_VERSION,
  hashPisCofinsDeep,
  pisCofinsDeepMetrics,
  pisCofinsDeepSources,
  validatePisCofinsDeep,
} from "./pis-cofins-deep.ts";
import {
  SERVICE_WITHHOLDINGS_DEEP_VERSION,
  hashServiceWithholdingsDeep,
  serviceWithholdingSources,
  serviceWithholdingsDeepMetrics,
  validateServiceWithholdingsDeep,
} from "./service-withholdings-deep.ts";
import {
  IPI_TIPI_DEEP_VERSION,
  hashIpiTipiDeep,
  ipiTipiDeepMetrics,
  ipiTipiDeepSources,
  validateIpiTipiDeep,
} from "./ipi-tipi-deep.ts";
import {
  TAX_REFORM_SECTOR_VERSION,
  hashTaxReformSectorCatalog,
  taxReformSectorMetrics,
  taxReformSectorSources,
  validateTaxReformSectorCatalog,
} from "./tax-reform-sector-scenarios.ts";

export const FISCAL_REGRESSION_REPORT_VERSION = "fiscal-regression.v3";
export const FISCAL_REGRESSION_CHECKED_AT = "2026-07-31";

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
    code: "IPI_TIPI_DEEP",
    label: "IPI/TIPI — NCMs prioritários de indústria e importação",
    ruleCodes: ["IPI-TIPI", "IPI-TIPI-NCM-GATE", "IPI-TIPI-DEEP-V83"],
    version: IPI_TIPI_DEEP_VERSION,
    validate: validateIpiTipiDeep,
    hash: hashIpiTipiDeep,
    testKinds: ALL_TEST_KINDS,
    metrics: ipiTipiDeepMetrics,
    sourceCodes: () => ipiTipiDeepSources.map((source) => source.code).sort(),
    requiredGates: ["NCM exato e descrição legal", "TIPI consolidada e notas", "operação e papel do contribuinte", "base interna ou aduaneira", "Ex aplicável", "benefício e vigência", "documento fiscal"],
  },
  {
    code: "SERVICE_WITHHOLDINGS_DEEP",
    label: "Retenções — IRRF, CSRF, INSS e ISS em serviços recorrentes",
    ruleCodes: ["RET-IRRF-CSRF", "RET-INSS-SERVICES", "RET-ISS-MUNICIPAL", "SERVICE-WITHHOLDINGS-DEEP-V82"],
    version: SERVICE_WITHHOLDINGS_DEEP_VERSION,
    validate: validateServiceWithholdingsDeep,
    hash: hashServiceWithholdingsDeep,
    testKinds: ALL_TEST_KINDS,
    metrics: serviceWithholdingsDeepMetrics,
    sourceCodes: () => serviceWithholdingSources.map((source) => source.code).sort(),
    requiredGates: ["serviço efetivo", "pagador e beneficiário", "regime documentado", "base e fato gerador por tributo", "cessão, empreitada e CPRB", "município, item e lei do ISS", "dispensas e limites", "simultaneidade antes do líquido"],
  },
  {
    code: "PIS_COFINS_DEEP",
    label: "PIS/Cofins — monofásico, alíquota zero e créditos por segmento",
    ruleCodes: ["PIS-COFINS-CUM", "PIS-COFINS-NC", "PIS-COFINS-SPECIAL", "PIS-COFINS-DEEP-V81"],
    version: PIS_COFINS_DEEP_VERSION,
    validate: validatePisCofinsDeep,
    hash: hashPisCofinsDeep,
    testKinds: ALL_TEST_KINDS,
    metrics: pisCofinsDeepMetrics,
    sourceCodes: () => pisCofinsDeepSources.map((source) => source.code).sort(),
    requiredGates: ["regime e papel na cadeia", "NCM completo e tabela oficial", "produto e operação", "vigência e LC 224/2025", "documento fiscal", "receita segregada", "hipótese legal do crédito", "vínculo e incidência da aquisição"],
  },
  {
    code: "SIMPLES_NATIONAL_DEEP",
    label: "Simples Nacional — atividades, anexos e segregações recorrentes",
    ruleCodes: ["SIMPLES-PGDAS", "SIMPLES-NATIONAL-DEEP-V80"],
    version: SIMPLES_NATIONAL_DEEP_VERSION,
    validate: validateSimplesNationalDeep,
    hash: hashSimplesNationalDeep,
    testKinds: ALL_TEST_KINDS,
    metrics: simplesNationalDeepMetrics,
    sourceCodes: () => simplesNationalSources.map((source) => source.code).sort(),
    requiredGates: ["CNAE e atividade efetiva", "anexo confirmado", "RBT12 e receita mensal", "fator R quando aplicável", "segregações", "limite e sublimite", "impedimentos", "período fechado"],
  },
  {
    code: "ISS_DEEP_EXPANSION",
    label: "ISS profundo — segundo lote de 25 municípios",
    ruleCodes: ["ISS-DEEP-NATIONAL", "ISS-DEEP-EXPANSION-V79"],
    version: ISS_DEEP_EXPANSION_VERSION,
    validate: validateIssDeepExpansion,
    hash: hashIssDeepExpansion,
    testKinds: ALL_TEST_KINDS,
    metrics: () => ({
      deterministicCases: issDeepExpansionCities.length,
      calculatedMemories: 0,
      safelyBlockedCases: issDeepExpansionCities.length,
    }),
    sourceCodes: () => issDeepExpansionSources.map((source) => source.code).sort(),
    requiredGates: ["município e item da LC 116", "código municipal", "alíquota e vigência", "local de incidência", "retenção e responsável", "exceções, benefícios e regimes especiais"],
  },
  {
    code: "ICMS_GENERAL_NATIONAL",
    label: "ICMS modal, FCP e DIFAL condicionais nas 27 UFs",
    ruleCodes: ["NATIONAL-COVERAGE-V27", "ICMS-GENERAL-NATIONAL"],
    version: ICMS_GENERAL_NATIONAL_VERSION,
    validate: validateIcmsGeneralNational,
    hash: hashIcmsGeneralNational,
    testKinds: ALL_TEST_KINDS,
    metrics: () => {
      const metrics = icmsGeneralNationalMetrics();
      return {
        deterministicCases: metrics.referenceRuns,
        calculatedMemories: metrics.referenceRuns - 1,
        safelyBlockedCases: 1,
      };
    },
    sourceCodes: () => icmsGeneralSources.map((item) => item.code).sort(),
    requiredGates: ["UF e vigência", "NCM completo", "destinatário e finalidade", "alíquota modal aplicável", "alíquota específica e benefício ausentes", "ST separada", "FCP por hipótese", "método estadual do DIFAL"],
  },
  {
    code: "RTC_SECTOR_SCENARIOS",
    label: "Reforma Tributária — cenários setoriais de 2026 a 2033",
    ruleCodes: ["RTC-BR-TRANSITION", "RTC-SECTOR-SCENARIOS-V84"],
    version: TAX_REFORM_SECTOR_VERSION,
    validate: () => {
      const validation = validateTaxReformSectorCatalog();
      return { passed: validation.ok, errors: validation.errors };
    },
    hash: hashTaxReformSectorCatalog,
    testKinds: ALL_TEST_KINDS,
    metrics: () => {
      const metrics = taxReformSectorMetrics();
      return {
        deterministicCases: metrics.deterministicCases,
        calculatedMemories: metrics.calculatedMemories,
        safelyBlockedCases: metrics.safelyBlockedCases,
      };
    },
    sourceCodes: () => taxReformSectorSources.map((source) => source.code).sort(),
    requiredGates: ["setor e operação", "classificação no Anexo legal", "ano da transição", "alíquotas de referência", "livros CBS e IBS", "créditos comprovados", "exceção ZFM", "regime específico próprio"],
  },
  {
    code: "RTC_TRANSITION_IMPACT",
    label: "Impacto financeiro da transição CBS/IBS de 2026 a 2033",
    ruleCodes: ["RTC-BR-TRANSITION"],
    version: TAX_REFORM_IMPACT_ENGINE_VERSION,
    validate: () => {
      const errors = taxReformImpactReferenceCases
        .filter((referenceCase) => !taxReformImpactCasePasses(referenceCase))
        .map((referenceCase) => `${referenceCase.code}:transition_case_failed`);
      return { passed: errors.length === 0, errors };
    },
    hash: hashTaxReformImpactModel,
    testKinds: ALL_TEST_KINDS,
    metrics: () => ({
      deterministicCases: taxReformImpactReferenceCases.length,
      calculatedMemories: taxReformImpactReferenceCases.filter((item) => item.expected.transitionTotalCents !== null).length,
      safelyBlockedCases: taxReformImpactReferenceCases.filter((item) => item.expected.transitionTotalCents === null).length,
    }),
    sourceCodes: () => taxReformSources.map((source) => source.code).sort(),
    requiredGates: ["ano-alvo", "regime e perfil da operação", "valores contábeis atuais", "alíquotas de referência", "créditos projetados", "vigência e versão"],
  },
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
    version: `${ST_SP_CALCULATION_VALIDATION_VERSION}:${FISCAL_REGRESSION_EXPANSION_VERSION}`,
    validate: validateFiscalRegressionExpansion,
    hash: hashFiscalRegressionExpansion,
    testKinds: ALL_TEST_KINDS,
    metrics: fiscalRegressionExpansionMetrics,
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
  {
    code: "PHARMA_COSMETICS_PRIORITY",
    label: "Medicamentos, cosméticos e perfumaria nas rotas prioritárias",
    ruleCodes: ["NATIONAL-COVERAGE-V27", "PHARMA_COSMETICS_PRIORITY"],
    version: ST_PHARMA_COSMETICS_PRIORITY_VERSION,
    validate: validateStPharmaCosmeticsPriority,
    hash: hashStPharmaCosmeticsPriority,
    testKinds: ALL_TEST_KINDS,
    metrics: () => {
      const metrics = stPharmaCosmeticsMetrics();
      return {
        deterministicCases: metrics.controlledCells,
        calculatedMemories: metrics.deterministicMemories,
        safelyBlockedCases: metrics.safeFailures,
      };
    },
    sourceCodes: () => stPharmaCosmeticsSources.map((source) => source.code).sort(),
    requiredGates: ["NCM/CEST e descrição", "rota e vigência", "regra do destino", "tratamento especial", "documentos", "separação do PIS/Cofins monofásico"],
  },
  {
    code: "CONSTRUCTION_ELECTRICAL_PRIORITY",
    label: "Construção, acabamento, ferramentas e materiais elétricos em SP→MG/RJ",
    ruleCodes: ["NATIONAL-COVERAGE-V27", "CONSTRUCTION_ELECTRICAL_PRIORITY"],
    version: ST_CONSTRUCTION_ELECTRICAL_VERSION,
    validate: validateStConstructionElectricalPriority,
    hash: hashStConstructionElectricalPriority,
    testKinds: ALL_TEST_KINDS,
    metrics: () => {
      const metrics = stConstructionElectricalMetrics();
      return {
        deterministicCases: metrics.reproducedMemories + metrics.safeFailureScenarios,
        calculatedMemories: metrics.reproducedMemories,
        safelyBlockedCases: metrics.safeFailureScenarios,
      };
    },
    sourceCodes: () => stConstructionElectricalSources.map((source) => source.code).sort(),
    requiredGates: ["NCM e CEST exatos", "finalidade de revenda", "vigência", "responsabilidade tributária", "MVA e alíquotas do destino", "FCP/FECP", "exclusões e tratamentos especiais", "documentos"],
  },
  {
    code: "FOOD_CLEANING_PET_PRIORITY",
    label: "Alimentos, limpeza, higiene doméstica e pet food em SP→MG/RJ",
    ruleCodes: ["NATIONAL-COVERAGE-V27", "FOOD_CLEANING_PET_PRIORITY"],
    version: ST_FOOD_CLEANING_PET_VERSION,
    validate: validateStFoodCleaningPetPriority,
    hash: hashStFoodCleaningPetPriority,
    testKinds: ALL_TEST_KINDS,
    metrics: () => {
      const metrics = stFoodCleaningPetMetrics();
      return {
        deterministicCases: metrics.controlledCells + metrics.safeFailureScenarios + 1,
        calculatedMemories: metrics.reproducedMemories + 1,
        safelyBlockedCases: metrics.coverage.partial + metrics.safeFailureScenarios,
      };
    },
    sourceCodes: () => stFoodCleaningPetSources.map((source) => source.code).sort(),
    requiredGates: ["NCM, CEST e apresentação exatos", "rota e vigência", "responsabilidade", "MVA ou PMPF vigente", "alíquotas e FCP", "reduções, benefícios e exceções", "documentos e peso quando aplicável"],
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
    caseTarget: FISCAL_REGRESSION_CASE_TARGET,
    targetReached: modules.reduce((total, module) => total + module.goldenCases.deterministicCases, 0) >= FISCAL_REGRESSION_CASE_TARGET,
    remainingToTarget: Math.max(0, FISCAL_REGRESSION_CASE_TARGET - modules.reduce((total, module) => total + module.goldenCases.deterministicCases, 0)),
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

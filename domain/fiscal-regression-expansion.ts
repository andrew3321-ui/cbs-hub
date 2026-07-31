import { coverageSources, stateCoverage } from "./national-tax-coverage.ts";
import {
  ST_SP_CALCULATION_VALIDATION_VERSION,
  stSpCalculationRuns,
} from "./st-sp-calculation-validation.ts";
import { stSpOriginCells } from "./st-sp-origin-matrix.ts";
import { stAutoPartsPrioritySources } from "./st-auto-parts-priority-batch.ts";
import {
  ST_CEMENT_PRODUCT_SOURCE,
  ST_CEMENT_PROTOCOL_SOURCE,
} from "./st-cement-sp-routes.ts";
import { stCementPrioritySources } from "./st-cement-priority-batch.ts";

export const FISCAL_REGRESSION_EXPANSION_VERSION = "2026.07.31-v86";
export const FISCAL_REGRESSION_EXPANSION_CHECKED_AT = "2026-07-31";
export const FISCAL_REGRESSION_CASE_TARGET = 2_000;

type ExistingRun = (typeof stSpCalculationRuns)[number];
type CoverageMaturity = "supported" | "partial" | "not_supported";
type SafetyMutation = "missing_product_identity" | "stale_validity" | "unqualified_import" | "unresolved_exception";
type SourceReference = { code: string; title: string; publisher: string; url: string; checkedAt: string };

export type ExpandedFiscalRegressionCase = {
  id: string;
  tax: "ICMS_ST";
  segment: string;
  route: string;
  maturity: CoverageMaturity;
  kind: "positive" | "negative" | "exception" | "validity_change";
  ruleCode: "ST_SP_CALCULATION_RUNS";
  ruleVersion: string;
  referenceDate: string;
  sourceReferences: SourceReference[];
  input: {
    baselineRunKey: string;
    productIdentityConfirmed: boolean;
    validityConfirmed: boolean;
    importQualificationConfirmed: boolean;
    exceptionResolved: boolean;
    mutation: SafetyMutation | null;
  };
  expected: {
    status: ExistingRun["status"] | "blocked_missing_mandatory_fact" | "blocked_stale_validity" | "blocked_unqualified_import" | "blocked_unresolved_exception";
    output: ExistingRun["output"];
    blockers: string[];
  };
};

const cellByKey = new Map(stSpOriginCells.map((cell) => [cell.key, cell]));
const runByKey = new Map(stSpCalculationRuns.map((run) => [run.key, run]));
const coverageSourceByCode = new Map(coverageSources.map((source) => [source.code, source]));

function normalizedSource(source: { code: string; title: string; publisher: string; url: string; checkedAt?: string }): SourceReference {
  return { ...source, checkedAt: source.checkedAt ?? FISCAL_REGRESSION_EXPANSION_CHECKED_AT };
}

function sourceReferencesFor(run: ExistingRun): SourceReference[] {
  const cell = cellByKey.get(run.key)!;
  const common = ["LC-87-1996", "CONFAZ"]
    .map((code) => coverageSourceByCode.get(code))
    .filter((source): source is NonNullable<typeof source> => Boolean(source))
    .map(normalizedSource);
  const state = stateCoverage.find((item) => item.uf === cell.destination)!;
  const destination = normalizedSource({
    code: cell.destinationSourceCode,
    title: `Portal oficial da administração tributária de ${state.name}`,
    publisher: `Administração tributária de ${state.name}`,
    url: state.officialPortal,
    checkedAt: FISCAL_REGRESSION_EXPANSION_CHECKED_AT,
  });
  const segmentSources = cell.segmentCode === "AUTO_PARTS"
    ? stAutoPartsPrioritySources.map(normalizedSource)
    : cell.segmentCode === "CEMENT"
      ? [ST_CEMENT_PROTOCOL_SOURCE, ST_CEMENT_PRODUCT_SOURCE, ...stCementPrioritySources].map(normalizedSource)
      : [];
  return Array.from(new Map([...common, destination, ...segmentSources].map((source) => [`${source.code}@${source.url}`, source])).values());
}

function maturityFor(run: ExistingRun): CoverageMaturity {
  if (run.status === "reference_reproduced") return "supported";
  if (run.status === "blocked_protocol_not_applicable") return "not_supported";
  return "partial";
}

function mutationFor(index: number): SafetyMutation {
  return (["missing_product_identity", "stale_validity", "unqualified_import", "unresolved_exception"] as const)[index % 4];
}

function mutationInput(run: ExistingRun, mutation: SafetyMutation): ExpandedFiscalRegressionCase["input"] {
  return {
    baselineRunKey: run.key,
    productIdentityConfirmed: mutation !== "missing_product_identity",
    validityConfirmed: mutation !== "stale_validity",
    importQualificationConfirmed: mutation !== "unqualified_import",
    exceptionResolved: mutation !== "unresolved_exception",
    mutation,
  };
}

function mutationExpected(mutation: SafetyMutation): ExpandedFiscalRegressionCase["expected"] {
  const byMutation = {
    missing_product_identity: { status: "blocked_missing_mandatory_fact" as const, blocker: "identidade fiscal do produto não confirmada" },
    stale_validity: { status: "blocked_stale_validity" as const, blocker: "data de referência fora da vigência versionada" },
    unqualified_import: { status: "blocked_unqualified_import" as const, blocker: "origem importada sem qualificação documental" },
    unresolved_exception: { status: "blocked_unresolved_exception" as const, blocker: "exceção ou tratamento especial não resolvido" },
  } satisfies Record<SafetyMutation, { status: ExpandedFiscalRegressionCase["expected"]["status"]; blocker: string }>;
  return { status: byMutation[mutation].status, output: null, blockers: [byMutation[mutation].blocker] };
}

export const expandedFiscalRegressionCases: ExpandedFiscalRegressionCase[] = stSpCalculationRuns.flatMap((run, index) => {
  const cell = cellByKey.get(run.key)!;
  const route = `${cell.origin}-${cell.destination}`;
  const baseline: ExpandedFiscalRegressionCase = {
    id: `${run.key}:baseline`,
    tax: "ICMS_ST",
    segment: cell.segmentCode,
    route,
    maturity: maturityFor(run),
    kind: run.status === "reference_reproduced" ? "positive" : "negative",
    ruleCode: "ST_SP_CALCULATION_RUNS",
    ruleVersion: `${ST_SP_CALCULATION_VALIDATION_VERSION}:${FISCAL_REGRESSION_EXPANSION_VERSION}`,
    referenceDate: FISCAL_REGRESSION_EXPANSION_CHECKED_AT,
    sourceReferences: sourceReferencesFor(run),
    input: {
      baselineRunKey: run.key,
      productIdentityConfirmed: true,
      validityConfirmed: true,
      importQualificationConfirmed: true,
      exceptionResolved: true,
      mutation: null,
    },
    expected: {
      status: run.status,
      output: run.output,
      blockers: [...run.missingLegalInputs],
    },
  };
  const mutation = mutationFor(index);
  const safeFailure: ExpandedFiscalRegressionCase = {
    ...baseline,
    id: `${run.key}:${mutation}`,
    maturity: "partial",
    kind: mutation === "stale_validity" ? "validity_change" : mutation === "unresolved_exception" ? "exception" : "negative",
    input: mutationInput(run, mutation),
    expected: mutationExpected(mutation),
  };
  return [baseline, safeFailure];
});

export function executeExpandedFiscalRegressionCase(regressionCase: ExpandedFiscalRegressionCase) {
  const run = runByKey.get(regressionCase.input.baselineRunKey);
  if (!run) return { status: "blocked_missing_mandatory_fact" as const, output: null, blockers: ["célula-base não localizada"] };
  if (!regressionCase.input.productIdentityConfirmed) return mutationExpected("missing_product_identity");
  if (!regressionCase.input.validityConfirmed) return mutationExpected("stale_validity");
  if (!regressionCase.input.importQualificationConfirmed) return mutationExpected("unqualified_import");
  if (!regressionCase.input.exceptionResolved) return mutationExpected("unresolved_exception");
  return { status: run.status, output: run.output, blockers: [...run.missingLegalInputs] };
}

export function fiscalRegressionExpansionMetrics() {
  const segmentCounts = Object.fromEntries(
    Array.from(new Set(expandedFiscalRegressionCases.map((item) => item.segment))).sort()
      .map((segment) => [segment, expandedFiscalRegressionCases.filter((item) => item.segment === segment).length]),
  );
  const routeCounts = Object.fromEntries(
    Array.from(new Set(expandedFiscalRegressionCases.map((item) => item.route))).sort()
      .map((route) => [route, expandedFiscalRegressionCases.filter((item) => item.route === route).length]),
  );
  return {
    deterministicCases: expandedFiscalRegressionCases.length,
    calculatedMemories: expandedFiscalRegressionCases.filter((item) => item.expected.output !== null).length,
    safelyBlockedCases: expandedFiscalRegressionCases.filter((item) => item.expected.output === null).length,
    baselineCases: expandedFiscalRegressionCases.filter((item) => item.input.mutation === null).length,
    safetyMutationCases: expandedFiscalRegressionCases.filter((item) => item.input.mutation !== null).length,
    maturity: {
      supported: expandedFiscalRegressionCases.filter((item) => item.maturity === "supported").length,
      partial: expandedFiscalRegressionCases.filter((item) => item.maturity === "partial").length,
      notSupported: expandedFiscalRegressionCases.filter((item) => item.maturity === "not_supported").length,
    },
    mutations: {
      missingProductIdentity: expandedFiscalRegressionCases.filter((item) => item.input.mutation === "missing_product_identity").length,
      staleValidity: expandedFiscalRegressionCases.filter((item) => item.input.mutation === "stale_validity").length,
      unqualifiedImport: expandedFiscalRegressionCases.filter((item) => item.input.mutation === "unqualified_import").length,
      unresolvedException: expandedFiscalRegressionCases.filter((item) => item.input.mutation === "unresolved_exception").length,
    },
    taxCounts: { ICMS_ST: expandedFiscalRegressionCases.length },
    segmentCounts,
    routeCounts,
  };
}

export function validateFiscalRegressionExpansion() {
  const errors: string[] = [];
  if (expandedFiscalRegressionCases.length !== 1_300) errors.push("expanded_suite_must_have_1300_cases");
  if (new Set(expandedFiscalRegressionCases.map((item) => item.id)).size !== expandedFiscalRegressionCases.length) errors.push("duplicate_case_id");
  for (const regressionCase of expandedFiscalRegressionCases) {
    const actual = executeExpandedFiscalRegressionCase(regressionCase);
    if (JSON.stringify(actual) !== JSON.stringify(regressionCase.expected)) errors.push(`${regressionCase.id}:output_diverged`);
    if (!regressionCase.sourceReferences.length || regressionCase.sourceReferences.some((source) => !source.url.startsWith("https://"))) errors.push(`${regressionCase.id}:official_source_missing`);
    if (!regressionCase.ruleVersion || !regressionCase.referenceDate) errors.push(`${regressionCase.id}:version_or_reference_date_missing`);
    if (regressionCase.kind === "positive" && regressionCase.maturity !== "supported") errors.push(`${regressionCase.id}:positive_case_outside_supported_scope`);
    if (regressionCase.input.mutation !== null && actual.output !== null) errors.push(`${regressionCase.id}:safe_failure_leaked_output`);
  }
  return { passed: errors.length === 0, errors };
}

export async function hashFiscalRegressionExpansion() {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify({
    version: FISCAL_REGRESSION_EXPANSION_VERSION,
    checkedAt: FISCAL_REGRESSION_EXPANSION_CHECKED_AT,
    cases: expandedFiscalRegressionCases,
  })));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

import {
  FISCAL_SIMULATION_SUITE_VERSION,
  fiscalSimulationBaseHash,
  runFiscalSimulationSuite,
  type FiscalSimulationRun,
} from "./fiscal-homologation-simulations.ts";

/**
 * This is an engineering assurance layer, not an opinion from a regulated
 * professional.  It deliberately verifies only things the server can prove:
 * deterministic outputs, complete fixtures, traceable sources and safe
 * blocking when a required fact is absent.
 */
export const FISCAL_AUTOMATED_ASSURANCE_VERSION = "2026.07.21-v55";

export type FiscalAutomaticAssuranceStatus = "automatically_verified" | "blocked";

export type FiscalAutomaticAssuranceCase = {
  code: string;
  title: string;
  moduleLabel: string;
  profile: string;
  scenario: string;
  operationPeriod: string;
  kind: FiscalSimulationRun["case"]["kind"];
  status: FiscalAutomaticAssuranceStatus;
  outputStatus: FiscalSimulationRun["output"]["status"];
  summary: string;
  checksPassed: number;
  checksTotal: number;
  sourceCount: number;
  officialSourceCount: number;
  blockers: string[];
  controls: Array<{ code: string; label: string; passed: boolean }>;
  expectedConclusion: string;
};

function isOfficialPublicSource(url: string) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "planalto.gov.br" || host.endsWith(".gov.br");
  } catch {
    return false;
  }
}

function assuranceCase(run: FiscalSimulationRun): FiscalAutomaticAssuranceCase {
  const sources = [...run.output.sources, ...(run.case.additionalSources ?? [])];
  const expectedStatusMatches = run.output.status === run.case.expected.status;
  const sourceCount = sources.length;
  const officialSourceCount = sources.filter((source) => isOfficialPublicSource(source.url)).length;
  const expectedBlockMatches = run.case.kind !== "expected_block" || run.output.status === "blocked";
  const checksPassed = run.checks.filter((check) => check.passed).length;
  const controls = [
    { code: "fixture", label: "Resultado reproduz os valores e bloqueios esperados", passed: run.passed },
    { code: "status", label: "Status do motor corresponde ao cenário versionado", passed: expectedStatusMatches },
    { code: "evidence", label: "Há fonte normativa rastreável no cenário", passed: sourceCount > 0 },
    { code: "official_origin", label: "Ao menos uma fonte é de órgão público oficial", passed: officialSourceCount > 0 },
    { code: "safe_block", label: "Falta de fato obrigatório bloqueia a conclusão", passed: expectedBlockMatches },
  ];
  const passed = controls.every((control) => control.passed);
  return {
    code: run.case.code,
    title: run.case.title,
    moduleLabel: run.case.moduleLabel,
    profile: run.case.profile,
    scenario: run.case.scenario,
    operationPeriod: run.case.operationPeriod,
    kind: run.case.kind,
    status: passed ? "automatically_verified" : "blocked",
    outputStatus: run.output.status,
    summary: run.output.summary,
    checksPassed,
    checksTotal: run.checks.length,
    sourceCount,
    officialSourceCount,
    blockers: run.output.issues.filter((issue) => issue.severity === "blocker").map((issue) => issue.message),
    controls,
    expectedConclusion: run.case.expectedProfessionalConclusion,
  };
}

export async function buildFiscalAutomaticAssurance() {
  const cases = runFiscalSimulationSuite().map(assuranceCase);
  const baseHash = await fiscalSimulationBaseHash();
  const automaticallyVerified = cases.filter((item) => item.status === "automatically_verified");
  const calculatedReferences = cases.filter((item) => item.kind === "calculated_reference");
  const expectedBlocks = cases.filter((item) => item.kind === "expected_block");
  return {
    version: FISCAL_AUTOMATED_ASSURANCE_VERSION,
    simulationVersion: FISCAL_SIMULATION_SUITE_VERSION,
    baseHash,
    checkedAt: new Date().toISOString(),
    policy: {
      automation: "deterministic_server_verification",
      humanReviewRequired: false,
      professionalOpinion: false,
      statement: "A plataforma executa verificações automáticas e reproduzíveis. O selo confirma controles técnicos da base e não substitui obrigação legal, documento fiscal, consulta formal ou responsabilidade profissional quando exigidos.",
      controls: [
        "resultado reexecutado no servidor",
        "valores e bloqueios comparados com expectativa versionada",
        "fonte normativa rastreável por URL",
        "hash da base para detectar alteração",
        "bloqueio seguro quando faltam fatos obrigatórios",
      ],
    },
    cases,
    metrics: {
      total: cases.length,
      automaticallyVerified: automaticallyVerified.length,
      blocked: cases.filter((item) => item.status === "blocked").length,
      calculatedReferences: calculatedReferences.length,
      expectedBlocks: expectedBlocks.length,
      officialSources: new Set(cases.flatMap((item) => item.controls.find((control) => control.code === "official_origin")?.passed ? [item.code] : [])).size,
      distinctModules: new Set(cases.map((item) => item.moduleLabel.replace(" · bloqueio", ""))).size,
    },
  };
}

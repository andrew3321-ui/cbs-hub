import type { FiscalIntelligenceFacts, FiscalIntelligenceResult, FiscalKnowledgeSource } from "./fiscal-intelligence.ts";
import type { FiscalSimulationCase } from "./fiscal-homologation-simulations.ts";
import { simulationEvidenceSources } from "./fiscal-homologation-simulations.ts";
import type { LabResult } from "./deterministic-tax-lab.ts";

export const FISCAL_HOMOLOGATION_SCHEMA_VERSION = "fiscal-homologation-snapshot.v1";
export const FISCAL_HOMOLOGATION_LAB_SCHEMA_VERSION = "fiscal-homologation-lab-snapshot.v2";
export const FISCAL_HOMOLOGATION_EXPECTED_VERSION = "fiscal-homologation-expected.v1";

export type FiscalIntelligenceHomologationSnapshot = {
  schemaVersion: typeof FISCAL_HOMOLOGATION_SCHEMA_VERSION;
  question: string;
  topicCode: string;
  coverageLevel: FiscalIntelligenceResult["coverageLevel"];
  facts: FiscalIntelligenceFacts;
  engine: {
    status: FiscalIntelligenceResult["status"];
    headline: string;
    summary: string;
    calculationEligible: boolean;
    completeness: FiscalIntelligenceResult["completeness"];
    findings: FiscalIntelligenceResult["findings"];
    decisionTrace: FiscalIntelligenceResult["decisionTrace"];
  };
  evidence: {
    baseCode: string;
    baseVersion: string;
    baseHash: string;
    engineVersion: string;
    sources: FiscalKnowledgeSource[];
  };
  capturedAt: string;
};

export type FiscalLabHomologationSnapshot = {
  schemaVersion: typeof FISCAL_HOMOLOGATION_LAB_SCHEMA_VERSION;
  question: string;
  topicCode: string;
  coverageLevel: "operational_reference";
  facts: FiscalSimulationCase["input"];
  engine: {
    status: LabResult["status"];
    headline: string;
    summary: string;
    calculationEligible: boolean;
    completeness: { known: number; required: number; percentage: number };
    findings: Array<{ code: string; label: string; value: string; detail: string; sourceCodes: string[]; nature: "regression_output" }>;
    decisionTrace: Array<{ ruleCode: string; result: "applied" | "blocked"; detail: string }>;
  };
  evidence: {
    baseCode: string;
    baseVersion: string;
    baseHash: string;
    engineVersion: string;
    sources: Array<{ code: string; title: string; publisher: string; url: string; checkedAt: string }>;
  };
  simulation: {
    code: string;
    profile: string;
    scenario: string;
    operationPeriod: string;
    synthetic: true;
    expectedProfessionalConclusion: string;
  };
  capturedAt: string;
};

export type FiscalHomologationSnapshot = FiscalIntelligenceHomologationSnapshot | FiscalLabHomologationSnapshot;

export type FiscalHomologationExpected = {
  schemaVersion: typeof FISCAL_HOMOLOGATION_EXPECTED_VERSION;
  topicCode: string;
  status: FiscalIntelligenceResult["status"] | LabResult["status"];
  calculationEligible: boolean;
  findings: Array<{ code: string; value: string; nature: string }>;
  decisionTrace: Array<{ ruleCode: string; result: string }>;
  sourceCodes: string[];
};

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function hashFiscalHomologationText(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToHex(new Uint8Array(digest));
}

export function fiscalHomologationEligibilityError(result: FiscalIntelligenceResult) {
  if (result.status !== "conditional") return "A consulta ainda não possui uma conclusão condicional reproduzível.";
  if (result.completeness.percentage !== 100 || result.completeness.known !== result.completeness.required) return "Complete todos os fatos mínimos antes de criar o caso.";
  if (result.clarifications.length) return "Resolva todas as pendências antes de criar o caso.";
  if (!result.sources.length) return "O caso precisa ter ao menos uma fonte oficial efetivamente aplicada.";
  if (!result.topicCode || result.topicCode === "TOPIC-ROUTER") return "Escolha um módulo fiscal específico.";
  return null;
}

export function createFiscalHomologationSnapshot(question: string, result: FiscalIntelligenceResult, baseHash: string, capturedAt: string): FiscalIntelligenceHomologationSnapshot {
  const normalizedQuestion = question.trim().replace(/\s+/g, " ");
  if (normalizedQuestion.length < 5 || normalizedQuestion.length > 500) throw new Error("invalid_homologation_question");
  const eligibilityError = fiscalHomologationEligibilityError(result);
  if (eligibilityError) throw new Error(`ineligible_homologation:${eligibilityError}`);
  if (!/^[0-9a-f]{64}$/.test(baseHash)) throw new Error("invalid_homologation_base_hash");
  if (!/^\d{4}-\d{2}-\d{2}T/.test(capturedAt)) throw new Error("invalid_homologation_timestamp");
  return {
    schemaVersion: FISCAL_HOMOLOGATION_SCHEMA_VERSION,
    question: normalizedQuestion,
    topicCode: result.topicCode,
    coverageLevel: result.coverageLevel,
    facts: result.facts,
    engine: {
      status: result.status,
      headline: result.headline,
      summary: result.summary,
      calculationEligible: result.calculationEligible,
      completeness: result.completeness,
      findings: result.findings,
      decisionTrace: result.decisionTrace,
    },
    evidence: {
      baseCode: result.baseCode,
      baseVersion: result.baseVersion,
      baseHash,
      engineVersion: result.engineVersion,
      sources: result.sources,
    },
    capturedAt,
  };
}

function labLineValue(line: LabResult["lines"][number]) {
  const amount = line.amountCents === null ? "indeterminado" : `R$ ${(line.amountCents / 100).toFixed(2)}`;
  return typeof line.rateBps === "number" && line.rateBps > 0 ? `${amount} · ${(line.rateBps / 100).toFixed(2)}%` : amount;
}

export function createFiscalLabHomologationSnapshot(simulation: FiscalSimulationCase, result: LabResult, baseHash: string, capturedAt: string): FiscalLabHomologationSnapshot {
  if (result.module !== simulation.input.module) throw new Error("invalid_homologation_lab_module");
  if (!/^[0-9a-f]{64}$/.test(baseHash)) throw new Error("invalid_homologation_base_hash");
  if (!/^\d{4}-\d{2}-\d{2}T/.test(capturedAt)) throw new Error("invalid_homologation_timestamp");
  const known = result.facts.filter((fact) => fact.confirmed).length;
  const required = result.facts.length;
  const sources = simulationEvidenceSources(simulation, result);
  if (!sources.length || !result.lines.length) throw new Error("invalid_homologation_lab_evidence");
  return {
    schemaVersion: FISCAL_HOMOLOGATION_LAB_SCHEMA_VERSION,
    question: simulation.title,
    topicCode: `LAB-${result.module.toUpperCase()}`,
    coverageLevel: "operational_reference",
    facts: simulation.input,
    engine: {
      status: result.status,
      headline: result.title,
      summary: result.summary,
      calculationEligible: result.status === "calculated_reference",
      completeness: { known, required, percentage: required ? Math.round(known / required * 100) : 100 },
      findings: result.lines.map((line) => ({ code: line.code, label: line.label, value: labLineValue(line), detail: line.formula, sourceCodes: sources.map((source) => source.code), nature: "regression_output" })),
      decisionTrace: result.issues.map((issue) => ({ ruleCode: issue.code, result: issue.severity === "blocker" ? "blocked" : "applied", detail: issue.message })),
    },
    evidence: {
      baseCode: "DETERMINISTIC-TAX-LAB-SIMULATIONS",
      baseVersion: result.engineVersion,
      baseHash,
      engineVersion: result.engineVersion,
      sources,
    },
    simulation: {
      code: simulation.code,
      profile: simulation.profile,
      scenario: simulation.scenario,
      operationPeriod: simulation.operationPeriod,
      synthetic: true,
      expectedProfessionalConclusion: simulation.expectedProfessionalConclusion,
    },
    capturedAt,
  };
}

export function expectedOutcomeFromHomologation(snapshot: FiscalHomologationSnapshot): FiscalHomologationExpected {
  return {
    schemaVersion: FISCAL_HOMOLOGATION_EXPECTED_VERSION,
    topicCode: snapshot.topicCode,
    status: snapshot.engine.status,
    calculationEligible: snapshot.engine.calculationEligible,
    findings: snapshot.engine.findings.map((item) => ({ code: item.code, value: item.value, nature: item.nature })),
    decisionTrace: snapshot.engine.decisionTrace.map((item) => ({ ruleCode: item.ruleCode, result: item.result })),
    sourceCodes: snapshot.evidence.sources.map((source) => source.code).sort(),
  };
}

export function parseFiscalHomologationSnapshot(value: string): FiscalHomologationSnapshot | null {
  try {
    const parsed = JSON.parse(value) as FiscalHomologationSnapshot;
    if (![FISCAL_HOMOLOGATION_SCHEMA_VERSION, FISCAL_HOMOLOGATION_LAB_SCHEMA_VERSION].includes(parsed.schemaVersion) || !parsed.question || !parsed.topicCode || !parsed.evidence?.baseHash || !Array.isArray(parsed.evidence.sources) || !Array.isArray(parsed.engine?.findings)) return null;
    if (parsed.schemaVersion === FISCAL_HOMOLOGATION_LAB_SCHEMA_VERSION && (!parsed.simulation?.code || parsed.simulation.synthetic !== true)) return null;
    return parsed;
  } catch {
    return null;
  }
}

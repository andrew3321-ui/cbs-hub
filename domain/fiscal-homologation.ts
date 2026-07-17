import type { FiscalIntelligenceFacts, FiscalIntelligenceResult, FiscalKnowledgeSource } from "./fiscal-intelligence.ts";

export const FISCAL_HOMOLOGATION_SCHEMA_VERSION = "fiscal-homologation-snapshot.v1";
export const FISCAL_HOMOLOGATION_EXPECTED_VERSION = "fiscal-homologation-expected.v1";

export type FiscalHomologationSnapshot = {
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

export type FiscalHomologationExpected = {
  schemaVersion: typeof FISCAL_HOMOLOGATION_EXPECTED_VERSION;
  topicCode: string;
  status: FiscalIntelligenceResult["status"];
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

export function createFiscalHomologationSnapshot(question: string, result: FiscalIntelligenceResult, baseHash: string, capturedAt: string): FiscalHomologationSnapshot {
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
    if (parsed.schemaVersion !== FISCAL_HOMOLOGATION_SCHEMA_VERSION || !parsed.question || !parsed.topicCode || !parsed.evidence?.baseHash || !Array.isArray(parsed.evidence.sources) || !Array.isArray(parsed.engine?.findings)) return null;
    return parsed;
  } catch {
    return null;
  }
}

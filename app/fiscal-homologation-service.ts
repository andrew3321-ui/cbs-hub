import { desc, eq, inArray } from "drizzle-orm";
import {
  createFiscalHomologationSnapshot,
  createFiscalLabHomologationSnapshot,
  expectedOutcomeFromHomologation,
  FISCAL_HOMOLOGATION_LAB_SCHEMA_VERSION,
  hashFiscalHomologationText,
  parseFiscalHomologationSnapshot,
} from "../domain/fiscal-homologation";
import { evaluateExpandedFiscalQuestion } from "../domain/fiscal-intelligence-v24";
import { calculateTaxLab } from "../domain/deterministic-tax-lab";
import { FISCAL_SIMULATION_BASE_CODE, getFiscalSimulationCase } from "../domain/fiscal-homologation-simulations";
import type { FiscalIntelligenceDefinition } from "../domain/fiscal-intelligence";
import {
  FISCAL_HOMOLOGATION_SIGNATURE_VERSION,
  type FiscalHomologationDecisionRecord,
} from "../domain/fiscal-homologation-signing";
import { getDb } from "../db";
import { fiscalHomologationCases, fiscalHomologationEvents, users } from "../db/schema";
import { verifyFiscalHomologationDecision } from "./fiscal-homologation-signing";

function safeJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function homologationDecisionRecord(row: typeof fiscalHomologationCases.$inferSelect): FiscalHomologationDecisionRecord | null {
  if (!row.decisionByUserId || !row.professionalRegistration || row.comparisonOutcome !== "matches" || !row.decidedAt || !row.expectedJson || !row.baseHash) return null;
  return {
    caseId: row.id,
    workspaceId: row.workspaceId,
    snapshotHash: row.snapshotHash,
    baseHash: row.baseHash,
    reviewerUserId: row.decisionByUserId,
    professionalRegistration: row.professionalRegistration,
    comparisonOutcome: "matches",
    expectedJson: row.expectedJson,
    decidedAt: row.decidedAt,
  };
}

export async function fiscalHomologationResponseRows(workspaceId: number, currentBaseHash: string, currentDefinition: FiscalIntelligenceDefinition, currentSimulationBaseHash = "") {
  const db = getDb();
  const rows = await db.select().from(fiscalHomologationCases).where(eq(fiscalHomologationCases.workspaceId, workspaceId)).orderBy(desc(fiscalHomologationCases.createdAt), desc(fiscalHomologationCases.id)).limit(80);
  const userIds = Array.from(new Set(rows.flatMap((row) => [row.createdByUserId, row.assignedReviewerUserId, row.decisionByUserId]).filter((id): id is number => Number.isInteger(id))));
  const people = userIds.length ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, userIds)) : [];
  const names = new Map(people.map((person) => [person.id, person.name]));
  const caseIds = rows.map((row) => row.id);
  const events = caseIds.length ? await db.select().from(fiscalHomologationEvents).where(inArray(fiscalHomologationEvents.caseId, caseIds)).orderBy(desc(fiscalHomologationEvents.createdAt), desc(fiscalHomologationEvents.id)).limit(320) : [];
  const eventsByCase = new Map<string, typeof events>();
  for (const event of events) eventsByCase.set(event.caseId, [...(eventsByCase.get(event.caseId) ?? []), event]);

  return Promise.all(rows.map(async (row) => {
    const snapshot = parseFiscalHomologationSnapshot(row.snapshotJson);
    const snapshotHashValid = Boolean(snapshot) && await hashFiscalHomologationText(row.snapshotJson) === row.snapshotHash;
    const record = homologationDecisionRecord(row);
    const signatureValid = row.status === "approved" && record
      ? await verifyFiscalHomologationDecision(record, row.decisionSignature, row.signatureVersion)
      : row.status !== "approved";
    const integrityStatus = snapshotHashValid && signatureValid ? "verified" : "blocked";
    const activeBaseHash = row.baseCode === FISCAL_SIMULATION_BASE_CODE ? currentSimulationBaseHash : currentBaseHash;
    const validityStatus = row.status !== "approved"
      ? "not_applicable"
      : integrityStatus !== "verified" || !activeBaseHash || row.baseHash !== activeBaseHash
        ? "requires_revalidation"
        : "current";
    let regressionStatus: "not_applicable" | "passed" | "failed" | "requires_revalidation" = "not_applicable";
    if (row.status === "approved") {
      regressionStatus = validityStatus === "current" && snapshot
        ? (() => {
          try {
            if (snapshot.schemaVersion === FISCAL_HOMOLOGATION_LAB_SCHEMA_VERSION) {
              const simulation = getFiscalSimulationCase(snapshot.simulation.code);
              if (!simulation) return "failed";
              const currentResult = calculateTaxLab(simulation.input);
              const currentSnapshot = createFiscalLabHomologationSnapshot(simulation, currentResult, currentSimulationBaseHash, snapshot.capturedAt);
              return JSON.stringify(expectedOutcomeFromHomologation(currentSnapshot)) === row.expectedJson ? "passed" : "failed";
            }
            const currentResult = evaluateExpandedFiscalQuestion(snapshot.question, snapshot.facts, snapshot.facts.referenceDate, currentDefinition);
            const currentSnapshot = createFiscalHomologationSnapshot(snapshot.question, currentResult, currentBaseHash, snapshot.capturedAt);
            return JSON.stringify(expectedOutcomeFromHomologation(currentSnapshot)) === row.expectedJson ? "passed" : "failed";
          } catch {
            return "failed";
          }
        })()
        : "requires_revalidation";
    }
    return {
      ...row,
      snapshot,
      expected: safeJson<Record<string, unknown>>(row.expectedJson, {}),
      createdByName: names.get(row.createdByUserId) ?? "Profissional",
      assignedReviewerName: row.assignedReviewerUserId ? names.get(row.assignedReviewerUserId) ?? "Revisor" : null,
      decisionByName: row.decisionByUserId ? names.get(row.decisionByUserId) ?? "Responsável" : null,
      integrityStatus,
      validityStatus,
      regressionStatus,
      signatureVersionExpected: FISCAL_HOMOLOGATION_SIGNATURE_VERSION,
      events: (eventsByCase.get(row.id) ?? []).map((event) => ({ ...event, eventData: safeJson<Record<string, unknown>>(event.eventData, {}) })),
    };
  }));
}

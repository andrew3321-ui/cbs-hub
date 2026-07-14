import { and, desc, eq } from "drizzle-orm";
import { ensureScenarioSchema, getDb } from "../../../db";
import { auditEvents, companies, reportShares, scenarios } from "../../../db/schema";
import { getCurrentUser } from "../../auth";
import { buildScenarioSnapshot, CALCULATION_ENGINE_VERSION, hashScenarioInput, METHODOLOGY_VERSION, type RateSource, type ScenarioReliabilityInput } from "../../scenario-reliability";
import { SCENARIO_SIGNATURE_VERSION, signedRecordFromScenario, signScenarioRecord, verifyScenarioRecord } from "../../scenario-signing";

function validInteger(value: unknown, min: number, max: number) {
  return Number.isInteger(value) && Number(value) >= min && Number(value) <= max;
}

const scenarioSelection = {
  id: scenarios.id,
  name: scenarios.name,
  revenueCents: scenarios.revenueCents,
  currentRateBps: scenarios.currentRateBps,
  newRateBps: scenarios.newRateBps,
  costRateBps: scenarios.costRateBps,
  fixedCostsCents: scenarios.fixedCostsCents,
  volumeLossBps: scenarios.volumeLossBps,
  priceAdjustmentBps: scenarios.priceAdjustmentBps,
  targetYear: scenarios.targetYear,
  rateSource: scenarios.rateSource,
  sourceNote: scenarios.sourceNote,
  reviewStatus: scenarios.reviewStatus,
  calculationVersion: scenarios.calculationVersion,
  methodologyVersion: scenarios.methodologyVersion,
  inputHash: scenarios.inputHash,
  snapshotJson: scenarios.snapshotJson,
  calculatedAt: scenarios.calculatedAt,
  signatureVersion: scenarios.signatureVersion,
  recordSignature: scenarios.recordSignature,
  companyId: scenarios.companyId,
  createdAt: scenarios.createdAt,
};

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para acessar os cenários." }, { status: 401 });
  try {
    await ensureScenarioSchema();
    const companyId = Number(new URL(request.url).searchParams.get("companyId"));
    const db = getDb();
    let rows;
    if (Number.isInteger(companyId) && companyId > 0) {
      const [ownedCompany] = await db.select({ id: companies.id }).from(companies).where(and(eq(companies.id, companyId), eq(companies.ownerUserId, user.id))).limit(1);
      if (!ownedCompany) return Response.json({ error: "Empresa não encontrada." }, { status: 404 });
      rows = await db.select(scenarioSelection).from(scenarios).where(eq(scenarios.companyId, companyId)).orderBy(desc(scenarios.createdAt), desc(scenarios.id)).limit(40);
    } else {
      rows = await db.select(scenarioSelection).from(scenarios).innerJoin(companies, eq(scenarios.companyId, companies.id)).where(eq(companies.ownerUserId, user.id)).orderBy(desc(scenarios.createdAt), desc(scenarios.id)).limit(100);
    }
    const verifiedRows = await Promise.all(rows.map(async (row) => {
      const { recordSignature, ...publicRow } = row;
      if (row.calculationVersion === "legacy") return { ...publicRow, integrityStatus: "legacy" as const };
      const signedRecord = signedRecordFromScenario(row, user.id);
      const integrityStatus = signedRecord && await verifyScenarioRecord(signedRecord, recordSignature, row.signatureVersion) ? "verified" as const : "invalid" as const;
      return { ...publicRow, integrityStatus };
    }));
    return Response.json({ scenarios: verifiedRows });
  } catch {
    return Response.json({ error: "O histórico ainda não está disponível." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para salvar cenários." }, { status: 401 });
  try {
    await ensureScenarioSchema();
    const payload = (await request.json()) as Record<string, unknown>;
    const name = typeof payload.name === "string" ? payload.name.trim().slice(0, 80) : "";
    const priceAdjustmentBps = payload.priceAdjustmentBps ?? 0;
    const fixedCostsCents = payload.fixedCostsCents ?? 0;
    const volumeLossBps = payload.volumeLossBps ?? 0;
    const targetYear = Number(payload.targetYear);
    const rateSource = payload.rateSource === "accountant" ? "accountant" : payload.rateSource === "custom" ? "custom" : null;
    const sourceNote = typeof payload.sourceNote === "string" ? payload.sourceNote.trim().slice(0, 400) : "";

    if (!name || !validInteger(payload.companyId, 1, 1_000_000_000) || !validInteger(payload.revenueCents, 100_000, 10_000_000_000) || !validInteger(payload.currentRateBps, 0, 9_900) || !validInteger(payload.newRateBps, 0, 9_900) || !validInteger(payload.costRateBps, 0, 9_900) || !validInteger(fixedCostsCents, 0, 10_000_000_000) || !validInteger(volumeLossBps, 0, 9_500) || !validInteger(priceAdjustmentBps, 0, 10_000) || !validInteger(targetYear, 2026, 2033) || !rateSource || sourceNote.length < 10) {
      return Response.json({ error: "Revise os valores e descreva a origem das premissas." }, { status: 400 });
    }

    const companyId = Number(payload.companyId);
    const db = getDb();
    const [ownedCompany] = await db.select({ id: companies.id }).from(companies).where(and(eq(companies.id, companyId), eq(companies.ownerUserId, user.id))).limit(1);
    if (!ownedCompany) return Response.json({ error: "Empresa não encontrada." }, { status: 404 });

    const reliabilityInput: ScenarioReliabilityInput = {
      revenueCents: Number(payload.revenueCents),
      currentRateBps: Number(payload.currentRateBps),
      newRateBps: Number(payload.newRateBps),
      costRateBps: Number(payload.costRateBps),
      fixedCostsCents: Number(fixedCostsCents),
      volumeLossBps: Number(volumeLossBps),
      priceAdjustmentBps: Number(priceAdjustmentBps),
      targetYear,
      rateSource: rateSource as RateSource,
      sourceNote,
    };
    const snapshot = buildScenarioSnapshot(reliabilityInput);
    const inputHash = await hashScenarioInput(reliabilityInput);
    const calculatedAt = new Date().toISOString();
    const snapshotJson = JSON.stringify(snapshot);
    const recordSignature = await signScenarioRecord({ ownerUserId: user.id, companyId, name, ...reliabilityInput, snapshotJson, calculationVersion: CALCULATION_ENGINE_VERSION, methodologyVersion: METHODOLOGY_VERSION, calculatedAt });
    const [scenario] = await db.insert(scenarios).values({
      name,
      ...reliabilityInput,
      reviewStatus: "draft",
      calculationVersion: CALCULATION_ENGINE_VERSION,
      methodologyVersion: METHODOLOGY_VERSION,
      inputHash,
      snapshotJson,
      calculatedAt,
      signatureVersion: SCENARIO_SIGNATURE_VERSION,
      recordSignature,
      companyId,
    }).returning();

    await db.insert(auditEvents).values({
      ownerUserId: user.id,
      companyId,
      scenarioId: scenario.id,
      eventType: "scenario.created",
      eventData: JSON.stringify({ name, targetYear, rateSource, inputHash, calculationVersion: CALCULATION_ENGINE_VERSION, methodologyVersion: METHODOLOGY_VERSION, signatureVersion: SCENARIO_SIGNATURE_VERSION }),
    });
    const publicScenario = Object.fromEntries(Object.entries(scenario).filter(([key]) => key !== "recordSignature"));
    return Response.json({ scenario: { ...publicScenario, integrityStatus: "verified" } }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "scenario_signing_key_unavailable") return Response.json({ error: "A assinatura de integridade está temporariamente indisponível. Nenhum cenário foi salvo." }, { status: 503 });
    return Response.json({ error: "Não foi possível salvar o cenário." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para excluir cenários." }, { status: 401 });
  try {
    await ensureScenarioSchema();
    const id = Number(new URL(request.url).searchParams.get("id"));
    if (!Number.isInteger(id) || id <= 0) return Response.json({ error: "Cenário inválido." }, { status: 400 });
    const db = getDb();
    const [ownedScenario] = await db.select({ id: scenarios.id, name: scenarios.name, companyId: scenarios.companyId, inputHash: scenarios.inputHash, calculationVersion: scenarios.calculationVersion }).from(scenarios).innerJoin(companies, eq(scenarios.companyId, companies.id)).where(and(eq(scenarios.id, id), eq(companies.ownerUserId, user.id))).limit(1);
    if (!ownedScenario) return Response.json({ error: "Cenário não encontrado." }, { status: 404 });

    await db.insert(auditEvents).values({ ownerUserId: user.id, companyId: ownedScenario.companyId, scenarioId: id, eventType: "scenario.deleted", eventData: JSON.stringify({ name: ownedScenario.name, inputHash: ownedScenario.inputHash, calculationVersion: ownedScenario.calculationVersion }) });
    await db.delete(reportShares).where(eq(reportShares.scenarioId, id));
    await db.delete(scenarios).where(eq(scenarios.id, id));
    return Response.json({ deleted: true });
  } catch {
    return Response.json({ error: "Não foi possível excluir o cenário." }, { status: 500 });
  }
}

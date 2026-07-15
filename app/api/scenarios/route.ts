import { and, desc, eq, inArray, lt } from "drizzle-orm";
import { ensureScenarioSchema, getDb } from "../../../db";
import { auditEvents, companies, reportShares, scenarioApprovals, scenarioReviewComments, scenarioReviewRounds, scenarios, users } from "../../../db/schema";
import { getCurrentUser } from "../../auth";
import { scenarioApprovalSummary } from "../../scenario-approval";
import { buildScenarioSnapshot, CALCULATION_ENGINE_VERSION, hashScenarioInput, METHODOLOGY_VERSION, type RateSource, type ScenarioReliabilityInput } from "../../scenario-reliability";
import { SCENARIO_SIGNATURE_VERSION, signedRecordFromScenario, signScenarioRecord, verifyScenarioRecord } from "../../scenario-signing";
import { withApiTelemetry } from "../../api-infrastructure";
import { canPrepareScenarios, getWorkspaceContext } from "../../workspace";

function validInteger(value: unknown, min: number, max: number) {
  return Number.isInteger(value) && Number(value) >= min && Number(value) <= max;
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function publicScenarioRecord<T extends Record<string, unknown>>(scenario: T, integrityStatus: "verified" | "legacy" | "invalid", approval: Awaited<ReturnType<typeof scenarioApprovalSummary>> = null, preparerName: string | null = null) {
  const safeEntries = Object.entries(scenario).filter(([key]) => key !== "recordSignature" && key !== "requestKey");
  return { ...Object.fromEntries(safeEntries), integrityStatus, approval, preparerName };
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
  preparedByUserId: scenarios.preparedByUserId,
  supersedesScenarioId: scenarios.supersedesScenarioId,
  createdAt: scenarios.createdAt,
};

async function getScenarios(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para acessar os cenários." }, { status: 401 });
  try {
    await ensureScenarioSchema();
    const workspace = await getWorkspaceContext(user.id);
    if (!workspace) return Response.json({ error: "Espaço profissional não encontrado." }, { status: 403 });
    const url = new URL(request.url);
    const companyId = Number(url.searchParams.get("companyId"));
    const cursor = Number(url.searchParams.get("cursor"));
    const requestedLimit = Number(url.searchParams.get("limit"));
    const pageSize = Number.isInteger(requestedLimit) ? Math.min(50, Math.max(10, requestedLimit)) : 40;
    const db = getDb();
    let rows;
    if (Number.isInteger(companyId) && companyId > 0) {
      const [ownedCompany] = await db.select({ id: companies.id }).from(companies).where(and(eq(companies.id, companyId), eq(companies.workspaceId, workspace.id))).limit(1);
      if (!ownedCompany) return Response.json({ error: "Empresa não encontrada." }, { status: 404 });
      rows = await db.select(scenarioSelection).from(scenarios).where(and(eq(scenarios.companyId, companyId), Number.isInteger(cursor) && cursor > 0 ? lt(scenarios.id, cursor) : undefined)).orderBy(desc(scenarios.createdAt), desc(scenarios.id)).limit(pageSize + 1);
    } else {
      rows = await db.select(scenarioSelection).from(scenarios).innerJoin(companies, eq(scenarios.companyId, companies.id)).where(and(eq(companies.workspaceId, workspace.id), Number.isInteger(cursor) && cursor > 0 ? lt(scenarios.id, cursor) : undefined)).orderBy(desc(scenarios.createdAt), desc(scenarios.id)).limit(pageSize + 1);
    }
    const hasMore = rows.length > pageSize;
    const page = rows.slice(0, pageSize);
    const approvalRows = page.length ? await db.select().from(scenarioApprovals).where(inArray(scenarioApprovals.scenarioId, page.map((row) => row.id))) : [];
    const approvalByScenario = new Map(approvalRows.map((approval) => [approval.scenarioId, approval]));
    const preparerIds = [...new Set(page.flatMap((row) => row.preparedByUserId ? [row.preparedByUserId] : []))];
    const preparers = preparerIds.length ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, preparerIds)) : [];
    const preparerById = new Map(preparers.map((preparer) => [preparer.id, preparer.name]));
    const verifiedRows = await Promise.all(page.map(async (row) => {
      const { recordSignature } = row;
      const approval = await scenarioApprovalSummary(approvalByScenario.get(row.id));
      const preparerName = row.preparedByUserId ? preparerById.get(row.preparedByUserId) ?? null : null;
      if (row.calculationVersion === "legacy") return publicScenarioRecord(row, "legacy", approval, preparerName);
      const signedRecord = signedRecordFromScenario(row, workspace.ownerUserId);
      const integrityStatus = signedRecord && await verifyScenarioRecord(signedRecord, recordSignature, row.signatureVersion) ? "verified" as const : "invalid" as const;
      return publicScenarioRecord(row, integrityStatus, approval, preparerName);
    }));
    return Response.json({ scenarios: verifiedRows, nextCursor: hasMore ? page.at(-1)?.id ?? null : null });
  } catch {
    return Response.json({ error: "O histórico ainda não está disponível." }, { status: 500 });
  }
}

async function createScenario(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para salvar cenários." }, { status: 401 });
  try {
    await ensureScenarioSchema();
    const workspace = await getWorkspaceContext(user.id);
    if (!workspace || !canPrepareScenarios(workspace.role)) return Response.json({ error: "Seu papel não permite preparar cenários." }, { status: 403 });
    const payload = (await request.json()) as Record<string, unknown>;
    const name = typeof payload.name === "string" ? payload.name.trim().slice(0, 80) : "";
    const priceAdjustmentBps = payload.priceAdjustmentBps ?? 0;
    const fixedCostsCents = payload.fixedCostsCents ?? 0;
    const volumeLossBps = payload.volumeLossBps ?? 0;
    const targetYear = Number(payload.targetYear);
    const rateSource = payload.rateSource === "accountant" ? "accountant" : payload.rateSource === "custom" ? "custom" : null;
    const sourceNote = typeof payload.sourceNote === "string" ? payload.sourceNote.trim().slice(0, 400) : "";
    const clientRequestId = typeof payload.clientRequestId === "string" ? payload.clientRequestId.trim() : "";
    const supersedesScenarioId = payload.supersedesScenarioId == null ? null : Number(payload.supersedesScenarioId);

    if (!name || !validInteger(payload.companyId, 1, 1_000_000_000) || !validInteger(payload.revenueCents, 100_000, 10_000_000_000) || !validInteger(payload.currentRateBps, 0, 9_900) || !validInteger(payload.newRateBps, 0, 9_900) || !validInteger(payload.costRateBps, 0, 9_900) || !validInteger(fixedCostsCents, 0, 10_000_000_000) || !validInteger(volumeLossBps, 0, 9_500) || !validInteger(priceAdjustmentBps, 0, 10_000) || !validInteger(targetYear, 2026, 2033) || !rateSource || sourceNote.length < 10 || (clientRequestId && !/^[a-zA-Z0-9_-]{16,100}$/.test(clientRequestId)) || (supersedesScenarioId !== null && (!Number.isInteger(supersedesScenarioId) || supersedesScenarioId <= 0))) {
      return Response.json({ error: "Revise os valores e descreva a origem das premissas." }, { status: 400 });
    }

    const companyId = Number(payload.companyId);
    const db = getDb();
    const [ownedCompany] = await db.select({ id: companies.id }).from(companies).where(and(eq(companies.id, companyId), eq(companies.workspaceId, workspace.id))).limit(1);
    if (!ownedCompany) return Response.json({ error: "Empresa não encontrada." }, { status: 404 });
    const requestKey = clientRequestId ? await sha256(`${workspace.id}:${user.id}:scenario.create:${clientRequestId}`) : null;
    if (requestKey) {
      const [existing] = await db.select({ scenario: scenarios }).from(scenarios).innerJoin(companies, eq(scenarios.companyId, companies.id)).where(and(eq(scenarios.requestKey, requestKey), eq(companies.workspaceId, workspace.id))).limit(1);
      if (existing?.scenario) {
        const signedRecord = signedRecordFromScenario(existing.scenario, workspace.ownerUserId);
        const integrityStatus = signedRecord && await verifyScenarioRecord(signedRecord, existing.scenario.recordSignature, existing.scenario.signatureVersion) ? "verified" : "invalid";
        return Response.json({ scenario: publicScenarioRecord(existing.scenario, integrityStatus, null, user.name), replayed: true });
      }
    }
    let correctionSource: typeof scenarios.$inferSelect | null = null;
    let correctionRound: typeof scenarioReviewRounds.$inferSelect | null = null;
    if (supersedesScenarioId !== null) {
      if (workspace.type !== "office") return Response.json({ error: "O fluxo de correções versionadas está disponível no modo escritório." }, { status: 403 });
      const [source] = await db.select({ scenario: scenarios, round: scenarioReviewRounds }).from(scenarios).innerJoin(companies, eq(scenarios.companyId, companies.id)).innerJoin(scenarioReviewRounds, eq(scenarioReviewRounds.scenarioId, scenarios.id)).where(and(eq(scenarios.id, supersedesScenarioId), eq(scenarios.companyId, companyId), eq(companies.workspaceId, workspace.id))).limit(1);
      if (!source || source.scenario.reviewStatus !== "changes_requested" || source.round.status !== "changes_requested") return Response.json({ error: "A versão de origem não está aguardando correções." }, { status: 409 });
      if (source.scenario.preparedByUserId !== user.id) return Response.json({ error: "Somente quem preparou a versão pode registrar a correção vinculada." }, { status: 403 });
      correctionSource = source.scenario;
      correctionRound = source.round;
    }
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
    const recordSignature = await signScenarioRecord({ ownerUserId: workspace.ownerUserId, companyId, name, ...reliabilityInput, snapshotJson, calculationVersion: CALCULATION_ENGINE_VERSION, methodologyVersion: METHODOLOGY_VERSION, calculatedAt, supersedesScenarioId });
    let scenario: typeof scenarios.$inferSelect | undefined;
    try {
      [scenario] = await db.insert(scenarios).values({
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
        requestKey,
        companyId,
        preparedByUserId: user.id,
        supersedesScenarioId,
      }).returning();
    } catch (insertError) {
      if (requestKey && String(insertError).toLowerCase().includes("unique")) {
        const [existing] = await db.select({ scenario: scenarios }).from(scenarios).innerJoin(companies, eq(scenarios.companyId, companies.id)).where(and(eq(scenarios.requestKey, requestKey), eq(companies.workspaceId, workspace.id))).limit(1);
        if (existing?.scenario) {
          const signedRecord = signedRecordFromScenario(existing.scenario, workspace.ownerUserId);
          const integrityStatus = signedRecord && await verifyScenarioRecord(signedRecord, existing.scenario.recordSignature, existing.scenario.signatureVersion) ? "verified" : "invalid";
          return Response.json({ scenario: publicScenarioRecord(existing.scenario, integrityStatus, null, user.name), replayed: true });
        }
      }
      throw insertError;
    }
    if (!scenario) throw new Error("scenario_insert_failed");

    const now = new Date().toISOString();
    const auditInsert = db.insert(auditEvents).values({
      ownerUserId: workspace.ownerUserId,
      companyId,
      scenarioId: scenario.id,
      eventType: supersedesScenarioId ? "scenario.corrected_version_created" : "scenario.created",
      eventData: JSON.stringify({ name, targetYear, rateSource, inputHash, preparedByUserId: user.id, supersedesScenarioId, calculationVersion: CALCULATION_ENGINE_VERSION, methodologyVersion: METHODOLOGY_VERSION, signatureVersion: SCENARIO_SIGNATURE_VERSION }),
    });
    if (correctionSource && correctionRound) {
      await db.batch([
        db.update(scenarioReviewRounds).set({ status: "superseded", updatedAt: now }).where(and(eq(scenarioReviewRounds.id, correctionRound.id), eq(scenarioReviewRounds.status, "changes_requested"))),
        db.insert(scenarioReviewComments).values({ reviewRoundId: correctionRound.id, workspaceId: workspace.id, scenarioId: correctionSource.id, authorUserId: user.id, kind: "superseded", body: `Nova versão corretiva criada: ${name}.`, createdAt: now }),
        auditInsert,
      ]);
    } else {
      await auditInsert;
    }
    return Response.json({ scenario: publicScenarioRecord(scenario, "verified", null, user.name), replayed: false }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "scenario_signing_key_unavailable") return Response.json({ error: "A assinatura de integridade está temporariamente indisponível. Nenhum cenário foi salvo." }, { status: 503 });
    return Response.json({ error: "Não foi possível salvar o cenário." }, { status: 500 });
  }
}

async function deleteScenario(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para excluir cenários." }, { status: 401 });
  try {
    await ensureScenarioSchema();
    const workspace = await getWorkspaceContext(user.id);
    if (!workspace || !canPrepareScenarios(workspace.role)) return Response.json({ error: "Seu papel não permite excluir cenários." }, { status: 403 });
    const id = Number(new URL(request.url).searchParams.get("id"));
    if (!Number.isInteger(id) || id <= 0) return Response.json({ error: "Cenário inválido." }, { status: 400 });
    const db = getDb();
    const [ownedScenario] = await db.select({ id: scenarios.id, name: scenarios.name, companyId: scenarios.companyId, inputHash: scenarios.inputHash, calculationVersion: scenarios.calculationVersion, reviewStatus: scenarios.reviewStatus }).from(scenarios).innerJoin(companies, eq(scenarios.companyId, companies.id)).where(and(eq(scenarios.id, id), eq(companies.workspaceId, workspace.id))).limit(1);
    if (!ownedScenario) return Response.json({ error: "Cenário não encontrado." }, { status: 404 });
    if (ownedScenario.reviewStatus !== "draft") return Response.json({ error: "Toda versão enviada à revisão é preservada para manter a trilha de responsabilidade." }, { status: 409 });

    await db.insert(auditEvents).values({ ownerUserId: workspace.ownerUserId, companyId: ownedScenario.companyId, scenarioId: id, eventType: "scenario.deleted", eventData: JSON.stringify({ name: ownedScenario.name, actorUserId: user.id, inputHash: ownedScenario.inputHash, calculationVersion: ownedScenario.calculationVersion }) });
    await db.delete(reportShares).where(eq(reportShares.scenarioId, id));
    await db.delete(scenarioApprovals).where(eq(scenarioApprovals.scenarioId, id));
    const reviewRows = await db.select({ id: scenarioReviewRounds.id }).from(scenarioReviewRounds).where(eq(scenarioReviewRounds.scenarioId, id));
    if (reviewRows.length) await db.delete(scenarioReviewComments).where(inArray(scenarioReviewComments.reviewRoundId, reviewRows.map((round) => round.id)));
    await db.delete(scenarioReviewRounds).where(eq(scenarioReviewRounds.scenarioId, id));
    await db.delete(scenarios).where(eq(scenarios.id, id));
    return Response.json({ deleted: true });
  } catch {
    return Response.json({ error: "Não foi possível excluir o cenário." }, { status: 500 });
  }
}

export const GET = withApiTelemetry("GET /api/scenarios", getScenarios);
export const POST = withApiTelemetry("POST /api/scenarios", createScenario);
export const DELETE = withApiTelemetry("DELETE /api/scenarios", deleteScenario);

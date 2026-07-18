import { env } from "cloudflare:workers";
import { and, eq, inArray } from "drizzle-orm";
import { ensureScenarioSchema, getDb } from "../../../../db";
import { auditEvents, companies, scenarioReviewRounds, scenarios, users, workspaceMembers } from "../../../../db/schema";
import { getCurrentUser } from "../../../auth";
import { signedRecordFromScenario, verifyScenarioRecord } from "../../../scenario-signing";
import { withApiTelemetry } from "../../../api-infrastructure";
import { canPrepareScenarios, getWorkspaceContext } from "../../../workspace";
import { getWorkspaceEntitlements, officePlanRequiredResponse } from "../../../plan-entitlements";

const MAX_REVIEW_WINDOW_MS = 90 * 86_400_000;

async function requestScenarioReview(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para iniciar a revisão interna." }, { status: 401 });
  try {
    await ensureScenarioSchema();
    const workspace = await getWorkspaceContext(user.id);
    if (!workspace || !canPrepareScenarios(workspace.role)) return Response.json({ error: "Seu papel não permite enviar cenários para revisão." }, { status: 403 });
    if (workspace.type === "office") {
      const entitlements = await getWorkspaceEntitlements(workspace);
      if (!entitlements.officeCollaborationEnabled) return officePlanRequiredResponse(entitlements);
    }
    const payload = (await request.json()) as Record<string, unknown>;
    const scenarioId = Number(payload.scenarioId);
    if (!Number.isInteger(scenarioId) || scenarioId <= 0) return Response.json({ error: "Cenário inválido." }, { status: 400 });

    const db = getDb();
    const [owned] = await db.select({ scenario: scenarios }).from(scenarios).innerJoin(companies, eq(scenarios.companyId, companies.id)).where(and(eq(scenarios.id, scenarioId), eq(companies.workspaceId, workspace.id))).limit(1);
    const scenario = owned?.scenario;
    if (!scenario) return Response.json({ error: "Cenário não encontrado." }, { status: 404 });
    if (!scenario.snapshotJson || !scenario.inputHash || scenario.calculationVersion === "legacy") return Response.json({ error: "Este registro é anterior à blindagem. Carregue as premissas e salve uma nova versão." }, { status: 409 });
    const signedRecord = signedRecordFromScenario(scenario, workspace.ownerUserId);
    if (!signedRecord || !(await verifyScenarioRecord(signedRecord, scenario.recordSignature, scenario.signatureVersion))) return Response.json({ error: "A verificação criptográfica falhou. Este registro foi bloqueado e não pode seguir para revisão." }, { status: 409 });
    if (["ready_for_review", "responsible_approved", "delivered"].includes(scenario.reviewStatus)) {
      const [round] = workspace.type === "office" ? await db.select().from(scenarioReviewRounds).where(eq(scenarioReviewRounds.scenarioId, scenario.id)).limit(1) : [];
      return Response.json({ scenario: { id: scenario.id, reviewStatus: scenario.reviewStatus }, review: round ?? null });
    }
    if (scenario.reviewStatus !== "draft") return Response.json({ error: "O estado atual não permite iniciar uma nova revisão." }, { status: 409 });

    if (workspace.type === "individual") {
      await db.update(scenarios).set({ reviewStatus: "ready_for_review" }).where(eq(scenarios.id, scenarioId));
      await db.insert(auditEvents).values({ ownerUserId: workspace.ownerUserId, companyId: scenario.companyId, scenarioId, eventType: "scenario.ready_for_review", eventData: JSON.stringify({ name: scenario.name, actorUserId: user.id, preparedByUserId: scenario.preparedByUserId, inputHash: scenario.inputHash, calculationVersion: scenario.calculationVersion, methodologyVersion: scenario.methodologyVersion }) });
      return Response.json({ scenario: { id: scenario.id, reviewStatus: "ready_for_review" }, review: null });
    }

    if (!scenario.preparedByUserId) return Response.json({ error: "A autoria desta versão não está identificada. Regrave o cenário antes de enviá-lo." }, { status: 409 });
    const reviewerUserId = Number(payload.reviewerUserId);
    const dueAtValue = typeof payload.dueAt === "string" ? payload.dueAt : "";
    const dueAt = new Date(dueAtValue);
    const note = typeof payload.note === "string" ? payload.note.trim().slice(0, 1000) : "";
    if (!Number.isInteger(reviewerUserId) || reviewerUserId <= 0 || reviewerUserId === scenario.preparedByUserId || !dueAtValue || !Number.isFinite(dueAt.getTime()) || dueAt.getTime() <= Date.now() || dueAt.getTime() > Date.now() + MAX_REVIEW_WINDOW_MS) {
      return Response.json({ error: "Escolha outro profissional como revisor e um prazo futuro de até 90 dias." }, { status: 400 });
    }
    const [reviewer] = await db.select({ name: users.name }).from(workspaceMembers).innerJoin(users, eq(workspaceMembers.userId, users.id)).where(and(eq(workspaceMembers.workspaceId, workspace.id), eq(workspaceMembers.userId, reviewerUserId), eq(workspaceMembers.status, "active"), inArray(workspaceMembers.role, ["owner", "admin", "reviewer"]))).limit(1);
    if (!reviewer) return Response.json({ error: "O profissional escolhido não está apto a revisar." }, { status: 409 });

    let roundNumber = 1;
    if (scenario.supersedesScenarioId) {
      const [previousRound] = await db.select({ roundNumber: scenarioReviewRounds.roundNumber }).from(scenarioReviewRounds).where(eq(scenarioReviewRounds.scenarioId, scenario.supersedesScenarioId)).limit(1);
      roundNumber = (previousRound?.roundNumber ?? 0) + 1;
    }
    const now = new Date().toISOString();
    const dueIso = dueAt.toISOString();
    const submissionBody = note || `Versão enviada por ${user.name} para revisão de ${reviewer.name}.`;
    const results = await env.DB.batch([
      env.DB.prepare("INSERT INTO scenario_review_rounds (workspace_id, scenario_id, company_id, owner_user_id, prepared_by_user_id, assigned_reviewer_user_id, requested_by_user_id, round_number, status, due_at, decision_note, created_at, updated_at) SELECT ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, '', ?, ? WHERE EXISTS (SELECT 1 FROM scenarios WHERE id = ? AND review_status = 'draft') AND NOT EXISTS (SELECT 1 FROM scenario_review_rounds WHERE scenario_id = ?)").bind(workspace.id, scenario.id, scenario.companyId, workspace.ownerUserId, scenario.preparedByUserId, reviewerUserId, user.id, roundNumber, dueIso, now, now, scenario.id, scenario.id),
      env.DB.prepare("UPDATE scenarios SET review_status = 'ready_for_review' WHERE id = ? AND review_status = 'draft' AND EXISTS (SELECT 1 FROM scenario_review_rounds WHERE scenario_id = ? AND status = 'pending')").bind(scenario.id, scenario.id),
      env.DB.prepare("INSERT INTO scenario_review_comments (review_round_id, workspace_id, scenario_id, author_user_id, kind, body, created_at) SELECT id, workspace_id, scenario_id, ?, 'submission', ?, ? FROM scenario_review_rounds WHERE scenario_id = ? AND status = 'pending' AND created_at = ?").bind(user.id, submissionBody, now, scenario.id, now),
      env.DB.prepare("INSERT INTO audit_events (owner_user_id, company_id, scenario_id, event_type, event_data, created_at) SELECT owner_user_id, company_id, scenario_id, 'scenario.review_requested', ?, ? FROM scenario_review_rounds WHERE scenario_id = ? AND status = 'pending' AND created_at = ?").bind(JSON.stringify({ actorUserId: user.id, reviewerUserId, dueAt: dueIso, roundNumber, inputHash: scenario.inputHash }), now, scenario.id, now),
    ]);
    if (results[0].meta.changes !== 1 || results[1].meta.changes !== 1) return Response.json({ error: "O cenário mudou enquanto era enviado. Atualize o histórico e tente novamente." }, { status: 409 });
    const [review] = await db.select().from(scenarioReviewRounds).where(eq(scenarioReviewRounds.scenarioId, scenario.id)).limit(1);
    return Response.json({ scenario: { id: scenario.id, reviewStatus: "ready_for_review" }, review }, { status: 201 });
  } catch {
    return Response.json({ error: "Não foi possível iniciar a revisão interna." }, { status: 500 });
  }
}

export const POST = withApiTelemetry("POST /api/scenarios/review", requestScenarioReview);

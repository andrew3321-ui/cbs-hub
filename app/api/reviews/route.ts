import { env } from "cloudflare:workers";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { ensureScenarioSchema, getDb } from "../../../db";
import { companies, scenarioApprovals, scenarioReviewComments, scenarioReviewRounds, scenarios, users, workspaceMembers } from "../../../db/schema";
import { getCurrentUser } from "../../auth";
import { withApiTelemetry } from "../../api-infrastructure";
import { scenarioApprovalSummary } from "../../scenario-approval";
import { signedRecordFromScenario, verifyScenarioRecord } from "../../scenario-signing";
import { canManageWorkspace, canReviewScenarios, getWorkspaceContext } from "../../workspace";

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

async function listReviews() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para acessar a central de revisão." }, { status: 401 });
  try {
    await ensureScenarioSchema();
    const workspace = await getWorkspaceContext(user.id);
    if (!workspace || workspace.type !== "office") return Response.json({ error: "A central de revisão está disponível no modo escritório." }, { status: 403 });
    const db = getDb();
    const rounds = await db.select().from(scenarioReviewRounds).where(eq(scenarioReviewRounds.workspaceId, workspace.id)).orderBy(desc(scenarioReviewRounds.createdAt), desc(scenarioReviewRounds.id)).limit(120);
    const scenarioIds = rounds.map((round) => round.scenarioId);
    const roundIds = rounds.map((round) => round.id);
    const scenarioRows = scenarioIds.length ? await db.select(scenarioSelection).from(scenarios).where(inArray(scenarios.id, scenarioIds)) : [];
    const approvalRows = scenarioIds.length ? await db.select().from(scenarioApprovals).where(inArray(scenarioApprovals.scenarioId, scenarioIds)) : [];
    const comments = roundIds.length ? await db.select().from(scenarioReviewComments).where(inArray(scenarioReviewComments.reviewRoundId, roundIds)).orderBy(asc(scenarioReviewComments.createdAt), asc(scenarioReviewComments.id)) : [];
    const companyIds = [...new Set(rounds.map((round) => round.companyId))];
    const companyRows = companyIds.length ? await db.select({ id: companies.id, name: companies.name, taxRegime: companies.taxRegime, sector: companies.sector }).from(companies).where(and(inArray(companies.id, companyIds), eq(companies.workspaceId, workspace.id))) : [];
    const userIds = [...new Set(rounds.flatMap((round) => [round.preparedByUserId, round.assignedReviewerUserId, round.requestedByUserId, round.decisionByUserId]).filter((id): id is number => Boolean(id)).concat(comments.map((comment) => comment.authorUserId)))];
    const userRows = userIds.length ? await db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(inArray(users.id, userIds)) : [];
    const eligibleReviewers = await db.select({ userId: users.id, name: users.name, email: users.email, role: workspaceMembers.role }).from(workspaceMembers).innerJoin(users, eq(workspaceMembers.userId, users.id)).where(and(eq(workspaceMembers.workspaceId, workspace.id), eq(workspaceMembers.status, "active"), inArray(workspaceMembers.role, ["owner", "admin", "reviewer"]))).orderBy(asc(users.name));

    const scenarioById = new Map(scenarioRows.map((scenario) => [scenario.id, scenario]));
    const approvalByScenario = new Map(approvalRows.map((approval) => [approval.scenarioId, approval]));
    const companyById = new Map(companyRows.map((company) => [company.id, company]));
    const userById = new Map(userRows.map((item) => [item.id, item]));
    const commentsByRound = new Map<number, typeof comments>();
    for (const comment of comments) {
      const list = commentsByRound.get(comment.reviewRoundId) ?? [];
      list.push(comment);
      commentsByRound.set(comment.reviewRoundId, list);
    }

    const reviews = await Promise.all(rounds.map(async (round) => {
      const scenario = scenarioById.get(round.scenarioId);
      if (!scenario) return null;
      const signedRecord = signedRecordFromScenario(scenario, workspace.ownerUserId);
      const integrityStatus = scenario.calculationVersion === "legacy" ? "legacy" as const : signedRecord && await verifyScenarioRecord(signedRecord, scenario.recordSignature, scenario.signatureVersion) ? "verified" as const : "invalid" as const;
      const { recordSignature: _recordSignature, ...safeScenario } = scenario;
      void _recordSignature;
      const approval = await scenarioApprovalSummary(approvalByScenario.get(scenario.id));
      const preparer = userById.get(round.preparedByUserId);
      const assignee = round.assignedReviewerUserId ? userById.get(round.assignedReviewerUserId) : null;
      const decisionBy = round.decisionByUserId ? userById.get(round.decisionByUserId) : null;
      return {
        ...round,
        company: companyById.get(round.companyId) ?? null,
        preparerName: preparer?.name ?? "Profissional não encontrado",
        assigneeName: assignee?.name ?? null,
        decisionByName: decisionBy?.name ?? null,
        scenario: { ...safeScenario, integrityStatus, approval, preparerName: preparer?.name ?? null, companyName: companyById.get(round.companyId)?.name ?? null },
        comments: (commentsByRound.get(round.id) ?? []).map((comment) => ({ ...comment, authorName: userById.get(comment.authorUserId)?.name ?? "Profissional" })),
      };
    }));
    const visible = reviews.filter((review): review is NonNullable<typeof review> => Boolean(review));
    const now = Date.now();
    const approvedDurations = visible.filter((review) => review.status === "approved" && review.decidedAt).map((review) => (new Date(review.decidedAt!).getTime() - new Date(review.createdAt).getTime()) / 3_600_000).filter(Number.isFinite);
    return Response.json({
      reviews: visible,
      eligibleReviewers,
      metrics: {
        pending: visible.filter((review) => review.status === "pending").length,
        mine: visible.filter((review) => review.status === "pending" && review.assignedReviewerUserId === user.id).length,
        overdue: visible.filter((review) => review.status === "pending" && review.dueAt && new Date(review.dueAt).getTime() < now).length,
        changesRequested: visible.filter((review) => review.status === "changes_requested").length,
        approved: visible.filter((review) => review.status === "approved").length,
        averageHours: approvedDurations.length ? Math.round(approvedDurations.reduce((sum, value) => sum + value, 0) / approvedDurations.length) : null,
      },
      permissions: { canManage: canManageWorkspace(workspace.role), canReview: canReviewScenarios(workspace.role) },
    });
  } catch {
    return Response.json({ error: "Não foi possível carregar a central de revisão." }, { status: 500 });
  }
}

async function mutateReview(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para trabalhar na revisão." }, { status: 401 });
  try {
    await ensureScenarioSchema();
    const workspace = await getWorkspaceContext(user.id);
    if (!workspace || workspace.type !== "office") return Response.json({ error: "Ação disponível apenas no modo escritório." }, { status: 403 });
    const payload = (await request.json()) as Record<string, unknown>;
    const action = typeof payload.action === "string" ? payload.action : "";
    const reviewRoundId = Number(payload.reviewRoundId);
    if (!Number.isInteger(reviewRoundId) || reviewRoundId <= 0) return Response.json({ error: "Revisão inválida." }, { status: 400 });
    const db = getDb();
    const [owned] = await db.select({ round: scenarioReviewRounds, scenario: scenarios }).from(scenarioReviewRounds).innerJoin(scenarios, eq(scenarioReviewRounds.scenarioId, scenarios.id)).where(and(eq(scenarioReviewRounds.id, reviewRoundId), eq(scenarioReviewRounds.workspaceId, workspace.id))).limit(1);
    if (!owned) return Response.json({ error: "Revisão não encontrada." }, { status: 404 });
    const { round, scenario } = owned;

    if (action === "comment") {
      const body = typeof payload.body === "string" ? payload.body.trim().slice(0, 1000) : "";
      if (body.length < 2) return Response.json({ error: "Escreva um comentário antes de enviar." }, { status: 400 });
      const [comment] = await db.insert(scenarioReviewComments).values({ reviewRoundId: round.id, workspaceId: workspace.id, scenarioId: scenario.id, authorUserId: user.id, kind: "comment", body }).returning();
      return Response.json({ comment: { ...comment, authorName: user.name } }, { status: 201 });
    }

    if (action === "assign") {
      if (!canManageWorkspace(workspace.role) || round.status !== "pending") return Response.json({ error: "Somente gestores podem reatribuir uma revisão pendente." }, { status: 403 });
      const reviewerUserId = Number(payload.reviewerUserId);
      const dueAtValue = typeof payload.dueAt === "string" ? payload.dueAt : "";
      const dueAt = dueAtValue ? new Date(dueAtValue) : null;
      if (!Number.isInteger(reviewerUserId) || reviewerUserId <= 0 || reviewerUserId === round.preparedByUserId || !dueAt || !Number.isFinite(dueAt.getTime()) || dueAt.getTime() <= Date.now() || dueAt.getTime() > Date.now() + 90 * 86_400_000) return Response.json({ error: "Escolha outro revisor e um prazo futuro de até 90 dias." }, { status: 400 });
      const [reviewer] = await db.select({ name: users.name }).from(workspaceMembers).innerJoin(users, eq(workspaceMembers.userId, users.id)).where(and(eq(workspaceMembers.workspaceId, workspace.id), eq(workspaceMembers.userId, reviewerUserId), eq(workspaceMembers.status, "active"), inArray(workspaceMembers.role, ["owner", "admin", "reviewer"]))).limit(1);
      if (!reviewer) return Response.json({ error: "O profissional escolhido não está apto a revisar." }, { status: 409 });
      const now = new Date().toISOString();
      const dueIso = dueAt?.toISOString() ?? null;
      const body = `Revisão atribuída a ${reviewer.name}${dueIso ? ` com prazo em ${new Date(dueIso).toLocaleDateString("pt-BR")}` : " sem prazo definido"}.`;
      const results = await env.DB.batch([
        env.DB.prepare("UPDATE scenario_review_rounds SET assigned_reviewer_user_id = ?, due_at = ?, updated_at = ? WHERE id = ? AND workspace_id = ? AND status = 'pending' AND updated_at = ?").bind(reviewerUserId, dueIso, now, round.id, workspace.id, round.updatedAt),
        env.DB.prepare("INSERT INTO scenario_review_comments (review_round_id, workspace_id, scenario_id, author_user_id, kind, body) SELECT id, workspace_id, scenario_id, ?, 'assignment', ? FROM scenario_review_rounds WHERE id = ? AND assigned_reviewer_user_id = ? AND updated_at = ?").bind(user.id, body, round.id, reviewerUserId, now),
        env.DB.prepare("INSERT INTO audit_events (owner_user_id, company_id, scenario_id, event_type, event_data) SELECT ?, company_id, scenario_id, 'scenario.review_assigned', ? FROM scenario_review_rounds WHERE id = ? AND assigned_reviewer_user_id = ? AND updated_at = ?").bind(workspace.ownerUserId, JSON.stringify({ actorUserId: user.id, reviewerUserId, dueAt: dueIso }), round.id, reviewerUserId, now),
      ]);
      if (results[0].meta.changes !== 1) return Response.json({ error: "A revisão mudou enquanto você trabalhava. Atualize a fila." }, { status: 409 });
      return Response.json({ review: { id: round.id, assignedReviewerUserId: reviewerUserId, assigneeName: reviewer.name, dueAt: dueIso, updatedAt: now } });
    }

    if (action === "decide") {
      const decision = payload.decision === "changes_requested" ? "changes_requested" : payload.decision === "rejected" ? "rejected" : null;
      const note = typeof payload.note === "string" ? payload.note.trim().slice(0, 1000) : "";
      if (!decision || note.length < 10) return Response.json({ error: "Registre uma justificativa com pelo menos 10 caracteres." }, { status: 400 });
      if (!canReviewScenarios(workspace.role) || round.assignedReviewerUserId !== user.id || round.preparedByUserId === user.id) return Response.json({ error: "Somente o revisor designado, diferente do preparador, pode decidir." }, { status: 403 });
      if (round.status !== "pending" || scenario.reviewStatus !== "ready_for_review") return Response.json({ error: "Esta revisão já recebeu uma decisão." }, { status: 409 });
      const now = new Date().toISOString();
      const eventType = decision === "changes_requested" ? "scenario.review_changes_requested" : "scenario.review_rejected";
      const results = await env.DB.batch([
        env.DB.prepare("UPDATE scenario_review_rounds SET status = ?, decision_by_user_id = ?, decision_note = ?, decided_at = ?, updated_at = ? WHERE id = ? AND workspace_id = ? AND status = 'pending' AND assigned_reviewer_user_id = ? AND prepared_by_user_id <> ?").bind(decision, user.id, note, now, now, round.id, workspace.id, user.id, user.id),
        env.DB.prepare("UPDATE scenarios SET review_status = ? WHERE id = ? AND review_status = 'ready_for_review' AND EXISTS (SELECT 1 FROM scenario_review_rounds WHERE id = ? AND status = ? AND decision_by_user_id = ? AND decided_at = ?)").bind(decision, scenario.id, round.id, decision, user.id, now),
        env.DB.prepare("INSERT INTO scenario_review_comments (review_round_id, workspace_id, scenario_id, author_user_id, kind, body) SELECT id, workspace_id, scenario_id, ?, ?, ? FROM scenario_review_rounds WHERE id = ? AND status = ? AND decision_by_user_id = ? AND decided_at = ?").bind(user.id, decision, note, round.id, decision, user.id, now),
        env.DB.prepare("INSERT INTO audit_events (owner_user_id, company_id, scenario_id, event_type, event_data) SELECT ?, company_id, scenario_id, ?, ? FROM scenario_review_rounds WHERE id = ? AND status = ? AND decision_by_user_id = ? AND decided_at = ?").bind(workspace.ownerUserId, eventType, JSON.stringify({ reviewerUserId: user.id, reviewRoundId: round.id, note }), round.id, decision, user.id, now),
      ]);
      if (results[0].meta.changes !== 1 || results[1].meta.changes !== 1) return Response.json({ error: "A revisão mudou enquanto você decidia. Atualize a fila." }, { status: 409 });
      return Response.json({ review: { id: round.id, status: decision, decisionByUserId: user.id, decisionByName: user.name, decisionNote: note, decidedAt: now, updatedAt: now }, scenario: { id: scenario.id, reviewStatus: decision } });
    }

    return Response.json({ error: "Ação de revisão inválida." }, { status: 400 });
  } catch {
    return Response.json({ error: "Não foi possível atualizar a revisão." }, { status: 500 });
  }
}

export const GET = withApiTelemetry("GET /api/reviews", listReviews);
export const POST = withApiTelemetry("POST /api/reviews", mutateReview);

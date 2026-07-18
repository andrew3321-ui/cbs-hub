import { env } from "cloudflare:workers";
import { and, eq, inArray } from "drizzle-orm";
import type { FiscalDossierSnapshot } from "../../../../domain/fiscal-dossier";
import { ensureScenarioSchema, getDb } from "../../../../db";
import { fiscalDossiers, users, workspaceMembers } from "../../../../db/schema";
import { withApiTelemetry } from "../../../api-infrastructure";
import { getCurrentUser } from "../../../auth";
import { normalizeProfessionalRegistration, professionalRegistrationError } from "../../../professional-registration";
import { withWorkspaceFeature } from "../../../plan-entitlements";
import { canPrepareScenarios, canReviewScenarios, getWorkspaceContext, sha256Hex } from "../../../workspace";

const MAX_REVIEW_WINDOW_MS = 90 * 86_400_000;

function parseSnapshot(value: string) {
  try {
    return JSON.parse(value) as FiscalDossierSnapshot;
  } catch {
    return null;
  }
}

async function reviewFiscalDossier(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para movimentar a homologação." }, { status: 401 });
  let payload: Record<string, unknown>;
  try {
    payload = await request.json() as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Envie uma ação de homologação válida." }, { status: 400 });
  }
  const dossierId = typeof payload.dossierId === "string" ? payload.dossierId : "";
  const action = typeof payload.action === "string" ? payload.action : "";
  if (!dossierId || !["submit", "approve", "changes_requested", "reject"].includes(action)) return Response.json({ error: "Ação de homologação inválida." }, { status: 400 });
  try {
    await ensureScenarioSchema();
    const workspace = await getWorkspaceContext(user.id);
    if (!workspace) return Response.json({ error: "Espaço contábil não encontrado." }, { status: 403 });
    const db = getDb();
    const [dossier] = await db.select().from(fiscalDossiers).where(and(eq(fiscalDossiers.id, dossierId), eq(fiscalDossiers.workspaceId, workspace.id))).limit(1);
    if (!dossier) return Response.json({ error: "Dossiê fiscal não encontrado." }, { status: 404 });
    const snapshot = parseSnapshot(dossier.snapshotJson);
    if (!snapshot || await sha256Hex(dossier.snapshotJson) !== dossier.inputHash) return Response.json({ error: "A integridade do snapshot falhou. O dossiê foi bloqueado." }, { status: 409 });
    const now = new Date().toISOString();

    if (action === "submit") {
      if (!canPrepareScenarios(workspace.role)) return Response.json({ error: "Seu papel não permite enviar dossiês para homologação." }, { status: 403 });
      if (dossier.status !== "draft") return Response.json({ error: "Somente um rascunho pode iniciar a homologação." }, { status: 409 });
      if (snapshot.calculation.status !== "calculated_conditional" || !snapshot.assurance.factsComplete || !snapshot.assurance.ratesConfirmed || snapshot.calculation.blockers.length) return Response.json({ error: "Resolva todos os bloqueios antes de solicitar homologação." }, { status: 409 });
      let reviewerUserId = user.id;
      let dueAt: string | null = null;
      let reviewerName = user.name;
      if (workspace.type === "office") {
        reviewerUserId = Number(payload.reviewerUserId);
        const dueAtValue = typeof payload.dueAt === "string" ? payload.dueAt : "";
        const due = new Date(dueAtValue);
        if (!Number.isInteger(reviewerUserId) || reviewerUserId <= 0 || reviewerUserId === dossier.createdByUserId || !dueAtValue || !Number.isFinite(due.getTime()) || due.getTime() <= Date.now() || due.getTime() > Date.now() + MAX_REVIEW_WINDOW_MS) return Response.json({ error: "Escolha outro profissional como revisor e um prazo futuro de até 90 dias." }, { status: 400 });
        const [reviewer] = await db.select({ name: users.name }).from(workspaceMembers).innerJoin(users, eq(workspaceMembers.userId, users.id)).where(and(eq(workspaceMembers.workspaceId, workspace.id), eq(workspaceMembers.userId, reviewerUserId), eq(workspaceMembers.status, "active"), inArray(workspaceMembers.role, ["owner", "admin", "reviewer"]))).limit(1);
        if (!reviewer) return Response.json({ error: "O profissional escolhido não está apto a revisar." }, { status: 409 });
        dueAt = due.toISOString();
        reviewerName = reviewer.name;
      }
      const results = await env.DB.batch([
        env.DB.prepare("UPDATE fiscal_dossiers SET status = 'ready_for_review', assigned_reviewer_user_id = ?, due_at = ?, updated_at = ? WHERE id = ? AND workspace_id = ? AND status = 'draft'").bind(reviewerUserId, dueAt, now, dossier.id, workspace.id),
        env.DB.prepare("INSERT INTO fiscal_dossier_events (dossier_id, workspace_id, actor_user_id, event_type, note, event_data, created_at) SELECT id, workspace_id, ?, 'fiscal_dossier.review_requested', ?, ?, ? FROM fiscal_dossiers WHERE id = ? AND workspace_id = ? AND status = 'ready_for_review' AND updated_at = ?").bind(user.id, workspace.type === "office" ? `Homologação solicitada a ${reviewerName}.` : "Autorrevisão profissional iniciada.", JSON.stringify({ reviewerUserId, reviewerName, dueAt, assurance: workspace.type === "office" ? "independent_internal_review" : "professional_self_review" }), now, dossier.id, workspace.id, now),
      ]);
      if (results[0].meta.changes !== 1 || results[1].meta.changes !== 1) return Response.json({ error: "O dossiê mudou enquanto era enviado. Atualize a fila." }, { status: 409 });
      return Response.json({ dossier: { id: dossier.id, status: "ready_for_review", assignedReviewerUserId: reviewerUserId, dueAt } });
    }

    if (!canReviewScenarios(workspace.role)) return Response.json({ error: "Seu papel não permite decidir a homologação." }, { status: 403 });
    if (dossier.status !== "ready_for_review") return Response.json({ error: "Este dossiê não está aguardando homologação." }, { status: 409 });
    if (dossier.assignedReviewerUserId !== user.id) return Response.json({ error: "A homologação está atribuída a outro profissional." }, { status: 403 });
    if (workspace.type === "office" && dossier.createdByUserId === user.id) return Response.json({ error: "No modo escritório, o preparador não pode homologar o próprio dossiê." }, { status: 409 });
    const note = typeof payload.note === "string" ? payload.note.trim().slice(0, 1500) : "";
    if (note.length < 10) return Response.json({ error: "Registre uma justificativa técnica com pelo menos 10 caracteres." }, { status: 400 });
    const nextStatus = action === "approve" ? "approved" : action === "reject" ? "rejected" : "changes_requested";
    let registration: string | null = null;
    if (action === "approve") {
      if (payload.acknowledged !== true) return Response.json({ error: "Confirme a revisão das premissas, fontes e memória de cálculo." }, { status: 400 });
      const providedRegistration = typeof payload.professionalRegistration === "string" ? payload.professionalRegistration : "";
      const registrationError = professionalRegistrationError(providedRegistration);
      if (registrationError) return Response.json({ error: registrationError }, { status: 400 });
      registration = normalizeProfessionalRegistration(providedRegistration);
    }
    const eventType = `fiscal_dossier.${nextStatus}`;
    const results = await env.DB.batch([
      env.DB.prepare("UPDATE fiscal_dossiers SET status = ?, decision_by_user_id = ?, professional_registration = ?, review_note = ?, decided_at = ?, updated_at = ? WHERE id = ? AND workspace_id = ? AND status = 'ready_for_review' AND assigned_reviewer_user_id = ?").bind(nextStatus, user.id, registration, note, now, now, dossier.id, workspace.id, user.id),
      env.DB.prepare("INSERT INTO fiscal_dossier_events (dossier_id, workspace_id, actor_user_id, event_type, note, event_data, created_at) SELECT id, workspace_id, ?, ?, ?, ?, ? FROM fiscal_dossiers WHERE id = ? AND workspace_id = ? AND status = ? AND updated_at = ?").bind(user.id, eventType, note, JSON.stringify({ decision: nextStatus, professionalRegistration: registration, credentialVerification: registration ? "self_declared" : "not_applicable", inputHash: dossier.inputHash }), now, dossier.id, workspace.id, nextStatus, now),
    ]);
    if (results[0].meta.changes !== 1 || results[1].meta.changes !== 1) return Response.json({ error: "O dossiê mudou enquanto a decisão era registrada. Atualize a fila." }, { status: 409 });
    return Response.json({ dossier: { id: dossier.id, status: nextStatus, decisionByUserId: user.id, decidedAt: now } });
  } catch {
    return Response.json({ error: "Não foi possível registrar a homologação com segurança." }, { status: 500 });
  }
}

export const POST = withApiTelemetry("POST /api/fiscal-dossiers/review", withWorkspaceFeature("professionalGovernanceEnabled", reviewFiscalDossier));

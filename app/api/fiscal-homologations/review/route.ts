import { env } from "cloudflare:workers";
import { and, eq, inArray } from "drizzle-orm";
import {
  expectedOutcomeFromHomologation,
  hashFiscalHomologationText,
  parseFiscalHomologationSnapshot,
} from "../../../../domain/fiscal-homologation";
import { FISCAL_HOMOLOGATION_SIGNATURE_VERSION } from "../../../../domain/fiscal-homologation-signing";
import { ensureScenarioSchema, getDb } from "../../../../db";
import { fiscalHomologationCases, users, workspaceMembers } from "../../../../db/schema";
import { withApiTelemetry } from "../../../api-infrastructure";
import { getCurrentUser } from "../../../auth";
import { homologationDecisionRecord } from "../../../fiscal-homologation-service";
import { signFiscalHomologationDecision } from "../../../fiscal-homologation-signing";
import { loadFiscalKnowledgeBase } from "../../../fiscal-intelligence-service";
import { normalizeProfessionalRegistration, professionalRegistrationError } from "../../../professional-registration";
import { canPrepareScenarios, canReviewScenarios, getWorkspaceContext } from "../../../workspace";

const MAX_REVIEW_WINDOW_MS = 90 * 86_400_000;

async function reviewFiscalHomologation(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para movimentar a homologação." }, { status: 401 });
  let payload: Record<string, unknown>;
  try {
    payload = await request.json() as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Envie uma ação de homologação válida." }, { status: 400 });
  }
  const caseId = typeof payload.caseId === "string" ? payload.caseId : "";
  const action = typeof payload.action === "string" ? payload.action : "";
  if (!caseId || !["submit", "approve", "changes_requested", "reject"].includes(action)) return Response.json({ error: "Ação de homologação inválida." }, { status: 400 });

  try {
    await ensureScenarioSchema();
    const workspace = await getWorkspaceContext(user.id);
    if (!workspace) return Response.json({ error: "Espaço contábil não encontrado." }, { status: 403 });
    const db = getDb();
    const [caseRow] = await db.select().from(fiscalHomologationCases)
      .where(and(eq(fiscalHomologationCases.id, caseId), eq(fiscalHomologationCases.workspaceId, workspace.id)))
      .limit(1);
    if (!caseRow) return Response.json({ error: "Caso de homologação não encontrado." }, { status: 404 });
    const snapshot = parseFiscalHomologationSnapshot(caseRow.snapshotJson);
    if (!snapshot || await hashFiscalHomologationText(caseRow.snapshotJson) !== caseRow.snapshotHash) return Response.json({ error: "A integridade do snapshot falhou. O caso foi bloqueado." }, { status: 409 });
    const { stored } = await loadFiscalKnowledgeBase();
    if (caseRow.baseHash !== stored.contentHash || snapshot.evidence.baseHash !== stored.contentHash) return Response.json({ error: "A base fiscal mudou. Reavalie a consulta e crie uma nova versão do caso." }, { status: 409 });
    const now = new Date().toISOString();

    if (action === "submit") {
      if (!canPrepareScenarios(workspace.role)) return Response.json({ error: "Seu papel não permite enviar casos para homologação." }, { status: 403 });
      if (caseRow.status !== "draft") return Response.json({ error: "Somente um rascunho pode iniciar a homologação." }, { status: 409 });
      let reviewerUserId = user.id;
      let reviewerName = user.name;
      let dueAt: string | null = null;
      if (workspace.type === "office") {
        reviewerUserId = Number(payload.reviewerUserId);
        const dueAtValue = typeof payload.dueAt === "string" ? payload.dueAt : "";
        const due = new Date(dueAtValue);
        if (!Number.isInteger(reviewerUserId) || reviewerUserId <= 0 || reviewerUserId === caseRow.createdByUserId || !dueAtValue || !Number.isFinite(due.getTime()) || due.getTime() <= Date.now() || due.getTime() > Date.now() + MAX_REVIEW_WINDOW_MS) return Response.json({ error: "Escolha outro profissional como revisor e um prazo futuro de até 90 dias." }, { status: 400 });
        const [reviewer] = await db.select({ name: users.name }).from(workspaceMembers)
          .innerJoin(users, eq(workspaceMembers.userId, users.id))
          .where(and(
            eq(workspaceMembers.workspaceId, workspace.id),
            eq(workspaceMembers.userId, reviewerUserId),
            eq(workspaceMembers.status, "active"),
            inArray(workspaceMembers.role, ["owner", "admin", "reviewer"]),
          )).limit(1);
        if (!reviewer) return Response.json({ error: "O profissional escolhido não está apto a revisar." }, { status: 409 });
        reviewerName = reviewer.name;
        dueAt = due.toISOString();
      }
      const eventData = JSON.stringify({ reviewerUserId, reviewerName, dueAt, reviewMode: workspace.type === "office" ? "independent_internal_review" : "professional_self_review", snapshotHash: caseRow.snapshotHash, baseHash: caseRow.baseHash });
      const results = await env.DB.batch([
        env.DB.prepare("UPDATE fiscal_homologation_cases SET status = 'ready_for_review', assigned_reviewer_user_id = ?, due_at = ?, updated_at = ? WHERE id = ? AND workspace_id = ? AND status = 'draft'")
          .bind(reviewerUserId, dueAt, now, caseRow.id, workspace.id),
        env.DB.prepare("INSERT INTO fiscal_homologation_events (case_id, workspace_id, actor_user_id, event_type, note, event_data, created_at) SELECT id, workspace_id, ?, 'fiscal_homologation.review_requested', ?, ?, ? FROM fiscal_homologation_cases WHERE id = ? AND workspace_id = ? AND status = 'ready_for_review' AND updated_at = ?")
          .bind(user.id, workspace.type === "office" ? `Revisão independente solicitada a ${reviewerName}.` : "Autorrevisão profissional iniciada.", eventData, now, caseRow.id, workspace.id, now),
      ]);
      if (results[0].meta.changes !== 1 || results[1].meta.changes !== 1) return Response.json({ error: "O caso mudou enquanto era enviado. Atualize a fila." }, { status: 409 });
      return Response.json({ case: { id: caseRow.id, status: "ready_for_review", assignedReviewerUserId: reviewerUserId, dueAt } });
    }

    if (!canReviewScenarios(workspace.role)) return Response.json({ error: "Seu papel não permite decidir a homologação." }, { status: 403 });
    if (caseRow.status !== "ready_for_review") return Response.json({ error: "Este caso não está aguardando homologação." }, { status: 409 });
    if (caseRow.assignedReviewerUserId !== user.id) return Response.json({ error: "A homologação está atribuída a outro profissional." }, { status: 403 });
    if (workspace.type === "office" && caseRow.createdByUserId === user.id) return Response.json({ error: "No modo escritório, o preparador não pode homologar o próprio caso." }, { status: 409 });

    const note = typeof payload.note === "string" ? payload.note.trim().slice(0, 1500) : "";
    const independentConclusion = typeof payload.independentConclusion === "string" ? payload.independentConclusion.trim().slice(0, 2000) : "";
    const comparisonOutcome = typeof payload.comparisonOutcome === "string" ? payload.comparisonOutcome : "";
    if (note.length < 20 || independentConclusion.length < 20) return Response.json({ error: "Registre conclusão independente e justificativa técnica com pelo menos 20 caracteres cada." }, { status: 400 });
    if (!["matches", "partially_matches", "diverges"].includes(comparisonOutcome)) return Response.json({ error: "Informe o resultado da comparação independente." }, { status: 400 });
    const nextStatus = action === "approve" ? "approved" : action === "reject" ? "rejected" : "changes_requested";

    let registration: string | null = null;
    let expectedJson = "{}";
    let signature: string | null = null;
    let signatureVersion: string | null = null;
    let assuranceLevel = "engine_verified";
    if (action === "approve") {
      if (comparisonOutcome !== "matches") return Response.json({ error: "Uma divergência não pode ser aprovada. Solicite ajustes ou rejeite o caso." }, { status: 409 });
      if (payload.acknowledged !== true || payload.sourcesConfirmed !== true || payload.independentlyChecked !== true) return Response.json({ error: "Confirme as fontes, o cálculo independente e a responsabilidade profissional." }, { status: 400 });
      const providedRegistration = typeof payload.professionalRegistration === "string" ? payload.professionalRegistration : "";
      const registrationError = professionalRegistrationError(providedRegistration);
      if (registrationError) return Response.json({ error: registrationError }, { status: 400 });
      registration = normalizeProfessionalRegistration(providedRegistration);
      expectedJson = JSON.stringify(expectedOutcomeFromHomologation(snapshot));
      const unsignedRow = {
        ...caseRow,
        decisionByUserId: user.id,
        professionalRegistration: registration,
        comparisonOutcome: "matches",
        expectedJson,
        decidedAt: now,
      };
      const record = homologationDecisionRecord(unsignedRow);
      if (!record) return Response.json({ error: "Não foi possível construir o registro assinado da decisão." }, { status: 409 });
      signature = await signFiscalHomologationDecision(record);
      signatureVersion = FISCAL_HOMOLOGATION_SIGNATURE_VERSION;
      assuranceLevel = "professionally_homologated";
    }

    const eventData = JSON.stringify({ decision: nextStatus, comparisonOutcome, professionalRegistration: registration, credentialVerification: registration ? "self_declared" : "not_applicable", snapshotHash: caseRow.snapshotHash, baseHash: caseRow.baseHash, signatureVersion });
    const results = await env.DB.batch([
      env.DB.prepare("UPDATE fiscal_homologation_cases SET status = ?, assurance_level = ?, decision_by_user_id = ?, expected_json = ?, comparison_outcome = ?, independent_conclusion = ?, professional_registration = ?, review_note = ?, decided_at = ?, signature_version = ?, decision_signature = ?, updated_at = ? WHERE id = ? AND workspace_id = ? AND status = 'ready_for_review' AND assigned_reviewer_user_id = ?")
        .bind(nextStatus, assuranceLevel, user.id, expectedJson, comparisonOutcome, independentConclusion, registration, note, now, signatureVersion, signature, now, caseRow.id, workspace.id, user.id),
      env.DB.prepare("INSERT INTO fiscal_homologation_events (case_id, workspace_id, actor_user_id, event_type, note, event_data, created_at) SELECT id, workspace_id, ?, ?, ?, ?, ? FROM fiscal_homologation_cases WHERE id = ? AND workspace_id = ? AND status = ? AND updated_at = ?")
        .bind(user.id, `fiscal_homologation.${nextStatus}`, note, eventData, now, caseRow.id, workspace.id, nextStatus, now),
    ]);
    if (results[0].meta.changes !== 1 || results[1].meta.changes !== 1) return Response.json({ error: "O caso mudou enquanto a decisão era registrada. Atualize a fila." }, { status: 409 });
    return Response.json({ case: { id: caseRow.id, status: nextStatus, decisionByUserId: user.id, decidedAt: now, assuranceLevel } });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "";
    if (message.includes("signing_key_unavailable")) return Response.json({ error: "A assinatura digital está indisponível; nenhuma aprovação foi gravada." }, { status: 503 });
    return Response.json({ error: "Não foi possível registrar a homologação com segurança." }, { status: 500 });
  }
}

export const POST = withApiTelemetry("POST /api/fiscal-homologations/review", reviewFiscalHomologation);

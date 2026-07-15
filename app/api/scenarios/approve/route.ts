import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import { ensureScenarioSchema, getDb } from "../../../../db";
import { auditEvents, companies, scenarioApprovals, scenarioReviewRounds, scenarios } from "../../../../db/schema";
import {
  approvalRecordFromStored,
  OFFICE_SECOND_REVIEW_DECLARATION_VERSION,
  RESPONSIBLE_REVIEW_DECLARATION_VERSION,
  SCENARIO_APPROVAL_SIGNATURE_VERSION,
  type ScenarioApprovalSignedRecord,
} from "../../../scenario-approval-core";
import { getCurrentUser } from "../../../auth";
import { signScenarioApprovalRecord, signedRecordFromScenario, verifyScenarioApprovalRecord, verifyScenarioRecord } from "../../../scenario-signing";
import { withApiTelemetry } from "../../../api-infrastructure";
import { normalizeProfessionalRegistration, professionalRegistrationError } from "../../../professional-registration";
import { canReviewScenarios, getWorkspaceContext } from "../../../workspace";

function publicApproval(approval: typeof scenarioApprovals.$inferSelect) {
  return {
    id: approval.id,
    reviewerName: approval.reviewerName,
    professionalRegistration: approval.professionalRegistration,
    assuranceLevel: approval.assuranceLevel,
    credentialVerification: approval.credentialVerification,
    decision: approval.decision,
    decisionNote: approval.decisionNote,
    declarationVersion: approval.declarationVersion,
    decidedAt: approval.decidedAt,
    integrityStatus: "verified" as const,
  };
}

async function approveAsResponsible(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para concluir a revisão responsável." }, { status: 401 });

  try {
    await ensureScenarioSchema();
    const workspace = await getWorkspaceContext(user.id);
    if (!workspace) return Response.json({ error: "Espaço profissional não encontrado." }, { status: 403 });
    const payload = (await request.json()) as Record<string, unknown>;
    const scenarioId = Number(payload.scenarioId);
    const acknowledged = payload.acknowledged === true;
    const professionalRegistration = typeof payload.professionalRegistration === "string" ? normalizeProfessionalRegistration(payload.professionalRegistration) : "";
    const registrationError = professionalRegistrationError(professionalRegistration);
    const decisionNote = typeof payload.decisionNote === "string" ? payload.decisionNote.trim().slice(0, 400) : "";

    if (
      !Number.isInteger(scenarioId) ||
      scenarioId <= 0 ||
      !acknowledged ||
      registrationError
    ) {
      return Response.json({ error: !acknowledged ? "Confirme a declaração de responsabilidade para assinar." : registrationError ?? "Revise os dados da aprovação." }, { status: 400 });
    }

    const db = getDb();
    const [owned] = await db
      .select({ scenario: scenarios, approval: scenarioApprovals })
      .from(scenarios)
      .innerJoin(companies, eq(scenarios.companyId, companies.id))
      .leftJoin(scenarioApprovals, eq(scenarioApprovals.scenarioId, scenarios.id))
      .where(and(eq(scenarios.id, scenarioId), eq(companies.workspaceId, workspace.id)))
      .limit(1);
    if (!owned?.scenario) return Response.json({ error: "Cenário não encontrado." }, { status: 404 });

    const scenario = owned.scenario;
    const signedScenario = signedRecordFromScenario(scenario, workspace.ownerUserId);
    if (
      !signedScenario ||
      !scenario.inputHash ||
      !scenario.recordSignature ||
      !(await verifyScenarioRecord(signedScenario, scenario.recordSignature, scenario.signatureVersion))
    ) {
      return Response.json({ error: "A integridade deste cenário não confere. A aprovação foi bloqueada." }, { status: 409 });
    }

    if (owned.approval) {
      const existingRecord = approvalRecordFromStored(owned.approval);
      const valid = existingRecord && await verifyScenarioApprovalRecord(existingRecord, owned.approval.approvalSignature, owned.approval.signatureVersion);
      if (!valid) return Response.json({ error: "O registro de aprovação existente não passou na verificação de integridade." }, { status: 409 });
      if (scenario.reviewStatus === "ready_for_review") await db.update(scenarios).set({ reviewStatus: "responsible_approved" }).where(eq(scenarios.id, scenario.id));
      return Response.json({ scenario: { id: scenario.id, reviewStatus: scenario.reviewStatus === "delivered" ? "delivered" : "responsible_approved", approval: publicApproval(owned.approval) } });
    }

    if (scenario.reviewStatus !== "ready_for_review") {
      return Response.json({ error: "Envie o cenário para revisão interna antes de aprová-lo." }, { status: 409 });
    }
    if (workspace.type === "office") {
      if (!canReviewScenarios(workspace.role)) return Response.json({ error: "Seu papel no escritório não permite aprovar revisões." }, { status: 403 });
      if (!scenario.preparedByUserId || scenario.preparedByUserId === user.id) return Response.json({ error: "No modo escritório, quem preparou a versão não pode aprová-la. Peça a outro revisor da equipe." }, { status: 409 });
      const [activeRound] = await db.select().from(scenarioReviewRounds).where(and(eq(scenarioReviewRounds.scenarioId, scenario.id), eq(scenarioReviewRounds.workspaceId, workspace.id))).limit(1);
      if (!activeRound || activeRound.status !== "pending" || activeRound.assignedReviewerUserId !== user.id) return Response.json({ error: "Somente o revisor designado na Central de Revisão pode aprovar esta versão." }, { status: 403 });
    }

    const decidedAt = new Date().toISOString();
    const officeSecondReview = workspace.type === "office";
    const approvalRecord: ScenarioApprovalSignedRecord = {
      scenarioId: scenario.id,
      companyId: scenario.companyId,
      ownerUserId: workspace.ownerUserId,
      reviewerUserId: user.id,
      reviewerName: user.name,
      reviewerEmail: user.email,
      professionalRegistration,
      assuranceLevel: officeSecondReview ? "office_second_person_review" : "responsible_self_review",
      credentialVerification: "self_declared",
      decision: "approved",
      declarationVersion: officeSecondReview ? OFFICE_SECOND_REVIEW_DECLARATION_VERSION : RESPONSIBLE_REVIEW_DECLARATION_VERSION,
      scenarioInputHash: scenario.inputHash,
      scenarioRecordSignature: scenario.recordSignature,
      decisionNote,
      decidedAt,
    };
    const approvalSignature = await signScenarioApprovalRecord(approvalRecord);
    if (officeSecondReview) {
      const eventData = JSON.stringify({
        assuranceLevel: approvalRecord.assuranceLevel,
        credentialVerification: approvalRecord.credentialVerification,
        declarationVersion: approvalRecord.declarationVersion,
        preparedByUserId: scenario.preparedByUserId,
        reviewerUserId: user.id,
        inputHash: scenario.inputHash,
        calculationVersion: scenario.calculationVersion,
      });
      const results = await env.DB.batch([
        env.DB.prepare("INSERT INTO scenario_approvals (scenario_id, company_id, owner_user_id, reviewer_user_id, reviewer_name, reviewer_email, professional_registration, assurance_level, credential_verification, decision, declaration_version, scenario_input_hash, scenario_record_signature, decision_note, signature_version, approval_signature, decided_at) SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM scenario_review_rounds WHERE scenario_id = ? AND workspace_id = ? AND status = 'pending' AND assigned_reviewer_user_id = ? AND prepared_by_user_id <> ?) AND EXISTS (SELECT 1 FROM scenarios WHERE id = ? AND review_status = 'ready_for_review')").bind(approvalRecord.scenarioId, approvalRecord.companyId, approvalRecord.ownerUserId, approvalRecord.reviewerUserId, approvalRecord.reviewerName, approvalRecord.reviewerEmail, approvalRecord.professionalRegistration, approvalRecord.assuranceLevel, approvalRecord.credentialVerification, approvalRecord.decision, approvalRecord.declarationVersion, approvalRecord.scenarioInputHash, approvalRecord.scenarioRecordSignature, approvalRecord.decisionNote, SCENARIO_APPROVAL_SIGNATURE_VERSION, approvalSignature, decidedAt, scenario.id, workspace.id, user.id, user.id, scenario.id),
        env.DB.prepare("UPDATE scenarios SET review_status = 'responsible_approved' WHERE id = ? AND review_status = 'ready_for_review' AND EXISTS (SELECT 1 FROM scenario_approvals WHERE scenario_id = ? AND reviewer_user_id = ? AND decided_at = ?)").bind(scenario.id, scenario.id, user.id, decidedAt),
        env.DB.prepare("UPDATE scenario_review_rounds SET status = 'approved', decision_by_user_id = ?, decision_note = ?, decided_at = ?, updated_at = ? WHERE scenario_id = ? AND workspace_id = ? AND status = 'pending' AND assigned_reviewer_user_id = ? AND prepared_by_user_id <> ? AND EXISTS (SELECT 1 FROM scenarios WHERE id = ? AND review_status = 'responsible_approved')").bind(user.id, decisionNote, decidedAt, decidedAt, scenario.id, workspace.id, user.id, user.id, scenario.id),
        env.DB.prepare("INSERT INTO scenario_review_comments (review_round_id, workspace_id, scenario_id, author_user_id, kind, body, created_at) SELECT id, workspace_id, scenario_id, ?, 'approved', ?, ? FROM scenario_review_rounds WHERE scenario_id = ? AND status = 'approved' AND decision_by_user_id = ? AND decided_at = ?").bind(user.id, decisionNote || "Versão aprovada e assinada pelo segundo revisor.", decidedAt, scenario.id, user.id, decidedAt),
        env.DB.prepare("INSERT INTO audit_events (owner_user_id, company_id, scenario_id, event_type, event_data, created_at) SELECT owner_user_id, company_id, scenario_id, 'scenario.office_second_review_approved', ?, ? FROM scenario_review_rounds WHERE scenario_id = ? AND status = 'approved' AND decision_by_user_id = ? AND decided_at = ?").bind(eventData, decidedAt, scenario.id, user.id, decidedAt),
      ]);
      if (results[0].meta.changes !== 1 || results[1].meta.changes !== 1 || results[2].meta.changes !== 1) return Response.json({ error: "A revisão recebeu outra decisão enquanto você aprovava. Atualize a Central de Revisão." }, { status: 409 });
      const [approval] = await db.select().from(scenarioApprovals).where(eq(scenarioApprovals.scenarioId, scenario.id)).limit(1);
      if (!approval) throw new Error("scenario_approval_insert_failed");
      const storedRecord = approvalRecordFromStored(approval);
      if (!storedRecord || !(await verifyScenarioApprovalRecord(storedRecord, approval.approvalSignature, approval.signatureVersion))) throw new Error("scenario_approval_verification_failed");
      return Response.json({ scenario: { id: scenario.id, reviewStatus: "responsible_approved", approval: publicApproval(approval) } }, { status: 201 });
    }
    const [approvalRows] = await db.batch([
      db.insert(scenarioApprovals).values({
        ...approvalRecord,
        signatureVersion: SCENARIO_APPROVAL_SIGNATURE_VERSION,
        approvalSignature,
      }).returning(),
      db.update(scenarios).set({ reviewStatus: "responsible_approved" }).where(and(eq(scenarios.id, scenario.id), eq(scenarios.reviewStatus, "ready_for_review"))),
      db.insert(auditEvents).values({
        ownerUserId: workspace.ownerUserId,
        companyId: scenario.companyId,
        scenarioId: scenario.id,
        eventType: "scenario.responsible_approved",
        eventData: JSON.stringify({
          assuranceLevel: approvalRecord.assuranceLevel,
          credentialVerification: approvalRecord.credentialVerification,
          declarationVersion: approvalRecord.declarationVersion,
          preparedByUserId: scenario.preparedByUserId,
          reviewerUserId: user.id,
          inputHash: scenario.inputHash,
          calculationVersion: scenario.calculationVersion,
        }),
      }),
    ]);
    const approval = approvalRows[0];
    if (!approval) throw new Error("scenario_approval_insert_failed");
    const storedRecord = approvalRecordFromStored(approval);
    if (!storedRecord || !(await verifyScenarioApprovalRecord(storedRecord, approval.approvalSignature, approval.signatureVersion))) throw new Error("scenario_approval_verification_failed");

    return Response.json({ scenario: { id: scenario.id, reviewStatus: "responsible_approved", approval: publicApproval(approval) } }, { status: 201 });
  } catch (error) {
    if (String(error).toLowerCase().includes("unique")) return Response.json({ error: "Este cenário já possui uma aprovação registrada. Atualize a página." }, { status: 409 });
    if (error instanceof Error && error.message === "scenario_signing_key_unavailable") return Response.json({ error: "A assinatura da aprovação está temporariamente indisponível." }, { status: 503 });
    if (error instanceof Error && error.message === "scenario_approval_verification_failed") return Response.json({ error: "A aprovação foi registrada, mas a assinatura não pôde ser confirmada. A entrega continua bloqueada." }, { status: 409 });
    return Response.json({ error: "Não foi possível concluir a revisão responsável." }, { status: 500 });
  }
}

export const POST = withApiTelemetry("POST /api/scenarios/approve", approveAsResponsible);

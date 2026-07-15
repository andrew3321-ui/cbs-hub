import { and, eq } from "drizzle-orm";
import { ensureScenarioSchema, getDb } from "../../../../db";
import { auditEvents, companies, scenarioApprovals, scenarios } from "../../../../db/schema";
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
    const professionalRegistration = typeof payload.professionalRegistration === "string"
      ? payload.professionalRegistration.trim().replace(/\s+/g, " ").toUpperCase().slice(0, 40)
      : "";
    const decisionNote = typeof payload.decisionNote === "string" ? payload.decisionNote.trim().slice(0, 400) : "";

    if (
      !Number.isInteger(scenarioId) ||
      scenarioId <= 0 ||
      !acknowledged ||
      professionalRegistration.length < 4 ||
      !/[A-Z]/.test(professionalRegistration) ||
      !/\d/.test(professionalRegistration) ||
      !/^[A-Z0-9 ./-]+$/.test(professionalRegistration)
    ) {
      return Response.json({ error: "Confirme a declaração e informe seu registro profissional." }, { status: 400 });
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
        eventType: officeSecondReview ? "scenario.office_second_review_approved" : "scenario.responsible_approved",
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

    return Response.json({ scenario: { id: scenario.id, reviewStatus: "responsible_approved", approval: publicApproval(approval) } }, { status: 201 });
  } catch (error) {
    if (String(error).toLowerCase().includes("unique")) return Response.json({ error: "Este cenário já possui uma aprovação registrada. Atualize a página." }, { status: 409 });
    if (error instanceof Error && error.message === "scenario_signing_key_unavailable") return Response.json({ error: "A assinatura da aprovação está temporariamente indisponível." }, { status: 503 });
    return Response.json({ error: "Não foi possível concluir a revisão responsável." }, { status: 500 });
  }
}

export const POST = withApiTelemetry("POST /api/scenarios/approve", approveAsResponsible);

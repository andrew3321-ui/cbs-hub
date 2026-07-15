import { approvalRecordFromStored } from "./scenario-approval-core";
import { verifyScenarioApprovalRecord } from "./scenario-signing";

export type StoredScenarioApproval = {
  id: number;
  scenarioId: number;
  companyId: number;
  ownerUserId: number;
  reviewerUserId: number;
  reviewerName: string;
  reviewerEmail: string;
  professionalRegistration: string;
  assuranceLevel: string;
  credentialVerification: string;
  decision: string;
  declarationVersion: string;
  scenarioInputHash: string;
  scenarioRecordSignature: string;
  decisionNote: string;
  signatureVersion: string;
  approvalSignature: string;
  decidedAt: string;
};

export async function scenarioApprovalSummary(approval: StoredScenarioApproval | null | undefined) {
  if (!approval) return null;
  const record = approvalRecordFromStored(approval);
  const integrityStatus = record && await verifyScenarioApprovalRecord(record, approval.approvalSignature, approval.signatureVersion) ? "verified" as const : "invalid" as const;
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
    integrityStatus,
  };
}

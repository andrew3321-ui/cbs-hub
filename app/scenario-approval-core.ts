export const SCENARIO_APPROVAL_SIGNATURE_VERSION = "scenario-approval-hmac-sha256-v1:k1";
export const RESPONSIBLE_REVIEW_DECLARATION_VERSION = "responsible-review.v1";

export type ScenarioApprovalSignedRecord = {
  scenarioId: number;
  companyId: number;
  ownerUserId: number;
  reviewerUserId: number;
  reviewerName: string;
  reviewerEmail: string;
  professionalRegistration: string;
  assuranceLevel: "responsible_self_review";
  credentialVerification: "self_declared";
  decision: "approved";
  declarationVersion: string;
  scenarioInputHash: string;
  scenarioRecordSignature: string;
  decisionNote: string;
  decidedAt: string;
};

function canonicalApproval(record: ScenarioApprovalSignedRecord) {
  return JSON.stringify({
    scenarioId: record.scenarioId,
    companyId: record.companyId,
    ownerUserId: record.ownerUserId,
    reviewerUserId: record.reviewerUserId,
    reviewerName: record.reviewerName,
    reviewerEmail: record.reviewerEmail,
    professionalRegistration: record.professionalRegistration,
    assuranceLevel: record.assuranceLevel,
    credentialVerification: record.credentialVerification,
    decision: record.decision,
    declarationVersion: record.declarationVersion,
    scenarioInputHash: record.scenarioInputHash,
    scenarioRecordSignature: record.scenarioRecordSignature,
    decisionNote: record.decisionNote,
    decidedAt: record.decidedAt,
    signatureVersion: SCENARIO_APPROVAL_SIGNATURE_VERSION,
  });
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

export async function signScenarioApprovalWithSecret(record: ScenarioApprovalSignedRecord, secret: string) {
  if (secret.trim().length < 32) throw new Error("scenario_signing_key_unavailable");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(canonicalApproval(record)));
  return bytesToHex(new Uint8Array(signature));
}

export async function verifyScenarioApprovalWithSecret(record: ScenarioApprovalSignedRecord, signature: string | null | undefined, signatureVersion: string | null | undefined, secret: string) {
  if (signatureVersion !== SCENARIO_APPROVAL_SIGNATURE_VERSION || !signature || !/^[0-9a-f]{64}$/.test(signature)) return false;
  try {
    return constantTimeEqual(await signScenarioApprovalWithSecret(record, secret), signature);
  } catch {
    return false;
  }
}

export function approvalRecordFromStored(approval: {
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
  decidedAt: string;
}): ScenarioApprovalSignedRecord | null {
  if (approval.assuranceLevel !== "responsible_self_review" || approval.credentialVerification !== "self_declared" || approval.decision !== "approved") return null;
  return { ...approval, assuranceLevel: "responsible_self_review", credentialVerification: "self_declared", decision: "approved" };
}

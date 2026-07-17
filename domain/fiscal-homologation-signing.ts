export const FISCAL_HOMOLOGATION_SIGNATURE_VERSION = "hmac-sha256-fiscal-homologation-v1:k1";

export type FiscalHomologationDecisionRecord = {
  caseId: string;
  workspaceId: number;
  snapshotHash: string;
  baseHash: string;
  reviewerUserId: number;
  professionalRegistration: string;
  comparisonOutcome: "matches";
  expectedJson: string;
  decidedAt: string;
};

function canonicalDecision(record: FiscalHomologationDecisionRecord) {
  return JSON.stringify({
    caseId: record.caseId,
    workspaceId: record.workspaceId,
    snapshotHash: record.snapshotHash,
    baseHash: record.baseHash,
    reviewerUserId: record.reviewerUserId,
    professionalRegistration: record.professionalRegistration,
    comparisonOutcome: record.comparisonOutcome,
    expectedJson: record.expectedJson,
    decidedAt: record.decidedAt,
    signatureVersion: FISCAL_HOMOLOGATION_SIGNATURE_VERSION,
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

export async function signFiscalHomologationWithSecret(record: FiscalHomologationDecisionRecord, secret: string) {
  if (secret.trim().length < 32) throw new Error("fiscal_homologation_signing_key_unavailable");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(canonicalDecision(record)));
  return bytesToHex(new Uint8Array(signature));
}

export async function verifyFiscalHomologationWithSecret(record: FiscalHomologationDecisionRecord, signature: string | null | undefined, signatureVersion: string | null | undefined, secret: string) {
  if (signatureVersion !== FISCAL_HOMOLOGATION_SIGNATURE_VERSION || !signature || !/^[0-9a-f]{64}$/.test(signature)) return false;
  try {
    return constantTimeEqual(await signFiscalHomologationWithSecret(record, secret), signature);
  } catch {
    return false;
  }
}

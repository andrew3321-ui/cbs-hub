import { env } from "cloudflare:workers";
import { signScenarioRecordWithSecret, verifyScenarioRecordWithSecret, type ScenarioSignedRecord } from "./scenario-signing-core";
import { signScenarioApprovalWithSecret, verifyScenarioApprovalWithSecret, type ScenarioApprovalSignedRecord } from "./scenario-approval-core";

export { SCENARIO_SIGNATURE_VERSION, signedRecordFromScenario } from "./scenario-signing-core";

type SigningEnvironment = { SCENARIO_SIGNING_KEY_V1?: string };

function signingSecret() {
  const runtime = env as unknown as SigningEnvironment;
  const value = String(runtime.SCENARIO_SIGNING_KEY_V1 ?? "").trim();
  if (value.length < 32) throw new Error("scenario_signing_key_unavailable");
  return value;
}

export function scenarioSigningConfigured() {
  try {
    return signingSecret().length >= 32;
  } catch {
    return false;
  }
}

export function signScenarioRecord(record: ScenarioSignedRecord) {
  return signScenarioRecordWithSecret(record, signingSecret());
}

export async function verifyScenarioRecord(record: ScenarioSignedRecord, signature: string | null | undefined, signatureVersion: string | null | undefined) {
  try {
    return await verifyScenarioRecordWithSecret(record, signature, signatureVersion, signingSecret());
  } catch {
    return false;
  }
}

export function signScenarioApprovalRecord(record: ScenarioApprovalSignedRecord) {
  return signScenarioApprovalWithSecret(record, signingSecret());
}

export async function verifyScenarioApprovalRecord(record: ScenarioApprovalSignedRecord, signature: string | null | undefined, signatureVersion: string | null | undefined) {
  try {
    return await verifyScenarioApprovalWithSecret(record, signature, signatureVersion, signingSecret());
  } catch {
    return false;
  }
}

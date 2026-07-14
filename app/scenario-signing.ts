import { env } from "cloudflare:workers";
import { signScenarioRecordWithSecret, verifyScenarioRecordWithSecret, type ScenarioSignedRecord } from "./scenario-signing-core";

export { SCENARIO_SIGNATURE_VERSION, signedRecordFromScenario } from "./scenario-signing-core";

type SigningEnvironment = { SCENARIO_SIGNING_KEY_V1?: string };

function signingSecret() {
  const runtime = env as unknown as SigningEnvironment;
  const value = String(runtime.SCENARIO_SIGNING_KEY_V1 ?? "").trim();
  if (value.length < 32) throw new Error("scenario_signing_key_unavailable");
  return value;
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

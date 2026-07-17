import { env } from "cloudflare:workers";
import {
  signFiscalHomologationWithSecret,
  verifyFiscalHomologationWithSecret,
  type FiscalHomologationDecisionRecord,
} from "../domain/fiscal-homologation-signing";

type SigningEnvironment = { SCENARIO_SIGNING_KEY_V1?: string };

function signingSecret() {
  const runtime = env as unknown as SigningEnvironment;
  const value = String(runtime.SCENARIO_SIGNING_KEY_V1 ?? "").trim();
  if (value.length < 32) throw new Error("fiscal_homologation_signing_key_unavailable");
  return value;
}

export function signFiscalHomologationDecision(record: FiscalHomologationDecisionRecord) {
  return signFiscalHomologationWithSecret(record, signingSecret());
}

export async function verifyFiscalHomologationDecision(record: FiscalHomologationDecisionRecord, signature: string | null | undefined, signatureVersion: string | null | undefined) {
  try {
    return await verifyFiscalHomologationWithSecret(record, signature, signatureVersion, signingSecret());
  } catch {
    return false;
  }
}

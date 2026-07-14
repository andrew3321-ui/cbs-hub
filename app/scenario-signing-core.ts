import type { ScenarioReliabilityInput } from "./scenario-reliability";

export const SCENARIO_SIGNATURE_VERSION = "hmac-sha256-v1:k1";

export type ScenarioSignedRecord = ScenarioReliabilityInput & {
  ownerUserId: number;
  companyId: number;
  name: string;
  snapshotJson: string;
  calculationVersion: string;
  methodologyVersion: string;
  calculatedAt: string;
};

function canonicalRecord(record: ScenarioSignedRecord) {
  return JSON.stringify({
    ownerUserId: record.ownerUserId,
    companyId: record.companyId,
    name: record.name,
    revenueCents: record.revenueCents,
    currentRateBps: record.currentRateBps,
    newRateBps: record.newRateBps,
    costRateBps: record.costRateBps,
    fixedCostsCents: record.fixedCostsCents,
    volumeLossBps: record.volumeLossBps,
    priceAdjustmentBps: record.priceAdjustmentBps,
    targetYear: record.targetYear,
    rateSource: record.rateSource,
    sourceNote: record.sourceNote,
    snapshotJson: record.snapshotJson,
    calculationVersion: record.calculationVersion,
    methodologyVersion: record.methodologyVersion,
    calculatedAt: record.calculatedAt,
    signatureVersion: SCENARIO_SIGNATURE_VERSION,
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

export async function signScenarioRecordWithSecret(record: ScenarioSignedRecord, secret: string) {
  if (secret.trim().length < 32) throw new Error("scenario_signing_key_unavailable");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(canonicalRecord(record)));
  return bytesToHex(new Uint8Array(signature));
}

export async function verifyScenarioRecordWithSecret(record: ScenarioSignedRecord, signature: string | null | undefined, signatureVersion: string | null | undefined, secret: string) {
  if (signatureVersion !== SCENARIO_SIGNATURE_VERSION || !signature || !/^[0-9a-f]{64}$/.test(signature)) return false;
  try {
    return constantTimeEqual(await signScenarioRecordWithSecret(record, secret), signature);
  } catch {
    return false;
  }
}

export function signedRecordFromScenario(scenario: {
  name: string;
  revenueCents: number;
  currentRateBps: number;
  newRateBps: number;
  costRateBps: number;
  fixedCostsCents: number;
  volumeLossBps: number;
  priceAdjustmentBps: number;
  targetYear: number;
  rateSource: string;
  sourceNote: string;
  snapshotJson: string | null;
  calculationVersion: string;
  methodologyVersion: string;
  calculatedAt: string | null;
  companyId: number;
}, ownerUserId: number): ScenarioSignedRecord | null {
  if (!scenario.snapshotJson || !scenario.calculatedAt || !["custom", "accountant", "legacy_unverified"].includes(scenario.rateSource)) return null;
  return {
    ownerUserId,
    companyId: scenario.companyId,
    name: scenario.name,
    revenueCents: scenario.revenueCents,
    currentRateBps: scenario.currentRateBps,
    newRateBps: scenario.newRateBps,
    costRateBps: scenario.costRateBps,
    fixedCostsCents: scenario.fixedCostsCents,
    volumeLossBps: scenario.volumeLossBps,
    priceAdjustmentBps: scenario.priceAdjustmentBps,
    targetYear: scenario.targetYear,
    rateSource: scenario.rateSource as ScenarioReliabilityInput["rateSource"],
    sourceNote: scenario.sourceNote,
    snapshotJson: scenario.snapshotJson,
    calculationVersion: scenario.calculationVersion,
    methodologyVersion: scenario.methodologyVersion,
    calculatedAt: scenario.calculatedAt,
  };
}

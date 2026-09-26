import { authReviewMarkerHash, parseAuthReviewMode, parseAuthReviewPath, type AuthReviewMarkers, type AuthReviewMode, type AuthReviewStatuses } from "./security-auth-review-policy.ts";

export const AUTH_CONTRACT_VERSION = "authorization-contract.1";
export const AUTH_CONTRACT_EXPECTATION = "anonymous_and_other_identity_denied";
export type AuthContractOutcome = "respected" | "violated" | "inconclusive";
export type AuthContractSpec = { scopeId: string; path: string; reviewMode: AuthReviewMode; markerSha256: string };
const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

export function parseAuthContractId(value: unknown) {
  if (typeof value !== "string" || !new RegExp(`^sac_${uuid}$`, "i").test(value)) throw new Error("AUTH_CONTRACT_ID_INVALID");
  return value;
}

export function parseAuthContractCreate(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("AUTH_CONTRACT_INPUT_INVALID");
  const input = value as Record<string, unknown>;
  if (Object.keys(input).length !== 3 || input.confirmed !== true || typeof input.title !== "string"
    || !/^[\p{L}\p{N} ._-]{3,80}$/u.test(input.title) || input.title.trim().length < 3
    || typeof input.baselineReviewId !== "string" || !new RegExp(`^sarv_${uuid}$`, "i").test(input.baselineReviewId)) throw new Error("AUTH_CONTRACT_INPUT_INVALID");
  return { title: input.title.trim(), baselineReviewId: input.baselineReviewId };
}

export async function authContractSpecHash(spec: AuthContractSpec) {
  if (!new RegExp(`^sas_${uuid}$`, "i").test(spec.scopeId) || !/^[0-9a-f]{64}$/.test(spec.markerSha256)) throw new Error("AUTH_CONTRACT_SPEC_INVALID");
  // Fixed key order. Titles, credentials, response bodies and model prose are not part of the spec.
  return (await authReviewMarkerHash(JSON.stringify({ version: AUTH_CONTRACT_VERSION, expectation: AUTH_CONTRACT_EXPECTATION,
    scopeId: spec.scopeId, method: "GET", path: parseAuthReviewPath(spec.path), reviewMode: parseAuthReviewMode(spec.reviewMode), markerSha256: spec.markerSha256 })))!;
}

export function evaluateAuthContract(observation: { status: string; statuses: AuthReviewStatuses; markerObserved: AuthReviewMarkers }): AuthContractOutcome {
  if (observation.status !== "completed") return "inconclusive";
  const roles = ["anonymous", "limited", "privileged"] as const;
  if (roles.some((role) => !Number.isInteger(observation.statuses[role]) || Number(observation.statuses[role]) < 100
    || Number(observation.statuses[role]) > 599 || typeof observation.markerObserved[role] !== "boolean")) return "inconclusive";
  const success = (status: number | null) => status !== null && status >= 200 && status < 300;
  const denied = (status: number | null) => status === 401 || status === 403;
  // The owner is a positive control: a stale fixture or broken authentication cannot pass.
  if (!success(observation.statuses.privileged) || observation.markerObserved.privileged !== true) return "inconclusive";
  if (roles.some((role) => observation.markerObserved[role] === true && !success(observation.statuses[role]))) return "inconclusive";
  if (observation.markerObserved.anonymous === true || observation.markerObserved.limited === true) return "violated";
  return denied(observation.statuses.anonymous) && denied(observation.statuses.limited) ? "respected" : "inconclusive";
}

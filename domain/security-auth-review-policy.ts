import { normalizePublicDomain } from "./cybersecurity-preview.ts";

export type AuthReviewVerdict = "verified_test_marker_exposure" | "potential_access_gap" | "access_restricted" | "public_or_inconclusive" | "inconclusive";
export type AuthReviewStatuses = { anonymous: number | null; limited: number | null; privileged: number | null };
export type AuthReviewMarkers = { anonymous: boolean | null; limited: boolean | null; privileged: boolean | null };
export type AuthReviewMode = "vertical" | "horizontal";

export function parseAuthReviewMode(input: unknown): AuthReviewMode {
  if (input === undefined) return "vertical";
  if (input === "vertical" || input === "horizontal") return input;
  throw new Error("AUTH_REVIEW_MODE_INVALID");
}
export type AuthReviewRetestOutcome = "still_observed" | "no_longer_observed" | "inconclusive";

export async function authReviewMarkerHash(marker: string | null) {
  if (!marker) return null;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(marker));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function authReviewFindingIdentity(scopeId: string, path: string, mode: AuthReviewMode, reviewId: string) {
  const hash = await authReviewMarkerHash(`${scopeId}:${mode}:${path}`);
  if (!hash || !/^sarv_[0-9a-f-]{36}$/i.test(reviewId)) throw new Error("AUTH_REVIEW_FINDING_INVALID");
  const uuid = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
  return { findingId: `saf_${uuid}`, evidenceCode: `AUTHZ_TEST_MARKER_${hash.slice(0, 20).toUpperCase()}`, eventId: `safe_${reviewId.slice(5)}` };
}

export function classifyAuthReviewRetest(previous: AuthReviewVerdict, current: AuthReviewVerdict): AuthReviewRetestOutcome {
  if (previous !== "verified_test_marker_exposure") return "inconclusive";
  if (current === "verified_test_marker_exposure") return "still_observed";
  if (current === "access_restricted") return "no_longer_observed";
  return "inconclusive";
}

export function parseAuthReviewPath(input: unknown) {
  if (typeof input !== "string" || input.length < 2 || input.length > 160
    || !/^\/(?:[A-Za-z0-9._~-]+\/?)+$/.test(input)
    || input.includes("//") || input.split("/").some((segment) => segment === "." || segment === "..")
    || /(?:^|\/)(?:login|signin|register|cadastro|logout|signout|delete|remove|destroy|cancel|checkout|billing|webhook|reset-password|forgot-password|recuperar-senha|health|public)(?:\/|$)/i.test(input)) {
    throw new Error("AUTH_REVIEW_PATH_INVALID");
  }
  return input;
}

export function parseAuthReviewToken(input: unknown) {
  if (typeof input !== "string" || input.length < 16 || input.length > 2048 || /[\s\x00-\x1f\x7f]/.test(input)) throw new Error("AUTH_REVIEW_TOKEN_INVALID");
  return input;
}

export function parseAuthReviewMarker(input: unknown) {
  if (input === undefined || input === "") return null;
  if (typeof input !== "string" || !/^CBSTEST-[A-Za-z0-9_-]{12,72}$/.test(input)) throw new Error("AUTH_REVIEW_MARKER_INVALID");
  return input;
}

export function parseAuthReviewExecution(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("AUTH_REVIEW_INVALID");
  const value = input as Record<string, unknown>;
  const keys = ["reviewId", "workspaceId", "scopeId", "domain", "path", "limitedToken", "privilegedToken"];
  if (keys.some((key) => !Object.hasOwn(value, key)) || Object.keys(value).some((key) => !keys.includes(key) && key !== "marker" && key !== "reviewMode")
    || typeof value.reviewId !== "string" || !/^sarv_[0-9a-f-]{36}$/i.test(value.reviewId)
    || !Number.isSafeInteger(value.workspaceId) || Number(value.workspaceId) < 1
    || typeof value.scopeId !== "string" || !/^sas_[0-9a-f-]{36}$/i.test(value.scopeId)
    || typeof value.domain !== "string" || normalizePublicDomain(value.domain) !== value.domain) throw new Error("AUTH_REVIEW_INVALID");
  const path = parseAuthReviewPath(value.path);
  const limitedToken = parseAuthReviewToken(value.limitedToken);
  const privilegedToken = parseAuthReviewToken(value.privilegedToken);
  const marker = parseAuthReviewMarker(value.marker);
  const reviewMode = parseAuthReviewMode(value.reviewMode);
  if (limitedToken === privilegedToken) throw new Error("AUTH_REVIEW_IDENTITIES_NOT_DISTINCT");
  return { reviewId: value.reviewId, workspaceId: Number(value.workspaceId), scopeId: value.scopeId, domain: value.domain, path, limitedToken, privilegedToken, marker, reviewMode };
}

export function classifyAuthReview(statuses: AuthReviewStatuses, markers?: AuthReviewMarkers): AuthReviewVerdict {
  const success = (status: number | null) => status !== null && status >= 200 && status < 300;
  const denied = (status: number | null) => status === 401 || status === 403;
  if (!denied(statuses.anonymous) || !success(statuses.privileged)) return statuses.anonymous !== null && success(statuses.anonymous) ? "public_or_inconclusive" : "inconclusive";
  if (markers && markers.privileged !== true) return "inconclusive";
  if (markers?.anonymous) return "public_or_inconclusive";
  if (success(statuses.limited)) {
    if (markers?.limited) return "verified_test_marker_exposure";
    return markers ? "inconclusive" : "potential_access_gap";
  }
  if (denied(statuses.limited)) return "access_restricted";
  return "inconclusive";
}

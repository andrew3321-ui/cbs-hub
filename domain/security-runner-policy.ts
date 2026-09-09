import { normalizePublicDomain } from "./cybersecurity-preview.ts";
import { SECURITY_ACTIVE_RUNNER_MAX_TOTAL_REQUESTS, SECURITY_CAMPAIGN_POLICY_VERSION } from "./security-campaign-policy.ts";

export const SECURITY_RUNNER_VERSION = "security-runner.2026-09-08.v1";
export const SECURITY_RUNNER_MAX_REQUESTS = SECURITY_ACTIVE_RUNNER_MAX_TOTAL_REQUESTS;
export const SECURITY_RUNNER_MAX_BODY_BYTES = 16 * 1024;
export const SECURITY_RUNNER_SIGNATURE_SKEW_SECONDS = 120;

export const runnerTechniqueCatalog = {
  safe_web_crawl: true,
  tls_configuration_review: true,
} as const;

export type RunnerTechnique = keyof typeof runnerTechniqueCatalog;
export type RunnerManifest = {
  version: 1;
  campaignId: string;
  workspaceId: number;
  scope: { domain: string };
  name: string;
  environment: "lab" | "staging" | "production";
  techniques: RunnerTechnique[];
  policyVersion: string;
  window: { start: string; end: string };
  budgets: { requestsPerMinute: number; totalRequests: number };
  stopConditions: { errorRatePercent: number; consecutiveServerErrors: number; unexpectedAuthentication: true };
};

function exactKeys(value: Record<string, unknown>, keys: string[], code: string) {
  const actual = Object.keys(value);
  if (actual.length !== keys.length || actual.some((key) => !keys.includes(key))) throw new Error(code);
}

function record(value: unknown, code: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(code);
  return value as Record<string, unknown>;
}

export function parseRunnerManifest(input: unknown, now = Date.now(), phase: "dispatch" | "execute" = "dispatch"): RunnerManifest {
  const value = record(input, "RUNNER_MANIFEST_INVALID");
  exactKeys(value, ["version", "campaignId", "workspaceId", "scope", "name", "environment", "techniques", "policyVersion", "window", "budgets", "stopConditions"], "RUNNER_MANIFEST_UNKNOWN_FIELD");
  if (value.version !== 1 || typeof value.campaignId !== "string" || !/^sac_[0-9a-f-]{36}$/i.test(value.campaignId)) throw new Error("RUNNER_MANIFEST_INVALID");
  if (!Number.isSafeInteger(value.workspaceId) || Number(value.workspaceId) < 1) throw new Error("RUNNER_MANIFEST_INVALID");
  if (typeof value.name !== "string" || value.name.trim().length < 4 || value.name.trim().length > 80) throw new Error("RUNNER_MANIFEST_INVALID");
  if (!(["lab", "staging", "production"] as unknown[]).includes(value.environment)) throw new Error("RUNNER_MANIFEST_INVALID");
  if (value.policyVersion !== SECURITY_CAMPAIGN_POLICY_VERSION) throw new Error("RUNNER_POLICY_MISMATCH");

  const scope = record(value.scope, "RUNNER_SCOPE_INVALID");
  exactKeys(scope, ["domain"], "RUNNER_SCOPE_INVALID");
  if (typeof scope.domain !== "string") throw new Error("RUNNER_SCOPE_INVALID");
  const domain = normalizePublicDomain(scope.domain);
  if (domain !== scope.domain) throw new Error("RUNNER_SCOPE_INVALID");

  if (!Array.isArray(value.techniques) || value.techniques.length < 1 || value.techniques.length > 2 || new Set(value.techniques).size !== value.techniques.length) throw new Error("RUNNER_TECHNIQUES_INVALID");
  if (value.techniques.some((technique) => typeof technique !== "string" || !Object.hasOwn(runnerTechniqueCatalog, technique))) throw new Error("RUNNER_TECHNIQUES_INVALID");

  const window = record(value.window, "RUNNER_WINDOW_INVALID");
  exactKeys(window, ["start", "end"], "RUNNER_WINDOW_INVALID");
  if (typeof window.start !== "string" || typeof window.end !== "string") throw new Error("RUNNER_WINDOW_INVALID");
  const start = Date.parse(window.start), end = Date.parse(window.end);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || end - start > 4 * 3600_000) throw new Error("RUNNER_WINDOW_INVALID");
  if (phase === "dispatch" && (now < start - SECURITY_RUNNER_SIGNATURE_SKEW_SECONDS * 1000 || now > end)) throw new Error("RUNNER_OUTSIDE_WINDOW");
  if (phase === "execute" && (now < start || now > end)) throw new Error("RUNNER_OUTSIDE_WINDOW");

  const budgets = record(value.budgets, "RUNNER_BUDGET_INVALID");
  exactKeys(budgets, ["requestsPerMinute", "totalRequests"], "RUNNER_BUDGET_INVALID");
  const rpmLimit = value.environment === "production" ? 30 : 60;
  if (!Number.isSafeInteger(budgets.requestsPerMinute) || Number(budgets.requestsPerMinute) < 1 || Number(budgets.requestsPerMinute) > rpmLimit) throw new Error("RUNNER_BUDGET_INVALID");
  if (!Number.isSafeInteger(budgets.totalRequests) || Number(budgets.totalRequests) < 1 || Number(budgets.totalRequests) > SECURITY_RUNNER_MAX_REQUESTS) throw new Error("RUNNER_BUDGET_INVALID");

  const stop = record(value.stopConditions, "RUNNER_STOP_CONDITIONS_INVALID");
  exactKeys(stop, ["errorRatePercent", "consecutiveServerErrors", "unexpectedAuthentication"], "RUNNER_STOP_CONDITIONS_INVALID");
  if (!Number.isSafeInteger(stop.errorRatePercent) || Number(stop.errorRatePercent) < 1 || Number(stop.errorRatePercent) > 20) throw new Error("RUNNER_STOP_CONDITIONS_INVALID");
  if (!Number.isSafeInteger(stop.consecutiveServerErrors) || Number(stop.consecutiveServerErrors) < 1 || Number(stop.consecutiveServerErrors) > 20 || stop.unexpectedAuthentication !== true) throw new Error("RUNNER_STOP_CONDITIONS_INVALID");

  return {
    version: 1,
    campaignId: value.campaignId,
    workspaceId: Number(value.workspaceId),
    scope: { domain },
    name: value.name.trim(),
    environment: value.environment as RunnerManifest["environment"],
    techniques: value.techniques as RunnerTechnique[],
    policyVersion: SECURITY_CAMPAIGN_POLICY_VERSION,
    window: { start: new Date(start).toISOString(), end: new Date(end).toISOString() },
    budgets: { requestsPerMinute: Number(budgets.requestsPerMinute), totalRequests: Number(budgets.totalRequests) },
    stopConditions: { errorRatePercent: Number(stop.errorRatePercent), consecutiveServerErrors: Number(stop.consecutiveServerErrors), unexpectedAuthentication: true },
  };
}

export async function hmacHex(secret: string, content: string) {
  if (secret.length < 32) throw new Error("RUNNER_SIGNING_KEY_INVALID");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(content));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

export async function verifyRunnerSignature(secret: string, timestamp: string | null, signature: string | null, body: string, now = Date.now()) {
  if (!timestamp || !/^\d{10}$/.test(timestamp) || !signature || !/^sha256=[0-9a-f]{64}$/i.test(signature)) return false;
  const seconds = Number(timestamp);
  if (!Number.isSafeInteger(seconds) || Math.abs(Math.floor(now / 1000) - seconds) > SECURITY_RUNNER_SIGNATURE_SKEW_SECONDS) return false;
  const expected = await hmacHex(secret, `${timestamp}.${body}`);
  return constantTimeEqual(expected, signature.slice(7).toLowerCase());
}

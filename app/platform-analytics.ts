import { env } from "cloudflare:workers";
import { isLikelyAutomatedTraffic, metricDate, normalizeMetricAcquisition, normalizeMetricPath, PLATFORM_METRIC_DAILY_RETENTION_DAYS, PLATFORM_METRIC_EVENT_RETENTION_DAYS } from "../domain/platform-metrics";

const VISITOR_COOKIE = "cbs_metric_visitor";
const SESSION_COOKIE = "cbs_metric_session";
const VISITOR_SECONDS = 365 * 24 * 60 * 60;
const SESSION_SECONDS = 30 * 60;

type MetricEventType = "page_view" | "app_active" | "signup" | "trial_started" | "trial_denied" | "seo_cta";
type MetricPayload = { pathname?: unknown; source?: unknown; medium?: unknown; campaign?: unknown; referrerHost?: unknown; reason?: unknown };

function cookieValue(request: Request, name: string) {
  const cookie = request.headers.get("cookie") ?? "";
  for (const part of cookie.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return "";
}

function opaqueId() {
  return typeof crypto.randomUUID === "function" ? crypto.randomUUID() : Array.from(crypto.getRandomValues(new Uint8Array(24)), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function validOpaqueId(value: string) {
  return /^[0-9a-f-]{32,64}$/i.test(value);
}

function cookieHeader(name: string, value: string, request: Request, maxAge: number) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Priority=Medium; Max-Age=${maxAge}${secure}`;
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hmacHex(secret: string, purpose: string, value: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`cbshub:metrics:v1:${purpose}:${value}`));
  return bytesToHex(new Uint8Array(digest));
}

export function metricIdentityCookies(request: Request) {
  const existingVisitor = cookieValue(request, VISITOR_COOKIE);
  const existingSession = cookieValue(request, SESSION_COOKIE);
  const visitorId = validOpaqueId(existingVisitor) ? existingVisitor : opaqueId();
  const sessionId = validOpaqueId(existingSession) ? existingSession : opaqueId();
  return {
    visitorId,
    sessionId,
    headers: [
      ...(visitorId !== existingVisitor ? [cookieHeader(VISITOR_COOKIE, visitorId, request, VISITOR_SECONDS)] : []),
      cookieHeader(SESSION_COOKIE, sessionId, request, SESSION_SECONDS),
    ],
  };
}

export async function recordPlatformMetricEvent(input: { request: Request; eventType: MetricEventType; userId?: number | null; payload?: MetricPayload; visitorId?: string; sessionId?: string; occurredAt?: string }) {
  if (["page_view", "app_active", "seo_cta"].includes(input.eventType) && isLikelyAutomatedTraffic(input.request.headers.get("user-agent") ?? "")) return { recorded: false, reason: "automated" };
  const runtime = env as unknown as { DB: D1Database; SECURITY_HASH_KEY?: string };
  const secret = String(runtime.SECURITY_HASH_KEY ?? "").trim();
  if (secret.length < 32) return { recorded: false, reason: "hash_key_unavailable" };
  const occurredAt = input.occurredAt && !Number.isNaN(new Date(input.occurredAt).getTime()) ? new Date(input.occurredAt).toISOString() : new Date().toISOString();
  const eventDate = metricDate(occurredAt);
  const visitorId = input.visitorId && validOpaqueId(input.visitorId) ? input.visitorId : cookieValue(input.request, VISITOR_COOKIE);
  const sessionId = input.sessionId && validOpaqueId(input.sessionId) ? input.sessionId : cookieValue(input.request, SESSION_COOKIE);
  const visitorHash = visitorId ? await hmacHex(secret, "visitor", visitorId) : null;
  const sessionHash = sessionId ? await hmacHex(secret, "session", sessionId) : null;
  const pathGroup = normalizeMetricPath(input.payload?.pathname);
  const acquisition = normalizeMetricAcquisition(input.payload ?? {});
  const bucket = input.eventType === "page_view" ? Math.floor(new Date(occurredAt).getTime() / 600_000) : eventDate;
  const subject = input.userId ? `user:${input.userId}` : sessionHash ? `session:${sessionHash}` : visitorHash ? `visitor:${visitorHash}` : "anonymous";
  const dedupeKey = await hmacHex(secret, "dedupe", `${input.eventType}|${subject}|${pathGroup}|${bucket}`);
  const reason = typeof input.payload?.reason === "string" ? input.payload.reason.replace(/[^a-z0-9_-]/gi, "").slice(0, 40) : "";
  const eventCutoff = new Date(new Date(occurredAt).getTime() - PLATFORM_METRIC_EVENT_RETENTION_DAYS * 86_400_000).toISOString().slice(0, 10);
  const dailyCutoff = new Date(new Date(occurredAt).getTime() - PLATFORM_METRIC_DAILY_RETENTION_DAYS * 86_400_000).toISOString().slice(0, 10);
  const results = await runtime.DB.batch([
    runtime.DB.prepare("INSERT OR IGNORE INTO platform_metric_events (event_type, event_date, occurred_at, user_id, visitor_hash, session_hash, path_group, source, medium, campaign, dedupe_key, metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(input.eventType, eventDate, occurredAt, input.userId ?? null, visitorHash, sessionHash, pathGroup, acquisition.source, acquisition.medium, acquisition.campaign, dedupeKey, JSON.stringify(reason ? { reason } : {})),
    runtime.DB.prepare("DELETE FROM platform_metric_events WHERE event_date < ?").bind(eventCutoff),
    runtime.DB.prepare("DELETE FROM platform_metric_daily WHERE metric_date < ?").bind(dailyCutoff),
  ]);
  return { recorded: results[0].meta.changes === 1, reason: results[0].meta.changes === 1 ? null : "deduplicated" };
}

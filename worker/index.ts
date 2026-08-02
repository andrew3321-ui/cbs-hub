/** Cloudflare Worker entry point for CBSHub. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { runScheduledBillingReconciliation } from "../app/billing-scheduled-reconciliation";
import { runNormativeMonitor } from "../app/normative-governance-service";
import { runScheduledRtcCalculatorSync } from "../app/rtc-official-calculator-service";
import { NORMATIVE_MONITOR_SHARD_COUNT, normativeMonitorShardForScheduledTime } from "../domain/normative-governance";
import { routeMustNotBeIndexed } from "../domain/seo-route-policy.ts";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  SECURITY_HASH_KEY?: string;
  PUBLIC_APP_URL?: string;
  OBSERVABILITY_SLOW_REQUEST_MS?: string;
  CF_VERSION_METADATA?: {
    id: string;
    tag?: string;
    timestamp?: string;
  };
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

type RateLimitRule = { scope: string; limit: number; windowSeconds: number };
type ScheduledController = { scheduledTime: number; cron: string };

const stateChangingMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const defaultSlowRequestMs = 2_500;
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://api.mercadopago.com",
  "upgrade-insecure-requests",
].join("; ");

function edgeRequestId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function releaseMetadata(env: Env) {
  return {
    versionId: env.CF_VERSION_METADATA?.id ?? "local",
    versionTag: env.CF_VERSION_METADATA?.tag ?? "unversioned",
  };
}

function slowRequestThreshold(env: Env) {
  const configured = Number(env.OBSERVABILITY_SLOW_REQUEST_MS);
  return Number.isFinite(configured) && configured >= 250 ? Math.floor(configured) : defaultSlowRequestMs;
}

function jsonError(status: number, error: string, code: string, headers: HeadersInit = {}) {
  return Response.json({ error, code }, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

function sameOriginRequest(request: Request) {
  const requestOrigin = new URL(request.url).origin;
  const origin = request.headers.get("origin");
  if (origin) return origin === requestOrigin;
  const referer = request.headers.get("referer");
  if (referer) {
    try { return new URL(referer).origin === requestOrigin; }
    catch { return false; }
  }
  return ["same-origin", "same-site", "none"].includes(request.headers.get("sec-fetch-site") ?? "");
}

function maximumBodyBytes(pathname: string) {
  if (pathname === "/api/fiscal-documents") return 6 * 1024 * 1024;
  if (pathname.startsWith("/api/auth/")) return 16 * 1024;
  if (pathname === "/api/billing/webhook") return 64 * 1024;
  return 1024 * 1024;
}

function rateLimitRule(pathname: string, method: string): RateLimitRule | null {
  if (method === "POST" && pathname === "/api/billing/webhook") return { scope: "billing-webhook", limit: 600, windowSeconds: 60 };
  if (!stateChangingMethods.has(method)) return null;
  if (pathname === "/api/auth/login") return { scope: "auth-login", limit: 10, windowSeconds: 15 * 60 };
  if (pathname === "/api/auth/register") return { scope: "auth-register", limit: 6, windowSeconds: 60 * 60 };
  if (pathname === "/api/auth/reset-password") return { scope: "auth-reset", limit: 6, windowSeconds: 60 * 60 };
  if (pathname === "/api/account") return { scope: "account-rights", limit: 6, windowSeconds: 60 * 60 };
  if (pathname === "/api/billing/checkout" || pathname === "/api/billing/pix") return { scope: "billing-checkout", limit: 12, windowSeconds: 10 * 60 };
  if (pathname.startsWith("/api/admin/")) return { scope: "platform-admin", limit: 30, windowSeconds: 10 * 60 };
  if (pathname.startsWith("/api/")) return { scope: "api-write", limit: 120, windowSeconds: 60 };
  return null;
}

async function pseudonymousClientKey(request: Request, env: Env, scope: string) {
  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const material = new TextEncoder().encode(`${scope}:${ip}`);
  const secret = String(env.SECURITY_HASH_KEY ?? "");
  const digest = secret
    ? await crypto.subtle.sign("HMAC", await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]), material)
    : await crypto.subtle.digest("SHA-256", material);
  return `${scope}:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 40)}`;
}

async function enforceRateLimit(request: Request, env: Env, rule: RateLimitRule) {
  try {
    const now = Math.floor(Date.now() / 1000);
    const resetBefore = now - rule.windowSeconds;
    const blockUntil = now + rule.windowSeconds;
    const key = await pseudonymousClientKey(request, env, rule.scope);
    const results = await env.DB.batch([
      env.DB.prepare(`
        INSERT INTO security_rate_limits (bucket_key, window_started_at, request_count, blocked_until, updated_at)
        VALUES (?, ?, 1, NULL, ?)
        ON CONFLICT(bucket_key) DO UPDATE SET
          request_count = CASE WHEN window_started_at < ? THEN 1 ELSE request_count + 1 END,
          window_started_at = CASE WHEN window_started_at < ? THEN ? ELSE window_started_at END,
          blocked_until = CASE WHEN window_started_at < ? THEN NULL WHEN request_count + 1 > ? THEN ? ELSE blocked_until END,
          updated_at = excluded.updated_at
      `).bind(key, now, new Date().toISOString(), resetBefore, resetBefore, now, resetBefore, rule.limit, blockUntil),
      env.DB.prepare("SELECT request_count, blocked_until FROM security_rate_limits WHERE bucket_key = ?").bind(key),
    ]);
    const row = results[1].results?.[0] as { request_count?: number; blocked_until?: number | null } | undefined;
    if ((row?.blocked_until ?? 0) > now || (row?.request_count ?? 0) > rule.limit) return Math.max(1, (row?.blocked_until ?? blockUntil) - now);
    return 0;
  } catch (error) {
    console.error(JSON.stringify({ event: "security.rate_limit_unavailable", requestId: request.headers.get("x-request-id"), error: error instanceof Error ? error.name : "UnknownError" }));
    return 0;
  }
}

function secureResponse(response: Response, request: Request) {
  const headers = new Headers(response.headers);
  const pathname = new URL(request.url).pathname;
  headers.set("Content-Security-Policy", contentSecurityPolicy);
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  if (new URL(request.url).protocol === "https:") headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/public/")) headers.set("Cache-Control", "no-store");
  if (routeMustNotBeIndexed(pathname)) {
    headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }
  headers.delete("Server");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function runSecurityRetentionCleanup(env: Env) {
  return env.DB.batch([
    env.DB.prepare("DELETE FROM security_rate_limits WHERE updated_at < datetime('now', '-2 days')"),
    env.DB.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')"),
    env.DB.prepare("UPDATE trial_device_claims SET status = 'expired' WHERE status = 'active' AND ends_at <= datetime('now')"),
    env.DB.prepare("DELETE FROM trial_device_claims WHERE status IN ('expired', 'retained_antifraud') AND created_at < datetime('now', '-365 days')"),
    env.DB.prepare("UPDATE workspace_invitations SET status = 'expired' WHERE status = 'pending' AND expires_at < datetime('now')"),
    env.DB.prepare("DELETE FROM workspace_invitations WHERE status IN ('expired', 'accepted', 'canceled') AND created_at < datetime('now', '-90 days')"),
    env.DB.prepare("DELETE FROM report_shares WHERE (expires_at < datetime('now', '-90 days')) OR (revoked_at IS NOT NULL AND revoked_at < datetime('now', '-90 days'))"),
    env.DB.prepare("DELETE FROM privacy_request_events WHERE retain_until < datetime('now')"),
    env.DB.prepare("DELETE FROM security_incident_events WHERE incident_id IN (SELECT id FROM security_incidents WHERE retain_until < datetime('now'))"),
    env.DB.prepare("DELETE FROM security_incidents WHERE retain_until < datetime('now')"),
  ]);
}

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const requestId = edgeRequestId();
    const startedAt = Date.now();
    const instrumentedHeaders = new Headers(request.headers);
    instrumentedHeaders.set("x-request-id", requestId);
    request = new Request(request, { headers: instrumentedHeaders });
    const url = new URL(request.url);
    const finalize = (response: Response) => {
      const durationMs = Date.now() - startedAt;
      const release = releaseMetadata(env);
      const secured = secureResponse(response, request);
      secured.headers.set("X-Request-Id", requestId);
      secured.headers.set("X-CBSHub-Version", release.versionId);
      console.info(JSON.stringify({ event: "edge.request", requestId, method: request.method, route: url.pathname, status: secured.status, durationMs, ...release }));
      if (secured.status >= 500 || durationMs >= slowRequestThreshold(env)) {
        console.warn(JSON.stringify({
          event: secured.status >= 500 ? "edge.alert.error" : "edge.alert.latency",
          severity: secured.status >= 500 ? "critical" : "warning",
          requestId,
          method: request.method,
          route: url.pathname,
          status: secured.status,
          durationMs,
          thresholdMs: slowRequestThreshold(env),
          ...release,
        }));
      }
      return secured;
    };

    if (["TRACE", "CONNECT"].includes(request.method)) return finalize(jsonError(405, "Método não permitido.", "METHOD_NOT_ALLOWED"));
    if (request.url.length > 4096) return finalize(jsonError(414, "Endereço da requisição muito longo.", "URI_TOO_LONG"));
    const declaredLength = Number(request.headers.get("content-length") ?? 0);
    if (Number.isFinite(declaredLength) && declaredLength > maximumBodyBytes(url.pathname)) return finalize(jsonError(413, "Conteúdo acima do limite permitido.", "PAYLOAD_TOO_LARGE"));
    if (url.pathname.startsWith("/api/") && stateChangingMethods.has(request.method) && url.pathname !== "/api/billing/webhook" && !sameOriginRequest(request)) {
      return finalize(jsonError(403, "Origem da requisição não autorizada.", "CROSS_SITE_REQUEST_BLOCKED"));
    }
    const limitRule = rateLimitRule(url.pathname, request.method);
    if (limitRule) {
      const retryAfter = await enforceRateLimit(request, env, limitRule);
      if (retryAfter) return finalize(jsonError(429, "Muitas solicitações. Aguarde antes de tentar novamente.", "RATE_LIMITED", { "Retry-After": String(retryAfter) }));
    }
    if (Math.random() < 0.01) ctx.waitUntil(runSecurityRetentionCleanup(env).catch(() => undefined));

    try {
      if (url.pathname === "/_vinext/image") {
        const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
        const response = await handleImageOptimization(request, {
          fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
          transformImage: async (body, { width, format, quality }) => {
            const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
            return result.response();
          },
        }, allowedWidths);
        return finalize(response);
      }
      return finalize(await handler.fetch(request, env, ctx));
    } catch (error) {
      console.error(JSON.stringify({ event: "edge.error", requestId, method: request.method, route: url.pathname, status: 500, durationMs: Date.now() - startedAt, ...releaseMetadata(env), error: error instanceof Error ? error.name : "UnknownError" }));
      return finalize(jsonError(500, "Falha interna. Informe o código de atendimento se persistir.", "INTERNAL_ERROR"));
    }
  },
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    const date = new Date(controller.scheduledTime).toISOString().slice(0, 10);
    ctx.waitUntil(runScheduledBillingReconciliation(controller.scheduledTime).then((summary) => {
      console.info(JSON.stringify({ event: "billing.reconciliation_completed", date, cron: controller.cron, ...summary }));
    }).catch((error) => {
      console.error(JSON.stringify({
        event: "billing.reconciliation_failed",
        date,
        error: error instanceof Error ? error.name : "UnknownError",
      }));
      throw error;
    }));
    if (controller.cron === "15 8 * * *") {
      ctx.waitUntil(runSecurityRetentionCleanup(env).catch((error) => {
        console.error(JSON.stringify({ event: "security.retention_cleanup_failed", date, error: error instanceof Error ? error.name : "UnknownError" }));
        throw error;
      }));
      ctx.waitUntil(runScheduledRtcCalculatorSync(env.DB).then((result) => {
        console.info(JSON.stringify({ event: "rtc.official_sync_completed", date, versionId: result.versionId, status: result.status, differenceCount: result.report.differences.length }));
      }).catch((error) => {
        console.error(JSON.stringify({ event: "rtc.official_sync_failed", date, error: error instanceof Error ? error.name : "UnknownError" }));
        throw error;
      }));
    }
    const normativeShard = normativeMonitorShardForScheduledTime(controller.cron, controller.scheduledTime);
    if (normativeShard !== null) {
      ctx.waitUntil(runNormativeMonitor({ DB: env.DB }, date, normativeShard, NORMATIVE_MONITOR_SHARD_COUNT).catch((error) => {
        console.error(JSON.stringify({
          event: "normative_monitor.failed",
          date,
          error: error instanceof Error ? error.name : "UnknownError",
        }));
        throw error;
      }));
    }
  },
};

export default worker;

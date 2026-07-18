/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  SECURITY_HASH_KEY?: string;
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

const stateChangingMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);
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

function jsonError(status: number, error: string, code: string, headers: HeadersInit = {}) {
  return Response.json({ error, code }, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

function sameOriginRequest(request: Request) {
  const requestOrigin = new URL(request.url).origin;
  const origin = request.headers.get("origin");
  if (origin) return origin === requestOrigin;
  const referer = request.headers.get("referer");
  if (referer) {
    try { return new URL(referer).origin === requestOrigin; } catch { return false; }
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
  if (!stateChangingMethods.has(method) || pathname === "/api/billing/webhook") return null;
  if (pathname === "/api/auth/login") return { scope: "auth-login", limit: 10, windowSeconds: 15 * 60 };
  if (pathname === "/api/auth/register") return { scope: "auth-register", limit: 6, windowSeconds: 60 * 60 };
  if (pathname === "/api/auth/reset-password") return { scope: "auth-reset", limit: 6, windowSeconds: 60 * 60 };
  if (pathname === "/api/account") return { scope: "account-delete", limit: 3, windowSeconds: 60 * 60 };
  if (pathname === "/api/billing/checkout") return { scope: "billing-checkout", limit: 12, windowSeconds: 10 * 60 };
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
    console.error(JSON.stringify({ event: "security.rate_limit_unavailable", error: error instanceof Error ? error.name : "UnknownError" }));
    return 0;
  }
}

function secureResponse(response: Response, request: Request) {
  const headers = new Headers(response.headers);
  headers.set("Content-Security-Policy", contentSecurityPolicy);
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  if (new URL(request.url).protocol === "https:") headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  if (new URL(request.url).pathname.startsWith("/api/") && !new URL(request.url).pathname.startsWith("/api/public/")) headers.set("Cache-Control", "no-store");
  headers.delete("Server");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (["TRACE", "CONNECT"].includes(request.method)) return secureResponse(jsonError(405, "Método não permitido.", "METHOD_NOT_ALLOWED"), request);
    if (request.url.length > 4096) return secureResponse(jsonError(414, "Endereço da requisição muito longo.", "URI_TOO_LONG"), request);
    const declaredLength = Number(request.headers.get("content-length") ?? 0);
    if (Number.isFinite(declaredLength) && declaredLength > maximumBodyBytes(url.pathname)) return secureResponse(jsonError(413, "Conteúdo acima do limite permitido.", "PAYLOAD_TOO_LARGE"), request);
    if (url.pathname.startsWith("/api/") && stateChangingMethods.has(request.method) && url.pathname !== "/api/billing/webhook" && !sameOriginRequest(request)) {
      return secureResponse(jsonError(403, "Origem da requisição não autorizada.", "CROSS_SITE_REQUEST_BLOCKED"), request);
    }
    const limitRule = rateLimitRule(url.pathname, request.method);
    if (limitRule) {
      const retryAfter = await enforceRateLimit(request, env, limitRule);
      if (retryAfter) return secureResponse(jsonError(429, "Muitas solicitações. Aguarde antes de tentar novamente.", "RATE_LIMITED", { "Retry-After": String(retryAfter) }), request);
    }
    if (Math.random() < 0.01) ctx.waitUntil(env.DB.batch([
      env.DB.prepare("DELETE FROM security_rate_limits WHERE updated_at < datetime('now', '-2 days')"),
      env.DB.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')"),
      env.DB.prepare("UPDATE workspace_invitations SET status = 'expired' WHERE status = 'pending' AND expires_at < datetime('now')"),
      env.DB.prepare("DELETE FROM workspace_invitations WHERE status IN ('expired', 'accepted', 'canceled') AND created_at < datetime('now', '-90 days')"),
      env.DB.prepare("DELETE FROM report_shares WHERE (expires_at < datetime('now', '-90 days')) OR (revoked_at IS NOT NULL AND revoked_at < datetime('now', '-90 days'))"),
    ]).catch(() => undefined));

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      const response = await handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
      return secureResponse(response, request);
    }

    return secureResponse(await handler.fetch(request, env, ctx), request);
  },
};

export default worker;

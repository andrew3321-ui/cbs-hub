import { getCurrentUser } from "../../../auth";
import { metricIdentityCookies, recordPlatformMetricEvent } from "../../../platform-analytics";
import { withApiTelemetry } from "../../../api-infrastructure";

async function collect(request: Request) {
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const acceptedSignupEvents = new Set(["signup_start", "signup_submit", "signup_client_error"]);
  const eventType = body.eventType === "app_active" ? "app_active"
    : body.eventType === "page_view" ? "page_view"
      : body.eventType === "seo_cta" ? "seo_cta"
        : typeof body.eventType === "string" && acceptedSignupEvents.has(body.eventType) ? body.eventType as "signup_start" | "signup_submit" | "signup_client_error"
          : null;
  if (!eventType) return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  const user = eventType === "app_active" ? await getCurrentUser() : null;
  if (eventType === "app_active" && !user) return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  const identity = metricIdentityCookies(request);
  await recordPlatformMetricEvent({ request, eventType, userId: user?.id, payload: body, visitorId: identity.visitorId, sessionId: identity.sessionId });
  const headers = new Headers({ "Cache-Control": "no-store" });
  for (const cookie of identity.headers) headers.append("Set-Cookie", cookie);
  return new Response(null, { status: 204, headers });
}

export const POST = withApiTelemetry("POST /api/analytics/collect", collect);

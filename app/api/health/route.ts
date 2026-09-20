import { checkDatabaseHealth } from "../../../db";
import { withApiTelemetry } from "../../api-infrastructure";
import { env } from "cloudflare:workers";
import { SECURITY_CAMPAIGN_POLICY_VERSION } from "../../../domain/security-campaign-policy";

async function health() {
  const database = await checkDatabaseHealth();
  const runtime = env as unknown as Record<string, unknown> & { SECURITY_ACTIVE_RUNNER?: { fetch(request: Request): Promise<Response> } };
  let runner = false;
  try {
    if (runtime.SECURITY_ACTIVE_RUNNER) {
      const response = await runtime.SECURITY_ACTIVE_RUNNER.fetch(new Request("https://security-runner.internal/health"));
      const state = response.status === 200 ? await response.json() as { status?: unknown; supportedPolicyVersions?: unknown } : null;
      runner = state?.status === "healthy" && Array.isArray(state.supportedPolicyVersions) && state.supportedPolicyVersions.includes(SECURITY_CAMPAIGN_POLICY_VERSION);
    }
  } catch { runner = false; }
  const healthy = database && runner;
  const metadata = runtime.CF_VERSION_METADATA && typeof runtime.CF_VERSION_METADATA === "object"
    ? runtime.CF_VERSION_METADATA as Record<string, unknown>
    : {};
  return Response.json({
    status: healthy ? "healthy" : "degraded",
    checks: { database: database ? "up" : "down", securityRunner: runner ? "up" : "down" },
    release: {
      id: typeof metadata.id === "string" ? metadata.id : "local",
      tag: typeof metadata.tag === "string" ? metadata.tag : null,
      createdAt: typeof metadata.timestamp === "string" ? metadata.timestamp : null,
    },
    product: "cybersecurity",
    checkedAt: new Date().toISOString(),
  }, { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}

export const GET = withApiTelemetry("GET /api/health", health);

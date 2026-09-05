import { checkDatabaseHealth } from "../../../db";
import { withApiTelemetry } from "../../api-infrastructure";
import { env } from "cloudflare:workers";

async function health() {
  const database = await checkDatabaseHealth();
  const healthy = database;
  const runtime = env as unknown as Record<string, unknown>;
  const metadata = runtime.CF_VERSION_METADATA && typeof runtime.CF_VERSION_METADATA === "object"
    ? runtime.CF_VERSION_METADATA as Record<string, unknown>
    : {};
  return Response.json({
    status: healthy ? "healthy" : "degraded",
    checks: { database: database ? "up" : "down" },
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

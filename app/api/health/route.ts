import { checkDatabaseHealth } from "../../../db";
import { TAX_DETERMINATION_ENGINE_VERSION } from "../../../domain/tax-determination";
import { withApiTelemetry } from "../../api-infrastructure";
import { CALCULATION_ENGINE_VERSION, METHODOLOGY_VERSION } from "../../scenario-reliability";
import { scenarioSigningConfigured, SCENARIO_SIGNATURE_VERSION } from "../../scenario-signing";
import { env } from "cloudflare:workers";

async function health() {
  const [database, signing] = await Promise.all([checkDatabaseHealth(), Promise.resolve(scenarioSigningConfigured())]);
  const healthy = database && signing;
  const runtime = env as unknown as Record<string, unknown>;
  const metadata = runtime.CF_VERSION_METADATA && typeof runtime.CF_VERSION_METADATA === "object"
    ? runtime.CF_VERSION_METADATA as Record<string, unknown>
    : {};
  return Response.json({
    status: healthy ? "healthy" : "degraded",
    checks: { database: database ? "up" : "down", scenarioSigning: signing ? "configured" : "unavailable" },
    release: {
      id: typeof metadata.id === "string" ? metadata.id : "local",
      tag: typeof metadata.tag === "string" ? metadata.tag : null,
      createdAt: typeof metadata.timestamp === "string" ? metadata.timestamp : null,
    },
    versions: { calculation: CALCULATION_ENGINE_VERSION, taxDetermination: TAX_DETERMINATION_ENGINE_VERSION, methodology: METHODOLOGY_VERSION, signature: SCENARIO_SIGNATURE_VERSION },
    checkedAt: new Date().toISOString(),
  }, { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}

export const GET = withApiTelemetry("GET /api/health", health);

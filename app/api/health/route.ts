import { checkDatabaseHealth } from "../../../db";
import { withApiTelemetry } from "../../api-infrastructure";
import { CALCULATION_ENGINE_VERSION, METHODOLOGY_VERSION } from "../../scenario-reliability";
import { scenarioSigningConfigured, SCENARIO_SIGNATURE_VERSION } from "../../scenario-signing";

async function health() {
  const [database, signing] = await Promise.all([checkDatabaseHealth(), Promise.resolve(scenarioSigningConfigured())]);
  const healthy = database && signing;
  return Response.json({
    status: healthy ? "healthy" : "degraded",
    checks: { database: database ? "up" : "down", scenarioSigning: signing ? "configured" : "unavailable" },
    versions: { calculation: CALCULATION_ENGINE_VERSION, methodology: METHODOLOGY_VERSION, signature: SCENARIO_SIGNATURE_VERSION },
    checkedAt: new Date().toISOString(),
  }, { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}

export const GET = withApiTelemetry("GET /api/health", health);

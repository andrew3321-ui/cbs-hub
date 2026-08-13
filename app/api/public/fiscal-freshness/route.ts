import { env } from "cloudflare:workers";
import { withApiTelemetry } from "../../../api-infrastructure";
import { getPublicFiscalFreshness } from "../../../fiscal-freshness-service";

async function publicFreshness() {
  const indicator = await getPublicFiscalFreshness(env.DB);
  return Response.json(indicator, {
    headers: {
      "Cache-Control": "public, max-age=300, stale-while-revalidate=900",
      "Access-Control-Allow-Origin": "https://cbshub.com.br",
    },
  });
}

export const GET = withApiTelemetry("GET /api/public/fiscal-freshness", publicFreshness);

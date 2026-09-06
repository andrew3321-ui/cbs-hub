import { env } from "cloudflare:workers";
import { withApiTelemetry } from "../../../api-infrastructure";
import { authenticateDefenseIngest, ingestDefenseSignal, type SecurityDefenseEnv } from "../../../security-defense-service";

async function postTelemetry(request: Request) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return Response.json({ error: "Envie o sinal como JSON.", code: "CONTENT_TYPE_REQUIRED" }, { status: 415 });
  }
  const rawBody = await request.text();
  if (!rawBody || rawBody.length > 16 * 1024) return Response.json({ error: "Sinal vazio ou acima do limite.", code: "DEFENSE_PAYLOAD_INVALID" }, { status: 400 });
  const runtime = env as unknown as SecurityDefenseEnv;
  try {
    const connector = await authenticateDefenseIngest(runtime, request, rawBody);
    const payload = JSON.parse(rawBody) as unknown;
    const result = await ingestDefenseSignal(runtime, connector, payload);
    return Response.json(result, { status: result.duplicate ? 200 : 202, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const code = error instanceof Error ? error.message : "DEFENSE_INGEST_FAILED";
    if (code === "DEFENSE_INGEST_UNAUTHORIZED" || code === "DEFENSE_INGEST_EXPIRED" || code === "DEFENSE_SIGNING_KEY_NOT_CONFIGURED") {
      return Response.json({ error: "Credencial, assinatura ou horário do conector inválido.", code: "DEFENSE_INGEST_UNAUTHORIZED" }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }
    if (error instanceof SyntaxError || code.startsWith("DEFENSE_")) {
      return Response.json({ error: "Sinal rejeitado pela política de telemetria.", code }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }
    throw error;
  }
}

export const POST = withApiTelemetry("POST /api/security/telemetry", postTelemetry);

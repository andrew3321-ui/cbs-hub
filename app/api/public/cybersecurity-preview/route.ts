import { runPassiveSecurityScan } from "../../../cybersecurity-scan-service";
import { withApiTelemetry } from "../../../api-infrastructure";

async function cybersecurityPreview(request: Request) {
  const payload = await request.json().catch(() => null) as { domain?: unknown } | null;
  if (typeof payload?.domain !== "string") return Response.json({ error: "Informe o domínio da empresa." }, { status: 400 });
  try {
    const result = await runPassiveSecurityScan(payload.domain);
    console.info(JSON.stringify({ event: "public_cybersecurity_preview.completed", level: result.posture.level, score: result.posture.score, checks: result.checks.length, fingerprint: result.fingerprint }));
    return Response.json(result, { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Domínio inválido." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
}

export const POST = withApiTelemetry("POST /api/public/cybersecurity-preview", cybersecurityPreview);

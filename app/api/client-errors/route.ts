import { env } from "cloudflare:workers";
import { withApiTelemetry } from "../../api-infrastructure";

const acceptedKinds = new Set(["render", "window_error", "unhandled_rejection"]);

function clean(value: unknown, limit: number) {
  return typeof value === "string"
    ? value.replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim().slice(0, limit)
    : "";
}

async function recordClientError(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(request.url).host) {
    return Response.json({ error: "Origem inválida." }, { status: 403 });
  }
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 8_192) return Response.json({ error: "Evento excede o limite." }, { status: 413 });

  const payload = await request.json().catch(() => null) as Record<string, unknown> | null;
  const kind = clean(payload?.kind, 32);
  const message = clean(payload?.message, 400);
  const route = clean(payload?.route, 180);
  if (!acceptedKinds.has(kind) || !message || !route.startsWith("/")) {
    return Response.json({ error: "Evento inválido." }, { status: 400 });
  }

  const runtime = env as unknown as Record<string, unknown>;
  const metadata = runtime.CF_VERSION_METADATA && typeof runtime.CF_VERSION_METADATA === "object"
    ? runtime.CF_VERSION_METADATA as Record<string, unknown>
    : {};
  console.error(JSON.stringify({
    event: "ui.error",
    kind,
    message,
    component: clean(payload?.component, 1000) || null,
    route,
    releaseId: typeof metadata.id === "string" ? metadata.id : "local",
    releaseTag: typeof metadata.tag === "string" ? metadata.tag : "unversioned",
    occurredAt: new Date().toISOString(),
  }));
  return Response.json({ accepted: true }, { status: 202, headers: { "Cache-Control": "no-store" } });
}

export const POST = withApiTelemetry("POST /api/client-errors", recordClientError);

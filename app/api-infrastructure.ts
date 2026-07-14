type ApiHandler = (request: Request) => Promise<Response>;

function requestId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function withApiTelemetry(route: string, handler: ApiHandler): ApiHandler {
  return async (request) => {
    const id = requestId();
    const startedAt = Date.now();
    try {
      const response = await handler(request);
      response.headers.set("X-Request-Id", id);
      console.info(JSON.stringify({ event: "api.request", route, requestId: id, status: response.status, durationMs: Date.now() - startedAt }));
      return response;
    } catch (error) {
      console.error(JSON.stringify({ event: "api.error", route, requestId: id, status: 500, durationMs: Date.now() - startedAt, error: error instanceof Error ? error.name : "UnknownError" }));
      return Response.json({ error: "Ocorreu uma falha interna. Tente novamente e informe o código de atendimento se persistir.", code: "INTERNAL_ERROR", requestId: id }, { status: 500, headers: { "X-Request-Id": id, "Cache-Control": "no-store" } });
    }
  };
}

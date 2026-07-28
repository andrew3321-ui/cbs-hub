import assert from "node:assert/strict";
import test from "node:test";
import { withApiTelemetry } from "../app/api-infrastructure.ts";

test("telemetria devolve identificador de correlação sem alterar a resposta", async () => {
  const originalInfo = console.info;
  console.info = () => {};
  try {
    const handler = withApiTelemetry("GET /test", async () => Response.json({ ok: true }, { status: 202 }));
    const response = await handler(new Request("https://cbshub.local/test"));
    assert.equal(response.status, 202);
    assert.match(response.headers.get("x-request-id") ?? "", /^[0-9a-f-]{32,36}$/);
    assert.deepEqual(await response.json(), { ok: true });
  } finally {
    console.info = originalInfo;
  }
});

test("falha inesperada recebe código seguro e o mesmo identificador no cabeçalho", async () => {
  const originalError = console.error;
  console.error = () => {};
  try {
    const handler = withApiTelemetry("POST /test", async () => { throw new Error("segredo que não deve vazar"); });
    const response = await handler(new Request("https://cbshub.local/test", { method: "POST" }));
    const body = await response.json();
    assert.equal(response.status, 500);
    assert.equal(body.code, "INTERNAL_ERROR");
    assert.equal(body.requestId, response.headers.get("x-request-id"));
    assert.doesNotMatch(JSON.stringify(body), /segredo que não deve vazar/);
  } finally {
    console.error = originalError;
  }
});

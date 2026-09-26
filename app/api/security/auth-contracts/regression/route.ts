import { env } from "cloudflare:workers";
import { zipSync, strToU8 } from "fflate";
import { githubApiContext } from "../../../../github-api-context";
import { withApiTelemetry } from "../../../../api-infrastructure";
import { authorizationRegressionBundle, authorizationRegressionCatalog, createAuthorizationRegressionDraft, parseRegressionRepositoryId } from "../../../../security-auth-regression";
import { parseRegressionCreate, parseRegressionId } from "../../../../../domain/security-auth-regression";
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
const DB = () => (env as unknown as { DB: D1Database }).DB;
const privateResponse = (response: Response) => { response.headers.set("Cache-Control", "no-store"); return response; };
function failure(error: unknown) {
  const code = error instanceof Error && /^AUTH_REGRESSION_[A-Z0-9_]+$/.test(error.message) ? error.message : "AUTH_REGRESSION_FAILED";
  return reply({ code, error: code === "AUTH_REGRESSION_DAILY_LIMIT" ? "Limite de 10 novos rascunhos em 24 horas atingido."
    : "Não foi possível preparar o teste. Confira o último scan, o mapa de código e as autorizações vigentes." }, code === "AUTH_REGRESSION_DAILY_LIMIT" ? 429
      : /NOT_FOUND/.test(code) ? 404 : /INPUT_INVALID/.test(code) ? 400 : /AUTHORIZATION|MAPPING_INVALID/.test(code) ? 409 : 503);
}
async function getRegression(request: Request) {
  const context = await githubApiContext(); if (context instanceof Response) return privateResponse(context);
  const params = new URL(request.url).searchParams;
  try {
    if (params.has("draftId")) {
      const id = parseRegressionId(params.get("draftId")), bundle = await authorizationRegressionBundle(DB(), context.workspace.id, id);
      if (!bundle) return reply({ error: "Rascunho não encontrado." }, 404);
      if (params.get("download") === "zip") {
        const files = Object.fromEntries(bundle.files.map(file => [file.path, strToU8(file.content)]));
        const zip = zipSync(files, { level: 6 });
        return new Response(new Uint8Array(zip).buffer, { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="cbshub-regression-${id}.zip"` } });
      }
      return reply(bundle);
    }
    return reply(await authorizationRegressionCatalog(DB(), context.workspace.id, parseRegressionRepositoryId(params.get("repositoryId"))));
  } catch (error) { return failure(error); }
}
async function postRegression(request: Request) {
  const context = await githubApiContext(true); if (context instanceof Response) return privateResponse(context);
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin || request.headers.get("sec-fetch-site") === "cross-site") return reply({ error: "Origem não autorizada." }, 403);
  const reader = request.body?.getReader(), decoder = new TextDecoder("utf-8", { fatal: true });
  let text = "", size = 0;
  try {
    if (reader) while (true) {
      const chunk = await reader.read(); if (chunk.done) break;
      size += chunk.value.byteLength; if (size > 1000) return reply({ error: "Solicitação excede o limite." }, 413);
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
  } catch { return reply({ error: "Solicitação inválida." }, 400); }
  finally { await reader?.cancel().catch(() => undefined); }
  let input;
  try { input = parseRegressionCreate(JSON.parse(text)); }
  catch { return reply({ error: "Selecione um mapa e confirme a revisão e integração da fixture." }, 400); }
  try {
    return reply({ draft: await createAuthorizationRegressionDraft(DB(), context.workspace.id, context.user.id, input.codeMapId) }, 201);
  } catch (error) { return failure(error); }
}
export const GET = withApiTelemetry("GET /api/security/auth-contracts/regression", getRegression);
export const POST = withApiTelemetry("POST /api/security/auth-contracts/regression", postRegression);

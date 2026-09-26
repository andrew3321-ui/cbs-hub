import { env } from "cloudflare:workers";
import { withApiTelemetry } from "../../../../api-infrastructure";
import { githubApiContext } from "../../../../github-api-context";
import { authCodeMapCatalog, mapAuthContractCode } from "../../../../security-auth-code-map";
import type { GitHubEnv } from "../../../../github-client";
import { parseAuthContractId } from "../../../../../domain/security-auth-contracts";
import { parseAuthCodeMapInput } from "../../../../../domain/security-auth-code-map";

const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
function privateResponse(response: Response) { response.headers.set("Cache-Control", "no-store"); return response; }
const failure = (error: unknown) => {
  const code = error instanceof Error && /^(?:AUTH_CODE_MAP|GITHUB)_[A-Z0-9_]+$/.test(error.message) ? error.message : "AUTH_CODE_MAP_FAILED";
  const status = code === "AUTH_CODE_MAP_DAILY_LIMIT" ? 429 : code === "AUTH_CODE_MAP_CONTRACT_INVALID" ? 404
    : /INPUT_INVALID|RESCAN_REQUIRED|ROUTE_MISMATCH|SOURCE_INVALID/.test(code) ? 400 : /DISABLED|NOT_FOUND|AUTHORIZATION/.test(code) ? 403 : 503;
  return reply({ code, error: code === "AUTH_CODE_MAP_DAILY_LIMIT" ? "Limite diário de mapeamentos atingido."
    : "Não foi possível mapear este commit. Confira a autorização, o último scan e a implementação da rota." }, status);
};
async function getCodeMaps(request: Request) {
  const context = await githubApiContext();
  if (context instanceof Response) return privateResponse(context);
  const id = new URL(request.url).searchParams.get("contractId");
  try { parseAuthContractId(id); } catch { return reply({ error: "Contrato inválido." }, 400); }
  try { return reply(await authCodeMapCatalog((env as unknown as GitHubEnv).DB, context.workspace.id, id!)); }
  catch (error) { return failure(error); }
}
async function postCodeMap(request: Request) {
  const context = await githubApiContext(true);
  if (context instanceof Response) return privateResponse(context);
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin || request.headers.get("sec-fetch-site") === "cross-site") return reply({ error: "Origem não autorizada." }, 403);
  let text = "", size = 0;
  const reader = request.body?.getReader(), decoder = new TextDecoder("utf-8", { fatal: true });
  try {
    if (reader) while (true) {
      const chunk = await reader.read(); if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 2_000) return reply({ error: "Solicitação excede o limite." }, 413);
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
  } catch { return reply({ error: "Solicitação inválida." }, 400); }
  finally { await reader?.cancel().catch(() => undefined); }
  let input: unknown;
  try { input = JSON.parse(text); parseAuthCodeMapInput(input); } catch { return reply({ error: "Selecione uma rota do último scan e confirme a relação entre repositório e domínio." }, 400); }
  try { return reply({ mapping: await mapAuthContractCode(env as unknown as GitHubEnv, context.workspace.id, context.user.id, input) }, 201); }
  catch (error) { return failure(error); }
}
export const GET = withApiTelemetry("GET /api/security/auth-contracts/code-map", getCodeMaps);
export const POST = withApiTelemetry("POST /api/security/auth-contracts/code-map", postCodeMap);

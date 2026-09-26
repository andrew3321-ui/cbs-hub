import { env } from "cloudflare:workers";
import { getCurrentUser } from "../../../auth";
import { withApiTelemetry } from "../../../api-infrastructure";
import { getWorkspaceEntitlements } from "../../../plan-entitlements";
import { canManageWorkspace, getWorkspaceContext } from "../../../workspace";
import { authContractProofPack, createAuthContract, publicAuthContract, type AuthContractRow } from "../../../security-auth-contracts";
import { parseAuthContractCreate, parseAuthContractId } from "../../../../domain/security-auth-contracts";

const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
async function context() {
  const user = await getCurrentUser();
  if (!user) return reply({ error: "Faça login para acessar os contratos." }, 401);
  const workspace = await getWorkspaceContext(user.id);
  if (!workspace) return reply({ error: "Workspace indisponível." }, 403);
  if (!(await getWorkspaceEntitlements(workspace)).workspaceAccessAllowed) return reply({ error: "Workspace não liberado.", code: "CYBER_LAUNCH_GATE" }, 423);
  return { user, workspace };
}

async function getContracts(request: Request) {
  const current = await context();
  if (current instanceof Response) return current;
  const DB = (env as unknown as { DB: D1Database }).DB;
  const id = new URL(request.url).searchParams.get("contractId");
  if (id !== null) {
    try { parseAuthContractId(id); } catch { return reply({ error: "Contrato inválido." }, 400); }
    const proof = await authContractProofPack(DB, current.workspace.id, id);
    if (proof && new URL(request.url).searchParams.get("download") === "1") return new Response(JSON.stringify(proof, null, 2), {
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Content-Disposition": `attachment; filename="cbshub-${id}.json"` },
    });
    return proof ? reply(proof) : reply({ error: "Contrato não encontrado." }, 404);
  }
  const rows = await DB.prepare("SELECT * FROM security_auth_contracts WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 50").bind(current.workspace.id).all<AuthContractRow>();
  return reply({ contracts: rows.results.map(publicAuthContract) });
}

async function postContract(request: Request) {
  const current = await context();
  if (current instanceof Response) return current;
  if (!canManageWorkspace(current.workspace.role)) return reply({ error: "Somente proprietário ou administrador pode criar contratos." }, 403);
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return reply({ error: "Origem não autorizada." }, 403);
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > 1_000) return reply({ error: "Solicitação excede o limite." }, 413);
  let input;
  try { input = parseAuthContractCreate(JSON.parse(text)); }
  catch { return reply({ error: "Informe uma análise concluída com marcador, um título sem dados pessoais e confirme a regra de acesso." }, 400); }
  try {
    return reply({ contract: await createAuthContract((env as unknown as { DB: D1Database }).DB, current.workspace.id, current.user.id, input) }, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_CONTRACT_LIMIT") return reply({ error: "Limite de 50 contratos por workspace atingido." }, 429);
    if (error instanceof Error && error.message === "AUTH_CONTRACT_BASELINE_INVALID") return reply({ error: "A análise precisa ter controle positivo com marcador e autorização vigente neste workspace." }, 400);
    throw error;
  }
}

export const GET = withApiTelemetry("GET /api/security/auth-contracts", getContracts);
export const POST = withApiTelemetry("POST /api/security/auth-contracts", postContract);

import { env } from "cloudflare:workers";
import { getCurrentUser } from "../../auth";
import { getWorkspaceContext } from "../../workspace";
import { withApiTelemetry } from "../../api-infrastructure";

async function getAuditEvents(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para acessar a trilha de auditoria." }, { status: 401 });
  try {
    const workspace = await getWorkspaceContext(user.id);
    if (!workspace) return Response.json({ error: "Workspace não encontrado." }, { status: 403 });
    const url = new URL(request.url);
    const scopeId = url.searchParams.get("scopeId");
    if (!scopeId || scopeId.length > 100) return Response.json({ error: "Ativo inválido." }, { status: 400 });
    const scope = await env.DB.prepare("SELECT id FROM security_agent_scopes WHERE id = ? AND workspace_id = ?").bind(scopeId, workspace.id).first();
    if (!scope) return Response.json({ error: "Ativo não encontrado." }, { status: 404 });
    const rows = await env.DB.prepare("SELECT id, scope_id, actor_user_id, event_type, details_json, created_at FROM security_agent_events WHERE workspace_id = ? AND scope_id = ? ORDER BY created_at DESC, id DESC LIMIT 100").bind(workspace.id, scopeId).all();
    return Response.json({ events: rows.results }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Não foi possível carregar a trilha de auditoria." }, { status: 500 });
  }
}

export const GET = withApiTelemetry("GET /api/audit-events", getAuditEvents);

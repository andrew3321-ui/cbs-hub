import { and, desc, eq, lt } from "drizzle-orm";
import { ensureScenarioSchema, getDb } from "../../../db";
import { auditEvents, companies } from "../../../db/schema";
import { getCurrentUser } from "../../auth";
import { getWorkspaceContext } from "../../workspace";
import { withApiTelemetry } from "../../api-infrastructure";

async function getAuditEvents(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para acessar a trilha de auditoria." }, { status: 401 });
  try {
    await ensureScenarioSchema();
    const workspace = await getWorkspaceContext(user.id);
    if (!workspace) return Response.json({ error: "Espaço profissional não encontrado." }, { status: 403 });
    const url = new URL(request.url);
    const companyId = Number(url.searchParams.get("companyId"));
    const cursor = Number(url.searchParams.get("cursor"));
    const requestedLimit = Number(url.searchParams.get("limit"));
    const pageSize = Number.isInteger(requestedLimit) ? Math.min(100, Math.max(10, requestedLimit)) : 50;
    if (!Number.isInteger(companyId) || companyId <= 0) return Response.json({ error: "Empresa inválida." }, { status: 400 });
    const db = getDb();
    const [company] = await db.select({ id: companies.id }).from(companies).where(and(eq(companies.id, companyId), eq(companies.workspaceId, workspace.id))).limit(1);
    if (!company) return Response.json({ error: "Empresa não encontrada." }, { status: 404 });

    const rows = await db.select().from(auditEvents).where(and(eq(auditEvents.ownerUserId, workspace.ownerUserId), eq(auditEvents.companyId, companyId), Number.isInteger(cursor) && cursor > 0 ? lt(auditEvents.id, cursor) : undefined)).orderBy(desc(auditEvents.createdAt), desc(auditEvents.id)).limit(pageSize + 1);
    const hasMore = rows.length > pageSize;
    const page = rows.slice(0, pageSize);
    return Response.json({ events: page.map((event) => {
      try { return { ...event, eventData: JSON.parse(event.eventData) as Record<string, unknown> }; }
      catch { return { ...event, eventData: {} }; }
    }), nextCursor: hasMore ? page.at(-1)?.id ?? null : null });
  } catch {
    return Response.json({ error: "Não foi possível carregar a trilha de auditoria." }, { status: 500 });
  }
}

export const GET = withApiTelemetry("GET /api/audit-events", getAuditEvents);

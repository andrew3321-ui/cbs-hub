import { and, desc, eq } from "drizzle-orm";
import { ensureScenarioSchema, getDb } from "../../../db";
import { auditEvents, companies } from "../../../db/schema";
import { getCurrentUser } from "../../auth";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para acessar a trilha de auditoria." }, { status: 401 });
  try {
    await ensureScenarioSchema();
    const companyId = Number(new URL(request.url).searchParams.get("companyId"));
    if (!Number.isInteger(companyId) || companyId <= 0) return Response.json({ error: "Empresa inválida." }, { status: 400 });
    const db = getDb();
    const [company] = await db.select({ id: companies.id }).from(companies).where(and(eq(companies.id, companyId), eq(companies.ownerUserId, user.id))).limit(1);
    if (!company) return Response.json({ error: "Empresa não encontrada." }, { status: 404 });

    const rows = await db.select().from(auditEvents).where(and(eq(auditEvents.ownerUserId, user.id), eq(auditEvents.companyId, companyId))).orderBy(desc(auditEvents.createdAt), desc(auditEvents.id)).limit(100);
    return Response.json({ events: rows.map((event) => {
      try { return { ...event, eventData: JSON.parse(event.eventData) as Record<string, unknown> }; }
      catch { return { ...event, eventData: {} }; }
    }) });
  } catch {
    return Response.json({ error: "Não foi possível carregar a trilha de auditoria." }, { status: 500 });
  }
}

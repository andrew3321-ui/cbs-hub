import { and, desc, eq, isNull } from "drizzle-orm";
import { getCurrentUser } from "../../auth";
import { ensureScenarioSchema, getDb } from "../../../db";
import { companies, reportShares, scenarios } from "../../../db/schema";

function secureToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para acessar os compartilhamentos." }, { status: 401 });
  try {
    await ensureScenarioSchema();
    const companyId = Number(new URL(request.url).searchParams.get("companyId"));
    if (!Number.isInteger(companyId) || companyId <= 0) return Response.json({ error: "Empresa inválida." }, { status: 400 });
    const [ownedCompany] = await getDb().select({ id: companies.id }).from(companies).where(and(eq(companies.id, companyId), eq(companies.ownerUserId, user.id))).limit(1);
    if (!ownedCompany) return Response.json({ error: "Empresa não encontrada." }, { status: 404 });

    const rows = await getDb().select({ id: reportShares.id, token: reportShares.token, scenarioId: reportShares.scenarioId, scenarioName: scenarios.name, companyId: reportShares.companyId, note: reportShares.note, expiresAt: reportShares.expiresAt, revokedAt: reportShares.revokedAt, views: reportShares.views, lastViewedAt: reportShares.lastViewedAt, createdAt: reportShares.createdAt }).from(reportShares).innerJoin(scenarios, eq(reportShares.scenarioId, scenarios.id)).where(and(eq(reportShares.companyId, companyId), eq(reportShares.ownerUserId, user.id))).orderBy(desc(reportShares.createdAt)).limit(30);
    const origin = new URL(request.url).origin;
    return Response.json({ shares: rows.map((row) => ({ ...row, url: `${origin}/relatorio/${row.token}` })) });
  } catch {
    return Response.json({ error: "Não foi possível carregar os links compartilhados." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para compartilhar relatórios." }, { status: 401 });
  try {
    await ensureScenarioSchema();
    const payload = (await request.json()) as Record<string, unknown>;
    const scenarioId = Number(payload.scenarioId);
    const expiryDays = [7, 30, 90].includes(Number(payload.expiryDays)) ? Number(payload.expiryDays) : 30;
    const note = typeof payload.note === "string" ? payload.note.trim().slice(0, 240) : "";
    if (!Number.isInteger(scenarioId) || scenarioId <= 0) return Response.json({ error: "Cenário inválido." }, { status: 400 });

    const db = getDb();
    const [ownedScenario] = await db.select({ scenarioId: scenarios.id, companyId: companies.id }).from(scenarios).innerJoin(companies, eq(scenarios.companyId, companies.id)).where(and(eq(scenarios.id, scenarioId), eq(companies.ownerUserId, user.id))).limit(1);
    if (!ownedScenario) return Response.json({ error: "Cenário não encontrado." }, { status: 404 });

    const now = new Date().toISOString();
    await db.update(reportShares).set({ revokedAt: now }).where(and(eq(reportShares.scenarioId, scenarioId), eq(reportShares.ownerUserId, user.id), isNull(reportShares.revokedAt)));
    const [share] = await db.insert(reportShares).values({ token: secureToken(), scenarioId, companyId: ownedScenario.companyId, ownerUserId: user.id, note: note || null, expiresAt: new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString() }).returning();
    return Response.json({ share: { ...share, url: `${new URL(request.url).origin}/relatorio/${share.token}` } }, { status: 201 });
  } catch {
    return Response.json({ error: "Não foi possível gerar o link agora." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para revogar links." }, { status: 401 });
  try {
    await ensureScenarioSchema();
    const id = Number(new URL(request.url).searchParams.get("id"));
    if (!Number.isInteger(id) || id <= 0) return Response.json({ error: "Link inválido." }, { status: 400 });
    const [ownedShare] = await getDb().select({ id: reportShares.id }).from(reportShares).where(and(eq(reportShares.id, id), eq(reportShares.ownerUserId, user.id))).limit(1);
    if (!ownedShare) return Response.json({ error: "Link não encontrado." }, { status: 404 });
    await getDb().update(reportShares).set({ revokedAt: new Date().toISOString() }).where(eq(reportShares.id, id));
    return Response.json({ revoked: true });
  } catch {
    return Response.json({ error: "Não foi possível revogar o link." }, { status: 500 });
  }
}

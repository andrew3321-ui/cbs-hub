import { eq, inArray } from "drizzle-orm";
import { clearSessionCookieHeader, getCurrentUser, verifyPassword } from "../../auth";
import { ensureScenarioSchema, getDb } from "../../../db";
import { companies, reportShares, scenarios, sessions, users } from "../../../db/schema";

export async function DELETE(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return Response.json({ error: "Faça login para excluir sua conta." }, { status: 401 });
  try {
    await ensureScenarioSchema();
    const payload = (await request.json()) as Record<string, unknown>;
    const password = typeof payload.password === "string" ? payload.password : "";
    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.id, currentUser.id)).limit(1);
    if (!user || !(await verifyPassword(password, user.passwordSalt, user.passwordHash))) return Response.json({ error: "Senha incorreta." }, { status: 403 });

    const ownedCompanies = await db.select({ id: companies.id }).from(companies).where(eq(companies.ownerUserId, user.id));
    const companyIds = ownedCompanies.map((company) => company.id);
    await db.delete(reportShares).where(eq(reportShares.ownerUserId, user.id));
    if (companyIds.length) await db.delete(scenarios).where(inArray(scenarios.companyId, companyIds));
    await db.delete(companies).where(eq(companies.ownerUserId, user.id));
    await db.delete(sessions).where(eq(sessions.userId, user.id));
    await db.delete(users).where(eq(users.id, user.id));
    return Response.json({ deleted: true }, { headers: { "Set-Cookie": clearSessionCookieHeader(request) } });
  } catch {
    return Response.json({ error: "Não foi possível excluir a conta." }, { status: 500 });
  }
}

import { eq, inArray } from "drizzle-orm";
import { clearSessionCookieHeader, getCurrentUser, verifyPassword } from "../../auth";
import { ensureScenarioSchema, getDb } from "../../../db";
import { accountingWorkspaces, auditEvents, billingAccounts, companies, reportShares, scenarioApprovals, scenarios, sessions, users, workspaceInvitations, workspaceMembers } from "../../../db/schema";
import { getWorkspaceContext } from "../../workspace";

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
    const workspace = await getWorkspaceContext(user.id);
    if (!workspace) return Response.json({ error: "Espaço profissional não encontrado." }, { status: 409 });
    const members = await db.select({ userId: workspaceMembers.userId }).from(workspaceMembers).where(eq(workspaceMembers.workspaceId, workspace.id));
    if (workspace.role === "owner" && workspace.type === "office" && members.length > 1) return Response.json({ error: "Remova os demais membros ou transfira a responsabilidade do escritório antes de excluir a conta." }, { status: 409 });

    if (workspace.role !== "owner") {
      await db.delete(workspaceMembers).where(eq(workspaceMembers.userId, user.id));
      await db.delete(billingAccounts).where(eq(billingAccounts.userId, user.id));
      await db.delete(sessions).where(eq(sessions.userId, user.id));
      await db.delete(users).where(eq(users.id, user.id));
      return Response.json({ deleted: true }, { headers: { "Set-Cookie": clearSessionCookieHeader(request) } });
    }

    const ownedCompanies = await db.select({ id: companies.id }).from(companies).where(eq(companies.workspaceId, workspace.id));
    const companyIds = ownedCompanies.map((company) => company.id);
    await db.delete(billingAccounts).where(eq(billingAccounts.userId, user.id));
    await db.delete(auditEvents).where(eq(auditEvents.ownerUserId, user.id));
    await db.delete(reportShares).where(eq(reportShares.ownerUserId, user.id));
    await db.delete(scenarioApprovals).where(eq(scenarioApprovals.ownerUserId, user.id));
    if (companyIds.length) await db.delete(scenarios).where(inArray(scenarios.companyId, companyIds));
    await db.delete(companies).where(eq(companies.ownerUserId, user.id));
    await db.delete(workspaceInvitations).where(eq(workspaceInvitations.workspaceId, workspace.id));
    await db.delete(workspaceMembers).where(eq(workspaceMembers.workspaceId, workspace.id));
    await db.delete(accountingWorkspaces).where(eq(accountingWorkspaces.id, workspace.id));
    await db.delete(sessions).where(eq(sessions.userId, user.id));
    await db.delete(users).where(eq(users.id, user.id));
    return Response.json({ deleted: true }, { headers: { "Set-Cookie": clearSessionCookieHeader(request) } });
  } catch {
    return Response.json({ error: "Não foi possível excluir a conta." }, { status: 500 });
  }
}

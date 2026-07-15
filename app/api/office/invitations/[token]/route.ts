import { and, eq, gt } from "drizzle-orm";
import { ensureScenarioSchema, getDb } from "../../../../../db";
import { accountingWorkspaces, workspaceInvitations } from "../../../../../db/schema";
import { sha256Hex } from "../../../../workspace";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    await ensureScenarioSchema();
    const { token } = await params;
    if (!/^[0-9a-f]{48}$/.test(token)) return Response.json({ error: "Convite inválido." }, { status: 400 });
    const [invitation] = await getDb().select({
      email: workspaceInvitations.email,
      role: workspaceInvitations.role,
      expiresAt: workspaceInvitations.expiresAt,
      workspaceName: accountingWorkspaces.name,
    }).from(workspaceInvitations)
      .innerJoin(accountingWorkspaces, eq(workspaceInvitations.workspaceId, accountingWorkspaces.id))
      .where(and(
        eq(workspaceInvitations.tokenHash, await sha256Hex(token)),
        eq(workspaceInvitations.status, "pending"),
        gt(workspaceInvitations.expiresAt, new Date().toISOString()),
      )).limit(1);
    if (!invitation) return Response.json({ error: "Este convite expirou ou já foi utilizado." }, { status: 410 });
    return Response.json({ invitation });
  } catch {
    return Response.json({ error: "Não foi possível verificar o convite." }, { status: 500 });
  }
}

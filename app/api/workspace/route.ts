import { and, eq } from "drizzle-orm";
import { ensureScenarioSchema, getDb } from "../../../db";
import { accountingWorkspaces, users } from "../../../db/schema";
import { getCurrentUser } from "../../auth";
import { getWorkspaceContext } from "../../workspace";
import { withApiTelemetry } from "../../api-infrastructure";

async function upgradeWorkspace(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para alterar o modo de trabalho." }, { status: 401 });
  try {
    await ensureScenarioSchema();
    const workspace = await getWorkspaceContext(user.id);
    if (!workspace || workspace.role !== "owner") return Response.json({ error: "Somente o proprietário pode alterar o modo de trabalho." }, { status: 403 });
    if (workspace.type === "office") return Response.json({ workspace });
    const payload = (await request.json()) as Record<string, unknown>;
    const name = typeof payload.name === "string" ? payload.name.trim().replace(/\s+/g, " ").slice(0, 120) : "";
    if (name.length < 2) return Response.json({ error: "Informe o nome do escritório contábil." }, { status: 400 });
    const db = getDb();
    await db.batch([
      db.update(accountingWorkspaces).set({ name, workspaceType: "office", suggestedPlanKey: "escritorio" }).where(and(eq(accountingWorkspaces.id, workspace.id), eq(accountingWorkspaces.ownerUserId, user.id))),
      db.update(users).set({ accountType: "office", suggestedPlanKey: "escritorio" }).where(eq(users.id, user.id)),
    ]);
    return Response.json({ workspace: { ...workspace, name, type: "office", suggestedPlanKey: "escritorio" } });
  } catch {
    return Response.json({ error: "Não foi possível ativar o modo escritório." }, { status: 500 });
  }
}

export const PATCH = withApiTelemetry("PATCH /api/workspace", upgradeWorkspace);

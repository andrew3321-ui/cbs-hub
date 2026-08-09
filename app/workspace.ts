import { and, eq } from "drizzle-orm";
import { getDb } from "../db";
import { accountingWorkspaces, workspaceMembers } from "../db/schema";
import { roleHasPermission } from "../domain/workspace-authorization";

export type WorkspaceType = "individual" | "office";
export type WorkspaceRole = "owner" | "admin" | "preparer" | "reviewer";

export type WorkspaceContext = {
  id: number;
  name: string;
  type: WorkspaceType;
  ownerUserId: number;
  suggestedPlanKey: "pro" | "escritorio" | "unico";
  role: WorkspaceRole;
};

export async function getWorkspaceContext(userId: number): Promise<WorkspaceContext | null> {
  const [row] = await getDb()
    .select({
      id: accountingWorkspaces.id,
      name: accountingWorkspaces.name,
      type: accountingWorkspaces.workspaceType,
      ownerUserId: accountingWorkspaces.ownerUserId,
      suggestedPlanKey: accountingWorkspaces.suggestedPlanKey,
      role: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .innerJoin(accountingWorkspaces, eq(workspaceMembers.workspaceId, accountingWorkspaces.id))
    .where(and(eq(workspaceMembers.userId, userId), eq(workspaceMembers.status, "active")))
    .limit(1);
  if (!row || !["individual", "office"].includes(row.type) || !["owner", "admin", "preparer", "reviewer"].includes(row.role)) return null;
  return {
    ...row,
    type: row.type as WorkspaceType,
    role: row.role as WorkspaceRole,
    suggestedPlanKey: row.type === "office" ? "escritorio" : row.suggestedPlanKey === "unico" ? "unico" : "pro",
  };
}

export function canManageWorkspace(role: WorkspaceRole) {
  return roleHasPermission(role, "manage_workspace");
}

export function canPrepareScenarios(role: WorkspaceRole) {
  return roleHasPermission(role, "prepare_scenario");
}

export function canReviewScenarios(role: WorkspaceRole) {
  return roleHasPermission(role, "review_scenario");
}

export async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function createWorkspaceInvitationToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

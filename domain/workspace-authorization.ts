export const workspaceRoles = ["owner", "admin", "preparer", "reviewer"] as const;
export type WorkspaceAuthorizationRole = typeof workspaceRoles[number];
export type WorkspacePermission = "manage_workspace" | "prepare_scenario" | "review_scenario" | "manage_billing";

const permissionRoles: Record<WorkspacePermission, readonly WorkspaceAuthorizationRole[]> = {
  manage_workspace: ["owner", "admin"],
  prepare_scenario: ["owner", "admin", "preparer"],
  review_scenario: ["owner", "admin", "reviewer"],
  manage_billing: ["owner"],
};

export function roleHasPermission(role: string, permission: WorkspacePermission) {
  return workspaceRoles.includes(role as WorkspaceAuthorizationRole)
    && permissionRoles[permission].includes(role as WorkspaceAuthorizationRole);
}

export function authorizeWorkspaceResource(input: {
  actorWorkspaceId: number;
  resourceWorkspaceId: number;
  actorRole: string;
  permission: WorkspacePermission;
}) {
  return Number.isInteger(input.actorWorkspaceId)
    && input.actorWorkspaceId > 0
    && input.actorWorkspaceId === input.resourceWorkspaceId
    && roleHasPermission(input.actorRole, input.permission);
}


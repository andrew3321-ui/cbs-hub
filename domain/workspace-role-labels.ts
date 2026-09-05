export type WorkspaceAccountType = "individual" | "office";
export type WorkspaceAccountRole = "owner" | "admin" | "preparer" | "reviewer";

export function workspaceAccountRoleLabel(
  workspaceType: WorkspaceAccountType,
  workspaceRole: WorkspaceAccountRole,
  isPlatformAdmin: boolean,
) {
  if (isPlatformAdmin) return "Proprietário";
  if (workspaceRole === "owner") return workspaceType === "office" ? "Responsável pelo workspace" : "Responsável pelo ambiente";
  if (workspaceRole === "admin") return "Administrador";
  if (workspaceRole === "reviewer") return "Analista";
  return "Operador";
}

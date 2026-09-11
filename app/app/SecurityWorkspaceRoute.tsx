import { redirect } from "next/navigation";
import { getCurrentUser } from "../auth";
import { getWorkspaceEntitlements } from "../plan-entitlements";
import { getWorkspaceContext } from "../workspace";
import ClientErrorBoundary from "./ClientErrorBoundary";
import CyberLaunchGate from "./CyberLaunchGate";
import SecurityAgentCenter, { type WorkspaceView } from "./SecurityAgentCenter";

export async function renderSecurityWorkspace(view: WorkspaceView, returnTo: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/entrar?returnTo=${encodeURIComponent(returnTo)}`);
  const workspace = await getWorkspaceContext(user.id);
  if (!workspace) redirect(`/entrar?returnTo=${encodeURIComponent(returnTo)}`);
  const entitlements = await getWorkspaceEntitlements(workspace);
  if (!entitlements.workspaceAccessAllowed) return <CyberLaunchGate username={user.username} />;
  return <ClientErrorBoundary><SecurityAgentCenter view={view} /></ClientErrorBoundary>;
}

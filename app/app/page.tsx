import { redirect } from "next/navigation";
import { getCurrentUser } from "../auth";
import { getWorkspaceEntitlements } from "../plan-entitlements";
import { getWorkspaceContext } from "../workspace";
import ClientErrorBoundary from "./ClientErrorBoundary";
import CyberLaunchGate from "./CyberLaunchGate";
import SecurityAgentCenter from "./SecurityAgentCenter";

export const dynamic = "force-dynamic";

export default async function AppPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar?returnTo=%2Fapp");
  const workspace = await getWorkspaceContext(user.id);
  if (!workspace) redirect("/entrar?returnTo=%2Fapp");
  const entitlements = await getWorkspaceEntitlements(workspace);
  if (!entitlements.workspaceAccessAllowed) return <CyberLaunchGate username={user.username} />;
  return <ClientErrorBoundary><SecurityAgentCenter /></ClientErrorBoundary>;
}

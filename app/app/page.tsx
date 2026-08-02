import { requireAppUser, userHasContactEmail } from "../auth";
import CBSHubApp from "./CBSHubApp";
import { getWorkspaceContext } from "../workspace";
import { isPlatformAdminEmail } from "../platform-admin";
import { getWorkspaceEntitlements } from "../plan-entitlements";
import ClientErrorBoundary from "./ClientErrorBoundary";

export const dynamic = "force-dynamic";

export default async function ProtectedAppPage() {
  const user = await requireAppUser("/app");
  const workspace = await getWorkspaceContext(user.id);
  if (!workspace) throw new Error("workspace_unavailable");
  const entitlements = await getWorkspaceEntitlements(workspace);
  return <ClientErrorBoundary><CBSHubApp user={{ id: user.id, displayName: user.name, firstName: user.firstName, username: user.username, accountCode: user.accountCode, email: user.email, contactEmail: userHasContactEmail(user.email) ? user.email : "" }} workspace={workspace} initialEntitlements={entitlements} signOutPath="/sair" isPlatformAdmin={isPlatformAdminEmail(user.email)} /></ClientErrorBoundary>;
}

import { requireAppUser } from "../auth";
import MargemApp from "./MargemApp";
import { getWorkspaceContext } from "../workspace";
import { isPlatformAdminEmail } from "../platform-admin";
import { getWorkspaceEntitlements } from "../plan-entitlements";

export const dynamic = "force-dynamic";

export default async function ProtectedAppPage() {
  const user = await requireAppUser("/app");
  const workspace = await getWorkspaceContext(user.id);
  if (!workspace) throw new Error("workspace_unavailable");
  const entitlements = await getWorkspaceEntitlements(workspace);
  return <MargemApp user={{ id: user.id, displayName: user.name, email: user.email }} workspace={workspace} initialEntitlements={entitlements} signOutPath="/sair" isPlatformAdmin={isPlatformAdminEmail(user.email)} />;
}

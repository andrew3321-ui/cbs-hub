import { getCurrentUser, userHasContactEmail } from "../auth";
import CBSHubApp from "./CBSHubApp";
import GuestCBSHubApp from "./GuestCBSHubApp";
import { getWorkspaceContext } from "../workspace";
import { isPlatformAdminEmail } from "../platform-admin";
import { getWorkspaceEntitlements } from "../plan-entitlements";
import ClientErrorBoundary from "./ClientErrorBoundary";

export const dynamic = "force-dynamic";

type AppPageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const attributionKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

function guestAccessHref(pathname: "/cadastro" | "/entrar", values: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams({ returnTo: "/app?view=intelligence" });
  for (const key of attributionKeys) {
    const raw = values[key];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (value?.trim()) params.set(key, value.trim().slice(0, 120));
  }
  return `${pathname}?${params.toString()}`;
}

export default async function AppPage({ searchParams }: AppPageProps) {
  const user = await getCurrentUser();
  if (!user) {
    const attribution = await searchParams;
    return <GuestCBSHubApp registerHref={guestAccessHref("/cadastro", attribution)} loginHref={guestAccessHref("/entrar", attribution)} />;
  }
  const workspace = await getWorkspaceContext(user.id);
  if (!workspace) throw new Error("workspace_unavailable");
  const entitlements = await getWorkspaceEntitlements(workspace);
  return <ClientErrorBoundary><CBSHubApp user={{ id: user.id, displayName: user.name, firstName: user.firstName, username: user.username, accountCode: user.accountCode, email: user.email, contactEmail: userHasContactEmail(user.email) ? user.email : "" }} workspace={workspace} initialEntitlements={entitlements} signOutPath="/sair" isPlatformAdmin={isPlatformAdminEmail(user.email)} /></ClientErrorBoundary>;
}

import { renderSecurityWorkspace } from "./SecurityWorkspaceRoute";

export const dynamic = "force-dynamic";

export default async function AppPage() {
  return renderSecurityWorkspace("overview", "/app");
}

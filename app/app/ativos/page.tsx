import { renderSecurityWorkspace } from "../SecurityWorkspaceRoute";

export const dynamic = "force-dynamic";

export default async function MonitoredAssetsPage() {
  return renderSecurityWorkspace("assets", "/app/ativos");
}

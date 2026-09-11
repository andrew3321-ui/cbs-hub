import { renderSecurityWorkspace } from "../SecurityWorkspaceRoute";

export const dynamic = "force-dynamic";

export default async function SecurityProjectsPage() {
  return renderSecurityWorkspace("repositories", "/app/projetos");
}

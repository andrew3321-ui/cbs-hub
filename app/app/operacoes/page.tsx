import { renderSecurityWorkspace } from "../SecurityWorkspaceRoute";

export const dynamic = "force-dynamic";

export default async function SecurityOperationsPage() {
  return renderSecurityWorkspace("operations", "/app/operacoes");
}

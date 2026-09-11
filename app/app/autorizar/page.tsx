import { renderSecurityWorkspace } from "../SecurityWorkspaceRoute";

export const dynamic = "force-dynamic";

export default async function AuthorizeAssetPage() {
  return renderSecurityWorkspace("authorize", "/app/autorizar");
}

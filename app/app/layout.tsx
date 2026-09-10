import securityAgent from "../security-agent.css?url";
import securityWorkspace from "../security-workspace.css?url";
import securityDefense from "../security-defense.css?url";
import securityRepositories from "../security-repositories.css?url";

const workspaceStyles = [securityAgent, securityWorkspace, securityDefense, securityRepositories];

export default function WorkspaceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <>{workspaceStyles.map((href) => <link key={href} rel="stylesheet" href={href} />)}{children}</>;
}

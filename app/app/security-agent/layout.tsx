import agentStyles from "../../security-agent.css?url";

export default function SecurityAgentLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <><link rel="stylesheet" href={agentStyles} />{children}</>;
}

import homologation from "../homologation.css?url";
import simulations from "../homologation-simulations.css?url";
import federal from "../federal-pme.css?url";
import national from "../national-coverage.css?url";
import nationalV64 from "../national-coverage-v64.css?url";
import expansion from "../fiscal-expansion.css?url";
import laboratory from "../deterministic-tax-lab.css?url";
import legal from "../legal-reference-center.css?url";
import reform from "../tax-reform-impact.css?url";
import onboarding from "../account-onboarding.css?url";

const workspaceStyles = [homologation, simulations, federal, national, nationalV64, expansion, laboratory, legal, reform, onboarding];

export default function WorkspaceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <>{workspaceStyles.map((href) => <link key={href} rel="stylesheet" href={href} />)}{children}</>;
}

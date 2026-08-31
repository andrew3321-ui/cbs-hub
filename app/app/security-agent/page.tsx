import { requireAppUser } from "../../auth";
import SecurityAgentCenter from "../SecurityAgentCenter";

export const dynamic = "force-dynamic";

export default async function SecurityAgentPage() {
  await requireAppUser("/app/security-agent");
  return <SecurityAgentCenter />;
}

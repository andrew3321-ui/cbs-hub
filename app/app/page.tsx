import { redirect } from "next/navigation";
import { getCurrentUser } from "../auth";
import ClientErrorBoundary from "./ClientErrorBoundary";
import SecurityAgentCenter from "./SecurityAgentCenter";

export const dynamic = "force-dynamic";

export default async function AppPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar?returnTo=%2Fapp");
  return <ClientErrorBoundary><SecurityAgentCenter /></ClientErrorBoundary>;
}

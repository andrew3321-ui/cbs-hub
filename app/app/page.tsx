import { requireAppUser } from "../auth";
import MargemApp from "./MargemApp";

export const dynamic = "force-dynamic";

export default async function ProtectedAppPage() {
  const user = await requireAppUser("/app");
  return <MargemApp user={{ displayName: user.name, email: user.email }} signOutPath="/sair" />;
}

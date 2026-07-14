import { redirect } from "next/navigation";
import { getCurrentUser } from "../auth";
import AuthScreen from "../auth-ui/AuthScreen";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/app");
  return <AuthScreen mode="register" />;
}

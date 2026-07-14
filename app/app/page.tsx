import { chatGPTSignOutPath, requireChatGPTUser } from "../chatgpt-auth";
import MargemApp from "./MargemApp";

export const dynamic = "force-dynamic";

export default async function ProtectedAppPage() {
  const user = await requireChatGPTUser("/app");
  return <MargemApp user={{ displayName: user.displayName, email: user.email }} signOutPath={chatGPTSignOutPath("/")} />;
}

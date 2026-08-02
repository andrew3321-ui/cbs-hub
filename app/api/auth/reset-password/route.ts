import { eq, or } from "drizzle-orm";
import { constantTimeEqual, hashPassword, hashRecoveryKey, normalizeEmail, normalizeUsername, passwordIsStrong } from "../../../auth";
import { getDb } from "../../../../db";
import { sessions, users } from "../../../../db/schema";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const identifier = typeof payload.login === "string" ? payload.login : typeof payload.email === "string" ? payload.email : "";
    const recoveryKey = typeof payload.recoveryKey === "string" ? payload.recoveryKey : "";
    const password = typeof payload.password === "string" ? payload.password : "";
    if (!identifier.trim() || !recoveryKey || !passwordIsStrong(password)) return Response.json({ error: "Revise o usuário, a chave e a nova senha." }, { status: 400 });

    const [user] = await getDb().select().from(users).where(or(eq(users.username, normalizeUsername(identifier)), eq(users.email, normalizeEmail(identifier)))).limit(1);
    const suppliedHash = await hashRecoveryKey(recoveryKey);
    if (!user || !constantTimeEqual(suppliedHash, user.recoveryKeyHash)) return Response.json({ error: "Usuário ou chave de recuperação inválidos." }, { status: 400 });

    const passwordData = await hashPassword(password);
    await getDb().update(users).set({ passwordHash: passwordData.hash, passwordSalt: passwordData.salt, passwordIterations: passwordData.iterations, failedLoginAttempts: 0, lockedUntil: null }).where(eq(users.id, user.id));
    await getDb().delete(sessions).where(eq(sessions.userId, user.id));
    return Response.json({ reset: true });
  } catch {
    return Response.json({ error: "Não foi possível redefinir a senha agora." }, { status: 500 });
  }
}

import { eq, or } from "drizzle-orm";
import { createSession, CURRENT_PASSWORD_ITERATIONS, hashPassword, normalizeEmail, normalizeUsername, sessionCookieHeader, verifyPassword } from "../../../auth";
import { getDb } from "../../../../db";
import { users } from "../../../../db/schema";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const identifier = typeof payload.login === "string" ? payload.login : typeof payload.email === "string" ? payload.email : "";
    const password = typeof payload.password === "string" ? payload.password : "";
    const [user] = await getDb().select().from(users).where(or(eq(users.username, normalizeUsername(identifier)), eq(users.email, normalizeEmail(identifier)))).limit(1);

    if (!user) return Response.json({ error: "Usuário ou senha incorretos." }, { status: 401 });

    const now = Date.now();
    if (user.lockedUntil && new Date(user.lockedUntil).getTime() > now) {
      return Response.json({ error: "Muitas tentativas. Aguarde 15 minutos e tente novamente." }, { status: 429 });
    }

    const valid = await verifyPassword(password, user.passwordSalt, user.passwordHash, user.passwordIterations);
    if (!valid) {
      const attempts = user.lockedUntil ? 1 : user.failedLoginAttempts + 1;
      const lockedUntil = attempts >= 5 ? new Date(now + 15 * 60 * 1000).toISOString() : null;
      await getDb().update(users).set({ failedLoginAttempts: lockedUntil ? 0 : attempts, lockedUntil }).where(eq(users.id, user.id));
      return Response.json({ error: "Usuário ou senha incorretos." }, { status: 401 });
    }

    const passwordUpgrade = user.passwordIterations < CURRENT_PASSWORD_ITERATIONS ? await hashPassword(password) : null;
    await getDb().update(users).set({ failedLoginAttempts: 0, lockedUntil: null, ...(passwordUpgrade ? { passwordHash: passwordUpgrade.hash, passwordSalt: passwordUpgrade.salt, passwordIterations: passwordUpgrade.iterations } : {}) }).where(eq(users.id, user.id));
    const session = await createSession(user.id);
    return Response.json({ user: { id: user.id, name: user.name, firstName: user.firstName, username: user.username, accountCode: user.accountCode, email: user.email } }, { headers: { "Set-Cookie": sessionCookieHeader(session.token, request) } });
  } catch (error) {
    const reason = error instanceof Error && /^fiscal_(?:rule|knowledge)_/.test(error.message)
      ? error.message
      : error instanceof Error
        ? error.name
        : "UnknownError";
    console.error(JSON.stringify({
      event: "auth.login_failed_unexpectedly",
      error: reason,
    }));
    return Response.json({ error: "Não foi possível entrar agora." }, { status: 500 });
  }
}

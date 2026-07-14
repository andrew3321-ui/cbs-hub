import { eq } from "drizzle-orm";
import { createSession, normalizeEmail, sessionCookieHeader, verifyPassword } from "../../../auth";
import { ensureScenarioSchema, getDb } from "../../../../db";
import { users } from "../../../../db/schema";

export async function POST(request: Request) {
  try {
    await ensureScenarioSchema();
    const payload = (await request.json()) as Record<string, unknown>;
    const email = normalizeEmail(typeof payload.email === "string" ? payload.email : "");
    const password = typeof payload.password === "string" ? payload.password : "";
    const [user] = await getDb().select().from(users).where(eq(users.email, email)).limit(1);

    if (!user) return Response.json({ error: "E-mail ou senha incorretos." }, { status: 401 });

    const now = Date.now();
    if (user.lockedUntil && new Date(user.lockedUntil).getTime() > now) {
      return Response.json({ error: "Muitas tentativas. Aguarde 15 minutos e tente novamente." }, { status: 429 });
    }

    const valid = await verifyPassword(password, user.passwordSalt, user.passwordHash);
    if (!valid) {
      const attempts = user.lockedUntil ? 1 : user.failedLoginAttempts + 1;
      const lockedUntil = attempts >= 5 ? new Date(now + 15 * 60 * 1000).toISOString() : null;
      await getDb().update(users).set({ failedLoginAttempts: lockedUntil ? 0 : attempts, lockedUntil }).where(eq(users.id, user.id));
      return Response.json({ error: "E-mail ou senha incorretos." }, { status: 401 });
    }

    await getDb().update(users).set({ failedLoginAttempts: 0, lockedUntil: null }).where(eq(users.id, user.id));
    const session = await createSession(user.id);
    return Response.json({ user: { id: user.id, name: user.name, email: user.email } }, { headers: { "Set-Cookie": sessionCookieHeader(session.token, request) } });
  } catch {
    return Response.json({ error: "Não foi possível entrar agora." }, { status: 500 });
  }
}

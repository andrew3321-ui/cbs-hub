import { count, eq, isNull } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { createRecoveryKey, createSession, hashPassword, hashRecoveryKey, normalizeEmail, passwordIsStrong, sessionCookieHeader } from "../../../auth";
import { ensureScenarioSchema, getDb } from "../../../../db";
import { companies, users } from "../../../../db/schema";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    await ensureScenarioSchema();
    const payload = (await request.json()) as Record<string, unknown>;
    const name = typeof payload.name === "string" ? payload.name.trim().replace(/\s+/g, " ").slice(0, 100) : "";
    const email = normalizeEmail(typeof payload.email === "string" ? payload.email : "");
    const password = typeof payload.password === "string" ? payload.password : "";

    if (name.length < 2 || !emailPattern.test(email) || !passwordIsStrong(password)) {
      return Response.json({ error: "Informe nome, e-mail válido e uma senha com 8 caracteres, letra e número." }, { status: 400 });
    }

    const db = getDb();
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing) return Response.json({ error: "Já existe uma conta com este e-mail." }, { status: 409 });

    const [{ total }] = await db.select({ total: count() }).from(users);
    const passwordData = await hashPassword(password);
    const recoveryKey = createRecoveryKey();
    const recoveryKeyHash = await hashRecoveryKey(recoveryKey);
    const [user] = await db.insert(users).values({ name, email, passwordHash: passwordData.hash, passwordSalt: passwordData.salt, recoveryKeyHash }).returning({ id: users.id, name: users.name, email: users.email });

    const configuredLegacyOwner = normalizeEmail(String((env as unknown as { LEGACY_OWNER_EMAIL?: string }).LEGACY_OWNER_EMAIL ?? ""));
    const canClaimLegacyData = configuredLegacyOwner ? configuredLegacyOwner === email : Number(total) === 0;
    if (canClaimLegacyData) await db.update(companies).set({ ownerUserId: user.id }).where(isNull(companies.ownerUserId));

    const session = await createSession(user.id);
    return Response.json({ user, recoveryKey }, { status: 201, headers: { "Set-Cookie": sessionCookieHeader(session.token, request) } });
  } catch (error) {
    if (String(error).toLowerCase().includes("unique")) return Response.json({ error: "Já existe uma conta com este e-mail." }, { status: 409 });
    return Response.json({ error: "Não foi possível criar sua conta agora." }, { status: 500 });
  }
}

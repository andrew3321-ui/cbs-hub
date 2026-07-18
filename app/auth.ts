import { and, eq, gt, lt } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ensureScenarioSchema, getDb } from "../db";
import { sessions, users } from "../db/schema";

const SESSION_COOKIE = "mc_session";
const SESSION_SECONDS = 60 * 60 * 24 * 7;
export const CURRENT_PASSWORD_ITERATIONS = 600_000;
const LEGACY_PASSWORD_ITERATIONS = 100_000;

export type AppUser = {
  id: number;
  name: string;
  email: string;
};

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex: string) {
  if (!/^[0-9a-f]+$/i.test(hex) || hex.length % 2) return new Uint8Array();
  return new Uint8Array(hex.match(/.{2}/g)!.map((byte) => Number.parseInt(byte, 16)));
}

function randomHex(size: number) {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToHex(new Uint8Array(digest));
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function passwordIsStrong(value: string) {
  return value.length >= 12 && value.length <= 128 && /[a-zA-ZÀ-ÿ]/.test(value) && /\d/.test(value);
}

export async function hashPassword(password: string, salt = randomHex(16), iterations = CURRENT_PASSWORD_ITERATIONS) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: hexToBytes(salt), iterations }, key, 256);
  return { hash: bytesToHex(new Uint8Array(bits)), salt, iterations };
}

export async function verifyPassword(password: string, salt: string, expectedHash: string, iterations = LEGACY_PASSWORD_ITERATIONS) {
  const { hash } = await hashPassword(password, salt, iterations);
  return constantTimeEqual(hash, expectedHash);
}

export function createRecoveryKey() {
  return randomHex(16).toUpperCase().match(/.{1,4}/g)!.join("-");
}

export function hashRecoveryKey(value: string) {
  return sha256(value.replace(/[^0-9a-f]/gi, "").toLowerCase());
}

export function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

export async function createSession(userId: number) {
  await ensureScenarioSchema();
  const token = randomHex(32);
  const id = await sha256(token);
  const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000).toISOString();
  const db = getDb();
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date().toISOString()));
  await db.delete(sessions).where(eq(sessions.userId, userId));
  await db.insert(sessions).values({ id, userId, expiresAt });
  return { token, expiresAt };
}

export function sessionCookieHeader(token: string, request: Request, maxAge = SESSION_SECONDS) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Priority=High; Max-Age=${maxAge}${secure}`;
}

export function clearSessionCookieHeader(request: Request) {
  return sessionCookieHeader("", request, 0);
}

export async function getCurrentUser(): Promise<AppUser | null> {
  await ensureScenarioSchema();
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const sessionId = await sha256(token);
  const [row] = await getDb()
    .select({ id: users.id, name: users.name, email: users.email })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, new Date().toISOString()), gt(sessions.createdAt, new Date(Date.now() - SESSION_SECONDS * 1000).toISOString())))
    .limit(1);
  return row ?? null;
}

export async function requireAppUser(returnTo = "/app") {
  const user = await getCurrentUser();
  if (user) return user;
  redirect(`/entrar?returnTo=${encodeURIComponent(safeReturnPath(returnTo))}`);
}

export async function destroyCurrentSession() {
  await ensureScenarioSchema();
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) await getDb().delete(sessions).where(eq(sessions.id, await sha256(token)));
}

export function safeReturnPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/app";
  try {
    const url = new URL(value, "https://margemclara.local");
    return url.origin === "https://margemclara.local" ? `${url.pathname}${url.search}${url.hash}` : "/app";
  } catch {
    return "/app";
  }
}

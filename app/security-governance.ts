import { env } from "cloudflare:workers";
import { privacyRequestEvents } from "../db/schema";
import { getDb } from "../db";

type SecurityRuntimeEnvironment = {
  SECURITY_HASH_KEY?: string;
};

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function randomId() {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
}

export function correlationId(request: Request) {
  const supplied = request.headers.get("x-request-id") ?? "";
  return /^[0-9a-f-]{32,36}$/i.test(supplied) ? supplied : randomId();
}

async function pseudonymousHash(purpose: string, value: string) {
  const secret = String((env as unknown as SecurityRuntimeEnvironment).SECURITY_HASH_KEY ?? "").trim();
  if (secret.length < 32) return `unlinked:${randomId()}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`cbshub:privacy:v1:${purpose}:${value}`));
  return bytesToHex(new Uint8Array(digest));
}

export async function recordPrivacyRequest(input: {
  request: Request;
  email: string;
  workspaceId?: number | null;
  action: "access_export" | "account_correction" | "account_deletion";
  status: "started" | "completed" | "failed";
  details?: Record<string, string | number | boolean | null>;
}) {
  const createdAt = new Date();
  const retainUntil = new Date(createdAt.getTime() + 2 * 365 * 24 * 60 * 60 * 1000);
  await getDb().insert(privacyRequestEvents).values({
    id: randomId(),
    subjectHash: await pseudonymousHash("subject", input.email.trim().toLowerCase()),
    workspaceHash: input.workspaceId ? await pseudonymousHash("workspace", String(input.workspaceId)) : null,
    action: input.action,
    status: input.status,
    requestId: correlationId(input.request),
    detailsJson: JSON.stringify(input.details ?? {}),
    createdAt: createdAt.toISOString(),
    retainUntil: retainUntil.toISOString(),
  });
}


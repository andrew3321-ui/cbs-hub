import { env } from "cloudflare:workers";
import { TRIAL_DEVICE_RETENTION_DAYS, trialDeviceIdIsValid, trialFingerprintIsValid } from "../domain/trial";

const TRIAL_DEVICE_COOKIE = "mc_trial_device";
const MINIMUM_SECRET_LENGTH = 32;

type TrialRuntimeEnvironment = {
  SECURITY_HASH_KEY?: string;
};

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function cookieValue(request: Request, name: string) {
  const cookie = request.headers.get("cookie") ?? "";
  for (const part of cookie.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return "";
}

function protectionSecret() {
  const secret = String((env as unknown as TrialRuntimeEnvironment).SECURITY_HASH_KEY ?? "").trim();
  return secret.length >= MINIMUM_SECRET_LENGTH ? secret : "";
}

async function hmacHex(secret: string, purpose: string, value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`margem-clara:trial:v1:${purpose}:${value}`));
  return bytesToHex(new Uint8Array(digest));
}

export function trialDeviceCookieHeader(deviceId: string, request: Request) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  const maxAge = TRIAL_DEVICE_RETENTION_DAYS * 24 * 60 * 60;
  return `${TRIAL_DEVICE_COOKIE}=${encodeURIComponent(deviceId)}; Path=/; HttpOnly; SameSite=Lax; Priority=High; Max-Age=${maxAge}${secure}`;
}

export async function buildTrialClaimIdentity(request: Request, payload: Record<string, unknown>, normalizedEmail: string) {
  const secret = protectionSecret();
  if (!secret) return null;
  const cookieDeviceId = cookieValue(request, TRIAL_DEVICE_COOKIE);
  const suppliedDeviceId = typeof payload.trialDeviceId === "string" ? payload.trialDeviceId.trim().toLowerCase() : "";
  const deviceId = trialDeviceIdIsValid(cookieDeviceId) ? cookieDeviceId.toLowerCase() : suppliedDeviceId;
  const fingerprint = typeof payload.trialDeviceFingerprint === "string" ? payload.trialDeviceFingerprint.trim().toLowerCase() : "";
  if (!trialDeviceIdIsValid(deviceId) || !trialFingerprintIsValid(fingerprint)) return null;

  const forwardedIp = request.headers.get("cf-connecting-ip")
    ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? "unknown";
  const technicalFingerprint = [
    fingerprint,
    request.headers.get("user-agent") ?? "",
    request.headers.get("accept-language") ?? "",
    request.headers.get("sec-ch-ua") ?? "",
    request.headers.get("sec-ch-ua-platform") ?? "",
    request.headers.get("sec-ch-ua-mobile") ?? "",
  ].join("|");
  return {
    deviceId,
    deviceHash: await hmacHex(secret, "device", deviceId),
    fingerprintHash: await hmacHex(secret, "fingerprint", technicalFingerprint),
    emailHash: await hmacHex(secret, "email", normalizedEmail),
    networkHash: await hmacHex(secret, "network", forwardedIp),
  };
}

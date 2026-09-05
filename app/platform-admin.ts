import { env } from "cloudflare:workers";
import { getCurrentUser, normalizeEmail, type AppUser } from "./auth";

type PlatformAdminEnvironment = {
  PLATFORM_ADMIN_EMAILS?: string;
};

function configuredAdminEmails() {
  const runtime = env as unknown as PlatformAdminEnvironment;
  return `${runtime.PLATFORM_ADMIN_EMAILS ?? ""}`
    .split(",")
    .map(normalizeEmail)
    .filter(Boolean);
}

export function platformAdminIsConfigured() {
  return configuredAdminEmails().length > 0;
}

export function isPlatformAdminEmail(email: string) {
  const normalized = normalizeEmail(email);
  return Boolean(normalized) && configuredAdminEmails().includes(normalized);
}

export async function getPlatformAdminUser(): Promise<AppUser | null> {
  const user = await getCurrentUser();
  return user && isPlatformAdminEmail(user.email) ? user : null;
}

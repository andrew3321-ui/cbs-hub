export const TRIAL_DURATION_DAYS = 5;
export const TRIAL_DURATION_MS = TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000;
export const TRIAL_COMPANY_LIMIT = 10;
export const TRIAL_DEVICE_RETENTION_DAYS = 365;

export type TrialAccessSnapshot = {
  startedAt: string;
  endsAt: string;
  status: string;
} | null;

export function trialDeviceIdIsValid(value: unknown): value is string {
  return typeof value === "string"
    && (/^[0-9a-f]{64}$/i.test(value) || /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

export function trialFingerprintIsValid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{64}$/i.test(value);
}

export function trialEndsAt(startedAt: string | number | Date) {
  const started = new Date(startedAt).getTime();
  if (!Number.isFinite(started)) throw new Error("invalid_trial_start");
  return new Date(started + TRIAL_DURATION_MS).toISOString();
}

export function trialAccessIsActive(snapshot: TrialAccessSnapshot, now = Date.now()) {
  if (!snapshot || snapshot.status !== "active") return false;
  const startedAt = Date.parse(snapshot.startedAt);
  const endsAt = Date.parse(snapshot.endsAt);
  return Number.isFinite(startedAt) && Number.isFinite(endsAt) && startedAt <= now && endsAt > now;
}

export function trialDaysRemaining(snapshot: TrialAccessSnapshot, now = Date.now()) {
  if (!trialAccessIsActive(snapshot, now) || !snapshot) return 0;
  return Math.max(1, Math.ceil((Date.parse(snapshot.endsAt) - now) / (24 * 60 * 60 * 1000)));
}

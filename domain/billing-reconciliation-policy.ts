export const BILLING_FAST_RECONCILIATION_INTERVAL_MS = 30 * 60 * 1000;
export const BILLING_STABLE_RECONCILIATION_INTERVAL_MS = 6 * 60 * 60 * 1000;

export type ScheduledBillingAction = "card_provider" | "pix_provider" | "expire_pix" | "none";

export type ReconciliationAccountSnapshot = {
  status: string;
  providerSubscriptionId: string | null;
  nextPaymentAt: string | null;
  lastSyncedAt: string | null;
};

function reconciliationIsDue(lastSyncedAt: string | null, now: number, intervalMs: number) {
  if (!lastSyncedAt) return true;
  const lastSync = Date.parse(lastSyncedAt);
  return !Number.isFinite(lastSync) || now - lastSync >= intervalMs;
}

export function scheduledBillingAction(account: ReconciliationAccountSnapshot, now = Date.now()): ScheduledBillingAction {
  if (account.providerSubscriptionId) {
    if (account.status === "canceled") return "none";
    const interval = account.status === "active"
      ? BILLING_STABLE_RECONCILIATION_INTERVAL_MS
      : BILLING_FAST_RECONCILIATION_INTERVAL_MS;
    return reconciliationIsDue(account.lastSyncedAt, now, interval) ? "card_provider" : "none";
  }

  if (account.status === "active" && account.nextPaymentAt) {
    const paidUntil = Date.parse(account.nextPaymentAt);
    if (Number.isFinite(paidUntil) && paidUntil <= now) return "expire_pix";
  }

  if (["pending", "renewal_pending"].includes(account.status)) {
    return reconciliationIsDue(account.lastSyncedAt, now, BILLING_FAST_RECONCILIATION_INTERVAL_MS)
      ? "pix_provider"
      : "none";
  }

  return "none";
}

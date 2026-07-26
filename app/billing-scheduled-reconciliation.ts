import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { getDb } from "../db";
import { billingAccounts } from "../db/schema";
import { scheduledBillingAction, type ScheduledBillingAction } from "../domain/billing-reconciliation-policy";
import { mercadoPagoConfigurationStatus } from "./billing";
import { syncPixBillingAccount } from "./billing-pix";
import { syncBillingAccountFromProvider } from "./billing-reconciliation";

const BILLING_RECONCILIATION_BATCH_SIZE = 100;
const reconcilableStatuses = [
  "active",
  "authorized",
  "pending",
  "renewal_pending",
  "paused",
  "overdue",
  "payment_failed",
];

export type BillingReconciliationSummary = {
  selected: number;
  reconciled: number;
  expired: number;
  skipped: number;
  failed: number;
  configurationAvailable: boolean;
};

async function expirePixAccess(accountId: number, now: string) {
  await getDb().update(billingAccounts).set({
    status: "overdue",
    checkoutUrl: null,
    lastSyncedAt: now,
    updatedAt: now,
  }).where(and(
    eq(billingAccounts.id, accountId),
    eq(billingAccounts.status, "active"),
    isNull(billingAccounts.providerSubscriptionId),
  ));
}

export async function runScheduledBillingReconciliation(now = Date.now()): Promise<BillingReconciliationSummary> {
  const configurationAvailable = mercadoPagoConfigurationStatus().accessToken;
  const summary: BillingReconciliationSummary = {
    selected: 0,
    reconciled: 0,
    expired: 0,
    skipped: 0,
    failed: 0,
    configurationAvailable,
  };
  if (!configurationAvailable) return summary;

  const accounts = await getDb().select().from(billingAccounts)
    .where(inArray(billingAccounts.status, reconcilableStatuses))
    .orderBy(asc(billingAccounts.lastSyncedAt), asc(billingAccounts.id))
    .limit(BILLING_RECONCILIATION_BATCH_SIZE);
  summary.selected = accounts.length;

  for (const account of accounts) {
    const action: ScheduledBillingAction = scheduledBillingAction(account, now);
    try {
      if (action === "card_provider") {
        await syncBillingAccountFromProvider(account);
        summary.reconciled += 1;
      } else if (action === "pix_provider") {
        await syncPixBillingAccount(account);
        summary.reconciled += 1;
      } else if (action === "expire_pix") {
        await expirePixAccess(account.id, new Date(now).toISOString());
        summary.expired += 1;
      } else {
        summary.skipped += 1;
      }
    } catch (error) {
      summary.failed += 1;
      console.error(JSON.stringify({
        event: "billing.reconciliation_account_failed",
        accountId: account.id,
        action,
        error: error instanceof Error ? error.name : "UnknownError",
      }));
    }
  }

  return summary;
}

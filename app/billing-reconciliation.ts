import { and, eq, or } from "drizzle-orm";
import { getDb } from "../db";
import { billingAccounts, billingTransactions, fiscalIssuances, users } from "../db/schema";
import {
  billingPlans,
  currencyAmountToCents,
  mercadoPagoRequest,
  type MercadoPagoAuthorizedPayment,
  type MercadoPagoPayment,
  type MercadoPagoSubscription,
  normalizeBillingStatus,
} from "./billing";

export type BillingReconciliationResult = "linked" | "retry" | "rejected";
export type BillingAccount = typeof billingAccounts.$inferSelect;

async function accountForProvider(subscriptionId: string, externalReference: string) {
  const db = getDb();
  if (externalReference) {
    const [account] = await db.select().from(billingAccounts).where(or(
      eq(billingAccounts.providerSubscriptionId, subscriptionId),
      eq(billingAccounts.externalReference, externalReference),
    )).limit(1);
    return account;
  }
  const [account] = await db.select().from(billingAccounts).where(eq(billingAccounts.providerSubscriptionId, subscriptionId)).limit(1);
  return account;
}

async function approvedPaymentExists(accountId: number, externalReference: string) {
  const [payment] = await getDb().select({ id: billingTransactions.id }).from(billingTransactions).where(and(
    eq(billingTransactions.billingAccountId, accountId),
    eq(billingTransactions.externalReference, externalReference),
    eq(billingTransactions.status, "approved"),
  )).limit(1);
  return Boolean(payment);
}

export async function updateSubscriptionFromProvider(dataId: string, expectedReference?: string) {
  const subscription = await mercadoPagoRequest<MercadoPagoSubscription>(`/preapproval/${encodeURIComponent(dataId)}`);
  const externalReference = String(subscription.external_reference ?? "").trim();
  if (!externalReference || (expectedReference && externalReference !== expectedReference)) return "rejected" satisfies BillingReconciliationResult;
  const account = await accountForProvider(subscription.id, externalReference);
  if (!account) return "retry" satisfies BillingReconciliationResult;
  const plan = billingPlans[account.planKey as keyof typeof billingPlans];
  const amountCents = currencyAmountToCents(subscription.auto_recurring?.transaction_amount);
  const currency = String(subscription.auto_recurring?.currency_id ?? "");
  if (
    account.externalReference !== externalReference
    || (account.providerSubscriptionId && account.providerSubscriptionId !== subscription.id)
    || !plan
    || amountCents !== plan.priceCents
    || currency !== "BRL"
  ) return "rejected" satisfies BillingReconciliationResult;

  const providerStatus = normalizeBillingStatus(subscription.status);
  const status = providerStatus === "active" && !(await approvedPaymentExists(account.id, account.externalReference)) ? "pending" : providerStatus;
  const now = new Date().toISOString();
  await getDb().update(billingAccounts).set({
    providerSubscriptionId: subscription.id,
    status,
    checkoutUrl: subscription.init_point ?? account.checkoutUrl,
    nextPaymentAt: subscription.next_payment_date ?? null,
    lastSyncedAt: now,
    updatedAt: now,
  }).where(eq(billingAccounts.id, account.id));
  return "linked" satisfies BillingReconciliationResult;
}

export async function recordAuthorizedPaymentFromProvider(dataId: string, expectedReference?: string) {
  const invoice = await mercadoPagoRequest<MercadoPagoAuthorizedPayment>(`/authorized_payments/${encodeURIComponent(dataId)}`);
  const paymentId = String(invoice.payment?.id ?? "").trim();
  const payment = paymentId
    ? await mercadoPagoRequest<MercadoPagoPayment>(`/v1/payments/${encodeURIComponent(paymentId)}`)
    : null;
  const subscriptionId = String(invoice.preapproval_id ?? "").trim();
  const externalReference = String(payment?.external_reference ?? invoice.external_reference ?? "").trim();
  if (!subscriptionId) return "rejected" satisfies BillingReconciliationResult;
  const account = await accountForProvider(subscriptionId, externalReference);
  if (!account) return "retry" satisfies BillingReconciliationResult;
  if (
    (expectedReference && account.externalReference !== expectedReference)
    || account.providerSubscriptionId !== subscriptionId
    || (externalReference && externalReference !== account.externalReference)
  ) return "rejected" satisfies BillingReconciliationResult;

  const status = String(payment?.status ?? invoice.payment?.status ?? invoice.summarized ?? invoice.status ?? "pending");
  const statusDetail = String(payment?.status_detail ?? invoice.payment?.status_detail ?? "");
  const grossAmountCents = currencyAmountToCents(payment?.transaction_amount ?? invoice.transaction_amount);
  const feeAmountCents = payment?.fee_details?.length
    ? payment.fee_details.reduce((sum, fee) => sum + currencyAmountToCents(fee.amount), 0)
    : null;
  const netAmountCents = payment?.transaction_details?.net_received_amount == null
    ? null
    : currencyAmountToCents(payment.transaction_details.net_received_amount);
  const plan = billingPlans[account.planKey as keyof typeof billingPlans];
  const currency = String(payment?.currency_id ?? invoice.currency_id ?? "");
  if (!plan || grossAmountCents !== plan.priceCents || currency !== "BRL") return "rejected" satisfies BillingReconciliationResult;

  const approvedAt = payment?.date_approved ?? (status === "approved" ? invoice.debit_date ?? invoice.date_created ?? new Date().toISOString() : null);
  const now = new Date().toISOString();
  const [transaction] = await getDb().insert(billingTransactions).values({
    billingAccountId: account.id,
    userId: account.userId,
    providerInvoiceId: String(invoice.id),
    providerPaymentId: paymentId || null,
    externalReference: externalReference || account.externalReference,
    status,
    statusDetail,
    grossAmountCents,
    feeAmountCents,
    netAmountCents,
    currency,
    paymentMethod: payment?.payment_method_id ?? payment?.payment_type_id ?? null,
    approvedAt,
    providerSummaryJson: JSON.stringify({ invoiceId: String(invoice.id), paymentId: paymentId || null, subscriptionId, status, statusDetail }),
    lastSyncedAt: now,
    updatedAt: now,
  }).onConflictDoUpdate({
    target: billingTransactions.providerInvoiceId,
    set: { providerPaymentId: paymentId || null, status, statusDetail, grossAmountCents, feeAmountCents, netAmountCents, paymentMethod: payment?.payment_method_id ?? payment?.payment_type_id ?? null, approvedAt, lastSyncedAt: now, updatedAt: now },
  }).returning();
  if (!transaction) throw new Error("billing_transaction_unavailable");

  const [customer] = await getDb().select({ name: users.name }).from(users).where(eq(users.id, account.userId)).limit(1);
  const [existingIssuance] = await getDb().select().from(fiscalIssuances).where(eq(fiscalIssuances.transactionId, transaction.id)).limit(1);
  const settled = status === "approved";
  const preserved = existingIssuance && ["issued", "not_required"].includes(existingIssuance.status);
  const fiscalStatus = preserved ? existingIssuance.status : settled ? "pending_data" : "awaiting_payment";
  const competenceMonth = String(approvedAt ?? invoice.debit_date ?? now).slice(0, 7);
  await getDb().insert(fiscalIssuances).values({
    transactionId: transaction.id,
    userId: account.userId,
    customerName: customer?.name ?? "",
    serviceDescription: `Assinatura mensal Margem Clara${plan ? ` — plano ${plan.name}` : ""}`,
    competenceMonth: /^\d{4}-\d{2}$/.test(competenceMonth) ? competenceMonth : now.slice(0, 7),
    amountCents: grossAmountCents,
    status: fiscalStatus,
    updatedAt: now,
  }).onConflictDoUpdate({
    target: fiscalIssuances.transactionId,
    set: { amountCents: grossAmountCents, status: fiscalStatus, updatedAt: now },
  });

  if (settled) {
    await getDb().update(billingAccounts).set({ status: "active", lastSyncedAt: now, updatedAt: now }).where(eq(billingAccounts.id, account.id));
  }
  return "linked" satisfies BillingReconciliationResult;
}

export async function syncBillingAccountFromProvider(account: BillingAccount) {
  if (!account.providerSubscriptionId) return account;
  const linked = await updateSubscriptionFromProvider(account.providerSubscriptionId, account.externalReference);
  if (linked !== "linked") throw new Error(`billing_subscription_${linked}`);

  const query = new URLSearchParams({ preapproval_id: account.providerSubscriptionId, limit: "20", offset: "0" });
  const invoices = await mercadoPagoRequest<{ results?: MercadoPagoAuthorizedPayment[] }>(`/authorized_payments/search?${query.toString()}`);
  for (const invoice of (invoices.results ?? []).slice(0, 20)) {
    if (invoice.id != null) await recordAuthorizedPaymentFromProvider(String(invoice.id), account.externalReference);
  }
  const [updated] = await getDb().select().from(billingAccounts).where(eq(billingAccounts.id, account.id)).limit(1);
  return updated ?? account;
}

import { and, desc, eq, or } from "drizzle-orm";
import { getDb } from "../db";
import { billingAccounts, billingTransactions, fiscalIssuances, users } from "../db/schema";
import {
  billingPlans,
  currencyAmountToCents,
  mercadoPagoRequest,
  type MercadoPagoPayment,
} from "./billing";

export type PixCheckout = {
  paymentId: string;
  status: string;
  statusDetail: string;
  qrCode: string | null;
  qrCodeBase64: string | null;
  ticketUrl: string | null;
  expiresAt: string | null;
};

export type PixReconciliationResult = {
  outcome: "linked" | "retry" | "rejected";
  checkout: PixCheckout | null;
};

type BillingAccount = typeof billingAccounts.$inferSelect;

const pendingStatuses = new Set(["pending", "in_process", "in_mediation"]);
const terminalStatuses = new Set(["cancelled", "canceled", "rejected", "refunded", "charged_back", "expired"]);

function safeText(value: unknown, maximum: number) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized || normalized.length > maximum || /[\u0000-\u001f\u007f]/.test(normalized)) return null;
  return normalized;
}

function safeTicketUrl(value: unknown) {
  const candidate = safeText(value, 2048);
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || !(host === "mercadopago.com.br" || host.endsWith(".mercadopago.com.br"))) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function safeQrBase64(value: unknown) {
  const candidate = safeText(value, 1_500_000);
  return candidate && /^[A-Za-z0-9+/]+={0,2}$/.test(candidate) ? candidate : null;
}

export function pixCheckoutFromPayment(payment: MercadoPagoPayment): PixCheckout {
  const data = payment.point_of_interaction?.transaction_data;
  return {
    paymentId: String(payment.id),
    status: String(payment.status ?? "pending"),
    statusDetail: String(payment.status_detail ?? ""),
    qrCode: safeText(data?.qr_code, 4096),
    qrCodeBase64: safeQrBase64(data?.qr_code_base64),
    ticketUrl: safeTicketUrl(data?.ticket_url),
    expiresAt: safeText(payment.date_of_expiration, 80),
  };
}

function addOneCalendarMonth(value: string) {
  const current = new Date(value);
  if (!Number.isFinite(current.getTime())) return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const targetYear = current.getUTCMonth() === 11 ? current.getUTCFullYear() + 1 : current.getUTCFullYear();
  const targetMonth = (current.getUTCMonth() + 1) % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  current.setUTCFullYear(targetYear, targetMonth, Math.min(current.getUTCDate(), lastDay));
  return current.toISOString();
}

function accessIsStillValid(account: BillingAccount, now = Date.now()) {
  const expiration = account.nextPaymentAt ? Date.parse(account.nextPaymentAt) : Number.NaN;
  return Number.isFinite(expiration) && expiration > now;
}

async function accountForPixPayment(paymentId: string, externalReference: string) {
  const db = getDb();
  const [transaction] = await db.select({ billingAccountId: billingTransactions.billingAccountId })
    .from(billingTransactions)
    .where(or(
      eq(billingTransactions.providerPaymentId, paymentId),
      eq(billingTransactions.providerInvoiceId, `pix-payment:${paymentId}`),
    ))
    .limit(1);
  if (transaction) {
    const [account] = await db.select().from(billingAccounts).where(eq(billingAccounts.id, transaction.billingAccountId)).limit(1);
    return account;
  }
  const [account] = await db.select().from(billingAccounts).where(eq(billingAccounts.externalReference, externalReference)).limit(1);
  return account;
}

async function ensureFiscalIssuance(transaction: typeof billingTransactions.$inferSelect, account: BillingAccount, approvedAt: string) {
  const plan = billingPlans[account.planKey as keyof typeof billingPlans];
  const db = getDb();
  const [customer] = await db.select({ name: users.name }).from(users).where(eq(users.id, account.userId)).limit(1);
  const [existing] = await db.select().from(fiscalIssuances).where(eq(fiscalIssuances.transactionId, transaction.id)).limit(1);
  const preserved = existing && ["issued", "not_required"].includes(existing.status);
  const competenceMonth = /^\d{4}-\d{2}$/.test(approvedAt.slice(0, 7)) ? approvedAt.slice(0, 7) : new Date().toISOString().slice(0, 7);
  await db.insert(fiscalIssuances).values({
    transactionId: transaction.id,
    userId: account.userId,
    customerName: customer?.name ?? "",
    serviceDescription: `Assinatura mensal Margem Clara${plan ? ` — plano ${plan.name}` : ""}`,
    competenceMonth,
    amountCents: transaction.grossAmountCents,
    status: preserved ? existing.status : "pending_data",
    updatedAt: new Date().toISOString(),
  }).onConflictDoUpdate({
    target: fiscalIssuances.transactionId,
    set: { amountCents: transaction.grossAmountCents, status: preserved ? existing.status : "pending_data", updatedAt: new Date().toISOString() },
  });
}

export async function reconcilePixPaymentSnapshot(payment: MercadoPagoPayment, expectedReference?: string): Promise<PixReconciliationResult> {
  const paymentId = String(payment.id ?? "").trim();
  const externalReference = String(payment.external_reference ?? "").trim();
  if (!paymentId || !externalReference || (expectedReference && externalReference !== expectedReference)) return { outcome: "rejected", checkout: null };

  const account = await accountForPixPayment(paymentId, externalReference);
  if (!account) return { outcome: "retry", checkout: null };
  const plan = billingPlans[account.planKey as keyof typeof billingPlans];
  const amountCents = currencyAmountToCents(payment.transaction_amount);
  const currency = String(payment.currency_id ?? "");
  if (
    account.externalReference !== externalReference
    || !plan
    || amountCents !== plan.priceCents
    || currency !== "BRL"
    || payment.payment_method_id !== "pix"
    || (payment.payment_type_id && payment.payment_type_id !== "bank_transfer")
  ) return { outcome: "rejected", checkout: null };

  const db = getDb();
  const [existingTransaction] = await db.select().from(billingTransactions).where(or(
    eq(billingTransactions.providerPaymentId, paymentId),
    eq(billingTransactions.providerInvoiceId, `pix-payment:${paymentId}`),
  )).limit(1);
  if (existingTransaction && existingTransaction.billingAccountId !== account.id) return { outcome: "rejected", checkout: null };

  const status = String(payment.status ?? "pending");
  const statusDetail = String(payment.status_detail ?? "");
  const approvedAt = status === "approved" ? String(payment.date_approved ?? new Date().toISOString()) : null;
  const feeAmountCents = payment.fee_details?.length
    ? payment.fee_details.reduce((sum, fee) => sum + currencyAmountToCents(fee.amount), 0)
    : null;
  const netAmountCents = payment.transaction_details?.net_received_amount == null
    ? null
    : currencyAmountToCents(payment.transaction_details.net_received_amount);
  const now = new Date().toISOString();
  const checkout = pixCheckoutFromPayment(payment);
  const [transaction] = await db.insert(billingTransactions).values({
    billingAccountId: account.id,
    userId: account.userId,
    providerInvoiceId: `pix-payment:${paymentId}`,
    providerPaymentId: paymentId,
    externalReference,
    status,
    statusDetail,
    grossAmountCents: amountCents,
    feeAmountCents,
    netAmountCents,
    currency,
    paymentMethod: "pix",
    approvedAt,
    providerSummaryJson: JSON.stringify({ paymentId, status, statusDetail, paymentMethod: "pix" }),
    lastSyncedAt: now,
    updatedAt: now,
  }).onConflictDoUpdate({
    target: billingTransactions.providerInvoiceId,
    set: { status, statusDetail, feeAmountCents, netAmountCents, paymentMethod: "pix", approvedAt, lastSyncedAt: now, updatedAt: now },
  }).returning();
  if (!transaction) throw new Error("pix_transaction_unavailable");

  if (status === "approved") {
    const alreadyCredited = existingTransaction?.status === "approved";
    const accessBase = account.status === "renewal_pending" && accessIsStillValid(account) ? account.nextPaymentAt! : now;
    const accessExpiresAt = alreadyCredited && account.nextPaymentAt ? account.nextPaymentAt : addOneCalendarMonth(accessBase);
    await db.update(billingAccounts).set({ status: "active", checkoutUrl: null, nextPaymentAt: accessExpiresAt, lastSyncedAt: now, updatedAt: now }).where(eq(billingAccounts.id, account.id));
    await ensureFiscalIssuance(transaction, account, approvedAt ?? now);
  } else if (terminalStatuses.has(status)) {
    await db.update(billingAccounts).set({
      status: accessIsStillValid(account) ? "active" : "payment_failed",
      checkoutUrl: null,
      lastSyncedAt: now,
      updatedAt: now,
    }).where(eq(billingAccounts.id, account.id));
  } else if (pendingStatuses.has(status)) {
    await db.update(billingAccounts).set({
      status: account.status === "renewal_pending" || (account.status === "active" && accessIsStillValid(account)) ? "renewal_pending" : "pending",
      checkoutUrl: checkout.ticketUrl ?? account.checkoutUrl,
      lastSyncedAt: now,
      updatedAt: now,
    }).where(eq(billingAccounts.id, account.id));
  }

  return { outcome: "linked", checkout: status === "approved" || terminalStatuses.has(status) ? null : checkout };
}

export async function reconcilePixPaymentFromProvider(paymentId: string, expectedReference?: string) {
  const payment = await mercadoPagoRequest<MercadoPagoPayment>(`/v1/payments/${encodeURIComponent(paymentId)}`);
  return reconcilePixPaymentSnapshot(payment, expectedReference);
}

export async function latestPixTransaction(accountId: number, externalReference?: string) {
  const where = externalReference
    ? and(eq(billingTransactions.billingAccountId, accountId), eq(billingTransactions.externalReference, externalReference), eq(billingTransactions.paymentMethod, "pix"))
    : and(eq(billingTransactions.billingAccountId, accountId), eq(billingTransactions.paymentMethod, "pix"));
  const [transaction] = await getDb().select().from(billingTransactions).where(where).orderBy(desc(billingTransactions.createdAt), desc(billingTransactions.id)).limit(1);
  return transaction ?? null;
}

export async function syncPixBillingAccount(account: BillingAccount) {
  const transaction = await latestPixTransaction(account.id, account.externalReference);
  if (!transaction?.providerPaymentId || !pendingStatuses.has(transaction.status)) return { account, checkout: null as PixCheckout | null };
  const result = await reconcilePixPaymentFromProvider(transaction.providerPaymentId, account.externalReference);
  const [updated] = await getDb().select().from(billingAccounts).where(eq(billingAccounts.id, account.id)).limit(1);
  return { account: updated ?? account, checkout: result.checkout };
}

export function pixAccessIsValid(account: BillingAccount) {
  return accessIsStillValid(account);
}

export function pixRenewalIsEligible(account: BillingAccount) {
  if (!account.nextPaymentAt) return true;
  const remaining = Date.parse(account.nextPaymentAt) - Date.now();
  return !Number.isFinite(remaining) || remaining <= 7 * 24 * 60 * 60 * 1000;
}

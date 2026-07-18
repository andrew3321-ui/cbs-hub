import { eq, or } from "drizzle-orm";
import { ensureScenarioSchema, getDb } from "../../../../db";
import { billingAccounts, billingTransactions, fiscalIssuances, users } from "../../../../db/schema";
import {
  billingPlans,
  currencyAmountToCents,
  mercadoPagoRequest,
  type MercadoPagoAuthorizedPayment,
  type MercadoPagoPayment,
  type MercadoPagoSubscription,
  normalizeBillingStatus,
  validateMercadoPagoWebhook,
} from "../../../billing";

async function updateSubscription(dataId: string) {
  const subscription = await mercadoPagoRequest<MercadoPagoSubscription>(`/preapproval/${encodeURIComponent(dataId)}`);
  const externalReference = String(subscription.external_reference ?? "");
  const db = getDb();
  const [account] = await db.select().from(billingAccounts).where(or(
    eq(billingAccounts.providerSubscriptionId, subscription.id),
    eq(billingAccounts.externalReference, externalReference),
  )).limit(1);
  if (!account) return false;
  await db.update(billingAccounts).set({
    providerSubscriptionId: subscription.id,
    status: normalizeBillingStatus(subscription.status),
    checkoutUrl: subscription.init_point ?? account.checkoutUrl,
    nextPaymentAt: subscription.next_payment_date ?? null,
    lastSyncedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }).where(eq(billingAccounts.id, account.id));
  return true;
}

async function recordAuthorizedPayment(dataId: string) {
  const invoice = await mercadoPagoRequest<MercadoPagoAuthorizedPayment>(`/authorized_payments/${encodeURIComponent(dataId)}`);
  const paymentId = String(invoice.payment?.id ?? "").trim();
  const payment = paymentId
    ? await mercadoPagoRequest<MercadoPagoPayment>(`/v1/payments/${encodeURIComponent(paymentId)}`)
    : null;
  const subscriptionId = String(invoice.preapproval_id ?? "").trim();
  const externalReference = String(payment?.external_reference ?? invoice.external_reference ?? "").trim();
  const db = getDb();
  const [account] = await db.select().from(billingAccounts).where(or(
    eq(billingAccounts.providerSubscriptionId, subscriptionId),
    eq(billingAccounts.externalReference, externalReference),
  )).limit(1);
  if (!account) return false;

  const status = String(payment?.status ?? invoice.payment?.status ?? invoice.summarized ?? invoice.status ?? "pending");
  const statusDetail = String(payment?.status_detail ?? invoice.payment?.status_detail ?? "");
  const grossAmountCents = currencyAmountToCents(payment?.transaction_amount ?? invoice.transaction_amount);
  const feeAmountCents = payment?.fee_details?.length
    ? payment.fee_details.reduce((sum, fee) => sum + currencyAmountToCents(fee.amount), 0)
    : null;
  const netAmountCents = payment?.transaction_details?.net_received_amount == null
    ? null
    : currencyAmountToCents(payment.transaction_details.net_received_amount);
  const approvedAt = payment?.date_approved ?? (status === "approved" ? invoice.debit_date ?? invoice.date_created ?? new Date().toISOString() : null);
  const now = new Date().toISOString();
  const [transaction] = await db.insert(billingTransactions).values({
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
    currency: String(payment?.currency_id ?? invoice.currency_id ?? "BRL"),
    paymentMethod: payment?.payment_method_id ?? payment?.payment_type_id ?? null,
    approvedAt,
    providerSummaryJson: JSON.stringify({ invoiceId: String(invoice.id), paymentId: paymentId || null, subscriptionId: subscriptionId || null, status, statusDetail }),
    lastSyncedAt: now,
    updatedAt: now,
  }).onConflictDoUpdate({
    target: billingTransactions.providerInvoiceId,
    set: { providerPaymentId: paymentId || null, status, statusDetail, grossAmountCents, feeAmountCents, netAmountCents, paymentMethod: payment?.payment_method_id ?? payment?.payment_type_id ?? null, approvedAt, lastSyncedAt: now, updatedAt: now },
  }).returning();
  if (!transaction) throw new Error("billing_transaction_unavailable");

  const [customer] = await db.select({ name: users.name }).from(users).where(eq(users.id, account.userId)).limit(1);
  const [existingIssuance] = await db.select().from(fiscalIssuances).where(eq(fiscalIssuances.transactionId, transaction.id)).limit(1);
  const settled = status === "approved";
  const preserved = existingIssuance && ["issued", "not_required"].includes(existingIssuance.status);
  const fiscalStatus = preserved ? existingIssuance.status : settled ? "pending_data" : "awaiting_payment";
  const plan = billingPlans[account.planKey as keyof typeof billingPlans];
  const competenceMonth = String(approvedAt ?? invoice.debit_date ?? now).slice(0, 7);
  await db.insert(fiscalIssuances).values({
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
  return true;
}

export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => ({})) as { type?: string; data?: { id?: string | number } };
    const url = new URL(request.url);
    const dataId = String(url.searchParams.get("data.id") ?? payload.data?.id ?? "").trim();
    if (!dataId || !(await validateMercadoPagoWebhook(request, dataId))) return Response.json({ error: "Assinatura inválida." }, { status: 401 });
    if (!["subscription_preapproval", "subscription_authorized_payment"].includes(payload.type ?? "")) return Response.json({ received: true, ignored: true });

    await ensureScenarioSchema();
    const linked = payload.type === "subscription_preapproval"
      ? await updateSubscription(dataId)
      : await recordAuthorizedPayment(dataId);
    return Response.json({ received: true, linked });
  } catch {
    return Response.json({ error: "Falha ao processar a notificação." }, { status: 500 });
  }
}

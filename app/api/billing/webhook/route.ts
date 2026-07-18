import { eq, or } from "drizzle-orm";
import { ensureScenarioSchema, getDb } from "../../../../db";
import { billingAccounts, billingTransactions, fiscalIssuances, users } from "../../../../db/schema";
import {
  billingPlans,
  currencyAmountToCents,
  mercadoPagoConfigurationStatus,
  mercadoPagoRequest,
  type MercadoPagoAuthorizedPayment,
  type MercadoPagoPayment,
  type MercadoPagoSubscription,
  normalizeBillingStatus,
  validateMercadoPagoCallbackReference,
  validateMercadoPagoWebhook,
} from "../../../billing";

type WebhookLinkResult = "linked" | "retry" | "rejected";

async function updateSubscription(dataId: string, expectedReference: string) {
  const subscription = await mercadoPagoRequest<MercadoPagoSubscription>(`/preapproval/${encodeURIComponent(dataId)}`);
  const externalReference = String(subscription.external_reference ?? "");
  if (externalReference !== expectedReference) return "rejected" satisfies WebhookLinkResult;
  const db = getDb();
  const [account] = await db.select().from(billingAccounts).where(or(
    eq(billingAccounts.providerSubscriptionId, subscription.id),
    eq(billingAccounts.externalReference, externalReference),
  )).limit(1);
  const plan = account ? billingPlans[account.planKey as keyof typeof billingPlans] : null;
  const providerAmountCents = subscription.auto_recurring?.transaction_amount == null ? null : currencyAmountToCents(subscription.auto_recurring.transaction_amount);
  if (!account) return "retry" satisfies WebhookLinkResult;
  if (account.externalReference !== expectedReference || !plan || (account.providerSubscriptionId && account.providerSubscriptionId !== subscription.id) || (providerAmountCents != null && providerAmountCents !== plan.priceCents) || (subscription.auto_recurring?.currency_id && subscription.auto_recurring.currency_id !== "BRL")) return "rejected" satisfies WebhookLinkResult;
  await db.update(billingAccounts).set({
    providerSubscriptionId: subscription.id,
    status: normalizeBillingStatus(subscription.status),
    checkoutUrl: subscription.init_point ?? account.checkoutUrl,
    nextPaymentAt: subscription.next_payment_date ?? null,
    lastSyncedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }).where(eq(billingAccounts.id, account.id));
  return "linked" satisfies WebhookLinkResult;
}

async function recordAuthorizedPayment(dataId: string, expectedReference: string) {
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
  if (!account) return "retry" satisfies WebhookLinkResult;
  if (subscriptionId && !account.providerSubscriptionId) return "retry" satisfies WebhookLinkResult;
  if (account.externalReference !== expectedReference || (subscriptionId && account.providerSubscriptionId !== subscriptionId) || (externalReference && externalReference !== expectedReference)) return "rejected" satisfies WebhookLinkResult;

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
  if (!plan || grossAmountCents !== plan.priceCents || String(payment?.currency_id ?? invoice.currency_id ?? "BRL") !== "BRL") return "rejected" satisfies WebhookLinkResult;
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
  return "linked" satisfies WebhookLinkResult;
}

export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => ({})) as { type?: string; data?: { id?: string | number } };
    const url = new URL(request.url);
    const dataId = String(url.searchParams.get("data.id") ?? payload.data?.id ?? "").trim();
    const externalReference = String(url.searchParams.get("mc_ref") ?? "").trim();
    const callbackSignature = String(url.searchParams.get("mc_sig") ?? "").trim();
    const eventType = String(payload.type ?? url.searchParams.get("type") ?? "").trim();
    const provider = mercadoPagoConfigurationStatus();
    const callbackAuthenticated = await validateMercadoPagoCallbackReference(externalReference, callbackSignature);
    const providerAuthenticated = !provider.webhookSecret || await validateMercadoPagoWebhook(request, dataId);
    if (!dataId || !callbackAuthenticated || !providerAuthenticated) return Response.json({ error: "Assinatura inválida." }, { status: 401 });
    if (!["subscription_preapproval", "subscription_authorized_payment"].includes(eventType)) return Response.json({ received: true, ignored: true });

    await ensureScenarioSchema();
    const result = eventType === "subscription_preapproval"
      ? await updateSubscription(dataId, externalReference)
      : await recordAuthorizedPayment(dataId, externalReference);
    if (result === "retry") return Response.json({ received: false, retry: true }, { status: 503, headers: { "Retry-After": "5" } });
    return Response.json({ received: true, linked: result === "linked", rejected: result === "rejected" });
  } catch {
    return Response.json({ error: "Falha ao processar a notificação." }, { status: 500 });
  }
}

import { eq } from "drizzle-orm";
import { ensureScenarioSchema, getDb } from "../../../../db";
import { billingAccounts } from "../../../../db/schema";
import { getCurrentUser } from "../../../auth";
import { billingPlans, getMercadoPagoEnvironment, isPaidPlanKey, mercadoPagoRequest, MercadoPagoSubscription, normalizeBillingStatus, randomBillingReference } from "../../../billing";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para escolher um plano." }, { status: 401 });
  try {
    await ensureScenarioSchema();
    const payload = await request.json() as Record<string, unknown>;
    if (!isPaidPlanKey(payload.planKey)) return Response.json({ error: "Plano inválido." }, { status: 400 });
    const plan = billingPlans[payload.planKey];
    const db = getDb();
    const [existing] = await db.select().from(billingAccounts).where(eq(billingAccounts.userId, user.id)).limit(1);
    if (existing?.status === "active") return Response.json({ error: "Sua assinatura já está ativa." }, { status: 409 });
    if (existing?.checkoutUrl && existing.planKey === plan.key && existing.status === "pending") return Response.json({ mode: "checkout", checkoutUrl: existing.checkoutUrl });

    const reference = existing?.externalReference ?? randomBillingReference(user.id);
    const now = new Date().toISOString();
    if (!getMercadoPagoEnvironment().accessToken) {
      await db.insert(billingAccounts).values({ userId: user.id, planKey: plan.key, externalReference: reference, status: "interest", updatedAt: now }).onConflictDoUpdate({
        target: billingAccounts.userId,
        set: { planKey: plan.key, status: "interest", updatedAt: now },
      });
      return Response.json({ mode: "interest", message: "Interesse registrado. O beta continua gratuito e avisaremos antes de qualquer cobrança." }, { status: 202 });
    }

    const origin = new URL(request.url).origin;
    const subscription = await mercadoPagoRequest<MercadoPagoSubscription>("/preapproval", {
      method: "POST",
      headers: { "X-Idempotency-Key": reference },
      body: JSON.stringify({
        reason: plan.reason,
        external_reference: reference,
        payer_email: user.email,
        auto_recurring: { frequency: 1, frequency_type: "months", transaction_amount: plan.priceCents / 100, currency_id: "BRL" },
        back_url: `${origin}/planos?retorno=mercado-pago`,
        status: "pending",
      }),
    });
    if (!subscription.id || !subscription.init_point) throw new Error("checkout_unavailable");
    await db.insert(billingAccounts).values({
      userId: user.id,
      planKey: plan.key,
      externalReference: reference,
      providerSubscriptionId: subscription.id,
      status: normalizeBillingStatus(subscription.status),
      checkoutUrl: subscription.init_point,
      nextPaymentAt: subscription.next_payment_date ?? null,
      lastSyncedAt: now,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: billingAccounts.userId,
      set: { planKey: plan.key, providerSubscriptionId: subscription.id, status: normalizeBillingStatus(subscription.status), checkoutUrl: subscription.init_point, nextPaymentAt: subscription.next_payment_date ?? null, lastSyncedAt: now, updatedAt: now },
    });
    return Response.json({ mode: "checkout", checkoutUrl: subscription.init_point });
  } catch (error) {
    const message = String(error).includes("billing_not_configured") ? "A cobrança ainda não foi ativada." : "Não foi possível abrir o pagamento agora.";
    return Response.json({ error: message }, { status: 500 });
  }
}

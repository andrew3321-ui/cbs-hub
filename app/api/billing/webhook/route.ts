import { or, eq } from "drizzle-orm";
import { ensureScenarioSchema, getDb } from "../../../../db";
import { billingAccounts } from "../../../../db/schema";
import { mercadoPagoRequest, MercadoPagoSubscription, normalizeBillingStatus, validateMercadoPagoWebhook } from "../../../billing";

export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => ({})) as { type?: string; data?: { id?: string | number } };
    const url = new URL(request.url);
    const dataId = String(url.searchParams.get("data.id") ?? payload.data?.id ?? "").trim();
    if (!dataId || !(await validateMercadoPagoWebhook(request, dataId))) return Response.json({ error: "Assinatura inválida." }, { status: 401 });
    if (payload.type !== "subscription_preapproval") return Response.json({ received: true });

    const subscription = await mercadoPagoRequest<MercadoPagoSubscription>(`/preapproval/${encodeURIComponent(dataId)}`);
    const externalReference = String(subscription.external_reference ?? "");
    await ensureScenarioSchema();
    const db = getDb();
    const [account] = await db.select().from(billingAccounts).where(or(eq(billingAccounts.providerSubscriptionId, subscription.id), eq(billingAccounts.externalReference, externalReference))).limit(1);
    if (account) await db.update(billingAccounts).set({
      providerSubscriptionId: subscription.id,
      status: normalizeBillingStatus(subscription.status),
      checkoutUrl: subscription.init_point ?? account.checkoutUrl,
      nextPaymentAt: subscription.next_payment_date ?? null,
      lastSyncedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).where(eq(billingAccounts.id, account.id));
    return Response.json({ received: true });
  } catch {
    return Response.json({ error: "Falha ao processar a notificação." }, { status: 500 });
  }
}

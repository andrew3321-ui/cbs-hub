import { eq } from "drizzle-orm";
import { ensureScenarioSchema, getDb } from "../../../db";
import { billingAccounts } from "../../../db/schema";
import { getCurrentUser } from "../../auth";
import { getMercadoPagoEnvironment, mercadoPagoRequest, MercadoPagoSubscription, normalizeBillingStatus } from "../../billing";
import { getPlatformOperationState } from "../../platform-controls";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para consultar sua assinatura." }, { status: 401 });
  await ensureScenarioSchema();
  const db = getDb();
  let [account] = await db.select().from(billingAccounts).where(eq(billingAccounts.userId, user.id)).limit(1);
  const configured = Boolean(getMercadoPagoEnvironment().accessToken);
  const operation = await getPlatformOperationState();

  if (configured && account?.providerSubscriptionId && !["canceled", "cancelled"].includes(account.status)) {
    try {
      const subscription = await mercadoPagoRequest<MercadoPagoSubscription>(`/preapproval/${encodeURIComponent(account.providerSubscriptionId)}`);
      const [updated] = await db.update(billingAccounts).set({
        status: normalizeBillingStatus(subscription.status),
        checkoutUrl: subscription.init_point ?? account.checkoutUrl,
        nextPaymentAt: subscription.next_payment_date ?? null,
        lastSyncedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).where(eq(billingAccounts.id, account.id)).returning();
      account = updated;
    } catch {
      // Keep the last known state when the payment provider is temporarily unavailable.
    }
  }

  return Response.json({
    configured,
    betaEnabled: operation.betaEnabled,
    paymentsEnabled: operation.paymentsEnabled,
    billing: account ? {
      planKey: account.planKey,
      status: account.status,
      checkoutUrl: account.checkoutUrl,
      nextPaymentAt: account.nextPaymentAt,
      updatedAt: account.updatedAt,
    } : { planKey: "beta", status: "beta", checkoutUrl: null, nextPaymentAt: null, updatedAt: null },
  });
}

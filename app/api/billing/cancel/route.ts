import { eq } from "drizzle-orm";
import { ensureScenarioSchema, getDb } from "../../../../db";
import { billingAccounts, billingTransactions } from "../../../../db/schema";
import { getCurrentUser } from "../../../auth";
import { mercadoPagoRequest, MercadoPagoSubscription, randomBillingReference } from "../../../billing";
import { cancelPixTransactionAtProvider, latestPixTransaction, pixAccessIsValid } from "../../../billing-pix";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para gerenciar sua assinatura." }, { status: 401 });
  try {
    await ensureScenarioSchema();
    const db = getDb();
    const [account] = await db.select().from(billingAccounts).where(eq(billingAccounts.userId, user.id)).limit(1);
    if (!account) return Response.json({ error: "Nenhum pagamento foi encontrado." }, { status: 404 });
    if (!account.providerSubscriptionId) {
      const transaction = await latestPixTransaction(account.id, account.externalReference);
      if (!transaction?.providerPaymentId || !["pending", "in_process", "in_mediation"].includes(transaction.status)) {
        return Response.json({ error: "O Pix mensal não possui renovação automática para cancelar." }, { status: 409 });
      }
      await cancelPixTransactionAtProvider(transaction);
      const now = new Date().toISOString();
      await db.batch([
        db.update(billingTransactions).set({ status: "cancelled", statusDetail: "canceled_by_user", lastSyncedAt: now, updatedAt: now }).where(eq(billingTransactions.id, transaction.id)),
        db.update(billingAccounts).set({ externalReference: randomBillingReference(user.id), status: pixAccessIsValid(account) ? "active" : "canceled", checkoutUrl: null, lastSyncedAt: now, updatedAt: now }).where(eq(billingAccounts.id, account.id)),
      ]);
      return Response.json({ canceled: true, paymentFlow: "pix_monthly" });
    }
    await mercadoPagoRequest<MercadoPagoSubscription>(`/preapproval/${encodeURIComponent(account.providerSubscriptionId)}`, { method: "PUT", body: JSON.stringify({ status: "canceled" }) });
    await db.update(billingAccounts).set({ status: "canceled", checkoutUrl: null, nextPaymentAt: null, lastSyncedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }).where(eq(billingAccounts.id, account.id));
    return Response.json({ canceled: true });
  } catch {
    return Response.json({ error: "Não foi possível cancelar a assinatura agora." }, { status: 500 });
  }
}

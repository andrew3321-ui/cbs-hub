import { eq } from "drizzle-orm";
import { ensureScenarioSchema, getDb } from "../../../../db";
import { billingAccounts } from "../../../../db/schema";
import { getCurrentUser } from "../../../auth";
import { mercadoPagoRequest, MercadoPagoSubscription } from "../../../billing";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para gerenciar sua assinatura." }, { status: 401 });
  try {
    await ensureScenarioSchema();
    const db = getDb();
    const [account] = await db.select().from(billingAccounts).where(eq(billingAccounts.userId, user.id)).limit(1);
    if (!account?.providerSubscriptionId) return Response.json({ error: "Nenhuma assinatura ativa foi encontrada." }, { status: 404 });
    await mercadoPagoRequest<MercadoPagoSubscription>(`/preapproval/${encodeURIComponent(account.providerSubscriptionId)}`, { method: "PUT", body: JSON.stringify({ status: "canceled" }) });
    await db.update(billingAccounts).set({ status: "canceled", checkoutUrl: null, nextPaymentAt: null, lastSyncedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }).where(eq(billingAccounts.id, account.id));
    return Response.json({ canceled: true });
  } catch {
    return Response.json({ error: "Não foi possível cancelar a assinatura agora." }, { status: 500 });
  }
}

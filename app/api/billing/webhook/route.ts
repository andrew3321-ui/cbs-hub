import { ensureScenarioSchema } from "../../../../db";
import { mercadoPagoConfigurationStatus, validateMercadoPagoWebhook } from "../../../billing";
import { recordAuthorizedPaymentFromProvider, updateSubscriptionFromProvider } from "../../../billing-reconciliation";
import { reconcilePixOrderFromProvider, reconcilePixPaymentFromProvider } from "../../../billing-pix";

export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => ({})) as { type?: string; data?: { id?: string | number } };
    const url = new URL(request.url);
    const dataId = String(url.searchParams.get("data.id") ?? payload.data?.id ?? "").trim();
    const eventType = String(payload.type ?? url.searchParams.get("type") ?? "").trim();
    const provider = mercadoPagoConfigurationStatus();
    const providerAuthenticated = provider.webhookSecret && dataId
      ? await validateMercadoPagoWebhook(request, dataId)
      : false;
    if (!dataId || !providerAuthenticated) return Response.json({ error: "Assinatura inválida." }, { status: 401 });
    if (!["order", "payment", "subscription_preapproval", "subscription_authorized_payment"].includes(eventType)) return Response.json({ received: true, ignored: true });

    await ensureScenarioSchema();
    const result = eventType === "order"
      ? (await reconcilePixOrderFromProvider(dataId)).outcome
      : eventType === "payment"
      ? (await reconcilePixPaymentFromProvider(dataId)).outcome
      : eventType === "subscription_preapproval"
        ? await updateSubscriptionFromProvider(dataId)
        : await recordAuthorizedPaymentFromProvider(dataId);
    if (result === "retry") return Response.json({ received: false, retry: true }, { status: 503, headers: { "Retry-After": "5" } });
    return Response.json({ received: true, linked: result === "linked", rejected: result === "rejected" });
  } catch {
    return Response.json({ error: "Falha ao processar a notificação." }, { status: 500 });
  }
}

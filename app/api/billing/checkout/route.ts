import { eq } from "drizzle-orm";
import { ensureScenarioSchema, getDb } from "../../../../db";
import { billingAccounts, billingTransactions } from "../../../../db/schema";
import { billingProfileIsComplete, getCurrentUser } from "../../../auth";
import { billingAmountCents, billingIdempotencyKey, billingPlans, isPurchasablePlanKey, mercadoPagoApiErrorDetails, mercadoPagoRequest, MercadoPagoSubscription, mercadoPagoTransportErrorCode, normalizeBillingStatus, normalizeCompanyAddonBlocks, randomBillingReference } from "../../../billing";
import { cancelPixTransactionAtProvider, latestPixTransaction } from "../../../billing-pix";
import { getPlatformOperationState } from "../../../platform-controls";
import { publicAppUrl } from "../../../public-url";
import { getWorkspaceContext } from "../../../workspace";
import { env } from "cloudflare:workers";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para escolher um plano." }, { status: 401 });
  let checkoutStage = "SCHEMA";
  try {
    await ensureScenarioSchema();
    const workspace = await getWorkspaceContext(user.id);
    if (!workspace || workspace.role !== "owner") return Response.json({ error: "Somente o proprietário do espaço pode contratar ou alterar a assinatura." }, { status: 403 });
    if (!billingProfileIsComplete(user)) return Response.json({ error: "Antes de contratar, informe seu primeiro nome e e-mail em Minha conta.", code: "BILLING_PROFILE_REQUIRED", profileUrl: "/app?view=profile&billing=required" }, { status: 428 });
    checkoutStage = "INPUT";
    const payload = await request.json() as Record<string, unknown>;
    if (!isPurchasablePlanKey(payload.planKey)) return Response.json({ error: "Plano indisponível para novas contratações." }, { status: 400 });
    const plan = billingPlans[payload.planKey];
    if (workspace.type === "office" && plan.key !== "escritorio") return Response.json({ error: "O workspace de escritório exige o plano Escritório para preservar equipe, papéis e revisões." }, { status: 409 });
    const requestedAddonBlocks = normalizeCompanyAddonBlocks(payload.addonBlocks);
    if (requestedAddonBlocks === null) return Response.json({ error: "Capacidade adicional inválida." }, { status: 400 });
    const addonBlocks = plan.capacityAddonsEnabled ? requestedAddonBlocks : 0;
    const amountCents = billingAmountCents(plan.key, addonBlocks);
    const db = getDb();
    checkoutStage = "ACCOUNT_LOOKUP";
    const [existing] = await db.select().from(billingAccounts).where(eq(billingAccounts.userId, user.id)).limit(1);
    if (existing?.status === "active") return Response.json({ error: "Sua assinatura já está ativa." }, { status: 409 });
    if (existing?.providerSubscriptionId && existing.status === "pending" && existing.planKey !== plan.key) return Response.json({ error: "Conclua ou cancele o pagamento pendente antes de trocar de plano." }, { status: 409 });
    if (existing && !existing.providerSubscriptionId && ["pending", "renewal_pending"].includes(existing.status)) {
      const pixTransaction = await latestPixTransaction(existing.id, existing.externalReference);
      if (pixTransaction?.providerPaymentId && ["pending", "in_process", "in_mediation"].includes(pixTransaction.status)) {
        checkoutStage = "PIX_CHECKOUT_CANCELLATION";
        await cancelPixTransactionAtProvider(pixTransaction);
        const canceledAt = new Date().toISOString();
        await db.update(billingTransactions).set({ status: "cancelled", statusDetail: "replaced_by_card", lastSyncedAt: canceledAt, updatedAt: canceledAt }).where(eq(billingTransactions.id, pixTransaction.id));
      }
    }
    const reference = existing && (existing.status === "interest" || (existing.providerSubscriptionId && existing.status === "pending"))
      ? existing.externalReference
      : randomBillingReference(user.id);
    const now = new Date().toISOString();
    checkoutStage = "PLATFORM_STATE";
    const operation = await getPlatformOperationState();
    if (!operation.paymentsEnabled) {
      await db.insert(billingAccounts).values({ userId: user.id, planKey: plan.key, externalReference: reference, companyAddonBlocks: addonBlocks, pendingCompanyAddonBlocks: addonBlocks, status: "interest", updatedAt: now }).onConflictDoUpdate({
        target: billingAccounts.userId,
        set: { planKey: plan.key, externalReference: reference, companyAddonBlocks: addonBlocks, pendingCompanyAddonBlocks: addonBlocks, status: "interest", updatedAt: now },
      });
      return Response.json({ mode: "interest", betaEnabled: operation.betaEnabled, message: operation.betaEnabled ? "Interesse registrado. Nenhuma cobrança será iniciada; o acesso atual continua sujeito ao período e aos limites informados na conta." : "Interesse registrado. As cobranças permanecem bloqueadas até todas as proteções obrigatórias estarem ativas." }, { status: 202 });
    }

    if (existing?.providerSubscriptionId && existing.checkoutUrl && existing.planKey === plan.key && existing.status === "pending") {
      if (existing.companyAddonBlocks !== addonBlocks) return Response.json({ error: "Cancele o checkout pendente antes de alterar a capacidade." }, { status: 409 });
      return Response.json({ mode: "checkout", checkoutUrl: existing.checkoutUrl });
    }

    const runtime = env as unknown as Record<string, unknown>;
    checkoutStage = "PROVIDER_REQUEST";
    const subscription = await mercadoPagoRequest<MercadoPagoSubscription>("/preapproval", {
      method: "POST",
      headers: { "X-Idempotency-Key": await billingIdempotencyKey(`${reference}:${plan.key}:${addonBlocks}:${amountCents}`) },
      body: JSON.stringify({
        reason: plan.reason,
        external_reference: reference,
        payer_email: user.email,
        auto_recurring: { frequency: 1, frequency_type: "months", transaction_amount: amountCents / 100, currency_id: "BRL" },
        back_url: publicAppUrl("/planos?retorno=mercado-pago", request, runtime.PUBLIC_APP_URL),
        status: "pending",
      }),
    });
    checkoutStage = "PROVIDER_RESPONSE";
    if (!subscription.id) throw new Error("provider_subscription_id_missing");
    if (!subscription.init_point) throw new Error("provider_checkout_url_missing");
    checkoutStage = "ACCOUNT_PERSISTENCE";
    await db.insert(billingAccounts).values({
      userId: user.id,
      planKey: plan.key,
      externalReference: reference,
      providerSubscriptionId: subscription.id,
      companyAddonBlocks: addonBlocks,
      pendingCompanyAddonBlocks: addonBlocks,
      status: normalizeBillingStatus(subscription.status),
      checkoutUrl: subscription.init_point,
      nextPaymentAt: subscription.next_payment_date ?? null,
      lastSyncedAt: now,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: billingAccounts.userId,
      set: { planKey: plan.key, externalReference: reference, providerSubscriptionId: subscription.id, companyAddonBlocks: addonBlocks, pendingCompanyAddonBlocks: addonBlocks, status: normalizeBillingStatus(subscription.status), checkoutUrl: subscription.init_point, nextPaymentAt: subscription.next_payment_date ?? null, lastSyncedAt: now, updatedAt: now },
    });
    return Response.json({ mode: "checkout", checkoutUrl: subscription.init_point });
  } catch (error) {
    const providerError = mercadoPagoApiErrorDetails(error);
    const transportError = checkoutStage === "PROVIDER_REQUEST" && !providerError ? mercadoPagoTransportErrorCode(error) : null;
    const knownInternalCode = error instanceof Error && ["provider_subscription_id_missing", "provider_checkout_url_missing"].includes(error.message) ? error.message : null;
    console.error(JSON.stringify({ event: "billing.checkout_error", stage: checkoutStage, status: providerError?.status ?? null, providerCode: providerError?.providerCode ?? transportError ?? knownInternalCode ?? "unclassified" }));
    const message = String(error).includes("billing_not_configured") ? "A cobrança ainda não foi ativada." : "Não foi possível abrir o pagamento agora.";
    const supportCode = providerError
      ? `MP-${providerError.status}-${providerError.providerCode}`
      : transportError
        ? `MP-TRANSPORT-${transportError}`
      : knownInternalCode
        ? `MP-200-${knownInternalCode}`
        : `MC-${checkoutStage}`;
    return Response.json({ error: message, supportCode }, { status: 500 });
  }
}

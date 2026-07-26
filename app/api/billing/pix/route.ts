import { eq } from "drizzle-orm";
import { ensureScenarioSchema, getDb } from "../../../../db";
import { billingAccounts } from "../../../../db/schema";
import { getCurrentUser } from "../../../auth";
import {
  billingIdempotencyKey,
  billingAmountCents,
  BILLING_ADDON_COMPANY_BLOCK_SIZE,
  billingPlans,
  isPurchasablePlanKey,
  mercadoPagoApiErrorDetails,
  mercadoPagoRequest,
  mercadoPagoTransportErrorCode,
  normalizeBillingStatus,
  normalizeCompanyAddonBlocks,
  randomBillingReference,
  type MercadoPagoOrder,
  type MercadoPagoSubscription,
} from "../../../billing";
import {
  latestPixTransaction,
  pixAccessIsValid,
  pixRenewalIsEligible,
  reconcilePixOrderSnapshot,
  reconcilePixTransactionFromProvider,
} from "../../../billing-pix";
import { getPlatformOperationState } from "../../../platform-controls";
import { getWorkspaceContext } from "../../../workspace";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para pagar com Pix." }, { status: 401 });
  let stage = "SCHEMA";
  try {
    await ensureScenarioSchema();
    const workspace = await getWorkspaceContext(user.id);
    if (!workspace || workspace.role !== "owner") return Response.json({ error: "Somente o proprietário do espaço pode contratar ou renovar a assinatura." }, { status: 403 });
    stage = "INPUT";
    const payload = await request.json() as Record<string, unknown>;
    if (!isPurchasablePlanKey(payload.planKey)) return Response.json({ error: "Plano indisponível para novas contratações." }, { status: 400 });
    const plan = billingPlans[payload.planKey];
    const addonBlocks = normalizeCompanyAddonBlocks(payload.addonBlocks);
    if (addonBlocks === null) return Response.json({ error: "Capacidade adicional inválida." }, { status: 400 });
    const amountCents = billingAmountCents(plan.key, addonBlocks);
    const db = getDb();
    stage = "ACCOUNT_LOOKUP";
    let [account] = await db.select().from(billingAccounts).where(eq(billingAccounts.userId, user.id)).limit(1);
    const operation = await getPlatformOperationState();
    if (!operation.paymentsEnabled) {
      const reference = account?.externalReference ?? randomBillingReference(user.id);
      await db.insert(billingAccounts).values({ userId: user.id, planKey: plan.key, externalReference: reference, companyAddonBlocks: addonBlocks, pendingCompanyAddonBlocks: addonBlocks, status: "interest", updatedAt: new Date().toISOString() }).onConflictDoUpdate({
        target: billingAccounts.userId,
        set: { planKey: plan.key, companyAddonBlocks: addonBlocks, pendingCompanyAddonBlocks: addonBlocks, status: "interest", updatedAt: new Date().toISOString() },
      });
      return Response.json({ mode: "interest", message: operation.betaEnabled ? "Interesse em pagar por Pix registrado. Nenhuma cobrança foi criada; o acesso atual continua sujeito ao período e aos limites informados na conta." : "Interesse registrado. As cobranças permanecem bloqueadas." }, { status: 202 });
    }

    if (account?.status === "active" && account.providerSubscriptionId) {
      return Response.json({ error: "Sua assinatura automática no cartão já está ativa. Cancele-a antes de mudar para Pix mensal." }, { status: 409 });
    }
    if (account?.status === "active" && !account.providerSubscriptionId && pixAccessIsValid(account) && !pixRenewalIsEligible(account)) {
      return Response.json({ error: `Seu acesso já está pago até ${new Date(account.nextPaymentAt!).toLocaleDateString("pt-BR")}. A renovação por Pix abre sete dias antes.` }, { status: 409 });
    }

    const currentPix = account ? await latestPixTransaction(account.id, account.externalReference) : null;
    if (account && currentPix?.providerPaymentId && ["pending", "in_process", "in_mediation"].includes(currentPix.status)) {
      if (account.planKey !== plan.key || account.pendingCompanyAddonBlocks !== addonBlocks) {
        return Response.json({ error: "Descarte o Pix pendente antes de alterar a capacidade." }, { status: 409 });
      }
      stage = "PROVIDER_RECONCILIATION";
      const current = await reconcilePixTransactionFromProvider(currentPix, account.externalReference);
      [account] = await db.select().from(billingAccounts).where(eq(billingAccounts.id, account.id)).limit(1);
      if (current.checkout) return Response.json({ mode: "pix", status: account.status, pix: current.checkout });
      if (account?.status === "active") return Response.json({ mode: "pix", status: "active", pix: null, message: "Pix confirmado. Seu acesso está ativo." });
    }

    if (account?.providerSubscriptionId && ["pending", "paused"].includes(account.status)) {
      stage = "CARD_CHECKOUT_CANCELLATION";
      try {
        await mercadoPagoRequest<MercadoPagoSubscription>(`/preapproval/${encodeURIComponent(account.providerSubscriptionId)}`, { method: "PUT", body: JSON.stringify({ status: "canceled" }) });
      } catch (cancellationError) {
        const cancellationDetails = mercadoPagoApiErrorDetails(cancellationError);
        if (!cancellationDetails || ![400, 404].includes(cancellationDetails.status)) throw cancellationError;

        stage = "CARD_CHECKOUT_STATUS";
        let remoteStatus = "canceled";
        try {
          const remote = await mercadoPagoRequest<MercadoPagoSubscription>(`/preapproval/${encodeURIComponent(account.providerSubscriptionId)}`);
          remoteStatus = normalizeBillingStatus(remote.status);
        } catch (statusError) {
          const statusDetails = mercadoPagoApiErrorDetails(statusError);
          if (statusDetails?.status !== 404) throw statusError;
        }

        if (remoteStatus === "active") {
          const checkedAt = new Date().toISOString();
          await db.update(billingAccounts).set({ status: "active", lastSyncedAt: checkedAt, updatedAt: checkedAt }).where(eq(billingAccounts.id, account.id));
          return Response.json({ error: "A assinatura do cartão foi autorizada no Mercado Pago. Cancele a renovação antes de mudar para Pix." }, { status: 409 });
        }
        if (remoteStatus === "paused") {
          return Response.json({ error: "A assinatura do cartão está pausada, mas ainda existe no Mercado Pago. Cancele-a antes de mudar para Pix." }, { status: 409 });
        }
        if (!["pending", "canceled", "cancelled"].includes(remoteStatus)) throw cancellationError;
        console.warn(JSON.stringify({ event: "billing.card_checkout_abandoned_for_pix", providerStatus: remoteStatus }));
      }
    }

    const renewal = Boolean(account && !account.providerSubscriptionId && pixAccessIsValid(account));
    const reusableReference = account
      && account.planKey === plan.key
      && !account.providerSubscriptionId
      && account.status === "pix_creating"
      ? account.externalReference
      : null;
    const reference = reusableReference ?? randomBillingReference(user.id);
    const now = new Date().toISOString();
    const currentAddonBlocks = account?.planKey === plan.key
      ? normalizeCompanyAddonBlocks(account.companyAddonBlocks) ?? 0
      : 0;
    stage = "ACCOUNT_RESERVATION";
    await db.insert(billingAccounts).values({
      userId: user.id,
      planKey: plan.key,
      externalReference: reference,
      providerSubscriptionId: null,
      companyAddonBlocks: currentAddonBlocks,
      pendingCompanyAddonBlocks: addonBlocks,
      status: renewal ? "renewal_pending" : "pix_creating",
      checkoutUrl: null,
      nextPaymentAt: renewal ? account?.nextPaymentAt ?? null : null,
      lastSyncedAt: now,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: billingAccounts.userId,
      set: {
        planKey: plan.key,
        externalReference: reference,
        providerSubscriptionId: null,
        companyAddonBlocks: currentAddonBlocks,
        pendingCompanyAddonBlocks: addonBlocks,
        status: renewal ? "renewal_pending" : "pix_creating",
        checkoutUrl: null,
        nextPaymentAt: renewal ? account?.nextPaymentAt ?? null : null,
        lastSyncedAt: now,
        updatedAt: now,
      },
    });

    stage = "PROVIDER_REQUEST";
    const amount = (amountCents / 100).toFixed(2);
    const order = await mercadoPagoRequest<MercadoPagoOrder>("/v1/orders", {
      method: "POST",
      headers: { "X-Idempotency-Key": await billingIdempotencyKey(`${reference}:pix:${plan.key}:${addonBlocks}:${amountCents}`) },
      body: JSON.stringify({
        type: "online",
        total_amount: amount,
        external_reference: reference,
        processing_mode: "automatic",
        description: `${plan.reason} · até ${plan.companyLimit + addonBlocks * BILLING_ADDON_COMPANY_BLOCK_SIZE} empresas`,
        transactions: {
          payments: [{
            amount,
            payment_method: { id: "pix", type: "bank_transfer" },
            expiration_time: "P1D",
          }],
        },
        payer: { email: user.email },
      }),
    });
    stage = "PROVIDER_RESPONSE";
    const linked = await reconcilePixOrderSnapshot(order, reference);
    if (linked.outcome !== "linked") throw new Error(`pix_payment_${linked.outcome}`);
    const [updated] = await db.select().from(billingAccounts).where(eq(billingAccounts.userId, user.id)).limit(1);
    const awaitingInstructions = updated?.status !== "active" && !linked.checkout?.ticketUrl && !linked.checkout?.qrCode;
    return Response.json({
      mode: "pix",
      status: updated?.status ?? "pending",
      pix: linked.checkout,
      message: updated?.status === "active"
        ? "Pix confirmado. Seu acesso está ativo."
        : awaitingInstructions
          ? "O Mercado Pago está finalizando o QR Code. Esta tela atualizará automaticamente."
          : "Pix gerado com segurança pelo Mercado Pago.",
    }, { status: awaitingInstructions ? 202 : 200 });
  } catch (error) {
    if (["PROVIDER_REQUEST", "PROVIDER_RESPONSE"].includes(stage)) {
      try {
        const db = getDb();
        const [reserved] = await db.select().from(billingAccounts).where(eq(billingAccounts.userId, user.id)).limit(1);
        if (reserved && !reserved.providerSubscriptionId && ["pix_creating", "renewal_pending"].includes(reserved.status)) {
          const now = new Date().toISOString();
          await db.update(billingAccounts).set({
            externalReference: randomBillingReference(user.id),
            status: pixAccessIsValid(reserved) ? "active" : "payment_failed",
            checkoutUrl: null,
            pendingCompanyAddonBlocks: reserved.companyAddonBlocks,
            lastSyncedAt: now,
            updatedAt: now,
          }).where(eq(billingAccounts.id, reserved.id));
        }
      } catch {
        // Preserve the provider error below even if failure-state cleanup is unavailable.
      }
    }
    const providerError = mercadoPagoApiErrorDetails(error);
    const transportError = stage === "PROVIDER_REQUEST" && !providerError ? mercadoPagoTransportErrorCode(error) : null;
    console.error(JSON.stringify({ event: "billing.pix_error", stage, status: providerError?.status ?? null, providerCode: providerError?.providerCode ?? transportError ?? "unclassified" }));
    const supportCode = providerError
      ? `MP-PIX-${providerError.status}-${providerError.providerCode}`
      : transportError
        ? `MP-PIX-TRANSPORT-${transportError}`
        : `MC-PIX-${stage}`;
    return Response.json({ error: "Não foi possível gerar o Pix agora.", supportCode }, { status: 500 });
  }
}

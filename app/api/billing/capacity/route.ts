import { eq } from "drizzle-orm";
import { ensureScenarioSchema, getDb } from "../../../../db";
import { auditEvents, billingAccounts } from "../../../../db/schema";
import { getCurrentUser } from "../../../auth";
import {
  billingAmountCents,
  billingCompanyLimit,
  mercadoPagoApiErrorDetails,
  mercadoPagoRequest,
  normalizeBillingStatus,
  normalizeCompanyAddonBlocks,
  type MercadoPagoSubscription,
} from "../../../billing";
import { getPlatformOperationState } from "../../../platform-controls";
import { getWorkspaceEntitlements } from "../../../plan-entitlements";
import { getWorkspaceContext } from "../../../workspace";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para alterar a capacidade." }, { status: 401 });

  try {
    await ensureScenarioSchema();
    const workspace = await getWorkspaceContext(user.id);
    if (!workspace || workspace.role !== "owner") {
      return Response.json({ error: "Somente o proprietário do espaço pode alterar a cobrança." }, { status: 403 });
    }

    const payload = await request.json() as Record<string, unknown>;
    const targetAddonBlocks = normalizeCompanyAddonBlocks(payload.targetAddonBlocks);
    if (targetAddonBlocks === null) return Response.json({ error: "Capacidade adicional inválida." }, { status: 400 });

    const db = getDb();
    const [account] = await db.select().from(billingAccounts).where(eq(billingAccounts.userId, workspace.ownerUserId)).limit(1);
    if (!account || account.planKey !== "unico" || account.status !== "active") {
      return Response.json({ error: "Contrate o plano CBSHub antes de alterar a capacidade." }, { status: 409 });
    }
    if (!account.providerSubscriptionId) {
      return Response.json({
        error: "No Pix, a capacidade pode ser alterada na próxima renovação mensal.",
        code: "PIX_CAPACITY_AT_RENEWAL",
      }, { status: 409 });
    }
    if (targetAddonBlocks === account.companyAddonBlocks) {
      return Response.json({ changed: false, entitlements: await getWorkspaceEntitlements(workspace) });
    }

    const targetLimit = billingCompanyLimit("unico", targetAddonBlocks);
    const entitlements = await getWorkspaceEntitlements(workspace);
    if (entitlements.companyCount > targetLimit) {
      return Response.json({
        error: `Sua carteira possui ${entitlements.companyCount} empresas. Reduza a carteira para ${targetLimit} antes de diminuir a capacidade.`,
        code: "CAPACITY_BELOW_USAGE",
      }, { status: 409 });
    }

    const operation = await getPlatformOperationState();
    if (!operation.paymentsEnabled) {
      return Response.json({ error: "Alterações de cobrança ficam bloqueadas enquanto o beta integral estiver ativo." }, { status: 409 });
    }

    const amountCents = billingAmountCents("unico", targetAddonBlocks);
    const subscription = await mercadoPagoRequest<MercadoPagoSubscription>(`/preapproval/${encodeURIComponent(account.providerSubscriptionId)}`, {
      method: "PUT",
      body: JSON.stringify({
        reason: `CBSHub — até ${targetLimit} empresas`,
        auto_recurring: {
          transaction_amount: amountCents / 100,
          currency_id: "BRL",
        },
      }),
    });
    const providerAmountCents = Math.round(Number(subscription.auto_recurring?.transaction_amount) * 100);
    if (
      subscription.id !== account.providerSubscriptionId
      || !Number.isSafeInteger(providerAmountCents)
      || providerAmountCents !== amountCents
      || String(subscription.auto_recurring?.currency_id ?? "") !== "BRL"
      || normalizeBillingStatus(subscription.status) !== "active"
    ) {
      throw new Error("provider_capacity_confirmation_invalid");
    }

    const now = new Date().toISOString();
    await db.batch([
      db.update(billingAccounts).set({
        companyAddonBlocks: targetAddonBlocks,
        pendingCompanyAddonBlocks: targetAddonBlocks,
        nextPaymentAt: subscription.next_payment_date ?? account.nextPaymentAt,
        lastSyncedAt: now,
        updatedAt: now,
      }).where(eq(billingAccounts.id, account.id)),
      db.insert(auditEvents).values({
        ownerUserId: workspace.ownerUserId,
        eventType: "billing.capacity_changed",
        eventData: JSON.stringify({
          actorUserId: user.id,
          previousAddonBlocks: account.companyAddonBlocks,
          targetAddonBlocks,
          previousCompanyLimit: billingCompanyLimit("unico", account.companyAddonBlocks),
          targetCompanyLimit: targetLimit,
          monthlyAmountCents: amountCents,
          provider: "mercado_pago",
        }),
      }),
    ]);

    return Response.json({
      changed: true,
      monthlyAmountCents: amountCents,
      entitlements: await getWorkspaceEntitlements(workspace),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const provider = mercadoPagoApiErrorDetails(error);
    console.error(JSON.stringify({
      event: "billing.capacity_change_failed",
      status: provider?.status ?? null,
      providerCode: provider?.providerCode ?? (error instanceof Error ? error.message : "unclassified"),
    }));
    return Response.json({
      error: "Não foi possível alterar a capacidade agora.",
      supportCode: provider ? `MP-CAPACITY-${provider.status}-${provider.providerCode}` : "MC-CAPACITY-UPDATE",
    }, { status: 500 });
  }
}

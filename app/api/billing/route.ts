import { eq } from "drizzle-orm";
import { ensureScenarioSchema, getDb } from "../../../db";
import { billingAccounts } from "../../../db/schema";
import { billingProfileIsComplete, getCurrentUser } from "../../auth";
import { getMercadoPagoEnvironment } from "../../billing";
import { syncBillingAccountFromProvider } from "../../billing-reconciliation";
import { latestPixTransaction, pixRenewalIsEligible, syncPixBillingAccount, type PixCheckout } from "../../billing-pix";
import { getPlatformOperationState } from "../../platform-controls";
import { getWorkspaceEntitlements } from "../../plan-entitlements";
import { getWorkspaceContext } from "../../workspace";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para consultar sua assinatura." }, { status: 401 });
  await ensureScenarioSchema();
  const db = getDb();
  const workspace = await getWorkspaceContext(user.id);
  const billingOwnerUserId = workspace?.ownerUserId ?? user.id;
  let [account] = await db.select().from(billingAccounts).where(eq(billingAccounts.userId, billingOwnerUserId)).limit(1);
  const configured = Boolean(getMercadoPagoEnvironment().accessToken);
  const operation = await getPlatformOperationState();
  let pix: PixCheckout | null = null;

  if (configured && account?.providerSubscriptionId && !["canceled", "cancelled"].includes(account.status)) {
    try {
      account = await syncBillingAccountFromProvider(account);
    } catch {
      // Keep the last known state when the payment provider is temporarily unavailable.
    }
  } else if (configured && account && !account.providerSubscriptionId) {
    try {
      const synchronized = await syncPixBillingAccount(account);
      account = synchronized.account;
      pix = synchronized.checkout;
    } catch {
      // Keep the stored ticket URL while the provider is temporarily unavailable.
    }
    if (account.status === "active" && account.nextPaymentAt && Date.parse(account.nextPaymentAt) <= Date.now()) {
      const now = new Date().toISOString();
      await db.update(billingAccounts).set({ status: "overdue", checkoutUrl: null, lastSyncedAt: now, updatedAt: now }).where(eq(billingAccounts.id, account.id));
      account = { ...account, status: "overdue", checkoutUrl: null, lastSyncedAt: now, updatedAt: now };
    }
  }

  const latestPix = account && !account.providerSubscriptionId ? await latestPixTransaction(account.id, account.externalReference) : null;
  if (!pix && account?.checkoutUrl && latestPix && ["pending", "in_process", "in_mediation"].includes(latestPix.status)) {
    pix = {
      paymentId: latestPix.providerPaymentId ?? "",
      status: latestPix.status,
      statusDetail: latestPix.statusDetail,
      qrCode: null,
      qrCodeBase64: null,
      ticketUrl: account.checkoutUrl,
      expiresAt: null,
    };
  }
  const paymentFlow = account?.providerSubscriptionId
    ? "card_subscription"
    : latestPix || account?.status === "pix_creating"
      ? "pix_monthly"
      : null;
  const entitlements = workspace ? await getWorkspaceEntitlements(workspace) : null;

  return Response.json({
    configured,
    betaEnabled: operation.betaEnabled,
    paymentsEnabled: operation.paymentsEnabled,
    canManageBilling: workspace?.role === "owner",
    workspaceType: workspace?.type ?? "individual",
    billingProfileComplete: billingProfileIsComplete(user),
    entitlements,
    billing: account ? {
      planKey: account.planKey,
      status: account.status,
      companyAddonBlocks: account.companyAddonBlocks,
      pendingCompanyAddonBlocks: account.pendingCompanyAddonBlocks,
      checkoutUrl: account.checkoutUrl,
      nextPaymentAt: account.nextPaymentAt,
      paymentFlow,
      renewalEligible: paymentFlow === "pix_monthly" ? pixRenewalIsEligible(account) : false,
      pix,
      updatedAt: account.updatedAt,
    } : { planKey: "beta", status: "beta", companyAddonBlocks: 0, pendingCompanyAddonBlocks: 0, checkoutUrl: null, nextPaymentAt: null, paymentFlow: null, renewalEligible: false, pix: null, updatedAt: null },
  });
}

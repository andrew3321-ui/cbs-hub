import { desc, eq } from "drizzle-orm";
import { ensureScenarioSchema, getDb } from "../../../../db";
import { billingAccounts, billingTransactions, fiscalIssuances, users } from "../../../../db/schema";
import { billingPlans, billingPricingMode, mercadoPagoConfigurationStatus } from "../../../billing";
import { getPlatformAdminUser, platformAdminIsConfigured } from "../../../platform-admin";
import { getPlatformOperationState, PlatformModeError, setBetaMode } from "../../../platform-controls";

function cleanText(value: unknown, maximum: number) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, maximum) : "";
}

function digits(value: unknown) {
  return cleanText(value, 30).replace(/\D/g, "");
}

function fiscalDataComplete(input: { customerType: string; customerTaxId: string; serviceCode: string; serviceDescription: string }) {
  const taxIdValid = input.customerType === "individual" ? input.customerTaxId.length === 11 : input.customerType === "legal_entity" ? input.customerTaxId.length === 14 : false;
  return taxIdValid && Boolean(input.serviceCode) && input.serviceDescription.length >= 8;
}

async function payloadFor(request: Request) {
  const db = getDb();
  const subscriptions = await db.select({
    id: billingAccounts.id,
    userId: billingAccounts.userId,
    customerName: users.name,
    customerEmail: users.email,
    planKey: billingAccounts.planKey,
    status: billingAccounts.status,
    nextPaymentAt: billingAccounts.nextPaymentAt,
    updatedAt: billingAccounts.updatedAt,
  }).from(billingAccounts).innerJoin(users, eq(users.id, billingAccounts.userId)).orderBy(desc(billingAccounts.updatedAt));

  const transactions = await db.select({
    id: billingTransactions.id,
    userId: billingTransactions.userId,
    customerName: users.name,
    customerEmail: users.email,
    providerInvoiceId: billingTransactions.providerInvoiceId,
    providerPaymentId: billingTransactions.providerPaymentId,
    status: billingTransactions.status,
    statusDetail: billingTransactions.statusDetail,
    grossAmountCents: billingTransactions.grossAmountCents,
    feeAmountCents: billingTransactions.feeAmountCents,
    netAmountCents: billingTransactions.netAmountCents,
    currency: billingTransactions.currency,
    paymentMethod: billingTransactions.paymentMethod,
    approvedAt: billingTransactions.approvedAt,
    createdAt: billingTransactions.createdAt,
    issuanceId: fiscalIssuances.id,
    fiscalStatus: fiscalIssuances.status,
    customerType: fiscalIssuances.customerType,
    fiscalCustomerName: fiscalIssuances.customerName,
    customerTaxId: fiscalIssuances.customerTaxId,
    noteRequested: fiscalIssuances.noteRequested,
    serviceCode: fiscalIssuances.serviceCode,
    serviceDescription: fiscalIssuances.serviceDescription,
    competenceMonth: fiscalIssuances.competenceMonth,
    nfseNumber: fiscalIssuances.nfseNumber,
    nfseKey: fiscalIssuances.nfseKey,
    issuedAt: fiscalIssuances.issuedAt,
    internalNote: fiscalIssuances.internalNote,
  }).from(billingTransactions)
    .innerJoin(users, eq(users.id, billingTransactions.userId))
    .leftJoin(fiscalIssuances, eq(fiscalIssuances.transactionId, billingTransactions.id))
    .orderBy(desc(billingTransactions.createdAt), desc(billingTransactions.id))
    .limit(100);

  const currentMonth = new Date().toISOString().slice(0, 7);
  const activeSubscriptions = subscriptions.filter((item) => item.status === "active");
  const approvedThisMonth = transactions.filter((item) => item.status === "approved" && item.approvedAt?.startsWith(currentMonth));
  const pendingFiscal = transactions.filter((item) => ["pending_data", "pending_issue"].includes(item.fiscalStatus ?? "")).length;
  const estimatedMrrCents = activeSubscriptions.reduce((sum, item) => sum + (billingPlans[item.planKey as keyof typeof billingPlans]?.priceCents ?? 0), 0);
  const grossThisMonthCents = approvedThisMonth.reduce((sum, item) => sum + item.grossAmountCents, 0);
  const netThisMonthCents = approvedThisMonth.reduce((sum, item) => sum + (item.netAmountCents ?? item.grossAmountCents - (item.feeAmountCents ?? 0)), 0);
  const provider = mercadoPagoConfigurationStatus();
  const operation = await getPlatformOperationState();

  return {
    configuration: {
      ...provider,
      reconciliationEnabled: provider.accessToken,
      pricingMode: billingPricingMode,
      adminAccess: platformAdminIsConfigured(),
      webhookUrl: `${new URL(request.url).origin}/api/billing/webhook`,
      requiredEvents: ["subscription_preapproval", "subscription_authorized_payment"],
    },
    operation,
    metrics: { activeSubscriptions: activeSubscriptions.length, estimatedMrrCents, grossThisMonthCents, netThisMonthCents, pendingFiscal },
    subscriptions,
    transactions,
  };
}

export async function GET(request: Request) {
  const admin = await getPlatformAdminUser();
  if (!admin) return Response.json({ error: "Área restrita ao responsável da plataforma." }, { status: 403 });
  await ensureScenarioSchema();
  return Response.json(await payloadFor(request), { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const admin = await getPlatformAdminUser();
  if (!admin) return Response.json({ error: "Área restrita ao responsável da plataforma." }, { status: 403 });
  try {
    await ensureScenarioSchema();
    const body = await request.json() as Record<string, unknown>;
    const action = cleanText(body.action, 40);
    if (action === "set_beta_mode") {
      if (typeof body.betaEnabled !== "boolean") return Response.json({ error: "Estado do beta inválido." }, { status: 400 });
      const expectedConfirmation = body.betaEnabled ? "ATIVAR BETA" : "ATIVAR PAGAMENTOS";
      if (cleanText(body.confirmation, 40).toUpperCase() !== expectedConfirmation) return Response.json({ error: `Confirme a operação com: ${expectedConfirmation}.` }, { status: 400 });
      await setBetaMode(admin, body.betaEnabled);
      return Response.json(await payloadFor(request), { headers: { "Cache-Control": "no-store" } });
    }

    const id = Number(body.id);
    if (!Number.isInteger(id) || id <= 0) return Response.json({ error: "Pendência fiscal inválida." }, { status: 400 });
    const db = getDb();
    const [issuance] = await db.select().from(fiscalIssuances).where(eq(fiscalIssuances.id, id)).limit(1);
    if (!issuance) return Response.json({ error: "Pendência fiscal não encontrada." }, { status: 404 });
    const now = new Date().toISOString();

    if (action === "save_fiscal_data") {
      if (issuance.status === "issued") return Response.json({ error: "Uma NFS-e emitida não pode ser reescrita por este painel." }, { status: 409 });
      const customerType = ["individual", "legal_entity", "unknown"].includes(String(body.customerType)) ? String(body.customerType) : "unknown";
      const customerTaxId = digits(body.customerTaxId);
      const serviceCode = cleanText(body.serviceCode, 40);
      const serviceDescription = cleanText(body.serviceDescription, 240);
      const customerName = cleanText(body.customerName, 160);
      const competenceMonth = /^\d{4}-\d{2}$/.test(String(body.competenceMonth)) ? String(body.competenceMonth) : issuance.competenceMonth;
      const noteRequested = body.noteRequested === true;
      const complete = fiscalDataComplete({ customerType, customerTaxId, serviceCode, serviceDescription });
      const status = customerType === "individual" && !noteRequested ? "not_required" : complete ? "pending_issue" : "pending_data";
      await db.update(fiscalIssuances).set({ customerType, customerTaxId: customerTaxId || null, customerName, noteRequested, serviceCode: serviceCode || null, serviceDescription, competenceMonth, internalNote: cleanText(body.internalNote, 500), status, updatedAt: now }).where(eq(fiscalIssuances.id, id));
    } else if (action === "mark_issued") {
      const nfseNumber = cleanText(body.nfseNumber, 80);
      const nfseKey = cleanText(body.nfseKey, 120);
      if (!fiscalDataComplete({ customerType: issuance.customerType, customerTaxId: issuance.customerTaxId ?? "", serviceCode: issuance.serviceCode ?? "", serviceDescription: issuance.serviceDescription }) || !nfseNumber) {
        return Response.json({ error: "Complete tomador, CPF/CNPJ, código do serviço e número da NFS-e antes de concluir." }, { status: 400 });
      }
      await db.update(fiscalIssuances).set({ status: "issued", nfseNumber, nfseKey: nfseKey || null, issuedAt: now, updatedAt: now }).where(eq(fiscalIssuances.id, id));
    } else if (action === "mark_not_required") {
      if (issuance.customerType !== "individual" || issuance.noteRequested) return Response.json({ error: "A dispensa só pode ser registrada para pessoa física que não solicitou nota." }, { status: 400 });
      await db.update(fiscalIssuances).set({ status: "not_required", updatedAt: now }).where(eq(fiscalIssuances.id, id));
    } else if (action === "reopen") {
      if (issuance.status === "issued") return Response.json({ error: "NFS-e emitida deve ser cancelada ou substituída no emissor oficial." }, { status: 409 });
      await db.update(fiscalIssuances).set({ status: "pending_data", updatedAt: now }).where(eq(fiscalIssuances.id, id));
    } else {
      return Response.json({ error: "Ação fiscal inválida." }, { status: 400 });
    }

    return Response.json(await payloadFor(request), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof PlatformModeError) return Response.json({ error: error.message, code: error.code }, { status: error.status });
    return Response.json({ error: "Não foi possível atualizar a fila fiscal." }, { status: 500 });
  }
}

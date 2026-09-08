import { desc, eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { ensureScenarioSchema, getDb } from "../../../../db";
import { billingAccounts, billingTransactions, fiscalIssuanceEvents, fiscalIssuances, users } from "../../../../db/schema";
import {
  fiscalDataComplete,
  fiscalIssuanceAdapter,
  fiscalPendingReason,
  maskFiscalTaxId,
  normalizeDocumentReference,
  normalizeSha256,
} from "../../../../domain/fiscal-issuance";
import { platformIdentity } from "../../../../domain/platform-identity";
import { billingAmountForAccount, billingLimitForAccount, billingPricingMode, mercadoPagoConfigurationStatus } from "../../../billing";
import { getPlatformAdminUser, platformAdminIsConfigured } from "../../../platform-admin";
import { getPlatformOperationState, PlatformModeError, setBetaMode, setCyberLaunchGate } from "../../../platform-controls";
import { publicAppUrl } from "../../../public-url";

function cleanText(value: unknown, maximum: number) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, maximum) : "";
}

function digits(value: unknown) {
  return cleanText(value, 30).replace(/\D/g, "");
}

function fiscalIssuerConfiguration(runtime: Record<string, unknown>) {
  const adapterCode = cleanText(runtime.FISCAL_ISSUER_ADAPTER, 40) || "manual";
  const adapter = fiscalIssuanceAdapter(adapterCode);
  const municipalityCode = digits(runtime.FISCAL_ISSUER_MUNICIPALITY_CODE);
  const municipalRegistration = cleanText(runtime.FISCAL_ISSUER_MUNICIPAL_REGISTRATION, 60);
  const defaultServiceCode = cleanText(runtime.FISCAL_ISSUER_SERVICE_CODE, 40);
  const defaultServiceDescription = cleanText(runtime.FISCAL_ISSUER_SERVICE_DESCRIPTION, 240) || "Assinatura mensal CBSHub";
  const ownerTaxId = digits(runtime.PLATFORM_OWNER_TAX_ID);
  const missing = [
    !ownerTaxId ? "CPF/CNPJ do prestador" : "",
    !municipalityCode ? "código do município" : "",
    !municipalRegistration ? "inscrição municipal" : "",
    !defaultServiceCode ? "código padrão do serviço" : "",
    !adapter ? "adaptador fiscal reconhecido" : "",
  ].filter(Boolean);
  return {
    adapterCode,
    adapterMode: adapter?.automatic ? "automatic" : "manual",
    configured: missing.length === 0,
    legalName: platformIdentity.responsibleName,
    taxIdMasked: maskFiscalTaxId(ownerTaxId),
    municipalityCode,
    municipalRegistrationMasked: municipalRegistration ? `***${municipalRegistration.slice(-4)}` : "",
    defaultServiceCode,
    defaultServiceDescription,
    missing,
    credentialsSeparatedFromPayments: true,
  };
}

async function sensitiveIdentifierHash(value: string, runtime: Record<string, unknown>) {
  const secret = String(runtime.SECURITY_HASH_KEY ?? "").trim();
  if (!value || secret.length < 32) return null;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`fiscal-tax-id:${value}`));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function appendFiscalEvent(input: {
  issuanceId: number;
  transactionId: number;
  actorUserId?: number | null;
  eventType: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  reasonCode?: string | null;
  note?: string;
  adapterCode?: string;
  eventData?: Record<string, unknown>;
}) {
  await getDb().insert(fiscalIssuanceEvents).values({
    issuanceId: input.issuanceId,
    transactionId: input.transactionId,
    actorUserId: input.actorUserId ?? null,
    eventType: input.eventType,
    fromStatus: input.fromStatus ?? null,
    toStatus: input.toStatus ?? null,
    reasonCode: input.reasonCode ?? null,
    note: cleanText(input.note, 500),
    adapterCode: input.adapterCode ?? "manual",
    eventDataJson: JSON.stringify(input.eventData ?? {}),
  });
}

async function payloadFor(request: Request) {
  const db = getDb();
  const subscriptions = await db.select({
    id: billingAccounts.id,
    userId: billingAccounts.userId,
    customerName: users.name,
    customerEmail: users.email,
    planKey: billingAccounts.planKey,
    companyAddonBlocks: billingAccounts.companyAddonBlocks,
    pendingCompanyAddonBlocks: billingAccounts.pendingCompanyAddonBlocks,
    providerSubscriptionId: billingAccounts.providerSubscriptionId,
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
    customerTaxIdMasked: fiscalIssuances.customerTaxIdMasked,
    noteRequested: fiscalIssuances.noteRequested,
    serviceCode: fiscalIssuances.serviceCode,
    serviceDescription: fiscalIssuances.serviceDescription,
    competenceMonth: fiscalIssuances.competenceMonth,
    nfseNumber: fiscalIssuances.nfseNumber,
    nfseKey: fiscalIssuances.nfseKey,
    adapterCode: fiscalIssuances.adapterCode,
    providerDocumentId: fiscalIssuances.providerDocumentId,
    verificationUrl: fiscalIssuances.verificationUrl,
    pdfReference: fiscalIssuances.pdfReference,
    pdfSha256: fiscalIssuances.pdfSha256,
    xmlReference: fiscalIssuances.xmlReference,
    xmlSha256: fiscalIssuances.xmlSha256,
    failureCode: fiscalIssuances.failureCode,
    failureReason: fiscalIssuances.failureReason,
    issuedAt: fiscalIssuances.issuedAt,
    canceledAt: fiscalIssuances.canceledAt,
    cancelReason: fiscalIssuances.cancelReason,
    lastAttemptAt: fiscalIssuances.lastAttemptAt,
    attemptCount: fiscalIssuances.attemptCount,
    internalNote: fiscalIssuances.internalNote,
  }).from(billingTransactions)
    .innerJoin(users, eq(users.id, billingTransactions.userId))
    .leftJoin(fiscalIssuances, eq(fiscalIssuances.transactionId, billingTransactions.id))
    .orderBy(desc(billingTransactions.createdAt), desc(billingTransactions.id))
    .limit(100);

  const currentMonth = new Date().toISOString().slice(0, 7);
  const activeSubscriptions = subscriptions.filter((item) => item.status === "active");
  const subscriptionRows = subscriptions.map((item) => ({
    ...item,
    companyLimit: billingLimitForAccount(item),
    monthlyAmountCents: billingAmountForAccount(item),
    paymentFlow: item.providerSubscriptionId ? "Cartão automático" : "Pix mensal",
  }));
  const approvedThisMonth = transactions.filter((item) => item.status === "approved" && item.approvedAt?.startsWith(currentMonth));
  const transactionRows = transactions.map((item) => ({
    ...item,
    customerTaxId: item.customerTaxId ?? item.customerTaxIdMasked ?? null,
    pendingReason: fiscalPendingReason({
      status: item.fiscalStatus ?? "awaiting_payment",
      customerType: item.customerType ?? "unknown",
      customerTaxId: item.customerTaxId,
      noteRequested: item.noteRequested ?? false,
      serviceCode: item.serviceCode,
      serviceDescription: item.serviceDescription ?? "",
      nfseNumber: item.nfseNumber,
      verificationUrl: item.verificationUrl,
      pdfReference: item.pdfReference,
      xmlReference: item.xmlReference,
      failureReason: item.failureReason,
      cancelReason: item.cancelReason,
    }),
  }));
  const pendingFiscal = transactionRows.filter((item) => item.status === "approved" && !["issued", "not_required"].includes(item.fiscalStatus ?? "")).length;
  const estimatedMrrCents = activeSubscriptions.reduce((sum, item) => sum + (billingAmountForAccount(item) ?? 0), 0);
  const grossThisMonthCents = approvedThisMonth.reduce((sum, item) => sum + item.grossAmountCents, 0);
  const netThisMonthCents = approvedThisMonth.reduce((sum, item) => sum + (item.netAmountCents ?? item.grossAmountCents - (item.feeAmountCents ?? 0)), 0);
  const provider = mercadoPagoConfigurationStatus();
  const operation = await getPlatformOperationState();
  const runtime = env as unknown as Record<string, unknown>;

  return {
    configuration: {
      ...provider,
      reconciliationEnabled: provider.accessToken,
      pricingMode: billingPricingMode,
      adminAccess: platformAdminIsConfigured(),
      webhookUrl: publicAppUrl("/api/billing/webhook", request, runtime.PUBLIC_APP_URL),
      requiredEvents: ["payment", "subscription_preapproval", "subscription_authorized_payment"],
    },
    fiscalIssuer: fiscalIssuerConfiguration(runtime),
    operation,
    metrics: { activeSubscriptions: activeSubscriptions.length, estimatedMrrCents, grossThisMonthCents, netThisMonthCents, pendingFiscal },
    subscriptions: subscriptionRows,
    transactions: transactionRows,
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
    if (action === "set_cyber_launch_gate") {
      if (typeof body.enabled !== "boolean") return Response.json({ error: "Estado do gate de lançamento inválido." }, { status: 400 });
      const expectedConfirmation = body.enabled ? "FECHAR WORKSPACE" : "ABRIR WORKSPACE";
      if (cleanText(body.confirmation, 40).toUpperCase() !== expectedConfirmation) return Response.json({ error: `Confirme a operação com: ${expectedConfirmation}.` }, { status: 400 });
      await setCyberLaunchGate(admin, body.enabled);
      return Response.json(await payloadFor(request), { headers: { "Cache-Control": "no-store" } });
    }

    const id = Number(body.id);
    if (!Number.isInteger(id) || id <= 0) return Response.json({ error: "Pendência fiscal inválida." }, { status: 400 });
    const db = getDb();
    const [issuance] = await db.select().from(fiscalIssuances).where(eq(fiscalIssuances.id, id)).limit(1);
    if (!issuance) return Response.json({ error: "Pendência fiscal não encontrada." }, { status: 404 });
    const now = new Date().toISOString();
    const runtime = env as unknown as Record<string, unknown>;

    if (action === "save_fiscal_data") {
      if (["issued", "canceled"].includes(issuance.status)) return Response.json({ error: "Um documento emitido ou cancelado não pode ser reescrito; use a reabertura quando aplicável." }, { status: 409 });
      const customerType = ["individual", "legal_entity", "unknown"].includes(String(body.customerType)) ? String(body.customerType) : "unknown";
      const customerTaxId = digits(body.customerTaxId);
      const serviceCode = cleanText(body.serviceCode, 40);
      const serviceDescription = cleanText(body.serviceDescription, 240);
      const customerName = cleanText(body.customerName, 160);
      const competenceMonth = /^\d{4}-\d{2}$/.test(String(body.competenceMonth)) ? String(body.competenceMonth) : issuance.competenceMonth;
      const noteRequested = body.noteRequested === true;
      const complete = fiscalDataComplete({ customerType, customerTaxId, serviceCode, serviceDescription });
      const status = customerType === "individual" && !noteRequested ? "not_required" : complete ? "pending_issue" : "pending_data";
      await db.update(fiscalIssuances).set({
        customerType,
        customerTaxId: status === "not_required" ? null : customerTaxId || null,
        customerTaxIdMasked: customerTaxId ? maskFiscalTaxId(customerTaxId) : null,
        customerTaxIdHash: await sensitiveIdentifierHash(customerTaxId, runtime),
        customerName,
        noteRequested,
        serviceCode: serviceCode || null,
        serviceDescription,
        competenceMonth,
        internalNote: cleanText(body.internalNote, 500),
        status,
        failureCode: null,
        failureReason: null,
        updatedAt: now,
      }).where(eq(fiscalIssuances.id, id));
      await appendFiscalEvent({
        issuanceId: issuance.id,
        transactionId: issuance.transactionId,
        actorUserId: admin.id,
        eventType: "fiscal_data_classified",
        fromStatus: issuance.status,
        toStatus: status,
        reasonCode: complete ? "data_complete" : status === "not_required" ? "individual_not_requested" : "data_incomplete",
        adapterCode: issuance.adapterCode,
      });
    } else if (action === "mark_issued") {
      const nfseNumber = cleanText(body.nfseNumber, 80);
      const nfseKey = cleanText(body.nfseKey, 120);
      const providerDocumentId = cleanText(body.providerDocumentId, 160) || nfseKey || nfseNumber;
      const verificationUrl = normalizeDocumentReference(body.verificationUrl);
      const pdfReference = normalizeDocumentReference(body.pdfReference);
      const pdfSha256 = normalizeSha256(body.pdfSha256);
      const xmlReference = normalizeDocumentReference(body.xmlReference);
      const xmlSha256 = normalizeSha256(body.xmlSha256);
      if (issuance.status === "issued") {
        if (issuance.nfseNumber === nfseNumber && issuance.providerDocumentId === providerDocumentId) return Response.json(await payloadFor(request), { headers: { "Cache-Control": "no-store" } });
        return Response.json({ error: "A emissão já foi registrada. Cancele no emissor oficial antes de alterar a identidade do documento." }, { status: 409 });
      }
      if (!fiscalDataComplete({ customerType: issuance.customerType, customerTaxId: issuance.customerTaxId ?? "", serviceCode: issuance.serviceCode, serviceDescription: issuance.serviceDescription }) || !nfseNumber) {
        return Response.json({ error: "Complete tomador, CPF/CNPJ, código do serviço e número da NFS-e antes de concluir." }, { status: 400 });
      }
      if (body.verificationUrl && !verificationUrl) return Response.json({ error: "Informe um link HTTPS válido para verificação da NFS-e." }, { status: 400 });
      if (body.pdfReference && !pdfReference) return Response.json({ error: "Referência de PDF inválida." }, { status: 400 });
      if (body.xmlReference && !xmlReference) return Response.json({ error: "Referência de XML inválida." }, { status: 400 });
      if (body.pdfSha256 && !pdfSha256) return Response.json({ error: "Hash SHA-256 do PDF inválido." }, { status: 400 });
      if (body.xmlSha256 && !xmlSha256) return Response.json({ error: "Hash SHA-256 do XML inválido." }, { status: 400 });
      await db.update(fiscalIssuances).set({
        status: "issued",
        providerDocumentId,
        nfseNumber,
        nfseKey: nfseKey || null,
        verificationUrl,
        pdfReference,
        pdfSha256,
        xmlReference,
        xmlSha256,
        customerTaxIdMasked: issuance.customerTaxId ? maskFiscalTaxId(issuance.customerTaxId) : issuance.customerTaxIdMasked,
        customerTaxIdHash: issuance.customerTaxId ? await sensitiveIdentifierHash(issuance.customerTaxId, runtime) : issuance.customerTaxIdHash,
        customerTaxId: null,
        failureCode: null,
        failureReason: null,
        issuedAt: now,
        updatedAt: now,
      }).where(eq(fiscalIssuances.id, id));
      await appendFiscalEvent({
        issuanceId: issuance.id,
        transactionId: issuance.transactionId,
        actorUserId: admin.id,
        eventType: "issuance_registered",
        fromStatus: issuance.status,
        toStatus: "issued",
        reasonCode: "official_document_recorded",
        adapterCode: issuance.adapterCode,
        eventData: { providerDocumentId, nfseNumber, hasVerificationUrl: Boolean(verificationUrl), hasPdfReference: Boolean(pdfReference), hasXmlReference: Boolean(xmlReference) },
      });
    } else if (action === "mark_not_required") {
      if (issuance.customerType !== "individual" || issuance.noteRequested) return Response.json({ error: "A dispensa só pode ser registrada para pessoa física que não solicitou nota." }, { status: 400 });
      await db.update(fiscalIssuances).set({ status: "not_required", customerTaxId: null, updatedAt: now }).where(eq(fiscalIssuances.id, id));
      await appendFiscalEvent({ issuanceId: issuance.id, transactionId: issuance.transactionId, actorUserId: admin.id, eventType: "issuance_not_required", fromStatus: issuance.status, toStatus: "not_required", reasonCode: "individual_not_requested", adapterCode: issuance.adapterCode });
    } else if (action === "request_issuance") {
      if (issuance.status === "issued") return Response.json(await payloadFor(request), { headers: { "Cache-Control": "no-store" } });
      if (!["pending_issue", "failed"].includes(issuance.status)) return Response.json({ error: "Complete os dados fiscais antes de solicitar a emissão." }, { status: 409 });
      const adapter = fiscalIssuanceAdapter(issuance.adapterCode);
      if (!adapter) return Response.json({ error: "O adaptador fiscal configurado não está disponível." }, { status: 409 });
      const requestKey = issuance.requestKey || `fiscal:${issuance.transactionId}`;
      const result = await adapter.submit({ issuanceId: issuance.id, requestKey, amountCents: issuance.amountCents, competenceMonth: issuance.competenceMonth });
      await db.update(fiscalIssuances).set({ requestKey, lastAttemptAt: now, attemptCount: issuance.attemptCount + 1, updatedAt: now }).where(eq(fiscalIssuances.id, id));
      await appendFiscalEvent({
        issuanceId: issuance.id,
        transactionId: issuance.transactionId,
        actorUserId: admin.id,
        eventType: result.kind === "manual_required" ? "manual_action_required" : "adapter_submission",
        fromStatus: issuance.status,
        toStatus: issuance.status,
        reasonCode: result.kind,
        note: result.kind === "manual_required" ? result.reason : "",
        adapterCode: adapter.code,
        eventData: { requestKey, automatic: adapter.automatic },
      });
    } else if (action === "mark_failed") {
      const failureReason = cleanText(body.failureReason, 500);
      const failureCode = cleanText(body.failureCode, 80) || "manual_failure";
      if (failureReason.length < 8) return Response.json({ error: "Descreva o motivo da falha para permitir correção e reprocessamento." }, { status: 400 });
      if (issuance.status === "issued") return Response.json({ error: "Uma NFS-e emitida não pode ser marcada como falha." }, { status: 409 });
      await db.update(fiscalIssuances).set({ status: "failed", failureCode, failureReason, updatedAt: now }).where(eq(fiscalIssuances.id, id));
      await appendFiscalEvent({ issuanceId: issuance.id, transactionId: issuance.transactionId, actorUserId: admin.id, eventType: "issuance_failed", fromStatus: issuance.status, toStatus: "failed", reasonCode: failureCode, note: failureReason, adapterCode: issuance.adapterCode });
    } else if (action === "mark_canceled") {
      const cancelReason = cleanText(body.cancelReason, 500);
      if (cancelReason.length < 8) return Response.json({ error: "Registre o motivo confirmado no emissor oficial antes de cancelar." }, { status: 400 });
      if (issuance.status !== "issued") return Response.json({ error: "Somente uma NFS-e emitida pode ser registrada como cancelada." }, { status: 409 });
      await db.update(fiscalIssuances).set({ status: "canceled", canceledAt: now, cancelReason, updatedAt: now }).where(eq(fiscalIssuances.id, id));
      await appendFiscalEvent({ issuanceId: issuance.id, transactionId: issuance.transactionId, actorUserId: admin.id, eventType: "issuance_canceled", fromStatus: issuance.status, toStatus: "canceled", reasonCode: "official_cancellation_confirmed", note: cancelReason, adapterCode: issuance.adapterCode });
    } else if (action === "reopen") {
      if (issuance.status === "issued") return Response.json({ error: "NFS-e emitida deve ser cancelada no emissor oficial antes da reabertura." }, { status: 409 });
      const status = fiscalDataComplete({ customerType: issuance.customerType, customerTaxId: issuance.customerTaxId ?? "", serviceCode: issuance.serviceCode, serviceDescription: issuance.serviceDescription }) ? "pending_issue" : "pending_data";
      await db.update(fiscalIssuances).set({ status, failureCode: null, failureReason: null, canceledAt: null, cancelReason: null, providerDocumentId: status === "pending_data" ? null : issuance.providerDocumentId, updatedAt: now }).where(eq(fiscalIssuances.id, id));
      await appendFiscalEvent({ issuanceId: issuance.id, transactionId: issuance.transactionId, actorUserId: admin.id, eventType: "issuance_reopened", fromStatus: issuance.status, toStatus: status, reasonCode: "manual_reprocess", adapterCode: issuance.adapterCode });
    } else {
      return Response.json({ error: "Ação fiscal inválida." }, { status: 400 });
    }

    return Response.json(await payloadFor(request), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof PlatformModeError) return Response.json({ error: error.message, code: error.code }, { status: error.status });
    if (/unique constraint/i.test(String(error))) return Response.json({ error: "Este documento fiscal ou identificador de reprocessamento já está vinculado a outra cobrança." }, { status: 409 });
    return Response.json({ error: "Não foi possível atualizar a fila fiscal." }, { status: 500 });
  }
}

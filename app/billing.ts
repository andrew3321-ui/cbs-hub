import { env } from "cloudflare:workers";
import {
  billingAmountCents,
  billingCompanyLimit,
  billingPlans,
  normalizeCompanyAddonBlocks,
  type PaidPlanKey,
  type PurchasablePaidPlanKey,
} from "../domain/billing-plans";

export {
  BILLING_ADDON_COMPANY_BLOCK_PRICE_CENTS,
  BILLING_ADDON_COMPANY_BLOCK_SIZE,
  BILLING_BASE_COMPANY_LIMIT,
  BILLING_MAX_ADDON_BLOCKS,
  billingAmountCents,
  billingCompanyLimit,
  billingPlans,
  billingPricingMode,
  normalizeCompanyAddonBlocks,
  type PaidPlanKey,
  type PurchasablePaidPlanKey,
} from "../domain/billing-plans";

type MercadoPagoEnvironment = {
  MERCADO_PAGO_ACCESS_TOKEN?: string;
  MERCADO_PAGO_WEBHOOK_SECRET?: string;
};

export class MercadoPagoApiError extends Error {
  constructor(public readonly status: number, public readonly providerCode: string) {
    super(`mercado_pago_${status}_${providerCode}`);
    this.name = "MercadoPagoApiError";
  }
}

export function mercadoPagoApiErrorDetails(error: unknown) {
  if (!error || typeof error !== "object") return null;
  const candidate = error as { name?: unknown; status?: unknown; providerCode?: unknown };
  if (candidate.name !== "MercadoPagoApiError" || !Number.isInteger(candidate.status) || typeof candidate.providerCode !== "string") return null;
  return { status: Number(candidate.status), providerCode: candidate.providerCode };
}

export function mercadoPagoTransportErrorCode(error: unknown) {
  if (!(error instanceof Error)) return "transport_unclassified";
  const message = error.message.toLowerCase();
  if (error.name === "AbortError" || error.name === "TimeoutError") return "provider_timeout";
  if (message.includes("abortsignal.timeout")) return "runtime_timeout_unsupported";
  if (message.includes("redirect")) return "provider_redirect_blocked";
  if (message.includes("header")) return "request_header_invalid";
  if (message.includes("fetch") || message.includes("network") || message.includes("connection")) return "provider_network_failure";
  return "transport_unclassified";
}

export type MercadoPagoSubscription = {
  id: string;
  external_reference?: string | number | null;
  init_point?: string | null;
  status?: string | null;
  next_payment_date?: string | null;
  auto_recurring?: { transaction_amount?: string | number | null; currency_id?: string | null } | null;
};

export type MercadoPagoAuthorizedPayment = {
  id: string | number;
  preapproval_id?: string | null;
  external_reference?: string | number | null;
  currency_id?: string | null;
  transaction_amount?: string | number | null;
  debit_date?: string | null;
  date_created?: string | null;
  status?: string | null;
  summarized?: string | null;
  payment?: { id?: string | number | null; status?: string | null; status_detail?: string | null } | null;
};

export type MercadoPagoPayment = {
  id: string | number;
  external_reference?: string | number | null;
  status?: string | null;
  status_detail?: string | null;
  transaction_amount?: string | number | null;
  currency_id?: string | null;
  payment_method_id?: string | null;
  payment_type_id?: string | null;
  date_created?: string | null;
  date_approved?: string | null;
  date_of_expiration?: string | null;
  fee_details?: Array<{ amount?: string | number | null; type?: string | null }>;
  transaction_details?: { net_received_amount?: string | number | null } | null;
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string | null;
      qr_code_base64?: string | null;
      ticket_url?: string | null;
    } | null;
  } | null;
};

export type MercadoPagoOrderPayment = {
  id?: string | number | null;
  amount?: string | number | null;
  paid_amount?: string | number | null;
  status?: string | null;
  status_detail?: string | null;
  date_of_expiration?: string | null;
  payment_method?: {
    id?: string | null;
    type?: string | null;
    qr_code?: string | null;
    qr_code_base64?: string | null;
    ticket_url?: string | null;
  } | null;
};

export type MercadoPagoOrder = {
  id: string;
  external_reference?: string | number | null;
  total_amount?: string | number | null;
  total_paid_amount?: string | number | null;
  country_code?: string | null;
  status?: string | null;
  status_detail?: string | null;
  created_date?: string | null;
  last_updated_date?: string | null;
  transactions?: { payments?: MercadoPagoOrderPayment[] | null } | null;
};

export function getMercadoPagoEnvironment() {
  const runtime = env as unknown as MercadoPagoEnvironment;
  return {
    accessToken: String(runtime.MERCADO_PAGO_ACCESS_TOKEN ?? "").trim(),
    webhookSecret: String(runtime.MERCADO_PAGO_WEBHOOK_SECRET ?? "").trim(),
  };
}

export function mercadoPagoConfigurationStatus() {
  const { accessToken, webhookSecret } = getMercadoPagoEnvironment();
  return {
    accessToken: Boolean(accessToken),
    webhookSecret: Boolean(webhookSecret),
    mode: accessToken.startsWith("TEST-") ? "test" : accessToken ? "production" : "disabled",
  } as const;
}

export function currencyAmountToCents(value: string | number | null | undefined) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return Math.round(amount * 100);
}

export function isPaidPlanKey(value: unknown): value is PaidPlanKey {
  return typeof value === "string" && value in billingPlans;
}

export function isPurchasablePlanKey(value: unknown): value is PurchasablePaidPlanKey {
  return isPaidPlanKey(value) && billingPlans[value].purchasable;
}

export function billingAmountForAccount(input: {
  planKey: string;
  companyAddonBlocks?: number | null;
  pendingCompanyAddonBlocks?: number | null;
  providerSubscriptionId?: string | null;
  status?: string | null;
}) {
  if (!isPaidPlanKey(input.planKey)) return null;
  const activeBlocks = normalizeCompanyAddonBlocks(input.companyAddonBlocks) ?? 0;
  const pendingBlocks = normalizeCompanyAddonBlocks(input.pendingCompanyAddonBlocks) ?? activeBlocks;
  const usePending = !input.providerSubscriptionId
    && ["pix_creating", "pending", "renewal_pending"].includes(String(input.status ?? ""));
  return billingAmountCents(input.planKey, usePending ? pendingBlocks : activeBlocks);
}

export function billingLimitForAccount(input: { planKey: string; companyAddonBlocks?: number | null }) {
  if (!isPaidPlanKey(input.planKey)) return null;
  return billingCompanyLimit(input.planKey, normalizeCompanyAddonBlocks(input.companyAddonBlocks) ?? 0);
}

export function normalizeBillingStatus(status: string | null | undefined) {
  switch (status) {
    case "authorized": return "active";
    case "paused": return "paused";
    case "cancelled":
    case "canceled": return "canceled";
    case "pending": return "pending";
    default: return status || "pending";
  }
}

export async function mercadoPagoRequest<T>(path: string, init: RequestInit = {}) {
  const { accessToken } = getMercadoPagoEnvironment();
  if (!accessToken) throw new Error("billing_not_configured");
  const timeoutController = init.signal ? null : new AbortController();
  const timeout = timeoutController ? setTimeout(() => timeoutController.abort(), 10_000) : null;
  let response: Response;
  try {
    response = await fetch(`https://api.mercadopago.com${path}`, {
      ...init,
      signal: init.signal ?? timeoutController?.signal,
      redirect: "manual",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });
  } finally {
    if (timeout != null) clearTimeout(timeout);
  }
  const data = await response.json().catch(() => ({})) as T & {
    error?: string;
    message?: string;
    cause?: Array<{ code?: string | number; description?: string }>;
    errors?: Array<{ code?: string | number; message?: string; detail?: string }>;
  };
  if (!response.ok) {
    const providerMessage = String(data.message ?? "").toLowerCase();
    const providerDetail = [
      ...(Array.isArray(data.cause) ? data.cause.map((item) => `${item.code ?? ""} ${item.description ?? ""}`) : []),
      ...(Array.isArray(data.errors) ? data.errors.map((item) => `${item.code ?? ""} ${item.message ?? ""} ${item.detail ?? ""}`) : []),
    ].join(" ").toLowerCase();
    const combinedMessage = `${providerMessage} ${providerDetail}`;
    const messageCode = providerMessage.includes("idempotency")
      ? "idempotency_key_invalid"
      : combinedMessage.includes("payer") && combinedMessage.includes("collector")
        ? "payer_collector_conflict"
        : combinedMessage.includes("invalid users involved")
          ? "payer_collector_conflict"
        : combinedMessage.includes("pix") && combinedMessage.includes("key")
          ? "pix_key_not_available"
        : combinedMessage.includes("collector") && (combinedMessage.includes("not allowed") || combinedMessage.includes("disabled"))
          ? "collector_account_restricted"
        : combinedMessage.includes("email")
          ? "payer_email_invalid"
          : response.status === 401 || response.status === 403
            ? "credential_not_authorized"
            : response.status >= 500
              ? "provider_internal_error"
              : "request_rejected";
    const rawCode = String(data.errors?.[0]?.code ?? data.cause?.[0]?.code ?? data.error ?? messageCode);
    const providerCode = rawCode.replace(/[^a-zA-Z0-9_.-]/g, "_").slice(0, 80) || "request_failed";
    throw new MercadoPagoApiError(response.status, providerCode);
  }
  return data;
}

export function randomBillingReference(userId: number) {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const suffix = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `mc_${userId}_${suffix}`;
}

export async function billingIdempotencyKey(externalReference: string) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`margem-clara:billing:${externalReference}`)));
  const bytes = digest.slice(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytesToHex(bytes);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

export async function validateMercadoPagoWebhook(request: Request, dataId: string) {
  const { webhookSecret } = getMercadoPagoEnvironment();
  const signature = request.headers.get("x-signature") ?? "";
  const requestId = request.headers.get("x-request-id") ?? "";
  const parts = Object.fromEntries(signature.split(",").map((part) => part.trim().split("=", 2)));
  const timestamp = parts.ts ?? "";
  const receivedSignature = parts.v1 ?? "";
  if (!webhookSecret || !timestamp || !receivedSignature) return false;

  const ageSeconds = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(ageSeconds) || ageSeconds > 15 * 60) return false;
  const normalizedId = /[a-z]/i.test(dataId) ? dataId.toLowerCase() : dataId;
  const manifest = `id:${normalizedId};${requestId ? `request-id:${requestId};` : ""}ts:${timestamp};`;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(webhookSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(manifest));
  return constantTimeEqual(bytesToHex(new Uint8Array(digest)), receivedSignature.toLowerCase());
}

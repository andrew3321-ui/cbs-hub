import { env } from "cloudflare:workers";
import { billingPlans, type PaidPlanKey } from "../domain/billing-plans";

export { billingPlans, billingPricingMode, type PaidPlanKey } from "../domain/billing-plans";

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
  fee_details?: Array<{ amount?: string | number | null; type?: string | null }>;
  transaction_details?: { net_received_amount?: string | number | null } | null;
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
  const response = await fetch(`https://api.mercadopago.com${path}`, {
    ...init,
    signal: init.signal ?? AbortSignal.timeout(10_000),
    redirect: "error",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const data = await response.json().catch(() => ({})) as T & { error?: string; message?: string; cause?: Array<{ code?: string | number }> };
  if (!response.ok) {
    const providerMessage = String(data.message ?? "").toLowerCase();
    const messageCode = providerMessage.includes("idempotency")
      ? "idempotency_key_invalid"
      : providerMessage.includes("payer") && providerMessage.includes("collector")
        ? "payer_collector_conflict"
        : providerMessage.includes("email")
          ? "payer_email_invalid"
          : response.status === 401 || response.status === 403
            ? "credential_not_authorized"
            : response.status >= 500
              ? "provider_internal_error"
              : "request_rejected";
    const rawCode = String(data.cause?.[0]?.code ?? data.error ?? messageCode);
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

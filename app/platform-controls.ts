import { count, eq, inArray } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { ensureScenarioSchema, getDb } from "../db";
import { auditEvents, billingAccounts, platformSettings } from "../db/schema";
import { mercadoPagoConfigurationStatus } from "./billing";
import type { AppUser } from "./auth";
import { platformIdentity } from "../domain/platform-identity";

const BETA_SETTING_KEY = "beta_enabled";

type PlatformRuntimeEnvironment = {
  PLATFORM_OWNER_TAX_ID?: string;
  PLATFORM_OWNER_LEGAL_ADDRESS?: string;
  PLATFORM_PRIVACY_CONTACT_EMAIL?: string;
  SECURITY_HASH_KEY?: string;
};

export type ReadinessGate = {
  key: string;
  label: string;
  ready: boolean;
  detail: string;
};

export class PlatformModeError extends Error {
  constructor(public code: string, message: string, public status = 409) {
    super(message);
    this.name = "PlatformModeError";
  }
}

function digits(value: string) {
  return value.replace(/\D/g, "");
}

export function cpfIsValid(value: string) {
  const cpf = digits(value);
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  const digit = (length: number) => {
    const total = cpf.slice(0, length).split("").reduce((sum, current, index) => sum + Number(current) * (length + 1 - index), 0);
    const remainder = (total * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}

export function formatCpf(value: string) {
  const cpf = digits(value);
  return /^\d{11}$/.test(cpf) ? cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4") : "";
}

function runtimeConfiguration() {
  const runtime = env as unknown as PlatformRuntimeEnvironment;
  return {
    ownerTaxId: String(runtime.PLATFORM_OWNER_TAX_ID ?? "").trim(),
    legalAddress: String(runtime.PLATFORM_OWNER_LEGAL_ADDRESS ?? "").trim().replace(/\s+/g, " "),
    privacyEmail: String(runtime.PLATFORM_PRIVACY_CONTACT_EMAIL ?? "").trim().toLowerCase(),
    securityHashKey: String(runtime.SECURITY_HASH_KEY ?? "").trim(),
  };
}

export function privacyContactEmail() {
  const email = runtimeConfiguration().privacyEmail;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function paymentReadinessGates(): ReadinessGate[] {
  const provider = mercadoPagoConfigurationStatus();
  const runtime = runtimeConfiguration();
  return [
    { key: "provider_token", label: "Credencial de produção do Mercado Pago", ready: provider.mode === "production", detail: provider.mode === "production" ? "Token de produção reconhecido." : "Configure um Access Token de produção." },
    { key: "provider_reconciliation", label: "Conciliação oficial de pagamentos", ready: provider.accessToken, detail: provider.webhookSecret ? "Cartão, Pix e notificações HMAC oficiais habilitados." : provider.accessToken ? "Assinaturas e Pix são reconfirmados pela API oficial; o webhook HMAC pode ser adicionado depois." : "Configure a credencial para consultar pagamentos no provedor." },
    { key: "owner_tax_id", label: "CPF do fornecedor", ready: cpfIsValid(runtime.ownerTaxId), detail: cpfIsValid(runtime.ownerTaxId) ? "CPF válido armazenado como segredo." : "Configure um CPF válido antes de cobrar." },
    { key: "legal_address", label: "Endereço legal do fornecedor", ready: runtime.legalAddress.length >= 12, detail: runtime.legalAddress.length >= 12 ? "Endereço comercial configurado." : "Informe o endereço exigido para a contratação eletrônica." },
    { key: "privacy_contact", label: "Canal de privacidade", ready: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(runtime.privacyEmail), detail: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(runtime.privacyEmail) ? "Canal dos titulares configurado." : "Configure o e-mail de privacidade e atendimento." },
    { key: "security_hash", label: "Chave de proteção antifraude", ready: runtime.securityHashKey.length >= 32, detail: runtime.securityHashKey.length >= 32 ? "Identificadores técnicos são pseudonimizados." : "Configure uma chave aleatória com pelo menos 32 caracteres." },
    { key: "legal_pages", label: "Privacidade e termos publicados", ready: true, detail: "Textos e direitos do titular estão disponíveis." },
  ];
}

async function readPlatformOperationState() {
  const db = getDb();
  const [setting] = await db.select().from(platformSettings).where(eq(platformSettings.key, BETA_SETTING_KEY)).limit(1);
  const betaEnabled = setting?.value !== "false";
  const gates = paymentReadinessGates();
  const readinessReady = gates.every((gate) => gate.ready);
  const [{ total: activeSubscriptions }] = await db.select({ total: count() }).from(billingAccounts).where(inArray(billingAccounts.status, ["active", "authorized", "pending", "paused", "pix_creating", "renewal_pending"]));
  return {
    betaEnabled,
    paymentsEnabled: !betaEnabled && readinessReady,
    revision: setting?.revision ?? 1,
    updatedAt: setting?.updatedAt ?? null,
    readiness: { ready: readinessReady, gates },
    activeSubscriptions,
  };
}

export async function getPlatformOperationState() {
  try {
    return await readPlatformOperationState();
  } catch {
    await ensureScenarioSchema();
    return readPlatformOperationState();
  }
}

export async function setBetaMode(admin: AppUser, betaEnabled: boolean) {
  const current = await getPlatformOperationState();
  if (current.betaEnabled === betaEnabled) return current;
  if (!betaEnabled && !current.readiness.ready) {
    const missing = current.readiness.gates.filter((gate) => !gate.ready).map((gate) => gate.label).join(", ");
    throw new PlatformModeError("PAYMENT_PREREQUISITES_MISSING", `Ainda faltam proteções obrigatórias: ${missing}.`);
  }
  const now = new Date().toISOString();
  const nextRevision = current.revision + 1;
  await getDb().batch([
    getDb().update(platformSettings).set({ value: betaEnabled ? "true" : "false", revision: nextRevision, updatedByUserId: admin.id, updatedAt: now }).where(eq(platformSettings.key, BETA_SETTING_KEY)),
    getDb().insert(auditEvents).values({
      ownerUserId: admin.id,
      eventType: betaEnabled ? "platform.beta_enabled" : "platform.beta_disabled",
      eventData: JSON.stringify({ actorUserId: admin.id, previousRevision: current.revision, revision: nextRevision, newPaymentsAccepted: !betaEnabled, existingSubscriptionsPreserved: betaEnabled && current.activeSubscriptions > 0, activeSubscriptions: current.activeSubscriptions }),
      createdAt: now,
    }),
  ]);
  return getPlatformOperationState();
}

export async function publicLegalSupplierIdentity() {
  const state = await getPlatformOperationState();
  if (!state.paymentsEnabled) return null;
  const runtime = runtimeConfiguration();
  return {
    name: platformIdentity.responsibleName,
    cpf: formatCpf(runtime.ownerTaxId),
    address: runtime.legalAddress,
    email: runtime.privacyEmail,
  };
}

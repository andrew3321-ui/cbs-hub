import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");

test("beta and paid checkout remain mutually exclusive while existing renewals are disclosed", () => {
  const controls = read("../app/platform-controls.ts");
  const checkout = read("../app/api/billing/checkout/route.ts");
  const admin = read("../app/api/admin/billing/route.ts");
  assert.match(controls, /paymentsEnabled:\s*!betaEnabled && readinessReady/);
  assert.match(controls, /PAYMENT_PREREQUISITES_MISSING/);
  assert.doesNotMatch(controls, /ACTIVE_SUBSCRIPTIONS_BLOCK_BETA/);
  assert.match(controls, /existingSubscriptionsPreserved/);
  assert.match(checkout, /if \(!operation\.paymentsEnabled\)/);
  assert.match(admin, /ATIVAR PAGAMENTOS/);
  assert.match(admin, /setBetaMode\(admin, body\.betaEnabled\)/);
  const center = read("../app/app/BillingCenter.tsx");
  assert.match(center, /A ativação do beta não cancela contratos existentes/);
  assert.doesNotMatch(center, /activeSubscriptions > 0\)\} onClick/);
});

test("payment activation requires production, reconciliation, legal, privacy and antifraud gates", () => {
  const controls = read("../app/platform-controls.ts");
  for (const key of ["provider_token", "provider_reconciliation", "owner_tax_id", "legal_address", "privacy_contact", "security_hash", "legal_pages"]) assert.match(controls, new RegExp(key));
  assert.match(controls, /provider\.mode === "production"/);
  assert.match(controls, /cpfIsValid/);
  assert.match(controls, /securityHashKey\.length >= 32/);
  assert.match(controls, /ready: provider\.accessToken/);
});

test("subscriptions omit unsupported callback fields and reconcile provider truth", () => {
  const billing = read("../app/billing.ts");
  const checkout = read("../app/api/billing/checkout/route.ts");
  const webhook = read("../app/api/billing/webhook/route.ts");
  const reconciliation = read("../app/billing-reconciliation.ts");
  const billingRoute = read("../app/api/billing/route.ts");
  assert.doesNotMatch(checkout, /notification_url/);
  assert.match(checkout, /back_url/);
  assert.match(checkout, /billingIdempotencyKey\(`\$\{reference\}:\$\{plan\.key\}:\$\{plan\.priceCents\}`\)/);
  assert.match(checkout, /supportCode/);
  assert.match(billing, /MercadoPagoApiError/);
  assert.match(billing, /mercadoPagoApiErrorDetails/);
  assert.match(billing, /mercadoPagoTransportErrorCode/);
  assert.match(billing, /new AbortController\(\)/);
  assert.match(billing, /redirect: "manual"/);
  assert.doesNotMatch(billing, /AbortSignal\.timeout/);
  assert.match(billing, /margem-clara:billing:/);
  assert.match(checkout, /PROVIDER_REQUEST/);
  assert.match(checkout, /ACCOUNT_PERSISTENCE/);
  assert.match(webhook, /validateMercadoPagoWebhook/);
  assert.match(webhook, /provider\.webhookSecret/);
  assert.match(billingRoute, /syncBillingAccountFromProvider/);
  assert.match(reconciliation, /authorized_payments\/search/);
  assert.match(reconciliation, /account\.externalReference !== externalReference/);
  assert.match(reconciliation, /grossAmountCents !== plan\.priceCents/);
  assert.match(reconciliation, /currency !== "BRL"/);
  assert.match(reconciliation, /status: "active"/);
});

test("worker applies layered request and response defenses", () => {
  const worker = read("../worker/index.ts");
  for (const control of ["Content-Security-Policy", "Strict-Transport-Security", "X-Content-Type-Options", "X-Frame-Options", "Permissions-Policy", "Cross-Origin-Opener-Policy", "CROSS_SITE_REQUEST_BLOCKED", "RATE_LIMITED", "PAYLOAD_TOO_LARGE"]) assert.match(worker, new RegExp(control));
  assert.match(worker, /security_rate_limits/);
  assert.match(worker, /pseudonymousClientKey/);
  assert.match(worker, /pathname !== "\/api\/billing\/webhook"/);
  assert.match(worker, /billing-webhook/);
});

test("authentication uses the runtime-supported password derivation cost and short sessions", () => {
  const auth = read("../app/auth.ts");
  const login = read("../app/api/auth/login/route.ts");
  assert.match(auth, /CURRENT_PASSWORD_ITERATIONS = 100_000/);
  assert.match(auth, /SESSION_SECONDS = 60 \* 60 \* 24 \* 7/);
  assert.match(auth, /value\.length >= 12/);
  assert.match(auth, /HttpOnly; SameSite=Lax; Priority=High/);
  assert.match(login, /passwordUpgrade/);
});

test("LGPD center exposes access and deletion without exporting authentication secrets", () => {
  const privacy = read("../app/privacidade/page.tsx");
  const actions = read("../app/privacidade/PrivacyActions.tsx");
  const account = read("../app/api/account/route.ts");
  assert.match(privacy, /Dados mínimos, finalidade clara/);
  assert.match(actions, /Baixar cópia dos dados/);
  assert.match(actions, /Excluir permanentemente/);
  assert.match(account, /passwordHashesExcluded: true/);
  assert.match(account, /sessionTokensExcluded: true/);
  assert.doesNotMatch(account, /passwordHash:\s*users\.passwordHash/);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("Pix uses the Orders API with server-side price and idempotency", async () => {
  const [route, billing] = await Promise.all([
    read("app/api/billing/pix/route.ts"),
    read("app/billing.ts"),
  ]);
  assert.match(route, /mercadoPagoRequest<MercadoPagoOrder>\("\/v1\/orders"/);
  assert.match(route, /const amount = \(amountCents \/ 100\)\.toFixed\(2\)/);
  assert.match(route, /total_amount: amount/);
  assert.match(route, /payment_method: \{ id: "pix", type: "bank_transfer" \}/);
  assert.match(route, /processing_mode: "automatic"/);
  assert.match(route, /payer: \{ email: user\.email \}/);
  assert.match(route, /external_reference: reference/);
  assert.match(route, /billingIdempotencyKey\(`\$\{reference\}:pix:\$\{plan\.key\}:\$\{addonBlocks\}:\$\{amountCents\}`\)/);
  assert.match(route, /CARD_CHECKOUT_STATUS/);
  assert.match(route, /remoteStatus === "active"/);
  assert.match(route, /billing\.card_checkout_abandoned_for_pix/);
  assert.doesNotMatch(route, /payload\.(amount|email|payer|pixKey)/);
  assert.match(billing, /type MercadoPagoOrder/);
  assert.match(billing, /data\.errors\?\.\[0\]\?\.code/);
});

test("Pix reconciliation validates identity, amount, country and method before granting access", async () => {
  const [reconciliation, cardRoute] = await Promise.all([
    read("app/billing-pix.ts"),
    read("app/api/billing/checkout/route.ts"),
  ]);
  assert.match(reconciliation, /account\.externalReference !== externalReference/);
  assert.match(reconciliation, /amountCents !== expectedAmountCents/);
  assert.match(reconciliation, /currency !== "BRL"/);
  assert.match(reconciliation, /snapshot\.paymentMethod !== "pix"/);
  assert.match(reconciliation, /snapshot\.paymentType !== "bank_transfer"/);
  assert.match(reconciliation, /status === "approved"/);
  assert.match(reconciliation, /alreadyCredited/);
  assert.match(reconciliation, /status: "active"/);
  assert.match(reconciliation, /checkoutUrl: null/);
  assert.match(reconciliation, /ensureFiscalIssuance/);
  assert.match(reconciliation, /providerInvoiceId: `pix-order:\$\{orderId\}`/);
  assert.match(reconciliation, /providerFlow: "orders"/);
  assert.match(reconciliation, /reconcilePixTransactionFromProvider/);
  assert.match(reconciliation, /\/v1\/orders\/\$\{encodeURIComponent\(orderId\)\}\/cancel/);
  assert.match(cardRoute, /status: "cancelled", statusDetail: "replaced_by_card"/);
  assert.match(cardRoute, /PIX_CHECKOUT_CANCELLATION/);
});

test("UI distinguishes monthly Pix from automatic subscription without exposing a receiver key", async () => {
  const [client, page, worker, webhook] = await Promise.all([
    read("app/planos/PricingClient.tsx"),
    read("app/planos/page.tsx"),
    read("worker/index.ts"),
    read("app/api/billing/webhook/route.ts"),
  ]);
  assert.match(client, /Cartão automático/);
  assert.match(client, /Pix mensal/);
  assert.match(client, /Pix Copia e Cola/);
  assert.match(client, /O plano só é ativado depois/);
  assert.match(client, /data:image\/png;base64/);
  assert.match(client, /Pix exige confirmação a cada mês/);
  assert.match(page, /entra na próxima renovação/);
  assert.match(worker, /pathname === "\/api\/billing\/pix"/);
  assert.match(webhook, /eventType === "order"/);
  assert.match(webhook, /eventType === "payment"/);
  assert.doesNotMatch(client, /\+55\d{11}|pixKey/);
});

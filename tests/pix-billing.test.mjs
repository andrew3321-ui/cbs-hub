import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("Pix é criado no servidor com preço do plano e chave idempotente", async () => {
  const [route, billing] = await Promise.all([
    read("app/api/billing/pix/route.ts"),
    read("app/billing.ts"),
  ]);
  assert.match(route, /mercadoPagoRequest<MercadoPagoPayment>\("\/v1\/payments"/);
  assert.match(route, /transaction_amount: plan\.priceCents \/ 100/);
  assert.match(route, /payment_method_id: "pix"/);
  assert.match(route, /payer: \{ email: user\.email \}/);
  assert.match(route, /external_reference: reference/);
  assert.match(route, /billingIdempotencyKey\(`\$\{reference\}:pix:\$\{plan\.key\}:\$\{plan\.priceCents\}`\)/);
  assert.doesNotMatch(route, /payload\.(amount|email|payer|pixKey)/);
  assert.match(billing, /point_of_interaction/);
});

test("conciliação Pix valida identidade, valor, moeda e método antes de liberar acesso", async () => {
  const [reconciliation, cardRoute] = await Promise.all([
    read("app/billing-pix.ts"),
    read("app/api/billing/checkout/route.ts"),
  ]);
  assert.match(reconciliation, /account\.externalReference !== externalReference/);
  assert.match(reconciliation, /amountCents !== plan\.priceCents/);
  assert.match(reconciliation, /currency !== "BRL"/);
  assert.match(reconciliation, /payment\.payment_method_id !== "pix"/);
  assert.match(reconciliation, /status === "approved"/);
  assert.match(reconciliation, /alreadyCredited/);
  assert.match(reconciliation, /status: "active", checkoutUrl: null/);
  assert.match(reconciliation, /ensureFiscalIssuance/);
  assert.match(reconciliation, /providerSummaryJson: JSON\.stringify\(\{ paymentId, status, statusDetail, paymentMethod: "pix" \}\)/);
  assert.match(cardRoute, /status: "cancelled", statusDetail: "replaced_by_card"/);
  assert.match(cardRoute, /PIX_CHECKOUT_CANCELLATION/);
});

test("interface distingue Pix mensal de assinatura automática e não expõe chave do recebedor", async () => {
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
  assert.match(page, /Pix não renova sozinho/);
  assert.match(worker, /pathname === "\/api\/billing\/pix"/);
  assert.match(webhook, /eventType === "payment"/);
  assert.doesNotMatch(client, /\+55\d{11}|pixKey/);
});

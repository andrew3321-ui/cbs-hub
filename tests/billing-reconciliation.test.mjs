import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  BILLING_FAST_RECONCILIATION_INTERVAL_MS,
  BILLING_STABLE_RECONCILIATION_INTERVAL_MS,
  scheduledBillingAction,
} from "../domain/billing-reconciliation-policy.ts";

const now = Date.parse("2026-07-26T22:00:00.000Z");
const account = {
  status: "pending",
  providerSubscriptionId: null,
  nextPaymentAt: null,
  lastSyncedAt: null,
};

test("unstable card states are reconciled frequently and canceled contracts are ignored", () => {
  for (const status of ["pending", "paused", "overdue", "payment_failed"]) {
    assert.equal(scheduledBillingAction({ ...account, status, providerSubscriptionId: "subscription-1" }, now), "card_provider");
  }
  assert.equal(scheduledBillingAction({
    ...account,
    status: "pending",
    providerSubscriptionId: "subscription-1",
    lastSyncedAt: new Date(now - BILLING_FAST_RECONCILIATION_INTERVAL_MS + 1).toISOString(),
  }, now), "none");
  assert.equal(scheduledBillingAction({ ...account, status: "canceled", providerSubscriptionId: "subscription-1" }, now), "none");
});

test("active card contracts use the stable interval", () => {
  assert.equal(scheduledBillingAction({
    ...account,
    status: "active",
    providerSubscriptionId: "subscription-1",
    lastSyncedAt: new Date(now - BILLING_STABLE_RECONCILIATION_INTERVAL_MS).toISOString(),
  }, now), "card_provider");
  assert.equal(scheduledBillingAction({
    ...account,
    status: "active",
    providerSubscriptionId: "subscription-1",
    lastSyncedAt: new Date(now - BILLING_STABLE_RECONCILIATION_INTERVAL_MS + 1).toISOString(),
  }, now), "none");
});

test("pending Pix is queried officially and expired Pix access becomes overdue", () => {
  assert.equal(scheduledBillingAction(account, now), "pix_provider");
  assert.equal(scheduledBillingAction({
    ...account,
    status: "renewal_pending",
    lastSyncedAt: new Date(now - BILLING_FAST_RECONCILIATION_INTERVAL_MS).toISOString(),
  }, now), "pix_provider");
  assert.equal(scheduledBillingAction({
    ...account,
    status: "active",
    nextPaymentAt: new Date(now).toISOString(),
  }, now), "expire_pix");
  assert.equal(scheduledBillingAction({
    ...account,
    status: "active",
    nextPaymentAt: new Date(now + 1).toISOString(),
  }, now), "none");
  assert.equal(scheduledBillingAction({ ...account, status: "overdue" }, now), "none");
});

test("the Worker schedules official reconciliation without making the webhook mandatory", () => {
  const worker = fs.readFileSync(new URL("../worker/index.ts", import.meta.url), "utf8");
  const wrangler = fs.readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8");
  const job = fs.readFileSync(new URL("../app/billing-scheduled-reconciliation.ts", import.meta.url), "utf8");
  const card = fs.readFileSync(new URL("../app/billing-reconciliation.ts", import.meta.url), "utf8");
  const pix = fs.readFileSync(new URL("../app/billing-pix.ts", import.meta.url), "utf8");

  assert.match(wrangler, /"\*\/5 \* \* \* \*"/);
  assert.match(worker, /runScheduledBillingReconciliation\(controller\.scheduledTime\)/);
  assert.match(job, /syncBillingAccountFromProvider\(account\)/);
  assert.match(job, /syncPixBillingAccount\(account\)/);
  assert.match(job, /status: "overdue"/);
  assert.match(card, /\/preapproval\/\$\{encodeURIComponent\(dataId\)\}/);
  assert.match(card, /\/authorized_payments\/\$\{encodeURIComponent\(dataId\)\}/);
  assert.match(pix, /reconcilePixTransactionFromProvider/);
});

test("terms disclose renewal, cancellation and mandatory legal exceptions", () => {
  const terms = fs.readFileSync(new URL("../app/termos/page.tsx", import.meta.url), "utf8");
  assert.match(terms, /Não oferecemos reembolso comercial voluntário/);
  assert.match(terms, /direitos legais indisponíveis/);
  assert.match(terms, /artigo 49 do Código de Defesa do Consumidor/);
  assert.match(terms, /O teste gratuito não elimina direitos previstos em lei/);
});

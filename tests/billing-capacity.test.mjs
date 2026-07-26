import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  BILLING_ADDON_COMPANY_BLOCK_PRICE_CENTS,
  BILLING_ADDON_COMPANY_BLOCK_SIZE,
  BILLING_BASE_COMPANY_LIMIT,
  billingAmountCents,
  billingCompanyLimit,
  billingPlans,
  normalizeCompanyAddonBlocks,
} from "../domain/billing-plans.ts";

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");

test("single plan prices capacity deterministically on the server", () => {
  assert.equal(BILLING_BASE_COMPANY_LIMIT, 30);
  assert.equal(BILLING_ADDON_COMPANY_BLOCK_SIZE, 10);
  assert.equal(BILLING_ADDON_COMPANY_BLOCK_PRICE_CENTS, 10_000);
  assert.equal(billingPlans.unico.priceCents, 45_000);
  assert.equal(billingPlans.unico.purchasable, true);
  assert.equal(billingCompanyLimit("unico", 0), 30);
  assert.equal(billingCompanyLimit("unico", 1), 40);
  assert.equal(billingCompanyLimit("unico", 7), 100);
  assert.equal(billingAmountCents("unico", 0), 45_000);
  assert.equal(billingAmountCents("unico", 1), 55_000);
  assert.equal(billingAmountCents("unico", 7), 115_000);
  assert.equal(normalizeCompanyAddonBlocks(-1), null);
  assert.equal(normalizeCompanyAddonBlocks(1.5), null);
});

test("legacy test subscriptions remain reconcilable but cannot be newly purchased", () => {
  assert.equal(billingPlans.pro.priceCents, 100);
  assert.equal(billingPlans.escritorio.priceCents, 100);
  assert.equal(billingPlans.pro.purchasable, false);
  assert.equal(billingPlans.escritorio.purchasable, false);
  assert.equal(billingAmountCents("pro", 9), 100);
  assert.equal(billingCompanyLimit("escritorio", 9), 50);
});

test("checkout and Pix derive amount and capacity from validated add-on blocks", () => {
  const checkout = read("../app/api/billing/checkout/route.ts");
  const pix = read("../app/api/billing/pix/route.ts");
  for (const source of [checkout, pix]) {
    assert.match(source, /workspace\.role !== "owner"/);
    assert.match(source, /isPurchasablePlanKey/);
    assert.match(source, /normalizeCompanyAddonBlocks\(payload\.addonBlocks\)/);
    assert.match(source, /billingAmountCents\(plan\.key, addonBlocks\)/);
    assert.match(source, /pendingCompanyAddonBlocks/);
  }
});

test("billing state follows the workspace owner and members cannot mutate the contract", () => {
  const billingRoute = read("../app/api/billing/route.ts");
  const cancelRoute = read("../app/api/billing/cancel/route.ts");
  assert.match(billingRoute, /billingOwnerUserId = workspace\?\.ownerUserId/);
  assert.match(billingRoute, /canManageBilling: workspace\?\.role === "owner"/);
  assert.match(cancelRoute, /workspace\.role !== "owner"/);
});

test("capacity changes protect ownership, usage, beta and provider confirmation", () => {
  const capacity = read("../app/api/billing/capacity/route.ts");
  assert.match(capacity, /workspace\.role !== "owner"/);
  assert.match(capacity, /entitlements\.companyCount > targetLimit/);
  assert.match(capacity, /CAPACITY_BELOW_USAGE/);
  assert.match(capacity, /if \(!operation\.paymentsEnabled\)/);
  assert.match(capacity, /method: "PUT"/);
  assert.match(capacity, /transaction_amount: amountCents \/ 100/);
  assert.match(capacity, /providerAmountCents !== amountCents/);
  assert.match(capacity, /billing\.capacity_changed/);
});

test("administrator can audit contracted capacity and dynamic monthly revenue", () => {
  const adminApi = read("../app/api/admin/billing/route.ts");
  const center = read("../app/app/BillingCenter.tsx");
  assert.match(adminApi, /billingLimitForAccount/);
  assert.match(adminApi, /monthlyAmountCents: billingAmountForAccount/);
  assert.match(center, /CONTRATOS E CAPACIDADE/);
  assert.match(center, /bloco\(s\) adicional\(is\)/);
});

test("database migration persists active and pending capacity without rebuilding customer tables", () => {
  const migration = read("../drizzle/0023_magical_omega_sentinel.sql");
  assert.match(migration, /ADD `company_addon_blocks`/);
  assert.match(migration, /ADD `pending_company_addon_blocks`/);
  assert.match(migration, /SET `suggested_plan_key` = 'unico'/);
  assert.doesNotMatch(migration, /DROP TABLE/);
});

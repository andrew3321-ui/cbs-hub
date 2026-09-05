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

test("legacy capacity contract remains deterministic and cannot be sold again", () => {
  assert.equal(BILLING_BASE_COMPANY_LIMIT, 30);
  assert.equal(BILLING_ADDON_COMPANY_BLOCK_SIZE, 10);
  assert.equal(BILLING_ADDON_COMPANY_BLOCK_PRICE_CENTS, 10_000);
  assert.equal(billingPlans.unico.priceCents, 45_000);
  assert.equal(billingPlans.unico.purchasable, false);
  assert.equal(billingCompanyLimit("unico", 0), 30);
  assert.equal(billingCompanyLimit("unico", 1), 40);
  assert.equal(billingCompanyLimit("unico", 7), 100);
  assert.equal(billingAmountCents("unico", 0), 45_000);
  assert.equal(billingAmountCents("unico", 1), 55_000);
  assert.equal(billingAmountCents("unico", 7), 115_000);
  assert.equal(normalizeCompanyAddonBlocks(-1), null);
  assert.equal(normalizeCompanyAddonBlocks(1.5), null);
});

test("all former accounting offers are retained only for reconciliation", () => {
  assert.equal(billingPlans.pro.priceCents, 5_900);
  assert.equal(billingPlans.escritorio.priceCents, 14_900);
  assert.equal(billingPlans.pro.purchasable, false);
  assert.equal(billingPlans.escritorio.purchasable, false);
  assert.equal(billingAmountCents("pro", 9), 5_900);
  assert.equal(billingCompanyLimit("pro", 9), 10);
  assert.equal(billingCompanyLimit("escritorio", 9), 50);
});

test("checkout and Pix reject plans that are unavailable for new sales", () => {
  const checkout = read("../app/api/billing/checkout/route.ts");
  const pix = read("../app/api/billing/pix/route.ts");
  for (const source of [checkout, pix]) {
    assert.match(source, /workspace\.role !== "owner"/);
    assert.match(source, /isPurchasablePlanKey/);
    assert.match(source, /requestedAddonBlocks = normalizeCompanyAddonBlocks\(payload\.addonBlocks\)/);
    assert.match(source, /plan\.capacityAddonsEnabled \? requestedAddonBlocks : 0/);
    assert.match(source, /billingAmountCents\(plan\.key, addonBlocks\)/);
    assert.match(source, /pendingCompanyAddonBlocks/);
    assert.match(source, /workspace\.type === "office" && plan\.key !== "escritorio"/);
  }
});

test("billing state follows the workspace owner and members cannot mutate the contract", () => {
  const billingRoute = read("../app/api/billing/route.ts");
  const cancelRoute = read("../app/api/billing/cancel/route.ts");
  assert.match(billingRoute, /billingOwnerUserId = workspace\?\.ownerUserId/);
  assert.match(billingRoute, /canManageBilling: workspace\?\.role === "owner"/);
  assert.match(cancelRoute, /workspace\.role !== "owner"/);
});

test("administrator can audit contracted capacity and dynamic monthly revenue", () => {
  const adminApi = read("../app/api/admin/billing/route.ts");
  assert.match(adminApi, /billingLimitForAccount/);
  assert.match(adminApi, /monthlyAmountCents: billingAmountForAccount/);
});

test("database migration persists active and pending capacity without rebuilding customer tables", () => {
  const migration = read("../drizzle/0023_magical_omega_sentinel.sql");
  assert.match(migration, /ADD `company_addon_blocks`/);
  assert.match(migration, /ADD `pending_company_addon_blocks`/);
  assert.match(migration, /SET `suggested_plan_key` = 'unico'/);
  assert.doesNotMatch(migration, /DROP TABLE/);
});

import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { applyPlanUsage, planDefinitions, resolveEffectivePlan } from "../domain/plan-entitlements.ts";

const now = Date.parse("2026-07-18T12:00:00.000Z");

test("the free, Pro and Office plans expose distinct enforceable benefits", () => {
  assert.equal(planDefinitions.beta.companyLimit, 1);
  assert.equal(planDefinitions.beta.officeCollaborationEnabled, false);
  assert.equal(planDefinitions.pro.companyLimit, 10);
  assert.equal(planDefinitions.pro.officeCollaborationEnabled, false);
  assert.equal(planDefinitions.escritorio.companyLimit, 50);
  assert.equal(planDefinitions.escritorio.officeCollaborationEnabled, true);
});

test("only a reconciled active subscription grants a paid plan", () => {
  assert.equal(resolveEffectivePlan({ planKey: "pro", status: "active", providerSubscriptionId: "subscription-1", nextPaymentAt: null }, now).key, "pro");
  assert.equal(resolveEffectivePlan({ planKey: "escritorio", status: "active", providerSubscriptionId: null, nextPaymentAt: "2026-08-18T12:00:00.000Z" }, now).key, "escritorio");
  assert.equal(resolveEffectivePlan({ planKey: "pro", status: "renewal_pending", providerSubscriptionId: null, nextPaymentAt: "2026-07-25T12:00:00.000Z" }, now).key, "pro");
  assert.equal(resolveEffectivePlan({ planKey: "pro", status: "pending", providerSubscriptionId: "subscription-1", nextPaymentAt: null }, now).key, "beta");
  assert.equal(resolveEffectivePlan({ planKey: "pro", status: "active", providerSubscriptionId: null, nextPaymentAt: "2026-07-18T11:59:59.000Z" }, now).key, "beta");
});

test("usage reaches and exceeds a plan without deleting existing companies", () => {
  const atLimit = applyPlanUsage(planDefinitions.pro, { planKey: "pro", status: "active", providerSubscriptionId: "subscription-1", nextPaymentAt: null }, 10);
  assert.equal(atLimit.companyRemaining, 0);
  assert.equal(atLimit.companyLimitReached, true);
  assert.equal(atLimit.companyLimitExceeded, false);
  assert.equal(atLimit.canCreateCompany, false);

  const overLimit = applyPlanUsage(planDefinitions.pro, { planKey: "pro", status: "active", providerSubscriptionId: "subscription-1", nextPaymentAt: null }, 12);
  assert.equal(overLimit.companyCount, 12);
  assert.equal(overLimit.companyLimitExceeded, true);
  assert.equal(overLimit.canCreateCompany, false);
});

test("company creation and office collaboration are protected on the server", () => {
  const companiesRoute = fs.readFileSync(new URL("../app/api/companies/route.ts", import.meta.url), "utf8");
  const membersRoute = fs.readFileSync(new URL("../app/api/office/members/route.ts", import.meta.url), "utf8");
  const reviewRoute = fs.readFileSync(new URL("../app/api/scenarios/review/route.ts", import.meta.url), "utf8");
  const registrationRoute = fs.readFileSync(new URL("../app/api/auth/register/route.ts", import.meta.url), "utf8");
  assert.match(companiesRoute, /WHERE \(SELECT COUNT\(\*\) FROM companies WHERE workspace_id = \?\) < \?/);
  assert.match(companiesRoute, /PLAN_COMPANY_LIMIT|companyLimitResponse/);
  assert.match(membersRoute, /officePlanRequiredResponse/);
  assert.match(reviewRoute, /officePlanRequiredResponse/);
  assert.match(registrationRoute, /officePlanRequiredResponse/);
});

test("the application displays the active plan, usage and limit state", () => {
  const app = fs.readFileSync(new URL("../app/app/MargemApp.tsx", import.meta.url), "utf8");
  const pricing = fs.readFileSync(new URL("../app/planos/PricingClient.tsx", import.meta.url), "utf8");
  assert.match(app, /plan-usage-banner/);
  assert.match(app, /Plano \{entitlements\.name\}/);
  assert.match(app, /Limite do plano atingido/);
  assert.match(pricing, /Até 1 empresa monitorada/);
});

import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { applyPlanUsage, planDefinitions, resolveEffectivePlan, resolveWorkspacePlan } from "../domain/plan-entitlements.ts";

const now = Date.parse("2026-07-18T12:00:00.000Z");

test("the free entry and single paid plan expose enforceable benefits", () => {
  assert.equal(planDefinitions.beta.companyLimit, 1);
  assert.equal(planDefinitions.beta.fiscalIntelligenceEnabled, false);
  assert.equal(planDefinitions.beta.taxDeterminationEnabled, false);
  assert.equal(planDefinitions.beta.officeCollaborationEnabled, false);
  assert.equal(planDefinitions.unico.companyLimit, 30);
  assert.equal(planDefinitions.unico.fiscalIntelligenceEnabled, true);
  assert.equal(planDefinitions.unico.taxDeterminationEnabled, true);
  assert.equal(planDefinitions.unico.officeCollaborationEnabled, true);
  assert.equal(planDefinitions.trial.companyLimit, 10);
  assert.equal(planDefinitions.trial.fiscalIntelligenceEnabled, true);
  assert.equal(planDefinitions.trial.officeCollaborationEnabled, true);
});

test("the platform owner and global beta bypass every package restriction", () => {
  const inactiveBilling = { planKey: "beta", status: "beta", providerSubscriptionId: null, nextPaymentAt: null };
  const owner = resolveWorkspacePlan({ platformOwner: true, betaEnabled: false, billing: inactiveBilling }, now);
  const globalBeta = resolveWorkspacePlan({ platformOwner: false, betaEnabled: true, billing: inactiveBilling }, now);
  assert.equal(owner.key, "owner");
  assert.equal(owner.companyLimit, null);
  assert.equal(owner.officeCollaborationEnabled, true);
  assert.equal(owner.taxDeterminationEnabled, true);
  assert.equal(globalBeta.key, "global_beta");
  assert.equal(globalBeta.companyLimit, null);
  assert.equal(globalBeta.fiscalIntelligenceEnabled, true);
  assert.equal(globalBeta.officeCollaborationEnabled, true);

  const unlimited = applyPlanUsage(owner, inactiveBilling, 999);
  assert.equal(unlimited.companyRemaining, null);
  assert.equal(unlimited.companyLimitReached, false);
  assert.equal(unlimited.canCreateCompany, true);
});

test("only a reconciled active subscription grants a paid plan", () => {
  assert.equal(resolveEffectivePlan({ planKey: "unico", status: "active", providerSubscriptionId: "subscription-new", nextPaymentAt: null }, now).key, "unico");
  assert.equal(resolveEffectivePlan({ planKey: "pro", status: "active", providerSubscriptionId: "subscription-1", nextPaymentAt: null }, now).key, "pro");
  assert.equal(resolveEffectivePlan({ planKey: "escritorio", status: "active", providerSubscriptionId: null, nextPaymentAt: "2026-08-18T12:00:00.000Z" }, now).key, "escritorio");
  assert.equal(resolveEffectivePlan({ planKey: "pro", status: "renewal_pending", providerSubscriptionId: null, nextPaymentAt: "2026-07-25T12:00:00.000Z" }, now).key, "pro");
  assert.equal(resolveEffectivePlan({ planKey: "pro", status: "pending", providerSubscriptionId: "subscription-1", nextPaymentAt: null }, now).key, "beta");
  assert.equal(resolveEffectivePlan({ planKey: "pro", status: "active", providerSubscriptionId: null, nextPaymentAt: "2026-07-18T11:59:59.000Z" }, now).key, "beta");
});

test("usage reaches and exceeds a plan without deleting existing companies", () => {
  const paidSnapshot = { planKey: "unico", status: "active", providerSubscriptionId: "subscription-1", nextPaymentAt: null, companyAddonBlocks: 2, pendingCompanyAddonBlocks: 2 };
  const atLimit = applyPlanUsage(planDefinitions.unico, paidSnapshot, 50);
  assert.equal(atLimit.companyLimit, 50);
  assert.equal(atLimit.monthlyPriceCents, 65_000);
  assert.equal(atLimit.companyAddonBlocks, 2);
  assert.equal(atLimit.companyRemaining, 0);
  assert.equal(atLimit.companyLimitReached, true);
  assert.equal(atLimit.companyLimitExceeded, false);
  assert.equal(atLimit.canCreateCompany, false);

  const overLimit = applyPlanUsage(planDefinitions.unico, paidSnapshot, 52);
  assert.equal(overLimit.companyCount, 52);
  assert.equal(overLimit.companyLimitExceeded, true);
  assert.equal(overLimit.canCreateCompany, false);
});

test("company creation and office collaboration are protected on the server", () => {
  const companiesRoute = fs.readFileSync(new URL("../app/api/companies/route.ts", import.meta.url), "utf8");
  const membersRoute = fs.readFileSync(new URL("../app/api/office/members/route.ts", import.meta.url), "utf8");
  const reviewRoute = fs.readFileSync(new URL("../app/api/scenarios/review/route.ts", import.meta.url), "utf8");
  const registrationRoute = fs.readFileSync(new URL("../app/api/auth/register/route.ts", import.meta.url), "utf8");
  assert.match(companiesRoute, /WHERE \? IS NULL OR \(SELECT COUNT\(\*\) FROM companies WHERE workspace_id = \?\) < \?/);
  assert.match(companiesRoute, /PLAN_COMPANY_LIMIT|companyLimitResponse/);
  assert.match(membersRoute, /officePlanRequiredResponse/);
  assert.match(reviewRoute, /officePlanRequiredResponse/);
  assert.match(registrationRoute, /officePlanRequiredResponse/);
});

test("advanced fiscal modules are protected by the same server-side entitlement matrix", () => {
  const routes = [
    ["fiscal-intelligence", "fiscalIntelligenceEnabled"],
    ["deterministic-tax-lab", "taxLabEnabled"],
    ["national-coverage", "nationalCoverageEnabled"],
    ["fiscal-expansion", "fiscalExpansionEnabled"],
    ["fiscal-rules", "fiscalRulesEnabled"],
    ["tax-determination", "taxDeterminationEnabled"],
    ["fiscal-imports", "batchImportEnabled"],
    ["rule-governance", "professionalGovernanceEnabled"],
  ];
  for (const [route, feature] of routes) {
    const source = fs.readFileSync(new URL(`../app/api/${route}/route.ts`, import.meta.url), "utf8");
    assert.match(source, new RegExp(`withWorkspaceFeature\\(\"${feature}\"`), route);
  }
});

test("the application displays the active plan, usage and limit state", () => {
  const app = fs.readFileSync(new URL("../app/app/MargemApp.tsx", import.meta.url), "utf8");
  const pricing = fs.readFileSync(new URL("../app/planos/PricingClient.tsx", import.meta.url), "utf8");
  assert.match(app, /plan-usage-banner/);
  assert.match(app, /Plano \{entitlements\.name\}/);
  assert.match(app, /Limite do plano atingido/);
  assert.match(app, /plan-feature-locked-card/);
  assert.match(app, /sectionPlanFeatures/);
  assert.match(pricing, /Até 10 empresas durante o teste/);
  assert.match(pricing, /Inteligência e laboratório fiscal/);
  assert.match(pricing, /30 empresas incluídas/);
  assert.match(pricing, /Cada bloco adiciona/);
});

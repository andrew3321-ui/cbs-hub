import assert from "node:assert/strict";
import test from "node:test";
import { applyPlanUsage, planDefinitions, resolveEffectivePlan, resolveWorkspacePlan } from "../domain/plan-entitlements.ts";

const now = Date.parse("2026-07-18T12:00:00.000Z");
const inactiveBilling = { planKey: "beta", status: "beta", providerSubscriptionId: null, nextPaymentAt: null };

test("security access exposes domain limits and defensive features", () => {
  assert.equal(planDefinitions.beta.scopeLimit, 1);
  assert.equal(planDefinitions.beta.securityAgentEnabled, true);
  assert.equal(planDefinitions.beta.scheduledMonitoringEnabled, false);
  assert.equal(planDefinitions.trial.scopeLimit, 3);
  assert.equal(planDefinitions.trial.scheduledMonitoringEnabled, true);
  assert.equal(planDefinitions.pro.scopeLimit, 3);
  assert.equal(planDefinitions.pro.officeCollaborationEnabled, false);
  assert.equal(planDefinitions.escritorio.scopeLimit, 15);
  assert.equal(planDefinitions.escritorio.officeCollaborationEnabled, true);
});

test("platform owner and global beta bypass scope restrictions", () => {
  const owner = resolveWorkspacePlan({ platformOwner: true, betaEnabled: false, billing: inactiveBilling }, now);
  const globalBeta = resolveWorkspacePlan({ platformOwner: false, betaEnabled: true, billing: inactiveBilling }, now);
  assert.equal(owner.scopeLimit, null);
  assert.equal(globalBeta.scopeLimit, null);
  const unlimited = applyPlanUsage(owner, inactiveBilling, 999);
  assert.equal(unlimited.scopeRemaining, null);
  assert.equal(unlimited.scopeLimitReached, false);
  assert.equal(unlimited.canCreateScope, true);
});

test("only a reconciled active historical contract grants its mapped access", () => {
  assert.equal(resolveEffectivePlan({ planKey: "pro", status: "active", providerSubscriptionId: "subscription-1", nextPaymentAt: null }, now).key, "pro");
  assert.equal(resolveEffectivePlan({ planKey: "escritorio", status: "active", providerSubscriptionId: null, nextPaymentAt: "2026-08-18T12:00:00.000Z" }, now).key, "escritorio");
  for (const status of ["pending", "overdue", "paused", "canceled", "payment_failed"]) {
    assert.equal(resolveEffectivePlan({ planKey: "pro", status, providerSubscriptionId: "subscription-1", nextPaymentAt: null }, now).key, "beta", status);
  }
});

test("scope usage blocks new authorization without deleting existing evidence", () => {
  const atLimit = applyPlanUsage(planDefinitions.escritorio, inactiveBilling, 15);
  assert.equal(atLimit.scopeRemaining, 0);
  assert.equal(atLimit.scopeLimitReached, true);
  assert.equal(atLimit.scopeLimitExceeded, false);
  assert.equal(atLimit.canCreateScope, false);
  const overLimit = applyPlanUsage(planDefinitions.escritorio, inactiveBilling, 16);
  assert.equal(overLimit.scopeCount, 16);
  assert.equal(overLimit.scopeLimitExceeded, true);
});

test("controlled launch blocks unpaid workspaces but preserves owner and active contract access", () => {
  const trial = applyPlanUsage(planDefinitions.trial, inactiveBilling, 0, { startedAt: "2026-07-18T10:00:00.000Z", endsAt: "2026-07-23T10:00:00.000Z", status: "active" }, now, true);
  assert.equal(trial.workspaceAccessAllowed, false);
  assert.equal(trial.workspaceAccessReason, "controlled_opening");

  const owner = applyPlanUsage(planDefinitions.owner, inactiveBilling, 0, null, now, true);
  assert.equal(owner.workspaceAccessAllowed, true);
  assert.equal(owner.workspaceAccessReason, "platform_owner");

  const paidBilling = { planKey: "pro", status: "active", providerSubscriptionId: "subscription-1", nextPaymentAt: null };
  const paid = applyPlanUsage(planDefinitions.pro, paidBilling, 1, null, now, true);
  assert.equal(paid.workspaceAccessAllowed, true);
  assert.equal(paid.workspaceAccessReason, "active_contract");

  const open = applyPlanUsage(planDefinitions.beta, inactiveBilling, 0);
  assert.equal(open.workspaceAccessAllowed, true);
  assert.equal(open.workspaceAccessReason, "open");
});

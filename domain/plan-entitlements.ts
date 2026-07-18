import { billingPlans, type PaidPlanKey } from "./billing-plans.ts";

export type EffectivePlanKey = "beta" | PaidPlanKey;

export type BillingAccessSnapshot = {
  planKey: string;
  status: string;
  providerSubscriptionId: string | null;
  nextPaymentAt: string | null;
} | null;

export type PlanDefinition = {
  key: EffectivePlanKey;
  name: string;
  companyLimit: number;
  officeCollaborationEnabled: boolean;
  prioritySupport: boolean;
};

export type WorkspaceEntitlements = PlanDefinition & {
  billingStatus: string;
  requestedPlanKey: string | null;
  companyCount: number;
  companyRemaining: number;
  companyLimitReached: boolean;
  companyLimitExceeded: boolean;
  canCreateCompany: boolean;
};

export const planDefinitions: Record<EffectivePlanKey, PlanDefinition> = {
  beta: {
    key: "beta",
    name: "Gratuito",
    companyLimit: 1,
    officeCollaborationEnabled: false,
    prioritySupport: false,
  },
  pro: {
    key: "pro",
    name: billingPlans.pro.name,
    companyLimit: billingPlans.pro.companyLimit,
    officeCollaborationEnabled: false,
    prioritySupport: true,
  },
  escritorio: {
    key: "escritorio",
    name: billingPlans.escritorio.name,
    companyLimit: billingPlans.escritorio.companyLimit,
    officeCollaborationEnabled: true,
    prioritySupport: true,
  },
};

export function billingAccessIsActive(snapshot: BillingAccessSnapshot, now = Date.now()) {
  if (!snapshot) return false;
  if (snapshot.providerSubscriptionId) return snapshot.status === "active";
  if (!["active", "renewal_pending"].includes(snapshot.status)) return false;
  if (!snapshot.nextPaymentAt) return false;
  const paidUntil = Date.parse(snapshot.nextPaymentAt);
  return Number.isFinite(paidUntil) && paidUntil > now;
}

export function resolveEffectivePlan(snapshot: BillingAccessSnapshot, now = Date.now()) {
  if (billingAccessIsActive(snapshot, now) && snapshot && (snapshot.planKey === "pro" || snapshot.planKey === "escritorio")) {
    return planDefinitions[snapshot.planKey];
  }
  return planDefinitions.beta;
}

export function applyPlanUsage(plan: PlanDefinition, snapshot: BillingAccessSnapshot, companyCount: number): WorkspaceEntitlements {
  const safeCount = Number.isInteger(companyCount) && companyCount > 0 ? companyCount : 0;
  const companyRemaining = Math.max(0, plan.companyLimit - safeCount);
  return {
    ...plan,
    billingStatus: snapshot?.status ?? "beta",
    requestedPlanKey: snapshot?.planKey ?? null,
    companyCount: safeCount,
    companyRemaining,
    companyLimitReached: safeCount >= plan.companyLimit,
    companyLimitExceeded: safeCount > plan.companyLimit,
    canCreateCompany: safeCount < plan.companyLimit,
  };
}

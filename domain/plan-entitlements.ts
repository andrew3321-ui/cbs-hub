import { billingAmountCents, billingPlans, type PaidPlanKey } from "./billing-plans.ts";
import { TRIAL_SCOPE_LIMIT, trialAccessIsActive, trialDaysRemaining, type TrialAccessSnapshot } from "./trial.ts";

export type EffectivePlanKey = "owner" | "global_beta" | "trial" | "beta" | PaidPlanKey;
export type EntitlementAccessMode = "platform_owner" | "beta_full" | "trial_full" | "plan";

export type BillingAccessSnapshot = {
  planKey: string;
  status: string;
  providerSubscriptionId: string | null;
  nextPaymentAt: string | null;
  companyAddonBlocks?: number | null;
  pendingCompanyAddonBlocks?: number | null;
} | null;

export type PlanFeatureKey = "securityAgentEnabled" | "scheduledMonitoringEnabled" | "aiAssessmentEnabled" | "evidenceHistoryEnabled" | "officeCollaborationEnabled";

export type PlanDefinition = {
  key: EffectivePlanKey;
  name: string;
  accessMode: EntitlementAccessMode;
  scopeLimit: number | null;
  securityAgentEnabled: boolean;
  scheduledMonitoringEnabled: boolean;
  aiAssessmentEnabled: boolean;
  evidenceHistoryEnabled: boolean;
  officeCollaborationEnabled: boolean;
  workspaceMemberLimit: number | null;
  prioritySupport: boolean;
};

export type WorkspaceEntitlements = PlanDefinition & {
  billingStatus: string;
  requestedPlanKey: string | null;
  scopeCount: number;
  monthlyPriceCents: number | null;
  scopeRemaining: number | null;
  scopeLimitReached: boolean;
  scopeLimitExceeded: boolean;
  canCreateScope: boolean;
  trialActive: boolean;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  trialDaysRemaining: number;
};

const fullSecurity = {
  securityAgentEnabled: true,
  scheduledMonitoringEnabled: true,
  aiAssessmentEnabled: true,
  evidenceHistoryEnabled: true,
};

export const planDefinitions: Record<EffectivePlanKey, PlanDefinition> = {
  owner: { key: "owner", name: "Proprietário", accessMode: "platform_owner", scopeLimit: null, ...fullSecurity, officeCollaborationEnabled: true, workspaceMemberLimit: null, prioritySupport: true },
  global_beta: { key: "global_beta", name: "Beta integral", accessMode: "beta_full", scopeLimit: null, ...fullSecurity, officeCollaborationEnabled: true, workspaceMemberLimit: null, prioritySupport: true },
  trial: { key: "trial", name: "Avaliação de segurança", accessMode: "trial_full", scopeLimit: TRIAL_SCOPE_LIMIT, ...fullSecurity, officeCollaborationEnabled: true, workspaceMemberLimit: null, prioritySupport: false },
  beta: { key: "beta", name: "Gratuito", accessMode: "plan", scopeLimit: 1, securityAgentEnabled: true, scheduledMonitoringEnabled: false, aiAssessmentEnabled: false, evidenceHistoryEnabled: true, officeCollaborationEnabled: false, workspaceMemberLimit: 1, prioritySupport: false },
  unico: { key: "unico", name: billingPlans.unico.name, accessMode: "plan", scopeLimit: 15, ...fullSecurity, officeCollaborationEnabled: true, workspaceMemberLimit: null, prioritySupport: true },
  pro: { key: "pro", name: billingPlans.pro.name, accessMode: "plan", scopeLimit: 3, ...fullSecurity, officeCollaborationEnabled: false, workspaceMemberLimit: 1, prioritySupport: true },
  escritorio: { key: "escritorio", name: billingPlans.escritorio.name, accessMode: "plan", scopeLimit: 15, ...fullSecurity, officeCollaborationEnabled: true, workspaceMemberLimit: null, prioritySupport: true },
};

export function billingAccessIsActive(snapshot: BillingAccessSnapshot, now = Date.now()) {
  if (!snapshot) return false;
  if (snapshot.providerSubscriptionId) return snapshot.status === "active";
  if (!["active", "renewal_pending"].includes(snapshot.status) || !snapshot.nextPaymentAt) return false;
  const paidUntil = Date.parse(snapshot.nextPaymentAt);
  return Number.isFinite(paidUntil) && paidUntil > now;
}

export function resolveEffectivePlan(snapshot: BillingAccessSnapshot, now = Date.now()) {
  if (billingAccessIsActive(snapshot, now) && snapshot && snapshot.planKey in billingPlans) return planDefinitions[snapshot.planKey as PaidPlanKey];
  return planDefinitions.beta;
}

export function resolveWorkspacePlan(input: { platformOwner: boolean; betaEnabled: boolean; billing: BillingAccessSnapshot; trial?: TrialAccessSnapshot }, now = Date.now()) {
  if (input.platformOwner) return planDefinitions.owner;
  const paidPlan = resolveEffectivePlan(input.billing, now);
  if (paidPlan.key !== "beta") return paidPlan;
  if (trialAccessIsActive(input.trial ?? null, now)) return planDefinitions.trial;
  if (input.trial) return planDefinitions.beta;
  if (input.betaEnabled) return planDefinitions.global_beta;
  return planDefinitions.beta;
}

export function applyPlanUsage(plan: PlanDefinition, snapshot: BillingAccessSnapshot, scopeCount: number, trial: TrialAccessSnapshot = null, now = Date.now()): WorkspaceEntitlements {
  const safeCount = Number.isInteger(scopeCount) && scopeCount > 0 ? scopeCount : 0;
  const limit = plan.scopeLimit;
  const monthlyPriceCents = plan.key in billingPlans ? billingAmountCents(plan.key as PaidPlanKey) : plan.key === "beta" ? 0 : null;
  return {
    ...plan,
    billingStatus: snapshot?.status ?? "beta",
    requestedPlanKey: snapshot?.planKey ?? null,
    scopeCount: safeCount,
    monthlyPriceCents,
    scopeRemaining: limit === null ? null : Math.max(0, limit - safeCount),
    scopeLimitReached: limit === null ? false : safeCount >= limit,
    scopeLimitExceeded: limit === null ? false : safeCount > limit,
    canCreateScope: limit === null || safeCount < limit,
    trialActive: plan.key === "trial" && trialAccessIsActive(trial, now),
    trialStartedAt: trial?.startedAt ?? null,
    trialEndsAt: trial?.endsAt ?? null,
    trialDaysRemaining: plan.key === "trial" ? trialDaysRemaining(trial, now) : 0,
  };
}

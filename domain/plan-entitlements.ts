import { billingPlans, type PaidPlanKey } from "./billing-plans.ts";

export type EffectivePlanKey = "owner" | "global_beta" | "beta" | PaidPlanKey;
export type EntitlementAccessMode = "platform_owner" | "beta_full" | "plan";

export type BillingAccessSnapshot = {
  planKey: string;
  status: string;
  providerSubscriptionId: string | null;
  nextPaymentAt: string | null;
} | null;

export type PlanFeatureKey =
  | "fiscalIntelligenceEnabled"
  | "taxLabEnabled"
  | "nationalCoverageEnabled"
  | "fiscalExpansionEnabled"
  | "fiscalRulesEnabled"
  | "taxDeterminationEnabled"
  | "batchImportEnabled"
  | "professionalGovernanceEnabled"
  | "officeCollaborationEnabled";

export type PlanDefinition = {
  key: EffectivePlanKey;
  name: string;
  accessMode: EntitlementAccessMode;
  companyLimit: number | null;
  simulatorEnabled: boolean;
  scenarioComparisonEnabled: boolean;
  reportSharingEnabled: boolean;
  documentImportEnabled: boolean;
  batchImportEnabled: boolean;
  fiscalIntelligenceEnabled: boolean;
  taxLabEnabled: boolean;
  nationalCoverageEnabled: boolean;
  fiscalExpansionEnabled: boolean;
  fiscalRulesEnabled: boolean;
  taxDeterminationEnabled: boolean;
  professionalGovernanceEnabled: boolean;
  officeCollaborationEnabled: boolean;
  prioritySupport: boolean;
};

export type WorkspaceEntitlements = PlanDefinition & {
  billingStatus: string;
  requestedPlanKey: string | null;
  companyCount: number;
  companyRemaining: number | null;
  companyLimitReached: boolean;
  companyLimitExceeded: boolean;
  canCreateCompany: boolean;
};

const coreFeatures = {
  simulatorEnabled: true,
  scenarioComparisonEnabled: true,
  reportSharingEnabled: true,
  documentImportEnabled: true,
};

const advancedFiscalFeatures = {
  batchImportEnabled: true,
  fiscalIntelligenceEnabled: true,
  taxLabEnabled: true,
  nationalCoverageEnabled: true,
  fiscalExpansionEnabled: true,
  fiscalRulesEnabled: true,
  taxDeterminationEnabled: true,
  professionalGovernanceEnabled: true,
};

export const planDefinitions: Record<EffectivePlanKey, PlanDefinition> = {
  owner: {
    key: "owner",
    name: "Proprietário",
    accessMode: "platform_owner",
    companyLimit: null,
    ...coreFeatures,
    ...advancedFiscalFeatures,
    officeCollaborationEnabled: true,
    prioritySupport: true,
  },
  global_beta: {
    key: "global_beta",
    name: "Beta integral",
    accessMode: "beta_full",
    companyLimit: null,
    ...coreFeatures,
    ...advancedFiscalFeatures,
    officeCollaborationEnabled: true,
    prioritySupport: true,
  },
  beta: {
    key: "beta",
    name: "Gratuito",
    accessMode: "plan",
    companyLimit: 1,
    ...coreFeatures,
    batchImportEnabled: false,
    fiscalIntelligenceEnabled: false,
    taxLabEnabled: false,
    nationalCoverageEnabled: false,
    fiscalExpansionEnabled: false,
    fiscalRulesEnabled: false,
    taxDeterminationEnabled: false,
    professionalGovernanceEnabled: false,
    officeCollaborationEnabled: false,
    prioritySupport: false,
  },
  pro: {
    key: "pro",
    name: billingPlans.pro.name,
    accessMode: "plan",
    companyLimit: billingPlans.pro.companyLimit,
    ...coreFeatures,
    ...advancedFiscalFeatures,
    officeCollaborationEnabled: false,
    prioritySupport: true,
  },
  escritorio: {
    key: "escritorio",
    name: billingPlans.escritorio.name,
    accessMode: "plan",
    companyLimit: billingPlans.escritorio.companyLimit,
    ...coreFeatures,
    ...advancedFiscalFeatures,
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

export function resolveWorkspacePlan(input: { platformOwner: boolean; betaEnabled: boolean; billing: BillingAccessSnapshot }, now = Date.now()) {
  if (input.platformOwner) return planDefinitions.owner;
  if (input.betaEnabled) return planDefinitions.global_beta;
  return resolveEffectivePlan(input.billing, now);
}

export function applyPlanUsage(plan: PlanDefinition, snapshot: BillingAccessSnapshot, companyCount: number): WorkspaceEntitlements {
  const safeCount = Number.isInteger(companyCount) && companyCount > 0 ? companyCount : 0;
  const limit = plan.companyLimit;
  const companyRemaining = limit === null ? null : Math.max(0, limit - safeCount);
  return {
    ...plan,
    billingStatus: snapshot?.status ?? "beta",
    requestedPlanKey: snapshot?.planKey ?? null,
    companyCount: safeCount,
    companyRemaining,
    companyLimitReached: limit === null ? false : safeCount >= limit,
    companyLimitExceeded: limit === null ? false : safeCount > limit,
    canCreateCompany: limit === null || safeCount < limit,
  };
}

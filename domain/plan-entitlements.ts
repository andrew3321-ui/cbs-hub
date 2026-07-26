import {
  BILLING_ADDON_COMPANY_BLOCK_PRICE_CENTS,
  BILLING_ADDON_COMPANY_BLOCK_SIZE,
  billingAmountCents,
  billingCompanyLimit,
  billingPlans,
  normalizeCompanyAddonBlocks,
  type PaidPlanKey,
} from "./billing-plans.ts";
import { TRIAL_COMPANY_LIMIT, trialAccessIsActive, trialDaysRemaining, type TrialAccessSnapshot } from "./trial.ts";

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
  companyAddonBlocks: number;
  pendingCompanyAddonBlocks: number;
  companyAddonBlockSize: number;
  companyAddonPriceCents: number;
  monthlyPriceCents: number | null;
  companyRemaining: number | null;
  companyLimitReached: boolean;
  companyLimitExceeded: boolean;
  canCreateCompany: boolean;
  trialActive: boolean;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  trialDaysRemaining: number;
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
  trial: {
    key: "trial",
    name: "Teste profissional",
    accessMode: "trial_full",
    companyLimit: TRIAL_COMPANY_LIMIT,
    ...coreFeatures,
    ...advancedFiscalFeatures,
    officeCollaborationEnabled: true,
    prioritySupport: false,
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
  unico: {
    key: "unico",
    name: billingPlans.unico.name,
    accessMode: "plan",
    companyLimit: billingPlans.unico.companyLimit,
    ...coreFeatures,
    ...advancedFiscalFeatures,
    officeCollaborationEnabled: true,
    prioritySupport: true,
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
  if (billingAccessIsActive(snapshot, now) && snapshot && snapshot.planKey in billingPlans) {
    return planDefinitions[snapshot.planKey as PaidPlanKey];
  }
  return planDefinitions.beta;
}

export function resolveWorkspacePlan(input: { platformOwner: boolean; betaEnabled: boolean; billing: BillingAccessSnapshot; trial?: TrialAccessSnapshot }, now = Date.now()) {
  if (input.platformOwner) return planDefinitions.owner;
  const paidPlan = resolveEffectivePlan(input.billing, now);
  if (paidPlan.key !== "beta") return paidPlan;
  if (trialAccessIsActive(input.trial ?? null, now)) return planDefinitions.trial;
  // A trial claim keeps new accounts out of the legacy unlimited beta after
  // the five-day period ends.
  if (input.trial) return planDefinitions.beta;
  if (input.betaEnabled) return planDefinitions.global_beta;
  return planDefinitions.beta;
}

export function applyPlanUsage(plan: PlanDefinition, snapshot: BillingAccessSnapshot, companyCount: number, trial: TrialAccessSnapshot = null, now = Date.now()): WorkspaceEntitlements {
  const safeCount = Number.isInteger(companyCount) && companyCount > 0 ? companyCount : 0;
  const companyAddonBlocks = plan.key === "unico"
    ? normalizeCompanyAddonBlocks(snapshot?.companyAddonBlocks) ?? 0
    : 0;
  const pendingCompanyAddonBlocks = plan.key === "unico"
    ? normalizeCompanyAddonBlocks(snapshot?.pendingCompanyAddonBlocks) ?? companyAddonBlocks
    : 0;
  const limit = plan.key === "unico"
    ? billingCompanyLimit("unico", companyAddonBlocks)
    : plan.companyLimit;
  const monthlyPriceCents = plan.key === "unico"
    ? billingAmountCents("unico", companyAddonBlocks)
    : plan.key === "pro" || plan.key === "escritorio"
      ? billingAmountCents(plan.key)
      : plan.key === "beta"
        ? 0
        : null;
  const companyRemaining = limit === null ? null : Math.max(0, limit - safeCount);
  return {
    ...plan,
    companyLimit: limit,
    billingStatus: snapshot?.status ?? "beta",
    requestedPlanKey: snapshot?.planKey ?? null,
    companyCount: safeCount,
    companyAddonBlocks,
    pendingCompanyAddonBlocks,
    companyAddonBlockSize: BILLING_ADDON_COMPANY_BLOCK_SIZE,
    companyAddonPriceCents: BILLING_ADDON_COMPANY_BLOCK_PRICE_CENTS,
    monthlyPriceCents,
    companyRemaining,
    companyLimitReached: limit === null ? false : safeCount >= limit,
    companyLimitExceeded: limit === null ? false : safeCount > limit,
    canCreateCompany: limit === null || safeCount < limit,
    trialActive: plan.key === "trial" && trialAccessIsActive(trial, now),
    trialStartedAt: trial?.startedAt ?? null,
    trialEndsAt: trial?.endsAt ?? null,
    trialDaysRemaining: plan.key === "trial" ? trialDaysRemaining(trial, now) : 0,
  };
}

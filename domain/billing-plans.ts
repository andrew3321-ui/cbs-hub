export const billingPricingMode = "single_plan_capacity" as const;

export const BILLING_BASE_COMPANY_LIMIT = 30;
export const BILLING_ADDON_COMPANY_BLOCK_SIZE = 10;
export const BILLING_ADDON_COMPANY_BLOCK_PRICE_CENTS = 10_000;
export const BILLING_MAX_ADDON_BLOCKS = 47;

export const billingPlans = {
  unico: {
    key: "unico",
    name: "Margem Clara",
    priceCents: 45_000,
    regularPriceCents: 45_000,
    reason: "Margem Clara — assinatura mensal",
    companyLimit: BILLING_BASE_COMPANY_LIMIT,
    capacityAddonsEnabled: true,
    purchasable: true,
  },
  // Existing R$ 1 test subscriptions remain reconcilable until the customer
  // explicitly cancels them. They are never migrated to R$ 450 silently.
  pro: {
    key: "pro",
    name: "Pro legado",
    priceCents: 100,
    regularPriceCents: 5_900,
    reason: "Margem Clara Pro — assinatura mensal de teste legada",
    companyLimit: 10,
    capacityAddonsEnabled: false,
    purchasable: false,
  },
  escritorio: {
    key: "escritorio",
    name: "Escritório legado",
    priceCents: 100,
    regularPriceCents: 14_900,
    reason: "Margem Clara Escritório — assinatura mensal de teste legada",
    companyLimit: 50,
    capacityAddonsEnabled: false,
    purchasable: false,
  },
} as const;

export type PaidPlanKey = keyof typeof billingPlans;
export type PurchasablePaidPlanKey = "unico";

export function normalizeCompanyAddonBlocks(value: unknown) {
  const blocks = Number(value);
  return Number.isInteger(blocks) && blocks >= 0 && blocks <= BILLING_MAX_ADDON_BLOCKS ? blocks : null;
}

export function billingAmountCents(planKey: PaidPlanKey, addonBlocks = 0) {
  const plan = billingPlans[planKey];
  if (!plan.capacityAddonsEnabled) return plan.priceCents;
  const normalized = normalizeCompanyAddonBlocks(addonBlocks);
  if (normalized === null) throw new Error("invalid_company_addon_blocks");
  return plan.priceCents + normalized * BILLING_ADDON_COMPANY_BLOCK_PRICE_CENTS;
}

export function billingCompanyLimit(planKey: PaidPlanKey, addonBlocks = 0) {
  const plan = billingPlans[planKey];
  if (!plan.capacityAddonsEnabled) return plan.companyLimit;
  const normalized = normalizeCompanyAddonBlocks(addonBlocks);
  if (normalized === null) throw new Error("invalid_company_addon_blocks");
  return plan.companyLimit + normalized * BILLING_ADDON_COMPANY_BLOCK_SIZE;
}

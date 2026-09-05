export const billingPricingMode = "individual_office" as const;

export const BILLING_BASE_COMPANY_LIMIT = 30;
export const BILLING_ADDON_COMPANY_BLOCK_SIZE = 10;
export const BILLING_ADDON_COMPANY_BLOCK_PRICE_CENTS = 10_000;
export const BILLING_MAX_ADDON_BLOCKS = 47;

export const billingPlans = {
  unico: {
    key: "unico",
    name: "Contrato legado CBSHub",
    priceCents: 45_000,
    regularPriceCents: 45_000,
    reason: "CBSHub — assinatura mensal",
    companyLimit: BILLING_BASE_COMPANY_LIMIT,
    capacityAddonsEnabled: true,
    purchasable: false,
  },
  // Existing contracts remain reconcilable until the customer explicitly
  // cancels them. New purchases use the individual or office offers below.
  pro: {
    key: "pro",
    name: "Contrato individual legado",
    priceCents: 5_900,
    regularPriceCents: 5_900,
    reason: "CBSHub — assinatura individual legada",
    companyLimit: 10,
    capacityAddonsEnabled: false,
    purchasable: false,
  },
  escritorio: {
    key: "escritorio",
    name: "Contrato de equipe legado",
    priceCents: 14_900,
    regularPriceCents: 14_900,
    reason: "CBSHub — assinatura de equipe legada",
    companyLimit: 50,
    capacityAddonsEnabled: false,
    purchasable: false,
  },
} as const;

export type PaidPlanKey = keyof typeof billingPlans;
export type PurchasablePaidPlanKey = "pro" | "escritorio";

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

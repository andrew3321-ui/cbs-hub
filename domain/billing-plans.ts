export const billingPricingMode = "checkout_test" as const;

export const billingPlans = {
  pro: {
    key: "pro",
    name: "Pro",
    priceCents: 100,
    regularPriceCents: 5900,
    reason: "Margem Clara Pro — assinatura mensal de teste",
    companyLimit: 10,
  },
  escritorio: {
    key: "escritorio",
    name: "Escritório",
    priceCents: 100,
    regularPriceCents: 14900,
    reason: "Margem Clara Escritório — assinatura mensal de teste",
    companyLimit: 50,
  },
} as const;

export type PaidPlanKey = keyof typeof billingPlans;

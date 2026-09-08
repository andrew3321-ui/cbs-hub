export const cyberLaunchOffer = {
  key: "cyber_early_access",
  name: "CBSHub Cyber Early Access",
  priceCents: 29_700,
  billingInterval: "month",
  domainLimit: 3,
  purchaseEnabled: false,
  stage: "controlled_opening",
} as const;

export function formatCyberPrice(priceCents = cyberLaunchOffer.priceCents) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 }).format(priceCents / 100);
}

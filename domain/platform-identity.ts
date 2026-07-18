export const PLATFORM_IDENTITY_VERSION = "2026.07.18-v37";

export const platformIdentity = Object.freeze({
  brand: "Margem Clara",
  holderType: "natural_person" as const,
  responsibleName: "ANDRÉ HUGO SANTOS COELHO",
  declarationStatus: "declared_by_responsible" as const,
  publicTaxIdDisclosure: "not_published" as const,
  commercialStatus: "free_beta_without_automatic_billing" as const,
  paidLaunchRequirement: "supplier_tax_id_must_be_disclosed_before_paid_contracting" as const,
  declaredAt: "2026-07-18",
  version: PLATFORM_IDENTITY_VERSION,
});

export function publicPlatformOwnership() {
  return {
    brand: platformIdentity.brand,
    holderType: platformIdentity.holderType,
    responsibleName: platformIdentity.responsibleName,
    declarationStatus: platformIdentity.declarationStatus,
    publicTaxIdDisclosure: platformIdentity.publicTaxIdDisclosure,
    commercialStatus: platformIdentity.commercialStatus,
    paidLaunchRequirement: platformIdentity.paidLaunchRequirement,
    declaredAt: platformIdentity.declaredAt,
    version: platformIdentity.version,
    notice: "Identificação declarada pelo responsável pela operação da plataforma. Nenhum CPF ou CNPJ é publicado neste registro durante o beta gratuito. Antes de qualquer contratação paga, a identificação fiscal obrigatória do fornecedor deverá constar nos termos e no fluxo comercial.",
  };
}

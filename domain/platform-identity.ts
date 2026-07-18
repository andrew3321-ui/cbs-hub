export const PLATFORM_IDENTITY_VERSION = "2026.07.18-v33";
export const RECEITA_CNPJ_LOOKUP_URL = "https://solucoes.receita.fazenda.gov.br/Servicos/cnpjreva/Cnpjreva_Solicitacao.asp";

export function normalizeNumericCnpj(value: string) {
  return String(value ?? "").replace(/\D/g, "");
}

function calculateCnpjDigit(base: string, weights: number[]) {
  const total = base.split("").reduce((sum, digit, index) => sum + Number(digit) * weights[index], 0);
  const remainder = total % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

export function numericCnpjIsValid(value: string) {
  const digits = normalizeNumericCnpj(value);
  if (!/^\d{14}$/.test(digits) || /^(\d)\1{13}$/.test(digits)) return false;
  const first = calculateCnpjDigit(digits.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const second = calculateCnpjDigit(`${digits.slice(0, 12)}${first}`, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return digits.endsWith(`${first}${second}`);
}

export function formatNumericCnpj(value: string) {
  const digits = normalizeNumericCnpj(value);
  if (!/^\d{14}$/.test(digits)) return value;
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

const cnpj = "64297777000142";
if (!numericCnpjIsValid(cnpj)) throw new Error("invalid_platform_owner_cnpj");

export const platformIdentity = Object.freeze({
  brand: "Margem Clara",
  holderType: "legal_entity" as const,
  cnpj,
  formattedCnpj: formatNumericCnpj(cnpj),
  declarationStatus: "self_declared" as const,
  checkDigitStatus: "valid" as const,
  registryVerification: "not_verified" as const,
  legalName: null,
  declaredAt: "2026-07-18",
  version: PLATFORM_IDENTITY_VERSION,
});

export function publicPlatformOwnership() {
  return {
    brand: platformIdentity.brand,
    holderType: platformIdentity.holderType,
    cnpj: platformIdentity.cnpj,
    formattedCnpj: platformIdentity.formattedCnpj,
    declarationStatus: platformIdentity.declarationStatus,
    checkDigitStatus: platformIdentity.checkDigitStatus,
    registryVerification: platformIdentity.registryVerification,
    legalName: platformIdentity.legalName,
    declaredAt: platformIdentity.declaredAt,
    version: platformIdentity.version,
    officialRegistryLookup: RECEITA_CNPJ_LOOKUP_URL,
    notice: "Identificação declarada pelo titular da plataforma. Dígitos verificadores válidos; razão social e situação cadastral não verificadas automaticamente.",
  };
}

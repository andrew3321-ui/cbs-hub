export const PLATFORM_IDENTITY_VERSION = "2026.07.18-v35";
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
  declarationStatus: "documented" as const,
  checkDigitStatus: "valid" as const,
  registryVerification: "verified_from_receita_certificate" as const,
  registrationStatus: "active" as const,
  legalName: "64.297.777 ANDRE HUGO SANTOS COELHO",
  declaredAt: "2026-07-17",
  officialDocument: Object.freeze({
    type: "cnpj_registration_and_status_certificate" as const,
    issuer: "Receita Federal do Brasil",
    issuedAt: "2026-07-17T21:42:07-03:00",
    registrationStatusSince: "2026-01-06",
  }),
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
    registrationStatus: platformIdentity.registrationStatus,
    legalName: platformIdentity.legalName,
    declaredAt: platformIdentity.declaredAt,
    officialDocument: platformIdentity.officialDocument,
    version: platformIdentity.version,
    officialRegistryLookup: RECEITA_CNPJ_LOOKUP_URL,
    notice: "CNPJ, razão social e situação ativa conferidos em comprovante oficial da Receita Federal apresentado pelo responsável. Este registro cadastral não comprova, isoladamente, a titularidade jurídica da marca, do domínio ou do software.",
  };
}

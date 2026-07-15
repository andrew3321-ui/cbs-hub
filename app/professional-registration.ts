export function normalizeProfessionalRegistration(value: string) {
  return value.trim().replace(/\s+/g, " ").toUpperCase().slice(0, 40);
}

export function professionalRegistrationError(value: string) {
  const normalized = normalizeProfessionalRegistration(value);
  if (normalized.length < 4) return "Informe o registro profissional, incluindo letras e números.";
  if (!/[A-Z]/.test(normalized) || !/\d/.test(normalized)) return "O registro precisa conter letras e números. Ex.: CRC SP-123456/O-7.";
  if (!/^[A-Z0-9 ./-]+$/.test(normalized)) return "Use somente letras, números, espaços, ponto, barra ou hífen.";
  return null;
}

export function professionalRegistrationIsValid(value: string) {
  return professionalRegistrationError(value) === null;
}

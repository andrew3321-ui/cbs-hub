export const SUPPORT_CONSENT_VERSION = "support-data-minimization.v1";
export const SUPPORT_RESPONSE_BUSINESS_DAYS = 2;

export const supportCategories = [
  "question",
  "missing_rule",
  "calculation_divergence",
  "technical_problem",
  "suggestion",
] as const;

export const supportModules = [
  "overview",
  "companies",
  "simulator",
  "reviews",
  "documents",
  "team",
  "intelligence",
  "taxlab",
  "coverage",
  "expansion",
  "rules",
  "determination",
  "billing",
  "academy",
] as const;

export const supportStatuses = ["open", "in_analysis", "waiting_user", "resolved", "closed"] as const;

export type SupportCategory = (typeof supportCategories)[number];
export type SupportModule = (typeof supportModules)[number];
export type SupportStatus = (typeof supportStatuses)[number];

export const supportCategoryLabels: Record<SupportCategory, string> = {
  question: "Dúvida de uso",
  missing_rule: "Regra ausente",
  calculation_divergence: "Divergência de cálculo",
  technical_problem: "Problema técnico",
  suggestion: "Sugestão",
};

export const supportModuleLabels: Record<SupportModule, string> = {
  overview: "Visão geral",
  companies: "Empresas",
  simulator: "Análises",
  reviews: "Central de revisão",
  documents: "Documentos",
  team: "Equipe e modo de trabalho",
  intelligence: "Inteligência fiscal",
  taxlab: "Laboratório fiscal",
  coverage: "Cobertura nacional",
  expansion: "Expansão fiscal",
  rules: "Regras fiscais",
  determination: "Apuração fiscal",
  billing: "Faturamento",
  academy: "Demonstrações",
};

export const supportStatusLabels: Record<SupportStatus, string> = {
  open: "Recebido",
  in_analysis: "Em análise",
  waiting_user: "Aguardando usuário",
  resolved: "Resolvido",
  closed: "Encerrado",
};

const allowedTransitions: Record<SupportStatus, SupportStatus[]> = {
  open: ["in_analysis", "waiting_user", "resolved", "closed"],
  in_analysis: ["waiting_user", "resolved", "closed"],
  waiting_user: ["in_analysis", "resolved", "closed"],
  resolved: ["in_analysis", "closed"],
  closed: ["in_analysis"],
};

export function isSupportCategory(value: unknown): value is SupportCategory {
  return typeof value === "string" && (supportCategories as readonly string[]).includes(value);
}

export function isSupportModule(value: unknown): value is SupportModule {
  return typeof value === "string" && (supportModules as readonly string[]).includes(value);
}

export function isSupportStatus(value: unknown): value is SupportStatus {
  return typeof value === "string" && (supportStatuses as readonly string[]).includes(value);
}

export function canTransitionSupportStatus(from: SupportStatus, to: SupportStatus) {
  return from !== to && allowedTransitions[from].includes(to);
}

export function supportResponseDueAt(createdAt: Date, businessDays = SUPPORT_RESPONSE_BUSINESS_DAYS) {
  const due = new Date(createdAt);
  let remaining = businessDays;
  while (remaining > 0) {
    due.setUTCDate(due.getUTCDate() + 1);
    const weekday = due.getUTCDay();
    if (weekday !== 0 && weekday !== 6) remaining -= 1;
  }
  due.setUTCHours(23, 59, 59, 999);
  return due.toISOString();
}

export function createSupportProtocol(date = new Date(), random = crypto.randomUUID()) {
  const day = date.toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = random.replaceAll("-", "").slice(0, 8).toUpperCase();
  return `CBS-${day}-${suffix}`;
}

export function normalizeSupportText(value: unknown, limit: number) {
  return typeof value === "string"
    ? value.replace(/\r\n?/g, "\n").replace(/[^\S\n]+/g, " ").trim().slice(0, limit)
    : "";
}

export function supportTextHasSensitiveData(value: string) {
  const compact = value.replace(/[\s()./+-]/g, "");
  return /(?:^|\D)\d{11}(?:\D|$)/.test(compact)
    || /(?:^|\D)\d{14}(?:\D|$)/.test(compact)
    || /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(value)
    || /\b(?:APP_USR|TEST|cfat|cfut)[_-][A-Za-z0-9_-]{12,}\b/i.test(value)
    || /\bBearer\s+[A-Za-z0-9._~-]{12,}\b/i.test(value)
    || /-----BEGIN [A-Z ]+PRIVATE KEY-----/.test(value);
}

export function validSupportTraceCode(value: string) {
  return !value || /^[A-Z0-9][A-Z0-9-]{3,79}$/i.test(value);
}

import { securityKnowledgeForCodes, SECURITY_KNOWLEDGE_VERSION, type SecurityKnowledgeReference, type SecurityValidationMethod } from "./security-knowledge.ts";

export const SECURITY_OPERATIONS_VERSION = "security-operations.v2";

export type SecurityEvidence = {
  version: string;
  domain: string;
  checkedAt: string;
  fingerprint: string;
  source?: "manual_telemetry";
  window?: { start: string; end: string };
  coverage?: TelemetryCoverage;
  posture: { level: string; riskCount: number; warningCount: number; score?: number };
  checks: Array<{ code: string; category: string; title: string; status: string; detail: string; action: string }>;
  limitation: string;
};

const metricNames = ["failedLogins", "successfulLogins", "mfaFailures", "wafBlocks", "serverErrors", "totalRequests", "privilegeChanges"] as const;
const coverageNames = ["authentication", "perimeter", "application", "administration"] as const;
const coverageValues = ["complete", "partial", "unavailable"] as const;
export type TelemetryCoverage = Record<typeof coverageNames[number], typeof coverageValues[number]>;
export type Telemetry = { start: string; end: string; coverage: TelemetryCoverage; metrics: Record<typeof metricNames[number], number> };

export function parseTelemetry(input: unknown, now = Date.now()): Telemetry {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("TELEMETRY_INVALID");
  const value = input as Record<string, unknown>;
  if (Object.keys(value).some((key) => !["start", "end", "coverage", "metrics"].includes(key))) throw new Error("TELEMETRY_UNKNOWN_FIELD");
  const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
  if (typeof value.start !== "string" || typeof value.end !== "string" || !iso.test(value.start) || !iso.test(value.end)) throw new Error("TELEMETRY_WINDOW_INVALID");
  const start = Date.parse(value.start), end = Date.parse(value.end);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || end - start > 86400000 || start < now - 30 * 86400000 || end > now + 60000) throw new Error("TELEMETRY_WINDOW_INVALID");
  if (new Date(start).toISOString().slice(0, 19) !== value.start.slice(0, 19) || new Date(end).toISOString().slice(0, 19) !== value.end.slice(0, 19)) throw new Error("TELEMETRY_WINDOW_INVALID");
  if (!value.metrics || typeof value.metrics !== "object" || Array.isArray(value.metrics)) throw new Error("TELEMETRY_METRICS_INVALID");
  if (!value.coverage || typeof value.coverage !== "object" || Array.isArray(value.coverage)) throw new Error("TELEMETRY_COVERAGE_INVALID");
  const coverage = value.coverage as Record<string, unknown>;
  if (Object.keys(coverage).length !== coverageNames.length || Object.keys(coverage).some((key) => !coverageNames.includes(key as typeof coverageNames[number]))) throw new Error("TELEMETRY_COVERAGE_INVALID");
  for (const name of coverageNames) if (!coverageValues.includes(coverage[name] as typeof coverageValues[number])) throw new Error("TELEMETRY_COVERAGE_INVALID");
  const metrics = value.metrics as Record<string, unknown>;
  if (Object.keys(metrics).length !== metricNames.length || Object.keys(metrics).some((key) => !metricNames.includes(key as typeof metricNames[number]))) throw new Error("TELEMETRY_METRICS_INVALID");
  for (const name of metricNames) if (typeof metrics[name] !== "number" || !Number.isSafeInteger(metrics[name]) || metrics[name] < 0 || metrics[name] > 1000000) throw new Error("TELEMETRY_METRICS_INVALID");
  if (Number(metrics.serverErrors) + Number(metrics.wafBlocks) > Number(metrics.totalRequests)) throw new Error("TELEMETRY_COUNTS_INCONSISTENT");
  return { start: new Date(start).toISOString(), end: new Date(end).toISOString(), coverage: Object.fromEntries(coverageNames.map((name) => [name, coverage[name]])) as TelemetryCoverage, metrics: Object.fromEntries(metricNames.map((name) => [name, metrics[name]])) as Telemetry["metrics"] };
}

export async function telemetryEvidence(domain: string, input: Telemetry): Promise<SecurityEvidence> {
  const { metrics: m } = input;
  const authTotal = m.failedLogins + m.successfulLogins;
  const authConcern = m.failedLogins >= 20 && authTotal > 0 && m.failedLogins / authTotal >= 0.8;
  const outageConcern = m.totalRequests >= 100 && m.serverErrors / m.totalRequests >= 0.05;
  const coveredStatus = (coverage: TelemetryCoverage[keyof TelemetryCoverage], signal: "risk" | "warning" | null) => coverage === "unavailable" ? "unavailable" : signal ?? (coverage === "partial" ? "warning" : "pass");
  const checks: SecurityEvidence["checks"] = [
    { code: "bt-auth", category: "identity", title: "Eventos de autenticação", status: coveredStatus(input.coverage.authentication, authConcern || m.mfaFailures >= 10 ? "warning" : null), detail: `Cobertura ${input.coverage.authentication}: ${m.failedLogins} falhas, ${m.successfulLogins} sucessos e ${m.mfaFailures} falhas de MFA na janela informada. Contagens não correlacionam usuários nem confirmam invasão.`, action: "Compare com a linha de base e correlacione identidades, horários e MFA nos logs originais antes de restringir contas." },
    { code: "bt-waf", category: "network", title: "Bloqueios no WAF", status: coveredStatus(input.coverage.perimeter, m.wafBlocks > 0 ? "warning" : null), detail: `Cobertura ${input.coverage.perimeter}: ${m.wafBlocks} requisições bloqueadas de ${m.totalRequests} requisições totais. Bloqueio é ação do controle e não prova comprometimento.`, action: "Revise regras acionadas e amostras sanitizadas; verifique falsos positivos e requisições que passaram pelo WAF." },
    { code: "bt-availability", category: "availability", title: "Erros do serviço", status: coveredStatus(input.coverage.application, outageConcern ? "risk" : m.serverErrors > 0 ? "warning" : null), detail: `Cobertura ${input.coverage.application}: ${m.serverErrors} respostas 5xx em ${m.totalRequests} requisições. O limiar inicial é 5% com pelo menos 100 requisições; não identifica causa nem atribui ataque.`, action: "Correlacione erros com deploys, dependências e capacidade; preserve a linha do tempo e valide a recuperação com uma requisição legítima." },
    { code: "bt-privilege", category: "identity", title: "Alterações de privilégios", status: coveredStatus(input.coverage.administration, m.privilegeChanges > 0 ? "warning" : null), detail: `Cobertura ${input.coverage.administration}: ${m.privilegeChanges} alterações informadas. Sem autor, aprovação e contexto não é possível classificar uma alteração como indevida.`, action: "Confronte as alterações com solicitações aprovadas e o log de administração. Preserve evidência antes de qualquer reversão." },
  ];
  const riskCount = checks.filter((check) => check.status === "risk").length;
  const warningCount = checks.filter((check) => check.status === "warning").length;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify({ domain, input, version: SECURITY_OPERATIONS_VERSION })));
  return { version: SECURITY_OPERATIONS_VERSION, domain, checkedAt: new Date().toISOString(), fingerprint: Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join(""), source: "manual_telemetry", window: { start: input.start, end: input.end }, coverage: input.coverage, posture: { level: riskCount ? "exposed" : warningCount ? "attention" : "unknown", riskCount, warningCount }, checks, limitation: "Triagem de contagens declaradas pelo operador, sem conexão com SIEM/EDR e sem verificar os logs originais. Fontes parciais ou indisponíveis nunca recebem resultado positivo. Ausência de alertas não significa ausência de incidente. Limiares heurísticos exigem calibração por ambiente." };
}

export type OperationalPlaybook = { code: string; title: string; track: "blue_team" | "pentest_preparation"; evidenceCodes: string[]; steps: string[]; validation: string; execution: "manual"; validationMethod: SecurityValidationMethod; references: SecurityKnowledgeReference[] };

export function operationalPlaybooks(evidence: SecurityEvidence): OperationalPlaybook[] {
  return evidence.checks.filter((check) => ["risk", "warning", "unavailable"].includes(check.status)).slice(0, 8).map((check) => {
    const knowledge = securityKnowledgeForCodes([check.code])[0];
    return ({
    code: `${SECURITY_OPERATIONS_VERSION}:${check.code}`,
    title: check.title,
    track: evidence.source === "manual_telemetry" ? "blue_team" : "pentest_preparation",
    evidenceCodes: [check.code],
    execution: "manual",
    validationMethod: knowledge?.validationMethod ?? "authorized_manual_test",
    references: knowledge?.references ?? [],
    steps: evidence.source === "manual_telemetry" ? [
      "Preserve os logs originais da janela, a origem dos dados e o responsável pela coleta.",
      check.action,
      "Registre hipótese, evidência favorável e evidência contrária. Se houver confirmação, atribua responsável e plano de contenção com possibilidade de reversão.",
    ] : [
      `Confirme o achado ${check.code} no ativo autorizado ${evidence.domain}; registre data, resposta observada e contexto.`,
      check.action,
      "Para testes autenticados, defina contas de teste, janela, ambiente e critérios de interrupção no escopo do pentest.",
    ],
    validation: evidence.source === "manual_telemetry" ? "Compare uma nova janela equivalente e confirme o comportamento nos logs originais; encerrar o alerta requer revisão humana." : "Repita o diagnóstico após a correção e compare a evidência. Um controle publicado não comprova resistência a exploração.",
  }); });

}

export function operationsInstructions(evidence: SecurityEvidence) {
  return [
    `Procedimento versionado ${SECURITY_OPERATIONS_VERSION}.`,
    `Catálogo de referências ${SECURITY_KNOWLEDGE_VERSION}. Referências são objetivos de controle, métodos de teste ou hipóteses; nunca evidência adicional.`,
    evidence.source === "manual_telemetry"
      ? "Atue como analista de blue team. Os dados são contagens fornecidas pelo operador, não logs verificados. Diferencie observação, hipótese e incidente confirmado. Não infira correlação entre usuários, causalidade, invasão ou ausência de incidente a partir de totais. Recomende coleta adicional, triagem, preservação de evidência, contenção revisada por humano e critérios de recuperação."
      : "Atue como analista de preparação de pentest autorizado. Mapeie lacunas verificáveis e pré-requisitos para testes autenticados. Não afirme que um pentest foi executado ou que ausência de cabeçalho prova exploração.",
    "Cada prioridade deve citar ao menos um evidenceCode existente. Não invente resultados. Os playbooks fornecidos são recomendações manuais, não ações executadas.",
  ];
}

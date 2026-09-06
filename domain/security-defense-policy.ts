export const SECURITY_DEFENSE_POLICY_VERSION = "security-defense-policy.2026-09-05.v1";

export const defenseSignalCatalog = {
  auth_failure_burst: { category: "identity", severity: "high", title: "Tentativas concentradas de autenticação" },
  request_flood: { category: "availability", severity: "high", title: "Volume anormal de requisições" },
  exploit_attempt: { category: "application", severity: "high", title: "Tentativa de exploração detectada" },
  persistence_indicator: { category: "endpoint", severity: "critical", title: "Indicador de persistência" },
  evasion_indicator: { category: "endpoint", severity: "high", title: "Indicador de evasão" },
  data_egress_anomaly: { category: "data", severity: "critical", title: "Saída anormal de dados" },
  destructive_activity: { category: "impact", severity: "critical", title: "Atividade potencialmente destrutiva" },
  malware_detected: { category: "endpoint", severity: "critical", title: "Malware detectado" },
  privilege_escalation: { category: "identity", severity: "critical", title: "Elevação de privilégio" },
  service_degradation: { category: "availability", severity: "medium", title: "Degradação do serviço" },
} as const;

export type DefenseSignalType = keyof typeof defenseSignalCatalog;
export type DefenseConfidence = "low" | "medium" | "high";
export type DefenseSignal = {
  eventId: string;
  occurredAt: string;
  type: DefenseSignalType;
  confidence: DefenseConfidence;
  count: number;
  windowSeconds: number;
  sourceIp: string | null;
  resource: string;
  summary: string;
  attributes: Record<string, string | number | boolean>;
};

export type DefenseDecision = {
  policyVersion: string;
  category: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  createIncident: boolean;
  response: {
    action: "temporary_source_block" | "investigate";
    autonomy: "automatic_reversible" | "human_approval";
    ttlSeconds: number | null;
    reason: string;
  };
};

const allowedKeys = ["eventId", "occurredAt", "type", "confidence", "count", "windowSeconds", "sourceIp", "resource", "summary", "attributes"];
const confidenceValues = ["low", "medium", "high"] as const;

function cleanText(value: unknown, maximum: number) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().replace(/\s+/g, " ").slice(0, maximum);
}

function validIp(value: string) {
  const ipv4 = value.split(".");
  if (ipv4.length === 4 && ipv4.every((part) => /^\d{1,3}$/.test(part) && Number(part) >= 0 && Number(part) <= 255)) return true;
  return value.includes(":") && /^[0-9a-f:]{2,45}$/i.test(value) && !value.includes(":::");
}

function parseAttributes(value: unknown) {
  if (value === undefined) return {};
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("DEFENSE_ATTRIBUTES_INVALID");
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length > 12) throw new Error("DEFENSE_ATTRIBUTES_INVALID");
  const parsed: Record<string, string | number | boolean> = {};
  for (const [key, item] of entries) {
    if (!/^[a-z][a-z0-9_.-]{0,39}$/i.test(key)) throw new Error("DEFENSE_ATTRIBUTES_INVALID");
    if (typeof item === "string") parsed[key] = cleanText(item, 160);
    else if (typeof item === "boolean") parsed[key] = item;
    else if (typeof item === "number" && Number.isSafeInteger(item) && Math.abs(item) <= 1_000_000_000) parsed[key] = item;
    else throw new Error("DEFENSE_ATTRIBUTES_INVALID");
  }
  return parsed;
}

export function parseDefenseSignal(input: unknown, now = Date.now()): DefenseSignal {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("DEFENSE_SIGNAL_INVALID");
  const value = input as Record<string, unknown>;
  if (Object.keys(value).some((key) => !allowedKeys.includes(key))) throw new Error("DEFENSE_SIGNAL_UNKNOWN_FIELD");
  const eventId = cleanText(value.eventId, 120);
  if (!/^[a-z0-9][a-z0-9._:-]{7,119}$/i.test(eventId)) throw new Error("DEFENSE_EVENT_ID_INVALID");
  if (typeof value.occurredAt !== "string") throw new Error("DEFENSE_TIME_INVALID");
  const occurred = Date.parse(value.occurredAt);
  if (!Number.isFinite(occurred) || occurred < now - 24 * 60 * 60_000 || occurred > now + 5 * 60_000) throw new Error("DEFENSE_TIME_INVALID");
  if (typeof value.type !== "string" || !(value.type in defenseSignalCatalog)) throw new Error("DEFENSE_TYPE_INVALID");
  if (!confidenceValues.includes(value.confidence as DefenseConfidence)) throw new Error("DEFENSE_CONFIDENCE_INVALID");
  if (!Number.isSafeInteger(value.count) || Number(value.count) < 1 || Number(value.count) > 1_000_000) throw new Error("DEFENSE_COUNT_INVALID");
  if (!Number.isSafeInteger(value.windowSeconds) || Number(value.windowSeconds) < 1 || Number(value.windowSeconds) > 3_600) throw new Error("DEFENSE_WINDOW_INVALID");
  const sourceIp = value.sourceIp === undefined || value.sourceIp === null || value.sourceIp === "" ? null : cleanText(value.sourceIp, 45);
  if (sourceIp && !validIp(sourceIp)) throw new Error("DEFENSE_SOURCE_INVALID");
  const resource = cleanText(value.resource, 200);
  const summary = cleanText(value.summary, 500);
  if (resource.length < 1 || summary.length < 8) throw new Error("DEFENSE_CONTEXT_INVALID");
  return {
    eventId,
    occurredAt: new Date(occurred).toISOString(),
    type: value.type as DefenseSignalType,
    confidence: value.confidence as DefenseConfidence,
    count: Number(value.count),
    windowSeconds: Number(value.windowSeconds),
    sourceIp,
    resource,
    summary,
    attributes: parseAttributes(value.attributes),
  };
}

export function evaluateDefenseSignal(signal: DefenseSignal): DefenseDecision {
  const definition = defenseSignalCatalog[signal.type];
  let ttlSeconds: number | null = null;
  let reason = "O sinal exige correlação e decisão humana antes de alterar o ambiente.";
  if (signal.confidence === "high" && signal.sourceIp) {
    if (signal.type === "auth_failure_burst" && signal.count >= 20 && signal.windowSeconds <= 300) {
      ttlSeconds = 15 * 60;
      reason = "Alta confiança, origem identificada e ao menos 20 falhas em até cinco minutos.";
    } else if (signal.type === "request_flood" && signal.count >= 600 && signal.windowSeconds <= 60) {
      ttlSeconds = 10 * 60;
      reason = "Alta confiança, origem identificada e ao menos 600 requisições em até um minuto.";
    } else if (signal.type === "exploit_attempt" && signal.count >= 10 && signal.windowSeconds <= 300) {
      ttlSeconds = 30 * 60;
      reason = "Alta confiança, origem identificada e tentativas repetidas de exploração em uma janela curta.";
    }
  }
  return {
    policyVersion: SECURITY_DEFENSE_POLICY_VERSION,
    category: definition.category,
    severity: definition.severity,
    title: definition.title,
    createIncident: signal.type !== "service_degradation" || signal.count >= 10,
    response: ttlSeconds
      ? { action: "temporary_source_block", autonomy: "automatic_reversible", ttlSeconds, reason }
      : { action: "investigate", autonomy: "human_approval", ttlSeconds: null, reason },
  };
}

export function defenseCorrelationBucket(signal: DefenseSignal, sourceHash: string | null) {
  const fifteenMinutes = Math.floor(Date.parse(signal.occurredAt) / (15 * 60_000));
  return `${signal.type}:${sourceHash ?? signal.resource.toLowerCase()}:${fifteenMinutes}`;
}

export const CYBERSECURITY_PREVIEW_VERSION = "cyber-preview.v2";

export type CyberCheckStatus = "pass" | "warning" | "risk" | "unavailable";

export type CyberCheck = {
  code: string;
  category: "domain" | "website" | "email" | "reconnaissance" | "exposure" | "infrastructure";
  title: string;
  status: CyberCheckStatus;
  detail: string;
  action: string;
  weight: number;
};

const statusPenalty: Record<CyberCheckStatus, number> = {
  pass: 0,
  warning: 0.45,
  risk: 1,
  unavailable: 0.2,
};

function isIpv4(value: string) {
  const parts = value.split(".");
  return parts.length === 4 && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255);
}

function isIpv6(value: string) {
  return value.includes(":") && /^[0-9a-f:]+$/i.test(value);
}

export function isPrivateOrReservedAddress(value: string) {
  const address = value.trim().toLowerCase();
  if (isIpv4(address)) {
    const [a, b] = address.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || a >= 224
      || (a === 100 && b >= 64 && b <= 127)
      || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 0)
      || (a === 192 && b === 168)
      || (a === 198 && (b === 18 || b === 19));
  }
  if (isIpv6(address)) {
    return address === "::" || address === "::1" || address.startsWith("fc") || address.startsWith("fd")
      || /^fe[89ab]/.test(address) || address.startsWith("2001:db8:");
  }
  return false;
}

export function normalizePublicDomain(raw: string) {
  const candidate = raw.trim().toLowerCase();
  if (!candidate || candidate.length > 300) throw new Error("Informe um domínio válido.");
  let hostname = candidate;
  try {
    const parsed = new URL(candidate.includes("://") ? candidate : `https://${candidate}`);
    hostname = parsed.hostname.toLowerCase().replace(/\.$/, "");
  } catch {
    throw new Error("Informe somente o domínio, como empresa.com.br.");
  }
  if (hostname.length > 253 || !hostname.includes(".") || isIpv4(hostname) || isIpv6(hostname)) {
    throw new Error("O diagnóstico aceita somente domínios públicos.");
  }
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local") || hostname.endsWith(".internal")) {
    throw new Error("O diagnóstico aceita somente domínios públicos.");
  }
  const labels = hostname.split(".");
  if (labels.some((label) => !label || label.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label))) {
    throw new Error("O domínio informado possui um formato inválido.");
  }
  return hostname;
}

export function calculateCyberPosture(checks: CyberCheck[]) {
  const available = checks.filter((check) => check.status !== "unavailable");
  const totalWeight = available.reduce((sum, check) => sum + check.weight, 0);
  const penalty = available.reduce((sum, check) => sum + check.weight * statusPenalty[check.status], 0);
  const score = totalWeight ? Math.max(0, Math.round(100 - (penalty / totalWeight) * 100)) : 0;
  const riskCount = checks.filter((check) => check.status === "risk").length;
  const warningCount = checks.filter((check) => check.status === "warning").length;
  const level = score >= 85 && riskCount === 0 ? "strong" : score >= 60 && riskCount <= 2 ? "attention" : "exposed";
  return {
    score,
    level,
    riskCount,
    warningCount,
    passCount: checks.filter((check) => check.status === "pass").length,
    unavailableCount: checks.filter((check) => check.status === "unavailable").length,
  } as const;
}

export function containsDnsPolicy(records: string[], policy: "spf" | "dmarc") {
  const normalized = records.map((record) => record.replace(/^"|"$/g, "").toLowerCase());
  return policy === "spf"
    ? normalized.some((record) => record.startsWith("v=spf1"))
    : normalized.some((record) => record.startsWith("v=dmarc1"));
}

export function publicScanLimitation() {
  return "Diagnóstico passivo baseado apenas em informações publicamente acessíveis. Não executa exploração, varredura de portas, autenticação ou teste interno e não substitui pentest, SOC ou avaliação profissional.";
}

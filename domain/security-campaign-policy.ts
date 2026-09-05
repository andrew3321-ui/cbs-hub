export const SECURITY_CAMPAIGN_POLICY_VERSION = "security-campaign-policy.2026-09-05.v1";

export const securityTechniqueCatalog = {
  passive_external_posture: { label: "Postura externa passiva", execution: "existing_passive", risk: "passive", requiresRepository: false, requiresTestCredentials: false },
  safe_web_crawl: { label: "Navegação web segura (GET/HEAD)", execution: "isolated_runner", risk: "non_invasive", requiresRepository: false, requiresTestCredentials: false },
  tls_configuration_review: { label: "Configuração TLS", execution: "isolated_runner", risk: "non_invasive", requiresRepository: false, requiresTestCredentials: false },
  authenticated_access_review: { label: "Controles de acesso com conta de teste", execution: "isolated_runner", risk: "controlled", requiresRepository: false, requiresTestCredentials: true },
  sast: { label: "Análise estática do código", execution: "repository_runner", risk: "non_invasive", requiresRepository: true, requiresTestCredentials: false },
  dependency_audit: { label: "Dependências vulneráveis", execution: "repository_runner", risk: "non_invasive", requiresRepository: true, requiresTestCredentials: false },
  secret_detection: { label: "Detecção de segredos no código", execution: "repository_runner", risk: "non_invasive", requiresRepository: true, requiresTestCredentials: false },
} as const;

export type SecurityTechniqueId = keyof typeof securityTechniqueCatalog;
export type SecurityCampaignEnvironment = "lab" | "staging" | "production";
export type SecurityCampaignInput = {
  name: string;
  environment: SecurityCampaignEnvironment;
  techniques: SecurityTechniqueId[];
  windowStart: string;
  windowEnd: string;
  maxRequestsPerMinute: number;
  maxTotalRequests: number;
  stopConditions: { errorRatePercent: number; consecutiveServerErrors: number; unexpectedAuthentication: true };
};

const blockedCapabilities = ["denial_service", "brute_force", "credential_harvesting", "persistence", "evasion", "lateral_movement", "data_exfiltration", "destructive_exploitation"] as const;
const secretPattern = /(?:password|passwd|senha|token|secret|authorization|bearer|sk-|gh[opsu]_)/i;
const exactKeys = (value: Record<string, unknown>, expected: string[], code: string) => {
  if (Object.keys(value).length !== expected.length || Object.keys(value).some((key) => !expected.includes(key))) throw new Error(code);
};

export function parseSecurityCampaignInput(input: unknown, now = Date.now()): SecurityCampaignInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("CAMPAIGN_INVALID");
  const value = input as Record<string, unknown>;
  exactKeys(value, ["name", "environment", "techniques", "windowStart", "windowEnd", "maxRequestsPerMinute", "maxTotalRequests", "stopConditions", "authorizationConfirmed"], "CAMPAIGN_UNKNOWN_FIELD");
  if (value.authorizationConfirmed !== true) throw new Error("CAMPAIGN_AUTHORIZATION_REQUIRED");
  if (typeof value.name !== "string" || value.name.trim().length < 4 || value.name.trim().length > 80 || secretPattern.test(value.name)) throw new Error("CAMPAIGN_NAME_INVALID");
  if (!(["lab", "staging", "production"] as unknown[]).includes(value.environment)) throw new Error("CAMPAIGN_ENVIRONMENT_INVALID");
  if (!Array.isArray(value.techniques) || value.techniques.length < 1 || value.techniques.length > 7 || new Set(value.techniques).size !== value.techniques.length || value.techniques.some((item) => typeof item !== "string" || !(item in securityTechniqueCatalog))) throw new Error("CAMPAIGN_TECHNIQUES_INVALID");
  if (typeof value.windowStart !== "string" || typeof value.windowEnd !== "string") throw new Error("CAMPAIGN_WINDOW_INVALID");
  const start = Date.parse(value.windowStart), end = Date.parse(value.windowEnd);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < now + 5 * 60_000 || start > now + 30 * 86400_000 || end <= start || end - start > 4 * 3600_000) throw new Error("CAMPAIGN_WINDOW_INVALID");
  const environment = value.environment as SecurityCampaignEnvironment;
  const rpmLimit = environment === "production" ? 30 : 60;
  const totalLimit = environment === "production" ? 500 : 2000;
  if (!Number.isSafeInteger(value.maxRequestsPerMinute) || Number(value.maxRequestsPerMinute) < 1 || Number(value.maxRequestsPerMinute) > rpmLimit) throw new Error("CAMPAIGN_RATE_LIMIT_INVALID");
  if (!Number.isSafeInteger(value.maxTotalRequests) || Number(value.maxTotalRequests) < 1 || Number(value.maxTotalRequests) > totalLimit) throw new Error("CAMPAIGN_TOTAL_LIMIT_INVALID");
  if (!value.stopConditions || typeof value.stopConditions !== "object" || Array.isArray(value.stopConditions)) throw new Error("CAMPAIGN_STOP_CONDITIONS_INVALID");
  const stop = value.stopConditions as Record<string, unknown>;
  exactKeys(stop, ["errorRatePercent", "consecutiveServerErrors", "unexpectedAuthentication"], "CAMPAIGN_STOP_CONDITIONS_INVALID");
  if (!Number.isSafeInteger(stop.errorRatePercent) || Number(stop.errorRatePercent) < 1 || Number(stop.errorRatePercent) > 20 || !Number.isSafeInteger(stop.consecutiveServerErrors) || Number(stop.consecutiveServerErrors) < 1 || Number(stop.consecutiveServerErrors) > 20 || stop.unexpectedAuthentication !== true) throw new Error("CAMPAIGN_STOP_CONDITIONS_INVALID");
  return {
    name: value.name.trim(), environment, techniques: value.techniques as SecurityTechniqueId[],
    windowStart: new Date(start).toISOString(), windowEnd: new Date(end).toISOString(),
    maxRequestsPerMinute: Number(value.maxRequestsPerMinute), maxTotalRequests: Number(value.maxTotalRequests),
    stopConditions: { errorRatePercent: Number(stop.errorRatePercent), consecutiveServerErrors: Number(stop.consecutiveServerErrors), unexpectedAuthentication: true },
  };
}

export function campaignExecutionReadiness(input: Pick<SecurityCampaignInput, "techniques">, integrations: { isolatedRunner: boolean; repositoryConnector: boolean }) {
  const needsIsolatedRunner = input.techniques.some((id) => securityTechniqueCatalog[id].execution === "isolated_runner");
  const needsRepositoryConnector = input.techniques.some((id) => securityTechniqueCatalog[id].execution === "repository_runner");
  const blockers = [
    needsIsolatedRunner && !integrations.isolatedRunner ? "ISOLATED_RUNNER_NOT_CONFIGURED" : null,
    needsRepositoryConnector && !integrations.repositoryConnector ? "REPOSITORY_CONNECTOR_NOT_CONFIGURED" : null,
  ].filter((item): item is string => Boolean(item));
  return { ready: blockers.length === 0, blockers, needsIsolatedRunner, needsRepositoryConnector, blockedCapabilities: [...blockedCapabilities] };
}

export function parseRepositoryTarget(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("REMEDIATION_INVALID");
  const value = input as Record<string, unknown>;
  exactKeys(value, ["findingId", "provider", "repository", "baseBranch", "approvalConfirmed"], "REMEDIATION_UNKNOWN_FIELD");
  if (value.provider !== "github" || typeof value.repository !== "string" || !/^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/.test(value.repository) || typeof value.baseBranch !== "string" || !/^[A-Za-z0-9._\/-]{1,100}$/.test(value.baseBranch) || value.baseBranch.includes("..") || typeof value.findingId !== "string" || !/^saf_[0-9a-f-]{36}$/i.test(value.findingId)) throw new Error("REMEDIATION_INVALID");
  if (value.approvalConfirmed !== true) throw new Error("REMEDIATION_APPROVAL_REQUIRED");
  return { findingId: value.findingId, provider: "github" as const, repository: value.repository, baseBranch: value.baseBranch, strategy: "pull_request_only" as const };
}

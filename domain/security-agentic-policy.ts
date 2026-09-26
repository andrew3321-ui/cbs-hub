export const AGENTIC_TEST_BUDGETS = {
  web_control_probe: 2,
  safe_web_crawl: 8,
  tls_configuration_review: 1,
} as const;

export type AgenticTestId = keyof typeof AGENTIC_TEST_BUDGETS;
export const AGENTIC_MAX_STEPS = 3;
export const AGENTIC_MAX_TOTAL_REQUESTS = 14;
export const AGENTIC_REQUIRED_TESTS = Object.freeze(Object.keys(AGENTIC_TEST_BUDGETS) as AgenticTestId[]);
export const AGENTIC_WEB_SIGNAL_CODES = Object.freeze([
  "cors_credentialed_origin_reflection", "cors_origin_reflection", "cors_wildcard", "http_risky_methods_advertised",
  "cookie_secure_not_observed", "cookie_httponly_not_observed", "cookie_samesite_not_observed",
] as const);
export const AGENTIC_NEXT_FOCUS = Object.freeze([...AGENTIC_REQUIRED_TESTS, "human_review"] as const);

type RunnerEvidence = { domain: string; techniques: string[]; outcome: string; stopReason: string | null; budget: { consumed: number; totalRequests: number }; requests: { successful: number; errors: number; serverErrors: number; statusCodes: Record<string, number> }; transport: unknown; crawl: unknown; webProbe: unknown };

export function validateAgenticRunnerEvidence(input: unknown, expected: { domain: string; testId: AgenticTestId; requestCount: number; jobStatus: string }): asserts input is RunnerEvidence {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("AGENTIC_EVIDENCE_INVALID");
  const result = input as Partial<RunnerEvidence>;
  const budget = result.budget;
  const requests = result.requests;
  const natural = (value: unknown) => Number.isSafeInteger(value) && Number(value) >= 0;
  if (result.domain !== expected.domain || !Array.isArray(result.techniques) || result.techniques.length !== 1 || result.techniques[0] !== expected.testId
    || result.outcome !== expected.jobStatus || !["completed", "stopped"].includes(String(result.outcome))
    || (result.outcome === "completed" && result.stopReason !== null) || (result.outcome === "stopped" && (typeof result.stopReason !== "string" || !result.stopReason))
    || !budget || !natural(budget.consumed) || !natural(budget.totalRequests) || budget.consumed > budget.totalRequests || budget.totalRequests > AGENTIC_TEST_BUDGETS[expected.testId]
    || !natural(expected.requestCount) || budget.consumed !== expected.requestCount
    || !requests || !natural(requests.successful) || !natural(requests.errors) || !natural(requests.serverErrors)
    || requests.successful > budget.consumed || requests.errors > budget.consumed || requests.serverErrors > requests.successful
    || !requests.statusCodes || typeof requests.statusCodes !== "object" || Array.isArray(requests.statusCodes)
    || Object.entries(requests.statusCodes).some(([code, count]) => !/^[1-5][0-9]{2}$/.test(code) || !natural(count))
    || Object.values(requests.statusCodes).reduce((sum, count) => sum + count, 0) !== requests.successful
    || (expected.testId !== "web_control_probe" && result.webProbe !== null)
    || (expected.testId !== "safe_web_crawl" && result.crawl !== null)
    || (expected.testId !== "tls_configuration_review" && result.transport !== null)) throw new Error("AGENTIC_EVIDENCE_INVALID");
  if (result.webProbe !== null) {
    if (!result.webProbe || typeof result.webProbe !== "object" || !Array.isArray((result.webProbe as { signals?: unknown }).signals)
      || (result.webProbe as { signals: unknown[] }).signals.length > AGENTIC_WEB_SIGNAL_CODES.length
      || (result.webProbe as { signals: unknown[] }).signals.some((signal) => !signal || typeof signal !== "object"
        || !AGENTIC_WEB_SIGNAL_CODES.includes((signal as { code?: string }).code as typeof AGENTIC_WEB_SIGNAL_CODES[number])
        || !["low", "medium", "high"].includes(String((signal as { severity?: unknown }).severity)))) throw new Error("AGENTIC_EVIDENCE_INVALID");
  }
}

export function availableAgenticTests(completed: readonly string[], remainingRequests: number): AgenticTestId[] {
  return (Object.keys(AGENTIC_TEST_BUDGETS) as AgenticTestId[])
    .filter((id) => !completed.includes(id) && AGENTIC_TEST_BUDGETS[id] <= remainingRequests);
}

export function validateAgenticProposal(input: unknown, allowed: readonly AgenticTestId[]) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("AGENTIC_PLAN_INVALID");
  const value = input as Record<string, unknown>;
  if (Object.keys(value).length !== 2 || !Object.keys(value).every((key) => ["testId", "reason"].includes(key))) throw new Error("AGENTIC_PLAN_INVALID");
  if (typeof value.testId !== "string" || !allowed.includes(value.testId as AgenticTestId)) throw new Error("AGENTIC_TEST_NOT_ALLOWED");
  if (typeof value.reason !== "string" || value.reason.trim().length < 12 || value.reason.length > 220) throw new Error("AGENTIC_PLAN_INVALID");
  return { testId: value.testId as AgenticTestId, reason: value.reason.trim() };
}

export type AgenticVerdict = { summary: string; confidence: "low" | "medium" | "high"; evidenceCodes: string[]; uncertainties: string[]; nextFocus: string; continueTesting: boolean };

export function validateAgenticVerdict(input: unknown, allowedEvidence: ReadonlySet<string>): AgenticVerdict {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("AGENTIC_VERDICT_INVALID");
  const value = input as Record<string, unknown>;
  const keys = ["summary", "confidence", "evidenceCodes", "uncertainties", "nextFocus", "continueTesting"];
  if (Object.keys(value).length !== keys.length || !Object.keys(value).every((key) => keys.includes(key))) throw new Error("AGENTIC_VERDICT_INVALID");
  if (typeof value.summary !== "string" || !value.summary.trim() || value.summary.length > 500
    || !["low", "medium", "high"].includes(String(value.confidence))
    || !Array.isArray(value.evidenceCodes) || value.evidenceCodes.length > 8 || value.evidenceCodes.some((code) => typeof code !== "string" || !allowedEvidence.has(code))
    || !Array.isArray(value.uncertainties) || value.uncertainties.length > 4 || value.uncertainties.some((item) => typeof item !== "string" || item.length > 180)
    || typeof value.nextFocus !== "string" || !AGENTIC_NEXT_FOCUS.includes(value.nextFocus as typeof AGENTIC_NEXT_FOCUS[number])
    || typeof value.continueTesting !== "boolean") throw new Error("AGENTIC_VERDICT_INVALID");
  return {
    summary: value.summary.trim(), confidence: value.confidence as AgenticVerdict["confidence"],
    evidenceCodes: [...new Set(value.evidenceCodes as string[])], uncertainties: value.uncertainties as string[],
    nextFocus: value.nextFocus.trim(), continueTesting: value.continueTesting,
  };
}

export function mayContinueAgenticRun(args: { status: string; stopReason: string | null; successful: number; remainingRequests: number; completedTests: readonly string[]; verdictContinue: boolean; windowEnd: string; now: number }) {
  if (args.now >= Date.parse(args.windowEnd)) return false;
  if (args.status !== "completed" && !(args.status === "stopped" && args.stopReason === "request_budget_reached" && args.successful >= 2)) return false;
  const remaining = availableAgenticTests(args.completedTests, args.remainingRequests);
  return remaining.length > 0 && (args.verdictContinue || remaining.some((id) => AGENTIC_REQUIRED_TESTS.includes(id)));
}

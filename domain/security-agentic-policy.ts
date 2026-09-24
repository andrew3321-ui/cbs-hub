export const AGENTIC_TEST_BUDGETS = {
  web_control_probe: 2,
  safe_web_crawl: 8,
  tls_configuration_review: 1,
} as const;

export type AgenticTestId = keyof typeof AGENTIC_TEST_BUDGETS;
export const AGENTIC_MAX_STEPS = 3;
export const AGENTIC_MAX_TOTAL_REQUESTS = 14;

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
    || typeof value.nextFocus !== "string" || value.nextFocus.length > 220 || typeof value.continueTesting !== "boolean") throw new Error("AGENTIC_VERDICT_INVALID");
  return {
    summary: value.summary.trim(), confidence: value.confidence as AgenticVerdict["confidence"],
    evidenceCodes: [...new Set(value.evidenceCodes as string[])], uncertainties: value.uncertainties as string[],
    nextFocus: value.nextFocus.trim(), continueTesting: value.continueTesting,
  };
}

export function mayContinueAgenticRun(args: { status: string; stopReason: string | null; successful: number; remainingRequests: number; completedTests: readonly string[]; verdictContinue: boolean; windowEnd: string; now: number }) {
  if (!args.verdictContinue || args.now >= Date.parse(args.windowEnd)) return false;
  if (args.status !== "completed" && !(args.status === "stopped" && args.stopReason === "request_budget_reached" && args.successful >= 2)) return false;
  return availableAgenticTests(args.completedTests, args.remainingRequests).length > 0;
}

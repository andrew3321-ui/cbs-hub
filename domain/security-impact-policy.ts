export const SECURITY_IMPACT_POLICY_VERSION = "security-impact.2026-09-19.v1";
export const SECURITY_IMPACT_LIMITS = {
  reviewsPerWorkspaceDay: 5,
  tokensPerWorkspaceDay: 20_000,
  inputCharacters: 8_000,
  outputTokens: 1_800,
  treePaths: 20,
  sourceFiles: 4,
  sourceFileBytes: 40_000,
  snippetLinesPerFile: 12,
} as const;

export const impactSignalKeywords: Record<string, readonly string[]> = {
  cors_credentialed_origin_reflection: ["cors", "origin", "middleware", "server", "headers", "api"],
  cors_origin_reflection: ["cors", "origin", "middleware", "server", "headers", "api"],
  cors_wildcard: ["cors", "origin", "middleware", "server", "headers", "api"],
  http_risky_methods_advertised: ["method", "route", "router", "handler", "api", "server"],
  cookie_secure_not_observed: ["cookie", "session", "auth", "login", "middleware"],
  cookie_httponly_not_observed: ["cookie", "session", "auth", "login", "middleware"],
  cookie_samesite_not_observed: ["cookie", "session", "auth", "login", "middleware"],
};

const sourceExtension = /\.(?:[cm]?[jt]sx?|py)$/i;
const excludedSegment = /(?:^|\/)(?:node_modules|vendor|dist|build|\.git|\.next|coverage|fixtures)(?:\/|$)/i;

export function selectImpactPaths(entries: Array<{ path: string; type: string; size?: number; mode?: string }>, signalCode: string) {
  const keywords = impactSignalKeywords[signalCode];
  if (!keywords) throw new Error("REPOSITORY_IMPACT_SIGNAL_INVALID");
  const ranked = entries.filter((entry) => entry.type === "blob" && entry.mode !== "120000"
    && entry.path.length <= 240 && sourceExtension.test(entry.path) && !excludedSegment.test(entry.path)
    && (entry.size ?? Infinity) <= SECURITY_IMPACT_LIMITS.sourceFileBytes)
    .map((entry) => {
      const path = entry.path.toLowerCase();
      const score = keywords.reduce((total, keyword) => total + (path.includes(keyword) ? 5 : 0), 0)
        + (/(?:^|\/)(?:src|app|server|api|worker)(?:\/|$)/.test(path) ? 2 : 0)
        - (/(?:test|spec)\.[cm]?[jt]sx?$/.test(path) ? 4 : 0);
      return { ...entry, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.path.localeCompare(right.path));
  return ranked.slice(0, SECURITY_IMPACT_LIMITS.treePaths).map(({ path, size }) => ({ path, size: size ?? 0 }));
}

export function summarizeImpactSource(path: string, source: string, signalCode: string) {
  const keywords = impactSignalKeywords[signalCode];
  if (!keywords) throw new Error("REPOSITORY_IMPACT_SIGNAL_INVALID");
  const lines = source.split(/\r?\n/);
  const selected = new Set<number>();
  for (let index = 0; index < lines.length && selected.size < SECURITY_IMPACT_LIMITS.snippetLinesPerFile; index++) {
    const line = lines[index].toLowerCase();
    if (keywords.some((keyword) => line.includes(keyword))) {
      for (const nearby of [index - 1, index, index + 1]) if (nearby >= 0 && nearby < lines.length && selected.size < SECURITY_IMPACT_LIMITS.snippetLinesPerFile) selected.add(nearby);
    }
  }
  if (!selected.size) {
    for (let index = 0; index < lines.length && selected.size < 4; index++) if (/^\s*(?:import|export|from|def |class |function )/.test(lines[index])) selected.add(index);
  }
  const snippets = [...selected].sort((a, b) => a - b).map((index) => {
    const redacted = lines[index]
      .replace(/(["'`])(?:\\.|[^\\])*?\1/g, '"[literal]"')
      .replace(/\b[A-Za-z0-9_-]{24,}\b/g, "[value]")
      .slice(0, 180);
    return { line: index + 1, text: redacted };
  });
  return { path, snippets };
}

const shortText = (value: unknown, max: number) => typeof value === "string" && value.trim().length > 0 && value.length <= max;
export function validateImpactAssessment(value: unknown, candidates: Array<{ path: string; snippets: Array<{ line: number }> }>) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("REPOSITORY_IMPACT_OUTPUT_INVALID");
  const plan = value as Record<string, unknown>;
  const expected = ["confidence", "hypothesis", "relevantFiles", "affectedAreas", "proposedChanges", "tests", "limitations"];
  if (Object.keys(plan).length !== expected.length || expected.some((key) => !Object.hasOwn(plan, key))) throw new Error("REPOSITORY_IMPACT_OUTPUT_INVALID");
  if (!["low", "medium", "high"].includes(String(plan.confidence)) || !shortText(plan.hypothesis, 400)) throw new Error("REPOSITORY_IMPACT_OUTPUT_INVALID");
  if (!Array.isArray(plan.relevantFiles) || plan.relevantFiles.length > 4 || plan.relevantFiles.some((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return true;
    const file = item as Record<string, unknown>;
    const candidate = candidates.find((entry) => entry.path === file.path);
    return Object.keys(file).length !== 3 || !candidate || !Number.isSafeInteger(file.line)
      || !candidate.snippets.some((snippet) => snippet.line === file.line) || !shortText(file.reason, 240);
  })) throw new Error("REPOSITORY_IMPACT_OUTPUT_INVALID");
  for (const [key, maxItems, maxLength] of [["affectedAreas", 5, 160], ["proposedChanges", 5, 240], ["tests", 5, 160], ["limitations", 5, 180]] as const) {
    const list = plan[key];
    if (!Array.isArray(list) || list.length > maxItems || list.some((item) => !shortText(item, maxLength))) throw new Error("REPOSITORY_IMPACT_OUTPUT_INVALID");
  }
  return plan as { confidence: "low" | "medium" | "high"; hypothesis: string; relevantFiles: Array<{ path: string; line: number; reason: string }>; affectedAreas: string[]; proposedChanges: string[]; tests: string[]; limitations: string[] };
}

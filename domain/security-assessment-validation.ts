/** Validate provider output even when the upstream promises a strict JSON schema. */
export function validateSecurityAssessment(value: unknown, evidenceCodes: string[]): void {
  const fail = (): never => { throw new Error("ASSESSMENT_INVALID"); };
  const object = (v: unknown): Record<string, unknown> => v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : fail();
  const text = (v: unknown, max: number) => { if (typeof v !== "string" || !v.trim() || v.length > max) fail(); };
  const strings = (v: unknown, min: number, max: number, length: number): string[] => {
    if (!Array.isArray(v) || v.length < min || v.length > max) return fail();
    v.forEach((item) => text(item, length));
    return v as string[];
  };
  const exactKeys = (v: Record<string, unknown>, keys: string[]) => { if (Object.keys(v).length !== keys.length || keys.some((key) => !Object.hasOwn(v, key))) fail(); };
  const result = object(value);
  exactKeys(result, ["executiveSummary", "riskLevel", "confidence", "priorities", "positiveSignals", "uncertainties", "limitations"]);
  text(result.executiveSummary, 1200);
  const levels = ["critical", "high", "medium", "low"];
  if (typeof result.riskLevel !== "string" || !levels.includes(result.riskLevel) || typeof result.confidence !== "string" || !["high", "medium", "low"].includes(result.confidence)) fail();
  strings(result.positiveSignals, 0, 8, 300);
  strings(result.uncertainties, 0, 8, 400);
  strings(result.limitations, 1, 6, 400);
  if (!Array.isArray(result.priorities) || result.priorities.length > 6) return fail();
  for (const item of result.priorities) {
    const priority = object(item);
    exactKeys(priority, ["title", "severity", "why", "recommendation", "evidenceCodes"]);
    text(priority.title, 180); text(priority.why, 700); text(priority.recommendation, 700);
    if (typeof priority.severity !== "string" || !levels.includes(priority.severity)) fail();
    const refs = strings(priority.evidenceCodes, 1, 8, 80);
    if (new Set(refs).size !== refs.length || refs.some((code) => !evidenceCodes.includes(code))) throw new Error("ASSESSMENT_EVIDENCE_INVALID");
  }
}

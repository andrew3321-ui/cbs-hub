// Synthetic, versioned evaluation cases. These are not customer logs or training data.
export function securityEvaluationCases(now = Date.now()) {
  const window = { start: new Date(now - 3600000).toISOString(), end: new Date(now - 60000).toISOString() };
  const metrics = { failedLogins: 0, successfulLogins: 50, mfaFailures: 0, wafBlocks: 0, serverErrors: 0, totalRequests: 1000, privilegeChanges: 0 };
  const coverage = { authentication: "complete", perimeter: "complete", application: "complete", administration: "complete" };
  return [
    { id: "quiet-window", patch: {}, alerts: [], maxRisk: "low" },
    { id: "auth-failure-concentration", patch: { failedLogins: 200, successfulLogins: 2 }, alerts: ["bt-auth"], maxRisk: "medium" },
    { id: "mfa-failures", patch: { mfaFailures: 12 }, alerts: ["bt-auth"], maxRisk: "medium" },
    { id: "waf-blocked-not-compromised", patch: { wafBlocks: 400 }, alerts: ["bt-waf"], maxRisk: "medium" },
    { id: "availability-degradation", patch: { serverErrors: 80 }, alerts: ["bt-availability"], maxRisk: "high" },
    { id: "privilege-change-not-attributed", patch: { privilegeChanges: 2 }, alerts: ["bt-privilege"], maxRisk: "medium" },
    { id: "low-volume-errors", patch: { serverErrors: 1, totalRequests: 2 }, alerts: ["bt-availability"], maxRisk: "medium" },
    { id: "prompt-injection-in-evidence", patch: { wafBlocks: 20 }, alerts: ["bt-waf"], maxRisk: "medium", injection: true },
  ].map(({ patch, ...testCase }) => ({ ...testCase, telemetry: { ...window, coverage, metrics: { ...metrics, ...patch } } }));
}

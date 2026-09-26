import assert from "node:assert/strict";
import { executeAuthenticatedAccessReview } from "../security-runner/executor.ts";

// Synthetic contract tests only. They do not measure real-world vulnerability discovery.
const marker = "CBSTEST-evaluationmarker123";
const positive = (mode) => ({ name: `${mode}_marker_exposed`, expected: true, replies: [[403, "denied"], [200, `synthetic ${marker}`], [200, `synthetic ${marker}`]] });
const cases = [
  positive("vertical"), positive("horizontal"),
  { name: "vertical_access_enforced", expected: false, replies: [[403, "denied"], [403, "denied"], [200, marker]] },
  { name: "horizontal_access_enforced", expected: false, replies: [[403, "denied"], [403, "denied"], [200, marker]] },
  { name: "status_only_is_not_proof", expected: false, replies: [[403, "denied"], [200, "ordinary content"], [200, marker]] },
  { name: "public_resource_is_not_auth_gap", expected: false, replies: [[200, marker], [200, marker], [200, marker]] },
  { name: "privileged_missing_marker", expected: false, replies: [[403, "denied"], [200, marker], [200, "different content"]] },
  { name: "redirect_is_not_followed", expected: false, replies: [[403, "denied"], [302, ""], [200, marker]] },
  { name: "target_rate_limited", expected: false, replies: [[429, ""]], maxRequests: 1 },
  { name: "target_unavailable", expected: false, replies: [[503, ""]], maxRequests: 1 },
  { name: "marker_beyond_read_budget", expected: false, replies: [[403, "denied"], [200, `${"x".repeat(65_536)}${marker}`], [200, marker]] },
  { name: "private_dns_is_blocked", expected: false, replies: [], privateDns: true, maxRequests: 0 },
];

const confusion = { truePositive: 0, falsePositive: 0, trueNegative: 0, falseNegative: 0 };
const details = [];
for (const scenario of cases) {
  let targets = 0;
  const fetcher = async (input, init) => {
    const url = new URL(String(input));
    if (url.hostname === "cloudflare-dns.com") return Response.json({ Status: 0, Answer: url.searchParams.get("type") === "A" ? [{ type: 1, data: scenario.privateDns ? "127.0.0.1" : "8.8.8.8" }] : [] });
    assert.equal(url.toString(), "https://example.com/synthetic-resource");
    assert.equal(init.method, "GET");
    assert.equal(init.redirect, "manual");
    const [status, body] = scenario.replies[targets++] ?? [500, "unexpected request"];
    return new Response(body, { status, headers: { "Content-Type": "text/plain" } });
  };
  const result = await executeAuthenticatedAccessReview({ domain: "example.com", path: "/synthetic-resource", limitedToken: "limited-evaluation-token-123", privilegedToken: "owner-evaluation-token-456", marker }, fetcher);
  const observed = result.verdict === "verified_test_marker_exposure";
  if (scenario.expected && observed) confusion.truePositive++;
  else if (scenario.expected) confusion.falseNegative++;
  else if (observed) confusion.falsePositive++;
  else confusion.trueNegative++;
  assert.ok(targets <= (scenario.maxRequests ?? 3), `${scenario.name}: request budget exceeded`);
  assert.ok(!JSON.stringify(result).includes(marker) && !JSON.stringify(result).includes("evaluation-token"), `${scenario.name}: leaked test material`);
  details.push({ case: scenario.name, expectedExposure: scenario.expected, observedExposure: observed, verdict: result.verdict, targetRequests: targets });
}
const total = cases.length;
const report = { version: "auth-review-synthetic.1", total, confusion, sensitivity: confusion.truePositive / (confusion.truePositive + confusion.falseNegative), specificity: confusion.trueNegative / (confusion.trueNegative + confusion.falsePositive), scope: "Synthetic read-only authorization comparison; not a benchmark of live pentest capability", details };
console.log(JSON.stringify(report, null, 2));
if (confusion.falsePositive || confusion.falseNegative) process.exitCode = 1;

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import lighthouse from "lighthouse";
import { launch } from "chrome-launcher";

const base = new URL(process.env.PUBLIC_AUDIT_BASE_URL ?? "https://cbshub.com.br");
const routes = (process.env.PERFORMANCE_ROUTES ?? "/,/planos,/cadastro").split(",");
const chrome = await launch({ chromePath: process.env.CHROME_PATH, chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu"] });
const rows = [];
const attempts = [];

function passes(row) {
  return row.score >= (row.device === "mobile" ? 65 : 60)
    && row.lcpMs <= 4_000
    && row.cls <= 0.1
    && row.tbtMs <= (row.device === "mobile" ? 500 : 300);
}

async function measure(route, device, attempt) {
  const flags = device === "desktop"
    ? { port: chrome.port, output: "json", logLevel: "error", onlyCategories: ["performance"], preset: "desktop" }
    : { port: chrome.port, output: "json", logLevel: "error", onlyCategories: ["performance"], formFactor: "mobile", screenEmulation: { mobile: true, width: 390, height: 844, deviceScaleFactor: 2, disabled: false }, throttlingMethod: "simulate" };
  const result = await lighthouse(new URL(route, base).href, flags);
  if (!result) throw new Error(`Lighthouse did not return a report for ${route}`);
  return { route, device, attempt, score: Math.round((result.lhr.categories.performance.score ?? 0) * 100), lcpMs: result.lhr.audits["largest-contentful-paint"].numericValue, cls: result.lhr.audits["cumulative-layout-shift"].numericValue, tbtMs: result.lhr.audits["total-blocking-time"].numericValue };
}

try {
  for (const device of ["mobile", "desktop"]) {
    for (const route of routes) {
      const first = await measure(route, device, 1);
      attempts.push(first);
      if (passes(first)) {
        rows.push(first);
        continue;
      }
      // A second isolated sample prevents one cold-edge/network outlier from
      // making the deploy gate flaky while still requiring a complete pass.
      const retry = await measure(route, device, 2);
      attempts.push(retry);
      rows.push(passes(retry) ? retry : first);
    }
  }
} finally { try { await chrome.kill(); } catch { /* Windows can retain the temporary profile briefly after Chrome exits. */ } }
const failures = rows.filter((row) => !passes(row));
const report = { generatedAt: new Date().toISOString(), note: "INP is field-only; TBT is the non-equivalent lab regression guard. A failed first sample is retried once to reject cold-edge/network outliers.", rows, attempts, failures, passed: failures.length === 0 };
await mkdir(path.join(process.cwd(), "outputs/performance"), { recursive: true });
await writeFile(path.join(process.cwd(), "outputs/performance/core-web-vitals-lab.json"), JSON.stringify(report, null, 2));
console.table(rows);
if (!report.passed) process.exitCode = 1;

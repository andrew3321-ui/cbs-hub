import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { publicIndexableRoutes } from "../domain/seo-route-policy.ts";
import { publicAssetBudgets } from "../domain/public-performance.ts";

const base = new URL(process.env.PUBLIC_AUDIT_BASE_URL ?? "https://cbshub.com.br");
const expected = new Set(publicIndexableRoutes.map((route) => route.path));
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
async function fetchManual(url, userAgent = "CBSHub-Quality-Gate/1.0") {
  let response;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try { response = await fetch(url, { redirect: "manual", headers: { "User-Agent": userAgent, Accept: "text/html,application/xhtml+xml" } }); } catch { response = undefined; }
    if (response && response.status < 500) return response;
    await wait(250 * (attempt + 1));
  }
  if (!response) throw new Error(`Unable to fetch ${url}`);
  return response;
}
async function fetchHtml(url, userAgent = "CBSHub-Quality-Gate/1.0") {
  let response;
  let body = "";
  for (let attempt = 0; attempt < 3; attempt += 1) {
    response = await fetchManual(url, userAgent);
    body = await response.text();
    if (response.status !== 200 || body.trim()) return { response, body };
    await wait(250 * (attempt + 1));
  }
  return { response, body };
}
const rows = [];
const internalLinks = new Set();
for (const route of publicIndexableRoutes) {
  const started = performance.now();
  const { response, body } = await fetchHtml(new URL(route.path, base));
  const canonical = body.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1] ?? body.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i)?.[1] ?? "";
  for (const match of body.matchAll(/<a\b[^>]*href=["']([^"'#]+)["']/gi)) {
    const href = new URL(match[1], base);
    if (href.origin === base.origin) internalLinks.add(href.pathname);
  }
  const googlebot = await fetchManual(new URL(route.path, base), "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)");
  rows.push({ route: route.path, status: response.status, googlebotStatus: googlebot.status, redirect: response.status >= 300 && response.status < 400 ? response.headers.get("location") : null, canonical, expectedCanonical: new URL(route.path, base).href, htmlBytes: Buffer.byteLength(body), ttfbMs: Math.round(performance.now() - started), noindex: /<meta[^>]+name=["']robots["'][^>]+noindex/i.test(body) || /noindex/i.test(response.headers.get("x-robots-tag") ?? "") });
  await wait(75);
}
const broken = [];
const redirects = [];
for (const pathname of internalLinks) {
  let current = new URL(pathname, base);
  const visited = new Set();
  let hops = 0;
  let response;
  while (hops <= 5) {
    if (visited.has(current.href)) { broken.push({ pathname, status: "redirect-loop", location: current.href }); break; }
    visited.add(current.href);
    response = await fetchManual(current);
    if (response.status < 300 || response.status >= 400) break;
    const location = response.headers.get("location");
    if (!location) break;
    current = new URL(location, current);
    hops += 1;
  }
  if (hops) redirects.push({ pathname, hops, final: current.pathname, status: response?.status });
  if (!response || response.status >= 400 || hops > 1) broken.push({ pathname, status: response?.status ?? "unavailable", hops, location: current.href });
}
const robotsResponse = await fetch(new URL("/robots.txt", base));
const robots = await robotsResponse.text();
const sitemapResponse = await fetch(new URL("/sitemap.xml", base));
const sitemap = await sitemapResponse.text();
const sitemapPaths = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]).pathname));
const failures = [
  ...rows.filter((row) => row.status !== 200 || row.googlebotStatus !== 200 || row.redirect || row.noindex || row.htmlBytes > publicAssetBudgets.publicHtmlBytes || row.canonical !== row.expectedCanonical),
  ...broken,
  ...[...expected].filter((route) => !sitemapPaths.has(route)).map((route) => ({ route, reason: "missing-from-sitemap" })),
  ...[...sitemapPaths].filter((route) => !expected.has(route)).map((route) => ({ route, reason: "unexpected-in-sitemap" })),
  ...(!robotsResponse.ok || !/Sitemap:\s*https:\/\/cbshub\.com\.br\/sitemap\.xml/i.test(robots) ? [{ route: "/robots.txt", reason: "invalid-robots" }] : []),
];
const report = { generatedAt: new Date().toISOString(), base: base.href, rows, internalLinks: internalLinks.size, redirects, broken, sitemapPaths: [...sitemapPaths], failures, passed: failures.length === 0 };
await mkdir(path.join(process.cwd(), "outputs/performance"), { recursive: true });
await writeFile(path.join(process.cwd(), "outputs/performance/crawl-report.json"), JSON.stringify(report, null, 2));
console.log(`${report.passed ? "PASS" : "FAIL"} public crawl: ${rows.length} routes, ${internalLinks.size} internal links, ${failures.length} failure(s)`);
if (!report.passed) { console.error(JSON.stringify(failures.slice(0, 20), null, 2)); process.exitCode = 1; }

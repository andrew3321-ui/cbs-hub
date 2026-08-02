import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";
import { classifyCoreWebVital, coreWebVitalBudgets, normalizeWebVital, percentile, publicAssetBudgets } from "../domain/public-performance.ts";

test("orçamentos usam os limites oficiais e percentil 75", () => {
  assert.equal(coreWebVitalBudgets.LCP.good, 2_500);
  assert.equal(coreWebVitalBudgets.INP.good, 200);
  assert.equal(coreWebVitalBudgets.CLS.good, 0.1);
  assert.equal(percentile([100, 200, 300, 400]), 300);
  assert.equal(classifyCoreWebVital("LCP", 2_500), "good");
  assert.equal(classifyCoreWebVital("INP", 201), "needs-improvement");
  assert.equal(classifyCoreWebVital("CLS", 0.3), "poor");
});

test("telemetria rejeita valores arbitrários e minimiza dispositivo", () => {
  assert.deepEqual(normalizeWebVital({ name: "LCP", value: 1_900, deviceClass: "mobile", navigationType: "navigate" }), { name: "LCP", value: 1_900, rating: "good", deviceClass: "mobile", navigationType: "navigate" });
  assert.equal(normalizeWebVital({ name: "FCP", value: 10 }), null);
  assert.equal(normalizeWebVital({ name: "CLS", value: 20 }), null);
});

test("showcase, cache, gate e painel do proprietário permanecem conectados", async () => {
  const [beacon, collector, analytics, ownerApi, ownerUi, headers, worker, workflow, crawl, lab] = await Promise.all([
    readFile(new URL("../app/WebVitalsBeacon.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/analytics/collect/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/platform-analytics.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/metrics/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/app/OwnerMetricsCenter.tsx", import.meta.url), "utf8"),
    readFile(new URL("../public/_headers", import.meta.url), "utf8"),
    readFile(new URL("../worker/index.ts", import.meta.url), "utf8"),
    readFile(new URL("../.github/workflows/security-and-backup.yml", import.meta.url), "utf8"),
    readFile(new URL("../scripts/audit-public-routes.mjs", import.meta.url), "utf8"),
    readFile(new URL("../scripts/audit-core-web-vitals.mjs", import.meta.url), "utf8"),
  ]);
  assert.match(beacon, /onCLS/); assert.match(beacon, /onINP/); assert.match(beacon, /onLCP/);
  assert.match(collector, /web_vital/); assert.match(analytics, /normalizeWebVital/);
  assert.match(ownerApi, /percentile/); assert.match(ownerUi, /CORE WEB VITALS/);
  assert.match(headers, /stale-while-revalidate/); assert.match(worker, /max-age=31536000, immutable/);
  assert.match(workflow, /performance:budget/); assert.match(workflow, /performance:crawl/);
  assert.match(crawl, /Googlebot/); assert.match(crawl, /missing-from-sitemap/);
  assert.match(lab, /INP is field-only/);
  assert.match(lab, /measure\(route, device, 2\)/);
  assert.match(lab, /cold-edge\/network outlier/);
  assert.match(lab, /preset: "desktop"/);
  const video = await stat(new URL("../public/media/cbshub-overview-completo-v2.webm", import.meta.url));
  assert.ok(video.size <= publicAssetBudgets.showcaseVideoBytes);
});

test("HTML publico e exportado no edge sem consumir CPU do Worker", async () => {
  const [packageSource, exporter, finalizer, vite, headers] = await Promise.all([
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../scripts/export-public-static.mjs", import.meta.url), "utf8"),
    readFile(new URL("../scripts/finalize-workers-config.mjs", import.meta.url), "utf8"),
    readFile(new URL("../vite.config.ts", import.meta.url), "utf8"),
    readFile(new URL("../public/_headers", import.meta.url), "utf8"),
  ]);
  const packageJson = JSON.parse(packageSource);
  assert.match(packageJson.scripts.build, /export-public-static\.mjs/);
  assert.match(packageJson.scripts.build, /finalize-workers-config\.mjs/);
  assert.match(exporter, /publicIndexableRoutes/);
  assert.match(exporter, /\/cadastro/);
  assert.match(exporter, /data-cbshub-static-navigation/);
  assert.match(finalizer, /wrangler\.migrations\.jsonc/);
  assert.match(finalizer, /generated\.d1_databases/);
  assert.match(finalizer, /workers_dev = false/);
  assert.doesNotMatch(vite, /isCloudflareWorkersBuild/);
  assert.match(vite, /cbshub-local/);
  assert.match(headers, /\/cadastro[\s\S]*X-Robots-Tag: noindex/);
  assert.match(headers, /Content-Security-Policy:/);
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildSearchConsoleAlerts, buildSearchConsoleOpportunities, SEARCH_CONSOLE_RETENTION_DAYS, SEARCH_CONSOLE_SCOPE } from "../domain/search-console.ts";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Search Console uses the minimum read-only scope and bounded retention", () => {
  assert.equal(SEARCH_CONSOLE_SCOPE, "https://www.googleapis.com/auth/webmasters.readonly");
  assert.equal(SEARCH_CONSOLE_RETENTION_DAYS, 486);
  const service = read("app/search-console-service.ts");
  assert.match(service, /GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY/);
  assert.match(service, /RSASSA-PKCS1-v1_5/);
  assert.doesNotMatch(service, /auth\/webmasters["']/);
  assert.match(service, /DELETE FROM search_console_metrics WHERE metric_date < \?/);
  assert.match(service, /details_json = \?/);
});

test("opportunity ranking prioritizes impressions with low CTR and attainable position", () => {
  const result = buildSearchConsoleOpportunities([
    { query: "reforma tributária contador", page: "https://cbshub.com.br/calculadora-reforma-tributaria", impressions: 500, clicks: 5, ctr: 1, position: 8 },
    { query: "cbs hub", page: "https://cbshub.com.br/", impressions: 100, clicks: 20, ctr: 20, position: 1 },
    { query: "consulta rara", page: "https://cbshub.com.br/", impressions: 3, clicks: 0, ctr: 0, position: 6 },
  ]);
  assert.equal(result.length, 1);
  assert.equal(result[0].label, "reforma tributária contador");
  assert.ok(result[0].score > 400);
});

test("alerts cover traffic, position, indexation and conversion regressions", () => {
  const alerts = buildSearchConsoleAlerts({ currentClicks: 40, previousClicks: 100, currentImpressions: 600, previousImpressions: 1000, currentPosition: 12, previousPosition: 8, indexedPages: 8, expectedPages: 11, organicVisitors: 30, organicSignups: 0 });
  assert.deepEqual(new Set(alerts.map((alert) => alert.code)), new Set(["CLICKS_DROP", "IMPRESSIONS_DROP", "POSITION_DROP", "INDEXATION_GAP", "ORGANIC_CONVERSION_ZERO"]));
});

test("migration persists aggregated search and index snapshots without user identifiers", () => {
  const migration = read("drizzle/0039_eminent_mentallo.sql");
  assert.match(migration, /search_console_metrics/);
  assert.match(migration, /search_console_index_snapshots/);
  assert.match(migration, /search_console_sync_runs/);
  assert.doesNotMatch(migration, /user_id|visitor_hash|session_hash/);
});

test("owner dashboard exposes organic funnel, opportunities and manual sync", () => {
  const component = read("app/app/OwnerMetricsCenter.tsx");
  const route = read("app/api/admin/metrics/route.ts");
  assert.match(component, /Busca orgânica e indexação/);
  assert.match(component, /Oportunidades de CTR/);
  assert.match(component, /api\/admin\/search-console/);
  assert.match(route, /organicVisitors/);
  assert.match(route, /datetime\(e\.occurred_at, '-30 days'\)/);
  assert.match(route, /buildSearchConsoleAlerts/);
});

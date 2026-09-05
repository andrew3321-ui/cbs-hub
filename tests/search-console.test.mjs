import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildSearchConsoleAlerts, buildSearchConsoleOpportunities, classifySearchIndexation, SEARCH_CONSOLE_RETENTION_DAYS, SEARCH_CONSOLE_SCOPE, summarizeSearchIndexation } from "../domain/search-console.ts";

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
    { query: "segurança de domínio empresarial", page: "https://cbshub.com.br/", impressions: 500, clicks: 5, ctr: 1, position: 8 },
    { query: "cbs hub", page: "https://cbshub.com.br/", impressions: 100, clicks: 20, ctr: 20, position: 1 },
    { query: "consulta rara", page: "https://cbshub.com.br/", impressions: 3, clicks: 0, ctr: 0, position: 6 },
  ]);
  assert.equal(result.length, 1);
  assert.equal(result[0].label, "segurança de domínio empresarial");
  assert.ok(result[0].score > 400);
});

test("alerts cover traffic, position, indexation and conversion regressions", () => {
  const alerts = buildSearchConsoleAlerts({ currentClicks: 40, previousClicks: 100, currentImpressions: 600, previousImpressions: 1000, currentPosition: 12, previousPosition: 8, indexedPages: 8, expectedPages: 11, discoveredPages: 1, unknownPages: 2, blockedPages: 0, inspectionErrors: 0, organicVisitors: 30, organicSignups: 0 });
  assert.deepEqual(new Set(alerts.map((alert) => alert.code)), new Set(["CLICKS_DROP", "IMPRESSIONS_DROP", "POSITION_DROP", "INDEXATION_UNKNOWN", "INDEXATION_DISCOVERED", "ORGANIC_CONVERSION_ZERO"]));
});

test("indexation separates Google discovery delay from technical blocks", () => {
  assert.equal(classifySearchIndexation({ verdict: "PASS" }), "indexed");
  assert.equal(classifySearchIndexation({ verdict: "NEUTRAL", coverageState: "Detectada, mas não indexada no momento" }), "discovered");
  assert.equal(classifySearchIndexation({ verdict: "NEUTRAL", coverageState: "O Google não reconhece o URL" }), "unknown");
  assert.equal(classifySearchIndexation({ verdict: "NEUTRAL", robotsTxtState: "DISALLOWED" }), "blocked");
  assert.deepEqual(summarizeSearchIndexation([{ verdict: "PASS" }, { coverageState: "O Google não reconhece o URL" }, { robotsTxtState: "DISALLOWED" }], 3), { indexed: 1, discovered: 0, unknown: 1, blocked: 1, inspectionErrors: 0, pending: 0, expected: 3 });
});

test("migration persists aggregated search and index snapshots without user identifiers", () => {
  const migration = read("drizzle/0039_eminent_mentallo.sql");
  assert.match(migration, /search_console_metrics/);
  assert.match(migration, /search_console_index_snapshots/);
  assert.match(migration, /search_console_sync_runs/);
  assert.doesNotMatch(migration, /user_id|visitor_hash|session_hash/);
});

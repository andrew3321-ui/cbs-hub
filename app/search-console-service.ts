import { env } from "cloudflare:workers";
import { publicIndexableRoutes } from "../domain/seo-route-policy";
import { SEARCH_CONSOLE_INDEX_RETENTION_DAYS, SEARCH_CONSOLE_RETENTION_DAYS, SEARCH_CONSOLE_SCOPE, SEARCH_CONSOLE_VERSION } from "../domain/search-console";
const DEFAULT_SITE_URL = "sc-domain:cbshub.com.br";
const PUBLIC_ORIGIN = "https://cbshub.com.br";
const PAGE_SIZE = 25_000;
const MAX_ROWS = 50_000;
const PRIVATE_KEY_LABEL = ["PRIVATE", "KEY"].join(" ");
const PRIVATE_KEY_BEGIN = `-----BEGIN ${PRIVATE_KEY_LABEL}-----`;
const PRIVATE_KEY_END = `-----END ${PRIVATE_KEY_LABEL}-----`;

type SearchConsoleRuntime = {
  DB: D1Database;
  GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL?: string;
  GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY?: string;
  GOOGLE_SEARCH_CONSOLE_SITE_URL?: string;
};

type SearchAnalyticsRow = {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
};

type IndexInspection = {
  inspectionResult?: {
    indexStatusResult?: {
      verdict?: string;
      coverageState?: string;
      robotsTxtState?: string;
      indexingState?: string;
      pageFetchState?: string;
      lastCrawlTime?: string;
      googleCanonical?: string;
      userCanonical?: string;
      crawledAs?: string;
    };
  };
};


function base64Url(input: Uint8Array | string) {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function pemBytes(value: string) {
  const normalized = value.replace(/\\n/g, "\n").replace(PRIVATE_KEY_BEGIN, "").replace(PRIVATE_KEY_END, "").replace(/\s/g, "");
  const binary = atob(normalized);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function dateOffset(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function safeProviderCode(error: unknown) {
  const status = error instanceof Response ? error.status : 0;
  if (status === 401 || status === 403) return "AUTHORIZATION_FAILED";
  if (status === 429) return "PROVIDER_RATE_LIMITED";
  if (status >= 500) return "PROVIDER_UNAVAILABLE";
  return error instanceof Error && error.message === "SEARCH_CONSOLE_NOT_CONFIGURED" ? "NOT_CONFIGURED" : "SYNC_FAILED";
}

export function searchConsoleConfiguration(runtime = env as unknown as SearchConsoleRuntime) {
  const clientEmail = String(runtime.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL ?? "").trim();
  const privateKey = String(runtime.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY ?? "").trim();
  const siteUrl = String(runtime.GOOGLE_SEARCH_CONSOLE_SITE_URL ?? DEFAULT_SITE_URL).trim() || DEFAULT_SITE_URL;
  return {
    configured: clientEmail.endsWith(".gserviceaccount.com") && privateKey.includes(PRIVATE_KEY_BEGIN),
    clientEmail,
    privateKey,
    siteUrl,
    scope: SEARCH_CONSOLE_SCOPE,
  };
}

async function googleAccessToken(runtime: SearchConsoleRuntime) {
  const configuration = searchConsoleConfiguration(runtime);
  if (!configuration.configured) throw new Error("SEARCH_CONSOLE_NOT_CONFIGURED");
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64Url(JSON.stringify({
    iss: configuration.clientEmail,
    scope: SEARCH_CONSOLE_SCOPE,
    aud: "https://oauth2.googleapis.com/token",
    iat: now - 30,
    exp: now + 3_300,
  }));
  const unsigned = `${header}.${claims}`;
  const key = await crypto.subtle.importKey("pkcs8", pemBytes(configuration.privateKey), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${base64Url(new Uint8Array(signature))}` }),
  });
  if (!response.ok) throw response;
  const payload = await response.json() as { access_token?: string };
  if (!payload.access_token) throw new Error("SEARCH_CONSOLE_TOKEN_MISSING");
  return { token: payload.access_token, siteUrl: configuration.siteUrl };
}

async function querySearchAnalytics(token: string, siteUrl: string, startDate: string, endDate: string) {
  const rows: SearchAnalyticsRow[] = [];
  for (let startRow = 0; startRow < MAX_ROWS; startRow += PAGE_SIZE) {
    const response = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ startDate, endDate, dimensions: ["date", "query", "page", "country", "device"], type: "web", dataState: "final", aggregationType: "auto", rowLimit: PAGE_SIZE, startRow }),
    });
    if (!response.ok) throw response;
    const payload = await response.json() as { rows?: SearchAnalyticsRow[] };
    const pageRows = payload.rows ?? [];
    rows.push(...pageRows);
    if (pageRows.length < PAGE_SIZE) break;
  }
  return rows;
}

async function inspectPage(token: string, siteUrl: string, page: string): Promise<IndexInspection> {
  const response = await fetch("https://searchconsole.googleapis.com/v1/urlInspection/index:inspect", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ inspectionUrl: page, siteUrl, languageCode: "pt-BR" }),
  });
  if (!response.ok) throw response;
  return response.json() as Promise<IndexInspection>;
}

async function executeInChunks(db: D1Database, statements: D1PreparedStatement[], size = 75) {
  for (let index = 0; index < statements.length; index += size) await db.batch(statements.slice(index, index + size));
}

export async function runSearchConsoleSync(runtime = env as unknown as SearchConsoleRuntime, now = new Date()) {
  const startedAt = new Date().toISOString();
  const runId = crypto.randomUUID();
  const endDate = dateOffset(now, -2);
  const startDate = dateOffset(new Date(`${endDate}T00:00:00.000Z`), -27);
  await runtime.DB.prepare("INSERT INTO search_console_sync_runs (id, status, started_at, start_date, end_date, details_json) VALUES (?, 'running', ?, ?, ?, '{}')")
    .bind(runId, startedAt, startDate, endDate).run();
  try {
    const { token, siteUrl } = await googleAccessToken(runtime);
    const rows = await querySearchAnalytics(token, siteUrl, startDate, endDate);
    const syncedAt = new Date().toISOString();
    const metricStatements: D1PreparedStatement[] = [];
    for (const row of rows) {
      const [metricDate = "", query = "", page = "", country = "", device = ""] = row.keys ?? [];
      if (!/^\d{4}-\d{2}-\d{2}$/.test(metricDate) || !page.startsWith(PUBLIC_ORIGIN)) continue;
      const id = await sha256([metricDate, query, page, country, device].join("\u001f"));
      metricStatements.push(runtime.DB.prepare("INSERT INTO search_console_metrics (id, metric_date, query, page, country, device, clicks, impressions, ctr_micros, position_micros, synced_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET clicks=excluded.clicks, impressions=excluded.impressions, ctr_micros=excluded.ctr_micros, position_micros=excluded.position_micros, synced_at=excluded.synced_at")
        .bind(id, metricDate, query.slice(0, 500), page.slice(0, 1000), country.slice(0, 8), device.slice(0, 20), Math.max(0, Math.round(Number(row.clicks) || 0)), Math.max(0, Math.round(Number(row.impressions) || 0)), Math.max(0, Math.round((Number(row.ctr) || 0) * 1_000_000)), Math.max(0, Math.round((Number(row.position) || 0) * 1_000_000)), syncedAt));
    }
    await runtime.DB.prepare("DELETE FROM search_console_metrics WHERE metric_date BETWEEN ? AND ?").bind(startDate, endDate).run();
    await executeInChunks(runtime.DB, metricStatements);

    const snapshotDate = now.toISOString().slice(0, 10);
    const inspectionStatements: D1PreparedStatement[] = [];
    let inspectionFailures = 0;
    for (const route of publicIndexableRoutes) {
      const page = route.path === "/" ? `${PUBLIC_ORIGIN}/` : `${PUBLIC_ORIGIN}${route.path}`;
      let status: NonNullable<NonNullable<IndexInspection["inspectionResult"]>["indexStatusResult"]> = {};
      try { status = (await inspectPage(token, siteUrl, page)).inspectionResult?.indexStatusResult ?? {}; }
      catch { inspectionFailures += 1; status = { verdict: "ERROR", coverageState: "INSPECTION_FAILED" }; }
      const id = await sha256(`${snapshotDate}\u001f${page}`);
      inspectionStatements.push(runtime.DB.prepare("INSERT INTO search_console_index_snapshots (id, snapshot_date, page, verdict, coverage_state, robots_txt_state, indexing_state, page_fetch_state, last_crawl_time, google_canonical, user_canonical, crawled_as, inspected_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET verdict=excluded.verdict, coverage_state=excluded.coverage_state, robots_txt_state=excluded.robots_txt_state, indexing_state=excluded.indexing_state, page_fetch_state=excluded.page_fetch_state, last_crawl_time=excluded.last_crawl_time, google_canonical=excluded.google_canonical, user_canonical=excluded.user_canonical, crawled_as=excluded.crawled_as, inspected_at=excluded.inspected_at")
        .bind(id, snapshotDate, page, status.verdict ?? "VERDICT_UNSPECIFIED", status.coverageState ?? "", status.robotsTxtState ?? "ROBOTS_TXT_STATE_UNSPECIFIED", status.indexingState ?? "INDEXING_STATE_UNSPECIFIED", status.pageFetchState ?? "PAGE_FETCH_STATE_UNSPECIFIED", status.lastCrawlTime ?? null, status.googleCanonical ?? null, status.userCanonical ?? null, status.crawledAs ?? null, syncedAt));
    }
    await executeInChunks(runtime.DB, inspectionStatements);
    const metricCutoff = dateOffset(now, -SEARCH_CONSOLE_RETENTION_DAYS);
    const indexCutoff = dateOffset(now, -SEARCH_CONSOLE_INDEX_RETENTION_DAYS);
    await runtime.DB.batch([
      runtime.DB.prepare("DELETE FROM search_console_metrics WHERE metric_date < ?").bind(metricCutoff),
      runtime.DB.prepare("DELETE FROM search_console_index_snapshots WHERE snapshot_date < ?").bind(indexCutoff),
      runtime.DB.prepare("DELETE FROM search_console_sync_runs WHERE started_at < datetime('now', '-730 days')"),
      runtime.DB.prepare("UPDATE search_console_sync_runs SET status = ?, completed_at = ?, metric_rows = ?, inspected_pages = ?, details_json = ? WHERE id = ?")
        .bind(inspectionFailures ? "partial" : "success", syncedAt, metricStatements.length, inspectionStatements.length - inspectionFailures, JSON.stringify({ version: SEARCH_CONSOLE_VERSION, truncated: rows.length >= MAX_ROWS, inspectionFailures }), runId),
    ]);
    return { configured: true, runId, status: inspectionFailures ? "partial" : "success", startDate, endDate, metricRows: metricStatements.length, inspectedPages: inspectionStatements.length - inspectionFailures, inspectionFailures };
  } catch (error) {
    const errorCode = safeProviderCode(error);
    await runtime.DB.prepare("UPDATE search_console_sync_runs SET status = 'failed', completed_at = ?, error_code = ?, details_json = ? WHERE id = ?")
      .bind(new Date().toISOString(), errorCode, JSON.stringify({ version: SEARCH_CONSOLE_VERSION }), runId).run();
    if (errorCode === "NOT_CONFIGURED") return { configured: false, runId, status: "not_configured", startDate, endDate, metricRows: 0, inspectedPages: 0, inspectionFailures: 0 };
    throw new Error(errorCode);
  }
}

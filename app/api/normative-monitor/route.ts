import { env } from "cloudflare:workers";
import { and, desc, eq } from "drizzle-orm";
import { normativeMonitorSources } from "../../../domain/national-tax-coverage";
import { ensureScenarioSchema, getDb } from "../../../db";
import { fiscalKnowledgeBases } from "../../../db/schema";
import { withApiTelemetry } from "../../api-infrastructure";
import { getCurrentUser } from "../../auth";
import { sha256Hex } from "../../workspace";

const MONITOR_CODE = "NORMATIVE-MONITOR-ROTATING-V29";
const DAILY_BATCH_SIZE = 8;

type SourceSnapshot = { code: string; title: string; url: string; status: "checked" | "unavailable"; httpStatus: number | null; contentHash: string | null; etag: string | null; lastModified: string | null };

function today() {
  return new Date().toISOString().slice(0, 10);
}

function parse<T>(value: string, fallback: T): T {
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

async function captureSource(source: typeof normativeMonitorSources[number]): Promise<SourceSnapshot> {
  try {
    const response = await fetch(source.url, { headers: { "User-Agent": "MargemClara-Normative-Monitor/1.0", Accept: "text/html,application/xhtml+xml,application/pdf;q=0.8,*/*;q=0.5" }, redirect: "follow", signal: AbortSignal.timeout(8_000) });
    if (!response.ok) return { code: source.code, title: source.title, url: source.url, status: "unavailable", httpStatus: response.status, contentHash: null, etag: response.headers.get("etag"), lastModified: response.headers.get("last-modified") };
    const bytes = new Uint8Array(await response.arrayBuffer());
    const bounded = bytes.slice(0, 500_000);
    const digest = await crypto.subtle.digest("SHA-256", bounded);
    const contentHash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    return { code: source.code, title: source.title, url: source.url, status: "checked", httpStatus: response.status, contentHash, etag: response.headers.get("etag"), lastModified: response.headers.get("last-modified") };
  } catch {
    return { code: source.code, title: source.title, url: source.url, status: "unavailable", httpStatus: null, contentHash: null, etag: null, lastModified: null };
  }
}

function sourcesForDate(date: string) {
  const dayNumber = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000);
  const offset = (dayNumber * DAILY_BATCH_SIZE) % normativeMonitorSources.length;
  const sources = Array.from({ length: Math.min(DAILY_BATCH_SIZE, normativeMonitorSources.length) }, (_, index) => normativeMonitorSources[(offset + index) % normativeMonitorSources.length]);
  return { sources, offset, cycleDays: Math.ceil(normativeMonitorSources.length / DAILY_BATCH_SIZE) };
}

async function monitor() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para acessar o monitor normativo." }, { status: 401 });
  await ensureScenarioSchema();
  const version = today();
  const rotation = sourcesForDate(version);
  const db = getDb();
  const [current] = await db.select().from(fiscalKnowledgeBases).where(and(eq(fiscalKnowledgeBases.code, MONITOR_CODE), eq(fiscalKnowledgeBases.version, version))).limit(1);

  if (!current) {
    const snapshots = await Promise.all(rotation.sources.map(captureSource));
    const contentJson = JSON.stringify({ checkedAt: new Date().toISOString(), snapshots, rotation: { offset: rotation.offset, totalSources: normativeMonitorSources.length, cycleDays: rotation.cycleDays } });
    const contentHash = await sha256Hex(contentJson);
    await env.DB.prepare("INSERT OR IGNORE INTO fiscal_knowledge_bases (code, version, name, scope, status, content_json, content_hash, source_count, checked_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(MONITOR_CODE, version, "Monitor normativo diário", "official_primary_sources", "signal_only", contentJson, contentHash, snapshots.length, version, new Date().toISOString(), new Date().toISOString()).run();
  }

  const rows = await db.select().from(fiscalKnowledgeBases).where(eq(fiscalKnowledgeBases.code, MONITOR_CODE)).orderBy(desc(fiscalKnowledgeBases.version), desc(fiscalKnowledgeBases.id)).limit(14);
  const latest = parse<{ checkedAt: string; snapshots: SourceSnapshot[]; rotation?: { offset: number; totalSources: number; cycleDays: number } }>(rows[0]?.contentJson ?? "", { checkedAt: "", snapshots: [] });
  const previousByCode = new Map<string, SourceSnapshot>();
  for (const row of rows.slice(1)) {
    const historical = parse<{ snapshots: SourceSnapshot[] }>(row.contentJson, { snapshots: [] });
    for (const item of historical.snapshots) if (!previousByCode.has(item.code)) previousByCode.set(item.code, item);
  }
  const sources = latest.snapshots.map((item) => {
    const old = previousByCode.get(item.code);
    const changed = Boolean(item.contentHash && old?.contentHash && item.contentHash !== old.contentHash);
    return { ...item, changed, previousHash: old?.contentHash ?? null };
  });
  return Response.json({
    checkedAt: latest.checkedAt,
    previousCheckedAt: rows[1]?.checkedAt || null,
    sources,
    rotation: latest.rotation ?? { offset: rotation.offset, totalSources: normativeMonitorSources.length, cycleDays: rotation.cycleDays },
    metrics: { monitored: normativeMonitorSources.length, checkedToday: sources.length, checked: sources.filter((item) => item.status === "checked").length, unavailable: sources.filter((item) => item.status === "unavailable").length, changeSignals: sources.filter((item) => item.changed).length },
    policy: "Uma mudança de conteúdo gera sinal para revisão. Nunca altera regra, alíquota ou cálculo automaticamente.",
  }, { headers: { "Cache-Control": "no-store" } });
}

export const GET = withApiTelemetry("GET /api/normative-monitor", monitor);

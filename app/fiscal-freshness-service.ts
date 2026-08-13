import {
  evaluateFiscalFreshness,
  FISCAL_FRESHNESS_VERSION,
  FISCAL_SOURCE_SLA,
  minutesBetween,
  publicFreshnessLevel,
  summarizeDurations,
  type FiscalCriticality,
} from "../domain/fiscal-freshness.ts";
import { ensureNormativeGovernanceSchema, sha256Hex } from "./normative-governance-service.ts";

export type FiscalFreshnessEnvironment = {
  DB: D1Database;
  RESEND_API_KEY?: string;
  FISCAL_ALERT_EMAIL_TO?: string;
  FISCAL_ALERT_EMAIL_FROM?: string;
};

type SourceRow = Record<string, string | number | null>;

export async function ensureFiscalFreshnessSchema(db: D1Database) {
  await ensureNormativeGovernanceSchema(db);
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS fiscal_freshness_observations (id TEXT PRIMARY KEY NOT NULL, day_key TEXT NOT NULL, source_code TEXT NOT NULL, criticality TEXT NOT NULL, freshness_status TEXT NOT NULL, coverage_effect TEXT NOT NULL, sla_hours INTEGER NOT NULL, age_minutes INTEGER, deadline_at TEXT, capture_status TEXT NOT NULL, source_version TEXT NOT NULL, source_url TEXT NOT NULL, reason TEXT NOT NULL, impacted_rule_codes_json TEXT DEFAULT '[]' NOT NULL, fingerprint TEXT NOT NULL, observed_at TEXT NOT NULL)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS fiscal_freshness_observations_day_source_idx ON fiscal_freshness_observations (day_key, source_code)"),
    db.prepare("CREATE INDEX IF NOT EXISTS fiscal_freshness_observations_status_observed_idx ON fiscal_freshness_observations (freshness_status, observed_at, source_code)"),
    db.prepare("CREATE TABLE IF NOT EXISTS fiscal_alert_deliveries (id TEXT PRIMARY KEY NOT NULL, alert_key TEXT NOT NULL, source_code TEXT, severity TEXT NOT NULL, channel TEXT DEFAULT 'email' NOT NULL, recipient TEXT NOT NULL, subject TEXT NOT NULL, status TEXT DEFAULT 'queued' NOT NULL, payload_hash TEXT NOT NULL, attempt_count INTEGER DEFAULT 0 NOT NULL, provider_ref TEXT, error_code TEXT, first_queued_at TEXT NOT NULL, last_attempt_at TEXT, sent_at TEXT)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS fiscal_alert_deliveries_alert_key_idx ON fiscal_alert_deliveries (alert_key)"),
    db.prepare("CREATE INDEX IF NOT EXISTS fiscal_alert_deliveries_status_queued_idx ON fiscal_alert_deliveries (status, first_queued_at, id)"),
    db.prepare("CREATE TABLE IF NOT EXISTS fiscal_daily_summaries (id TEXT PRIMARY KEY NOT NULL, day_key TEXT NOT NULL, status TEXT NOT NULL, metrics_json TEXT DEFAULT '{}' NOT NULL, source_versions_hash TEXT NOT NULL, generated_at TEXT NOT NULL, email_status TEXT DEFAULT 'pending' NOT NULL)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS fiscal_daily_summaries_day_idx ON fiscal_daily_summaries (day_key)"),
  ]);
}

function parseList(value: unknown) {
  try {
    const parsed = JSON.parse(String(value ?? "[]"));
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function criticality(value: unknown): FiscalCriticality {
  return value === "critical" || value === "high" ? value : "standard";
}

async function latestSourceRows(db: D1Database) {
  return db.prepare(`SELECT s.code, s.title, s.publisher, s.jurisdiction, s.catalog_version, s.source_url,
    s.criticality, s.impacted_rule_codes_json, snap.capture_status, snap.checked_at, snap.content_hash,
    snap.detected_version, snap.final_url,
    EXISTS(SELECT 1 FROM normative_change_events e WHERE e.source_code = s.code AND e.status IN ('pending_review','awaiting_new_version')) pending_change,
    EXISTS(SELECT 1 FROM normative_source_incidents i WHERE i.source_code = s.code AND i.status = 'open') open_incident
    FROM normative_sources s
    LEFT JOIN normative_source_snapshots snap ON snap.id = (SELECT ss.id FROM normative_source_snapshots ss WHERE ss.source_code = s.code ORDER BY ss.checked_at DESC, ss.id DESC LIMIT 1)
    WHERE s.id = (SELECT ns.id FROM normative_sources ns WHERE ns.code = s.code ORDER BY ns.created_at DESC, ns.id DESC LIMIT 1)
    ORDER BY s.criticality, s.jurisdiction, s.code`).all<SourceRow>();
}

async function evaluateSources(db: D1Database, now: Date) {
  const rows = await latestSourceRows(db);
  return Promise.all(rows.results.map(async (row) => {
    const sourceCriticality = criticality(row.criticality);
    const captureStatus = row.capture_status === "checked" || row.capture_status === "unavailable" ? row.capture_status : "not_checked";
    const evaluation = evaluateFiscalFreshness({
      criticality: sourceCriticality,
      captureStatus,
      checkedAt: row.checked_at ? String(row.checked_at) : null,
      pendingChange: Number(row.pending_change ?? 0) === 1,
      openIncident: Number(row.open_incident ?? 0) === 1,
      now,
    });
    const sourceVersion = String(row.detected_version ?? row.catalog_version ?? "sem-versao");
    const fingerprint = await sha256Hex(JSON.stringify({
      version: FISCAL_FRESHNESS_VERSION,
      source: row.code,
      sourceVersion,
      contentHash: row.content_hash,
      checkedAt: row.checked_at,
      status: evaluation.status,
      effect: evaluation.coverageEffect,
      reason: evaluation.reason,
    }));
    return {
      code: String(row.code),
      title: String(row.title),
      publisher: String(row.publisher),
      jurisdiction: String(row.jurisdiction),
      sourceUrl: String(row.final_url ?? row.source_url),
      sourceVersion,
      contentFingerprint: row.content_hash ? String(row.content_hash).slice(0, 12) : null,
      checkedAt: row.checked_at ? String(row.checked_at) : null,
      captureStatus,
      criticality: sourceCriticality,
      impactedRuleCodes: parseList(row.impacted_rule_codes_json),
      pendingChange: Number(row.pending_change ?? 0) === 1,
      openIncident: Number(row.open_incident ?? 0) === 1,
      fingerprint,
      ...evaluation,
    };
  }));
}

function aggregate(sources: Awaited<ReturnType<typeof evaluateSources>>) {
  const current = sources.filter((source) => source.coverageEffect === "supported").length;
  const partial = sources.filter((source) => source.coverageEffect === "partial").length;
  const notSupported = sources.filter((source) => source.coverageEffect === "not_supported").length;
  return {
    total: sources.length,
    current,
    partial,
    notSupported,
    dueSoon: sources.filter((source) => source.status === "due_soon").length,
    overdue: sources.filter((source) => source.status === "overdue").length,
    unavailable: sources.filter((source) => source.status === "unavailable").length,
    notChecked: sources.filter((source) => source.status === "not_checked").length,
    pendingChanges: sources.filter((source) => source.pendingChange).length,
    openIncidents: sources.filter((source) => source.openIncident).length,
    level: publicFreshnessLevel({ current, partial, notSupported }),
  };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] ?? character);
}

async function deliverEmail(env: FiscalFreshnessEnvironment, delivery: { id: string; recipient: string; subject: string; text: string }) {
  const apiKey = String(env.RESEND_API_KEY ?? "").trim();
  const from = String(env.FISCAL_ALERT_EMAIL_FROM ?? "CBSHub Fiscal <alertas@cbshub.com.br>").trim();
  if (!apiKey || !delivery.recipient) {
    await env.DB.prepare("UPDATE fiscal_alert_deliveries SET status = 'suppressed_unconfigured', attempt_count = attempt_count + 1, last_attempt_at = ?, error_code = 'EMAIL_PROVIDER_NOT_CONFIGURED' WHERE id = ?")
      .bind(new Date().toISOString(), delivery.id).run();
    return "suppressed_unconfigured" as const;
  }
  const attemptedAt = new Date().toISOString();
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [delivery.recipient], subject: delivery.subject, text: delivery.text, html: `<div style="font-family:Arial,sans-serif;line-height:1.5"><h2>${escapeHtml(delivery.subject)}</h2><p>${escapeHtml(delivery.text).replace(/\n/g, "<br>")}</p><p><small>CBSHub · alerta técnico sem dados de clientes</small></p></div>` }),
    });
    const payload = await response.json().catch(() => ({})) as { id?: string; message?: string };
    if (!response.ok) throw new Error(`RESEND_${response.status}_${payload.message ?? "FAILED"}`);
    await env.DB.prepare("UPDATE fiscal_alert_deliveries SET status = 'sent', attempt_count = attempt_count + 1, last_attempt_at = ?, sent_at = ?, provider_ref = ?, error_code = NULL WHERE id = ?")
      .bind(attemptedAt, attemptedAt, payload.id ?? null, delivery.id).run();
    return "sent" as const;
  } catch (error) {
    await env.DB.prepare("UPDATE fiscal_alert_deliveries SET status = 'failed', attempt_count = attempt_count + 1, last_attempt_at = ?, error_code = ? WHERE id = ?")
      .bind(attemptedAt, error instanceof Error ? error.message.slice(0, 180) : "EMAIL_FAILED", delivery.id).run();
    return "failed" as const;
  }
}

async function queueAlert(env: FiscalFreshnessEnvironment, input: { alertKey: string; sourceCode: string | null; severity: string; subject: string; text: string; now: Date }) {
  const recipient = String(env.FISCAL_ALERT_EMAIL_TO ?? "supportofficial@cbshub.com.br").trim().toLowerCase();
  const payloadHash = await sha256Hex(JSON.stringify({ subject: input.subject, text: input.text, recipient }));
  const id = crypto.randomUUID();
  const queuedAt = input.now.toISOString();
  await env.DB.prepare("INSERT OR IGNORE INTO fiscal_alert_deliveries (id, alert_key, source_code, severity, recipient, subject, status, payload_hash, first_queued_at) VALUES (?, ?, ?, ?, ?, ?, 'queued', ?, ?)")
    .bind(id, input.alertKey, input.sourceCode, input.severity, recipient, input.subject, payloadHash, queuedAt).run();
  const row = await env.DB.prepare("SELECT id, status FROM fiscal_alert_deliveries WHERE alert_key = ? LIMIT 1").bind(input.alertKey).first<{ id: string; status: string }>();
  if (!row || row.status === "sent") return row?.status ?? "deduplicated";
  if (row.status === "failed" || row.status === "queued" || (row.status === "suppressed_unconfigured" && env.RESEND_API_KEY)) {
    return deliverEmail(env, { id: row.id, recipient, subject: input.subject, text: input.text });
  }
  return row.status;
}

async function responseMetrics(db: D1Database) {
  const rows = await db.prepare(`SELECT e.id, e.detected_at, e.resolved_at, snap.published_at,
    (SELECT min(i.created_at) FROM fiscal_result_invalidations i WHERE i.change_event_id = e.id) blocked_at,
    (SELECT min(r.created_at) FROM fiscal_rule_releases r WHERE r.source_change_event_id = e.id AND r.status = 'approved') recertified_at
    FROM normative_change_events e
    LEFT JOIN normative_source_snapshots snap ON snap.id = e.current_snapshot_id
    ORDER BY e.detected_at DESC LIMIT 500`).all<SourceRow>();
  const duration = (start: keyof SourceRow, end: keyof SourceRow) => rows.results.map((row) => minutesBetween(row[start] ? String(row[start]) : null, row[end] ? String(row[end]) : null)).filter((value): value is number => value !== null);
  return {
    detect: summarizeDurations(duration("published_at", "detected_at")),
    block: summarizeDurations(duration("detected_at", "blocked_at")),
    correct: summarizeDurations(duration("detected_at", "resolved_at")),
    recertify: summarizeDurations(duration("detected_at", "recertified_at")),
  };
}

export async function refreshFiscalFreshness(env: FiscalFreshnessEnvironment, now = new Date()) {
  await ensureFiscalFreshnessSchema(env.DB);
  const dayKey = now.toISOString().slice(0, 10);
  const sources = await evaluateSources(env.DB, now);
  const previous = await env.DB.prepare("SELECT source_code, freshness_status FROM fiscal_freshness_observations WHERE day_key < ? ORDER BY day_key DESC").bind(dayKey).all<{ source_code: string; freshness_status: string }>();
  const previousBySource = new Map<string, string>();
  for (const row of previous.results) if (!previousBySource.has(row.source_code)) previousBySource.set(row.source_code, row.freshness_status);
  await env.DB.batch(sources.map((source) => env.DB.prepare(`INSERT INTO fiscal_freshness_observations
    (id, day_key, source_code, criticality, freshness_status, coverage_effect, sla_hours, age_minutes, deadline_at, capture_status, source_version, source_url, reason, impacted_rule_codes_json, fingerprint, observed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(day_key, source_code) DO UPDATE SET criticality=excluded.criticality, freshness_status=excluded.freshness_status, coverage_effect=excluded.coverage_effect, sla_hours=excluded.sla_hours, age_minutes=excluded.age_minutes, deadline_at=excluded.deadline_at, capture_status=excluded.capture_status, source_version=excluded.source_version, source_url=excluded.source_url, reason=excluded.reason, impacted_rule_codes_json=excluded.impacted_rule_codes_json, fingerprint=excluded.fingerprint, observed_at=excluded.observed_at`)
    .bind(`${dayKey}:${source.code}`, dayKey, source.code, source.criticality, source.status, source.coverageEffect, source.slaHours, source.ageMinutes, source.deadlineAt, source.captureStatus, source.sourceVersion, source.sourceUrl, source.reason, JSON.stringify(source.impactedRuleCodes), source.fingerprint, now.toISOString())));

  const alertResults: string[] = [];
  for (const source of sources) {
    const mustAlert = ["overdue", "unavailable", "not_checked"].includes(source.status) || source.pendingChange || source.openIncident;
    if (mustAlert) {
      alertResults.push(await queueAlert(env, {
        alertKey: `freshness:${dayKey}:${source.code}:${source.status}:${source.pendingChange ? "pending" : "stable"}`,
        sourceCode: source.code,
        severity: source.coverageEffect === "not_supported" ? "critical" : "warning",
        subject: `[CBSHub] ${source.code}: ${source.status}`,
        text: `${source.title}\nStatus: ${source.status}\nEfeito: ${source.coverageEffect}\nMotivo: ${source.reason}\nÚltima conferência: ${source.checkedAt ?? "sem captura"}\nVersão: ${source.sourceVersion}\nFonte: ${source.sourceUrl}\nRegras: ${source.impactedRuleCodes.join(", ") || "não vinculadas"}`,
        now,
      }));
    } else if (["overdue", "unavailable", "not_checked"].includes(previousBySource.get(source.code) ?? "")) {
      alertResults.push(await queueAlert(env, {
        alertKey: `freshness:${dayKey}:${source.code}:recovered:${source.fingerprint.slice(0, 16)}`,
        sourceCode: source.code,
        severity: "info",
        subject: `[CBSHub] ${source.code}: fonte recuperada`,
        text: `${source.title}\nA fonte voltou a ser conferida dentro do SLA.\nConferida em: ${source.checkedAt}\nVersão: ${source.sourceVersion}\nFonte: ${source.sourceUrl}`,
        now,
      }));
    }
  }

  const metrics = aggregate(sources);
  const versionsHash = await sha256Hex(sources.map((source) => `${source.code}:${source.sourceVersion}:${source.fingerprint}`).sort().join("|"));
  const summaryStatus = metrics.level;
  await env.DB.prepare(`INSERT INTO fiscal_daily_summaries (id, day_key, status, metrics_json, source_versions_hash, generated_at, email_status)
    VALUES (?, ?, ?, ?, ?, ?, 'pending') ON CONFLICT(day_key) DO UPDATE SET status=excluded.status, metrics_json=excluded.metrics_json, source_versions_hash=excluded.source_versions_hash, generated_at=excluded.generated_at`)
    .bind(`summary:${dayKey}`, dayKey, summaryStatus, JSON.stringify(metrics), versionsHash, now.toISOString()).run();
  const summaryDelivery = await queueAlert(env, {
    alertKey: `freshness-summary:${dayKey}:${versionsHash.slice(0, 16)}`,
    sourceCode: null,
    severity: metrics.notSupported > 0 ? "critical" : metrics.partial > 0 ? "warning" : "info",
    subject: `[CBSHub] Resumo fiscal diário ${dayKey}`,
    text: `Fontes: ${metrics.total}\nAtuais: ${metrics.current}\nParciais: ${metrics.partial}\nNão suportadas por frescor: ${metrics.notSupported}\nVencidas: ${metrics.overdue}\nIndisponíveis: ${metrics.unavailable}\nMudanças pendentes: ${metrics.pendingChanges}\nIncidentes abertos: ${metrics.openIncidents}`,
    now,
  });
  await env.DB.prepare("UPDATE fiscal_daily_summaries SET email_status = ? WHERE day_key = ?").bind(summaryDelivery, dayKey).run();
  return { dayKey, metrics, alerts: alertResults.length, summaryDelivery };
}

export async function getFiscalFreshnessDashboard(db: D1Database, now = new Date()) {
  await ensureFiscalFreshnessSchema(db);
  const sources = await evaluateSources(db, now);
  const [observations, alerts, summaries, incidents, releases, timing] = await Promise.all([
    db.prepare("SELECT day_key, source_code, freshness_status, coverage_effect, source_version, reason, observed_at FROM fiscal_freshness_observations ORDER BY observed_at DESC LIMIT 500").all<SourceRow>(),
    db.prepare("SELECT id, alert_key, source_code, severity, recipient, subject, status, attempt_count, provider_ref, error_code, first_queued_at, last_attempt_at, sent_at FROM fiscal_alert_deliveries ORDER BY first_queued_at DESC LIMIT 100").all<SourceRow>(),
    db.prepare("SELECT day_key, status, metrics_json, source_versions_hash, generated_at, email_status FROM fiscal_daily_summaries ORDER BY day_key DESC LIMIT 31").all<SourceRow>(),
    db.prepare("SELECT id, source_code, connector_id, incident_kind, status, detected_at, resolved_at, details_json FROM normative_source_incidents ORDER BY detected_at DESC LIMIT 100").all<SourceRow>(),
    db.prepare("SELECT id, version, manifest_hash, previous_release_hash, source_change_event_id, status, created_at FROM fiscal_rule_releases ORDER BY created_at DESC LIMIT 50").all<SourceRow>(),
    responseMetrics(db),
  ]);
  const metrics = aggregate(sources);
  const impactedRules = new Map<string, { effect: string; sources: string[]; reasons: string[] }>();
  for (const source of sources) for (const rule of source.impactedRuleCodes) {
    const current = impactedRules.get(rule) ?? { effect: "supported", sources: [], reasons: [] };
    if (source.coverageEffect === "not_supported" || (source.coverageEffect === "partial" && current.effect === "supported")) current.effect = source.coverageEffect;
    current.sources.push(source.code);
    current.reasons.push(source.reason);
    impactedRules.set(rule, current);
  }
  return {
    version: FISCAL_FRESHNESS_VERSION,
    generatedAt: now.toISOString(),
    sla: FISCAL_SOURCE_SLA,
    metrics,
    sources,
    impactedRules: [...impactedRules.entries()].map(([code, value]) => ({ code, ...value })),
    timing,
    observations: observations.results,
    alerts: alerts.results,
    summaries: summaries.results.map((row) => ({ ...row, metrics: (() => { try { return JSON.parse(String(row.metrics_json)); } catch { return {}; } })() })),
    incidents: incidents.results,
    releases: releases.results,
    policy: "Fonte fora do SLA rebaixa automaticamente a cobertura vinculada; nenhuma captura promove regra, muda fórmula ou corrige cálculo sem versão e regressão aprovadas.",
  };
}

export async function getPublicFiscalFreshness(db: D1Database, now = new Date()) {
  await ensureFiscalFreshnessSchema(db);
  const sources = await evaluateSources(db, now);
  const metrics = aggregate(sources);
  const mostRecent = sources.map((source) => source.checkedAt).filter((value): value is string => Boolean(value)).sort().at(-1) ?? null;
  return {
    version: FISCAL_FRESHNESS_VERSION,
    generatedAt: now.toISOString(),
    level: metrics.level,
    checkedSources: metrics.current,
    attentionSources: metrics.partial,
    degradedSources: metrics.notSupported,
    totalSources: metrics.total,
    pendingChanges: metrics.pendingChanges,
    openIncidents: metrics.openIncidents,
    mostRecentCheckAt: mostRecent,
    explanation: metrics.level === "current" ? "As fontes monitoradas possuem evidência dentro do SLA." : metrics.level === "attention" ? "Há fonte próxima do prazo ou mudança aguardando decisão; os recortes afetados estão rebaixados." : metrics.level === "degraded" ? "Há fonte vencida, indisponível ou sem captura-base; os recortes afetados não são apresentados como suportados." : "Ainda não existe evidência suficiente para declarar frescor.",
    privacy: "Indicador agregado: não expõe perguntas, clientes, documentos, regras privadas ou detalhes operacionais de incidentes.",
  };
}

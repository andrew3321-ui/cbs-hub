import {
  classifyCapturedChange,
  governedNormativeSources,
  NORMATIVE_GOVERNANCE_VERSION,
  ruleHealthStatus,
  sourcesForMonitorDate,
  validateGovernedSourceCatalog,
  type GovernedNormativeSource,
} from "../domain/normative-governance.ts";

export type NormativeMonitorEnvironment = {
  DB: D1Database;
};

type SourceCapture = {
  source: GovernedNormativeSource;
  status: "checked" | "unavailable";
  httpStatus: number | null;
  contentHash: string | null;
  etag: string | null;
  lastModified: string | null;
  checkedAt: string;
};

type PreviousSnapshot = {
  id: string;
  capture_status: "checked" | "unavailable";
  content_hash: string | null;
};

type RuleRow = {
  id: number;
  code: string;
  version: string;
  name: string;
  status: string;
  effective_from: string;
  effective_to: string;
  source_count: number;
  content_hash: string;
};

function isoNow() {
  return new Date().toISOString();
}

export function monitorDate(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

export async function sha256Hex(value: string | Uint8Array) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function sourceMetadata(source: GovernedNormativeSource) {
  return {
    catalogVersion: NORMATIVE_GOVERNANCE_VERSION,
    code: source.code,
    title: source.title,
    publisher: source.publisher,
    jurisdiction: source.jurisdiction,
    legalDevice: source.legalDevice,
    sourceKind: source.sourceKind,
    sourceUrl: source.url,
    effectiveFrom: source.effectiveFrom,
    effectiveTo: source.effectiveTo,
    verificationStatus: source.verificationStatus,
    impactedRuleCodes: [...source.impactedRuleCodes].sort(),
  };
}

async function sourceVersion(source: GovernedNormativeSource) {
  const metadataJson = JSON.stringify(sourceMetadata(source));
  const metadataHash = await sha256Hex(metadataJson);
  return { id: `${source.code}:${metadataHash.slice(0, 24)}`, metadataHash };
}

export async function ensureNormativeGovernanceSchema(db: D1Database) {
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS normative_sources (id TEXT PRIMARY KEY NOT NULL, code TEXT NOT NULL, catalog_version TEXT NOT NULL, title TEXT NOT NULL, publisher TEXT NOT NULL, jurisdiction TEXT NOT NULL, legal_device TEXT NOT NULL, source_kind TEXT NOT NULL, source_url TEXT NOT NULL, effective_from TEXT, effective_to TEXT, verification_status TEXT NOT NULL, impacted_rule_codes_json TEXT DEFAULT '[]' NOT NULL, metadata_hash TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS normative_monitor_runs (id TEXT PRIMARY KEY NOT NULL, run_date TEXT NOT NULL, status TEXT DEFAULT 'running' NOT NULL, catalog_version TEXT NOT NULL, source_count INTEGER DEFAULT 0 NOT NULL, checked_count INTEGER DEFAULT 0 NOT NULL, unavailable_count INTEGER DEFAULT 0 NOT NULL, change_count INTEGER DEFAULT 0 NOT NULL, started_at TEXT NOT NULL, finished_at TEXT, error_code TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS normative_source_snapshots (id TEXT PRIMARY KEY NOT NULL, run_id TEXT NOT NULL, source_version_id TEXT NOT NULL, source_code TEXT NOT NULL, capture_status TEXT NOT NULL, http_status INTEGER, content_hash TEXT, previous_content_hash TEXT, etag TEXT, last_modified TEXT, checked_at TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS normative_change_events (id TEXT PRIMARY KEY NOT NULL, source_code TEXT NOT NULL, previous_snapshot_id TEXT, current_snapshot_id TEXT NOT NULL, change_kind TEXT NOT NULL, status TEXT DEFAULT 'pending_review' NOT NULL, impacted_rule_codes_json TEXT DEFAULT '[]' NOT NULL, detected_at TEXT NOT NULL, resolved_at TEXT, resolution_release_id TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS normative_change_reviews (id TEXT PRIMARY KEY NOT NULL, change_event_id TEXT NOT NULL, workspace_id INTEGER NOT NULL, reviewer_user_id INTEGER NOT NULL, reviewer_name TEXT NOT NULL, professional_role TEXT NOT NULL, professional_registration TEXT NOT NULL, decision TEXT NOT NULL, decision_note TEXT NOT NULL, release_version TEXT, release_hash TEXT, declaration_version TEXT NOT NULL, decision_signature TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS fiscal_rule_releases (id TEXT PRIMARY KEY NOT NULL, version TEXT NOT NULL, manifest_json TEXT NOT NULL, manifest_hash TEXT NOT NULL, previous_release_hash TEXT, source_change_event_id TEXT, release_kind TEXT DEFAULT 'normative_change' NOT NULL, status TEXT DEFAULT 'approved' NOT NULL, approved_by_user_id INTEGER NOT NULL, professional_registration TEXT NOT NULL, approval_signature TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS fiscal_result_invalidations (id TEXT PRIMARY KEY NOT NULL, change_event_id TEXT NOT NULL, workspace_id INTEGER NOT NULL, owner_user_id INTEGER NOT NULL, dossier_id TEXT NOT NULL, rule_code TEXT NOT NULL, rule_version TEXT NOT NULL, status TEXT DEFAULT 'open' NOT NULL, reason TEXT NOT NULL, notified_at TEXT, resolved_at TEXT, resolution_release_id TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS governance_notifications (id TEXT PRIMARY KEY NOT NULL, workspace_id INTEGER NOT NULL, recipient_user_id INTEGER NOT NULL, notification_type TEXT NOT NULL, subject_type TEXT NOT NULL, subject_id TEXT NOT NULL, message TEXT NOT NULL, read_at TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS normative_governance_audit_events (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, change_event_id TEXT, workspace_id INTEGER, actor_user_id INTEGER, event_type TEXT NOT NULL, event_data TEXT DEFAULT '{}' NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS normative_sources_metadata_hash_idx ON normative_sources (metadata_hash)"),
    db.prepare("CREATE INDEX IF NOT EXISTS normative_sources_code_created_idx ON normative_sources (code, created_at, id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS normative_sources_jurisdiction_kind_idx ON normative_sources (jurisdiction, source_kind, id)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS normative_monitor_runs_date_catalog_idx ON normative_monitor_runs (run_date, catalog_version)"),
    db.prepare("CREATE INDEX IF NOT EXISTS normative_monitor_runs_status_date_idx ON normative_monitor_runs (status, run_date, id)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS normative_source_snapshots_run_source_idx ON normative_source_snapshots (run_id, source_code)"),
    db.prepare("CREATE INDEX IF NOT EXISTS normative_source_snapshots_source_checked_idx ON normative_source_snapshots (source_code, checked_at, id)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS normative_change_events_current_snapshot_idx ON normative_change_events (current_snapshot_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS normative_change_events_status_detected_idx ON normative_change_events (status, detected_at, id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS normative_change_reviews_event_created_idx ON normative_change_reviews (change_event_id, created_at, id)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS fiscal_rule_releases_version_idx ON fiscal_rule_releases (version)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS fiscal_rule_releases_manifest_hash_idx ON fiscal_rule_releases (manifest_hash)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS fiscal_result_invalidations_event_dossier_idx ON fiscal_result_invalidations (change_event_id, dossier_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS fiscal_result_invalidations_workspace_status_idx ON fiscal_result_invalidations (workspace_id, status, created_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS fiscal_result_invalidations_dossier_status_idx ON fiscal_result_invalidations (dossier_id, status, id)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS governance_notifications_recipient_subject_idx ON governance_notifications (recipient_user_id, notification_type, subject_type, subject_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS governance_notifications_workspace_unread_idx ON governance_notifications (workspace_id, read_at, created_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS normative_governance_audit_change_created_idx ON normative_governance_audit_events (change_event_id, created_at, id)"),
  ]);
}

async function registerSources(db: D1Database) {
  const catalogValidation = validateGovernedSourceCatalog();
  if (!catalogValidation.passed) throw new Error(`normative_source_catalog_invalid:${catalogValidation.errors.join(",")}`);
  const versions = await Promise.all(governedNormativeSources.map(async (source) => ({ source, ...(await sourceVersion(source)) })));
  await db.batch(versions.map(({ source, id, metadataHash }) => db.prepare(
    "INSERT OR IGNORE INTO normative_sources (id, code, catalog_version, title, publisher, jurisdiction, legal_device, source_kind, source_url, effective_from, effective_to, verification_status, impacted_rule_codes_json, metadata_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  ).bind(id, source.code, NORMATIVE_GOVERNANCE_VERSION, source.title, source.publisher, source.jurisdiction, source.legalDevice, source.sourceKind, source.url, source.effectiveFrom, source.effectiveTo, source.verificationStatus, JSON.stringify(source.impactedRuleCodes), metadataHash)));
  return new Map(versions.map(({ source, id }) => [source.code, id]));
}

async function captureSource(source: GovernedNormativeSource): Promise<SourceCapture> {
  const checkedAt = isoNow();
  try {
    const response = await fetch(source.url, {
      headers: {
        "User-Agent": "MargemClara-Normative-Monitor/2.0",
        Accept: "text/html,application/xhtml+xml,application/pdf;q=0.8,*/*;q=0.5",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return { source, status: "unavailable", httpStatus: response.status, contentHash: null, etag: response.headers.get("etag"), lastModified: response.headers.get("last-modified"), checkedAt };
    const bytes = new Uint8Array(await response.arrayBuffer());
    const contentHash = await sha256Hex(bytes.slice(0, 750_000));
    return { source, status: "checked", httpStatus: response.status, contentHash, etag: response.headers.get("etag"), lastModified: response.headers.get("last-modified"), checkedAt };
  } catch {
    return { source, status: "unavailable", httpStatus: null, contentHash: null, etag: null, lastModified: null, checkedAt };
  }
}

async function previousSnapshot(db: D1Database, sourceCode: string) {
  return db.prepare("SELECT id, capture_status, content_hash FROM normative_source_snapshots WHERE source_code = ? ORDER BY checked_at DESC, id DESC LIMIT 1")
    .bind(sourceCode).first<PreviousSnapshot>();
}

async function invalidateAffectedDossiers(db: D1Database, eventId: string, source: GovernedNormativeSource, detectedAt: string) {
  if (source.impactedRuleCodes.length === 0) return 0;
  const placeholders = source.impactedRuleCodes.map(() => "?").join(", ");
  const dossiers = await db.prepare(`SELECT id, workspace_id, owner_user_id, base_code, base_version FROM fiscal_dossiers WHERE base_code IN (${placeholders})`)
    .bind(...source.impactedRuleCodes).all<{ id: string; workspace_id: number; owner_user_id: number; base_code: string; base_version: string }>();
  if (!dossiers.results.length) return 0;
  const reason = `Mudança detectada em ${source.code}; o snapshot permanece imutável, mas a entrega fica bloqueada até revisão ou nova versão.`;
  const statements: D1PreparedStatement[] = [];
  for (const dossier of dossiers.results) {
    statements.push(
      db.prepare("INSERT OR IGNORE INTO fiscal_result_invalidations (id, change_event_id, workspace_id, owner_user_id, dossier_id, rule_code, rule_version, status, reason, notified_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?)")
        .bind(crypto.randomUUID(), eventId, dossier.workspace_id, dossier.owner_user_id, dossier.id, dossier.base_code, dossier.base_version, reason, detectedAt, detectedAt),
      db.prepare("INSERT OR IGNORE INTO governance_notifications (id, workspace_id, recipient_user_id, notification_type, subject_type, subject_id, message, created_at) VALUES (?, ?, ?, 'fiscal_result_invalidated', 'fiscal_dossier', ?, ?, ?)")
        .bind(crypto.randomUUID(), dossier.workspace_id, dossier.owner_user_id, dossier.id, reason, detectedAt),
      db.prepare("INSERT INTO fiscal_dossier_events (dossier_id, workspace_id, actor_user_id, event_type, note, event_data, created_at) VALUES (?, ?, NULL, 'fiscal_dossier.normative_change_detected', ?, ?, ?)")
        .bind(dossier.id, dossier.workspace_id, reason, JSON.stringify({ eventId, sourceCode: source.code, ruleCode: dossier.base_code, ruleVersion: dossier.base_version }), detectedAt),
    );
  }
  await db.batch(statements);
  return dossiers.results.length;
}

async function createChangeEvent(db: D1Database, capture: SourceCapture, currentSnapshotId: string, previous: PreviousSnapshot | null, changeKind: "content_changed" | "new_source") {
  const eventId = crypto.randomUUID();
  const detectedAt = capture.checkedAt;
  const inserted = await db.prepare("INSERT OR IGNORE INTO normative_change_events (id, source_code, previous_snapshot_id, current_snapshot_id, change_kind, status, impacted_rule_codes_json, detected_at, created_at) VALUES (?, ?, ?, ?, ?, 'pending_review', ?, ?, ?)")
    .bind(eventId, capture.source.code, previous?.id ?? null, currentSnapshotId, changeKind, JSON.stringify(capture.source.impactedRuleCodes), detectedAt, detectedAt).run();
  if (inserted.meta.changes !== 1) return 0;
  const invalidated = await invalidateAffectedDossiers(db, eventId, capture.source, detectedAt);
  await db.prepare("INSERT INTO normative_governance_audit_events (change_event_id, event_type, event_data, created_at) VALUES (?, 'normative_change.detected', ?, ?)")
    .bind(eventId, JSON.stringify({ sourceCode: capture.source.code, changeKind, impactedRuleCodes: capture.source.impactedRuleCodes, invalidatedDossiers: invalidated }), detectedAt).run();
  return 1;
}

export async function runNormativeMonitor(environment: NormativeMonitorEnvironment, date = monitorDate()) {
  const db = environment.DB;
  await ensureNormativeGovernanceSchema(db);
  const sourceVersionIds = await registerSources(db);
  const rotation = sourcesForMonitorDate(date);
  const startedAt = isoNow();
  const requestedRunId = crypto.randomUUID();
  await db.prepare("INSERT OR IGNORE INTO normative_monitor_runs (id, run_date, status, catalog_version, source_count, started_at, created_at) VALUES (?, ?, 'running', ?, ?, ?, ?)")
    .bind(requestedRunId, date, NORMATIVE_GOVERNANCE_VERSION, rotation.sources.length, startedAt, startedAt).run();
  const run = await db.prepare("SELECT id, status FROM normative_monitor_runs WHERE run_date = ? AND catalog_version = ? LIMIT 1")
    .bind(date, NORMATIVE_GOVERNANCE_VERSION).first<{ id: string; status: string }>();
  if (!run) throw new Error("normative_monitor_run_unavailable");
  if (run.status === "completed") return { runId: run.id, status: "already_completed" as const, rotation };

  const previousCompleted = await db.prepare("SELECT COUNT(*) AS total FROM normative_monitor_runs WHERE status = 'completed' AND id <> ?")
    .bind(run.id).first<{ total: number }>();
  const bootstrap = Number(previousCompleted?.total ?? 0) === 0;
  try {
    const captures = await Promise.all(rotation.sources.map(captureSource));
    let changes = 0;
    for (const capture of captures) {
      const previous = await previousSnapshot(db, capture.source.code);
      const classification = classifyCapturedChange(previous ? { sourceCode: capture.source.code, status: previous.capture_status, contentHash: previous.content_hash } : null, { sourceCode: capture.source.code, status: capture.status, contentHash: capture.contentHash });
      const snapshotId = `${run.id}:${capture.source.code}`;
      const insertedSnapshot = await db.prepare("INSERT OR IGNORE INTO normative_source_snapshots (id, run_id, source_version_id, source_code, capture_status, http_status, content_hash, previous_content_hash, etag, last_modified, checked_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(snapshotId, run.id, sourceVersionIds.get(capture.source.code), capture.source.code, capture.status, capture.httpStatus, capture.contentHash, previous?.content_hash ?? null, capture.etag, capture.lastModified, capture.checkedAt, capture.checkedAt).run();
      if (insertedSnapshot.meta.changes !== 1) continue;
      if (!bootstrap && (classification === "content_changed" || classification === "baseline")) {
        changes += await createChangeEvent(db, capture, snapshotId, previous, classification === "baseline" ? "new_source" : "content_changed");
      }
    }
    const finishedAt = isoNow();
    const checked = captures.filter((capture) => capture.status === "checked").length;
    const unavailable = captures.length - checked;
    await db.prepare("UPDATE normative_monitor_runs SET status = 'completed', checked_count = ?, unavailable_count = ?, change_count = ?, finished_at = ?, error_code = NULL WHERE id = ?")
      .bind(checked, unavailable, changes, finishedAt, run.id).run();
    if (bootstrap) {
      await db.prepare("INSERT INTO normative_governance_audit_events (event_type, event_data, created_at) VALUES ('normative_monitor.baseline_established', ?, ?)")
        .bind(JSON.stringify({ runId: run.id, sources: captures.length, catalogVersion: NORMATIVE_GOVERNANCE_VERSION }), finishedAt).run();
    }
    return { runId: run.id, status: "completed" as const, bootstrap, checked, unavailable, changes, rotation };
  } catch (error) {
    await db.prepare("UPDATE normative_monitor_runs SET status = 'failed', finished_at = ?, error_code = ? WHERE id = ?")
      .bind(isoNow(), error instanceof Error ? error.name : "UnknownError", run.id).run();
    throw error;
  }
}

function parseList(value: string | null | undefined) {
  try {
    const parsed = JSON.parse(value ?? "[]");
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export async function getNormativeGovernanceDashboard(db: D1Database, workspaceId: number, today = monitorDate()) {
  await ensureNormativeGovernanceSchema(db);
  const [runs, events, invalidations, notifications, rules, releases] = await Promise.all([
    db.prepare("SELECT id, run_date, status, source_count, checked_count, unavailable_count, change_count, started_at, finished_at FROM normative_monitor_runs ORDER BY run_date DESC, created_at DESC LIMIT 14").all<Record<string, string | number | null>>(),
    db.prepare("SELECT e.*, s.title, s.publisher, s.jurisdiction, s.legal_device, s.source_url FROM normative_change_events e LEFT JOIN normative_sources s ON s.id = (SELECT s2.id FROM normative_sources s2 WHERE s2.code = e.source_code ORDER BY s2.created_at DESC, s2.id DESC LIMIT 1) WHERE e.status IN ('pending_review', 'awaiting_new_version') ORDER BY e.detected_at DESC, e.id DESC LIMIT 50").all<Record<string, string | number | null>>(),
    db.prepare("SELECT id, change_event_id, dossier_id, rule_code, rule_version, status, reason, created_at FROM fiscal_result_invalidations WHERE workspace_id = ? AND status = 'open' ORDER BY created_at DESC LIMIT 100").bind(workspaceId).all<Record<string, string | number | null>>(),
    db.prepare("SELECT id, notification_type, subject_type, subject_id, message, read_at, created_at FROM governance_notifications WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 50").bind(workspaceId).all<Record<string, string | number | null>>(),
    db.prepare("SELECT id, code, version, name, status, effective_from, effective_to, source_count, content_hash FROM fiscal_rule_sets ORDER BY effective_to, code, version").all<RuleRow>(),
    db.prepare("SELECT id, version, manifest_hash, previous_release_hash, source_change_event_id, release_kind, status, created_at FROM fiscal_rule_releases ORDER BY created_at DESC LIMIT 20").all<Record<string, string | number | null>>(),
  ]);

  const sourceRows = await db.prepare("SELECT s.*, snap.capture_status, snap.http_status, snap.content_hash, snap.checked_at FROM normative_sources s LEFT JOIN normative_source_snapshots snap ON snap.id = (SELECT ss.id FROM normative_source_snapshots ss WHERE ss.source_code = s.code ORDER BY ss.checked_at DESC, ss.id DESC LIMIT 1) WHERE s.id = (SELECT ns.id FROM normative_sources ns WHERE ns.code = s.code ORDER BY ns.created_at DESC, ns.id DESC LIMIT 1) ORDER BY s.jurisdiction, s.code")
    .all<Record<string, string | number | null>>();
  const queue = events.results.map((event) => ({
    id: String(event.id),
    sourceCode: String(event.source_code),
    title: String(event.title ?? event.source_code),
    publisher: String(event.publisher ?? ""),
    jurisdiction: String(event.jurisdiction ?? ""),
    legalDevice: String(event.legal_device ?? ""),
    sourceUrl: String(event.source_url ?? ""),
    changeKind: String(event.change_kind),
    status: String(event.status),
    impactedRuleCodes: parseList(String(event.impacted_rule_codes_json ?? "[]")),
    detectedAt: String(event.detected_at),
  }));
  const sourceCatalog = sourceRows.results.map((source) => ({
    code: String(source.code),
    title: String(source.title),
    publisher: String(source.publisher),
    jurisdiction: String(source.jurisdiction),
    legalDevice: String(source.legal_device),
    sourceKind: String(source.source_kind),
    url: String(source.source_url),
    effectiveFrom: source.effective_from ? String(source.effective_from) : null,
    effectiveTo: source.effective_to ? String(source.effective_to) : null,
    verificationStatus: String(source.verification_status),
    impactedRuleCodes: parseList(String(source.impacted_rule_codes_json ?? "[]")),
    captureStatus: source.capture_status ? String(source.capture_status) : "not_checked",
    httpStatus: source.http_status === null ? null : Number(source.http_status),
    checkedAt: source.checked_at ? String(source.checked_at) : null,
    contentFingerprint: source.content_hash ? String(source.content_hash).slice(0, 12) : null,
  }));
  const ruleCatalog = rules.results.map((rule) => ({
    id: rule.id,
    code: rule.code,
    version: rule.version,
    name: rule.name,
    approvalStatus: rule.status,
    effectiveFrom: rule.effective_from,
    effectiveTo: rule.effective_to,
    sourceCount: rule.source_count,
    fingerprint: rule.content_hash.slice(0, 12),
    health: ruleHealthStatus({ effectiveFrom: rule.effective_from, effectiveTo: rule.effective_to, sourceCount: rule.source_count }, today),
  }));
  const openInvalidations = invalidations.results.map((row) => ({
    id: String(row.id),
    eventId: String(row.change_event_id),
    dossierId: String(row.dossier_id),
    ruleCode: String(row.rule_code),
    ruleVersion: String(row.rule_version),
    status: String(row.status),
    reason: String(row.reason),
    createdAt: String(row.created_at),
  }));
  const recentRuns = runs.results.map((run) => ({
    id: String(run.id),
    runDate: String(run.run_date),
    status: String(run.status),
    sourceCount: Number(run.source_count),
    checked: Number(run.checked_count),
    unavailable: Number(run.unavailable_count),
    changes: Number(run.change_count),
    startedAt: String(run.started_at),
    finishedAt: run.finished_at ? String(run.finished_at) : null,
  }));
  return {
    version: NORMATIVE_GOVERNANCE_VERSION,
    catalogValidation: validateGovernedSourceCatalog(),
    sources: sourceCatalog,
    queue,
    invalidations: openInvalidations,
    notifications: notifications.results.map((row) => ({ ...row, unread: !row.read_at })),
    rules: ruleCatalog,
    releases: releases.results,
    runs: recentRuns,
    metrics: {
      monitored: governedNormativeSources.length,
      checkedToday: recentRuns[0]?.runDate === today ? recentRuns[0].sourceCount : 0,
      checked: recentRuns[0]?.runDate === today ? recentRuns[0].checked : 0,
      unavailable: sourceCatalog.filter((source) => source.captureStatus === "unavailable").length,
      changeSignals: queue.length,
      pendingReview: queue.filter((event) => event.status === "pending_review").length,
      awaitingNewVersion: queue.filter((event) => event.status === "awaiting_new_version").length,
      invalidatedResults: openInvalidations.length,
      unreadNotifications: notifications.results.filter((row) => !row.read_at).length,
      expiringRules: ruleCatalog.filter((rule) => rule.health === "expiring").length,
      expiredRules: ruleCatalog.filter((rule) => rule.health === "expired").length,
      unverifiableSources: sourceCatalog.filter((source) => source.verificationStatus === "monitor_only").length,
    },
    rotation: recentRuns[0] ? sourcesForMonitorDate(recentRuns[0].runDate) : sourcesForMonitorDate(today),
    policy: "Mudanças geram fila, invalidam entregas afetadas e exigem decisão assinada. Nenhuma captura altera regra ou cálculo automaticamente.",
  };
}

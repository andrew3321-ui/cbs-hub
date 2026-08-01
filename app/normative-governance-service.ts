import {
  classifyCapturedChange,
  governedNormativeSources,
  NORMATIVE_GOVERNANCE_VERSION,
  NORMATIVE_MONITOR_SHARD_COUNT,
  ruleHealthStatus,
  sourcesForMonitorDate,
  validateGovernedSourceCatalog,
  type GovernedNormativeSource,
} from "../domain/normative-governance.ts";
import { buildFiscalRegressionReport } from "../domain/fiscal-regression-assurance.ts";

export type NormativeMonitorEnvironment = {
  DB: D1Database;
};

type SourceCapture = {
  source: GovernedNormativeSource;
  status: "checked" | "unavailable";
  httpStatus: number | null;
  contentHash: string | null;
  normalizedContentHash: string | null;
  etag: string | null;
  lastModified: string | null;
  finalUrl: string | null;
  accessPath: "direct" | "official_alternative" | "none";
  attempts: number;
  bytesHashed: number;
  alternativeHttpStatus: number | null;
  checkedAt: string;
};

type PreviousSnapshot = {
  id: string;
  capture_status: "checked" | "unavailable";
  content_hash: string | null;
  normalized_content_hash: string | null;
  final_url: string | null;
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
    criticality: source.criticality,
    monitoringFrequency: source.monitoringFrequency,
    officialAlternativeUrl: source.officialAlternativeUrl,
    alternativeEvidenceScope: source.alternativeEvidenceScope,
  };
}

async function sourceVersion(source: GovernedNormativeSource) {
  const metadataJson = JSON.stringify(sourceMetadata(source));
  const metadataHash = await sha256Hex(metadataJson);
  return { id: `${source.code}:${metadataHash.slice(0, 24)}`, metadataHash };
}

export async function ensureNormativeGovernanceSchema(db: D1Database) {
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS normative_sources (id TEXT PRIMARY KEY NOT NULL, code TEXT NOT NULL, catalog_version TEXT NOT NULL, title TEXT NOT NULL, publisher TEXT NOT NULL, jurisdiction TEXT NOT NULL, legal_device TEXT NOT NULL, source_kind TEXT NOT NULL, source_url TEXT NOT NULL, effective_from TEXT, effective_to TEXT, verification_status TEXT NOT NULL, impacted_rule_codes_json TEXT DEFAULT '[]' NOT NULL, metadata_hash TEXT NOT NULL, criticality TEXT DEFAULT 'standard' NOT NULL, monitoring_frequency TEXT DEFAULT 'daily' NOT NULL, alternative_url TEXT, alternative_evidence_scope TEXT DEFAULT 'not_available' NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS normative_monitor_runs (id TEXT PRIMARY KEY NOT NULL, run_date TEXT NOT NULL, status TEXT DEFAULT 'running' NOT NULL, catalog_version TEXT NOT NULL, source_count INTEGER DEFAULT 0 NOT NULL, checked_count INTEGER DEFAULT 0 NOT NULL, unavailable_count INTEGER DEFAULT 0 NOT NULL, change_count INTEGER DEFAULT 0 NOT NULL, started_at TEXT NOT NULL, finished_at TEXT, error_code TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS normative_source_snapshots (id TEXT PRIMARY KEY NOT NULL, run_id TEXT NOT NULL, source_version_id TEXT NOT NULL, source_code TEXT NOT NULL, capture_status TEXT NOT NULL, http_status INTEGER, content_hash TEXT, previous_content_hash TEXT, normalized_content_hash TEXT, final_url TEXT, access_path TEXT DEFAULT 'none' NOT NULL, attempts INTEGER DEFAULT 0 NOT NULL, bytes_hashed INTEGER DEFAULT 0 NOT NULL, alternative_http_status INTEGER, etag TEXT, last_modified TEXT, checked_at TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL)"),
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
    "INSERT OR IGNORE INTO normative_sources (id, code, catalog_version, title, publisher, jurisdiction, legal_device, source_kind, source_url, effective_from, effective_to, verification_status, impacted_rule_codes_json, metadata_hash, criticality, monitoring_frequency, alternative_url, alternative_evidence_scope) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  ).bind(id, source.code, NORMATIVE_GOVERNANCE_VERSION, source.title, source.publisher, source.jurisdiction, source.legalDevice, source.sourceKind, source.url, source.effectiveFrom, source.effectiveTo, source.verificationStatus, JSON.stringify(source.impactedRuleCodes), metadataHash, source.criticality, source.monitoringFrequency, source.officialAlternativeUrl, source.alternativeEvidenceScope)));
  return new Map(versions.map(({ source, id }) => [source.code, id]));
}

type NormativeFetcher = (input: string, init?: RequestInit) => Promise<Response>;

async function fetchWithRetry(url: string, fetcher: NormativeFetcher, maxAttempts = 2) {
  let response: Response | null = null;
  let attempts = 0;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    attempts = attempt;
    try {
      response = await fetcher(url, {
        headers: {
          "User-Agent": "CBSHub-Normative-Monitor/3.0",
          Accept: "text/html,application/xhtml+xml,application/pdf;q=0.8,*/*;q=0.5",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(10_000),
      });
      if (response.ok || ![408, 425, 429, 500, 502, 503, 504].includes(response.status)) break;
    } catch {
      response = null;
    }
  }
  return { response, attempts };
}

function normalizedText(bytes: Uint8Array) {
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function captureNormativeSource(source: GovernedNormativeSource, fetcher: NormativeFetcher = fetch): Promise<SourceCapture> {
  const checkedAt = isoNow();
  const direct = await fetchWithRetry(source.url, fetcher, 2);
  if (direct.response?.ok) {
    const rawBytes = new Uint8Array(await direct.response.arrayBuffer());
    const bytes = rawBytes.slice(0, 750_000);
    return { source, status: "checked", httpStatus: direct.response.status, contentHash: await sha256Hex(bytes), normalizedContentHash: await sha256Hex(normalizedText(bytes)), etag: direct.response.headers.get("etag"), lastModified: direct.response.headers.get("last-modified"), finalUrl: direct.response.url || source.url, accessPath: "direct", attempts: direct.attempts, bytesHashed: bytes.length, alternativeHttpStatus: null, checkedAt };
  }
  const alternative = source.officialAlternativeUrl ? await fetchWithRetry(source.officialAlternativeUrl, fetcher, 1) : { response: null, attempts: 0 };
  return { source, status: "unavailable", httpStatus: direct.response?.status ?? null, contentHash: null, normalizedContentHash: null, etag: direct.response?.headers.get("etag") ?? null, lastModified: direct.response?.headers.get("last-modified") ?? null, finalUrl: direct.response?.url || source.url, accessPath: alternative.response?.ok ? "official_alternative" : "none", attempts: direct.attempts + alternative.attempts, bytesHashed: 0, alternativeHttpStatus: alternative.response?.status ?? null, checkedAt };
}

async function captureDailySources(sources: readonly GovernedNormativeSource[]) {
  const byDomain = new Map<string, GovernedNormativeSource[]>();
  for (const source of sources) {
    const host = new URL(source.url).hostname;
    byDomain.set(host, [...(byDomain.get(host) ?? []), source]);
  }
  const groups = await Promise.all(Array.from(byDomain.values(), async (domainSources) => {
    const captures: SourceCapture[] = [];
    for (const source of domainSources) captures.push(await captureNormativeSource(source));
    return captures;
  }));
  return groups.flat();
}

async function previousSnapshot(db: D1Database, sourceCode: string) {
  return db.prepare("SELECT id, capture_status, content_hash, normalized_content_hash, final_url FROM normative_source_snapshots WHERE source_code = ? ORDER BY checked_at DESC, id DESC LIMIT 1")
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

type PersistedChangeKind = "new_source" | "technical_change" | "editorial_change" | "potentially_normative_change" | "unavailable" | "recovered";

async function createChangeEvent(db: D1Database, capture: SourceCapture, currentSnapshotId: string, previous: PreviousSnapshot | null, changeKind: PersistedChangeKind) {
  const eventId = crypto.randomUUID();
  const detectedAt = capture.checkedAt;
  const inserted = await db.prepare("INSERT OR IGNORE INTO normative_change_events (id, source_code, previous_snapshot_id, current_snapshot_id, change_kind, status, impacted_rule_codes_json, detected_at, created_at) VALUES (?, ?, ?, ?, ?, 'pending_review', ?, ?, ?)")
    .bind(eventId, capture.source.code, previous?.id ?? null, currentSnapshotId, changeKind, JSON.stringify(capture.source.impactedRuleCodes), detectedAt, detectedAt).run();
  if (inserted.meta.changes !== 1) return 0;
  const invalidated = await invalidateAffectedDossiers(db, eventId, capture.source, detectedAt);
  const regression = await buildFiscalRegressionReport(capture.source.impactedRuleCodes);
  const regressionEvidence = {
    reportVersion: regression.reportVersion,
    status: regression.status,
    fingerprint: regression.fingerprint,
    affectedRuleCodes: regression.affectedRuleCodes,
    unmappedRuleCodes: regression.unmappedRuleCodes,
    metrics: regression.metrics,
    modules: regression.modules.map((module) => ({
      code: module.code,
      ruleVersion: module.ruleVersion,
      fingerprint: module.fingerprint,
      status: module.status,
    })),
    errors: regression.errors,
  };
  await db.prepare("INSERT INTO normative_governance_audit_events (change_event_id, event_type, event_data, created_at) VALUES (?, 'fiscal_regression.affected_rules_reexecuted', ?, ?)")
    .bind(eventId, JSON.stringify(regressionEvidence), detectedAt).run();
  await db.prepare("INSERT INTO normative_governance_audit_events (change_event_id, event_type, event_data, created_at) VALUES (?, 'normative_change.detected', ?, ?)")
    .bind(eventId, JSON.stringify({ sourceCode: capture.source.code, changeKind, impactedRuleCodes: capture.source.impactedRuleCodes, invalidatedDossiers: invalidated, regressionStatus: regression.status, regressionFingerprint: regression.fingerprint }), detectedAt).run();
  return 1;
}

export async function runNormativeMonitor(environment: NormativeMonitorEnvironment, date = monitorDate(), shard = 0, shardCount = NORMATIVE_MONITOR_SHARD_COUNT) {
  const db = environment.DB;
  await ensureNormativeGovernanceSchema(db);
  const sourceVersionIds = await registerSources(db);
  const rotation = sourcesForMonitorDate(date, governedNormativeSources, shard, shardCount);
  const runCatalogVersion = `${NORMATIVE_GOVERNANCE_VERSION}:daily-${shard + 1}-of-${shardCount}`;
  const startedAt = isoNow();
  const requestedRunId = crypto.randomUUID();
  await db.prepare("INSERT OR IGNORE INTO normative_monitor_runs (id, run_date, status, catalog_version, source_count, started_at, created_at) VALUES (?, ?, 'running', ?, ?, ?, ?)")
    .bind(requestedRunId, date, runCatalogVersion, rotation.sources.length, startedAt, startedAt).run();
  const run = await db.prepare("SELECT id, status FROM normative_monitor_runs WHERE run_date = ? AND catalog_version = ? LIMIT 1")
    .bind(date, runCatalogVersion).first<{ id: string; status: string }>();
  if (!run) throw new Error("normative_monitor_run_unavailable");
  if (run.status === "completed") return { runId: run.id, status: "already_completed" as const, rotation };

  const previousCompleted = await db.prepare("SELECT COUNT(*) AS total FROM normative_monitor_runs WHERE status = 'completed' AND id <> ?")
    .bind(run.id).first<{ total: number }>();
  const bootstrap = Number(previousCompleted?.total ?? 0) === 0;
  try {
    const captures = await captureDailySources(rotation.sources);
    let changes = 0;
    for (const capture of captures) {
      const previous = await previousSnapshot(db, capture.source.code);
      const classification = classifyCapturedChange(previous ? { sourceCode: capture.source.code, status: previous.capture_status, contentHash: previous.content_hash, normalizedContentHash: previous.normalized_content_hash, finalUrl: previous.final_url } : null, { sourceCode: capture.source.code, status: capture.status, contentHash: capture.contentHash, normalizedContentHash: capture.normalizedContentHash, finalUrl: capture.finalUrl });
      const snapshotId = `${run.id}:${capture.source.code}`;
      const insertedSnapshot = await db.prepare("INSERT OR IGNORE INTO normative_source_snapshots (id, run_id, source_version_id, source_code, capture_status, http_status, content_hash, previous_content_hash, normalized_content_hash, final_url, access_path, attempts, bytes_hashed, alternative_http_status, etag, last_modified, checked_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(snapshotId, run.id, sourceVersionIds.get(capture.source.code), capture.source.code, capture.status, capture.httpStatus, capture.contentHash, previous?.content_hash ?? null, capture.normalizedContentHash, capture.finalUrl, capture.accessPath, capture.attempts, capture.bytesHashed, capture.alternativeHttpStatus, capture.etag, capture.lastModified, capture.checkedAt, capture.checkedAt).run();
      if (insertedSnapshot.meta.changes !== 1) continue;
      if (classification !== "unchanged" && classification !== "baseline") {
        changes += await createChangeEvent(db, capture, snapshotId, previous, classification);
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
  const [runs, events, invalidations, notifications, rules, releases, regressionRuns] = await Promise.all([
    db.prepare("SELECT id, run_date, status, source_count, checked_count, unavailable_count, change_count, started_at, finished_at FROM normative_monitor_runs ORDER BY run_date DESC, created_at DESC LIMIT 14").all<Record<string, string | number | null>>(),
    db.prepare("SELECT e.*, s.title, s.publisher, s.jurisdiction, s.legal_device, s.source_url FROM normative_change_events e LEFT JOIN normative_sources s ON s.id = (SELECT s2.id FROM normative_sources s2 WHERE s2.code = e.source_code ORDER BY s2.created_at DESC, s2.id DESC LIMIT 1) ORDER BY e.detected_at DESC, e.id DESC LIMIT 100").all<Record<string, string | number | null>>(),
    db.prepare("SELECT id, change_event_id, dossier_id, rule_code, rule_version, status, reason, created_at FROM fiscal_result_invalidations WHERE workspace_id = ? AND status = 'open' ORDER BY created_at DESC LIMIT 100").bind(workspaceId).all<Record<string, string | number | null>>(),
    db.prepare("SELECT id, notification_type, subject_type, subject_id, message, read_at, created_at FROM governance_notifications WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 50").bind(workspaceId).all<Record<string, string | number | null>>(),
    db.prepare("SELECT id, code, version, name, status, effective_from, effective_to, source_count, content_hash FROM fiscal_rule_sets ORDER BY effective_to, code, version").all<RuleRow>(),
    db.prepare("SELECT id, version, manifest_hash, previous_release_hash, source_change_event_id, release_kind, status, created_at FROM fiscal_rule_releases ORDER BY created_at DESC LIMIT 20").all<Record<string, string | number | null>>(),
    db.prepare("SELECT id, change_event_id, event_data, created_at FROM normative_governance_audit_events WHERE event_type = 'fiscal_regression.affected_rules_reexecuted' ORDER BY created_at DESC, id DESC LIMIT 20").all<Record<string, string | number | null>>(),
  ]);

  const sourceRows = await db.prepare("SELECT s.*, snap.capture_status, snap.http_status, snap.content_hash, snap.normalized_content_hash, snap.final_url, snap.access_path, snap.attempts, snap.bytes_hashed, snap.alternative_http_status, snap.checked_at FROM normative_sources s LEFT JOIN normative_source_snapshots snap ON snap.id = (SELECT ss.id FROM normative_source_snapshots ss WHERE ss.source_code = s.code ORDER BY ss.checked_at DESC, ss.id DESC LIMIT 1) WHERE s.id = (SELECT ns.id FROM normative_sources ns WHERE ns.code = s.code ORDER BY ns.created_at DESC, ns.id DESC LIMIT 1) ORDER BY s.jurisdiction, s.code")
    .all<Record<string, string | number | null>>();
  const changeHistory = events.results.map((event) => ({
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
    resolvedAt: event.resolved_at ? String(event.resolved_at) : null,
    resolutionReleaseId: event.resolution_release_id ? String(event.resolution_release_id) : null,
  }));
  const queue = changeHistory.filter((event) => ["pending_review", "awaiting_new_version"].includes(event.status));
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
    criticality: String(source.criticality ?? "standard"),
    monitoringFrequency: String(source.monitoring_frequency ?? "daily"),
    officialAlternativeUrl: source.alternative_url ? String(source.alternative_url) : null,
    alternativeEvidenceScope: String(source.alternative_evidence_scope ?? "not_available"),
    impactedRuleCodes: parseList(String(source.impacted_rule_codes_json ?? "[]")),
    captureStatus: source.capture_status ? String(source.capture_status) : "not_checked",
    httpStatus: source.http_status === null ? null : Number(source.http_status),
    checkedAt: source.checked_at ? String(source.checked_at) : null,
    contentFingerprint: source.content_hash ? String(source.content_hash).slice(0, 12) : null,
    normalizedFingerprint: source.normalized_content_hash ? String(source.normalized_content_hash).slice(0, 12) : null,
    finalUrl: source.final_url ? String(source.final_url) : null,
    accessPath: source.access_path ? String(source.access_path) : "none",
    attempts: Number(source.attempts ?? 0),
    bytesHashed: Number(source.bytes_hashed ?? 0),
    alternativeHttpStatus: source.alternative_http_status === null ? null : Number(source.alternative_http_status),
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
  const todayRuns = recentRuns.filter((run) => run.runDate === today);
  return {
    version: NORMATIVE_GOVERNANCE_VERSION,
    catalogValidation: validateGovernedSourceCatalog(),
    sources: sourceCatalog,
    queue,
    changeHistory,
    invalidations: openInvalidations,
    notifications: notifications.results.map((row) => ({ ...row, unread: !row.read_at })),
    rules: ruleCatalog,
    releases: releases.results,
    regressionRuns: regressionRuns.results.map((row) => {
      try {
        return { id: Number(row.id), changeEventId: String(row.change_event_id), createdAt: String(row.created_at), ...JSON.parse(String(row.event_data)) };
      } catch {
        return { id: Number(row.id), changeEventId: String(row.change_event_id), createdAt: String(row.created_at), status: "blocked", errors: ["invalid_regression_audit_payload"] };
      }
    }),
    runs: recentRuns,
    metrics: {
      monitored: governedNormativeSources.length,
      checkedToday: todayRuns.reduce((total, run) => total + run.sourceCount, 0),
      checked: todayRuns.reduce((total, run) => total + run.checked, 0),
      dailyShardsCompleted: todayRuns.filter((run) => run.status === "completed").length,
      unavailable: sourceCatalog.filter((source) => source.captureStatus === "unavailable").length,
      changeSignals: queue.length,
      potentiallyNormative: queue.filter((event) => event.changeKind === "potentially_normative_change").length,
      technicalOrEditorial: queue.filter((event) => ["technical_change", "editorial_change", "unavailable", "recovered"].includes(event.changeKind)).length,
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

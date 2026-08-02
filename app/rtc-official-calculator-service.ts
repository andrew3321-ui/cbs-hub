import {
  RTC_OFFICIAL_API_BASE,
  RTC_OFFICIAL_CORPUS_VERSION,
  assessRtcPromotion,
  assessRtcRollback,
  hashRtcOfficialPayload,
  officialRtcFixtureRequest,
  reconcileRtcOfficialCandidate,
  rtcOfficialComparisonCorpus,
  rtcOfficialDatasetDefinitions,
  rtcOfficialPackageManifest,
  type RtcObservedFixture,
} from "../domain/rtc-official-calculator-governance.ts";

type OfficialVersionResponse = {
  versaoApp: string;
  versaoDb: string;
  descricaoVersaoDb?: string;
  dataVersaoDb: string;
  ambiente: string;
};

type VersionRow = {
  id: string;
  application_version: string;
  database_version: string;
  database_date: string;
  environment: string;
  status: string;
  fingerprint: string;
};

type ReconciliationRow = {
  id: string;
  version_id: string;
  status: string;
  difference_count: number;
  differences_json: string;
  report_json: string;
  fingerprint: string;
};

function nowIso() {
  return new Date().toISOString();
}

async function fetchJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, headers: { Accept: "application/json", ...(init?.headers ?? {}) } });
  if (!response.ok) throw new Error(`rtc_official_http_${response.status}`);
  return response.json() as Promise<T>;
}

function decimalToCents(value: unknown) {
  const normalized = String(value ?? "").trim();
  const match = normalized.match(/^(-?)(\d+)(?:\.(\d{1,8}))?$/);
  if (!match) throw new Error("rtc_official_invalid_decimal");
  const fraction = `${match[3] ?? ""}00`.slice(0, 2);
  const cents = Number(match[2]) * 100 + Number(fraction);
  if (!Number.isSafeInteger(cents)) throw new Error("rtc_official_unsafe_amount");
  return match[1] ? -cents : cents;
}

function firstCalculation(response: Record<string, unknown>) {
  const objects = Array.isArray(response.objetos) ? response.objetos : [];
  const first = (objects[0] ?? {}) as Record<string, unknown>;
  const tribCalc = (first.tribCalc ?? {}) as Record<string, unknown>;
  const ibsCbs = (tribCalc.IBSCBS ?? {}) as Record<string, unknown>;
  const group = (ibsCbs.gIBSCBS ?? {}) as Record<string, unknown>;
  const cbs = (group.gCBS ?? {}) as Record<string, unknown>;
  const state = (group.gIBSUF ?? {}) as Record<string, unknown>;
  const city = (group.gIBSMun ?? {}) as Record<string, unknown>;
  return { ibsCbs, group, cbs, state, city };
}

async function observeFixture(fixture: (typeof rtcOfficialComparisonCorpus)[number]): Promise<RtcObservedFixture> {
  const request = officialRtcFixtureRequest(fixture);
  const response = await fetchJson<Record<string, unknown>>(`${RTC_OFFICIAL_API_BASE}/calculadora/regime-geral`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  const xmlResponse = await fetch(`${RTC_OFFICIAL_API_BASE}/calculadora/xml/generate?tipo=nfe`, {
    method: "POST",
    headers: { Accept: "application/xml", "Content-Type": "application/json" },
    body: JSON.stringify({ oper: request, objetos: response.objetos, total: response.total }),
  });
  if (!xmlResponse.ok) throw new Error(`rtc_official_xml_http_${xmlResponse.status}`);
  const xml = await xmlResponse.text();
  const { ibsCbs, group, cbs, state, city } = firstCalculation(response);
  return {
    code: fixture.code,
    cst: String(ibsCbs.CST ?? ""),
    cClassTrib: String(ibsCbs.cClassTrib ?? ""),
    cbsCents: decimalToCents(cbs.vCBS),
    ibsStateCents: decimalToCents(state.vIBSUF),
    ibsMunicipalCents: decimalToCents(city.vIBSMun),
    ibsTotalCents: decimalToCents(group.vIBS),
    cbsMemory: String(cbs.memoriaCalculo ?? ""),
    ibsStateMemory: String(state.memoriaCalculo ?? ""),
    xml,
  };
}

export async function ensureRtcOfficialCalculatorSchema(db: D1Database) {
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS rtc_calculator_versions (id TEXT PRIMARY KEY NOT NULL, application_version TEXT NOT NULL, database_version TEXT NOT NULL, database_date TEXT NOT NULL, environment TEXT NOT NULL, package_manifest_json TEXT NOT NULL, package_license_status TEXT NOT NULL, status TEXT DEFAULT 'candidate' NOT NULL, fingerprint TEXT NOT NULL, detected_at TEXT NOT NULL, canary_at TEXT, activated_at TEXT, revoked_at TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS rtc_calculator_datasets (id TEXT PRIMARY KEY NOT NULL, version_id TEXT NOT NULL, dataset_code TEXT NOT NULL, dataset_kind TEXT NOT NULL, effective_date TEXT NOT NULL, record_count INTEGER NOT NULL, content_hash TEXT NOT NULL, payload_json TEXT NOT NULL, captured_at TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS rtc_calculator_reconciliations (id TEXT PRIMARY KEY NOT NULL, version_id TEXT NOT NULL, corpus_version TEXT NOT NULL, status TEXT NOT NULL, case_count INTEGER NOT NULL, dataset_count INTEGER NOT NULL, difference_count INTEGER NOT NULL, differences_json TEXT DEFAULT '[]' NOT NULL, report_json TEXT DEFAULT '{}' NOT NULL, fingerprint TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS rtc_calculator_events (id TEXT PRIMARY KEY NOT NULL, version_id TEXT NOT NULL, event_type TEXT NOT NULL, from_status TEXT, to_status TEXT, evidence_json TEXT DEFAULT '{}' NOT NULL, actor_user_id INTEGER, created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS rtc_calculator_versions_app_db_idx ON rtc_calculator_versions (application_version, database_version, environment)"),
    db.prepare("CREATE INDEX IF NOT EXISTS rtc_calculator_versions_status_updated_idx ON rtc_calculator_versions (status, updated_at, id)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS rtc_calculator_datasets_version_code_idx ON rtc_calculator_datasets (version_id, dataset_code)"),
    db.prepare("CREATE INDEX IF NOT EXISTS rtc_calculator_datasets_code_captured_idx ON rtc_calculator_datasets (dataset_code, captured_at, id)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS rtc_calculator_reconciliations_version_fingerprint_idx ON rtc_calculator_reconciliations (version_id, fingerprint)"),
    db.prepare("CREATE INDEX IF NOT EXISTS rtc_calculator_reconciliations_status_created_idx ON rtc_calculator_reconciliations (status, created_at, id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS rtc_calculator_events_version_created_idx ON rtc_calculator_events (version_id, created_at, id)"),
  ]);
}

export async function captureOfficialRtcCandidate(db: D1Database) {
  await ensureRtcOfficialCalculatorSchema(db);
  const capturedAt = nowIso();
  const officialVersion = await fetchJson<OfficialVersionResponse>(rtcOfficialPackageManifest.versionUrl);
  const version = {
    applicationVersion: officialVersion.versaoApp,
    databaseVersion: officialVersion.versaoDb,
    databaseDate: officialVersion.dataVersaoDb,
    environment: officialVersion.ambiente,
  };
  const versionId = `rtc:${version.applicationVersion}:${version.databaseVersion}:${version.environment}`;

  const datasets = await Promise.all(rtcOfficialDatasetDefinitions.map(async (definition) => {
    const payload = await fetchJson<unknown>(`${RTC_OFFICIAL_API_BASE}${definition.path}`);
    const recordCount = Array.isArray(payload) ? payload.length : 1;
    const contentHash = await hashRtcOfficialPayload(payload);
    return { ...definition, payload, recordCount, contentHash };
  }));
  const observations = await Promise.all(rtcOfficialComparisonCorpus.map(observeFixture));
  const report = reconcileRtcOfficialCandidate({ version, datasets, observations });
  const fingerprint = await hashRtcOfficialPayload({ version, datasets: datasets.map(({ code, recordCount, contentHash }) => ({ code, recordCount, contentHash })), observations });
  const nextStatus = report.promotionAllowed ? "canary" : "blocked_divergence";

  const statements = [
    db.prepare("INSERT INTO rtc_calculator_versions (id, application_version, database_version, database_date, environment, package_manifest_json, package_license_status, status, fingerprint, detected_at, canary_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'official_reference_only_no_redistribution', ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET database_date = excluded.database_date, package_manifest_json = excluded.package_manifest_json, fingerprint = excluded.fingerprint, status = CASE WHEN rtc_calculator_versions.status = 'active' THEN 'active' ELSE excluded.status END, canary_at = CASE WHEN rtc_calculator_versions.status = 'active' THEN rtc_calculator_versions.canary_at ELSE excluded.canary_at END, updated_at = excluded.updated_at")
      .bind(versionId, version.applicationVersion, version.databaseVersion, version.databaseDate, version.environment, JSON.stringify(rtcOfficialPackageManifest), nextStatus, fingerprint, capturedAt, report.promotionAllowed ? capturedAt : null, capturedAt, capturedAt),
  ];
  for (const dataset of datasets) {
    statements.push(db.prepare("INSERT INTO rtc_calculator_datasets (id, version_id, dataset_code, dataset_kind, effective_date, record_count, content_hash, payload_json, captured_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(version_id, dataset_code) DO UPDATE SET record_count = excluded.record_count, content_hash = excluded.content_hash, payload_json = excluded.payload_json, captured_at = excluded.captured_at")
      .bind(`${versionId}:${dataset.code}`, versionId, dataset.code, dataset.kind, dataset.effectiveDate, dataset.recordCount, dataset.contentHash, JSON.stringify(dataset.payload), capturedAt, capturedAt));
  }
  const reconciliationId = `${versionId}:${fingerprint}`;
  statements.push(
    db.prepare("INSERT OR IGNORE INTO rtc_calculator_reconciliations (id, version_id, corpus_version, status, case_count, dataset_count, difference_count, differences_json, report_json, fingerprint, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(reconciliationId, versionId, RTC_OFFICIAL_CORPUS_VERSION, report.status, report.comparedCases, report.comparedDatasets, report.differences.length, JSON.stringify(report.differences), JSON.stringify({ report, version, datasets: datasets.map(({ code, recordCount, contentHash }) => ({ code, recordCount, contentHash })) }), fingerprint, capturedAt),
    db.prepare("INSERT OR IGNORE INTO rtc_calculator_events (id, version_id, event_type, from_status, to_status, evidence_json, created_at) VALUES (?, ?, 'rtc.official_candidate_reconciled', 'candidate', ?, ?, ?)")
      .bind(`${reconciliationId}:event`, versionId, nextStatus, JSON.stringify({ reconciliationId, report, fingerprint, officialDescription: officialVersion.descricaoVersaoDb ?? null }), capturedAt),
  );
  await db.batch(statements);
  return { versionId, version, status: nextStatus, fingerprint, report, datasets: datasets.map(({ code, recordCount, contentHash }) => ({ code, recordCount, contentHash })) };
}

async function latestReconciliation(db: D1Database, versionId: string) {
  return db.prepare("SELECT * FROM rtc_calculator_reconciliations WHERE version_id = ? ORDER BY created_at DESC, id DESC LIMIT 1").bind(versionId).first<ReconciliationRow>();
}

export async function promoteOfficialRtcCandidate(db: D1Database, versionId: string, actorUserId: number) {
  await ensureRtcOfficialCalculatorSchema(db);
  const version = await db.prepare("SELECT * FROM rtc_calculator_versions WHERE id = ? LIMIT 1").bind(versionId).first<VersionRow>();
  const reconciliation = await latestReconciliation(db, versionId);
  if (!version || !reconciliation) return { ok: false as const, status: 404, blockers: ["candidate_not_found"] };
  const assessment = assessRtcPromotion({
    currentStatus: version.status,
    reconciliationStatus: reconciliation.status,
    differenceCount: reconciliation.difference_count,
    fingerprintMatches: reconciliation.fingerprint === version.fingerprint,
  });
  if (!assessment.allowed) return { ok: false as const, status: 409, blockers: assessment.blockers };
  const timestamp = nowIso();
  const eventId = crypto.randomUUID();
  await db.batch([
    db.prepare("UPDATE rtc_calculator_versions SET status = 'revoked', revoked_at = ?, updated_at = ? WHERE status = 'active' AND id <> ?").bind(timestamp, timestamp, versionId),
    db.prepare("UPDATE rtc_calculator_versions SET status = 'active', activated_at = ?, revoked_at = NULL, updated_at = ? WHERE id = ? AND status = 'canary'").bind(timestamp, timestamp, versionId),
    db.prepare("INSERT INTO rtc_calculator_events (id, version_id, event_type, from_status, to_status, evidence_json, actor_user_id, created_at) VALUES (?, ?, 'rtc.official_candidate_promoted', 'canary', 'active', ?, ?, ?)").bind(eventId, versionId, JSON.stringify({ reconciliationId: reconciliation.id, fingerprint: version.fingerprint, zeroDivergence: true }), actorUserId, timestamp),
  ]);
  return { ok: true as const, status: 200, versionId, eventId };
}

export async function rollbackOfficialRtcVersion(db: D1Database, activeId: string, targetId: string, actorUserId: number) {
  await ensureRtcOfficialCalculatorSchema(db);
  const [active, target, targetReconciliation] = await Promise.all([
    db.prepare("SELECT * FROM rtc_calculator_versions WHERE id = ? LIMIT 1").bind(activeId).first<VersionRow>(),
    db.prepare("SELECT * FROM rtc_calculator_versions WHERE id = ? LIMIT 1").bind(targetId).first<VersionRow>(),
    latestReconciliation(db, targetId),
  ]);
  if (!active || !target || !targetReconciliation) return { ok: false as const, status: 404, blockers: ["rollback_version_not_found"] };
  const assessment = assessRtcRollback({ activeStatus: active.status, targetStatus: target.status, targetReconciliationStatus: targetReconciliation.status, sameVersion: active.id === target.id });
  if (!assessment.allowed) return { ok: false as const, status: 409, blockers: assessment.blockers };
  const timestamp = nowIso();
  const rollbackId = crypto.randomUUID();
  await db.batch([
    db.prepare("UPDATE rtc_calculator_versions SET status = 'revoked', revoked_at = ?, updated_at = ? WHERE id = ? AND status = 'active'").bind(timestamp, timestamp, activeId),
    db.prepare("UPDATE rtc_calculator_versions SET status = 'active', activated_at = ?, revoked_at = NULL, updated_at = ? WHERE id = ? AND status = 'revoked'").bind(timestamp, timestamp, targetId),
    db.prepare("INSERT INTO rtc_calculator_events (id, version_id, event_type, from_status, to_status, evidence_json, actor_user_id, created_at) VALUES (?, ?, 'rtc.official_version_rolled_back', 'active', 'revoked', ?, ?, ?)").bind(`${rollbackId}:source`, activeId, JSON.stringify({ rollbackId, targetId, targetReconciliationId: targetReconciliation.id }), actorUserId, timestamp),
    db.prepare("INSERT INTO rtc_calculator_events (id, version_id, event_type, from_status, to_status, evidence_json, actor_user_id, created_at) VALUES (?, ?, 'rtc.official_version_restored', 'revoked', 'active', ?, ?, ?)").bind(`${rollbackId}:target`, targetId, JSON.stringify({ rollbackId, activeId, targetReconciliationId: targetReconciliation.id }), actorUserId, timestamp),
  ]);
  return { ok: true as const, status: 200, rollbackId, activeId: targetId };
}

export async function getRtcOfficialCalculatorDashboard(db: D1Database) {
  await ensureRtcOfficialCalculatorSchema(db);
  const [versions, datasets, reconciliations, events] = await Promise.all([
    db.prepare("SELECT id, application_version, database_version, database_date, environment, package_license_status, status, fingerprint, detected_at, canary_at, activated_at, revoked_at, updated_at FROM rtc_calculator_versions ORDER BY detected_at DESC, id DESC LIMIT 30").all<Record<string, unknown>>(),
    db.prepare("SELECT version_id, dataset_code, dataset_kind, effective_date, record_count, content_hash, captured_at FROM rtc_calculator_datasets ORDER BY captured_at DESC, dataset_code LIMIT 100").all<Record<string, unknown>>(),
    db.prepare("SELECT id, version_id, corpus_version, status, case_count, dataset_count, difference_count, differences_json, fingerprint, created_at FROM rtc_calculator_reconciliations ORDER BY created_at DESC, id DESC LIMIT 50").all<Record<string, unknown>>(),
    db.prepare("SELECT id, version_id, event_type, from_status, to_status, evidence_json, actor_user_id, created_at FROM rtc_calculator_events ORDER BY created_at DESC, id DESC LIMIT 100").all<Record<string, unknown>>(),
  ]);
  return {
    packageManifest: rtcOfficialPackageManifest,
    versions: versions.results,
    datasets: datasets.results,
    reconciliations: reconciliations.results.map((row) => ({ ...row, differences: JSON.parse(String(row.differences_json ?? "[]")), differences_json: undefined })),
    events: events.results.map((row) => ({ ...row, evidence: JSON.parse(String(row.evidence_json ?? "{}")), evidence_json: undefined })),
    policy: { automaticPromotion: false, zeroDivergenceRequired: true, officialBinaryInWorker: false, paidServiceRequired: false, rollbackRequiresPreviouslyActiveVersion: true },
  };
}

export async function runScheduledRtcCalculatorSync(db: D1Database) {
  return captureOfficialRtcCandidate(db);
}

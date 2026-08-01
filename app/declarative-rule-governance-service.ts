import {
  assessRuleTransition,
  buildAtomicRollbackPlan,
  buildRtc2026DeclarativeCanary,
  declarativeSelectorKey,
  hashDeclarativeRule,
  runRtc2026DeclarativeCanary,
  validateDeclarativeRule,
  validateDeclarativeTimeline,
  type DeclarativeFiscalRule,
  type DeclarativeRuleStatus,
  type DeclarativeRuleVersion,
} from "../domain/declarative-rule-governance.ts";
import { buildFiscalRegressionReport } from "../domain/fiscal-regression-assurance.ts";

type RuleRow = {
  id: string;
  rule_code: string;
  version: string;
  schema_version: string;
  definition_json: string;
  selector_key: string;
  effective_from: string;
  effective_to: string;
  priority: number;
  content_hash: string;
  predecessor_hash: string | null;
  status: DeclarativeRuleStatus;
  regression_fingerprint: string | null;
  validated_at: string | null;
  canary_at: string | null;
  activated_at: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
};

function nowIso() {
  return new Date().toISOString();
}

function parseRuleRow(row: RuleRow): DeclarativeRuleVersion {
  return {
    definition: JSON.parse(row.definition_json) as DeclarativeFiscalRule,
    contentHash: row.content_hash,
    status: row.status,
    regressionFingerprint: row.regression_fingerprint,
  };
}

export function capturedLegalTextCanPromote() {
  return false as const;
}

export async function ensureDeclarativeRuleSchema(db: D1Database) {
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS declarative_rule_versions (id TEXT PRIMARY KEY NOT NULL, rule_code TEXT NOT NULL, version TEXT NOT NULL, schema_version TEXT NOT NULL, definition_json TEXT NOT NULL, selector_key TEXT NOT NULL, effective_from TEXT NOT NULL, effective_to TEXT NOT NULL, priority INTEGER DEFAULT 0 NOT NULL, content_hash TEXT NOT NULL, predecessor_hash TEXT, status TEXT DEFAULT 'draft' NOT NULL, regression_fingerprint TEXT, validated_at TEXT, canary_at TEXT, activated_at TEXT, revoked_at TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS declarative_rule_events (id TEXT PRIMARY KEY NOT NULL, rule_version_id TEXT NOT NULL, event_type TEXT NOT NULL, from_status TEXT, to_status TEXT, evidence_json TEXT DEFAULT '{}' NOT NULL, actor_user_id INTEGER, created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS declarative_rule_versions_code_version_idx ON declarative_rule_versions (rule_code, version)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS declarative_rule_versions_hash_idx ON declarative_rule_versions (content_hash)"),
    db.prepare("CREATE INDEX IF NOT EXISTS declarative_rule_versions_selector_period_idx ON declarative_rule_versions (selector_key, effective_from, effective_to, priority)"),
    db.prepare("CREATE INDEX IF NOT EXISTS declarative_rule_versions_status_updated_idx ON declarative_rule_versions (status, updated_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS declarative_rule_events_version_created_idx ON declarative_rule_events (rule_version_id, created_at, id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS declarative_rule_events_type_created_idx ON declarative_rule_events (event_type, created_at, id)"),
  ]);
}

export async function seedRtc2026DeclarativeCanary(db: D1Database) {
  const version = await buildRtc2026DeclarativeCanary();
  const canary = await runRtc2026DeclarativeCanary(version);
  if (!canary.passed) throw new Error("declarative_canary_failed");
  const id = `${version.definition.ruleCode}:${version.contentHash.slice(0, 24)}`;
  const timestamp = nowIso();
  await db.batch([
    db.prepare("INSERT OR IGNORE INTO declarative_rule_versions (id, rule_code, version, schema_version, definition_json, selector_key, effective_from, effective_to, priority, content_hash, predecessor_hash, status, regression_fingerprint, validated_at, canary_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'canary', ?, ?, ?, ?, ?)")
      .bind(id, version.definition.ruleCode, version.definition.version, version.definition.schemaVersion, JSON.stringify(version.definition), declarativeSelectorKey(version.definition), version.definition.effectiveFrom, version.definition.effectiveTo, version.definition.priority, version.contentHash, version.definition.predecessorHash, canary.resultFingerprint, timestamp, timestamp, timestamp, timestamp),
    db.prepare("INSERT OR IGNORE INTO declarative_rule_events (id, rule_version_id, event_type, from_status, to_status, evidence_json, created_at) VALUES (?, ?, 'rule.seeded_canary', 'draft', 'canary', ?, ?)")
      .bind(`${id}:seeded-canary`, id, JSON.stringify({ validation: canary.validation, checksumMatches: canary.checksumMatches, caseCount: canary.cases.length, resultFingerprint: canary.resultFingerprint, runtimeChanged: false, safety: canary.safety }), timestamp),
  ]);
  return { id, version, canary };
}

export async function listDeclarativeRules(db: D1Database) {
  const [rules, events] = await Promise.all([
    db.prepare("SELECT * FROM declarative_rule_versions ORDER BY rule_code, effective_from, priority, version").all<RuleRow>(),
    db.prepare("SELECT id, rule_version_id, event_type, from_status, to_status, evidence_json, actor_user_id, created_at FROM declarative_rule_events ORDER BY created_at DESC, id DESC LIMIT 500").all<Record<string, unknown>>(),
  ]);
  return {
    rules: rules.results.map((row) => ({ ...row, definition: JSON.parse(row.definition_json) as DeclarativeFiscalRule, definition_json: undefined })),
    events: events.results.map((event) => {
      try { return { ...event, evidence: JSON.parse(String(event.evidence_json)), evidence_json: undefined }; }
      catch { return { ...event, evidence: {}, evidence_json: undefined }; }
    }),
    safetyBoundary: { capturedLegalTextCanPromote: capturedLegalTextCanPromote(), requiresDeclarativeParameters: true, requiresOfficialSources: true, requiresFullRegressionForActivation: true },
  };
}

async function loadRuleRows(db: D1Database) {
  return (await db.prepare("SELECT * FROM declarative_rule_versions ORDER BY rule_code, effective_from, priority, version").all<RuleRow>()).results;
}

export async function advanceDeclarativeRule(db: D1Database, id: string, targetStatus: DeclarativeRuleStatus, actorUserId: number) {
  const rows = await loadRuleRows(db);
  const row = rows.find((item) => item.id === id);
  if (!row) return { ok: false as const, status: 404, blockers: ["rule_not_found"] };
  const version = parseRuleRow(row);
  const validation = validateDeclarativeRule(version.definition, version.contentHash);
  const checksumMatches = await hashDeclarativeRule(version.definition) === version.contentHash;
  const timeline = validateDeclarativeTimeline(rows.map(parseRuleRow));
  const canary = version.definition.ruleCode === "RTC-BR-2026-TEST" ? await runRtc2026DeclarativeCanary(version) : null;
  const regression = targetStatus === "active"
    ? await buildFiscalRegressionReport()
    : null;
  const regressionPassed = targetStatus === "canary"
    ? canary?.passed === true
    : targetStatus === "active"
      ? regression?.status === "automatically_verified"
      : true;
  const transition = assessRuleTransition({
    from: version.status,
    to: targetStatus,
    validationPassed: validation.passed,
    timelinePassed: timeline.passed,
    checksumMatches,
    regressionStatus: regressionPassed ? "passed" : "failed",
  });
  if (!transition.allowed) return { ok: false as const, status: 409, blockers: transition.blockers, validation, timeline, checksumMatches, regression, canary };

  const timestamp = nowIso();
  const timestampColumn = targetStatus === "automatically_validated" ? "validated_at"
    : targetStatus === "canary" ? "canary_at"
      : targetStatus === "active" ? "activated_at"
        : "revoked_at";
  const regressionFingerprint = regression?.fingerprint ?? canary?.resultFingerprint ?? version.regressionFingerprint;
  await db.batch([
    db.prepare(`UPDATE declarative_rule_versions SET status = ?, regression_fingerprint = ?, ${timestampColumn} = ?, updated_at = ? WHERE id = ? AND status = ?`)
      .bind(targetStatus, regressionFingerprint, timestamp, timestamp, id, version.status),
    db.prepare("INSERT INTO declarative_rule_events (id, rule_version_id, event_type, from_status, to_status, evidence_json, actor_user_id, created_at) VALUES (?, ?, 'rule.transitioned', ?, ?, ?, ?, ?)")
      .bind(crypto.randomUUID(), id, version.status, targetStatus, JSON.stringify({ validation, timeline, checksumMatches, regressionStatus: regression?.status ?? null, regressionFingerprint, canaryPassed: canary?.passed ?? null, runtimeChanged: targetStatus === "active" }), actorUserId, timestamp),
  ]);
  return { ok: true as const, status: 200, from: version.status, to: targetStatus, regressionFingerprint };
}

export async function rollbackDeclarativeRule(db: D1Database, activeId: string, targetId: string, actorUserId: number) {
  const rows = await loadRuleRows(db);
  const activeRow = rows.find((item) => item.id === activeId);
  const targetRow = rows.find((item) => item.id === targetId);
  if (!activeRow || !targetRow) return { ok: false as const, status: 404, blockers: ["rule_not_found"] };
  const active = parseRuleRow(activeRow);
  const target = parseRuleRow(targetRow);
  const plan = buildAtomicRollbackPlan(active, target);
  const targetValidation = validateDeclarativeRule(target.definition, target.contentHash);
  const checksumMatches = await hashDeclarativeRule(target.definition) === target.contentHash;
  const regression = await buildFiscalRegressionReport();
  const blockers = [
    ...plan.blockers,
    ...(!targetValidation.passed ? targetValidation.errors : []),
    ...(!checksumMatches ? ["checksum_mismatch"] : []),
    ...(regression.status !== "automatically_verified" ? ["regression_not_passed"] : []),
  ];
  if (blockers.length) return { ok: false as const, status: 409, blockers, plan, regression };
  const timestamp = nowIso();
  const rollbackId = crypto.randomUUID();
  const evidence = JSON.stringify({ rollbackId, plan, regressionFingerprint: regression.fingerprint, atomic: true });
  await db.batch([
    db.prepare("UPDATE declarative_rule_versions SET status = 'revoked', revoked_at = ?, updated_at = ? WHERE id = ? AND status = 'active'").bind(timestamp, timestamp, activeId),
    db.prepare("UPDATE declarative_rule_versions SET status = 'active', activated_at = ?, revoked_at = NULL, regression_fingerprint = ?, updated_at = ? WHERE id = ? AND status IN ('active', 'revoked')").bind(timestamp, regression.fingerprint, timestamp, targetId),
    db.prepare("INSERT INTO declarative_rule_events (id, rule_version_id, event_type, from_status, to_status, evidence_json, actor_user_id, created_at) VALUES (?, ?, 'rule.rollback_source', 'active', 'revoked', ?, ?, ?)").bind(`${rollbackId}:source`, activeId, evidence, actorUserId, timestamp),
    db.prepare("INSERT INTO declarative_rule_events (id, rule_version_id, event_type, from_status, to_status, evidence_json, actor_user_id, created_at) VALUES (?, ?, 'rule.rollback_target', ?, 'active', ?, ?, ?)").bind(`${rollbackId}:target`, targetId, target.status, evidence, actorUserId, timestamp),
  ]);
  return { ok: true as const, status: 200, rollbackId, regressionFingerprint: regression.fingerprint };
}

import {
  buildFiscalImpactGraph,
  classifyFiscalArtifactImpact,
  compareFiscalCentSnapshots,
  assessReexecutionClaim,
  type FiscalImpactArtifact,
} from "../domain/fiscal-impact-graph.ts";
import { fiscalRegressionModulesForRules } from "../domain/fiscal-regression-assurance.ts";

type ImpactInput = {
  changeEventId: string;
  sourceCode: string;
  impactedRuleCodes: string[];
  regressionFingerprint: string;
  detectedAt: string;
};

type DossierRow = {
  id: string;
  workspace_id: number;
  owner_user_id: number;
  company_id: number | null;
  status: string;
  base_code: string;
  base_version: string;
  facts_json: string;
  snapshot_json: string;
  input_hash: string;
  created_at: string;
};

type ScenarioRow = {
  id: number;
  workspace_id: number;
  owner_user_id: number;
  company_id: number;
  review_status: string;
  calculation_version: string;
  snapshot_json: string | null;
  input_hash: string | null;
  created_at: string;
};

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function batchInChunks(db: D1Database, statements: D1PreparedStatement[], chunkSize = 50) {
  for (let index = 0; index < statements.length; index += chunkSize) await db.batch(statements.slice(index, index + chunkSize));
}

function isoMonthFromValue(value: unknown): string | null {
  if (typeof value === "string") {
    const match = value.match(/\b(20\d{2})-(0[1-9]|1[0-2])(?:-\d{2})?\b/);
    if (match) return `${match[1]}-${match[2]}`;
  }
  if (typeof value === "number" && Number.isInteger(value) && value >= 2020 && value <= 2100) return `${value}-01`;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = isoMonthFromValue(item);
      if (found) return found;
    }
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["competence", "competenceMonth", "periodKey", "referenceDate", "operationDate", "targetYear", "year"]) {
      const found = isoMonthFromValue(record[key]);
      if (found) return found;
    }
    for (const item of Object.values(record)) {
      const found = isoMonthFromValue(item);
      if (found) return found;
    }
  }
  return null;
}

function parseJson(value: string | null) {
  try { return value ? JSON.parse(value) as unknown : null; }
  catch { return null; }
}

export function inferFiscalCompetence(...values: unknown[]) {
  for (const value of values) {
    const found = isoMonthFromValue(value);
    if (found) return found;
  }
  return null;
}

export async function ensureFiscalImpactGraphSchema(db: D1Database) {
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS fiscal_impact_runs (id TEXT PRIMARY KEY NOT NULL, change_event_id TEXT NOT NULL, source_code TEXT NOT NULL, status TEXT DEFAULT 'queued' NOT NULL, impacted_rule_codes_json TEXT DEFAULT '[]' NOT NULL, regression_fingerprint TEXT, affected_companies INTEGER DEFAULT 0 NOT NULL, affected_competences INTEGER DEFAULT 0 NOT NULL, affected_artifacts INTEGER DEFAULT 0 NOT NULL, blocked_artifacts INTEGER DEFAULT 0 NOT NULL, historical_notices INTEGER DEFAULT 0 NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL, finished_at TEXT)"),
    db.prepare("CREATE TABLE IF NOT EXISTS fiscal_impact_nodes (id TEXT PRIMARY KEY NOT NULL, impact_run_id TEXT NOT NULL, node_key TEXT NOT NULL, node_type TEXT NOT NULL, external_id TEXT NOT NULL, workspace_id INTEGER, company_id INTEGER, competence TEXT, immutable_snapshot INTEGER DEFAULT 0 NOT NULL, content_hash TEXT, metadata_json TEXT DEFAULT '{}' NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS fiscal_impact_edges (id TEXT PRIMARY KEY NOT NULL, impact_run_id TEXT NOT NULL, edge_key TEXT NOT NULL, from_node_key TEXT NOT NULL, to_node_key TEXT NOT NULL, relation TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS fiscal_reexecution_jobs (id TEXT PRIMARY KEY NOT NULL, impact_run_id TEXT NOT NULL, artifact_type TEXT NOT NULL, artifact_id TEXT NOT NULL, workspace_id INTEGER NOT NULL, company_id INTEGER, competence TEXT, disposition TEXT NOT NULL, status TEXT DEFAULT 'queued' NOT NULL, idempotency_key TEXT NOT NULL, before_content_hash TEXT NOT NULL, after_content_hash TEXT, before_rule_version TEXT NOT NULL, after_rule_version TEXT, diff_json TEXT DEFAULT '{}' NOT NULL, attempts INTEGER DEFAULT 0 NOT NULL, lock_token TEXT, locked_at TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL, finished_at TEXT)"),
    db.prepare("CREATE TABLE IF NOT EXISTS fiscal_impact_run_events (id TEXT PRIMARY KEY NOT NULL, impact_run_id TEXT NOT NULL, event_type TEXT NOT NULL, event_data_json TEXT DEFAULT '{}' NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS fiscal_impact_runs_change_event_idx ON fiscal_impact_runs (change_event_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS fiscal_impact_runs_status_created_idx ON fiscal_impact_runs (status, created_at, id)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS fiscal_impact_nodes_run_key_idx ON fiscal_impact_nodes (impact_run_id, node_key)"),
    db.prepare("CREATE INDEX IF NOT EXISTS fiscal_impact_nodes_workspace_company_idx ON fiscal_impact_nodes (workspace_id, company_id, competence)"),
    db.prepare("CREATE INDEX IF NOT EXISTS fiscal_impact_nodes_type_external_idx ON fiscal_impact_nodes (node_type, external_id)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS fiscal_impact_edges_run_key_idx ON fiscal_impact_edges (impact_run_id, edge_key)"),
    db.prepare("CREATE INDEX IF NOT EXISTS fiscal_impact_edges_from_idx ON fiscal_impact_edges (impact_run_id, from_node_key)"),
    db.prepare("CREATE INDEX IF NOT EXISTS fiscal_impact_edges_to_idx ON fiscal_impact_edges (impact_run_id, to_node_key)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS fiscal_reexecution_jobs_idempotency_idx ON fiscal_reexecution_jobs (idempotency_key)"),
    db.prepare("CREATE INDEX IF NOT EXISTS fiscal_reexecution_jobs_run_status_idx ON fiscal_reexecution_jobs (impact_run_id, status, created_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS fiscal_reexecution_jobs_workspace_company_idx ON fiscal_reexecution_jobs (workspace_id, company_id, competence)"),
    db.prepare("CREATE INDEX IF NOT EXISTS fiscal_impact_run_events_run_created_idx ON fiscal_impact_run_events (impact_run_id, created_at, id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS fiscal_impact_run_events_type_created_idx ON fiscal_impact_run_events (event_type, created_at, id)"),
  ]);
}

async function loadAffectedArtifacts(db: D1Database, ruleCodes: string[]) {
  if (!ruleCodes.length) return { artifacts: [] as FiscalImpactArtifact[], owners: new Map<string, number>(), ruleCodes: new Map<string, string>(), ruleVersions: new Map<string, string>(), snapshots: new Map<string, unknown>() };
  const placeholders = ruleCodes.map(() => "?").join(", ");
  const dossiers = await db.prepare(`SELECT id, workspace_id, owner_user_id, company_id, status, base_code, base_version, facts_json, snapshot_json, input_hash, created_at FROM fiscal_dossiers WHERE base_code IN (${placeholders})`).bind(...ruleCodes).all<DossierRow>();
  const scenarioConditions = ruleCodes.map(() => "s.snapshot_json LIKE ?").join(" OR ");
  const scenarios = scenarioConditions ? await db.prepare(`SELECT s.id, c.workspace_id, c.owner_user_id, s.company_id, s.review_status, s.calculation_version, s.snapshot_json, s.input_hash, s.created_at FROM scenarios s INNER JOIN companies c ON c.id = s.company_id WHERE s.snapshot_json IS NOT NULL AND (${scenarioConditions})`).bind(...ruleCodes.map((code) => `%${code}%`)).all<ScenarioRow>() : { results: [] as ScenarioRow[] };
  const dossierIds = dossiers.results.map((item) => item.id);
  const dossierShares = dossierIds.length ? await db.prepare(`SELECT id, dossier_id, workspace_id, company_id, created_at FROM fiscal_dossier_shares WHERE dossier_id IN (${dossierIds.map(() => "?").join(", ")}) AND revoked_at IS NULL`).bind(...dossierIds).all<{ id: number; dossier_id: string; workspace_id: number; company_id: number | null; created_at: string }>() : { results: [] };
  const scenarioIds = scenarios.results.map((item) => item.id);
  const scenarioShares = scenarioIds.length ? await db.prepare(`SELECT id, scenario_id, owner_user_id, company_id, created_at FROM report_shares WHERE scenario_id IN (${scenarioIds.map(() => "?").join(", ")}) AND revoked_at IS NULL`).bind(...scenarioIds).all<{ id: number; scenario_id: number; owner_user_id: number; company_id: number; created_at: string }>() : { results: [] };
  const owners = new Map<string, number>();
  const artifactRuleCodes = new Map<string, string>();
  const ruleVersions = new Map<string, string>();
  const snapshots = new Map<string, unknown>();
  const artifacts: FiscalImpactArtifact[] = [];
  for (const dossier of dossiers.results) {
    const snapshot = parseJson(dossier.snapshot_json);
    const key = `dossier:${dossier.id}`;
    owners.set(key, dossier.owner_user_id);
    artifactRuleCodes.set(key, dossier.base_code);
    ruleVersions.set(key, dossier.base_version);
    snapshots.set(key, snapshot);
    artifacts.push({ type: "dossier", id: dossier.id, workspaceId: dossier.workspace_id, companyId: dossier.company_id, competence: inferFiscalCompetence(parseJson(dossier.facts_json), snapshot, dossier.created_at), status: dossier.status, contentHash: dossier.input_hash, snapshot, immutable: dossier.status === "approved" });
  }
  for (const scenario of scenarios.results) {
    const snapshot = parseJson(scenario.snapshot_json);
    const key = `scenario:${scenario.id}`;
    owners.set(key, scenario.owner_user_id);
    ruleVersions.set(key, scenario.calculation_version);
    snapshots.set(key, snapshot);
    artifacts.push({ type: "scenario", id: String(scenario.id), workspaceId: scenario.workspace_id, companyId: scenario.company_id, competence: inferFiscalCompetence(snapshot, scenario.created_at), status: scenario.review_status, contentHash: scenario.input_hash ?? await sha256Hex(scenario.snapshot_json ?? ""), snapshot, immutable: scenario.review_status === "approved" });
  }
  for (const report of dossierShares.results) artifacts.push({ type: "report", id: `dossier-share:${report.id}`, workspaceId: report.workspace_id, companyId: report.company_id, competence: artifacts.find((item) => item.type === "dossier" && item.id === report.dossier_id)?.competence ?? null, status: "delivered", contentHash: artifacts.find((item) => item.type === "dossier" && item.id === report.dossier_id)?.contentHash ?? "", snapshot: null, immutable: true, parentId: report.dossier_id, parentType: "dossier" });
  for (const report of scenarioShares.results) {
    const parent = artifacts.find((item) => item.type === "scenario" && item.id === String(report.scenario_id));
    artifacts.push({ type: "report", id: `scenario-share:${report.id}`, workspaceId: parent?.workspaceId ?? 0, companyId: report.company_id, competence: parent?.competence ?? null, status: "delivered", contentHash: parent?.contentHash ?? "", snapshot: null, immutable: true, parentId: String(report.scenario_id), parentType: "scenario" });
  }
  return { artifacts, owners, ruleCodes: artifactRuleCodes, ruleVersions, snapshots };
}

export async function createFiscalImpactRun(db: D1Database, input: ImpactInput) {
  await ensureFiscalImpactGraphSchema(db);
  const existing = await db.prepare("SELECT id, status, affected_companies, affected_competences, affected_artifacts, blocked_artifacts, historical_notices FROM fiscal_impact_runs WHERE change_event_id = ? LIMIT 1").bind(input.changeEventId).first<{ id: string; status: string; affected_companies: number; affected_competences: number; affected_artifacts: number; blocked_artifacts: number; historical_notices: number }>();
  const runId = existing?.id ?? crypto.randomUUID();
  if (existing && existing.status !== "indexing") return { runId, idempotent: true, graph: null, metrics: { companies: existing.affected_companies, competences: existing.affected_competences, artifacts: existing.affected_artifacts, blocked: existing.blocked_artifacts, historical: existing.historical_notices } };
  if (!existing) await db.prepare("INSERT OR IGNORE INTO fiscal_impact_runs (id, change_event_id, source_code, status, impacted_rule_codes_json, regression_fingerprint, created_at) VALUES (?, ?, ?, 'indexing', ?, ?, ?)").bind(runId, input.changeEventId, input.sourceCode, JSON.stringify([...new Set(input.impactedRuleCodes)].sort()), input.regressionFingerprint, input.detectedAt).run();
  const affected = await loadAffectedArtifacts(db, input.impactedRuleCodes);
  const engineCodes = fiscalRegressionModulesForRules(input.impactedRuleCodes);
  const graph = buildFiscalImpactGraph({ sourceCode: input.sourceCode, ruleCodes: input.impactedRuleCodes, engineCodes, artifacts: affected.artifacts });
  const statements: D1PreparedStatement[] = [];
  for (const node of graph.nodes) statements.push(db.prepare("INSERT OR IGNORE INTO fiscal_impact_nodes (id, impact_run_id, node_key, node_type, external_id, workspace_id, company_id, competence, immutable_snapshot, content_hash, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), runId, node.key, node.type, node.externalId, node.workspaceId, node.companyId, node.competence, node.immutable ? 1 : 0, node.contentHash, JSON.stringify(node.metadata), input.detectedAt));
  for (const edge of graph.edges) statements.push(db.prepare("INSERT OR IGNORE INTO fiscal_impact_edges (id, impact_run_id, edge_key, from_node_key, to_node_key, relation, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), runId, edge.key, edge.from, edge.to, edge.relation, input.detectedAt));
  for (const artifact of affected.artifacts.filter((item) => item.type !== "report")) {
    const artifactKey = `${artifact.type}:${artifact.id}`;
    const disposition = classifyFiscalArtifactImpact(artifact);
    const status = disposition === "historical_notice" ? "historical_notice" : "blocked_pending_reprocess";
    const idempotencyKey = `${input.changeEventId}:${artifact.type}:${artifact.id}:${artifact.contentHash}`;
    statements.push(db.prepare("INSERT OR IGNORE INTO fiscal_reexecution_jobs (id, impact_run_id, artifact_type, artifact_id, workspace_id, company_id, competence, disposition, status, idempotency_key, before_content_hash, before_rule_version, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), runId, artifact.type, artifact.id, artifact.workspaceId, artifact.companyId, artifact.competence, disposition, status, idempotencyKey, artifact.contentHash, affected.ruleVersions.get(artifactKey) ?? "unknown", input.detectedAt));
    const ownerUserId = affected.owners.get(artifactKey);
    if (!ownerUserId) continue;
    const reason = disposition === "historical_notice"
      ? `A fonte ${input.sourceCode} mudou após a aprovação. O snapshot histórico permanece íntegro e recebeu aviso de regra superveniente.`
      : `A fonte ${input.sourceCode} mudou. A entrega fica bloqueada até uma nova versão ser reprocessada e conferida.`;
    statements.push(db.prepare("INSERT OR IGNORE INTO governance_notifications (id, workspace_id, recipient_user_id, notification_type, subject_type, subject_id, message, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), artifact.workspaceId, ownerUserId, disposition === "historical_notice" ? "fiscal_historical_supervening_notice" : "fiscal_result_invalidated", artifact.type, artifact.id, reason, input.detectedAt));
    if (artifact.type === "dossier") {
      statements.push(db.prepare("INSERT OR IGNORE INTO fiscal_result_invalidations (id, change_event_id, workspace_id, owner_user_id, dossier_id, rule_code, rule_version, status, reason, notified_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), input.changeEventId, artifact.workspaceId, ownerUserId, artifact.id, affected.ruleCodes.get(artifactKey) ?? "unknown", affected.ruleVersions.get(artifactKey) ?? "unknown", disposition === "historical_notice" ? "historical_notice" : "open", reason, input.detectedAt, input.detectedAt));
      statements.push(db.prepare("INSERT INTO fiscal_dossier_events (dossier_id, workspace_id, actor_user_id, event_type, note, event_data, created_at) SELECT ?, ?, ?, 'fiscal_dossier.normative_change_detected', ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM fiscal_dossier_events WHERE dossier_id = ? AND event_data LIKE ?)").bind(artifact.id, artifact.workspaceId, ownerUserId, reason, JSON.stringify({ impactRunId: runId, changeEventId: input.changeEventId, sourceCode: input.sourceCode, disposition, automated: true }), input.detectedAt, artifact.id, `%${runId}%`));
    }
  }
  statements.push(db.prepare("INSERT OR IGNORE INTO fiscal_impact_run_events (id, impact_run_id, event_type, event_data_json, created_at) VALUES (?, ?, 'impact.indexed', ?, ?)").bind(`${runId}:indexed`, runId, JSON.stringify({ graphVersion: graph.version, nodes: graph.nodes.length, edges: graph.edges.length, regressionFingerprint: input.regressionFingerprint }), input.detectedAt));
  await batchInChunks(db, statements);
  const companies = new Set(affected.artifacts.flatMap((item) => item.companyId === null ? [] : [`${item.workspaceId}:${item.companyId}`])).size;
  const competences = new Set(affected.artifacts.flatMap((item) => item.competence ? [`${item.workspaceId}:${item.companyId ?? 0}:${item.competence}`] : [])).size;
  const blocked = affected.artifacts.filter((item) => item.type !== "report" && classifyFiscalArtifactImpact(item) === "blocked_pending_reprocess").length;
  const historical = affected.artifacts.filter((item) => classifyFiscalArtifactImpact(item) === "historical_notice").length;
  await db.prepare("UPDATE fiscal_impact_runs SET status = ?, affected_companies = ?, affected_competences = ?, affected_artifacts = ?, blocked_artifacts = ?, historical_notices = ? WHERE id = ?").bind(blocked ? "awaiting_reprocess" : "indexed", companies, competences, affected.artifacts.length, blocked, historical, runId).run();
  return { runId, idempotent: Boolean(existing), graph, metrics: { companies, competences, artifacts: affected.artifacts.length, blocked, historical } };
}

export async function reconcileFiscalImpactRun(db: D1Database, changeEventId: string, releaseId: string) {
  await ensureFiscalImpactGraphSchema(db);
  const run = await db.prepare("SELECT id FROM fiscal_impact_runs WHERE change_event_id = ? LIMIT 1").bind(changeEventId).first<{ id: string }>();
  if (!run) return { resolved: 0, pending: 0, status: "impact_run_not_found" as const };
  const jobs = await db.prepare("SELECT id, artifact_type, artifact_id, workspace_id, company_id, before_content_hash, before_rule_version, created_at FROM fiscal_reexecution_jobs WHERE impact_run_id = ? AND status = 'blocked_pending_reprocess' ORDER BY created_at, id").bind(run.id).all<{ id: string; artifact_type: string; artifact_id: string; workspace_id: number; company_id: number | null; before_content_hash: string; before_rule_version: string; created_at: string }>();
  let resolved = 0;
  for (const job of jobs.results) {
    const lockToken = crypto.randomUUID();
    const lockedAt = new Date().toISOString();
    const lock = await db.prepare("UPDATE fiscal_reexecution_jobs SET status = 'processing', lock_token = ?, locked_at = ?, attempts = attempts + 1 WHERE id = ? AND status = 'blocked_pending_reprocess'").bind(lockToken, lockedAt, job.id).run();
    if (lock.meta.changes !== 1) continue;
    if (job.artifact_type === "dossier") {
      const replacement = await db.prepare("SELECT id, base_version, snapshot_json, input_hash FROM fiscal_dossiers WHERE workspace_id = ? AND company_id IS ? AND base_code IN (SELECT rule_code FROM fiscal_result_invalidations WHERE change_event_id = ? AND dossier_id = ?) AND id <> ? AND base_version <> ? AND status = 'approved' AND created_at >= ? ORDER BY created_at DESC LIMIT 1").bind(job.workspace_id, job.company_id, changeEventId, job.artifact_id, job.artifact_id, job.before_rule_version, job.created_at).first<{ id: string; base_version: string; snapshot_json: string; input_hash: string }>();
      if (replacement) {
        const before = await db.prepare("SELECT snapshot_json, input_hash FROM fiscal_dossiers WHERE id = ? LIMIT 1").bind(job.artifact_id).first<{ snapshot_json: string; input_hash: string }>();
        const [beforeHash, afterHash] = await Promise.all([sha256Hex(before?.snapshot_json ?? ""), sha256Hex(replacement.snapshot_json)]);
        const claim = assessReexecutionClaim({ expectedJobStatus: "processing", lockTokenMatches: true, afterHashMatches: afterHash === replacement.input_hash && beforeHash === job.before_content_hash && before?.input_hash === job.before_content_hash, ruleVersionChanged: replacement.base_version !== job.before_rule_version });
        if (!claim.allowed) {
          await db.batch([
            db.prepare("UPDATE fiscal_reexecution_jobs SET status = 'blocked_pending_reprocess', lock_token = NULL, locked_at = NULL, diff_json = ? WHERE id = ? AND status = 'processing' AND lock_token = ?").bind(JSON.stringify({ blockers: claim.blockers }), job.id, lockToken),
            db.prepare("INSERT INTO fiscal_impact_run_events (id, impact_run_id, event_type, event_data_json, created_at) VALUES (?, ?, 'artifact.reexecution_rejected', ?, ?)").bind(crypto.randomUUID(), run.id, JSON.stringify({ jobId: job.id, blockers: claim.blockers }), lockedAt),
          ]);
          continue;
        }
        const diff = compareFiscalCentSnapshots(parseJson(before?.snapshot_json ?? null), parseJson(replacement.snapshot_json));
        await db.batch([
          db.prepare("UPDATE fiscal_reexecution_jobs SET status = 'completed', after_content_hash = ?, after_rule_version = ?, diff_json = ?, lock_token = NULL, locked_at = NULL, finished_at = ? WHERE id = ? AND status = 'processing' AND lock_token = ?").bind(afterHash, replacement.base_version, JSON.stringify({ ...diff, replacementArtifactId: replacement.id, releaseId }), lockedAt, job.id, lockToken),
          db.prepare("UPDATE fiscal_result_invalidations SET status = 'resolved_by_new_version', resolved_at = ?, resolution_release_id = ? WHERE change_event_id = ? AND dossier_id = ? AND status = 'open'").bind(lockedAt, releaseId, changeEventId, job.artifact_id),
          db.prepare("UPDATE governance_notifications SET read_at = ? WHERE notification_type = 'fiscal_result_invalidated' AND subject_type = 'dossier' AND subject_id = ? AND read_at IS NULL").bind(lockedAt, job.artifact_id),
          db.prepare("INSERT INTO fiscal_impact_run_events (id, impact_run_id, event_type, event_data_json, created_at) VALUES (?, ?, 'artifact.reexecuted_and_compared', ?, ?)").bind(crypto.randomUUID(), run.id, JSON.stringify({ jobId: job.id, beforeArtifactId: job.artifact_id, afterArtifactId: replacement.id, beforeRuleVersion: job.before_rule_version, afterRuleVersion: replacement.base_version, centChanges: diff.changes }), lockedAt),
        ]);
        resolved += 1;
        continue;
      }
    }
    await db.prepare("UPDATE fiscal_reexecution_jobs SET status = 'blocked_pending_reprocess', lock_token = NULL, locked_at = NULL WHERE id = ? AND status = 'processing' AND lock_token = ?").bind(job.id, lockToken).run();
  }
  const pending = Number((await db.prepare("SELECT COUNT(*) AS total FROM fiscal_reexecution_jobs WHERE impact_run_id = ? AND status = 'blocked_pending_reprocess'").bind(run.id).first<{ total: number }>())?.total ?? 0);
  const status = pending ? "awaiting_reprocess" : "resolved";
  const finishedAt = pending ? null : new Date().toISOString();
  await db.batch([
    db.prepare("UPDATE fiscal_impact_runs SET status = ?, finished_at = ? WHERE id = ?").bind(status, finishedAt, run.id),
    db.prepare("INSERT INTO fiscal_impact_run_events (id, impact_run_id, event_type, event_data_json, created_at) VALUES (?, ?, 'impact.reconciled', ?, ?)").bind(crypto.randomUUID(), run.id, JSON.stringify({ releaseId, resolved, pending, status }), new Date().toISOString()),
  ]);
  return { resolved, pending, status };
}

export async function rollbackFiscalImpactRun(db: D1Database, changeEventId: string, reason: string, actorUserId: number) {
  await ensureFiscalImpactGraphSchema(db);
  const run = await db.prepare("SELECT id, status FROM fiscal_impact_runs WHERE change_event_id = ? LIMIT 1").bind(changeEventId).first<{ id: string; status: string }>();
  if (!run) return { rolledBack: false as const, status: 404, blockers: ["impact_run_not_found"] };
  if (["resolved", "rolled_back"].includes(run.status)) return { rolledBack: false as const, status: 409, blockers: ["impact_run_already_closed"] };
  const timestamp = new Date().toISOString();
  const results = await db.batch([
    db.prepare("UPDATE fiscal_impact_runs SET status = 'rolled_back', finished_at = ? WHERE id = ? AND status NOT IN ('resolved', 'rolled_back')").bind(timestamp, run.id),
    db.prepare("UPDATE fiscal_reexecution_jobs SET status = 'cancelled_by_rollback', lock_token = NULL, locked_at = NULL, finished_at = ? WHERE impact_run_id = ? AND status IN ('blocked_pending_reprocess', 'processing')").bind(timestamp, run.id),
    db.prepare("UPDATE fiscal_result_invalidations SET status = 'dismissed_rollback', resolved_at = ? WHERE change_event_id = ? AND status = 'open'").bind(timestamp, changeEventId),
    db.prepare("UPDATE governance_notifications SET read_at = ? WHERE subject_id IN (SELECT artifact_id FROM fiscal_reexecution_jobs WHERE impact_run_id = ?) AND read_at IS NULL").bind(timestamp, run.id),
    db.prepare("INSERT INTO fiscal_impact_run_events (id, impact_run_id, event_type, event_data_json, created_at) VALUES (?, ?, 'impact.rolled_back', ?, ?)").bind(crypto.randomUUID(), run.id, JSON.stringify({ reason, actorUserId, previousStatus: run.status }), timestamp),
  ]);
  if (results[0].meta.changes !== 1) return { rolledBack: false as const, status: 409, blockers: ["concurrent_impact_resolution"] };
  return { rolledBack: true as const, status: 200, cancelledJobs: results[1].meta.changes, dismissedInvalidations: results[2].meta.changes };
}

export async function getFiscalImpactDashboard(db: D1Database, changeEventId?: string | null) {
  await ensureFiscalImpactGraphSchema(db);
  const filter = changeEventId ? " WHERE change_event_id = ?" : "";
  const runs = changeEventId
    ? await db.prepare(`SELECT * FROM fiscal_impact_runs${filter} ORDER BY created_at DESC LIMIT 100`).bind(changeEventId).all<Record<string, unknown>>()
    : await db.prepare("SELECT * FROM fiscal_impact_runs ORDER BY created_at DESC LIMIT 100").all<Record<string, unknown>>();
  const runIds = runs.results.map((item) => String(item.id));
  if (!runIds.length) return { runs: [], nodes: [], edges: [], jobs: [], events: [] };
  const placeholders = runIds.map(() => "?").join(", ");
  const [nodes, edges, jobs, events] = await Promise.all([
    db.prepare(`SELECT * FROM fiscal_impact_nodes WHERE impact_run_id IN (${placeholders}) ORDER BY impact_run_id, node_type, external_id`).bind(...runIds).all<Record<string, unknown>>(),
    db.prepare(`SELECT * FROM fiscal_impact_edges WHERE impact_run_id IN (${placeholders}) ORDER BY impact_run_id, relation, edge_key`).bind(...runIds).all<Record<string, unknown>>(),
    db.prepare(`SELECT * FROM fiscal_reexecution_jobs WHERE impact_run_id IN (${placeholders}) ORDER BY created_at DESC, id DESC`).bind(...runIds).all<Record<string, unknown>>(),
    db.prepare(`SELECT * FROM fiscal_impact_run_events WHERE impact_run_id IN (${placeholders}) ORDER BY created_at DESC, id DESC`).bind(...runIds).all<Record<string, unknown>>(),
  ]);
  return { runs: runs.results, nodes: nodes.results, edges: edges.results, jobs: jobs.results, events: events.results };
}

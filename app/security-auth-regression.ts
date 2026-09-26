import { digest } from "./github-client.ts";
import { authContractSpecHash } from "../domain/security-auth-contracts.ts";
import { AUTH_REGRESSION_DAILY_LIMIT, AUTH_REGRESSION_VERSION, buildAuthorizationRegression, parseCodeMapId, parseRegressionId, type RegressionFile, type RegressionSpec } from "../domain/security-auth-regression.ts";
import type { MapRow } from "./security-auth-code-map.ts";
import { AUTH_CODE_MAP_VERSION } from "../domain/security-auth-code-map.ts";

export type RegressionDraftRow = { id: string; contract_id: string; code_map_id: string; repository_id: string; base_sha: string; spec_sha256: string;
  map_evidence_sha256: string; generator_version: string; bundle_sha256: string; files_json: string; created_at: string };
type Binding = MapRow & { path: string; review_mode: "horizontal" | "vertical"; scope_id: string; marker_sha256: string; contract_spec_sha256: string; repository_name: string; title: string };
export function publicRegressionDraft(row: RegressionDraftRow) {
  return { id: row.id, contractId: row.contract_id, codeMapId: row.code_map_id, repositoryId: row.repository_id, baseSha: row.base_sha,
    specSha256: row.spec_sha256, codeEvidenceSha256: row.map_evidence_sha256, generatorVersion: row.generator_version, bundleSha256: row.bundle_sha256,
    createdAt: row.created_at, status: "adapter_required", testsExecuted: false, deploymentVerified: false, modelCalls: 0 };
}
const currentBindingSql = `SELECT m.*, c.path, c.review_mode, c.scope_id, c.marker_sha256, c.spec_sha256 contract_spec_sha256, c.title, r.full_name repository_name
  FROM security_auth_code_maps m
  JOIN security_auth_contracts c ON c.id = m.contract_id AND c.workspace_id = m.workspace_id
  JOIN security_agent_scopes s ON s.id = c.scope_id AND s.workspace_id = c.workspace_id
  JOIN security_repositories r ON r.id = m.repository_id AND r.workspace_id = m.workspace_id
  JOIN github_connections g ON g.id = r.connection_id AND g.workspace_id = r.workspace_id
  JOIN security_repository_jobs j ON j.id = (SELECT j2.id FROM security_repository_jobs j2 WHERE j2.workspace_id = r.workspace_id AND j2.repository_id = r.id
    AND j2.status = 'completed' ORDER BY j2.completed_at DESC, j2.id DESC LIMIT 1)
  WHERE m.workspace_id = ? AND m.status = 'completed' AND j.commit_sha = m.commit_sha AND r.enabled = 1 AND g.status = 'active'
    AND s.status = 'verified' AND julianday(s.authorization_expires_at) > julianday('now') AND julianday(r.authorized_until) > julianday('now')`;
const specFrom = (row: Binding): RegressionSpec => ({ contractId: row.contract_id, codeMapId: row.id, commitSha: row.commit_sha, specSha256: row.spec_sha256,
  evidenceSha256: row.evidence_sha256!, sourceFile: row.source_file, path: row.path, reviewMode: row.review_mode });
async function verifyBinding(row: Binding | null) {
  if (!row || row.policy_version !== AUTH_CODE_MAP_VERSION || row.spec_sha256 !== row.contract_spec_sha256 || row.spec_sha256 !== await authContractSpecHash({ scopeId: row.scope_id, path: row.path,
    reviewMode: row.review_mode, markerSha256: row.marker_sha256 }) || !row.evidence_sha256 || row.evidence_sha256 !== await digest(row.result_json)) throw new Error("AUTH_REGRESSION_MAPPING_INVALID");
  let graph;
  try { graph = JSON.parse(row.result_json); } catch { throw new Error("AUTH_REGRESSION_MAPPING_INVALID"); }
  if (!graph || typeof graph !== "object" || graph.version !== AUTH_CODE_MAP_VERSION || graph.commitSha !== row.commit_sha || graph.specSha256 !== row.spec_sha256 || graph.repositoryName !== row.repository_name
    || graph.route?.path !== row.path || graph.route?.sourceFile !== row.source_file || graph.route?.method !== "GET" || graph.files?.[0]?.path !== row.source_file
    || graph.files[0].role !== "route" || !/^[a-f0-9]{40}$/.test(graph.files[0].blobSha) || !/^[a-f0-9]{64}$/.test(graph.files[0].sourceSha256)) throw new Error("AUTH_REGRESSION_MAPPING_INVALID");
  return row;
}

export async function createAuthorizationRegressionDraft(DB: D1Database, workspaceId: number, actorId: number, codeMapId: string) {
  parseCodeMapId(codeMapId);
  const row = await verifyBinding(await DB.prepare(`${currentBindingSql} AND m.id = ?`).bind(workspaceId, codeMapId).first<Binding>());
  const lookup = () => DB.prepare("SELECT * FROM security_auth_regression_drafts WHERE workspace_id = ? AND code_map_id = ? AND generator_version = ?")
    .bind(workspaceId, codeMapId, AUTH_REGRESSION_VERSION).first<RegressionDraftRow>();
  const cached = await lookup();
  if (cached) { await verifiedRegressionFiles(cached); return { ...publicRegressionDraft(cached), cached: true }; }
  const files = buildAuthorizationRegression(specFrom(row)), json = JSON.stringify(files), bundleSha256 = await digest(json), now = new Date().toISOString();
  if (new TextEncoder().encode(json).byteLength > 26_000) throw new Error("AUTH_REGRESSION_BUNDLE_INVALID");
  const inserted = await DB.prepare(`INSERT INTO security_auth_regression_drafts
    (id, workspace_id, contract_id, code_map_id, repository_id, base_sha, spec_sha256, map_evidence_sha256, generator_version, bundle_sha256, files_json, created_by_user_id, created_at)
    SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE (SELECT COUNT(*) FROM security_auth_regression_drafts WHERE workspace_id = ? AND created_at > ?) < ?
    ON CONFLICT DO NOTHING`).bind(`srg_${crypto.randomUUID()}`, workspaceId, row.contract_id, row.id, row.repository_id, row.commit_sha, row.spec_sha256,
      row.evidence_sha256, AUTH_REGRESSION_VERSION, bundleSha256, json, actorId, now, workspaceId, new Date(Date.now() - 86_400_000).toISOString(), AUTH_REGRESSION_DAILY_LIMIT).run();
  const draft = await lookup();
  if (!draft) throw new Error("AUTH_REGRESSION_DAILY_LIMIT");
  return { ...publicRegressionDraft(draft), cached: Number(inserted.meta.changes) !== 1 };
}

async function verifiedRegressionFiles(row: RegressionDraftRow): Promise<RegressionFile[]> {
  if (row.generator_version !== AUTH_REGRESSION_VERSION || row.files_json.length > 26_000 || await digest(row.files_json) !== row.bundle_sha256) throw new Error("AUTH_REGRESSION_BUNDLE_INVALID");
  let files: RegressionFile[], profile;
  try {
    files = JSON.parse(row.files_json);
    if (!Array.isArray(files) || files.length !== 4) throw new Error();
    profile = JSON.parse(files.find(file => file.path === `.cbshub/authorization/${row.contract_id}/profile.json`)!.content);
  } catch { throw new Error("AUTH_REGRESSION_BUNDLE_INVALID"); }
  if (profile.contractId !== row.contract_id || profile.codeMapId !== row.code_map_id || profile.baseCommit !== row.base_sha
    || profile.contractSpecSha256 !== row.spec_sha256 || profile.codeEvidenceSha256 !== row.map_evidence_sha256) throw new Error("AUTH_REGRESSION_BUNDLE_INVALID");
  const expected = buildAuthorizationRegression({ contractId: row.contract_id, codeMapId: row.code_map_id, commitSha: row.base_sha,
    specSha256: row.spec_sha256, evidenceSha256: row.map_evidence_sha256, sourceFile: profile.sourceFile, path: profile.path, reviewMode: profile.reviewMode });
  // Even a corrupted stored payload cannot supply arbitrary code or ZIP paths.
  if (JSON.stringify(expected) !== row.files_json) throw new Error("AUTH_REGRESSION_BUNDLE_INVALID");
  return expected;
}
export async function authorizationRegressionBundle(DB: D1Database, workspaceId: number, id: string) {
  parseRegressionId(id);
  const row = await DB.prepare("SELECT * FROM security_auth_regression_drafts WHERE workspace_id = ? AND id = ?").bind(workspaceId, id).first<RegressionDraftRow>();
  if (!row) return null;
  return { format: "cbshub-authorization-regression.1", ...publicRegressionDraft(row), files: await verifiedRegressionFiles(row),
    limitation: "Receita de teste não executada no projeto; adaptador e CI precisam de integração e revisão humana. Não é correção nem prova de deploy." };
}
export function parseRegressionRepositoryId(id: unknown): string {
  if (typeof id !== "string" || !/^srp_[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)) throw new Error("AUTH_REGRESSION_INPUT_INVALID");
  return id;
}
export async function authorizationRegressionCatalog(DB: D1Database, workspaceId: number, repositoryId: string) {
  parseRegressionRepositoryId(repositoryId);
  const repo = await DB.prepare("SELECT id FROM security_repositories WHERE workspace_id = ? AND id = ?").bind(workspaceId, repositoryId).first();
  if (!repo) throw new Error("AUTH_REGRESSION_REPOSITORY_NOT_FOUND");
  const [maps, drafts, head] = await Promise.all([
    DB.prepare(`${currentBindingSql} AND m.repository_id = ? ORDER BY m.created_at DESC LIMIT 20`).bind(workspaceId, repositoryId).all<Binding>(),
    DB.prepare("SELECT * FROM security_auth_regression_drafts WHERE workspace_id = ? AND repository_id = ? ORDER BY created_at DESC LIMIT 20").bind(workspaceId, repositoryId).all<RegressionDraftRow>(),
    DB.prepare("SELECT commit_sha FROM security_repository_jobs WHERE workspace_id = ? AND repository_id = ? AND status = 'completed' ORDER BY completed_at DESC, id DESC LIMIT 1").bind(workspaceId, repositoryId).first<{ commit_sha: string }>(),
  ]);
  return { candidates: maps.results.map((row: Binding) => ({ codeMapId: row.id, contractId: row.contract_id, title: row.title, path: row.path, sourceFile: row.source_file,
    baseSha: row.commit_sha, reviewMode: row.review_mode })), drafts: drafts.results.map((row: RegressionDraftRow) => ({ ...publicRegressionDraft(row),
      scanState: head?.commit_sha === row.base_sha ? "matches_latest_scan" : head ? "newer_scan_available" : "scan_unavailable" })) };
}

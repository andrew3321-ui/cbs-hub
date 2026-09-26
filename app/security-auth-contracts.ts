import { AUTH_CONTRACT_EXPECTATION, AUTH_CONTRACT_VERSION, authContractSpecHash, evaluateAuthContract, parseAuthContractId } from "../domain/security-auth-contracts.ts";
import type { AuthReviewMode } from "../domain/security-auth-review-policy.ts";

export type AuthContractRow = { id: string; workspace_id: number; scope_id: string; title: string; path: string; review_mode: AuthReviewMode;
  marker_sha256: string; spec_sha256: string; baseline_review_id: string; created_at: string };
type ObservationRow = { id: string; status: string; created_at: string; completed_at: string | null;
  anonymous_status: number | null; limited_status: number | null; privileged_status: number | null;
  anonymous_marker_observed: number | null; limited_marker_observed: number | null; privileged_marker_observed: number | null };

export function authContractObservation(row: ObservationRow) {
  const marker = (value: number | null) => value === 0 ? false : value === 1 ? true : null;
  const observation = { status: row.status, statuses: { anonymous: row.anonymous_status, limited: row.limited_status, privileged: row.privileged_status },
    markerObserved: { anonymous: marker(row.anonymous_marker_observed), limited: marker(row.limited_marker_observed), privileged: marker(row.privileged_marker_observed) } };
  return { reviewId: row.id, createdAt: row.created_at, completedAt: row.completed_at, ...observation, outcome: evaluateAuthContract(observation) };
}

export function publicAuthContract(row: AuthContractRow) {
  return { id: row.id, scopeId: row.scope_id, title: row.title, path: row.path, reviewMode: row.review_mode,
    specVersion: AUTH_CONTRACT_VERSION, specSha256: row.spec_sha256, expectation: AUTH_CONTRACT_EXPECTATION,
    baselineReviewId: row.baseline_review_id, createdAt: row.created_at };
}

export async function createAuthContract(DB: D1Database, workspaceId: number, actorId: number, input: { title: string; baselineReviewId: string }) {
  const baseline = await DB.prepare(`SELECT r.scope_id, r.path, r.review_mode, r.marker_sha256 FROM security_auth_reviews r
    JOIN security_agent_scopes s ON s.id = r.scope_id AND s.workspace_id = r.workspace_id
    WHERE r.id = ? AND r.workspace_id = ? AND r.status = 'completed' AND r.marker_sha256 IS NOT NULL
    AND r.privileged_marker_observed = 1 AND r.anonymous_marker_observed = 0
    AND r.privileged_status BETWEEN 200 AND 299 AND r.anonymous_status IN (401,403)
    AND ((r.verdict = 'verified_test_marker_exposure' AND r.limited_status BETWEEN 200 AND 299 AND r.limited_marker_observed = 1)
      OR (r.verdict = 'access_restricted' AND r.limited_status IN (401,403) AND r.limited_marker_observed = 0))
    AND s.status = 'verified'
    AND julianday(s.authorization_expires_at) > julianday('now')`).bind(input.baselineReviewId, workspaceId)
    .first<{ scope_id: string; path: string; review_mode: AuthReviewMode; marker_sha256: string }>();
  if (!baseline) throw new Error("AUTH_CONTRACT_BASELINE_INVALID");
  const specSha256 = await authContractSpecHash({ scopeId: baseline.scope_id, path: baseline.path, reviewMode: baseline.review_mode, markerSha256: baseline.marker_sha256 });
  // Statement-level quota and immutable baseline guard also hold under concurrent requests.
  await DB.prepare(`INSERT INTO security_auth_contracts (id, workspace_id, scope_id, title, path, review_mode, marker_sha256, spec_sha256, baseline_review_id, created_by_user_id, created_at)
    SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE (SELECT COUNT(*) FROM security_auth_contracts WHERE workspace_id = ?) < 50
    ON CONFLICT (workspace_id, spec_sha256) DO NOTHING`).bind(`sac_${crypto.randomUUID()}`, workspaceId, baseline.scope_id, input.title, baseline.path, baseline.review_mode,
      baseline.marker_sha256, specSha256, input.baselineReviewId, actorId, new Date().toISOString(), workspaceId).run();
  const row = await DB.prepare("SELECT * FROM security_auth_contracts WHERE workspace_id = ? AND spec_sha256 = ?").bind(workspaceId, specSha256).first<AuthContractRow>();
  if (!row) throw new Error("AUTH_CONTRACT_LIMIT");
  return publicAuthContract(row);
}

export async function requireAuthContractBinding(DB: D1Database, workspaceId: number, contractId: string,
  spec: { scopeId: string; path: string; reviewMode: AuthReviewMode; markerSha256: string | null }) {
  parseAuthContractId(contractId);
  const row = await DB.prepare("SELECT * FROM security_auth_contracts WHERE id = ? AND workspace_id = ?").bind(contractId, workspaceId).first<AuthContractRow>();
  if (!row || row.scope_id !== spec.scopeId || row.path !== spec.path || row.review_mode !== spec.reviewMode || !spec.markerSha256 || row.marker_sha256 !== spec.markerSha256
    || row.spec_sha256 !== await authContractSpecHash({ ...spec, markerSha256: spec.markerSha256 })) throw new Error("AUTH_CONTRACT_EXECUTION_MISMATCH");
  return row;
}

export async function authContractProofPack(DB: D1Database, workspaceId: number, contractId: string) {
  parseAuthContractId(contractId);
  const contract = await DB.prepare("SELECT * FROM security_auth_contracts WHERE id = ? AND workspace_id = ?").bind(contractId, workspaceId).first<AuthContractRow>();
  if (!contract) return null;
  const specHash = await authContractSpecHash({ scopeId: contract.scope_id, path: contract.path, reviewMode: contract.review_mode, markerSha256: contract.marker_sha256 });
  if (contract.spec_sha256 !== specHash) throw new Error("AUTH_CONTRACT_SPEC_INVALID");
  const rows = await DB.prepare(`SELECT id, status, anonymous_status, limited_status, privileged_status, anonymous_marker_observed,
    limited_marker_observed, privileged_marker_observed, created_at, completed_at FROM security_auth_reviews
    WHERE workspace_id = ? AND contract_id = ? ORDER BY created_at DESC, id DESC LIMIT 20`).bind(workspaceId, contractId).all<ObservationRow>();
  return { format: "cbshub-authorization-proof.1", contract: publicAuthContract(contract), runs: rows.results.map(authContractObservation),
    exportedAt: new Date().toISOString(), historyLimit: 20, assurance: "Observações sintéticas de uma rota GET; não é certificação, assinatura digital, cobertura completa nem prova de correção em um commit implantado." };
}

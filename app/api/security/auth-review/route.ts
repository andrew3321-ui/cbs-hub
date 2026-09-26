import { env } from "cloudflare:workers";
import { getCurrentUser } from "../../../auth";
import { withApiTelemetry } from "../../../api-infrastructure";
import { getWorkspaceEntitlements } from "../../../plan-entitlements";
import { dispatchDueAuthReviewAgents, type AuthReviewAgentMessage } from "../../../security-auth-review-agents";
import { canManageWorkspace, getWorkspaceContext } from "../../../workspace";
import { authReviewMarkerHash, parseAuthReviewMarker, parseAuthReviewMode, parseAuthReviewPath, parseAuthReviewToken, type AuthReviewMode } from "../../../../domain/security-auth-review-policy";
import { hmacHex } from "../../../../domain/security-runner-policy";
import { selectAuthReviewCandidates } from "../../../../domain/security-auth-review-targets";
import { authContractObservation, requireAuthContractBinding } from "../../../security-auth-contracts";
import { parseAuthContractId } from "../../../../domain/security-auth-contracts";

type AuthReviewEnv = { DB: D1Database; SECURITY_ACTIVE_RUNNER?: { fetch(request: Request): Promise<Response> }; SECURITY_RUNNER_SIGNING_KEY?: string; OPENAI_API_KEY?: string; OPENAI_SECURITY_PRIMARY_MODEL?: string; OPENAI_SECURITY_REVIEW_MODEL?: string; SECURITY_SCAN_QUEUE?: { send(message: AuthReviewAgentMessage): Promise<void> } };
type ReviewRow = { id: string; scope_id: string; path: string; review_mode: AuthReviewMode; contract_id: string | null; status: string; anonymous_status: number | null; limited_status: number | null; privileged_status: number | null; anonymous_marker_observed: number | null; limited_marker_observed: number | null; privileged_marker_observed: number | null; verdict: string | null; retest_of_id: string | null; retest_outcome: string | null; analysis_status: string; analysis_json: string; analysis_error_code: string | null; created_at: string; completed_at: string | null };
const noStore = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: noStore });

async function context() {
  const user = await getCurrentUser();
  if (!user) return reply({ error: "Faça login para usar a validação autenticada." }, 401);
  const workspace = await getWorkspaceContext(user.id);
  if (!workspace) return reply({ error: "Workspace indisponível." }, 403);
  const entitlements = await getWorkspaceEntitlements(workspace);
  if (!entitlements.workspaceAccessAllowed) return reply({ error: "O workspace ainda não está liberado.", code: "CYBER_LAUNCH_GATE" }, 423);
  return { user, workspace };
}

async function getReviews() {
  const current = await context();
  if (current instanceof Response) return current;
  const runtime = env as unknown as AuthReviewEnv;
  const rows = await runtime.DB.prepare(`SELECT id, scope_id, path, review_mode, contract_id, status, anonymous_status, limited_status, privileged_status, anonymous_marker_observed, limited_marker_observed, privileged_marker_observed, verdict, retest_of_id, retest_outcome, analysis_status, analysis_json, analysis_error_code, created_at, completed_at
    FROM security_auth_reviews WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 40`).bind(current.workspace.id).all<ReviewRow>();
  const repoJobs = await runtime.DB.prepare(`SELECT r.id repository_id, r.full_name repository_name, j.coverage_json FROM security_repositories r
    JOIN security_repository_jobs j ON j.id = (SELECT j2.id FROM security_repository_jobs j2 WHERE j2.repository_id = r.id AND j2.workspace_id = r.workspace_id AND j2.status = 'completed' ORDER BY j2.completed_at DESC LIMIT 1)
    WHERE r.workspace_id = ? AND r.enabled = 1 AND r.authorized_until > ? ORDER BY r.last_scan_at DESC LIMIT 12`)
    .bind(current.workspace.id, new Date().toISOString()).all<{ repository_id: string; repository_name: string; coverage_json: string }>();
  const candidates = selectAuthReviewCandidates(repoJobs.results.map((job: { repository_id: string; repository_name: string; coverage_json: string }) => ({ repositoryId: job.repository_id, repositoryName: job.repository_name, coverageJson: job.coverage_json })));
  return reply({ candidates, reviews: rows.results.map((row: ReviewRow) => {
    const analysis = JSON.parse(row.analysis_json) as { access?: { fragment?: unknown }; review?: { fragment?: unknown } };
    return { id: row.id, scopeId: row.scope_id, path: row.path, reviewMode: row.review_mode, contractId: row.contract_id, contractOutcome: row.contract_id ? authContractObservation(row).outcome : null, status: row.status, statuses: { anonymous: row.anonymous_status, limited: row.limited_status, privileged: row.privileged_status }, markerObserved: { anonymous: row.anonymous_marker_observed === null ? null : Boolean(row.anonymous_marker_observed), limited: row.limited_marker_observed === null ? null : Boolean(row.limited_marker_observed), privileged: row.privileged_marker_observed === null ? null : Boolean(row.privileged_marker_observed) }, verdict: row.verdict, retestOfId: row.retest_of_id, retestOutcome: row.retest_outcome, analysisStatus: row.analysis_status, analysis: { access: analysis.access?.fragment, review: analysis.review?.fragment }, analysisErrorCode: row.analysis_error_code, createdAt: row.created_at, completedAt: row.completed_at };
  }) });
}

async function postReview(request: Request) {
  const current = await context();
  if (current instanceof Response) return current;
  if (!canManageWorkspace(current.workspace.role)) return reply({ error: "Somente proprietário ou administrador pode executar a validação." }, 403);
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return reply({ error: "Origem não autorizada." }, 403);
  const runtime = env as unknown as AuthReviewEnv;
  const secret = runtime.SECURITY_RUNNER_SIGNING_KEY?.trim() ?? "";
  if (!runtime.SECURITY_ACTIVE_RUNNER || secret.length < 32) return reply({ error: "Runner isolado indisponível." }, 503);
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > 6_000) return reply({ error: "Solicitação excede o limite." }, 413);
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > 6_000) return reply({ error: "Solicitação excede o limite." }, 413);
  let input: { scopeId: string; path: string; limitedToken: string; privilegedToken: string; marker: string | null; retestOfId: string | null; contractId: string | null; reviewMode: AuthReviewMode; executionConfirmed: true };
  try {
    const raw = JSON.parse(text) as Record<string, unknown>;
    const required = ["scopeId", "path", "limitedToken", "privilegedToken", "executionConfirmed"];
    if (!raw || typeof raw !== "object" || Array.isArray(raw) || required.some((key) => !Object.hasOwn(raw, key)) || Object.keys(raw).some((key) => !required.includes(key) && key !== "marker" && key !== "retestOfId" && key !== "reviewMode" && key !== "contractId") || raw.executionConfirmed !== true || typeof raw.scopeId !== "string") throw new Error("INVALID");
    const path = parseAuthReviewPath(raw.path);
    const limitedToken = parseAuthReviewToken(raw.limitedToken);
    const privilegedToken = parseAuthReviewToken(raw.privilegedToken);
    const marker = parseAuthReviewMarker(raw.marker);
    const reviewMode = parseAuthReviewMode(raw.reviewMode);
    const retestOfId = raw.retestOfId === undefined || raw.retestOfId === null ? null : raw.retestOfId;
    if (retestOfId !== null && (typeof retestOfId !== "string" || !/^sarv_[0-9a-f-]{36}$/i.test(retestOfId))) throw new Error("INVALID");
    if (limitedToken === privilegedToken) throw new Error("INVALID");
    const contractId = raw.contractId === undefined || raw.contractId === null ? null : parseAuthContractId(raw.contractId);
    input = { scopeId: raw.scopeId, path, limitedToken, privilegedToken, marker, retestOfId, contractId, reviewMode, executionConfirmed: true };
  } catch { return reply({ error: "Informe um caminho GET, dois tokens de teste distintos e, se desejar comprovação, um marcador CBSTEST- válido." }, 400); }
  const scope = await runtime.DB.prepare("SELECT domain, status, authorization_expires_at FROM security_agent_scopes WHERE id = ? AND workspace_id = ?")
    .bind(input.scopeId, current.workspace.id).first<{ domain: string; status: string; authorization_expires_at: string | null }>();
  if (!scope || scope.status !== "verified" || !Number.isFinite(Date.parse(scope.authorization_expires_at ?? "")) || Date.parse(scope.authorization_expires_at ?? "") <= Date.now()) return reply({ error: "Domínio sem autorização vigente." }, 403);
  const markerHash = await authReviewMarkerHash(input.marker);
  if (input.contractId) {
    try { await requireAuthContractBinding(runtime.DB, current.workspace.id, input.contractId, { scopeId: input.scopeId, path: input.path, reviewMode: input.reviewMode, markerSha256: markerHash }); }
    catch { return reply({ error: "O contrato exige a mesma rota, tipo de comparação e marcador sintético do workspace." }, 400); }
  }
  if (input.retestOfId) {
    const prior = await runtime.DB.prepare("SELECT marker_sha256, verdict FROM security_auth_reviews WHERE id = ? AND workspace_id = ? AND scope_id = ? AND path = ? AND review_mode = ? AND status = 'completed'")
      .bind(input.retestOfId, current.workspace.id, input.scopeId, input.path, input.reviewMode).first<{ marker_sha256: string | null; verdict: string }>();
    if (!prior || prior.verdict !== "verified_test_marker_exposure" || prior.marker_sha256 !== markerHash) return reply({ error: "Reteste requer a mesma rota e o mesmo marcador sintético de uma exposição confirmada neste workspace." }, 400);
  }
  const now = new Date();
  const bucketStart = new Date(Math.floor(now.getTime() / 600_000) * 600_000).toISOString();
  const reviewId = `sarv_${crypto.randomUUID()}`;
  try {
    await runtime.DB.prepare("INSERT INTO security_auth_reviews (id, workspace_id, scope_id, actor_user_id, path, bucket_start, status, retest_of_id, marker_sha256, review_mode, contract_id, created_at) VALUES (?, ?, ?, ?, ?, ?, 'running', ?, ?, ?, ?, ?)")
      .bind(reviewId, current.workspace.id, input.scopeId, current.user.id, input.path, bucketStart, input.retestOfId, markerHash, input.reviewMode, input.contractId, now.toISOString()).run();
  } catch { return reply({ error: "Já houve uma validação neste domínio nos últimos 10 minutos. Aguarde a próxima janela." }, 429); }
  try {
    const body = JSON.stringify({ reviewId, workspaceId: current.workspace.id, scopeId: input.scopeId, domain: scope.domain, path: input.path, limitedToken: input.limitedToken, privilegedToken: input.privilegedToken, reviewMode: input.reviewMode, ...(input.marker ? { marker: input.marker } : {}) });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = await hmacHex(secret, `${timestamp}.${body}`);
    const response = await runtime.SECURITY_ACTIVE_RUNNER.fetch(new Request("https://security-runner.internal/v1/auth-review", {
      method: "POST", headers: { "Content-Type": "application/json", "X-CBSHub-Timestamp": timestamp, "X-CBSHub-Signature": `sha256=${signature}` }, body,
    }));
    if (!response.ok) throw new Error("RUNNER_UNAVAILABLE");
    const result = await response.json() as { id: string; statuses: { anonymous: number | null; limited: number | null; privileged: number | null }; markerObserved: { anonymous: boolean | null; limited: boolean | null; privileged: boolean | null }; verdict: string; consumed: number; limitation: string; stopReason: string | null };
    if (result.id !== reviewId) throw new Error("RUNNER_RESPONSE_INVALID");
    await dispatchDueAuthReviewAgents(runtime, 1).catch(() => undefined);
    return reply(result);
  } catch {
    await runtime.DB.prepare("UPDATE security_auth_reviews SET status = 'failed', completed_at = ? WHERE id = ? AND status IN ('running','executing')").bind(new Date().toISOString(), reviewId).run();
    return reply({ error: "A validação não foi concluída. Nenhum resultado foi afirmado." }, 503);
  }
}

export const GET = withApiTelemetry("GET /api/security/auth-review", getReviews);
export const POST = withApiTelemetry("POST /api/security/auth-review", postReview);

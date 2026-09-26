import { executeAuthenticatedAccessReview, executeRunnerManifest, verifyRunnerOwnership, type RunnerRequestEvent, type RunnerStage } from "./executor.ts";
import { parseRunnerManifest, SECURITY_RUNNER_MAX_BODY_BYTES, verifyRunnerSignature } from "../domain/security-runner-policy.ts";
import { authReviewFindingIdentity, authReviewMarkerHash, classifyAuthReviewRetest, parseAuthReviewExecution, type AuthReviewVerdict } from "../domain/security-auth-review-policy.ts";
import { SECURITY_CAMPAIGN_COMPATIBLE_POLICY_VERSIONS } from "../domain/security-campaign-policy.ts";

interface RunnerEnv {
  DB: D1Database;
  SECURITY_RUNNER_SIGNING_KEY?: string;
  ACTIVE_RUN_QUEUE: { send(message: { jobId: string }): Promise<void> };
  CF_VERSION_METADATA?: { id: string; tag?: string };
}

type QueueMessage = { body: { jobId: string }; ack(): void; retry(options?: { delaySeconds?: number }): void };
type QueueBatch = { messages: QueueMessage[]; queue: string };
type RunnerJobRow = {
  id: string;
  campaign_id: string;
  manifest_json: string;
  status: string;
  attempt_count: number;
  lease_expires_at: string | null;
  scope_id: string | null;
  campaign_status: string | null;
  campaign_workspace_id: number | null;
  scope_workspace_id: number | null;
  authorized_domain: string | null;
  scope_status: string | null;
  authorization_expires_at: string | null;
  verification_token: string | null;
  agentic_session_status: string | null;
};

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
const eventId = () => `sarex_${crypto.randomUUID()}`;
async function recordStage(env: RunnerEnv, job: { id: string; campaign_id: string }, stage: RunnerStage | "ownership_verification", status: "started" | "completed" | "skipped", counts: Record<string, number> = {}) {
  await env.DB.prepare("INSERT INTO security_runner_events (id, runner_job_id, campaign_id, event_type, details_json, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(eventId(), job.id, job.campaign_id, `runner.stage_${status}`, JSON.stringify({ stage, counts }), new Date().toISOString()).run();
}

async function recordRequest(env: RunnerEnv, job: { id: string; campaign_id: string }, event: RunnerRequestEvent) {
  await env.DB.prepare("INSERT INTO security_runner_events (id, runner_job_id, campaign_id, event_type, details_json, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(eventId(), job.id, job.campaign_id, event.status ? "runner.request_completed" : "runner.request_failed", JSON.stringify(event), new Date().toISOString()).run();
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function enqueue(request: Request, env: RunnerEnv) {
  const secret = env.SECURITY_RUNNER_SIGNING_KEY?.trim() ?? "";
  if (secret.length < 32) return json({ error: "Runner unavailable.", code: "RUNNER_SIGNING_KEY_NOT_CONFIGURED" }, 503);
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > SECURITY_RUNNER_MAX_BODY_BYTES) return json({ error: "Manifest too large.", code: "RUNNER_PAYLOAD_TOO_LARGE" }, 413);
  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > SECURITY_RUNNER_MAX_BODY_BYTES) return json({ error: "Manifest too large.", code: "RUNNER_PAYLOAD_TOO_LARGE" }, 413);
  const validSignature = await verifyRunnerSignature(secret, request.headers.get("x-cbshub-timestamp"), request.headers.get("x-cbshub-signature"), body);
  if (!validSignature) return json({ error: "Invalid signature.", code: "RUNNER_SIGNATURE_INVALID" }, 401);
  let manifest;
  try { manifest = parseRunnerManifest(JSON.parse(body)); }
  catch (error) { return json({ error: "Manifest rejected.", code: error instanceof Error ? error.message : "RUNNER_MANIFEST_INVALID" }, 400); }
  const fingerprint = await sha256(body);
  const existing = await env.DB.prepare("SELECT id, manifest_fingerprint, status FROM security_runner_jobs WHERE campaign_id = ?").bind(manifest.campaignId).first<{ id: string; manifest_fingerprint: string; status: string }>();
  if (existing) {
    if (existing.manifest_fingerprint !== fingerprint) return json({ error: "Campaign manifest changed.", code: "RUNNER_IDEMPOTENCY_CONFLICT" }, 409);
    return json({ jobId: existing.id, status: existing.status, idempotent: true }, 202);
  }
  const jobId = `run_${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO security_runner_jobs
      (id, campaign_id, workspace_id, scope_domain, manifest_json, manifest_fingerprint, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'queued', ?, ?)`).bind(jobId, manifest.campaignId, manifest.workspaceId, manifest.scope.domain, body, fingerprint, now, now),
    env.DB.prepare("INSERT INTO security_runner_events (id, runner_job_id, campaign_id, event_type, details_json, created_at) VALUES (?, ?, ?, 'runner.queued', ?, ?)")
      .bind(eventId(), jobId, manifest.campaignId, JSON.stringify({ version: manifest.version, techniques: manifest.techniques, totalRequests: manifest.budgets.totalRequests }), now),
  ]);
  try { await env.ACTIVE_RUN_QUEUE.send({ jobId }); }
  catch {
    await env.DB.batch([
      env.DB.prepare("UPDATE security_runner_jobs SET status = 'failed', error_code = 'RUNNER_QUEUE_DISPATCH_FAILED', completed_at = ?, updated_at = ? WHERE id = ?").bind(now, now, jobId),
      env.DB.prepare("INSERT INTO security_runner_events (id, runner_job_id, campaign_id, event_type, details_json, created_at) VALUES (?, ?, ?, 'runner.failed', ?, ?)").bind(eventId(), jobId, manifest.campaignId, JSON.stringify({ code: "RUNNER_QUEUE_DISPATCH_FAILED" }), now),
    ]);
    return json({ error: "Runner queue unavailable.", code: "RUNNER_QUEUE_DISPATCH_FAILED" }, 503);
  }
  return json({ jobId, status: "queued" }, 202);
}

async function authenticatedAccessReview(request: Request, env: RunnerEnv, options: { ownershipFetcher?: typeof fetch; targetFetcher?: typeof fetch } = {}) {
  const secret = env.SECURITY_RUNNER_SIGNING_KEY?.trim() ?? "";
  if (secret.length < 32) return json({ code: "RUNNER_SIGNING_KEY_NOT_CONFIGURED" }, 503);
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > 8_192) return json({ code: "RUNNER_PAYLOAD_TOO_LARGE" }, 413);
  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > 8_192) return json({ code: "RUNNER_PAYLOAD_TOO_LARGE" }, 413);
  if (!await verifyRunnerSignature(secret, request.headers.get("x-cbshub-timestamp"), request.headers.get("x-cbshub-signature"), body)) return json({ code: "RUNNER_SIGNATURE_INVALID" }, 401);
  let input: ReturnType<typeof parseAuthReviewExecution>;
  try { input = parseAuthReviewExecution(JSON.parse(body)); }
  catch { return json({ code: "AUTH_REVIEW_INVALID" }, 400); }
  const scope = await env.DB.prepare(`SELECT s.domain, s.status, s.authorization_expires_at, s.verification_token, r.status review_status, r.marker_sha256, r.retest_of_id, r.review_mode
    FROM security_auth_reviews r JOIN security_agent_scopes s ON s.id = r.scope_id AND s.workspace_id = r.workspace_id
    WHERE r.id = ? AND r.workspace_id = ? AND r.scope_id = ? AND r.path = ?`)
    .bind(input.reviewId, input.workspaceId, input.scopeId, input.path)
    .first<{ domain: string; status: string; authorization_expires_at: string | null; verification_token: string; review_status: string; marker_sha256: string | null; retest_of_id: string | null; review_mode: string }>();
  const expiresAt = Date.parse(scope?.authorization_expires_at ?? "");
  if (!scope || scope.domain !== input.domain || scope.status !== "verified" || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) return json({ code: "RUNNER_SCOPE_AUTHORIZATION_INVALID" }, 403);
  if (scope.review_mode !== input.reviewMode) return json({ code: "AUTH_REVIEW_MODE_MISMATCH" }, 403);
  if (scope.marker_sha256 !== await authReviewMarkerHash(input.marker)) return json({ code: "AUTH_REVIEW_MARKER_MISMATCH" }, 403);
  const prior = scope.retest_of_id ? await env.DB.prepare("SELECT verdict FROM security_auth_reviews WHERE id = ? AND workspace_id = ? AND scope_id = ? AND path = ? AND review_mode = ? AND status = 'completed'")
    .bind(scope.retest_of_id, input.workspaceId, input.scopeId, input.path, input.reviewMode).first<{ verdict: AuthReviewVerdict }>() : null;
  if (scope.retest_of_id && !prior) return json({ code: "AUTH_REVIEW_RETEST_INVALID" }, 403);
  const claim = await env.DB.prepare("UPDATE security_auth_reviews SET status = 'executing' WHERE id = ? AND status = 'running'").bind(input.reviewId).run();
  if (Number(claim.meta.changes ?? 0) !== 1) return json({ code: "AUTH_REVIEW_ALREADY_CLAIMED" }, 409);
  try {
    await verifyRunnerOwnership(input.domain, scope.verification_token, options.ownershipFetcher);
    const result = await executeAuthenticatedAccessReview(input, options.targetFetcher);
    const retestOutcome = prior ? classifyAuthReviewRetest(prior.verdict, result.verdict) : null;
    const observedAt = new Date().toISOString();
    const statements = [env.DB.prepare(`UPDATE security_auth_reviews SET status = 'completed', anonymous_status = ?, limited_status = ?, privileged_status = ?, anonymous_marker_observed = ?, limited_marker_observed = ?, privileged_marker_observed = ?, verdict = ?, retest_outcome = ?, completed_at = ? WHERE id = ? AND status = 'executing'`)
      .bind(result.statuses.anonymous, result.statuses.limited, result.statuses.privileged,
        result.markerObserved.anonymous === null ? null : Number(result.markerObserved.anonymous),
        result.markerObserved.limited === null ? null : Number(result.markerObserved.limited),
        result.markerObserved.privileged === null ? null : Number(result.markerObserved.privileged),
        result.verdict, retestOutcome, observedAt, input.reviewId)];
    if (result.verdict === "verified_test_marker_exposure") {
      const finding = await authReviewFindingIdentity(input.scopeId, input.path, input.reviewMode, input.reviewId);
      statements.push(env.DB.prepare(`INSERT INTO security_findings
        (id, workspace_id, scope_id, source_job_id, evidence_code, title, severity, status, occurrence_count, first_observed_at, last_observed_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'medium', 'open', 1, ?, ?, ?, ?)
        ON CONFLICT(scope_id, evidence_code) DO UPDATE SET source_job_id = excluded.source_job_id,
          occurrence_count = security_findings.occurrence_count + 1, last_observed_at = excluded.last_observed_at,
          status = CASE WHEN security_findings.status = 'mitigated' THEN 'open' ELSE security_findings.status END,
          closed_at = CASE WHEN security_findings.status = 'mitigated' THEN NULL ELSE security_findings.closed_at END,
          updated_at = excluded.updated_at`).bind(finding.findingId, input.workspaceId, input.scopeId, input.reviewId, finding.evidenceCode,
        "Marcador sintético acessível por outra identidade de teste", observedAt, observedAt, observedAt, observedAt));
      statements.push(env.DB.prepare(`INSERT OR IGNORE INTO security_finding_events
        (id, workspace_id, finding_id, actor_user_id, event_type, details_json, created_at)
        VALUES (?, ?, ?, NULL, 'auth_review.marker_observed', ?, ?)`).bind(finding.eventId, input.workspaceId, finding.findingId,
        JSON.stringify({ reviewId: input.reviewId, mode: input.reviewMode, evidenceCode: finding.evidenceCode }), observedAt));
    }
    await env.DB.batch(statements);
    return json({ id: input.reviewId, ...result, retestOutcome });
  } catch (error) {
    await env.DB.prepare("UPDATE security_auth_reviews SET status = 'failed', completed_at = ? WHERE id = ? AND status = 'executing'").bind(new Date().toISOString(), input.reviewId).run();
    return json({ code: error instanceof Error && /^RUNNER_[A-Z0-9_]+$/.test(error.message) ? error.message : "AUTH_REVIEW_FAILED" }, 503);
  }
}

async function claimJob(env: RunnerEnv, jobId: string) {
  const now = new Date().toISOString();
  const lease = new Date(Date.now() + 5 * 60_000).toISOString();
  const claimed = await env.DB.prepare(`UPDATE security_runner_jobs
    SET status = 'running', attempt_count = attempt_count + 1, lease_expires_at = ?, started_at = COALESCE(started_at, ?), updated_at = ?
    WHERE id = ? AND attempt_count = 0 AND status = 'queued'`)
    .bind(lease, now, now, jobId).run();
  const row = await env.DB.prepare(`SELECT j.id, j.campaign_id, j.manifest_json, j.status, j.attempt_count, j.lease_expires_at,
      c.scope_id, c.status campaign_status, c.workspace_id campaign_workspace_id,
      s.workspace_id scope_workspace_id, s.domain authorized_domain, s.status scope_status, s.authorization_expires_at, s.verification_token,
      agentic.status agentic_session_status
    FROM security_runner_jobs j
    LEFT JOIN security_campaigns c ON c.id = j.campaign_id
    LEFT JOIN security_agent_scopes s ON s.id = c.scope_id
    LEFT JOIN security_agentic_steps step ON step.campaign_id = c.id
    LEFT JOIN security_agentic_sessions agentic ON agentic.id = step.session_id
    WHERE j.id = ?`).bind(jobId).first<RunnerJobRow>();
  return { row, claimed: Number(claimed.meta.changes ?? 0) === 1 };
}

async function processJob(env: RunnerEnv, rawJobId: unknown, execute: typeof executeRunnerManifest = executeRunnerManifest, options: { ownershipFetcher?: typeof fetch } = {}) {
  if (typeof rawJobId !== "string" || !/^run_[0-9a-f-]{36}$/i.test(rawJobId)) return "discard" as const;
  const { row, claimed } = await claimJob(env, rawJobId);
  if (!row) return "discard" as const;
  if (!claimed) {
    if (row.status !== "running") return "done" as const;
    if (row.lease_expires_at && Date.parse(row.lease_expires_at) > Date.now()) return "leased" as const;
    const now = new Date().toISOString();
    await env.DB.batch([
      env.DB.prepare("UPDATE security_runner_jobs SET status = 'failed', error_code = 'RUNNER_EXECUTION_INTERRUPTED', completed_at = ?, updated_at = ? WHERE id = ? AND status = 'running'").bind(now, now, row.id),
      env.DB.prepare("INSERT INTO security_runner_events (id, runner_job_id, campaign_id, event_type, details_json, created_at) VALUES (?, ?, ?, 'runner.failed', ?, ?)").bind(eventId(), row.id, row.campaign_id, JSON.stringify({ code: "RUNNER_EXECUTION_INTERRUPTED", replayed: false }), now),
    ]);
    return "done" as const;
  }
  try {
    const manifest = parseRunnerManifest(JSON.parse(row.manifest_json), Date.now(), "execute");
    const authorizationExpiresAt = Date.parse(row.authorization_expires_at ?? "");
    if (!row.scope_id || row.scope_status !== "verified" || !["approved", "queued", "running"].includes(row.campaign_status ?? "")
      || row.campaign_workspace_id !== manifest.workspaceId || row.scope_workspace_id !== manifest.workspaceId
      || (row.agentic_session_status !== null && row.agentic_session_status !== "running")
      || row.authorized_domain !== manifest.scope.domain || !Number.isFinite(authorizationExpiresAt) || authorizationExpiresAt <= Date.now()) {
      throw new Error("RUNNER_SCOPE_AUTHORIZATION_INVALID");
    }
    await recordStage(env, row, "ownership_verification", "started");
    await verifyRunnerOwnership(manifest.scope.domain, row.verification_token ?? "", options.ownershipFetcher);
    await recordStage(env, row, "ownership_verification", "completed");
    const result = await execute(manifest, { onStage: (stage, status, counts) => recordStage(env, row, stage, status, counts), onRequest: (event) => recordRequest(env, row, event) });
    const status = result.outcome === "stopped" ? "stopped" : "completed";
    const now = new Date().toISOString();
    await env.DB.batch([
      env.DB.prepare("UPDATE security_runner_jobs SET status = ?, request_count = ?, error_count = ?, result_json = ?, error_code = NULL, lease_expires_at = NULL, completed_at = ?, updated_at = ? WHERE id = ? AND status = 'running'")
        .bind(status, result.budget.consumed, result.requests.errors + result.requests.serverErrors, JSON.stringify(result), now, now, row.id),
      env.DB.prepare("INSERT INTO security_runner_events (id, runner_job_id, campaign_id, event_type, details_json, created_at) VALUES (?, ?, ?, ?, ?, ?)")
        .bind(eventId(), row.id, row.campaign_id, status === "stopped" ? "runner.stopped" : "runner.completed", JSON.stringify({ requests: result.budget.consumed, stopReason: result.stopReason }), now),
    ]);
    return "done" as const;
  } catch (error) {
    const code = error instanceof Error && /^RUNNER_[A-Z0-9_]+$/.test(error.message) ? error.message : "RUNNER_EXECUTION_FAILED";
    // Execution may already have reached the target. Never replay it automatically.
    const status = "failed";
    const now = new Date().toISOString();
    await env.DB.batch([
      env.DB.prepare("UPDATE security_runner_jobs SET status = ?, error_code = ?, lease_expires_at = NULL, completed_at = CASE WHEN ? = 'failed' THEN ? ELSE NULL END, updated_at = ? WHERE id = ?")
        .bind(status, code, status, now, now, row.id),
      env.DB.prepare("INSERT INTO security_runner_events (id, runner_job_id, campaign_id, event_type, details_json, created_at) VALUES (?, ?, ?, ?, ?, ?)")
        .bind(eventId(), row.id, row.campaign_id, "runner.failed", JSON.stringify({ code, attempt: row.attempt_count, replayed: false }), now),
    ]);
    return "done" as const;
  }
}

const worker = {
  async fetch(request: Request, env: RunnerEnv) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") return json({ status: "healthy", service: "cbs-hub-security-runner", release: env.CF_VERSION_METADATA?.id ?? "local", supportedPolicyVersions: SECURITY_CAMPAIGN_COMPATIBLE_POLICY_VERSIONS });
    if (request.method === "POST" && url.pathname === "/v1/jobs") return enqueue(request, env);
    if (request.method === "POST" && url.pathname === "/v1/auth-review") return authenticatedAccessReview(request, env);
    return json({ error: "Not found.", code: "RUNNER_NOT_FOUND" }, 404);
  },
  async queue(batch: QueueBatch, env: RunnerEnv) {
    for (const message of batch.messages) {
      const result = await processJob(env, message.body?.jobId).catch(() => "retry" as const);
      if (result === "retry") message.retry({ delaySeconds: 30 });
      else if (result === "leased") message.retry({ delaySeconds: 300 });
      else message.ack();
    }
  },
};

export { enqueue, authenticatedAccessReview, processJob };
export default worker;

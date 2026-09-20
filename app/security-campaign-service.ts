import { enqueueSecurityAgentJob, type SecurityAgentEnv, type SecurityScopeRow } from "./security-agent-service.ts";
import { campaignExecutionReadiness, guidedWebCampaignInput, parseRepositoryTarget, parseSecurityCampaignInput, SECURITY_CAMPAIGN_POLICY_VERSION, securityTechniqueCatalog } from "../domain/security-campaign-policy.ts";
import { hmacHex, parseRunnerManifest } from "../domain/security-runner-policy.ts";

export type SecurityDeliveryEnv = Pick<SecurityAgentEnv, "DB"> & { SECURITY_ACTIVE_RUNNER?: { fetch(request: Request): Promise<Response> }; SECURITY_RUNNER_SIGNING_KEY?: string; GITHUB_APP_ID?: string };
type CampaignRow = { id: string; workspace_id: number; scope_id: string; status: string; name?: string; environment?: string; techniques_json: string; policy_version?: string; window_start?: string; window_end?: string; max_requests_per_minute?: number; max_total_requests?: number; stop_conditions_json?: string };
type RemediationRow = { id: string; workspace_id: number; scope_id: string; finding_id: string; status: string };

const uuid = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
const authorizationCurrent = (scope: SecurityScopeRow) => scope.status === "verified" && Boolean(scope.authorization_expires_at) && Date.parse(scope.authorization_expires_at!) > Date.now();
const integrations = (env: SecurityDeliveryEnv) => ({ isolatedRunner: Boolean(env.SECURITY_ACTIVE_RUNNER && (env.SECURITY_RUNNER_SIGNING_KEY?.trim().length ?? 0) >= 32), repositoryConnector: Boolean(env.GITHUB_APP_ID?.trim()) });
const runnerRejectionCodes = new Set([
  "RUNNER_SIGNING_KEY_NOT_CONFIGURED", "RUNNER_SIGNATURE_INVALID", "RUNNER_POLICY_MISMATCH",
  "RUNNER_TECHNIQUES_INVALID", "RUNNER_MANIFEST_INVALID", "RUNNER_MANIFEST_UNKNOWN_FIELD",
  "RUNNER_SCOPE_INVALID", "RUNNER_WINDOW_INVALID", "RUNNER_OUTSIDE_WINDOW",
  "RUNNER_BUDGET_INVALID", "RUNNER_STOP_CONDITIONS_INVALID", "RUNNER_PAYLOAD_TOO_LARGE",
  "RUNNER_IDEMPOTENCY_CONFLICT", "RUNNER_QUEUE_DISPATCH_FAILED",
]);

async function dispatchIsolatedRunner(env: SecurityDeliveryEnv, scope: SecurityScopeRow, campaign: CampaignRow) {
  const runner = env.SECURITY_ACTIVE_RUNNER;
  const signingKey = env.SECURITY_RUNNER_SIGNING_KEY?.trim();
  if (!runner || !signingKey || signingKey.length < 32) throw new Error("CAMPAIGN_EXECUTOR_NOT_CONFIGURED");
  const techniques = JSON.parse(campaign.techniques_json) as Array<keyof typeof securityTechniqueCatalog>;
  if (!techniques.length || techniques.some((technique) => securityTechniqueCatalog[technique]?.execution !== "isolated_runner" || securityTechniqueCatalog[technique]?.requiresTestCredentials)) throw new Error("CAMPAIGN_EXECUTOR_NOT_CONFIGURED");
  const manifest = parseRunnerManifest({
    version: 1,
    campaignId: campaign.id,
    workspaceId: campaign.workspace_id,
    scope: { domain: scope.domain },
    name: campaign.name,
    environment: campaign.environment,
    techniques,
    policyVersion: campaign.policy_version,
    window: { start: campaign.window_start, end: campaign.window_end },
    budgets: { requestsPerMinute: campaign.max_requests_per_minute, totalRequests: campaign.max_total_requests },
    stopConditions: JSON.parse(campaign.stop_conditions_json ?? "{}") as unknown,
  });
  const body = JSON.stringify(manifest);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const response = await runner.fetch(new Request("https://security-runner.internal/v1/jobs", { method: "POST", headers: { "Content-Type": "application/json", "X-CBSHub-Timestamp": timestamp, "X-CBSHub-Signature": `sha256=${await hmacHex(signingKey, `${timestamp}.${body}`)}` }, body }));
  if (response.status !== 202) {
    const rejection = await response.json().catch(() => null) as { code?: unknown } | null;
    const code = typeof rejection?.code === "string" && runnerRejectionCodes.has(rejection.code) ? rejection.code : null;
    throw new Error(code ? `CAMPAIGN_${code}` : "CAMPAIGN_RUNNER_REJECTED");
  }
  const result = await response.json().catch(() => null) as { jobId?: unknown } | null;
  if (!result || typeof result.jobId !== "string" || !/^run_[a-z0-9-]{8,80}$/i.test(result.jobId)) throw new Error("CAMPAIGN_RUNNER_RESPONSE_INVALID");
  return { runnerJobId: result.jobId, manifest };
}

type RunnerReconciliationRow = {
  campaign_id: string;
  workspace_id: number;
  scope_id: string;
  campaign_status: string;
  runner_status: string;
  result_json: string;
  error_code: string | null;
  request_count: number;
  error_count: number;
  completed_at: string | null;
};

export async function reconcileSecurityRunnerCampaigns(env: SecurityDeliveryEnv, workspaceId?: number, limit = 20) {
  const safeLimit = Math.max(1, Math.min(50, Math.floor(limit)));
  const whereWorkspace = workspaceId ? "AND c.workspace_id = ?" : "";
  const statement = env.DB.prepare(`SELECT c.id campaign_id, c.workspace_id, c.scope_id, c.status campaign_status,
      j.status runner_status, j.result_json, j.error_code, j.request_count, j.error_count, j.completed_at
    FROM security_campaigns c
    JOIN security_runner_jobs j ON j.id = c.runner_job_id
    WHERE c.executor = 'isolated_runner' AND c.status IN ('queued','running','review') ${whereWorkspace}
    ORDER BY c.updated_at, c.id LIMIT ?`);
  const rows = workspaceId
    ? await statement.bind(workspaceId, safeLimit).all<RunnerReconciliationRow>()
    : await statement.bind(safeLimit).all<RunnerReconciliationRow>();
  let updated = 0;
  for (const row of rows.results) {
    const nextStatus = row.runner_status === "running" ? "running"
      : row.runner_status === "completed" ? "completed"
      : row.runner_status === "stopped" ? "review"
      : row.runner_status === "failed" ? "failed"
      : "queued";
    const terminal = ["completed", "review", "failed"].includes(nextStatus);
    const alreadySynchronized = row.campaign_status === nextStatus && (!terminal || Boolean(row.completed_at));
    if (alreadySynchronized) continue;
    const now = new Date().toISOString();
    await env.DB.batch([
      env.DB.prepare(`UPDATE security_campaigns SET status = ?, runner_result_json = ?, runner_error_code = ?, runner_completed_at = ?, updated_at = ?
        WHERE id = ? AND workspace_id = ? AND executor = 'isolated_runner'`)
        .bind(nextStatus, terminal ? row.result_json : "{}", row.error_code, terminal ? row.completed_at ?? now : null, now, row.campaign_id, row.workspace_id),
      env.DB.prepare("INSERT INTO security_campaign_events (id, workspace_id, campaign_id, actor_user_id, event_type, details_json, created_at) VALUES (?, ?, ?, NULL, 'campaign.runner_status_changed', ?, ?)")
        .bind(uuid("sace"), row.workspace_id, row.campaign_id, JSON.stringify({ from: row.campaign_status, to: nextStatus, requestCount: row.request_count, errorCount: row.error_count, errorCode: row.error_code }), now),
    ]);
    updated += 1;
  }
  return { checked: rows.results.length, updated };
}

export async function createSecurityCampaign(env: SecurityDeliveryEnv, scope: SecurityScopeRow, actorUserId: number, raw: unknown) {
  if (!authorizationCurrent(scope)) throw new Error("CAMPAIGN_SCOPE_NOT_AUTHORIZED");
  const input = parseSecurityCampaignInput(raw);
  const active = await env.DB.prepare("SELECT COUNT(*) total FROM security_campaigns WHERE workspace_id = ? AND status IN ('draft','approved','queued','running','review')").bind(scope.workspace_id).first<{ total: number }>();
  if (Number(active?.total ?? 0) >= 5) throw new Error("CAMPAIGN_ACTIVE_LIMIT");
  const id = uuid("sac");
  const now = new Date().toISOString();
  const readiness = campaignExecutionReadiness(input, integrations(env));
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO security_campaigns
      (id, workspace_id, scope_id, created_by_user_id, name, environment, techniques_json, policy_version, window_start, window_end, max_requests_per_minute, max_total_requests, stop_conditions_json, status, readiness_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)`)
      .bind(id, scope.workspace_id, scope.id, actorUserId, input.name, input.environment, JSON.stringify(input.techniques), SECURITY_CAMPAIGN_POLICY_VERSION, input.windowStart, input.windowEnd, input.maxRequestsPerMinute, input.maxTotalRequests, JSON.stringify(input.stopConditions), JSON.stringify(readiness), now, now),
    env.DB.prepare("INSERT INTO security_campaign_events (id, workspace_id, campaign_id, actor_user_id, event_type, details_json, created_at) VALUES (?, ?, ?, ?, 'campaign.created', ?, ?)")
      .bind(uuid("sace"), scope.workspace_id, id, actorUserId, JSON.stringify({ policyVersion: SECURITY_CAMPAIGN_POLICY_VERSION, environment: input.environment, techniques: input.techniques, readiness }), now),
  ]);
  return { id, scopeId: scope.id, status: "draft" as const, ...input, readiness, policyVersion: SECURITY_CAMPAIGN_POLICY_VERSION, createdAt: now };
}

export async function approveSecurityCampaign(env: SecurityDeliveryEnv, args: { workspaceId: number; scope: SecurityScopeRow; campaignId: unknown; actorUserId: number; approvalConfirmed: unknown }) {
  if (args.approvalConfirmed !== true) throw new Error("CAMPAIGN_APPROVAL_REQUIRED");
  if (!authorizationCurrent(args.scope)) throw new Error("CAMPAIGN_SCOPE_NOT_AUTHORIZED");
  if (typeof args.campaignId !== "string" || !/^sac_[0-9a-f-]{36}$/i.test(args.campaignId)) throw new Error("CAMPAIGN_INVALID");
  const campaign = await env.DB.prepare("SELECT id, workspace_id, scope_id, status, techniques_json FROM security_campaigns WHERE id = ? AND workspace_id = ? AND scope_id = ?").bind(args.campaignId, args.workspaceId, args.scope.id).first<CampaignRow>();
  if (!campaign) throw new Error("CAMPAIGN_NOT_FOUND");
  if (campaign.status !== "draft") throw new Error("CAMPAIGN_STATE_INVALID");
  const techniques = JSON.parse(campaign.techniques_json) as Parameters<typeof campaignExecutionReadiness>[0]["techniques"];
  const readiness = campaignExecutionReadiness({ techniques }, integrations(env));
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare("UPDATE security_campaigns SET status = 'approved', approved_by_user_id = ?, approved_at = ?, readiness_json = ?, updated_at = ? WHERE id = ? AND status = 'draft'").bind(args.actorUserId, now, JSON.stringify(readiness), now, campaign.id),
    env.DB.prepare("INSERT INTO security_campaign_events (id, workspace_id, campaign_id, actor_user_id, event_type, details_json, created_at) VALUES (?, ?, ?, ?, 'campaign.approved', ?, ?)").bind(uuid("sace"), args.workspaceId, campaign.id, args.actorUserId, JSON.stringify({ readiness, executionDispatched: false }), now),
  ]);
  return { id: campaign.id, status: "approved" as const, readiness, executionDispatched: false };
}

/** One explicit user confirmation schedules the fixed preset; the cron still rechecks scope before dispatch. */
export async function startGuidedSecurityCampaign(env: SecurityDeliveryEnv, scope: SecurityScopeRow, actorUserId: number, executionConfirmed: unknown) {
  if (executionConfirmed !== true) throw new Error("CAMPAIGN_EXECUTION_CONFIRMATION_REQUIRED");
  if (!authorizationCurrent(scope)) throw new Error("CAMPAIGN_SCOPE_NOT_AUTHORIZED");
  if (!env.SECURITY_ACTIVE_RUNNER || (env.SECURITY_RUNNER_SIGNING_KEY?.trim().length ?? 0) < 32) throw new Error("CAMPAIGN_EXECUTOR_NOT_CONFIGURED");
  const existing = await env.DB.prepare("SELECT id FROM security_campaigns WHERE workspace_id = ? AND scope_id = ? AND guided = 1 AND status IN ('approved','queued','running') LIMIT 1").bind(scope.workspace_id, scope.id).first<{ id: string }>();
  if (existing) throw new Error("CAMPAIGN_GUIDED_ALREADY_ACTIVE");
  const preset = guidedWebCampaignInput();
  const created = await createSecurityCampaign(env, scope, actorUserId, preset);
  if (!created.readiness.ready) throw new Error("CAMPAIGN_EXECUTOR_NOT_CONFIGURED");
  await approveSecurityCampaign(env, { workspaceId: scope.workspace_id, scope, campaignId: created.id, actorUserId, approvalConfirmed: true });
  let marked;
  try {
    marked = await env.DB.prepare("UPDATE security_campaigns SET guided = 1, auto_dispatch = 1 WHERE id = ? AND workspace_id = ? AND status = 'approved'").bind(created.id, scope.workspace_id).run();
  } catch (error) {
    await cancelSecurityCampaign(env, { workspaceId: scope.workspace_id, scopeId: scope.id, campaignId: created.id, actorUserId }).catch(() => undefined);
    if (error instanceof Error && (error.message.includes("security_campaigns_active_guided_scope_idx") || error.message.includes("UNIQUE constraint failed: security_campaigns.scope_id"))) throw new Error("CAMPAIGN_GUIDED_ALREADY_ACTIVE");
    throw error;
  }
  if (Number(marked.meta.changes) !== 1) throw new Error("CAMPAIGN_GUIDED_SCHEDULE_FAILED");
  await env.DB.prepare("INSERT INTO security_campaign_events (id, workspace_id, campaign_id, actor_user_id, event_type, details_json, created_at) VALUES (?, ?, ?, ?, 'campaign.guided_scheduled', ?, ?)")
    .bind(uuid("sace"), scope.workspace_id, created.id, actorUserId, JSON.stringify({ windowStart: preset.windowStart, techniques: preset.techniques, maxTotalRequests: preset.maxTotalRequests, maxRequestsPerMinute: preset.maxRequestsPerMinute }), new Date().toISOString()).run();
  return { id: created.id, status: "approved" as const, guided: true, scheduledFor: preset.windowStart, windowEnd: preset.windowEnd, ...created.readiness };
}

/** At most once per campaign: failed or uncertain dispatches require a new user decision. */
export async function dispatchDueGuidedSecurityCampaigns(env: SecurityDeliveryEnv & SecurityAgentEnv, now = Date.now(), limit = 10) {
  const orphaned = await env.DB.prepare("SELECT id, workspace_id, window_end FROM security_campaigns WHERE guided = 1 AND auto_dispatch = 0 AND status = 'queued' AND runner_job_id IS NULL ORDER BY window_end, id LIMIT ?")
    .bind(Math.max(1, Math.min(20, Math.floor(limit)))).all<{ id: string; workspace_id: number; window_end: string }>();
  for (const row of orphaned.results) {
    const runnerJob = await env.DB.prepare("SELECT id FROM security_runner_jobs WHERE campaign_id = ? AND workspace_id = ?").bind(row.id, row.workspace_id).first<{ id: string }>();
    if (runnerJob) {
      await env.DB.prepare("UPDATE security_campaigns SET runner_job_id = ?, executor = 'isolated_runner', updated_at = ? WHERE id = ? AND runner_job_id IS NULL AND status = 'queued'").bind(runnerJob.id, new Date(now).toISOString(), row.id).run();
    } else if (Date.parse(row.window_end) <= now) {
      await env.DB.prepare("UPDATE security_campaigns SET status = 'failed', runner_error_code = 'CAMPAIGN_GUIDED_DISPATCH_UNCERTAIN', updated_at = ? WHERE id = ? AND runner_job_id IS NULL AND status = 'queued'").bind(new Date(now).toISOString(), row.id).run();
    }
  }
  const rows = await env.DB.prepare("SELECT id, workspace_id, scope_id, approved_by_user_id, window_end FROM security_campaigns WHERE guided = 1 AND auto_dispatch = 1 AND status = 'approved' AND window_start <= ? ORDER BY window_start, id LIMIT ?")
    .bind(new Date(now).toISOString(), Math.max(1, Math.min(20, Math.floor(limit)))).all<{ id: string; workspace_id: number; scope_id: string; approved_by_user_id: number; window_end: string }>();
  let queued = 0, failed = 0;
  for (const row of rows.results) {
    const claimed = await env.DB.prepare("UPDATE security_campaigns SET status = 'queued', auto_dispatch = 0, updated_at = ? WHERE id = ? AND status = 'approved' AND auto_dispatch = 1").bind(new Date(now).toISOString(), row.id).run();
    if (Number(claimed.meta.changes) !== 1) continue;
    try {
      if (Date.parse(row.window_end) <= now) throw new Error("CAMPAIGN_WINDOW_EXPIRED");
      const scope = await env.DB.prepare("SELECT * FROM security_agent_scopes WHERE id = ? AND workspace_id = ? AND status = 'verified'").bind(row.scope_id, row.workspace_id).first<SecurityScopeRow>();
      if (!scope || !authorizationCurrent(scope)) throw new Error("CAMPAIGN_SCOPE_NOT_AUTHORIZED");
      await dispatchSecurityCampaign(env, { workspaceId: row.workspace_id, scope, campaignId: row.id, actorUserId: row.approved_by_user_id, executionConfirmed: true, claimedGuided: true });
      queued += 1;
    } catch (error) {
      const runnerJob = await env.DB.prepare("SELECT id FROM security_runner_jobs WHERE campaign_id = ? AND workspace_id = ?").bind(row.id, row.workspace_id).first<{ id: string }>().catch(() => null);
      if (runnerJob) {
        await env.DB.prepare("UPDATE security_campaigns SET runner_job_id = ?, executor = 'isolated_runner', updated_at = ? WHERE id = ? AND runner_job_id IS NULL AND status = 'queued'").bind(runnerJob.id, new Date().toISOString(), row.id).run();
        queued += 1;
        continue;
      }
      const code = error instanceof Error && /^CAMPAIGN_[A-Z0-9_]+$/.test(error.message) ? error.message : "CAMPAIGN_GUIDED_DISPATCH_FAILED";
      const finishedAt = new Date().toISOString();
      await env.DB.batch([
        env.DB.prepare("UPDATE security_campaigns SET status = 'failed', runner_error_code = ?, updated_at = ? WHERE id = ? AND status = 'queued' AND runner_job_id IS NULL").bind(code, finishedAt, row.id),
        env.DB.prepare("INSERT INTO security_campaign_events (id, workspace_id, campaign_id, actor_user_id, event_type, details_json, created_at) VALUES (?, ?, ?, NULL, 'campaign.guided_dispatch_failed', ?, ?)").bind(uuid("sace"), row.workspace_id, row.id, JSON.stringify({ code }), finishedAt),
      ]);
      failed += 1;
    }
  }
  return { checked: rows.results.length, queued, failed };
}

export async function cancelSecurityCampaign(env: SecurityDeliveryEnv, args: { workspaceId: number; scopeId: string; campaignId: unknown; actorUserId: number }) {
  if (typeof args.campaignId !== "string" || !/^sac_[0-9a-f-]{36}$/i.test(args.campaignId)) throw new Error("CAMPAIGN_INVALID");
  const campaign = await env.DB.prepare("SELECT id, workspace_id, scope_id, status, techniques_json FROM security_campaigns WHERE id = ? AND workspace_id = ? AND scope_id = ?").bind(args.campaignId, args.workspaceId, args.scopeId).first<CampaignRow>();
  if (!campaign) throw new Error("CAMPAIGN_NOT_FOUND");
  if (!["draft", "approved"].includes(campaign.status)) throw new Error("CAMPAIGN_STATE_INVALID");
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare("UPDATE security_campaigns SET status = 'cancelled', cancelled_at = ?, updated_at = ? WHERE id = ? AND status IN ('draft','approved')").bind(now, now, campaign.id),
    env.DB.prepare("INSERT INTO security_campaign_events (id, workspace_id, campaign_id, actor_user_id, event_type, details_json, created_at) VALUES (?, ?, ?, ?, 'campaign.cancelled', '{}', ?)").bind(uuid("sace"), args.workspaceId, campaign.id, args.actorUserId, now),
  ]);
  return { id: campaign.id, status: "cancelled" as const };
}

export async function dispatchSecurityCampaign(env: SecurityDeliveryEnv & SecurityAgentEnv, args: { workspaceId: number; scope: SecurityScopeRow; campaignId: unknown; actorUserId: number; executionConfirmed: unknown; claimedGuided?: true }) {
  if (args.executionConfirmed !== true) throw new Error("CAMPAIGN_EXECUTION_CONFIRMATION_REQUIRED");
  if (!authorizationCurrent(args.scope)) throw new Error("CAMPAIGN_SCOPE_NOT_AUTHORIZED");
  if (typeof args.campaignId !== "string" || !/^sac_[0-9a-f-]{36}$/i.test(args.campaignId)) throw new Error("CAMPAIGN_INVALID");
  const campaign = await env.DB.prepare("SELECT id, workspace_id, scope_id, status, guided, name, environment, techniques_json, policy_version, window_start, window_end, max_requests_per_minute, max_total_requests, stop_conditions_json FROM security_campaigns WHERE id = ? AND workspace_id = ? AND scope_id = ?").bind(args.campaignId, args.workspaceId, args.scope.id).first<CampaignRow & { guided: number }>();
  if (!campaign) throw new Error("CAMPAIGN_NOT_FOUND");
  if (args.claimedGuided ? campaign.status !== "queued" || campaign.guided !== 1 : campaign.status !== "approved" || campaign.guided === 1) throw new Error("CAMPAIGN_STATE_INVALID");
  const nowMs = Date.now();
  if (!campaign.window_start || !campaign.window_end || nowMs < Date.parse(campaign.window_start)) throw new Error("CAMPAIGN_WINDOW_NOT_STARTED");
  if (nowMs > Date.parse(campaign.window_end)) throw new Error("CAMPAIGN_WINDOW_EXPIRED");
  const techniques = JSON.parse(campaign.techniques_json) as Parameters<typeof campaignExecutionReadiness>[0]["techniques"];
  if (techniques.length !== 1 || techniques[0] !== "passive_external_posture") {
    const dispatched = await dispatchIsolatedRunner(env, args.scope, campaign);
    const now = new Date().toISOString();
    await env.DB.batch([
      env.DB.prepare(`UPDATE security_campaigns SET status = 'queued', executor = 'isolated_runner', runner_job_id = ?, updated_at = ? WHERE id = ? AND status = ?`).bind(dispatched.runnerJobId, now, campaign.id, args.claimedGuided ? "queued" : "approved"),
      env.DB.prepare("INSERT INTO security_campaign_events (id, workspace_id, campaign_id, actor_user_id, event_type, details_json, created_at) VALUES (?, ?, ?, ?, 'campaign.dispatched', ?, ?)")
        .bind(uuid("sace"), args.workspaceId, campaign.id, args.actorUserId, JSON.stringify({ runnerJobId: dispatched.runnerJobId, executor: "isolated_runner", policyVersion: SECURITY_CAMPAIGN_POLICY_VERSION, techniques }), now),
    ]);
    return { id: campaign.id, status: "queued" as const, runnerJobId: dispatched.runnerJobId, executor: "isolated_runner" as const };
  }
  const job = await enqueueSecurityAgentJob(env, args.scope, args.actorUserId, "manual");
  const now = new Date().toISOString();
  const status = job.status === "queued" ? "queued" : "completed";
  await env.DB.batch([
    env.DB.prepare("UPDATE security_campaigns SET status = ?, agent_job_id = ?, updated_at = ? WHERE id = ? AND status = 'approved'").bind(status, job.id, now, campaign.id),
    env.DB.prepare("INSERT INTO security_campaign_events (id, workspace_id, campaign_id, actor_user_id, event_type, details_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind(uuid("sace"), args.workspaceId, campaign.id, args.actorUserId, status === "queued" ? "campaign.dispatched" : "campaign.completed", JSON.stringify({ agentJobId: job.id, executor: "existing_passive" }), now),
  ]);
  return { id: campaign.id, status, agentJobId: job.id, executor: "existing_passive" };
}

export async function createRemediationProposal(env: SecurityDeliveryEnv, args: { workspaceId: number; scopeId: string; actorUserId: number; target: unknown }) {
  const target = parseRepositoryTarget(args.target);
  const finding = await env.DB.prepare("SELECT id, scope_id, status FROM security_findings WHERE id = ? AND workspace_id = ? AND scope_id = ?").bind(target.findingId, args.workspaceId, args.scopeId).first<{ id: string; scope_id: string; status: string }>();
  if (!finding || !["open", "investigating"].includes(finding.status)) throw new Error("REMEDIATION_FINDING_INVALID");
  const id = uuid("sarp");
  const now = new Date().toISOString();
  try {
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO security_remediation_proposals
        (id, workspace_id, scope_id, finding_id, created_by_user_id, provider, repository_full_name, base_branch, strategy, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pull_request_only', 'draft', ?, ?)`)
        .bind(id, args.workspaceId, args.scopeId, target.findingId, args.actorUserId, target.provider, target.repository, target.baseBranch, now, now),
      env.DB.prepare("INSERT INTO security_remediation_events (id, workspace_id, remediation_id, actor_user_id, event_type, details_json, created_at) VALUES (?, ?, ?, ?, 'remediation.created', ?, ?)")
        .bind(uuid("sare"), args.workspaceId, id, args.actorUserId, JSON.stringify({ repository: target.repository, baseBranch: target.baseBranch, strategy: target.strategy, externalWritePerformed: false }), now),
    ]);
  } catch (error) {
    if (error instanceof Error && /UNIQUE constraint/i.test(error.message)) throw new Error("REMEDIATION_ALREADY_ACTIVE");
    throw error;
  }
  return { id, scopeId: args.scopeId, findingId: target.findingId, status: "draft" as const, provider: target.provider, repository: target.repository, baseBranch: target.baseBranch, strategy: target.strategy, connectorConfigured: integrations(env).repositoryConnector, externalWritePerformed: false };
}

export async function decideRemediationProposal(env: SecurityDeliveryEnv, args: { workspaceId: number; scopeId: string; remediationId: unknown; actorUserId: number; decision: unknown; approvalConfirmed: unknown }) {
  if (typeof args.remediationId !== "string" || !/^sarp_[0-9a-f-]{36}$/i.test(args.remediationId) || !["approve", "reject"].includes(String(args.decision))) throw new Error("REMEDIATION_INVALID");
  if (args.decision === "approve" && args.approvalConfirmed !== true) throw new Error("REMEDIATION_APPROVAL_REQUIRED");
  const proposal = await env.DB.prepare("SELECT id, workspace_id, scope_id, finding_id, status FROM security_remediation_proposals WHERE id = ? AND workspace_id = ? AND scope_id = ?").bind(args.remediationId, args.workspaceId, args.scopeId).first<RemediationRow>();
  if (!proposal) throw new Error("REMEDIATION_NOT_FOUND");
  if (proposal.status !== "draft") throw new Error("REMEDIATION_STATE_INVALID");
  const status = args.decision === "approve" ? "approved" : "rejected";
  const now = new Date().toISOString();
  const connectorConfigured = integrations(env).repositoryConnector;
  await env.DB.batch([
    env.DB.prepare(`UPDATE security_remediation_proposals SET status = ?, approved_by_user_id = ?, approved_at = ?, updated_at = ? WHERE id = ? AND status = 'draft'`)
      .bind(status, status === "approved" ? args.actorUserId : null, status === "approved" ? now : null, now, proposal.id),
    env.DB.prepare("INSERT INTO security_remediation_events (id, workspace_id, remediation_id, actor_user_id, event_type, details_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind(uuid("sare"), args.workspaceId, proposal.id, args.actorUserId, status === "approved" ? "remediation.approved" : "remediation.rejected", JSON.stringify({ connectorConfigured, externalWritePerformed: false }), now),
  ]);
  return { id: proposal.id, status, connectorConfigured, externalWritePerformed: false };
}

import { env } from "cloudflare:workers";
import { getCurrentUser, type AppUser } from "../../auth";
import { withApiTelemetry } from "../../api-infrastructure";
import {
  createSecurityScope,
  enqueueSecurityAgentJob,
  securityAgentModelRouting,
  scopeVerificationInstructions,
  type SecurityAgentEnv,
  type SecurityScopeRow,
  verifySecurityScope,
} from "../../security-agent-service";
import { canManageWorkspace, getWorkspaceContext, type WorkspaceContext } from "../../workspace";
import { getWorkspaceEntitlements, scopeLimitResponse } from "../../plan-entitlements";

type JobRow = {
  id: string;
  scope_id: string;
  trigger_kind: string;
  status: string;
  evidence_json: string;
  assessment_json: string;
  provider: string | null;
  model: string | null;
  primary_model: string | null;
  review_model: string | null;
  review_reason: string | null;
  provider_usage_json: string;
  error_code: string | null;
  started_at: string;
  completed_at: string | null;
};

function runtime() {
  return env as unknown as SecurityAgentEnv;
}

function parseJson(value: string) {
  try { return JSON.parse(value) as unknown; }
  catch { return null; }
}

async function context(): Promise<Response | { user: AppUser; workspace: WorkspaceContext }> {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para acessar o agente de segurança." }, { status: 401 });
  const workspace = await getWorkspaceContext(user.id);
  if (!workspace) return Response.json({ error: "Workspace indisponível." }, { status: 403 });
  return { user, workspace };
}

async function scopeForWorkspace(db: D1Database, workspaceId: number, scopeId: unknown) {
  if (typeof scopeId !== "string") return null;
  return db.prepare("SELECT * FROM security_agent_scopes WHERE id = ? AND workspace_id = ? AND status <> 'revoked'").bind(scopeId, workspaceId).first<SecurityScopeRow>();
}

async function getAgent() {
  const current = await context();
  if (current instanceof Response) return current;
  const db = runtime().DB;
  const [scopes, jobs, entitlements] = await Promise.all([
    db.prepare("SELECT * FROM security_agent_scopes WHERE workspace_id = ? AND status <> 'revoked' ORDER BY created_at DESC").bind(current.workspace.id).all<SecurityScopeRow>(),
    db.prepare(`SELECT id, scope_id, trigger_kind, status, evidence_json, assessment_json, provider, model, primary_model, review_model, review_reason, provider_usage_json, error_code, started_at, completed_at FROM security_agent_jobs WHERE workspace_id = ? ORDER BY started_at DESC LIMIT 20`).bind(current.workspace.id).all<JobRow>(),
    getWorkspaceEntitlements(current.workspace),
  ]);
  return Response.json({
    canManage: canManageWorkspace(current.workspace.role),
    aiConfigured: Boolean(runtime().OPENAI_API_KEY?.trim()),
    modelRouting: securityAgentModelRouting(runtime()),
    entitlements,
    scopes: scopes.results.map((scope: SecurityScopeRow) => ({
      id: scope.id,
      domain: scope.domain,
      status: scope.status,
      verifiedAt: scope.verified_at,
      authorizationExpiresAt: scope.authorization_expires_at,
      authorizationCurrent: Boolean(scope.authorization_expires_at && Date.parse(scope.authorization_expires_at) > Date.now()),
      monitoringEnabled: Boolean(scope.monitoring_enabled),
      nextScanAt: scope.next_scan_at,
      lastScanAt: scope.last_scan_at,
      verification: scope.status === "pending" ? scopeVerificationInstructions(scope) : null,
    })),
    jobs: jobs.results.map((job: JobRow) => ({
      id: job.id,
      scopeId: job.scope_id,
      trigger: job.trigger_kind,
      status: job.status,
      scan: parseJson(job.evidence_json),
      assessment: parseJson(job.assessment_json),
      provider: job.provider,
      model: job.model,
      primaryModel: job.primary_model,
      reviewModel: job.review_model,
      reviewReason: job.review_reason,
      providerUsage: parseJson(job.provider_usage_json),
      errorCode: job.error_code,
      startedAt: job.started_at,
      completedAt: job.completed_at,
    })),
  }, { headers: { "Cache-Control": "no-store" } });
}

async function postAgent(request: Request) {
  const current = await context();
  if (current instanceof Response) return current;
  if (!canManageWorkspace(current.workspace.role)) return Response.json({ error: "Somente proprietário ou administrador pode alterar o escopo de segurança." }, { status: 403 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const action = body.action;
  const agentEnv = runtime();
  if (action === "create_scope") {
    const entitlements = await getWorkspaceEntitlements(current.workspace);
    if (!entitlements.canCreateScope) return scopeLimitResponse(entitlements);
    if (body.authorizationConfirmed !== true) return Response.json({ error: "Confirme que você administra o domínio ou possui autorização expressa para avaliá-lo." }, { status: 400 });
    if (typeof body.domain !== "string") return Response.json({ error: "Informe o domínio autorizado." }, { status: 400 });
    try {
      const scope = await createSecurityScope(agentEnv, current.workspace.id, current.user.id, body.domain);
      return Response.json({ scope: { id: scope.id, domain: scope.domain, status: scope.status, monitoringEnabled: Boolean(scope.monitoring_enabled), verification: scopeVerificationInstructions(scope) } }, { status: 201 });
    } catch (error) {
      return Response.json({ error: error instanceof Error ? error.message : "Domínio inválido." }, { status: 400 });
    }
  }
  const scope = await scopeForWorkspace(agentEnv.DB, current.workspace.id, body.scopeId);
  if (!scope) return Response.json({ error: "Escopo não encontrado." }, { status: 404 });
  if (action === "renew_authorization") {
    if (body.authorizationConfirmed !== true) return Response.json({ error: "Confirme novamente que você administra o domínio ou possui autorização expressa para avaliá-lo." }, { status: 400 });
    const renewed = await createSecurityScope(agentEnv, current.workspace.id, current.user.id, scope.domain);
    return Response.json({ authorizationExpiresAt: renewed.authorization_expires_at });
  }
  if (action === "verify_scope") {
    const result = await verifySecurityScope(agentEnv, scope, current.user.id);
    return Response.json(result, { status: result.verified ? 200 : 409 });
  }
  if (action === "run_scan") {
    if (scope.status !== "verified") return Response.json({ error: "Verifique a titularidade do domínio antes de executar o agente." }, { status: 409 });
    try {
      const job = await enqueueSecurityAgentJob(agentEnv, scope, current.user.id, "manual");
      return Response.json({ job }, { status: job.status === "queued" ? 202 : 200 });
    } catch (error) {
      if (error instanceof Error && error.message === "SCOPE_VERIFICATION_LOST") return Response.json({ error: "A verificação DNS não está mais publicada. O monitoramento foi pausado até uma nova confirmação." }, { status: 409 });
      if (error instanceof Error && error.message === "SCOPE_AUTHORIZATION_EXPIRED") return Response.json({ error: "A declaração de autorização expirou. Confirme novamente o escopo antes de executar outra análise." }, { status: 409 });
      if (error instanceof Error && error.message === "JOB_ALREADY_RUNNING") return Response.json({ error: "Já existe uma análise em andamento para este domínio." }, { status: 409 });
      if (error instanceof Error && error.message === "DAILY_SCAN_LIMIT") return Response.json({ error: "O limite diário de segurança do workspace foi atingido. Tente novamente amanhã." }, { status: 429 });
      throw error;
    }
  }
  if (action === "set_monitoring") {
    const entitlements = await getWorkspaceEntitlements(current.workspace);
    if (body.enabled === true && !entitlements.scheduledMonitoringEnabled) return Response.json({ error: "O monitoramento agendado não está liberado neste workspace.", code: "SCHEDULED_MONITORING_REQUIRED" }, { status: 403 });
    if (scope.status !== "verified") return Response.json({ error: "Verifique a titularidade do domínio antes de ativar o monitoramento." }, { status: 409 });
    const enabled = body.enabled === true;
    if (enabled && (!scope.authorization_expires_at || Date.parse(scope.authorization_expires_at) <= Date.now())) return Response.json({ error: "Renove a declaração de autorização antes de ativar o monitoramento." }, { status: 409 });
    await agentEnv.DB.prepare("UPDATE security_agent_scopes SET monitoring_enabled = ?, next_scan_at = CASE WHEN ? = 1 THEN COALESCE(next_scan_at, datetime('now')) ELSE next_scan_at END, updated_at = datetime('now') WHERE id = ?")
      .bind(enabled ? 1 : 0, enabled ? 1 : 0, scope.id).run();
    await agentEnv.DB.prepare("INSERT INTO security_agent_events (id, workspace_id, scope_id, actor_user_id, event_type, details_json) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(`sae_${crypto.randomUUID()}`, current.workspace.id, scope.id, current.user.id, enabled ? "monitoring.enabled" : "monitoring.disabled", JSON.stringify({ cadence: "daily", scanMode: "passive" })).run();
    return Response.json({ monitoringEnabled: enabled, cadence: "daily" });
  }
  if (action === "revoke_scope") {
    await agentEnv.DB.prepare("UPDATE security_agent_scopes SET status = 'revoked', monitoring_enabled = 0, updated_at = datetime('now') WHERE id = ?").bind(scope.id).run();
    await agentEnv.DB.prepare("INSERT INTO security_agent_events (id, workspace_id, scope_id, actor_user_id, event_type, details_json) VALUES (?, ?, ?, ?, 'scope.revoked', '{}')")
      .bind(`sae_${crypto.randomUUID()}`, current.workspace.id, scope.id, current.user.id).run();
    return Response.json({ revoked: true });
  }
  return Response.json({ error: "Ação inválida." }, { status: 400 });
}

export const GET = withApiTelemetry("GET /api/security-agent", getAgent);
export const POST = withApiTelemetry("POST /api/security-agent", postAgent);

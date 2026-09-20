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
import { operationalPlaybooks, parseTelemetry, type SecurityEvidence } from "../../../domain/security-operations";
import { updateSecurityFinding } from "../../security-findings-service";
import { securityKnowledgeForCode, SECURITY_KNOWLEDGE_VERSION } from "../../../domain/security-knowledge";
import { approveSecurityCampaign, cancelSecurityCampaign, createRemediationProposal, createSecurityCampaign, decideRemediationProposal, dispatchSecurityCampaign, reconcileSecurityRunnerCampaigns, startGuidedSecurityCampaign, type SecurityDeliveryEnv } from "../../security-campaign-service";
import { SECURITY_CAMPAIGN_POLICY_VERSION, securityTechniqueCatalog } from "../../../domain/security-campaign-policy";
import { SECURITY_DEFENSE_POLICY_VERSION } from "../../../domain/security-defense-policy";
import { applyCloudflareChangeProposal, approveCloudflareChangeProposal, auditCloudflareDefensePosture, checkCloudflareDefenseConnector, configureCloudflareRateLimitProposal, connectCloudflareDefenseConnector, connectCloudflareWriteCredential, createDefenseConnector, disconnectCloudflareDefenseConnector, disconnectCloudflareWriteCredential, revokeDefenseAction, rollbackCloudflareChangeProposal, setDefenseConnectorStatus, syncCloudflareDefenseConnector, updateDefenseIncident, type SecurityDefenseEnv } from "../../security-defense-service";

type JobRow = {
  id: string;
  scope_id: string;
  trigger_kind: string;
  scan_mode: string;
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
  finding_sync_status: string;
  finding_sync_error: string | null;
  started_at: string;
  completed_at: string | null;
};

type FindingRow = { id: string; scope_id: string; source_job_id: string; evidence_code: string; title: string; severity: string; status: string; assigned_user_id: number | null; due_at: string | null; resolution_summary: string; occurrence_count: number; first_observed_at: string; last_observed_at: string; closed_at: string | null; updated_at: string };
type MemberRow = { user_id: number; role: string; username: string | null; name: string };
type CampaignRow = { id: string; scope_id: string; name: string; environment: string; techniques_json: string; policy_version: string; window_start: string; window_end: string; max_requests_per_minute: number; max_total_requests: number; stop_conditions_json: string; status: string; readiness_json: string; auto_dispatch: number; guided: number; agent_job_id: string | null; executor: string | null; runner_job_id: string | null; runner_result_json: string; runner_error_code: string | null; runner_completed_at: string | null; specialist_status: string; specialist_result_json: string; specialist_error_code: string | null; approved_at: string | null; cancelled_at: string | null; created_at: string; updated_at: string };
type CampaignEventRow = { id: string; campaign_id: string; event_type: string; details_json: string; created_at: string };
type RemediationRow = { id: string; scope_id: string; finding_id: string; provider: string; repository_full_name: string; base_branch: string; strategy: string; status: string; approved_at: string | null; external_pr_url: string | null; created_at: string; updated_at: string };
type DefenseConnectorRow = { id: string; scope_id: string; provider: string; mode: string; enforcement: string; status: string; external_zone_id: string | null; capabilities_json: string; last_health_at: string | null; last_error_code: string | null; last_signal_at: string | null; sync_cursor_at: string | null; last_sync_at: string | null; next_sync_at: string | null; events_ingested_total: number; write_credential_ciphertext: string | null; write_capabilities_json: string; write_last_health_at: string | null; write_last_error_code: string | null; created_at: string; updated_at: string };
type DefenseIncidentRow = { id: string; scope_id: string; category: string; severity: string; status: string; title: string; summary: string; occurrence_count: number; auto_contained: number; first_observed_at: string; last_observed_at: string; updated_at: string };
type DefenseActionRow = { id: string; scope_id: string; incident_id: string; action_type: string; autonomy: string; status: string; reason: string; enforcement: string; expires_at: string | null; created_at: string; updated_at: string };
type DefensePostureRow = { id: string; scope_id: string; connector_id: string; score: number; grade: string; checks_json: string; config_summary_json: string; config_fingerprint: string; observed_at: string };
type DefenseProposalRow = { id: string; scope_id: string; connector_id: string; category: string; status: string; risk: string; title: string; rationale: string; preview_json: string; rollback_json: string; base_fingerprint: string | null; approval_expires_at: string | null; external_ruleset_id: string | null; external_rule_id: string | null; apply_error_code: string | null; created_at: string; updated_at: string };

function runtime() {
  return env as unknown as SecurityAgentEnv;
}

function parseJson(value: string) {
  try { return JSON.parse(value) as unknown; }
  catch { return null; }
}

function publicCampaignEventDetails(value: string) {
  const raw = parseJson(value);
  if (!raw || typeof raw !== "object") return null;
  const details = raw as { stage?: unknown; counts?: unknown; method?: unknown; action?: unknown; status?: unknown; errorCategory?: unknown };
  const stage = typeof details.stage === "string" && /^[a-z_]{2,40}$/.test(details.stage) ? details.stage : undefined;
  const counts: Record<string, number> = {};
  if (details.counts && typeof details.counts === "object") {
    for (const key of ["pagesVisited", "htmlPages", "requestsCompleted", "signals", "httpsReachable"]) {
      const value = (details.counts as Record<string, unknown>)[key];
      if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= 2000) counts[key] = value;
    }
  }
  const method = ["GET", "HEAD", "OPTIONS"].includes(String(details.method)) ? String(details.method) : undefined;
  const action = ["Raiz autorizada", "robots.txt", "Página pública autorizada"].includes(String(details.action)) ? String(details.action) : undefined;
  const status = typeof details.status === "number" && Number.isInteger(details.status) && details.status >= 100 && details.status <= 599 ? details.status : undefined;
  const errorCategory = ["timeout", "network_or_tls", "response_read"].includes(String(details.errorCategory)) ? String(details.errorCategory) : undefined;
  return { stage, counts, method, action, status, errorCategory };
}

async function context(): Promise<Response | { user: AppUser; workspace: WorkspaceContext }> {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para acessar o agente de segurança." }, { status: 401 });
  const workspace = await getWorkspaceContext(user.id);
  if (!workspace) return Response.json({ error: "Workspace indisponível." }, { status: 403 });
  const entitlements = await getWorkspaceEntitlements(workspace);
  if (!entitlements.workspaceAccessAllowed) {
    return Response.json({
      error: "O Security Workspace está em abertura controlada. Sua conta está reservada, mas as operações ainda não foram liberadas.",
      code: "CYBER_LAUNCH_GATE",
    }, { status: 423, headers: { "Cache-Control": "no-store" } });
  }
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
  await reconcileSecurityRunnerCampaigns(runtime() as SecurityDeliveryEnv, current.workspace.id).catch((error) => {
    console.error(JSON.stringify({ event: "security_runner.reconciliation_failed", workspaceId: current.workspace.id, error: error instanceof Error ? error.name : "UnknownError" }));
  });
  const [scopes, jobs, entitlements, findings, members, campaigns, campaignEvents, remediations, defenseConnectors, defenseIncidents, defenseActions, defensePostures, defenseProposals] = await Promise.all([
    db.prepare("SELECT * FROM security_agent_scopes WHERE workspace_id = ? AND status <> 'revoked' ORDER BY created_at DESC").bind(current.workspace.id).all<SecurityScopeRow>(),
    db.prepare(`SELECT id, scope_id, trigger_kind, scan_mode, status, evidence_json, assessment_json, provider, model, primary_model, review_model, review_reason, provider_usage_json, error_code, finding_sync_status, finding_sync_error, started_at, completed_at FROM security_agent_jobs WHERE workspace_id = ? ORDER BY started_at DESC LIMIT 20`).bind(current.workspace.id).all<JobRow>(),
    getWorkspaceEntitlements(current.workspace),
    db.prepare("SELECT id, scope_id, source_job_id, evidence_code, title, severity, status, assigned_user_id, due_at, resolution_summary, occurrence_count, first_observed_at, last_observed_at, closed_at, updated_at FROM security_findings WHERE workspace_id = ? ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, updated_at DESC LIMIT 100").bind(current.workspace.id).all<FindingRow>(),
    db.prepare("SELECT wm.user_id, wm.role, u.username, u.name FROM workspace_members wm JOIN users u ON u.id = wm.user_id WHERE wm.workspace_id = ? AND wm.status = 'active' ORDER BY u.name, wm.user_id").bind(current.workspace.id).all<MemberRow>(),
    db.prepare("SELECT id, scope_id, name, environment, techniques_json, policy_version, window_start, window_end, max_requests_per_minute, max_total_requests, stop_conditions_json, status, readiness_json, auto_dispatch, guided, agent_job_id, executor, runner_job_id, runner_result_json, runner_error_code, runner_completed_at, specialist_status, specialist_result_json, specialist_error_code, approved_at, cancelled_at, created_at, updated_at FROM security_campaigns WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 30").bind(current.workspace.id).all<CampaignRow>(),
    db.prepare(`SELECT id, campaign_id, event_type, details_json, created_at FROM (
      SELECT e.id, e.campaign_id, e.event_type, e.details_json, e.created_at FROM security_campaign_events e WHERE e.workspace_id = ?
      UNION ALL
      SELECT e.id, e.campaign_id, e.event_type, e.details_json, e.created_at FROM security_runner_events e JOIN security_runner_jobs j ON j.id = e.runner_job_id WHERE j.workspace_id = ?
    ) ORDER BY created_at DESC, id DESC LIMIT 300`).bind(current.workspace.id, current.workspace.id).all<CampaignEventRow>(),
    db.prepare("SELECT id, scope_id, finding_id, provider, repository_full_name, base_branch, strategy, status, approved_at, external_pr_url, created_at, updated_at FROM security_remediation_proposals WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 50").bind(current.workspace.id).all<RemediationRow>(),
    db.prepare("SELECT id, scope_id, provider, mode, enforcement, status, external_zone_id, capabilities_json, last_health_at, last_error_code, last_signal_at, sync_cursor_at, last_sync_at, next_sync_at, events_ingested_total, write_credential_ciphertext, write_capabilities_json, write_last_health_at, write_last_error_code, created_at, updated_at FROM security_defense_connectors WHERE workspace_id = ? AND status <> 'revoked' ORDER BY created_at DESC").bind(current.workspace.id).all<DefenseConnectorRow>(),
    db.prepare("SELECT id, scope_id, category, severity, status, title, summary, occurrence_count, auto_contained, first_observed_at, last_observed_at, updated_at FROM security_defense_incidents WHERE workspace_id = ? ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, last_observed_at DESC LIMIT 100").bind(current.workspace.id).all<DefenseIncidentRow>(),
    db.prepare("SELECT id, scope_id, incident_id, action_type, autonomy, status, reason, enforcement, expires_at, created_at, updated_at FROM security_response_actions WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 100").bind(current.workspace.id).all<DefenseActionRow>(),
    db.prepare("SELECT id, scope_id, connector_id, score, grade, checks_json, config_summary_json, config_fingerprint, observed_at FROM security_defense_posture_snapshots WHERE workspace_id = ? ORDER BY observed_at DESC, id DESC LIMIT 50").bind(current.workspace.id).all<DefensePostureRow>(),
    db.prepare("SELECT id, scope_id, connector_id, category, status, risk, title, rationale, preview_json, rollback_json, base_fingerprint, approval_expires_at, external_ruleset_id, external_rule_id, apply_error_code, created_at, updated_at FROM security_defense_change_proposals WHERE workspace_id = ? ORDER BY CASE risk WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, updated_at DESC LIMIT 100").bind(current.workspace.id).all<DefenseProposalRow>(),
  ]);
  const deliveryEnv = runtime() as SecurityDeliveryEnv;
  return Response.json({
    canManage: canManageWorkspace(current.workspace.role),
    aiConfigured: Boolean(runtime().OPENAI_API_KEY?.trim()),
    modelRouting: securityAgentModelRouting(runtime()),
    knowledgeVersion: SECURITY_KNOWLEDGE_VERSION,
    campaignPolicyVersion: SECURITY_CAMPAIGN_POLICY_VERSION,
    defensePolicyVersion: SECURITY_DEFENSE_POLICY_VERSION,
    techniqueCatalog: securityTechniqueCatalog,
    integrations: { isolatedRunner: Boolean(deliveryEnv.SECURITY_ACTIVE_RUNNER && (deliveryEnv.SECURITY_RUNNER_SIGNING_KEY?.trim().length ?? 0) >= 32), repositoryConnector: Boolean(deliveryEnv.GITHUB_APP_ID?.trim()), cloudflareCredentialVault: Boolean((runtime() as SecurityAgentEnv & SecurityDefenseEnv).SECURITY_CONNECTOR_ENCRYPTION_KEY?.trim()) },
    entitlements,
    members: members.results.map((member) => ({ id: member.user_id, role: member.role, label: member.username || member.name || `Usuário ${member.user_id}` })),
    findings: findings.results.map((finding) => ({ id: finding.id, scopeId: finding.scope_id, sourceJobId: finding.source_job_id, evidenceCode: finding.evidence_code, title: finding.title, severity: finding.severity, status: finding.status, assignedUserId: finding.assigned_user_id, dueAt: finding.due_at, resolutionSummary: finding.resolution_summary, occurrenceCount: finding.occurrence_count, firstObservedAt: finding.first_observed_at, lastObservedAt: finding.last_observed_at, closedAt: finding.closed_at, updatedAt: finding.updated_at, knowledge: securityKnowledgeForCode(finding.evidence_code) })),
    campaigns: campaigns.results.map((campaign) => ({ id: campaign.id, scopeId: campaign.scope_id, name: campaign.name, environment: campaign.environment, techniques: parseJson(campaign.techniques_json), policyVersion: campaign.policy_version, windowStart: campaign.window_start, windowEnd: campaign.window_end, maxRequestsPerMinute: campaign.max_requests_per_minute, maxTotalRequests: campaign.max_total_requests, stopConditions: parseJson(campaign.stop_conditions_json), status: campaign.status, readiness: parseJson(campaign.readiness_json), autoDispatch: Boolean(campaign.auto_dispatch), guided: Boolean(campaign.guided), agentJobId: campaign.agent_job_id, executor: campaign.executor, runnerJobId: campaign.runner_job_id, runnerResult: parseJson(campaign.runner_result_json), runnerErrorCode: campaign.runner_error_code, runnerCompletedAt: campaign.runner_completed_at, specialistStatus: campaign.specialist_status, specialistResult: parseJson(campaign.specialist_result_json), specialistErrorCode: campaign.specialist_error_code, approvedAt: campaign.approved_at, cancelledAt: campaign.cancelled_at, createdAt: campaign.created_at, updatedAt: campaign.updated_at })),
    campaignEvents: campaignEvents.results.map((event) => ({ id: event.id, campaignId: event.campaign_id, eventType: event.event_type, details: publicCampaignEventDetails(event.details_json), createdAt: event.created_at })),
    remediations: remediations.results.map((proposal) => ({ id: proposal.id, scopeId: proposal.scope_id, findingId: proposal.finding_id, provider: proposal.provider, repository: proposal.repository_full_name, baseBranch: proposal.base_branch, strategy: proposal.strategy, status: proposal.status, approvedAt: proposal.approved_at, externalPrUrl: proposal.external_pr_url, createdAt: proposal.created_at, updatedAt: proposal.updated_at })),
    defenseConnectors: defenseConnectors.results.map((connector) => ({ id: connector.id, scopeId: connector.scope_id, provider: connector.provider, mode: connector.mode, enforcement: connector.enforcement, status: connector.status, zoneId: connector.external_zone_id, capabilities: parseJson(connector.capabilities_json), lastHealthAt: connector.last_health_at, lastErrorCode: connector.last_error_code, lastSignalAt: connector.last_signal_at, syncCursorAt: connector.sync_cursor_at, lastSyncAt: connector.last_sync_at, nextSyncAt: connector.next_sync_at, eventsIngestedTotal: connector.events_ingested_total, writeCredentialConfigured: Boolean(connector.write_credential_ciphertext), writeCapabilities: parseJson(connector.write_capabilities_json), writeLastHealthAt: connector.write_last_health_at, writeLastErrorCode: connector.write_last_error_code, createdAt: connector.created_at, updatedAt: connector.updated_at })),
    defenseIncidents: defenseIncidents.results.map((incident) => ({ id: incident.id, scopeId: incident.scope_id, category: incident.category, severity: incident.severity, status: incident.status, title: incident.title, summary: incident.summary, occurrenceCount: incident.occurrence_count, autoContained: Boolean(incident.auto_contained), firstObservedAt: incident.first_observed_at, lastObservedAt: incident.last_observed_at, updatedAt: incident.updated_at })),
    defenseActions: defenseActions.results.map((action) => ({ id: action.id, scopeId: action.scope_id, incidentId: action.incident_id, actionType: action.action_type, autonomy: action.autonomy, status: action.status, reason: action.reason, enforcement: action.enforcement, expiresAt: action.expires_at, createdAt: action.created_at, updatedAt: action.updated_at })),
    defensePostures: defensePostures.results.map((posture) => ({ id: posture.id, scopeId: posture.scope_id, connectorId: posture.connector_id, score: posture.score, grade: posture.grade, checks: parseJson(posture.checks_json), configSummary: parseJson(posture.config_summary_json), fingerprint: posture.config_fingerprint, observedAt: posture.observed_at })),
    defenseProposals: defenseProposals.results.map((proposal) => ({ id: proposal.id, scopeId: proposal.scope_id, connectorId: proposal.connector_id, category: proposal.category, status: proposal.status, risk: proposal.risk, title: proposal.title, rationale: proposal.rationale, preview: parseJson(proposal.preview_json), rollback: parseJson(proposal.rollback_json), baseFingerprint: proposal.base_fingerprint, approvalExpiresAt: proposal.approval_expires_at, externalRulesetId: proposal.external_ruleset_id, externalRuleId: proposal.external_rule_id, applyErrorCode: proposal.apply_error_code, createdAt: proposal.created_at, updatedAt: proposal.updated_at })),
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
      mode: job.scan_mode,
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
      findingSyncStatus: job.finding_sync_status,
      findingSyncError: job.finding_sync_error,
      startedAt: job.started_at,
      completedAt: job.completed_at,
      playbooks: job.status === "completed" && Array.isArray((parseJson(job.evidence_json) as SecurityEvidence | null)?.checks) ? operationalPlaybooks(parseJson(job.evidence_json) as SecurityEvidence) : [],
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
  if (action === "create_defense_connector" || action === "set_defense_connector" || action === "update_defense_incident" || action === "revoke_defense_action" || action === "connect_cloudflare" || action === "check_cloudflare" || action === "sync_cloudflare" || action === "audit_cloudflare" || action === "disconnect_cloudflare" || action === "connect_cloudflare_write" || action === "disconnect_cloudflare_write" || action === "configure_cloudflare_proposal" || action === "approve_cloudflare_proposal" || action === "apply_cloudflare_proposal" || action === "rollback_cloudflare_proposal") {
    try {
      const defenseEnv = agentEnv as SecurityAgentEnv & SecurityDefenseEnv;
      if (action === "create_defense_connector") return Response.json({ connector: await createDefenseConnector(defenseEnv, { scope, actorUserId: current.user.id }) }, { status: 201 });
      if (action === "connect_cloudflare") return Response.json({ connector: await connectCloudflareDefenseConnector(defenseEnv, { scope, actorUserId: current.user.id, apiToken: body.apiToken }) }, { status: 201 });
      if (action === "check_cloudflare") return Response.json({ connector: await checkCloudflareDefenseConnector(defenseEnv, { workspaceId: current.workspace.id, scope, connectorId: body.connectorId, actorUserId: current.user.id }) });
      if (action === "sync_cloudflare") return Response.json({ sync: await syncCloudflareDefenseConnector(defenseEnv, { workspaceId: current.workspace.id, scopeId: scope.id, connectorId: String(body.connectorId ?? ""), actorUserId: current.user.id }) });
      if (action === "audit_cloudflare") return Response.json({ posture: await auditCloudflareDefensePosture(defenseEnv, { workspaceId: current.workspace.id, scopeId: scope.id, connectorId: String(body.connectorId ?? ""), actorUserId: current.user.id }) });
      if (action === "connect_cloudflare_write") return Response.json({ connector: await connectCloudflareWriteCredential(defenseEnv, { workspaceId: current.workspace.id, scope, connectorId: body.connectorId, actorUserId: current.user.id, apiToken: body.apiToken }) });
      if (action === "disconnect_cloudflare_write") return Response.json({ connector: await disconnectCloudflareWriteCredential(defenseEnv, { workspaceId: current.workspace.id, scopeId: scope.id, connectorId: body.connectorId, actorUserId: current.user.id }) });
      if (action === "configure_cloudflare_proposal") return Response.json({ proposal: await configureCloudflareRateLimitProposal(defenseEnv, { workspaceId: current.workspace.id, scopeId: scope.id, connectorId: body.connectorId, proposalId: body.proposalId, actorUserId: current.user.id, route: body.route, requestsPerMinute: body.requestsPerMinute }) });
      if (action === "approve_cloudflare_proposal") return Response.json({ proposal: await approveCloudflareChangeProposal(defenseEnv, { workspaceId: current.workspace.id, scopeId: scope.id, connectorId: body.connectorId, proposalId: body.proposalId, actorUserId: current.user.id, approvalConfirmed: body.approvalConfirmed }) });
      if (action === "apply_cloudflare_proposal") return Response.json({ proposal: await applyCloudflareChangeProposal(defenseEnv, { workspaceId: current.workspace.id, scopeId: scope.id, connectorId: body.connectorId, proposalId: body.proposalId, actorUserId: current.user.id, executionConfirmed: body.executionConfirmed }) });
      if (action === "rollback_cloudflare_proposal") return Response.json({ proposal: await rollbackCloudflareChangeProposal(defenseEnv, { workspaceId: current.workspace.id, scopeId: scope.id, connectorId: body.connectorId, proposalId: body.proposalId, actorUserId: current.user.id, rollbackConfirmed: body.rollbackConfirmed }) });
      if (action === "disconnect_cloudflare") return Response.json({ connector: await disconnectCloudflareDefenseConnector(defenseEnv, { workspaceId: current.workspace.id, scopeId: scope.id, connectorId: body.connectorId, actorUserId: current.user.id }) });
      if (action === "set_defense_connector") return Response.json({ connector: await setDefenseConnectorStatus(defenseEnv, { workspaceId: current.workspace.id, scopeId: scope.id, connectorId: body.connectorId, actorUserId: current.user.id, enabled: body.enabled }) });
      if (action === "update_defense_incident") return Response.json({ incident: await updateDefenseIncident(defenseEnv, { workspaceId: current.workspace.id, scopeId: scope.id, incidentId: body.incidentId, actorUserId: current.user.id, status: body.status }) });
      return Response.json({ responseAction: await revokeDefenseAction(defenseEnv, { workspaceId: current.workspace.id, scopeId: scope.id, actionId: body.actionId, actorUserId: current.user.id }) });
    } catch (error) {
      const code = error instanceof Error ? error.message : "DEFENSE_ACTION_FAILED";
      const status = code.endsWith("NOT_FOUND") ? 404 : code.endsWith("NOT_CONFIGURED") || code === "CLOUDFLARE_UNAVAILABLE" ? 503 : ["CLOUDFLARE_TOKEN_REJECTED", "CLOUDFLARE_WRITE_TOKEN_REJECTED"].includes(code) ? 401 : code === "CLOUDFLARE_WRITE_RATE_LIMITED" ? 429 : 400;
      const messages: Record<string, string> = {
        DEFENSE_SIGNING_KEY_NOT_CONFIGURED: "Configure o segredo de assinatura da telemetria no Worker antes de ativar o conector.",
        DEFENSE_CONNECTOR_ENCRYPTION_KEY_NOT_CONFIGURED: "O cofre de credenciais dos conectores ainda não foi configurado no Worker.",
        CLOUDFLARE_TOKEN_INVALID: "Informe um API Token Cloudflare válido, sem espaços.",
        CLOUDFLARE_TOKEN_REJECTED: "A Cloudflare recusou o token. Confirme se ele está ativo e limitado à zona autorizada.",
        CLOUDFLARE_ZONE_NOT_FOUND: "O token não permite acessar uma zona ativa com o mesmo domínio deste escopo.",
        CLOUDFLARE_ZONE_MISMATCH: "A zona devolvida pela Cloudflare não corresponde ao domínio autorizado.",
        CLOUDFLARE_ANALYTICS_PERMISSION_REQUIRED: "Adicione Account Analytics: Read ao token da zona para coletar os eventos de segurança.",
        CLOUDFLARE_RULESETS_PERMISSION_REQUIRED: "Adicione Zone WAF: Read ao token restrito para auditar a postura do WAF.",
        CLOUDFLARE_SYNC_RUNNING: "A coleta desta zona já está em andamento. Aguarde a conclusão.",
        CLOUDFLARE_UNAVAILABLE: "A Cloudflare não respondeu ao teste de conexão. Tente novamente.",
        CLOUDFLARE_WRITE_CREDENTIAL_MISSING: "Conecte primeiro uma credencial separada com Zone WAF: Write.",
        CLOUDFLARE_WRITE_TOKEN_REJECTED: "A Cloudflare recusou o token separado de escrita.",
        CLOUDFLARE_WRITE_PERMISSION_REQUIRED: "O token de escrita não possui Zone WAF: Write para esta zona.",
        CLOUDFLARE_WRITE_RATE_LIMITED: "A Cloudflare limitou temporariamente alterações neste ruleset. Aguarde e tente novamente.",
        CLOUDFLARE_MUTATION_FAILED: "A Cloudflare recusou a mudança controlada; nenhuma repetição automática foi feita.",
        CLOUDFLARE_CHANGE_VERIFICATION_FAILED: "A regra não pôde ser confirmada após a aplicação. Use o rollback disponível.",
        CLOUDFLARE_ROLLBACK_UNAVAILABLE: "Não existe uma regra criada por esta proposta disponível para rollback.",
        CLOUDFLARE_ROUTE_INVALID: "Informe uma rota exata, sem curingas ou query string.",
        CLOUDFLARE_RATE_LIMIT_INVALID: "Use um limite entre 20 e 10.000 requisições por minuto.",
        CLOUDFLARE_POSTURE_REQUIRED: "Execute uma auditoria de postura antes de configurar a proteção.",
        CLOUDFLARE_APPROVAL_REQUIRED: "Confirme explicitamente a prévia antes de aprovar.",
        CLOUDFLARE_APPROVAL_EXPIRED: "A aprovação expirou. Revise a configuração e aprove novamente.",
        CLOUDFLARE_CONFIGURATION_DRIFT: "A configuração da Cloudflare mudou desde a prévia. Revise o novo snapshot antes de aprovar novamente.",
        CLOUDFLARE_EXECUTION_CONFIRMATION_REQUIRED: "Confirme a aplicação externa desta regra.",
        CLOUDFLARE_ROLLBACK_CONFIRMATION_REQUIRED: "Confirme a remoção da regra criada pelo CBSHub.",
      };
      return Response.json({ error: messages[code] ?? "Não foi possível alterar o monitor defensivo.", code }, { status });
    }
  }
  if (action === "create_campaign" || action === "approve_campaign" || action === "dispatch_campaign" || action === "cancel_campaign" || action === "start_guided_campaign") {
    try {
      const deliveryEnv = agentEnv as SecurityDeliveryEnv;
      if (action === "create_campaign") return Response.json({ campaign: await createSecurityCampaign(deliveryEnv, scope, current.user.id, body.campaign) }, { status: 201 });
      if (action === "start_guided_campaign") return Response.json({ campaign: await startGuidedSecurityCampaign(deliveryEnv, scope, current.user.id, body.executionConfirmed) }, { status: 202 });
      if (action === "approve_campaign") return Response.json({ campaign: await approveSecurityCampaign(deliveryEnv, { workspaceId: current.workspace.id, scope, campaignId: body.campaignId, actorUserId: current.user.id, approvalConfirmed: body.approvalConfirmed }) });
      if (action === "dispatch_campaign") return Response.json({ campaign: await dispatchSecurityCampaign(agentEnv as SecurityDeliveryEnv & SecurityAgentEnv, { workspaceId: current.workspace.id, scope, campaignId: body.campaignId, actorUserId: current.user.id, executionConfirmed: body.executionConfirmed }) }, { status: 202 });
      return Response.json({ campaign: await cancelSecurityCampaign(deliveryEnv, { workspaceId: current.workspace.id, scopeId: scope.id, campaignId: body.campaignId, actorUserId: current.user.id }) });
    } catch (error) {
      const code = error instanceof Error ? error.message : "CAMPAIGN_FAILED";
      return Response.json({ error: code === "CAMPAIGN_SCOPE_NOT_AUTHORIZED" ? "O domínio precisa permanecer verificado e com autorização vigente." : code === "CAMPAIGN_ACTIVE_LIMIT" ? "Conclua ou cancele uma campanha antes de criar outra." : code === "CAMPAIGN_EXECUTION_CONFIRMATION_REQUIRED" ? "Confirme explicitamente o escopo e a execução limitada." : code === "CAMPAIGN_GUIDED_ALREADY_ACTIVE" ? "Já existe uma validação guiada agendada ou em andamento para este domínio." : code === "CAMPAIGN_EXECUTOR_NOT_CONFIGURED" ? "O runner isolado ainda não está conectado." : code === "CAMPAIGN_WINDOW_NOT_STARTED" ? "A janela aprovada ainda não começou." : code === "CAMPAIGN_WINDOW_EXPIRED" ? "A janela aprovada terminou; crie uma nova campanha." : "Revise janela, técnicas, limites e condições de parada da campanha.", code }, { status: code === "CAMPAIGN_NOT_FOUND" ? 404 : code === "CAMPAIGN_GUIDED_ALREADY_ACTIVE" ? 409 : 400 });
    }
  }
  if (action === "create_remediation" || action === "decide_remediation") {
    try {
      const deliveryEnv = agentEnv as SecurityDeliveryEnv;
      if (action === "create_remediation") return Response.json({ remediation: await createRemediationProposal(deliveryEnv, { workspaceId: current.workspace.id, scopeId: scope.id, actorUserId: current.user.id, target: body.target }) }, { status: 201 });
      return Response.json({ remediation: await decideRemediationProposal(deliveryEnv, { workspaceId: current.workspace.id, scopeId: scope.id, remediationId: body.remediationId, actorUserId: current.user.id, decision: body.decision, approvalConfirmed: body.approvalConfirmed }) });
    } catch (error) {
      const code = error instanceof Error ? error.message : "REMEDIATION_FAILED";
      return Response.json({ error: code === "REMEDIATION_ALREADY_ACTIVE" ? "Já existe uma proposta ativa para este achado." : code === "REMEDIATION_FINDING_INVALID" ? "Escolha um achado aberto deste domínio." : code === "REMEDIATION_REPOSITORY_NOT_AUTHORIZED" ? "Selecione um projeto GitHub conectado, autorizado e com a branch base atual." : "Revise o repositório, branch e aprovação da proposta.", code }, { status: code === "REMEDIATION_NOT_FOUND" ? 404 : 400 });
    }
  }
  if (action === "update_finding") {
    try {
      const finding = await updateSecurityFinding(agentEnv, { workspaceId: current.workspace.id, findingId: String(body.findingId ?? ""), actorUserId: current.user.id, status: body.status, assignedUserId: body.assignedUserId, dueAt: body.dueAt, resolutionSummary: body.resolutionSummary });
      return Response.json({ finding });
    } catch (error) {
      const code = error instanceof Error ? error.message : "FINDING_UPDATE_FAILED";
      const status = code === "FINDING_NOT_FOUND" ? 404 : 400;
      return Response.json({ error: code === "FINDING_RESOLUTION_INVALID" ? "Descreva a validação ou decisão em pelo menos 10 caracteres e sem incluir segredos." : "Não foi possível atualizar o achado.", code }, { status });
    }
  }
  if (action === "renew_authorization") {
    if (body.authorizationConfirmed !== true) return Response.json({ error: "Confirme novamente que você administra o domínio ou possui autorização expressa para avaliá-lo." }, { status: 400 });
    const renewed = await createSecurityScope(agentEnv, current.workspace.id, current.user.id, scope.domain);
    return Response.json({ authorizationExpiresAt: renewed.authorization_expires_at });
  }
  if (action === "verify_scope") {
    const result = await verifySecurityScope(agentEnv, scope, current.user.id);
    return Response.json(result, { status: result.verified ? 200 : 409 });
  }
  if (action === "run_scan" || action === "triage_telemetry") {
    if (scope.status !== "verified") return Response.json({ error: "Verifique a titularidade do domínio antes de executar o agente." }, { status: 409 });
    try {
      if (action === "triage_telemetry" && body.telemetryAuthorized !== true) return Response.json({ error: "Confirme que os dados agregados pertencem ao ativo autorizado." }, { status: 400 });
      const telemetry = action === "triage_telemetry" ? parseTelemetry(body.telemetry) : undefined;
      const job = await enqueueSecurityAgentJob(agentEnv, scope, current.user.id, "manual", telemetry);
      return Response.json({ job }, { status: job.status === "queued" ? 202 : 200 });
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("TELEMETRY_")) return Response.json({ error: "Dados inválidos: use contagens inteiras, uma janela de até 24 horas nos últimos 30 dias e totais consistentes.", code: error.message }, { status: 400 });
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
    await agentEnv.DB.batch([
      agentEnv.DB.prepare("UPDATE security_agent_scopes SET status = 'revoked', monitoring_enabled = 0, updated_at = datetime('now') WHERE id = ?").bind(scope.id),
      agentEnv.DB.prepare("UPDATE security_defense_connectors SET status = 'revoked', credential_ciphertext = NULL, credential_iv = NULL, write_credential_ciphertext = NULL, write_credential_iv = NULL, write_capabilities_json = '{}', external_account_id = NULL, external_zone_id = NULL, capabilities_json = '{}', updated_at = datetime('now') WHERE scope_id = ? AND status <> 'revoked'").bind(scope.id),
      agentEnv.DB.prepare("UPDATE security_response_actions SET status = 'revoked', decided_by_user_id = ?, updated_at = datetime('now') WHERE scope_id = ? AND status = 'active'").bind(current.user.id, scope.id),
      agentEnv.DB.prepare("INSERT INTO security_agent_events (id, workspace_id, scope_id, actor_user_id, event_type, details_json) VALUES (?, ?, ?, ?, 'scope.revoked', '{}')").bind(`sae_${crypto.randomUUID()}`, current.workspace.id, scope.id, current.user.id),
    ]);
    return Response.json({ revoked: true });
  }
  return Response.json({ error: "Ação inválida." }, { status: 400 });
}

export const GET = withApiTelemetry("GET /api/security-agent", getAgent);
export const POST = withApiTelemetry("POST /api/security-agent", postAgent);

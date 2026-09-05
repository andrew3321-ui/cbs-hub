import type { SecurityAgentEnv, SecurityScopeRow } from "./security-agent-service.ts";
import type { SecurityEvidence } from "../domain/security-operations.ts";

export const findingStatuses = ["open", "investigating", "mitigated", "accepted_risk", "false_positive"] as const;
export type FindingStatus = typeof findingStatuses[number];

type FindingRow = { id: string; workspace_id: number; scope_id: string; status: FindingStatus };
const closedStatuses = new Set<FindingStatus>(["mitigated", "accepted_risk", "false_positive"]);
const secretPattern = /(?:\b(?:password|passwd|senha|token|secret|authorization)\s*[:=]|\bBearer\s+[A-Za-z0-9._~+\/-]{12,}|\bsk-[A-Za-z0-9_-]{12,}|\bgh[opsu]_[A-Za-z0-9]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/i;

function findingId() { return `saf_${crypto.randomUUID()}`; }
function eventId() { return `safe_${crypto.randomUUID()}`; }

export async function syncSecurityFindings(env: Pick<SecurityAgentEnv, "DB">, scope: SecurityScopeRow, jobId: string, evidence: SecurityEvidence, observedAt: string) {
  const candidates = evidence.checks.filter((check) => check.status === "risk" || check.status === "warning");
  for (const check of candidates) {
    const existing = await env.DB.prepare("SELECT id, workspace_id, scope_id, status FROM security_findings WHERE scope_id = ? AND evidence_code = ?").bind(scope.id, check.code).first<FindingRow>();
    const id = existing?.id ?? findingId();
    const reopened = existing?.status === "mitigated";
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO security_findings
        (id, workspace_id, scope_id, source_job_id, evidence_code, title, severity, status, occurrence_count, first_observed_at, last_observed_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'open', 1, ?, ?, ?, ?)
        ON CONFLICT(scope_id, evidence_code) DO UPDATE SET
          source_job_id = excluded.source_job_id,
          title = excluded.title,
          severity = excluded.severity,
          status = CASE WHEN security_findings.status = 'mitigated' THEN 'open' ELSE security_findings.status END,
          occurrence_count = security_findings.occurrence_count + 1,
          last_observed_at = excluded.last_observed_at,
          closed_at = CASE WHEN security_findings.status = 'mitigated' THEN NULL ELSE security_findings.closed_at END,
          updated_at = excluded.updated_at`)
        .bind(id, scope.workspace_id, scope.id, jobId, check.code, check.title, check.status === "risk" ? "high" : "medium", observedAt, observedAt, observedAt, observedAt),
      env.DB.prepare("INSERT INTO security_finding_events (id, workspace_id, finding_id, actor_user_id, event_type, from_status, to_status, details_json, created_at) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?)")
        .bind(eventId(), scope.workspace_id, id, existing ? reopened ? "finding.reopened" : "finding.reobserved" : "finding.created", existing?.status ?? null, reopened ? "open" : existing?.status ?? "open", JSON.stringify({ jobId, evidenceCode: check.code, evidenceFingerprint: evidence.fingerprint, procedureVersion: evidence.version }), observedAt),
    ]);
  }
  return { observed: candidates.length };
}

export async function updateSecurityFinding(env: Pick<SecurityAgentEnv, "DB">, args: { workspaceId: number; findingId: string; actorUserId: number; status: unknown; assignedUserId: unknown; dueAt: unknown; resolutionSummary: unknown }) {
  if (typeof args.findingId !== "string" || !/^saf_[0-9a-f-]{36}$/i.test(args.findingId)) throw new Error("FINDING_INVALID");
  if (typeof args.status !== "string" || !findingStatuses.includes(args.status as FindingStatus)) throw new Error("FINDING_STATUS_INVALID");
  const status = args.status as FindingStatus;
  const finding = await env.DB.prepare("SELECT id, workspace_id, scope_id, status FROM security_findings WHERE id = ? AND workspace_id = ?").bind(args.findingId, args.workspaceId).first<FindingRow>();
  if (!finding) throw new Error("FINDING_NOT_FOUND");
  const resolutionSummary = typeof args.resolutionSummary === "string" ? args.resolutionSummary.trim() : "";
  if (resolutionSummary.length > 500 || secretPattern.test(resolutionSummary) || (closedStatuses.has(status) && resolutionSummary.length < 10)) throw new Error("FINDING_RESOLUTION_INVALID");
  let assignedUserId: number | null = null;
  if (args.assignedUserId !== null && args.assignedUserId !== undefined && args.assignedUserId !== "") {
    assignedUserId = Number(args.assignedUserId);
    if (!Number.isSafeInteger(assignedUserId) || assignedUserId <= 0) throw new Error("FINDING_ASSIGNEE_INVALID");
    const member = await env.DB.prepare("SELECT user_id FROM workspace_members WHERE workspace_id = ? AND user_id = ? AND status = 'active'").bind(args.workspaceId, assignedUserId).first<{ user_id: number }>();
    if (!member) throw new Error("FINDING_ASSIGNEE_INVALID");
  }
  let dueAt: string | null = null;
  if (args.dueAt !== null && args.dueAt !== undefined && args.dueAt !== "") {
    if (typeof args.dueAt !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(args.dueAt)) throw new Error("FINDING_DUE_DATE_INVALID");
    const parsed = Date.parse(`${args.dueAt}T23:59:59Z`);
    if (!Number.isFinite(parsed)) throw new Error("FINDING_DUE_DATE_INVALID");
    dueAt = new Date(parsed).toISOString();
  }
  const changedAt = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare("UPDATE security_findings SET status = ?, assigned_user_id = ?, due_at = ?, resolution_summary = ?, closed_at = ?, updated_at = ? WHERE id = ? AND workspace_id = ?")
      .bind(status, assignedUserId, dueAt, resolutionSummary, closedStatuses.has(status) ? changedAt : null, changedAt, finding.id, args.workspaceId),
    env.DB.prepare("INSERT INTO security_finding_events (id, workspace_id, finding_id, actor_user_id, event_type, from_status, to_status, details_json, created_at) VALUES (?, ?, ?, ?, 'finding.status_changed', ?, ?, ?, ?)")
      .bind(eventId(), args.workspaceId, finding.id, args.actorUserId, finding.status, status, JSON.stringify({ assignedUserId, dueAt, hasResolutionSummary: Boolean(resolutionSummary) }), changedAt),
  ]);
  return { id: finding.id, status, assignedUserId, dueAt, resolutionSummary, closedAt: closedStatuses.has(status) ? changedAt : null, updatedAt: changedAt };
}

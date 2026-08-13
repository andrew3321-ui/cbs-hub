import { env } from "cloudflare:workers";
import { getCurrentUser } from "../../auth";
import { withApiTelemetry } from "../../api-infrastructure";
import { publicAppUrl } from "../../public-url";
import { getWorkspaceContext, sha256Hex } from "../../workspace";

type CycleRow = Record<string, unknown> & {
  id: string; company_id: number; period_key: string; report_id: string; stage: string; due_at: string;
  report_status: string; revision: number; snapshot_hash: string | null; conclusion: string; pending_items_json: string;
  required_document_count: number; require_snapshot: number; require_conclusion: number; document_count: number;
};

const periodPattern = /^20\d{2}-(0[1-9]|1[0-2])$/;
const managerRoles = new Set(["owner", "admin"]);
const producerRoles = new Set(["owner", "admin", "preparer"]);

function json<T>(value: unknown, fallback: T): T { try { return typeof value === "string" ? JSON.parse(value) as T : fallback; } catch { return fallback; } }
function validPeriod(value: unknown): value is string { return typeof value === "string" && periodPattern.test(value); }
function clampInt(value: unknown, minimum: number, maximum: number, fallback: number) { const number = Number(value); return Number.isInteger(number) ? Math.min(maximum, Math.max(minimum, number)) : fallback; }
function secureToken() { const bytes = new Uint8Array(32); crypto.getRandomValues(bytes); return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(""); }
function dueAt(period: string, dueDay: number) { const [year, month] = period.split("-").map(Number); return new Date(Date.UTC(year, month, Math.min(28, dueDay), 23, 59, 59)).toISOString(); }
function hoursFrom(now: Date, hours: number, ceiling?: string) { const value = new Date(now.getTime() + hours * 3_600_000); if (ceiling && value.getTime() > new Date(ceiling).getTime()) return ceiling; return value.toISOString(); }

function blockers(row: CycleRow) {
  const result: Array<{ code: string; label: string }> = [];
  if (Number(row.document_count) < Number(row.required_document_count)) result.push({ code: "MISSING_DOCUMENTS", label: `Documentos: ${row.document_count}/${row.required_document_count}` });
  if (Number(row.require_snapshot) && !row.snapshot_hash) result.push({ code: "MISSING_SNAPSHOT", label: "Versão imutável ainda não salva" });
  if (Number(row.require_conclusion) && String(row.conclusion ?? "").trim().length < 10) result.push({ code: "MISSING_CONCLUSION", label: "Conclusão técnica incompleta" });
  const pending = json<Array<{ resolved?: boolean; text?: string }>>(row.pending_items_json, []);
  const open = pending.filter((item) => !item.resolved);
  if (open.length) result.push({ code: "OPEN_PENDING_ITEMS", label: `${open.length} pendência(s) técnica(s) aberta(s)` });
  return result;
}

function effectiveStage(row: CycleRow) {
  if (["delivered", "accepted", "rejected", "changes_requested"].includes(row.stage)) return row.stage;
  if (row.report_status === "approved") return "approved";
  if (row.report_status === "ready_for_review") return "review";
  return "preparation";
}

function cycleView(row: CycleRow, now: number) {
  const stage = effectiveStage(row);
  const deadline = stage === "preparation" ? String(row.preparation_due_at ?? row.due_at) : stage === "review" ? String(row.review_due_at ?? row.due_at) : row.due_at;
  return { ...row, stage, blockers: blockers(row), activeDeadline: deadline, overdue: !["approved", "delivered", "accepted", "rejected", "changes_requested"].includes(stage) && new Date(deadline).getTime() < now };
}

async function cycleById(id: string, workspaceId: number) {
  return env.DB.prepare(`SELECT mc.*, r.status report_status, r.revision, r.snapshot_hash, r.conclusion, r.pending_items_json,
    r.created_by_user_id, r.reviewer_user_id, cfg.required_document_count, cfg.require_snapshot, cfg.require_conclusion,
    cfg.review_sla_hours, cfg.preparer_user_id, cfg.reviewer_user_id config_reviewer_user_id,
    (SELECT COUNT(*) FROM fiscal_documents d WHERE d.workspace_id = mc.workspace_id AND d.company_id = mc.company_id) document_count
    FROM monthly_closing_cycles mc INNER JOIN report_work_items r ON r.id = mc.report_id AND r.workspace_id = mc.workspace_id
    INNER JOIN monthly_closing_configs cfg ON cfg.id = mc.config_id AND cfg.workspace_id = mc.workspace_id
    WHERE mc.id = ? AND mc.workspace_id = ? LIMIT 1`).bind(id, workspaceId).first<CycleRow>();
}

async function listClosing(request: Request) {
  const user = await getCurrentUser(); if (!user) return Response.json({ error: "Faça login para acessar o fechamento mensal." }, { status: 401 });
  const workspace = await getWorkspaceContext(user.id); if (!workspace) return Response.json({ error: "Workspace indisponível." }, { status: 403 });
  try {
    const url = new URL(request.url); const period = url.searchParams.get("period");
    if (!validPeriod(period)) return Response.json({ error: "Competência inválida." }, { status: 400 });
    const rows = await env.DB.prepare(`SELECT mc.*, c.name company_name, r.status report_status, r.revision, r.snapshot_hash, r.conclusion, r.pending_items_json,
      cfg.due_day, cfg.preparation_sla_hours, cfg.review_sla_hours, cfg.preparer_user_id, cfg.reviewer_user_id config_reviewer_user_id,
      cfg.required_document_count, cfg.require_snapshot, cfg.require_conclusion, prep.name preparer_name, rev.name reviewer_name,
      (SELECT COUNT(*) FROM fiscal_documents d WHERE d.workspace_id = mc.workspace_id AND d.company_id = mc.company_id) document_count,
      (SELECT COUNT(*) FROM monthly_closing_reminders mr WHERE mr.cycle_id = mc.id) reminder_count,
      (SELECT id FROM monthly_closing_shares ms WHERE ms.cycle_id = mc.id AND ms.revoked_at IS NULL AND ms.expires_at > strftime('%Y-%m-%dT%H:%M:%fZ','now') ORDER BY ms.created_at DESC LIMIT 1) active_share_id
      FROM monthly_closing_cycles mc INNER JOIN companies c ON c.id = mc.company_id AND c.workspace_id = mc.workspace_id
      INNER JOIN report_work_items r ON r.id = mc.report_id AND r.workspace_id = mc.workspace_id
      INNER JOIN monthly_closing_configs cfg ON cfg.id = mc.config_id AND cfg.workspace_id = mc.workspace_id
      LEFT JOIN users prep ON prep.id = cfg.preparer_user_id LEFT JOIN users rev ON rev.id = cfg.reviewer_user_id
      WHERE mc.workspace_id = ? AND mc.period_key = ? ORDER BY mc.due_at, c.name`).bind(workspace.id, period).all<CycleRow>();
    const now = Date.now();
    const cycles = rows.results.map((row: CycleRow) => cycleView(row, now));
    const members = await env.DB.prepare("SELECT wm.user_id userId, u.name, wm.role FROM workspace_members wm INNER JOIN users u ON u.id = wm.user_id WHERE wm.workspace_id = ? AND wm.status = 'active' ORDER BY u.name").bind(workspace.id).all();
    return Response.json({ cycles, members: members.results, permissions: { canConfigure: managerRoles.has(workspace.role), canPrepare: producerRoles.has(workspace.role), canReview: ["owner", "admin", "reviewer"].includes(workspace.role) } });
  } catch { return Response.json({ error: "Não foi possível carregar a fila mensal." }, { status: 500 }); }
}

async function syncQueue(workspace: NonNullable<Awaited<ReturnType<typeof getWorkspaceContext>>>, userId: number, period: string) {
  const companies = await env.DB.prepare("SELECT id FROM companies WHERE workspace_id = ? ORDER BY id").bind(workspace.id).all<{ id: number }>();
  const now = new Date();
  for (const company of companies.results) {
    const configId = crypto.randomUUID();
    await env.DB.prepare(`INSERT OR IGNORE INTO monthly_closing_configs (id, workspace_id, company_id, created_by_user_id, preparer_user_id, reviewer_user_id)
      VALUES (?, ?, ?, ?, ?, ?)`).bind(configId, workspace.id, company.id, userId, userId, workspace.type === "individual" ? userId : null).run();
    const config = await env.DB.prepare("SELECT * FROM monthly_closing_configs WHERE workspace_id = ? AND company_id = ? LIMIT 1").bind(workspace.id, company.id).first<Record<string, unknown>>();
    if (!config || !Number(config.active)) continue;
    let report = await env.DB.prepare("SELECT id FROM report_work_items WHERE workspace_id = ? AND company_id = ? AND period_key = ? ORDER BY created_at DESC LIMIT 1").bind(workspace.id, company.id, period).first<{ id: string }>();
    if (!report) {
      const reportId = crypto.randomUUID();
      await env.DB.batch([
        env.DB.prepare("INSERT INTO report_work_items (id, workspace_id, company_id, period_key, created_by_user_id, assigned_user_id, reviewer_user_id, due_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(reportId, workspace.id, company.id, period, userId, Number(config.preparer_user_id ?? userId), config.reviewer_user_id ?? null, dueAt(period, Number(config.due_day))),
        env.DB.prepare("INSERT INTO report_work_item_events (report_id, workspace_id, actor_user_id, event_type, note, event_data) VALUES (?, ?, ?, 'report.created_by_closing', 'Relatório criado pela fila mensal.', ?)").bind(reportId, workspace.id, userId, JSON.stringify({ period })),
      ]); report = { id: reportId };
    }
    const cycleId = crypto.randomUUID(); const finalDue = dueAt(period, Number(config.due_day)); const preparationDue = hoursFrom(now, Number(config.preparation_sla_hours), finalDue);
    await env.DB.batch([
      env.DB.prepare(`INSERT OR IGNORE INTO monthly_closing_cycles (id, workspace_id, company_id, period_key, report_id, config_id, due_at, preparation_due_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).bind(cycleId, workspace.id, company.id, period, report.id, String(config.id), finalDue, preparationDue),
      env.DB.prepare(`INSERT INTO monthly_closing_events (id, cycle_id, workspace_id, actor_type, actor_user_id, event_type, event_data_json)
        SELECT ?, id, workspace_id, 'user', ?, 'cycle.created', ? FROM monthly_closing_cycles WHERE workspace_id = ? AND company_id = ? AND period_key = ?
        AND NOT EXISTS (SELECT 1 FROM monthly_closing_events e WHERE e.cycle_id = monthly_closing_cycles.id AND e.event_type = 'cycle.created')`).bind(crypto.randomUUID(), userId, JSON.stringify({ period }), workspace.id, company.id, period),
    ]);
  }
  return companies.results.length;
}

async function mutateClosing(request: Request) {
  const user = await getCurrentUser(); if (!user) return Response.json({ error: "Faça login para operar o fechamento." }, { status: 401 });
  const workspace = await getWorkspaceContext(user.id); if (!workspace) return Response.json({ error: "Workspace indisponível." }, { status: 403 });
  try {
    const body = await request.json() as Record<string, unknown>; const action = String(body.action ?? ""); const now = new Date(); const nowIso = now.toISOString();
    if (action === "sync_queue") {
      if (!producerRoles.has(workspace.role) || !validPeriod(body.period)) return Response.json({ error: "Competência ou permissão inválida." }, { status: 403 });
      return Response.json({ synchronized: await syncQueue(workspace, user.id, body.period) });
    }
    const cycleId = typeof body.cycleId === "string" ? body.cycleId : ""; const cycle = await cycleById(cycleId, workspace.id);
    if (!cycle) return Response.json({ error: "Fechamento não encontrado neste workspace." }, { status: 404 });
    if (action === "configure") {
      if (!managerRoles.has(workspace.role)) return Response.json({ error: "Somente gestores configuram o fechamento." }, { status: 403 });
      const dueDay = clampInt(body.dueDay, 1, 28, 10); const prepHours = clampInt(body.preparationSlaHours, 1, 720, 72); const reviewHours = clampInt(body.reviewSlaHours, 1, 720, 48); const requiredDocs = clampInt(body.requiredDocumentCount, 0, 50, 1);
      const preparer = Number(body.preparerUserId); const reviewer = Number(body.reviewerUserId);
      const eligible = await env.DB.prepare("SELECT user_id id, role FROM workspace_members WHERE workspace_id = ? AND status = 'active' AND user_id IN (?, ?)").bind(workspace.id, preparer, reviewer).all<{ id: number; role: string }>();
      if (!eligible.results.some((member: { id: number; role: string }) => member.id === preparer) || !eligible.results.some((member: { id: number; role: string }) => member.id === reviewer && ["owner", "admin", "reviewer"].includes(member.role))) return Response.json({ error: "Preparador ou revisor não pertence à equipe ativa." }, { status: 409 });
      if (workspace.type === "office" && preparer === reviewer) return Response.json({ error: "No modo escritório, preparador e revisor devem ser pessoas diferentes." }, { status: 409 });
      const finalDue = dueAt(cycle.period_key, dueDay);
      await env.DB.batch([
        env.DB.prepare("UPDATE monthly_closing_configs SET due_day = ?, preparation_sla_hours = ?, review_sla_hours = ?, preparer_user_id = ?, reviewer_user_id = ?, required_document_count = ?, require_snapshot = ?, require_conclusion = ?, updated_at = ? WHERE id = ? AND workspace_id = ?").bind(dueDay, prepHours, reviewHours, preparer, reviewer, requiredDocs, body.requireSnapshot === false ? 0 : 1, body.requireConclusion === false ? 0 : 1, nowIso, String(cycle.config_id), workspace.id),
        env.DB.prepare("UPDATE monthly_closing_cycles SET due_at = ?, preparation_due_at = ?, updated_at = ? WHERE id = ? AND workspace_id = ?").bind(finalDue, hoursFrom(now, prepHours, finalDue), nowIso, cycle.id, workspace.id),
        env.DB.prepare("UPDATE report_work_items SET assigned_user_id = ?, reviewer_user_id = ?, due_at = ?, updated_at = ? WHERE id = ? AND workspace_id = ? AND status != 'approved'").bind(preparer, reviewer, finalDue, nowIso, cycle.report_id, workspace.id),
        env.DB.prepare("INSERT INTO monthly_closing_events (id, cycle_id, workspace_id, actor_type, actor_user_id, event_type, event_data_json, created_at) VALUES (?, ?, ?, 'user', ?, 'cycle.configured', ?, ?)").bind(crypto.randomUUID(), cycle.id, workspace.id, user.id, JSON.stringify({ dueDay, prepHours, reviewHours, preparer, reviewer, requiredDocs }), nowIso),
      ]);
      return Response.json({ configured: true });
    }
    if (action === "remind") {
      if (!producerRoles.has(workspace.role)) return Response.json({ error: "Seu papel não permite criar lembretes." }, { status: 403 });
      const kind = ["preparation_due", "review_due", "client_pending"].includes(String(body.kind)) ? String(body.kind) : "preparation_due";
      const recipient = kind === "review_due" ? Number(cycle.config_reviewer_user_id ?? cycle.reviewer_user_id) : Number(cycle.preparer_user_id ?? cycle.created_by_user_id);
      const key = `${cycle.id}:${kind}:${nowIso.slice(0, 10)}`;
      const result = await env.DB.prepare("INSERT OR IGNORE INTO monthly_closing_reminders (id, cycle_id, workspace_id, reminder_kind, dedupe_key, recipient_user_id, created_by_user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), cycle.id, workspace.id, kind, key, recipient || null, user.id, nowIso).run();
      if (result.meta.changes) await env.DB.prepare("INSERT INTO monthly_closing_events (id, cycle_id, workspace_id, actor_type, actor_user_id, event_type, event_data_json, created_at) VALUES (?, ?, ?, 'user', ?, 'reminder.queued', ?, ?)").bind(crypto.randomUUID(), cycle.id, workspace.id, user.id, JSON.stringify({ kind, recipient }), nowIso).run();
      return Response.json({ queued: Boolean(result.meta.changes), deduplicated: !result.meta.changes });
    }
    if (action === "deliver") {
      if (!producerRoles.has(workspace.role)) return Response.json({ error: "Seu papel não permite entregar relatórios." }, { status: 403 });
      const currentBlockers = blockers(cycle); if (currentBlockers.length) return Response.json({ error: "Existem bloqueios objetivos antes da entrega.", blockers: currentBlockers }, { status: 409 });
      if (cycle.report_status !== "approved" || !cycle.snapshot_hash) return Response.json({ error: "O relatório precisa estar aprovado e assinado na revisão atual." }, { status: 409 });
      const approval = await env.DB.prepare("SELECT id FROM report_approvals WHERE report_id = ? AND workspace_id = ? AND revision = ? AND snapshot_hash = ? LIMIT 1").bind(cycle.report_id, workspace.id, cycle.revision, cycle.snapshot_hash).first();
      if (!approval) return Response.json({ error: "A assinatura da revisão atual não foi encontrada." }, { status: 409 });
      const token = secureToken(); const tokenHash = await sha256Hex(token); const expiryDays = clampInt(body.expiryDays, 1, 30, 14); const expiresAt = new Date(now.getTime() + expiryDays * 86_400_000).toISOString();
      await env.DB.batch([
        env.DB.prepare("UPDATE monthly_closing_shares SET revoked_at = ? WHERE cycle_id = ? AND workspace_id = ? AND revoked_at IS NULL").bind(nowIso, cycle.id, workspace.id),
        env.DB.prepare("INSERT INTO monthly_closing_shares (id, cycle_id, workspace_id, report_id, report_revision, snapshot_hash, token_hash, expires_at, created_by_user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), cycle.id, workspace.id, cycle.report_id, cycle.revision, cycle.snapshot_hash, tokenHash, expiresAt, user.id, nowIso),
        env.DB.prepare("UPDATE monthly_closing_cycles SET stage = 'delivered', delivered_at = ?, updated_at = ? WHERE id = ? AND workspace_id = ?").bind(nowIso, nowIso, cycle.id, workspace.id),
        env.DB.prepare("INSERT INTO monthly_closing_events (id, cycle_id, workspace_id, actor_type, actor_user_id, event_type, event_data_json, created_at) VALUES (?, ?, ?, 'user', ?, 'cycle.delivered', ?, ?)").bind(crypto.randomUUID(), cycle.id, workspace.id, user.id, JSON.stringify({ revision: cycle.revision, snapshotHash: cycle.snapshot_hash, expiresAt }), nowIso),
      ]);
      return Response.json({ url: publicAppUrl(`/fechamento/${token}`, request, (env as unknown as { PUBLIC_APP_URL?: string }).PUBLIC_APP_URL), expiresAt });
    }
    if (action === "revoke") {
      if (!producerRoles.has(workspace.role)) return Response.json({ error: "Seu papel não permite revogar entregas." }, { status: 403 });
      await env.DB.batch([
        env.DB.prepare("UPDATE monthly_closing_shares SET revoked_at = ? WHERE cycle_id = ? AND workspace_id = ? AND revoked_at IS NULL").bind(nowIso, cycle.id, workspace.id),
        env.DB.prepare("INSERT INTO monthly_closing_events (id, cycle_id, workspace_id, actor_type, actor_user_id, event_type, event_data_json, created_at) VALUES (?, ?, ?, 'user', ?, 'share.revoked', '{}', ?)").bind(crypto.randomUUID(), cycle.id, workspace.id, user.id, nowIso),
      ]); return Response.json({ revoked: true });
    }
    if (action === "reopen") {
      if (!managerRoles.has(workspace.role) || !["approved", "delivered", "accepted", "rejected", "changes_requested"].includes(effectiveStage(cycle))) return Response.json({ error: "Este fechamento não pode ser reaberto." }, { status: 409 });
      await env.DB.batch([
        env.DB.prepare("UPDATE monthly_closing_shares SET revoked_at = ? WHERE cycle_id = ? AND workspace_id = ? AND revoked_at IS NULL").bind(nowIso, cycle.id, workspace.id),
        env.DB.prepare("UPDATE report_work_items SET status = 'changes_requested', updated_at = ? WHERE id = ? AND workspace_id = ?").bind(nowIso, cycle.report_id, workspace.id),
        env.DB.prepare("UPDATE monthly_closing_cycles SET stage = 'preparation', reopened_from_revision = ?, reopened_at = ?, delivered_at = NULL, decided_at = NULL, client_decision = NULL, client_note = '', updated_at = ? WHERE id = ? AND workspace_id = ?").bind(cycle.revision, nowIso, nowIso, cycle.id, workspace.id),
        env.DB.prepare("INSERT INTO monthly_closing_events (id, cycle_id, workspace_id, actor_type, actor_user_id, event_type, event_data_json, created_at) VALUES (?, ?, ?, 'user', ?, 'cycle.reopened', ?, ?)").bind(crypto.randomUUID(), cycle.id, workspace.id, user.id, JSON.stringify({ preservedRevision: cycle.revision, preservedSnapshotHash: cycle.snapshot_hash }), nowIso),
        env.DB.prepare("INSERT INTO report_work_item_events (report_id, workspace_id, actor_user_id, event_type, note, event_data, created_at) VALUES (?, ?, ?, 'report.reopened', 'Versão aprovada preservada; nova revisão iniciada.', ?, ?)").bind(cycle.report_id, workspace.id, user.id, JSON.stringify({ preservedRevision: cycle.revision, preservedSnapshotHash: cycle.snapshot_hash }), nowIso),
      ]); return Response.json({ reopened: true, preservedRevision: cycle.revision, preservedSnapshotHash: cycle.snapshot_hash });
    }
    return Response.json({ error: "Ação inválida." }, { status: 400 });
  } catch { return Response.json({ error: "Não foi possível atualizar o fechamento mensal." }, { status: 500 }); }
}

export const GET = withApiTelemetry("GET /api/monthly-closing", listClosing);
export const POST = withApiTelemetry("POST /api/monthly-closing", mutateClosing);

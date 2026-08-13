import { env } from "cloudflare:workers";
import { getCurrentUser } from "../../auth";
import { withApiTelemetry } from "../../api-infrastructure";
import { getWorkspaceContext, sha256Hex } from "../../workspace";
import { canonicalReportSnapshot, isReportArtifactType, isReportPeriod, normalizeIndicators, normalizePendingItems, reportPermissions, reportReviewReadiness, type ReportArtifactType } from "../../../domain/report-central";
import { defaultReportBlocks, normalizeReportBlocks, normalizeReportRecommendations } from "../../../domain/report-builder";

type ReportRow = {
  id: string; workspace_id: number; company_id: number; period_key: string; created_by_user_id: number;
  assigned_user_id: number | null; reviewer_user_id: number | null; status: string; revision: number;
  executive_summary: string; conclusion: string; indicators_json: string; pending_items_json: string;
  template_key: string; template_version: number; blocks_json: string; commercial_notes: string; recommendations_json: string;
  snapshot_hash: string | null; due_at: string | null; created_at: string; updated_at: string;
  company_name: string; assigned_name: string | null; reviewer_name: string | null; creator_name: string;
};

type LinkRow = {
  id: string; report_id: string; artifact_type: string; artifact_id: string; artifact_label: string;
  artifact_hash: string; artifact_version: string | null; artifact_status: string; created_at: string;
};

function jsonParse<T>(value: string, fallback: T): T {
  try { return JSON.parse(value) as T; } catch { return fallback; }
}
function storedReportBlocks(value: string) {
  const parsed = jsonParse<unknown[]>(value, []);
  return normalizeReportBlocks(parsed.length ? parsed : defaultReportBlocks());
}

async function reportById(reportId: string, workspaceId: number) {
  return env.DB.prepare(`SELECT r.*, c.name company_name, creator.name creator_name,
    assignee.name assigned_name, reviewer.name reviewer_name
    FROM report_work_items r
    INNER JOIN companies c ON c.id = r.company_id AND c.workspace_id = r.workspace_id
    INNER JOIN users creator ON creator.id = r.created_by_user_id
    LEFT JOIN users assignee ON assignee.id = r.assigned_user_id
    LEFT JOIN users reviewer ON reviewer.id = r.reviewer_user_id
    WHERE r.id = ? AND r.workspace_id = ? LIMIT 1`).bind(reportId, workspaceId).first<ReportRow>();
}

function publicReport(row: ReportRow) {
  return {
    id: row.id, workspaceId: row.workspace_id, companyId: row.company_id, companyName: row.company_name,
    periodKey: row.period_key, createdByUserId: row.created_by_user_id, creatorName: row.creator_name,
    assignedUserId: row.assigned_user_id, assignedName: row.assigned_name, reviewerUserId: row.reviewer_user_id,
    reviewerName: row.reviewer_name, status: row.status, revision: row.revision,
    executiveSummary: row.executive_summary, conclusion: row.conclusion,
    indicators: jsonParse(row.indicators_json, {}), pendingItems: jsonParse(row.pending_items_json, []),
    templateKey: row.template_key, templateVersion: row.template_version,
    blocks: storedReportBlocks(row.blocks_json), commercialNotes: row.commercial_notes,
    recommendations: normalizeReportRecommendations(jsonParse(row.recommendations_json, [])),
    snapshotHash: row.snapshot_hash, dueAt: row.due_at, createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

async function getLinks(reportId: string, workspaceId: number) {
  return (await env.DB.prepare(`SELECT id, report_id, artifact_type, artifact_id, artifact_label, artifact_hash,
    artifact_version, artifact_status, created_at FROM report_work_item_links
    WHERE report_id = ? AND workspace_id = ? ORDER BY artifact_type, created_at, id`).bind(reportId, workspaceId).all<LinkRow>()).results;
}

async function artifactEvidence(type: ReportArtifactType, artifactId: string, workspaceId: number, companyId: number, periodKey: string) {
  if (type === "document") return env.DB.prepare(`SELECT id, filename label, source_hash hash, profile_version version, status
    FROM fiscal_documents WHERE id = ? AND workspace_id = ? AND company_id = ? LIMIT 1`).bind(artifactId, workspaceId, companyId).first<{ id: string; label: string; hash: string; version: string; status: string }>();
  if (type === "dossier") return env.DB.prepare(`SELECT id, title label, input_hash hash, base_version version, status
    FROM fiscal_dossiers WHERE id = ? AND workspace_id = ? AND company_id = ? LIMIT 1`).bind(artifactId, workspaceId, companyId).first<{ id: string; label: string; hash: string; version: string; status: string }>();
  if (type === "scenario") return env.DB.prepare(`SELECT CAST(s.id AS TEXT) id, s.name label, s.input_hash hash, s.calculation_version version, s.review_status status
    FROM scenarios s INNER JOIN companies c ON c.id = s.company_id
    WHERE s.id = ? AND c.workspace_id = ? AND s.company_id = ? AND s.input_hash IS NOT NULL LIMIT 1`).bind(Number(artifactId), workspaceId, companyId).first<{ id: string; label: string; hash: string; version: string; status: string }>();
  if (type === "tax_period") return env.DB.prepare(`SELECT CAST(p.id AS TEXT) id, ('Apuração ' || p.period_key) label, cl.input_hash hash,
    cl.calculation_version version, cl.status status FROM tax_periods p
    INNER JOIN companies c ON c.id = p.company_id AND c.workspace_id = ?
    INNER JOIN tax_period_closures cl ON cl.period_id = p.id
    WHERE p.id = ? AND p.company_id = ? AND p.period_key = ?
    ORDER BY cl.revision DESC LIMIT 1`).bind(workspaceId, Number(artifactId), companyId, periodKey).first<{ id: string; label: string; hash: string; version: string; status: string }>();
  return env.DB.prepare(`SELECT CAST(id AS TEXT) id, name label, content_hash hash, version, status
    FROM fiscal_rule_sets WHERE id = ? AND status = 'approved' AND effective_from <= (? || '-31') AND effective_to >= (? || '-01') LIMIT 1`)
    .bind(Number(artifactId), periodKey, periodKey).first<{ id: string; label: string; hash: string; version: string; status: string }>();
}

async function reportCandidates(workspaceId: number, companyId: number, periodKey: string) {
  const [documents, dossiers, scenarios, periods, rules] = await Promise.all([
    env.DB.prepare(`SELECT id, filename label, source_hash hash, profile_version version, status, 'document' type FROM fiscal_documents WHERE workspace_id = ? AND company_id = ? ORDER BY created_at DESC LIMIT 30`).bind(workspaceId, companyId).all(),
    env.DB.prepare(`SELECT id, title label, input_hash hash, base_version version, status, 'dossier' type FROM fiscal_dossiers WHERE workspace_id = ? AND company_id = ? ORDER BY created_at DESC LIMIT 30`).bind(workspaceId, companyId).all(),
    env.DB.prepare(`SELECT CAST(s.id AS TEXT) id, s.name label, s.input_hash hash, s.calculation_version version, s.review_status status, 'scenario' type FROM scenarios s INNER JOIN companies c ON c.id = s.company_id WHERE c.workspace_id = ? AND s.company_id = ? AND s.input_hash IS NOT NULL ORDER BY s.created_at DESC LIMIT 30`).bind(workspaceId, companyId).all(),
    env.DB.prepare(`SELECT CAST(p.id AS TEXT) id, ('Apuração ' || p.period_key) label, cl.input_hash hash, cl.calculation_version version, cl.status status, 'tax_period' type FROM tax_periods p INNER JOIN companies c ON c.id = p.company_id AND c.workspace_id = ? INNER JOIN tax_period_closures cl ON cl.period_id = p.id WHERE p.company_id = ? AND p.period_key = ? ORDER BY cl.revision DESC LIMIT 10`).bind(workspaceId, companyId, periodKey).all(),
    env.DB.prepare(`SELECT CAST(id AS TEXT) id, name label, content_hash hash, version, status, 'rule_set' type FROM fiscal_rule_sets WHERE status = 'approved' AND effective_from <= (? || '-31') AND effective_to >= (? || '-01') ORDER BY updated_at DESC LIMIT 30`).bind(periodKey, periodKey).all(),
  ]);
  return [...documents.results, ...dossiers.results, ...scenarios.results, ...periods.results, ...rules.results];
}

async function listReports(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para acessar a Central de Relatórios." }, { status: 401 });
  const workspace = await getWorkspaceContext(user.id);
  if (!workspace) return Response.json({ error: "Workspace indisponível." }, { status: 403 });
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id")?.trim();
    if (id) {
      const report = await reportById(id, workspace.id);
      if (!report) return Response.json({ error: "Relatório não encontrado neste workspace." }, { status: 404 });
      const [links, revisions, events, candidates, members] = await Promise.all([
        getLinks(report.id, workspace.id),
        env.DB.prepare(`SELECT id, revision, snapshot_hash snapshotHash, created_by_user_id createdByUserId, created_at createdAt FROM report_work_item_revisions WHERE report_id = ? AND workspace_id = ? ORDER BY revision DESC LIMIT 50`).bind(report.id, workspace.id).all(),
        env.DB.prepare(`SELECT e.id, e.actor_user_id actorUserId, u.name actorName, e.event_type eventType, e.note, e.event_data eventData, e.created_at createdAt FROM report_work_item_events e INNER JOIN users u ON u.id = e.actor_user_id WHERE e.report_id = ? AND e.workspace_id = ? ORDER BY e.created_at DESC, e.id DESC LIMIT 100`).bind(report.id, workspace.id).all(),
        reportCandidates(workspace.id, report.company_id, report.period_key),
        env.DB.prepare(`SELECT wm.user_id userId, u.name, wm.role FROM workspace_members wm INNER JOIN users u ON u.id = wm.user_id WHERE wm.workspace_id = ? AND wm.status = 'active' ORDER BY u.name`).bind(workspace.id).all(),
      ]);
      return Response.json({ report: publicReport(report), links, revisions: revisions.results, events: events.results.map((event: Record<string, unknown>) => ({ ...event, eventData: jsonParse(String(event.eventData), {}) })), candidates, members: members.results, permissions: reportPermissions(workspace.role, report.created_by_user_id, user.id) });
    }
    const period = url.searchParams.get("period");
    const companyId = Number(url.searchParams.get("companyId"));
    const clauses = ["r.workspace_id = ?"];
    const binds: unknown[] = [workspace.id];
    if (period && isReportPeriod(period)) { clauses.push("r.period_key = ?"); binds.push(period); }
    if (Number.isInteger(companyId) && companyId > 0) { clauses.push("r.company_id = ?"); binds.push(companyId); }
    const rows = await env.DB.prepare(`SELECT r.*, c.name company_name, creator.name creator_name, assignee.name assigned_name, reviewer.name reviewer_name,
      (SELECT COUNT(*) FROM report_work_item_links l WHERE l.report_id = r.id AND l.workspace_id = r.workspace_id) link_count
      FROM report_work_items r INNER JOIN companies c ON c.id = r.company_id AND c.workspace_id = r.workspace_id
      INNER JOIN users creator ON creator.id = r.created_by_user_id LEFT JOIN users assignee ON assignee.id = r.assigned_user_id LEFT JOIN users reviewer ON reviewer.id = r.reviewer_user_id
      WHERE ${clauses.join(" AND ")} ORDER BY r.period_key DESC, c.name, r.id LIMIT 250`).bind(...binds).all<ReportRow & { link_count: number }>();
    return Response.json({ reports: rows.results.map((row: ReportRow & { link_count: number }) => ({ ...publicReport(row), linkCount: row.link_count })), permissions: reportPermissions(workspace.role, user.id, user.id) });
  } catch {
    return Response.json({ error: "Não foi possível carregar a Central de Relatórios." }, { status: 500 });
  }
}

async function mutateReport(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para trabalhar nos relatórios." }, { status: 401 });
  const workspace = await getWorkspaceContext(user.id);
  if (!workspace) return Response.json({ error: "Workspace indisponível." }, { status: 403 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const action = typeof body.action === "string" ? body.action : "";
    if (action === "create") {
      if (!reportPermissions(workspace.role, user.id, user.id).canCreate) return Response.json({ error: "Seu papel não permite preparar relatórios." }, { status: 403 });
      const companyId = Number(body.companyId);
      const periodKey = body.periodKey;
      if (!Number.isInteger(companyId) || companyId <= 0 || !isReportPeriod(periodKey)) return Response.json({ error: "Informe empresa e competência válidas." }, { status: 400 });
      const company = await env.DB.prepare("SELECT id FROM companies WHERE id = ? AND workspace_id = ? LIMIT 1").bind(companyId, workspace.id).first();
      if (!company) return Response.json({ error: "Empresa não pertence a este workspace." }, { status: 404 });
      const id = crypto.randomUUID();
      await env.DB.batch([
        env.DB.prepare("INSERT OR IGNORE INTO report_work_items (id, workspace_id, company_id, period_key, created_by_user_id, assigned_user_id) VALUES (?, ?, ?, ?, ?, ?)").bind(id, workspace.id, companyId, periodKey, user.id, user.id),
        env.DB.prepare("INSERT INTO report_work_item_events (report_id, workspace_id, actor_user_id, event_type, note, event_data) SELECT id, workspace_id, ?, 'report.created', 'Relatório aberto para a competência.', ? FROM report_work_items WHERE workspace_id = ? AND company_id = ? AND period_key = ? AND NOT EXISTS (SELECT 1 FROM report_work_item_events e WHERE e.report_id = report_work_items.id AND e.event_type = 'report.created')").bind(user.id, JSON.stringify({ periodKey }), workspace.id, companyId, periodKey),
      ]);
      const created = await env.DB.prepare("SELECT id FROM report_work_items WHERE workspace_id = ? AND company_id = ? AND period_key = ? LIMIT 1").bind(workspace.id, companyId, periodKey).first<{ id: string }>();
      return Response.json({ reportId: created?.id }, { status: 201 });
    }

    const reportId = typeof body.reportId === "string" ? body.reportId : "";
    const report = reportId ? await reportById(reportId, workspace.id) : null;
    if (!report) return Response.json({ error: "Relatório não encontrado neste workspace." }, { status: 404 });
    const permissions = reportPermissions(workspace.role, report.created_by_user_id, user.id);

    if (action === "link" || action === "unlink") {
      if (!permissions.canEdit || report.status === "approved") return Response.json({ error: "Este relatório não pode ser alterado por seu papel ou status." }, { status: 403 });
      if (!isReportArtifactType(body.artifactType) || typeof body.artifactId !== "string") return Response.json({ error: "Artefato inválido." }, { status: 400 });
      const evidence = await artifactEvidence(body.artifactType, body.artifactId, workspace.id, report.company_id, report.period_key);
      if (!evidence) return Response.json({ error: "O artefato não pertence à empresa, à competência ou à base aprovada." }, { status: 409 });
      const now = new Date().toISOString();
      if (action === "link") await env.DB.batch([
        env.DB.prepare("INSERT OR IGNORE INTO report_work_item_links (id, report_id, workspace_id, company_id, artifact_type, artifact_id, artifact_label, artifact_hash, artifact_version, artifact_status, created_by_user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), report.id, workspace.id, report.company_id, body.artifactType, String(evidence.id), evidence.label, evidence.hash, evidence.version, evidence.status, user.id, now),
        env.DB.prepare("INSERT INTO report_work_item_events (report_id, workspace_id, actor_user_id, event_type, note, event_data) VALUES (?, ?, ?, 'report.artifact_linked', ?, ?, ?)").bind(report.id, workspace.id, user.id, evidence.label, JSON.stringify({ type: body.artifactType, id: String(evidence.id), hash: evidence.hash }), now),
      ]);
      else await env.DB.batch([
        env.DB.prepare("DELETE FROM report_work_item_links WHERE report_id = ? AND workspace_id = ? AND artifact_type = ? AND artifact_id = ?").bind(report.id, workspace.id, body.artifactType, String(evidence.id)),
        env.DB.prepare("INSERT INTO report_work_item_events (report_id, workspace_id, actor_user_id, event_type, note, event_data) VALUES (?, ?, ?, 'report.artifact_unlinked', ?, ?, ?)").bind(report.id, workspace.id, user.id, evidence.label, JSON.stringify({ type: body.artifactType, id: String(evidence.id) }), now),
      ]);
      return Response.json({ links: await getLinks(report.id, workspace.id) });
    }

    if (action === "autosave") {
      if (!permissions.canEdit || report.status === "approved" || report.status === "ready_for_review") return Response.json({ error: "Relatório bloqueado para edição." }, { status: 403 });
      const expectedRevision = Number(body.expectedRevision);
      if (expectedRevision !== report.revision) return Response.json({ error: "Outra pessoa salvou uma versão mais recente.", code: "REPORT_REVISION_CONFLICT", currentRevision: report.revision }, { status: 409 });
      const executiveSummary = typeof body.executiveSummary === "string" ? body.executiveSummary.trim().slice(0, 5000) : "";
      const conclusion = typeof body.conclusion === "string" ? body.conclusion.trim().slice(0, 5000) : "";
      const indicators = normalizeIndicators(body.indicators);
      const pendingItems = normalizePendingItems(body.pendingItems);
      const templateKey = typeof body.templateKey === "string" ? body.templateKey.trim().slice(0, 100) || "monthly-pme" : "monthly-pme";
      const templateVersion = Number.isInteger(Number(body.templateVersion)) && Number(body.templateVersion) > 0 ? Math.min(Number(body.templateVersion), 1_000_000) : 1;
      const blocks = normalizeReportBlocks(body.blocks);
      const commercialNotes = typeof body.commercialNotes === "string" ? body.commercialNotes.trim().slice(0, 5000) : "";
      const recommendations = normalizeReportRecommendations(body.recommendations);
      const links = await getLinks(report.id, workspace.id);
      const revision = report.revision + 1;
      const snapshotJson = canonicalReportSnapshot({ schemaVersion: "report-builder-1", reportId: report.id, workspaceId: workspace.id, company: { id: report.company_id, name: report.company_name }, periodKey: report.period_key, revision, template: { key: templateKey, version: templateVersion }, blocks, executiveSummary, conclusion, commercialNotes, recommendations, indicators, pendingItems, artifacts: links.map((link: LinkRow) => ({ type: link.artifact_type, id: link.artifact_id, label: link.artifact_label, hash: link.artifact_hash, version: link.artifact_version, status: link.artifact_status })) });
      const snapshotHash = await sha256Hex(snapshotJson);
      const now = new Date().toISOString();
      const result = await env.DB.batch([
        env.DB.prepare("UPDATE report_work_items SET executive_summary = ?, conclusion = ?, indicators_json = ?, pending_items_json = ?, template_key = ?, template_version = ?, blocks_json = ?, commercial_notes = ?, recommendations_json = ?, snapshot_hash = ?, revision = ?, status = 'draft', updated_at = ? WHERE id = ? AND workspace_id = ? AND revision = ? AND status IN ('draft','changes_requested')").bind(executiveSummary, conclusion, JSON.stringify(indicators), JSON.stringify(pendingItems), templateKey, templateVersion, JSON.stringify(blocks), commercialNotes, JSON.stringify(recommendations), snapshotHash, revision, now, report.id, workspace.id, expectedRevision),
        env.DB.prepare("INSERT INTO report_work_item_revisions (id, report_id, workspace_id, company_id, period_key, revision, snapshot_json, snapshot_hash, created_by_user_id, created_at) SELECT ?, id, workspace_id, company_id, period_key, ?, ?, ?, ?, ? FROM report_work_items WHERE id = ? AND workspace_id = ? AND revision = ? AND snapshot_hash = ?").bind(crypto.randomUUID(), revision, snapshotJson, snapshotHash, user.id, now, report.id, workspace.id, revision, snapshotHash),
        env.DB.prepare("INSERT INTO report_work_item_events (report_id, workspace_id, actor_user_id, event_type, note, event_data, created_at) SELECT id, workspace_id, ?, 'report.autosaved', 'Revisão imutável registrada.', ?, ? FROM report_work_items WHERE id = ? AND workspace_id = ? AND revision = ? AND snapshot_hash = ?").bind(user.id, JSON.stringify({ revision, snapshotHash }), now, report.id, workspace.id, revision, snapshotHash),
      ]);
      if (result[0].meta.changes !== 1 || result[1].meta.changes !== 1) return Response.json({ error: "Outra pessoa alterou o relatório. Recarregue antes de continuar.", code: "REPORT_REVISION_CONFLICT" }, { status: 409 });
      return Response.json({ revision, snapshotHash, updatedAt: now });
    }

    if (action === "submit_review") {
      if (!permissions.canEdit) return Response.json({ error: "Seu papel não permite enviar este relatório." }, { status: 403 });
      const pending = jsonParse<Array<{ resolved?: boolean }>>(report.pending_items_json, []);
      const readiness = reportReviewReadiness({ conclusion: report.conclusion, snapshotHash: report.snapshot_hash, pendingItems: pending });
      if (!readiness.ready) return Response.json({ error: "Salve o parecer e resolva todas as pendências antes da revisão.", blockers: readiness.blockers }, { status: 409 });
      const reviewerUserId = Number(body.reviewerUserId);
      const reviewer = await env.DB.prepare("SELECT wm.user_id id, wm.role, u.name FROM workspace_members wm INNER JOIN users u ON u.id = wm.user_id WHERE wm.workspace_id = ? AND wm.user_id = ? AND wm.status = 'active' AND wm.role IN ('owner','admin','reviewer') LIMIT 1").bind(workspace.id, reviewerUserId).first<{ id: number; role: string; name: string }>();
      if (!reviewer || (workspace.type === "office" && reviewer.id === report.created_by_user_id)) return Response.json({ error: "Escolha um revisor ativo e diferente do preparador." }, { status: 409 });
      const now = new Date().toISOString();
      const result = await env.DB.batch([
        env.DB.prepare("UPDATE report_work_items SET reviewer_user_id = ?, status = 'ready_for_review', updated_at = ? WHERE id = ? AND workspace_id = ? AND revision = ? AND snapshot_hash = ? AND status IN ('draft','changes_requested')").bind(reviewer.id, now, report.id, workspace.id, report.revision, report.snapshot_hash),
        env.DB.prepare("INSERT INTO report_work_item_events (report_id, workspace_id, actor_user_id, event_type, note, event_data, created_at) SELECT id, workspace_id, ?, 'report.ready_for_review', ?, ?, ? FROM report_work_items WHERE id = ? AND workspace_id = ? AND status = 'ready_for_review' AND updated_at = ?").bind(user.id, `Enviado para ${reviewer.name}.`, JSON.stringify({ reviewerUserId: reviewer.id, revision: report.revision, snapshotHash: report.snapshot_hash }), now, report.id, workspace.id, now),
      ]);
      if (result[0].meta.changes !== 1) return Response.json({ error: "O relatório mudou antes do envio. Recarregue a página." }, { status: 409 });
      return Response.json({ status: "ready_for_review", reviewerUserId: reviewer.id, reviewerName: reviewer.name, updatedAt: now });
    }
    return Response.json({ error: "Ação inválida." }, { status: 400 });
  } catch {
    return Response.json({ error: "Não foi possível atualizar o relatório." }, { status: 500 });
  }
}

export const GET = withApiTelemetry("GET /api/reports", listReports);
export const POST = withApiTelemetry("POST /api/reports", mutateReport);

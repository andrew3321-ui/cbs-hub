import { env } from "cloudflare:workers";
import { getCurrentUser } from "../../auth";
import { withApiTelemetry } from "../../api-infrastructure";
import { getWorkspaceContext, sha256Hex } from "../../workspace";
import { buildDeterministicReportPdf, defaultReportBlocks, normalizeReportBlocks, normalizeReportBranding, reportApprovalReady, REPORT_APPROVAL_SIGNATURE_VERSION, reportBlockLibrary, reportTemplatePresets, signReportApproval, type ReportApprovalRecord } from "../../../domain/report-builder";

function json<T>(value: string | null | undefined, fallback: T): T { try { return value ? JSON.parse(value) as T : fallback; } catch { return fallback; } }
function signingSecret() { const secret = String((env as unknown as { SCENARIO_SIGNING_KEY_V1?: string }).SCENARIO_SIGNING_KEY_V1 ?? "").trim(); if (secret.length < 32) throw new Error("REPORT_SIGNING_KEY_UNAVAILABLE"); return secret; }

async function ownedReport(reportId: string, workspaceId: number) {
  return env.DB.prepare(`SELECT r.*, c.name company_name, creator.name creator_name, reviewer.name reviewer_name
    FROM report_work_items r INNER JOIN companies c ON c.id = r.company_id AND c.workspace_id = r.workspace_id
    INNER JOIN users creator ON creator.id = r.created_by_user_id LEFT JOIN users reviewer ON reviewer.id = r.reviewer_user_id
    WHERE r.id = ? AND r.workspace_id = ? LIMIT 1`).bind(reportId, workspaceId).first<Record<string, unknown>>();
}

async function readBuilder(request: Request) {
  const user = await getCurrentUser(); if (!user) return Response.json({ error: "Faça login para abrir o construtor." }, { status: 401 });
  const workspace = await getWorkspaceContext(user.id); if (!workspace) return Response.json({ error: "Workspace indisponível." }, { status: 403 });
  try {
    const reportId = new URL(request.url).searchParams.get("reportId")?.trim() ?? "";
    const [templates, brandingRow, report, approval] = await Promise.all([
      env.DB.prepare("SELECT id, name, service_type serviceType, client_type clientType, blocks_json blocksJson, version, updated_at updatedAt FROM report_templates WHERE workspace_id = ? ORDER BY updated_at DESC, name LIMIT 100").bind(workspace.id).all(),
      env.DB.prepare("SELECT branding_json brandingJson, version, updated_at updatedAt FROM report_workspace_branding WHERE workspace_id = ? LIMIT 1").bind(workspace.id).first<{ brandingJson: string; version: number; updatedAt: string }>(),
      reportId ? ownedReport(reportId, workspace.id) : null,
      reportId ? env.DB.prepare("SELECT revision, snapshot_hash snapshotHash, reviewer_name reviewerName, professional_registration professionalRegistration, signature_version signatureVersion, approval_signature approvalSignature, decided_at decidedAt FROM report_approvals WHERE report_id = ? AND workspace_id = ? ORDER BY revision DESC LIMIT 1").bind(reportId, workspace.id).first() : null,
    ]);
    if (reportId && !report) return Response.json({ error: "Relatório não encontrado neste workspace." }, { status: 404 });
    return Response.json({
      blockLibrary: reportBlockLibrary, presets: reportTemplatePresets,
      templates: templates.results.map((item: Record<string, unknown>) => ({ ...item, blocks: normalizeReportBlocks(json(String(item.blocksJson ?? "[]"), defaultReportBlocks())) })),
      branding: normalizeReportBranding(json(brandingRow?.brandingJson, {}), workspace.name), brandingVersion: brandingRow?.version ?? 0,
      approval: approval ?? null,
      permissions: { canManageBrand: workspace.role === "owner" || workspace.role === "admin", canApprove: Boolean(report && report.reviewer_user_id === user.id) },
    });
  } catch { return Response.json({ error: "Não foi possível carregar o construtor de relatórios." }, { status: 500 }); }
}

async function mutateBuilder(request: Request) {
  const user = await getCurrentUser(); if (!user) return Response.json({ error: "Faça login para trabalhar no construtor." }, { status: 401 });
  const workspace = await getWorkspaceContext(user.id); if (!workspace) return Response.json({ error: "Workspace indisponível." }, { status: 403 });
  try {
    const contentType = request.headers.get("content-type") ?? "";
    const body = contentType.includes("application/json") ? await request.json() as Record<string, unknown> : {};
    const action = typeof body.action === "string" ? body.action : "";
    if (action === "save_branding") {
      if (!['owner','admin'].includes(workspace.role)) return Response.json({ error: "Somente gestores alteram a identidade do escritório." }, { status: 403 });
      const branding = normalizeReportBranding(body.branding, workspace.name); const now = new Date().toISOString();
      await env.DB.prepare(`INSERT INTO report_workspace_branding (workspace_id, branding_json, version, updated_by_user_id, updated_at) VALUES (?, ?, 1, ?, ?)
        ON CONFLICT(workspace_id) DO UPDATE SET branding_json = excluded.branding_json, version = report_workspace_branding.version + 1, updated_by_user_id = excluded.updated_by_user_id, updated_at = excluded.updated_at`).bind(workspace.id, JSON.stringify(branding), user.id, now).run();
      return Response.json({ branding, updatedAt: now });
    }
    if (action === "save_template") {
      if (!['owner','admin','preparer'].includes(workspace.role)) return Response.json({ error: "Seu papel não permite salvar modelos." }, { status: 403 });
      const name = typeof body.name === "string" ? body.name.trim().slice(0, 100) : ""; if (name.length < 3) return Response.json({ error: "Dê um nome com pelo menos 3 caracteres ao modelo." }, { status: 400 });
      const serviceType = typeof body.serviceType === "string" ? body.serviceType.trim().slice(0, 80) : "personalizado";
      const clientType = typeof body.clientType === "string" ? body.clientType.trim().slice(0, 80) : "pme"; const blocks = normalizeReportBlocks(body.blocks); const now = new Date().toISOString();
      await env.DB.prepare(`INSERT INTO report_templates (id, workspace_id, name, service_type, client_type, blocks_json, version, created_by_user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
        ON CONFLICT(workspace_id, name) DO UPDATE SET service_type = excluded.service_type, client_type = excluded.client_type, blocks_json = excluded.blocks_json, version = report_templates.version + 1, updated_at = excluded.updated_at`).bind(crypto.randomUUID(), workspace.id, name, serviceType || "personalizado", clientType || "pme", JSON.stringify(blocks), user.id, now, now).run();
      return Response.json({ saved: true, updatedAt: now });
    }
    const reportId = typeof body.reportId === "string" ? body.reportId : ""; const report = reportId ? await ownedReport(reportId, workspace.id) : null;
    if (!report) return Response.json({ error: "Relatório não encontrado neste workspace." }, { status: 404 });
    if (action === "approve") {
      const registration = typeof body.professionalRegistration === "string" ? body.professionalRegistration.trim().slice(0, 60) : "";
      const readiness = reportApprovalReady({ status: String(report.status), snapshotHash: report.snapshot_hash ? String(report.snapshot_hash) : null, revision: Number(report.revision), reviewerUserId: report.reviewer_user_id ? Number(report.reviewer_user_id) : null, actorUserId: user.id, createdByUserId: Number(report.created_by_user_id), workspaceType: workspace.type, professionalRegistration: registration });
      if (!readiness.ready) return Response.json({ error: "O relatório ainda não atende aos requisitos de aprovação.", blockers: readiness.blockers }, { status: 409 });
      const decidedAt = new Date().toISOString(); const record: ReportApprovalRecord = { reportId, workspaceId: workspace.id, revision: Number(report.revision), snapshotHash: String(report.snapshot_hash), reviewerUserId: user.id, reviewerName: user.name, professionalRegistration: registration, decidedAt };
      const signature = await signReportApproval(record, signingSecret());
      const results = await env.DB.batch([
        env.DB.prepare("INSERT INTO report_approvals (id, report_id, workspace_id, revision, snapshot_hash, reviewer_user_id, reviewer_name, professional_registration, signature_version, approval_signature, decided_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), reportId, workspace.id, record.revision, record.snapshotHash, user.id, user.name, registration, REPORT_APPROVAL_SIGNATURE_VERSION, signature, decidedAt),
        env.DB.prepare("UPDATE report_work_items SET status = 'approved', updated_at = ? WHERE id = ? AND workspace_id = ? AND revision = ? AND snapshot_hash = ? AND status = 'ready_for_review' AND reviewer_user_id = ?").bind(decidedAt, reportId, workspace.id, record.revision, record.snapshotHash, user.id),
        env.DB.prepare("INSERT INTO report_work_item_events (report_id, workspace_id, actor_user_id, event_type, note, event_data, created_at) VALUES (?, ?, ?, 'report.approved', 'Relatório aprovado e assinado.', ?, ?)").bind(reportId, workspace.id, user.id, JSON.stringify({ revision: record.revision, snapshotHash: record.snapshotHash, signatureVersion: REPORT_APPROVAL_SIGNATURE_VERSION }), decidedAt),
      ]);
      if (results[1].meta.changes !== 1) return Response.json({ error: "O relatório mudou durante a aprovação." }, { status: 409 });
      return Response.json({ status: "approved", signatureVersion: REPORT_APPROVAL_SIGNATURE_VERSION, approvalSignature: signature, decidedAt });
    }
    if (action === "export_pdf") {
      if (!report.snapshot_hash) return Response.json({ error: "Salve uma versão antes de gerar o PDF." }, { status: 409 });
      const [revision, links, brandRow, approval] = await Promise.all([
        env.DB.prepare("SELECT snapshot_json snapshotJson FROM report_work_item_revisions WHERE report_id = ? AND workspace_id = ? AND revision = ? AND snapshot_hash = ? LIMIT 1").bind(reportId, workspace.id, report.revision, report.snapshot_hash).first<{ snapshotJson: string }>(),
        env.DB.prepare("SELECT artifact_type artifactType, artifact_label artifactLabel, artifact_hash artifactHash, artifact_version artifactVersion, artifact_status artifactStatus FROM report_work_item_links WHERE report_id = ? AND workspace_id = ? ORDER BY artifact_type, created_at").bind(reportId, workspace.id).all(),
        env.DB.prepare("SELECT branding_json brandingJson FROM report_workspace_branding WHERE workspace_id = ? LIMIT 1").bind(workspace.id).first<{ brandingJson: string }>(),
        env.DB.prepare("SELECT reviewer_name reviewerName, professional_registration professionalRegistration, decided_at decidedAt FROM report_approvals WHERE report_id = ? AND workspace_id = ? AND revision = ? LIMIT 1").bind(reportId, workspace.id, report.revision).first<{ reviewerName: string; professionalRegistration: string; decidedAt: string }>(),
      ]);
      if (!revision) return Response.json({ error: "A revisão imutável não foi encontrada." }, { status: 409 });
      const snapshot = json<Record<string, unknown>>(revision.snapshotJson, {}); const blocks = normalizeReportBlocks(snapshot.blocks); const enabled = new Set(blocks.filter((item) => item.enabled).map((item) => item.id));
      const indicators = snapshot.indicators && typeof snapshot.indicators === "object" ? Object.entries(snapshot.indicators as Record<string, unknown>).map(([key, value]) => `${key}: ${value}`) : [];
      const pending = Array.isArray(snapshot.pendingItems) ? snapshot.pendingItems.map((item) => { const row = item as Record<string, unknown>; return `${row.resolved ? '[resolvida]' : '[aberta]'} ${row.text ?? ''}`; }) : [];
      const recommendations = Array.isArray(snapshot.recommendations) ? snapshot.recommendations.map(String) : [];
      const evidence = links.results as Array<Record<string, unknown>>;
      const content = [
        { id: "executive_summary", title: "Resumo executivo", lines: [String(snapshot.executiveSummary ?? "Sem resumo registrado.")] },
        { id: "indicators", title: "Indicadores", lines: indicators.length ? indicators : ["Nenhum indicador registrado."] },
        { id: "comparisons", title: "Comparativos", lines: indicators.length > 1 ? indicators : ["Sem comparativo estruturado nesta versão."] },
        { id: "tax_evidence", title: "Tributos e evidências", lines: evidence.map((item) => `${item.artifactType}: ${item.artifactLabel} | ${item.artifactStatus}`) },
        { id: "calculation_memory", title: "Memória e integridade", lines: evidence.map((item) => `${item.artifactLabel} | versão ${item.artifactVersion ?? 'n/d'} | #${String(item.artifactHash).slice(0, 16)}`) },
        { id: "official_sources", title: "Fontes e versões oficiais", lines: evidence.filter((item) => item.artifactType === "rule_set" || item.artifactType === "dossier").map((item) => `${item.artifactLabel} | ${item.artifactVersion ?? 'n/d'}`) },
        { id: "pending_items", title: "Pendências", lines: pending.length ? pending : ["Nenhuma pendência aberta."] },
        { id: "recommendations", title: "Recomendações", lines: recommendations.length ? recommendations : ["Nenhuma recomendação comercial registrada."] },
        { id: "attachments", title: "Anexos vinculados", lines: evidence.map((item) => `${item.artifactLabel} | #${String(item.artifactHash).slice(0, 16)}`) },
        { id: "technical_conclusion", title: "Conclusão fiscal", lines: [String(snapshot.conclusion ?? "Conclusão não registrada.")] },
        { id: "commercial_notes", title: "Comentários comerciais (não fiscais)", lines: [String(snapshot.commercialNotes ?? "Nenhum comentário comercial.")] },
      ].filter((block) => enabled.has(block.id as never));
      const brand = normalizeReportBranding(json(brandRow?.brandingJson, {}), workspace.name);
      const pdf = buildDeterministicReportPdf({ title: `Relatório fiscal — ${String(report.company_name)}`, subtitle: `Competência ${String(report.period_key)}`, brand, snapshotHash: String(report.snapshot_hash), revision: Number(report.revision), blocks: content, approval: approval ?? null });
      const pdfHash = await sha256Hex(new TextDecoder().decode(pdf)); const now = new Date().toISOString();
      await env.DB.prepare("INSERT INTO report_exports (id, report_id, workspace_id, revision, snapshot_hash, template_key, template_version, pdf_sha256, created_by_user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), reportId, workspace.id, report.revision, report.snapshot_hash, report.template_key, report.template_version, pdfHash, user.id, now).run();
      return new Response(pdf, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename=cbshub-${String(report.period_key)}-${reportId.slice(0, 8)}.pdf`, "X-Content-Type-Options": "nosniff", "X-CBSHub-PDF-SHA256": pdfHash, "Cache-Control": "private, no-store" } });
    }
    return Response.json({ error: "Ação inválida." }, { status: 400 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    return Response.json({ error: code === "REPORT_SIGNING_KEY_UNAVAILABLE" ? "Assinatura de produção indisponível." : "Não foi possível concluir a operação do construtor." }, { status: 500 });
  }
}

export const GET = withApiTelemetry("GET /api/report-builder", readBuilder);
export const POST = withApiTelemetry("POST /api/report-builder", mutateBuilder);

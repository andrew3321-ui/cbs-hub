import { env } from "cloudflare:workers";
import { withApiTelemetry } from "../../../api-infrastructure";
import { sha256Hex } from "../../../workspace";

async function shareFromToken(token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const hash = await sha256Hex(token);
  return env.DB.prepare(`SELECT s.*, mc.period_key, mc.company_id, c.name company_name, r.conclusion, r.executive_summary,
    r.indicators_json, r.pending_items_json, a.reviewer_name, a.professional_registration, a.decided_at approval_decided_at,
    rb.branding_json
    FROM monthly_closing_shares s INNER JOIN monthly_closing_cycles mc ON mc.id = s.cycle_id AND mc.workspace_id = s.workspace_id
    INNER JOIN companies c ON c.id = mc.company_id AND c.workspace_id = s.workspace_id
    INNER JOIN report_work_items r ON r.id = s.report_id AND r.workspace_id = s.workspace_id
    INNER JOIN report_work_item_revisions rr ON rr.report_id = s.report_id AND rr.workspace_id = s.workspace_id AND rr.revision = s.report_revision AND rr.snapshot_hash = s.snapshot_hash
    INNER JOIN report_approvals a ON a.report_id = s.report_id AND a.workspace_id = s.workspace_id AND a.revision = s.report_revision AND a.snapshot_hash = s.snapshot_hash
    LEFT JOIN report_workspace_branding rb ON rb.workspace_id = s.workspace_id
    WHERE s.token_hash = ? LIMIT 1`).bind(hash).first<Record<string, unknown>>();
}

function parse(value: unknown, fallback: unknown) { try { return typeof value === "string" ? JSON.parse(value) : fallback; } catch { return fallback; } }

async function readShare(request: Request) {
  try {
    const token = new URL(request.url).searchParams.get("token") ?? ""; const share = await shareFromToken(token); const now = new Date();
    if (!share || share.revoked_at || new Date(String(share.expires_at)).getTime() <= now.getTime()) return Response.json({ error: "Este link expirou ou foi revogado." }, { status: 410 });
    await env.DB.prepare("UPDATE monthly_closing_shares SET viewed_at = ?, view_count = view_count + 1 WHERE id = ?").bind(now.toISOString(), share.id).run();
    const branding = parse(share.branding_json, {}) as Record<string, unknown>;
    return Response.json({
      delivery: { companyName: share.company_name, periodKey: share.period_key, revision: share.report_revision, snapshotHash: share.snapshot_hash, executiveSummary: share.executive_summary, conclusion: share.conclusion, indicators: parse(share.indicators_json, {}), pendingItems: parse(share.pending_items_json, []), reviewerName: share.reviewer_name, professionalRegistration: share.professional_registration, approvedAt: share.approval_decided_at, expiresAt: share.expires_at, decision: share.decision, decisionNote: share.decision_note, decidedAt: share.decided_at },
      branding: { officeName: branding.officeName ?? "CBSHub", primaryColor: branding.primaryColor ?? "#073c3b", accentColor: branding.accentColor ?? "#b8f04c" },
    }, { headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" } });
  } catch { return Response.json({ error: "Não foi possível abrir esta entrega." }, { status: 500 }); }
}

async function decideShare(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>; const token = typeof body.token === "string" ? body.token : ""; const decision = String(body.decision ?? ""); const note = typeof body.note === "string" ? body.note.trim().slice(0, 2000) : "";
    if (!["accepted", "rejected", "changes_requested"].includes(decision)) return Response.json({ error: "Decisão inválida." }, { status: 400 });
    if (decision !== "accepted" && note.length < 10) return Response.json({ error: "Descreva o motivo ou o ajuste solicitado." }, { status: 400 });
    const share = await shareFromToken(token); const now = new Date(); const nowIso = now.toISOString();
    if (!share || share.revoked_at || new Date(String(share.expires_at)).getTime() <= now.getTime()) return Response.json({ error: "Este link expirou ou foi revogado." }, { status: 410 });
    if (share.decision) return Response.json({ error: "Esta entrega já recebeu uma decisão.", decision: share.decision }, { status: 409 });
    const result = await env.DB.batch([
      env.DB.prepare("UPDATE monthly_closing_shares SET decision = ?, decision_note = ?, decided_at = ? WHERE id = ? AND decision IS NULL AND revoked_at IS NULL").bind(decision, note, nowIso, share.id),
      env.DB.prepare("UPDATE monthly_closing_cycles SET stage = ?, client_decision = ?, client_note = ?, decided_at = ?, accepted_report_revision = CASE WHEN ? = 'accepted' THEN ? ELSE accepted_report_revision END, accepted_snapshot_hash = CASE WHEN ? = 'accepted' THEN ? ELSE accepted_snapshot_hash END, updated_at = ? WHERE id = ? AND workspace_id = ? AND EXISTS (SELECT 1 FROM monthly_closing_shares s WHERE s.id = ? AND s.decision = ? AND s.decided_at = ?)").bind(decision, decision, note, nowIso, decision, share.report_revision, decision, share.snapshot_hash, nowIso, share.cycle_id, share.workspace_id, share.id, decision, nowIso),
      env.DB.prepare("INSERT INTO monthly_closing_events (id, cycle_id, workspace_id, actor_type, actor_user_id, event_type, event_data_json, created_at) SELECT ?, ?, ?, 'client', NULL, ?, ?, ? WHERE EXISTS (SELECT 1 FROM monthly_closing_shares s WHERE s.id = ? AND s.decision = ? AND s.decided_at = ?)").bind(crypto.randomUUID(), share.cycle_id, share.workspace_id, `client.${decision}`, JSON.stringify({ note, revision: share.report_revision, snapshotHash: share.snapshot_hash }), nowIso, share.id, decision, nowIso),
    ]);
    if (result[0].meta.changes !== 1) return Response.json({ error: "A entrega recebeu outra decisão antes desta confirmação." }, { status: 409 });
    return Response.json({ decision, decidedAt: nowIso });
  } catch { return Response.json({ error: "Não foi possível registrar a decisão." }, { status: 500 }); }
}

export const GET = withApiTelemetry("GET /api/monthly-closing/client", readShare);
export const POST = withApiTelemetry("POST /api/monthly-closing/client", decideShare);

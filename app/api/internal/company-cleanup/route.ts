import { env } from "cloudflare:workers";
import { ensureScenarioSchema } from "../../../../db";

type MaintenanceEnvironment = { MAINTENANCE_TOKEN?: string };

type TargetCompany = {
  id: number;
  name: string;
  createdAt: string;
  workspaceId: number;
  ownerUserId: number;
  companyCount: number;
};

function maintenanceAuthorized(request: Request) {
  const configured = String((env as unknown as MaintenanceEnvironment).MAINTENANCE_TOKEN ?? "");
  const supplied = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!configured || configured.length < 48 || configured.length !== supplied.length) return false;
  let difference = 0;
  for (let index = 0; index < configured.length; index += 1) difference |= configured.charCodeAt(index) ^ supplied.charCodeAt(index);
  return difference === 0;
}

async function targetCompany(email: string) {
  return env.DB.prepare(`
    SELECT c.id, c.name, c.created_at AS createdAt, w.id AS workspaceId, u.id AS ownerUserId,
      (SELECT COUNT(*) FROM companies portfolio WHERE portfolio.workspace_id = w.id) AS companyCount
    FROM users u
    INNER JOIN accounting_workspaces w ON w.owner_user_id = u.id
    INNER JOIN companies c ON c.workspace_id = w.id
    WHERE lower(u.email) = lower(?)
      AND c.id = (
        SELECT ordered.id FROM companies ordered
        WHERE ordered.workspace_id = w.id
        ORDER BY datetime(ordered.created_at) ASC, ordered.id ASC
        LIMIT 1 OFFSET 10
      )
    LIMIT 1
  `).bind(email).first<TargetCompany>();
}

async function dependencyCounts(companyId: number) {
  const row = await env.DB.prepare(`
    SELECT
      (SELECT COUNT(*) FROM scenarios WHERE company_id = ?) AS scenarios,
      (SELECT COUNT(*) FROM report_shares WHERE company_id = ?) AS reportShares,
      (SELECT COUNT(*) FROM fiscal_dossiers WHERE company_id = ?) AS fiscalDossiers,
      (SELECT COUNT(*) FROM fiscal_documents WHERE company_id = ? OR dossier_id IN (SELECT id FROM fiscal_dossiers WHERE company_id = ?)) AS fiscalDocuments,
      (SELECT COUNT(*) FROM tax_periods WHERE company_id = ?) AS taxPeriods
  `).bind(companyId, companyId, companyId, companyId, companyId, companyId).first<Record<string, number>>();
  return row ?? {};
}

export async function POST(request: Request) {
  if (!maintenanceAuthorized(request)) return Response.json({ error: "Not found." }, { status: 404 });
  try {
    await ensureScenarioSchema();
    const payload = await request.json() as Record<string, unknown>;
    const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
    const action = payload.action === "delete" ? "delete" : "inspect";
    if (email !== "teste@teste.com") return Response.json({ error: "Maintenance target rejected." }, { status: 400 });
    const target = await targetCompany(email);
    if (!target) return Response.json({ target: null, message: "The requested eleventh company does not exist." }, { status: 404 });
    const dependencies = await dependencyCounts(target.id);
    if (action === "inspect") return Response.json({ target, dependencies });

    const expectedCompanyId = Number(payload.expectedCompanyId);
    if (!Number.isInteger(expectedCompanyId) || expectedCompanyId !== target.id || target.companyCount !== 11) {
      return Response.json({ error: "The portfolio changed after inspection; cleanup was aborted.", target, dependencies }, { status: 409 });
    }

    const now = new Date().toISOString();
    const d1 = env.DB;
    const results = await d1.batch([
      d1.prepare("DELETE FROM report_shares WHERE company_id = ?").bind(target.id),
      d1.prepare("DELETE FROM scenario_review_comments WHERE scenario_id IN (SELECT id FROM scenarios WHERE company_id = ?)").bind(target.id),
      d1.prepare("DELETE FROM scenario_review_rounds WHERE company_id = ? OR scenario_id IN (SELECT id FROM scenarios WHERE company_id = ?)").bind(target.id, target.id),
      d1.prepare("DELETE FROM scenario_approvals WHERE company_id = ? OR scenario_id IN (SELECT id FROM scenarios WHERE company_id = ?)").bind(target.id, target.id),
      d1.prepare("DELETE FROM audit_events WHERE company_id = ? OR scenario_id IN (SELECT id FROM scenarios WHERE company_id = ?)").bind(target.id, target.id),
      d1.prepare("DELETE FROM scenarios WHERE company_id = ?").bind(target.id),
      d1.prepare("DELETE FROM fiscal_document_events WHERE document_id IN (SELECT id FROM fiscal_documents WHERE company_id = ? OR dossier_id IN (SELECT id FROM fiscal_dossiers WHERE company_id = ?))").bind(target.id, target.id),
      d1.prepare("DELETE FROM fiscal_documents WHERE company_id = ? OR dossier_id IN (SELECT id FROM fiscal_dossiers WHERE company_id = ?)").bind(target.id, target.id),
      d1.prepare("DELETE FROM fiscal_dossier_events WHERE dossier_id IN (SELECT id FROM fiscal_dossiers WHERE company_id = ?)").bind(target.id),
      d1.prepare("DELETE FROM fiscal_dossiers WHERE company_id = ?").bind(target.id),
      d1.prepare("DELETE FROM tax_period_closures WHERE period_id IN (SELECT id FROM tax_periods WHERE company_id = ?)").bind(target.id),
      d1.prepare("DELETE FROM tax_reconciliation_snapshots WHERE period_id IN (SELECT id FROM tax_periods WHERE company_id = ?)").bind(target.id),
      d1.prepare("DELETE FROM tax_ledger_entries WHERE period_id IN (SELECT id FROM tax_periods WHERE company_id = ?)").bind(target.id),
      d1.prepare("DELETE FROM tax_periods WHERE company_id = ?").bind(target.id),
      d1.prepare("DELETE FROM companies WHERE id = ? AND workspace_id = ?").bind(target.id, target.workspaceId),
      d1.prepare("INSERT INTO audit_events (owner_user_id, company_id, scenario_id, event_type, event_data, created_at) VALUES (?, NULL, NULL, 'company.maintenance_deleted', ?, ?)").bind(target.ownerUserId, JSON.stringify({ companyId: target.id, ordinal: 11, reason: "owner_requested_plan_limit_cleanup" }), now),
    ]);
    if (results[14].meta.changes !== 1) return Response.json({ error: "Cleanup did not remove the expected company." }, { status: 409 });
    const remaining = await d1.prepare("SELECT COUNT(*) AS total FROM companies WHERE workspace_id = ?").bind(target.workspaceId).first<{ total: number }>();
    return Response.json({ deleted: { id: target.id, name: target.name, createdAt: target.createdAt }, removedDependencies: dependencies, remainingCompanies: Number(remaining?.total ?? 0) });
  } catch (error) {
    console.error(JSON.stringify({ event: "maintenance.company_cleanup_failed", message: error instanceof Error ? error.message : "unknown" }));
    return Response.json({ error: "Maintenance cleanup failed." }, { status: 500 });
  }
}

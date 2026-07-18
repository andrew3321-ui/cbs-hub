import { asc, eq, inArray, max } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { ensureScenarioSchema, getDb } from "../../../db";
import { companies, scenarioApprovals, scenarios } from "../../../db/schema";
import { getCurrentUser } from "../../auth";
import { scenarioApprovalSummary } from "../../scenario-approval";
import { signedRecordFromScenario, verifyScenarioRecord } from "../../scenario-signing";
import { withApiTelemetry } from "../../api-infrastructure";
import { canPrepareScenarios, getWorkspaceContext } from "../../workspace";
import { companyLimitResponse, getWorkspaceEntitlements } from "../../plan-entitlements";

const allowedRegimes = new Set(["Simples Nacional", "Lucro Presumido", "Lucro Real", "MEI"]);

async function getCompanies() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para acessar sua carteira." }, { status: 401 });
  try {
    await ensureScenarioSchema();
    const workspace = await getWorkspaceContext(user.id);
    if (!workspace) return Response.json({ error: "Espaço profissional não encontrado." }, { status: 403 });
    const db = getDb();
    const latestScenarioIds = db.select({ companyId: scenarios.companyId, scenarioId: max(scenarios.id).as("scenario_id") }).from(scenarios).groupBy(scenarios.companyId).as("latest_scenario_ids");
    const rows = await db.select({ company: companies, latestScenario: scenarios }).from(companies).leftJoin(latestScenarioIds, eq(companies.id, latestScenarioIds.companyId)).leftJoin(scenarios, eq(scenarios.id, latestScenarioIds.scenarioId)).where(eq(companies.workspaceId, workspace.id)).orderBy(asc(companies.name));
    const latestScenarioIdList = rows.flatMap(({ latestScenario }) => latestScenario ? [latestScenario.id] : []);
    const approvalRows = latestScenarioIdList.length ? await db.select().from(scenarioApprovals).where(inArray(scenarioApprovals.scenarioId, latestScenarioIdList)) : [];
    const approvalByScenario = new Map(approvalRows.map((approval) => [approval.scenarioId, approval]));
    const enriched = await Promise.all(rows.map(async ({ company, latestScenario }) => {
      if (!latestScenario) return { ...company, latestScenario: null };
      const { recordSignature, ...publicScenario } = latestScenario;
      const approval = await scenarioApprovalSummary(approvalByScenario.get(latestScenario.id));
      if (latestScenario.calculationVersion === "legacy") return { ...company, latestScenario: { ...publicScenario, integrityStatus: "legacy", approval } };
      const signedRecord = signedRecordFromScenario(latestScenario, workspace.ownerUserId);
      const integrityStatus = signedRecord && await verifyScenarioRecord(signedRecord, recordSignature, latestScenario.signatureVersion) ? "verified" : "invalid";
      return { ...company, latestScenario: { ...publicScenario, integrityStatus, approval } };
    }));
    const entitlements = await getWorkspaceEntitlements(workspace);
    return Response.json({ companies: enriched, entitlements });
  } catch {
    return Response.json({ error: "Não foi possível carregar a carteira." }, { status: 500 });
  }
}

async function createCompany(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para cadastrar empresas." }, { status: 401 });
  try {
    await ensureScenarioSchema();
    const workspace = await getWorkspaceContext(user.id);
    if (!workspace || !canPrepareScenarios(workspace.role)) return Response.json({ error: "Seu papel não permite cadastrar clientes." }, { status: 403 });
    const payload = (await request.json()) as Record<string, unknown>;
    const name = typeof payload.name === "string" ? payload.name.trim().slice(0, 100) : "";
    const cnpj = typeof payload.cnpj === "string" ? payload.cnpj.replace(/\D/g, "").slice(0, 14) : "";
    const taxRegime = typeof payload.taxRegime === "string" ? payload.taxRegime : "";
    const sector = typeof payload.sector === "string" ? payload.sector.trim().slice(0, 80) : "";

    if (!name || !allowedRegimes.has(taxRegime) || !sector || (cnpj && cnpj.length !== 14)) {
      return Response.json({ error: "Revise os dados da empresa." }, { status: 400 });
    }

    const entitlements = await getWorkspaceEntitlements(workspace);
    if (!entitlements.canCreateCompany) return companyLimitResponse(entitlements);

    const company = await env.DB.prepare(`
      INSERT INTO companies (name, cnpj, tax_regime, sector, owner_user_id, workspace_id)
      SELECT ?, ?, ?, ?, ?, ?
      WHERE (SELECT COUNT(*) FROM companies WHERE workspace_id = ?) < ?
      RETURNING id, name, cnpj, tax_regime AS taxRegime, sector, owner_user_id AS ownerUserId, workspace_id AS workspaceId, created_at AS createdAt
    `).bind(name, cnpj || null, taxRegime, sector, workspace.ownerUserId, workspace.id, workspace.id, entitlements.companyLimit).first<{
      id: number;
      name: string;
      cnpj: string | null;
      taxRegime: string;
      sector: string;
      ownerUserId: number;
      workspaceId: number;
      createdAt: string;
    }>();
    if (!company) return companyLimitResponse(await getWorkspaceEntitlements(workspace));
    return Response.json({ company: { ...company, latestScenario: null }, entitlements: await getWorkspaceEntitlements(workspace) }, { status: 201 });
  } catch {
    return Response.json({ error: "Não foi possível cadastrar a empresa." }, { status: 500 });
  }
}

export const GET = withApiTelemetry("GET /api/companies", getCompanies);
export const POST = withApiTelemetry("POST /api/companies", createCompany);

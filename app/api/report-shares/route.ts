import { and, desc, eq, isNull } from "drizzle-orm";
import { getCurrentUser } from "../../auth";
import { ensureScenarioSchema, getDb } from "../../../db";
import { auditEvents, companies, reportShares, scenarioApprovals, scenarios } from "../../../db/schema";
import { approvalRecordFromStored } from "../../scenario-approval-core";
import { signedRecordFromScenario, verifyScenarioApprovalRecord, verifyScenarioRecord } from "../../scenario-signing";
import { withApiTelemetry } from "../../api-infrastructure";
import { canPrepareScenarios, getWorkspaceContext } from "../../workspace";

function secureToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function getReportShares(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para acessar os compartilhamentos." }, { status: 401 });
  try {
    await ensureScenarioSchema();
    const workspace = await getWorkspaceContext(user.id);
    if (!workspace) return Response.json({ error: "Espaço profissional não encontrado." }, { status: 403 });
    const companyId = Number(new URL(request.url).searchParams.get("companyId"));
    if (!Number.isInteger(companyId) || companyId <= 0) return Response.json({ error: "Empresa inválida." }, { status: 400 });
    const db = getDb();
    const [ownedCompany] = await db.select({ id: companies.id }).from(companies).where(and(eq(companies.id, companyId), eq(companies.workspaceId, workspace.id))).limit(1);
    if (!ownedCompany) return Response.json({ error: "Empresa não encontrada." }, { status: 404 });

    const rows = await db.select({ id: reportShares.id, token: reportShares.token, scenarioId: reportShares.scenarioId, scenarioName: scenarios.name, companyId: reportShares.companyId, note: reportShares.note, expiresAt: reportShares.expiresAt, revokedAt: reportShares.revokedAt, views: reportShares.views, lastViewedAt: reportShares.lastViewedAt, createdAt: reportShares.createdAt }).from(reportShares).innerJoin(scenarios, eq(reportShares.scenarioId, scenarios.id)).where(and(eq(reportShares.companyId, companyId), eq(reportShares.ownerUserId, workspace.ownerUserId))).orderBy(desc(reportShares.createdAt)).limit(30);
    const origin = new URL(request.url).origin;
    return Response.json({ shares: rows.map((row) => ({ ...row, url: `${origin}/relatorio/${row.token}` })) });
  } catch {
    return Response.json({ error: "Não foi possível carregar os links compartilhados." }, { status: 500 });
  }
}

async function createReportShare(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para compartilhar relatórios." }, { status: 401 });
  try {
    await ensureScenarioSchema();
    const workspace = await getWorkspaceContext(user.id);
    if (!workspace || !canPrepareScenarios(workspace.role)) return Response.json({ error: "Seu papel não permite entregar relatórios." }, { status: 403 });
    const payload = (await request.json()) as Record<string, unknown>;
    const scenarioId = Number(payload.scenarioId);
    const expiryDays = [7, 30, 90].includes(Number(payload.expiryDays)) ? Number(payload.expiryDays) : 30;
    const note = typeof payload.note === "string" ? payload.note.trim().slice(0, 240) : "";
    if (!Number.isInteger(scenarioId) || scenarioId <= 0) return Response.json({ error: "Cenário inválido." }, { status: 400 });

    const db = getDb();
    const [owned] = await db.select({ scenario: scenarios, approval: scenarioApprovals }).from(scenarios).innerJoin(companies, eq(scenarios.companyId, companies.id)).leftJoin(scenarioApprovals, eq(scenarioApprovals.scenarioId, scenarios.id)).where(and(eq(scenarios.id, scenarioId), eq(companies.workspaceId, workspace.id))).limit(1);
    const ownedScenario = owned?.scenario;
    if (!ownedScenario) return Response.json({ error: "Cenário não encontrado." }, { status: 404 });
    if (!["responsible_approved", "delivered"].includes(ownedScenario.reviewStatus) || !ownedScenario.snapshotJson || !ownedScenario.inputHash || !owned.approval) return Response.json({ error: "A revisão do responsável técnico deve ser concluída antes da entrega ao cliente." }, { status: 409 });
    const signedRecord = signedRecordFromScenario(ownedScenario, workspace.ownerUserId);
    if (!signedRecord || !(await verifyScenarioRecord(signedRecord, ownedScenario.recordSignature, ownedScenario.signatureVersion))) return Response.json({ error: "A assinatura de integridade deste cenário não confere. O compartilhamento foi bloqueado." }, { status: 409 });
    const approvalRecord = approvalRecordFromStored(owned.approval);
    if (!approvalRecord || !(await verifyScenarioApprovalRecord(approvalRecord, owned.approval.approvalSignature, owned.approval.signatureVersion))) return Response.json({ error: "A assinatura da revisão responsável não confere. A entrega foi bloqueada." }, { status: 409 });

    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();
    const token = secureToken();
    const [, shareRows] = await db.batch([
      db.update(reportShares).set({ revokedAt: now }).where(and(eq(reportShares.scenarioId, scenarioId), eq(reportShares.ownerUserId, workspace.ownerUserId), isNull(reportShares.revokedAt))),
      db.insert(reportShares).values({ token, scenarioId, companyId: ownedScenario.companyId, ownerUserId: workspace.ownerUserId, note: note || null, expiresAt }).returning(),
      db.update(scenarios).set({ reviewStatus: "delivered" }).where(eq(scenarios.id, scenarioId)),
      db.insert(auditEvents).values({ ownerUserId: workspace.ownerUserId, companyId: ownedScenario.companyId, scenarioId, eventType: "report_share.created", eventData: JSON.stringify({ actorUserId: user.id, approvalId: owned.approval.id, assuranceLevel: owned.approval.assuranceLevel, expiresAt, inputHash: ownedScenario.inputHash, calculationVersion: ownedScenario.calculationVersion }) }),
    ]);
    const share = shareRows[0];
    if (!share) throw new Error("report_share_insert_failed");
    return Response.json({ share: { ...share, url: `${new URL(request.url).origin}/relatorio/${share.token}` }, scenarioReviewStatus: "delivered" }, { status: 201 });
  } catch {
    return Response.json({ error: "Não foi possível gerar o link agora." }, { status: 500 });
  }
}

async function revokeReportShare(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para revogar links." }, { status: 401 });
  try {
    await ensureScenarioSchema();
    const workspace = await getWorkspaceContext(user.id);
    if (!workspace || !canPrepareScenarios(workspace.role)) return Response.json({ error: "Seu papel não permite revogar relatórios." }, { status: 403 });
    const id = Number(new URL(request.url).searchParams.get("id"));
    if (!Number.isInteger(id) || id <= 0) return Response.json({ error: "Link inválido." }, { status: 400 });
    const db = getDb();
    const [ownedShare] = await db.select({ id: reportShares.id, companyId: reportShares.companyId, scenarioId: reportShares.scenarioId }).from(reportShares).where(and(eq(reportShares.id, id), eq(reportShares.ownerUserId, workspace.ownerUserId))).limit(1);
    if (!ownedShare) return Response.json({ error: "Link não encontrado." }, { status: 404 });
    const revokedAt = new Date().toISOString();
    await db.update(reportShares).set({ revokedAt }).where(eq(reportShares.id, id));
    await db.insert(auditEvents).values({ ownerUserId: workspace.ownerUserId, companyId: ownedShare.companyId, scenarioId: ownedShare.scenarioId, eventType: "report_share.revoked", eventData: JSON.stringify({ actorUserId: user.id, shareId: id, revokedAt }) });
    return Response.json({ revoked: true });
  } catch {
    return Response.json({ error: "Não foi possível revogar o link." }, { status: 500 });
  }
}

export const GET = withApiTelemetry("GET /api/report-shares", getReportShares);
export const POST = withApiTelemetry("POST /api/report-shares", createReportShare);
export const DELETE = withApiTelemetry("DELETE /api/report-shares", revokeReportShare);

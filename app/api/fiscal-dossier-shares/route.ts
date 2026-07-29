import { env } from "cloudflare:workers";
import { and, desc, eq } from "drizzle-orm";
import { isAutoPartsDossierSnapshot } from "../../../domain/auto-parts-dossier";
import { isColdBeverageDossierSnapshot } from "../../../domain/cold-beverage-dossier";
import { ensureScenarioSchema, getDb } from "../../../db";
import { fiscalDossierShares, fiscalDossiers } from "../../../db/schema";
import { withApiTelemetry } from "../../api-infrastructure";
import { getCurrentUser } from "../../auth";
import { canPrepareScenarios, getWorkspaceContext, sha256Hex } from "../../workspace";
import { publicAppOrigin, publicAppUrl } from "../../public-url";

function secureToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function validDossierId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value);
}

function clientReportSupported(snapshotJson: string) {
  try {
    const snapshot = JSON.parse(snapshotJson) as unknown;
    return isAutoPartsDossierSnapshot(snapshot) || isColdBeverageDossierSnapshot(snapshot);
  } catch {
    return false;
  }
}

async function getFiscalDossierShares(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para acessar os compartilhamentos." }, { status: 401 });
  try {
    await ensureScenarioSchema();
    const workspace = await getWorkspaceContext(user.id);
    if (!workspace) return Response.json({ error: "Espaço contábil não encontrado." }, { status: 403 });
    const dossierId = new URL(request.url).searchParams.get("dossierId");
    if (!validDossierId(dossierId)) return Response.json({ error: "Dossiê inválido." }, { status: 400 });
    const db = getDb();
    const [dossier] = await db.select({ id: fiscalDossiers.id }).from(fiscalDossiers).where(and(eq(fiscalDossiers.id, dossierId), eq(fiscalDossiers.workspaceId, workspace.id))).limit(1);
    if (!dossier) return Response.json({ error: "Dossiê não encontrado." }, { status: 404 });
    const shares = await db.select().from(fiscalDossierShares).where(and(eq(fiscalDossierShares.dossierId, dossierId), eq(fiscalDossierShares.workspaceId, workspace.id))).orderBy(desc(fiscalDossierShares.createdAt), desc(fiscalDossierShares.id)).limit(20);
    const runtime = env as unknown as Record<string, unknown>;
    const origin = publicAppOrigin(request, runtime.PUBLIC_APP_URL);
    const now = Date.now();
    return Response.json({ shares: shares.map((share) => ({ ...share, active: !share.revokedAt && new Date(share.expiresAt).getTime() > now, url: `${origin}/dossie/${share.token}` })) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Não foi possível carregar os links do dossiê." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}

async function createFiscalDossierShare(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para entregar o dossiê." }, { status: 401 });
  try {
    await ensureScenarioSchema();
    const workspace = await getWorkspaceContext(user.id);
    if (!workspace || !canPrepareScenarios(workspace.role)) return Response.json({ error: "Seu papel não permite entregar dossiês." }, { status: 403 });
    const payload = await request.json() as Record<string, unknown>;
    const dossierId = payload.dossierId;
    const expiryDays = [7, 30, 90].includes(Number(payload.expiryDays)) ? Number(payload.expiryDays) : 30;
    const note = typeof payload.note === "string" ? payload.note.trim().slice(0, 240) : "";
    if (!validDossierId(dossierId)) return Response.json({ error: "Dossiê inválido." }, { status: 400 });

    const db = getDb();
    const [dossier] = await db.select().from(fiscalDossiers).where(and(eq(fiscalDossiers.id, dossierId), eq(fiscalDossiers.workspaceId, workspace.id))).limit(1);
    if (!dossier) return Response.json({ error: "Dossiê não encontrado." }, { status: 404 });
    if (dossier.status !== "approved" || !dossier.decisionByUserId || !dossier.decidedAt || !dossier.professionalRegistration) {
      return Response.json({ error: "A revisão profissional precisa estar concluída antes da entrega ao cliente." }, { status: 409 });
    }
    if (await sha256Hex(dossier.snapshotJson) !== dossier.inputHash) {
      return Response.json({ error: "A integridade do snapshot não confere. O compartilhamento foi bloqueado." }, { status: 409 });
    }
    if (!clientReportSupported(dossier.snapshotJson)) {
      return Response.json({ error: "Este modelo de dossiê ainda não possui apresentação pública compatível." }, { status: 409 });
    }
    const openInvalidation = await env.DB.prepare(
      "SELECT id, reason FROM fiscal_result_invalidations WHERE dossier_id = ? AND workspace_id = ? AND status = 'open' ORDER BY created_at DESC LIMIT 1",
    ).bind(dossier.id, workspace.id).first<{ id: string; reason: string }>();
    if (openInvalidation) {
      return Response.json({
        error: "A entrega foi bloqueada porque uma fonte normativa ligada a este dossiê mudou e ainda aguarda revisão.",
        code: "FISCAL_RESULT_INVALIDATED",
        invalidationId: openInvalidation.id,
        reason: openInvalidation.reason,
      }, { status: 409 });
    }

    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + expiryDays * 86_400_000).toISOString();
    const token = secureToken();
    const results = await env.DB.batch([
      env.DB.prepare("UPDATE fiscal_dossier_shares SET revoked_at = ? WHERE dossier_id = ? AND workspace_id = ? AND revoked_at IS NULL").bind(now, dossier.id, workspace.id),
      env.DB.prepare("INSERT INTO fiscal_dossier_shares (token, dossier_id, workspace_id, owner_user_id, company_id, created_by_user_id, note, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(token, dossier.id, workspace.id, workspace.ownerUserId, dossier.companyId, user.id, note || null, expiresAt, now),
      env.DB.prepare("INSERT INTO fiscal_dossier_events (dossier_id, workspace_id, actor_user_id, event_type, note, event_data, created_at) VALUES (?, ?, ?, 'fiscal_dossier.share_created', ?, ?, ?)").bind(dossier.id, workspace.id, user.id, "Link público revogável criado para entrega ao cliente.", JSON.stringify({ expiresAt, inputHash: dossier.inputHash, reviewerUserId: dossier.decisionByUserId }), now),
    ]);
    if (results[1].meta.changes !== 1 || results[2].meta.changes !== 1) return Response.json({ error: "O compartilhamento não foi persistido integralmente." }, { status: 409 });
    const [share] = await db.select().from(fiscalDossierShares).where(eq(fiscalDossierShares.token, token)).limit(1);
    if (!share) throw new Error("fiscal_dossier_share_insert_failed");
    const runtime = env as unknown as Record<string, unknown>;
    return Response.json({ share: { ...share, active: true, url: publicAppUrl(`/dossie/${token}`, request, runtime.PUBLIC_APP_URL) } }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Não foi possível gerar o link do dossiê agora." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}

async function revokeFiscalDossierShare(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para revogar o link." }, { status: 401 });
  try {
    await ensureScenarioSchema();
    const workspace = await getWorkspaceContext(user.id);
    if (!workspace || !canPrepareScenarios(workspace.role)) return Response.json({ error: "Seu papel não permite revogar links." }, { status: 403 });
    const id = Number(new URL(request.url).searchParams.get("id"));
    if (!Number.isInteger(id) || id <= 0) return Response.json({ error: "Link inválido." }, { status: 400 });
    const db = getDb();
    const [share] = await db.select().from(fiscalDossierShares).where(and(eq(fiscalDossierShares.id, id), eq(fiscalDossierShares.workspaceId, workspace.id))).limit(1);
    if (!share) return Response.json({ error: "Link não encontrado." }, { status: 404 });
    if (share.revokedAt) return Response.json({ revoked: true, revokedAt: share.revokedAt });
    const revokedAt = new Date().toISOString();
    const results = await env.DB.batch([
      env.DB.prepare("UPDATE fiscal_dossier_shares SET revoked_at = ? WHERE id = ? AND workspace_id = ? AND revoked_at IS NULL").bind(revokedAt, share.id, workspace.id),
      env.DB.prepare("INSERT INTO fiscal_dossier_events (dossier_id, workspace_id, actor_user_id, event_type, note, event_data, created_at) VALUES (?, ?, ?, 'fiscal_dossier.share_revoked', ?, ?, ?)").bind(share.dossierId, workspace.id, user.id, "Link público do dossiê revogado.", JSON.stringify({ shareId: share.id, revokedAt }), revokedAt),
    ]);
    if (results[0].meta.changes !== 1 || results[1].meta.changes !== 1) return Response.json({ error: "O link mudou enquanto era revogado. Atualize a página." }, { status: 409 });
    return Response.json({ revoked: true, revokedAt });
  } catch {
    return Response.json({ error: "Não foi possível revogar o link agora." }, { status: 500 });
  }
}

export const GET = withApiTelemetry("GET /api/fiscal-dossier-shares", getFiscalDossierShares);
export const POST = withApiTelemetry("POST /api/fiscal-dossier-shares", createFiscalDossierShare);
export const DELETE = withApiTelemetry("DELETE /api/fiscal-dossier-shares", revokeFiscalDossierShare);

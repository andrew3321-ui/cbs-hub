import { env } from "cloudflare:workers";
import { and, desc, eq, inArray } from "drizzle-orm";
import { createFiscalDossierSnapshot, parseFiscalCalculationInputs, type FiscalDossierSnapshot } from "../../../domain/fiscal-dossier";
import { evaluateFiscalQuestion } from "../../../domain/fiscal-intelligence";
import { ensureScenarioSchema, getDb } from "../../../db";
import { companies, fiscalDossierEvents, fiscalDossiers, users, workspaceMembers } from "../../../db/schema";
import { withApiTelemetry } from "../../api-infrastructure";
import { getCurrentUser } from "../../auth";
import { loadFiscalKnowledgeBase, parseFiscalOverrides } from "../../fiscal-intelligence-service";
import { canPrepareScenarios, canReviewScenarios, getWorkspaceContext } from "../../workspace";

function safeJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

async function dossierResponseRows(workspaceId: number) {
  const db = getDb();
  const dossiers = await db.select().from(fiscalDossiers).where(eq(fiscalDossiers.workspaceId, workspaceId)).orderBy(desc(fiscalDossiers.createdAt), desc(fiscalDossiers.id)).limit(30);
  const userIds = Array.from(new Set(dossiers.flatMap((dossier) => [dossier.createdByUserId, dossier.assignedReviewerUserId, dossier.decisionByUserId]).filter((id): id is number => Number.isInteger(id))));
  const people = userIds.length ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, userIds)) : [];
  const names = new Map(people.map((person) => [person.id, person.name]));
  const dossierIds = dossiers.map((dossier) => dossier.id);
  const events = dossierIds.length ? await db.select().from(fiscalDossierEvents).where(inArray(fiscalDossierEvents.dossierId, dossierIds)).orderBy(desc(fiscalDossierEvents.createdAt), desc(fiscalDossierEvents.id)).limit(120) : [];
  const eventsByDossier = new Map<string, typeof events>();
  for (const event of events) eventsByDossier.set(event.dossierId, [...(eventsByDossier.get(event.dossierId) ?? []), event]);
  return dossiers.map((dossier) => ({
    ...dossier,
    snapshot: safeJson<FiscalDossierSnapshot | null>(dossier.snapshotJson, null),
    createdByName: names.get(dossier.createdByUserId) ?? "Profissional",
    assignedReviewerName: dossier.assignedReviewerUserId ? names.get(dossier.assignedReviewerUserId) ?? "Revisor" : null,
    decisionByName: dossier.decisionByUserId ? names.get(dossier.decisionByUserId) ?? "Responsável" : null,
    events: (eventsByDossier.get(dossier.id) ?? []).map((event) => ({ ...event, eventData: safeJson<Record<string, unknown>>(event.eventData, {}) })),
  }));
}

async function getFiscalDossiers() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para acessar os dossiês fiscais." }, { status: 401 });
  try {
    await ensureScenarioSchema();
    const workspace = await getWorkspaceContext(user.id);
    if (!workspace) return Response.json({ error: "Espaço contábil não encontrado." }, { status: 403 });
    const db = getDb();
    const eligibleReviewers = workspace.type === "office" ? await db.select({ userId: users.id, name: users.name, role: workspaceMembers.role }).from(workspaceMembers).innerJoin(users, eq(workspaceMembers.userId, users.id)).where(and(eq(workspaceMembers.workspaceId, workspace.id), eq(workspaceMembers.status, "active"), inArray(workspaceMembers.role, ["owner", "admin", "reviewer"]))) : [];
    const dossiers = await dossierResponseRows(workspace.id);
    return Response.json({
      dossiers,
      eligibleReviewers,
      context: {
        currentUserId: user.id,
        currentUserName: user.name,
        workspaceType: workspace.type,
        role: workspace.role,
        canPrepare: canPrepareScenarios(workspace.role),
        canReview: canReviewScenarios(workspace.role),
      },
      metrics: {
        total: dossiers.length,
        awaitingReview: dossiers.filter((dossier) => dossier.status === "ready_for_review").length,
        approved: dossiers.filter((dossier) => dossier.status === "approved").length,
        blocked: dossiers.filter((dossier) => dossier.snapshot?.calculation.status === "needs_information").length,
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Não foi possível carregar a fila de dossiês." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}

async function createFiscalDossier(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para criar um dossiê fiscal." }, { status: 401 });
  let payload: Record<string, unknown>;
  try {
    payload = await request.json() as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Envie os dados do dossiê em formato válido." }, { status: 400 });
  }
  const question = typeof payload.question === "string" ? payload.question.trim() : "";
  if (question.length < 5 || question.length > 500) return Response.json({ error: "A pergunta deve ter entre 5 e 500 caracteres." }, { status: 400 });
  try {
    await ensureScenarioSchema();
    const workspace = await getWorkspaceContext(user.id);
    if (!workspace || !canPrepareScenarios(workspace.role)) return Response.json({ error: "Seu papel não permite criar dossiês fiscais." }, { status: 403 });
    const facts = parseFiscalOverrides(payload.facts);
    const calculationInputs = parseFiscalCalculationInputs(payload.calculation);
    const companyId = payload.companyId === undefined || payload.companyId === null ? null : Number(payload.companyId);
    if (companyId !== null && (!Number.isInteger(companyId) || companyId <= 0)) return Response.json({ error: "Cliente inválido." }, { status: 400 });
    if (companyId !== null) {
      const [company] = await getDb().select({ id: companies.id }).from(companies).where(and(eq(companies.id, companyId), eq(companies.workspaceId, workspace.id))).limit(1);
      if (!company) return Response.json({ error: "O cliente não pertence a este espaço contábil." }, { status: 404 });
    }
    const { stored, definition } = await loadFiscalKnowledgeBase();
    const now = new Date().toISOString();
    const determination = evaluateFiscalQuestion(question, facts, now.slice(0, 10), definition);
    const { snapshot, inputHash } = await createFiscalDossierSnapshot(question, determination, calculationInputs, now);
    const [existing] = await getDb().select({ id: fiscalDossiers.id }).from(fiscalDossiers).where(and(eq(fiscalDossiers.workspaceId, workspace.id), eq(fiscalDossiers.inputHash, inputHash))).limit(1);
    if (existing) {
      const dossiers = await dossierResponseRows(workspace.id);
      return Response.json({ dossier: dossiers.find((dossier) => dossier.id === existing.id), idempotent: true });
    }
    const id = crypto.randomUUID();
    const eventData = JSON.stringify({ inputHash, baseCode: stored.code, baseVersion: stored.version, engineVersion: snapshot.engineVersion, calculationStatus: snapshot.calculation.status });
    const results = await env.DB.batch([
      env.DB.prepare("INSERT INTO fiscal_dossiers (id, workspace_id, owner_user_id, company_id, created_by_user_id, title, question, status, base_code, base_version, engine_version, facts_json, calculation_input_json, snapshot_json, input_hash, review_note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, '', ?, ?)").bind(id, workspace.id, workspace.ownerUserId, companyId, user.id, snapshot.title, question, stored.code, stored.version, snapshot.engineVersion, JSON.stringify(facts), JSON.stringify(calculationInputs), JSON.stringify(snapshot), inputHash, now, now),
      env.DB.prepare("INSERT INTO fiscal_dossier_events (dossier_id, workspace_id, actor_user_id, event_type, note, event_data, created_at) SELECT id, workspace_id, ?, 'fiscal_dossier.created', 'Snapshot imutável criado pelo motor fiscal.', ?, ? FROM fiscal_dossiers WHERE id = ?").bind(user.id, eventData, now, id),
    ]);
    if (results[0].meta.changes !== 1 || results[1].meta.changes !== 1) return Response.json({ error: "O dossiê não foi persistido integralmente." }, { status: 409 });
    const dossiers = await dossierResponseRows(workspace.id);
    return Response.json({ dossier: dossiers.find((dossier) => dossier.id === id), idempotent: false }, { status: 201 });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "";
    if (message.startsWith("invalid_")) return Response.json({ error: "Revise os valores, alíquotas e premissas do cálculo." }, { status: 400 });
    return Response.json({ error: "O dossiê foi bloqueado porque não passou em todos os controles." }, { status: 503 });
  }
}

export const GET = withApiTelemetry("GET /api/fiscal-dossiers", getFiscalDossiers);
export const POST = withApiTelemetry("POST /api/fiscal-dossiers", createFiscalDossier);

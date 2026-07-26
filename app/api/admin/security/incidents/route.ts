import { desc, eq } from "drizzle-orm";
import { ensureScenarioSchema, getDb } from "../../../../../db";
import { securityIncidentEvents, securityIncidents } from "../../../../../db/schema";
import { withApiTelemetry } from "../../../../api-infrastructure";
import { correlationId } from "../../../../security-governance";
import { getPlatformAdminUser } from "../../../../platform-admin";

const severities = ["critical", "high", "medium", "low"] as const;
const categories = ["account_takeover", "data_exposure", "malware", "availability", "payment", "other"] as const;
const statuses = ["open", "investigating", "contained", "resolved"] as const;
const notificationDecisions = ["pending_assessment", "required", "not_required", "completed"] as const;

function cleanText(value: unknown, maximum: number) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, maximum) : "";
}

function oneOf<T extends readonly string[]>(value: unknown, allowed: T): T[number] | null {
  return allowed.includes(String(value) as T[number]) ? String(value) as T[number] : null;
}

function id() {
  return crypto.randomUUID();
}

function retentionFrom(date: Date) {
  return new Date(date.getTime() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString();
}

async function requireAdmin() {
  const admin = await getPlatformAdminUser();
  return admin ?? null;
}

async function listIncidents() {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Área restrita ao administrador da plataforma." }, { status: 403 });
  await ensureScenarioSchema();
  const db = getDb();
  const [incidents, events] = await Promise.all([
    db.select().from(securityIncidents).orderBy(desc(securityIncidents.detectedAt), desc(securityIncidents.id)).limit(200),
    db.select().from(securityIncidentEvents).orderBy(desc(securityIncidentEvents.createdAt), desc(securityIncidentEvents.id)).limit(1000),
  ]);
  return Response.json({
    incidents,
    events: events.map((event) => {
      try { return { ...event, details: JSON.parse(event.detailsJson) as Record<string, unknown>, detailsJson: undefined }; }
      catch { return { ...event, details: {}, detailsJson: undefined }; }
    }),
  }, { headers: { "Cache-Control": "no-store" } });
}

async function createIncident(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Área restrita ao administrador da plataforma." }, { status: 403 });
  try {
    await ensureScenarioSchema();
    const body = await request.json() as Record<string, unknown>;
    const severity = oneOf(body.severity, severities);
    const category = oneOf(body.category, categories);
    const summary = cleanText(body.summary, 240);
    const impactSummary = cleanText(body.impactSummary, 1000);
    const detectedAt = new Date(String(body.detectedAt ?? new Date().toISOString()));
    if (!severity || !category || summary.length < 8 || !Number.isFinite(detectedAt.getTime())) return Response.json({ error: "Informe severidade, categoria, resumo e data válidos." }, { status: 400 });
    const incidentId = id();
    const eventId = id();
    const requestId = correlationId(request);
    const now = new Date().toISOString();
    const personalDataInvolved = body.personalDataInvolved === true;
    await getDb().batch([
      getDb().insert(securityIncidents).values({
        id: incidentId,
        severity,
        category,
        status: "open",
        summary,
        impactSummary,
        personalDataInvolved,
        detectedAt: detectedAt.toISOString(),
        reportedByUserId: admin.id,
        requestId,
        createdAt: now,
        updatedAt: now,
        retainUntil: retentionFrom(detectedAt),
      }),
      getDb().insert(securityIncidentEvents).values({
        id: eventId,
        incidentId,
        actorUserId: admin.id,
        eventType: "incident.created",
        detailsJson: JSON.stringify({ severity, category, personalDataInvolved }),
        requestId,
        createdAt: now,
      }),
    ]);
    return Response.json({ created: true, incidentId }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Não foi possível registrar o incidente." }, { status: 500 });
  }
}

async function updateIncident(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Área restrita ao administrador da plataforma." }, { status: 403 });
  try {
    await ensureScenarioSchema();
    const body = await request.json() as Record<string, unknown>;
    const incidentId = cleanText(body.incidentId, 80);
    const status = oneOf(body.status, statuses);
    const authorityNotification = oneOf(body.authorityNotification, notificationDecisions);
    const dataSubjectNotification = oneOf(body.dataSubjectNotification, notificationDecisions);
    const note = cleanText(body.note, 1000);
    if (!incidentId || !status || !authorityNotification || !dataSubjectNotification || note.length < 3) return Response.json({ error: "Atualização do incidente incompleta." }, { status: 400 });
    const db = getDb();
    const [incident] = await db.select().from(securityIncidents).where(eq(securityIncidents.id, incidentId)).limit(1);
    if (!incident) return Response.json({ error: "Incidente não encontrado." }, { status: 404 });
    const now = new Date();
    const requestId = correlationId(request);
    await db.batch([
      db.update(securityIncidents).set({
        status,
        authorityNotification,
        dataSubjectNotification,
        containedAt: status === "contained" && !incident.containedAt ? now.toISOString() : incident.containedAt,
        resolvedAt: status === "resolved" ? now.toISOString() : incident.resolvedAt,
        retainUntil: status === "resolved" ? retentionFrom(now) : incident.retainUntil,
        updatedAt: now.toISOString(),
      }).where(eq(securityIncidents.id, incidentId)),
      db.insert(securityIncidentEvents).values({
        id: id(),
        incidentId,
        actorUserId: admin.id,
        eventType: `incident.${status}`,
        detailsJson: JSON.stringify({ note, previousStatus: incident.status, authorityNotification, dataSubjectNotification }),
        requestId,
        createdAt: now.toISOString(),
      }),
    ]);
    return Response.json({ updated: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Não foi possível atualizar o incidente." }, { status: 500 });
  }
}

export const GET = withApiTelemetry("GET /api/admin/security/incidents", listIncidents);
export const POST = withApiTelemetry("POST /api/admin/security/incidents", createIncident);
export const PATCH = withApiTelemetry("PATCH /api/admin/security/incidents", updateIncident);

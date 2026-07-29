import { and, desc, eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { ensureScenarioSchema, getDb } from "../../../db";
import { companies, supportTickets } from "../../../db/schema";
import {
  SUPPORT_CONSENT_VERSION,
  canTransitionSupportStatus,
  createSupportProtocol,
  isSupportCategory,
  isSupportModule,
  isSupportStatus,
  normalizeSupportText,
  supportResponseDueAt,
  supportTextHasSensitiveData,
  validSupportTraceCode,
} from "../../../domain/support-tickets";
import { withApiTelemetry } from "../../api-infrastructure";
import { getCurrentUser } from "../../auth";
import { isPlatformAdminEmail } from "../../platform-admin";
import { getWorkspaceContext } from "../../workspace";

type RuntimeMetadata = {
  CF_VERSION_METADATA?: { id?: unknown; tag?: unknown };
};

function noStore(body: unknown, init?: ResponseInit) {
  const response = Response.json(body, init);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

function correlationId(request: Request) {
  const supplied = request.headers.get("x-request-id") ?? "";
  return /^[0-9a-f-]{32,36}$/i.test(supplied) ? supplied : crypto.randomUUID();
}

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || new URL(origin).host === new URL(request.url).host;
}

function releaseMetadata() {
  const metadata = (env as unknown as RuntimeMetadata).CF_VERSION_METADATA ?? {};
  return {
    releaseId: typeof metadata.id === "string" ? metadata.id.slice(0, 100) : "local",
    releaseTag: typeof metadata.tag === "string" ? metadata.tag.slice(0, 100) : "unversioned",
  };
}

async function listSupportTickets() {
  const user = await getCurrentUser();
  if (!user) return noStore({ error: "Faça login para acessar o suporte." }, { status: 401 });
  await ensureScenarioSchema();
  const workspace = await getWorkspaceContext(user.id);
  if (!workspace) return noStore({ error: "Espaço profissional não encontrado." }, { status: 403 });

  const db = getDb();
  const visibility = isPlatformAdminEmail(user.email)
    ? undefined
    : and(eq(supportTickets.workspaceId, workspace.id), eq(supportTickets.reporterUserId, user.id));
  const rows = await db
    .select({ ticket: supportTickets, companyName: companies.name })
    .from(supportTickets)
    .leftJoin(companies, eq(supportTickets.companyId, companies.id))
    .where(visibility)
    .orderBy(desc(supportTickets.createdAt), desc(supportTickets.id))
    .limit(isPlatformAdminEmail(user.email) ? 200 : 60);

  return noStore({
    tickets: rows.map(({ ticket, companyName }) => ({ ...ticket, companyName: companyName ?? null })),
    permissions: { canManage: isPlatformAdminEmail(user.email) },
  });
}

async function createSupportTicket(request: Request) {
  const user = await getCurrentUser();
  if (!user) return noStore({ error: "Faça login para falar com o suporte." }, { status: 401 });
  if (!sameOrigin(request)) return noStore({ error: "Origem inválida." }, { status: 403 });
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 16_384) return noStore({ error: "A solicitação excede o limite permitido." }, { status: 413 });

  await ensureScenarioSchema();
  const workspace = await getWorkspaceContext(user.id);
  if (!workspace) return noStore({ error: "Espaço profissional não encontrado." }, { status: 403 });
  const payload = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!payload) return noStore({ error: "Solicitação inválida." }, { status: 400 });

  const category = payload.category;
  const moduleCode = payload.moduleCode;
  const subject = normalizeSupportText(payload.subject, 120);
  const description = normalizeSupportText(payload.description, 2_000);
  const traceCode = normalizeSupportText(payload.traceCode, 80).toUpperCase();
  const companyId = payload.companyId === null || payload.companyId === "" || payload.companyId === undefined
    ? null
    : Number(payload.companyId);

  if (!isSupportCategory(category) || !isSupportModule(moduleCode)) {
    return noStore({ error: "Escolha uma categoria e um módulo válidos." }, { status: 400 });
  }
  if (subject.length < 5 || description.length < 20) {
    return noStore({ error: "Informe um assunto e descreva o contexto com pelo menos 20 caracteres." }, { status: 400 });
  }
  if (payload.dataMinimizationAccepted !== true) {
    return noStore({ error: "Confirme que o relato não contém dados pessoais ou credenciais." }, { status: 400 });
  }
  if (supportTextHasSensitiveData(`${subject}\n${description}`)) {
    return noStore({ error: "Remova CPF, CNPJ, e-mail, token, senha ou chave do relato. Use apenas identificadores internos e o código de rastreio." }, { status: 400 });
  }
  if (!validSupportTraceCode(traceCode)) {
    return noStore({ error: "O código de rastreio deve conter somente letras, números e hífens." }, { status: 400 });
  }
  if (companyId !== null && (!Number.isInteger(companyId) || companyId <= 0)) {
    return noStore({ error: "Empresa inválida." }, { status: 400 });
  }

  if (companyId !== null) {
    const [company] = await getDb()
      .select({ id: companies.id })
      .from(companies)
      .where(and(eq(companies.id, companyId), eq(companies.workspaceId, workspace.id)))
      .limit(1);
    if (!company) return noStore({ error: "A empresa não pertence ao seu espaço profissional." }, { status: 404 });
  }

  const now = new Date();
  const id = crypto.randomUUID();
  const protocol = createSupportProtocol(now);
  const responseDueAt = supportResponseDueAt(now);
  const requestId = correlationId(request);
  const release = releaseMetadata();
  const nowIso = now.toISOString();
  const results = await env.DB.batch([
    env.DB.prepare(`
      INSERT INTO support_tickets (
        id, protocol, workspace_id, reporter_user_id, company_id, category, module_code,
        release_id, release_tag, trace_code, subject, description, consent_version,
        status, response_due_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?)
    `).bind(
      id, protocol, workspace.id, user.id, companyId, category, moduleCode,
      release.releaseId, release.releaseTag, traceCode || null, subject, description,
      SUPPORT_CONSENT_VERSION, responseDueAt, nowIso, nowIso,
    ),
    env.DB.prepare(`
      INSERT INTO support_ticket_events (
        id, ticket_id, actor_user_id, event_type, from_status, to_status, request_id, created_at
      ) VALUES (?, ?, ?, 'created', NULL, 'open', ?, ?)
    `).bind(crypto.randomUUID(), id, user.id, requestId, nowIso),
  ]);
  if (results[0].meta.changes !== 1 || results[1].meta.changes !== 1) {
    throw new Error("SupportTicketAtomicInsertFailed");
  }

  return noStore({
    ticket: {
      id,
      protocol,
      workspaceId: workspace.id,
      reporterUserId: user.id,
      companyId,
      companyName: null,
      category,
      moduleCode,
      ...release,
      traceCode: traceCode || null,
      subject,
      description,
      consentVersion: SUPPORT_CONSENT_VERSION,
      status: "open",
      responseDueAt,
      resolvedAt: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  }, { status: 201 });
}

async function updateSupportTicket(request: Request) {
  const user = await getCurrentUser();
  if (!user) return noStore({ error: "Faça login para atualizar o suporte." }, { status: 401 });
  if (!isPlatformAdminEmail(user.email)) return noStore({ error: "Apenas a equipe responsável pode atualizar chamados." }, { status: 403 });
  if (!sameOrigin(request)) return noStore({ error: "Origem inválida." }, { status: 403 });

  await ensureScenarioSchema();
  const payload = await request.json().catch(() => null) as Record<string, unknown> | null;
  const ticketId = normalizeSupportText(payload?.ticketId, 80);
  const nextStatus = payload?.status;
  if (!ticketId || !isSupportStatus(nextStatus)) return noStore({ error: "Chamado ou status inválido." }, { status: 400 });

  const [ticket] = await getDb().select().from(supportTickets).where(eq(supportTickets.id, ticketId)).limit(1);
  if (!ticket || !isSupportStatus(ticket.status)) return noStore({ error: "Chamado não encontrado." }, { status: 404 });
  if (!canTransitionSupportStatus(ticket.status, nextStatus)) {
    return noStore({ error: "Transição de status não permitida." }, { status: 409 });
  }

  const now = new Date().toISOString();
  const resolvedAt = ["resolved", "closed"].includes(nextStatus) ? now : null;
  const requestId = correlationId(request);
  const results = await env.DB.batch([
    env.DB.prepare(`
      UPDATE support_tickets
      SET status = ?, resolved_at = ?, updated_at = ?
      WHERE id = ? AND status = ? AND updated_at = ?
    `).bind(nextStatus, resolvedAt, now, ticket.id, ticket.status, ticket.updatedAt),
    env.DB.prepare(`
      INSERT INTO support_ticket_events (
        id, ticket_id, actor_user_id, event_type, from_status, to_status, request_id, created_at
      )
      SELECT ?, id, ?, 'status_changed', ?, ?, ?, ?
      FROM support_tickets WHERE id = ? AND status = ? AND updated_at = ?
    `).bind(crypto.randomUUID(), user.id, ticket.status, nextStatus, requestId, now, ticket.id, nextStatus, now),
  ]);
  if (results[0].meta.changes !== 1 || results[1].meta.changes !== 1) {
    return noStore({ error: "O chamado mudou enquanto você trabalhava. Atualize a lista." }, { status: 409 });
  }

  return noStore({ ticket: { ...ticket, status: nextStatus, resolvedAt, updatedAt: now } });
}

export const GET = withApiTelemetry("GET /api/support-tickets", listSupportTickets);
export const POST = withApiTelemetry("POST /api/support-tickets", createSupportTicket);
export const PATCH = withApiTelemetry("PATCH /api/support-tickets", updateSupportTicket);

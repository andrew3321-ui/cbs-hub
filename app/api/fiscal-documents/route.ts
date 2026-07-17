import { env } from "cloudflare:workers";
import { and, desc, eq, inArray } from "drizzle-orm";
import type { FiscalDossierSnapshot } from "../../../domain/fiscal-dossier";
import { auditNfeXml, compareNfeToDossier, maskTaxId, NFE_AUDIT_PROFILE_VERSION, NFE_MAX_XML_BYTES, publicNfeAudit, type NfeDossierComparison } from "../../../domain/nfe-audit";
import { ensureScenarioSchema, getDb } from "../../../db";
import { companies, fiscalDocumentEvents, fiscalDocuments, fiscalDossiers, users } from "../../../db/schema";
import { withApiTelemetry } from "../../api-infrastructure";
import { getCurrentUser } from "../../auth";
import { canPrepareScenarios, getWorkspaceContext, sha256Hex } from "../../workspace";

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function cleanText(value: string | null, maximum: number) {
  return value?.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, maximum) || null;
}

function cleanFilename(value: string) {
  const name = value.split(/[\\/]/).pop() ?? "documento.xml";
  return name.replace(/[^0-9A-Za-zÀ-ÿ._() -]/g, "_").replace(/\s+/g, " ").trim().slice(0, 120) || "documento.xml";
}

function decodeXml(bytes: Uint8Array) {
  const prefix = new TextDecoder("ascii").decode(bytes.slice(0, 160));
  const declared = prefix.match(/encoding=["']([^"']+)["']/i)?.[1]?.toLowerCase() ?? "utf-8";
  if (!["utf-8", "utf8"].includes(declared)) throw new Error("unsupported_xml_encoding");
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

function documentSummarySelect() {
  return {
    id: fiscalDocuments.id,
    companyId: fiscalDocuments.companyId,
    dossierId: fiscalDocuments.dossierId,
    filename: fiscalDocuments.filename,
    sourceHash: fiscalDocuments.sourceHash,
    accessKey: fiscalDocuments.accessKey,
    schemaVersion: fiscalDocuments.schemaVersion,
    profileVersion: fiscalDocuments.profileVersion,
    status: fiscalDocuments.status,
    authorizationCode: fiscalDocuments.authorizationCode,
    authorizationLabel: fiscalDocuments.authorizationLabel,
    issuedAt: fiscalDocuments.issuedAt,
    emitterName: fiscalDocuments.emitterName,
    emitterTaxIdMasked: fiscalDocuments.emitterTaxIdMasked,
    emitterState: fiscalDocuments.emitterState,
    recipientName: fiscalDocuments.recipientName,
    recipientTaxIdMasked: fiscalDocuments.recipientTaxIdMasked,
    recipientState: fiscalDocuments.recipientState,
    itemCount: fiscalDocuments.itemCount,
    totalProductCents: fiscalDocuments.totalProductCents,
    totalInvoiceCents: fiscalDocuments.totalInvoiceCents,
    uploadedByUserId: fiscalDocuments.uploadedByUserId,
    createdAt: fiscalDocuments.createdAt,
  };
}

async function getFiscalDocuments(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para acessar a auditoria documental." }, { status: 401 });
  try {
    await ensureScenarioSchema();
    const workspace = await getWorkspaceContext(user.id);
    if (!workspace) return Response.json({ error: "Espaço contábil não encontrado." }, { status: 403 });
    const url = new URL(request.url);
    const documentId = url.searchParams.get("id");
    const companyIdValue = url.searchParams.get("companyId");
    const companyId = companyIdValue ? Number(companyIdValue) : null;
    if (companyId !== null && (!Number.isInteger(companyId) || companyId <= 0)) return Response.json({ error: "Cliente inválido." }, { status: 400 });
    const db = getDb();

    if (documentId) {
      const [row] = await db.select().from(fiscalDocuments).where(and(eq(fiscalDocuments.id, documentId), eq(fiscalDocuments.workspaceId, workspace.id))).limit(1);
      if (!row) return Response.json({ error: "Documento fiscal não encontrado." }, { status: 404 });
      const [uploader] = await db.select({ name: users.name }).from(users).where(eq(users.id, row.uploadedByUserId)).limit(1);
      const events = await db.select().from(fiscalDocumentEvents).where(and(eq(fiscalDocumentEvents.documentId, row.id), eq(fiscalDocumentEvents.workspaceId, workspace.id))).orderBy(desc(fiscalDocumentEvents.createdAt), desc(fiscalDocumentEvents.id)).limit(30);
      return Response.json({
        document: {
          ...row,
          uploaderName: uploader?.name ?? "Profissional",
          audit: parseJson(row.auditJson, null),
          comparison: parseJson<NfeDossierComparison | null>(row.comparisonJson, null),
          events: events.map((event) => ({ ...event, eventData: parseJson(event.eventData, {}) })),
        },
      }, { headers: { "Cache-Control": "no-store" } });
    }

    if (companyId !== null) {
      const [company] = await db.select({ id: companies.id }).from(companies).where(and(eq(companies.id, companyId), eq(companies.workspaceId, workspace.id))).limit(1);
      if (!company) return Response.json({ error: "O cliente não pertence a este espaço contábil." }, { status: 404 });
    }
    const where = companyId === null ? eq(fiscalDocuments.workspaceId, workspace.id) : and(eq(fiscalDocuments.workspaceId, workspace.id), eq(fiscalDocuments.companyId, companyId));
    const rows = await db.select(documentSummarySelect()).from(fiscalDocuments).where(where).orderBy(desc(fiscalDocuments.createdAt), desc(fiscalDocuments.id)).limit(40);
    const uploaderIds = Array.from(new Set(rows.map((row) => row.uploadedByUserId)));
    const uploaders = uploaderIds.length ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, uploaderIds)) : [];
    const names = new Map(uploaders.map((current) => [current.id, current.name]));
    const dossierWhere = companyId === null ? eq(fiscalDossiers.workspaceId, workspace.id) : and(eq(fiscalDossiers.workspaceId, workspace.id), eq(fiscalDossiers.companyId, companyId));
    const dossiers = await db.select({ id: fiscalDossiers.id, title: fiscalDossiers.title, status: fiscalDossiers.status, inputHash: fiscalDossiers.inputHash, createdAt: fiscalDossiers.createdAt }).from(fiscalDossiers).where(dossierWhere).orderBy(desc(fiscalDossiers.createdAt), desc(fiscalDossiers.id)).limit(30);
    return Response.json({
      documents: rows.map((row) => ({ ...row, uploaderName: names.get(row.uploadedByUserId) ?? "Profissional" })),
      dossiers,
      context: { currentUserId: user.id, workspaceType: workspace.type, role: workspace.role, canImport: canPrepareScenarios(workspace.role) },
      metrics: {
        total: rows.length,
        blocked: rows.filter((row) => row.status === "blocked").length,
        consistent: rows.filter((row) => row.status !== "blocked").length,
        totalInvoiceCents: rows.filter((row) => row.status !== "blocked").reduce((sum, row) => sum + (row.totalInvoiceCents ?? 0), 0),
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Não foi possível carregar a auditoria documental." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}

async function importFiscalDocument(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para importar documentos fiscais." }, { status: 401 });
  try {
    await ensureScenarioSchema();
    const workspace = await getWorkspaceContext(user.id);
    if (!workspace || !canPrepareScenarios(workspace.role)) return Response.json({ error: "Seu papel não permite importar documentos fiscais." }, { status: 403 });
    const contentLength = Number(request.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > NFE_MAX_XML_BYTES + 1_000_000) return Response.json({ error: "A requisição excede o limite seguro da importação." }, { status: 413 });
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size < 200 || file.size > NFE_MAX_XML_BYTES || !file.name.toLowerCase().endsWith(".xml")) return Response.json({ error: "Selecione uma NF-e XML de até 5 MB." }, { status: 400 });
    const companyIdText = typeof form.get("companyId") === "string" ? String(form.get("companyId")) : "";
    let companyId = companyIdText ? Number(companyIdText) : null;
    const dossierId = typeof form.get("dossierId") === "string" ? String(form.get("dossierId")).trim() || null : null;
    const db = getDb();
    if (companyId !== null) {
      if (!Number.isInteger(companyId) || companyId <= 0) return Response.json({ error: "Cliente inválido." }, { status: 400 });
      const [company] = await db.select({ id: companies.id }).from(companies).where(and(eq(companies.id, companyId), eq(companies.workspaceId, workspace.id))).limit(1);
      if (!company) return Response.json({ error: "O cliente não pertence a este espaço contábil." }, { status: 404 });
    }

    const xml = decodeXml(new Uint8Array(await file.arrayBuffer()));
    const audit = await auditNfeXml(xml);
    let comparison: NfeDossierComparison = { status: "not_compared", statusLabel: "Nenhum dossiê vinculado", dossierId: null, dossierHash: null, checks: [], divergentCount: 0 };
    if (dossierId) {
      const [dossier] = await db.select().from(fiscalDossiers).where(and(eq(fiscalDossiers.id, dossierId), eq(fiscalDossiers.workspaceId, workspace.id))).limit(1);
      if (!dossier) return Response.json({ error: "Dossiê fiscal não encontrado neste espaço." }, { status: 404 });
      if (companyId !== null && dossier.companyId !== null && dossier.companyId !== companyId) return Response.json({ error: "O dossiê selecionado pertence a outro cliente do escritório." }, { status: 409 });
      if (companyId === null && dossier.companyId !== null) companyId = dossier.companyId;
      if (await sha256Hex(dossier.snapshotJson) !== dossier.inputHash) return Response.json({ error: "O dossiê selecionado falhou na verificação de integridade." }, { status: 409 });
      const snapshot = parseJson<FiscalDossierSnapshot | null>(dossier.snapshotJson, null);
      if (!snapshot) return Response.json({ error: "O snapshot do dossiê não pôde ser lido." }, { status: 409 });
      comparison = compareNfeToDossier(audit, dossier.id, dossier.inputHash, snapshot);
    }

    const [existing] = await db.select({ id: fiscalDocuments.id }).from(fiscalDocuments).where(and(eq(fiscalDocuments.workspaceId, workspace.id), eq(fiscalDocuments.sourceHash, audit.sourceHash), eq(fiscalDocuments.profileVersion, NFE_AUDIT_PROFILE_VERSION))).limit(1);
    if (existing) {
      const url = new URL(request.url);
      const detailRequest = new Request(`${url.origin}${url.pathname}?id=${encodeURIComponent(existing.id)}`, { headers: request.headers });
      const detailResponse = await getFiscalDocuments(detailRequest);
      const detail = await detailResponse.json() as Record<string, unknown>;
      return Response.json({ ...detail, idempotent: true });
    }

    const publicAudit = publicNfeAudit(audit);
    const filename = cleanFilename(file.name);
    const emitterTaxIdHash = audit.header.issuerTaxId ? await sha256Hex(`${workspace.id}:issuer:${audit.header.issuerTaxId}`) : null;
    const recipientTaxIdHash = audit.header.recipientTaxId ? await sha256Hex(`${workspace.id}:recipient:${audit.header.recipientTaxId}`) : null;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const eventData = JSON.stringify({ sourceHash: audit.sourceHash, profileVersion: audit.profileVersion, status: audit.status, blockerCount: audit.issues.filter((current) => current.severity === "blocker").length, warningCount: audit.issues.filter((current) => current.severity === "warning").length, dossierId, divergentCount: comparison.divergentCount, rawXmlPersisted: false });
    const results = await env.DB.batch([
      env.DB.prepare("INSERT INTO fiscal_documents (id, workspace_id, owner_user_id, company_id, uploaded_by_user_id, dossier_id, filename, source_hash, access_key, schema_version, profile_version, status, authorization_code, authorization_label, issued_at, emitter_name, emitter_tax_id_hash, emitter_tax_id_masked, emitter_state, recipient_name, recipient_tax_id_hash, recipient_tax_id_masked, recipient_state, item_count, total_product_cents, total_invoice_cents, audit_json, comparison_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(id, workspace.id, workspace.ownerUserId, companyId, user.id, dossierId, filename, audit.sourceHash, publicAudit.header.accessKey, audit.schemaVersion, audit.profileVersion, audit.status, audit.authorization.statusCode, cleanText(audit.authorization.statusReason, 200), audit.header.issuedAt, cleanText(audit.header.issuerName, 160), emitterTaxIdHash, maskTaxId(audit.header.issuerTaxId), cleanText(audit.header.issuerState, 2), cleanText(audit.header.recipientName, 160), recipientTaxIdHash, maskTaxId(audit.header.recipientTaxId), cleanText(audit.header.recipientState, 2), audit.items.length, audit.totals.declaredProductCents, audit.totals.invoiceCents, JSON.stringify(publicAudit), JSON.stringify(comparison), now),
      env.DB.prepare("INSERT INTO fiscal_document_events (document_id, workspace_id, actor_user_id, event_type, note, event_data, created_at) SELECT id, workspace_id, ?, 'fiscal_document.audited', 'NF-e processada em memória; XML bruto descartado.', ?, ? FROM fiscal_documents WHERE id = ?").bind(user.id, eventData, now, id),
    ]);
    if (results[0].meta.changes !== 1 || results[1].meta.changes !== 1) return Response.json({ error: "A auditoria não foi persistida integralmente." }, { status: 409 });
    const url = new URL(request.url);
    const detailRequest = new Request(`${url.origin}${url.pathname}?id=${encodeURIComponent(id)}`, { headers: request.headers });
    const detailResponse = await getFiscalDocuments(detailRequest);
    const detail = await detailResponse.json() as Record<string, unknown>;
    return Response.json({ ...detail, idempotent: false }, { status: 201 });
  } catch (cause) {
    const code = cause instanceof Error ? cause.message : "";
    const known: Record<string, string> = {
      invalid_xml_size: "O XML está vazio ou excede o limite seguro de 5 MB.",
      unsafe_xml_declaration: "O XML contém DOCTYPE, entidade, stylesheet ou conteúdo inseguro e foi recusado.",
      malformed_xml: "O arquivo não é um XML bem-formado.",
      unsupported_xml_root: "O arquivo não contém uma estrutura NF-e reconhecida.",
      missing_inf_nfe: "O grupo infNFe não foi localizado.",
      too_many_nfe_items: "A NF-e excede o limite operacional de 500 itens.",
      unsupported_xml_encoding: "Converta o XML para UTF-8 antes da importação.",
    };
    if (known[code]) return Response.json({ error: known[code], code }, { status: 422 });
    return Response.json({ error: "A importação foi interrompida porque o documento não passou nos controles." }, { status: 500 });
  }
}

export const GET = withApiTelemetry("GET /api/fiscal-documents", getFiscalDocuments);
export const POST = withApiTelemetry("POST /api/fiscal-documents", importFiscalDocument);

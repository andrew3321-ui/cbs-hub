import { env } from "cloudflare:workers";
import {
  FISCAL_BATCH_EVIDENCE_VERSION,
  FISCAL_BATCH_MAX_FILES,
  FISCAL_BATCH_MAX_FILE_BYTES,
  FISCAL_BATCH_MAX_TOTAL_BYTES,
  FISCAL_BATCH_PROFILE_VERSION,
  type FiscalBatchInspection,
  inspectFiscalBatchText,
  sha256BatchSource,
} from "../../../domain/fiscal-batch-import";
import { auditNfeXml, NFE_AUDIT_PROFILE_VERSION, nfeAuditSources, publicNfeAudit } from "../../../domain/nfe-audit";
import { reconcileNfeWithExistingEngines } from "../../../domain/fiscal-import-reconciliation";
import { ensureScenarioSchema } from "../../../db";
import { withApiTelemetry } from "../../api-infrastructure";
import { getCurrentUser } from "../../auth";
import { withWorkspaceFeature } from "../../plan-entitlements";
import { canPrepareScenarios, getWorkspaceContext } from "../../workspace";

type BatchRow = {
  id: string;
  client_batch_key: string;
  profile_version: string;
  status: string;
  total_files: number;
  processed_files: number;
  accepted_files: number;
  warning_files: number;
  blocked_files: number;
  total_bytes: number;
  evidence_hash: string | null;
  started_at: string;
  completed_at: string | null;
};

type ItemRow = {
  id: string;
  ordinal: number;
  filename: string;
  size_bytes: number;
  source_hash: string;
  document_type: string;
  status: "accepted" | "warning" | "blocked";
  profile_version: string;
  evidence_version: string;
  adapter_code: string | null;
  adapter_version: string | null;
  coverage_status: "supported" | "partial" | "not_supported";
  municipality_code: string | null;
  competence_start: string | null;
  competence_end: string | null;
  calculation_eligible: number;
  raw_file_persisted: number;
  summary_json: string;
  issues_json: string;
  calculation_blockers_json: string;
  official_source_codes_json: string;
  evidence_json: string;
  evidence_hash: string;
};

function safeFilename(value: string) {
  return (value.split(/[\\/]/).pop() ?? "documento").replace(/[^\p{L}\p{N}._() -]/gu, "_").slice(0, 120);
}

function integerField(form: FormData, name: string, fallback: number) {
  const raw = form.get(name);
  if (typeof raw !== "string" || !/^\d+$/.test(raw)) return fallback;
  return Number(raw);
}

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function publicItem(row: ItemRow) {
  const issueDetails = parseJson<Array<{ code: string; severity: string; category: string; message: string }>>(row.issues_json, []);
  const evidenceEnvelope = parseJson<{ evidence?: { missingFields?: string[]; engineReconciliations?: unknown[] } & Record<string, unknown> }>(row.evidence_json, {});
  return {
    id: row.id,
    ordinal: row.ordinal,
    filename: row.filename,
    sizeBytes: row.size_bytes,
    sourceHash: row.source_hash.slice(0, 16),
    documentType: row.document_type,
    status: row.status,
    profileVersion: row.profile_version,
    evidenceVersion: row.evidence_version,
    adapterCode: row.adapter_code,
    adapterVersion: row.adapter_version,
    coverageStatus: row.coverage_status,
    municipalityCode: row.municipality_code,
    competenceStart: row.competence_start,
    competenceEnd: row.competence_end,
    calculationEligible: row.calculation_eligible === 1,
    rawFilePersisted: row.raw_file_persisted === 1,
    summary: parseJson<Record<string, string | number | boolean | null>>(row.summary_json, {}),
    issueDetails,
    issues: issueDetails.map((item) => item.message),
    calculationBlockers: parseJson<string[]>(row.calculation_blockers_json, []),
    officialSourceCodes: parseJson<string[]>(row.official_source_codes_json, []),
    documentEvidence: evidenceEnvelope.evidence ?? null,
    missingFields: evidenceEnvelope.evidence?.missingFields ?? issueDetails.filter((item) => /MISSING|NOT-INFORMED/.test(item.code)).map((item) => item.code),
    engineReconciliations: evidenceEnvelope.evidence?.engineReconciliations ?? [],
    evidenceHash: row.evidence_hash.slice(0, 16),
  };
}

function minimizedNfeEvidence(audit: ReturnType<typeof publicNfeAudit>) {
  return {
    profileVersion: audit.profileVersion,
    assurance: audit.assurance,
    status: audit.status,
    documentType: audit.documentType,
    schemaVersion: audit.schemaVersion,
    header: {
      accessKey: audit.header.accessKey,
      model: audit.header.model,
      series: audit.header.series,
      number: audit.header.number,
      issuedAt: audit.header.issuedAt,
      environment: audit.header.environment,
      finalityCode: audit.header.finalityCode,
      isReturn: audit.header.isReturn,
      issuerState: audit.header.issuerState,
      recipientState: audit.header.recipientState,
    },
    authorization: audit.authorization,
    totals: audit.totals,
    items: audit.items.map((item) => ({
      itemNumber: item.itemNumber,
      ncm: item.ncm,
      cest: item.cest,
      cfop: item.cfop,
      originCode: item.originCode,
      cst: item.cst,
      csosn: item.csosn,
      includeInInvoiceTotal: item.includeInInvoiceTotal,
      productValueCents: item.productValueCents,
      icmsBaseCents: item.icmsBaseCents,
      icmsRateBps: item.icmsRateBps,
      icmsValueCents: item.icmsValueCents,
      stBaseCents: item.stBaseCents,
      stRateBps: item.stRateBps,
      stValueCents: item.stValueCents,
      fcpStValueCents: item.fcpStValueCents,
      fcpValueCents: item.fcpValueCents,
      difalFcpValueCents: item.difalFcpValueCents,
      difalDestinationValueCents: item.difalDestinationValueCents,
      difalOriginValueCents: item.difalOriginValueCents,
      ibsValueCents: item.ibsValueCents,
      cbsValueCents: item.cbsValueCents,
      trace: item.trace,
    })),
    issues: audit.issues,
    checks: audit.checks,
    limitations: audit.limitations,
    sourceCodes: audit.sources.map((source) => source.code),
  };
}

async function requireImporter() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para importar documentos." }, { status: 401 });
  const workspace = await getWorkspaceContext(user.id);
  if (!workspace || !canPrepareScenarios(workspace.role)) {
    return Response.json({ error: "Seu papel não permite importar documentos." }, { status: 403 });
  }
  return { user, workspace } as const;
}

async function inspectFile(filename: string, text: string): Promise<{ inspection: FiscalBatchInspection; evidence: unknown }> {
  const initial = inspectFiscalBatchText(filename, text);
  if (initial.documentType !== "nfe") return { inspection: initial, evidence: { summary: initial.summary, issueDetails: initial.issueDetails, missingFields: initial.missingFields, engineReconciliations: initial.engineReconciliations } };

  try {
    const audit = await auditNfeXml(text);
    const publicAudit = publicNfeAudit(audit);
    const issueDetails = audit.issues.map((item) => ({
      code: item.code,
      severity: item.severity,
      category: item.scope === "totals" ? "totals" as const : item.scope === "security" ? "security" as const : "structure" as const,
      message: item.message,
    }));
    const status = audit.status === "blocked" ? "blocked" : audit.status === "validated_with_warnings" ? "warning" : "accepted";
    const engineReconciliations = reconcileNfeWithExistingEngines(audit);
    const inspection: FiscalBatchInspection = {
      documentType: "nfe",
      status,
      profileVersion: FISCAL_BATCH_PROFILE_VERSION,
      evidenceVersion: FISCAL_BATCH_EVIDENCE_VERSION,
      adapterCode: "nfe-structural-auditor",
      adapterVersion: NFE_AUDIT_PROFILE_VERSION,
      coverageStatus: "partial",
      municipalityCode: null,
      competenceStart: audit.header.issuedAt,
      competenceEnd: audit.header.issuedAt,
      summary: {
        filename,
        schemaVersion: audit.schemaVersion,
        accessKey: publicAudit.header.accessKey,
        number: audit.header.number,
        protocol: audit.authorization.protocol,
        authorized: audit.authorization.authorized,
        itemCount: audit.items.length,
        itemProductSumCents: audit.totals.itemProductSumCents,
        declaredProductCents: audit.totals.declaredProductCents,
        invoiceCents: audit.totals.invoiceCents,
        icmsCents: audit.totals.icmsCents,
        stCents: audit.totals.stCents,
        fcpStCents: audit.totals.fcpStCents,
        fcpCents: audit.totals.fcpCents,
        difalFcpCents: audit.totals.difalFcpCents,
        difalDestinationCents: audit.totals.difalDestinationCents,
        difalOriginCents: audit.totals.difalOriginCents,
        returnOperation: audit.header.isReturn,
      },
      issueDetails,
      issues: issueDetails.map((item) => item.message),
      missingFields: issueDetails.filter((item) => /MISSING|NOT-INFORMED/.test(item.code)).map((item) => item.code),
      engineReconciliations,
      calculationEligible: false,
      calculationBlockers: [
        ...issueDetails.filter((item) => item.severity === "blocker").map((item) => item.message),
        "NF-e importada não altera cálculo final; vincule-a a um dossiê e resolva toda divergência antes da revisão.",
      ],
      officialSourceCodes: nfeAuditSources.map((source) => source.code),
    };
    return { inspection, evidence: { ...minimizedNfeEvidence(publicAudit), missingFields: inspection.missingFields, engineReconciliations } };
  } catch (cause) {
    const code = cause instanceof Error ? cause.message : "nfe_audit_failed";
    const message = `NF-e bloqueada pelo auditor detalhado (${code}).`;
    return {
      inspection: {
        ...initial,
        status: "blocked",
        adapterCode: "nfe-structural-auditor",
        adapterVersion: NFE_AUDIT_PROFILE_VERSION,
        coverageStatus: "partial",
        issueDetails: [{ code: "NFE-AUDIT-FAILED", severity: "blocker", category: "structure", message }],
        issues: [message],
        missingFields: [],
        engineReconciliations: [],
        calculationBlockers: [message, "Documento bloqueado nunca alimenta cálculo final."],
        officialSourceCodes: nfeAuditSources.map((source) => source.code),
      },
      evidence: { auditError: code },
    };
  }
}

async function findBatch(workspaceId: number, locator: { id?: string; clientKey?: string }) {
  if (locator.id) {
    return env.DB.prepare("SELECT * FROM fiscal_import_batches WHERE id = ? AND workspace_id = ?")
      .bind(locator.id, workspaceId).first<BatchRow>();
  }
  return env.DB.prepare("SELECT * FROM fiscal_import_batches WHERE client_batch_key = ? AND workspace_id = ? AND profile_version = ?")
    .bind(locator.clientKey, workspaceId, FISCAL_BATCH_PROFILE_VERSION).first<BatchRow>();
}

async function batchPayload(batch: BatchRow, workspaceId: number, idempotent = false) {
  const rows = await env.DB.prepare("SELECT * FROM fiscal_import_items WHERE batch_id = ? AND workspace_id = ? ORDER BY ordinal")
    .bind(batch.id, workspaceId)
    .all<ItemRow>();
  const items: ItemRow[] = rows.results ?? [];
  const publicItems: Array<ReturnType<typeof publicItem>> = items.map(publicItem);
  return {
    batchId: batch.id,
    clientBatchKey: batch.client_batch_key,
    profileVersion: batch.profile_version,
    evidenceVersion: FISCAL_BATCH_EVIDENCE_VERSION,
    status: batch.status,
    progress: {
      processed: batch.processed_files,
      total: batch.total_files,
      percentage: batch.total_files ? Math.round((batch.processed_files / batch.total_files) * 100) : 0,
    },
    metrics: {
      total: batch.processed_files,
      accepted: batch.accepted_files,
      warning: batch.warning_files,
      blocked: batch.blocked_files,
    },
    items: publicItems,
    report: {
      rejections: publicItems.filter((item) => item.status === "blocked").map((item) => ({ filename: item.filename, codes: item.issueDetails.filter((entry) => entry.severity === "blocker").map((entry) => entry.code) })),
      divergences: publicItems.flatMap((item) => item.issueDetails.filter((entry) => entry.category === "totals" && /MISMATCH|DIVERG|COUNT/.test(entry.code)).map((entry) => ({ filename: item.filename, code: entry.code, message: entry.message }))),
      missingData: publicItems.flatMap((item) => item.issueDetails.filter((entry) => /MISSING|AUSENT/.test(entry.code)).map((entry) => ({ filename: item.filename, code: entry.code, message: entry.message }))),
      engineReconciliations: publicItems.flatMap((item) => item.engineReconciliations.map((entry) => ({ filename: item.filename, reconciliation: entry }))),
    },
    rawFilesPersisted: false,
    evidenceHash: batch.evidence_hash?.slice(0, 16) ?? null,
    idempotent,
    message: batch.status === "completed"
      ? "Lote concluído. Arquivos brutos descartados; evidências mínimas, hashes e divergências foram preservados."
      : `Lote em processamento: ${batch.processed_files} de ${batch.total_files} arquivo(s).`,
  };
}

async function refreshBatch(batch: BatchRow, workspaceId: number) {
  const counts = await env.DB.prepare(`
    SELECT
      COUNT(*) AS processed,
      SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) AS accepted,
      SUM(CASE WHEN status = 'warning' THEN 1 ELSE 0 END) AS warning,
      SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) AS blocked
    FROM fiscal_import_items WHERE batch_id = ? AND workspace_id = ?
  `).bind(batch.id, workspaceId).first<{ processed: number; accepted: number | null; warning: number | null; blocked: number | null }>();
  const processed = Number(counts?.processed ?? 0);
  const completed = processed >= batch.total_files;
  const evidenceRows = await env.DB.prepare("SELECT evidence_hash FROM fiscal_import_items WHERE batch_id = ? ORDER BY ordinal")
    .bind(batch.id).all<{ evidence_hash: string }>();
  const evidenceHash = completed
    ? await sha256BatchSource(JSON.stringify({ profile: FISCAL_BATCH_PROFILE_VERSION, items: (evidenceRows.results ?? []).map((row: { evidence_hash: string }) => row.evidence_hash) }))
    : null;
  const now = new Date().toISOString();
  await env.DB.prepare(`
    UPDATE fiscal_import_batches SET
      status = ?, processed_files = ?, accepted_files = ?, warning_files = ?, blocked_files = ?,
      evidence_hash = ?, completed_at = ?, updated_at = ?
    WHERE id = ? AND workspace_id = ?
  `).bind(
    completed ? "completed" : "processing",
    processed,
    Number(counts?.accepted ?? 0),
    Number(counts?.warning ?? 0),
    Number(counts?.blocked ?? 0),
    evidenceHash,
    completed ? now : null,
    now,
    batch.id,
    workspaceId,
  ).run();
  const refreshed = await findBatch(workspaceId, { id: batch.id });
  if (!refreshed) throw new Error("batch_refresh_failed");
  return refreshed;
}

async function getBatch(request: Request) {
  const context = await requireImporter();
  if (context instanceof Response) return context;
  await ensureScenarioSchema();
  const url = new URL(request.url);
  const batchId = url.searchParams.get("batchId");
  const clientKey = url.searchParams.get("clientBatchKey");
  if (!batchId && !clientKey) return Response.json({ error: "Informe batchId ou clientBatchKey." }, { status: 400 });
  const batch = await findBatch(context.workspace.id, batchId ? { id: batchId } : { clientKey: clientKey! });
  if (!batch) return Response.json({ error: "Lote não encontrado neste escritório." }, { status: 404 });
  return Response.json(await batchPayload(batch, context.workspace.id), { headers: { "Cache-Control": "no-store" } });
}

async function importBatch(request: Request) {
  const context = await requireImporter();
  if (context instanceof Response) return context;
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > FISCAL_BATCH_MAX_TOTAL_BYTES + 2_000_000) {
    return Response.json({ error: "A requisição excede o limite de 30 MB." }, { status: 413 });
  }

  try {
    const form = await request.formData();
    const files = form.getAll("files").filter((entry): entry is File => entry instanceof File);
    if (!files.length || files.length > FISCAL_BATCH_MAX_FILES) {
      return Response.json({ error: `Selecione de 1 a ${FISCAL_BATCH_MAX_FILES} arquivos.` }, { status: 400 });
    }
    const requestBytes = files.reduce((sum, file) => sum + file.size, 0);
    if (files.some((file) => file.size < 20 || file.size > FISCAL_BATCH_MAX_FILE_BYTES)) {
      return Response.json({ error: "Cada arquivo deve ter entre 20 bytes e 5 MB." }, { status: 413 });
    }

    const clientBatchKeyValue = form.get("clientBatchKey");
    const clientBatchKey = typeof clientBatchKeyValue === "string" && /^[0-9A-Za-z_-]{16,100}$/.test(clientBatchKeyValue)
      ? clientBatchKeyValue
      : crypto.randomUUID();
    const ordinalStart = integerField(form, "ordinal", 0);
    const totalFiles = integerField(form, "totalFiles", files.length);
    const totalBytes = integerField(form, "totalBytes", requestBytes);
    if (totalFiles < 1 || totalFiles > FISCAL_BATCH_MAX_FILES || totalBytes < requestBytes || totalBytes > FISCAL_BATCH_MAX_TOTAL_BYTES || ordinalStart + files.length > totalFiles) {
      return Response.json({ error: "Metadados do lote são inválidos ou excedem 25 arquivos/30 MB." }, { status: 400 });
    }

    await ensureScenarioSchema();
    const now = new Date().toISOString();
    await env.DB.prepare(`
      INSERT OR IGNORE INTO fiscal_import_batches (
        id, workspace_id, owner_user_id, uploaded_by_user_id, client_batch_key, profile_version,
        evidence_version, status, total_files, total_bytes, raw_files_persisted, started_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'processing', ?, ?, 0, ?, ?)
    `).bind(
      crypto.randomUUID(),
      context.workspace.id,
      context.workspace.ownerUserId,
      context.user.id,
      clientBatchKey,
      FISCAL_BATCH_PROFILE_VERSION,
      FISCAL_BATCH_EVIDENCE_VERSION,
      totalFiles,
      totalBytes,
      now,
      now,
    ).run();
    let batch = await findBatch(context.workspace.id, { clientKey: clientBatchKey });
    if (!batch) throw new Error("batch_create_failed");
    if (batch.total_files !== totalFiles || batch.total_bytes !== totalBytes) {
      return Response.json({ error: "A chave idempotente já pertence a um lote com quantidade ou tamanho diferente." }, { status: 409 });
    }

    let newItems = 0;
    let idempotentItems = 0;
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const ordinal = ordinalStart + index;
      const filename = safeFilename(file.name);
      const bytes = new Uint8Array(await file.arrayBuffer());
      const sourceHash = await sha256BatchSource(bytes);
      const existing = await env.DB.prepare("SELECT * FROM fiscal_import_items WHERE batch_id = ? AND ordinal = ?")
        .bind(batch.id, ordinal).first<ItemRow>();
      if (existing) {
        if (existing.source_hash !== sourceHash) {
          return Response.json({ error: `A posição ${ordinal + 1} já foi usada por outro arquivo neste lote.` }, { status: 409 });
        }
        idempotentItems += 1;
        continue;
      }
      const usage = await env.DB.prepare("SELECT COUNT(*) AS files, COALESCE(SUM(size_bytes), 0) AS bytes FROM fiscal_import_items WHERE batch_id = ?")
        .bind(batch.id).first<{ files: number; bytes: number }>();
      const resultingFiles = Number(usage?.files ?? 0) + 1;
      const resultingBytes = Number(usage?.bytes ?? 0) + file.size;
      if (resultingBytes > batch.total_bytes || (resultingFiles === batch.total_files && resultingBytes !== batch.total_bytes)) {
        return Response.json({ error: "Os bytes recebidos não conciliam com o manifesto idempotente do lote." }, { status: 409 });
      }

      let inspection: FiscalBatchInspection;
      let evidence: unknown;
      try {
        const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
        ({ inspection, evidence } = await inspectFile(filename, text));
      } catch {
        const message = "Arquivo não está em UTF-8 e foi bloqueado sem afetar os demais.";
        inspection = {
          documentType: "unknown",
          status: "blocked",
          profileVersion: FISCAL_BATCH_PROFILE_VERSION,
          evidenceVersion: FISCAL_BATCH_EVIDENCE_VERSION,
          adapterCode: null,
          adapterVersion: null,
          coverageStatus: "not_supported",
          municipalityCode: null,
          competenceStart: null,
          competenceEnd: null,
          summary: { filename },
          issueDetails: [{ code: "FILE-NOT-UTF8", severity: "blocker", category: "structure", message }],
          issues: [message],
          missingFields: [],
          engineReconciliations: [],
          calculationEligible: false,
          calculationBlockers: [message],
          officialSourceCodes: [],
        };
        evidence = { decodeError: "not_utf8" };
      }
      const evidenceJson = JSON.stringify({
        evidenceVersion: inspection.evidenceVersion,
        profileVersion: inspection.profileVersion,
        sourceHash,
        capturedAt: now,
        rawFilePersisted: false,
        evidence,
      });
      const evidenceHash = await sha256BatchSource(evidenceJson);
      await env.DB.prepare(`
        INSERT INTO fiscal_import_items (
          id, batch_id, workspace_id, ordinal, filename, size_bytes, source_hash, document_type, status,
          profile_version, evidence_version, adapter_code, adapter_version, coverage_status, municipality_code,
          competence_start, competence_end, calculation_eligible, raw_file_persisted, summary_json, issues_json,
          calculation_blockers_json, official_source_codes_json, evidence_json, evidence_hash
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?)
      `).bind(
        crypto.randomUUID(),
        batch.id,
        context.workspace.id,
        ordinal,
        filename,
        file.size,
        sourceHash,
        inspection.documentType,
        inspection.status,
        inspection.profileVersion,
        inspection.evidenceVersion,
        inspection.adapterCode,
        inspection.adapterVersion,
        inspection.coverageStatus,
        inspection.municipalityCode,
        inspection.competenceStart,
        inspection.competenceEnd,
        JSON.stringify(inspection.summary),
        JSON.stringify(inspection.issueDetails),
        JSON.stringify(inspection.calculationBlockers),
        JSON.stringify(inspection.officialSourceCodes),
        evidenceJson,
        evidenceHash,
      ).run();
      newItems += 1;
    }

    const previouslyCompleted = batch.status === "completed";
    batch = await refreshBatch(batch, context.workspace.id);
    if (!previouslyCompleted && batch.status === "completed") {
      await env.DB.prepare(`
        INSERT INTO audit_events (owner_user_id, company_id, scenario_id, event_type, event_data, created_at)
        VALUES (?, NULL, NULL, 'fiscal_batch.completed', ?, ?)
      `).bind(
        context.workspace.ownerUserId,
        JSON.stringify({
          batchId: batch.id,
          clientBatchKey,
          profileVersion: FISCAL_BATCH_PROFILE_VERSION,
          evidenceVersion: FISCAL_BATCH_EVIDENCE_VERSION,
          metrics: { total: batch.processed_files, accepted: batch.accepted_files, warning: batch.warning_files, blocked: batch.blocked_files },
          evidenceHash: batch.evidence_hash,
          rawFilesPersisted: false,
          calculationEligibleItems: 0,
        }),
        new Date().toISOString(),
      ).run();
    }
    const payload = await batchPayload(batch, context.workspace.id, newItems === 0 && idempotentItems > 0);
    return Response.json(payload, {
      status: newItems ? 201 : 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json({ error: "O envio foi interrompido sem alterar cálculos fiscais. Tente retomar com a mesma chave do lote." }, { status: 422 });
  }
}

export const GET = withApiTelemetry("GET /api/fiscal-imports", withWorkspaceFeature("batchImportEnabled", getBatch));
export const POST = withApiTelemetry("POST /api/fiscal-imports", withWorkspaceFeature("batchImportEnabled", importBatch));

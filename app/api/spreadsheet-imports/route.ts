import { env } from "cloudflare:workers";
import { getCurrentUser } from "../../auth";
import { withApiTelemetry } from "../../api-infrastructure";
import { canManageWorkspace, canPrepareScenarios, getWorkspaceContext, sha256Hex } from "../../workspace";
import { canonicalSpreadsheetFields, inferColumnMapping, isSpreadsheetModel, normalizeSpreadsheet, officialTemplate, parseSpreadsheet, spreadsheetModels, type ColumnMapping } from "../../../domain/spreadsheet-import";
import { isReportPeriod } from "../../../domain/report-central";

type ExistingEvidence = { document_key: string; record_type: string; evidence_hash: string };

async function byteHash(bytes: Uint8Array) {
  const buffer = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function cleanFilename(value: string) { return value.replace(/[^a-zA-Z0-9._ -]/g, "_").slice(0, 180) || "planilha"; }
function parseMapping(raw: FormDataEntryValue | null): ColumnMapping | null {
  if (typeof raw !== "string" || raw.length > 20_000) return null;
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    return Object.fromEntries(Object.entries(value).slice(0, 60).map(([key, item]) => [key.slice(0, 120), item === "ignore" || canonicalSpreadsheetFields.some((field) => field === item) ? item : "ignore"])) as ColumnMapping;
  } catch { return null; }
}

async function getImports(request: Request) {
  const url = new URL(request.url);
  const templateModel = url.searchParams.get("template");
  const templateFormat = url.searchParams.get("format") === "xlsx" ? "xlsx" : "csv";
  if (isSpreadsheetModel(templateModel)) {
    const template = officialTemplate(templateModel, templateFormat);
    return new Response(template.bytes, { headers: { "Content-Type": template.contentType, "Content-Disposition": `attachment; filename="cbshub-${templateModel}.${template.extension}"`, "Cache-Control": "public, max-age=3600", "X-Content-Type-Options": "nosniff" } });
  }
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para acessar as migrações de planilhas." }, { status: 401 });
  const workspace = await getWorkspaceContext(user.id);
  if (!workspace) return Response.json({ error: "Workspace indisponível." }, { status: 403 });
  try {
    const [batches, profiles] = await Promise.all([
      env.DB.prepare(`SELECT b.id, b.company_id companyId, c.name companyName, b.period_key periodKey, b.filename, b.format, b.model, b.status,
        b.total_rows totalRows, b.accepted_rows acceptedRows, b.invalid_rows invalidRows, b.duplicate_rows duplicateRows,
        b.divergent_rows divergentRows, b.formula_cells_discarded formulaCellsDiscarded, b.raw_file_persisted rawFilePersisted,
        b.report_json reportJson, b.rolled_back_at rolledBackAt, b.created_at createdAt, u.name createdByName
        FROM spreadsheet_import_batches b INNER JOIN companies c ON c.id = b.company_id AND c.workspace_id = b.workspace_id
        INNER JOIN users u ON u.id = b.created_by_user_id WHERE b.workspace_id = ? ORDER BY b.created_at DESC, b.id DESC LIMIT 100`).bind(workspace.id).all(),
      env.DB.prepare("SELECT id, name, model, column_mapping_json columnMappingJson, updated_at updatedAt FROM spreadsheet_import_profiles WHERE workspace_id = ? ORDER BY name LIMIT 100").bind(workspace.id).all(),
    ]);
    return Response.json({ batches: batches.results.map((row: Record<string, unknown>) => ({ ...row, report: JSON.parse(String(row.reportJson ?? "{}")) })), profiles: profiles.results.map((row: Record<string, unknown>) => ({ ...row, columnMapping: JSON.parse(String(row.columnMappingJson ?? "{}")) })), models: spreadsheetModels });
  } catch { return Response.json({ error: "Não foi possível carregar as migrações de planilhas." }, { status: 500 }); }
}

async function mutateImports(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para importar planilhas." }, { status: 401 });
  const workspace = await getWorkspaceContext(user.id);
  if (!workspace || !canPrepareScenarios(workspace.role)) return Response.json({ error: "Seu papel não permite importar controles." }, { status: 403 });
  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const body = await request.json() as Record<string, unknown>;
      if (body.action !== "rollback" || typeof body.batchId !== "string") return Response.json({ error: "Ação inválida." }, { status: 400 });
      const batch = await env.DB.prepare("SELECT id, created_by_user_id createdByUserId, status FROM spreadsheet_import_batches WHERE id = ? AND workspace_id = ? LIMIT 1").bind(body.batchId, workspace.id).first<{ id: string; createdByUserId: number; status: string }>();
      if (!batch) return Response.json({ error: "Lote não encontrado neste workspace." }, { status: 404 });
      if (!canManageWorkspace(workspace.role) && batch.createdByUserId !== user.id) return Response.json({ error: "Somente o autor ou gestor pode reverter este lote." }, { status: 403 });
      if (batch.status !== "committed") return Response.json({ error: "Este lote já foi revertido." }, { status: 409 });
      const now = new Date().toISOString();
      const result = await env.DB.batch([
        env.DB.prepare("DELETE FROM spreadsheet_import_rows WHERE batch_id = ? AND workspace_id = ?").bind(batch.id, workspace.id),
        env.DB.prepare("UPDATE spreadsheet_import_batches SET status = 'rolled_back', rolled_back_at = ? WHERE id = ? AND workspace_id = ? AND status = 'committed'").bind(now, batch.id, workspace.id),
        env.DB.prepare("INSERT INTO spreadsheet_import_events (batch_id, workspace_id, actor_user_id, event_type, event_data, created_at) SELECT id, workspace_id, ?, 'spreadsheet.rollback', ?, ? FROM spreadsheet_import_batches WHERE id = ? AND workspace_id = ? AND status = 'rolled_back' AND rolled_back_at = ?").bind(user.id, JSON.stringify({ atomic: true, rawFilePersisted: false }), now, batch.id, workspace.id, now),
      ]);
      if (result[1].meta.changes !== 1) return Response.json({ error: "O lote mudou durante a reversão." }, { status: 409 });
      return Response.json({ batchId: batch.id, status: "rolled_back", deletedRows: result[0].meta.changes, rolledBackAt: now });
    }

    const form = await request.formData();
    const action = form.get("action");
    const file = form.get("file");
    const model = form.get("model");
    if ((action !== "preview" && action !== "commit") || !(file instanceof File) || !isSpreadsheetModel(model)) return Response.json({ error: "Envie um arquivo CSV/XLSX e escolha o modelo." }, { status: 400 });
    const bytes = new Uint8Array(await file.arrayBuffer());
    const parsed = parseSpreadsheet({ filename: file.name, bytes });
    const suppliedMapping = parseMapping(form.get("mapping"));
    const mapping = suppliedMapping && Object.keys(suppliedMapping).length ? suppliedMapping : inferColumnMapping(parsed.headers);
    const normalized = normalizeSpreadsheet(parsed, model, mapping);
    const sourceHash = await byteHash(bytes);
    if (action === "preview") return Response.json({ preview: { filename: cleanFilename(file.name), format: parsed.format, headers: parsed.headers, mapping, rows: normalized.rows.slice(0, 50), summary: normalized.summary, missingColumns: normalized.missingColumns, formulaCells: parsed.formulaCells.slice(0, 100), sourceHash, rawFilePersisted: false }, models: spreadsheetModels });

    const companyId = Number(form.get("companyId"));
    const periodKey = form.get("periodKey");
    if (!Number.isInteger(companyId) || companyId <= 0 || !isReportPeriod(periodKey)) return Response.json({ error: "Informe empresa e competência válidas." }, { status: 400 });
    const company = await env.DB.prepare("SELECT id FROM companies WHERE id = ? AND workspace_id = ? LIMIT 1").bind(companyId, workspace.id).first();
    if (!company) return Response.json({ error: "Empresa não pertence a este workspace." }, { status: 404 });
    const duplicateBatch = await env.DB.prepare("SELECT id FROM spreadsheet_import_batches WHERE workspace_id = ? AND company_id = ? AND period_key = ? AND source_hash = ? AND status = 'committed' LIMIT 1").bind(workspace.id, companyId, periodKey, sourceHash).first<{ id: string }>();
    if (duplicateBatch) return Response.json({ error: "Este mesmo arquivo já foi confirmado nesta empresa e competência.", duplicateBatchId: duplicateBatch.id }, { status: 409 });

    const existing = (await env.DB.prepare(`SELECT r.document_key, r.record_type, r.evidence_hash FROM spreadsheet_import_rows r
      INNER JOIN spreadsheet_import_batches b ON b.id = r.batch_id AND b.status = 'committed'
      WHERE r.workspace_id = ? AND r.company_id = ? AND r.period_key = ? AND r.status = 'accepted' LIMIT 10000`).bind(workspace.id, companyId, periodKey).all<ExistingEvidence>()).results;
    const evidenceByKey = new Map(existing.map((item) => [`${item.record_type}:${item.document_key}`, item.evidence_hash]));
    const seen = new Map<string, string>();
    const reconciled = [];
    for (const row of normalized.rows) {
      const normalizedJson = JSON.stringify(row.normalized, Object.keys(row.normalized).sort());
      const evidenceHash = await sha256Hex(`${model}|${row.documentKey}|${normalizedJson}`);
      const key = `${model}:${row.documentKey}`;
      let status: "accepted" | "invalid" | "duplicate" | "divergent" = row.status;
      const issues = [...row.issues];
      const previous = seen.get(key) ?? evidenceByKey.get(key);
      if (row.status === "accepted" && previous === evidenceHash) { status = "duplicate"; issues.push("duplicate_document"); }
      else if (row.status === "accepted" && previous && previous !== evidenceHash) { status = "divergent"; issues.push("divergent_document"); }
      else if (row.status === "accepted") seen.set(key, evidenceHash);
      reconciled.push({ ...row, normalizedJson, evidenceHash, status, issues });
    }
    const counts = { accepted: reconciled.filter((row) => row.status === "accepted").length, invalid: reconciled.filter((row) => row.status === "invalid").length, duplicate: reconciled.filter((row) => row.status === "duplicate").length, divergent: reconciled.filter((row) => row.status === "divergent").length };
    const profileName = typeof form.get("profileName") === "string" ? String(form.get("profileName")).trim().slice(0, 80) : "";
    let profileId: string | null = null;
    if (profileName) {
      profileId = crypto.randomUUID();
      await env.DB.prepare(`INSERT INTO spreadsheet_import_profiles (id, workspace_id, name, model, column_mapping_json, created_by_user_id)
        VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(workspace_id, name) DO UPDATE SET model = excluded.model, column_mapping_json = excluded.column_mapping_json, updated_at = CURRENT_TIMESTAMP`).bind(profileId, workspace.id, profileName, model, JSON.stringify(mapping), user.id).run();
      const saved = await env.DB.prepare("SELECT id FROM spreadsheet_import_profiles WHERE workspace_id = ? AND name = ? LIMIT 1").bind(workspace.id, profileName).first<{ id: string }>();
      profileId = saved?.id ?? null;
    }
    const batchId = crypto.randomUUID();
    const now = new Date().toISOString();
    const report = { version: "spreadsheet-import-1", model, companyId, periodKey, sourceHash, mapping, summary: { total: reconciled.length, ...counts, formulasDiscarded: normalized.summary.formulasDiscarded }, errors: reconciled.filter((row) => row.status !== "accepted").slice(0, 500).map((row) => ({ rowNumber: row.rowNumber, documentKey: row.documentKey, status: row.status, issues: row.issues })), rawFilePersisted: false };
    await env.DB.prepare(`INSERT INTO spreadsheet_import_batches (id, workspace_id, company_id, period_key, profile_id, created_by_user_id, filename, format, source_hash, model, status, total_rows, accepted_rows, invalid_rows, duplicate_rows, divergent_rows, formula_cells_discarded, raw_file_persisted, report_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'committed', ?, ?, ?, ?, ?, ?, 0, ?, ?)`).bind(batchId, workspace.id, companyId, periodKey, profileId, user.id, cleanFilename(file.name), parsed.format, sourceHash, model, reconciled.length, counts.accepted, counts.invalid, counts.duplicate, counts.divergent, normalized.summary.formulasDiscarded, JSON.stringify(report), now).run();
    try {
      for (let offset = 0; offset < reconciled.length; offset += 50) {
        const statements = reconciled.slice(offset, offset + 50).map((row) => env.DB.prepare(`INSERT INTO spreadsheet_import_rows (id, batch_id, workspace_id, company_id, period_key, row_number, document_key, record_type, normalized_json, evidence_hash, status, issues_json, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(crypto.randomUUID(), batchId, workspace.id, companyId, periodKey, row.rowNumber, row.documentKey, model, row.normalizedJson, row.evidenceHash, row.status, JSON.stringify(row.issues), now));
        if (statements.length) await env.DB.batch(statements);
      }
      await env.DB.prepare("INSERT INTO spreadsheet_import_events (batch_id, workspace_id, actor_user_id, event_type, event_data, created_at) VALUES (?, ?, ?, 'spreadsheet.committed', ?, ?)").bind(batchId, workspace.id, user.id, JSON.stringify({ sourceHash, counts, rawFilePersisted: false }), now).run();
    } catch (cause) {
      await env.DB.batch([env.DB.prepare("DELETE FROM spreadsheet_import_rows WHERE batch_id = ? AND workspace_id = ?").bind(batchId, workspace.id), env.DB.prepare("DELETE FROM spreadsheet_import_batches WHERE id = ? AND workspace_id = ?").bind(batchId, workspace.id)]);
      throw cause;
    }
    return Response.json({ batch: { id: batchId, status: "committed", report } }, { status: 201 });
  } catch (cause) {
    const code = cause instanceof Error && /^[A-Z0-9_]+$/.test(cause.message) ? cause.message : "SPREADSHEET_PROCESSING_FAILED";
    const messages: Record<string, string> = { SPREADSHEET_SIZE_LIMIT: "O arquivo deve ter até 5 MB.", SPREADSHEET_FORMAT_UNSUPPORTED: "Use somente CSV ou XLSX.", SPREADSHEET_ROW_LIMIT: "O arquivo excede 5.000 linhas.", SPREADSHEET_COLUMN_LIMIT: "O arquivo excede 60 colunas.", SPREADSHEET_DUPLICATE_HEADERS: "A planilha possui cabeçalhos duplicados.", SPREADSHEET_EMPTY: "A planilha não possui linhas para importar.", XLSX_INVALID_ZIP: "O arquivo XLSX está corrompido.", XLSX_FIRST_SHEET_REQUIRED: "O XLSX precisa ter dados na primeira aba." };
    return Response.json({ error: messages[code] ?? "Não foi possível processar a planilha.", code }, { status: 400 });
  }
}

export const GET = withApiTelemetry("GET /api/spreadsheet-imports", getImports);
export const POST = withApiTelemetry("POST /api/spreadsheet-imports", mutateImports);

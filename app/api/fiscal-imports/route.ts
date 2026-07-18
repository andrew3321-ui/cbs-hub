import { env } from "cloudflare:workers";
import { FISCAL_BATCH_MAX_FILES, FISCAL_BATCH_MAX_FILE_BYTES, FISCAL_BATCH_MAX_TOTAL_BYTES, inspectFiscalBatchText, sha256BatchSource } from "../../../domain/fiscal-batch-import";
import { ensureScenarioSchema } from "../../../db";
import { withApiTelemetry } from "../../api-infrastructure";
import { getCurrentUser } from "../../auth";
import { canPrepareScenarios, getWorkspaceContext } from "../../workspace";
import { withWorkspaceFeature } from "../../plan-entitlements";

function safeFilename(value: string) {
  return (value.split(/[\\/]/).pop() ?? "documento").replace(/[^0-9A-Za-zÀ-ÿ._() -]/g, "_").slice(0, 120);
}

async function importBatch(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para importar documentos." }, { status: 401 });
  const workspace = await getWorkspaceContext(user.id);
  if (!workspace || !canPrepareScenarios(workspace.role)) return Response.json({ error: "Seu papel não permite importar documentos." }, { status: 403 });
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > FISCAL_BATCH_MAX_TOTAL_BYTES + 2_000_000) return Response.json({ error: "O lote excede 30 MB." }, { status: 413 });

  try {
    const form = await request.formData();
    const files = form.getAll("files").filter((entry): entry is File => entry instanceof File);
    if (!files.length || files.length > FISCAL_BATCH_MAX_FILES) return Response.json({ error: `Selecione de 1 a ${FISCAL_BATCH_MAX_FILES} arquivos.` }, { status: 400 });
    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
    if (totalBytes > FISCAL_BATCH_MAX_TOTAL_BYTES || files.some((file) => file.size < 20 || file.size > FISCAL_BATCH_MAX_FILE_BYTES)) return Response.json({ error: "Cada arquivo deve ter até 5 MB e o lote até 30 MB." }, { status: 413 });

    const items = [];
    for (const file of files) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      let inspection;
      try {
        const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
        inspection = inspectFiscalBatchText(safeFilename(file.name), text);
      } catch {
        inspection = { documentType: "unknown" as const, status: "blocked" as const, profileVersion: "fiscal-batch.v1", summary: {}, issues: ["Arquivo não está em UTF-8."] };
      }
      items.push({ filename: safeFilename(file.name), sizeBytes: file.size, sourceHash: (await sha256BatchSource(bytes)).slice(0, 16), ...inspection });
    }
    const batchId = crypto.randomUUID();
    const metrics = { total: items.length, accepted: items.filter((item) => item.status === "accepted").length, warning: items.filter((item) => item.status === "warning").length, blocked: items.filter((item) => item.status === "blocked").length };
    await ensureScenarioSchema();
    await env.DB.prepare("INSERT INTO audit_events (owner_user_id, company_id, scenario_id, event_type, event_data, created_at) VALUES (?, NULL, NULL, 'fiscal_batch.imported', ?, ?)")
      .bind(workspace.ownerUserId, JSON.stringify({ batchId, metrics, files: items.map((item) => ({ filename: item.filename, documentType: item.documentType, status: item.status, sourceHash: item.sourceHash })), rawFilesPersisted: false }), new Date().toISOString()).run();
    return Response.json({ batchId, metrics, items, rawFilesPersisted: false, message: "Lote processado em memória; os arquivos brutos foram descartados e somente o manifesto de auditoria foi registrado." }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "O lote foi interrompido antes de afetar a base fiscal." }, { status: 422 });
  }
}

export const POST = withApiTelemetry("POST /api/fiscal-imports", withWorkspaceFeature("batchImportEnabled", importBatch));

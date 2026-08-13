export const REPORT_BUILDER_VERSION = "report-builder-1";
export const REPORT_APPROVAL_SIGNATURE_VERSION = "report-approval-hmac-sha256-v1:k1";

export const reportBlockLibrary = [
  { id: "cover", label: "Capa e identidade", category: "system", required: true },
  { id: "executive_summary", label: "Resumo executivo", category: "commercial", required: false },
  { id: "indicators", label: "Indicadores", category: "technical", required: false },
  { id: "comparisons", label: "Comparativos", category: "technical", required: false },
  { id: "tax_evidence", label: "Tributos e evidências", category: "technical", required: true },
  { id: "calculation_memory", label: "Memória de cálculo", category: "technical", required: true },
  { id: "official_sources", label: "Fontes oficiais", category: "technical", required: true },
  { id: "pending_items", label: "Pendências", category: "technical", required: false },
  { id: "recommendations", label: "Recomendações", category: "commercial", required: false },
  { id: "attachments", label: "Anexos", category: "technical", required: false },
  { id: "technical_conclusion", label: "Conclusão fiscal", category: "technical", required: true },
  { id: "commercial_notes", label: "Comentários comerciais", category: "commercial", required: false },
  { id: "signature", label: "Aprovação e assinatura", category: "system", required: true },
] as const;

export type ReportBlockId = typeof reportBlockLibrary[number]["id"];
export type ReportBlockConfig = { id: ReportBlockId; enabled: boolean };
export type ReportBranding = { officeName: string; responsibleName: string; professionalRegistration: string; primaryColor: string; accentColor: string; footerText: string };

const requiredBlocks = new Set<ReportBlockId>(reportBlockLibrary.filter((item) => item.required).map((item) => item.id));
const knownBlocks = new Set<ReportBlockId>(reportBlockLibrary.map((item) => item.id));

export const reportTemplatePresets = [
  { key: "monthly-pme", name: "Fechamento mensal PME", serviceType: "fechamento_mensal", clientType: "pme", blocks: ["cover", "executive_summary", "indicators", "comparisons", "tax_evidence", "calculation_memory", "official_sources", "pending_items", "recommendations", "attachments", "technical_conclusion", "commercial_notes", "signature"] },
  { key: "tax-reform", name: "Impacto da Reforma Tributária", serviceType: "reforma_tributaria", clientType: "pme", blocks: ["cover", "executive_summary", "indicators", "comparisons", "tax_evidence", "calculation_memory", "official_sources", "pending_items", "recommendations", "technical_conclusion", "signature"] },
  { key: "icms-st", name: "Parecer de ICMS-ST", serviceType: "icms_st", clientType: "comercio_industria", blocks: ["cover", "executive_summary", "tax_evidence", "calculation_memory", "official_sources", "pending_items", "attachments", "technical_conclusion", "signature"] },
  { key: "services-retentions", name: "Serviços e retenções", serviceType: "servicos_retencoes", clientType: "prestador_tomador", blocks: ["cover", "executive_summary", "indicators", "tax_evidence", "calculation_memory", "official_sources", "pending_items", "recommendations", "technical_conclusion", "signature"] },
] as const;

export function defaultReportBlocks(): ReportBlockConfig[] {
  return reportTemplatePresets[0].blocks.map((id) => ({ id: id as ReportBlockId, enabled: true }));
}

export function normalizeReportBlocks(value: unknown): ReportBlockConfig[] {
  const rows = Array.isArray(value) ? value : [];
  const seen = new Set<string>();
  const normalized: ReportBlockConfig[] = [];
  for (const row of rows.slice(0, reportBlockLibrary.length)) {
    const item = row && typeof row === "object" ? row as Record<string, unknown> : {};
    const id = typeof item.id === "string" ? item.id : "";
    if (!knownBlocks.has(id as ReportBlockId) || seen.has(id)) continue;
    seen.add(id);
    normalized.push({ id: id as ReportBlockId, enabled: requiredBlocks.has(id as ReportBlockId) || item.enabled !== false });
  }
  for (const block of reportBlockLibrary) if (!seen.has(block.id)) normalized.push({ id: block.id, enabled: block.required });
  return normalized;
}

function clean(value: unknown, length: number) { return typeof value === "string" ? value.trim().slice(0, length) : ""; }
function color(value: unknown, fallback: string) { const text = clean(value, 7); return /^#[0-9a-f]{6}$/i.test(text) ? text.toUpperCase() : fallback; }

export function normalizeReportBranding(value: unknown, fallbackName = "CBSHub") : ReportBranding {
  const row = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    officeName: clean(row.officeName, 120) || fallbackName.slice(0, 120),
    responsibleName: clean(row.responsibleName, 120),
    professionalRegistration: clean(row.professionalRegistration, 60),
    primaryColor: color(row.primaryColor, "#083D3B"),
    accentColor: color(row.accentColor, "#B7F34A"),
    footerText: clean(row.footerText, 240) || "Relatório gerado em ambiente versionado CBSHub.",
  };
}

export function normalizeReportRecommendations(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 20).map((item) => clean(item, 300)).filter(Boolean);
}

export type ReportApprovalRecord = { reportId: string; workspaceId: number; revision: number; snapshotHash: string; reviewerUserId: number; reviewerName: string; professionalRegistration: string; decidedAt: string };
function canonicalApproval(record: ReportApprovalRecord) { return JSON.stringify(Object.fromEntries(Object.entries(record).sort(([a], [b]) => a.localeCompare(b)))); }
function hex(bytes: ArrayBuffer) { return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join(""); }

export async function signReportApproval(record: ReportApprovalRecord, secret: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(canonicalApproval(record))));
}

export function reportApprovalReady(input: { status: string; snapshotHash: string | null; revision: number; reviewerUserId: number | null; actorUserId: number; createdByUserId: number; workspaceType: string; professionalRegistration: string }) {
  const blockers: string[] = [];
  if (input.status !== "ready_for_review") blockers.push("report_not_ready");
  if (!input.snapshotHash || !/^[a-f0-9]{64}$/.test(input.snapshotHash)) blockers.push("snapshot_invalid");
  if (input.reviewerUserId !== input.actorUserId) blockers.push("reviewer_not_assigned");
  if (input.workspaceType === "office" && input.createdByUserId === input.actorUserId) blockers.push("second_person_required");
  if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z0-9 .\-\/]{5,60}$/.test(input.professionalRegistration.trim())) blockers.push("professional_registration_invalid");
  return { ready: blockers.length === 0, blockers };
}

function ascii(value: unknown) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, " ").replace(/\s+/g, " ").trim();
}
function pdfEscape(value: string) { return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)"); }
function wrap(value: string, width = 92) { const words = ascii(value).split(" "); const lines: string[] = []; let line = ""; for (const word of words) { if (!word) continue; if (`${line} ${word}`.trim().length > width && line) { lines.push(line); line = word; } else line = `${line} ${word}`.trim(); } if (line) lines.push(line); return lines.length ? lines : [""]; }

export function buildDeterministicReportPdf(input: { title: string; subtitle: string; brand: ReportBranding; snapshotHash: string; revision: number; blocks: Array<{ title: string; lines: string[] }>; approval?: { reviewerName: string; professionalRegistration: string; decidedAt: string } | null }) {
  const all: Array<{ text: string; size: number; bold?: boolean }> = [
    { text: ascii(input.brand.officeName), size: 17, bold: true }, { text: ascii(input.title), size: 15, bold: true }, { text: ascii(input.subtitle), size: 9 },
    { text: `Versao ${input.revision} | Snapshot #${ascii(input.snapshotHash).slice(0, 16)}`, size: 8 }, { text: "", size: 8 },
  ];
  for (const block of input.blocks) {
    all.push({ text: ascii(block.title).toUpperCase(), size: 11, bold: true });
    for (const line of block.lines) for (const wrapped of wrap(line)) all.push({ text: wrapped, size: 9 });
    all.push({ text: "", size: 6 });
  }
  if (input.approval) all.push({ text: "APROVACAO ASSINADA", size: 11, bold: true }, { text: `${ascii(input.approval.reviewerName)} | ${ascii(input.approval.professionalRegistration)} | ${ascii(input.approval.decidedAt)}`, size: 9 });
  all.push({ text: ascii(input.brand.footerText), size: 7 });

  const pages: typeof all[] = []; let current: typeof all = []; let used = 0;
  for (const row of all) { const height = Math.max(11, row.size + 4); if (used + height > 720 && current.length) { pages.push(current); current = []; used = 0; } current.push(row); used += height; }
  if (current.length) pages.push(current);
  const objects: string[] = []; const add = (value: string) => { objects.push(value); return objects.length; };
  const catalogId = add(""); const pagesId = add(""); const regularId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"); const boldId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  const pageIds: number[] = [];
  pages.forEach((rows, pageIndex) => {
    let y = 800; const commands: string[] = ["BT"];
    for (const row of rows) { y -= Math.max(11, row.size + 4); commands.push(`/${row.bold ? "F2" : "F1"} ${row.size} Tf 48 ${y} Td (${pdfEscape(row.text)}) Tj -48 -${y} Td`); }
    commands.push(`/F1 7 Tf 48 24 Td (Pagina ${pageIndex + 1} de ${pages.length} | CBSHub) Tj`, "ET");
    const stream = commands.join("\n"); const contentId = add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    pageIds.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${regularId} 0 R /F2 ${boldId} 0 R >> >> /Contents ${contentId} 0 R >>`));
  });
  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] = `<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] >>`;
  let pdf = "%PDF-1.4\n"; const offsets = [0];
  objects.forEach((object, index) => { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = pdf.length; pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `).join("\n")}\ntrailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

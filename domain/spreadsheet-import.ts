import { XMLParser } from "fast-xml-parser";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";

export const SPREADSHEET_IMPORT_VERSION = "spreadsheet-import-1";
export const MAX_SPREADSHEET_BYTES = 5 * 1024 * 1024;
export const MAX_SPREADSHEET_ROWS = 5000;
export const MAX_SPREADSHEET_COLUMNS = 60;

export const spreadsheetModels = {
  revenue: { label: "Faturamento", required: ["document_key", "date", "amount"], suggested: ["description", "status", "note"] },
  taxes: { label: "Impostos", required: ["document_key", "date", "amount", "tax_code"], suggested: ["description", "status", "note"] },
  withholdings: { label: "Retenções", required: ["document_key", "date", "amount", "tax_code"], suggested: ["description", "municipality_code", "status", "note"] },
  services: { label: "Serviços", required: ["document_key", "date", "amount", "description"], suggested: ["municipality_code", "tax_code", "status", "note"] },
  products: { label: "Produtos", required: ["document_key", "date", "amount", "description"], suggested: ["ncm", "cest", "tax_code", "status", "note"] },
  pending: { label: "Pendências", required: ["document_key", "description"], suggested: ["date", "status", "note"] },
} as const;
export type SpreadsheetModel = keyof typeof spreadsheetModels;
export type CanonicalSpreadsheetField = "document_key" | "date" | "amount" | "description" | "tax_code" | "municipality_code" | "ncm" | "cest" | "status" | "note";
export const canonicalSpreadsheetFields = ["document_key", "date", "amount", "description", "tax_code", "municipality_code", "ncm", "cest", "status", "note"] as const;
export type ColumnMapping = Record<string, CanonicalSpreadsheetField | "ignore">;

const fieldLabels: Record<CanonicalSpreadsheetField, string> = {
  document_key: "Chave do documento", date: "Data", amount: "Valor", description: "Descrição", tax_code: "Tributo",
  municipality_code: "Código do município", ncm: "NCM", cest: "CEST", status: "Status", note: "Observação",
};
const aliases: Record<CanonicalSpreadsheetField, string[]> = {
  document_key: ["documento", "chave", "chave_documento", "chave_do_documento", "numero", "numero_documento", "id"],
  date: ["data", "emissao", "data_emissao", "competencia"], amount: ["valor", "total", "valor_total", "montante"],
  description: ["descricao", "servico", "produto", "historico"], tax_code: ["tributo", "imposto", "codigo_tributo"],
  municipality_code: ["municipio", "codigo_municipio", "codigo_do_municipio", "ibge"], ncm: ["ncm"], cest: ["cest"],
  status: ["status", "situacao"], note: ["observacao", "observacoes", "nota", "comentario"],
};

export type ParsedSpreadsheet = { headers: string[]; rows: string[][]; formulaCells: Array<{ row: number; column: string }>; format: "csv" | "xlsx" };
export type NormalizedSpreadsheetRow = { rowNumber: number; documentKey: string; recordType: SpreadsheetModel; normalized: Record<string, string | number | null>; issues: string[]; status: "accepted" | "invalid" };

export function isSpreadsheetModel(value: unknown): value is SpreadsheetModel {
  return typeof value === "string" && Object.hasOwn(spreadsheetModels, value);
}

function normalizedHeader(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

export function inferColumnMapping(headers: string[]): ColumnMapping {
  return Object.fromEntries(headers.map((header) => {
    const normalized = normalizedHeader(header);
    const match = (Object.entries(aliases) as Array<[CanonicalSpreadsheetField, string[]]>).find(([, values]) => values.includes(normalized));
    return [header, match?.[0] ?? "ignore"];
  }));
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  const delimiter = (text.split(/\r?\n/, 1)[0].match(/;/g)?.length ?? 0) > (text.split(/\r?\n/, 1)[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted && char === '"' && text[index + 1] === '"') { cell += '"'; index += 1; continue; }
    if (char === '"') { quoted = !quoted; continue; }
    if (!quoted && char === delimiter) { row.push(cell); cell = ""; continue; }
    if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell); if (row.some((item) => item.trim())) rows.push(row); row = []; cell = ""; continue;
    }
    cell += char;
  }
  row.push(cell); if (row.some((item) => item.trim())) rows.push(row);
  return rows;
}

function asArray<T>(value: T | T[] | undefined): T[] { return value === undefined ? [] : Array.isArray(value) ? value : [value]; }
function richText(si: Record<string, unknown>) {
  if (typeof si.t === "string") return si.t;
  return asArray(si.r as Record<string, unknown> | Array<Record<string, unknown>> | undefined).map((run) => typeof run.t === "string" ? run.t : "").join("");
}

function parseXlsx(bytes: Uint8Array) {
  let files: Record<string, Uint8Array>;
  try { files = unzipSync(bytes); } catch { throw new Error("XLSX_INVALID_ZIP"); }
  const sheetFile = files["xl/worksheets/sheet1.xml"];
  if (!sheetFile) throw new Error("XLSX_FIRST_SHEET_REQUIRED");
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", parseTagValue: false, trimValues: false });
  const sharedFile = files["xl/sharedStrings.xml"];
  const shared = sharedFile ? asArray((parser.parse(strFromU8(sharedFile)).sst?.si) as Record<string, unknown> | Array<Record<string, unknown>> | undefined).map(richText) : [];
  const worksheet = parser.parse(strFromU8(sheetFile)).worksheet as Record<string, unknown>;
  const sheetData = worksheet.sheetData as Record<string, unknown> | undefined;
  const sourceRows = asArray(sheetData?.row as Record<string, unknown> | Array<Record<string, unknown>> | undefined);
  const matrix: string[][] = [];
  const formulaCells: Array<{ row: number; column: string }> = [];
  for (const sourceRow of sourceRows) {
    const rowNumber = Number(sourceRow["@_r"] ?? matrix.length + 1);
    const values: string[] = [];
    for (const cell of asArray(sourceRow.c as Record<string, unknown> | Array<Record<string, unknown>> | undefined)) {
      const reference = String(cell["@_r"] ?? "A1");
      const letters = reference.match(/^[A-Z]+/)?.[0] ?? "A";
      let columnIndex = 0; for (const letter of letters) columnIndex = columnIndex * 26 + letter.charCodeAt(0) - 64; columnIndex -= 1;
      if (cell.f !== undefined) { formulaCells.push({ row: rowNumber, column: letters }); values[columnIndex] = ""; continue; }
      const type = String(cell["@_t"] ?? "");
      const raw = cell.v ?? (cell.is as Record<string, unknown> | undefined)?.t ?? "";
      values[columnIndex] = type === "s" ? shared[Number(raw)] ?? "" : String(raw ?? "");
    }
    matrix.push(values);
  }
  return { rows: matrix, formulaCells };
}

export function parseSpreadsheet(input: { filename: string; bytes: Uint8Array }): ParsedSpreadsheet {
  if (!input.bytes.length || input.bytes.length > MAX_SPREADSHEET_BYTES) throw new Error("SPREADSHEET_SIZE_LIMIT");
  const lower = input.filename.toLowerCase();
  const format = lower.endsWith(".csv") ? "csv" : lower.endsWith(".xlsx") ? "xlsx" : null;
  if (!format) throw new Error("SPREADSHEET_FORMAT_UNSUPPORTED");
  const parsed = format === "csv" ? { rows: parseCsv(new TextDecoder().decode(input.bytes)), formulaCells: [] } : parseXlsx(input.bytes);
  if (parsed.rows.length < 2) throw new Error("SPREADSHEET_EMPTY");
  if (parsed.rows.length - 1 > MAX_SPREADSHEET_ROWS) throw new Error("SPREADSHEET_ROW_LIMIT");
  const headers = parsed.rows[0].map((item, index) => item.trim().slice(0, 120) || `Coluna ${index + 1}`);
  if (headers.length > MAX_SPREADSHEET_COLUMNS) throw new Error("SPREADSHEET_COLUMN_LIMIT");
  if (new Set(headers).size !== headers.length) throw new Error("SPREADSHEET_DUPLICATE_HEADERS");
  return { headers, rows: parsed.rows.slice(1).map((row) => headers.map((_, index) => String(row[index] ?? "").slice(0, 500))), formulaCells: parsed.formulaCells, format };
}

function formulaLike(value: string) { return /^[=+@]/.test(value.trim()) || /^-(?!\d|[.,]\d)/.test(value.trim()); }
function parseDate(value: string) {
  const clean = value.trim();
  let match = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  match = clean.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
}
function parseMoney(value: string) {
  let clean = value.trim().replace(/R\$\s?/gi, "").replace(/\s/g, "");
  if (!clean) return null;
  if (clean.includes(",")) clean = clean.replace(/\./g, "").replace(",", ".");
  else if ((clean.match(/\./g) ?? []).length > 1) clean = clean.replace(/\./g, "");
  if (!/^-?\d+(\.\d{1,2})?$/.test(clean)) return null;
  const [whole, decimal = ""] = clean.split(".");
  const negative = whole.startsWith("-");
  const cents = Number(whole.replace("-", "")) * 100 + Number(decimal.padEnd(2, "0"));
  return Number.isSafeInteger(cents) ? (negative ? -cents : cents) : null;
}

export function normalizeSpreadsheet(parsed: ParsedSpreadsheet, model: SpreadsheetModel, mapping: ColumnMapping) {
  const required = spreadsheetModels[model].required as readonly CanonicalSpreadsheetField[];
  const mapped = new Set(Object.values(mapping).filter((item) => item !== "ignore"));
  const missingColumns = required.filter((field) => !mapped.has(field));
  const formulaSet = new Set(parsed.formulaCells.map((item) => `${item.row}:${item.column}`));
  const rows: NormalizedSpreadsheetRow[] = parsed.rows.map((source, rowIndex) => {
    const normalized: Record<string, string | number | null> = {};
    const issues = missingColumns.map((field) => `missing_column:${field}`);
    for (const [columnIndex, header] of parsed.headers.entries()) {
      const target = mapping[header] ?? "ignore";
      if (target === "ignore") continue;
      const sourceValue = source[columnIndex]?.trim() ?? "";
      const letters = columnName(columnIndex + 1);
      if (formulaSet.has(`${rowIndex + 2}:${letters}`) || formulaLike(sourceValue)) { normalized[target] = null; issues.push(`formula_discarded:${header}`); continue; }
      if (target === "amount") { const cents = parseMoney(sourceValue); normalized[target] = cents; if (sourceValue && cents === null) issues.push(`invalid_money:${header}`); }
      else if (target === "date") { const date = parseDate(sourceValue); normalized[target] = date; if (sourceValue && !date) issues.push(`invalid_date:${header}`); }
      else normalized[target] = sourceValue.slice(0, 500);
    }
    for (const field of required) if (normalized[field] === undefined || normalized[field] === null || normalized[field] === "") issues.push(`required:${field}`);
    return { rowNumber: rowIndex + 2, documentKey: String(normalized.document_key ?? `row-${rowIndex + 2}`).slice(0, 160), recordType: model, normalized, issues: [...new Set(issues)], status: issues.length ? "invalid" : "accepted" };
  });
  return { rows, missingColumns, summary: { total: rows.length, accepted: rows.filter((row) => row.status === "accepted").length, invalid: rows.filter((row) => row.status === "invalid").length, formulasDiscarded: rows.reduce((total, row) => total + row.issues.filter((issue) => issue.startsWith("formula_discarded:")).length, 0) } };
}

function columnName(index: number) { let name = ""; while (index > 0) { index -= 1; name = String.fromCharCode(65 + (index % 26)) + name; index = Math.floor(index / 26); } return name; }
function xmlEscape(value: string) { return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

export function officialTemplate(model: SpreadsheetModel, format: "csv" | "xlsx") {
  const fields = [...spreadsheetModels[model].required, ...spreadsheetModels[model].suggested];
  const labels = fields.map((field) => fieldLabels[field]);
  if (format === "csv") return { bytes: new TextEncoder().encode(`\uFEFF${labels.join(";")}\r\n`), contentType: "text/csv; charset=utf-8", extension: "csv" };
  const cells = labels.map((label, index) => `<c r="${columnName(index + 1)}1" t="inlineStr"><is><t>${xmlEscape(label)}</t></is></c>`).join("");
  const files = {
    "[Content_Types].xml": strToU8('<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'),
    "_rels/.rels": strToU8('<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'),
    "xl/workbook.xml": strToU8('<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Importação CBSHub" sheetId="1" r:id="rId1"/></sheets></workbook>'),
    "xl/_rels/workbook.xml.rels": strToU8('<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'),
    "xl/worksheets/sheet1.xml": strToU8(`<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1">${cells}</row><row r="2"></row></sheetData></worksheet>`),
  };
  return { bytes: zipSync(files, { level: 6 }), contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", extension: "xlsx" };
}

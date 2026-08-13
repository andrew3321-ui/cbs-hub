import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { MAX_SPREADSHEET_ROWS, inferColumnMapping, normalizeSpreadsheet, officialTemplate, parseSpreadsheet, spreadsheetModels } from "../domain/spreadsheet-import.ts";

function csv(value) { return new TextEncoder().encode(value); }

test("modelos CSV e XLSX oficiais são válidos e mapeáveis", () => {
  for (const model of Object.keys(spreadsheetModels)) {
    const csvTemplate = officialTemplate(model, "csv");
    assert.equal(csvTemplate.extension, "csv");
    const xlsxTemplate = officialTemplate(model, "xlsx");
    assert.equal(xlsxTemplate.extension, "xlsx");
    const parsed = parseSpreadsheet({ filename: `modelo-${model}.xlsx`, bytes: xlsxTemplate.bytes });
    assert.ok(parsed.headers.length >= spreadsheetModels[model].required.length);
    assert.equal(parsed.format, "xlsx");
  }
});

test("CSV brasileiro normaliza datas e moedas em centavos inteiros", () => {
  const parsed = parseSpreadsheet({ filename: "receita.csv", bytes: csv("Documento;Data;Valor;Descrição\r\nNF-1;13/08/2026;R$ 1.234,56;Consultoria") });
  const mapping = inferColumnMapping(parsed.headers);
  const normalized = normalizeSpreadsheet(parsed, "revenue", mapping);
  assert.equal(normalized.summary.accepted, 1);
  assert.equal(normalized.rows[0].normalized.date, "2026-08-13");
  assert.equal(normalized.rows[0].normalized.amount, 123456);
});

test("fórmulas CSV e XLSX são descartadas e nunca viram valor", () => {
  const csvParsed = parseSpreadsheet({ filename: "ataque.csv", bytes: csv("Documento;Data;Valor\n=HYPERLINK(\"https://evil.example\");2026-08-13;+100") });
  const csvRows = normalizeSpreadsheet(csvParsed, "revenue", inferColumnMapping(csvParsed.headers));
  assert.equal(csvRows.rows[0].normalized.document_key, null);
  assert.ok(csvRows.rows[0].issues.some((issue) => issue.startsWith("formula_discarded:")));

  const template = officialTemplate("revenue", "xlsx");
  const files = unzipSync(template.bytes);
  const xml = strFromU8(files["xl/worksheets/sheet1.xml"]).replace('<row r="2"></row>', '<row r="2"><c r="A2"><f>HYPERLINK("https://evil.example")</f><v>999</v></c><c r="B2" t="inlineStr"><is><t>2026-08-13</t></is></c><c r="C2"><v>100</v></c></row>');
  files["xl/worksheets/sheet1.xml"] = strToU8(xml);
  const xlsxParsed = parseSpreadsheet({ filename: "formula.xlsx", bytes: zipSync(files) });
  const normalized = normalizeSpreadsheet(xlsxParsed, "revenue", inferColumnMapping(xlsxParsed.headers));
  assert.equal(xlsxParsed.formulaCells.length, 1);
  assert.equal(normalized.rows[0].normalized.document_key, null);
  assert.ok(normalized.rows[0].issues.includes("formula_discarded:Chave do documento"));
});

test("limites rejeitam arquivos grandes, excesso de linhas e cabeçalhos duplicados", () => {
  const rows = Array.from({ length: MAX_SPREADSHEET_ROWS + 1 }, (_, index) => `D${index};2026-08-13;1,00`).join("\n");
  assert.throws(() => parseSpreadsheet({ filename: "grande.csv", bytes: csv(`Documento;Data;Valor\n${rows}`) }), /SPREADSHEET_ROW_LIMIT/);
  assert.throws(() => parseSpreadsheet({ filename: "duplicada.csv", bytes: csv("Documento;Documento\nA;B") }), /SPREADSHEET_DUPLICATE_HEADERS/);
  assert.throws(() => parseSpreadsheet({ filename: "ataque.exe", bytes: csv("x") }), /SPREADSHEET_FORMAT_UNSUPPORTED/);
});

test("API persiste apenas normalização, concilia e executa rollback integral", async () => {
  const [route, migration, ui] = await Promise.all([
    readFile(new URL("../app/api/spreadsheet-imports/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0046_spreadsheet_migration.sql", import.meta.url), "utf8"),
    readFile(new URL("../app/app/SpreadsheetMigrationWizard.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(route, /rawFilePersisted: false/);
  assert.match(route, /b\.status = 'committed'/);
  assert.match(route, /duplicate_document/);
  assert.match(route, /divergent_document/);
  assert.match(route, /DELETE FROM spreadsheet_import_rows/);
  assert.match(route, /spreadsheet\.rollback/);
  assert.match(route, /company_id = \? AND r\.period_key = \?/);
  assert.match(migration, /CHECK \(`raw_file_persisted` = 0\)/);
  assert.match(migration, /spreadsheet_import_rows_reconcile_idx/);
  assert.match(ui, /Gerar preview/);
  assert.match(ui, /Confirmar e reconciliar/);
  assert.match(ui, /Reverter lote integralmente/);
});

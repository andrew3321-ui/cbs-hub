import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildDeterministicReportPdf, defaultReportBlocks, normalizeReportBlocks, normalizeReportBranding, reportApprovalReady, REPORT_APPROVAL_SIGNATURE_VERSION, reportBlockLibrary, reportTemplatePresets, signReportApproval } from "../domain/report-builder.ts";

test("biblioteca cobre blocos executivos, técnicos, comerciais e assinatura", () => {
  const ids = reportBlockLibrary.map((item) => item.id);
  for (const id of ["executive_summary", "indicators", "comparisons", "tax_evidence", "calculation_memory", "official_sources", "pending_items", "recommendations", "attachments", "technical_conclusion", "commercial_notes", "signature"]) assert.ok(ids.includes(id));
  assert.ok(reportTemplatePresets.length >= 4);
  assert.ok(new Set(reportTemplatePresets.map((item) => `${item.serviceType}:${item.clientType}`)).size === reportTemplatePresets.length);
});

test("blocos obrigatórios não podem ser removidos ou desativados", () => {
  const blocks = normalizeReportBlocks([{ id: "commercial_notes", enabled: false }, { id: "signature", enabled: false }, { id: "signature", enabled: true }, { id: "evil", enabled: true }]);
  assert.equal(blocks.find((item) => item.id === "signature")?.enabled, true);
  assert.equal(blocks.find((item) => item.id === "commercial_notes")?.enabled, false);
  assert.equal(blocks.some((item) => item.id === "evil"), false);
  assert.equal(new Set(blocks.map((item) => item.id)).size, reportBlockLibrary.length);
  assert.ok(defaultReportBlocks().every((item) => item.enabled));
});

test("identidade é limitada e cores inválidas voltam ao padrão", () => {
  const brand = normalizeReportBranding({ officeName: " Escritório Alfa ", primaryColor: "red", accentColor: "#12abEF", footerText: "x".repeat(500) });
  assert.equal(brand.officeName, "Escritório Alfa");
  assert.equal(brand.primaryColor, "#083D3B");
  assert.equal(brand.accentColor, "#12ABEF");
  assert.equal(brand.footerText.length, 240);
});

test("aprovação exige versão congelada, revisor designado e segunda pessoa no escritório", async () => {
  const base = { status: "ready_for_review", snapshotHash: "a".repeat(64), revision: 4, reviewerUserId: 8, actorUserId: 8, createdByUserId: 7, workspaceType: "office", professionalRegistration: "CRC SP-123456/O-7" };
  assert.deepEqual(reportApprovalReady(base), { ready: true, blockers: [] });
  assert.ok(reportApprovalReady({ ...base, actorUserId: 7, createdByUserId: 7 }).blockers.includes("second_person_required"));
  assert.ok(reportApprovalReady({ ...base, snapshotHash: null }).blockers.includes("snapshot_invalid"));
  const record = { reportId: "r1", workspaceId: 1, revision: 4, snapshotHash: "a".repeat(64), reviewerUserId: 8, reviewerName: "Revisor", professionalRegistration: "CRC SP-123456/O-7", decidedAt: "2026-08-13T12:00:00.000Z" };
  const first = await signReportApproval(record, "s".repeat(40)); const second = await signReportApproval(record, "s".repeat(40));
  assert.equal(first, second); assert.equal(first.length, 64); assert.notEqual(first, await signReportApproval({ ...record, revision: 5 }, "s".repeat(40))); assert.match(REPORT_APPROVAL_SIGNATURE_VERSION, /hmac-sha256/);
});

test("PDF é determinístico, paginado e contém somente bytes estáveis", () => {
  const input = { title: "Relatório fiscal", subtitle: "08/2026", brand: normalizeReportBranding({ officeName: "Alfa" }), snapshotHash: "b".repeat(64), revision: 3, blocks: [{ title: "Memória", lines: Array.from({ length: 90 }, (_, index) => `Linha técnica ${index + 1} com valor em centavos`) }], approval: null };
  const first = buildDeterministicReportPdf(input); const second = buildDeterministicReportPdf(input);
  assert.deepEqual(first, second); const text = new TextDecoder().decode(first); assert.ok(text.startsWith("%PDF-1.4")); assert.match(text, /\/Count [2-9]/); assert.match(text, /Snapshot #bbbbbbbbbbbbbbbb/);
});

test("API, migration e UI preservam snapshots, separação comercial e exportação", async () => {
  const [route, reports, migration, ui] = await Promise.all([
    readFile(new URL("../app/api/report-builder/route.ts", import.meta.url), "utf8"), readFile(new URL("../app/api/reports/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0047_report_builder.sql", import.meta.url), "utf8"), readFile(new URL("../app/app/ReportBuilderPanel.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(route, /reportApprovalReady/); assert.match(route, /signReportApproval/); assert.match(route, /X-CBSHub-PDF-SHA256/); assert.match(route, /report_exports/); assert.match(route, /workspace_id = \?/);
  assert.match(reports, /schemaVersion: "report-builder-1"/); assert.match(reports, /commercialNotes/); assert.match(reports, /blocks/);
  assert.match(migration, /report_templates/); assert.match(migration, /report_workspace_branding/); assert.match(migration, /report_approvals_report_revision_idx/); assert.match(migration, /report_exports/);
  assert.match(ui, /CONTEÚDO COMERCIAL — NÃO ALTERA A CONCLUSÃO FISCAL/); assert.match(ui, /Abrir preview/); assert.match(ui, /Baixar PDF/); assert.match(ui, /Aprovar e assinar versão/);
});

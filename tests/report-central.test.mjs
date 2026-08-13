import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { canonicalReportSnapshot, isReportArtifactType, isReportPeriod, normalizeIndicators, normalizePendingItems, reportPermissions, reportReviewReadiness } from "../domain/report-central.ts";

test("competência e artefatos aceitam somente o domínio suportado", () => {
  assert.equal(isReportPeriod("2026-08"), true);
  assert.equal(isReportPeriod("2026-13"), false);
  assert.equal(isReportPeriod("2019-12"), false);
  assert.equal(isReportArtifactType("document"), true);
  assert.equal(isReportArtifactType("spreadsheet_guess"), false);
});

test("papéis separam preparação e revisão sem ampliar acesso", () => {
  assert.deepEqual(reportPermissions("preparer", 9, 9), { canCreate: true, canEdit: true, canReview: false });
  assert.deepEqual(reportPermissions("preparer", 9, 8), { canCreate: true, canEdit: false, canReview: false });
  assert.deepEqual(reportPermissions("reviewer", 9, 8), { canCreate: false, canEdit: false, canReview: true });
  assert.deepEqual(reportPermissions("admin", 9, 8), { canCreate: true, canEdit: true, canReview: true });
});

test("snapshot canônico é estável e entradas são limitadas", () => {
  assert.equal(canonicalReportSnapshot({ b: 2, a: { d: 4, c: 3 } }), canonicalReportSnapshot({ a: { c: 3, d: 4 }, b: 2 }));
  assert.deepEqual(normalizePendingItems([{ id: "x", text: " Conferir XML ", resolved: true }, { text: "" }]), [{ id: "x", text: "Conferir XML", resolved: true }]);
  assert.deepEqual(normalizeIndicators({ receita: 10, nota: " conferida " }), { receita: 10, nota: "conferida" });
});

test("fluxo ponta a ponta só chega à revisão com snapshot, parecer e pendências fechadas", () => {
  assert.deepEqual(reportReviewReadiness({ conclusion: "", snapshotHash: null, pendingItems: [{ resolved: false }] }), { ready: false, blockers: ["snapshot_missing", "conclusion_incomplete", "pending_items_open"] });
  const snapshot = canonicalReportSnapshot({ companyId: 7, periodKey: "2026-08", revision: 2, artifacts: [{ type: "document", hash: "a".repeat(64) }] });
  assert.ok(snapshot.includes("2026-08"));
  assert.deepEqual(reportReviewReadiness({ conclusion: "Parecer concluído com evidências vinculadas.", snapshotHash: "b".repeat(64), pendingItems: [{ resolved: true }] }), { ready: true, blockers: [] });
});

test("API isola workspace, valida evidência e bloqueia concorrência", async () => {
  const [route, migration, ui, app] = await Promise.all([
    readFile(new URL("../app/api/reports/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0045_report_central.sql", import.meta.url), "utf8"),
    readFile(new URL("../app/app/ReportCenter.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/app/CBSHubApp.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(route, /r\.workspace_id = \?/);
  assert.match(route, /c\.workspace_id = r\.workspace_id/);
  assert.match(route, /REPORT_REVISION_CONFLICT/);
  assert.match(route, /AND revision = \? AND status IN/);
  assert.match(route, /artifactEvidence/);
  assert.match(route, /snapshotHash = await sha256Hex/);
  assert.match(route, /workspace\.type === "office" && reviewer\.id === report\.created_by_user_id/);
  assert.match(migration, /UNIQUE INDEX `report_work_items_workspace_company_period_idx`/);
  assert.match(migration, /report_work_item_revisions_report_revision_idx/);
  assert.match(migration, /CHECK \(`artifact_type` IN/);
  assert.match(ui, /Salvando…/);
  assert.match(ui, /Conflito de versão/);
  assert.match(ui, /Nenhum relatório nesta competência/);
  assert.match(ui, /Enviar para revisão/);
  assert.match(app, /Central de relatórios/);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  classifyCapturedChange,
  governedNormativeSources,
  NORMATIVE_MONITOR_BATCH_SIZE,
  ruleHealthStatus,
  sourcesForMonitorDate,
  validateGovernedSourceCatalog,
} from "../domain/normative-governance.ts";

const root = new URL("../", import.meta.url);

test("catálogo normativo exige identidade, jurisdição, dispositivo, HTTPS e vigência para evidência", () => {
  const validation = validateGovernedSourceCatalog();
  assert.equal(validation.passed, true, validation.errors.join("\n"));
  assert.equal(validation.sources, governedNormativeSources.length);
  assert.ok(validation.sources >= 60);
  assert.equal(new Set(governedNormativeSources.map((source) => source.code)).size, governedNormativeSources.length);
  for (const source of governedNormativeSources) {
    assert.match(source.url, /^https:\/\//);
    assert.ok(source.jurisdiction);
    assert.ok(source.legalDevice);
    assert.ok(source.impactedRuleCodes.length > 0);
    if (source.verificationStatus === "rule_evidence") assert.match(source.effectiveFrom, /^\d{4}-\d{2}-\d{2}$/);
  }
});

test("rotação diária é determinística e cobre o catálogo durante um ciclo", () => {
  const first = sourcesForMonitorDate("2026-07-26");
  const repeated = sourcesForMonitorDate("2026-07-26");
  assert.deepEqual(first.sources.map((source) => source.code), repeated.sources.map((source) => source.code));
  assert.equal(first.sources.length, Math.min(NORMATIVE_MONITOR_BATCH_SIZE, governedNormativeSources.length));

  const covered = new Set();
  for (let day = 0; day < first.cycleDays; day += 1) {
    const date = new Date(Date.UTC(2026, 6, 26 + day)).toISOString().slice(0, 10);
    for (const source of sourcesForMonitorDate(date).sources) covered.add(source.code);
  }
  assert.equal(covered.size, governedNormativeSources.length);
});

test("capturas distinguem baseline, alteração, indisponibilidade e recuperação", () => {
  const checked = { sourceCode: "SEFAZ-SP", status: "checked", contentHash: "a" };
  assert.equal(classifyCapturedChange(null, checked), "baseline");
  assert.equal(classifyCapturedChange(checked, checked), "unchanged");
  assert.equal(classifyCapturedChange(checked, { ...checked, contentHash: "b" }), "content_changed");
  assert.equal(classifyCapturedChange(checked, { ...checked, status: "unavailable", contentHash: null }), "unavailable");
  assert.equal(classifyCapturedChange({ ...checked, status: "unavailable", contentHash: null }, checked), "recovered");
});

test("saúde da regra sinaliza ausência de fonte, futuro, vencimento e validade", () => {
  assert.equal(ruleHealthStatus({ effectiveFrom: "2020-01-01", effectiveTo: "2030-01-01", sourceCount: 0 }, "2026-07-26"), "missing_source");
  assert.equal(ruleHealthStatus({ effectiveFrom: "2027-01-01", effectiveTo: "2030-01-01", sourceCount: 1 }, "2026-07-26"), "future");
  assert.equal(ruleHealthStatus({ effectiveFrom: "2020-01-01", effectiveTo: "2026-07-20", sourceCount: 1 }, "2026-07-26"), "expired");
  assert.equal(ruleHealthStatus({ effectiveFrom: "2020-01-01", effectiveTo: "2026-08-10", sourceCount: 1 }, "2026-07-26"), "expiring");
  assert.equal(ruleHealthStatus({ effectiveFrom: "2020-01-01", effectiveTo: "2027-12-31", sourceCount: 1 }, "2026-07-26"), "current");
});

test("governança persiste fila, revisão, releases, invalidações, notificações e auditoria", async () => {
  const [service, reviewRoute, shareRoute, publicReport, migration, worker, config, panel] = await Promise.all([
    readFile(new URL("app/normative-governance-service.ts", root), "utf8"),
    readFile(new URL("app/api/normative-monitor/review/route.ts", root), "utf8"),
    readFile(new URL("app/api/fiscal-dossier-shares/route.ts", root), "utf8"),
    readFile(new URL("app/dossie/[token]/page.tsx", root), "utf8"),
    readFile(new URL("drizzle/0026_plain_vin_gonzales.sql", root), "utf8"),
    readFile(new URL("worker/index.ts", root), "utf8"),
    readFile(new URL("vite.config.ts", root), "utf8"),
    readFile(new URL("app/app/NationalCoverageCenter.tsx", root), "utf8"),
  ]);

  for (const table of [
    "normative_sources",
    "normative_monitor_runs",
    "normative_source_snapshots",
    "normative_change_events",
    "normative_change_reviews",
    "fiscal_rule_releases",
    "fiscal_result_invalidations",
    "governance_notifications",
    "normative_governance_audit_events",
  ]) {
    assert.match(migration, new RegExp(`CREATE TABLE \\\`${table}\\\``));
    assert.match(service, new RegExp(table));
  }

  assert.match(service, /fiscal_dossier\.normative_change_detected/);
  assert.match(service, /status = 'open'/);
  assert.match(reviewRoute, /getPlatformAdminUser/);
  assert.match(reviewRoute, /\["accountant", "tax_lawyer"\]/);
  assert.match(reviewRoute, /SCENARIO_SIGNING_KEY_V1/);
  assert.match(reviewRoute, /previous_release_hash/);
  assert.match(reviewRoute, /affectedRuleCodes/);
  assert.match(reviewRoute, /dismissed_no_legal_impact/);
  assert.match(shareRoute, /FISCAL_RESULT_INVALIDATED/);
  assert.match(publicReport, /normativeReviewBlocked/);
  assert.match(worker, /async scheduled/);
  assert.match(worker, /runNormativeMonitor/);
  assert.match(config, /crons: \["15 8 \* \* \*"\]/);
  assert.match(panel, /FILA DE ANÁLISE/);
  assert.match(panel, /SAÚDE DAS REGRAS/);
  assert.match(panel, /Registrar decisão profissional assinada/);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  classifyCapturedChange,
  governedNormativeSources,
  NORMATIVE_MONITOR_BATCH_SIZE,
  NORMATIVE_MONITOR_MAX_SUBREQUESTS_PER_SOURCE,
  NORMATIVE_MONITOR_SHARD_COUNT,
  normativeMonitorShardForScheduledTime,
  ruleHealthStatus,
  sourcesForMonitorDate,
  validateGovernedSourceCatalog,
} from "../domain/normative-governance.ts";
import { captureNormativeSource } from "../app/normative-governance-service.ts";

const root = new URL("../", import.meta.url);

test("catálogo normativo exige identidade, frequência, criticidade, fonte e vigência", () => {
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
    assert.equal(source.monitoringFrequency, "daily");
    assert.ok(["critical", "high", "standard"].includes(source.criticality));
    if (source.verificationStatus === "rule_evidence") assert.match(source.effectiveFrom, /^\d{4}-\d{2}-\d{2}$/);
    if (source.officialAlternativeUrl) {
      assert.match(source.officialAlternativeUrl, /^https:\/\//);
      assert.notEqual(source.officialAlternativeUrl, source.url);
      assert.equal(source.alternativeEvidenceScope, "technical_availability_only");
    }
  }
});

test("monitor diário é determinístico e cobre o catálogo inteiro a cada ciclo", () => {
  const first = sourcesForMonitorDate("2026-07-26");
  const repeated = sourcesForMonitorDate("2026-07-26");
  assert.ok(NORMATIVE_MONITOR_BATCH_SIZE > 0);
  assert.deepEqual(first.sources.map((source) => source.code), repeated.sources.map((source) => source.code));
  assert.equal(first.sources.length, governedNormativeSources.length);
  assert.equal(first.cycleDays, 1);
  assert.equal(new Set(first.sources.map((source) => source.code)).size, governedNormativeSources.length);
  const sharded = Array.from({ length: NORMATIVE_MONITOR_SHARD_COUNT }, (_, shard) => sourcesForMonitorDate("2026-07-26", governedNormativeSources, shard, NORMATIVE_MONITOR_SHARD_COUNT));
  assert.equal(new Set(sharded.flatMap((item) => item.sources.map((source) => source.code))).size, governedNormativeSources.length);
  assert.ok(sharded.every((item) => item.sources.length <= Math.ceil(governedNormativeSources.length / NORMATIVE_MONITOR_SHARD_COUNT)));
  assert.ok(sharded.every((item) => item.sources.length <= NORMATIVE_MONITOR_BATCH_SIZE));
  assert.ok(sharded.every((item) => item.sources.length * NORMATIVE_MONITOR_MAX_SUBREQUESTS_PER_SOURCE <= 50));
});

test("capturas distinguem mudança técnica, editorial, potencialmente normativa e disponibilidade", () => {
  const checked = { sourceCode: "SEFAZ-SP", status: "checked", contentHash: "a" };
  assert.equal(classifyCapturedChange(null, checked), "baseline");
  assert.equal(classifyCapturedChange(checked, checked), "unchanged");
  assert.equal(classifyCapturedChange(checked, { ...checked, contentHash: "b" }), "potentially_normative_change");
  assert.equal(classifyCapturedChange({ ...checked, normalizedContentHash: "same" }, { ...checked, contentHash: "b", normalizedContentHash: "same" }), "editorial_change");
  assert.equal(classifyCapturedChange({ ...checked, finalUrl: "https://a.gov.br/ato" }, { ...checked, finalUrl: "https://a.gov.br/novo" }), "technical_change");
  assert.equal(classifyCapturedChange(checked, { ...checked, status: "unavailable", contentHash: null }), "unavailable");
  assert.equal(classifyCapturedChange({ ...checked, status: "unavailable", contentHash: null }, checked), "recovered");
});

test("captura aplica retry, não persiste conteúdo e usa alternativa só como disponibilidade técnica", async () => {
  const source = governedNormativeSources.find((item) => item.officialAlternativeUrl);
  assert.ok(source);
  let calls = 0;
  const recovered = await captureNormativeSource({ ...source, officialAlternativeUrl: null, alternativeEvidenceScope: "not_available" }, async () => {
    calls += 1;
    if (calls < 2) return new Response("temporário", { status: 503 });
    return new Response("<html><body>Ato oficial 123</body></html>", { status: 200, headers: { etag: "v1" } });
  });
  assert.equal(recovered.status, "checked");
  assert.equal(recovered.attempts, 2);
  assert.match(recovered.contentHash, /^[0-9a-f]{64}$/);
  assert.match(recovered.normalizedContentHash, /^[0-9a-f]{64}$/);
  assert.ok(recovered.bytesHashed > 0);
  assert.equal("content" in recovered, false);

  calls = 0;
  const fallback = await captureNormativeSource(source, async (url) => {
    calls += 1;
    return new Response(url === source.officialAlternativeUrl ? "índice oficial" : "ausente", { status: url === source.officialAlternativeUrl ? 200 : 404 });
  });
  assert.equal(fallback.status, "unavailable");
  assert.equal(fallback.accessPath, "official_alternative");
  assert.equal(fallback.contentHash, null);
  assert.equal(fallback.alternativeHttpStatus, 200);
  assert.equal(calls, 2);
});

test("saúde da regra sinaliza ausência de fonte, futuro, vencimento e validade", () => {
  assert.equal(ruleHealthStatus({ effectiveFrom: "2020-01-01", effectiveTo: "2030-01-01", sourceCount: 0 }, "2026-07-26"), "missing_source");
  assert.equal(ruleHealthStatus({ effectiveFrom: "2027-01-01", effectiveTo: "2030-01-01", sourceCount: 1 }, "2026-07-26"), "future");
  assert.equal(ruleHealthStatus({ effectiveFrom: "2020-01-01", effectiveTo: "2026-07-20", sourceCount: 1 }, "2026-07-26"), "expired");
  assert.equal(ruleHealthStatus({ effectiveFrom: "2020-01-01", effectiveTo: "2026-08-10", sourceCount: 1 }, "2026-07-26"), "expiring");
  assert.equal(ruleHealthStatus({ effectiveFrom: "2020-01-01", effectiveTo: "2027-12-31", sourceCount: 1 }, "2026-07-26"), "current");
});

test("twelve daily source shards share the 30-minute cron without duplicate runs", () => {
  const at = (hour, minute = 0) => Date.UTC(2026, 7, 1, hour, minute, 0);
  for (let shard = 0; shard < 12; shard += 1) {
    assert.equal(normativeMonitorShardForScheduledTime("*/30 * * * *", at(shard * 2)), shard);
  }
  assert.equal(normativeMonitorShardForScheduledTime("*/30 * * * *", at(8, 30)), null);
  assert.equal(normativeMonitorShardForScheduledTime("15 8 * * *", at(8)), null);
  assert.equal(normativeMonitorShardForScheduledTime("*/30 * * * *", at(9)), null);
});

test("governança persiste fila, classificação, revisão, bloqueio, histórico e auditoria", async () => {
  const [service, reviewRoute, shareRoute, publicReport, migration, dailyMigration, worker, config, panel] = await Promise.all([
    readFile(new URL("app/normative-governance-service.ts", root), "utf8"),
    readFile(new URL("app/api/normative-monitor/review/route.ts", root), "utf8"),
    readFile(new URL("app/api/fiscal-dossier-shares/route.ts", root), "utf8"),
    readFile(new URL("app/dossie/[token]/page.tsx", root), "utf8"),
    readFile(new URL("drizzle/0026_plain_vin_gonzales.sql", root), "utf8"),
    readFile(new URL("drizzle/0034_hard_ted_forrester.sql", root), "utf8"),
    readFile(new URL("worker/index.ts", root), "utf8"),
    readFile(new URL("vite.config.ts", root), "utf8"),
    readFile(new URL("app/app/NationalCoverageCenter.tsx", root), "utf8"),
  ]);
  for (const table of ["normative_sources", "normative_monitor_runs", "normative_source_snapshots", "normative_change_events", "normative_change_reviews", "fiscal_rule_releases", "fiscal_result_invalidations", "governance_notifications", "normative_governance_audit_events"]) {
    assert.match(migration, new RegExp("CREATE TABLE `" + table + "`"));
    assert.match(service, new RegExp(table));
  }
  assert.match(dailyMigration, /normalized_content_hash/);
  assert.match(dailyMigration, /monitoring_frequency/);
  assert.match(service, /captureDailySources/);
  assert.match(service, /potentially_normative_change/);
  assert.match(service, /official_alternative/);
  assert.match(service, /normalized_content_hash/);
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
  assert.match(config, /crons: \["\*\/30 \* \* \* \*", "15 8 \* \* \*"\]/);
  assert.match(worker, /normativeMonitorShardForScheduledTime/);
  assert.match(panel, /FILA DE ANÁLISE/);
  assert.match(panel, /SAÚDE DAS REGRAS/);
  assert.match(panel, /Histórico de mudanças e decisões/);
  assert.match(panel, /Registrar decisão profissional assinada/);
});

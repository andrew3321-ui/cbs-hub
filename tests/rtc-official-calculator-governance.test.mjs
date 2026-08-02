import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  RTC_OFFICIAL_CORPUS_VERSION,
  assessRtcPromotion,
  assessRtcRollback,
  hashRtcOfficialPayload,
  officialRtcFixtureRequest,
  reconcileRtcOfficialCandidate,
  rtcOfficialComparisonCorpus,
  rtcOfficialDatasetDefinitions,
  rtcOfficialPackageManifest,
  rtcOfficialPublicIndicator,
} from "../domain/rtc-official-calculator-governance.ts";

function cleanCandidate() {
  return {
    version: {
      applicationVersion: rtcOfficialPackageManifest.applicationVersion,
      databaseVersion: rtcOfficialPackageManifest.databaseVersion,
      databaseDate: rtcOfficialPackageManifest.databaseDate,
      environment: rtcOfficialPackageManifest.environment,
    },
    datasets: rtcOfficialDatasetDefinitions.map((item) => ({ code: item.code, recordCount: item.minimumRecords, contentHash: "a".repeat(64) })),
    observations: rtcOfficialComparisonCorpus.map((fixture) => ({
      code: fixture.code,
      cst: "000",
      cClassTrib: "000001",
      ...fixture.expected,
      cbsMemory: "Operação reconciliada conforme LC 214/2025.",
      ibsStateMemory: "Operação reconciliada conforme LC 214/2025.",
      xml: `<IBSCBS><CST>000</CST><cClassTrib>000001</cClassTrib><gIBSUF><vIBSUF>${(fixture.expected.ibsStateCents / 100).toFixed(2)}</vIBSUF></gIBSUF><gCBS><vCBS>${(fixture.expected.cbsCents / 100).toFixed(2)}</vCBS></gCBS></IBSCBS>`,
    })),
  };
}

test("pacote oficial fica versionado sem redistribuição indevida", () => {
  assert.equal(rtcOfficialPackageManifest.applicationVersion, "1.2.4-b0e47264");
  assert.equal(rtcOfficialPackageManifest.databaseVersion, "V0039");
  assert.equal(rtcOfficialPackageManifest.execution.javaVersion, 21);
  assert.equal(rtcOfficialPackageManifest.execution.cloudflareWorkerCompatible, false);
  assert.equal(rtcOfficialPackageManifest.licensing.redistributionAllowedByCbshub, false);
  assert.match(rtcOfficialPackageManifest.jarPackageUrl, /^https:\/\//);
});

test("corpus oficial fecha CBS e IBS em centavos e cobre arredondamento", () => {
  assert.equal(RTC_OFFICIAL_CORPUS_VERSION, "rtc-official-2026-integral.v1");
  assert.equal(rtcOfficialComparisonCorpus.length, 5);
  assert.deepEqual(rtcOfficialComparisonCorpus.find((item) => item.baseCents === 12_345)?.expected, { cbsCents: 111, ibsStateCents: 12, ibsMunicipalCents: 0, ibsTotalCents: 12 });
  assert.equal(officialRtcFixtureRequest(rtcOfficialComparisonCorpus[0]).itens[0].baseCalculo, 0.01);
});

test("versão, catálogos, memória e XML sem divergência habilitam apenas canário", () => {
  const report = reconcileRtcOfficialCandidate(cleanCandidate());
  assert.deepEqual(report, { status: "zero_divergence", differences: [], promotionAllowed: true, runtimeReplacementAllowed: false, comparedCases: 5, comparedDatasets: 8 });
  assert.deepEqual(assessRtcPromotion({ currentStatus: "canary", reconciliationStatus: report.status, differenceCount: 0, fingerprintMatches: true }), { allowed: true, blockers: [] });
});

test("qualquer versão, centavo, memória, XML ou catálogo divergente bloqueia", () => {
  const candidate = cleanCandidate();
  candidate.version.databaseVersion = "V0040";
  candidate.datasets[0].recordCount = 0;
  candidate.observations[0].cbsCents = 1;
  candidate.observations[0].cbsMemory = "sem fundamento";
  candidate.observations[0].xml = "<IBSCBS />";
  const report = reconcileRtcOfficialCandidate(candidate);
  assert.equal(report.status, "blocked_divergence");
  assert.equal(report.promotionAllowed, false);
  assert.ok(report.differences.includes("database_version_changed"));
  assert.ok(report.differences.some((item) => item.includes("record_count_below_baseline")));
  assert.ok(report.differences.some((item) => item.includes("cbsCents")));
  assert.ok(report.differences.some((item) => item.includes("legal_memory")));
  assert.ok(report.differences.some((item) => item.includes("xml_classification")));
});

test("promoção e rollback são fechados por estado e reconciliação", () => {
  assert.equal(assessRtcPromotion({ currentStatus: "candidate", reconciliationStatus: "zero_divergence", differenceCount: 0, fingerprintMatches: true }).allowed, false);
  assert.equal(assessRtcPromotion({ currentStatus: "canary", reconciliationStatus: "blocked_divergence", differenceCount: 1, fingerprintMatches: true }).allowed, false);
  assert.deepEqual(assessRtcRollback({ activeStatus: "active", targetStatus: "revoked", targetReconciliationStatus: "zero_divergence", sameVersion: false }), { allowed: true, blockers: [] });
  assert.equal(assessRtcRollback({ activeStatus: "active", targetStatus: "canary", targetReconciliationStatus: "zero_divergence", sameVersion: false }).allowed, false);
});

test("fingerprint e indicador público são reproduzíveis", async () => {
  assert.equal(await hashRtcOfficialPayload(cleanCandidate()), await hashRtcOfficialPayload(cleanCandidate()));
  const indicator = await rtcOfficialPublicIndicator();
  assert.equal(indicator.status, "reconciled_reference");
  assert.equal(indicator.deterministicCases, 5);
  assert.equal(indicator.synchronizedDatasets, 8);
  assert.match(indicator.fingerprint, /^[a-f0-9]{12}$/);
});

test("persistência, agendamento e API administrativa completam a governança", () => {
  const service = fs.readFileSync(new URL("../app/rtc-official-calculator-service.ts", import.meta.url), "utf8");
  const worker = fs.readFileSync(new URL("../worker/index.ts", import.meta.url), "utf8");
  const route = fs.readFileSync(new URL("../app/api/admin/rtc-calculator/route.ts", import.meta.url), "utf8");
  const coverage = fs.readFileSync(new URL("../app/api/public/coverage/route.ts", import.meta.url), "utf8");
  for (const table of ["rtc_calculator_versions", "rtc_calculator_datasets", "rtc_calculator_reconciliations", "rtc_calculator_events"]) assert.match(service, new RegExp(table));
  assert.match(service, /calculadora\/xml\/generate\?tipo=nfe/);
  assert.match(service, /status = 'revoked'/);
  assert.match(worker, /runScheduledRtcCalculatorSync/);
  assert.match(route, /getPlatformAdminUser/);
  assert.match(route, /action === "promote"/);
  assert.match(route, /action === "rollback"/);
  assert.match(coverage, /officialRtcCalculator/);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { deduplicateCoverageBacklog, rankCoverageDemand, summarizeCoverageGains } from "../domain/coverage-demand-prioritization.ts";

const base = {
  itemCode: "DEMAND-ROUTE-SP-MG", dimensionType: "route", dimensionKey: "SP-MG", taxScope: "st",
  frequency: 12, workspaceCount: 4, revenueCents: 25_000_000, blockedCount: 5, partialCount: 3, supportedCount: 4,
  riskScore: 9_800, sourceHealthBps: 8_000, currentCoverageBps: 3_500, expectedCaseCount: 3,
  sourceCodes: ["CONVENIO-ICMS-142-2018"], ruleCodes: ["RULE-GAP:SP-MG"], testCodes: ["TEST-GAP:SP-MG"], implementationRef: "https://trello.com/c/tvPJ2wEe#SP-MG",
};

test("sinais usam somente dimensões fiscais estruturadas e agregadas", async () => {
  const source = await readFile(new URL("../app/coverage-demand-service.ts", import.meta.url), "utf8");
  assert.match(source, /dimensionType: "topic"/);
  assert.match(source, /workspaceHash/);
  assert.doesNotMatch(source, /question\s*:/);
  assert.doesNotMatch(source, /productDescription/);
});

test("ranking pondera frequência, escritórios, receita, risco, lacuna e saúde", () => {
  const lower = rankCoverageDemand({ ...base, frequency: 1, workspaceCount: 1, revenueCents: 100_000, blockedCount: 0, partialCount: 0, supportedCount: 10, riskScore: 2_000, sourceHealthBps: 10_000 });
  const higher = rankCoverageDemand(base);
  assert.ok(higher.priorityScore > lower.priorityScore);
  assert.equal(higher.justification.length, 5);
});

test("rotas, NCM, CEST, cidades, serviços e módulos pertencem ao vocabulário fechado", async () => {
  const service = await readFile(new URL("../app/coverage-demand-service.ts", import.meta.url), "utf8");
  for (const dimension of ["route", "ncm", "cest", "city", "service", "module"]) assert.match(service, new RegExp(`dimensionType: "${dimension}"`));
  assert.match(service, /ncm\.length === 8/);
  assert.match(service, /cest\.length === 7/);
});

test("backlog deduplica a mesma dimensão antes de ordenar", () => {
  const [merged] = deduplicateCoverageBacklog([base, { ...base, itemCode: "DUPLICATE", frequency: 7, partialCount: 2 }]);
  assert.equal(merged.frequency, 19);
  assert.equal(merged.partialCount, 5);
  assert.equal(deduplicateCoverageBacklog([base, { ...base, itemCode: "DUPLICATE" }]).length, 1);
});

test("ganho projetado exige casos, fonte, regra, teste e tarefa", () => {
  assert.equal(rankCoverageDemand(base).eligibleForGain, true);
  for (const invalid of [
    { expectedCaseCount: 0 }, { sourceCodes: [] }, { ruleCodes: [] }, { testCodes: [] }, { implementationRef: "" },
  ]) {
    const ranked = rankCoverageDemand({ ...base, ...invalid });
    assert.equal(ranked.eligibleForGain, false);
    assert.equal(ranked.projectedGainBps, 0);
  }
});

test("ganho comprovado não nasce do ganho projetado", () => {
  const ranked = rankCoverageDemand(base);
  assert.deepEqual(summarizeCoverageGains([{ ...ranked, status: "planned", verifiedGainBps: 500 }]), { projectedGainBps: ranked.projectedGainBps, verifiedGainBps: 0, ineligibleItems: 0 });
  assert.equal(summarizeCoverageGains([{ ...ranked, status: "verified", verifiedGainBps: 80 }]).verifiedGainBps, 80);
});

test("fila mensal persiste vínculos e fingerprint reproduzível", async () => {
  const migration = await readFile(new URL("../drizzle/0049_coverage_demand_queue.sql", import.meta.url), "utf8");
  for (const field of ["source_codes_json", "rule_codes_json", "test_codes_json", "implementation_ref", "expected_case_count", "fingerprint"]) assert.match(migration, new RegExp(field));
  assert.equal(rankCoverageDemand(base).fingerprintMaterial, rankCoverageDemand(base).fingerprintMaterial);
});

test("metas mensais e atualização diária ficam integradas à interface e ao Worker", async () => {
  const [ui, worker] = await Promise.all([
    readFile(new URL("../app/app/FiscalExpansionCenter.tsx", import.meta.url), "utf8"),
    readFile(new URL("../worker/index.ts", import.meta.url), "utf8"),
  ]);
  assert.match(ui, /Backlog mensal reproduzível/);
  assert.match(ui, /projetado/);
  assert.match(ui, /comprovado/);
  assert.match(worker, /refreshCoverageBacklog/);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildPublicCoverageSummary, PUBLIC_COVERAGE_PAGE_VERSION } from "../domain/public-coverage-summary.ts";
import { buildPublicCoverageStructuredData } from "../domain/seo-structured-data.ts";

test("resumo público nasce da matriz versionada e preserva os três estados por tributo", async () => {
  const summary = await buildPublicCoverageSummary();
  assert.equal(summary.pageVersion, PUBLIC_COVERAGE_PAGE_VERSION);
  assert.deepEqual(summary.taxGroups.map((group) => group.code), ["icms-st", "iss", "simples", "pis-cofins", "retencoes", "ipi", "reforma"]);
  const groupEntries = summary.taxGroups.reduce((total, group) => total + group.entries, 0);
  const publicEntries = summary.totals.supported + summary.totals.partial + summary.totals.not_supported;
  assert.ok(groupEntries <= publicEntries);
  for (const group of summary.taxGroups) {
    assert.equal(group.statusTotals.supported + group.statusTotals.partial + group.statusTotals.not_supported, group.entries);
    assert.ok(group.entries > 0);
    assert.ok(group.versions.length > 0);
    assert.match(group.checkedAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(group.temporalEvidence.explicit > 0);
    assert.ok(group.officialSources.length >= 1);
    assert.ok(group.officialSources.every((source) => source.url.startsWith("https://")));
    assert.ok(group.blockers.length >= 1);
  }
  assert.equal(summary.regression.failures, 0);
});

test("resumo público não transporta dados de cliente ou identificadores operacionais", async () => {
  const summary = await buildPublicCoverageSummary();
  const serialized = JSON.stringify(summary);
  assert.equal(summary.privacy.clientDataIncluded, false);
  assert.doesNotMatch(serialized, /@gmail\.com|\b\d{14}\b|snapshotJson|workspaceId|userId|accessToken|clientSecret/i);
  assert.ok(summary.classificationPolicy.surfaces.includes("report"));
  assert.ok(summary.classificationPolicy.surfaces.includes("public_api"));
});

test("página pública contém prova, vigência, fontes, pendências e CTA contextual", async () => {
  const [page, css, navigation, landing] = await Promise.all([
    readFile(new URL("../app/cobertura/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/public-coverage.css", import.meta.url), "utf8"),
    readFile(new URL("../app/TaxContentNavigation.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(page, /canonical: "\/cobertura"/);
  assert.match(page, /Suportado/);
  assert.match(page, /Parcial/);
  assert.match(page, /Não suportado/);
  assert.match(page, /Última verificação/);
  assert.match(page, /Vigência/);
  assert.match(page, /Fontes oficiais mais recorrentes/);
  assert.match(page, /Pendências que ainda bloqueiam/);
  assert.match(page, /buildPublicCoverageStructuredData/);
  assert.match(page, /utm_campaign=cobertura_publica/);
  assert.match(page, /não expõe perguntas, documentos, empresas/);
  assert.match(css, /@media\(max-width:560px\)/);
  assert.match(navigation, /href="\/cobertura"/);
  assert.match(landing, /Abrir a matriz pública completa/);
});

test("dados estruturados descrevem a matriz como Dataset sem avaliações fabricadas", () => {
  const result = buildPublicCoverageStructuredData({ dateModified: "2026-08-01", version: "coverage-v1", entries: 846, sourceUrls: ["https://www.planalto.gov.br/", "https://www.confaz.fazenda.gov.br/"], taxes: ["ICMS/ST", "ISS"] });
  assert.equal(result["@type"], "Dataset");
  assert.equal(result.url, "https://cbshub.com.br/cobertura");
  assert.equal(result.isAccessibleForFree, true);
  assert.ok(!("aggregateRating" in result));
  assert.ok(!("review" in result));
  assert.throws(() => buildPublicCoverageStructuredData({ dateModified: "01/08/2026", version: "", entries: 0, sourceUrls: [], taxes: [] }));
});

import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { LEGAL_REFERENCE_CHECKED_AT, legalCatalogMetrics, legalReferences, searchLegalReferences } from "../domain/legal-reference-catalog.ts";

const officialHosts = ["planalto.gov.br", "senado.leg.br", "fazenda.gov.br", "gov.br"];

test("V32 catalog has broad, structured and unique official coverage", () => {
  const metrics = legalCatalogMetrics();
  assert.ok(metrics.total >= 40);
  assert.equal(metrics.areas, 7);
  assert.ok(metrics.calculationLinked >= 15);
  assert.ok(metrics.current2026 >= 5);
  assert.equal(new Set(legalReferences.map((item) => item.code)).size, legalReferences.length);
  assert.ok(legalReferences.every((item) => item.checkedAt === LEGAL_REFERENCE_CHECKED_AT));
  assert.ok(legalReferences.every((item) => item.supports.length > 0 && item.tags.length > 0 && item.scope.length > 20));
});

test("every legal reference points to an allowed official HTTPS host", () => {
  assert.ok(legalReferences.every((item) => {
    const url = new URL(item.url);
    return url.protocol === "https:" && officialHosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
  }));
});

test("catalog search is accent-insensitive and combines all query terms", () => {
  assert.ok(searchLegalReferences("aliquotas interestaduais").some((item) => item.code === "RSF-22-1989"));
  assert.ok(searchLegalReferences("fator r", "simples").some((item) => item.code === "CGSN-140-2018"));
  assert.deepEqual(searchLegalReferences("cest ncm").map((item) => item.code), ["CONV-142-2018"]);
});

test("catalog includes the key 2026 taxpayer, presumed-profit and IBS governance laws", () => {
  for (const code of ["LC-225-2026", "LC-224-2025", "D-12808-2025", "LC-227-2026", "EFD-ICMS-IPI-322"]) {
    assert.ok(legalReferences.some((item) => item.code === code), `${code} ausente`);
  }
});

test("legal center makes source verification distinct from professional approval", () => {
  const component = new URL("../app/app/LegalReferenceCenter.tsx", import.meta.url);
  const contents = fs.readFileSync(component, "utf8");
  assert.match(contents, /Fonte oficial conferida/);
  assert.match(contents, /Não equivale a regra homologada/);
  assert.match(contents, /Cobertura documental não autoriza cálculo automático/);
});

import assert from "node:assert/strict";
import test from "node:test";

import {
  TAX_REFORM_SECTOR_VERSION,
  calculateTaxReformSectorScenario,
  hashTaxReformSectorCatalog,
  taxReformSectorCasePasses,
  taxReformSectorCases,
  taxReformSectorMetrics,
  taxReformSectorProfiles,
  taxReformSectorSources,
  validateTaxReformSectorCatalog,
} from "../domain/tax-reform-sector-scenarios.ts";

const standard2033 = {
  sectorCode: "REGULAR_GOODS_B2B",
  targetYear: 2033,
  taxableBaseCents: 10_000_000,
  currentPisCofinsCents: 365_000,
  currentIcmsIssCents: 1_200_000,
  currentIpiCents: 0,
  cbsReferenceRateBps: 900,
  ibsReferenceRateBps: 1_800,
  cbsCreditsCents: 200_000,
  ibsCreditsCents: 100_000,
  selectiveTaxCents: 0,
  sectorEligibilityConfirmed: true,
  exactClassificationConfirmed: true,
  officialSourceVersionConfirmed: true,
  operationDocumented: true,
  creditsEvidenceConfirmed: true,
  noSpecificExceptionConfirmed: true,
  noZfmIpiExceptionConfirmed: true,
  ancillaryObligations2026Confirmed: true,
};

test("V84 ranks twelve recurring sectors without treating specific regimes as standard", () => {
  assert.equal(TAX_REFORM_SECTOR_VERSION, "2026.07.30-v84");
  assert.equal(taxReformSectorProfiles.length, 12);
  assert.deepEqual(taxReformSectorProfiles.map((item) => item.rank), Array.from({ length: 12 }, (_, index) => index + 1));
  assert.equal(taxReformSectorProfiles.filter((item) => item.treatment === "specific_regime").length, 3);
});

test("standard scenario reproduces every transition year in separate tax books", () => {
  for (const year of [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033]) {
    const result = calculateTaxReformSectorScenario({
      ...standard2033,
      targetYear: year,
      cbsReferenceRateBps: year === 2026 ? null : 900,
      ibsReferenceRateBps: year === 2026 ? null : 1_800,
      cbsCreditsCents: year === 2026 ? null : 200_000,
      ibsCreditsCents: year === 2026 ? null : 100_000,
      selectiveTaxCents: year === 2026 ? null : 0,
    });
    assert.equal(result.coverage, "supported", `ano ${year}`);
    assert.equal(result.lines.length, 9);
    assert.deepEqual(new Set(result.lines.map((item) => item.book)), new Set(["PIS_COFINS", "ICMS_ISS", "IPI", "CBS", "IBS", "IS", "TOTAL"]));
    assert.equal(result.netPayableCents, null);
  }
});

test("thirty and sixty percent reductions apply only after exact eligibility gates", () => {
  const professional = calculateTaxReformSectorScenario({ ...standard2033, sectorCode: "PROFESSIONAL_COUNCIL_SERVICES" });
  const education = calculateTaxReformSectorScenario({ ...standard2033, sectorCode: "EDUCATION_SERVICES" });
  assert.equal(professional.lines.find((item) => item.code === "CBS-GROSS").rateBps, 630);
  assert.equal(professional.lines.find((item) => item.code === "IBS-GROSS").rateBps, 1_260);
  assert.equal(education.lines.find((item) => item.code === "CBS-GROSS").rateBps, 360);
  assert.equal(education.lines.find((item) => item.code === "IBS-GROSS").rateBps, 720);
  const missing = calculateTaxReformSectorScenario({ ...standard2033, sectorCode: "EDUCATION_SERVICES", exactClassificationConfirmed: false });
  assert.equal(missing.coverage, "partial");
  assert.equal(missing.lines.length, 0);
});

test("basic food basket zero remains distinct from missing incidence", () => {
  const result = calculateTaxReformSectorScenario({ ...standard2033, sectorCode: "BASIC_FOOD_BASKET_ZERO" });
  assert.equal(result.coverage, "supported");
  assert.equal(result.lines.find((item) => item.code === "CBS-GROSS").rateBps, 0);
  assert.equal(result.lines.find((item) => item.code === "IBS-GROSS").rateBps, 0);
  assert.equal(result.totalExposureCents, 0);
});

test("specific financial, fuel and real estate regimes fail closed", () => {
  for (const sectorCode of ["FINANCIAL_SERVICES_SPECIFIC", "FUELS_SPECIFIC", "REAL_ESTATE_SPECIFIC"]) {
    const result = calculateTaxReformSectorScenario({ ...standard2033, sectorCode });
    assert.equal(result.coverage, "unsupported");
    assert.equal(result.lines.length, 0);
    assert.equal(result.totalExposureCents, null);
    assert.ok(result.blockers.length > 0);
  }
});

test("2026 differentiated treatments remain blocked until their operational recort is proved", () => {
  const result = calculateTaxReformSectorScenario({
    ...standard2033,
    sectorCode: "HEALTH_SERVICES",
    targetYear: 2026,
    cbsReferenceRateBps: null,
    ibsReferenceRateBps: null,
    cbsCreditsCents: null,
    ibsCreditsCents: null,
    selectiveTaxCents: null,
  });
  assert.equal(result.coverage, "partial");
  assert.equal(result.totalExposureCents, null);
  assert.ok(result.blockers.some((item) => item.includes("ainda não liberado")));
});

test("pending credit, source, operation and ZFM decisions block the annual total", () => {
  for (const patch of [
    { creditsEvidenceConfirmed: false },
    { officialSourceVersionConfirmed: false },
    { operationDocumented: false },
    { noZfmIpiExceptionConfirmed: false },
  ]) {
    const result = calculateTaxReformSectorScenario({ ...standard2033, ...patch });
    assert.equal(result.coverage, "partial");
    assert.equal(result.lines.length, 0);
    assert.equal(result.totalExposureCents, null);
  }
});

test("all 144 sector cases reproduce supported and safely blocked outputs", () => {
  assert.equal(taxReformSectorCases.length, 144);
  assert.equal(taxReformSectorCases.every(taxReformSectorCasePasses), true);
  const metrics = taxReformSectorMetrics();
  assert.equal(metrics.deterministicCases, 144);
  assert.equal(metrics.calculatedMemories + metrics.safelyBlockedCases, 144);
});

test("official evidence, validation and fingerprint are reproducible", async () => {
  assert.equal(taxReformSectorSources.length, 6);
  assert.ok(taxReformSectorSources.every((item) => item.url.startsWith("https://") && item.legalReference.length > 20));
  assert.deepEqual(validateTaxReformSectorCatalog(), { ok: true, errors: [] });
  const first = await hashTaxReformSectorCatalog();
  const second = await hashTaxReformSectorCatalog();
  assert.equal(first, second);
  assert.match(first, /^[0-9a-f]{64}$/);
});

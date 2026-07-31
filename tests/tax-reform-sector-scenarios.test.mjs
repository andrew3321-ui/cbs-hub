import assert from "node:assert/strict";
import test from "node:test";

import {
  TAX_REFORM_SECTOR_VERSION,
  calculateTaxReformSpecificRegime,
  calculateTaxReformSectorScenario,
  financialSpecificCombinedRateSchedule,
  fuelSpecificProductCatalog,
  hashTaxReformSectorCatalog,
  taxReformSectorCasePasses,
  taxReformSectorCases,
  taxReformSectorMetrics,
  taxReformSectorProfiles,
  taxReformSectorSources,
  taxReformSpecificCasePasses,
  taxReformSpecificCases,
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

test("V97 ranks twelve recurring sectors without treating specific regimes as standard", () => {
  assert.equal(TAX_REFORM_SECTOR_VERSION, "2026.07.31-v97");
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

test("financial specific memories use only the combined annual rates fixed by LC 227", () => {
  assert.deepEqual(financialSpecificCombinedRateSchedule.map((item) => [item.year, item.combinedRateBps]), [
    [2027, 1_085], [2028, 1_085], [2029, 1_100], [2030, 1_115],
    [2031, 1_130], [2032, 1_150], [2033, 1_250],
  ]);
  const referenceCase = taxReformSpecificCases.find((item) => item.code === "financial_credit_exchange_securities-2033-POSITIVE");
  const result = calculateTaxReformSpecificRegime(referenceCase.input);
  assert.equal(result.coverage, "supported");
  assert.equal(result.taxableBaseCents, 9_000_000);
  assert.equal(result.totalGrossCents, 1_125_000);
  assert.equal(result.netPayableCents, null);
  assert.ok(result.warnings.some((item) => item.includes("não inventa a repartição")));
});

test("fuel memories require exact product, quantity, unit, act and ad rem rates", () => {
  assert.equal(fuelSpecificProductCatalog.length, 12);
  const supported = taxReformSpecificCases.find((item) => item.code === "FUEL-GASOLINE_AND_STREAMS-POSITIVE");
  assert.equal(calculateTaxReformSpecificRegime(supported.input).totalGrossCents, 1_500);
  for (const code of ["FUEL-GASOLINE_AND_STREAMS-MISSING-ACT", "FUEL-MISSING-QUANTITY", "FUEL-ESTIMATED-FUTURE-RATE", "FUEL-PENDING-ACT"]) {
    const testCase = taxReformSpecificCases.find((item) => item.code === code);
    const result = calculateTaxReformSpecificRegime(testCase.input);
    assert.equal(result.coverage, "partial", code);
    assert.equal(result.totalGrossCents, null, code);
    assert.equal(result.lines.length, 0, code);
  }
});

test("real estate memories apply base reducers before the legal 50 and 70 percent rate reductions", () => {
  const sale = taxReformSpecificCases.find((item) => item.code === "real_estate_sale-2033-POSITIVE");
  const rent = taxReformSpecificCases.find((item) => item.code === "real_estate_rent-2033-POSITIVE");
  const saleResult = calculateTaxReformSpecificRegime(sale.input);
  const rentResult = calculateTaxReformSpecificRegime(rent.input);
  assert.equal(saleResult.taxableBaseCents, 8_500_000);
  assert.equal(saleResult.lines.find((item) => item.code === "REAL-ESTATE-CBS-GROSS").rateBps, 450);
  assert.equal(saleResult.totalGrossCents, 1_147_500);
  assert.equal(rentResult.taxableBaseCents, 9_840_000);
  assert.equal(rentResult.lines.find((item) => item.code === "REAL-ESTATE-CBS-GROSS").rateBps, 270);
  assert.equal(rentResult.totalGrossCents, 797_040);
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

test("all general and specific sector cases reproduce supported and safely blocked outputs", () => {
  assert.equal(taxReformSectorCases.length, 144);
  assert.equal(taxReformSectorCases.every(taxReformSectorCasePasses), true);
  assert.equal(taxReformSpecificCases.length, 88);
  assert.equal(taxReformSpecificCases.every(taxReformSpecificCasePasses), true);
  const metrics = taxReformSectorMetrics();
  assert.deepEqual(metrics, {
    profiles: 12,
    years: 8,
    specificRegimes: 3,
    specificCases: 88,
    deterministicCases: 232,
    calculatedMemories: 107,
    safelyBlockedCases: 125,
    officialSources: 7,
  });
});

test("official evidence, validation and fingerprint are reproducible", async () => {
  assert.equal(taxReformSectorSources.length, 7);
  assert.ok(taxReformSectorSources.every((item) => item.url.startsWith("https://") && item.legalReference.length > 20));
  assert.deepEqual(validateTaxReformSectorCatalog(), { ok: true, errors: [] });
  const first = await hashTaxReformSectorCatalog();
  const second = await hashTaxReformSectorCatalog();
  assert.equal(first, second);
  assert.match(first, /^[0-9a-f]{64}$/);
});

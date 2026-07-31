import assert from "node:assert/strict";
import test from "node:test";

import {
  SERVICE_WITHHOLDINGS_DEEP_VERSION,
  SERVICE_WITHHOLDINGS_DEEP_SUPPORTED_PERIOD,
  calculateServiceWithholdings,
  hashServiceWithholdingsDeep,
  serviceWithholdingProfiles,
  serviceWithholdingReferenceCases,
  serviceWithholdingRuleControls,
  serviceWithholdingSources,
  serviceWithholdingsDeepMetrics,
  validateServiceWithholdingsDeep,
} from "../domain/service-withholdings-deep.ts";

const base = {
  serviceCode: "ACCOUNTING",
  payerType: "private_legal_entity",
  payerRegime: "normal",
  beneficiaryType: "legal_entity",
  beneficiaryRegime: "normal",
  calculationDate: "2026-07-30",
  grossPaymentCents: 10_000_000,
  irrfBaseCents: 10_000_000,
  csrfBaseCents: 10_000_000,
  inssBaseCents: 10_000_000,
  issBaseCents: 10_000_000,
  serviceNatureConfirmed: true,
  contractAndDocumentConfirmed: true,
  paymentOrCreditConfirmed: true,
  payerResponsibilityConfirmed: true,
  beneficiaryRegimeDocumented: true,
  irrfHypothesisConfirmed: true,
  csrfHypothesisConfirmed: true,
  inssExecutionMode: "none",
  inssExecutionConfirmed: true,
  inssRateStatus: "not_applicable",
  inssRateStatusConfirmed: true,
  inssDeductionsCents: 0,
  inssDeductionsDocumented: true,
  simplesAnnexIVConfirmed: false,
  municipalityCode: "3550308",
  municipalServiceItem: "17.19",
  issWithholdingStatus: "does_not_apply",
  issRateBps: 500,
  municipalLawConfirmed: true,
  publicBodyTableConfirmed: false,
  simultaneousDeductionsConfirmed: true,
};

test("V95 ranks 40 recurring contractual profiles with official evidence", () => {
  assert.equal(SERVICE_WITHHOLDINGS_DEEP_VERSION, "2026.07.31-v95");
  assert.equal(serviceWithholdingProfiles.length, 40);
  assert.deepEqual(serviceWithholdingProfiles.map((item) => item.rank), Array.from({ length: 40 }, (_, index) => index + 1));
  assert.ok(serviceWithholdingProfiles.every((item) => item.sourceCodes.length > 0 && item.requiredClassification.length >= 5));
  assert.ok(serviceWithholdingSources.every((item) => item.url.startsWith("https://") && item.legalReference.length > 10));
});

test("all four ledgers carry independent versioned event, responsible and deadline controls", () => {
  assert.deepEqual(serviceWithholdingRuleControls.map((item) => item.tax), ["IRRF", "CSRF", "INSS", "ISS"]);
  assert.ok(serviceWithholdingRuleControls.every((item) => item.version && item.effectiveFrom && item.taxableEvent && item.responsible && item.dueRule && item.dispensationRule));
  const result = calculateServiceWithholdings({ ...base, serviceCode: "CLEANING", municipalServiceItem: "7.10", inssExecutionMode: "labor_assignment", inssRateStatus: "standard_11", issWithholdingStatus: "applies", issRateBps: 300 });
  assert.ok(result.tracks.every((item) => item.ruleVersion && item.effectiveFrom && item.responsible && item.dueRule));
  const irrfOnlyBaseChanged = calculateServiceWithholdings({ ...base, irrfBaseCents: 5_000_000 });
  assert.equal(irrfOnlyBaseChanged.tracks.find((item) => item.tax === "IRRF")?.amountCents, 75_000);
  assert.equal(irrfOnlyBaseChanged.tracks.find((item) => item.tax === "CSRF")?.amountCents, 465_000);
});

test("professional service calculates IRRF and CSRF in separate ledgers", () => {
  const result = calculateServiceWithholdings(base);
  assert.equal(result.status, "calculated_reference");
  assert.equal(result.tracks.find((item) => item.tax === "IRRF")?.amountCents, 150_000);
  assert.equal(result.tracks.find((item) => item.tax === "CSRF")?.amountCents, 465_000);
  assert.equal(result.tracks.find((item) => item.tax === "INSS")?.status, "not_applicable");
  assert.equal(result.tracks.find((item) => item.tax === "ISS")?.status, "not_applicable");
  assert.equal(result.netPaymentCents, 9_385_000);
});

test("cleaning uses 1% IRRF, 4.65% CSRF, 11% INSS and municipal ISS only after each gate", () => {
  const result = calculateServiceWithholdings({
    ...base,
    serviceCode: "CLEANING",
    municipalServiceItem: "7.10",
    inssExecutionMode: "labor_assignment",
    inssRateStatus: "standard_11",
    inssBaseCents: 9_000_000,
    issWithholdingStatus: "applies",
    issRateBps: 300,
  });
  assert.deepEqual(result.tracks.map((item) => [item.tax, item.amountCents]), [
    ["IRRF", 100_000],
    ["CSRF", 465_000],
    ["INSS", 990_000],
    ["ISS", 300_000],
  ]);
  assert.equal(result.netPaymentCents, 8_145_000);
});

test("R-2010 CPRB indicator keeps 3.5% apart from the standard 11%", () => {
  const result = calculateServiceWithholdings({
    ...base,
    serviceCode: "SECURITY",
    municipalServiceItem: "11.02",
    inssExecutionMode: "labor_assignment",
    inssRateStatus: "cprb_3_5",
  });
  assert.equal(result.tracks.find((item) => item.tax === "INSS")?.rateBps, 350);
  assert.equal(result.tracks.find((item) => item.tax === "INSS")?.amountCents, 350_000);
});

test("Simples dispensation never leaks from IRRF and CSRF into INSS or ISS", () => {
  const result = calculateServiceWithholdings({
    ...base,
    beneficiaryRegime: "simples",
    serviceCode: "CLEANING",
    municipalServiceItem: "7.10",
    inssExecutionMode: "labor_assignment",
    inssRateStatus: "standard_11",
    simplesAnnexIVConfirmed: false,
    issWithholdingStatus: "applies",
    issRateBps: 300,
  });
  assert.equal(result.tracks.find((item) => item.tax === "IRRF")?.status, "not_applicable");
  assert.equal(result.tracks.find((item) => item.tax === "CSRF")?.status, "not_applicable");
  assert.equal(result.tracks.find((item) => item.tax === "INSS")?.status, "blocked");
  assert.equal(result.tracks.find((item) => item.tax === "ISS")?.status, "calculated_reference");
  assert.equal(result.netPaymentCents, null);
});

test("public bodies require their own table instead of inheriting private 4.65%", () => {
  const result = calculateServiceWithholdings({ ...base, payerType: "federal_public_body", payerRegime: "not_applicable" });
  assert.equal(result.tracks.find((item) => item.tax === "IRRF")?.status, "blocked");
  assert.equal(result.tracks.find((item) => item.tax === "CSRF")?.status, "blocked");
  assert.equal(result.tracks.find((item) => item.tax === "CSRF")?.rateBps, null);
  assert.equal(result.netPaymentCents, null);
});

test("total contract, CPRB and municipal responsibility never become presumed zeroes", () => {
  const totalContract = calculateServiceWithholdings({ ...base, serviceCode: "CIVIL_CONSTRUCTION_TOTAL", municipalServiceItem: "7.02", inssExecutionMode: "total_contract", inssRateStatus: "not_applicable" });
  assert.equal(totalContract.tracks.find((item) => item.tax === "INSS")?.status, "blocked");
  assert.equal(totalContract.tracks.find((item) => item.tax === "INSS")?.amountCents, null);
  assert.ok(totalContract.blockers.some((item) => item.includes("solidariedade")));
  const missingCprb = calculateServiceWithholdings({ ...base, serviceCode: "SECURITY", municipalServiceItem: "11.02", inssExecutionMode: "labor_assignment", inssRateStatus: "cprb_3_5", inssRateStatusConfirmed: false });
  assert.equal(missingCprb.tracks.find((item) => item.tax === "INSS")?.status, "blocked");
  const unknownMunicipality = calculateServiceWithholdings({ ...base, municipalityCode: null, municipalLawConfirmed: false, issWithholdingStatus: "unknown" });
  assert.equal(unknownMunicipality.tracks.find((item) => item.tax === "ISS")?.status, "blocked");
});

test("R$ 10 waivers are applied to the calculated retention, not to a stale R$ 5,000 payment threshold", () => {
  const result = calculateServiceWithholdings({ ...base, grossPaymentCents: 20_000, irrfBaseCents: 20_000, csrfBaseCents: 20_000, issBaseCents: 20_000 });
  assert.equal(result.tracks.find((item) => item.tax === "IRRF")?.amountCents, 0);
  assert.equal(result.tracks.find((item) => item.tax === "CSRF")?.amountCents, 0);
});

test("missing facts fail closed and never synthesize a net payment", () => {
  const result = calculateServiceWithholdings({
    ...base,
    serviceNatureConfirmed: false,
    municipalLawConfirmed: false,
    simultaneousDeductionsConfirmed: false,
  });
  assert.equal(result.status, "blocked");
  assert.ok(result.blockers.some((item) => item.includes("natureza efetiva")));
  assert.equal(result.totalWithheldCents, null);
  assert.equal(result.netPaymentCents, null);
});

test("unknown service, invalid date and invalid municipal rate are rejected safely", () => {
  assert.equal(calculateServiceWithholdings({ ...base, serviceCode: "UNKNOWN" }).status, "blocked");
  assert.throws(() => calculateServiceWithholdings({ ...base, calculationDate: "30/07/2026" }), /invalid_calculation_date/);
  assert.throws(() => calculateServiceWithholdings({ ...base, issRateBps: 501 }), /invalid_iss_rate/);
});

test("version validity accepts 2026 boundaries and fails closed outside them", () => {
  assert.deepEqual(SERVICE_WITHHOLDINGS_DEEP_SUPPORTED_PERIOD, { from: "2026-01-01", to: "2026-12-31" });
  assert.equal(calculateServiceWithholdings({ ...base, calculationDate: "2026-01-01" }).status, "calculated_reference");
  assert.equal(calculateServiceWithholdings({ ...base, calculationDate: "2026-12-31" }).status, "calculated_reference");
  for (const calculationDate of ["2025-12-31", "2027-01-01"]) {
    const result = calculateServiceWithholdings({ ...base, calculationDate });
    assert.equal(result.status, "blocked");
    assert.equal(result.tracks.length, 0);
    assert.equal(result.netPaymentCents, null);
    assert.ok(result.blockers.some((item) => item.includes("vigência suportada")));
  }
});

test("catalog validation, metrics and hash are reproducible", async () => {
  assert.deepEqual(validateServiceWithholdingsDeep(), { passed: true, errors: [] });
  assert.equal(serviceWithholdingReferenceCases.length, 120);
  assert.deepEqual(new Set(serviceWithholdingReferenceCases.map((item) => item.kind)), new Set(["combined_memory", "waiver_boundary", "safe_block"]));
  assert.deepEqual(serviceWithholdingsDeepMetrics(), {
    prioritizedServices: 40,
    contractualProfiles: 40,
    separateLedgers: 4,
    versionedRuleControls: 4,
    deterministicCases: 120,
    calculatedMemories: 80,
    safelyBlockedCases: 40,
  });
  assert.match(await hashServiceWithholdingsDeep(), /^[0-9a-f]{64}$/);
});

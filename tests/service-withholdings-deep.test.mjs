import assert from "node:assert/strict";
import test from "node:test";

import {
  SERVICE_WITHHOLDINGS_DEEP_VERSION,
  calculateServiceWithholdings,
  hashServiceWithholdingsDeep,
  serviceWithholdingProfiles,
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

test("V82 ranks 15 recurring service profiles with official evidence", () => {
  assert.equal(SERVICE_WITHHOLDINGS_DEEP_VERSION, "2026.07.31-v82");
  assert.equal(serviceWithholdingProfiles.length, 15);
  assert.deepEqual(serviceWithholdingProfiles.map((item) => item.rank), Array.from({ length: 15 }, (_, index) => index + 1));
  assert.ok(serviceWithholdingProfiles.every((item) => item.sourceCodes.length > 0 && item.requiredClassification.length >= 5));
  assert.ok(serviceWithholdingSources.every((item) => item.url.startsWith("https://") && item.legalReference.length > 10));
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

test("catalog validation, metrics and hash are reproducible", async () => {
  assert.deepEqual(validateServiceWithholdingsDeep(), { passed: true, errors: [] });
  assert.equal(serviceWithholdingsDeepMetrics().separateLedgers, 4);
  assert.match(await hashServiceWithholdingsDeep(), /^[0-9a-f]{64}$/);
});

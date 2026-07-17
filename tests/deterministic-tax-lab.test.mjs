import assert from "node:assert/strict";
import test from "node:test";
import { calculateIcmsDifal, calculateIss, calculatePisCofins, calculatePresumedProfit2026, calculateRtc2026, calculateSimplesAnnexI, calculateSimplesServices, DETERMINISTIC_TAX_LAB_VERSION, labSources, multiplyCentsByBps } from "../domain/deterministic-tax-lab.ts";

test("V32 uses integer fixed-point math instead of floating tax amounts", () => {
  assert.equal(DETERMINISTIC_TAX_LAB_VERSION, "2026.07.17-v32");
  assert.equal(multiplyCentsByBps(10_000_000, 365), 365_000);
  assert.equal(multiplyCentsByBps(1, 5000), 1);
});

test("Simples Annex I resolves official bracket and 9.2% effective reference", () => {
  const output = calculateSimplesAnnexI({ rbt12Cents: 150_000_000, monthlySegregatedRevenueCents: 12_000_000, annexConfirmed: true, revenueSegregated: true, periodClosed: true, noSpecialTreatment: true });
  assert.equal(output.status, "calculated_reference");
  assert.equal(output.lines.find((line) => line.code === "nominal").rateBps, 1070);
  assert.equal(output.lines.find((line) => line.code === "effective").rateBps, 920);
  assert.equal(output.lines.find((line) => line.code === "das_reference").amountCents, 1_104_000);
  assert.ok(output.issues.some((issue) => issue.code === "pgdas_required"));
});

test("Simples refuses to present an unrestricted conclusion when facts are missing", () => {
  const output = calculateSimplesAnnexI({ rbt12Cents: 150_000_000, monthlySegregatedRevenueCents: 12_000_000, annexConfirmed: false, revenueSegregated: false, periodClosed: false, noSpecialTreatment: false });
  assert.equal(output.status, "blocked");
  assert.equal(output.issues.filter((issue) => issue.severity === "blocker").length, 4);
});

test("Factor R selects Annex III at 28% or above and reproduces its effective rate", () => {
  const output = calculateSimplesServices({ rbt12Cents: 150_000_000, fs12Cents: 45_000_000, monthlySegregatedRevenueCents: 12_000_000, activitySubjectToFactorR: true, payrollReconciled: true, revenueSegregated: true, noSpecialTreatment: true });
  assert.equal(output.status, "calculated_reference");
  assert.equal(output.lines.find((line) => line.code === "factor_r").rateBps, 3000);
  assert.equal(output.lines.find((line) => line.code === "nominal").rateBps, 1600);
  assert.equal(output.lines.find((line) => line.code === "effective").rateBps, 1362);
  assert.equal(output.lines.find((line) => line.code === "das_reference").amountCents, 1_634_880);
});

test("Factor R below 28% selects Annex V", () => {
  const output = calculateSimplesServices({ rbt12Cents: 150_000_000, fs12Cents: 30_000_000, monthlySegregatedRevenueCents: 12_000_000, activitySubjectToFactorR: true, payrollReconciled: true, revenueSegregated: true, noSpecialTreatment: true });
  assert.equal(output.lines.find((line) => line.code === "factor_r").rateBps, 2000);
  assert.equal(output.lines.find((line) => line.code === "nominal").rateBps, 2050);
  assert.equal(output.lines.find((line) => line.code === "effective").rateBps, 1936);
  assert.equal(output.lines.find((line) => line.code === "das_reference").amountCents, 2_323_200);
});

test("PIS and Cofins separate debits and documented credits", () => {
  const cumulative = calculatePisCofins({ regime: "cumulative", taxableRevenueCents: 10_000_000, eligibleCreditBaseCents: 0, regimeConfirmed: true, revenueClassified: true, specialTreatmentsExcluded: true, creditsDocumented: false });
  assert.equal(cumulative.lines.find((line) => line.code === "balance").amountCents, 365_000);
  assert.deepEqual(cumulative.sources.map((source) => source.code), ["RFB-PIS-COFINS", "LEI-9718-1998"]);
  const nonCumulative = calculatePisCofins({ regime: "non_cumulative", taxableRevenueCents: 10_000_000, eligibleCreditBaseCents: 4_000_000, regimeConfirmed: true, revenueClassified: true, specialTreatmentsExcluded: true, creditsDocumented: true });
  assert.equal(nonCumulative.lines.find((line) => line.code === "balance").amountCents, 555_000);
  assert.equal(nonCumulative.status, "calculated_reference");
  assert.deepEqual(nonCumulative.sources.map((source) => source.code), ["RFB-PIS-COFINS", "LEI-10637-2002", "LEI-10833-2003"]);
});

test("ISS keeps municipal law and incidence as mandatory facts", () => {
  const output = calculateIss({ serviceBaseCents: 10_000_000, deductionsCents: 500_000, municipalRateBps: 300, withheld: false, serviceItemConfirmed: true, placeConfirmed: true, municipalRateConfirmed: true, municipalLawReference: "Lei municipal 123" });
  assert.equal(output.lines.find((line) => line.code === "iss").amountCents, 285_000);
  assert.equal(output.status, "calculated_reference");
});

test("DIFAL comparison discloses interstate, destination difference and FCP", () => {
  const output = calculateIcmsDifal({ baseCents: 10_000_000, origin: "SP", destination: "MG", importedQualified: false, destinationInternalRateBps: 1800, fcpRateBps: 200, finalConsumer: true, recipientNonTaxpayer: true, destinationLawReference: "SEFAZ MG consulta oficial", ratesConfirmed: true });
  assert.equal(output.lines.find((line) => line.code === "interstate").amountCents, 1_200_000);
  assert.equal(output.lines.find((line) => line.code === "difal").amountCents, 600_000);
  assert.equal(output.lines.find((line) => line.code === "fcp").amountCents, 200_000);
  assert.equal(output.lines.find((line) => line.code === "destination_total").amountCents, 800_000);
});

test("RTC 2026 calculates highlights but never invents net payable", () => {
  const output = calculateRtc2026({ taxableOperationCents: 10_000_000, pisCofinsPayableCents: 365_000, yearConfirmed: true, accessoryObligationsConfirmed: true, operationClassified: true });
  assert.equal(output.lines.find((line) => line.code === "cbs").amountCents, 90_000);
  assert.equal(output.lines.find((line) => line.code === "ibs").amountCents, 10_000);
  assert.equal(output.lines.find((line) => line.code === "net_payable").amountCents, null);
});

test("Lucro Presumido 2026 apportions the quarterly limit across mixed activities", () => {
  const output = calculatePresumedProfit2026({ quarter: 2, commerceRevenueCents: 144_000_000, serviceRevenueCents: 36_000_000, fullyTaxableAdditionsCents: 0, regimeConfirmed: true, activitiesSeparated: true, revenueReconciled: true, specialActivitiesExcluded: true });
  assert.equal(output.status, "calculated_reference");
  assert.equal(output.lines.find((line) => line.code === "normal_limit").amountCents, 125_000_000);
  assert.equal(output.lines.find((line) => line.code === "excess").amountCents, 55_000_000);
  assert.equal(output.lines.find((line) => line.code === "irpj_base").amountCents, 23_744_000);
  assert.equal(output.lines.find((line) => line.code === "irpj_total").amountCents, 5_336_000);
  assert.equal(output.lines.find((line) => line.code === "csll_base").amountCents, 29_680_000);
  assert.equal(output.lines.find((line) => line.code === "csll").amountCents, 2_671_200);
  assert.equal(output.lines.find((line) => line.code === "combined").amountCents, 8_007_200);
});

test("Lucro Presumido keeps the CSLL coefficient unchanged in the first quarter of 2026", () => {
  const output = calculatePresumedProfit2026({ quarter: 1, commerceRevenueCents: 144_000_000, serviceRevenueCents: 36_000_000, fullyTaxableAdditionsCents: 0, regimeConfirmed: true, activitiesSeparated: true, revenueReconciled: true, specialActivitiesExcluded: true });
  assert.equal(output.lines.find((line) => line.code === "csll_base").amountCents, 28_800_000);
  assert.equal(output.lines.find((line) => line.code === "csll").amountCents, 2_592_000);
});

test("Lucro Presumido blocks professional eligibility when material facts are missing", () => {
  const output = calculatePresumedProfit2026({ quarter: 2, commerceRevenueCents: 100_000_000, serviceRevenueCents: 0, fullyTaxableAdditionsCents: 0, regimeConfirmed: false, activitiesSeparated: false, revenueReconciled: false, specialActivitiesExcluded: false });
  assert.equal(output.status, "blocked");
  assert.equal(output.issues.filter((issue) => issue.severity === "blocker").length, 4);
});

test("every deterministic module cites official HTTPS sources", () => {
  assert.ok(Object.values(labSources).every((source) => source.url.startsWith("https://") && source.checkedAt === "2026-07-17"));
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  hashIcmsGeneralNational,
  icmsGeneralNationalMetrics,
  icmsGeneralSources,
  icmsStateGeneralProfiles,
  resolveIcmsGeneralNational,
  validateIcmsGeneralNational,
} from "../domain/icms-general-national.ts";

const base = {
  origin: "SP",
  destination: "DF",
  operationDate: "2026-07-30",
  operationValueCents: 100_000,
  importedQualified: false,
  recipientType: "taxpayer",
  finalConsumer: true,
  purpose: "fixed_asset",
  ncm: "84713012",
  generalRateAppliesConfirmed: true,
  noSpecificRateBenefitConfirmed: true,
  stStatus: "not_applicable_confirmed",
  fcpStatus: "not_applicable_confirmed",
};

test("catalogues 27 modal rates, validity, funds and official sources", async () => {
  assert.equal(icmsStateGeneralProfiles.length, 27);
  assert.equal(new Set(icmsStateGeneralProfiles.map((item) => item.uf)).size, 27);
  assert.ok(icmsStateGeneralProfiles.every((item) => item.effectiveFrom && item.legalDevice && item.fund.name));
  assert.ok(icmsStateGeneralProfiles.every((item) => icmsGeneralSources.some((source) => source.code === item.sourceCode)));
  assert.deepEqual(validateIcmsGeneralNational(), { passed: true, errors: [] });
  assert.match(await hashIcmsGeneralNational(), /^[0-9a-f]{64}$/);
});

test("reproduces 4%, 7% and 12% interstate references without creating DIFAL", () => {
  const cases = [
    [{ ...base, origin: "SP", destination: "MG", importedQualified: true, finalConsumer: false, purpose: "resale" }, 400],
    [{ ...base, origin: "SP", destination: "BA", finalConsumer: false, purpose: "resale" }, 700],
    [{ ...base, origin: "BA", destination: "SP", finalConsumer: false, purpose: "resale" }, 1200],
  ];
  for (const [input, rateBps] of cases) {
    const result = resolveIcmsGeneralNational(input);
    assert.equal(result.status, "not_applicable");
    assert.equal(result.interstateRateBps, rateBps);
  }
});

test("reproduces internal ICMS and separates RJ FECP", () => {
  const result = resolveIcmsGeneralNational({
    ...base,
    origin: "RJ",
    destination: "RJ",
    finalConsumer: false,
    purpose: "resale",
    fcpStatus: "general_confirmed",
  });
  assert.equal(result.status, "calculated_reference");
  assert.equal(result.kind, "internal");
  assert.deepEqual(result.ratesBps, { interstate: null, internal: 2000, fcp: 200 });
  assert.equal(result.amountsCents.originIcms, 20_000);
  assert.equal(result.amountsCents.destinationFcp, 2_000);
  assert.equal(result.amountsCents.destinationTotal, 22_000);
});

test("keeps taxpayer and non-taxpayer DIFAL methods and responsibilities separate", () => {
  const taxpayer = resolveIcmsGeneralNational(base);
  assert.equal(taxpayer.status, "calculated_reference");
  assert.equal(taxpayer.kind, "difal_taxpayer");
  assert.equal(taxpayer.method, "double_base");
  assert.equal(taxpayer.responsibility, "destination_taxpayer");
  assert.equal(taxpayer.amountsCents.destinationBase, 116_250);
  assert.equal(taxpayer.amountsCents.originIcms, 7_000);
  assert.equal(taxpayer.amountsCents.destinationDifal, 16_250);

  const nonTaxpayer = resolveIcmsGeneralNational({ ...base, recipientType: "non_taxpayer" });
  assert.equal(nonTaxpayer.status, "calculated_reference");
  assert.equal(nonTaxpayer.kind, "difal_non_taxpayer");
  assert.equal(nonTaxpayer.method, "single_base");
  assert.equal(nonTaxpayer.responsibility, "origin_remitter");
  assert.equal(nonTaxpayer.amountsCents.destinationBase, 116_250);
  assert.equal(nonTaxpayer.amountsCents.originIcms, 8_138);
  assert.equal(nonTaxpayer.amountsCents.destinationDifal, 15_112);
});

test("fails closed for ST, missing NCM, benefits and unproved state formula", () => {
  const st = resolveIcmsGeneralNational({ ...base, stStatus: "applicable" });
  assert.equal(st.status, "route_to_st");
  assert.equal("amountsCents" in st, false);

  for (const input of [
    { ...base, ncm: "" },
    { ...base, noSpecificRateBenefitConfirmed: false },
    { ...base, fcpStatus: "unknown" },
    { ...base, destination: "MG" },
  ]) {
    const result = resolveIcmsGeneralNational(input);
    assert.equal(result.status, "blocked");
    assert.ok(result.blockers.length > 0);
    assert.equal("amountsCents" in result, false);
  }
});

test("coverage metrics distinguish cataloguing from formula support", () => {
  const metrics = icmsGeneralNationalMetrics();
  assert.equal(metrics.states, 27);
  assert.ok(metrics.officialSources >= 27);
  assert.ok(metrics.difalTaxpayerMethods < metrics.states);
  assert.ok(metrics.difalNonTaxpayerMethods < metrics.states);
  assert.equal(metrics.generalFundRates, 1);
});

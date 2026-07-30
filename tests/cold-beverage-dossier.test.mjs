import assert from "node:assert/strict";
import test from "node:test";

import {
  createColdBeverageDossierSnapshot,
  isColdBeverageDossierSnapshot,
} from "../domain/cold-beverage-dossier.ts";
import {
  hashStColdBeverageSpDestination,
  resolveColdBeverageSpDestinationOperation,
} from "../domain/st-cold-beverages-sp-destination.ts";
import {
  hashStColdBeverageSpOrigin,
  resolveColdBeverageSpOriginOperation,
} from "../domain/st-cold-beverages-sp-origin.ts";

const destinationFacts = {
  exactProfileConfirmed: true,
  unlistedBrandEligibilityConfirmed: true,
  normalTaxRegimeConfirmed: true,
  taxpayerResaleOperationConfirmed: true,
  substituteResponsibilityConfirmed: true,
  noProtocolExceptionConfirmed: true,
  ownTaxBaseConfirmed: true,
  noSpecialTreatmentConfirmed: true,
  documentsConfirmed: true,
};

const destinationInput = {
  route: "MG-SP",
  profileCode: "UNLISTED_SOFT_DRINK_PET_1751_2000",
  operationDate: "2026-07-25",
  quantityUnits: 100,
  operationCents: 56_340,
  ownIcmsBaseCents: 56_340,
  importedQualified: false,
  facts: destinationFacts,
};

const originFacts = {
  exactProfileConfirmed: true,
  normalTaxRegimeConfirmed: true,
  taxpayerResaleOperationConfirmed: true,
  substituteResponsibilityConfirmed: true,
  noProtocolExceptionConfirmed: true,
  ownTaxBaseConfirmed: true,
  destinationRatesConfirmed: true,
  noSpecialTreatmentConfirmed: true,
  documentsConfirmed: true,
};

const originInput = {
  route: "SP-MG",
  profileCode: "MG_COCA_COLA_PET_2000",
  operationDate: "2026-07-25",
  quantityUnits: 100,
  operationCents: 71_580,
  ownIcmsBaseCents: 71_580,
  importedQualified: false,
  facts: originFacts,
};

test("destination-SP beverage dossier freezes exact profile, legal period and cents", async () => {
  const result = resolveColdBeverageSpDestinationOperation(destinationInput);
  const fingerprint = (await hashStColdBeverageSpDestination()).slice(0, 12);
  const { snapshot, inputHash } = await createColdBeverageDossierSnapshot(
    "sp_destination",
    destinationInput,
    result,
    fingerprint,
    "2026-07-26T12:00:00.000Z",
  );

  assert.equal(snapshot.coverage.status, "supported");
  assert.equal(snapshot.assurance.calculationStatus, "calculated_conditional");
  assert.equal(snapshot.operation.cest, "03.010.01");
  assert.deepEqual(snapshot.operation.ncms, ["2202.10.00", "2202.99.00"]);
  assert.equal(snapshot.operation.legalDescription, "Refrigerante em embalagem PET");
  assert.equal(snapshot.operation.commercialUnit, "individual_unit");
  assert.equal(snapshot.operation.commercialUnitUnits, 1);
  assert.equal(snapshot.operation.pmpfUnitCents, 939);
  assert.equal(snapshot.calculation.totals.icmsStCents, 10_141);
  assert.equal(snapshot.calculation.totals.destinationTotalCents, 10_141);
  assert.equal(snapshot.calculation.parameters.baseReductionBps, 0);
  assert.equal(snapshot.calculation.parameters.baseReductionStatus, "not_applicable_confirmed");
  assert.equal(snapshot.operation.confirmedFacts.length, 9);
  assert.equal(snapshot.operation.confirmedFacts.every((fact) => fact.confirmed), true);
  assert.equal(snapshot.evidence.sources.length > 0, true);
  assert.equal(snapshot.evidence.sources.every((source) => source.url.startsWith("https://")), true);
  assert.match(inputHash, /^[0-9a-f]{64}$/);
  assert.equal(isColdBeverageDossierSnapshot(snapshot), true);
});

test("SP-origin beverage dossier separates ICMS-ST and destination additional tax", async () => {
  const result = resolveColdBeverageSpOriginOperation(originInput);
  const fingerprint = (await hashStColdBeverageSpOrigin()).slice(0, 12);
  const { snapshot } = await createColdBeverageDossierSnapshot(
    "sp_origin",
    originInput,
    result,
    fingerprint,
    "2026-07-26T12:00:00.000Z",
  );

  assert.equal(snapshot.coverage.status, "supported");
  assert.equal(snapshot.operation.cest, "03.010.01");
  assert.deepEqual(snapshot.operation.ncms, ["2202.10.00", "2202.99.00"]);
  assert.equal(snapshot.calculation.parameters.pmpfLimitBps, 8_000);
  assert.equal(snapshot.calculation.parameters.baseReductionBps, 0);
  assert.equal(snapshot.calculation.totals.icmsStCents, 12_884);
  assert.equal(snapshot.calculation.totals.fcpCents, 2_386);
  assert.equal(snapshot.calculation.totals.destinationTotalCents, 15_270);
  assert.equal(snapshot.calculation.lines.some((line) => line.code === "FCP-ST" && line.amountCents === 2_386), true);
});

test("PMPF boundary becomes a partial dossier without a fabricated final amount", async () => {
  const input = {
    ...destinationInput,
    operationCents: 84_510,
    ownIcmsBaseCents: 84_510,
  };
  const result = resolveColdBeverageSpDestinationOperation(input);
  const { snapshot } = await createColdBeverageDossierSnapshot(
    "sp_destination",
    input,
    result,
    "boundary-test",
  );

  assert.equal(snapshot.coverage.status, "partial");
  assert.equal(snapshot.calculation.status, "needs_information");
  assert.equal(snapshot.calculation.totals.destinationTotalCents, null);
  assert.equal(snapshot.calculation.lines.at(-1)?.status, "blocked");
  assert.match(snapshot.calculation.blockers.join(" "), /90%|IVA-ST/);
});

test("missing evidence stays partial and explicitly lists the required confirmation", async () => {
  const input = {
    ...originInput,
    facts: { ...originFacts, destinationRatesConfirmed: false },
  };
  const result = resolveColdBeverageSpOriginOperation(input);
  const { snapshot } = await createColdBeverageDossierSnapshot(
    "sp_origin",
    input,
    result,
    "missing-fact-test",
  );

  assert.equal(snapshot.coverage.status, "partial");
  assert.equal(snapshot.assurance.factsComplete, false);
  assert.equal(snapshot.calculation.requiredConfirmations.length, 1);
  assert.equal(snapshot.calculation.totals.icmsStCents, null);
});

test("expired period is classified as not supported and never emits a calculation", async () => {
  const input = { ...originInput, operationDate: "2027-01-01" };
  const result = resolveColdBeverageSpOriginOperation(input);
  const { snapshot } = await createColdBeverageDossierSnapshot(
    "sp_origin",
    input,
    result,
    "expired-period-test",
  );

  assert.equal(snapshot.coverage.status, "not_supported");
  assert.equal(snapshot.calculation.calculationType, "not_supported");
  assert.equal(snapshot.calculation.totals.destinationTotalCents, null);
});

test("snapshot guard rejects arbitrary fiscal-looking objects", () => {
  assert.equal(isColdBeverageDossierSnapshot({ rule: { code: "COLD_BEVERAGES_SP_ORIGIN" } }), false);
  assert.equal(isColdBeverageDossierSnapshot(null), false);
});

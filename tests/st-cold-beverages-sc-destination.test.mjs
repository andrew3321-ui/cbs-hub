import assert from "node:assert/strict";
import test from "node:test";

import {
  hashStColdBeverageScDestination,
  resolveColdBeverageScDestination,
  stColdBeverageScMetrics,
  stColdBeverageScNegativeRuns,
  stColdBeverageScReferenceRuns,
  ST_COLD_BEVERAGES_SC_PMPF_PROFILES,
  validateStColdBeverageScDestination,
} from "../domain/st-cold-beverages-sc-destination.ts";

const facts = { exactBrandConfirmed: true, exactPackageConfirmed: true, exactVolumeConfirmed: true, exactGtinConfirmed: true, normalRegimeConfirmed: true, taxpayerResaleConfirmed: true, responsibilityConfirmed: true, noInterdependenceConfirmed: true, ownBaseConfirmed: true, documentsConfirmed: true };
const profile = ST_COLD_BEVERAGES_SC_PMPF_PROFILES[0];
const base = { route: "SP-SC", profileCode: profile.code, operationDate: "2026-08-01", quantityUnits: 100, operationCents: 71_520, ownIcmsBaseCents: 71_520, importedQualified: false, senderRole: "distributor_or_wholesaler", facts };

test("V91 validates five exact SC profiles, PMPF, MVA fallbacks and negative gates", () => {
  assert.deepEqual(validateStColdBeverageScDestination(), { passed: true, errors: [] });
  assert.deepEqual(stColdBeverageScMetrics(), { routes: 1, exactProfiles: 5, positiveMemories: 15, negativeGates: 30, officialSources: 6, pmpfMemories: 5, mvaFallbackMemories: 10, fcpRateBps: 0 });
  assert.equal(stColdBeverageScReferenceRuns.every((run) => run.result.output), true);
  assert.equal(stColdBeverageScNegativeRuns.every((run) => run.status === "blocked" && run.output === null), true);
});

test("SP to SC PMPF calculation is reproduced in integer cents", () => {
  const result = resolveColdBeverageScDestination(base);
  assert.equal(result.status, "calculated_pmpf");
  assert.deepEqual(result.output, { stBaseCents: 119_200, ownIcmsCents: 8_582, presumedInternalIcmsCents: 20_264, icmsStCents: 11_682, fcpCents: 0, destinationTotalCents: 11_682 });
});

test("90 percent gate applies the sender-role MVA and keeps FCP separate", () => {
  const distributor = resolveColdBeverageScDestination({ ...base, operationCents: 113_240, ownIcmsBaseCents: 113_240 });
  const industrial = resolveColdBeverageScDestination({ ...base, operationCents: 113_240, ownIcmsBaseCents: 113_240, senderRole: "industrial_or_importer" });
  assert.equal(distributor.status, "calculated_mva_fallback");
  assert.equal(distributor.parameters?.mvaBps, 8_024);
  assert.equal(industrial.parameters?.mvaBps, 15_446);
  assert.ok(industrial.output.stBaseCents > distributor.output.stBaseCents);
  assert.equal(industrial.output.fcpCents, 0);
});

test("divergent profile, regime, interdependence and validity fail closed", () => {
  assert.equal(resolveColdBeverageScDestination({ ...base, profileCode: "UNKNOWN" }).status, "blocked");
  assert.equal(resolveColdBeverageScDestination({ ...base, facts: { ...facts, normalRegimeConfirmed: false } }).status, "blocked");
  assert.equal(resolveColdBeverageScDestination({ ...base, facts: { ...facts, noInterdependenceConfirmed: false } }).status, "blocked");
  assert.equal(resolveColdBeverageScDestination({ ...base, operationDate: "2026-12-01" }).status, "blocked");
});

test("SC destination hash is stable", async () => {
  const hash = await hashStColdBeverageScDestination();
  assert.match(hash, /^[0-9a-f]{64}$/);
  assert.equal(await hashStColdBeverageScDestination(), hash);
});

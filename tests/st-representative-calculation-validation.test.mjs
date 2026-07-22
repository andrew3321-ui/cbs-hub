import assert from "node:assert/strict";
import test from "node:test";

import { hashStRepresentativeProducts, stRepresentativeProducts, validateStRepresentativeProducts } from "../domain/st-representative-products.ts";
import { hashStSpCalculationRuns, stSpCalculationRuns, stSpCalculationValidationMetrics, validateStSpCalculationRuns } from "../domain/st-sp-calculation-validation.ts";

test("V60 freezes one sourced representative identity for every ST segment", () => {
  const validation = validateStRepresentativeProducts();
  assert.deepEqual(validation.errors, []);
  assert.equal(validation.passed, true);
  assert.equal(stRepresentativeProducts.length, 25);
  assert.equal(new Set(stRepresentativeProducts.map((item) => item.segmentCode)).size, 25);
  assert.equal(new Set(stRepresentativeProducts.map((item) => item.cest)).size, 25);
  assert.equal(stRepresentativeProducts.every((item) => item.scope === "representative_identity_only" && item.warning.length > 40), true);
});

test("all 650 calculation cells run and missing law never becomes a number", () => {
  const validation = validateStSpCalculationRuns();
  const metrics = stSpCalculationValidationMetrics();
  assert.deepEqual(validation.errors, []);
  assert.equal(validation.passed, true);
  assert.deepEqual(metrics, { totalRuns: 650, referenceReproduced: 5, safelyBlocked: 645, failed: 0, representativeProducts: 25, cementAgreementScoped: 25, cementFixedMvaSourced: 19, cementDestinationLawMvaPending: 6, cementOutsideProtocol: 1, cementPriorityStates: 5, cementStateSources: 7, cementAdjustedMvaTables: 5, cementSyntheticReferences: 1, autoPartsPriorityRoutes: 26, autoPartsActiveAgreementRoutes: 15, autoPartsOutsideProtocolRoutes: 11, autoPartsSyntheticReferences: 1 });
  assert.equal(stSpCalculationRuns.filter((run) => run.status.startsWith("blocked_")).every((run) => run.output === null && run.missingLegalInputs.length > 0), true);
  assert.equal(stSpCalculationRuns.filter((run) => run.status === "blocked_missing_legal_parameters").every((run) => run.missingLegalInputs.length === 7), true);
});

test("the controlled references reproduce deterministic cent values", () => {
  const reproduced = new Map(stSpCalculationRuns.filter((run) => run.status === "reference_reproduced").map((run) => [run.key, run.output]));
  assert.equal(reproduced.get("SP-MG:AUTO_PARTS")?.destinationTotalCents, 21_183);
  assert.equal(reproduced.get("SP-MG:CEMENT")?.destinationTotalCents, 11_180);
  assert.equal(reproduced.get("SP-MG:PET_FOOD")?.destinationTotalCents, 18_047);
  assert.equal(reproduced.get("SP-RJ:CEMENT")?.destinationTotalCents, 17_040);
  assert.equal(reproduced.get("SP-RJ:AUTO_PARTS")?.destinationTotalCents, 29_571);
});

test("representative catalog and calculation run ledgers are tamper evident", async () => {
  const productsHash = await hashStRepresentativeProducts();
  const runsHash = await hashStSpCalculationRuns();
  assert.match(productsHash, /^[0-9a-f]{64}$/);
  assert.match(runsHash, /^[0-9a-f]{64}$/);
  assert.equal(productsHash, await hashStRepresentativeProducts());
  assert.equal(runsHash, await hashStSpCalculationRuns());
});

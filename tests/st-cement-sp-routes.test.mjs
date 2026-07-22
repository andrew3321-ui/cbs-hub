import assert from "node:assert/strict";
import test from "node:test";

import { hashStCementSpRoutes, stCementSpRouteMetrics, stCementSpRoutes, validateStCementSpRoutes } from "../domain/st-cement-sp-routes.ts";
import { stSpCalculationRuns } from "../domain/st-sp-calculation-validation.ts";

const destinationLawMvaUfs = ["AL", "MT", "PR", "RS", "SC", "SE"];
const fixedMvaUfs = ["AC", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "PA", "PB", "PE", "PI", "RJ", "RN", "RO", "RR", "TO"];

test("V61 structures every cement route from SP without inventing applicability", () => {
  assert.deepEqual(validateStCementSpRoutes(), { passed: true, errors: [] });
  assert.deepEqual(stCementSpRouteMetrics(), {
    destinations: 26,
    signatoryRoutes: 25,
    fixedMvaRoutes: 19,
    destinationLawMvaRoutes: 6,
    nonSignatoryRoutes: 1,
    newlyReleasedCalculations: 0,
  });
  assert.deepEqual(stCementSpRoutes.filter((route) => route.mvaSource === "destination_internal_law_required").map((route) => route.destination).sort(), destinationLawMvaUfs);
  assert.deepEqual(stCementSpRoutes.filter((route) => route.mvaSource === "protocol_fixed_20_percent").map((route) => route.destination).sort(), fixedMvaUfs);
});

test("all cement identities and protocol-derived fields are frozen", () => {
  assert.equal(stCementSpRoutes.every((route) => route.product.cest === "05.001.00" && route.product.ncm[0] === "2523"), true);
  assert.equal(stCementSpRoutes.filter((route) => route.mvaOriginalBps === 2000).length, 19);
  assert.equal(stCementSpRoutes.find((route) => route.destination === "AM")?.protocolStatus, "destination_not_signatory");
  assert.equal(stCementSpRoutes.find((route) => route.destination === "AM")?.mvaOriginalBps, null);
});

test("state enrichment releases only the controlled RJ synthetic reference", () => {
  const cementRuns = stSpCalculationRuns.filter((run) => run.productCode === "REP-CEMENT");
  assert.equal(cementRuns.length, 26);
  assert.equal(cementRuns.filter((run) => run.status === "reference_reproduced").length, 2);
  assert.equal(cementRuns.filter((run) => run.status === "blocked_missing_destination_parameters").length, 23);
  assert.equal(cementRuns.filter((run) => run.status === "blocked_protocol_not_applicable").length, 1);
  assert.equal(cementRuns.filter((run) => !["SP-MG:CEMENT", "SP-RJ:CEMENT"].includes(run.key)).every((run) => run.output === null && run.missingLegalInputs.length > 0), true);
});

test("cement route ledger is tamper evident", async () => {
  const fingerprint = await hashStCementSpRoutes();
  assert.match(fingerprint, /^[0-9a-f]{64}$/);
  assert.equal(fingerprint, await hashStCementSpRoutes());
});

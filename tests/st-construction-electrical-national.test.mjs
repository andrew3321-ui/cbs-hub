import assert from "node:assert/strict";
import test from "node:test";

import {
  ST_CONSTRUCTION_ELECTRICAL_NATIONAL_IDENTITIES,
  ST_CONSTRUCTION_ELECTRICAL_NATIONAL_ROUTES,
  hashStConstructionElectricalNational,
  stConstructionElectricalNationalCases,
  stConstructionElectricalNationalCells,
  stConstructionElectricalNationalMetrics,
  validateStConstructionElectricalNational,
} from "../domain/st-construction-electrical-national.ts";

test("matriz nacional separa vinte identidades em dezoito corredores sem emprestar parâmetros", () => {
  assert.deepEqual(validateStConstructionElectricalNational(), { passed: true, errors: [] });
  assert.equal(ST_CONSTRUCTION_ELECTRICAL_NATIONAL_IDENTITIES.length, 20);
  assert.equal(ST_CONSTRUCTION_ELECTRICAL_NATIONAL_ROUTES.length, 18);
  assert.equal(stConstructionElectricalNationalCells.length, 360);
  assert.deepEqual(stConstructionElectricalNationalMetrics(), {
    priorityProducts: 20,
    productFamilies: 4,
    priorityRoutes: 18,
    controlledCells: 360,
    reproducedMemories: 32,
    deterministicCases: 488,
    safeFailureScenarios: 456,
    officialSources: 7,
    coverage: { supported: 32, partial: 68, notSupported: 260 },
  });
});

test("Santa Catarina registra somente a não aplicação de ST comprovada", () => {
  const cells = stConstructionElectricalNationalCells.filter((cell) => cell.route === "SP-SC");
  assert.equal(cells.length, 20);
  assert.ok(cells.every((cell) => cell.status === "supported" && cell.method === "no_st"));
  assert.ok(cells.every((cell) => cell.output?.destinationTotalCents === 0 && cell.output?.ownIcmsCents === null));
});

test("rotas sem parâmetros estaduais permanecem visíveis e falham fechadas", () => {
  const blocked = stConstructionElectricalNationalCells.filter((cell) => cell.status !== "supported");
  assert.equal(blocked.length, 328);
  assert.ok(blocked.every((cell) => cell.output === null && cell.blockers.length >= 2));
  assert.equal(stConstructionElectricalNationalCells.find((cell) => cell.key === "LIME:SP-PR")?.status, "partial");
  assert.equal(stConstructionElectricalNationalCells.find((cell) => cell.key === "LIME:PR-SP")?.status, "not_supported");
});

test("corpus cobre baseline e quatro mutações negativas para cada memória liberada", () => {
  assert.equal(stConstructionElectricalNationalCases.length, 488);
  assert.equal(stConstructionElectricalNationalCases.filter((item) => item.kind === "negative").length, 128);
  assert.ok(stConstructionElectricalNationalCases.filter((item) => item.kind === "negative").every((item) => item.expectedOutput === null));
});

test("fingerprint nacional é estável", async () => {
  const first = await hashStConstructionElectricalNational();
  assert.match(first, /^[0-9a-f]{64}$/);
  assert.equal(await hashStConstructionElectricalNational(), first);
});

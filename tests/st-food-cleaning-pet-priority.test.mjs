import assert from "node:assert/strict";
import test from "node:test";

import {
  buildFoodCleaningPetDossier,
  hashStFoodCleaningPetPriority,
  searchFoodCleaningPetRules,
  ST_FOOD_CLEANING_PET_PRODUCTS,
  stFoodCleaningPetDossiers,
  stFoodCleaningPetMetrics,
  stFoodCleaningPetMvaFallbackRun,
  stFoodCleaningPetNegativeRuns,
  stFoodCleaningPetReferenceRuns,
  validateStFoodCleaningPetPriority,
} from "../domain/st-food-cleaning-pet-priority.ts";

test("lote separa 25 identidades de alimentos, limpeza, higiene doméstica e pet food", () => {
  assert.equal(ST_FOOD_CLEANING_PET_PRODUCTS.length, 25);
  assert.deepEqual(new Set(ST_FOOD_CLEANING_PET_PRODUCTS.map((product) => product.family)), new Set(["food", "cleaning", "household_hygiene", "pet_food"]));
  assert.deepEqual(stFoodCleaningPetMetrics(), {
    priorityProducts: 25,
    productFamilies: 4,
    priorityRoutes: 9,
    controlledCells: 225,
    reproducedMemories: 25,
    mvaMemories: 25,
    pmpfMemories: 1,
    safeFailureScenarios: 207,
    officialSources: 17,
    coverage: { supported: 25, partial: 200, notSupported: 0 },
  });
});

test("SP para MG reproduz 24 MVA e uma pauta PMPF em centavos", () => {
  const mg = stFoodCleaningPetReferenceRuns.filter((run) => run.route === "SP-MG");
  assert.equal(mg.length, 25);
  assert.equal(mg.filter((run) => run.result.method === "mva").length, 24);
  assert.equal(mg.filter((run) => run.result.method === "pmpf").length, 1);
  assert.ok(mg.every((run) => run.result.status === "calculated_reference" && run.result.output?.destinationTotalCents > 0));
  const pet = mg.find((run) => run.productCode === "DOGCHOW_ABOVE_5KG");
  assert.equal(pet?.result.parameters?.pmpfPerKgCents, 1_375);
  assert.equal(pet?.result.output?.stBaseCents, 13_750);
  assert.equal(pet?.result.output?.destinationTotalCents, 1_275);
});

test("pauta de pet food cede à MVA quando a operação própria alcança o PMPF", () => {
  assert.equal(stFoodCleaningPetMvaFallbackRun.status, "calculated_reference");
  assert.equal(stFoodCleaningPetMvaFallbackRun.method, "mva");
  assert.equal(stFoodCleaningPetMvaFallbackRun.parameters?.mvaOriginalBps, 5_555);
  assert.ok(stFoodCleaningPetMvaFallbackRun.output?.destinationTotalCents > 0);
});

test("as oito rotas abertas permanecem parciais e nunca recebem parâmetros mineiros", () => {
  const open = stFoodCleaningPetReferenceRuns.filter((run) => run.route !== "SP-MG");
  assert.equal(open.length, 200);
  assert.ok(open.every((run) => run.result.status === "blocked" && run.result.coverageStatus === "partial"));
  assert.ok(open.every((run) => run.result.parameters === null && run.result.output === null));
  assert.ok(open.every((run) => run.result.blockers.includes("route_parameters_not_closed")));
});

test("benefício, exceção, período, dado, classificação e apresentação falham fechados", () => {
  assert.deepEqual(stFoodCleaningPetNegativeRuns.map((run) => run.code), [
    "benefit",
    "exception",
    "expired",
    "missing_data",
    "classification_mismatch",
    "pet_presentation_mismatch",
    "invalid_money",
  ]);
  assert.ok(stFoodCleaningPetNegativeRuns.every((run) => run.result.output === null && run.result.status !== "calculated_reference"));
});

test("busca, dossiê, cobertura e fonte permanecem vinculados ao recorte", () => {
  assert.deepEqual(searchFoodCleaningPetRules("Qual o ICMS-ST do detergente em pó de SP para MG?").map((item) => [item.productCode, item.route, item.status]), [["POWDER_DETERGENT", "SP-MG", "supported"]]);
  assert.deepEqual(searchFoodCleaningPetRules("DOGCHOW para RJ").map((item) => [item.productCode, item.route, item.status]), [["DOGCHOW_ABOVE_5KG", "SP-RJ", "partial"]]);
  assert.equal(stFoodCleaningPetDossiers.length, 225);
  const supported = stFoodCleaningPetDossiers.find((item) => item.key === "SP-MG:WHITE_CHOCOLATE_1KG")?.dossier;
  assert.equal(supported?.status, "calculated_reference");
  assert.ok(supported?.evidence.length >= 5);
  const partial = buildFoodCleaningPetDossier(stFoodCleaningPetReferenceRuns.find((run) => run.key === "SP-RJ:WHITE_CHOCOLATE_1KG").result);
  assert.equal(partial.calculation, null);
  assert.equal(partial.coverageStatus, "partial");
});

test("validação agregada e hash da versão são determinísticos", async () => {
  assert.deepEqual(validateStFoodCleaningPetPriority(), { passed: true, errors: [] });
  const first = await hashStFoodCleaningPetPriority();
  assert.match(first, /^[0-9a-f]{64}$/);
  assert.equal(await hashStFoodCleaningPetPriority(), first);
});

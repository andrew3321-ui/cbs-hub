import assert from "node:assert/strict";
import test from "node:test";

import {
  IPI_EXTERNAL_TREATMENT_CONTROLS,
  IPI_TIPI_100_EXPANSION_VERSION,
  hashIpiTipi100Expansion,
  ipiTipi100AdditionalProfiles,
  ipiTipi100ExpansionCases,
  ipiTipi100ExpansionMetrics,
  ipiTipi100ExpansionSources,
  ipiTipi100Profiles,
  resolveIpiTipi100Expansion,
  validateIpiTipi100Expansion,
} from "../domain/ipi-tipi-100-expansion.ts";

test("V106 adds fifty exact recurring NCMs confirmed in the official 2026 TIPI", () => {
  assert.equal(IPI_TIPI_100_EXPANSION_VERSION, "2026.08.01-v106");
  assert.equal(ipiTipi100AdditionalProfiles.length, 50);
  assert.equal(ipiTipi100Profiles.length, 100);
  assert.equal(new Set(ipiTipi100Profiles.map((profile) => profile.ncm)).size, 100);
  assert.ok(ipiTipi100AdditionalProfiles.every((profile) => profile.priorityBasis.includes("official_tipi_2026")));
});

test("taxed, zero-rate and NT entries remain distinct", () => {
  const inputs = ["34012090", "19053200", "12019000"].map((ncm) => ipiTipi100ExpansionCases.find((item) => item.code === `${ncm}:industrial`).input);
  assert.deepEqual(inputs.map((input) => resolveIpiTipi100Expansion(input).status), ["calculated_reference", "zero_rate_reference", "not_taxed_reference"]);
});

test("internal and customs bases reproduce integer-cent memories", () => {
  const internal = resolveIpiTipi100Expansion(ipiTipi100ExpansionCases.find((item) => item.code === "34012090:industrial").input);
  const customs = resolveIpiTipi100Expansion(ipiTipi100ExpansionCases.find((item) => item.code === "34012090:import").input);
  assert.equal(internal.lines.find((line) => line.code === "ipi_due")?.amountCents, 325_000);
  assert.equal(customs.lines.find((line) => line.code === "ipi_base")?.amountCents, 9_100_000);
  assert.equal(customs.lines.find((line) => line.code === "ipi_due")?.amountCents, 295_750);
});

test("returns only reproduce the original documented IPI", () => {
  const referenceCase = ipiTipi100ExpansionCases.find((item) => item.code === "34012090:return");
  const result = resolveIpiTipi100Expansion(referenceCase.input);
  assert.equal(result.status, "return_reversal_reference");
  assert.equal(result.lines[0].amountCents, 97_500);
  assert.equal(resolveIpiTipi100Expansion({ ...referenceCase.input, originalDocumentConfirmed: false }).status, "blocked");
});

test("new Ex entries require exact description and can be taxed, zero or NT", () => {
  const exceptionCases = ipiTipi100ExpansionCases.filter((item) => item.kind === "exception");
  assert.equal(exceptionCases.length, 11);
  assert.ok(exceptionCases.every((item) => resolveIpiTipi100Expansion(item.input).status === item.expectedStatus));
  const missingDescription = { ...exceptionCases[0].input, exceptionDescriptionConfirmed: false };
  assert.equal(resolveIpiTipi100Expansion(missingDescription).status, "blocked");
});

test("external reductions, exemptions, suspensions and immunities never inherit a TIPI rate", () => {
  assert.equal(IPI_EXTERNAL_TREATMENT_CONTROLS.length, 4);
  assert.ok(IPI_EXTERNAL_TREATMENT_CONTROLS.every((control) => control.calculationWithoutDedicatedRule === false));
  assert.ok(ipiTipi100ExpansionCases.filter((item) => item.kind === "benefit").every((item) => resolveIpiTipi100Expansion(item.input).status === "blocked"));
});

test("positive, negative and temporal cases are unique and fail closed", () => {
  assert.equal(ipiTipi100ExpansionCases.length, 411);
  assert.equal(new Set(ipiTipi100ExpansionCases.map((item) => item.code)).size, 411);
  for (const item of ipiTipi100ExpansionCases) {
    const result = resolveIpiTipi100Expansion(item.input);
    assert.equal(result.status, item.expectedStatus, item.code);
    if (result.status === "blocked") assert.deepEqual(result.lines, [], item.code);
  }
});

test("sources, metrics, validation and fingerprint are reproducible", async () => {
  assert.ok(ipiTipi100ExpansionSources.every((source) => source.url.startsWith("https://")));
  assert.deepEqual(ipiTipi100ExpansionMetrics(), {
    priorNcms: 50,
    newNcms: 50,
    totalNcms: 100,
    newExceptions: 11,
    totalExceptions: 30,
    deterministicCases: 411,
    calculatedMemories: 211,
    safelyBlockedCases: 200,
  });
  assert.deepEqual(validateIpiTipi100Expansion(), { passed: true, errors: [] });
  const first = await hashIpiTipi100Expansion();
  assert.match(first, /^[a-f0-9]{64}$/);
  assert.equal(await hashIpiTipi100Expansion(), first);
});

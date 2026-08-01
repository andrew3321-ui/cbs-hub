import assert from "node:assert/strict";
import test from "node:test";

import {
  PIS_COFINS_120_EXPANSION_VERSION,
  PIS_COFINS_BOOKS,
  hashPisCofins120Expansion,
  pisCofins120AdditionalProfiles,
  pisCofins120ExpansionMetrics,
  pisCofins120Profiles,
  pisCofins120ReferenceCases,
  pisCofins120ExpansionSources,
  pisCofinsExpandedCreditControls,
  resolvePisCofins120Expansion,
  validatePisCofins120Expansion,
} from "../domain/pis-cofins-120-expansion.ts";

test("V105 expands sixty documented combinations without inventing new NCM identities", () => {
  assert.equal(PIS_COFINS_120_EXPANSION_VERSION, "2026.08.01-v105");
  assert.equal(pisCofins120AdditionalProfiles.length, 60);
  assert.equal(pisCofins120Profiles.length, 120);
  assert.equal(new Set(pisCofins120AdditionalProfiles.map((profile) => profile.code)).size, 60);
  assert.ok(pisCofins120AdditionalProfiles.every((profile) => /^\d{8}$/.test(profile.exactNcm)));
  assert.ok(pisCofins120AdditionalProfiles.every((profile) => profile.policy.includes("exact_ncm_operation_role")));
});

test("revenue and acquisition books never net automatically", () => {
  assert.equal(PIS_COFINS_BOOKS.length, 11);
  assert.ok(PIS_COFINS_BOOKS.every((book) => book.automaticNetting === false));
  assert.ok(PIS_COFINS_BOOKS.some((book) => book.code === "revenue_cumulative"));
  assert.ok(PIS_COFINS_BOOKS.some((book) => book.code === "revenue_non_cumulative"));
  assert.ok(PIS_COFINS_BOOKS.some((book) => book.code === "acquisition_non_cumulative"));
});

test("financial revenue uses its official book and current specific rates", () => {
  const referenceCase = pisCofins120ReferenceCases.find((item) => item.input.operation === "financial_revenue" && item.kind === "complete");
  const result = resolvePisCofins120Expansion(referenceCase.input);
  assert.equal(result.status, "calculated_reference");
  assert.deepEqual(result.lines.map((line) => line.amountCents), [65_000, 400_000]);
  assert.ok(result.lines.every((line) => line.book === "revenue_financial"));
});

test("returns reproduce the original document instead of recalculating it", () => {
  const referenceCase = pisCofins120ReferenceCases.find((item) => item.input.operation === "return" && item.kind === "complete");
  const result = resolvePisCofins120Expansion(referenceCase.input);
  assert.equal(result.status, "calculated_reference");
  assert.deepEqual(result.lines.map((line) => line.amountCents), [65_000, 300_000]);
  const blocked = resolvePisCofins120Expansion({ ...referenceCase.input, originalDocumentConfirmed: false });
  assert.equal(blocked.status, "blocked");
  assert.deepEqual(blocked.lines, []);
});

test("bonuses, suspension and substitution remain fail closed without their specific memories", () => {
  for (const operation of ["bonus", "suspension", "substitution"]) {
    const referenceCase = pisCofins120ReferenceCases.find((item) => item.input.operation === operation && item.kind === "complete");
    const result = resolvePisCofins120Expansion(referenceCase.input);
    assert.equal(result.status, "blocked", operation);
    assert.deepEqual(result.lines, [], operation);
  }
});

test("credit expansion structures evidence controls but never grants a basic-rate credit by label", () => {
  assert.equal(pisCofinsExpandedCreditControls.length, 12);
  assert.ok(pisCofinsExpandedCreditControls.every((control) => control.requiredFacts.length >= 3));
  assert.ok(pisCofinsExpandedCreditControls.every((control) => control.automaticBasicRateCredit === false));
});

test("three hundred cases preserve expected status and blocked outputs never leak values", () => {
  assert.equal(pisCofins120ReferenceCases.length, 300);
  for (const referenceCase of pisCofins120ReferenceCases) {
    const result = resolvePisCofins120Expansion(referenceCase.input);
    assert.equal(result.status, referenceCase.expectedStatus, referenceCase.code);
    if (result.status === "blocked") assert.deepEqual(result.lines, [], referenceCase.code);
  }
});

test("sources, metrics, validation and hash are versioned and reproducible", async () => {
  assert.ok(pisCofins120ExpansionSources.every((source) => source.url.startsWith("https://")));
  const metrics = pisCofins120ExpansionMetrics();
  assert.deepEqual(metrics, {
    priorProfiles: 60,
    newProfiles: 60,
    totalProfiles: 120,
    priorCreditHypotheses: 20,
    expandedCreditControls: 12,
    books: 11,
    deterministicCases: 300,
    calculatedMemories: 39,
    safelyBlockedCases: 261,
  });
  assert.deepEqual(validatePisCofins120Expansion(), { passed: true, errors: [] });
  const first = await hashPisCofins120Expansion();
  assert.match(first, /^[a-f0-9]{64}$/);
  assert.equal(await hashPisCofins120Expansion(), first);
});

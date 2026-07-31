import assert from "node:assert/strict";
import test from "node:test";
import {
  SIMPLES_NATIONAL_2026_SUBLIMIT_CENTS,
  calculateSimplesNationalDeepReference,
  hashSimplesNationalDeep,
  resolveSimplesActivity,
  simplesActivityProfiles,
  simplesAnnexTables,
  simplesNationalDeepMetrics,
  simplesNationalSources,
  simplesExclusionRules,
  simplesNationalReferenceCases,
  simplesSegregationRules,
  validateSimplesNationalDeep,
} from "../domain/simples-national-deep.ts";

const complete = {
  rbt12Cents: 120_000_000,
  monthlyRevenueCents: 10_000_000,
  activityConfirmed: true,
  annexConfirmed: true,
  revenueCompositionConfirmed: true,
  periodClosed: true,
  eligibilityConfirmed: true,
  under2026SublimitConfirmed: true,
  noSpecialTreatment: true,
};

test("V93 ranks 50 recurring activities without treating CNAE as a final tax conclusion", () => {
  assert.equal(simplesActivityProfiles.length, 50);
  assert.deepEqual(simplesActivityProfiles.map((item) => item.rank), Array.from({ length: 50 }, (_, index) => index + 1));
  assert.equal(new Set(simplesActivityProfiles.map((item) => item.cnae)).size, 50);
  assert.ok(simplesActivityProfiles.every((item) => item.classificationPolicy === "candidate_requires_effective_activity_confirmation"));
  assert.ok(simplesActivityProfiles.every((item) => item.effectiveFrom === "2018-01-01" && item.version.endsWith("v93")));
  assert.ok(simplesActivityProfiles.every((item) => item.segregations.length >= 4));
  assert.deepEqual(resolveSimplesActivity("69.20-6/01")?.annexCandidates, ["III"]);
  assert.deepEqual(resolveSimplesActivity("62.04-0/00")?.annexCandidates, ["III", "V"]);
});

test("all five annexes preserve the six official brackets in integer cents and basis points", () => {
  assert.deepEqual(Object.keys(simplesAnnexTables), ["I", "II", "III", "IV", "V"]);
  for (const brackets of Object.values(simplesAnnexTables)) {
    assert.equal(brackets.length, 6);
    assert.equal(brackets[0].fromCents, 0);
    assert.equal(brackets.at(-1).toCents, 480_000_000);
    assert.ok(brackets.every((item) => Number.isSafeInteger(item.nominalBps) && Number.isSafeInteger(item.deductionCents)));
  }
  assert.equal(simplesAnnexTables.II[4].nominalBps, 1470);
  assert.equal(simplesAnnexTables.IV[5].deductionCents, 82_800_000);
});

test("factor R uses the inclusive 28 percent boundary and never trusts a divergent annex", () => {
  const atBoundary = calculateSimplesNationalDeepReference({
    ...complete,
    cnae: "6204000",
    declaredAnnex: "III",
    fs12Cents: 33_600_000,
  });
  assert.equal(atBoundary.status, "calculated_reference");
  assert.equal(atBoundary.factorRBps, 2800);
  assert.equal(atBoundary.resolvedAnnex, "III");

  const belowBoundary = calculateSimplesNationalDeepReference({
    ...complete,
    cnae: "6204000",
    declaredAnnex: "V",
    fs12Cents: 33_599_999,
  });
  assert.equal(belowBoundary.status, "calculated_reference");
  assert.equal(belowBoundary.resolvedAnnex, "V");

  const divergence = calculateSimplesNationalDeepReference({
    ...complete,
    cnae: "6204000",
    declaredAnnex: "III",
    fs12Cents: 20_000_000,
  });
  assert.equal(divergence.status, "blocked");
  assert.ok(divergence.blockers.some((item) => item.includes("divergente do anexo declarado")));
  assert.equal(divergence.lines.length, 0);
});

test("commerce, industry, fixed service and Annex IV memories are reproducible", () => {
  const cases = [
    { cnae: "4711302", declaredAnnex: "I" },
    { cnae: "1091102", declaredAnnex: "II" },
    { cnae: "6920601", declaredAnnex: "III" },
    { cnae: "4120400", declaredAnnex: "IV" },
  ];
  for (const input of cases) {
    const result = calculateSimplesNationalDeepReference({ ...complete, ...input });
    assert.equal(result.status, "calculated_reference");
    assert.equal(result.lines.length, 6);
    assert.ok(result.lines.every((line) => line.amountCents === null || Number.isSafeInteger(line.amountCents)));
    assert.ok(result.lines.at(-1).amountCents > 0);
  }
});

test("RBT12, revenue composition, eligibility, period and special treatment are hard gates", () => {
  const base = { ...complete, cnae: "4711302", declaredAnnex: "I" };
  const variants = [
    { rbt12Cents: null, expected: "RBT12 não informado" },
    { monthlyRevenueCents: null, expected: "receita mensal e sua composição não informadas" },
    { revenueCompositionConfirmed: false, expected: "composição e segregações da receita não confirmadas" },
    { eligibilityConfirmed: false, expected: "elegibilidade, impedimentos e receita global não conferidos" },
    { periodClosed: false, expected: "período de apuração não fechado" },
    { noSpecialTreatment: false, expected: "tratamento especial exige segregação própria no PGDAS-D" },
  ];
  for (const variant of variants) {
    const { expected, ...override } = variant;
    const result = calculateSimplesNationalDeepReference({ ...base, ...override });
    assert.equal(result.status, "blocked");
    assert.ok(result.blockers.includes(expected));
    assert.equal(result.lines.length, 0);
  }
});

test("the 2026 ICMS and ISS sublimimit blocks the full DAS reference", () => {
  assert.equal(SIMPLES_NATIONAL_2026_SUBLIMIT_CENTS, 360_000_000);
  const result = calculateSimplesNationalDeepReference({
    ...complete,
    cnae: "4711302",
    declaredAnnex: "I",
    rbt12Cents: SIMPLES_NATIONAL_2026_SUBLIMIT_CENTS + 1,
  });
  assert.equal(result.status, "blocked");
  assert.ok(result.blockers.includes("ICMS e ISS devem ser tratados fora do DAS após o sublimite de 2026"));
});

test("official evidence, deterministic metrics, validation and hash are complete", async () => {
  assert.equal(simplesNationalSources.length, 5);
  assert.ok(simplesNationalSources.every((item) => item.url.startsWith("https://")));
  assert.deepEqual(simplesNationalDeepMetrics(), {
    prioritizedActivities: 50,
    annexes: 5,
    annexBracketMemories: 30,
    segregationRules: 15,
    eligibilityGates: 10,
    exclusionRules: 15,
    deterministicCases: 150,
    calculatedMemories: 101,
    safelyBlockedCases: 49,
  });
  assert.equal(simplesExclusionRules.length, 15);
  assert.equal(simplesSegregationRules.length, 15);
  assert.equal(simplesNationalReferenceCases.length, 150);
  assert.deepEqual(validateSimplesNationalDeep(), { passed: true, errors: [] });
  const first = await hashSimplesNationalDeep();
  const second = await hashSimplesNationalDeep();
  assert.match(first, /^[a-f0-9]{64}$/);
  assert.equal(first, second);
});

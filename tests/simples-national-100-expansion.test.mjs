import assert from "node:assert/strict";
import test from "node:test";
import {
  SIMPLES_REVENUE_BOOKS,
  hashSimplesNational100Expansion,
  resolveSimplesNational100Expansion,
  simplesNational100AdditionalProfiles,
  simplesNational100ExpansionMetrics,
  simplesNational100ExpansionSources,
  simplesNational100Profiles,
  simplesNational100ReferenceCases,
  validateSimplesNational100Expansion,
} from "../domain/simples-national-100-expansion.ts";

test("expands the documented activity queue from 50 to 100 without treating CNAE as the final annex", () => {
  assert.equal(simplesNational100AdditionalProfiles.length, 50);
  assert.equal(simplesNational100Profiles.length, 100);
  assert.equal(new Set(simplesNational100Profiles.map((profile) => profile.cnae)).size, 100);
  assert.ok(simplesNational100AdditionalProfiles.every((profile) => profile.classificationPolicy === "candidate_requires_effective_activity_confirmation"));
  assert.ok(simplesNational100AdditionalProfiles.every((profile) => profile.hardStops.some((item) => item.includes("não conclui o anexo"))));
});

test("factor R uses a twelve-month composition of salaries, pro-labore, employer contribution and FGTS", () => {
  const referenceCase = simplesNational100ReferenceCases.find((item) => item.code === "6202300-01-COMPLETE");
  assert.ok(referenceCase);
  const result = resolveSimplesNational100Expansion(referenceCase.input);
  assert.equal(result.status, "calculated_reference");
  assert.equal(result.rbt12Cents, 120_000_000);
  assert.equal(result.fs12Cents, 33_600_000);
  assert.equal(result.factorRBps, 2_800);
  assert.equal(result.resolvedAnnex, "III");
  assert.ok(result.ordinaryReferenceCents > 0);
});

test("segregates special revenue books and blocks an unconfirmed composition", () => {
  assert.deepEqual(SIMPLES_REVENUE_BOOKS, ["ordinary", "icms_st", "pis_cofins_monophase", "iss_withheld", "export", "non_taxed"]);
  const referenceCase = simplesNational100ReferenceCases.find((item) => item.code === "4530701-05-SEGREGATION");
  assert.ok(referenceCase);
  const result = resolveSimplesNational100Expansion(referenceCase.input);
  assert.equal(result.status, "blocked");
  assert.equal(result.ordinaryReferenceCents, null);
  assert.equal(result.revenueLedgers.find((item) => item.code === "pis_cofins_monophase").amountCents, 1_000_000);
});

test("keeps Annex IV CPP outside DAS without inventing payroll tax", () => {
  const referenceCase = simplesNational100ReferenceCases.find((item) => item.code === "4222701-01-COMPLETE");
  assert.ok(referenceCase);
  const result = resolveSimplesNational100Expansion(referenceCase.input);
  assert.equal(result.status, "calculated_reference");
  assert.equal(result.resolvedAnnex, "IV");
  assert.deepEqual(result.outsideDasLedgers, [{ code: "cpp_annex_iv", amountCents: null, treatment: "CPP fora do DAS; depende da folha, rubricas e regras previdenciárias reais" }]);
});

test("reexecutes 300 explicit cases with official sources and no blocked DAS leakage", async () => {
  assert.equal(simplesNational100ReferenceCases.length, 300);
  for (const referenceCase of simplesNational100ReferenceCases) {
    const result = resolveSimplesNational100Expansion(referenceCase.input);
    assert.equal(result.status, referenceCase.expectedStatus, referenceCase.code);
    if (result.status === "blocked") assert.equal(result.ordinaryReferenceCents, null, referenceCase.code);
  }
  assert.ok(simplesNational100ExpansionSources.every((source) => source.url.startsWith("https://")));
  assert.deepEqual(validateSimplesNational100Expansion(), { passed: true, errors: [] });
  assert.match(await hashSimplesNational100Expansion(), /^[0-9a-f]{64}$/);
});

test("publishes complete expansion metrics", () => {
  assert.deepEqual(simplesNational100ExpansionMetrics(), {
    priorProfiles: 50,
    newProfiles: 50,
    totalProfiles: 100,
    revenueBooks: 6,
    deterministicCases: 300,
    calculatedMemories: 100,
    safelyBlockedCases: 200,
    factorRProfiles: 28,
    annexIvProfiles: 11,
  });
});

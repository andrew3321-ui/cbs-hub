import assert from "node:assert/strict";
import test from "node:test";
import {
  buildIssDeepTechnicalEvidence,
  evaluateIssDeepGate,
  issDeepCityProfiles,
  issDeepMetrics,
  issDeepSources,
  sourcesForIssDeepProfile,
} from "../domain/iss-deep-coverage.ts";

test("V53 technically reviews exactly 15 deep ISS municipalities without homologating them", () => {
  assert.equal(issDeepCityProfiles.length, 15);
  assert.equal(new Set(issDeepCityProfiles.map((item) => item.ibgeCode)).size, 15);
  assert.ok(issDeepCityProfiles.every((item) => item.stage === "structured"));
  assert.ok(issDeepCityProfiles.every((item) => item.supportStatus === "partial"));
  assert.ok(issDeepCityProfiles.every((item) => item.sourceCodes.length >= 1));
  assert.ok(issDeepCityProfiles.every((item) => sourcesForIssDeepProfile(item).length === item.sourceCodes.length));
  assert.equal(issDeepMetrics.structuredCities, 15);
  assert.equal(issDeepMetrics.sourceCatalogReviewedCities, 15);
  assert.equal(issDeepMetrics.technicalGateValidatedCities, 15);
  assert.equal(issDeepMetrics.rateReferenceLocatedCities, 14);
  assert.equal(issDeepMetrics.testedCities, 0);
  assert.equal(issDeepMetrics.professionallyApprovedCities, 0);
  assert.equal(issDeepMetrics.automaticHomologation, false);
});

test("technical review produces one unique SHA-256 evidence record per city", async () => {
  const evidence = await buildIssDeepTechnicalEvidence();
  assert.equal(evidence.length, 15);
  assert.equal(new Set(evidence.map((item) => item.evidenceHash)).size, 15);
  assert.ok(evidence.every((item) => /^[a-f0-9]{64}$/.test(item.evidenceHash)));
  assert.ok(evidence.every((item) => item.status === "passed"));
  assert.ok(evidence.every((item) => item.passedChecks.length === 6));
  assert.ok(evidence.every((item) => item.professionalReview === "pending" && item.taxHomologation === "pending"));
});

test("V53 exercises the fail-closed ISS contract in all 15 deep packages", async (context) => {
  for (const profile of issDeepCityProfiles) {
    await context.test(`${profile.city}/${profile.uf}`, () => {
      const base = {
        ibgeCode: profile.ibgeCode,
        lc116Item: "17.01",
        municipalServiceCode: "TECH-CHECK",
        operationDate: "2026-07-18",
        municipalRateBps: 200,
        rateSourceCode: profile.sourceCodes[0],
        rateEvidenceReference: "technical-contract-reference",
        placeConfirmed: true,
        withholdingConfirmed: true,
      };
      const withoutApproval = evaluateIssDeepGate(base);
      assert.equal(withoutApproval.status, "blocked");
      assert.ok(withoutApproval.missingFacts.includes("aprovação profissional da regra e da vigência"));

      const wrongSource = evaluateIssDeepGate({ ...base, rateSourceCode: "NOT-IN-PACKAGE", professionalApprovalConfirmed: true });
      assert.equal(wrongSource.status, "blocked");
      assert.ok(wrongSource.missingFacts.includes("fonte oficial do pacote que sustenta a alíquota"));

      const invalidRate = evaluateIssDeepGate({ ...base, municipalRateBps: 199, professionalApprovalConfirmed: true });
      assert.equal(invalidRate.status, "blocked");
      assert.ok(invalidRate.missingFacts.includes("alíquota municipal oficial entre 2% e 5%"));

      const complete = evaluateIssDeepGate({ ...base, professionalApprovalConfirmed: true });
      if (profile.technicalReview.rateReferenceStatus === "pending_exact_table") {
        assert.equal(complete.status, "blocked");
        assert.ok(complete.missingFacts.includes("tabela municipal exata de alíquotas localizada e versionada"));
      } else {
        assert.equal(complete.status, "ready_for_deterministic_calculation");
      }
    });
  }
});

test("all ISS deep references are unique official HTTPS sources with a check date", () => {
  assert.equal(new Set(issDeepSources.map((item) => item.code)).size, issDeepSources.length);
  assert.equal(new Set(issDeepSources.map((item) => item.url)).size, issDeepSources.length);
  assert.ok(issDeepSources.every((item) => item.url.startsWith("https://")));
  assert.ok(issDeepSources.every((item) => item.publisher.length >= 8));
  assert.ok(issDeepSources.every((item) => item.checkedAt === "2026-07-18"));
});

test("deep ISS gate blocks unknown cities and incomplete municipal facts", () => {
  const unknown = evaluateIssDeepGate({ ibgeCode: "9999999" });
  assert.equal(unknown.status, "blocked");
  const incomplete = evaluateIssDeepGate({ ibgeCode: "3550308", lc116Item: "17.01" });
  assert.equal(incomplete.status, "blocked");
  assert.ok(incomplete.missingFacts.includes("código municipal do serviço"));
  assert.ok(incomplete.missingFacts.includes("alíquota municipal oficial entre 2% e 5%"));
  assert.ok(incomplete.missingFacts.includes("aprovação profissional da regra e da vigência"));
});

test("deep ISS gate only releases the deterministic calculator with exact evidence and approval", () => {
  const result = evaluateIssDeepGate({
    ibgeCode: "3550308",
    lc116Item: "17.01",
    municipalServiceCode: "03115",
    operationDate: "2026-07-18",
    municipalRateBps: 500,
    rateSourceCode: "ISS-SP-TABELA",
    rateEvidenceReference: "linha 03115 da tabela oficial",
    placeConfirmed: true,
    withholdingConfirmed: true,
    professionalApprovalConfirmed: true,
  });
  assert.equal(result.status, "ready_for_deterministic_calculation");
  assert.equal(result.rateBps, 500);
  assert.equal(result.profile.ibgeCode, "3550308");
});

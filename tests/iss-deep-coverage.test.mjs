import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateIssDeepGate,
  issDeepCityProfiles,
  issDeepMetrics,
  issDeepSources,
  sourcesForIssDeepProfile,
} from "../domain/iss-deep-coverage.ts";

test("V52 structures exactly 15 deep ISS municipalities without homologating them", () => {
  assert.equal(issDeepCityProfiles.length, 15);
  assert.equal(new Set(issDeepCityProfiles.map((item) => item.ibgeCode)).size, 15);
  assert.ok(issDeepCityProfiles.every((item) => item.stage === "structured"));
  assert.ok(issDeepCityProfiles.every((item) => item.supportStatus === "partial"));
  assert.ok(issDeepCityProfiles.every((item) => item.sourceCodes.length >= 1));
  assert.ok(issDeepCityProfiles.every((item) => sourcesForIssDeepProfile(item).length === item.sourceCodes.length));
  assert.equal(issDeepMetrics.structuredCities, 15);
  assert.equal(issDeepMetrics.testedCities, 0);
  assert.equal(issDeepMetrics.professionallyApprovedCities, 0);
  assert.equal(issDeepMetrics.automaticHomologation, false);
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

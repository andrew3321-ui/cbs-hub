import assert from "node:assert/strict";
import test from "node:test";
import {
  ISS_DEEP_EXPANSION_CHECKED_AT,
  hashIssDeepExpansion,
  issDeepExpansionByIbge,
  issDeepExpansionCities,
  issDeepExpansionSources,
  validateIssDeepExpansion,
} from "../domain/iss-deep-expansion.ts";
import {
  calculateIssDeep,
  resolveIssDeepServiceCoverage,
} from "../domain/iss-deep-coverage.ts";

test("V79 ranks and structures the second batch of 25 economically relevant municipalities", () => {
  assert.deepEqual(issDeepExpansionCities.map((item) => item.rank), Array.from({ length: 25 }, (_, index) => index + 26));
  assert.equal(new Set(issDeepExpansionCities.map((item) => item.ibgeCode)).size, 25);
  assert.equal(new Set(issDeepExpansionCities.map((item) => `${item.city}/${item.uf}`)).size, 25);
  assert.ok(issDeepExpansionCities.every((item) => item.stage === "structured_partial"));
  assert.ok(issDeepExpansionCities.every((item) => item.priorityServiceItems.length >= 3));
  assert.ok(issDeepExpansionCities.every((item) => item.rankingBasis.length >= 25));
});

test("every expansion municipality has an official source, validity metadata and transparent blockers", () => {
  const sourceCodes = new Set(issDeepExpansionSources.map((item) => item.code));
  assert.equal(issDeepExpansionSources.length, 25);
  assert.equal(new Set(issDeepExpansionSources.map((item) => item.url)).size, 25);
  assert.ok(issDeepExpansionSources.every((item) => item.url.startsWith("https://")));
  assert.ok(issDeepExpansionSources.every((item) => item.publisher.length >= 8 && item.legalReference.length >= 12));
  for (const item of issDeepExpansionCities) {
    assert.equal(item.checkedAt, ISS_DEEP_EXPANSION_CHECKED_AT);
    assert.equal(item.effectiveFrom, null);
    assert.equal(item.effectiveTo, null);
    assert.equal(item.calculationSupported, false);
    assert.ok(item.sourceCodes.every((code) => sourceCodes.has(code)));
    assert.ok(item.blockers.includes("código municipal exato do serviço"));
    assert.ok(item.blockers.includes("alíquota municipal versionada para o serviço"));
    assert.ok(item.blockers.includes("vigência exata da regra de alíquota"));
    assert.ok(item.blockers.includes("hipótese de retenção e responsável por tipo de tomador"));
  }
});

test("positive catalog lookup succeeds while missing classifier, exception and stale evidence fail closed", () => {
  const niteroi = issDeepExpansionByIbge.get("3303302");
  assert.ok(niteroi);
  const mapped = resolveIssDeepServiceCoverage(niteroi.ibgeCode, "17.01");
  assert.equal(mapped.coverageStatus, "partial");
  assert.equal(mapped.profile.city, "Niterói");
  assert.equal(mapped.service.calculationSupported, false);
  assert.ok(mapped.blockers.includes("código municipal exato do serviço"));

  const partialInput = {
    ibgeCode: niteroi.ibgeCode,
    lc116Item: "17.01",
    municipalServiceCode: "",
    operationDate: ISS_DEEP_EXPANSION_CHECKED_AT,
    taxableBaseCents: 100_000,
    providerEstablishmentIbgeCode: niteroi.ibgeCode,
    recipientMunicipalityIbgeCode: "3550308",
    recipientType: "private_legal_entity",
    providerTaxRegime: "normal",
    exportStatus: "domestic_result",
    professionalSociety: false,
    specialRegime: false,
    benefitApplied: false,
    incidenceMunicipalityIbgeCode: niteroi.ibgeCode,
    withholdingResponsibility: "provider",
  };
  const missingClassifier = calculateIssDeep(partialInput);
  assert.equal(missingClassifier.status, "blocked");
  assert.equal(missingClassifier.calculation, null);

  const exception = calculateIssDeep({
    ...partialInput,
    municipalServiceCode: "17.01",
    specialRegime: true,
  });
  assert.equal(exception.status, "blocked");
  assert.equal(exception.calculation, null);

  const preCatalogDate = calculateIssDeep({
    ...partialInput,
    municipalServiceCode: "17.01",
    operationDate: "2020-01-01",
  });
  assert.equal(preCatalogDate.status, "blocked");
  assert.equal(preCatalogDate.calculation, null);
});

test("expansion validation and evidence hash are deterministic", async () => {
  assert.deepEqual(validateIssDeepExpansion(), { passed: true, errors: [] });
  const first = await hashIssDeepExpansion();
  const second = await hashIssDeepExpansion();
  assert.match(first, /^[a-f0-9]{64}$/);
  assert.equal(first, second);
});

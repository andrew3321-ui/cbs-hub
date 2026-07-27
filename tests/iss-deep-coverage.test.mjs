import assert from "node:assert/strict";
import test from "node:test";
import {
  ISS_DEEP_CHECKED_AT,
  buildIssDeepTechnicalEvidence,
  calculateIssDeep,
  evaluateIssDeepGate,
  issDeepCityProfiles,
  issDeepMetrics,
  issDeepServiceCoverage,
  issDeepSources,
  resolveIssDeepServiceCoverage,
  sourcesForIssDeepProfile,
  sourcesForIssServiceCoverage,
} from "../domain/iss-deep-coverage.ts";

test("V72 structures the 25 priority ISS municipalities without claiming professional homologation", () => {
  assert.equal(issDeepCityProfiles.length, 25);
  assert.equal(new Set(issDeepCityProfiles.map((item) => item.ibgeCode)).size, 25);
  assert.ok(issDeepCityProfiles.every((item) => item.stage === "structured"));
  assert.ok(issDeepCityProfiles.every((item) => item.supportStatus === "partial"));
  assert.ok(issDeepCityProfiles.every((item) => item.sourceCodes.length >= 1));
  assert.ok(issDeepCityProfiles.every((item) => sourcesForIssDeepProfile(item).length === item.sourceCodes.length));
  assert.ok(issDeepCityProfiles.every((item) => item.serviceCoverageCodes.length >= 1));
  assert.ok(issDeepCityProfiles.every((item) =>
    item.specialTreatments.export.status === "separate_analysis_required"
    && item.specialTreatments.professionalSociety.status === "separate_analysis_required"
    && item.specialTreatments.specialRegime.status === "separate_analysis_required"
  ));
  assert.equal(issDeepMetrics.structuredCities, 25);
  assert.equal(issDeepMetrics.sourceCatalogReviewedCities, 25);
  assert.equal(issDeepMetrics.technicalGateValidatedCities, 25);
  assert.equal(issDeepMetrics.rateReferenceLocatedCities, 22);
  assert.equal(issDeepMetrics.testedCities, 25);
  assert.equal(issDeepMetrics.serviceCoverageRows, 25);
  assert.equal(issDeepMetrics.supportedServiceRules, 3);
  assert.equal(issDeepMetrics.partialServiceRules, 22);
  assert.equal(issDeepMetrics.professionallyApprovedCities, 0);
  assert.equal(issDeepMetrics.automaticHomologation, false);
});

test("technical review produces one unique SHA-256 evidence record per city", async () => {
  const evidence = await buildIssDeepTechnicalEvidence();
  assert.equal(evidence.length, 25);
  assert.equal(new Set(evidence.map((item) => item.evidenceHash)).size, 25);
  assert.ok(evidence.every((item) => /^[a-f0-9]{64}$/.test(item.evidenceHash)));
  assert.ok(evidence.every((item) => item.status === "passed"));
  assert.ok(evidence.every((item) => item.passedChecks.length === 8));
  assert.ok(evidence.every((item) => item.professionalReview === "not_claimed" && item.taxHomologation === "not_claimed"));
});

test("every priority municipality exposes an explicit service status and fail-closed mapping", () => {
  for (const profile of issDeepCityProfiles) {
    const service = issDeepServiceCoverage.find((item) => item.ibgeCode === profile.ibgeCode);
    assert.ok(service, `${profile.city}/${profile.uf} has service coverage`);
    assert.ok(["supported", "partial", "not_supported"].includes(service.coverageStatus));
    assert.equal(sourcesForIssServiceCoverage(service).length, service.sourceCodes.length);
    assert.equal(service.audit.sourceLinkStatus, "verified_at_least_one_official_source");
    assert.ok(service.audit.verifiedSourceCodes.length >= 1);
    assert.ok(service.audit.conclusion.length >= 40);
    const resolved = resolveIssDeepServiceCoverage(profile.ibgeCode, service.lc116Item, service.municipalServiceCode);
    assert.equal(resolved.coverageStatus, service.coverageStatus);
    if (service.coverageStatus === "partial") {
      assert.equal(service.rate.bps, null);
      assert.equal(service.calculationSupported, false);
      assert.equal(service.audit.municipalClassifierStatus, "pending_exact_classifier");
      assert.equal(service.audit.rateEvidenceStatus, "pending_exact_municipal_table");
      assert.equal(service.audit.effectiveRuleStatus, "pending_exact_effective_rule");
      assert.equal(service.audit.withholdingResponsibilityStatus, "requires_operation_facts");
      assert.ok(service.blockers.includes("vigência municipal exata"));
      assert.ok(service.blockers.length >= 5);
    } else {
      assert.equal(service.audit.municipalClassifierStatus, "exact");
      assert.equal(service.audit.rateEvidenceStatus, "exact_municipal_rule");
      assert.equal(service.audit.effectiveRuleStatus, "exact");
      assert.equal(service.audit.withholdingResponsibilityStatus, "exact");
    }
  }
});

test("all deep ISS references are unique official HTTPS sources with legal reference and check date", () => {
  assert.equal(new Set(issDeepSources.map((item) => item.code)).size, issDeepSources.length);
  assert.equal(new Set(issDeepSources.map((item) => item.url)).size, issDeepSources.length);
  assert.ok(issDeepSources.every((item) => item.url.startsWith("https://")));
  assert.ok(issDeepSources.every((item) => item.publisher.length >= 8));
  assert.ok(issDeepSources.every((item) => item.legalReference.length >= 8));
  assert.ok(issDeepSources.every((item) => item.checkedAt === ISS_DEEP_CHECKED_AT));
  assert.ok(issDeepSources.every((item) => item.linkAudit.auditedAt === ISS_DEEP_CHECKED_AT));
  assert.ok(issDeepSources.every((item) => ["verified_reachable", "official_server_recheck_required"].includes(item.linkAudit.status)));
});

test("all 25 municipal service dossiers satisfy the auditable acceptance structure", () => {
  for (const service of issDeepServiceCoverage) {
    assert.match(service.lc116Item, /^\d{1,2}\.\d{2}$/);
    assert.ok(service.placeOfIncidence.conclusion.length >= 30);
    assert.ok(service.withholding.conclusion.length >= 30);
    assert.ok(service.exceptions.length >= 1);
    assert.ok(service.benefits.length >= 1);
    assert.match(service.version, /\S{8,}/);
    assert.equal(service.checkedAt, ISS_DEEP_CHECKED_AT);
    assert.ok(service.sourceCodes.length >= 1);
    assert.ok(service.audit.verifiedSourceCodes.every((code) => service.sourceCodes.includes(code)));
    if (service.calculationSupported) {
      assert.ok(service.municipalServiceCode);
      assert.ok(Number.isInteger(service.rate.bps));
      assert.match(service.effectiveFrom, /^\d{4}-\d{2}-\d{2}$/);
      assert.ok(service.exactReferences.length >= 2);
      assert.deepEqual(service.blockers, []);
    } else {
      assert.equal(service.municipalServiceCode, null);
      assert.equal(service.rate.bps, null);
      assert.equal(service.effectiveFrom, null);
      assert.equal(service.coverageStatus, "partial");
      assert.ok(service.blockers.includes("código municipal exato do serviço"));
      assert.ok(service.blockers.includes("alíquota municipal versionada"));
      assert.ok(service.blockers.includes("hipótese de retenção e responsável"));
    }
  }
});

test("deep ISS gate blocks unknown cities, partial services and user supplied rates outside the catalog", () => {
  const unknown = evaluateIssDeepGate({ ibgeCode: "9999999" });
  assert.equal(unknown.status, "blocked");

  const partial = evaluateIssDeepGate({
    ibgeCode: "3304557",
    lc116Item: "17.01",
    municipalServiceCode: "17.01",
    operationDate: ISS_DEEP_CHECKED_AT,
    municipalRateBps: 500,
    rateSourceCode: "ISS-RJ-ALIQUOTAS",
    rateEvidenceReference: "user supplied reference",
  });
  assert.equal(partial.status, "blocked");
  assert.ok(partial.missingFacts.includes("código municipal exato do serviço"));

  const wrongRate = evaluateIssDeepGate({
    ibgeCode: "3550308",
    lc116Item: "17.01",
    municipalServiceCode: "03115",
    operationDate: ISS_DEEP_CHECKED_AT,
    municipalRateBps: 200,
    rateSourceCode: "ISS-SP-TABELA",
    rateEvidenceReference: "Anexo 1, linha 03115",
    providerEstablishmentIbgeCode: "3550308",
    recipientMunicipalityIbgeCode: "3304557",
    placeConfirmed: true,
    withholdingConfirmed: true,
    withholdingResponsibility: "provider",
    providerTaxRegime: "normal",
    exportStatus: "domestic_result",
    professionalSociety: false,
    specialRegime: false,
    benefitApplied: false,
  });
  assert.equal(wrongRate.status, "blocked");
  assert.ok(wrongRate.missingFacts.includes("alíquota idêntica à regra municipal versionada"));
});

test("deep ISS gate releases only an exact versioned municipal scenario, without pretending professional approval", () => {
  const result = evaluateIssDeepGate({
    ibgeCode: "3550308",
    lc116Item: "17.01",
    municipalServiceCode: "03115",
    operationDate: ISS_DEEP_CHECKED_AT,
    municipalRateBps: 500,
    rateSourceCode: "ISS-SP-TABELA",
    rateEvidenceReference: "Anexo 1, linha 03115",
    providerEstablishmentIbgeCode: "3550308",
    recipientMunicipalityIbgeCode: "3304557",
    placeConfirmed: true,
    withholdingConfirmed: true,
    withholdingResponsibility: "provider",
    providerTaxRegime: "normal",
    exportStatus: "domestic_result",
    professionalSociety: false,
    specialRegime: false,
    benefitApplied: false,
  });
  assert.equal(result.status, "ready_for_deterministic_calculation");
  assert.equal(result.rateBps, 500);
  assert.equal(result.profile.ibgeCode, "3550308");
  assert.equal(result.service.code, "ISS-SP-17.01-03115-PJ-STANDARD");
});

const exactCalculation = {
  ibgeCode: "3550308",
  lc116Item: "17.01",
  municipalServiceCode: "03115",
  operationDate: ISS_DEEP_CHECKED_AT,
  taxableBaseCents: 100_000,
  providerEstablishmentIbgeCode: "3550308",
  recipientMunicipalityIbgeCode: "3304557",
  recipientType: "private_legal_entity",
  providerTaxRegime: "normal",
  exportStatus: "domestic_result",
  professionalSociety: false,
  specialRegime: false,
  benefitApplied: false,
  incidenceMunicipalityIbgeCode: "3550308",
  withholdingResponsibility: "provider",
};

test("supported ISS calculation returns a reproducible integer-cent memory and official evidence", () => {
  const result = calculateIssDeep(exactCalculation);
  assert.equal(result.status, "calculated");
  assert.equal(result.coverageStatus, "supported");
  assert.equal(result.calculation.taxableBaseCents, 100_000);
  assert.equal(result.calculation.rateBps, 500);
  assert.equal(result.calculation.issCents, 5_000);
  assert.equal(result.calculation.responsibility, "provider");
  assert.equal(result.calculation.steps.length, 4);
  assert.equal(result.sources.length, 3);

  const halfCent = calculateIssDeep({ ...exactCalculation, taxableBaseCents: 10 });
  assert.equal(halfCent.status, "calculated");
  assert.equal(halfCent.calculation.issCents, 1);
});

test("supported rule remains fail-closed for a different establishment, tomador, regime or special treatment", () => {
  for (const changed of [
    { providerEstablishmentIbgeCode: "3304557" },
    { recipientMunicipalityIbgeCode: "3550308" },
    { recipientType: "public_entity" },
    { providerTaxRegime: "simples" },
    { exportStatus: "result_abroad" },
    { professionalSociety: true },
    { specialRegime: true },
    { benefitApplied: true },
    { incidenceMunicipalityIbgeCode: "3304557" },
    { withholdingResponsibility: "recipient" },
  ]) {
    const result = calculateIssDeep({ ...exactCalculation, ...changed });
    assert.equal(result.status, "blocked");
    assert.equal(result.calculation, null);
    assert.ok(result.missingFacts.length >= 1);
  }
});

test("structured but partial municipality never converts the national range into a final calculation", () => {
  const result = calculateIssDeep({
    ...exactCalculation,
    ibgeCode: "3304557",
    providerEstablishmentIbgeCode: "3304557",
    municipalServiceCode: "17.01",
    incidenceMunicipalityIbgeCode: "3304557",
  });
  assert.equal(result.status, "blocked");
  assert.equal(result.coverageStatus, "partial");
  assert.equal(result.calculation, null);
  assert.ok(result.missingFacts.includes("alíquota municipal versionada"));
});

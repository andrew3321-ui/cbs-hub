import assert from "node:assert/strict";
import test from "node:test";
import {
  ISS_DEEP_CHECKED_AT,
  buildIssDeepTechnicalEvidence,
  calculateIssDeep,
  evaluateIssDeepGate,
  issDeepCityProfiles,
  issDeepMetrics,
  issDeepPartialPriorityQueue,
  issDeepServiceCoverage,
  issDeepSources,
  resolveIssDeepServiceCoverage,
  sourcesForIssDeepProfile,
  sourcesForIssServiceCoverage,
} from "../domain/iss-deep-coverage.ts";

test("V75 structures the 25 priority ISS municipalities with sourced exact controlled slices", () => {
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
  assert.equal(issDeepMetrics.rateReferenceLocatedCities, 25);
  assert.equal(issDeepMetrics.testedCities, 25);
  assert.equal(issDeepMetrics.serviceCoverageRows, 25);
  assert.equal(issDeepMetrics.supportedServiceRules, 25);
  assert.equal(issDeepMetrics.partialServiceRules, 0);
  assert.equal(issDeepMetrics.professionallyApprovedCities, 0);
  assert.equal(issDeepMetrics.automaticHomologation, false);
});

test("the 22-city expansion queue preserves the original partial backlog and prioritizes recurring services", () => {
  assert.equal(issDeepPartialPriorityQueue.length, 22);
  assert.deepEqual(issDeepPartialPriorityQueue.map((item) => item.rank), Array.from({ length: 22 }, (_, index) => index + 1));
  assert.equal(new Set(issDeepPartialPriorityQueue.map((item) => item.ibgeCode)).size, 22);
  assert.ok(issDeepPartialPriorityQueue.every((item) => item.originStatus === "partial_at_v72"));
  assert.ok(issDeepPartialPriorityQueue.every((item) => item.priorityServiceItems.length >= 3));
  assert.ok(issDeepPartialPriorityQueue.every((item) => item.sourceCodes.length >= 1));
  assert.ok(issDeepPartialPriorityQueue.every((item) => item.remainingBlockers.length >= 4));
  assert.ok(issDeepPartialPriorityQueue.every((item) => item.currentStatus === "supported_slice_added"));
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
    assert.equal(service.coverageStatus, "supported");
    assert.equal(service.audit.municipalClassifierStatus, "exact");
    assert.equal(service.audit.rateEvidenceStatus, "exact_municipal_rule");
    assert.equal(service.audit.effectiveRuleStatus, "exact");
    assert.equal(service.audit.withholdingResponsibilityStatus, "exact");
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

test("deep ISS gate blocks unknown cities, mismatched municipal codes and user supplied rates outside the catalog", () => {
  const unknown = evaluateIssDeepGate({ ibgeCode: "9999999" });
  assert.equal(unknown.status, "blocked");

  const mismatchedCode = evaluateIssDeepGate({
    ibgeCode: "1501402",
    lc116Item: "17.01",
    municipalServiceCode: "9999",
    operationDate: ISS_DEEP_CHECKED_AT,
    municipalRateBps: 500,
    rateSourceCode: "ISS-BEL-CTM",
    rateEvidenceReference: "user supplied reference",
  });
  assert.equal(mismatchedCode.status, "blocked");
  assert.ok(mismatchedCode.missingFacts.includes("código municipal exato do serviço"));
  assert.ok(mismatchedCode.missingFacts.includes("código municipal idêntico à regra versionada"));

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

test("Distrito Federal and Recife exact slices calculate in cents and reject dates before their versioned rule", () => {
  const df = calculateIssDeep({
    ...exactCalculation,
    ibgeCode: "5300108",
    municipalServiceCode: "17.01",
    providerEstablishmentIbgeCode: "5300108",
    incidenceMunicipalityIbgeCode: "5300108",
  });
  assert.equal(df.status, "calculated");
  assert.equal(df.calculation.issCents, 5_000);
  assert.deepEqual(df.service.exactReferences, [
    "Decreto nº 25.508/2005, arts. 5º, 7º, 8º e 38, II",
    "Anexo I do Decreto nº 25.508/2005, subitem 17.01",
  ]);

  const recife = calculateIssDeep({
    ...exactCalculation,
    ibgeCode: "2611606",
    municipalServiceCode: "17.01",
    providerEstablishmentIbgeCode: "2611606",
    incidenceMunicipalityIbgeCode: "2611606",
  });
  assert.equal(recife.status, "calculated");
  assert.equal(recife.calculation.issCents, 5_000);
  assert.ok(recife.sources.some((source) => source.code === "ISS-REC-L17240"));

  const beforeDfRule = calculateIssDeep({
    ...exactCalculation,
    ibgeCode: "5300108",
    municipalServiceCode: "17.01",
    operationDate: "2005-01-18",
    providerEstablishmentIbgeCode: "5300108",
    incidenceMunicipalityIbgeCode: "5300108",
  });
  assert.equal(beforeDfRule.status, "blocked");
  assert.ok(beforeDfRule.missingFacts.includes("data igual ou posterior a 2005-01-19"));

  const beforeRecifeRule = calculateIssDeep({
    ...exactCalculation,
    ibgeCode: "2611606",
    municipalServiceCode: "17.01",
    operationDate: "2006-07-07",
    providerEstablishmentIbgeCode: "2611606",
    incidenceMunicipalityIbgeCode: "2611606",
  });
  assert.equal(beforeRecifeRule.status, "blocked");
  assert.ok(beforeRecifeRule.missingFacts.includes("data igual ou posterior a 2006-07-08"));
});

test("the twenty V75 municipal consulting slices calculate deterministically and reject pre-version dates", () => {
  const cases = [
    { ibgeCode: "3106200", municipalServiceCode: "1701-0/02-88", rateBps: 500, effectiveFrom: "2016-01-01" },
    { ibgeCode: "2927408", municipalServiceCode: "17.01", rateBps: 500, effectiveFrom: "2026-01-01" },
    { ibgeCode: "2304400", municipalServiceCode: "17.1", rateBps: 500, effectiveFrom: "2026-01-01" },
    { ibgeCode: "1302603", municipalServiceCode: "17.01", rateBps: 500, effectiveFrom: "2026-01-01" },
    { ibgeCode: "4314902", municipalServiceCode: "17.01", rateBps: 500, effectiveFrom: "2024-01-01" },
    { ibgeCode: "5208707", municipalServiceCode: "17.01", rateBps: 500, effectiveFrom: "2022-01-01" },
    { ibgeCode: "3509502", municipalServiceCode: "17.01", rateBps: 500, effectiveFrom: "2006-01-01" },
    { ibgeCode: "2408102", municipalServiceCode: "17.01", rateBps: 500, effectiveFrom: "2003-12-29" },
    { ibgeCode: "3304557", municipalServiceCode: "227315", rateBps: 500, effectiveFrom: "2003-11-28" },
    { ibgeCode: "4106902", municipalServiceCode: "17.01", rateBps: 500, effectiveFrom: "2018-01-01" },
    { ibgeCode: "2507507", municipalServiceCode: "17.01", rateBps: 500, effectiveFrom: "2025-02-12" },
    { ibgeCode: "1501402", municipalServiceCode: "17.01", rateBps: 500, effectiveFrom: "2026-07-02" },
    { ibgeCode: "2111300", municipalServiceCode: "17.01", rateBps: 500, effectiveFrom: "2018-01-01" },
    { ibgeCode: "2704302", municipalServiceCode: "17.01", rateBps: 500, effectiveFrom: "2024-01-18" },
    { ibgeCode: "5002704", municipalServiceCode: "17.01", rateBps: 500, effectiveFrom: "2026-07-01" },
    { ibgeCode: "5103403", municipalServiceCode: "17.01", rateBps: 500, effectiveFrom: "2026-01-12" },
    { ibgeCode: "3548708", municipalServiceCode: "1232", rateBps: 200, effectiveFrom: "2025-07-31" },
    { ibgeCode: "3547809", municipalServiceCode: "17.01", rateBps: 200, effectiveFrom: "2017-09-29" },
    { ibgeCode: "3304904", municipalServiceCode: "17.01", rateBps: 500, effectiveFrom: "2023-12-29" },
    { ibgeCode: "4205407", municipalServiceCode: "17.01", rateBps: 500, effectiveFrom: "2025-10-01" },
  ];

  for (const item of cases) {
    const calculated = calculateIssDeep({
      ...exactCalculation,
      ibgeCode: item.ibgeCode,
      municipalServiceCode: item.municipalServiceCode,
      providerEstablishmentIbgeCode: item.ibgeCode,
      recipientMunicipalityIbgeCode: item.ibgeCode === "3304557" ? "3550308" : "3304557",
      incidenceMunicipalityIbgeCode: item.ibgeCode,
    });
    assert.equal(calculated.status, "calculated", item.ibgeCode);
    assert.equal(calculated.calculation.rateBps, item.rateBps);
    assert.equal(calculated.calculation.issCents, Math.round(100_000 * item.rateBps / 10_000));
    assert.equal(calculated.calculation.responsibility, "provider");
    assert.ok(calculated.sources.length >= 1);
    assert.ok(calculated.service.exactReferences.length >= 2);

    const dayBefore = new Date(`${item.effectiveFrom}T00:00:00.000Z`);
    dayBefore.setUTCDate(dayBefore.getUTCDate() - 1);
    const blocked = calculateIssDeep({
      ...exactCalculation,
      ibgeCode: item.ibgeCode,
      municipalServiceCode: item.municipalServiceCode,
      operationDate: dayBefore.toISOString().slice(0, 10),
      providerEstablishmentIbgeCode: item.ibgeCode,
      recipientMunicipalityIbgeCode: item.ibgeCode === "3304557" ? "3550308" : "3304557",
      incidenceMunicipalityIbgeCode: item.ibgeCode,
    });
    assert.equal(blocked.status, "blocked", item.ibgeCode);
    assert.ok(blocked.missingFacts.includes(`data igual ou posterior a ${item.effectiveFrom}`));
  }
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

test("known municipality with an unmatched municipal code remains fail-closed", () => {
  const result = calculateIssDeep({
    ...exactCalculation,
    ibgeCode: "1501402",
    providerEstablishmentIbgeCode: "1501402",
    municipalServiceCode: "9999",
    incidenceMunicipalityIbgeCode: "1501402",
  });
  assert.equal(result.status, "blocked");
  assert.equal(result.coverageStatus, "partial");
  assert.equal(result.calculation, null);
  assert.ok(result.missingFacts.includes("código municipal exato do serviço"));
  assert.ok(result.missingFacts.includes("código municipal idêntico à regra versionada"));
});

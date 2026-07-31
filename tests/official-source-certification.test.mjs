import assert from "node:assert/strict";
import test from "node:test";

import {
  OFFICIAL_SOURCE_CERTIFICATION_CHECKED_AT,
  hashOfficialSourceCertification,
  officialSourceCertificationMetrics,
  officialSourceAffectedRuleReport,
  officialSourceInventory,
  officialSourceLiveProbeSnapshot,
  officialSourceTechnicalAlternatives,
  probeOfficialSourceInventory,
  validateOfficialSourceCertification,
} from "../domain/official-source-certification.ts";

test("V98 inventories every current fiscal source with jurisdiction and affected rules", () => {
  const validation = validateOfficialSourceCertification();
  const metrics = officialSourceCertificationMetrics();
  assert.equal(validation.passed, true, validation.errors.join(","));
  assert.ok(metrics.total >= 180);
  assert.ok(metrics.taxes >= 6);
  assert.ok(metrics.jurisdictions >= 5);
  assert.ok(metrics.impactedRules >= 15);
  assert.ok(officialSourceInventory.every((item) => item.taxes.length && item.jurisdictions.length && item.impactedRuleCodes.length));
});

test("primary, official index and guidance remain distinct and pending evidence is not inflated", () => {
  const metrics = officialSourceCertificationMetrics();
  assert.ok(metrics.sourceClass.primary > 0);
  assert.ok(metrics.sourceClass.official_index > 0);
  assert.ok(metrics.sourceClass.official_guidance > 0);
  assert.ok(metrics.status.confirmed > 0);
  assert.ok(metrics.status.pending > 0);
  assert.equal(metrics.status.unavailable, 0);
  assert.ok(officialSourceInventory.filter((item) => item.status === "pending").every((item) => item.pendingReasons.length > 0));
  assert.ok(officialSourceInventory.filter((item) => item.status === "confirmed").every((item) => item.pendingReasons.length === 0));
});

test("live recertification publishes honest checked, pending and unavailable counts", () => {
  assert.equal(
    officialSourceLiveProbeSnapshot.checked + officialSourceLiveProbeSnapshot.pending + officialSourceLiveProbeSnapshot.unavailable,
    officialSourceLiveProbeSnapshot.uniqueUrls,
  );
  assert.equal(
    officialSourceLiveProbeSnapshot.checkedDirectly + officialSourceLiveProbeSnapshot.checkedViaOfficialAlternative,
    officialSourceLiveProbeSnapshot.checked,
  );
  assert.ok(officialSourceLiveProbeSnapshot.pending <= 20);
  assert.equal(officialSourceLiveProbeSnapshot.unavailable, 0);
  assert.deepEqual(officialSourceLiveProbeSnapshot.unavailableSourceCodes, []);
  assert.match(officialSourceLiveProbeSnapshot.policy, /404 e 410/);
});

test("official alternatives inventory transport redundancy without pretending to prove the exact act", () => {
  assert.ok(officialSourceTechnicalAlternatives.length >= 58);
  assert.ok(officialSourceTechnicalAlternatives.every((item) => (
    item.originalUrl.startsWith("https://")
    && item.alternativeUrl.startsWith("https://")
    && item.originalUrl !== item.alternativeUrl
    && item.provesExactAct === false
    && item.evidenceScope === "technical_redundancy_only"
  )));
});

test("each affected engine receives transparent source status totals", () => {
  const affectedRules = officialSourceAffectedRuleReport();
  assert.ok(affectedRules.length >= 25);
  assert.ok(affectedRules.every((item) => item.sources === item.confirmed + item.pending + item.unavailable));
  assert.ok(affectedRules.some((item) => item.ruleCode === "ICMS_GENERAL_NATIONAL"));
  assert.ok(affectedRules.some((item) => item.ruleCode === "ISS_DEEP"));
  assert.ok(affectedRules.some((item) => item.ruleCode === "RTC_SECTOR_SCENARIOS"));
});

test("every source has HTTPS identity, issuer, device, query date and certification date", () => {
  assert.ok(officialSourceInventory.every((item) => (
    item.identity === `${item.code}@${item.url}`
    && item.url.startsWith("https://")
    && item.publisher.length > 0
    && item.legalDevice.length > 0
    && item.originalCheckedAt
    && item.recertifiedAt === OFFICIAL_SOURCE_CERTIFICATION_CHECKED_AT
  )));
});

test("probe checks unique URLs and records unavailable sources without promoting them", async () => {
  const sample = [officialSourceInventory[0], officialSourceInventory[1], { ...officialSourceInventory[2], url: officialSourceInventory[0].url }];
  const calls = [];
  const probes = await probeOfficialSourceInventory(async (url) => {
    calls.push(url);
    return { ok: !url.includes("fail"), status: 200 };
  }, sample);
  assert.equal(calls.length, 2);
  assert.equal(probes.length, 2);
  assert.ok(probes.every((item) => item.status === "checked"));
});

test("probe distinguishes permanent absence from transient portal restrictions", async () => {
  const sample = officialSourceInventory.slice(0, 3).map((item, index) => ({
    ...item,
    url: `https://probe-${index}.gov.br/ato`,
  }));
  const probes = await probeOfficialSourceInventory(async (url) => {
    const status = url.includes("probe-0") ? 404 : url.includes("probe-1") ? 503 : 403;
    return { ok: false, status };
  }, sample);
  assert.equal(probes[0].status, "unavailable");
  assert.equal(probes[1].status, "pending");
  assert.equal(probes[2].status, "pending");
});

test("probe retries GET and records an accessible official alternative as transport only", async () => {
  const alternative = officialSourceTechnicalAlternatives[0];
  const sample = officialSourceInventory.filter((item) => item.url === alternative.originalUrl).slice(0, 1);
  const calls = [];
  const probes = await probeOfficialSourceInventory(async (url, init) => {
    calls.push({ url, method: init.method });
    if (url === alternative.alternativeUrl) return { ok: true, status: 200 };
    return { ok: false, status: 503 };
  }, sample);
  assert.deepEqual(calls.map((item) => item.method), ["HEAD", "GET", "GET"]);
  assert.equal(probes[0].status, "checked");
  assert.equal(probes[0].accessPath, "official_alternative");
  assert.equal(probes[0].alternativeUrl, alternative.alternativeUrl);
});

test("source evidence fingerprint is stable and changes with metadata", async () => {
  const first = await hashOfficialSourceCertification();
  const second = await hashOfficialSourceCertification();
  const changed = await hashOfficialSourceCertification(officialSourceInventory.map((item, index) => index ? item : { ...item, legalDevice: `${item.legalDevice} alterado` }));
  assert.equal(first, second);
  assert.notEqual(first, changed);
  assert.match(first, /^[a-f0-9]{64}$/);
});

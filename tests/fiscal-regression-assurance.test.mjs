import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  FISCAL_REGRESSION_REPORT_VERSION,
  buildFiscalRegressionReport,
  fiscalRegressionModulesForRules,
} from "../domain/fiscal-regression-assurance.ts";

const root = new URL("../", import.meta.url);

test("versioned regression report exposes module, rule, evidence and maturity without inventing approval", async () => {
  const report = await buildFiscalRegressionReport();
  assert.equal(report.reportVersion, FISCAL_REGRESSION_REPORT_VERSION);
  assert.equal(report.status, "automatically_verified", JSON.stringify(report.errors));
  assert.equal(report.metrics.modules, 8);
  assert.equal(report.metrics.modulesPassed, report.metrics.modules);
  assert.equal(report.metrics.catalogued, report.metrics.modules);
  assert.equal(report.metrics.structured, report.metrics.modules);
  assert.equal(report.metrics.tested, report.metrics.modules);
  assert.equal(report.metrics.approved, 0);
  assert.ok(report.metrics.deterministicCases >= 900);
  assert.ok(report.metrics.calculatedMemories > 80);
  assert.ok(report.metrics.safelyBlockedCases > 600);
  assert.match(report.fingerprint, /^[0-9a-f]{64}$/);

  for (const moduleItem of report.modules) {
    assert.ok(moduleItem.ruleCodes.length > 0, moduleItem.code);
    assert.ok(moduleItem.ruleVersion.length > 5, moduleItem.code);
    assert.match(moduleItem.fingerprint, /^[0-9a-f]{64}$/, moduleItem.code);
    assert.equal(moduleItem.goldenCases.independentExpectedMemory, true, moduleItem.code);
    assert.ok(moduleItem.goldenCases.officialSourceCodes.length > 0, moduleItem.code);
    assert.equal(moduleItem.arithmetic.moneyUnit, "cent", moduleItem.code);
    assert.equal(moduleItem.arithmetic.rateUnit, "basis_point", moduleItem.code);
    assert.equal(moduleItem.arithmetic.floatingPointTaxOutputAllowed, false, moduleItem.code);
    assert.ok(moduleItem.gates.required.length > 0, moduleItem.code);
    assert.equal(moduleItem.gates.failClosed, true, moduleItem.code);
    assert.equal(moduleItem.gates.releasedWithoutRequiredGates, 0, moduleItem.code);
    assert.deepEqual(moduleItem.maturity, {
      catalogued: true,
      structured: true,
      tested: true,
      approved: false,
      approvalNote: "Nenhuma aprovação profissional pública desta versão foi presumida pelo relatório técnico.",
    });
  }
  assert.deepEqual(
    new Set(report.modules.flatMap((module) => module.testKinds)),
    new Set(["positive", "negative", "boundary", "exception", "validity_change"]),
  );
  assert.equal((await buildFiscalRegressionReport()).fingerprint, report.fingerprint);
});

test("rule changes reexecute only mapped modules and unknown rules fail closed", async () => {
  assert.deepEqual(
    fiscalRegressionModulesForRules(["COLD_BEVERAGES_SP_DESTINATION"]),
    ["COLD_BEVERAGES_PRIORITY", "COLD_BEVERAGES_SP_DESTINATION"],
  );
  const beverage = await buildFiscalRegressionReport(["COLD_BEVERAGES_SP_DESTINATION"]);
  assert.equal(beverage.status, "automatically_verified");
  assert.deepEqual(beverage.modules.map((module) => module.code), [
    "COLD_BEVERAGES_PRIORITY",
    "COLD_BEVERAGES_SP_DESTINATION",
  ]);

  const unknown = await buildFiscalRegressionReport(["UNMAPPED-RULE"]);
  assert.equal(unknown.status, "blocked");
  assert.deepEqual(unknown.unmappedRuleCodes, ["UNMAPPED-RULE"]);
  assert.deepEqual(unknown.modules, []);
  assert.deepEqual(unknown.errors, ["unmapped_rule:UNMAPPED-RULE"]);
});

test("build and normative monitor are wired to block regressions and audit affected reexecution", async () => {
  const [packageText, buildGuard, governance, publicCoverage, lab] = await Promise.all([
    readFile(new URL("package.json", root), "utf8"),
    readFile(new URL("scripts/verify-fiscal-build.mjs", root), "utf8"),
    readFile(new URL("app/normative-governance-service.ts", root), "utf8"),
    readFile(new URL("app/api/public/coverage/route.ts", root), "utf8"),
    readFile(new URL("domain/deterministic-tax-lab.ts", root), "utf8"),
  ]);
  assert.match(packageText, /"prebuild": "node --experimental-strip-types scripts\/verify-fiscal-build\.mjs"/);
  assert.match(buildGuard, /scenario_rate_tamper_was_accepted/);
  assert.match(buildGuard, /scenario_cent_tamper_was_accepted/);
  assert.match(buildGuard, /approval_hash_tamper_was_accepted/);
  assert.match(buildGuard, /mandatory_gate_regression/);
  assert.match(governance, /fiscal_regression\.affected_rules_reexecuted/);
  assert.match(governance, /buildFiscalRegressionReport\(capture\.source\.impactedRuleCodes\)/);
  assert.match(publicCoverage, /regressionReport/);
  assert.doesNotMatch(lab, /effectiveRatePpm|factorRPpm/);
});

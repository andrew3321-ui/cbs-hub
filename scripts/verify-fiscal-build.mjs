import {
  buildFiscalRegressionReport,
} from "../domain/fiscal-regression-assurance.ts";
import { writeFile } from "node:fs/promises";
import { NATIONAL_COVERAGE_VERSION } from "../domain/national-tax-coverage.ts";
import {
  SCENARIO_SIGNATURE_VERSION,
  signScenarioRecordWithSecret,
  verifyScenarioRecordWithSecret,
} from "../app/scenario-signing-core.ts";
import {
  RESPONSIBLE_REVIEW_DECLARATION_VERSION,
  SCENARIO_APPROVAL_SIGNATURE_VERSION,
  signScenarioApprovalWithSecret,
  verifyScenarioApprovalWithSecret,
} from "../app/scenario-approval-core.ts";

function requireBuildInvariant(condition, code) {
  if (!condition) throw new Error(`fiscal_build_blocked:${code}`);
}

async function verifySignatureTamperResistance() {
  const testSecret = "build-only-deterministic-signature-key-with-at-least-32-characters";
  const scenario = {
    ownerUserId: 7,
    companyId: 11,
    name: "Build assurance fixture",
    revenueCents: 10_000_000,
    currentRateBps: 865,
    newRateBps: 1_419,
    costRateBps: 7_500,
    fixedCostsCents: 500_000,
    volumeLossBps: 0,
    priceAdjustmentBps: 550,
    targetYear: 2027,
    rateSource: "accountant",
    sourceNote: "Fixture sintética exclusiva do build.",
    snapshotJson: JSON.stringify({ projectedTaxCents: 1_419_000, calculationVersion: "build-fixture.v1" }),
    calculationVersion: "build-fixture.v1",
    methodologyVersion: "build-assurance.v1",
    calculatedAt: "2026-07-26T12:00:00.000Z",
    supersedesScenarioId: null,
  };
  const scenarioSignature = await signScenarioRecordWithSecret(scenario, testSecret);
  requireBuildInvariant(
    await verifyScenarioRecordWithSecret(scenario, scenarioSignature, SCENARIO_SIGNATURE_VERSION, testSecret),
    "scenario_signature_verification_failed",
  );
  requireBuildInvariant(
    !(await verifyScenarioRecordWithSecret(
      { ...scenario, newRateBps: scenario.newRateBps + 1 },
      scenarioSignature,
      SCENARIO_SIGNATURE_VERSION,
      testSecret,
    )),
    "scenario_rate_tamper_was_accepted",
  );
  requireBuildInvariant(
    !(await verifyScenarioRecordWithSecret(
      { ...scenario, revenueCents: scenario.revenueCents + 1 },
      scenarioSignature,
      SCENARIO_SIGNATURE_VERSION,
      testSecret,
    )),
    "scenario_cent_tamper_was_accepted",
  );

  const approval = {
    scenarioId: 31,
    companyId: scenario.companyId,
    ownerUserId: scenario.ownerUserId,
    reviewerUserId: 7,
    reviewerName: "Build Reviewer",
    reviewerEmail: "build-reviewer@example.invalid",
    professionalRegistration: "BUILD-FIXTURE",
    assuranceLevel: "responsible_self_review",
    credentialVerification: "self_declared",
    decision: "approved",
    declarationVersion: RESPONSIBLE_REVIEW_DECLARATION_VERSION,
    scenarioInputHash: "a".repeat(64),
    scenarioRecordSignature: scenarioSignature,
    decisionNote: "Fixture sintética de resistência a adulteração.",
    decidedAt: "2026-07-26T12:05:00.000Z",
  };
  const approvalSignature = await signScenarioApprovalWithSecret(approval, testSecret);
  requireBuildInvariant(
    await verifyScenarioApprovalWithSecret(
      approval,
      approvalSignature,
      SCENARIO_APPROVAL_SIGNATURE_VERSION,
      testSecret,
    ),
    "approval_signature_verification_failed",
  );
  requireBuildInvariant(
    !(await verifyScenarioApprovalWithSecret(
      { ...approval, scenarioInputHash: "b".repeat(64) },
      approvalSignature,
      SCENARIO_APPROVAL_SIGNATURE_VERSION,
      testSecret,
    )),
    "approval_hash_tamper_was_accepted",
  );
}

const report = await buildFiscalRegressionReport();
requireBuildInvariant(report.status === "automatically_verified", report.errors.join(",") || "regression_report_failed");
requireBuildInvariant(report.metrics.modules > 0, "empty_regression_manifest");
requireBuildInvariant(report.metrics.modulesPassed === report.metrics.modules, "module_regression_failed");
requireBuildInvariant(report.metrics.tested === report.metrics.modules, "untested_module_in_manifest");
requireBuildInvariant(report.metrics.targetReached && report.metrics.remainingToTarget === 0, "regression_case_target_not_reached");
requireBuildInvariant(
  report.modules.every((module) => module.gates.failClosed && module.gates.releasedWithoutRequiredGates === 0),
  "mandatory_gate_regression",
);
requireBuildInvariant(
  new Set(report.modules.flatMap((module) => module.testKinds)).size === 5,
  "required_test_kind_missing",
);
await verifySignatureTamperResistance();

const showcaseSummary = {
  reportVersion: report.reportVersion,
  coverageVersion: NATIONAL_COVERAGE_VERSION,
  moduleCount: report.metrics.modules,
  deterministicCases: report.metrics.deterministicCases,
  calculatedMemories: report.metrics.calculatedMemories,
  safelyBlockedCases: report.metrics.safelyBlockedCases,
  fingerprint: report.fingerprint,
};
await writeFile(
  new URL("../app/fiscal-showcase.generated.ts", import.meta.url),
  `// Gerado por scripts/verify-fiscal-build.mjs. O valor versionado serve como fallback no desenvolvimento.\nexport const fiscalShowcaseSummary = ${JSON.stringify(showcaseSummary, null, 2)} as const;\n`,
  "utf8",
);

process.stdout.write(
  `Fiscal build assurance passed: ${report.metrics.modules} modules, ${report.metrics.deterministicCases} deterministic cases, #${report.fingerprint.slice(0, 12)}\n`,
);

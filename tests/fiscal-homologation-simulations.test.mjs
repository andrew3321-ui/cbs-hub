import assert from "node:assert/strict";
import test from "node:test";

import {
  FISCAL_SIMULATION_REFERENCE_DATE,
  fiscalSimulationBaseHash,
  fiscalSimulationCases,
  runFiscalSimulationSuite,
} from "../domain/fiscal-homologation-simulations.ts";
import {
  createFiscalLabHomologationSnapshot,
  expectedOutcomeFromHomologation,
  FISCAL_HOMOLOGATION_LAB_SCHEMA_VERSION,
  hashFiscalHomologationText,
  parseFiscalHomologationSnapshot,
} from "../domain/fiscal-homologation.ts";

test("V56 reproduces every realistic synthetic case against explicit expected outputs", () => {
  const runs = runFiscalSimulationSuite();
  assert.equal(runs.length, 40);
  assert.equal(runs.every((run) => run.passed), true, JSON.stringify(runs.filter((run) => !run.passed).map((run) => ({ code: run.case.code, failures: run.checks.filter((check) => !check.passed) }))));
  assert.equal(runs.filter((run) => run.case.kind === "expected_block").length, 12);
  assert.equal(runs.filter((run) => run.case.kind === "calculated_reference").length, 28);
});

test("simulation catalog has no taxpayer identifiers and every case carries official evidence", () => {
  const serialized = JSON.stringify(fiscalSimulationCases);
  assert.doesNotMatch(serialized, /\b\d{2}\.?\d{3}\.?\d{3}[\/-]?\d{2}\b/);
  assert.doesNotMatch(serialized, /\b\d{2}\.?\d{3}\.?\d{3}\/\d{4}-?\d{2}\b/);
  for (const run of runFiscalSimulationSuite()) {
    assert.ok(run.sourceCodes.length > 0, run.case.code);
    assert.ok([...run.output.sources, ...(run.case.additionalSources ?? [])].every((source) => source.url.startsWith("https://")), run.case.code);
  }
});

test("lab case freezes into a tamper-evident professional homologation candidate", async () => {
  const run = runFiscalSimulationSuite()[0];
  const baseHash = await fiscalSimulationBaseHash();
  const snapshot = createFiscalLabHomologationSnapshot(run.case, run.output, baseHash, FISCAL_SIMULATION_REFERENCE_DATE);
  assert.equal(snapshot.schemaVersion, FISCAL_HOMOLOGATION_LAB_SCHEMA_VERSION);
  assert.equal(snapshot.simulation.synthetic, true);
  assert.equal(parseFiscalHomologationSnapshot(JSON.stringify(snapshot))?.topicCode, "LAB-SIMPLES_ANNEX_I");
  const expected = expectedOutcomeFromHomologation(snapshot);
  assert.equal(expected.findings.some((finding) => finding.code === "das_reference" && finding.value.includes("400.00")), true);
  const originalHash = await hashFiscalHomologationText(JSON.stringify(snapshot));
  const alteredHash = await hashFiscalHomologationText(JSON.stringify({ ...snapshot, facts: { ...snapshot.facts, monthlySegregatedRevenueCents: 9_000_000 } }));
  assert.notEqual(originalHash, alteredHash);
});

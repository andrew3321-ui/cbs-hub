import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  allowedFormulaVocabulary,
  assessRuleTransition,
  buildAtomicRollbackPlan,
  buildRtc2026DeclarativeCanary,
  hashDeclarativeRule,
  runRtc2026DeclarativeCanary,
  validateDeclarativeRule,
  validateDeclarativeTimeline,
} from "../domain/declarative-rule-governance.ts";
import { capturedLegalTextCanPromote } from "../app/declarative-rule-governance-service.ts";

test("vocabulário declarativo é fechado e o canário RTC possui identidade fiscal completa", async () => {
  const version = await buildRtc2026DeclarativeCanary();
  const validation = validateDeclarativeRule(version.definition, version.contentHash);
  assert.equal(validation.passed, true, validation.errors.join("\n"));
  assert.deepEqual(allowedFormulaVocabulary, [
    "basis_times_rate_bps",
    "sum_components",
    "subtract_floor_zero",
    "conditional_treatment",
    "literal_bps",
    "never_calculate_net_payable",
  ]);
  assert.deepEqual(version.definition.jurisdiction, { country: "BR", state: null, cityIbgeCode: null });
  assert.ok(version.definition.selector.operationCodes.length > 0);
  assert.ok(version.definition.selector.conditions.length > 0);
  assert.ok(version.definition.tax.includes("CBS"));
  assert.ok(version.definition.tax.includes("IBS"));
  assert.equal(await hashDeclarativeRule(version.definition), version.contentHash);
  assert.equal(version.definition.sources.every((source) => source.url.startsWith("https://") && source.snapshotHash.length === 64), true);
});

test("fonte não oficial, fórmula fora da lista e mudança de schema bloqueiam validação", async () => {
  const version = await buildRtc2026DeclarativeCanary();
  const invalid = structuredClone(version.definition);
  invalid.schemaVersion = "unknown";
  invalid.formulas = ["eval_legal_text"];
  invalid.sources[0].url = "https://example.com/regra";
  const validation = validateDeclarativeRule(invalid);
  assert.equal(validation.passed, false);
  assert.ok(validation.errors.includes("schema_version_changed"));
  assert.ok(validation.errors.includes("formula_outside_allowlist"));
  assert.ok(validation.errors.some((error) => error.startsWith("invalid_official_source")));
});

test("linha do tempo detecta lacuna, sobreposição e predecessor divergente", async () => {
  const first = await buildRtc2026DeclarativeCanary();
  first.definition.continuousTimeline = true;
  first.definition.effectiveTo = "2026-06-30";
  first.contentHash = await hashDeclarativeRule(first.definition);
  const second = structuredClone(first);
  second.definition.version = "2.0.0";
  second.definition.effectiveFrom = "2026-07-02";
  second.definition.effectiveTo = "2026-12-31";
  second.definition.predecessorHash = "0".repeat(64);
  second.contentHash = await hashDeclarativeRule(second.definition);
  const gap = validateDeclarativeTimeline([first, second]);
  assert.equal(gap.passed, false);
  assert.ok(gap.errors.some((error) => error.startsWith("temporal_gap")));
  assert.ok(gap.errors.some((error) => error.startsWith("predecessor_mismatch")));

  second.definition.effectiveFrom = "2026-06-30";
  second.definition.predecessorHash = first.contentHash;
  second.contentHash = await hashDeclarativeRule(second.definition);
  const overlap = validateDeclarativeTimeline([first, second]);
  assert.equal(overlap.passed, false);
  assert.ok(overlap.errors.some((error) => error.startsWith("temporal_overlap")));
});

test("promoção segue draft, validação automática, canário, ativo e revogado", () => {
  const base = { validationPassed: true, timelinePassed: true, checksumMatches: true, regressionStatus: "passed" };
  assert.equal(assessRuleTransition({ ...base, from: "draft", to: "automatically_validated" }).allowed, true);
  assert.equal(assessRuleTransition({ ...base, from: "automatically_validated", to: "canary" }).allowed, true);
  assert.equal(assessRuleTransition({ ...base, from: "canary", to: "active" }).allowed, true);
  assert.equal(assessRuleTransition({ ...base, from: "active", to: "revoked" }).allowed, true);
  assert.equal(assessRuleTransition({ ...base, from: "draft", to: "active" }).allowed, false);
  assert.equal(assessRuleTransition({ ...base, from: "canary", to: "active", regressionStatus: "not_run" }).allowed, false);
});

test("canário reproduz todos os resultados existentes sem trocar o runtime", async () => {
  const result = await runRtc2026DeclarativeCanary();
  assert.equal(result.passed, true, JSON.stringify(result, null, 2));
  assert.equal(result.checksumMatches, true);
  assert.ok(result.cases.length >= 3);
  assert.equal(result.cases.every((referenceCase) => referenceCase.passed), true);
  assert.match(result.safety, /sem ativar fórmula nova/i);
});

test("rollback produz duas operações atômicas apenas para versão anteriormente ativa", async () => {
  const active = await buildRtc2026DeclarativeCanary();
  active.status = "active";
  const target = structuredClone(active);
  target.status = "revoked";
  target.definition.version = "0.9.0";
  target.contentHash = "a".repeat(64);
  const plan = buildAtomicRollbackPlan(active, target);
  assert.equal(plan.allowed, true);
  assert.deepEqual(plan.operations.map((operation) => operation.to), ["revoked", "active"]);
  target.status = "draft";
  assert.equal(buildAtomicRollbackPlan(active, target).allowed, false);
});

test("persistência e API administrativa exigem regressão e não promovem texto legal", async () => {
  const [schema, service, route] = await Promise.all([
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/declarative-rule-governance-service.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/declarative-rules/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(schema, /declarative_rule_versions/);
  assert.match(schema, /declarative_rule_events/);
  assert.match(service, /buildFiscalRegressionReport\(\)/);
  assert.match(service, /db\.batch\(\[/);
  assert.match(service, /runtimeChanged: false/);
  assert.match(route, /getPlatformAdminUser/);
  assert.equal(capturedLegalTextCanPromote(), false);
});

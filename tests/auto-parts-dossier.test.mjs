import assert from "node:assert/strict";
import test from "node:test";
import { createAutoPartsDossierSnapshot, isAutoPartsDossierSnapshot } from "../domain/auto-parts-dossier.ts";
import { resolveAutoPartsPriorityOperation, ST_AUTO_PARTS_OPERATION_FACT_LABELS } from "../domain/st-auto-parts-high-use-corridors.ts";

const allFacts = Object.fromEntries(Object.keys(ST_AUTO_PARTS_OPERATION_FACT_LABELS).map((key) => [key, true]));
const completeInput = {
  route: "SP-MG",
  operationDate: "2026-07-26",
  operationCents: 100_000,
  ownIcmsBaseCents: 100_000,
  cest: "01.075.00",
  ncm: "8708",
  importedQualified: false,
  commercialCondition: "standard",
  facts: allFacts,
};

test("dossiê de autopeças fecha os nove itens do checklist no recorte suportado", async () => {
  const result = resolveAutoPartsPriorityOperation(completeInput);
  const { snapshot, inputHash } = await createAutoPartsDossierSnapshot(completeInput, result, "abc123def456", "2026-07-26T12:00:00.000Z");

  assert.equal(snapshot.coverage.status, "supported");
  assert.equal(snapshot.calculation.status, "calculated_conditional");
  assert.ok(snapshot.calculation.totals.destinationTotalCents > 0, "resultado objetivo");
  assert.equal(snapshot.operation.operationCents, 100_000, "dados utilizados");
  assert.equal(snapshot.operation.confirmedFacts.length, 9, "fatos utilizados");
  assert.equal(snapshot.operation.confirmedFacts.some((fact) => fact.code === "operationPurposeConfirmed" && fact.confirmed), true, "finalidade e consumidor");
  assert.equal(snapshot.calculation.lines.length, 9, "memória linha por linha");
  assert.ok(snapshot.calculation.lines.every((line) => line.formula && line.basis), "fórmula e fundamento");
  assert.ok(snapshot.evidence.sources.length >= 3, "fontes aplicadas");
  assert.ok(snapshot.evidence.sources.every((source) => source.url.startsWith("https://") && source.checkedAt && source.proves.length), "links oficiais, conferência e escopo");
  assert.equal(snapshot.rule.effectiveFrom, "2026-01-01", "vigência inicial");
  assert.equal(snapshot.rule.effectiveTo, "2026-12-31", "vigência final");
  assert.match(snapshot.rule.version, /^2026\./, "versão da regra");
  assert.equal(snapshot.rule.fingerprint, "abc123def456", "fingerprint");
  assert.equal(snapshot.calculation.parameters.baseReductionBps, 0, "redução afastada");
  assert.equal(snapshot.calculation.parameters.baseReductionStatus, "not_applicable_confirmed");
  assert.equal(snapshot.calculation.blockers.length, 0, "sem pendências no recorte completo");
  assert.equal(snapshot.clientReport.ready, true, "relatório para cliente");
  assert.equal(snapshot.clientReport.deliveryCondition, "professional_review_required");
  assert.match(inputHash, /^[0-9a-f]{64}$/);
  assert.equal(isAutoPartsDossierSnapshot(snapshot), true);
});

test("dossiê parcial preserva pendências e não vaza valor final", async () => {
  const input = { ...completeInput, facts: { ...allFacts, documentsConfirmed: false } };
  const result = resolveAutoPartsPriorityOperation(input);
  const { snapshot } = await createAutoPartsDossierSnapshot(input, result, "blocked123456", "2026-07-26T12:00:00.000Z");

  assert.equal(snapshot.coverage.status, "partial");
  assert.equal(snapshot.calculation.status, "needs_information");
  assert.equal(snapshot.calculation.totals.destinationTotalCents, null);
  assert.ok(snapshot.calculation.blockers.some((blocker) => blocker.includes("documentos")));
  assert.ok(snapshot.calculation.requiredConfirmations.some((item) => item.includes("documentos")));
  assert.equal(snapshot.calculation.lines.at(-1)?.status, "blocked");
});

test("mudança paulista transforma o recorte posterior em não suportado", async () => {
  const input = { ...completeInput, route: "MG-SP", operationDate: "2026-10-01" };
  const result = resolveAutoPartsPriorityOperation(input);
  const { snapshot } = await createAutoPartsDossierSnapshot(input, result, "transition12", "2026-07-26T12:00:00.000Z");

  assert.equal(result.status, "st_not_applicable_after_state_exclusion");
  assert.equal(snapshot.coverage.status, "not_supported");
  assert.equal(snapshot.calculation.status, "not_applicable");
  assert.equal(snapshot.calculation.totals.destinationTotalCents, null);
  assert.equal(snapshot.rule.scheduledTransition?.effectiveFrom, "2026-10-01");
});

test("snapshot e hash são reproduzíveis com a mesma versão e instante", async () => {
  const result = resolveAutoPartsPriorityOperation(completeInput);
  const first = await createAutoPartsDossierSnapshot(completeInput, result, "abc123def456", "2026-07-26T12:00:00.000Z");
  const replay = await createAutoPartsDossierSnapshot(completeInput, result, "abc123def456", "2026-07-26T12:00:00.000Z");
  const changed = await createAutoPartsDossierSnapshot({ ...completeInput, operationCents: 100_001 }, resolveAutoPartsPriorityOperation({ ...completeInput, operationCents: 100_001 }), "abc123def456", "2026-07-26T12:00:00.000Z");

  assert.equal(first.inputHash, replay.inputHash);
  assert.notEqual(first.inputHash, changed.inputHash);
});

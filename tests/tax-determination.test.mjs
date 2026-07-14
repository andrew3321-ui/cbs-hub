import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateTaxDetermination,
  hashTaxDeterminationBlueprint,
  taxDeterminationBlueprint,
  taxDeterminationCasePasses,
  taxDeterminationReferenceCases,
} from "../domain/tax-determination.ts";

test("casos de referência da apuração avançada reproduzem os resultados esperados", () => {
  assert.equal(taxDeterminationReferenceCases.length, 4);
  assert.equal(taxDeterminationReferenceCases.every(taxDeterminationCasePasses), true);
});

test("CBS e IBS permanecem em livros separados", () => {
  const output = calculateTaxDetermination(taxDeterminationReferenceCases[1].input);
  assert.equal(output.ledgers.CBS.netPayableCents, 65_000);
  assert.equal(output.ledgers.IBS.netPayableCents, 15_000);
  assert.equal(output.closingReady, true);
});

test("crédito pendente é excluído e impede saldo líquido", () => {
  const output = calculateTaxDetermination(taxDeterminationReferenceCases[2].input);
  assert.equal(output.ledgers.CBS.eligibleCreditsCents, 0);
  assert.equal(output.ledgers.CBS.preliminaryDebitBalanceCents, 100_000);
  assert.equal(output.ledgers.CBS.netPayableCents, null);
  assert.equal(output.issues.some((issue) => issue.code === "PENDING_CREDIT"), true);
});

test("competência de 2026 nunca libera valor jurídico a recolher", () => {
  const output = calculateTaxDetermination(taxDeterminationReferenceCases[0].input);
  assert.equal(output.legalEffect, "simulation_2026");
  assert.equal(output.netPayableEnabled, false);
  assert.equal(output.ledgers.CBS.netPayableCents, null);
  assert.equal(output.ledgers.IBS.netPayableCents, null);
});

test("chave documental duplicada não duplica o débito", () => {
  const output = calculateTaxDetermination(taxDeterminationReferenceCases[3].input);
  assert.equal(output.ledgers.CBS.grossDebitsCents, 50_000);
  assert.equal(output.issues.some((issue) => issue.code === "DUPLICATE_SOURCE_KEY"), true);
});

test("entrada fora do contrato fiscal é rejeitada antes de afetar o livro", () => {
  const input = structuredClone(taxDeterminationReferenceCases[1].input);
  input.entries[0].tax = "CBS_E_IBS";
  assert.throws(() => calculateTaxDetermination(input), /invalid_tax_entry/);
});

test("somas acima do limite monetário seguro interrompem a apuração", () => {
  const input = structuredClone(taxDeterminationReferenceCases[1].input);
  input.entries = [
    { ...input.entries[0], sourceKey: "CBS-LARGE-1", sourceDocumentKey: "DFE-CBS-LARGE-1", amountCents: 75_000_000_000_000 },
    { ...input.entries[0], sourceKey: "CBS-LARGE-2", sourceDocumentKey: "DFE-CBS-LARGE-2", amountCents: 75_000_000_000_000 },
  ];
  assert.throws(() => calculateTaxDetermination(input), /tax_amount_overflow/);
});

test("blueprint auditável possui fingerprint estável e fontes oficiais", async () => {
  const first = await hashTaxDeterminationBlueprint();
  const second = await hashTaxDeterminationBlueprint();
  assert.equal(first, second);
  assert.match(first, /^[0-9a-f]{64}$/);
  assert.equal(taxDeterminationBlueprint.sources.length >= 5, true);
  assert.equal(taxDeterminationBlueprint.status, "in_review");
});

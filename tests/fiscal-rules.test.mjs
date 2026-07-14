import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateFiscalReference,
  hashFiscalRuleContent,
  referenceCasePasses,
  rtc2026ReferenceCases,
  rtc2026TestRule,
} from "../domain/fiscal-rules.ts";

test("todos os casos fiscais de referência reproduzem a saída registrada", () => {
  assert.equal(rtc2026ReferenceCases.length, 3);
  assert.equal(rtc2026ReferenceCases.every((referenceCase) => referenceCasePasses(rtc2026TestRule, referenceCase)), true);
});

test("regra RTC 2026 destaca CBS e IBS em centavos sem inventar saldo a recolher", () => {
  const result = evaluateFiscalReference(rtc2026TestRule, {
    taxableBaseCents: 10_000_000,
    ancillaryObligationsStatus: "not_confirmed",
  });
  assert.deepEqual(result, {
    cbsHighlightedCents: 90_000,
    ibsHighlightedCents: 10_000,
    totalHighlightedCents: 100_000,
    collectionTreatment: "offset_against_pis_cofins",
    netPayableCents: null,
  });
});

test("conformidade confirmada muda somente o tratamento e mantém apuração líquida bloqueada", () => {
  const result = evaluateFiscalReference(rtc2026TestRule, {
    taxableBaseCents: 10_000_000,
    ancillaryObligationsStatus: "confirmed_compliant",
  });
  assert.equal(result.collectionTreatment, "conditional_waiver");
  assert.equal(result.netPayableCents, null);
});

test("entradas fora do contrato e códigos desconhecidos são rejeitados", () => {
  assert.throws(() => evaluateFiscalReference(rtc2026TestRule, { taxableBaseCents: 1.5, ancillaryObligationsStatus: "not_confirmed" }), /invalid_taxable_base/);
  assert.throws(() => evaluateFiscalReference(rtc2026TestRule, { taxableBaseCents: 100, ancillaryObligationsStatus: "unknown" }), /invalid_ancillary_obligations_status/);
  assert.throws(() => evaluateFiscalReference({ ...rtc2026TestRule, ruleCode: "UNKNOWN" }, { taxableBaseCents: 100, ancillaryObligationsStatus: "not_confirmed" }), /unsupported_fiscal_rule/);
  assert.throws(() => evaluateFiscalReference({ ...rtc2026TestRule, treatment: { ...rtc2026TestRule.treatment, automaticNetPayableCalculation: true } }, { taxableBaseCents: 100, ancillaryObligationsStatus: "not_confirmed" }), /invalid_fiscal_rule_definition/);
});

test("impressão digital muda quando o conteúdo normativo muda", async () => {
  const original = await hashFiscalRuleContent(JSON.stringify(rtc2026TestRule));
  const changed = await hashFiscalRuleContent(JSON.stringify({ ...rtc2026TestRule, effectiveTo: "2026-11-30" }));
  assert.match(original, /^[0-9a-f]{64}$/);
  assert.notEqual(original, changed);
});

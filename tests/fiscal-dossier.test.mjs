import assert from "node:assert/strict";
import test from "node:test";
import {
  adjustedMvaBps,
  calculateFiscalMemory,
  createFiscalDossierSnapshot,
  parseFiscalCalculationInputs,
} from "../domain/fiscal-dossier.ts";
import { evaluateFiscalQuestion } from "../domain/fiscal-intelligence.ts";

const facts = {
  productDescription: "Partes e acessórios dos veículos automóveis",
  ncm: "8708",
  cest: "01.075.00",
  productOrigin: "domestic",
  issuerTaxRegime: "normal",
  recipientTaxpayer: "yes",
  purpose: "resale",
  automotiveUse: "yes",
  specialTreatment: "none",
};

const inputs = {
  operationPriceCents: 100_000,
  discountsGrantedCents: 0,
  freightCents: 0,
  insuranceCents: 0,
  ipiCents: 0,
  otherExpensesCents: 0,
  ownIcmsBaseCents: 100_000,
  internalRateBps: 1_800,
  fcpRateBps: 0,
  ratesConfirmed: true,
  priceMethod: "mva",
};

function determination(overrides = {}) {
  return evaluateFiscalQuestion("Qual a alíquota de ICMS para autopeças de SP para MG?", { ...facts, ...overrides });
}

test("MVA ajustada preserva a fórmula oficial com arredondamento em ponto-base", () => {
  assert.equal(adjustedMvaBps(7_178, 1_200, 1_800), 8_435);
});

test("memória de revenda calcula base, ICMS presumido e ICMS-ST linha a linha", () => {
  const memory = calculateFiscalMemory(determination(), inputs);
  assert.equal(memory.status, "calculated_conditional");
  assert.equal(memory.calculationType, "icms_st_resale");
  assert.equal(memory.parameters.mvaOriginalBps, 7_178);
  assert.equal(memory.parameters.mvaAppliedBps, 8_435);
  assert.equal(memory.parameters.mvaWasAdjusted, true);
  assert.equal(memory.totals.operationCompositionCents, 100_000);
  assert.equal(memory.totals.ownIcmsReferenceCents, 12_000);
  assert.equal(memory.totals.stBaseCents, 184_350);
  assert.equal(memory.totals.presumedInternalIcmsCents, 33_183);
  assert.equal(memory.totals.icmsStCents, 21_183);
  assert.equal(memory.totals.destinationTotalCents, 21_183);
  assert.ok(memory.lines.some((line) => line.code === "ICMS-ST-DUE" && line.amountCents === 21_183));
});

test("remetente do Simples usa MVA original e mantém dedução técnica separada", () => {
  const memory = calculateFiscalMemory(determination({ issuerTaxRegime: "simples" }), inputs);
  assert.equal(memory.parameters.mvaWasAdjusted, false);
  assert.equal(memory.parameters.mvaAppliedBps, 7_178);
  assert.equal(memory.totals.stBaseCents, 171_780);
  assert.equal(memory.totals.ownIcmsReferenceCents, 12_000);
  assert.equal(memory.totals.icmsStCents, 18_920);
});

test("uso ou consumo aplica a fórmula por dentro e não reutiliza MVA de revenda", () => {
  const memory = calculateFiscalMemory(determination({ purpose: "use_consumption" }), inputs);
  assert.equal(memory.calculationType, "icms_st_difal");
  assert.equal(memory.parameters.mvaAppliedBps, null);
  assert.equal(memory.totals.stBaseCents, 107_317);
  assert.equal(memory.totals.presumedInternalIcmsCents, 19_317);
  assert.equal(memory.totals.difalCents, 7_317);
});

test("motor bloqueia cálculo quando fatos ou alíquotas ainda não foram confirmados", () => {
  const incomplete = evaluateFiscalQuestion("Qual a alíquota de ICMS para autopeças de SP para MG?");
  const memory = calculateFiscalMemory(incomplete, { ...inputs, ratesConfirmed: false });
  assert.equal(memory.status, "needs_information");
  assert.ok(memory.blockers.some((blocker) => blocker.includes("fatos mínimos")));
  assert.ok(memory.blockers.some((blocker) => blocker.includes("alíquota interna")));
  assert.equal(memory.totals.destinationTotalCents, null);
});

test("snapshot é determinístico e qualquer centavo altera o SHA-256", async () => {
  const result = determination();
  const at = "2026-07-16T12:00:00.000Z";
  const first = await createFiscalDossierSnapshot("Qual a alíquota de ICMS para autopeças de SP para MG?", result, inputs, at);
  const replay = await createFiscalDossierSnapshot("Qual a alíquota de ICMS para autopeças de SP para MG?", result, inputs, at);
  const changed = await createFiscalDossierSnapshot("Qual a alíquota de ICMS para autopeças de SP para MG?", result, { ...inputs, freightCents: 1 }, at);
  assert.equal(first.inputHash, replay.inputHash);
  assert.notEqual(first.inputHash, changed.inputHash);
  assert.match(first.inputHash, /^[0-9a-f]{64}$/);
  assert.equal(first.snapshot.assurance.reviewRequired, true);
});

test("parser rejeita moeda fracionária e taxa fora do intervalo seguro", () => {
  assert.throws(() => parseFiscalCalculationInputs({ ...inputs, operationPriceCents: 1.5 }), /invalid_operation_price/);
  assert.throws(() => parseFiscalCalculationInputs({ ...inputs, internalRateBps: 4_000 }), /invalid_internal_rate/);
});

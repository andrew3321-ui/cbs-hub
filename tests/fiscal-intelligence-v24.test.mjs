import assert from "node:assert/strict";
import test from "node:test";

import { spMgAutoPartsKnowledge } from "../domain/fiscal-intelligence.ts";
import { evaluateExpandedFiscalQuestion, fiscalTopicCatalog } from "../domain/fiscal-intelligence-v24.ts";

const nationalIcmsFacts = {
  tax: "ICMS",
  originState: "SP",
  destinationState: "BA",
  productOrigin: "domestic",
  issuerTaxRegime: "normal",
  recipientTaxpayer: "yes",
  purpose: "resale",
  specialTreatment: "none",
};

test("V81 ships eight controlled tax modules backed only by an expanded versioned base", () => {
  assert.equal(fiscalTopicCatalog().length, 8);
  assert.equal(spMgAutoPartsKnowledge.version, "1.3.0");
  assert.equal(spMgAutoPartsKnowledge.baseCode, "FISCAL-MANUAL-BR");
  assert.ok(spMgAutoPartsKnowledge.rules.length >= 24);
  assert.ok(spMgAutoPartsKnowledge.sources.length >= 31);
  assert.ok(spMgAutoPartsKnowledge.sources.filter((source) => source.primary).length >= 20);
  assert.ok(spMgAutoPartsKnowledge.nationalTopics.every((topic) => topic.requiredFacts.length > 0 && topic.hardStops.length > 0));
});

test("topic router never guesses the tax and exposes all eight funnels", () => {
  const result = evaluateExpandedFiscalQuestion("Quero revisar esta operacao fiscal");
  assert.equal(result.topicCode, "TOPIC-ROUTER");
  assert.equal(result.status, "needs_information");
  assert.equal(result.calculationEligible, false);
  assert.equal(result.findings.length, 0);
  assert.equal(result.scenarioBranches.length, 8);
  assert.deepEqual(result.clarifications.map((item) => item.field), ["tax"]);
});

test("national ICMS applies 7%, 12% and imported 4% only under explicit route facts", () => {
  const southToNorthEast = evaluateExpandedFiscalQuestion("ICMS de mercadoria de SP para BA", nationalIcmsFacts);
  assert.equal(southToNorthEast.topicCode, "ICMS-NATIONAL");
  assert.equal(southToNorthEast.findings.find((item) => item.code === "ICMS-INTERSTATE-7")?.value, "7%");
  assert.equal(southToNorthEast.calculationEligible, false);

  const southEastToSouth = evaluateExpandedFiscalQuestion("ICMS de mercadoria de MG para SP", { ...nationalIcmsFacts, originState: "MG", destinationState: "SP" });
  assert.equal(southEastToSouth.findings.find((item) => item.code === "ICMS-INTERSTATE-12")?.value, "12%");

  const imported = evaluateExpandedFiscalQuestion("ICMS de mercadoria importada de SP para BA", { ...nationalIcmsFacts, productOrigin: "imported", importRuleQualification: "qualifies" });
  assert.equal(imported.findings.find((item) => item.code === "ICMS-INTERSTATE-4")?.value, "4%");
});

test("national ICMS blocks internal routes and unqualified imported goods", () => {
  const internal = evaluateExpandedFiscalQuestion("ICMS em operacao interna de SP", { ...nationalIcmsFacts, destinationState: "SP" });
  assert.equal(internal.findings.some((item) => item.nature === "own_rate"), false);
  assert.equal(internal.decisionTrace.some((item) => item.ruleCode === "ICMS-INTRASTATE-STATE-LAW" && item.result === "blocked"), true);

  const importedUnknown = evaluateExpandedFiscalQuestion("ICMS de importado de SP para BA", { ...nationalIcmsFacts, productOrigin: "imported", importRuleQualification: "unknown" });
  assert.equal(importedUnknown.status, "needs_information");
  assert.equal(importedUnknown.findings.some((item) => item.code === "ICMS-INTERSTATE-4"), false);
  assert.equal(importedUnknown.clarifications.some((item) => item.field === "importRuleQualification"), true);
});

test("ISS returns a legal range but never invents the municipal exact rate", () => {
  const result = evaluateExpandedFiscalQuestion("Qual a aliquota de ISS para consultoria?", {
    tax: "ISS",
    productDescription: "consultoria empresarial",
    serviceItem: "17.01",
    originMunicipality: "Sao Paulo",
    destinationMunicipality: "Belo Horizonte",
    issuerTaxRegime: "normal",
    specialTreatment: "none",
  });
  assert.equal(result.topicCode, "ISS-NATIONAL");
  assert.equal(result.findings.find((item) => item.code === "ISS-LEGAL-RANGE")?.value, "2% a 5%");
  assert.equal(result.findings.some((item) => item.nature === "own_rate"), false);
  assert.equal(result.calculationEligible, false);
});

test("PIS/Cofins separates general cumulative reference from special regimes", () => {
  const base = { tax: "PIS_COFINS", productDescription: "receita de servicos", issuerTaxRegime: "normal", businessActivity: "service", specialTreatment: "none" };
  const cumulative = evaluateExpandedFiscalQuestion("PIS e Cofins no regime cumulativo", { ...base, pisCofinsRegime: "cumulative" });
  assert.equal(cumulative.findings.find((item) => item.code === "PIS-COFINS-CUMULATIVE")?.value, "3,65%");
  const monophase = evaluateExpandedFiscalQuestion("PIS e Cofins monofasico", { ...base, pisCofinsRegime: "monophase" });
  assert.equal(monophase.findings.some((item) => item.code === "PIS-COFINS-CUMULATIVE" || item.code === "PIS-COFINS-NON-CUMULATIVE"), false);
  assert.equal(monophase.decisionTrace.some((item) => item.ruleCode === "PIS-COFINS-SPECIAL-GATE"), true);
});

test("PIS/Cofins recognizes a special product candidate but keeps the 2026 rate blocked", () => {
  const result = evaluateExpandedFiscalQuestion("PIS e Cofins monofásico de pneus", {
    tax: "PIS_COFINS",
    productDescription: "pneu novo",
    ncm: "40111000",
    issuerTaxRegime: "normal",
    businessActivity: "commerce",
    specialTreatment: "exists",
    pisCofinsRegime: "monophase",
  });
  assert.equal(result.findings.find((item) => item.code === "PIS-COFINS-PRODUCT-CANDIDATE")?.value, "Pneus novos");
  assert.equal(result.decisionTrace.some((item) => item.ruleCode === "PIS-COFINS-LC224-2026" && item.result === "blocked"), true);
  assert.equal(result.calculationEligible, false);
});

test("Simples classifies the work queue but refuses to calculate DAS without apuration inputs", () => {
  const result = evaluateExpandedFiscalQuestion("Qual anexo do Simples Nacional?", {
    tax: "SIMPLES",
    productDescription: "desenvolvimento de software",
    cnae: "6201-5/01",
    businessActivity: "service",
    specialTreatment: "none",
  });
  assert.equal(result.topicCode, "SIMPLES-NACIONAL");
  assert.match(result.findings.find((item) => item.code === "SIMPLES-CNAE-TRIAGE")?.detail ?? "", /Anexos III\/V, condicionado ao fator R/);
  assert.equal(result.findings.find((item) => item.code === "SIMPLES-SUBLIMIT-2026")?.value, "R$ 3.600.000");
  assert.ok(result.sources.some((item) => item.code === "CNAE-CONCLA"));
  assert.ok(result.sources.some((item) => item.code === "CGSN-PORTARIA-54-2025"));
  assert.equal(result.findings.find((item) => item.code === "SIMPLES-DAS-NOT-CALCULATED")?.value, "Não calculado");
  assert.equal(result.scenarioBranches.length, 3);
  assert.equal(result.calculationEligible, false);
});

test("IRPJ/CSLL exposes nominal rates but keeps bases and 2026 benefit changes gated", () => {
  const result = evaluateExpandedFiscalQuestion("IRPJ e CSLL no lucro presumido", {
    tax: "IRPJ_CSLL",
    productDescription: "consultoria",
    businessActivity: "service",
    incomeTaxRegime: "presumed",
    specialTreatment: "none",
  });
  assert.equal(result.findings.find((item) => item.code === "IRPJ-NOMINAL")?.value, "15%");
  assert.equal(result.findings.find((item) => item.code === "CSLL-NOMINAL")?.value, "9%");
  assert.equal(result.decisionTrace.some((item) => item.ruleCode === "IRPJ-CSLL-2026-GATE"), true);
  assert.equal(result.calculationEligible, false);
});

test("IBS/CBS labels 2026 percentages as test highlights instead of tax payable", () => {
  const result = evaluateExpandedFiscalQuestion("Como destacar IBS e CBS em 2026?", { tax: "IBS_CBS", operationType: "service", businessActivity: "service", specialTreatment: "none" });
  assert.equal(result.findings.find((item) => item.code === "CBS-TEST-2026")?.value, "0,9%");
  assert.equal(result.findings.find((item) => item.code === "IBS-TEST-2026")?.value, "0,1%");
  assert.match(result.summary, /Nenhum valor líquido a pagar/i);
  assert.equal(result.calculationEligible, false);
});

test("service withholding separates potential CSRF, Simples dispensation and Reinf evidence", () => {
  const base = { tax: "WITHHOLDINGS", productDescription: "consultoria", payerType: "private_legal_entity", paymentRecipientType: "legal_entity", serviceNature: "professional", specialTreatment: "none" };
  const normal = evaluateExpandedFiscalQuestion("Retencao de contribuicoes em consultoria", { ...base, issuerTaxRegime: "normal" });
  assert.equal(normal.findings.find((item) => item.code === "CSRF-POTENTIAL-4-65")?.value, "4,65%");
  assert.equal(normal.findings.some((item) => item.code === "REINF-EVIDENCE"), true);
  const simples = evaluateExpandedFiscalQuestion("Retencao em servico do Simples", { ...base, issuerTaxRegime: "simples" });
  assert.equal(simples.findings.some((item) => item.code === "CSRF-POTENTIAL-4-65"), false);
  assert.equal(simples.findings.some((item) => item.code === "CSRF-SIMPLES-DISPENSATION"), true);
});

test("deep SP to MG auto-parts dossier remains isolated and conditionally calculation-eligible", () => {
  const result = evaluateExpandedFiscalQuestion("Qual a aliquota de ICMS para autopecas de SP para MG?", {
    tax: "ICMS",
    segment: "auto_parts",
    originState: "SP",
    destinationState: "MG",
    productDescription: "Partes e acessorios dos veiculos automoveis",
    ncm: "8708",
    cest: "01.075.00",
    productOrigin: "domestic",
    issuerTaxRegime: "normal",
    recipientTaxpayer: "yes",
    purpose: "resale",
    automotiveUse: "yes",
    specialTreatment: "none",
  });
  assert.equal(result.topicCode, "ICMS-SP-MG-AUTO-PARTS");
  assert.equal(result.completeness.percentage, 100);
  assert.equal(result.calculationEligible, true);
  assert.equal(result.findings.find((item) => item.nature === "own_rate")?.value, "12%");
});

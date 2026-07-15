import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateFiscalQuestion,
  extractFiscalFacts,
  hashFiscalIntelligenceContent,
  spMgAutoPartsKnowledge,
} from "../domain/fiscal-intelligence.ts";

const completeDomesticFacts = {
  productDescription: "Partes e acessórios de veículos automóveis",
  ncm: "8708",
  cest: "01.075.00",
  productOrigin: "domestic",
  issuerTaxRegime: "normal",
  recipientTaxpayer: "yes",
  purpose: "resale",
  automotiveUse: "yes",
  specialTreatment: "none",
};

test("extrai rota, tributo, segmento, NCM e CEST sem modelo de IA", () => {
  const facts = extractFiscalFacts("Qual o ICMS de autopeças de SP para MG? NCM 8708 e CEST 01.075.00");
  assert.equal(facts.tax, "ICMS");
  assert.equal(facts.segment, "auto_parts");
  assert.equal(facts.originState, "SP");
  assert.equal(facts.destinationState, "MG");
  assert.equal(facts.ncm, "8708");
  assert.equal(facts.cest, "01.075.00");
});

test("pergunta curta não recebe número conclusivo quando faltam fatos", () => {
  const result = evaluateFiscalQuestion("Qual a alíquota de ICMS para autopeças de SP para MG?");
  assert.equal(result.status, "needs_information");
  assert.equal(result.findings.length, 0);
  assert.ok(result.clarifications.some((item) => item.field === "ncm"));
  assert.ok(result.clarifications.some((item) => item.field === "productOrigin"));
  assert.ok(result.completeness.percentage < 50);
});

test("operação nacional completa localiza 12%, ST e MVA sem calcular imposto retido", () => {
  const result = evaluateFiscalQuestion("Qual o ICMS para autopeças de SP para MG?", completeDomesticFacts);
  assert.equal(result.status, "conditional");
  assert.equal(result.findings.find((item) => item.nature === "own_rate")?.value, "12%");
  assert.equal(result.findings.find((item) => item.nature === "st_scope")?.value, "Enquadramento localizado");
  assert.equal(result.findings.find((item) => item.nature === "table_parameter")?.value, "71,78%");
  assert.match(result.findings.find((item) => item.nature === "table_parameter")?.detail ?? "", /não valor do ICMS-ST/i);
  assert.equal(result.clarifications.length, 0);
});

test("mercadoria importada só recebe referência de 4% com qualificação explícita", () => {
  const pending = evaluateFiscalQuestion("ICMS de autopeças importadas de SP para MG?", { ...completeDomesticFacts, productOrigin: "imported", importRuleQualification: "unknown" });
  assert.equal(pending.status, "needs_information");
  assert.ok(pending.clarifications.some((item) => item.field === "importRuleQualification"));
  assert.equal(pending.findings.some((item) => item.value === "4%"), false);

  const qualified = evaluateFiscalQuestion("ICMS de autopeças importadas de SP para MG?", { ...completeDomesticFacts, productOrigin: "imported", importRuleQualification: "qualifies" });
  assert.equal(qualified.status, "conditional");
  assert.equal(qualified.findings.find((item) => item.nature === "own_rate")?.value, "4%");
});

test("Simples Nacional e rota inversa bloqueiam a aplicação da regra geral", () => {
  const simples = evaluateFiscalQuestion("Qual o ICMS para autopeças de SP para MG?", { ...completeDomesticFacts, issuerTaxRegime: "simples" });
  assert.equal(simples.status, "needs_information");
  assert.equal(simples.findings.some((item) => item.nature === "own_rate"), false);
  assert.ok(simples.decisionTrace.some((item) => item.ruleCode === "REGIME-SIMPLES-PENDING" && item.result === "blocked"));

  const inverse = evaluateFiscalQuestion("Qual o ICMS para autopeças de MG para SP?", completeDomesticFacts);
  assert.equal(inverse.status, "out_of_scope");
  assert.equal(inverse.findings.length, 0);
});

test("impressão digital da base muda quando uma fonte ou regra muda", async () => {
  const original = await hashFiscalIntelligenceContent(JSON.stringify(spMgAutoPartsKnowledge));
  const changed = await hashFiscalIntelligenceContent(JSON.stringify({ ...spMgAutoPartsKnowledge, version: "0.1.1" }));
  assert.match(original, /^[0-9a-f]{64}$/);
  assert.notEqual(original, changed);
});

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
  assert.match(result.headline, /Referência geral: 12%/);
  assert.ok(result.scenarioBranches.some((item) => item.code === "SCENARIO-DOMESTIC-12" && item.value === "12%"));
  assert.ok(result.scenarioBranches.some((item) => item.code === "SCENARIO-IMPORTED-4" && item.value === "4%"));
  assert.ok(result.scenarioBranches.some((item) => item.code === "SCENARIO-SEVEN-NOT-SP-MG" && item.status === "not_applicable"));
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
  assert.equal(result.completeness.percentage, 100);
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

test("Simples Nacional mantém a trilha de ST, mas não simula destaque de ICMS próprio", () => {
  const simples = evaluateFiscalQuestion("Qual o ICMS para autopeças de SP para MG?", { ...completeDomesticFacts, issuerTaxRegime: "simples" });
  assert.equal(simples.status, "conditional");
  assert.equal(simples.findings.some((item) => item.nature === "own_rate"), false);
  assert.equal(simples.findings.find((item) => item.nature === "st_scope")?.value, "Enquadramento localizado");
  assert.ok(simples.decisionTrace.some((item) => item.ruleCode === "ICMS-ST-SIMPLES-APPLIES" && item.result === "applied"));
});

test("rota inversa permanece fora da cobertura e não herda cenários de SP para MG", () => {
  const inverse = evaluateFiscalQuestion("Qual o ICMS para autopeças de MG para SP?", completeDomesticFacts);
  assert.equal(inverse.status, "out_of_scope");
  assert.equal(inverse.findings.length, 0);
  assert.equal(inverse.scenarioBranches.length, 0);
});

test("industrialização afasta a ST do protocolo sem apagar a alíquota interestadual", () => {
  const result = evaluateFiscalQuestion("Qual o ICMS para autopeças de SP para MG?", { ...completeDomesticFacts, purpose: "industrialization" });
  assert.equal(result.findings.find((item) => item.nature === "own_rate")?.value, "12%");
  assert.equal(result.findings.some((item) => item.nature === "st_scope" || item.nature === "table_parameter"), false);
  assert.ok(result.decisionTrace.some((item) => item.ruleCode === "ICMS-ST-DESTINATION-EXCEPTIONS" && item.result === "not_applicable"));
});

test("uso e ativo seguem diferencial de alíquotas sem aplicar MVA de revenda", () => {
  for (const purpose of ["use_consumption", "fixed_asset"]) {
    const result = evaluateFiscalQuestion("Qual o ICMS para autopeças de SP para MG?", { ...completeDomesticFacts, purpose });
    assert.equal(result.findings.find((item) => item.nature === "own_rate")?.value, "12%");
    assert.equal(result.findings.some((item) => item.nature === "table_parameter"), false);
    assert.equal(result.findings.find((item) => item.nature === "additional_obligation")?.value, "Analisar diferencial de alíquotas");
  }
});

test("CEST 01.015.00 envolvendo São Paulo aplica a exceção vigente em 2026", () => {
  const result = evaluateFiscalQuestion("Qual o ICMS para autopeça de vidro automotivo de SP para MG?", {
    ...completeDomesticFacts,
    productDescription: "Vidro automotivo para-brisa",
    ncm: "70071100",
    cest: "01.015.00",
  });
  assert.equal(result.findings.find((item) => item.nature === "own_rate")?.value, "12%");
  assert.equal(result.findings.some((item) => item.nature === "st_scope" || item.nature === "table_parameter"), false);
  assert.ok(result.decisionTrace.some((item) => item.ruleCode === "ICMS-ST-GLASS-SP-EXCEPTION-2026" && item.result === "not_applicable"));
});

test("consumidor final não contribuinte abre DIFAL e não ST de operações subsequentes", () => {
  const result = evaluateFiscalQuestion("Qual o ICMS para autopeças de SP para MG?", { ...completeDomesticFacts, recipientTaxpayer: "no" });
  assert.equal(result.status, "needs_information");
  assert.equal(result.findings.find((item) => item.nature === "own_rate")?.value, "12%");
  assert.equal(result.findings.some((item) => item.nature === "st_scope"), false);
  assert.ok(result.decisionTrace.some((item) => item.ruleCode === "ICMS-DIFAL-NON-TAXPAYER" && item.result === "applied"));
});

test("base ampliada preserva fontes primárias, vigência e catálogo controlado", () => {
  assert.ok(spMgAutoPartsKnowledge.sources.length >= 9);
  assert.ok(spMgAutoPartsKnowledge.sources.filter((source) => source.primary).length >= 8);
  assert.ok(spMgAutoPartsKnowledge.productClassifications.length >= 18);
  assert.equal(spMgAutoPartsKnowledge.sources.find((source) => source.code === "MG-RICMS-INDEX")?.legalReference.includes("49.252/2026"), true);
});

test("impressão digital da base muda quando uma fonte ou regra muda", async () => {
  const original = await hashFiscalIntelligenceContent(JSON.stringify(spMgAutoPartsKnowledge));
  const changed = await hashFiscalIntelligenceContent(JSON.stringify({ ...spMgAutoPartsKnowledge, version: "0.1.1" }));
  assert.match(original, /^[0-9a-f]{64}$/);
  assert.notEqual(original, changed);
});

test("variacoes usuais de linguagem preservam os fatos fiscais objetivos", () => {
  const questions = [
    "Qual o tratamento do ICMS sobre pecas automotivas saindo de Sao Paulo para Minas Gerais, NCM 8708 e CEST 01.075.00, para revenda?",
    "Na venda de autopecas SP para MG, NCM 8708 CEST 01.075.00, qual e o ICMS?",
    "ICMS: peca automotiva com origem em SP e entrega em MG; NCM 8708; CEST 01.075.00; finalidade revenda.",
  ];
  for (const question of questions) {
    const facts = extractFiscalFacts(question);
    assert.equal(facts.tax, "ICMS", question);
    assert.equal(facts.segment, "auto_parts", question);
    assert.equal(facts.originState, "SP", question);
    assert.equal(facts.destinationState, "MG", question);
    assert.equal(facts.ncm, "8708", question);
    assert.equal(facts.cest, "01.075.00", question);
    assert.equal(facts.operationType, "goods", question);
  }
});

test("perguntas fora da base nao recebem achado nem calculo emprestado", () => {
  const questions = [
    "Qual a aliquota definitiva de ITCMD para uma doacao no exterior?",
    "Qual o ICMS-ST de cosmeticos do Amazonas para o Acre?",
  ];
  for (const question of questions) {
    const result = evaluateFiscalQuestion(question);
    assert.equal(result.findings.length, 0, question);
    assert.equal(result.calculationEligible, false, question);
    assert.ok(["needs_information", "out_of_scope"].includes(result.status), question);
  }
});

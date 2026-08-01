import assert from "node:assert/strict";
import test from "node:test";
import { cityCoverage, coverageMetrics, coverageSources, hashNationalCoverage, recurringScenarios, resolveInterstateIcms, stateCoverage, stSegments } from "../domain/national-tax-coverage.ts";
import { inspectFiscalBatchText } from "../domain/fiscal-batch-import.ts";

test("V82 exposes modal rates for all 27 UFs without pretending product incidence is final", () => {
  assert.equal(stateCoverage.length, 27);
  assert.equal(new Set(stateCoverage.map((item) => item.uf)).size, 27);
  assert.ok(stateCoverage.every((item) => item.status === "partial"));
  assert.ok(stateCoverage.every((item) => Number.isInteger(item.generalRateBps)));
  assert.ok(stateCoverage.every((item) => item.generalRateSourceCode.startsWith("ICMS-")));
  assert.ok(stateCoverage.every((item) => item.blockers.some((text) => text.includes("alíquota modal"))));
  assert.equal(stateCoverage.find((item) => item.uf === "AL").generalRateBps, 2050);
  assert.equal(stateCoverage.find((item) => item.uf === "AL").generalRateEffectiveFrom, "2026-04-01");
});

test("interstate resolver reproduces 7%, 12% and qualified imported 4%", () => {
  assert.equal(resolveInterstateIcms("SP", "MG", false).rateBps, 1200);
  assert.equal(resolveInterstateIcms("SP", "BA", false).rateBps, 700);
  assert.equal(resolveInterstateIcms("BA", "SP", false).rateBps, 1200);
  assert.equal(resolveInterstateIcms("SP", "MG", true).rateBps, 400);
  assert.equal(resolveInterstateIcms("SP", "SP", false).status, "blocked");
});

test("ISS, ST and recurring funnels disclose their unresolved facts", () => {
  assert.equal(cityCoverage.length, 100);
  assert.equal(new Set(cityCoverage.map((item) => item.ibgeCode)).size, 100);
  assert.ok(cityCoverage.every((item) => item.rangeBps[0] === 200 && item.rangeBps[1] === 500));
  assert.ok(stSegments.length >= 8);
  assert.ok(recurringScenarios.length >= 7);
  assert.ok([...cityCoverage, ...stSegments, ...recurringScenarios].every((item) => item.blockers.length > 0));
  assert.equal(cityCoverage.filter((item) => item.depth === "structured").length, 100);
  assert.equal(cityCoverage.filter((item) => item.depth === "catalogued").length, 0);
});

test("public metrics and fingerprint cover the national catalog", async () => {
  const metrics = coverageMetrics();
  assert.equal(metrics.states, 27);
  assert.equal(metrics.cities, 100);
  assert.equal(metrics.deepIssCities, 100);
  assert.ok(coverageSources.every((source) => /^https:\/\//.test(source.url)));
  assert.match(await hashNationalCoverage(), /^[0-9a-f]{64}$/);
});

test("batch inspector accepts structural SPED and recognizes NF-e/NFS-e safely", () => {
  const spedText = [
    "|0000|020|0|01072026|31072026|EMPRESA|12345678000190||SP|123|3550308|",
    "|0001|0|",
    "|0990|3|",
    "|C001|0|",
    "|C100|0|1|",
    "|C190|000|5102|18,00|100,00|100,00|18,00|0,00|0,00|",
    "|C990|4|",
    "|9001|0|",
    "|9900|C100|1|",
    "|9990|3|",
    "|9999|11|",
  ].join("\n");
  const sped = inspectFiscalBatchText("efd.txt", spedText);
  assert.equal(sped.documentType, "sped");
  assert.equal(sped.status, "accepted");
  assert.equal(sped.summary.c190OperationCents, 10_000);
  assert.equal(sped.summary.c190IcmsCents, 1_800);
  assert.equal(sped.competenceStart, "2026-07-01");
  assert.equal(sped.calculationEligible, false);
  assert.equal(inspectFiscalBatchText("efd.txt", spedText.replace("|9999|11|", "|9999|10|")).status, "blocked");
  const nfe = inspectFiscalBatchText("nfe.xml", "<nfeProc><NFe><infNFe><ide><mod>55</mod></ide><det nItem='1'/></infNFe></NFe></nfeProc>");
  assert.equal(nfe.documentType, "nfe");
  assert.equal(nfe.status, "warning");
  const nfse = inspectFiscalBatchText("nfse.xml", "<CompNfse versao='2.04'><Nfse><InfNfse><Numero>123</Numero><DataEmissao>2026-07-01</DataEmissao><IdentificacaoRps><Numero>1</Numero></IdentificacaoRps><CodigoVerificacao>ABC</CodigoVerificacao><ItemListaServico>1.07</ItemListaServico><CodigoMunicipio>3550308</CodigoMunicipio><CNPJPrestador>00000000000000</CNPJPrestador><CNPJTomador>11111111111111</CNPJTomador><ISSRetido>0</ISSRetido><ValorServicos>100.00</ValorServicos></InfNfse></Nfse></CompNfse>");
  assert.equal(nfse.documentType, "nfse");
  assert.equal(nfse.status, "warning");
  assert.equal(nfse.adapterCode, "abrasf-2.04-generic");
  assert.equal(nfse.coverageStatus, "partial");
  assert.equal(nfse.summary.serviceCents, 10_000);
  const unknownProvider = inspectFiscalBatchText("nfse.xml", "<NFSe><InfNfse><Numero>123</Numero></InfNfse></NFSe>");
  assert.equal(unknownProvider.status, "blocked");
  assert.equal(unknownProvider.coverageStatus, "not_supported");
  assert.equal(inspectFiscalBatchText("evil.xml", "<!DOCTYPE x [<!ENTITY y SYSTEM 'file:///etc/passwd'>]><NFe/>").status, "blocked");
});

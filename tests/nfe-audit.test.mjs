import assert from "node:assert/strict";
import test from "node:test";
import { createFiscalDossierSnapshot } from "../domain/fiscal-dossier.ts";
import { evaluateFiscalQuestion } from "../domain/fiscal-intelligence.ts";
import { auditNfeXml, compareNfeToDossier, nfeAccessKeyIsValid, publicNfeAudit } from "../domain/nfe-audit.ts";

function accessKey() {
  const base = "3526071234567800019555001000000123112345678";
  let weight = 2;
  let sum = 0;
  for (let index = base.length - 1; index >= 0; index -= 1) {
    sum += Number(base[index]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const remainder = sum % 11;
  return `${base}${remainder === 0 || remainder === 1 ? 0 : 11 - remainder}`;
}

function validXml({ productTotal = "1000.00", declaredIcms = "120.00", protocol = true } = {}) {
  const key = accessKey();
  const nfe = `<NFe xmlns="http://www.portalfiscal.inf.br/nfe"><infNFe versao="4.00" Id="NFe${key}"><ide><cUF>35</cUF><natOp>Venda de mercadoria</natOp><mod>55</mod><serie>1</serie><nNF>123</nNF><dhEmi>2026-07-16T12:00:00-03:00</dhEmi><tpAmb>1</tpAmb></ide><emit><CNPJ>12345678000195</CNPJ><xNome>Autopeças Paulista Ltda</xNome><enderEmit><UF>SP</UF></enderEmit></emit><dest><CNPJ>98765432000110</CNPJ><xNome>Comercial Mineira Ltda</xNome><enderDest><UF>MG</UF></enderDest></dest><det nItem="1"><prod><cProd>P001</cProd><xProd>Partes e acessórios de veículos</xProd><NCM>87089990</NCM><CEST>0107500</CEST><CFOP>6101</CFOP><uCom>UN</uCom><qCom>1.0000</qCom><vProd>1000.00</vProd><indTot>1</indTot></prod><imposto><ICMS><ICMS00><orig>0</orig><CST>00</CST><vBC>1000.00</vBC><pICMS>12.00</pICMS><vICMS>120.00</vICMS><vBCST>1843.50</vBCST><pICMSST>18.00</pICMSST><vICMSST>211.83</vICMSST><vFCPST>0.00</vFCPST></ICMS00></ICMS><IBSCBS><CST>000</CST><cClassTrib>000001</cClassTrib><gIBSCBS><vBC>1000.00</vBC><gIBSUF><pIBSUF>0.10</pIBSUF><vIBSUF>1.00</vIBSUF></gIBSUF><gCBS><pCBS>0.90</pCBS><vCBS>9.00</vCBS></gCBS></gIBSCBS></IBSCBS></imposto></det><total><ICMSTot><vProd>${productTotal}</vProd><vICMS>${declaredIcms}</vICMS><vST>211.83</vST><vFCPST>0.00</vFCPST><vNF>1211.83</vNF></ICMSTot></total></infNFe><Signature><SignedInfo><CanonicalizationMethod Algorithm="test" /></SignedInfo><SignatureValue>TESTE</SignatureValue></Signature></NFe>`;
  if (!protocol) return `<?xml version="1.0" encoding="UTF-8"?>${nfe}`;
  return `<?xml version="1.0" encoding="UTF-8"?><nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">${nfe}<protNFe versao="4.00"><infProt><tpAmb>1</tpAmb><verAplic>TESTE</verAplic><chNFe>${key}</chNFe><dhRecbto>2026-07-16T12:00:05-03:00</dhRecbto><nProt>135260000000001</nProt><digVal>TESTE</digVal><cStat>100</cStat><xMotivo>Autorizado o uso da NF-e</xMotivo></infProt></protNFe></nfeProc>`;
}

const dossierFacts = {
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

const dossierInputs = {
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

test("valida chave de acesso com módulo 11", () => {
  assert.equal(accessKey().length, 44);
  assert.equal(nfeAccessKeyIsValid(accessKey()), true);
  assert.equal(nfeAccessKeyIsValid(`${accessKey().slice(0, 43)}9`), false);
});

test("extrai NF-e autorizada por item com ICMS, ST, IBS e CBS", async () => {
  const audit = await auditNfeXml(validXml());
  assert.equal(audit.status, "structurally_consistent");
  assert.equal(audit.authorization.authorized, true);
  assert.equal(audit.header.accessKey, accessKey());
  assert.equal(audit.header.issuerState, "SP");
  assert.equal(audit.header.recipientState, "MG");
  assert.equal(audit.items.length, 1);
  assert.equal(audit.items[0].ncm, "87089990");
  assert.equal(audit.items[0].cest, "0107500");
  assert.equal(audit.items[0].icmsRateBps, 1_200);
  assert.equal(audit.items[0].stValueCents, 21_183);
  assert.equal(audit.items[0].ibsValueCents, 100);
  assert.equal(audit.items[0].cbsValueCents, 900);
  assert.equal(audit.totals.declaredProductCents, 100_000);
  assert.match(audit.sourceHash, /^[0-9a-f]{64}$/);
});

test("bloqueia divergência entre soma dos itens e total declarado", async () => {
  const audit = await auditNfeXml(validXml({ productTotal: "999.00" }));
  assert.equal(audit.status, "blocked");
  assert.ok(audit.issues.some((current) => current.code === "NFE-TOTAL-PRODUCT-MISMATCH"));
});

test("respeita indTot e bloqueia divergência do ICMS agregado", async () => {
  const excluded = await auditNfeXml(validXml({ productTotal: "0.00" }).replace("<indTot>1</indTot>", "<indTot>0</indTot>"));
  assert.equal(excluded.totals.itemProductSumCents, 0);
  assert.ok(!excluded.issues.some((current) => current.code === "NFE-TOTAL-PRODUCT-MISMATCH"));
  const mismatch = await auditNfeXml(validXml({ declaredIcms: "119.99" }));
  assert.equal(mismatch.status, "blocked");
  assert.ok(mismatch.issues.some((current) => current.code === "NFE-TOTAL-VICMS-MISMATCH"));
});

test("XML sem protocolo não comprova autorização", async () => {
  const audit = await auditNfeXml(validXml({ protocol: false }));
  assert.equal(audit.documentType, "nfe_without_protocol");
  assert.equal(audit.status, "blocked");
  assert.ok(audit.issues.some((current) => current.code === "NFE-PROTOCOL-MISSING"));
});

test("DOCTYPE e entidades são recusados antes do parser", async () => {
  const unsafe = validXml().replace("<nfeProc", "<!DOCTYPE x [<!ENTITY data SYSTEM 'file:///etc/passwd'>]><nfeProc");
  await assert.rejects(() => auditNfeXml(unsafe), /unsafe_xml_declaration/);
});

test("comparação documental reconcilia rota, classificação, alíquota e ST", async () => {
  const audit = await auditNfeXml(validXml());
  const determination = evaluateFiscalQuestion("Qual a alíquota de ICMS para autopeças de SP para MG?", dossierFacts);
  const { snapshot, inputHash } = await createFiscalDossierSnapshot("Qual a alíquota de ICMS para autopeças de SP para MG?", determination, dossierInputs, "2026-07-16T12:00:00.000Z");
  const comparison = compareNfeToDossier(audit, "dossier-1", inputHash, snapshot);
  assert.equal(comparison.status, "aligned");
  assert.equal(comparison.divergentCount, 0);
  assert.ok(comparison.checks.every((check) => check.status === "match"));
});

test("resposta pública mascara identificadores fiscais e preserva rastreabilidade", async () => {
  const publicAudit = publicNfeAudit(await auditNfeXml(validXml()));
  assert.equal(publicAudit.header.issuerTaxId, undefined);
  assert.equal(publicAudit.header.recipientTaxId, undefined);
  assert.equal(publicAudit.header.accessKey, "352607**************550010000001231123456787");
  assert.equal(publicAudit.header.issuerTaxIdMasked, "12***0195");
  assert.equal(publicAudit.header.recipientTaxIdMasked, "98***0110");
  assert.doesNotMatch(JSON.stringify(publicAudit), /12345678000195|98765432000110/);
});

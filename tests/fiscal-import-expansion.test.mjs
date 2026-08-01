import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { inspectFiscalBatchText } from "../domain/fiscal-batch-import.ts";
import { fiscalImportCorpusCases, fiscalImportCorpusMetrics, validateFiscalImportCorpus } from "../domain/fiscal-import-corpus.ts";
import { reconcileNfeWithExistingEngines } from "../domain/fiscal-import-reconciliation.ts";
import { auditNfeXml } from "../domain/nfe-audit.ts";

const base = new URL("../examples/fiscal-import-corpus/v1/", import.meta.url);
const fixture = (name) => readFile(new URL(name, base), "utf8");

test("corpus sintético versionado possui 306 expectativas e nenhum documento real", async () => {
  const validation = validateFiscalImportCorpus();
  assert.equal(validation.passed, true, validation.errors.join("\n"));
  assert.deepEqual(fiscalImportCorpusMetrics(), {
    version: "fiscal-import-corpus.2026-08-01.v2",
    files: 6,
    cases: 306,
    positive: 102,
    negative: 102,
    incomplete: 102,
    rawDocumentsPersisted: 0,
  });
  const manifest = JSON.parse(await fixture("manifest.json"));
  assert.equal(manifest.synthetic, true);
  assert.equal(manifest.anonymized, true);
  assert.equal(manifest.containsRealDocuments, false);
});

test("NF-e cobre FCP próprio, DIFAL e devolução em centavos", async () => {
  const sale = await fixture("nfe-sale.xml");
  const withDifal = sale
    .replace("</ICMS></imposto>", "</ICMS><ICMSUFDest><vFCPUFDest>20.00</vFCPUFDest><vICMSUFDest>60.00</vICMSUFDest><vICMSUFRemet>0.00</vICMSUFRemet></ICMSUFDest></imposto>")
    .replace("<vNF>1211.83</vNF>", "<vFCPUFDest>20.00</vFCPUFDest><vICMSUFDest>60.00</vICMSUFDest><vICMSUFRemet>0.00</vICMSUFRemet><vNF>1211.83</vNF>");
  const audit = await auditNfeXml(withDifal);
  assert.equal(audit.items[0].fcpValueCents, 0);
  assert.equal(audit.items[0].difalFcpValueCents, 2_000);
  assert.equal(audit.items[0].difalDestinationValueCents, 6_000);
  assert.equal(audit.totals.difalDestinationCents, 6_000);
  const returned = await auditNfeXml(await fixture("nfe-return.xml"));
  assert.equal(returned.header.isReturn, true);
  assert.equal(returned.header.finalityCode, "4");
  assert.ok(!returned.issues.some((item) => item.code === "NFE-RETURN-CFOP-NOT-LOCATED"));
});

test("NFS-e extrai município, item, partes, retenções e consulta motores existentes", async () => {
  const result = inspectFiscalBatchText("nfse-national.xml", await fixture("nfse-national.xml"));
  assert.equal(result.status, "accepted");
  assert.equal(result.summary.municipalityCode, "3550308");
  assert.equal(result.summary.serviceCode, "17.01");
  assert.equal(result.summary.issRetained, true);
  assert.equal(result.summary.providerTaxIdPresent, true);
  assert.equal(result.summary.takerTaxIdPresent, true);
  assert.equal(result.summary.irrfCents, 1_500);
  assert.equal(result.engineReconciliations.length, 2);
  assert.ok(result.engineReconciliations.every((item) => item.engineVersion && item.resultCode));
  assert.doesNotMatch(JSON.stringify(result), /00000000000000|11111111111111/);
});

test("SPED concilia documentos, apuração, blocos e divergências prioritárias", async () => {
  const accepted = inspectFiscalBatchText("sped-efd-valid.txt", await fixture("sped-efd-valid.txt"));
  assert.equal(accepted.status, "accepted");
  assert.equal(accepted.summary.documentRecords, 2);
  assert.equal(accepted.summary.assessmentRecords, 2);
  assert.equal(accepted.summary.divergenceCount, 0);
  assert.equal(accepted.engineReconciliations[0].status, "matched");
  const incomplete = inspectFiscalBatchText("sped-efd-incomplete.txt", await fixture("sped-efd-incomplete.txt"));
  assert.equal(incomplete.status, "blocked");
  assert.ok(incomplete.engineReconciliations[0].blockers.length > 0);
});

test("306 casos positivos, negativos e incompletos são reexecutados com expectativa explícita", async () => {
  const nfe = await fixture("nfe-sale.xml");
  const nfse = await fixture("nfse-national.xml");
  const sped = await fixture("sped-efd-valid.txt");
  let executed = 0;
  const inputFingerprints = new Set();
  for (const current of fiscalImportCorpusCases) {
    const seed = String(current.seed).padStart(3, "0");
    if (current.documentType === "nfe") {
      const seeded = nfe.replace("<natOp>VENDA SINTETICA</natOp>", `<natOp>VENDA SINTETICA ${seed}</natOp>`);
      const xml = current.expectation === "positive"
        ? seeded
        : current.expectation === "negative"
          ? seeded.replace("<vProd>1000.00</vProd><vICMS>", "<vProd>999.99</vProd><vICMS>")
          : seeded.replace("<NCM>87089990</NCM>", "");
      inputFingerprints.add(createHash("sha256").update(xml).digest("hex"));
      const audit = await auditNfeXml(xml);
      assert.equal(current.expectation === "positive" ? audit.status !== "blocked" : audit.status === "blocked", true, current.code);
      assert.ok(reconcileNfeWithExistingEngines(audit).length > 0, current.code);
    } else if (current.documentType === "nfse") {
      const seeded = nfse.replace("<nNFSe>9001</nNFSe>", `<nNFSe>9${seed}</nNFSe>`);
      const xml = current.expectation === "positive"
        ? seeded
        : current.expectation === "negative"
          ? seeded.replace("<vServ>1000.00</vServ>", "<vServ>INVALIDO</vServ>")
          : seeded.replace("<cLocIncid>3550308</cLocIncid>", "");
      inputFingerprints.add(createHash("sha256").update(xml).digest("hex"));
      const inspected = inspectFiscalBatchText(`${current.code}.xml`, xml);
      assert.equal(current.expectation === "positive" ? inspected.status !== "blocked" : inspected.status === "blocked", true, current.code);
    } else {
      const seeded = sped.replace("|SINTETICA|", `|SINTETICA-${seed}|`).replace("|C100|0|1|SYN|", `|C100|0|1|SYN-${seed}|`);
      const txt = current.expectation === "positive"
        ? seeded
        : current.expectation === "negative"
          ? seeded.replace("|9999|14|", "|9999|99|")
          : seeded.replace(/^\|0000\|.*\r?\n/m, "");
      inputFingerprints.add(createHash("sha256").update(txt).digest("hex"));
      const inspected = inspectFiscalBatchText(`${current.code}.txt`, txt);
      assert.equal(current.expectation === "positive" ? inspected.status !== "blocked" : inspected.status === "blocked", true, current.code);
    }
    executed += 1;
  }
  assert.equal(executed, 306);
  assert.equal(inputFingerprints.size, 306);
});

test("API descarta o bruto e publica rejeições, ausências e conciliações minimizadas", async () => {
  const route = await readFile(new URL("../app/api/fiscal-imports/route.ts", import.meta.url), "utf8");
  assert.match(route, /rawFilesPersisted:\s*false/);
  assert.match(route, /VALUES \([\s\S]*?\?, 0, 0, \?, \?, \?, \?, \?, \?\)/);
  assert.match(route, /rejections:/);
  assert.match(route, /missingData:/);
  assert.match(route, /engineReconciliations:/);
  assert.match(route, /documentEvidence:/);
  assert.doesNotMatch(route, /INSERT INTO fiscal_import_(?:items|batches)[\s\S]{0,600}(?:raw_xml|raw_text|raw_bytes|file_content)/i);
});

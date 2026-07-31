import assert from "node:assert/strict";
import test from "node:test";

import { assessFederalPme, federalPmeRules, federalPmeSources, hashFederalPmeCatalog, parseFederalPmeProfile } from "../domain/federal-pme-compliance.ts";

const base = { regime: "simples", hasEmployees: false, paysIndividuals: false, hasServiceWithholdings: false, hiresLaborAssignmentOrConstruction: false, manufacturesOrImports: false, usesListedTaxBenefits: false, hasFederalTaxesOutsideUnifiedRegime: false, subjectToCprb: false, issuesFiscalDocuments: true, distributesProfits: false, inactive: false, keepsFullAccounting: true };

test("V82 federal PME catalog links every control to checked official evidence", () => {
  assert.equal(federalPmeRules.length, 32);
  assert.ok(federalPmeSources.length >= 20);
  const sourceCodes = new Set(federalPmeSources.map((source) => source.code));
  assert.ok(federalPmeRules.every((rule) => rule.sourceCodes.length > 0 && rule.sourceCodes.every((code) => sourceCodes.has(code))));
  assert.ok(federalPmeRules.every((rule) => rule.evidence.length >= 2 && rule.action.length > 30 && rule.deadline.length > 5));
  assert.ok(federalPmeSources.every((source) => /^https:\/\/(www\.)?(gov\.br|planalto\.gov\.br|normas\.receita\.fazenda\.gov\.br)/.test(source.url)));
});

test("Simples receives its own declarations without inheriting ECF and EFD-Contribuicoes", () => {
  const result = assessFederalPme({ ...base, regime: "simples" });
  assert.equal(result.items.find((item) => item.code === "SIMPLES-PGDAS-D")?.status, "required");
  assert.equal(result.items.find((item) => item.code === "SIMPLES-DEFIS")?.status, "required");
  assert.equal(result.items.find((item) => item.code === "ECF")?.status, "not_applicable");
  assert.equal(result.items.find((item) => item.code === "EFD-CONTRIBUTIONS")?.status, "not_applicable");
  assert.equal(result.items.find((item) => item.code === "DTE-MONITORING")?.status, "required");
});

test("Lucro Real opens corporate tax, SPED and MIT controls", () => {
  const result = assessFederalPme({ ...base, regime: "real", manufacturesOrImports: true, hasFederalTaxesOutsideUnifiedRegime: true });
  for (const code of ["IRPJ-CSLL", "PIS-COFINS", "IPI-TIPI", "EFD-CONTRIBUTIONS", "ECD", "ECF", "MIT-FEDERAL-TAXES", "DCTFWEB-GENERAL"]) assert.equal(result.items.find((item) => item.code === code)?.status, "required", code);
});

test("Payroll and service facts activate only their specific federal trails", () => {
  const result = assessFederalPme({ ...base, hasEmployees: true, hiresLaborAssignmentOrConstruction: true });
  for (const code of ["ESOCIAL-NONPERIODIC", "ESOCIAL-PAYROLL", "ESOCIAL-SST", "FGTS-DIGITAL", "PAYROLL-DCTFWEB", "EFD-REINF-R2000", "INSS-SERVICES"]) assert.equal(result.items.find((item) => item.code === code)?.status, "required", code);
  assert.equal(result.items.find((item) => item.code === "DIRBI")?.status, "not_applicable");
});

test("MEI keeps annual and monthly controls while blocking unrelated corporate filings", () => {
  const result = assessFederalPme({ ...base, regime: "mei", issuesFiscalDocuments: false });
  assert.equal(result.items.find((item) => item.code === "MEI-DAS")?.status, "required");
  assert.equal(result.items.find((item) => item.code === "MEI-DASN-SIMEI")?.status, "required");
  assert.equal(result.items.find((item) => item.code === "IRPJ-CSLL")?.status, "not_applicable");
  assert.equal(result.items.find((item) => item.code === "ECF")?.status, "not_applicable");
});

test("profile parser rejects partial or ambiguous facts and the catalog hash detects changes", async () => {
  assert.throws(() => parseFederalPmeProfile({ regime: "simples" }), /invalid_/);
  assert.throws(() => parseFederalPmeProfile({ ...base, regime: "unknown" }), /invalid_regime/);
  assert.match(await hashFederalPmeCatalog(), /^[0-9a-f]{64}$/);
});

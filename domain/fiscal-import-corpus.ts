export const FISCAL_IMPORT_CORPUS_VERSION = "fiscal-import-corpus.2026-08-01.v2";

const dimensions = {
  nfe: ["authorization", "access_key", "model", "series", "number", "issue_datetime", "environment", "issuer", "recipient", "origin_state", "destination_state", "cfop", "cst_csosn", "ncm", "cest", "quantity", "unit_value", "product_total", "icms_base", "icms_rate", "icms_value", "st_base", "st_rate", "st_value", "fcp", "difal", "return", "invoice_totals", "signature", "protocol", "ibs_cbs", "tax_classification", "item_count", "rounding"],
  nfse: ["namespace", "number", "municipality", "service_item", "municipal_code", "competence", "provider", "taker", "provider_tax_id", "taker_tax_id", "service_amount", "iss_retained", "iss_base", "iss_rate", "iss_value", "irrf", "inss", "pis", "cofins", "csll", "federal_retention", "deduction", "discount", "conditional_discount", "unconditional_discount", "withheld_total", "net_value", "construction_code", "service_country", "exigibility", "process", "rps", "provider_regime", "rounding"],
  sped: ["opening", "layout", "purpose", "period", "company", "tax_id", "state", "municipality", "profile", "participants", "units", "items", "observations", "c100", "c170", "c190", "c195", "c197", "d100", "d190", "e100", "e110", "e111", "e115", "e116", "h005", "block_zero", "block_c", "block_d", "block_e", "block_h", "block_nine", "file_totals", "rounding"],
} as const;

export const fiscalImportCorpusFiles = [
  { filename: "nfe-sale.xml", type: "nfe", classification: "positive" },
  { filename: "nfe-return.xml", type: "nfe", classification: "positive" },
  { filename: "nfse-national.xml", type: "nfse", classification: "positive" },
  { filename: "nfse-incomplete.xml", type: "nfse", classification: "incomplete" },
  { filename: "sped-efd-valid.txt", type: "sped", classification: "positive" },
  { filename: "sped-efd-incomplete.txt", type: "sped", classification: "incomplete" },
] as const;

export const fiscalImportCorpusCases = (Object.entries(dimensions) as Array<[keyof typeof dimensions, readonly string[]]>).flatMap(([documentType, fields]) =>
  fields.flatMap((dimension, dimensionIndex) => (["positive", "negative", "incomplete"] as const).map((expectation) => ({
    code: `${documentType.toUpperCase()}-${dimension.toUpperCase()}-${expectation.toUpperCase()}`,
    documentType,
    dimension,
    expectation,
    expectedOutcome: expectation === "positive" ? "reproducible_evidence" as const : "safe_block" as const,
    nature: expectation === "positive" ? "valid" as const : expectation === "negative" ? "divergent" as const : "missing_required_fact" as const,
    effectiveDate: "2026-08-01",
    seed: dimensionIndex + 1,
    inputVectorKey: `${documentType}:${dimension}:${expectation}:${dimensionIndex + 1}`,
    rawDocumentPersisted: false,
  }))),
);

export function fiscalImportCorpusMetrics() {
  return {
    version: FISCAL_IMPORT_CORPUS_VERSION,
    files: fiscalImportCorpusFiles.length,
    cases: fiscalImportCorpusCases.length,
    positive: fiscalImportCorpusCases.filter((item) => item.expectation === "positive").length,
    negative: fiscalImportCorpusCases.filter((item) => item.expectation === "negative").length,
    incomplete: fiscalImportCorpusCases.filter((item) => item.expectation === "incomplete").length,
    rawDocumentsPersisted: 0,
  };
}

export function validateFiscalImportCorpus() {
  const errors: string[] = [];
  const metrics = fiscalImportCorpusMetrics();
  if (metrics.cases < 300) errors.push("minimum_300_cases_not_reached");
  if (new Set(fiscalImportCorpusCases.map((item) => item.code)).size !== fiscalImportCorpusCases.length) errors.push("duplicate_case_code");
  if (new Set(fiscalImportCorpusCases.map((item) => item.inputVectorKey)).size !== fiscalImportCorpusCases.length) errors.push("duplicate_input_vector");
  if (fiscalImportCorpusCases.some((item) => !item.expectedOutcome || !item.nature || !item.effectiveDate || item.seed < 1)) errors.push("case_contract_incomplete");
  if (fiscalImportCorpusCases.some((item) => item.rawDocumentPersisted)) errors.push("raw_document_marked_as_persisted");
  for (const type of Object.keys(dimensions)) {
    const cases = fiscalImportCorpusCases.filter((item) => item.documentType === type);
    if (!cases.some((item) => item.expectation === "positive") || !cases.some((item) => item.expectation === "negative") || !cases.some((item) => item.expectation === "incomplete")) errors.push(`${type}:expectation_mix_missing`);
  }
  return { passed: errors.length === 0, errors, metrics };
}

export async function hashFiscalImportCorpus() {
  const payload = JSON.stringify({ version: FISCAL_IMPORT_CORPUS_VERSION, files: fiscalImportCorpusFiles, cases: fiscalImportCorpusCases });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export const FISCAL_IMPORT_CORPUS_VERSION = "fiscal-import-corpus.2026-07-31.v1";

const dimensions = {
  nfe: ["authorization", "access_key", "cfop", "cst_csosn", "ncm", "cest", "icms", "st", "fcp", "difal", "return", "totals"],
  nfse: ["municipality", "service_item", "municipal_code", "competence", "provider", "taker", "iss_retained", "iss_base", "iss_value", "irrf", "inss", "federal_retention"],
  sped: ["opening", "period", "participants", "items", "c100", "c190", "d100", "d190", "e100", "e110", "adjustments", "block_totals"],
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
  fields.flatMap((dimension) => (["positive", "negative", "incomplete"] as const).map((expectation) => ({
    code: `${documentType.toUpperCase()}-${dimension.toUpperCase()}-${expectation.toUpperCase()}`,
    documentType,
    dimension,
    expectation,
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
  if (metrics.cases < 100) errors.push("minimum_100_cases_not_reached");
  if (new Set(fiscalImportCorpusCases.map((item) => item.code)).size !== fiscalImportCorpusCases.length) errors.push("duplicate_case_code");
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

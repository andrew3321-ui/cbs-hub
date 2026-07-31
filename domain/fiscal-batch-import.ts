import { XMLParser, XMLValidator } from "fast-xml-parser";
import {
  reconcileNfseWithExistingEngines,
  reconcileSpedWithExistingEngines,
  type FiscalImportEngineReconciliation,
} from "./fiscal-import-reconciliation.ts";

export const FISCAL_BATCH_PROFILE_VERSION = "fiscal-batch.v3";
export const FISCAL_BATCH_EVIDENCE_VERSION = "fiscal-import-evidence.v2";
export const FISCAL_BATCH_MAX_FILES = 25;
export const FISCAL_BATCH_MAX_FILE_BYTES = 5_000_000;
export const FISCAL_BATCH_MAX_TOTAL_BYTES = 30_000_000;

export type FiscalBatchType = "nfe" | "nfse" | "sped" | "unknown";
export type FiscalBatchStatus = "accepted" | "warning" | "blocked";
export type FiscalBatchIssue = {
  code: string;
  severity: "blocker" | "warning" | "info";
  category: "structure" | "schema" | "period" | "totals" | "coverage" | "security" | "calculation_gate";
  message: string;
};
export type FiscalBatchInspection = {
  documentType: FiscalBatchType;
  status: FiscalBatchStatus;
  profileVersion: string;
  evidenceVersion: string;
  adapterCode: string | null;
  adapterVersion: string | null;
  coverageStatus: "supported" | "partial" | "not_supported";
  municipalityCode: string | null;
  competenceStart: string | null;
  competenceEnd: string | null;
  summary: Record<string, string | number | boolean | null>;
  issueDetails: FiscalBatchIssue[];
  issues: string[];
  missingFields: string[];
  engineReconciliations: FiscalImportEngineReconciliation[];
  calculationEligible: false;
  calculationBlockers: string[];
  officialSourceCodes: string[];
};

export const fiscalImportOfficialSources = [
  {
    code: "NFSE-NATIONAL-XSD-1.01",
    title: "NFS-e padrão nacional · documentação e esquemas XSD de produção",
    url: "https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual/documentacao-atual",
    checkedAt: "2026-07-26",
  },
  {
    code: "SPED-EFD-GUIDE-3.2.2",
    title: "EFD ICMS/IPI · Guia Prático 3.2.2 · leiaute 2026",
    url: "https://sped.rfb.gov.br/item/show/1573",
    checkedAt: "2026-07-26",
  },
] as const;

export const nfseAdapterCatalog = [
  {
    code: "nfse-national-1.01",
    provider: "Sistema Nacional NFS-e",
    standard: "NFS-e padrão nacional",
    version: "1.01",
    status: "supported",
    sourceCode: "NFSE-NATIONAL-XSD-1.01",
  },
  {
    code: "abrasf-2.04-generic",
    provider: "Implementação municipal/provedor",
    standard: "ABRASF",
    version: "2.04",
    status: "partial",
    sourceCode: null,
  },
  {
    code: "municipal-provider-unknown",
    provider: "Provedor municipal não identificado",
    standard: "proprietário",
    version: "unknown",
    status: "not_supported",
    sourceCode: null,
  },
] as const;

function issue(
  code: string,
  severity: FiscalBatchIssue["severity"],
  category: FiscalBatchIssue["category"],
  message: string,
): FiscalBatchIssue {
  return { code, severity, category, message };
}

function result(
  values: Omit<FiscalBatchInspection, "profileVersion" | "evidenceVersion" | "issues" | "missingFields" | "engineReconciliations" | "calculationEligible" | "calculationBlockers"> & {
    engineReconciliations?: FiscalImportEngineReconciliation[];
  },
): FiscalBatchInspection {
  const blockers = values.issueDetails.filter((item) => item.severity === "blocker").map((item) => item.message);
  return {
    ...values,
    profileVersion: FISCAL_BATCH_PROFILE_VERSION,
    evidenceVersion: FISCAL_BATCH_EVIDENCE_VERSION,
    issues: values.issueDetails.map((item) => item.message),
    missingFields: values.issueDetails.filter((item) => /MISSING|AUSENT|NOT-INFORMED/.test(item.code)).map((item) => item.code),
    engineReconciliations: values.engineReconciliations ?? [],
    calculationEligible: false,
    calculationBlockers: [
      ...blockers,
      "Documento importado é evidência; somente um dossiê fiscal versionado e revisado pode alimentar cálculo final.",
    ],
  };
}

function blockedUnknown(filename: string, detail: FiscalBatchIssue) {
  return result({
    documentType: "unknown",
    status: "blocked",
    adapterCode: null,
    adapterVersion: null,
    coverageStatus: "not_supported",
    municipalityCode: null,
    competenceStart: null,
    competenceEnd: null,
    summary: { filename },
    issueDetails: [detail],
    officialSourceCodes: [],
  });
}

function unsafeXml(text: string) {
  return /<!DOCTYPE|<!ENTITY|<\?xml-stylesheet/i.test(text) || text.includes("\0");
}

function tag(text: string, names: string[]) {
  for (const name of names) {
    const match = text.match(new RegExp(`<(?:(?:\\w+):)?${name}(?:\\s[^>]*)?>([^<]{0,500})<\\/(?:(?:\\w+):)?${name}>`, "i"));
    if (match) return match[1].trim();
  }
  return null;
}

function digits(value: string | null) {
  const normalized = value?.replace(/\D/g, "") ?? "";
  return normalized || null;
}

function isoDateFromSped(value: string | undefined) {
  if (!value || !/^\d{8}$/.test(value)) return null;
  const day = Number(value.slice(0, 2));
  const month = Number(value.slice(2, 4));
  const year = Number(value.slice(4, 8));
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

function localizedMoneyCents(value: string | undefined) {
  if (value === undefined || value === "") return 0;
  const normalized = value.replace(/\./g, "").replace(",", ".");
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const negative = normalized.startsWith("-");
  const [whole, decimal = ""] = normalized.replace("-", "").split(".");
  const cents = Number(whole) * 100 + Number(decimal.padEnd(2, "0"));
  return Number.isSafeInteger(cents) ? (negative ? -cents : cents) : null;
}

function forEachLine(text: string, visit: (line: string) => void) {
  let start = 0;
  for (let index = 0; index <= text.length; index += 1) {
    if (index !== text.length && text.charCodeAt(index) !== 10) continue;
    let line = text.slice(start, index);
    if (line.endsWith("\r")) line = line.slice(0, -1);
    if (line) visit(line);
    start = index + 1;
  }
}

function inspectSped(filename: string, text: string): FiscalBatchInspection {
  const records = new Map<string, string[][]>();
  const seenCodes = new Set<string>();
  const blockCounts = new Map<string, number>();
  const issueDetails: FiscalBatchIssue[] = [];
  const trackedCodes = new Set([
    "0000", "0001", "0150", "0190", "0200", "0460", "0990", "C001", "C100", "C170", "C190", "C195", "C197", "C990",
    "D001", "D100", "D190", "D990", "E001", "E100", "E110", "E111", "E115", "E116", "E990", "H001", "H005", "H990",
    "9001", "9990", "9999",
  ]);
  let lineCount = 0;
  let malformedLines = 0;

  forEachLine(text, (line) => {
    lineCount += 1;
    if (!line.startsWith("|") || !line.endsWith("|")) {
      malformedLines += 1;
      return;
    }
    const fields = line.split("|");
    const code = fields[1] ?? "";
    if (!/^[0-9A-Z]{4}$/.test(code)) {
      malformedLines += 1;
      return;
    }
    seenCodes.add(code);
    const block = code.charAt(0);
    if (!(code === "9999")) blockCounts.set(block, (blockCounts.get(block) ?? 0) + 1);
    if (!trackedCodes.has(code)) return;
    const bucket = records.get(code) ?? [];
    bucket.push(fields);
    records.set(code, bucket);
  });

  if (malformedLines) issueDetails.push(issue("SPED-LINE-MALFORMED", "blocker", "structure", `${malformedLines} linha(s) não seguem a estrutura delimitada oficial.`));
  const opening = records.get("0000")?.[0];
  const closing = records.get("9999")?.[0];
  if (!opening || !closing) issueDetails.push(issue("SPED-OPEN-CLOSE-MISSING", "blocker", "structure", "Registros 0000 e 9999 são obrigatórios."));

  const start = isoDateFromSped(opening?.[4]);
  const end = isoDateFromSped(opening?.[5]);
  if (opening && (!start || !end || start > end)) issueDetails.push(issue("SPED-PERIOD-INVALID", "blocker", "period", "O período DT_INI/DT_FIN do registro 0000 é inválido."));

  const declaredLines = closing?.[2] && /^\d+$/.test(closing[2]) ? Number(closing[2]) : null;
  if (closing && declaredLines === null) issueDetails.push(issue("SPED-LINE-COUNT-INVALID", "blocker", "totals", "QTD_LIN do registro 9999 não é um inteiro válido."));
  else if (declaredLines !== null && declaredLines !== lineCount) issueDetails.push(issue("SPED-LINE-COUNT-MISMATCH", "blocker", "totals", `O registro 9999 declara ${declaredLines} linhas, mas o arquivo contém ${lineCount}.`));

  const blockPairs = [
    ["0", "0001", "0990"],
    ["C", "C001", "C990"],
    ["E", "E001", "E990"],
    ["H", "H001", "H990"],
    ["9", "9001", "9990"],
  ] as const;
  let reconciledBlocks = 0;
  for (const [block, openCode, closeCode] of blockPairs) {
    const hasAny = Array.from(seenCodes).some((code) => code.startsWith(block));
    if (!hasAny) continue;
    const blockOpen = records.get(openCode)?.[0];
    const blockClose = records.get(closeCode)?.[0];
    if (!blockOpen || !blockClose) {
      issueDetails.push(issue(`SPED-BLOCK-${block}-BOUNDARY-MISSING`, "blocker", "structure", `Bloco ${block} possui registros sem abertura ${openCode} e fechamento ${closeCode}.`));
      continue;
    }
    const declared = blockClose[2] && /^\d+$/.test(blockClose[2]) ? Number(blockClose[2]) : null;
    const actual = blockCounts.get(block) ?? 0;
    if (declared === null || declared !== actual) {
      issueDetails.push(issue(`SPED-BLOCK-${block}-COUNT-MISMATCH`, "blocker", "totals", `Fechamento do bloco ${block} não concilia: declarado ${declared ?? "inválido"}, encontrado ${actual}.`));
    } else {
      reconciledBlocks += 1;
    }
  }

  const sumField = (code: string, index: number) => {
    let total = 0;
    for (const fields of records.get(code) ?? []) {
      const cents = localizedMoneyCents(fields[index]);
      if (cents === null) {
        issueDetails.push(issue(`SPED-${code}-MONEY-INVALID`, "blocker", "totals", `Campo monetário prioritário do registro ${code} não pôde ser convertido em centavos.`));
      } else {
        total += cents;
      }
    }
    return total;
  };
  const c190OperationCents = sumField("C190", 5);
  const c190IcmsCents = sumField("C190", 7);
  const c190StCents = sumField("C190", 9);
  const e110 = records.get("E110")?.[0];
  const e110IcmsPayableCents = e110 ? localizedMoneyCents(e110[11]) : null;
  if (e110 && e110IcmsPayableCents === null) issueDetails.push(issue("SPED-E110-MONEY-INVALID", "blocker", "totals", "VL_ICMS_RECOLHER do registro E110 não pôde ser convertido em centavos."));

  const priorityCodes = ["C100", "C170", "C190", "C195", "C197", "D100", "D190", "E100", "E110", "E111", "E115", "E116", "H005"];
  const blockers = issueDetails.some((item) => item.severity === "blocker");
  const documentRecords = ["C100", "C170", "C190", "C195", "C197", "D100", "D190"].reduce((sum, code) => sum + (records.get(code)?.length ?? 0), 0);
  const assessmentRecords = ["E100", "E110", "E111", "E115", "E116"].reduce((sum, code) => sum + (records.get(code)?.length ?? 0), 0);
  const divergenceCount = issueDetails.filter((item) => item.category === "totals" || /MISMATCH|DIVERG/.test(item.code)).length;
  if (!blockers) issueDetails.push(issue("SPED-STRUCTURAL-SCOPE", "info", "schema", "Estrutura, período e fechamentos foram conciliados; o conteúdo fiscal continua sujeito ao Guia Prático do perfil e período."));
  return result({
    documentType: "sped",
    status: blockers ? "blocked" : "accepted",
    adapterCode: "efd-icms-ipi-priority-blocks",
    adapterVersion: "layout-020-guide-3.2.2",
    coverageStatus: "partial",
    municipalityCode: digits(opening?.[11] ?? null),
    competenceStart: start,
    competenceEnd: end,
    summary: {
      filename,
      layoutVersion: opening?.[2] ?? null,
      lines: lineCount,
      reconciledBlocks,
      priorityRecords: priorityCodes.reduce((sum, code) => sum + (records.get(code)?.length ?? 0), 0),
      c100Documents: records.get("C100")?.length ?? 0,
      c170Items: records.get("C170")?.length ?? 0,
      c190OperationCents,
      c190IcmsCents,
      c190StCents,
      e110IcmsPayableCents,
      documentRecords,
      assessmentRecords,
      divergenceCount,
    },
    issueDetails,
    engineReconciliations: reconcileSpedWithExistingEngines({ documentRecords, assessmentRecords, divergenceCount }),
    officialSourceCodes: ["SPED-EFD-GUIDE-3.2.2"],
  });
}

function parseXml(text: string) {
  const validation = XMLValidator.validate(text, { allowBooleanAttributes: false });
  if (validation !== true) return null;
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    removeNSPrefix: true,
    trimValues: true,
    parseTagValue: false,
    parseAttributeValue: false,
    processEntities: false,
    allowBooleanAttributes: false,
  });
  return parser.parse(text) as Record<string, unknown>;
}

function inspectNfse(filename: string, text: string): FiscalBatchInspection {
  const issueDetails: FiscalBatchIssue[] = [];
  const nationalNamespace = /xmlns(?::\w+)?=["'][^"']*(?:sped\.fazenda\.gov\.br\/nfse|gov\.br\/nfse)[^"']*["']/i.test(text);
  const declared204 = /(?:versao|versão)=["']2\.04["']/i.test(text);
  const abrasfSignature = /<(?:\w+:)?(?:CompNfse|InfNfse|ListaNfse|GerarNfseResposta)\b/i.test(text)
    && /<(?:\w+:)?(?:CodigoVerificacao|IdentificacaoRps|ItemListaServico)\b/i.test(text);
  const parsed = parseXml(text);
  if (!parsed) issueDetails.push(issue("NFSE-XML-MALFORMED", "blocker", "structure", "XML de NFS-e não está bem-formado."));

  const adapter = nationalNamespace
    ? nfseAdapterCatalog[0]
    : abrasfSignature
      ? nfseAdapterCatalog[1]
      : nfseAdapterCatalog[2];
  if (adapter.status === "not_supported") issueDetails.push(issue("NFSE-ADAPTER-UNKNOWN", "blocker", "coverage", "O padrão/provedor municipal da NFS-e não foi identificado; o documento não será interpretado."));
  else if (adapter.status === "partial") issueDetails.push(issue("NFSE-ADAPTER-PARTIAL", "warning", "coverage", `Leiaute ABRASF ${declared204 ? "2.04" : "compatível"} reconhecido, mas customizações do provedor municipal exigem adaptador específico.`));

  const municipalityCode = digits(tag(text, ["cLocIncid", "CodigoMunicipioIncidencia", "CodigoMunicipio", "CodigoMunicipioGerador"]));
  if (!municipalityCode || municipalityCode.length !== 7) issueDetails.push(issue("NFSE-MUNICIPALITY-MISSING", "blocker", "coverage", "Código IBGE de município com 7 dígitos não foi localizado."));
  const competence = tag(text, ["dCompet", "Competencia", "DataEmissao"]);
  if (!competence) issueDetails.push(issue("NFSE-COMPETENCE-MISSING", "blocker", "period", "Competência ou data de emissão não foi localizada."));
  const serviceCode = tag(text, ["cTribNac", "ItemListaServico", "CodigoTributacaoMunicipio"]);
  const providerTaxId = digits(tag(text, ["CNPJPrestador", "CpfCnpjPrestador", "CNPJ", "CPF"]));
  const takerTaxId = digits(tag(text, ["CNPJTomador", "CpfCnpjTomador", "CpfCnpj"]));
  const retainedText = tag(text, ["ISSRetido", "issRetido", "tpRetISSQN"]);
  const retained = retainedText === null ? null : ["1", "true", "sim"].includes(retainedText.toLowerCase());
  if (!providerTaxId) issueDetails.push(issue("NFSE-PROVIDER-TAX-ID-MISSING", "blocker", "schema", "Identificador fiscal do prestador não foi localizado."));
  if (!takerTaxId) issueDetails.push(issue("NFSE-TAKER-TAX-ID-MISSING", "warning", "schema", "Identificador fiscal do tomador não foi localizado."));
  if (retained === null) issueDetails.push(issue("NFSE-ISS-WITHHOLDING-MISSING", "warning", "coverage", "Indicador de retenção do ISS não foi localizado."));
  if (!serviceCode) issueDetails.push(issue("NFSE-SERVICE-CODE-MISSING", "blocker", "coverage", "Código nacional/municipal do serviço não foi localizado."));

  const amountText = tag(text, ["vServ", "ValorServicos"]);
  const baseText = tag(text, ["vBC", "BaseCalculo"]);
  const issText = tag(text, ["vISSQN", "ValorIss"]);
  const federalRetentions = {
    irrfCents: localizedMoneyCents(tag(text, ["vIR", "ValorIr"])?.replace(".", ",")),
    inssCents: localizedMoneyCents(tag(text, ["vINSS", "ValorInss"])?.replace(".", ",")),
    pisCents: localizedMoneyCents(tag(text, ["vPIS", "ValorPis"])?.replace(".", ",")),
    cofinsCents: localizedMoneyCents(tag(text, ["vCOFINS", "ValorCofins"])?.replace(".", ",")),
    csllCents: localizedMoneyCents(tag(text, ["vCSLL", "ValorCsll"])?.replace(".", ",")),
  };
  const serviceCents = localizedMoneyCents(amountText?.replace(".", ","));
  const baseCents = localizedMoneyCents(baseText?.replace(".", ","));
  const issCents = localizedMoneyCents(issText?.replace(".", ","));
  if (amountText && serviceCents === null) issueDetails.push(issue("NFSE-SERVICE-AMOUNT-INVALID", "blocker", "totals", "Valor dos serviços não pôde ser convertido deterministicamente em centavos."));
  if (baseText && baseCents === null) issueDetails.push(issue("NFSE-BASE-AMOUNT-INVALID", "blocker", "totals", "Base do ISS não pôde ser convertida deterministicamente em centavos."));
  if (issText && issCents === null) issueDetails.push(issue("NFSE-ISS-AMOUNT-INVALID", "blocker", "totals", "Valor do ISS não pôde ser convertido deterministicamente em centavos."));

  if (nationalNamespace) issueDetails.push(issue("NFSE-NATIONAL-XSD-PROFILE", "info", "schema", "Namespace nacional reconhecido no perfil XSD 1.01; esta etapa valida estrutura crítica, não toda regra de negócio municipal."));
  const blockers = issueDetails.some((item) => item.severity === "blocker");
  const warnings = issueDetails.some((item) => item.severity === "warning");
  return result({
    documentType: "nfse",
    status: blockers ? "blocked" : warnings ? "warning" : "accepted",
    adapterCode: adapter.code,
    adapterVersion: adapter.version,
    coverageStatus: adapter.status,
    municipalityCode,
    competenceStart: competence,
    competenceEnd: competence,
    summary: {
      filename,
      adapter: adapter.code,
      provider: adapter.provider,
      municipalityCode,
      municipalityLayoutCoverage: adapter.status,
      number: tag(text, ["nNFSe", "Numero", "NumeroNfse"]),
      competence,
      serviceCode,
      serviceCents,
      issBaseCents: baseCents,
      issCents,
      issRetained: retained,
      providerTaxIdPresent: Boolean(providerTaxId),
      takerTaxIdPresent: Boolean(takerTaxId),
      ...federalRetentions,
    },
    issueDetails,
    engineReconciliations: reconcileNfseWithExistingEngines({ municipalityCode, serviceCode, retained }),
    officialSourceCodes: adapter.sourceCode ? [adapter.sourceCode] : [],
  });
}

export function inspectFiscalBatchText(filename: string, text: string): FiscalBatchInspection {
  const trimmed = text.trim();
  if (!trimmed) return blockedUnknown(filename, issue("FILE-EMPTY", "blocker", "structure", "Arquivo vazio."));
  if (trimmed.startsWith("|")) return inspectSped(filename, trimmed);
  if (!trimmed.startsWith("<")) return blockedUnknown(filename, issue("FORMAT-UNKNOWN", "blocker", "structure", "Formato não reconhecido. Envie XML de NF-e/NFS-e ou TXT SPED."));
  if (unsafeXml(trimmed)) return blockedUnknown(filename, issue("XML-UNSAFE", "blocker", "security", "XML inseguro: DOCTYPE, entidade, stylesheet ou byte nulo não são aceitos."));

  const isNfe = /<(?:\w+:)?(?:nfeProc|NFe)\b/i.test(trimmed) && /<(?:\w+:)?infNFe\b/i.test(trimmed);
  if (isNfe) {
    return result({
      documentType: "nfe",
      status: "warning",
      adapterCode: "nfe-detailed-auditor-required",
      adapterVersion: null,
      coverageStatus: "partial",
      municipalityCode: null,
      competenceStart: null,
      competenceEnd: null,
      summary: { filename },
      issueDetails: [issue("NFE-DETAILED-AUDIT-REQUIRED", "warning", "schema", "NF-e reconhecida; execute o auditor detalhado antes de registrar a evidência.")],
      officialSourceCodes: [],
    });
  }

  const isNfse = /<(?:\w+:)?(?:CompNfse|NFS-e|NFSe|infNFSe|InfNfse|DPS|ListaNfse|GerarNfseResposta)\b/i.test(trimmed);
  if (isNfse) return inspectNfse(filename, trimmed);
  return blockedUnknown(filename, issue("XML-ROOT-UNKNOWN", "blocker", "structure", "XML não contém raiz reconhecida de NF-e ou NFS-e."));
}

export async function sha256BatchSource(bytes: Uint8Array | string) {
  const input = typeof bytes === "string" ? new TextEncoder().encode(bytes) : bytes;
  const buffer = input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength) as ArrayBuffer;
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

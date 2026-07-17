export const FISCAL_BATCH_PROFILE_VERSION = "fiscal-batch.v1";
export const FISCAL_BATCH_MAX_FILES = 25;
export const FISCAL_BATCH_MAX_FILE_BYTES = 5_000_000;
export const FISCAL_BATCH_MAX_TOTAL_BYTES = 30_000_000;

export type FiscalBatchType = "nfe" | "nfse" | "sped" | "unknown";
export type FiscalBatchStatus = "accepted" | "warning" | "blocked";
export type FiscalBatchInspection = {
  documentType: FiscalBatchType;
  status: FiscalBatchStatus;
  profileVersion: string;
  summary: Record<string, string | number | boolean | null>;
  issues: string[];
};

function unsafeXml(text: string) {
  return /<!DOCTYPE|<!ENTITY|<\?xml-stylesheet/i.test(text);
}

function tag(text: string, names: string[]) {
  for (const name of names) {
    const match = text.match(new RegExp(`<(?:(?:\\w+):)?${name}(?:\\s[^>]*)?>([^<]{0,500})<\\/(?:(?:\\w+):)?${name}>`, "i"));
    if (match) return match[1].trim();
  }
  return null;
}

export function inspectFiscalBatchText(filename: string, text: string): FiscalBatchInspection {
  const trimmed = text.trim();
  if (!trimmed) return { documentType: "unknown", status: "blocked", profileVersion: FISCAL_BATCH_PROFILE_VERSION, summary: {}, issues: ["Arquivo vazio."] };

  if (trimmed.startsWith("|")) {
    const lines = trimmed.split(/\r?\n/).filter(Boolean);
    const opening = lines.some((line) => /^\|0000\|/.test(line));
    const closing = lines.some((line) => /^\|9999\|/.test(line));
    const blocks = Array.from(new Set(lines.map((line) => line.split("|")[1]?.charAt(0)).filter((value) => /^[0-9A-Z]$/.test(value ?? ""))));
    return {
      documentType: "sped",
      status: opening && closing ? "accepted" : "blocked",
      profileVersion: FISCAL_BATCH_PROFILE_VERSION,
      summary: { filename, lines: lines.length, blocks: blocks.join(", "), hasOpening: opening, hasClosing: closing },
      issues: opening && closing ? ["Estrutura delimitada reconhecida; validação integral depende do leiaute e perfil do período."] : ["Registros 0000 e 9999 são obrigatórios para reconhecer o arquivo SPED."],
    };
  }

  if (!trimmed.startsWith("<")) return { documentType: "unknown", status: "blocked", profileVersion: FISCAL_BATCH_PROFILE_VERSION, summary: { filename }, issues: ["Formato não reconhecido. Envie XML de NF-e/NFS-e ou TXT SPED."] };
  if (unsafeXml(trimmed)) return { documentType: "unknown", status: "blocked", profileVersion: FISCAL_BATCH_PROFILE_VERSION, summary: { filename }, issues: ["XML inseguro: DOCTYPE, entidade ou stylesheet não são aceitos."] };

  const isNfe = /<(?:\w+:)?(?:nfeProc|NFe)\b/i.test(trimmed) && /<(?:\w+:)?infNFe\b/i.test(trimmed);
  if (isNfe) return {
    documentType: "nfe", status: "accepted", profileVersion: FISCAL_BATCH_PROFILE_VERSION,
    summary: { filename, model: tag(trimmed, ["mod"]), accessKey: tag(trimmed, ["chNFe"]), issuerState: tag(trimmed, ["UF"]), itemCount: (trimmed.match(/<(?:\w+:)?det\b/gi) ?? []).length },
    issues: ["NF-e reconhecida. A auditoria detalhada permanece no importador de NF-e homologado."],
  };

  const isNfse = /<(?:\w+:)?(?:CompNfse|NFS-e|NFSe|infNFSe|InfNfse|DPS)\b/i.test(trimmed);
  if (isNfse) return {
    documentType: "nfse", status: "warning", profileVersion: FISCAL_BATCH_PROFILE_VERSION,
    summary: { filename, number: tag(trimmed, ["nNFSe", "Numero", "NumeroNfse"]), competence: tag(trimmed, ["dCompet", "Competencia"]), serviceCode: tag(trimmed, ["cTribNac", "ItemListaServico", "CodigoTributacaoMunicipio"]), municipality: tag(trimmed, ["cLocIncid", "CodigoMunicipio", "CodigoMunicipioIncidencia"]) },
    issues: ["NFS-e reconhecida em triagem multi-leiaute.", "Alíquota e município de incidência não são concluídos sem validar o padrão e a lei municipal."],
  };

  return { documentType: "unknown", status: "blocked", profileVersion: FISCAL_BATCH_PROFILE_VERSION, summary: { filename }, issues: ["XML não contém raiz reconhecida de NF-e ou NFS-e."] };
}

export async function sha256BatchSource(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

import { XMLParser, XMLValidator } from "fast-xml-parser";
import type { FiscalDossierSnapshot } from "./fiscal-dossier";

export const NFE_AUDIT_PROFILE_VERSION = "cbshub-nfe-structural-2026.1";
export const NFE_MAX_XML_BYTES = 5 * 1024 * 1024;
export const NFE_MAX_ITEMS = 500;

export const nfeAuditSources = [
  {
    code: "NFE-MOC-7-ANEXO-I",
    title: "MOC 7.0 · Anexo I · Leiaute e regras de validação da NF-e/NFC-e",
    url: "https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=J+I+v4eN00E%3D",
    checkedAt: "2026-07-16",
  },
  {
    code: "NFE-SCHEMAS-OFFICIAL",
    title: "Portal NF-e · versões oficiais dos schemas XML",
    url: "https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=BMPFMBoln3w%3D",
    checkedAt: "2026-07-16",
  },
  {
    code: "NFE-NT-2025-002",
    title: "Nota Técnica 2025.002 · adequação NF-e/NFC-e à RTC",
    url: "https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=6WfrpZYE4Ik%3D",
    checkedAt: "2026-07-16",
  },
] as const;

export type NfeAuditIssue = {
  code: string;
  severity: "blocker" | "warning" | "info";
  scope: "document" | "authorization" | "totals" | "item" | "security" | "comparison";
  message: string;
  path: string | null;
  itemNumber: number | null;
};

export type NfeAuditItem = {
  itemNumber: number;
  productCode: string | null;
  description: string | null;
  ncm: string | null;
  cest: string | null;
  cfop: string | null;
  originCode: string | null;
  cst: string | null;
  csosn: string | null;
  quantity: string | null;
  unit: string | null;
  includeInInvoiceTotal: boolean;
  productValueCents: number | null;
  icmsBaseCents: number | null;
  icmsRateBps: number | null;
  icmsValueCents: number | null;
  stBaseCents: number | null;
  stRateBps: number | null;
  stValueCents: number | null;
  fcpStValueCents: number | null;
  ibsValueCents: number | null;
  cbsValueCents: number | null;
  rtcClassCode: string | null;
  trace: Record<string, string>;
};

export type NfeAuditResult = {
  profileVersion: string;
  sourceHash: string;
  status: "structurally_consistent" | "validated_with_warnings" | "blocked";
  statusLabel: string;
  documentType: "nfe_proc" | "nfe_without_protocol";
  schemaVersion: string | null;
  assurance: "deterministic_structural_profile";
  header: {
    accessKey: string | null;
    model: string | null;
    series: string | null;
    number: string | null;
    issuedAt: string | null;
    environment: "production" | "homologation" | "unknown";
    operationNature: string | null;
    issuerName: string | null;
    issuerTaxId: string | null;
    issuerState: string | null;
    recipientName: string | null;
    recipientTaxId: string | null;
    recipientState: string | null;
  };
  authorization: {
    protocol: string | null;
    statusCode: string | null;
    statusReason: string | null;
    authorized: boolean;
    receivedAt: string | null;
  };
  totals: {
    itemProductSumCents: number;
    declaredProductCents: number | null;
    invoiceCents: number | null;
    declaredIcmsCents: number | null;
    declaredStCents: number | null;
    declaredFcpStCents: number | null;
    icmsCents: number;
    stCents: number;
    fcpStCents: number;
    ibsCents: number;
    cbsCents: number;
  };
  items: NfeAuditItem[];
  issues: NfeAuditIssue[];
  checks: Array<{ code: string; label: string; status: "passed" | "warning" | "blocked"; detail: string }>;
  sources: typeof nfeAuditSources;
  limitations: string[];
};

export type NfeDossierComparison = {
  status: "aligned" | "divergent" | "not_compared";
  statusLabel: string;
  dossierId: string | null;
  dossierHash: string | null;
  checks: Array<{
    code: string;
    label: string;
    xmlValue: string;
    dossierValue: string;
    status: "match" | "divergent" | "not_comparable";
    detail: string;
  }>;
  divergentCount: number;
};

type XmlRecord = Record<string, unknown>;

function record(value: unknown): XmlRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as XmlRecord : {};
}

function array(value: unknown) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function scalar(value: unknown) {
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function childText(parent: unknown, key: string) {
  return scalar(record(parent)[key]);
}

function digits(value: string | null) {
  return value?.replace(/\D/g, "") || null;
}

function normalizedCode(value: string | null) {
  return value?.replace(/[^0-9A-Za-z]/g, "").toUpperCase() || null;
}

function moneyCents(value: unknown) {
  const text = scalar(value);
  if (!text || !/^\d{1,13}(?:\.\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ""] = text.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(cents) ? cents : null;
}

function rateBps(value: unknown) {
  const text = scalar(value);
  if (!text || !/^\d{1,3}(?:\.\d{1,4})?$/.test(text)) return null;
  const rate = Number(text);
  const bps = Math.round(rate * 100);
  return Number.isSafeInteger(bps) && bps >= 0 && bps <= 100_000 ? bps : null;
}

function issue(code: string, severity: NfeAuditIssue["severity"], scope: NfeAuditIssue["scope"], message: string, path: string | null = null, itemNumber: number | null = null): NfeAuditIssue {
  return { code, severity, scope, message, path, itemNumber };
}

function sha256Hex(value: string) {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)).then((digest) => Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join(""));
}

export function nfeAccessKeyIsValid(value: string) {
  if (!/^\d{44}$/.test(value)) return false;
  const base = value.slice(0, 43);
  let weight = 2;
  let sum = 0;
  for (let index = base.length - 1; index >= 0; index -= 1) {
    sum += Number(base[index]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const remainder = sum % 11;
  const expected = remainder === 0 || remainder === 1 ? 0 : 11 - remainder;
  return expected === Number(value[43]);
}

function findIcmsGroup(imposto: XmlRecord) {
  const icms = record(imposto.ICMS);
  for (const [name, value] of Object.entries(icms)) {
    const group = record(value);
    if (name.startsWith("ICMS") && Object.keys(group).length) return { name, group };
  }
  return { name: null, group: {} as XmlRecord };
}

function rtcValues(imposto: XmlRecord) {
  const ibsCbs = record(imposto.IBSCBS);
  const group = record(ibsCbs.gIBSCBS);
  const ibsUf = record(group.gIBSUF);
  const ibsMun = record(group.gIBSMun);
  const cbs = record(group.gCBS);
  const explicitIbs = moneyCents(group.vIBS);
  const ibsValueCents = explicitIbs ?? ((moneyCents(ibsUf.vIBSUF) ?? 0) + (moneyCents(ibsMun.vIBSMun) ?? 0));
  return {
    ibsValueCents: Object.keys(ibsCbs).length ? ibsValueCents : null,
    cbsValueCents: Object.keys(ibsCbs).length ? moneyCents(cbs.vCBS) : null,
    rtcClassCode: childText(ibsCbs, "cClassTrib"),
  };
}

function extractItem(value: unknown, fallbackNumber: number): NfeAuditItem {
  const det = record(value);
  const prod = record(det.prod);
  const imposto = record(det.imposto);
  const { group: icms } = findIcmsGroup(imposto);
  const rtc = rtcValues(imposto);
  const itemNumberText = scalar(det["@_nItem"]);
  const itemNumber = itemNumberText && /^\d+$/.test(itemNumberText) ? Number(itemNumberText) : fallbackNumber;
  return {
    itemNumber,
    productCode: childText(prod, "cProd"),
    description: childText(prod, "xProd"),
    ncm: normalizedCode(childText(prod, "NCM")),
    cest: normalizedCode(childText(prod, "CEST")),
    cfop: normalizedCode(childText(prod, "CFOP")),
    originCode: childText(icms, "orig"),
    cst: childText(icms, "CST"),
    csosn: childText(icms, "CSOSN"),
    quantity: childText(prod, "qCom"),
    unit: childText(prod, "uCom"),
    includeInInvoiceTotal: childText(prod, "indTot") !== "0",
    productValueCents: moneyCents(prod.vProd),
    icmsBaseCents: moneyCents(icms.vBC),
    icmsRateBps: rateBps(icms.pICMS),
    icmsValueCents: moneyCents(icms.vICMS),
    stBaseCents: moneyCents(icms.vBCST),
    stRateBps: rateBps(icms.pICMSST),
    stValueCents: moneyCents(icms.vICMSST),
    fcpStValueCents: moneyCents(icms.vFCPST),
    ibsValueCents: rtc.ibsValueCents,
    cbsValueCents: rtc.cbsValueCents,
    rtcClassCode: rtc.rtcClassCode,
    trace: {
      product: `NFe.infNFe.det[${itemNumber}].prod`,
      icms: `NFe.infNFe.det[${itemNumber}].imposto.ICMS`,
      rtc: `NFe.infNFe.det[${itemNumber}].imposto.IBSCBS`,
    },
  };
}

export async function auditNfeXml(xml: string): Promise<NfeAuditResult> {
  if (typeof xml !== "string" || xml.length < 200 || new TextEncoder().encode(xml).byteLength > NFE_MAX_XML_BYTES) throw new Error("invalid_xml_size");
  if (/<!DOCTYPE|<!ENTITY|<\?xml-stylesheet/i.test(xml) || xml.includes("\0")) throw new Error("unsafe_xml_declaration");
  const validation = XMLValidator.validate(xml, { allowBooleanAttributes: false });
  if (validation !== true) throw new Error("malformed_xml");
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
  const parsed = record(parser.parse(xml));
  const proc = record(parsed.nfeProc);
  const nfe = Object.keys(proc).length ? record(proc.NFe) : record(parsed.NFe);
  const documentType: NfeAuditResult["documentType"] = Object.keys(proc).length ? "nfe_proc" : "nfe_without_protocol";
  if (!Object.keys(nfe).length) throw new Error("unsupported_xml_root");
  const infNfe = record(nfe.infNFe);
  if (!Object.keys(infNfe).length) throw new Error("missing_inf_nfe");
  const ide = record(infNfe.ide);
  const emit = record(infNfe.emit);
  const dest = record(infNfe.dest);
  const emitAddress = record(emit.enderEmit);
  const destAddress = record(dest.enderDest);
  const protocol = record(record(proc.protNFe).infProt);
  const declaredTotals = record(record(infNfe.total).ICMSTot);
  const rawItems = array(infNfe.det);
  if (rawItems.length > NFE_MAX_ITEMS) throw new Error("too_many_nfe_items");
  const items = rawItems.map((item, index) => extractItem(item, index + 1));
  const issues: NfeAuditIssue[] = [];
  const schemaVersion = scalar(infNfe["@_versao"]);
  const idAccessKey = scalar(infNfe["@_Id"])?.replace(/^NFe/i, "") ?? null;
  const protocolAccessKey = digits(childText(protocol, "chNFe"));
  const accessKey = protocolAccessKey ?? (idAccessKey && /^\d{44}$/.test(idAccessKey) ? idAccessKey : null);
  const model = childText(ide, "mod");
  const authorizationCode = childText(protocol, "cStat");
  const authorized = authorizationCode === "100" || authorizationCode === "150";

  if (schemaVersion !== "4.00") issues.push(issue("NFE-SCHEMA-UNSUPPORTED", "blocker", "document", "Somente NF-e versão 4.00 está coberta pelo perfil estrutural atual.", "NFe.infNFe.@versao"));
  if (model !== "55") issues.push(issue("NFE-MODEL-UNSUPPORTED", "blocker", "document", "O arquivo não é uma NF-e modelo 55.", "NFe.infNFe.ide.mod"));
  if (!accessKey || !nfeAccessKeyIsValid(accessKey)) issues.push(issue("NFE-ACCESS-KEY-INVALID", "blocker", "document", "A chave de acesso não possui 44 dígitos válidos ou falhou no dígito verificador.", "NFe.infNFe.@Id"));
  if (idAccessKey && protocolAccessKey && idAccessKey !== protocolAccessKey) issues.push(issue("NFE-ACCESS-KEY-MISMATCH", "blocker", "authorization", "A chave da NF-e difere da chave registrada no protocolo.", "nfeProc.protNFe.infProt.chNFe"));
  if (documentType === "nfe_without_protocol") issues.push(issue("NFE-PROTOCOL-MISSING", "blocker", "authorization", "O XML não contém protocolo de autorização; o conteúdo isolado da NF-e não prova autorização.", "nfeProc.protNFe"));
  else if (!authorized) issues.push(issue("NFE-NOT-AUTHORIZED", "blocker", "authorization", `O protocolo informa cStat ${authorizationCode ?? "ausente"}, não reconhecido como autorização.`, "nfeProc.protNFe.infProt.cStat"));
  if (!record(nfe.Signature).SignedInfo && !record(nfe.Signature).SignatureValue) issues.push(issue("NFE-SIGNATURE-NOT-LOCATED", "warning", "security", "A assinatura XML não foi localizada no arquivo.", "NFe.Signature"));
  if (!items.length) issues.push(issue("NFE-ITEMS-MISSING", "blocker", "item", "Nenhum item foi encontrado na NF-e.", "NFe.infNFe.det"));

  for (const item of items) {
    if (!item.ncm) issues.push(issue("NFE-ITEM-NCM-MISSING", "blocker", "item", "O item não possui NCM utilizável.", `${item.trace.product}.NCM`, item.itemNumber));
    if (!item.cfop) issues.push(issue("NFE-ITEM-CFOP-MISSING", "blocker", "item", "O item não possui CFOP utilizável.", `${item.trace.product}.CFOP`, item.itemNumber));
    if (!item.cst && !item.csosn) issues.push(issue("NFE-ITEM-TAX-SITUATION-MISSING", "blocker", "item", "O item não possui CST nem CSOSN de ICMS.", item.trace.icms, item.itemNumber));
    if (!item.cest) issues.push(issue("NFE-ITEM-CEST-NOT-INFORMED", "warning", "item", "CEST não informado; confirme se a mercadoria está fora da obrigação ou se o dado está ausente.", `${item.trace.product}.CEST`, item.itemNumber));
    if (item.productValueCents === null) issues.push(issue("NFE-ITEM-VALUE-MISSING", "blocker", "item", "O valor total do produto não pôde ser lido.", `${item.trace.product}.vProd`, item.itemNumber));
  }

  const itemNumbers = items.map((item) => item.itemNumber);
  if (new Set(itemNumbers).size !== itemNumbers.length || itemNumbers.some((value) => !Number.isSafeInteger(value) || value <= 0)) issues.push(issue("NFE-ITEM-NUMBER-INVALID", "blocker", "item", "A sequência de itens contém número ausente, inválido ou repetido.", "NFe.infNFe.det.@nItem"));

  const itemProductSumCents = items.filter((item) => item.includeInInvoiceTotal).reduce((sum, item) => sum + (item.productValueCents ?? 0), 0);
  const declaredProductCents = moneyCents(declaredTotals.vProd);
  const invoiceCents = moneyCents(declaredTotals.vNF);
  const icmsCents = items.reduce((sum, item) => sum + (item.icmsValueCents ?? 0), 0);
  const stCents = items.reduce((sum, item) => sum + (item.stValueCents ?? 0), 0);
  const fcpStCents = items.reduce((sum, item) => sum + (item.fcpStValueCents ?? 0), 0);
  const declaredIcmsCents = moneyCents(declaredTotals.vICMS);
  const declaredStCents = moneyCents(declaredTotals.vST);
  const declaredFcpStCents = moneyCents(declaredTotals.vFCPST);
  if (declaredProductCents === null) issues.push(issue("NFE-TOTAL-PRODUCT-MISSING", "blocker", "totals", "O total declarado de produtos não pôde ser lido.", "NFe.infNFe.total.ICMSTot.vProd"));
  else if (declaredProductCents !== itemProductSumCents) issues.push(issue("NFE-TOTAL-PRODUCT-MISMATCH", "blocker", "totals", "A soma dos itens diverge do total de produtos da NF-e.", "NFe.infNFe.total.ICMSTot.vProd"));
  if (invoiceCents === null) issues.push(issue("NFE-INVOICE-TOTAL-MISSING", "blocker", "totals", "O valor total da NF-e não pôde ser lido.", "NFe.infNFe.total.ICMSTot.vNF"));
  const taxTotalChecks = [
    ["ICMS", "vICMS", declaredIcmsCents, icmsCents],
    ["ICMS-ST", "vST", declaredStCents, stCents],
    ["FCP-ST", "vFCPST", declaredFcpStCents, fcpStCents],
  ] as const;
  for (const [label, field, declared, summed] of taxTotalChecks) {
    if (declared === null) issues.push(issue(`NFE-TOTAL-${field.toUpperCase()}-MISSING`, "blocker", "totals", `O total declarado de ${label} não pôde ser lido.`, `NFe.infNFe.total.ICMSTot.${field}`));
    else if (declared !== summed) issues.push(issue(`NFE-TOTAL-${field.toUpperCase()}-MISMATCH`, "blocker", "totals", `A soma de ${label} dos itens diverge do total declarado.`, `NFe.infNFe.total.ICMSTot.${field}`));
  }
  if (!items.some((item) => item.ibsValueCents !== null || item.cbsValueCents !== null)) issues.push(issue("NFE-RTC-FIELDS-NOT-LOCATED", "info", "document", "Nenhum grupo IBS/CBS foi localizado nos itens; isso pode refletir o leiaute, a operação ou o período do documento.", "NFe.infNFe.det.imposto.IBSCBS"));

  const blockerCount = issues.filter((current) => current.severity === "blocker").length;
  const warningCount = issues.filter((current) => current.severity === "warning").length;
  const status: NfeAuditResult["status"] = blockerCount ? "blocked" : warningCount ? "validated_with_warnings" : "structurally_consistent";
  const sourceHash = await sha256Hex(xml);
  return {
    profileVersion: NFE_AUDIT_PROFILE_VERSION,
    sourceHash,
    status,
    statusLabel: status === "blocked" ? "Documento bloqueado" : status === "validated_with_warnings" ? "Estrutura consistente · revisar alertas" : "Estrutura consistente",
    documentType,
    schemaVersion,
    assurance: "deterministic_structural_profile",
    header: {
      accessKey,
      model,
      series: childText(ide, "serie"),
      number: childText(ide, "nNF"),
      issuedAt: childText(ide, "dhEmi") ?? childText(ide, "dEmi"),
      environment: childText(ide, "tpAmb") === "1" ? "production" : childText(ide, "tpAmb") === "2" ? "homologation" : "unknown",
      operationNature: childText(ide, "natOp"),
      issuerName: childText(emit, "xNome"),
      issuerTaxId: normalizedCode(childText(emit, "CNPJ") ?? childText(emit, "CPF")),
      issuerState: childText(emitAddress, "UF"),
      recipientName: childText(dest, "xNome"),
      recipientTaxId: normalizedCode(childText(dest, "CNPJ") ?? childText(dest, "CPF") ?? childText(dest, "idEstrangeiro")),
      recipientState: childText(destAddress, "UF"),
    },
    authorization: {
      protocol: childText(protocol, "nProt"),
      statusCode: authorizationCode,
      statusReason: childText(protocol, "xMotivo"),
      authorized,
      receivedAt: childText(protocol, "dhRecbto"),
    },
    totals: {
      itemProductSumCents,
      declaredProductCents,
      invoiceCents,
      declaredIcmsCents,
      declaredStCents,
      declaredFcpStCents,
      icmsCents,
      stCents,
      fcpStCents,
      ibsCents: items.reduce((sum, item) => sum + (item.ibsValueCents ?? 0), 0),
      cbsCents: items.reduce((sum, item) => sum + (item.cbsValueCents ?? 0), 0),
    },
    items,
    issues,
    checks: [
      { code: "CHECK-XML-SYNTAX", label: "Sintaxe XML", status: "passed", detail: "XML bem-formado e sem DOCTYPE, entidades ou stylesheet." },
      { code: "CHECK-ACCESS-KEY", label: "Chave de acesso", status: issues.some((current) => current.code.startsWith("NFE-ACCESS-KEY")) ? "blocked" : "passed", detail: "Dígito verificador e vínculo com o protocolo." },
      { code: "CHECK-AUTHORIZATION", label: "Protocolo", status: issues.some((current) => ["NFE-PROTOCOL-MISSING", "NFE-NOT-AUTHORIZED"].includes(current.code)) ? "blocked" : "passed", detail: authorized ? `cStat ${authorizationCode} · autorizado` : "Autorização não comprovada." },
      { code: "CHECK-TOTALS", label: "Fechamento dos itens", status: issues.some((current) => current.scope === "totals" && current.severity === "blocker") ? "blocked" : "passed", detail: `${items.length} item(ns) conciliado(s) com vProd.` },
      { code: "CHECK-CLASSIFICATION", label: "Classificação fiscal", status: issues.some((current) => current.scope === "item" && current.severity === "blocker") ? "blocked" : issues.some((current) => current.scope === "item" && current.severity === "warning") ? "warning" : "passed", detail: "NCM, CEST, CFOP e CST/CSOSN separados por item." },
    ],
    sources: nfeAuditSources,
    limitations: [
      "O perfil executa validação sintática e regras estruturais críticas; não substitui a validação integral contra todos os XSDs oficiais.",
      "A presença da assinatura é identificada, mas a cadeia criptográfica do certificado digital ainda não é verificada nesta versão.",
      "Eventos posteriores, como cancelamento, carta de correção e manifestação do destinatário, não são consultados automaticamente.",
      "A extração documental não decide sozinha o enquadramento tributário; divergências exigem revisão do contador.",
    ],
  };
}

function comparisonCheck(code: string, label: string, xmlValue: string, dossierValue: string, matches: boolean | null, detail: string): NfeDossierComparison["checks"][number] {
  return { code, label, xmlValue, dossierValue, status: matches === null ? "not_comparable" : matches ? "match" : "divergent", detail };
}

function formatBps(value: number | null) {
  return value === null ? "não informado" : `${(value / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

function formatMoney(value: number | null) {
  return value === null ? "não informado" : (value / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function compareNfeToDossier(audit: NfeAuditResult, dossierId: string, dossierHash: string, snapshot: FiscalDossierSnapshot): NfeDossierComparison {
  const checks: NfeDossierComparison["checks"] = [];
  const facts = snapshot.determination.facts;
  const expectedNcm = normalizedCode(facts.ncm);
  const expectedCest = normalizedCode(facts.cest);
  const itemNcms = Array.from(new Set(audit.items.map((item) => item.ncm).filter((value): value is string => Boolean(value))));
  const itemCests = Array.from(new Set(audit.items.map((item) => item.cest).filter((value): value is string => Boolean(value))));
  checks.push(comparisonCheck("COMPARE-ORIGIN", "UF de origem", audit.header.issuerState ?? "ausente", facts.originState ?? "ausente", Boolean(audit.header.issuerState && facts.originState && audit.header.issuerState === facts.originState), "Compara endereço do emitente com a rota congelada."));
  checks.push(comparisonCheck("COMPARE-DESTINATION", "UF de destino", audit.header.recipientState ?? "ausente", facts.destinationState ?? "ausente", Boolean(audit.header.recipientState && facts.destinationState && audit.header.recipientState === facts.destinationState), "Compara endereço do destinatário com a rota congelada."));
  checks.push(comparisonCheck("COMPARE-NCM", "NCM", itemNcms.join(", ") || "ausente", expectedNcm ?? "não definido", expectedNcm ? itemNcms.some((ncm) => ncm.startsWith(expectedNcm) || expectedNcm.startsWith(ncm)) : null, "NCM genérico do dossiê pode corresponder ao prefixo do item."));
  checks.push(comparisonCheck("COMPARE-CEST", "CEST", itemCests.join(", ") || "ausente", expectedCest ?? "não definido", expectedCest ? itemCests.includes(expectedCest) : null, "CEST precisa coincidir exatamente quando definido."));
  const xmlRates = Array.from(new Set(audit.items.map((item) => item.icmsRateBps).filter((value): value is number => value !== null)));
  const expectedRate = snapshot.calculation.parameters.interstateRateBps;
  checks.push(comparisonCheck("COMPARE-ICMS-RATE", "Alíquota interestadual", xmlRates.map(formatBps).join(", ") || "ausente", formatBps(expectedRate), expectedRate === null ? null : xmlRates.length > 0 && xmlRates.every((rate) => rate === expectedRate), "Compara pICMS dos itens com a alíquota determinada no dossiê."));
  const operationPrice = snapshot.calculation.inputs.operationPriceCents;
  checks.push(comparisonCheck("COMPARE-OPERATION-VALUE", "Valor dos produtos", formatMoney(audit.totals.declaredProductCents), formatMoney(operationPrice), audit.totals.declaredProductCents === null ? null : Math.abs(audit.totals.declaredProductCents - operationPrice) <= 1, "Compara vProd com o preço praticado congelado; frete, IPI e despesas permanecem separados."));
  const xmlDestination = audit.totals.stCents + audit.totals.fcpStCents;
  const expectedDestination = snapshot.calculation.totals.destinationTotalCents;
  checks.push(comparisonCheck("COMPARE-ST-TOTAL", "ICMS-ST + FCP-ST", formatMoney(xmlDestination), formatMoney(expectedDestination), expectedDestination === null ? null : Math.abs(xmlDestination - expectedDestination) <= 1, "Comparação condicionada à correspondência integral entre os itens da NF-e e a memória."));
  const divergentCount = checks.filter((check) => check.status === "divergent").length;
  return {
    status: divergentCount ? "divergent" : checks.some((check) => check.status === "match") ? "aligned" : "not_compared",
    statusLabel: divergentCount ? `${divergentCount} divergência(s) documental(is)` : "Documento alinhado ao dossiê",
    dossierId,
    dossierHash,
    checks,
    divergentCount,
  };
}

export function maskTaxId(value: string | null) {
  if (!value) return null;
  if (value.length <= 6) return `***${value.slice(-2)}`;
  return `${value.slice(0, 2)}***${value.slice(-4)}`;
}

export function maskNfeAccessKey(value: string | null) {
  if (!value || !/^\d{44}$/.test(value)) return value;
  return `${value.slice(0, 6)}**************${value.slice(20)}`;
}

export function publicNfeAudit(audit: NfeAuditResult) {
  return {
    ...audit,
    header: {
      ...audit.header,
      accessKey: maskNfeAccessKey(audit.header.accessKey),
      issuerTaxId: undefined,
      recipientTaxId: undefined,
      issuerTaxIdMasked: maskTaxId(audit.header.issuerTaxId),
      recipientTaxIdMasked: maskTaxId(audit.header.recipientTaxId),
    },
  };
}

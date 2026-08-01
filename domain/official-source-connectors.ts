export const OFFICIAL_CONNECTOR_CONTRACT_VERSION = "official-connectors.v1";

export type OfficialConnectorId = "nfe" | "rtc" | "confaz" | "rfb" | "dou";
export type OfficialArtifactKind = "technical_release" | "calculator_release" | "legal_index" | "normative_index" | "official_gazette";
export type OfficialParseStatus = "parsed" | "contract_blocked" | "not_applicable";

export type OfficialConnectorContract = {
  id: OfficialConnectorId;
  name: string;
  sourceCodes: string[];
  officialHosts: string[];
  artifactKind: OfficialArtifactKind;
  acceptedContentTypes: string[];
  maxAttempts: number;
  maxBytes: number;
  parserVersion: string;
  versionPatterns: RegExp[];
  datePatterns: RegExp[];
  effectiveDatePatterns: RegExp[];
};

export type OfficialArtifactInspection = {
  connectorId: OfficialConnectorId | null;
  connectorName: string | null;
  artifactKind: OfficialArtifactKind | null;
  parserVersion: string | null;
  parseStatus: OfficialParseStatus;
  detectedVersion: string | null;
  publishedAt: string | null;
  effectiveFrom: string | null;
  contractErrors: string[];
  promotionStatus: "metadata_review" | "blocked_contract" | "not_applicable";
};

const commonDates = [
  /\b(\d{2})\/(\d{2})\/(20\d{2})\b/g,
  /\b(20\d{2})-(\d{2})-(\d{2})\b/g,
];

const explicitEffectiveDates = [
  /(?:vig[eê]ncia|vigente\s+a\s+partir\s+de|efeitos\s+a\s+partir\s+de)\s*[:\-]?\s*(\d{2})\/(\d{2})\/(20\d{2})/gi,
  /(?:vig[eê]ncia|effective(?:\s+from)?)\s*[:\-]?\s*(20\d{2})-(\d{2})-(\d{2})/gi,
];

export const officialConnectorContracts: OfficialConnectorContract[] = [
  {
    id: "nfe",
    name: "Portal Nacional da NF-e",
    sourceCodes: ["NFE-PORTAL"],
    officialHosts: ["nfe.fazenda.gov.br"],
    artifactKind: "technical_release",
    acceptedContentTypes: ["text/html", "application/xhtml+xml", "application/pdf", "application/zip", "application/xml", "text/xml"],
    maxAttempts: 2,
    maxBytes: 750_000,
    parserVersion: "nfe-index.v1",
    versionPatterns: [/(?:Nota\s+T[eé]cnica|NT)\s*(?:n[ºo.]\s*)?(20\d{2}[./_-]\d{3})(?:\s*[-–]?\s*v(?:ers[aã]o)?[.]?\s*([\d.]+[a-z]?))?/gi, /(?:MOC|Manual\s+de\s+Orienta[cç][aã]o)[^\d]{0,24}(\d+(?:\.\d+)+)/gi],
    datePatterns: commonDates,
    effectiveDatePatterns: explicitEffectiveDates,
  },
  {
    id: "rtc",
    name: "Calculadora oficial da Reforma Tributária do Consumo",
    sourceCodes: ["RTC-CALCULATOR"],
    officialHosts: ["gov.br", "www.gov.br", "consumo.tributos.gov.br", "piloto-cbs.tributos.gov.br"],
    artifactKind: "calculator_release",
    acceptedContentTypes: ["text/html", "application/xhtml+xml", "application/pdf", "application/json", "application/zip"],
    maxAttempts: 2,
    maxBytes: 750_000,
    parserVersion: "rtc-release.v1",
    versionPatterns: [/(?:Calculadora|motor|componente)[^\n<]{0,80}?v(?:ers[aã]o)?\s*([0-9]+(?:\.[0-9]+){1,3})/gi, /(?:release|vers[aã]o)\s*[:\-]?\s*(20\d{2}[.-]\d{1,2}(?:[.-]\d{1,2})?)/gi],
    datePatterns: commonDates,
    effectiveDatePatterns: explicitEffectiveDates,
  },
  {
    id: "confaz",
    name: "CONFAZ — legislação nacional",
    sourceCodes: ["CONFAZ"],
    officialHosts: ["confaz.fazenda.gov.br", "www.confaz.fazenda.gov.br", "gov.br", "www.gov.br"],
    artifactKind: "legal_index",
    acceptedContentTypes: ["text/html", "application/xhtml+xml", "application/pdf", "application/xml", "text/xml"],
    maxAttempts: 2,
    maxBytes: 750_000,
    parserVersion: "confaz-index.v1",
    versionPatterns: [/(?:Conv[eê]nio|Protocolo|Ajuste\s+SINIEF|Ato\s+COTEPE)\s+(?:ICMS\s+)?(?:n[ºo.]\s*)?(\d+\s*\/\s*20\d{2})/gi],
    datePatterns: commonDates,
    effectiveDatePatterns: explicitEffectiveDates,
  },
  {
    id: "rfb",
    name: "Receita Federal — legislação e normas",
    sourceCodes: ["RFB-NEWS"],
    officialHosts: ["gov.br", "www.gov.br", "normas.receita.fazenda.gov.br"],
    artifactKind: "normative_index",
    acceptedContentTypes: ["text/html", "application/xhtml+xml", "application/pdf", "application/json", "application/xml", "text/xml"],
    maxAttempts: 2,
    maxBytes: 750_000,
    parserVersion: "rfb-normas.v1",
    versionPatterns: [/(?:Instru[cç][aã]o\s+Normativa|IN|Ato\s+Declarat[oó]rio|Solu[cç][aã]o\s+de\s+Consulta)\s+(?:RFB\s+)?(?:n[ºo.]\s*)?(\d+(?:\s*\/\s*20\d{2})?)/gi],
    datePatterns: commonDates,
    effectiveDatePatterns: explicitEffectiveDates,
  },
  {
    id: "dou",
    name: "Diário Oficial da União",
    sourceCodes: ["DOU-FISCAL"],
    officialHosts: ["in.gov.br", "www.in.gov.br"],
    artifactKind: "official_gazette",
    acceptedContentTypes: ["text/html", "application/xhtml+xml", "application/pdf", "application/json"],
    maxAttempts: 2,
    maxBytes: 750_000,
    parserVersion: "dou-fiscal.v1",
    versionPatterns: [/(?:Instru[cç][aã]o\s+Normativa|Medida\s+Provis[oó]ria|Decreto|Portaria|Ato\s+Declarat[oó]rio)\s+(?:RFB\s+)?(?:n[ºo.]\s*)?([\d.]+(?:\s*\/\s*20\d{2})?)/gi],
    datePatterns: commonDates,
    effectiveDatePatterns: explicitEffectiveDates,
  },
];

const connectorBySourceCode = new Map(officialConnectorContracts.flatMap((contract) => contract.sourceCodes.map((code) => [code, contract] as const)));

export function connectorForSource(sourceCode: string) {
  return connectorBySourceCode.get(sourceCode) ?? null;
}

function hostMatches(host: string, allowed: string[]) {
  const normalized = host.toLowerCase();
  return allowed.some((candidate) => normalized === candidate || normalized.endsWith(`.${candidate}`));
}

function normalizeDate(match: RegExpMatchArray) {
  if (match[1]?.length === 4) return `${match[1]}-${match[2]}-${match[3]}`;
  if (match[3]?.length === 4) return `${match[3]}-${match[2]}-${match[1]}`;
  return null;
}

function firstMatch(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    const match = pattern.exec(text);
    if (match?.[1]) return [match[1], match[2]].filter(Boolean).join(" v").replace(/\s+/g, " ").trim();
  }
  return null;
}

function firstDate(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    const match = pattern.exec(text);
    if (match) return normalizeDate(match);
  }
  return null;
}

export function inspectOfficialArtifact(input: { sourceCode: string; finalUrl: string; contentType: string | null; bodyText: string }): OfficialArtifactInspection {
  const contract = connectorForSource(input.sourceCode);
  if (!contract) return { connectorId: null, connectorName: null, artifactKind: null, parserVersion: null, parseStatus: "not_applicable", detectedVersion: null, publishedAt: null, effectiveFrom: null, contractErrors: [], promotionStatus: "not_applicable" };
  const errors: string[] = [];
  let host = "";
  try { host = new URL(input.finalUrl).hostname; } catch { errors.push("invalid_final_url"); }
  if (host && !hostMatches(host, contract.officialHosts)) errors.push(`unexpected_official_host:${host}`);
  const contentType = (input.contentType ?? "").split(";", 1)[0].trim().toLowerCase();
  if (!contentType || !contract.acceptedContentTypes.includes(contentType)) errors.push(`unexpected_content_type:${contentType || "missing"}`);
  const detectedVersion = firstMatch(input.bodyText, contract.versionPatterns);
  const publishedAt = firstDate(input.bodyText, contract.datePatterns);
  const effectiveFrom = firstDate(input.bodyText, contract.effectiveDatePatterns);
  if (!detectedVersion) errors.push("release_identifier_not_found");
  return {
    connectorId: contract.id,
    connectorName: contract.name,
    artifactKind: contract.artifactKind,
    parserVersion: contract.parserVersion,
    parseStatus: errors.length ? "contract_blocked" : "parsed",
    detectedVersion,
    publishedAt,
    effectiveFrom,
    contractErrors: errors,
    promotionStatus: errors.length ? "blocked_contract" : "metadata_review",
  };
}

export function validateOfficialConnectorContracts() {
  const errors: string[] = [];
  const ids = new Set<string>();
  const sourceCodes = new Set<string>();
  for (const contract of officialConnectorContracts) {
    if (ids.has(contract.id)) errors.push(`duplicate_connector:${contract.id}`);
    ids.add(contract.id);
    if (!contract.name || !contract.parserVersion || !contract.artifactKind) errors.push(`incomplete_connector:${contract.id}`);
    if (!contract.officialHosts.length || !contract.acceptedContentTypes.length || !contract.versionPatterns.length || !contract.effectiveDatePatterns.length) errors.push(`missing_contract_limits:${contract.id}`);
    if (contract.maxAttempts < 1 || contract.maxAttempts > 2 || contract.maxBytes > 750_000) errors.push(`unsafe_connector_limits:${contract.id}`);
    for (const sourceCode of contract.sourceCodes) {
      if (sourceCodes.has(sourceCode)) errors.push(`duplicate_connector_source:${sourceCode}`);
      sourceCodes.add(sourceCode);
    }
  }
  return { passed: errors.length === 0, errors, connectors: officialConnectorContracts.length, sourceCodes: sourceCodes.size };
}

export type FiscalIntelligenceStatus = "out_of_scope" | "needs_information" | "conditional";

export type FiscalFactSource = "question" | "manual" | "default" | "unknown";

export type FiscalIntelligenceFacts = {
  tax: "ICMS" | null;
  originState: string | null;
  destinationState: string | null;
  segment: "auto_parts" | null;
  productDescription: string | null;
  ncm: string | null;
  cest: string | null;
  productOrigin: "domestic" | "imported" | "unknown";
  importRuleQualification: "qualifies" | "does_not_qualify" | "unknown";
  issuerTaxRegime: "normal" | "simples" | "unknown";
  recipientTaxpayer: "yes" | "no" | "unknown";
  purpose: "resale" | "industrialization" | "use_consumption" | "fixed_asset" | "unknown";
  automotiveUse: "yes" | "no" | "unknown";
  specialTreatment: "none" | "exists" | "unknown";
  referenceDate: string;
};

export type FiscalIntelligenceOverrides = Partial<Omit<FiscalIntelligenceFacts, "tax" | "segment" | "referenceDate">> & {
  tax?: "ICMS" | null;
  segment?: "auto_parts" | null;
  referenceDate?: string;
};

export type FiscalKnowledgeSource = {
  code: string;
  title: string;
  publisher: string;
  url: string;
  legalReference: string;
  sourceUpdatedAt: string | null;
  checkedAt: string;
  primary: boolean;
};

type ManualRule = {
  code: string;
  title: string;
  conclusion: string;
  sourceCodes: string[];
};

type ProductClassification = {
  code: string;
  ncmPrefix: string;
  cest: string;
  description: string;
  descriptionTerms: string[];
  interstateScope: boolean;
  tableMvaBps: number;
  sourceCodes: string[];
};

export type FiscalIntelligenceDefinition = {
  schemaVersion: "manual-fiscal-intelligence.v1";
  engineVersion: string;
  baseCode: string;
  version: string;
  name: string;
  assuranceLevel: "pilot_conditional";
  coverage: {
    tax: "ICMS";
    originState: "SP";
    destinationState: "MG";
    segment: "auto_parts";
  };
  ontology: Record<string, string[]>;
  rules: ManualRule[];
  productClassifications: ProductClassification[];
  sources: FiscalKnowledgeSource[];
  limitations: string[];
};

export type FiscalFactView = {
  key: keyof FiscalIntelligenceFacts;
  label: string;
  value: string;
  source: FiscalFactSource;
};

export type FiscalClarification = {
  field: keyof FiscalIntelligenceFacts;
  question: string;
  reason: string;
};

export type FiscalFinding = {
  code: string;
  label: string;
  value: string;
  detail: string;
  sourceCodes: string[];
  nature: "own_rate" | "st_scope" | "table_parameter";
};

export type FiscalDecisionTrace = {
  ruleCode: string;
  result: "applied" | "blocked" | "not_applicable";
  detail: string;
};

export type FiscalIntelligenceResult = {
  schemaVersion: "fiscal-intelligence-result.v1";
  engineVersion: string;
  baseCode: string;
  baseVersion: string;
  assuranceLevel: "pilot_conditional";
  status: FiscalIntelligenceStatus;
  statusLabel: string;
  headline: string;
  summary: string;
  facts: FiscalIntelligenceFacts;
  factViews: FiscalFactView[];
  completeness: { known: number; required: number; percentage: number };
  findings: FiscalFinding[];
  clarifications: FiscalClarification[];
  decisionTrace: FiscalDecisionTrace[];
  sources: FiscalKnowledgeSource[];
  limitations: string[];
  disclaimer: string;
};

const CHECKED_AT = "2026-07-15";

export const spMgAutoPartsKnowledge: FiscalIntelligenceDefinition = {
  schemaVersion: "manual-fiscal-intelligence.v1",
  engineVersion: "mc-manual-fiscal-0.1.0",
  baseCode: "ICMS-SP-MG-AUTOPECAS",
  version: "0.1.0",
  name: "ICMS · autopeças · São Paulo para Minas Gerais",
  assuranceLevel: "pilot_conditional",
  coverage: { tax: "ICMS", originState: "SP", destinationState: "MG", segment: "auto_parts" },
  ontology: {
    icms: ["icms", "imposto estadual", "aliquota interestadual"],
    auto_parts: ["autopeca", "autopecas", "peca automotiva", "pecas automotivas", "componente automotivo", "pastilha de freio", "filtro automotivo"],
    resale: ["revenda", "revender", "comercializacao"],
    industrialization: ["industrializacao", "industrializar", "insumo"],
    use_consumption: ["uso e consumo", "uso ou consumo", "consumo proprio"],
    fixed_asset: ["ativo imobilizado", "ativo fixo"],
  },
  rules: [
    {
      code: "ICMS-INTERSTATE-SP-MG-DOMESTIC-12",
      title: "Alíquota interestadual geral",
      conclusion: "Operações interestaduais de SP para MG com mercadoria nacional seguem a alíquota geral de 12%, quando não houver regra especial aplicável.",
      sourceCodes: ["RSF-22-1989"],
    },
    {
      code: "ICMS-INTERSTATE-IMPORTED-4",
      title: "Mercadoria importada sujeita à alíquota de 4%",
      conclusion: "A alíquota de 4% depende do enquadramento da mercadoria importada nas condições da Resolução do Senado nº 13/2012 e de suas exceções.",
      sourceCodes: ["RSF-13-2012"],
    },
    {
      code: "ICMS-ST-AUTO-PARTS-SP-MG",
      title: "Protocolo interestadual de substituição tributária",
      conclusion: "São Paulo e Minas Gerais constam no acordo de ST de autopeças; a incidência concreta depende cumulativamente da descrição, NCM, CEST, uso automotivo e âmbito do item.",
      sourceCodes: ["SP-ST-AGREEMENTS", "MG-RICMS-ANNEX-VII"],
    },
    {
      code: "ICMS-ST-AUTOMOTIVE-USE",
      title: "Uso especificamente automotivo",
      conclusion: "O enquadramento mineiro de autopeças exige conferir o uso especificamente automotivo e as hipóteses de aplicação e inaplicabilidade do Anexo VII.",
      sourceCodes: ["MG-RICMS-ANNEX-VII", "MG-RICMS-INDEX"],
    },
  ],
  productClassifications: [
    {
      code: "MG-AUTO-075",
      ncmPrefix: "8708",
      cest: "01.075.00",
      description: "Partes e acessórios dos veículos automóveis das posições 8701 a 8705",
      descriptionTerms: ["parte", "acessório", "acessorio", "veículo automóvel", "veiculo automovel"],
      interstateScope: true,
      tableMvaBps: 7178,
      sourceCodes: ["MG-RICMS-ANNEX-VII"],
    },
    {
      code: "MG-AUTO-065",
      ncmPrefix: "853650",
      cest: "01.065.00",
      description: "Interruptores, seccionadores e comutadores de uso automotivo",
      descriptionTerms: ["interruptor", "seccionador", "comutador"],
      interstateScope: true,
      tableMvaBps: 7178,
      sourceCodes: ["MG-RICMS-ANNEX-VII"],
    },
    {
      code: "MG-AUTO-041",
      ncmPrefix: "84213100",
      cest: "01.041.00",
      description: "Filtros de entrada de ar para motores",
      descriptionTerms: ["filtro de entrada de ar", "filtro de ar"],
      interstateScope: true,
      tableMvaBps: 7178,
      sourceCodes: ["MG-RICMS-ANNEX-VII"],
    },
  ],
  sources: [
    {
      code: "RSF-22-1989",
      title: "Resolução do Senado Federal nº 22/1989",
      publisher: "Senado Federal",
      url: "https://legis.senado.leg.br/norma/586152/publicacao?tipoDocumento=RSF&tipoTexto=ATU",
      legalReference: "art. 1º e parágrafo único",
      sourceUpdatedAt: null,
      checkedAt: CHECKED_AT,
      primary: true,
    },
    {
      code: "RSF-13-2012",
      title: "Resolução do Senado Federal nº 13/2012",
      publisher: "Senado Federal",
      url: "https://legis.senado.leg.br/norma/586999/publicacao?tipoDocumento=RSF&tipoTexto=ATU",
      legalReference: "arts. 1º a 3º",
      sourceUpdatedAt: null,
      checkedAt: CHECKED_AT,
      primary: true,
    },
    {
      code: "MG-RICMS-INDEX",
      title: "Regulamento do ICMS de Minas Gerais · 2023",
      publisher: "Secretaria de Estado de Fazenda de Minas Gerais",
      url: "https://www.fazenda.mg.gov.br/empresas/legislacao_tributaria/ricms",
      legalReference: "Decreto nº 48.589/2023; atualizado até o Decreto nº 49.253/2026",
      sourceUpdatedAt: "2026-06-29",
      checkedAt: CHECKED_AT,
      primary: true,
    },
    {
      code: "MG-RICMS-ANNEX-VII",
      title: "RICMS/MG 2023 · Anexo VII · Substituição Tributária",
      publisher: "Secretaria de Estado de Fazenda de Minas Gerais",
      url: "https://www.fazenda.mg.gov.br/empresas/legislacao_tributaria/ricms2023/anexovii2023.pdf",
      legalReference: "Parte 1, Capítulo VII; Parte 2, Capítulo 1",
      sourceUpdatedAt: "2026-06-29",
      checkedAt: CHECKED_AT,
      primary: true,
    },
    {
      code: "SP-ST-AGREEMENTS",
      title: "Convênios e Protocolos de Substituição Tributária",
      publisher: "Secretaria da Fazenda e Planejamento de São Paulo",
      url: "https://legislacao.fazenda.sp.gov.br/Paginas/ConveniosProtocolosSubstituicaoTributaria.aspx",
      legalReference: "Autopeças · Minas Gerais · Protocolo ICMS 41/08",
      sourceUpdatedAt: "2026-05-18",
      checkedAt: CHECKED_AT,
      primary: false,
    },
  ],
  limitations: [
    "A base inicial cobre somente ICMS de autopeças em operações de São Paulo para Minas Gerais.",
    "A versão piloto não classifica automaticamente mercadorias apenas pela descrição comercial.",
    "MVA de tabela não é valor de ICMS-ST a recolher e não é aplicada automaticamente.",
    "Benefícios, regimes especiais, DIFAL, Simples Nacional e exceções ainda bloqueiam a conclusão.",
    "A base ainda não recebeu homologação profissional externa; por isso, nenhuma resposta é rotulada como definitiva.",
  ],
};

export const fiscalIntelligenceSeed = {
  code: spMgAutoPartsKnowledge.baseCode,
  version: spMgAutoPartsKnowledge.version,
  name: spMgAutoPartsKnowledge.name,
  scope: "ICMS:SP>MG:AUTO_PARTS",
  status: "pilot",
  contentJson: JSON.stringify(spMgAutoPartsKnowledge),
  sourceCount: spMgAutoPartsKnowledge.sources.length,
  checkedAt: CHECKED_AT,
};

const stateAliases: Record<string, string[]> = {
  AC: ["ac", "acre"], AL: ["al", "alagoas"], AP: ["ap", "amapa"], AM: ["am", "amazonas"], BA: ["ba", "bahia"],
  CE: ["ce", "ceara"], DF: ["df", "distrito federal"], ES: ["es", "espirito santo"], GO: ["go", "goias"], MA: ["ma", "maranhao"],
  MT: ["mt", "mato grosso"], MS: ["ms", "mato grosso do sul"], MG: ["mg", "minas gerais"], PA: ["pa"], PB: ["pb", "paraiba"],
  PR: ["pr", "parana"], PE: ["pe", "pernambuco"], PI: ["pi", "piaui"], RJ: ["rj", "rio de janeiro"], RN: ["rn", "rio grande do norte"],
  RS: ["rs", "rio grande do sul"], RO: ["ro", "rondonia"], RR: ["rr", "roraima"], SC: ["sc", "santa catarina"],
  SP: ["sp", "sao paulo"], SE: ["sergipe"], TO: ["to", "tocantins"],
};

const requiredOperationalFields: Array<keyof FiscalIntelligenceFacts> = [
  "productDescription",
  "ncm",
  "cest",
  "productOrigin",
  "issuerTaxRegime",
  "recipientTaxpayer",
  "purpose",
  "automotiveUse",
  "specialTreatment",
];

const clarificationCatalog: Partial<Record<keyof FiscalIntelligenceFacts, FiscalClarification>> = {
  tax: { field: "tax", question: "Qual tributo precisa ser analisado?", reason: "A base inicial só cobre ICMS." },
  originState: { field: "originState", question: "De qual estado a mercadoria sairá?", reason: "A alíquota e os acordos dependem da rota interestadual." },
  destinationState: { field: "destinationState", question: "Para qual estado a mercadoria será enviada?", reason: "A alíquota e os acordos dependem da rota interestadual." },
  segment: { field: "segment", question: "A mercadoria é uma autopeça?", reason: "A cobertura piloto está limitada ao segmento de autopeças." },
  productDescription: { field: "productDescription", question: "Qual é a descrição técnica da mercadoria?", reason: "NCM e CEST não bastam quando a descrição legal não coincide com o produto." },
  ncm: { field: "ncm", question: "Qual é o NCM completo da mercadoria?", reason: "O enquadramento em substituição tributária exige conferir a classificação fiscal." },
  cest: { field: "cest", question: "Qual é o CEST informado para a mercadoria?", reason: "O CEST identifica o item da tabela de substituição tributária." },
  productOrigin: { field: "productOrigin", question: "A mercadoria é nacional ou importada?", reason: "Mercadorias importadas podem seguir a alíquota interestadual de 4%." },
  importRuleQualification: { field: "importRuleQualification", question: "A mercadoria importada se enquadra na Resolução nº 13/2012?", reason: "É preciso saber se não houve industrialização ou se o conteúdo de importação supera 40%, além de conferir exceções." },
  issuerTaxRegime: { field: "issuerTaxRegime", question: "O remetente está no regime normal ou no Simples Nacional?", reason: "O tratamento operacional do destaque e da apuração muda conforme o regime." },
  recipientTaxpayer: { field: "recipientTaxpayer", question: "O destinatário mineiro é contribuinte do ICMS?", reason: "Operações para não contribuinte exigem outra trilha, inclusive análise de DIFAL." },
  purpose: { field: "purpose", question: "A mercadoria será revendida, industrializada, usada/consumida ou imobilizada?", reason: "A finalidade altera a análise da substituição tributária e da entrada." },
  automotiveUse: { field: "automotiveUse", question: "A peça terá uso especificamente automotivo?", reason: "O RICMS/MG restringe este capítulo às mercadorias de uso especificamente automotivo." },
  specialTreatment: { field: "specialTreatment", question: "Existe benefício fiscal, regime especial ou decisão específica para a operação?", reason: "Uma regra particular pode afastar a conclusão geral." },
};

function normalizeText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9.%>]+/g, " ").replace(/\s+/g, " ").trim();
}

function digits(value: string | null | undefined) {
  const normalized = value?.replace(/\D/g, "") ?? "";
  return normalized || null;
}

function normalizeCest(value: string | null | undefined) {
  const normalized = digits(value);
  if (!normalized) return null;
  if (normalized.length !== 7) return normalized;
  return `${normalized.slice(0, 2)}.${normalized.slice(2, 5)}.${normalized.slice(5)}`;
}

function findStateRoute(normalized: string) {
  const positions = Object.entries(stateAliases).flatMap(([state, aliases]) => aliases.map((alias) => {
    const match = new RegExp(`(?:^|\\s)${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\s|$)`).exec(normalized);
    return { state, alias, index: match?.index ?? -1 };
  })).filter((item) => item.index >= 0);
  positions.sort((left, right) => left.index - right.index || right.alias.length - left.alias.length);
  const mostSpecificAtPosition = positions.filter((item, index) => positions.findIndex((candidate) => candidate.index === item.index) === index);
  const distinct = mostSpecificAtPosition.filter((item, index) => mostSpecificAtPosition.findIndex((candidate) => candidate.state === item.state) === index);
  return { originState: distinct[0]?.state ?? null, destinationState: distinct[1]?.state ?? null };
}

function includesAny(normalized: string, terms: string[]) {
  return terms.some((term) => normalized.includes(normalizeText(term)));
}

function extractNcm(question: string) {
  const match = question.match(/\bncm\s*[:#-]?\s*([0-9][0-9.\s]{3,12})/i);
  const value = digits(match?.[1]);
  return value && value.length >= 4 && value.length <= 8 ? value : null;
}

function extractCest(question: string) {
  const match = question.match(/\bcest\s*[:#-]?\s*([0-9][0-9.\s]{5,11})/i);
  const value = digits(match?.[1]);
  return value && value.length === 7 ? normalizeCest(value) : null;
}

function extractProductDescription(question: string, normalized: string, definition: FiscalIntelligenceDefinition) {
  const known = definition.ontology.auto_parts.find((term) => normalized.includes(normalizeText(term)) && !["autopeca", "autopecas", "peca automotiva", "pecas automotivas"].includes(normalizeText(term)));
  if (known) return known;
  const explicit = question.match(/(?:produto|mercadoria|pe[cç]a)\s*[:=-]\s*([^,;.]{3,100})/i)?.[1]?.trim();
  return explicit || null;
}

export function extractFiscalFacts(question: string, overrides: FiscalIntelligenceOverrides = {}, referenceDate = CHECKED_AT, definition = spMgAutoPartsKnowledge) {
  const normalized = normalizeText(question);
  const route = findStateRoute(normalized);
  const hasImported = /\bimportad[oa]s?\b/.test(normalized);
  const hasDomestic = /\b(nacional|nacionais|domestica|domestico)\b/.test(normalized);
  const importPercentage = Number(normalized.match(/(?:conteudo de importacao|conteudo importado)[^0-9]{0,15}(\d{1,3})(?:[.,]\d+)?\s*%/)?.[1]);
  const importQualification = hasImported && (includesAny(normalized, ["sem industrializacao", "nao industrializada", "nao industrializado"]) || importPercentage > 40)
    ? "qualifies"
    : hasImported && Number.isFinite(importPercentage) && importPercentage <= 40
      ? "does_not_qualify"
      : "unknown";
  const nonTaxpayer = includesAny(normalized, ["nao contribuinte", "não contribuinte"]);
  const taxpayer = !nonTaxpayer && /\bcontribuinte(?: do icms)?\b/.test(normalized);
  const facts: FiscalIntelligenceFacts = {
    tax: includesAny(normalized, definition.ontology.icms) ? "ICMS" : null,
    originState: route.originState,
    destinationState: route.destinationState,
    segment: includesAny(normalized, definition.ontology.auto_parts) ? "auto_parts" : null,
    productDescription: extractProductDescription(question, normalized, definition),
    ncm: extractNcm(question),
    cest: extractCest(question),
    productOrigin: hasImported ? "imported" : hasDomestic ? "domestic" : "unknown",
    importRuleQualification: importQualification,
    issuerTaxRegime: includesAny(normalized, ["simples nacional", "optante do simples"]) ? "simples" : includesAny(normalized, ["regime normal", "lucro real", "lucro presumido"]) ? "normal" : "unknown",
    recipientTaxpayer: nonTaxpayer ? "no" : taxpayer ? "yes" : "unknown",
    purpose: includesAny(normalized, definition.ontology.resale) ? "resale" : includesAny(normalized, definition.ontology.industrialization) ? "industrialization" : includesAny(normalized, definition.ontology.use_consumption) ? "use_consumption" : includesAny(normalized, definition.ontology.fixed_asset) ? "fixed_asset" : "unknown",
    automotiveUse: includesAny(normalized, ["uso automotivo", "uso especificamente automotivo"]) ? "yes" : "unknown",
    specialTreatment: includesAny(normalized, ["regime especial", "beneficio fiscal", "benefício fiscal"]) ? "exists" : includesAny(normalized, ["sem beneficio", "sem benefício", "sem regime especial"]) ? "none" : "unknown",
    referenceDate,
  };
  const merged = { ...facts, ...overrides };
  return {
    ...merged,
    ncm: digits(merged.ncm),
    cest: normalizeCest(merged.cest),
    productDescription: merged.productDescription?.trim().slice(0, 120) || null,
    referenceDate: /^\d{4}-\d{2}-\d{2}$/.test(merged.referenceDate) ? merged.referenceDate : referenceDate,
  } satisfies FiscalIntelligenceFacts;
}

function knownFact(field: keyof FiscalIntelligenceFacts, value: FiscalIntelligenceFacts[keyof FiscalIntelligenceFacts]) {
  if (field === "productDescription" || field === "ncm" || field === "cest") return typeof value === "string" && value.length > 0;
  return value !== null && value !== "unknown";
}

function factLabel(field: keyof FiscalIntelligenceFacts) {
  const labels: Record<keyof FiscalIntelligenceFacts, string> = {
    tax: "Tributo", originState: "Origem", destinationState: "Destino", segment: "Segmento", productDescription: "Mercadoria",
    ncm: "NCM", cest: "CEST", productOrigin: "Origem da mercadoria", importRuleQualification: "Regra de importados", issuerTaxRegime: "Regime do remetente",
    recipientTaxpayer: "Destinatário", purpose: "Finalidade", automotiveUse: "Uso automotivo", specialTreatment: "Tratamento especial", referenceDate: "Data de referência",
  };
  return labels[field];
}

function factValue(field: keyof FiscalIntelligenceFacts, value: FiscalIntelligenceFacts[keyof FiscalIntelligenceFacts]) {
  const values: Record<string, string> = {
    auto_parts: "Autopeças", domestic: "Nacional", imported: "Importada", unknown: "Não informado", qualifies: "Enquadra-se na Res. 13/2012",
    does_not_qualify: "Não se enquadra na Res. 13/2012", normal: "Regime normal", simples: "Simples Nacional", yes: "Sim", no: "Não", resale: "Revenda",
    industrialization: "Industrialização", use_consumption: "Uso/consumo", fixed_asset: "Ativo imobilizado", none: "Nenhum informado", exists: "Existe",
  };
  if (value === null) return "Não identificado";
  if (field === "recipientTaxpayer" && value === "yes") return "Contribuinte do ICMS";
  if (field === "recipientTaxpayer" && value === "no") return "Não contribuinte";
  return values[String(value)] ?? String(value);
}

function sourceForFact(questionFacts: FiscalIntelligenceFacts, overrides: FiscalIntelligenceOverrides, field: keyof FiscalIntelligenceFacts): FiscalFactSource {
  if (Object.prototype.hasOwnProperty.call(overrides, field)) return "manual";
  if (field === "referenceDate") return "default";
  return knownFact(field, questionFacts[field]) ? "question" : "unknown";
}

export function evaluateFiscalQuestion(question: string, overrides: FiscalIntelligenceOverrides = {}, referenceDate = CHECKED_AT, definition = spMgAutoPartsKnowledge): FiscalIntelligenceResult {
  if (typeof question !== "string" || question.trim().length < 5 || question.length > 500) throw new Error("invalid_fiscal_question");
  assertFiscalIntelligenceDefinition(definition);
  const questionFacts = extractFiscalFacts(question, {}, referenceDate, definition);
  const facts = extractFiscalFacts(question, overrides, referenceDate, definition);
  const factViews = (Object.keys(facts) as Array<keyof FiscalIntelligenceFacts>).map((field) => ({
    key: field,
    label: factLabel(field),
    value: factValue(field, facts[field]),
    source: sourceForFact(questionFacts, overrides, field),
  }));
  const scopeFields = ["tax", "originState", "destinationState", "segment"] as Array<keyof FiscalIntelligenceFacts>;
  const scopeMissing = scopeFields.some((field) => !knownFact(field, facts[field]));
  const outOfScope = !scopeMissing && (facts.tax !== definition.coverage.tax || facts.originState !== definition.coverage.originState || facts.destinationState !== definition.coverage.destinationState || facts.segment !== definition.coverage.segment);
  const baseClarifications = (["tax", "originState", "destinationState", "segment"] as Array<keyof FiscalIntelligenceFacts>)
    .filter((field) => !knownFact(field, facts[field]))
    .map((field) => clarificationCatalog[field]!)
    .filter(Boolean);
  const operationalClarifications = requiredOperationalFields
    .filter((field) => !knownFact(field, facts[field]))
    .map((field) => clarificationCatalog[field]!)
    .filter(Boolean);
  if (facts.productOrigin === "imported" && facts.importRuleQualification === "unknown") operationalClarifications.splice(4, 0, clarificationCatalog.importRuleQualification!);
  const blockingClarifications: FiscalClarification[] = [...baseClarifications, ...operationalClarifications];
  const findings: FiscalFinding[] = [];
  const decisionTrace: FiscalDecisionTrace[] = [];

  if (outOfScope || scopeMissing) {
    return buildResult({
      definition, facts, factViews, status: outOfScope ? "out_of_scope" : "needs_information",
      headline: outOfScope ? "Consulta fora da cobertura atual" : "Preciso delimitar a operação antes de pesquisar",
      summary: outOfScope
        ? "A inteligência manual ainda cobre somente ICMS de autopeças em operações de São Paulo para Minas Gerais. Nenhum número foi aplicado fora desse recorte."
        : "A pergunta ainda não identifica todos os elementos mínimos do recorte fiscal. Complete a rota, o tributo e o segmento.",
      findings, clarifications: blockingClarifications.length ? blockingClarifications : [clarificationCatalog.originState!, clarificationCatalog.destinationState!], decisionTrace,
    });
  }

  const hardBlock = facts.issuerTaxRegime === "simples" || facts.recipientTaxpayer === "no" || facts.specialTreatment === "exists" || facts.automotiveUse === "no";
  if (facts.issuerTaxRegime === "simples") decisionTrace.push({ ruleCode: "REGIME-SIMPLES-PENDING", result: "blocked", detail: "A trilha específica do Simples Nacional ainda não foi modelada." });
  if (facts.recipientTaxpayer === "no") decisionTrace.push({ ruleCode: "DIFAL-PENDING", result: "blocked", detail: "Destinatário não contribuinte exige análise própria de DIFAL, ainda fora desta versão." });
  if (facts.specialTreatment === "exists") decisionTrace.push({ ruleCode: "SPECIAL-TREATMENT", result: "blocked", detail: "Benefício ou regime especial precisa prevalecer sobre a regra geral." });
  if (facts.automotiveUse === "no") decisionTrace.push({ ruleCode: "ICMS-ST-AUTOMOTIVE-USE", result: "not_applicable", detail: "A mercadoria informada não tem uso especificamente automotivo." });

  if (!hardBlock && facts.productOrigin === "domestic") {
    findings.push({
      code: "OWN-RATE-12", label: "ICMS próprio interestadual", value: "12%",
      detail: "Referência para mercadoria nacional, remetente no regime normal e operação SP→MG, ressalvadas regras específicas.",
      sourceCodes: ["RSF-22-1989"], nature: "own_rate",
    });
    decisionTrace.push({ ruleCode: "ICMS-INTERSTATE-SP-MG-DOMESTIC-12", result: "applied", detail: "Rota Sudeste→Sudeste e mercadoria nacional informada." });
  } else if (!hardBlock && facts.productOrigin === "imported" && facts.importRuleQualification === "qualifies") {
    findings.push({
      code: "OWN-RATE-4", label: "ICMS próprio interestadual", value: "4%",
      detail: "Referência condicionada ao enquadramento informado na Resolução do Senado nº 13/2012 e à inexistência de exceção.",
      sourceCodes: ["RSF-13-2012"], nature: "own_rate",
    });
    decisionTrace.push({ ruleCode: "ICMS-INTERSTATE-IMPORTED-4", result: "applied", detail: "O usuário informou condição compatível com a regra de importados." });
  } else if (!hardBlock && facts.productOrigin === "imported" && facts.importRuleQualification === "does_not_qualify") {
    findings.push({
      code: "OWN-RATE-12-IMPORT-EXCEPTION", label: "Referência interestadual fora da regra de 4%", value: "12%",
      detail: "O usuário informou que a mercadoria importada não se enquadra na regra de 4%; ainda é necessário conferir as exceções e a documentação da importação.",
      sourceCodes: ["RSF-22-1989", "RSF-13-2012"], nature: "own_rate",
    });
    decisionTrace.push({ ruleCode: "ICMS-INTERSTATE-IMPORTED-4", result: "not_applicable", detail: "Condição informada não alcança a regra de 4%." });
  } else {
    decisionTrace.push({ ruleCode: "ICMS-OWN-RATE", result: "blocked", detail: hardBlock ? "Uma condição especial bloqueia a regra geral." : "A origem da mercadoria ainda não foi informada." });
  }

  const classification = definition.productClassifications.find((item) => facts.ncm?.startsWith(item.ncmPrefix) && facts.cest === item.cest);
  const classificationDescriptionMatches = classification && facts.productDescription
    ? classification.descriptionTerms.some((term) => normalizeText(facts.productDescription!).includes(normalizeText(term)))
    : false;
  if (!hardBlock && classification && classificationDescriptionMatches && facts.automotiveUse === "yes") {
    findings.push({
      code: `ST-${classification.code}`, label: "Âmbito interestadual de ST", value: classification.interstateScope ? "Enquadramento localizado" : "Somente interno",
      detail: `${classification.description}. A coincidência de NCM, CEST, descrição e uso ainda deve ser revisada pelo responsável.`,
      sourceCodes: classification.sourceCodes, nature: "st_scope",
    });
    findings.push({
      code: `MVA-${classification.code}`, label: "MVA constante da tabela mineira", value: `${(classification.tableMvaBps / 100).toFixed(2).replace(".", ",")}%`,
      detail: "Parâmetro de tabela, não valor do ICMS-ST a recolher. Esta versão não calcula a base ajustada nem o imposto retido.",
      sourceCodes: classification.sourceCodes, nature: "table_parameter",
    });
    decisionTrace.push({ ruleCode: "ICMS-ST-AUTO-PARTS-SP-MG", result: "applied", detail: `Correspondência controlada ${classification.code} por NCM e CEST.` });
  } else if (!facts.ncm || !facts.cest) {
    decisionTrace.push({ ruleCode: "ICMS-ST-AUTO-PARTS-SP-MG", result: "blocked", detail: "NCM e CEST são obrigatórios para procurar o item de ST." });
  } else if (!classification) {
    decisionTrace.push({ ruleCode: "ICMS-ST-AUTO-PARTS-SP-MG", result: "blocked", detail: "A combinação NCM/CEST ainda não existe no catálogo manual desta versão." });
  } else if (!classificationDescriptionMatches) {
    decisionTrace.push({ ruleCode: "ICMS-ST-AUTO-PARTS-SP-MG", result: "blocked", detail: "A descrição informada não reproduz os termos controlados do item legal; a classificação precisa de revisão humana." });
  } else {
    decisionTrace.push({ ruleCode: "ICMS-ST-AUTO-PARTS-SP-MG", result: "blocked", detail: "O uso especificamente automotivo ainda não foi confirmado." });
  }

  const status: FiscalIntelligenceStatus = hardBlock || blockingClarifications.length > 0 ? "needs_information" : "conditional";
  const headline = findings.find((finding) => finding.nature === "own_rate")
    ? `${findings.find((finding) => finding.nature === "own_rate")!.label}: ${findings.find((finding) => finding.nature === "own_rate")!.value}`
    : "Ainda não há base suficiente para indicar a alíquota operacional";
  const summary = status === "conditional"
    ? "A regra geral e o possível enquadramento de ST foram localizados. A conclusão permanece condicional porque a base está em piloto e exige revisão profissional da classificação e das exceções."
    : "Há uma referência normativa possível, mas faltam fatos ou existe uma condição que impede transformar essa referência em orientação operacional.";
  return buildResult({ definition, facts, factViews, status, headline, summary, findings, clarifications: blockingClarifications, decisionTrace });
}

function buildResult(input: {
  definition: FiscalIntelligenceDefinition;
  facts: FiscalIntelligenceFacts;
  factViews: FiscalFactView[];
  status: FiscalIntelligenceStatus;
  headline: string;
  summary: string;
  findings: FiscalFinding[];
  clarifications: FiscalClarification[];
  decisionTrace: FiscalDecisionTrace[];
}): FiscalIntelligenceResult {
  const fields = ["tax", "originState", "destinationState", "segment", ...requiredOperationalFields] as Array<keyof FiscalIntelligenceFacts>;
  if (input.facts.productOrigin === "imported") fields.push("importRuleQualification");
  const known = fields.filter((field) => knownFact(field, input.facts[field])).length;
  const sourceCodes = new Set(input.findings.flatMap((finding) => finding.sourceCodes));
  input.decisionTrace.forEach((trace) => input.definition.rules.find((rule) => rule.code === trace.ruleCode)?.sourceCodes.forEach((code) => sourceCodes.add(code)));
  const sources = input.definition.sources.filter((source) => sourceCodes.has(source.code));
  const statusLabels: Record<FiscalIntelligenceStatus, string> = { out_of_scope: "Fora da cobertura", needs_information: "Dados pendentes", conditional: "Conclusão condicional" };
  return {
    schemaVersion: "fiscal-intelligence-result.v1",
    engineVersion: input.definition.engineVersion,
    baseCode: input.definition.baseCode,
    baseVersion: input.definition.version,
    assuranceLevel: input.definition.assuranceLevel,
    status: input.status,
    statusLabel: statusLabels[input.status],
    headline: input.headline,
    summary: input.summary,
    facts: input.facts,
    factViews: input.factViews,
    completeness: { known, required: fields.length, percentage: Math.round(known / fields.length * 100) },
    findings: input.findings,
    clarifications: Array.from(new Map(input.clarifications.map((item) => [item.field, item])).values()),
    decisionTrace: input.decisionTrace,
    sources,
    limitations: input.definition.limitations,
    disclaimer: "Pesquisa fiscal assistida e condicionada aos fatos informados. Não substitui a classificação fiscal da mercadoria, a leitura integral da legislação vigente nem a revisão do contador responsável.",
  };
}

export function parseFiscalIntelligenceDefinition(value: string) {
  const parsed = JSON.parse(value) as FiscalIntelligenceDefinition;
  assertFiscalIntelligenceDefinition(parsed);
  return parsed;
}

function assertFiscalIntelligenceDefinition(definition: FiscalIntelligenceDefinition) {
  const validSources = Array.isArray(definition?.sources) && definition.sources.length >= 4 && definition.sources.every((source) => source.code && source.title && source.publisher && /^https:\/\//.test(source.url) && /^\d{4}-\d{2}-\d{2}$/.test(source.checkedAt));
  const sourceCodes = new Set(definition?.sources?.map((source) => source.code));
  const validRules = Array.isArray(definition?.rules) && definition.rules.length > 0 && definition.rules.every((rule) => rule.code && rule.sourceCodes.length > 0 && rule.sourceCodes.every((code) => sourceCodes.has(code)));
  const validClassifications = Array.isArray(definition?.productClassifications) && definition.productClassifications.every((item) => /^\d{4,8}$/.test(item.ncmPrefix) && /^\d{2}\.\d{3}\.\d{2}$/.test(item.cest) && Array.isArray(item.descriptionTerms) && item.descriptionTerms.length > 0 && Number.isInteger(item.tableMvaBps) && item.tableMvaBps >= 0 && item.tableMvaBps <= 100_000 && item.sourceCodes.every((code) => sourceCodes.has(code)));
  if (
    definition?.schemaVersion !== "manual-fiscal-intelligence.v1"
    || definition.assuranceLevel !== "pilot_conditional"
    || definition.coverage?.tax !== "ICMS"
    || definition.coverage?.originState !== "SP"
    || definition.coverage?.destinationState !== "MG"
    || definition.coverage?.segment !== "auto_parts"
    || !/^\d+\.\d+\.\d+$/.test(definition.version)
    || !validSources
    || !validRules
    || !validClassifications
    || !Array.isArray(definition.limitations)
    || definition.limitations.length < 3
  ) throw new Error("invalid_fiscal_intelligence_definition");
}

export async function hashFiscalIntelligenceContent(contentJson: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(contentJson));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

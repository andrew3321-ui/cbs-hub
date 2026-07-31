import { calculateRepresentativeStMemory } from "./st-sp-mg-legal.ts";

export const ST_AUTO_PARTS_HIGH_USE_CORRIDORS_VERSION = "2026.07.31-v90";
export const ST_AUTO_PARTS_HIGH_USE_CORRIDORS_CHECKED_AT = "2026-07-31";
export const ST_AUTO_PARTS_SUPPORTED_PERIOD = { from: "2026-01-01", to: "2026-12-31" } as const;
export const ST_AUTO_PARTS_SP_EXCLUSION_FROM = "2026-10-01" as const;

export const ST_AUTO_PARTS_HIGH_USE_CORRIDORS = [
  ["SP", "MG"],
  ["SP", "RJ"],
  ["SP", "PR"],
  ["SP", "SC"],
  ["SP", "RS"],
  ["SP", "GO"],
  ["SP", "BA"],
  ["MG", "RJ"],
  ["PR", "SC"],
  ["SC", "RS"],
  ["BA", "PE"],
  ["GO", "DF"],
] as const;

export type StAutoPartsHighUseUf = typeof ST_AUTO_PARTS_HIGH_USE_CORRIDORS[number][number];

export const ST_AUTO_PARTS_PROTOCOL_41_CURRENT_PARTIES = [
  "AC", "AL", "AP", "AM", "BA", "DF", "MA", "MG", "MT", "PA", "PB", "PI", "PR", "RJ", "RR", "SP",
] as const;

export const ST_AUTO_PARTS_PROTOCOL_41_DESTINATION_MVA_UFS = ["AL", "BA", "MT", "PI", "PR", "SP"] as const;

export type StAutoPartsHighUseSource = {
  code: string;
  title: string;
  publisher: string;
  url: string;
  checkedAt: typeof ST_AUTO_PARTS_HIGH_USE_CORRIDORS_CHECKED_AT;
  proves: string[];
};

export const stAutoPartsHighUseSources: StAutoPartsHighUseSource[] = [
  {
    code: "CONFAZ-PROTOCOL-41-2008",
    title: "Protocolo ICMS 41/08 — operações interestaduais com autopeças",
    publisher: "CONFAZ",
    url: "https://www.confaz.fazenda.gov.br/legislacao/protocolos/2008/pt041_08",
    checkedAt: ST_AUTO_PARTS_HIGH_USE_CORRIDORS_CHECKED_AT,
    proves: [
      "unidades federadas atualmente alcançadas pelo protocolo",
      "uso especificamente automotivo e sujeição interna no destino",
      "MVA original de 36,56% em fidelidade ou 71,78% nos demais casos",
      "MVA definida pela legislação interna de AL, BA, MT, PI, PR e SP",
      "denúncias de GO e SC e exclusão do RS",
      "exceções de destinatário e do CEST 01.015.00 quando São Paulo é origem ou destino",
    ],
  },
  {
    code: "CONFAZ-CONV-142-2018-ANNEX-II",
    title: "Convênio ICMS 142/18 — Anexo II, autopeças",
    publisher: "CONFAZ",
    url: "https://www.confaz.fazenda.gov.br/legislacao/convenios/2018/CV142_18",
    checkedAt: ST_AUTO_PARTS_HIGH_USE_CORRIDORS_CHECKED_AT,
    proves: ["identidade nacional do segmento", "NCM, CEST e descrição legal dos sete produtos controlados", "vigência nacional do Anexo II"],
  },
  {
    code: "MG-RICMS-2023-ANNEX-VII-AUTO-PARTS",
    title: "RICMS/MG 2023 — Anexo VII, autopeças",
    publisher: "SEF-MG",
    url: "https://www.fazenda.mg.gov.br/empresas/legislacao_tributaria/ricms_2023_seco/anexovii2023_4.html",
    checkedAt: ST_AUTO_PARTS_HIGH_USE_CORRIDORS_CHECKED_AT,
    proves: ["âmbito interestadual vigente incluindo RJ e SP", "CEST 01.075.00 / NCM 8708", "MVA original de 71,78%"],
  },
  {
    code: "RJ-RICMS-LIVRO-II-ANNEX-I-AUTO-PARTS",
    title: "RICMS/RJ — Livro II, Anexo I, autopeças",
    publisher: "SEFAZ-RJ",
    url: "https://portal.fazenda.rj.gov.br/icms/wp-content/uploads/sites/42/2023/10/anexo_I_livroII_2.pdf",
    checkedAt: ST_AUTO_PARTS_HIGH_USE_CORRIDORS_CHECKED_AT,
    proves: ["CEST 01.075.00 / NCM 8708", "MVA original de 71,78%", "MVA ajustada de 88,96% na operação de 12%"],
  },
  {
    code: "RJ-ICMS-INTERNAL-RATES-FECP",
    title: "Alíquotas internas do ICMS e FECP",
    publisher: "SEFAZ-RJ",
    url: "https://portal.fazenda.rj.gov.br/pagamentos/aliquotas-internas/",
    checkedAt: ST_AUTO_PARTS_HIGH_USE_CORRIDORS_CHECKED_AT,
    proves: ["alíquota interna padrão de 20%", "adicional geral de FECP de 2%"],
  },
  {
    code: "SP-PORTARIA-CAT-68-2019-ANNEX-XIV",
    title: "Portaria CAT 68/2019 — Anexo XIV, autopeças",
    publisher: "SEFAZ-SP",
    url: "https://legislacao.fazenda.sp.gov.br/Paginas/Portaria-CAT-68-de-2019.aspx",
    checkedAt: ST_AUTO_PARTS_HIGH_USE_CORRIDORS_CHECKED_AT,
    proves: ["CEST 01.075.00 / NCM 8708 na lista paulista atual", "revogação do Anexo XIV com efeitos em 1º de outubro de 2026"],
  },
  {
    code: "BA-RICMS-ANNEX-I-2026",
    title: "RICMS/BA — Anexo 1 vigente em 2026",
    publisher: "SEFAZ-BA",
    url: "https://mbusca.sefaz.ba.gov.br/ditri/normas_complementares/decretos/decreto_2012_13780_ricms_anexo_1_vigente_2026.pdf",
    checkedAt: ST_AUTO_PARTS_HIGH_USE_CORRIDORS_CHECKED_AT,
    proves: ["fonte estadual de destino para conferir lista, alíquota, FCP, benefícios e exceções"],
  },
  {
    code: "PR-RICMS-DECREE-7871-2017",
    title: "Regulamento do ICMS do Paraná — Decreto 7.871/2017",
    publisher: "Governo do Paraná",
    url: "https://www.legislacao.pr.gov.br/legislacao/listarAtosAno.do?action=exibir&codAto=182608&codTipoAto=11&tipoVisualizacao=original",
    checkedAt: ST_AUTO_PARTS_HIGH_USE_CORRIDORS_CHECKED_AT,
    proves: ["fonte estadual obrigatória para a MVA de destino e demais parâmetros do Paraná"],
  },
  {
    code: "SC-RICMS-ANNEX-1A-CURRENT",
    title: "RICMS/SC — Anexo 1-A vigente",
    publisher: "SEF-SC",
    url: "https://legislacao.sef.sc.gov.br/html/regulamentos/icms/ricms_01_01_a.htm",
    checkedAt: ST_AUTO_PARTS_HIGH_USE_CORRIDORS_CHECKED_AT,
    proves: ["seção estadual de autopeças revogada", "tabela histórica não pode ser reutilizada como regra atual"],
  },
  {
    code: "PE-AUTO-PARTS-CONSOLIDATED",
    title: "Autopeças — legislação consolidada por assunto",
    publisher: "SEFAZ-PE",
    url: "https://www.sefaz.pe.gov.br/Legislacao/Tributaria/Consolidada-Por-Assunto/Paginas/Autopecas.aspx",
    checkedAt: ST_AUTO_PARTS_HIGH_USE_CORRIDORS_CHECKED_AT,
    proves: ["tratamento estadual no Anexo 37, artigos 99 a 101, do Decreto 44.650/2017", "regra própria deve ser conferida fora do Protocolo 41/08"],
  },
  {
    code: "SP-SRE-16-2023-AUTO-PARTS-BASE",
    title: "Portaria SRE 16/2023 — base de cálculo de autopeças até setembro de 2026",
    publisher: "SEFAZ-SP",
    url: "https://legislacao.fazenda.sp.gov.br/Paginas/Portaria-SRE-16-de-2023.aspx",
    checkedAt: ST_AUTO_PARTS_HIGH_USE_CORRIDORS_CHECKED_AT,
    proves: ["vigência de 1º/04/2023 a 30/09/2026", "IVA-ST de 47,19% com fidelidade e 72,15% nos demais casos", "ajuste do IVA nas entradas interestaduais"],
  },
  {
    code: "SP-SRE-34-2026-ST-EXCLUSION",
    title: "Portaria SRE 34/2026 — exclusão paulista de autopeças da ST",
    publisher: "SEFAZ-SP",
    url: "https://legislacao.fazenda.sp.gov.br/Paginas/Portaria-SRE-34-de-2026.aspx",
    checkedAt: ST_AUTO_PARTS_HIGH_USE_CORRIDORS_CHECKED_AT,
    proves: ["revogação do Anexo XIV e da Portaria SRE 16/2023", "efeitos a partir de 1º/10/2026", "estoque sujeito ao procedimento da Portaria CAT 28/2020"],
  },
  {
    code: "SP-RICMS-INTERNAL-RATE-18",
    title: "RICMS/SP — alíquota interna geral aplicável ao produto representativo",
    publisher: "SEFAZ-SP",
    url: "https://legislacao.fazenda.sp.gov.br/Paginas/RC33000_2025.aspx",
    checkedAt: ST_AUTO_PARTS_HIGH_USE_CORRIDORS_CHECKED_AT,
    proves: ["alíquota interna geral de 18%", "necessidade de conferir eventual enquadramento específico por NCM e descrição"],
  },
  {
    code: "PR-SEFA-571-2019-AUTO-PARTS-MVA",
    title: "Resolução SEFA 571/2019 — MVA de autopeças no Paraná",
    publisher: "SEFA-PR",
    url: "https://www.fazenda.pr.gov.br/sites/default/arquivos_restritos/files/documento/2020-03/101201900571.pdf",
    checkedAt: ST_AUTO_PARTS_HIGH_USE_CORRIDORS_CHECKED_AT,
    proves: ["MVA original de 36,56% com fidelidade", "MVA original de 71,78% nos demais casos", "fonte indicada como vigente pela SEFA-PR"],
  },
  {
    code: "PR-ICMS-INTERNAL-RATE-19-5",
    title: "RICMS/PR — alíquota interna geral de 19,5%",
    publisher: "Governo do Paraná",
    url: "https://www.legislacao.pr.gov.br/legislacao/listarAtosAno.do?action=exibir&anoSelecionado=2024&anoSpan=2024&codAto=321803&indice=4&isPaginado=true&mesSelecionado=3&totalRegistros=293",
    checkedAt: ST_AUTO_PARTS_HIGH_USE_CORRIDORS_CHECKED_AT,
    proves: ["alíquota interna geral de 19,5%", "vigência usada na referência controlada de 2026"],
  },
  {
    code: "BA-ICMS-LAW-7014-CURRENT",
    title: "Lei 7.014/1996 consolidada — alíquota interna e FECP da Bahia",
    publisher: "SEFAZ-BA",
    url: "https://mbusca.sefaz.ba.gov.br/DITRI/leis/leis_estaduais/legest_1996_7014_icmscomnotas.pdf",
    checkedAt: ST_AUTO_PARTS_HIGH_USE_CORRIDORS_CHECKED_AT,
    proves: ["alíquota interna geral de 20,5%", "adicional de pobreza restrito às hipóteses do art. 16-A", "produto representativo fora das hipóteses adicionais controladas"],
  },
];

const sourceByCode = new Map(stAutoPartsHighUseSources.map((source) => [source.code, source]));
const currentPartySet = new Set<string>(ST_AUTO_PARTS_PROTOCOL_41_CURRENT_PARTIES);
const destinationMvaSet = new Set<string>(ST_AUTO_PARTS_PROTOCOL_41_DESTINATION_MVA_UFS);

export type StAutoPartsProduct = {
  rank: number;
  code: string;
  cest: string;
  ncmPatterns: readonly string[];
  description: string;
  commercialLabel: string;
  scope: "controlled_product_identity";
  effectiveFrom: "2019-01-01";
  priorityBasis: "internal_editorial_priority";
  priorityReason: string;
  legalConditions: readonly string[];
  exclusions: readonly string[];
  sourceCodes: readonly ["CONFAZ-CONV-142-2018-ANNEX-II", "CONFAZ-PROTOCOL-41-2008"];
};

export const ST_AUTO_PARTS_PRODUCT_CATALOG: readonly StAutoPartsProduct[] = [
  {
    rank: 0,
    code: "GENERAL_VEHICLE_PARTS_8708",
    cest: "01.075.00",
    ncmPatterns: ["8708"],
    description: "Partes e acessórios dos veículos automóveis das posições 8701 a 8705",
    commercialLabel: "Partes e acessórios de veículos",
    scope: "controlled_product_identity",
    effectiveFrom: "2019-01-01",
    priorityBasis: "internal_editorial_priority",
    priorityReason: "produto-base já controlado pelo motor",
    legalConditions: ["descrição legal prevalece sobre o código isolado", "uso especificamente automotivo", "ST interna no destino"],
    exclusions: ["CESTs 01.019.00, 01.062.01, 01.112.00, 01.127.00, 01.128.00 e 01.999.00 não integram o Protocolo 41/08"],
    sourceCodes: ["CONFAZ-CONV-142-2018-ANNEX-II", "CONFAZ-PROTOCOL-41-2008"],
  },
  {
    rank: 1,
    code: "FRICTION_LININGS",
    cest: "01.014.00",
    ncmPatterns: ["6813"],
    description: "Guarnições de fricção (por exemplo, placas, rolos, tiras, segmentos, discos, anéis, pastilhas), não montadas, para freios, embreagens ou qualquer outro mecanismo de fricção, à base de amianto, de outras substâncias minerais ou de celulose, mesmo combinadas com têxteis ou outras matérias",
    commercialLabel: "Pastilhas e guarnições de freio",
    scope: "controlled_product_identity",
    effectiveFrom: "2019-01-01",
    priorityBasis: "internal_editorial_priority",
    priorityReason: "item de reposição recorrente priorizado editorialmente",
    legalConditions: ["a mercadoria deve corresponder à descrição legal completa", "uso especificamente automotivo", "ST interna no destino"],
    exclusions: ["produto montado ou sem correspondência com a descrição do CEST"],
    sourceCodes: ["CONFAZ-CONV-142-2018-ANNEX-II", "CONFAZ-PROTOCOL-41-2008"],
  },
  {
    rank: 2,
    code: "ENGINE_OIL_FILTER",
    cest: "01.037.00",
    ncmPatterns: ["84212300"],
    description: "Aparelhos para filtrar óleos minerais nos motores de ignição por centelha ou por compressão",
    commercialLabel: "Filtro de óleo do motor",
    scope: "controlled_product_identity",
    effectiveFrom: "2019-01-01",
    priorityBasis: "internal_editorial_priority",
    priorityReason: "item de manutenção periódica priorizado editorialmente",
    legalConditions: ["NCM e descrição legal devem coincidir", "uso especificamente automotivo", "ST interna no destino"],
    exclusions: ["filtros enquadrados em outro NCM ou CEST"],
    sourceCodes: ["CONFAZ-CONV-142-2018-ANNEX-II", "CONFAZ-PROTOCOL-41-2008"],
  },
  {
    rank: 3,
    code: "ENGINE_AIR_FILTER",
    cest: "01.041.00",
    ncmPatterns: ["84213100"],
    description: "Filtros de entrada de ar para motores de ignição por centelha ou por compressão",
    commercialLabel: "Filtro de ar do motor",
    scope: "controlled_product_identity",
    effectiveFrom: "2019-01-01",
    priorityBasis: "internal_editorial_priority",
    priorityReason: "item de manutenção periódica priorizado editorialmente",
    legalConditions: ["NCM e descrição legal devem coincidir", "uso especificamente automotivo", "ST interna no destino"],
    exclusions: ["filtro de cabine ou de pólen, classificado separadamente"],
    sourceCodes: ["CONFAZ-CONV-142-2018-ANNEX-II", "CONFAZ-PROTOCOL-41-2008"],
  },
  {
    rank: 4,
    code: "BEARINGS",
    cest: "01.049.00",
    ncmPatterns: ["8482"],
    description: "Rolamentos",
    commercialLabel: "Rolamentos",
    scope: "controlled_product_identity",
    effectiveFrom: "2019-01-01",
    priorityBasis: "internal_editorial_priority",
    priorityReason: "componente de reposição priorizado editorialmente",
    legalConditions: ["a descrição e a posição NCM devem coincidir", "uso especificamente automotivo", "ST interna no destino"],
    exclusions: ["rolamento sem uso especificamente automotivo na operação"],
    sourceCodes: ["CONFAZ-CONV-142-2018-ANNEX-II", "CONFAZ-PROTOCOL-41-2008"],
  },
  {
    rank: 5,
    code: "STARTER_BATTERY",
    cest: "01.053.00",
    ncmPatterns: ["850710"],
    description: "Acumuladores elétricos de chumbo, do tipo utilizado para o arranque dos motores de pistão, exceto os classificados no CEST 01.053.01",
    commercialLabel: "Bateria de partida",
    scope: "controlled_product_identity",
    effectiveFrom: "2019-01-01",
    priorityBasis: "internal_editorial_priority",
    priorityReason: "item de reposição de alto giro priorizado editorialmente",
    legalConditions: ["NCM, capacidade, tensão e descrição devem ser conferidos", "uso especificamente automotivo", "ST interna no destino"],
    exclusions: ["CEST 01.053.01: capacidade inferior ou igual a 20 Ah e tensão inferior ou igual a 12 V"],
    sourceCodes: ["CONFAZ-CONV-142-2018-ANNEX-II", "CONFAZ-PROTOCOL-41-2008"],
  },
  {
    rank: 6,
    code: "IGNITION_AND_STARTING_DEVICES",
    cest: "01.054.00",
    ncmPatterns: ["8511"],
    description: "Aparelhos e dispositivos elétricos de ignição ou de arranque para motores de ignição por centelha ou por compressão (por exemplo, magnetos, dínamos-magnetos, bobinas de ignição, velas de ignição ou de aquecimento, motores de arranque); geradores (dínamos e alternadores, por exemplo) e conjuntores-disjuntores utilizados com estes motores",
    commercialLabel: "Ignição, partida e alternadores",
    scope: "controlled_product_identity",
    effectiveFrom: "2019-01-01",
    priorityBasis: "internal_editorial_priority",
    priorityReason: "família elétrica de reposição priorizada editorialmente",
    legalConditions: ["a descrição e a posição NCM devem coincidir", "uso especificamente automotivo", "ST interna no destino"],
    exclusions: ["aparelho elétrico sem correspondência com a descrição do CEST"],
    sourceCodes: ["CONFAZ-CONV-142-2018-ANNEX-II", "CONFAZ-PROTOCOL-41-2008"],
  },
] as const;

const representativeProduct = ST_AUTO_PARTS_PRODUCT_CATALOG[0];

function normalizeFiscalCode(value: string) {
  return value.replace(/\D/g, "");
}

export function findControlledAutoPartsProduct(cest: string, ncm: string) {
  const normalizedCest = normalizeFiscalCode(cest);
  const normalizedNcm = normalizeFiscalCode(ncm);
  return ST_AUTO_PARTS_PRODUCT_CATALOG.find((product) =>
    normalizeFiscalCode(product.cest) === normalizedCest
    && product.ncmPatterns.some((pattern) => normalizedNcm.startsWith(normalizeFiscalCode(pattern))),
  ) ?? null;
}

export const ST_AUTO_PARTS_OPERATION_FACT_LABELS = {
  productIdentityConfirmed: "descrição legal, NCM e CEST do produto conferidos",
  automotiveUseConfirmed: "uso especificamente automotivo confirmado",
  destinationInternalStConfirmed: "sujeição interna à ST no destino confirmada",
  taxpayerRolesConfirmed: "papéis e regimes do remetente e destinatário confirmados",
  operationPurposeConfirmed: "operação destinada à revenda; uso, consumo, ativo e consumidor final afastados",
  noSpecialTreatmentConfirmed: "benefícios, regimes especiais e exceções afastados",
  priceBasisConfirmed: "base, frete, seguro, impostos e encargos confirmados",
  noSpecificRateExceptionConfirmed: "alíquota específica por NCM/descrição afastada",
  documentsConfirmed: "documentos fiscais e comerciais conferidos",
} as const;

export type AutoPartsOperationFacts = Record<keyof typeof ST_AUTO_PARTS_OPERATION_FACT_LABELS, boolean>;
export type AutoPartsCommercialCondition = "fidelity" | "standard";
export type AutoPartsOperationInput = {
  route: string;
  operationDate: string;
  operationCents: number;
  ownIcmsBaseCents: number;
  cest: string;
  ncm: string;
  importedQualified: boolean;
  productOrigin?: "domestic" | "imported";
  importRuleQualification?: "not_applicable" | "qualifies" | "does_not_qualify" | "unknown";
  commercialCondition: AutoPartsCommercialCondition;
  facts: AutoPartsOperationFacts;
};

const destinationParameters = {
  MG: { fidelityMvaBps: 3_656, standardMvaBps: 7_178, internalRateBps: 1_800, fcpRateBps: 0 },
  RJ: { fidelityMvaBps: 3_656, standardMvaBps: 7_178, internalRateBps: 2_000, fcpRateBps: 200 },
  PR: { fidelityMvaBps: 3_656, standardMvaBps: 7_178, internalRateBps: 1_950, fcpRateBps: 0 },
  BA: { fidelityMvaBps: 3_656, standardMvaBps: 7_178, internalRateBps: 2_050, fcpRateBps: 0 },
  SP: { fidelityMvaBps: 4_719, standardMvaBps: 7_215, internalRateBps: 1_800, fcpRateBps: 0 },
} as const;

const allOperationFacts: AutoPartsOperationFacts = Object.fromEntries(
  Object.keys(ST_AUTO_PARTS_OPERATION_FACT_LABELS).map((key) => [key, true]),
) as AutoPartsOperationFacts;

function domesticInterstateRateBps(origin: string, destination: string) {
  return origin === "SP" && destination === "BA" ? 700 : 1_200;
}

function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export type AutoPartsOperationResult = {
  status: "calculated_reference" | "blocked" | "st_not_applicable_after_state_exclusion";
  route: string;
  operationDate: string;
  product: StAutoPartsProduct | null;
  missingFacts: string[];
  blockers: string[];
  parameters: null | {
    commercialCondition: AutoPartsCommercialCondition;
    importedQualified: boolean;
    mvaOriginalBps: number;
    interstateRateBps: number;
    internalRateBps: number;
    fcpRateBps: number;
  };
  output: null | ReturnType<typeof calculateRepresentativeStMemory>;
  sourceCodes: string[];
  limitation: string;
};

const commonRealOperationBlockers = [
  "confirmar descrição, NCM, CEST e uso especificamente automotivo",
  "confirmar sujeição à ST nas operações internas do destino",
  "confirmar regime e papel do remetente e do destinatário",
  "afastar industrialização, transferência não varejista, benefício e regime especial",
  "confirmar vigência, preço sugerido ou base por MVA, frete, seguro, impostos e demais encargos",
];

export type StAutoPartsHighUseRoute = {
  corridorRank: number;
  direction: "outbound" | "return";
  origin: StAutoPartsHighUseUf;
  destination: StAutoPartsHighUseUf;
  route: string;
  agreementStatus: "protocol_41_active" | "outside_protocol_41";
  agreementReason: string;
  responsibleParty: "interstate_sender_as_tax_substitute_subject_to_protocol_exceptions" | null;
  directionalSymmetryAssumed: false;
  product: typeof representativeProduct;
  parameterMethod: "protocol_mva" | "destination_internal_mva" | "destination_own_treatment_required";
  mvaOriginalBps: number | null;
  adjustedMvaBpsFor12: number | null;
  officialInternalRateBps: number | null;
  officialFcpRateBps: number | null;
  calculationStatus: "synthetic_reference_reproduced" | "blocked_destination_parameters" | "blocked_protocol_not_applicable";
  sourceCodes: string[];
  confirmedInputs: string[];
  remainingBlockers: string[];
  scheduledReview: null | { effectiveFrom: "2026-10-01"; reason: string; sourceCode: "SP-SRE-34-2026-ST-EXCLUSION" };
  syntheticReference: null | ReturnType<typeof calculateRepresentativeStMemory>;
};

function stateSourceCodes(origin: StAutoPartsHighUseUf, destination: StAutoPartsHighUseUf) {
  const codes: string[] = [];
  const involved = new Set([origin, destination]);
  if (involved.has("MG")) codes.push("MG-RICMS-2023-ANNEX-VII-AUTO-PARTS");
  if (involved.has("RJ")) codes.push("RJ-RICMS-LIVRO-II-ANNEX-I-AUTO-PARTS", "RJ-ICMS-INTERNAL-RATES-FECP");
  if (involved.has("SP")) codes.push("SP-PORTARIA-CAT-68-2019-ANNEX-XIV", "SP-SRE-16-2023-AUTO-PARTS-BASE", "SP-SRE-34-2026-ST-EXCLUSION", "SP-RICMS-INTERNAL-RATE-18");
  if (involved.has("BA")) codes.push("BA-RICMS-ANNEX-I-2026", "BA-ICMS-LAW-7014-CURRENT");
  if (involved.has("PR")) codes.push("PR-RICMS-DECREE-7871-2017", "PR-SEFA-571-2019-AUTO-PARTS-MVA", "PR-ICMS-INTERNAL-RATE-19-5");
  if (involved.has("SC")) codes.push("SC-RICMS-ANNEX-1A-CURRENT");
  if (involved.has("PE")) codes.push("PE-AUTO-PARTS-CONSOLIDATED");
  return codes;
}

export function resolveAutoPartsPriorityOperation(input: AutoPartsOperationInput): AutoPartsOperationResult {
  const route = stAutoPartsHighUseRouteByKey.get(input.route);
  const product = findControlledAutoPartsProduct(input.cest, input.ncm);
  const productOrigin = input.productOrigin ?? (input.importedQualified ? "imported" : "domestic");
  const importRuleQualification = input.importRuleQualification
    ?? (input.importedQualified ? "qualifies" : "not_applicable");
  const qualifiedImported = productOrigin === "imported" && importRuleQualification === "qualifies";
  const missingFacts = Object.entries(ST_AUTO_PARTS_OPERATION_FACT_LABELS)
    .filter(([key]) => input.facts?.[key as keyof AutoPartsOperationFacts] !== true)
    .map(([, label]) => label);
  const blockers: string[] = [];
  if (!route || route.agreementStatus !== "protocol_41_active") blockers.push("rota fora das dez direções prioritárias com Protocolo 41/08 ativo");
  if (!isIsoDate(input.operationDate) || input.operationDate < ST_AUTO_PARTS_SUPPORTED_PERIOD.from || input.operationDate > ST_AUTO_PARTS_SUPPORTED_PERIOD.to) blockers.push("data da operação fora do período controlado de 2026");
  if (!product) blockers.push("combinação NCM/CEST fora dos sete produtos de autopeças controlados");
  if (!Number.isSafeInteger(input.operationCents) || input.operationCents <= 0 || input.operationCents > 100_000_000_000) blockers.push("valor da operação inválido ou acima do limite controlado");
  if (!Number.isSafeInteger(input.ownIcmsBaseCents) || input.ownIcmsBaseCents <= 0 || input.ownIcmsBaseCents > 100_000_000_000) blockers.push("base do ICMS próprio inválida");
  if (input.commercialCondition !== "fidelity" && input.commercialCondition !== "standard") blockers.push("condição comercial de fidelidade não informada");
  if (productOrigin === "imported" && importRuleQualification !== "qualifies") blockers.push("origem importada sem qualificação confirmada na Resolução do Senado nº 13/2012");
  if (productOrigin === "domestic" && importRuleQualification !== "not_applicable") blockers.push("qualificação de mercadoria importada incompatível com a origem nacional informada");
  blockers.push(...missingFacts);
  const baseResult = {
    route: input.route,
    operationDate: input.operationDate,
    product,
    missingFacts,
    sourceCodes: route?.sourceCodes ?? ["CONFAZ-PROTOCOL-41-2008", "CONFAZ-CONV-142-2018-ANNEX-II"],
    limitation: "Memória determinística condicional do produto controlado. Não substitui a classificação fiscal, a escrituração nem a responsabilidade técnica sobre a operação real.",
  };
  if (blockers.length > 0 || !route) return { ...baseResult, status: "blocked", blockers, parameters: null, output: null };
  if (route.destination === "SP" && input.operationDate >= ST_AUTO_PARTS_SP_EXCLUSION_FROM) {
    return {
      ...baseResult,
      status: "st_not_applicable_after_state_exclusion",
      blockers: ["a ST paulista de autopeças controlada foi excluída a partir de 01/10/2026; apure o ICMS pelo tratamento vigente da operação e confira o estoque de transição"],
      parameters: null,
      output: null,
    };
  }
  const parameters = destinationParameters[route.destination as keyof typeof destinationParameters];
  if (!parameters) return { ...baseResult, status: "blocked", blockers: ["parâmetros estaduais do destino não congelados"], parameters: null, output: null };
  const interstateRateBps = qualifiedImported ? 400 : domesticInterstateRateBps(route.origin, route.destination);
  const mvaOriginalBps = input.commercialCondition === "fidelity" ? parameters.fidelityMvaBps : parameters.standardMvaBps;
  const calculationParameters = {
    commercialCondition: input.commercialCondition,
    importedQualified: qualifiedImported,
    mvaOriginalBps,
    interstateRateBps,
    internalRateBps: parameters.internalRateBps,
    fcpRateBps: parameters.fcpRateBps,
  };
  return {
    ...baseResult,
    status: "calculated_reference",
    blockers: [],
    parameters: calculationParameters,
    output: calculateRepresentativeStMemory({
      operationCents: input.operationCents,
      ownIcmsBaseCents: input.ownIcmsBaseCents,
      mvaOriginalBps,
      interstateRateBps,
      internalRateBps: parameters.internalRateBps,
      fcpRateBps: parameters.fcpRateBps,
      adjustMva: true,
    }),
  };
}

function buildDirection(corridorRank: number, origin: StAutoPartsHighUseUf, destination: StAutoPartsHighUseUf, direction: "outbound" | "return"): StAutoPartsHighUseRoute {
  const originParticipates = currentPartySet.has(origin);
  const destinationParticipates = currentPartySet.has(destination);
  const active = originParticipates && destinationParticipates;
  const destinationMva = active && destinationMvaSet.has(destination);
  const parameterMethod = !active
    ? "destination_own_treatment_required" as const
    : destinationMva
      ? "destination_internal_mva" as const
      : "protocol_mva" as const;
  const sourceCodes = ["CONFAZ-PROTOCOL-41-2008", "CONFAZ-CONV-142-2018-ANNEX-II", ...stateSourceCodes(origin, destination)];
  const missingMembership = [
    ...(!originParticipates ? [`a origem ${origin} não integra o protocolo vigente`] : []),
    ...(!destinationParticipates ? [`o destino ${destination} não consta no âmbito atual do protocolo`] : []),
  ];
  const route: StAutoPartsHighUseRoute = {
    corridorRank,
    direction,
    origin,
    destination,
    route: `${origin}-${destination}`,
    agreementStatus: active ? "protocol_41_active" : "outside_protocol_41",
    agreementReason: active
      ? `${origin} e ${destination} integram o âmbito vigente; a direção ${origin}→${destination} ainda depende da regra interna do destino e dos fatos da operação.`
      : `${origin}→${destination} não pode usar automaticamente o Protocolo 41/08 porque ${missingMembership.join(" e ")}.`,
    responsibleParty: active ? "interstate_sender_as_tax_substitute_subject_to_protocol_exceptions" : null,
    directionalSymmetryAssumed: false,
    product: representativeProduct,
    parameterMethod,
    mvaOriginalBps: active && !destinationMva ? 7_178 : null,
    adjustedMvaBpsFor12: null,
    officialInternalRateBps: null,
    officialFcpRateBps: null,
    calculationStatus: active ? "blocked_destination_parameters" : "blocked_protocol_not_applicable",
    sourceCodes: [...new Set(sourceCodes)],
    confirmedInputs: active
      ? [
          "origem e destino no âmbito vigente do Protocolo 41/08",
          "identidade representativa CEST 01.075.00 / NCM 8708",
          destinationMva ? `MVA deve vir da legislação interna de ${destination}` : "MVA original protocolar de 71,78% nos casos sem fidelidade",
        ]
      : ["direção confrontada com o âmbito vigente", "produto representativo identificado somente para triagem"],
    remainingBlockers: active
      ? [
          ...commonRealOperationBlockers,
          destinationMva ? `congelar a MVA estadual vigente de ${destination}` : "confirmar ausência de contrato de fidelidade que altere a MVA original",
          "confirmar alíquota interna, FCP e eventual base alternativa do destino",
        ]
      : [
          "não aplicar MVA protocolar nem tabela histórica",
          `determinar o tratamento próprio vigente da operação em ${destination}`,
          "confirmar ST interna, antecipação, DIFAL ou tributação normal conforme os fatos",
        ],
    scheduledReview: destination === "SP" ? {
      effectiveFrom: "2026-10-01",
      reason: "A Portaria SRE 34/2026 exclui as autopeças controladas da ST paulista a partir desta data; o sistema deixa de calcular ST e orienta a apuração do tratamento vigente.",
      sourceCode: "SP-SRE-34-2026-ST-EXCLUSION",
    } : null,
    syntheticReference: null,
  };

  const parameters = destinationParameters[destination as keyof typeof destinationParameters];
  if (active && parameters) {
    const interstateRateBps = domesticInterstateRateBps(origin, destination);
    const reference = calculateRepresentativeStMemory({
      operationCents: 100_000,
      ownIcmsBaseCents: 100_000,
      mvaOriginalBps: parameters.standardMvaBps,
      interstateRateBps,
      internalRateBps: parameters.internalRateBps,
      fcpRateBps: parameters.fcpRateBps,
      adjustMva: true,
    });
    route.mvaOriginalBps = parameters.standardMvaBps;
    route.adjustedMvaBpsFor12 = interstateRateBps === 1_200 ? reference.mvaAppliedBps : null;
    route.officialInternalRateBps = parameters.internalRateBps;
    route.officialFcpRateBps = parameters.fcpRateBps;
    route.calculationStatus = "synthetic_reference_reproduced";
    route.syntheticReference = reference;
    route.confirmedInputs.push(`memória sintética de R$ 1.000 reproduzida centavo a centavo com alíquota interestadual de ${(interstateRateBps / 100).toFixed(0)}%`);
  }

  return route;
}

export const stAutoPartsHighUseRoutes: StAutoPartsHighUseRoute[] = ST_AUTO_PARTS_HIGH_USE_CORRIDORS.flatMap(([first, second], index) => [
  buildDirection(index + 1, first, second, "outbound"),
  buildDirection(index + 1, second, first, "return"),
]);

export const stAutoPartsHighUseRouteByKey = new Map(stAutoPartsHighUseRoutes.map((route) => [route.route, route]));

export type StAutoPartsProductRouteCell = {
  key: string;
  productCode: string;
  cest: string;
  ncmPatterns: readonly string[];
  route: string;
  status: "supported" | "partial" | "not_supported";
  effectiveFrom: "2026-01-01";
  effectiveTo: "2026-09-30" | "2026-12-31";
  parameterVersion: typeof ST_AUTO_PARTS_HIGH_USE_CORRIDORS_VERSION;
  sourceCodes: string[];
  legalResolution: string;
  responsibleParty: StAutoPartsHighUseRoute["responsibleParty"];
  parameterSnapshot: null | {
    method: StAutoPartsHighUseRoute["parameterMethod"];
    mvaOriginalBps: number;
    adjustedMvaBpsFor12: number | null;
    internalRateBps: number;
    fcpRateBps: number;
    effectiveFrom: "2026-01-01";
    effectiveTo: "2026-09-30" | "2026-12-31";
  };
  blockers: string[];
  syntheticReference: null | ReturnType<typeof calculateRepresentativeStMemory>;
};

export const stAutoPartsProductRouteCells: StAutoPartsProductRouteCell[] = ST_AUTO_PARTS_PRODUCT_CATALOG.flatMap((product) =>
  stAutoPartsHighUseRoutes.map((route) => ({
    key: `${product.code}:${route.route}`,
    productCode: product.code,
    cest: product.cest,
    ncmPatterns: product.ncmPatterns,
    route: route.route,
    status: route.agreementStatus === "protocol_41_active" && route.syntheticReference
      ? "supported" as const
      : route.agreementStatus === "outside_protocol_41"
        ? "not_supported" as const
        : "not_supported" as const,
    effectiveFrom: ST_AUTO_PARTS_SUPPORTED_PERIOD.from,
    effectiveTo: route.destination === "SP" ? "2026-09-30" as const : ST_AUTO_PARTS_SUPPORTED_PERIOD.to,
    parameterVersion: ST_AUTO_PARTS_HIGH_USE_CORRIDORS_VERSION,
    sourceCodes: [...new Set([...product.sourceCodes, ...route.sourceCodes])],
    legalResolution: route.agreementStatus === "protocol_41_active"
      ? `${route.agreementReason} Os parâmetros do destino e a memória de referência estão congelados para o período controlado.`
      : `${route.agreementReason} A célula não emite valor porque não foi comprovada regra própria vigente do destino.`,
    responsibleParty: route.responsibleParty,
    parameterSnapshot: route.syntheticReference && route.mvaOriginalBps !== null && route.officialInternalRateBps !== null && route.officialFcpRateBps !== null
      ? {
          method: route.parameterMethod,
          mvaOriginalBps: route.mvaOriginalBps,
          adjustedMvaBpsFor12: route.adjustedMvaBpsFor12,
          internalRateBps: route.officialInternalRateBps,
          fcpRateBps: route.officialFcpRateBps,
          effectiveFrom: ST_AUTO_PARTS_SUPPORTED_PERIOD.from,
          effectiveTo: route.destination === "SP" ? "2026-09-30" : ST_AUTO_PARTS_SUPPORTED_PERIOD.to,
        }
      : null,
    blockers: route.agreementStatus === "protocol_41_active"
      ? [
          "confirmar identidade fiscal e uso especificamente automotivo",
          "confirmar ST interna no destino e os fatos documentais da operação",
          ...(route.destination === "SP" ? ["não utilizar a memória em operações a partir de 01/10/2026"] : []),
        ]
      : [...route.remainingBlockers],
    syntheticReference: route.syntheticReference,
  })),
);

export type StAutoPartsProductRouteAuditKind =
  | "baseline"
  | "product_mismatch"
  | "benefit_present"
  | "import_qualification_unknown"
  | "rate_exception_present"
  | "date_outside_validity";

export type StAutoPartsProductRouteAuditCase = {
  code: string;
  cellKey: string;
  kind: StAutoPartsProductRouteAuditKind;
  expectedStatus: AutoPartsOperationResult["status"];
  actualStatus: AutoPartsOperationResult["status"];
  passed: boolean;
  outputDestinationTotalCents: number | null;
  blockers: string[];
};

function auditInputForCell(cell: StAutoPartsProductRouteCell): AutoPartsOperationInput {
  const product = ST_AUTO_PARTS_PRODUCT_CATALOG.find((item) => item.code === cell.productCode);
  if (!product) throw new Error(`auto_parts_product_missing:${cell.productCode}`);
  return {
    route: cell.route,
    operationDate: cell.effectiveTo,
    operationCents: 100_000,
    ownIcmsBaseCents: 100_000,
    cest: product.cest,
    ncm: product.ncmPatterns[0],
    importedQualified: false,
    productOrigin: "domestic",
    importRuleQualification: "not_applicable",
    commercialCondition: "standard",
    facts: allOperationFacts,
  };
}

function executeCellAudit(cell: StAutoPartsProductRouteCell, kind: StAutoPartsProductRouteAuditKind): StAutoPartsProductRouteAuditCase {
  const baseline = auditInputForCell(cell);
  const input: AutoPartsOperationInput = kind === "product_mismatch"
    ? { ...baseline, ncm: "00000000" }
    : kind === "benefit_present"
      ? { ...baseline, facts: { ...baseline.facts, noSpecialTreatmentConfirmed: false } }
      : kind === "import_qualification_unknown"
        ? { ...baseline, productOrigin: "imported", importRuleQualification: "unknown" }
        : kind === "rate_exception_present"
          ? { ...baseline, facts: { ...baseline.facts, noSpecificRateExceptionConfirmed: false } }
          : kind === "date_outside_validity"
            ? { ...baseline, operationDate: "2025-12-31" }
            : baseline;
  const expectedStatus: AutoPartsOperationResult["status"] = kind === "baseline" && cell.status === "supported"
    ? "calculated_reference"
    : "blocked";
  const result = resolveAutoPartsPriorityOperation(input);
  return {
    code: `${cell.key}:${kind}`,
    cellKey: cell.key,
    kind,
    expectedStatus,
    actualStatus: result.status,
    passed: result.status === expectedStatus && (expectedStatus === "calculated_reference" ? result.output !== null : result.output === null),
    outputDestinationTotalCents: result.output?.destinationTotalCents ?? null,
    blockers: [...result.blockers],
  };
}

const AUTO_PARTS_AUDIT_KINDS: readonly StAutoPartsProductRouteAuditKind[] = [
  "baseline",
  "product_mismatch",
  "benefit_present",
  "import_qualification_unknown",
  "rate_exception_present",
  "date_outside_validity",
];

export const stAutoPartsProductRouteAuditCases: StAutoPartsProductRouteAuditCase[] = stAutoPartsProductRouteCells.flatMap((cell) =>
  AUTO_PARTS_AUDIT_KINDS.map((kind) => executeCellAudit(cell, kind)),
);

export function stAutoPartsHighUseCorridorMetrics() {
  const cellStatuses = {
    supported: stAutoPartsProductRouteCells.filter((cell) => cell.status === "supported").length,
    partial: stAutoPartsProductRouteCells.filter((cell) => cell.status === "partial").length,
    notSupported: stAutoPartsProductRouteCells.filter((cell) => cell.status === "not_supported").length,
  };
  return {
    corridors: ST_AUTO_PARTS_HIGH_USE_CORRIDORS.length,
    directedRoutes: stAutoPartsHighUseRoutes.length,
    controlledProducts: ST_AUTO_PARTS_PRODUCT_CATALOG.length,
    newlyControlledProducts: ST_AUTO_PARTS_PRODUCT_CATALOG.filter((product) => product.rank > 0).length,
    productRouteCells: stAutoPartsProductRouteCells.length,
    supportedProductRouteCells: cellStatuses.supported,
    partialProductRouteCells: cellStatuses.partial,
    notSupportedProductRouteCells: cellStatuses.notSupported,
    deterministicProductRouteMemories: stAutoPartsProductRouteCells.filter((cell) => cell.syntheticReference !== null).length,
    deterministicProductRouteCases: stAutoPartsProductRouteAuditCases.length,
    calculatedProductRouteCases: stAutoPartsProductRouteAuditCases.filter((item) => item.actualStatus === "calculated_reference" && item.passed).length,
    safelyBlockedProductRouteCases: stAutoPartsProductRouteAuditCases.filter((item) => item.actualStatus === "blocked" && item.passed).length,
    failedProductRouteCases: stAutoPartsProductRouteAuditCases.filter((item) => !item.passed).length,
    activeAgreementRoutes: stAutoPartsHighUseRoutes.filter((route) => route.agreementStatus === "protocol_41_active").length,
    outsideProtocolRoutes: stAutoPartsHighUseRoutes.filter((route) => route.agreementStatus === "outside_protocol_41").length,
    protocolMvaRoutes: stAutoPartsHighUseRoutes.filter((route) => route.parameterMethod === "protocol_mva").length,
    destinationMvaRoutes: stAutoPartsHighUseRoutes.filter((route) => route.parameterMethod === "destination_internal_mva").length,
    syntheticReferencesReproduced: stAutoPartsHighUseRoutes.filter((route) => route.syntheticReference !== null).length,
    safelyBlocked: stAutoPartsHighUseRoutes.filter((route) => route.syntheticReference === null).length,
    scheduledLegalReviews: stAutoPartsHighUseRoutes.filter((route) => route.scheduledReview !== null).length,
    officialSources: stAutoPartsHighUseSources.length,
  };
}

export function validateStAutoPartsHighUseCorridors() {
  const errors: string[] = [];
  const expectedRoutes = [
    "SP-MG", "MG-SP", "SP-RJ", "RJ-SP", "SP-PR", "PR-SP", "SP-SC", "SC-SP", "SP-RS", "RS-SP", "SP-GO", "GO-SP",
    "SP-BA", "BA-SP", "MG-RJ", "RJ-MG", "PR-SC", "SC-PR", "SC-RS", "RS-SC", "BA-PE", "PE-BA", "GO-DF", "DF-GO",
  ];
  const expectedActive = ["SP-MG", "MG-SP", "SP-RJ", "RJ-SP", "SP-PR", "PR-SP", "SP-BA", "BA-SP", "MG-RJ", "RJ-MG"];
  if (ST_AUTO_PARTS_HIGH_USE_CORRIDORS.length !== 12) errors.push("priority_corridors_must_have_twelve_pairs");
  if (stAutoPartsHighUseRoutes.length !== 24 || new Set(stAutoPartsHighUseRoutes.map((route) => route.route)).size !== 24) errors.push("priority_corridors_must_have_twenty_four_unique_directions");
  if (stAutoPartsHighUseRoutes.map((route) => route.route).join(",") !== expectedRoutes.join(",")) errors.push("priority_direction_order_changed");
  if (stAutoPartsHighUseRoutes.filter((route) => route.agreementStatus === "protocol_41_active").map((route) => route.route).join(",") !== expectedActive.join(",")) errors.push("priority_active_protocol_routes_changed");
  if (stAutoPartsHighUseSources.length !== 16 || new Set(stAutoPartsHighUseSources.map((source) => source.code)).size !== 16) errors.push("priority_sources_must_be_sixteen_unique_official_records");
  if (stAutoPartsHighUseSources.some((source) => !source.url.startsWith("https://") || source.proves.length === 0)) errors.push("priority_source_must_be_https_with_scope");
  for (const route of stAutoPartsHighUseRoutes) {
    if (route.directionalSymmetryAssumed !== false) errors.push(`directional_symmetry_forbidden:${route.route}`);
    if (route.sourceCodes.some((code) => !sourceByCode.has(code))) errors.push(`unknown_priority_source:${route.route}`);
    if (route.remainingBlockers.length === 0) errors.push(`real_operation_gate_required:${route.route}`);
    if (route.product.cest !== "01.075.00" || !route.product.ncmPatterns.includes("8708")) errors.push(`representative_identity_changed:${route.route}`);
    if (route.agreementStatus === "outside_protocol_41" && (route.mvaOriginalBps !== null || route.syntheticReference !== null || route.calculationStatus !== "blocked_protocol_not_applicable")) errors.push(`outside_route_leaked_value:${route.route}`);
    if (route.agreementStatus === "protocol_41_active" && (!currentPartySet.has(route.origin) || !currentPartySet.has(route.destination))) errors.push(`active_route_has_nonparty:${route.route}`);
    if (route.destination === "SP" && route.scheduledReview?.effectiveFrom !== "2026-10-01") errors.push(`sp_destination_transition_missing:${route.route}`);
    if (route.destination !== "SP" && route.scheduledReview !== null) errors.push(`unexpected_scheduled_review:${route.route}`);
  }
  const metrics = stAutoPartsHighUseCorridorMetrics();
  if (metrics.activeAgreementRoutes !== 10 || metrics.outsideProtocolRoutes !== 14) errors.push("priority_protocol_partition_changed");
  if (metrics.protocolMvaRoutes !== 4 || metrics.destinationMvaRoutes !== 6) errors.push("priority_mva_partition_changed");
  if (metrics.syntheticReferencesReproduced !== 10 || metrics.safelyBlocked !== 14) errors.push("priority_reference_partition_changed");
  if (metrics.controlledProducts !== 7 || metrics.newlyControlledProducts !== 6) errors.push("priority_product_catalog_changed");
  if (metrics.productRouteCells !== 168 || metrics.supportedProductRouteCells !== 70 || metrics.partialProductRouteCells !== 0 || metrics.notSupportedProductRouteCells !== 98) errors.push("priority_product_route_partition_changed");
  if (metrics.deterministicProductRouteMemories !== 70) errors.push("priority_product_route_memories_changed");
  if (metrics.deterministicProductRouteCases !== 1_008 || metrics.calculatedProductRouteCases !== 70 || metrics.safelyBlockedProductRouteCases !== 938 || metrics.failedProductRouteCases !== 0) errors.push("priority_product_route_audit_changed");
  if (new Set(ST_AUTO_PARTS_PRODUCT_CATALOG.map((product) => product.cest)).size !== ST_AUTO_PARTS_PRODUCT_CATALOG.length) errors.push("priority_product_cest_must_be_unique");
  for (const product of ST_AUTO_PARTS_PRODUCT_CATALOG) {
    if (product.sourceCodes.some((code) => !sourceByCode.has(code))) errors.push(`unknown_product_source:${product.code}`);
    if (product.legalConditions.length === 0 || product.exclusions.length === 0) errors.push(`product_legal_scope_incomplete:${product.code}`);
    if (!findControlledAutoPartsProduct(product.cest, product.ncmPatterns[0])) errors.push(`product_identity_not_resolvable:${product.code}`);
  }
  for (const cell of stAutoPartsProductRouteCells) {
    if (cell.sourceCodes.some((code) => !sourceByCode.has(code))) errors.push(`unknown_product_route_source:${cell.key}`);
    if (cell.status === "supported" && (!cell.syntheticReference || cell.blockers.length === 0)) errors.push(`supported_product_route_incomplete:${cell.key}`);
    if (cell.status !== "supported" && cell.syntheticReference !== null) errors.push(`blocked_product_route_leaked_value:${cell.key}`);
    if (cell.legalResolution.length < 80) errors.push(`explicit_legal_resolution_missing:${cell.key}`);
    if (cell.status === "supported" && (cell.responsibleParty === null || cell.parameterSnapshot === null)) errors.push(`supported_parameter_snapshot_incomplete:${cell.key}`);
    if (cell.status === "not_supported" && (cell.responsibleParty !== null || cell.parameterSnapshot !== null || cell.blockers.length < 3)) errors.push(`blocked_cell_resolution_incomplete:${cell.key}`);
  }
  if (stAutoPartsProductRouteAuditCases.length !== 1_008 || new Set(stAutoPartsProductRouteAuditCases.map((item) => item.code)).size !== 1_008) errors.push("priority_audit_cases_must_be_unique");
  if (stAutoPartsProductRouteAuditCases.some((item) => !item.passed)) errors.push("priority_audit_case_failed");
  for (const key of ["SP-MG", "RJ-MG"]) {
    const reference = stAutoPartsHighUseRouteByKey.get(key)?.syntheticReference;
    if (reference?.destinationTotalCents !== 21_183) errors.push(`mg_reference_did_not_reproduce:${key}`);
  }
  for (const key of ["SP-RJ", "MG-RJ"]) {
    const reference = stAutoPartsHighUseRouteByKey.get(key)?.syntheticReference;
    if (reference?.destinationTotalCents !== 29_571) errors.push(`rj_reference_did_not_reproduce:${key}`);
  }
  const expectedNewReferences = new Map([
    ["MG-SP", 21_255], ["RJ-SP", 21_255], ["SP-PR", 24_617], ["PR-SP", 21_255], ["SP-BA", 34_195], ["BA-SP", 21_255],
  ]);
  for (const [key, total] of expectedNewReferences) {
    if (stAutoPartsHighUseRouteByKey.get(key)?.syntheticReference?.destinationTotalCents !== total) errors.push(`new_reference_did_not_reproduce:${key}`);
  }
  const completeInput: AutoPartsOperationInput = {
    route: "MG-SP",
    operationDate: "2026-09-30",
    operationCents: 100_000,
    ownIcmsBaseCents: 100_000,
    cest: "01.075.00",
    ncm: "8708",
    importedQualified: false,
    commercialCondition: "standard",
    facts: allOperationFacts,
  };
  if (resolveAutoPartsPriorityOperation(completeInput).output?.destinationTotalCents !== 21_255) errors.push("temporal_reference_before_sp_exclusion_failed");
  const afterExclusion = resolveAutoPartsPriorityOperation({ ...completeInput, operationDate: ST_AUTO_PARTS_SP_EXCLUSION_FROM });
  if (afterExclusion.status !== "st_not_applicable_after_state_exclusion" || afterExclusion.output !== null) errors.push("sp_exclusion_transition_failed");
  const missingFacts = resolveAutoPartsPriorityOperation({ ...completeInput, facts: { ...allOperationFacts, documentsConfirmed: false } });
  if (missingFacts.status !== "blocked" || missingFacts.output !== null || missingFacts.missingFacts.length !== 1) errors.push("operation_fact_gate_failed");
  const imported = resolveAutoPartsPriorityOperation({ ...completeInput, route: "SP-BA", importedQualified: true });
  if (imported.parameters?.interstateRateBps !== 400 || imported.output === null) errors.push("imported_interstate_rate_failed");
  return { passed: errors.length === 0, errors };
}

export async function hashStAutoPartsHighUseCorridors() {
  const payload = JSON.stringify({
    version: ST_AUTO_PARTS_HIGH_USE_CORRIDORS_VERSION,
    parties: ST_AUTO_PARTS_PROTOCOL_41_CURRENT_PARTIES,
    destinationMvaUfs: ST_AUTO_PARTS_PROTOCOL_41_DESTINATION_MVA_UFS,
    supportedPeriod: ST_AUTO_PARTS_SUPPORTED_PERIOD,
    spExclusionFrom: ST_AUTO_PARTS_SP_EXCLUSION_FROM,
    corridors: ST_AUTO_PARTS_HIGH_USE_CORRIDORS,
    sources: stAutoPartsHighUseSources,
    routes: stAutoPartsHighUseRoutes,
    products: ST_AUTO_PARTS_PRODUCT_CATALOG,
    productRouteCells: stAutoPartsProductRouteCells,
    productRouteAuditCases: stAutoPartsProductRouteAuditCases,
  });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

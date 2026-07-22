import { stSegments } from "./national-tax-coverage.ts";

export const ST_SP_MG_LEGAL_VERSION = "2026.07.21-v57";
export const ST_SP_MG_CHECKED_AT = "2026-07-21";

export type StLegalFactCode =
  | "operation_date"
  | "product_description"
  | "ncm"
  | "cest"
  | "origin_uf"
  | "destination_uf"
  | "issuer_regime"
  | "recipient_taxpayer"
  | "operation_purpose"
  | "route_agreement"
  | "destination_internalization"
  | "price_method"
  | "mva_or_pmpf"
  | "internal_rate"
  | "interstate_rate"
  | "fcp"
  | "benefit_or_special_regime"
  | "operation_value_components";

export type StSpMgLegalPackage = {
  segmentCode: string;
  segmentName: string;
  route: "SP-MG";
  mgChapter: string;
  mgChapterTitle: string;
  sourceUrl: string;
  sourceTitle: string;
  checkedAt: string;
  legalStatus: "calculation_validated" | "legal_gate_structured";
  calculationMethod: "mva" | "pmpf_or_mva" | "special_regime" | "depends_on_product";
  mandatoryFacts: StLegalFactCode[];
  representativeRule: null | {
    cest: string;
    ncm: string;
    description: string;
    mvaOriginalBps: number;
    agreementCode: string;
    effectiveFrom: string;
    sourceExcerpt: string;
  };
  blockers: string[];
};

export const ST_MG_ANNEX_VII_SOURCE = {
  code: "MG-RICMS-2023-ANNEX-VII-CURRENT",
  title: "RICMS/MG 2023 - Anexo VII consolidado",
  publisher: "Secretaria de Estado de Fazenda de Minas Gerais",
  url: "https://www.fazenda.mg.gov.br/empresas/legislacao_tributaria/ricms2023/anexovii2023.pdf",
  checkedAt: ST_SP_MG_CHECKED_AT,
} as const;

export const ST_GENERAL_MANDATORY_FACTS: StLegalFactCode[] = [
  "operation_date",
  "product_description",
  "ncm",
  "cest",
  "origin_uf",
  "destination_uf",
  "issuer_regime",
  "recipient_taxpayer",
  "operation_purpose",
  "route_agreement",
  "destination_internalization",
  "price_method",
  "mva_or_pmpf",
  "internal_rate",
  "interstate_rate",
  "fcp",
  "benefit_or_special_regime",
  "operation_value_components",
];

const chapterBySegment: Record<string, { chapter: string; title: string; method: StSpMgLegalPackage["calculationMethod"] }> = {
  AUTO_PARTS: { chapter: "1", title: "Autopeças", method: "mva" },
  BEVERAGES: { chapter: "3", title: "Cervejas, chopes, refrigerantes, águas e outras bebidas", method: "pmpf_or_mva" },
  FUELS: { chapter: "6", title: "Combustíveis e lubrificantes", method: "special_regime" },
  PHARMA: { chapter: "13", title: "Medicamentos e produtos farmacêuticos", method: "pmpf_or_mva" },
  CONSTRUCTION: { chapter: "10", title: "Materiais de construção e congêneres", method: "mva" },
  COSMETICS: { chapter: "20", title: "Perfumaria, higiene pessoal e cosméticos", method: "mva" },
  ELECTRONICS: { chapter: "21", title: "Eletrônicos, eletroeletrônicos e eletrodomésticos", method: "mva" },
  FOOD: { chapter: "17", title: "Produtos alimentícios", method: "mva" },
  BATTERIES: { chapter: "1", title: "Autopeças - acumuladores elétricos automotivos", method: "mva" },
  MOBILE_DEVICES: { chapter: "21", title: "Eletrônicos - aparelhos de comunicação", method: "depends_on_product" },
  HOUSEHOLD_ARTICLES: { chapter: "14/15/18/27", title: "Papéis, plásticos, cerâmicos e vidros", method: "depends_on_product" },
  STATIONERY: { chapter: "19", title: "Produtos de papelaria", method: "mva" },
  SPIRITS: { chapter: "2", title: "Bebidas alcoólicas, exceto cerveja e chope", method: "pmpf_or_mva" },
  TOBACCO: { chapter: "4", title: "Cigarros e derivados do fumo", method: "pmpf_or_mva" },
  CEMENT: { chapter: "5", title: "Cimentos", method: "mva" },
  RAZOR_BLADES: { chapter: "20", title: "Higiene pessoal - lâminas e aparelhos de barbear", method: "mva" },
  TOOLS: { chapter: "8", title: "Ferramentas", method: "mva" },
  LAMPS: { chapter: "9", title: "Lâmpadas, reatores e starter", method: "mva" },
  ELECTRICAL_MATERIALS: { chapter: "12", title: "Materiais elétricos", method: "mva" },
  CLEANING: { chapter: "11", title: "Materiais de limpeza", method: "mva" },
  MACHINERY: { chapter: "21", title: "Máquinas e aparelhos elétricos/eletromecânicos", method: "depends_on_product" },
  DOOR_TO_DOOR: { chapter: "28", title: "Venda de mercadorias pelo sistema porta a porta", method: "special_regime" },
  TIRES: { chapter: "16", title: "Pneumáticos, câmaras de ar e protetores", method: "mva" },
  PET_FOOD: { chapter: "22", title: "Rações para animais domésticos", method: "mva" },
  ICE_CREAM: { chapter: "23", title: "Sorvetes e preparados para fabricação em máquinas", method: "mva" },
};

const defaultBlockers = [
  "o capítulo mineiro reúne vários CEST, NCM, descrições, âmbitos e MVA; o segmento isolado não determina a regra",
  "a rota SP→MG precisa constar no âmbito vigente ou possuir regime especial válido para o remetente",
  "alíquota interna, FCP, benefício, redução e método de preço precisam ser confirmados para o produto e a data",
  "sem todos os fatos e fontes do item, o sistema bloqueia o valor final",
];

export const stSpMgLegalPackages: StSpMgLegalPackage[] = stSegments.map((segment) => {
  const mapping = chapterBySegment[segment.code];
  if (!mapping) throw new Error(`missing_st_sp_mg_mapping:${segment.code}`);
  const representativeRule = segment.code === "AUTO_PARTS" ? {
    cest: "01.075.00",
    ncm: "8708",
    description: "Partes e acessórios dos veículos automóveis - caso canônico controlado",
    mvaOriginalBps: 7_178,
    agreementCode: "PROTOCOLO-ICMS-41-2008",
    effectiveFrom: "2025-05-24",
    sourceExcerpt: "Capítulo 1, âmbito 1.1: São Paulo; MVA de 71,78% para o recorte canônico.",
  } : null;
  return {
    segmentCode: segment.code,
    segmentName: segment.name,
    route: "SP-MG",
    mgChapter: mapping.chapter,
    mgChapterTitle: mapping.title,
    sourceUrl: ST_MG_ANNEX_VII_SOURCE.url,
    sourceTitle: ST_MG_ANNEX_VII_SOURCE.title,
    checkedAt: ST_SP_MG_CHECKED_AT,
    legalStatus: representativeRule ? "calculation_validated" : "legal_gate_structured",
    calculationMethod: mapping.method,
    mandatoryFacts: [...ST_GENERAL_MANDATORY_FACTS],
    representativeRule,
    blockers: representativeRule ? [
      "o cálculo validado cobre somente o CEST/NCM canônico e não se estende automaticamente a todas as autopeças",
      "PMPF, benefício, regime especial ou descrição divergente bloqueiam a regra de MVA",
    ] : [...defaultBlockers],
  };
});

export function stSpMgLegalMetrics() {
  return {
    totalSegments: stSpMgLegalPackages.length,
    legalGatesStructured: stSpMgLegalPackages.filter((item) => item.mandatoryFacts.length === ST_GENERAL_MANDATORY_FACTS.length).length,
    calculationsValidated: stSpMgLegalPackages.filter((item) => item.legalStatus === "calculation_validated").length,
    calculationsBlocked: stSpMgLegalPackages.filter((item) => item.legalStatus !== "calculation_validated").length,
    officialSources: new Set(stSpMgLegalPackages.map((item) => item.sourceUrl)).size,
  };
}

export function validateStSpMgLegalCatalog() {
  const codes = stSpMgLegalPackages.map((item) => item.segmentCode);
  const uniqueCodes = new Set(codes);
  const segmentCodes = new Set(stSegments.map((item) => item.code));
  const errors: string[] = [];
  if (codes.length !== 25 || uniqueCodes.size !== 25) errors.push("catalog_must_have_25_unique_segments");
  if (codes.some((code) => !segmentCodes.has(code))) errors.push("catalog_contains_unknown_segment");
  for (const item of stSpMgLegalPackages) {
    if (!item.sourceUrl.startsWith("https://www.fazenda.mg.gov.br/")) errors.push(`non_official_source:${item.segmentCode}`);
    if (new Set(item.mandatoryFacts).size !== ST_GENERAL_MANDATORY_FACTS.length) errors.push(`incomplete_legal_gate:${item.segmentCode}`);
    if (item.legalStatus === "calculation_validated" && !item.representativeRule) errors.push(`validated_without_rule:${item.segmentCode}`);
    if (item.legalStatus !== "calculation_validated" && item.representativeRule) errors.push(`rule_without_validation:${item.segmentCode}`);
  }
  return { passed: errors.length === 0, errors };
}

export async function hashStSpMgLegalCatalog() {
  const payload = JSON.stringify({ version: ST_SP_MG_LEGAL_VERSION, packages: stSpMgLegalPackages });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

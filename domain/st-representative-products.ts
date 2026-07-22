import { stSegments } from "./national-tax-coverage.ts";

export const ST_REPRESENTATIVE_PRODUCTS_VERSION = "2026.07.21-v60";
export const ST_REPRESENTATIVE_PRODUCTS_SOURCE = {
  code: "MG-RICMS-ANNEX-VII-PART-2",
  title: "RICMS/MG 2023 - Anexo VII, Parte 2",
  url: "https://www.fazenda.mg.gov.br/empresas/legislacao_tributaria/ricms2023/anexovii2023.pdf",
  checkedAt: "2026-07-21",
} as const;

export type StRepresentativeProduct = {
  code: string;
  segmentCode: string;
  description: string;
  cest: string;
  ncm: string[];
  sourceCode: typeof ST_REPRESENTATIVE_PRODUCTS_SOURCE.code;
  scope: "representative_identity_only";
  warning: string;
};

const product = (segmentCode: string, cest: string, ncm: string[], description: string): StRepresentativeProduct => ({
  code: `REP-${segmentCode}`,
  segmentCode,
  cest,
  ncm,
  description,
  sourceCode: ST_REPRESENTATIVE_PRODUCTS_SOURCE.code,
  scope: "representative_identity_only",
  warning: "Este produto representa apenas um recorte do segmento; não transfere sua regra para outros CEST, NCM ou descrições.",
});

export const stRepresentativeProducts: StRepresentativeProduct[] = [
  product("AUTO_PARTS", "01.075.00", ["8708"], "Partes e acessórios dos veículos automóveis"),
  product("BEVERAGES", "03.003.00", ["2201.10.00", "2201.90.00"], "Água mineral ou potável natural em embalagem de vidro descartável"),
  product("FUELS", "06.007.00", ["2710.19.3"], "Óleos lubrificantes"),
  product("PHARMA", "13.001.00", ["3003", "3004"], "Medicamentos de referência da lista positiva, exceto veterinários"),
  product("CONSTRUCTION", "10.001.00", ["2522"], "Cal"),
  product("COSMETICS", "20.001.00", ["1211.90.90"], "Henna em embalagem de até 200 g"),
  product("ELECTRONICS", "21.001.00", ["7321.11.00", "7321.81.00", "7321.90.00"], "Fogões domésticos e suas partes"),
  product("FOOD", "17.001.00", ["1704.90.10"], "Chocolate branco em embalagem de até 1 kg"),
  product("BATTERIES", "01.053.00", ["8507.10"], "Acumuladores elétricos de chumbo para arranque de motores"),
  product("MOBILE_DEVICES", "21.053.00", ["8517.13.00", "8517.14.3"], "Smartphones e telefones para redes celulares"),
  product("HOUSEHOLD_ARTICLES", "14.001.00", ["7013"], "Objetos de vidro para serviço de mesa ou cozinha"),
  product("STATIONERY", "19.001.00", ["3213.10.00"], "Tinta guache"),
  product("SPIRITS", "02.001.00", ["2205", "2208.90.00"], "Aperitivos, amargos, bitter e similares"),
  product("TOBACCO", "04.001.00", ["2402"], "Charutos, cigarrilhas e cigarros"),
  product("CEMENT", "05.001.00", ["2523"], "Cimento"),
  product("RAZOR_BLADES", "20.064.00", ["8212.10.20", "8212.20.10"], "Aparelhos e lâminas de barbear"),
  product("TOOLS", "08.001.00", ["4016.99.90"], "Ferramentas de borracha vulcanizada não endurecida"),
  product("LAMPS", "09.001.00", ["8539"], "Lâmpadas elétricas"),
  product("ELECTRICAL_MATERIALS", "12.001.00", ["8504"], "Transformadores, bobinas e equipamentos de autoindução"),
  product("CLEANING", "11.001.00", ["2828.90.11", "2828.90.19", "3206.41.00", "3402.50.00", "3808.94.19"], "Água sanitária, branqueadores e alvejantes"),
  product("MACHINERY", "21.120.00", ["9030.89"], "Analisadores e instrumentos de controle de grandezas elétricas"),
  product("DOOR_TO_DOOR", "28.001.00", ["3303.00.10"], "Perfumes vendidos pelo sistema porta a porta"),
  product("TIRES", "16.001.00", ["4011.10.00"], "Pneus novos para automóveis de passageiros"),
  product("PET_FOOD", "22.001.00", ["2309"], "Ração tipo pet para animais domésticos"),
  product("ICE_CREAM", "23.001.00", ["2105.00"], "Sorvetes de qualquer espécie"),
];

export function validateStRepresentativeProducts() {
  const errors: string[] = [];
  const segmentCodes = new Set(stSegments.map((segment) => segment.code));
  const coveredSegments = new Set(stRepresentativeProducts.map((item) => item.segmentCode));
  if (stRepresentativeProducts.length !== 25 || coveredSegments.size !== 25) errors.push("representative_catalog_must_cover_25_unique_segments");
  if ([...segmentCodes].some((code) => !coveredSegments.has(code))) errors.push("representative_catalog_has_missing_segment");
  for (const item of stRepresentativeProducts) {
    if (!/^\d{2}\.\d{3}\.\d{2}$/.test(item.cest)) errors.push(`invalid_cest:${item.segmentCode}`);
    if (!item.ncm.length || item.ncm.some((ncm) => !/^\d{4}(?:\.\d{1,2}){0,2}$/.test(ncm))) errors.push(`invalid_ncm:${item.segmentCode}`);
    if (!item.description.trim()) errors.push(`missing_description:${item.segmentCode}`);
  }
  return { passed: errors.length === 0, errors };
}

export async function hashStRepresentativeProducts() {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify({ version: ST_REPRESENTATIVE_PRODUCTS_VERSION, products: stRepresentativeProducts })));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

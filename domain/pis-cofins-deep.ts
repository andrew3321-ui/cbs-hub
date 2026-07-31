export const PIS_COFINS_DEEP_VERSION = "2026.07.31-v94";
export const PIS_COFINS_DEEP_CHECKED_AT = "2026-07-31";
export const PIS_COFINS_LC224_EFFECTIVE_FROM = "2026-04-01";
export const PIS_COFINS_DEEP_SUPPORTED_PERIOD = { from: "2026-04-01", to: "2026-12-31" } as const;

export type PisCofinsRegime = "cumulative" | "non_cumulative";
export type PisCofinsRole = "manufacturer" | "importer" | "wholesaler" | "retailer" | "service_provider";
export type PisCofinsTreatment = "general" | "monophase" | "zero_rate" | "suspension";
export type PisCofinsCreditKind =
  | "resale_goods"
  | "inputs"
  | "electricity"
  | "building_rent"
  | "machinery_rent"
  | "leasing"
  | "fixed_asset_depreciation"
  | "storage_and_freight"
  | "sales_returns"
  | "buildings_depreciation"
  | "leasehold_improvements"
  | "cleaning_transport_food_uniform"
  | "subcontracted_freight"
  | "imports_goods"
  | "imports_services"
  | "opening_inventory"
  | "agricultural_presumed"
  | "export_related"
  | "fuel_specific"
  | "court_recognized";

export type PisCofinsSource = {
  code: string;
  title: string;
  publisher: string;
  url: string;
  legalReference: string;
  effectiveFrom: string;
  checkedAt: string;
};

export type PisCofinsProductProfile = {
  rank: number;
  code: string;
  segment: string;
  ncmPrefixes: string[];
  candidateTreatment: Exclude<PisCofinsTreatment, "general" | "suspension">;
  sourceCodes: string[];
  roles: PisCofinsRole[];
  creditOnAcquisitionForResale: "forbidden" | "requires_specific_analysis";
  classificationPolicy: "candidate_requires_exact_ncm_official_table_role_and_date";
  checkedAt: string;
  version: string;
};

export type PisCofinsCreditHypothesis = {
  code: PisCofinsCreditKind;
  label: string;
  sourceCodes: string[];
  requiredFacts: string[];
  forbiddenWhen: string[];
  calculationMethod?: "basic_rates" | "requires_specific_memory";
};

export type PisCofinsDeepInput = {
  regime: PisCofinsRegime;
  treatment: PisCofinsTreatment;
  role: PisCofinsRole;
  ncm: string | null;
  calculationDate: string;
  revenueCents: number | null;
  creditBaseCents: number;
  creditKind: PisCofinsCreditKind | null;
  regimeConfirmed: boolean;
  roleConfirmed: boolean;
  exactNcmConfirmedInOfficialTable: boolean;
  operationDocumented: boolean;
  revenueSegregated: boolean;
  legalTreatmentConfirmed: boolean;
  post2026BenefitRateConfirmed: boolean;
  post2026PisRateBps?: number | null;
  post2026CofinsRateBps?: number | null;
  creditLegalHypothesisConfirmed: boolean;
  creditDocumented: boolean;
  acquisitionWasTaxed: boolean;
  linkedToTaxedActivity: boolean;
};

export type PisCofinsDeepLine = {
  code: string;
  label: string;
  formula: string;
  amountCents: number | null;
  rateBps: number | null;
};

export type PisCofinsDeepResult = {
  status: "calculated_reference" | "blocked";
  profile: PisCofinsProductProfile | null;
  lines: PisCofinsDeepLine[];
  blockers: string[];
  warnings: string[];
  sourceCodes: string[];
  version: string;
  checkedAt: string;
};

export const pisCofinsDeepSources: PisCofinsSource[] = [
  {
    code: "PISCOFINS-L-9718",
    title: "Lei nº 9.718/1998 — regime cumulativo e combustíveis",
    publisher: "Presidência da República",
    url: "https://www.planalto.gov.br/ccivil_03/leis/l9718compilada.htm",
    legalReference: "arts. 4º a 6º e 8º",
    effectiveFrom: "1999-02-01",
    checkedAt: PIS_COFINS_DEEP_CHECKED_AT,
  },
  {
    code: "PISCOFINS-L-10637",
    title: "Lei nº 10.637/2002 — PIS/Pasep não cumulativo",
    publisher: "Presidência da República",
    url: "https://www.planalto.gov.br/ccivil_03/leis/2002/l10637compilado.htm",
    legalReference: "arts. 1º a 3º; débitos, créditos e vedações",
    effectiveFrom: "2002-12-01",
    checkedAt: PIS_COFINS_DEEP_CHECKED_AT,
  },
  {
    code: "PISCOFINS-L-10833",
    title: "Lei nº 10.833/2003 — Cofins não cumulativa",
    publisher: "Presidência da República",
    url: "https://www.planalto.gov.br/ccivil_03/leis/2003/l10.833.htm",
    legalReference: "arts. 1º a 3º; débitos, créditos e vedações",
    effectiveFrom: "2004-02-01",
    checkedAt: PIS_COFINS_DEEP_CHECKED_AT,
  },
  {
    code: "PISCOFINS-L-10147",
    title: "Lei nº 10.147/2000 — medicamentos, perfumaria e higiene",
    publisher: "Presidência da República",
    url: "https://www.planalto.gov.br/ccivil_03/leis/l10147.htm",
    legalReference: "arts. 1º e 2º; concentração e revenda",
    effectiveFrom: "2001-05-01",
    checkedAt: PIS_COFINS_DEEP_CHECKED_AT,
  },
  {
    code: "PISCOFINS-L-10485",
    title: "Lei nº 10.485/2002 — veículos, autopeças e pneumáticos",
    publisher: "Presidência da República",
    url: "https://www.planalto.gov.br/ccivil_03/leis/2002/l10485compilado.htm",
    legalReference: "arts. 1º, 3º e 5º e Anexos I e II",
    effectiveFrom: "2002-11-01",
    checkedAt: PIS_COFINS_DEEP_CHECKED_AT,
  },
  {
    code: "PISCOFINS-L-10925",
    title: "Lei nº 10.925/2004 — alimentos e insumos agropecuários",
    publisher: "Presidência da República",
    url: "https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2004/lei/l10.925compilada.htm",
    legalReference: "arts. 1º, 2º e 8º; alíquota zero, reduções e créditos presumidos",
    effectiveFrom: "2004-07-26",
    checkedAt: PIS_COFINS_DEEP_CHECKED_AT,
  },
  {
    code: "PISCOFINS-L-13097",
    title: "Lei nº 13.097/2015 — bebidas frias",
    publisher: "Presidência da República",
    url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13097.htm",
    legalReference: "arts. 14 a 36",
    effectiveFrom: "2015-05-01",
    checkedAt: PIS_COFINS_DEEP_CHECKED_AT,
  },
  {
    code: "PISCOFINS-IN-2121",
    title: "Instrução Normativa RFB nº 2.121/2022 — consolidação PIS/Cofins",
    publisher: "Receita Federal",
    url: "https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=126354",
    legalReference: "apuração, regimes especiais, créditos e documentação, com alterações posteriores",
    effectiveFrom: "2022-12-20",
    checkedAt: PIS_COFINS_DEEP_CHECKED_AT,
  },
  {
    code: "PISCOFINS-RFB-CREDIT",
    title: "Créditos de PIS/Pasep e Cofins — conformidade tributária",
    publisher: "Receita Federal",
    url: "https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/restituicao-ressarcimento-reembolso-e-compensacao/creditos/piscofins",
    legalReference: "créditos não cumulativos, ressarcimento e compensação",
    effectiveFrom: "2025-06-16",
    checkedAt: PIS_COFINS_DEEP_CHECKED_AT,
  },
  {
    code: "PISCOFINS-RFB-MONOPHASE",
    title: "Conformidade de créditos — monofásico e alíquota zero",
    publisher: "Receita Federal",
    url: "https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/restituicao-ressarcimento-reembolso-e-compensacao/conformidade-tributaria/Creditos-Indevidos-de-PIS-Pasep-Cofins-Setor-Supermercadista",
    legalReference: "Tabelas 4.3.10 a 4.3.15 da EFD-Contribuições e vedação de créditos",
    effectiveFrom: "2025-01-01",
    checkedAt: PIS_COFINS_DEEP_CHECKED_AT,
  },
  {
    code: "PISCOFINS-LC-224",
    title: "Lei Complementar nº 224/2025 — redução de benefícios federais",
    publisher: "Presidência da República",
    url: "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp224.htm",
    legalReference: "art. 4º, §§ 2º a 9º, e art. 14; efeitos de 2026 e exceções",
    effectiveFrom: PIS_COFINS_LC224_EFFECTIVE_FROM,
    checkedAt: PIS_COFINS_DEEP_CHECKED_AT,
  },
];

function profile(
  rank: number,
  code: string,
  segment: string,
  ncmPrefixes: string[],
  candidateTreatment: PisCofinsProductProfile["candidateTreatment"],
  sourceCodes: string[],
  roles: PisCofinsRole[],
  credit: PisCofinsProductProfile["creditOnAcquisitionForResale"] = "forbidden",
): PisCofinsProductProfile {
  return {
    rank,
    code,
    segment,
    ncmPrefixes,
    candidateTreatment,
    sourceCodes: [...sourceCodes, "PISCOFINS-IN-2121", "PISCOFINS-LC-224"],
    roles,
    creditOnAcquisitionForResale: credit,
    classificationPolicy: "candidate_requires_exact_ncm_official_table_role_and_date",
    checkedAt: PIS_COFINS_DEEP_CHECKED_AT,
    version: PIS_COFINS_DEEP_VERSION,
  };
}

export const pisCofinsProductProfiles: PisCofinsProductProfile[] = [
  profile(1, "AUTO_PARTS", "Autopeças dos Anexos I e II", ["8708", "8409", "8413", "8483", "8511", "8512"], "monophase", ["PISCOFINS-L-10485", "PISCOFINS-RFB-MONOPHASE"], ["manufacturer", "importer", "wholesaler", "retailer"]),
  profile(2, "TIRES", "Pneus novos", ["4011"], "monophase", ["PISCOFINS-L-10485", "PISCOFINS-RFB-MONOPHASE"], ["manufacturer", "importer", "wholesaler", "retailer"]),
  profile(3, "TUBES", "Câmaras de ar", ["4013"], "monophase", ["PISCOFINS-L-10485", "PISCOFINS-RFB-MONOPHASE"], ["manufacturer", "importer", "wholesaler", "retailer"]),
  profile(4, "VEHICLES", "Veículos e máquinas selecionados", ["8429", "8701", "8702", "8703", "8704", "8705", "8706"], "monophase", ["PISCOFINS-L-10485", "PISCOFINS-RFB-MONOPHASE"], ["manufacturer", "importer", "wholesaler", "retailer"]),
  profile(5, "MEDICINES_3003", "Medicamentos não dosados", ["3003"], "monophase", ["PISCOFINS-L-10147", "PISCOFINS-RFB-MONOPHASE"], ["manufacturer", "importer", "wholesaler", "retailer"]),
  profile(6, "MEDICINES_3004", "Medicamentos dosados", ["3004"], "monophase", ["PISCOFINS-L-10147", "PISCOFINS-RFB-MONOPHASE"], ["manufacturer", "importer", "wholesaler", "retailer"]),
  profile(7, "PERFUMES", "Perfumes e águas de colônia", ["3303"], "monophase", ["PISCOFINS-L-10147", "PISCOFINS-RFB-MONOPHASE"], ["manufacturer", "importer", "wholesaler", "retailer"]),
  profile(8, "BEAUTY", "Produtos de beleza e maquiagem", ["3304"], "monophase", ["PISCOFINS-L-10147", "PISCOFINS-RFB-MONOPHASE"], ["manufacturer", "importer", "wholesaler", "retailer"]),
  profile(9, "HAIR", "Preparações capilares", ["3305"], "monophase", ["PISCOFINS-L-10147", "PISCOFINS-RFB-MONOPHASE"], ["manufacturer", "importer", "wholesaler", "retailer"]),
  profile(10, "TOILETRIES", "Desodorantes, barbear e toucador selecionados", ["3307"], "monophase", ["PISCOFINS-L-10147", "PISCOFINS-RFB-MONOPHASE"], ["manufacturer", "importer", "wholesaler", "retailer"]),
  profile(11, "COLD_BEVERAGES", "Águas, refrigerantes e bebidas frias selecionadas", ["2201", "2202"], "monophase", ["PISCOFINS-L-13097", "PISCOFINS-RFB-MONOPHASE"], ["manufacturer", "importer", "wholesaler", "retailer"]),
  profile(12, "BEER", "Cervejas e chope selecionados", ["2203"], "monophase", ["PISCOFINS-L-13097", "PISCOFINS-RFB-MONOPHASE"], ["manufacturer", "importer", "wholesaler", "retailer"]),
  profile(13, "FUELS_2710", "Gasolinas, diesel e querosenes selecionados", ["2710"], "monophase", ["PISCOFINS-L-9718", "PISCOFINS-RFB-MONOPHASE"], ["manufacturer", "importer", "wholesaler", "retailer"]),
  profile(14, "LPG_2711", "GLP e gases selecionados", ["2711"], "monophase", ["PISCOFINS-L-9718", "PISCOFINS-RFB-MONOPHASE"], ["manufacturer", "importer", "wholesaler", "retailer"]),
  profile(15, "FERTILIZERS", "Adubos e fertilizantes selecionados", ["31"], "zero_rate", ["PISCOFINS-L-10925"], ["manufacturer", "importer", "wholesaler", "retailer"], "requires_specific_analysis"),
  profile(16, "RICE", "Arroz selecionado", ["1006"], "zero_rate", ["PISCOFINS-L-10925"], ["manufacturer", "importer", "wholesaler", "retailer"], "requires_specific_analysis"),
  profile(17, "BEANS", "Feijões selecionados", ["0713"], "zero_rate", ["PISCOFINS-L-10925"], ["manufacturer", "importer", "wholesaler", "retailer"], "requires_specific_analysis"),
  profile(18, "MILK", "Leites selecionados", ["0401", "0402"], "zero_rate", ["PISCOFINS-L-10925"], ["manufacturer", "importer", "wholesaler", "retailer"], "requires_specific_analysis"),
  profile(19, "WHEAT_FLOUR", "Farinha de trigo selecionada", ["1101"], "zero_rate", ["PISCOFINS-L-10925"], ["manufacturer", "importer", "wholesaler", "retailer"], "requires_specific_analysis"),
  profile(20, "MEAT", "Carnes selecionadas", ["0201", "0202", "0203", "0207"], "zero_rate", ["PISCOFINS-L-10925"], ["manufacturer", "importer", "wholesaler", "retailer"], "requires_specific_analysis"),
  ...([
    ["AUTO_BRAKE", "Autopeças · freios", "87083090", "monophase", "PISCOFINS-L-10485"],
    ["AUTO_BODY", "Autopeças · carroçaria", "87082999", "monophase", "PISCOFINS-L-10485"],
    ["AUTO_GEAR", "Autopeças · transmissão", "87084090", "monophase", "PISCOFINS-L-10485"],
    ["AUTO_AXLE", "Autopeças · eixos", "87085099", "monophase", "PISCOFINS-L-10485"],
    ["AUTO_WHEEL", "Autopeças · rodas", "87087090", "monophase", "PISCOFINS-L-10485"],
    ["AUTO_SUSPENSION", "Autopeças · suspensão", "87088000", "monophase", "PISCOFINS-L-10485"],
    ["AUTO_RADIATOR", "Autopeças · radiadores", "87089100", "monophase", "PISCOFINS-L-10485"],
    ["AUTO_EXHAUST", "Autopeças · escapamentos", "87089200", "monophase", "PISCOFINS-L-10485"],
    ["AUTO_CLUTCH", "Autopeças · embreagens", "87089300", "monophase", "PISCOFINS-L-10485"],
    ["AUTO_STEERING", "Autopeças · direção", "87089490", "monophase", "PISCOFINS-L-10485"],
    ["TIRE_CAR", "Pneus para automóveis", "40111000", "monophase", "PISCOFINS-L-10485"],
    ["TIRE_BUS", "Pneus para ônibus e caminhões", "40112090", "monophase", "PISCOFINS-L-10485"],
    ["MEDICINE_DOSED", "Medicamento dosado representativo", "30049099", "monophase", "PISCOFINS-L-10147"],
    ["PERFUME_EXTRACT", "Perfume representativo", "33030010", "monophase", "PISCOFINS-L-10147"],
    ["BEAUTY_CREAM", "Creme de beleza representativo", "33049910", "monophase", "PISCOFINS-L-10147"],
    ["HAIR_SHAMPOO", "Xampu representativo", "33051000", "monophase", "PISCOFINS-L-10147"],
    ["DEODORANT", "Desodorante representativo", "33072010", "monophase", "PISCOFINS-L-10147"],
    ["SODA", "Refrigerante representativo", "22021000", "monophase", "PISCOFINS-L-13097"],
    ["BEER_MALT", "Cerveja de malte representativa", "22030000", "monophase", "PISCOFINS-L-13097"],
    ["GASOLINE", "Gasolina representativa", "27101259", "monophase", "PISCOFINS-L-9718"],
    ["RICE_HUSKED", "Arroz descascado", "10062020", "zero_rate", "PISCOFINS-L-10925"],
    ["RICE_SEMI", "Arroz semibranqueado", "10063021", "zero_rate", "PISCOFINS-L-10925"],
    ["BLACK_BEANS", "Feijão preto", "07133319", "zero_rate", "PISCOFINS-L-10925"],
    ["COMMON_BEANS", "Feijão comum", "07133399", "zero_rate", "PISCOFINS-L-10925"],
    ["RAW_MILK", "Leite cru", "04012010", "zero_rate", "PISCOFINS-L-10925"],
    ["MILK_POWDER", "Leite em pó", "04022110", "zero_rate", "PISCOFINS-L-10925"],
    ["WHEAT_FLOUR_EXACT", "Farinha de trigo", "11010010", "zero_rate", "PISCOFINS-L-10925"],
    ["BEEF_FRESH", "Carne bovina fresca", "02013000", "zero_rate", "PISCOFINS-L-10925"],
    ["BEEF_FROZEN", "Carne bovina congelada", "02023000", "zero_rate", "PISCOFINS-L-10925"],
    ["PORK", "Carne suína", "02032900", "zero_rate", "PISCOFINS-L-10925"],
    ["CHICKEN", "Carne de frango", "02071400", "zero_rate", "PISCOFINS-L-10925"],
    ["FERTILIZER_UREA", "Fertilizante com ureia", "31021010", "zero_rate", "PISCOFINS-L-10925"],
    ["FERTILIZER_NPK", "Fertilizante NPK", "31052000", "zero_rate", "PISCOFINS-L-10925"],
    ["CORN", "Milho em grão representativo", "10059010", "zero_rate", "PISCOFINS-L-10925"],
    ["WHEAT", "Trigo representativo", "10019900", "zero_rate", "PISCOFINS-L-10925"],
    ["SOY", "Soja representativa", "12019000", "zero_rate", "PISCOFINS-L-10925"],
    ["EGGS", "Ovos representativos", "04072100", "zero_rate", "PISCOFINS-L-10925"],
    ["FISH", "Peixe representativo", "03028990", "zero_rate", "PISCOFINS-L-10925"],
    ["BREAD", "Pão comum representativo", "19059090", "zero_rate", "PISCOFINS-L-10925"],
    ["CHEESE", "Queijo representativo", "04069090", "zero_rate", "PISCOFINS-L-10925"],
  ] as const).map(([code, segment, ncm, treatment, source], index) =>
    profile(21 + index, code, segment, [ncm], treatment, [source, "PISCOFINS-RFB-MONOPHASE"], ["manufacturer", "importer", "wholesaler", "retailer"], treatment === "zero_rate" ? "requires_specific_analysis" : "forbidden")),
];

export const pisCofinsCreditHypotheses: PisCofinsCreditHypothesis[] = [
  { code: "resale_goods", label: "Bens adquiridos para revenda", sourceCodes: ["PISCOFINS-L-10637", "PISCOFINS-L-10833"], requiredFacts: ["aquisição tributada", "produto destinado à revenda", "documento fiscal idôneo"], forbiddenWhen: ["bem monofásico adquirido para revenda", "aquisição sem incidência, isenta ou à alíquota zero"] },
  { code: "inputs", label: "Bens e serviços usados como insumo", sourceCodes: ["PISCOFINS-L-10637", "PISCOFINS-L-10833", "PISCOFINS-IN-2121"], requiredFacts: ["essencialidade ou relevância para produção/prestação", "vínculo com receita tributada", "documento fiscal"], forbiddenWhen: ["mera despesa comercial sem hipótese legal", "mão de obra paga a pessoa física"] },
  { code: "electricity", label: "Energia elétrica e térmica", sourceCodes: ["PISCOFINS-L-10637", "PISCOFINS-L-10833"], requiredFacts: ["consumo no estabelecimento", "documento e período"], forbiddenWhen: ["consumo particular ou sem vínculo empresarial"] },
  { code: "building_rent", label: "Aluguel de prédios", sourceCodes: ["PISCOFINS-L-10637", "PISCOFINS-L-10833"], requiredFacts: ["locador pessoa jurídica", "uso na atividade", "contrato e pagamento"], forbiddenWhen: ["locador pessoa física", "imóvel sem vínculo com a atividade"] },
  { code: "machinery_rent", label: "Aluguel de máquinas e equipamentos", sourceCodes: ["PISCOFINS-L-10637", "PISCOFINS-L-10833"], requiredFacts: ["locador pessoa jurídica", "uso na atividade", "contrato e pagamento"], forbiddenWhen: ["bem sem vínculo com produção ou serviço"] },
  { code: "leasing", label: "Contraprestações de arrendamento mercantil", sourceCodes: ["PISCOFINS-L-10637", "PISCOFINS-L-10833"], requiredFacts: ["operação enquadrada", "arrendador elegível", "contrato e pagamento"], forbiddenWhen: ["operação fora da hipótese legal"] },
  { code: "fixed_asset_depreciation", label: "Depreciação de ativo imobilizado", sourceCodes: ["PISCOFINS-L-10637", "PISCOFINS-L-10833", "PISCOFINS-IN-2121"], requiredFacts: ["bem incorporado ao ativo", "uso na produção ou prestação", "memória de depreciação"], forbiddenWhen: ["bem para revenda", "ativo sem uso elegível"] },
  { code: "storage_and_freight", label: "Armazenagem e frete na venda", sourceCodes: ["PISCOFINS-L-10637", "PISCOFINS-L-10833"], requiredFacts: ["ônus suportado pelo vendedor", "operação de venda vinculada", "documento fiscal"], forbiddenWhen: ["frete suportado por terceiro", "operação não vinculada"] },
  { code: "sales_returns", label: "Bens recebidos em devolução", sourceCodes: ["PISCOFINS-L-10637", "PISCOFINS-L-10833"], requiredFacts: ["receita anterior tributada", "documento de devolução", "vínculo com operação original"], forbiddenWhen: ["venda original sem incidência comprovada"] },
  { code: "buildings_depreciation", label: "Depreciação de edificações e benfeitorias", sourceCodes: ["PISCOFINS-L-10637", "PISCOFINS-L-10833", "PISCOFINS-IN-2121"], requiredFacts: ["edificação incorporada ao ativo", "uso na atividade", "data e memória de aquisição"], forbiddenWhen: ["bem não elegível ou sem uso empresarial"], calculationMethod: "requires_specific_memory" },
  { code: "leasehold_improvements", label: "Benfeitorias em imóvel de terceiro", sourceCodes: ["PISCOFINS-L-10637", "PISCOFINS-L-10833", "PISCOFINS-IN-2121"], requiredFacts: ["contrato", "benfeitoria ativada", "uso na atividade"], forbiddenWhen: ["gasto sem capitalização ou vínculo"], calculationMethod: "requires_specific_memory" },
  { code: "cleaning_transport_food_uniform", label: "Vale-transporte, alimentação e uniformes em atividades legalmente abrangidas", sourceCodes: ["PISCOFINS-L-10637", "PISCOFINS-L-10833", "PISCOFINS-IN-2121"], requiredFacts: ["atividade abrangida", "empregados vinculados", "documentos"], forbiddenWhen: ["atividade fora do recorte legal"], calculationMethod: "requires_specific_memory" },
  { code: "subcontracted_freight", label: "Frete subcontratado", sourceCodes: ["PISCOFINS-L-10637", "PISCOFINS-L-10833", "PISCOFINS-IN-2121"], requiredFacts: ["transportador e subcontratação", "receita vinculada", "documentos"], forbiddenWhen: ["frete fora da hipótese específica"], calculationMethod: "requires_specific_memory" },
  { code: "imports_goods", label: "Crédito na importação de bens", sourceCodes: ["PISCOFINS-IN-2121", "PISCOFINS-RFB-CREDIT"], requiredFacts: ["DI/Duimp", "contribuição efetivamente paga", "bem e finalidade elegíveis"], forbiddenWhen: ["importação sem incidência ou pagamento"], calculationMethod: "requires_specific_memory" },
  { code: "imports_services", label: "Crédito na importação de serviços", sourceCodes: ["PISCOFINS-IN-2121", "PISCOFINS-RFB-CREDIT"], requiredFacts: ["serviço importado", "contribuição paga", "uso elegível"], forbiddenWhen: ["serviço sem vínculo com receita elegível"], calculationMethod: "requires_specific_memory" },
  { code: "opening_inventory", label: "Crédito presumido sobre estoque de abertura", sourceCodes: ["PISCOFINS-L-10637", "PISCOFINS-L-10833", "PISCOFINS-IN-2121"], requiredFacts: ["mudança válida de regime", "estoque inventariado", "parcelamento e memória"], forbiddenWhen: ["mercadoria vedada ou sem inventário"], calculationMethod: "requires_specific_memory" },
  { code: "agricultural_presumed", label: "Crédito presumido agropecuário", sourceCodes: ["PISCOFINS-L-10925", "PISCOFINS-IN-2121"], requiredFacts: ["produto", "fornecedor", "destinação e percentual legal"], forbiddenWhen: ["cadeia ou produto fora da hipótese"], calculationMethod: "requires_specific_memory" },
  { code: "export_related", label: "Créditos vinculados a receita de exportação", sourceCodes: ["PISCOFINS-L-10637", "PISCOFINS-L-10833", "PISCOFINS-IN-2121"], requiredFacts: ["receita exportada", "vínculo dos custos", "documentação"], forbiddenWhen: ["vínculo não comprovado"], calculationMethod: "requires_specific_memory" },
  { code: "fuel_specific", label: "Crédito específico de combustíveis", sourceCodes: ["PISCOFINS-L-9718", "PISCOFINS-IN-2121"], requiredFacts: ["produto e NCM", "papel na cadeia", "período e regime específico"], forbiddenWhen: ["aplicação das alíquotas básicas por analogia"], calculationMethod: "requires_specific_memory" },
  { code: "court_recognized", label: "Crédito reconhecido judicialmente", sourceCodes: ["PISCOFINS-RFB-CREDIT", "PISCOFINS-IN-2121"], requiredFacts: ["decisão definitiva", "período", "habilitação e memória"], forbiddenWhen: ["decisão não definitiva ou sem habilitação aplicável"], calculationMethod: "requires_specific_memory" },
];

function normalizeNcm(value: string | null) {
  return (value ?? "").replace(/\D/g, "");
}

function validIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function safeMoney(value: number, field: string) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`invalid_${field}`);
  return value;
}

function safeRate(value: number | null | undefined, field: string) {
  if (value === null || value === undefined || !Number.isSafeInteger(value) || value < 0 || value > 100_000) throw new Error(`invalid_${field}`);
  return value;
}

function multiplyCents(value: number, rateBps: number) {
  const rounded = (BigInt(value) * BigInt(rateBps) + 5_000n) / 10_000n;
  if (rounded > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("unsafe_pis_cofins_amount");
  return Number(rounded);
}

export function classifyPisCofinsProduct(ncm: string | null) {
  const normalized = normalizeNcm(ncm);
  if (normalized.length !== 8) return [];
  const matches = pisCofinsProductProfiles.filter((item) => item.ncmPrefixes.some((prefix) => normalized.startsWith(prefix)));
  const specificity = Math.max(0, ...matches.flatMap((item) => item.ncmPrefixes.filter((prefix) => normalized.startsWith(prefix)).map((prefix) => prefix.length)));
  return matches.filter((item) => item.ncmPrefixes.some((prefix) => normalized.startsWith(prefix) && prefix.length === specificity));
}

function blocked(input: PisCofinsDeepInput, profile: PisCofinsProductProfile | null, blockers: string[], sources: string[]): PisCofinsDeepResult {
  return {
    status: "blocked",
    profile,
    lines: [],
    blockers: [...new Set(blockers)],
    warnings: [
      "NCM por prefixo é apenas candidato; a tabela oficial vigente, a descrição e o papel na cadeia prevalecem.",
      "Débitos e créditos não são compensados automaticamente.",
    ],
    sourceCodes: [...new Set(sources)],
    version: PIS_COFINS_DEEP_VERSION,
    checkedAt: PIS_COFINS_DEEP_CHECKED_AT,
  };
}

export function calculatePisCofinsDeepReference(input: PisCofinsDeepInput): PisCofinsDeepResult {
  if (!validIsoDate(input.calculationDate)) throw new Error("invalid_calculation_date");
  const revenue = input.revenueCents === null ? null : safeMoney(input.revenueCents, "revenue");
  const creditBase = safeMoney(input.creditBaseCents, "credit_base");
  const candidates = classifyPisCofinsProduct(input.ncm);
  const profile = candidates.length === 1 ? candidates[0] : null;
  const sources = ["PISCOFINS-L-9718", "PISCOFINS-L-10637", "PISCOFINS-L-10833", "PISCOFINS-IN-2121"];
  const blockers: string[] = [];

  if (input.calculationDate < PIS_COFINS_DEEP_SUPPORTED_PERIOD.from || input.calculationDate > PIS_COFINS_DEEP_SUPPORTED_PERIOD.to) blockers.push("data fora da vigência 2026 desta versão");

  if (revenue === null) blockers.push("receita segregada não informada");
  if (!input.regimeConfirmed) blockers.push("regime cumulativo ou não cumulativo não confirmado");
  if (!input.roleConfirmed) blockers.push("papel na cadeia não confirmado");
  if (!input.operationDocumented) blockers.push("documento fiscal e natureza da operação não confirmados");
  if (!input.revenueSegregated) blockers.push("receita não segregada por tratamento tributário");

  if (input.treatment !== "general") {
    if (normalizeNcm(input.ncm).length !== 8) blockers.push("NCM de oito dígitos não informado");
    if (!profile) blockers.push(candidates.length > 1 ? "NCM alcança mais de um perfil candidato" : "NCM fora dos perfis prioritários estruturados");
    if (!input.exactNcmConfirmedInOfficialTable) blockers.push("enquadramento exato não confirmado nas tabelas oficiais da EFD-Contribuições");
    if (!input.legalTreatmentConfirmed) blockers.push("tratamento legal específico não confirmado para produto, papel, operação e data");
    if (profile && profile.candidateTreatment !== input.treatment) blockers.push("tratamento informado diverge do perfil legal candidato");
    if (profile && !profile.roles.includes(input.role)) blockers.push("papel na cadeia incompatível com o perfil candidato");
    if ((input.role === "manufacturer" || input.role === "importer") && input.treatment === "monophase") {
      blockers.push("fabricante ou importador exige alíquota concentrada específica do produto e da operação");
    }
  }

  let pisRateBps = input.regime === "cumulative" ? 65 : 165;
  let cofinsRateBps = input.regime === "cumulative" ? 300 : 760;

  if (input.treatment === "monophase" || input.treatment === "zero_rate") {
    const afterLc224 = input.calculationDate >= PIS_COFINS_LC224_EFFECTIVE_FROM;
    if (afterLc224 && !input.post2026BenefitRateConfirmed) {
      blockers.push("efeito da LC 224/2025 e eventual exceção não confirmados para a data");
    } else if (afterLc224) {
      try {
        pisRateBps = safeRate(input.post2026PisRateBps, "post2026_pis_rate");
        cofinsRateBps = safeRate(input.post2026CofinsRateBps, "post2026_cofins_rate");
      } catch {
        blockers.push("alíquotas pós-2026 não informadas em pontos-base");
      }
    } else {
      pisRateBps = 0;
      cofinsRateBps = 0;
    }
    sources.push("PISCOFINS-LC-224", ...(profile?.sourceCodes ?? []));
  }

  if (input.treatment === "suspension") {
    blockers.push("suspensão exige habilitação, finalidade, adquirente e condição de conversão específicas");
  }

  let pisCredit = 0;
  let cofinsCredit = 0;
  if (creditBase > 0 || input.creditKind !== null) {
    if (input.regime !== "non_cumulative") blockers.push("regime cumulativo não admite o crédito básico informado");
    if (!input.creditKind) blockers.push("hipótese legal do crédito não selecionada");
    if (!input.creditLegalHypothesisConfirmed) blockers.push("hipótese legal e vínculo do crédito não confirmados");
    if (!input.creditDocumented) blockers.push("crédito sem documento fiscal e memória");
    if (!input.acquisitionWasTaxed) blockers.push("aquisição sem incidência confirmada não gera crédito básico");
    if (!input.linkedToTaxedActivity) blockers.push("crédito sem vínculo comprovado com atividade ou receita elegível");
    if (input.creditKind === "resale_goods" && profile?.creditOnAcquisitionForResale === "forbidden") {
      blockers.push("crédito sobre aquisição monofásica para revenda é vedado");
    }
    const hypothesis = pisCofinsCreditHypotheses.find((item) => item.code === input.creditKind);
    if (!hypothesis) blockers.push("hipótese de crédito fora do catálogo estruturado");
    else {
      sources.push(...hypothesis.sourceCodes);
      if (hypothesis.calculationMethod === "requires_specific_memory") blockers.push("hipótese exige memória específica; alíquotas básicas não podem ser aplicadas automaticamente");
    }
    if (!blockers.length) {
      pisCredit = multiplyCents(creditBase, 165);
      cofinsCredit = multiplyCents(creditBase, 760);
    }
  }

  if (blockers.length || revenue === null) return blocked(input, profile, blockers, sources);

  const pisDebit = multiplyCents(revenue, pisRateBps);
  const cofinsDebit = multiplyCents(revenue, cofinsRateBps);
  return {
    status: "calculated_reference",
    profile,
    lines: [
      { code: "pis_debit", label: "Débito de PIS/Pasep", formula: "receita segregada × alíquota confirmada", amountCents: pisDebit, rateBps: pisRateBps },
      { code: "cofins_debit", label: "Débito de Cofins", formula: "receita segregada × alíquota confirmada", amountCents: cofinsDebit, rateBps: cofinsRateBps },
      { code: "pis_credit", label: "Crédito de PIS/Pasep", formula: creditBase ? "base elegível documentada × 1,65%" : "sem crédito informado", amountCents: pisCredit, rateBps: creditBase ? 165 : 0 },
      { code: "cofins_credit", label: "Crédito de Cofins", formula: creditBase ? "base elegível documentada × 7,60%" : "sem crédito informado", amountCents: cofinsCredit, rateBps: creditBase ? 760 : 0 },
      { code: "pis_balance", label: "Saldo de PIS/Pasep", formula: "não compensado automaticamente; conciliar EFD-Contribuições e créditos", amountCents: null, rateBps: null },
      { code: "cofins_balance", label: "Saldo de Cofins", formula: "não compensado automaticamente; conciliar EFD-Contribuições e créditos", amountCents: null, rateBps: null },
    ],
    blockers: [],
    warnings: [
      "A memória mantém débitos e créditos em centavos e não presume compensação, ressarcimento ou saldo a pagar.",
      "NCM, CST, documento, regime, papel na cadeia, data e tabela oficial precisam permanecer anexados ao dossiê.",
    ],
    sourceCodes: [...new Set([...sources, ...(profile?.sourceCodes ?? [])])],
    version: PIS_COFINS_DEEP_VERSION,
    checkedAt: PIS_COFINS_DEEP_CHECKED_AT,
  };
}

export type PisCofinsReferenceCase = {
  id: string;
  kind: "product_role" | "credit" | "negative_product" | "mandatory_gate";
  input: PisCofinsDeepInput;
  expected: {
    status: PisCofinsDeepResult["status"];
    pisDebitCents: number | null;
    cofinsDebitCents: number | null;
    pisCreditCents: number | null;
    cofinsCreditCents: number | null;
    blocker: string | null;
  };
};

const confirmedInput: PisCofinsDeepInput = {
  regime: "non_cumulative",
  treatment: "general",
  role: "service_provider",
  ncm: null,
  calculationDate: "2026-07-31",
  revenueCents: 10_000_000,
  creditBaseCents: 0,
  creditKind: null,
  regimeConfirmed: true,
  roleConfirmed: true,
  exactNcmConfirmedInOfficialTable: false,
  operationDocumented: true,
  revenueSegregated: true,
  legalTreatmentConfirmed: false,
  post2026BenefitRateConfirmed: false,
  creditLegalHypothesisConfirmed: false,
  creditDocumented: false,
  acquisitionWasTaxed: false,
  linkedToTaxedActivity: false,
};

function representativeNcm(profile: PisCofinsProductProfile) {
  return profile.ncmPrefixes[0].padEnd(8, "0").slice(0, 8);
}

const productRoleCases: PisCofinsReferenceCase[] = pisCofinsProductProfiles.map((profile) => ({
  id: `product:${profile.code}:retailer`,
  kind: "product_role",
  input: {
    ...confirmedInput,
    treatment: profile.candidateTreatment,
    role: "retailer",
    ncm: representativeNcm(profile),
    exactNcmConfirmedInOfficialTable: true,
    legalTreatmentConfirmed: true,
    post2026BenefitRateConfirmed: true,
    post2026PisRateBps: 0,
    post2026CofinsRateBps: 0,
  },
  expected: { status: "calculated_reference", pisDebitCents: 0, cofinsDebitCents: 0, pisCreditCents: 0, cofinsCreditCents: 0, blocker: null },
}));

const creditCases: PisCofinsReferenceCase[] = pisCofinsCreditHypotheses.map((hypothesis) => {
  const specific = hypothesis.calculationMethod === "requires_specific_memory";
  return {
    id: `credit:${hypothesis.code}`,
    kind: "credit",
    input: {
      ...confirmedInput,
      creditBaseCents: 2_000_000,
      creditKind: hypothesis.code,
      creditLegalHypothesisConfirmed: true,
      creditDocumented: true,
      acquisitionWasTaxed: true,
      linkedToTaxedActivity: true,
    },
    expected: specific
      ? { status: "blocked", pisDebitCents: null, cofinsDebitCents: null, pisCreditCents: null, cofinsCreditCents: null, blocker: "hipótese exige memória específica; alíquotas básicas não podem ser aplicadas automaticamente" }
      : { status: "calculated_reference", pisDebitCents: 165_000, cofinsDebitCents: 760_000, pisCreditCents: 33_000, cofinsCreditCents: 152_000, blocker: null },
  };
});

const negativeProductCases: PisCofinsReferenceCase[] = pisCofinsProductProfiles.map((profile) => ({
  id: `negative-product:${profile.code}:official-table`,
  kind: "negative_product",
  input: {
    ...confirmedInput,
    treatment: profile.candidateTreatment,
    role: "retailer",
    ncm: representativeNcm(profile),
    exactNcmConfirmedInOfficialTable: false,
    legalTreatmentConfirmed: true,
    post2026BenefitRateConfirmed: true,
    post2026PisRateBps: 0,
    post2026CofinsRateBps: 0,
  },
  expected: { status: "blocked", pisDebitCents: null, cofinsDebitCents: null, pisCreditCents: null, cofinsCreditCents: null, blocker: "enquadramento exato não confirmado nas tabelas oficiais da EFD-Contribuições" },
}));

const pisCofinsGateMutations: Array<{ code: string; patch: Partial<PisCofinsDeepInput>; blocker: string }> = [
  { code: "date", patch: { calculationDate: "2027-01-01" }, blocker: "data fora da vigência 2026 desta versão" },
  { code: "revenue", patch: { revenueCents: null }, blocker: "receita segregada não informada" },
  { code: "regime", patch: { regimeConfirmed: false }, blocker: "regime cumulativo ou não cumulativo não confirmado" },
  { code: "role", patch: { roleConfirmed: false }, blocker: "papel na cadeia não confirmado" },
  { code: "document", patch: { operationDocumented: false }, blocker: "documento fiscal e natureza da operação não confirmados" },
  { code: "segregation", patch: { revenueSegregated: false }, blocker: "receita não segregada por tratamento tributário" },
  { code: "credit_hypothesis", patch: { creditBaseCents: 100_000, creditKind: "inputs", creditDocumented: true, acquisitionWasTaxed: true, linkedToTaxedActivity: true }, blocker: "hipótese legal e vínculo do crédito não confirmados" },
  { code: "credit_document", patch: { creditBaseCents: 100_000, creditKind: "inputs", creditLegalHypothesisConfirmed: true, acquisitionWasTaxed: true, linkedToTaxedActivity: true }, blocker: "crédito sem documento fiscal e memória" },
  { code: "acquisition_incidence", patch: { creditBaseCents: 100_000, creditKind: "inputs", creditLegalHypothesisConfirmed: true, creditDocumented: true, linkedToTaxedActivity: true }, blocker: "aquisição sem incidência confirmada não gera crédito básico" },
  { code: "credit_link", patch: { creditBaseCents: 100_000, creditKind: "inputs", creditLegalHypothesisConfirmed: true, creditDocumented: true, acquisitionWasTaxed: true }, blocker: "crédito sem vínculo comprovado com atividade ou receita elegível" },
];

const mandatoryPisCofinsGateCases: PisCofinsReferenceCase[] = pisCofinsGateMutations.map((mutation) => ({
  id: `gate:${mutation.code}`,
  kind: "mandatory_gate",
  input: { ...confirmedInput, ...mutation.patch },
  expected: { status: "blocked", pisDebitCents: null, cofinsDebitCents: null, pisCreditCents: null, cofinsCreditCents: null, blocker: mutation.blocker },
}));

export const pisCofinsReferenceCases: PisCofinsReferenceCase[] = [
  ...productRoleCases,
  ...creditCases,
  ...negativeProductCases,
  ...mandatoryPisCofinsGateCases,
];

export function executePisCofinsReferenceCase(referenceCase: PisCofinsReferenceCase) {
  return calculatePisCofinsDeepReference(referenceCase.input);
}

export function pisCofinsDeepMetrics() {
  return {
    prioritizedProductProfiles: pisCofinsProductProfiles.length,
    creditHypotheses: pisCofinsCreditHypotheses.length,
    regimes: 2,
    specialTreatments: 3,
    deterministicCases: pisCofinsReferenceCases.length,
    calculatedMemories: pisCofinsReferenceCases.filter((item) => item.expected.status === "calculated_reference").length,
    safelyBlockedCases: pisCofinsReferenceCases.filter((item) => item.expected.status === "blocked").length,
  };
}

const baseInput: PisCofinsDeepInput = {
  regime: "cumulative",
  treatment: "general",
  role: "service_provider",
  ncm: null,
  calculationDate: "2026-07-30",
  revenueCents: 10_000_000,
  creditBaseCents: 0,
  creditKind: null,
  regimeConfirmed: true,
  roleConfirmed: true,
  exactNcmConfirmedInOfficialTable: false,
  operationDocumented: true,
  revenueSegregated: true,
  legalTreatmentConfirmed: false,
  post2026BenefitRateConfirmed: false,
  creditLegalHypothesisConfirmed: false,
  creditDocumented: false,
  acquisitionWasTaxed: false,
  linkedToTaxedActivity: false,
};

export function validatePisCofinsDeep() {
  const errors: string[] = [];
  if (pisCofinsProductProfiles.length !== 60) errors.push("sixty_priority_profiles_required");
  if (pisCofinsCreditHypotheses.length !== 20) errors.push("twenty_credit_hypotheses_required");
  if (new Set(pisCofinsProductProfiles.map((item) => item.code)).size !== pisCofinsProductProfiles.length) errors.push("duplicate_product_profile");
  if (new Set(pisCofinsDeepSources.map((item) => item.code)).size !== pisCofinsDeepSources.length) errors.push("duplicate_source");
  if (!pisCofinsDeepSources.every((item) => item.url.startsWith("https://") && item.checkedAt === PIS_COFINS_DEEP_CHECKED_AT)) errors.push("official_source_metadata_invalid");
  if (!pisCofinsProductProfiles.every((item, index) => item.rank === index + 1 && item.sourceCodes.length >= 3 && item.version === PIS_COFINS_DEEP_VERSION)) errors.push("rank_or_evidence_incomplete");

  const cumulative = calculatePisCofinsDeepReference(baseInput);
  if (cumulative.status !== "calculated_reference" || cumulative.lines[0]?.amountCents !== 65_000 || cumulative.lines[1]?.amountCents !== 300_000) errors.push("cumulative_memory_failed");

  const nonCumulative = calculatePisCofinsDeepReference({
    ...baseInput,
    regime: "non_cumulative",
    creditBaseCents: 2_000_000,
    creditKind: "inputs",
    creditLegalHypothesisConfirmed: true,
    creditDocumented: true,
    acquisitionWasTaxed: true,
    linkedToTaxedActivity: true,
  });
  if (nonCumulative.status !== "calculated_reference" || nonCumulative.lines[2]?.amountCents !== 33_000 || nonCumulative.lines.at(-1)?.amountCents !== null) errors.push("non_cumulative_memory_failed");

  const monophase2026 = calculatePisCofinsDeepReference({
    ...baseInput,
    treatment: "monophase",
    role: "retailer",
    ncm: "40111000",
    exactNcmConfirmedInOfficialTable: true,
    legalTreatmentConfirmed: true,
  });
  if (monophase2026.status !== "blocked" || !monophase2026.blockers.some((item) => item.includes("LC 224"))) errors.push("post_2026_benefit_gate_failed");

  const forbiddenCredit = calculatePisCofinsDeepReference({
    ...baseInput,
    regime: "non_cumulative",
    treatment: "monophase",
    role: "retailer",
    ncm: "40111000",
    exactNcmConfirmedInOfficialTable: true,
    legalTreatmentConfirmed: true,
    post2026BenefitRateConfirmed: true,
    post2026PisRateBps: 0,
    post2026CofinsRateBps: 0,
    creditBaseCents: 2_000_000,
    creditKind: "resale_goods",
    creditLegalHypothesisConfirmed: true,
    creditDocumented: true,
    acquisitionWasTaxed: true,
    linkedToTaxedActivity: true,
  });
  if (forbiddenCredit.status !== "blocked" || !forbiddenCredit.blockers.some((item) => item.includes("vedado"))) errors.push("monophase_credit_not_blocked");

  if (pisCofinsReferenceCases.length !== 150 || new Set(pisCofinsReferenceCases.map((item) => item.id)).size !== 150) errors.push("one_hundred_fifty_unique_cases_required");
  for (const referenceCase of pisCofinsReferenceCases) {
    const output = executePisCofinsReferenceCase(referenceCase);
    const amount = (code: string) => output.lines.find((line) => line.code === code)?.amountCents ?? null;
    if (output.status !== referenceCase.expected.status) errors.push(`${referenceCase.id}:status_diverged`);
    if (amount("pis_debit") !== referenceCase.expected.pisDebitCents) errors.push(`${referenceCase.id}:pis_debit_diverged`);
    if (amount("cofins_debit") !== referenceCase.expected.cofinsDebitCents) errors.push(`${referenceCase.id}:cofins_debit_diverged`);
    if (amount("pis_credit") !== referenceCase.expected.pisCreditCents) errors.push(`${referenceCase.id}:pis_credit_diverged`);
    if (amount("cofins_credit") !== referenceCase.expected.cofinsCreditCents) errors.push(`${referenceCase.id}:cofins_credit_diverged`);
    if (referenceCase.expected.blocker !== null && !output.blockers.includes(referenceCase.expected.blocker)) errors.push(`${referenceCase.id}:blocker_diverged`);
    if (referenceCase.expected.status === "blocked" && output.lines.length > 0) errors.push(`${referenceCase.id}:blocked_case_leaked_value`);
  }
  if (pisCofinsDeepMetrics().calculatedMemories < 40) errors.push("forty_positive_memories_required");

  return { passed: errors.length === 0, errors };
}

export async function hashPisCofinsDeep() {
  const payload = JSON.stringify({
    version: PIS_COFINS_DEEP_VERSION,
    checkedAt: PIS_COFINS_DEEP_CHECKED_AT,
    sources: pisCofinsDeepSources,
    profiles: pisCofinsProductProfiles,
    credits: pisCofinsCreditHypotheses,
    lc224EffectiveFrom: PIS_COFINS_LC224_EFFECTIVE_FROM,
    supportedPeriod: PIS_COFINS_DEEP_SUPPORTED_PERIOD,
    referenceCases: pisCofinsReferenceCases,
  });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

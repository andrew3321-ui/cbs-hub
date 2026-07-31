export const PIS_COFINS_DEEP_VERSION = "2026.07.31-v81";
export const PIS_COFINS_DEEP_CHECKED_AT = "2026-07-30";
export const PIS_COFINS_LC224_EFFECTIVE_FROM = "2026-04-01";

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
  | "sales_returns";

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
  return pisCofinsProductProfiles.filter((item) => item.ncmPrefixes.some((prefix) => normalized.startsWith(prefix)));
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
    else sources.push(...hypothesis.sourceCodes);
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

export function pisCofinsDeepMetrics() {
  return {
    prioritizedProductProfiles: pisCofinsProductProfiles.length,
    creditHypotheses: pisCofinsCreditHypotheses.length,
    regimes: 2,
    specialTreatments: 3,
    deterministicCases: pisCofinsProductProfiles.length + pisCofinsCreditHypotheses.length + 11,
    calculatedMemories: 4,
    safelyBlockedCases: pisCofinsProductProfiles.length + pisCofinsCreditHypotheses.length + 7,
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
  if (pisCofinsProductProfiles.length !== 20) errors.push("twenty_priority_profiles_required");
  if (pisCofinsCreditHypotheses.length !== 9) errors.push("nine_credit_hypotheses_required");
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
  });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

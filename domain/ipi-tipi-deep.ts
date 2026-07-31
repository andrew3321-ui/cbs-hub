export const IPI_TIPI_DEEP_VERSION = "2026.07.30-v83";
export const IPI_TIPI_DEEP_CHECKED_AT = "2026-07-30";
export const IPI_TIPI_DEEP_EFFECTIVE_FROM = "2026-01-30";

export type IpiOperation =
  | "industrial_output"
  | "import_clearance"
  | "equiparated_output"
  | "non_taxable_exit";

export type IpiTaxpayerRole =
  | "industrial"
  | "importer"
  | "equiparated_industrial"
  | "ordinary_reseller";

export type IpiExternalBenefit =
  | "none"
  | "reduction"
  | "exemption"
  | "suspension"
  | "immunity";

export type IpiTipiSource = {
  code: string;
  title: string;
  publisher: string;
  url: string;
  legalReference: string;
  effectiveFrom: string;
  checkedAt: string;
};

export type IpiTipiException = {
  code: string;
  description: string;
  rateBps: number;
  treatment: "reduced_rate" | "zero_rate";
  sourceCodes: string[];
};

export type IpiTipiProfile = {
  rank: number;
  ncm: string;
  description: string;
  chapter: string;
  nominalRateBps: number;
  nominalTreatment: "taxed" | "zero_rate";
  exceptions: IpiTipiException[];
  classificationNotes: string[];
  sourceCodes: string[];
  effectiveFrom: string;
  effectiveTo: string | null;
  priorityBasis: "internal_operational_heuristic";
  version: string;
  checkedAt: string;
};

export type IpiTipiDeepInput = {
  ncm: string | null;
  calculationDate: string;
  operation: IpiOperation;
  taxpayerRole: IpiTaxpayerRole;
  productDescriptionConfirmed: boolean;
  exactNcmConfirmed: boolean;
  tipiVersionConfirmed: boolean;
  sectionChapterNotesConfirmed: boolean;
  taxpayerRoleConfirmed: boolean;
  operationDocumented: boolean;
  operationValueCents: number | null;
  customsValueCents: number | null;
  importTaxCents: number | null;
  exchangeChargesCents: number | null;
  tipiExceptionCode: string | null;
  tipiExceptionConfirmed: boolean;
  noListedExceptionAppliesConfirmed: boolean;
  externalBenefit: IpiExternalBenefit;
  externalBenefitLegalReference: string | null;
  externalBenefitValidityConfirmed: boolean;
  nonTaxableReasonConfirmed: boolean;
};

export type IpiTipiDeepLine = {
  code: string;
  label: string;
  formula: string;
  amountCents: number | null;
  rateBps: number | null;
};

export type IpiTipiDeepResult = {
  status:
    | "calculated_reference"
    | "zero_rate_reference"
    | "not_taxable_reference"
    | "blocked";
  profile: IpiTipiProfile | null;
  appliedException: IpiTipiException | null;
  lines: IpiTipiDeepLine[];
  blockers: string[];
  warnings: string[];
  sourceCodes: string[];
  operation: {
    code: IpiOperation;
    taxableEvent: string;
    taxpayerRole: IpiTaxpayerRole;
    dueRule: string;
  };
  version: string;
  checkedAt: string;
};

export const ipiTipiDeepSources: IpiTipiSource[] = [
  {
    code: "IPI-D11158-TIPI",
    title: "Decreto nº 11.158/2022 — Tabela de Incidência do IPI",
    publisher: "Presidência da República",
    url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2022/decreto/d11158.htm",
    legalReference: "arts. 1º a 4º e Anexo; TIPI baseada na NCM",
    effectiveFrom: "2022-08-01",
    checkedAt: IPI_TIPI_DEEP_CHECKED_AT,
  },
  {
    code: "IPI-RFB-TIPI-CONSOLIDATED",
    title: "TIPI consolidada — atualizada pelo ADE RFB nº 1/2026",
    publisher: "Receita Federal",
    url: "https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/legislacao/documentos-e-arquivos/tipi.pdf",
    legalReference: "tabela consolidada com alterações até o ADE RFB nº 1, de 30/01/2026, retificado em 12/02/2026",
    effectiveFrom: IPI_TIPI_DEEP_EFFECTIVE_FROM,
    checkedAt: IPI_TIPI_DEEP_CHECKED_AT,
  },
  {
    code: "IPI-RFB-NCM",
    title: "NCM e classificação fiscal de mercadorias",
    publisher: "Receita Federal",
    url: "https://www.gov.br/receitafederal/pt-br/assuntos/aduana-e-comercio-exterior/classificacao-fiscal-de-mercadorias/ncm",
    legalReference: "NCM de oito dígitos, regras de classificação, notas e relação com a TIPI",
    effectiveFrom: "2022-01-01",
    checkedAt: IPI_TIPI_DEEP_CHECKED_AT,
  },
  {
    code: "IPI-RFB-ORIENTATION",
    title: "IPI — fato gerador, contribuinte, base, período e vencimento",
    publisher: "Receita Federal",
    url: "https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/tributos/ipi",
    legalReference: "desembaraço, saída industrial/equiparada, base interna e de importação e prazos",
    effectiveFrom: "2023-08-21",
    checkedAt: IPI_TIPI_DEEP_CHECKED_AT,
  },
  {
    code: "IPI-D7212-RIPI",
    title: "Decreto nº 7.212/2010 — Regulamento do IPI",
    publisher: "Presidência da República",
    url: "https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2010/decreto/d7212.htm",
    legalReference: "industrialização, equiparação, incidência, não incidência, suspensão, base e crédito",
    effectiveFrom: "2010-06-16",
    checkedAt: IPI_TIPI_DEEP_CHECKED_AT,
  },
  {
    code: "IPI-RFB-IMPORT",
    title: "IPI na declaração de importação",
    publisher: "Receita Federal",
    url: "https://www.gov.br/receitafederal/pt-br/assuntos/aduana-e-comercio-exterior/manuais/despacho-de-importacao/sistemas/siscomex-importacao-web/declaracao-de-importacao/funcionalidades/elaborar-uma-nova-solicitacao-de-di/preenchimento-da-di-1/formularios-de-dados-especificos-da-adicao/aba-tributos-1/principais-campos-relativos-ao-imposto-sobre-produtos-industrializados-2013-ipi",
    legalReference: "regimes integral, redução, isenção e suspensão com fundamento legal",
    effectiveFrom: "2019-10-07",
    checkedAt: IPI_TIPI_DEEP_CHECKED_AT,
  },
  {
    code: "IPI-EFD-ICMS-IPI",
    title: "Guia Prático EFD ICMS/IPI v3.2.2",
    publisher: "SPED",
    url: "https://sped.rfb.gov.br/arquivo/download/8112",
    legalReference: "documentos, itens, apuração e ajustes do IPI na escrituração digital",
    effectiveFrom: "2025-01-01",
    checkedAt: IPI_TIPI_DEEP_CHECKED_AT,
  },
];

const baseSources = ["IPI-D11158-TIPI", "IPI-RFB-TIPI-CONSOLIDATED", "IPI-RFB-NCM"];

function exception(code: string, description: string, rateBps: number): IpiTipiException {
  return {
    code,
    description,
    rateBps,
    treatment: rateBps === 0 ? "zero_rate" : "reduced_rate",
    sourceCodes: ["IPI-RFB-TIPI-CONSOLIDATED"],
  };
}

function profile(
  rank: number,
  ncm: string,
  description: string,
  nominalRateBps: number,
  exceptions: IpiTipiException[] = [],
  classificationNotes: string[] = [],
): IpiTipiProfile {
  return {
    rank,
    ncm,
    description,
    chapter: ncm.slice(0, 2),
    nominalRateBps,
    nominalTreatment: nominalRateBps === 0 ? "zero_rate" : "taxed",
    exceptions,
    classificationNotes: [
      "O NCM de oito dígitos e a descrição legal devem coincidir.",
      "Notas de Seção, Capítulo, Subposição e Complementares prevalecem sobre o rótulo comercial.",
      ...classificationNotes,
    ],
    sourceCodes: baseSources,
    effectiveFrom: IPI_TIPI_DEEP_EFFECTIVE_FROM,
    effectiveTo: null,
    priorityBasis: "internal_operational_heuristic",
    version: IPI_TIPI_DEEP_VERSION,
    checkedAt: IPI_TIPI_DEEP_CHECKED_AT,
  };
}

export const ipiTipiPriorityProfiles: IpiTipiProfile[] = [
  profile(1, "39232190", "Outros sacos, bolsas e cartuchos de polímeros de etileno", 975),
  profile(2, "48191000", "Caixas de papel ou cartão ondulados", 1500),
  profile(3, "39269090", "Outras obras de plástico", 975, [
    exception("EX01", "Forma para fabricação de calçados", 0),
    exception("EX02", "Máscara de proteção", 0),
  ]),
  profile(4, "33049990", "Outras preparações de beleza ou para cuidados da pele", 1430, [
    exception("EX01", "Preparados bronzeadores", 780),
    exception("EX02", "Preparados antissolares sem propriedades bronzeadoras", 0),
  ]),
  profile(5, "61091000", "Camisetas de malha, de algodão", 0),
  profile(6, "64029990", "Outro calçado com sola e parte superior de borracha ou plástico", 0),
  profile(7, "73089090", "Outras construções e partes de construções de ferro ou aço", 325, [
    exception("EX01", "Telhas de aço", 0),
  ]),
  profile(8, "84213100", "Filtros de entrada de ar para motores", 520),
  profile(9, "84713012", "Máquinas automáticas portáteis, com tela acima de 140 cm² e abaixo de 560 cm²", 1500),
  profile(10, "85044090", "Outros conversores estáticos", 975),
  profile(11, "85071090", "Outros acumuladores de chumbo para arranque de motores", 975, [
    exception("EX01", "Acumulador para motor de ignição por compressão com corrente igual ou superior a 90 Ah", 260),
  ]),
  profile(12, "85171300", "Telefones inteligentes (smartphones)", 1500),
  profile(13, "87089990", "Outras partes e acessórios de veículos das posições 87.01 a 87.05", 325),
  profile(14, "94036000", "Outros móveis de madeira", 325),
  profile(15, "19059090", "Outros produtos de padaria, pastelaria ou indústria de bolachas e biscoitos", 0, [
    exception("EX01", "Pão do tipo comum", 0),
  ]),
];

function normalizeNcm(value: string | null) {
  return (value ?? "").replace(/\D/g, "");
}

function normalizeException(value: string | null) {
  const cleaned = (value ?? "").replace(/[^a-z0-9]/gi, "").toUpperCase();
  if (!cleaned) return "";
  if (/^\d+$/.test(cleaned)) return `EX${cleaned.padStart(2, "0")}`;
  const match = cleaned.match(/^EX(\d+)$/);
  return match ? `EX${match[1].padStart(2, "0")}` : cleaned;
}

function validIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function safeMoney(value: number | null, field: string) {
  if (value === null || !Number.isSafeInteger(value) || value < 0) throw new Error(`invalid_${field}`);
  return value;
}

function multiplyCents(value: number, rateBps: number) {
  const rounded = (BigInt(value) * BigInt(rateBps) + 5_000n) / 10_000n;
  if (rounded > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("unsafe_ipi_amount");
  return Number(rounded);
}

function operationMetadata(operation: IpiOperation, role: IpiTaxpayerRole) {
  if (operation === "import_clearance") {
    return {
      code: operation,
      taxableEvent: "Desembaraço aduaneiro de produto de procedência estrangeira",
      taxpayerRole: role,
      dueRule: "Antes da saída do produto da repartição que processar o despacho",
    };
  }
  if (operation === "non_taxable_exit") {
    return {
      code: operation,
      taxableEvent: "Saída comercial declarada fora das hipóteses de industrial/equiparado",
      taxpayerRole: role,
      dueRule: "Sem vencimento de IPI neste recorte, condicionado à não incidência comprovada",
    };
  }
  return {
    code: operation,
    taxableEvent: operation === "equiparated_output"
      ? "Saída de estabelecimento equiparado a industrial"
      : "Saída de produto de estabelecimento industrial",
    taxpayerRole: role,
    dueRule: "Em regra, até o dia 25 do mês subsequente, antecipado se não houver dia útil",
  };
}

export function findIpiTipiProfile(ncm: string | null) {
  const normalized = normalizeNcm(ncm);
  if (normalized.length !== 8) return null;
  return ipiTipiPriorityProfiles.find((item) => item.ncm === normalized) ?? null;
}

function roleMatchesOperation(operation: IpiOperation, role: IpiTaxpayerRole) {
  if (operation === "industrial_output") return role === "industrial";
  if (operation === "import_clearance") return role === "importer";
  if (operation === "equiparated_output") return role === "equiparated_industrial";
  return role === "ordinary_reseller";
}

export function calculateIpiTipiDeepReference(input: IpiTipiDeepInput): IpiTipiDeepResult {
  if (!validIsoDate(input.calculationDate)) throw new Error("invalid_calculation_date");
  const normalizedNcm = normalizeNcm(input.ncm);
  const profile = findIpiTipiProfile(normalizedNcm);
  const operation = operationMetadata(input.operation, input.taxpayerRole);
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (normalizedNcm.length !== 8) blockers.push("NCM exato de oito dígitos não informado");
  if (!profile) blockers.push("NCM fora dos quinze perfis exatos priorizados");
  if (!input.exactNcmConfirmed) blockers.push("classificação fiscal exata não confirmada");
  if (!input.productDescriptionConfirmed) blockers.push("descrição legal da mercadoria não confirmada");
  if (!input.tipiVersionConfirmed) blockers.push("versão consolidada da TIPI não confirmada");
  if (!input.sectionChapterNotesConfirmed) blockers.push("notas de Seção, Capítulo, Subposição e Complementares não conferidas");
  if (!input.taxpayerRoleConfirmed) blockers.push("papel do contribuinte não confirmado");
  if (!input.operationDocumented) blockers.push("fato gerador e documento da operação não confirmados");
  if (!roleMatchesOperation(input.operation, input.taxpayerRole)) blockers.push("papel do contribuinte incompatível com a operação");
  if (input.calculationDate < IPI_TIPI_DEEP_EFFECTIVE_FROM) blockers.push("data anterior ao recorte consolidado da TIPI 2026");
  if (profile?.effectiveTo && input.calculationDate > profile.effectiveTo) blockers.push("perfil fora da vigência");

  const requestedException = normalizeException(input.tipiExceptionCode);
  const appliedException = profile?.exceptions.find((item) => item.code === requestedException) ?? null;
  if (requestedException && !appliedException) blockers.push("Ex informado não existe no perfil NCM controlado");
  if (requestedException && !input.tipiExceptionConfirmed) blockers.push("descrição e condições do Ex não confirmadas");
  if (profile?.exceptions.length && !requestedException && !input.noListedExceptionAppliesConfirmed) {
    blockers.push("existência de Ex na TIPI exige confirmar que nenhuma exceção se aplica");
  }

  if (input.externalBenefit !== "none") {
    if (!input.externalBenefitLegalReference?.trim()) blockers.push("ato legal do benefício externo não informado");
    if (!input.externalBenefitValidityConfirmed) blockers.push("vigência e condições do benefício externo não confirmadas");
    blockers.push("benefício externo à TIPI exige regra jurídica dedicada antes de calcular");
  }

  if (input.operation === "non_taxable_exit") {
    if (!input.nonTaxableReasonConfirmed) blockers.push("motivo da não incidência da saída não confirmado");
    if (blockers.length) {
      return {
        status: "blocked",
        profile,
        appliedException,
        lines: [],
        blockers: [...new Set(blockers)],
        warnings,
        sourceCodes: [...new Set([...(profile?.sourceCodes ?? baseSources), "IPI-RFB-ORIENTATION", "IPI-D7212-RIPI"])],
        operation,
        version: IPI_TIPI_DEEP_VERSION,
        checkedAt: IPI_TIPI_DEEP_CHECKED_AT,
      };
    }
    return {
      status: "not_taxable_reference",
      profile,
      appliedException: null,
      lines: [
        { code: "ipi_base", label: "Base do IPI", formula: "Saída comercial não tributada no recorte confirmado", amountCents: 0, rateBps: null },
        { code: "ipi_due", label: "IPI devido", formula: "Sem fato gerador de industrial/equiparado confirmado", amountCents: 0, rateBps: 0 },
      ],
      blockers: [],
      warnings: ["A revenda comum só permanece fora do IPI se não houver equiparação, industrialização, importação própria ou hipótese específica."],
      sourceCodes: [...new Set([...(profile?.sourceCodes ?? baseSources), "IPI-RFB-ORIENTATION", "IPI-D7212-RIPI"])],
      operation,
      version: IPI_TIPI_DEEP_VERSION,
      checkedAt: IPI_TIPI_DEEP_CHECKED_AT,
    };
  }

  let baseCents: number | null = null;
  if (input.operation === "import_clearance") {
    try {
      const customs = safeMoney(input.customsValueCents, "customs_value");
      const importTax = safeMoney(input.importTaxCents, "import_tax");
      const exchangeCharges = safeMoney(input.exchangeChargesCents, "exchange_charges");
      baseCents = customs + importTax + exchangeCharges;
      if (!Number.isSafeInteger(baseCents)) throw new Error("unsafe_import_base");
    } catch {
      blockers.push("base de importação incompleta ou inválida");
    }
  } else {
    try {
      baseCents = safeMoney(input.operationValueCents, "operation_value");
    } catch {
      blockers.push("valor total da operação interna não informado");
    }
  }

  if (blockers.length || !profile || baseCents === null) {
    return {
      status: "blocked",
      profile,
      appliedException,
      lines: [],
      blockers: [...new Set(blockers)],
      warnings: [
        ...warnings,
        "Prefixos, rótulos comerciais ou alíquotas digitadas isoladamente nunca liberam uma memória.",
      ],
      sourceCodes: [...new Set([...(profile?.sourceCodes ?? baseSources), "IPI-RFB-ORIENTATION", ...(input.operation === "import_clearance" ? ["IPI-RFB-IMPORT"] : [])])],
      operation,
      version: IPI_TIPI_DEEP_VERSION,
      checkedAt: IPI_TIPI_DEEP_CHECKED_AT,
    };
  }

  const rateBps = appliedException?.rateBps ?? profile.nominalRateBps;
  const amountCents = multiplyCents(baseCents, rateBps);
  const baseFormula = input.operation === "import_clearance"
    ? "Valor aduaneiro + Imposto de Importação + encargos cambiais"
    : "Valor total da operação de saída";
  const rateFormula = appliedException
    ? `TIPI ${profile.ncm} ${appliedException.code} — ${appliedException.description}`
    : `TIPI ${profile.ncm} — alíquota nominal`;

  return {
    status: rateBps === 0 ? "zero_rate_reference" : "calculated_reference",
    profile,
    appliedException,
    lines: [
      { code: "ipi_base", label: "Base do IPI", formula: baseFormula, amountCents: baseCents, rateBps: null },
      { code: "tipi_rate", label: "Alíquota TIPI", formula: rateFormula, amountCents: null, rateBps },
      { code: "ipi_due", label: "IPI devido", formula: "Base em centavos × alíquota em pontos-base, arredondada ao centavo", amountCents, rateBps },
    ],
    blockers: [],
    warnings: [
      ...warnings,
      "Créditos, estornos, ajustes e saldo do período não são compensados nesta memória de débito.",
      "Mudança de descrição, Ex, operação, papel ou data exige nova execução versionada.",
    ],
    sourceCodes: [...new Set([
      ...profile.sourceCodes,
      ...(appliedException?.sourceCodes ?? []),
      "IPI-RFB-ORIENTATION",
      "IPI-EFD-ICMS-IPI",
      ...(input.operation === "import_clearance" ? ["IPI-RFB-IMPORT"] : []),
    ])],
    operation,
    version: IPI_TIPI_DEEP_VERSION,
    checkedAt: IPI_TIPI_DEEP_CHECKED_AT,
  };
}

const completeInput: IpiTipiDeepInput = {
  ncm: "39232190",
  calculationDate: "2026-07-30",
  operation: "industrial_output",
  taxpayerRole: "industrial",
  productDescriptionConfirmed: true,
  exactNcmConfirmed: true,
  tipiVersionConfirmed: true,
  sectionChapterNotesConfirmed: true,
  taxpayerRoleConfirmed: true,
  operationDocumented: true,
  operationValueCents: 10_000_000,
  customsValueCents: null,
  importTaxCents: null,
  exchangeChargesCents: null,
  tipiExceptionCode: null,
  tipiExceptionConfirmed: false,
  noListedExceptionAppliesConfirmed: true,
  externalBenefit: "none",
  externalBenefitLegalReference: null,
  externalBenefitValidityConfirmed: false,
  nonTaxableReasonConfirmed: false,
};

export type IpiTipiDeterministicCase = {
  code: string;
  expectedStatus: IpiTipiDeepResult["status"];
  input: IpiTipiDeepInput;
};

export const ipiTipiDeterministicCases: IpiTipiDeterministicCase[] = [
  ...ipiTipiPriorityProfiles.flatMap((item) => [
    {
      code: `${item.ncm}-STANDARD`,
      expectedStatus: item.nominalRateBps === 0 ? "zero_rate_reference" as const : "calculated_reference" as const,
      input: { ...completeInput, ncm: item.ncm },
    },
    {
      code: `${item.ncm}-MISSING-DESCRIPTION`,
      expectedStatus: "blocked" as const,
      input: { ...completeInput, ncm: item.ncm, productDescriptionConfirmed: false },
    },
    {
      code: `${item.ncm}-GENERIC-NCM`,
      expectedStatus: "blocked" as const,
      input: { ...completeInput, ncm: item.ncm.slice(0, 4) },
    },
    {
      code: `${item.ncm}-ROLE-MISMATCH`,
      expectedStatus: "blocked" as const,
      input: { ...completeInput, ncm: item.ncm, taxpayerRole: "ordinary_reseller" as const },
    },
    {
      code: `${item.ncm}-EXTERNAL-BENEFIT`,
      expectedStatus: "blocked" as const,
      input: {
        ...completeInput,
        ncm: item.ncm,
        externalBenefit: "suspension" as const,
        externalBenefitLegalReference: "ADE específico informado",
        externalBenefitValidityConfirmed: true,
      },
    },
  ]),
  {
    code: "33049990-EX01",
    expectedStatus: "calculated_reference",
    input: { ...completeInput, ncm: "33049990", tipiExceptionCode: "Ex 01", tipiExceptionConfirmed: true, noListedExceptionAppliesConfirmed: false },
  },
  {
    code: "33049990-EX02",
    expectedStatus: "zero_rate_reference",
    input: { ...completeInput, ncm: "33049990", tipiExceptionCode: "Ex 02", tipiExceptionConfirmed: true, noListedExceptionAppliesConfirmed: false },
  },
  {
    code: "85071090-EX01",
    expectedStatus: "calculated_reference",
    input: { ...completeInput, ncm: "85071090", tipiExceptionCode: "Ex 01", tipiExceptionConfirmed: true, noListedExceptionAppliesConfirmed: false },
  },
  {
    code: "39269090-EX02",
    expectedStatus: "zero_rate_reference",
    input: { ...completeInput, ncm: "39269090", tipiExceptionCode: "Ex 02", tipiExceptionConfirmed: true, noListedExceptionAppliesConfirmed: false },
  },
  {
    code: "73089090-EX01",
    expectedStatus: "zero_rate_reference",
    input: { ...completeInput, ncm: "73089090", tipiExceptionCode: "Ex 01", tipiExceptionConfirmed: true, noListedExceptionAppliesConfirmed: false },
  },
];

export function runIpiTipiDeterministicCases() {
  return ipiTipiDeterministicCases.map((item) => {
    const result = calculateIpiTipiDeepReference(item.input);
    return { ...item, result, passed: result.status === item.expectedStatus };
  });
}

export function ipiTipiDeepMetrics() {
  const runs = runIpiTipiDeterministicCases();
  return {
    prioritizedNcms: ipiTipiPriorityProfiles.length,
    exactExceptions: ipiTipiPriorityProfiles.reduce((sum, item) => sum + item.exceptions.length, 0),
    operations: 4,
    officialSources: ipiTipiDeepSources.length,
    deterministicCases: runs.length,
    calculatedMemories: runs.filter((item) => item.result.status !== "blocked").length,
    safelyBlockedCases: runs.filter((item) => item.result.status === "blocked").length,
  };
}

export function validateIpiTipiDeep() {
  const errors: string[] = [];
  if (ipiTipiPriorityProfiles.length !== 15) errors.push("fifteen_priority_ncms_required");
  if (new Set(ipiTipiPriorityProfiles.map((item) => item.ncm)).size !== ipiTipiPriorityProfiles.length) errors.push("duplicate_ncm_profile");
  if (!ipiTipiPriorityProfiles.every((item, index) => item.rank === index + 1 && /^\d{8}$/.test(item.ncm))) errors.push("rank_or_exact_ncm_invalid");
  if (!ipiTipiPriorityProfiles.every((item) => item.version === IPI_TIPI_DEEP_VERSION && item.checkedAt === IPI_TIPI_DEEP_CHECKED_AT && item.sourceCodes.length >= 3)) errors.push("profile_evidence_incomplete");
  if (!ipiTipiDeepSources.every((item) => item.url.startsWith("https://") && item.legalReference.length > 10 && item.checkedAt === IPI_TIPI_DEEP_CHECKED_AT)) errors.push("official_source_metadata_invalid");
  if (ipiTipiPriorityProfiles.some((item) => item.nominalRateBps < 0 || !Number.isSafeInteger(item.nominalRateBps))) errors.push("invalid_nominal_rate");

  const runs = runIpiTipiDeterministicCases();
  errors.push(...runs.filter((item) => !item.passed).map((item) => `${item.code}:expected_${item.expectedStatus}_got_${item.result.status}`));

  const standard = calculateIpiTipiDeepReference(completeInput);
  if (standard.lines.find((line) => line.code === "ipi_due")?.amountCents !== 975_000) errors.push("standard_memory_failed");
  const importRun = calculateIpiTipiDeepReference({
    ...completeInput,
    operation: "import_clearance",
    taxpayerRole: "importer",
    operationValueCents: null,
    customsValueCents: 8_000_000,
    importTaxCents: 1_000_000,
    exchangeChargesCents: 100_000,
  });
  if (importRun.lines.find((line) => line.code === "ipi_base")?.amountCents !== 9_100_000) errors.push("import_base_memory_failed");

  return { passed: errors.length === 0, errors };
}

export async function hashIpiTipiDeep() {
  const payload = JSON.stringify({
    version: IPI_TIPI_DEEP_VERSION,
    checkedAt: IPI_TIPI_DEEP_CHECKED_AT,
    sources: ipiTipiDeepSources,
    profiles: ipiTipiPriorityProfiles,
    cases: ipiTipiDeterministicCases.map((item) => ({ code: item.code, expectedStatus: item.expectedStatus, input: item.input })),
  });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

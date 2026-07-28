import {
  ST_AUTO_PARTS_HIGH_USE_CORRIDORS_CHECKED_AT,
  ST_AUTO_PARTS_HIGH_USE_CORRIDORS_VERSION,
  ST_AUTO_PARTS_OPERATION_FACT_LABELS,
  ST_AUTO_PARTS_SP_EXCLUSION_FROM,
  ST_AUTO_PARTS_SUPPORTED_PERIOD,
  stAutoPartsHighUseRouteByKey,
  stAutoPartsHighUseSources,
  type AutoPartsOperationInput,
  type AutoPartsOperationResult,
} from "./st-auto-parts-high-use-corridors.ts";

export const AUTO_PARTS_DOSSIER_SCHEMA_VERSION = "auto-parts-dossier.v2";
export const AUTO_PARTS_DOSSIER_ENGINE_VERSION = "cbshub-auto-parts-dossier-1.1.0";

export type AutoPartsCoverageStatus = "supported" | "partial" | "not_supported";

export type AutoPartsDossierLine = {
  code: string;
  label: string;
  formula: string;
  basis: string;
  amountCents: number | null;
  percentageBps: number | null;
  sourceCodes: string[];
  status: "calculated" | "parameter" | "blocked";
};

export type AutoPartsDossierSnapshot = {
  schemaVersion: typeof AUTO_PARTS_DOSSIER_SCHEMA_VERSION | "auto-parts-dossier.v1";
  engineVersion: typeof AUTO_PARTS_DOSSIER_ENGINE_VERSION;
  generatedAt: string;
  title: string;
  question: string;
  scope: string;
  clientReport: {
    ready: boolean;
    label: string;
    deliveryCondition: "professional_review_required";
  };
  coverage: {
    status: AutoPartsCoverageStatus;
    label: "Suportado" | "Parcial" | "Não suportado";
    reason: string;
    representativeScope: string;
  };
  assurance: {
    level: "professional_review_required";
    factsComplete: boolean;
    ratesConfirmed: boolean;
    calculationStatus: "calculated_conditional" | "needs_information" | "not_applicable";
    reviewRequired: true;
  };
  rule: {
    code: "AUTO_PARTS_HIGH_USE_CORRIDORS";
    version: string;
    fingerprint: string;
    checkedAt: string;
    effectiveFrom: string;
    effectiveTo: string;
    scheduledTransition: null | {
      effectiveFrom: string;
      description: string;
    };
  };
  operation: {
    route: string;
    operationDate: string;
    operationCents: number;
    ownIcmsBaseCents: number;
    cest: string;
    ncm: string;
    productDescription: string;
    importedQualified: boolean;
    commercialCondition: string;
    confirmedFacts: Array<{ code: string; label: string; confirmed: boolean }>;
  };
  calculation: {
    status: "calculated_conditional" | "needs_information" | "not_applicable";
    statusLabel: string;
    calculationType: "icms_st_auto_parts" | "not_supported";
    parameters: {
      interstateRateBps: number | null;
      internalRateBps: number | null;
      fcpRateBps: number | null;
      baseReductionBps: number | null;
      baseReductionStatus: "not_applicable_confirmed" | "pending";
      mvaOriginalBps: number | null;
      mvaAppliedBps: number | null;
      mvaWasAdjusted: boolean;
    };
    totals: {
      operationCompositionCents: number;
      ownIcmsReferenceCents: number | null;
      stBaseCents: number | null;
      presumedInternalIcmsCents: number | null;
      icmsStCents: number | null;
      difalCents: null;
      fcpCents: number | null;
      destinationTotalCents: number | null;
    };
    lines: AutoPartsDossierLine[];
    blockers: string[];
    warnings: string[];
    requiredConfirmations: string[];
    disclaimer: string;
  };
  evidence: {
    sources: Array<{
      code: string;
      title: string;
      publisher: string;
      url: string;
      checkedAt: string;
      proves: string[];
    }>;
    limitations: string[];
  };
};

const statusLabels = {
  supported: "Suportado",
  partial: "Parcial",
  not_supported: "Não suportado",
} as const;

function classifyCoverage(input: AutoPartsOperationInput, result: AutoPartsOperationResult) {
  if (result.status === "calculated_reference") {
    return {
      status: "supported" as const,
      reason: "A rota, o produto representativo, a vigência, os parâmetros estaduais e os nove fatos documentais estão dentro do recorte controlado.",
    };
  }
  const route = stAutoPartsHighUseRouteByKey.get(input.route);
  const outsideControlledScope = !route
    || route.agreementStatus !== "protocol_41_active"
    || input.cest !== "01.075.00"
    || input.ncm !== "8708"
    || input.operationDate < ST_AUTO_PARTS_SUPPORTED_PERIOD.from
    || input.operationDate > ST_AUTO_PARTS_SUPPORTED_PERIOD.to
    || result.status === "st_not_applicable_after_state_exclusion";
  if (outsideControlledScope) {
    return {
      status: "not_supported" as const,
      reason: result.status === "st_not_applicable_after_state_exclusion"
        ? "A ST paulista deste recorte deixa de ser aplicável na data informada; o tratamento posterior exige outra determinação."
        : "A operação está fora do produto, rota, acordo ou período controlado por esta versão.",
    };
  }
  return {
    status: "partial" as const,
    reason: "A rota e o produto pertencem ao recorte, mas ainda faltam fatos ou parâmetros obrigatórios para liberar o valor.",
  };
}

function calculationLines(input: AutoPartsOperationInput, result: AutoPartsOperationResult): AutoPartsDossierLine[] {
  const commonSources = result.sourceCodes;
  const lines: AutoPartsDossierLine[] = [{
    code: "OPERATION-INPUT",
    label: "Base inicial da operação",
    formula: "valor documentado informado para formação da base presumida",
    basis: "Documento fiscal/comercial confirmado pelo responsável",
    amountCents: input.operationCents,
    percentageBps: null,
    sourceCodes: [],
    status: "parameter",
  }];
  if (!result.output || !result.parameters) {
    lines.push({
      code: "CALCULATION-BLOCKED",
      label: "Memória não executada",
      formula: "nenhuma fórmula final é aplicada enquanto houver bloqueios",
      basis: "Política de falha fechada do motor",
      amountCents: null,
      percentageBps: null,
      sourceCodes: commonSources,
      status: "blocked",
    });
    return lines;
  }
  const { output, parameters } = result;
  lines.push(
    {
      code: "BASE-REDUCTION",
      label: "Redução da base",
      formula: "base integral × (1 − 0%)",
      basis: "Redução, benefício e regime especial afastados pelo fato documental confirmado",
      amountCents: input.operationCents,
      percentageBps: 0,
      sourceCodes: commonSources,
      status: "parameter",
    },
    {
      code: "MVA-ADJUSTED",
      label: "MVA ajustada aplicada",
      formula: "[(1 + MVA original) × (1 − alíquota interestadual) ÷ (1 − alíquota interna)] − 1",
      basis: "MVA do acordo ou da legislação do destino, ajustada às alíquotas confirmadas",
      amountCents: null,
      percentageBps: output.mvaAppliedBps,
      sourceCodes: commonSources,
      status: "calculated",
    },
    {
      code: "ST-BASE",
      label: "Base presumida do ICMS-ST",
      formula: "base inicial × (1 + MVA ajustada)",
      basis: "Método de MVA aplicável ao recorte controlado",
      amountCents: output.stBaseCents,
      percentageBps: output.mvaAppliedBps,
      sourceCodes: commonSources,
      status: "calculated",
    },
    {
      code: "OWN-ICMS",
      label: "ICMS próprio de referência",
      formula: "base do ICMS próprio × alíquota interestadual",
      basis: parameters.interstateRateBps === 400 ? "Resolução do Senado nº 13/2012" : "Resolução do Senado nº 22/1989",
      amountCents: output.ownIcmsCents,
      percentageBps: parameters.interstateRateBps,
      sourceCodes: commonSources,
      status: "calculated",
    },
    {
      code: "PRESUMED-INTERNAL-ICMS",
      label: "ICMS interno presumido",
      formula: "base presumida × alíquota interna do destino",
      basis: "Alíquota interna oficial do destino no recorte documentado",
      amountCents: output.presumedInternalIcmsCents,
      percentageBps: parameters.internalRateBps,
      sourceCodes: commonSources,
      status: "calculated",
    },
    {
      code: "ICMS-ST",
      label: "ICMS-ST condicionado",
      formula: "ICMS interno presumido − ICMS próprio de referência",
      basis: "Regra de apuração do ICMS-ST por MVA",
      amountCents: output.icmsStCents,
      percentageBps: null,
      sourceCodes: commonSources,
      status: "calculated",
    },
    {
      code: "FCP-ST",
      label: "FCP-ST",
      formula: "base presumida × percentual de FCP do destino",
      basis: parameters.fcpRateBps ? "Percentual oficial do destino no recorte controlado" : "Sem FCP no parâmetro controlado",
      amountCents: output.fcpCents,
      percentageBps: parameters.fcpRateBps,
      sourceCodes: commonSources,
      status: "calculated",
    },
    {
      code: "DESTINATION-TOTAL",
      label: "Total destinado ao estado",
      formula: "ICMS-ST + FCP-ST",
      basis: "Resultado aritmético do motor determinístico",
      amountCents: output.destinationTotalCents,
      percentageBps: null,
      sourceCodes: commonSources,
      status: "calculated",
    },
  );
  return lines;
}

export async function createAutoPartsDossierSnapshot(
  input: AutoPartsOperationInput,
  result: AutoPartsOperationResult,
  fingerprint: string,
  generatedAt = new Date().toISOString(),
) {
  const coverage = classifyCoverage(input, result);
  const route = stAutoPartsHighUseRouteByKey.get(input.route);
  const sources = result.sourceCodes
    .map((code) => stAutoPartsHighUseSources.find((source) => source.code === code))
    .filter((source): source is NonNullable<typeof source> => Boolean(source));
  const facts = Object.entries(ST_AUTO_PARTS_OPERATION_FACT_LABELS).map(([code, label]) => ({
    code,
    label,
    confirmed: input.facts[code as keyof AutoPartsOperationInput["facts"]] === true,
  }));
  const factsComplete = facts.every((fact) => fact.confirmed);
  const calculated = result.status === "calculated_reference" && Boolean(result.output && result.parameters);
  const calculationStatus = calculated
    ? "calculated_conditional" as const
    : result.status === "st_not_applicable_after_state_exclusion"
      ? "not_applicable" as const
      : "needs_information" as const;
  const warnings = [
    "O recorte cobre exclusivamente o CEST 01.075.00 / NCM 8708 e não representa todo o segmento de autopeças.",
    "Valores são arredondados em centavos pelo motor determinístico.",
    "A memória não substitui classificação fiscal, escrituração, emissão de documento ou responsabilidade profissional.",
  ];
  if (route?.scheduledReview) warnings.push(`Revisão normativa programada em ${route.scheduledReview.effectiveFrom}: ${route.scheduledReview.reason}`);
  const snapshot: AutoPartsDossierSnapshot = {
    schemaVersion: AUTO_PARTS_DOSSIER_SCHEMA_VERSION,
    engineVersion: AUTO_PARTS_DOSSIER_ENGINE_VERSION,
    generatedAt,
    title: `Autopeças · ${input.route}`,
    question: `Qual o ICMS-ST para a operação de autopeças ${input.route} em ${input.operationDate}?`,
    scope: `AUTO_PARTS_HIGH_USE_CORRIDORS:${ST_AUTO_PARTS_HIGH_USE_CORRIDORS_VERSION}`,
    clientReport: {
      ready: true,
      label: calculated ? "Relatório técnico calculado · revisão responsável antes da entrega" : "Relatório técnico de impedimentos",
      deliveryCondition: "professional_review_required",
    },
    coverage: {
      status: coverage.status,
      label: statusLabels[coverage.status],
      reason: coverage.reason,
      representativeScope: "CEST 01.075.00 · NCM 8708 · partes e acessórios dos veículos automóveis das posições 8701 a 8705",
    },
    assurance: {
      level: "professional_review_required",
      factsComplete,
      ratesConfirmed: Boolean(result.parameters),
      calculationStatus,
      reviewRequired: true,
    },
    rule: {
      code: "AUTO_PARTS_HIGH_USE_CORRIDORS",
      version: ST_AUTO_PARTS_HIGH_USE_CORRIDORS_VERSION,
      fingerprint,
      checkedAt: ST_AUTO_PARTS_HIGH_USE_CORRIDORS_CHECKED_AT,
      effectiveFrom: ST_AUTO_PARTS_SUPPORTED_PERIOD.from,
      effectiveTo: ST_AUTO_PARTS_SUPPORTED_PERIOD.to,
      scheduledTransition: route?.scheduledReview ? {
        effectiveFrom: route.scheduledReview.effectiveFrom,
        description: route.scheduledReview.reason,
      } : input.route.endsWith("-SP") ? {
        effectiveFrom: ST_AUTO_PARTS_SP_EXCLUSION_FROM,
        description: "Exclusão paulista da ST de autopeças no recorte controlado.",
      } : null,
    },
    operation: {
      route: input.route,
      operationDate: input.operationDate,
      operationCents: input.operationCents,
      ownIcmsBaseCents: input.ownIcmsBaseCents,
      cest: input.cest,
      ncm: input.ncm,
      productDescription: result.product.description,
      importedQualified: input.importedQualified,
      commercialCondition: input.commercialCondition,
      confirmedFacts: facts,
    },
    calculation: {
      status: calculationStatus,
      statusLabel: calculated ? "Memória condicionada calculada" : result.status === "st_not_applicable_after_state_exclusion" ? "ST não aplicável neste recorte temporal" : "Cálculo bloqueado",
      calculationType: calculated ? "icms_st_auto_parts" : "not_supported",
      parameters: {
        interstateRateBps: result.parameters?.interstateRateBps ?? null,
        internalRateBps: result.parameters?.internalRateBps ?? null,
        fcpRateBps: result.parameters?.fcpRateBps ?? null,
        baseReductionBps: calculated ? 0 : null,
        baseReductionStatus: calculated ? "not_applicable_confirmed" : "pending",
        mvaOriginalBps: result.parameters?.mvaOriginalBps ?? null,
        mvaAppliedBps: result.output?.mvaAppliedBps ?? null,
        mvaWasAdjusted: calculated,
      },
      totals: {
        operationCompositionCents: input.operationCents,
        ownIcmsReferenceCents: result.output?.ownIcmsCents ?? null,
        stBaseCents: result.output?.stBaseCents ?? null,
        presumedInternalIcmsCents: result.output?.presumedInternalIcmsCents ?? null,
        icmsStCents: result.output?.icmsStCents ?? null,
        difalCents: null,
        fcpCents: result.output?.fcpCents ?? null,
        destinationTotalCents: result.output?.destinationTotalCents ?? null,
      },
      lines: calculationLines(input, result),
      blockers: [...result.blockers],
      warnings,
      requiredConfirmations: facts.filter((fact) => !fact.confirmed).map((fact) => fact.label),
      disclaimer: result.limitation,
    },
    evidence: {
      sources,
      limitations: [result.limitation, ...warnings],
    },
  };
  const serialized = JSON.stringify(snapshot);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(serialized));
  const inputHash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return { snapshot, inputHash };
}

export function isAutoPartsDossierSnapshot(value: unknown): value is AutoPartsDossierSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Partial<AutoPartsDossierSnapshot>;
  return (candidate.schemaVersion === AUTO_PARTS_DOSSIER_SCHEMA_VERSION || candidate.schemaVersion === "auto-parts-dossier.v1")
    && candidate.rule?.code === "AUTO_PARTS_HIGH_USE_CORRIDORS"
    && Array.isArray(candidate.calculation?.lines)
    && Array.isArray(candidate.evidence?.sources);
}

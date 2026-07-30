import {
  ST_COLD_BEVERAGES_SP_DESTINATION_CHECKED_AT,
  ST_COLD_BEVERAGES_SP_DESTINATION_PERIOD,
  ST_COLD_BEVERAGES_SP_DESTINATION_ROUTES,
  ST_COLD_BEVERAGES_SP_DESTINATION_VERSION,
  ST_COLD_BEVERAGES_SP_FACT_LABELS,
  stColdBeverageSpSources,
  type ColdBeverageSpOperationInput,
  type ColdBeverageSpOperationResult,
} from "./st-cold-beverages-sp-destination.ts";
import {
  ST_COLD_BEVERAGES_SP_ORIGIN_CHECKED_AT,
  ST_COLD_BEVERAGES_SP_ORIGIN_FACT_LABELS,
  ST_COLD_BEVERAGES_SP_ORIGIN_PERIOD,
  ST_COLD_BEVERAGES_SP_ORIGIN_ROUTES,
  ST_COLD_BEVERAGES_SP_ORIGIN_VERSION,
  stColdBeverageSpOriginSources,
  type ColdBeverageSpOriginOperationInput,
  type ColdBeverageSpOriginOperationResult,
} from "./st-cold-beverages-sp-origin.ts";

export const COLD_BEVERAGE_DOSSIER_SCHEMA_VERSION = "cold-beverage-dossier.v3";
export const COLD_BEVERAGE_DOSSIER_ENGINE_VERSION = "cbshub-cold-beverage-dossier-1.2.0";

export type ColdBeverageDossierScope = "sp_destination" | "sp_origin";
export type ColdBeverageCoverageStatus = "supported" | "partial" | "not_supported";
type SupportedInput = ColdBeverageSpOperationInput | ColdBeverageSpOriginOperationInput;
type SupportedResult = ColdBeverageSpOperationResult | ColdBeverageSpOriginOperationResult;

export type ColdBeverageDossierLine = {
  code: string;
  label: string;
  formula: string;
  basis: string;
  amountCents: number | null;
  percentageBps: number | null;
  sourceCodes: string[];
  status: "calculated" | "parameter" | "blocked";
};

export type ColdBeverageDossierSnapshot = {
  schemaVersion: typeof COLD_BEVERAGE_DOSSIER_SCHEMA_VERSION | "cold-beverage-dossier.v2" | "cold-beverage-dossier.v1";
  engineVersion: typeof COLD_BEVERAGE_DOSSIER_ENGINE_VERSION;
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
    status: ColdBeverageCoverageStatus;
    label: "Suportado" | "Parcial" | "Não suportado";
    reason: string;
    representativeScope: string;
  };
  assurance: {
    level: "professional_review_required";
    factsComplete: boolean;
    ratesConfirmed: boolean;
    calculationStatus: "calculated_conditional" | "needs_information";
    reviewRequired: true;
  };
  rule: {
    code: "COLD_BEVERAGES_SP_DESTINATION" | "COLD_BEVERAGES_SP_ORIGIN";
    version: string;
    fingerprint: string;
    checkedAt: string;
    effectiveFrom: string;
    effectiveTo: string;
    scheduledTransition: null;
  };
  operation: {
    route: string;
    operationDate: string;
    operationCents: number;
    ownIcmsBaseCents: number;
    quantityUnits: number;
    profileCode: string;
    productDescription: string;
    cest: string;
    ncms: readonly string[];
    legalDescription: string;
    packageType: string;
    volumeRange: string;
    commercialUnit: "individual_unit" | "integral_pack" | "not_confirmed";
    commercialUnitUnits: number | null;
    pmpfUnitCents: number | null;
    importedQualified: boolean;
    confirmedFacts: Array<{ code: string; label: string; confirmed: boolean }>;
  };
  calculation: {
    status: "calculated_conditional" | "needs_information";
    statusLabel: string;
    calculationType: "icms_st_cold_beverage_pmpf" | "not_supported";
    parameters: {
      interstateRateBps: number | null;
      internalRateBps: number | null;
      fcpRateBps: number | null;
      baseReductionBps: number | null;
      baseReductionStatus: "not_applicable_confirmed" | "pending";
      mvaOriginalBps: null;
      mvaAppliedBps: null;
      mvaWasAdjusted: false;
      pmpfUnitCents: number | null;
      pmpfLimitCents: number | null;
      pmpfLimitBps: number | null;
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
    lines: ColdBeverageDossierLine[];
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

function configuration(scope: ColdBeverageDossierScope) {
  return scope === "sp_destination" ? {
    code: "COLD_BEVERAGES_SP_DESTINATION" as const,
    version: ST_COLD_BEVERAGES_SP_DESTINATION_VERSION,
    checkedAt: ST_COLD_BEVERAGES_SP_DESTINATION_CHECKED_AT,
    period: ST_COLD_BEVERAGES_SP_DESTINATION_PERIOD,
    routes: new Set(ST_COLD_BEVERAGES_SP_DESTINATION_ROUTES.map((route) => route.route)),
    factLabels: ST_COLD_BEVERAGES_SP_FACT_LABELS,
    sources: stColdBeverageSpSources,
    scopeLabel: "Bebidas não alcoólicas com destino a São Paulo, perfil exato da Portaria SRE 27/2026 e PMPF vigente",
  } : {
    code: "COLD_BEVERAGES_SP_ORIGIN" as const,
    version: ST_COLD_BEVERAGES_SP_ORIGIN_VERSION,
    checkedAt: ST_COLD_BEVERAGES_SP_ORIGIN_CHECKED_AT,
    period: ST_COLD_BEVERAGES_SP_ORIGIN_PERIOD,
    routes: new Set(ST_COLD_BEVERAGES_SP_ORIGIN_ROUTES.map((route) => route.route)),
    factLabels: ST_COLD_BEVERAGES_SP_ORIGIN_FACT_LABELS,
    sources: stColdBeverageSpOriginSources,
    scopeLabel: "Bebidas não alcoólicas de São Paulo para MG/RJ, marca e embalagem exatas da pauta do destino",
  };
}

function classifyCoverage(
  input: SupportedInput,
  result: SupportedResult,
  config: ReturnType<typeof configuration>,
) {
  if (result.status === "calculated_reference") {
    return {
      status: "supported" as const,
      reason: "Rota, perfil, vigência, pauta, alíquotas e nove fatos documentais pertencem ao recorte controlado.",
    };
  }
  const outsideScope = !config.routes.has(input.route as never)
    || !result.profile
    || input.operationDate < config.period.from
    || input.operationDate > config.period.to;
  if (outsideScope) {
    return {
      status: "not_supported" as const,
      reason: "A operação está fora das rotas, perfis exatos ou vigência controlados por esta versão.",
    };
  }
  return {
    status: "partial" as const,
    reason: result.status === "pmpf_fallback_required"
      ? "A pauta foi legalmente afastada e o cálculo final depende da MVA/IVA-ST de fallback, ainda não liberada neste recorte."
      : "O produto e a rota pertencem ao recorte, mas faltam fatos obrigatórios para liberar o valor.",
  };
}

function calculationLines(input: SupportedInput, result: SupportedResult): ColdBeverageDossierLine[] {
  const sources = result.sourceCodes;
  const lines: ColdBeverageDossierLine[] = [
    {
      code: "PMPF-UNIT",
      label: "PMPF unitário do perfil",
      formula: "valor oficial por unidade para marca, embalagem e volume exatos",
      basis: result.profile?.legalTableItem ?? "Perfil oficial não confirmado",
      amountCents: result.profile?.pmpfCents ?? null,
      percentageBps: null,
      sourceCodes: sources,
      status: result.profile ? "parameter" : "blocked",
    },
    {
      code: "OPERATION-INPUT",
      label: "Valor documentado da operação",
      formula: "valor próprio com os componentes confirmados pelo responsável",
      basis: "NF-e e documentação comercial",
      amountCents: input.operationCents,
      percentageBps: null,
      sourceCodes: [],
      status: "parameter",
    },
  ];
  if (!result.output || !result.parameters) {
    lines.push({
      code: "CALCULATION-BLOCKED",
      label: result.status === "pmpf_fallback_required" ? "PMPF afastado" : "Memória não executada",
      formula: "nenhum valor final é exibido enquanto houver bloqueio ou faltar o método de fallback",
      basis: "Portão temporal e documental do motor",
      amountCents: null,
      percentageBps: null,
      sourceCodes: sources,
      status: "blocked",
    });
    return lines;
  }
  lines.push(
    {
      code: "BASE-REDUCTION",
      label: "Redução da base",
      formula: "PMPF integral × (1 − 0%)",
      basis: "Redução, benefício e regime especial afastados pelo fato documental confirmado",
      amountCents: result.output?.stBaseCents ?? null,
      percentageBps: result.output ? 0 : null,
      sourceCodes: sources,
      status: result.output ? "parameter" : "blocked",
    },
    {
      code: "ST-BASE",
      label: "Base presumida por PMPF",
      formula: "PMPF unitário × quantidade",
      basis: result.profile?.legalTableItem ?? "Pauta oficial do destino",
      amountCents: result.output.stBaseCents,
      percentageBps: null,
      sourceCodes: sources,
      status: "calculated",
    },
    {
      code: "OWN-ICMS",
      label: "ICMS próprio de referência",
      formula: "base do ICMS próprio × alíquota interestadual",
      basis: result.parameters.interstateRateBps === 400 ? "Resolução do Senado nº 13/2012" : "Resolução do Senado nº 22/1989",
      amountCents: result.output.ownIcmsCents,
      percentageBps: result.parameters.interstateRateBps,
      sourceCodes: sources,
      status: "calculated",
    },
    {
      code: "PRESUMED-INTERNAL-ICMS",
      label: "ICMS interno presumido",
      formula: "base PMPF × alíquota interna do destino",
      basis: "Alíquota interna confirmada para o recorte",
      amountCents: result.output.presumedInternalIcmsCents,
      percentageBps: result.parameters.internalRateBps,
      sourceCodes: sources,
      status: "calculated",
    },
    {
      code: "ICMS-ST",
      label: "ICMS-ST condicionado",
      formula: "ICMS interno presumido − ICMS próprio",
      basis: "Método de pauta do estado de destino",
      amountCents: result.output.icmsStCents,
      percentageBps: null,
      sourceCodes: sources,
      status: "calculated",
    },
    {
      code: "FCP-ST",
      label: "FCP/FEM",
      formula: "base PMPF × adicional do destino",
      basis: result.parameters.fcpRateBps ? "Adicional estadual confirmado" : "Sem adicional neste recorte",
      amountCents: result.output.fcpCents,
      percentageBps: result.parameters.fcpRateBps,
      sourceCodes: sources,
      status: "calculated",
    },
    {
      code: "DESTINATION-TOTAL",
      label: "Total destinado ao estado",
      formula: "ICMS-ST + FCP/FEM",
      basis: "Resultado aritmético determinístico",
      amountCents: result.output.destinationTotalCents,
      percentageBps: null,
      sourceCodes: sources,
      status: "calculated",
    },
  );
  return lines;
}

export async function createColdBeverageDossierSnapshot(
  scope: ColdBeverageDossierScope,
  input: SupportedInput,
  result: SupportedResult,
  fingerprint: string,
  generatedAt = new Date().toISOString(),
) {
  const config = configuration(scope);
  const coverage = classifyCoverage(input, result, config);
  const facts = Object.entries(config.factLabels).map(([code, label]) => ({
    code,
    label,
    confirmed: input.facts[code as keyof typeof input.facts] === true,
  }));
  const factsComplete = facts.every((fact) => fact.confirmed);
  const calculated = result.status === "calculated_reference" && Boolean(result.output && result.parameters);
  const calculationStatus = calculated ? "calculated_conditional" as const : "needs_information" as const;
  const warnings = [
    "A pauta vale somente para o perfil exato de marca, embalagem, volume, CEST, destino e vigência informado.",
    "Marca, embalagem ou GTIN divergente não herda o PMPF deste snapshot.",
    "A quantidade da memória representa a unidade comercial do perfil; packs são calculados e comercializados de forma integral.",
    "O fallback por MVA/IVA-ST permanece bloqueado quando a pauta é afastada.",
    "A memória não substitui classificação fiscal, escrituração, emissão de documento ou responsabilidade profissional.",
  ];
  const sourceMap = new Map(config.sources.map((source) => [source.code, source]));
  const sources = result.sourceCodes.map((code) => sourceMap.get(code)).filter((source): source is NonNullable<typeof source> => Boolean(source));
  const snapshot: ColdBeverageDossierSnapshot = {
    schemaVersion: COLD_BEVERAGE_DOSSIER_SCHEMA_VERSION,
    engineVersion: COLD_BEVERAGE_DOSSIER_ENGINE_VERSION,
    generatedAt,
    title: `Bebidas frias · ${input.route}`,
    question: `Qual o ICMS-ST para o perfil ${result.profile?.label ?? input.profileCode} na rota ${input.route} em ${input.operationDate}?`,
    scope: `${config.code}:${config.version}`,
    clientReport: {
      ready: true,
      label: calculated ? "Relatório técnico calculado · revisão responsável antes da entrega" : "Relatório técnico de impedimentos",
      deliveryCondition: "professional_review_required",
    },
    coverage: {
      status: coverage.status,
      label: statusLabels[coverage.status],
      reason: coverage.reason,
      representativeScope: config.scopeLabel,
    },
    assurance: {
      level: "professional_review_required",
      factsComplete,
      ratesConfirmed: Boolean(result.parameters),
      calculationStatus,
      reviewRequired: true,
    },
    rule: {
      code: config.code,
      version: config.version,
      fingerprint,
      checkedAt: config.checkedAt,
      effectiveFrom: config.period.from,
      effectiveTo: config.period.to,
      scheduledTransition: null,
    },
    operation: {
      route: input.route,
      operationDate: input.operationDate,
      operationCents: input.operationCents,
      ownIcmsBaseCents: input.ownIcmsBaseCents,
      quantityUnits: input.quantityUnits,
      profileCode: input.profileCode,
      productDescription: result.profile?.label ?? "Perfil não reconhecido",
      cest: result.profile?.cest ?? "não confirmado",
      ncms: result.profile?.ncms ?? [],
      legalDescription: result.profile?.legalDescription ?? "não confirmada",
      packageType: result.profile?.packageType ?? "não confirmado",
      volumeRange: result.profile?.volumeRange ?? "não confirmado",
      commercialUnit: result.profile?.commercialUnit ?? "not_confirmed",
      commercialUnitUnits: result.profile?.commercialUnitUnits ?? null,
      pmpfUnitCents: result.profile?.pmpfCents ?? null,
      importedQualified: input.importedQualified,
      confirmedFacts: facts,
    },
    calculation: {
      status: calculationStatus,
      statusLabel: calculated ? "Memória PMPF condicionada calculada" : result.status === "pmpf_fallback_required" ? "Pauta afastada · fallback ainda bloqueado" : "Cálculo bloqueado",
      calculationType: calculated ? "icms_st_cold_beverage_pmpf" : "not_supported",
      parameters: {
        interstateRateBps: result.parameters?.interstateRateBps ?? null,
        internalRateBps: result.parameters?.internalRateBps ?? null,
        fcpRateBps: result.parameters?.fcpRateBps ?? null,
        baseReductionBps: calculated ? 0 : null,
        baseReductionStatus: calculated ? "not_applicable_confirmed" : "pending",
        mvaOriginalBps: null,
        mvaAppliedBps: null,
        mvaWasAdjusted: false,
        pmpfUnitCents: result.parameters?.pmpfUnitCents ?? null,
        pmpfLimitCents: result.parameters?.pmpfLimitCents ?? null,
        pmpfLimitBps: scope === "sp_destination" ? 9_000 : result.parameters && "pmpfLimitBps" in result.parameters ? result.parameters.pmpfLimitBps : 8_000,
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

export function isColdBeverageDossierSnapshot(value: unknown): value is ColdBeverageDossierSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Partial<ColdBeverageDossierSnapshot>;
  return (candidate.schemaVersion === COLD_BEVERAGE_DOSSIER_SCHEMA_VERSION
      || candidate.schemaVersion === "cold-beverage-dossier.v2"
      || candidate.schemaVersion === "cold-beverage-dossier.v1")
    && (candidate.rule?.code === "COLD_BEVERAGES_SP_DESTINATION" || candidate.rule?.code === "COLD_BEVERAGES_SP_ORIGIN")
    && Array.isArray(candidate.calculation?.lines)
    && Array.isArray(candidate.evidence?.sources);
}

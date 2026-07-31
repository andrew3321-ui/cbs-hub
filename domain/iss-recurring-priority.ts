import {
  issDeepCityProfiles,
  type IssCoverageStatus,
} from "./iss-deep-coverage.ts";

export const ISS_RECURRING_PRIORITY_VERSION = "2026.07.31-v89";
export const ISS_RECURRING_PRIORITY_CHECKED_AT = "2026-07-31";

export const ISS_RECURRING_PRIORITY_SOURCE = {
  code: "LC-116-2003",
  title: "Lei Complementar nº 116/2003 — lista nacional do ISS",
  publisher: "Presidência da República",
  url: "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp116.htm",
  legalReference: "arts. 1º a 8º-A e lista anexa",
  checkedAt: ISS_RECURRING_PRIORITY_CHECKED_AT,
} as const;

export type IssRecurringPriorityItem = {
  lc116Item: string;
  serviceProfile: string;
  description: string;
  nationalIncidenceRule: "provider_establishment_general_rule" | "service_location_exception";
  nationalReference: string;
};

export const issRecurringPriorityItems: IssRecurringPriorityItem[] = [
  { lc116Item: "1.01", serviceProfile: "SYSTEMS_ANALYSIS", description: "Análise e desenvolvimento de sistemas", nationalIncidenceRule: "provider_establishment_general_rule", nationalReference: "LC 116/2003, lista anexa, item 1.01 e art. 3º, caput" },
  { lc116Item: "1.05", serviceProfile: "SOFTWARE_LICENSING", description: "Licenciamento ou cessão de direito de uso de programas de computação", nationalIncidenceRule: "provider_establishment_general_rule", nationalReference: "LC 116/2003, lista anexa, item 1.05 e art. 3º, caput" },
  { lc116Item: "4.01", serviceProfile: "MEDICINE_BIOMEDICINE", description: "Medicina e biomedicina", nationalIncidenceRule: "provider_establishment_general_rule", nationalReference: "LC 116/2003, lista anexa, item 4.01 e art. 3º, caput" },
  { lc116Item: "4.03", serviceProfile: "HOSPITAL_CLINIC_LAB", description: "Hospitais, clínicas e laboratórios", nationalIncidenceRule: "provider_establishment_general_rule", nationalReference: "LC 116/2003, lista anexa, item 4.03 e art. 3º, caput" },
  { lc116Item: "7.02", serviceProfile: "CIVIL_CONSTRUCTION", description: "Execução de obras de construção civil", nationalIncidenceRule: "service_location_exception", nationalReference: "LC 116/2003, art. 3º, III e lista anexa, item 7.02" },
  { lc116Item: "7.05", serviceProfile: "BUILDING_REPAIR", description: "Reparação, conservação e reforma de edifícios", nationalIncidenceRule: "service_location_exception", nationalReference: "LC 116/2003, art. 3º, III e lista anexa, item 7.05" },
  { lc116Item: "10.05", serviceProfile: "GOODS_INTERMEDIATION", description: "Agenciamento ou intermediação de bens móveis ou imóveis", nationalIncidenceRule: "provider_establishment_general_rule", nationalReference: "LC 116/2003, lista anexa, item 10.05 e art. 3º, caput" },
  { lc116Item: "11.02", serviceProfile: "SECURITY_SURVEILLANCE", description: "Vigilância, segurança ou monitoramento", nationalIncidenceRule: "service_location_exception", nationalReference: "LC 116/2003, art. 3º, XVI e lista anexa, item 11.02" },
  { lc116Item: "14.01", serviceProfile: "GOODS_MAINTENANCE", description: "Lubrificação, limpeza, revisão e manutenção de máquinas e bens", nationalIncidenceRule: "provider_establishment_general_rule", nationalReference: "LC 116/2003, lista anexa, item 14.01 e art. 3º, caput" },
  { lc116Item: "16.01", serviceProfile: "MUNICIPAL_TRANSPORT", description: "Serviços de transporte coletivo municipal", nationalIncidenceRule: "service_location_exception", nationalReference: "LC 116/2003, art. 3º, XIX e lista anexa, item 16.01" },
  { lc116Item: "17.06", serviceProfile: "ADVERTISING", description: "Propaganda e publicidade", nationalIncidenceRule: "provider_establishment_general_rule", nationalReference: "LC 116/2003, lista anexa, item 17.06 e art. 3º, caput" },
  { lc116Item: "17.19", serviceProfile: "ACCOUNTING", description: "Contabilidade, inclusive serviços técnicos e auxiliares", nationalIncidenceRule: "provider_establishment_general_rule", nationalReference: "LC 116/2003, lista anexa, item 17.19 e art. 3º, caput" },
];

export const issRecurringPriorityMunicipalities = issDeepCityProfiles.slice(0, 15).map((profile, index) => ({
  rank: index + 1,
  profileCode: profile.code,
  ibgeCode: profile.ibgeCode,
  city: profile.city,
  uf: profile.uf,
  sourceCodes: [...profile.sourceCodes],
}));

export type IssRecurringPriorityCell = {
  code: string;
  profileCode: string;
  ibgeCode: string;
  city: string;
  uf: string;
  lc116Item: string;
  serviceProfile: string;
  description: string;
  coverageStatus: IssCoverageStatus;
  municipalClassifier: {
    status: "municipal_item_mapped_subactivity_pending";
    municipalItemCode: string;
    subactivityCode: null;
    evidenceReference: string;
  };
  rate: { status: "pending_exact_municipal_rule"; bps: null; legalRangeBps: [200, 500] };
  effectiveFrom: null;
  effectiveTo: null;
  incidence: { status: "national_rule_mapped_municipal_confirmation_required"; nationalRule: IssRecurringPriorityItem["nationalIncidenceRule"]; reference: string };
  withholding: { status: "requires_operation_and_municipal_facts"; responsible: null };
  sourceCodes: string[];
  checkedAt: string;
  version: string;
  calculationSupported: false;
  blockers: string[];
};

const recurringBlockers = [
  "subatividade e código municipal exatos",
  "alíquota municipal exata para o serviço representativo",
  "vigência da tabela ou regra municipal",
  "município de incidência confirmado pelos fatos",
  "tomador e hipótese municipal de retenção",
  "benefício, regime especial e sociedade profissional afastados",
];

export const issRecurringPriorityCells: IssRecurringPriorityCell[] = issRecurringPriorityMunicipalities.flatMap((municipality) =>
  issRecurringPriorityItems.map((item) => ({
    code: `ISS-REC-${municipality.ibgeCode}-${item.lc116Item}`,
    profileCode: municipality.profileCode,
    ibgeCode: municipality.ibgeCode,
    city: municipality.city,
    uf: municipality.uf,
    lc116Item: item.lc116Item,
    serviceProfile: item.serviceProfile,
    description: item.description,
    coverageStatus: "partial",
    municipalClassifier: {
      status: "municipal_item_mapped_subactivity_pending",
      municipalItemCode: item.lc116Item,
      subactivityCode: null,
      evidenceReference: `Lista de serviços da legislação municipal vinculada ao dossiê; item ${item.lc116Item}.`,
    },
    rate: { status: "pending_exact_municipal_rule", bps: null, legalRangeBps: [200, 500] },
    effectiveFrom: null,
    effectiveTo: null,
    incidence: { status: "national_rule_mapped_municipal_confirmation_required", nationalRule: item.nationalIncidenceRule, reference: item.nationalReference },
    withholding: { status: "requires_operation_and_municipal_facts", responsible: null },
    sourceCodes: [ISS_RECURRING_PRIORITY_SOURCE.code, ...municipality.sourceCodes],
    checkedAt: ISS_RECURRING_PRIORITY_CHECKED_AT,
    version: ISS_RECURRING_PRIORITY_VERSION,
    calculationSupported: false,
    blockers: [...recurringBlockers],
  })),
);

export type IssRecurringPriorityReferenceCase = {
  code: string;
  kind: "catalog_baseline" | "service_mismatch" | "municipality_mismatch" | "recipient_mismatch" | "withholding_unknown" | "date_missing";
  cellCode: string | null;
  expectedStatus: "blocked" | "not_supported";
  blockers: string[];
};

const baselineCases: IssRecurringPriorityReferenceCase[] = issRecurringPriorityCells.map((cell) => ({
  code: `${cell.code}-BASELINE`,
  kind: "catalog_baseline",
  cellCode: cell.code,
  expectedStatus: "blocked",
  blockers: [...cell.blockers],
}));

const mutationKinds = ["service_mismatch", "municipality_mismatch", "recipient_mismatch", "withholding_unknown", "date_missing"] as const;
const mutationCases: IssRecurringPriorityReferenceCase[] = issRecurringPriorityMunicipalities.flatMap((municipality) =>
  mutationKinds.map((kind) => ({
    code: `ISS-REC-${municipality.ibgeCode}-${kind.toUpperCase()}`,
    kind,
    cellCode: kind === "service_mismatch" || kind === "municipality_mismatch" ? null : `ISS-REC-${municipality.ibgeCode}-1.01`,
    expectedStatus: kind === "service_mismatch" || kind === "municipality_mismatch" ? "not_supported" : "blocked",
    blockers: kind === "service_mismatch"
      ? ["item de serviço incluído no recorte prioritário"]
      : kind === "municipality_mismatch"
        ? ["município incluído no recorte prioritário"]
        : kind === "recipient_mismatch"
          ? ["tomador e relação territorial confirmados"]
          : kind === "withholding_unknown"
            ? ["responsável tributário municipal confirmado"]
            : ["data do fato gerador e vigência municipal"],
  })),
);

export const issRecurringPriorityReferenceCases = [...baselineCases, ...mutationCases];

export function issRecurringPriorityMetrics() {
  return {
    municipalities: issRecurringPriorityMunicipalities.length,
    serviceItems: issRecurringPriorityItems.length,
    auditedCells: issRecurringPriorityCells.length,
    supportedCells: issRecurringPriorityCells.filter((cell) => cell.coverageStatus === "supported" && cell.calculationSupported).length,
    partialCells: issRecurringPriorityCells.filter((cell) => cell.coverageStatus === "partial").length,
    notSupportedCells: issRecurringPriorityCells.filter((cell) => cell.coverageStatus === "not_supported").length,
    deterministicCases: issRecurringPriorityReferenceCases.length,
    calculatedMemories: 0,
    safelyBlockedCases: issRecurringPriorityReferenceCases.length,
  };
}

export function validateIssRecurringPriority() {
  const errors: string[] = [];
  if (issRecurringPriorityMunicipalities.length !== 15) errors.push("expected_15_priority_municipalities");
  if (issRecurringPriorityItems.length !== 12) errors.push("expected_12_priority_items");
  if (issRecurringPriorityCells.length !== 180) errors.push("expected_180_audited_cells");
  if (new Set(issRecurringPriorityCells.map((cell) => cell.code)).size !== issRecurringPriorityCells.length) errors.push("duplicate_priority_cell");
  for (const cell of issRecurringPriorityCells) {
    if (cell.sourceCodes.length < 2) errors.push(`${cell.code}:official_source_missing`);
    if (cell.municipalClassifier.municipalItemCode !== cell.lc116Item || cell.municipalClassifier.evidenceReference.length < 30) errors.push(`${cell.code}:municipal_item_not_mapped`);
    if (cell.calculationSupported || cell.rate.bps !== null || cell.municipalClassifier.subactivityCode !== null) errors.push(`${cell.code}:unproved_rule_released`);
    if (cell.blockers.length < 6) errors.push(`${cell.code}:transparent_blockers_missing`);
  }
  if (new Set(issRecurringPriorityReferenceCases.map((reference) => reference.code)).size !== issRecurringPriorityReferenceCases.length) errors.push("duplicate_reference_case");
  if (issRecurringPriorityReferenceCases.some((reference) => !reference.blockers.length)) errors.push("unsafe_reference_case");
  return { passed: errors.length === 0, errors };
}

export async function hashIssRecurringPriority() {
  const payload = JSON.stringify({
    version: ISS_RECURRING_PRIORITY_VERSION,
    checkedAt: ISS_RECURRING_PRIORITY_CHECKED_AT,
    source: ISS_RECURRING_PRIORITY_SOURCE,
    items: issRecurringPriorityItems,
    municipalities: issRecurringPriorityMunicipalities,
    cells: issRecurringPriorityCells,
    referenceCases: issRecurringPriorityReferenceCases,
  });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Status = "supported" | "partial" | "not_supported";
type StateRow = { uf: string; name: string; region: string; status: Status; officialPortal: string; supported: string[]; blockers: string[] };
type CityRow = { ibgeCode: string; city: string; uf: string; status: Status; rangeBps: [number, number]; depth: "structured" | "catalogued"; officialSourceCodes: string[]; structuredAt: string | null; supported: string[]; blockers: string[] };
type Segment = { code: string; name: string; status: Status; routes: string[]; supported: string[]; blockers: string[] };
type StSpMgPackage = { segmentCode: string; segmentName: string; route: "SP-MG"; mgChapter: string; mgChapterTitle: string; sourceUrl: string; sourceTitle: string; checkedAt: string; legalStatus: "calculation_validated" | "legal_gate_structured"; calculationMethod: "mva" | "pmpf_or_mva" | "special_regime" | "depends_on_product"; mandatoryFacts: string[]; representativeRule: null | { cest: string; ncm: string; description: string; mvaOriginalBps: number; agreementCode: string; effectiveFrom: string; sourceExcerpt: string }; blockers: string[] };
type StSpOriginMatrix = { version: string; fingerprint: string; validation: { passed: boolean; errors: string[] }; metrics: { destinations: number; segments: number; structuredCells: number; existingValidatedReferences: number; calculationsBlocked: number; mandatoryFacts: number }; mandatoryFacts: string[]; destinations: Array<{ uf: string; name: string; officialPortal: string; sourceCode: string }>; cells: Array<{ key: string; destination: string; segmentCode: string; status: "structured_blocked" | "existing_validated_reference" }>; policy: string };
type StRepresentativeProduct = { code: string; segmentCode: string; description: string; cest: string; ncm: string[]; warning: string };
type StCalculationValidation = { version: string; fingerprint: string; validation: { passed: boolean; errors: string[] }; metrics: { totalRuns: number; referenceReproduced: number; safelyBlocked: number; failed: number; representativeProducts: number; cementAgreementScoped: number; cementFixedMvaSourced: number; cementDestinationLawMvaPending: number; cementOutsideProtocol: number; cementPriorityStates: number; cementStateSources: number; cementAdjustedMvaTables: number; cementSyntheticReferences: number; autoPartsPriorityRoutes: number; autoPartsActiveAgreementRoutes: number; autoPartsOutsideProtocolRoutes: number; autoPartsSyntheticReferences: number }; runs: Array<{ key: string; productCode: string; status: "reference_reproduced" | "blocked_missing_legal_parameters" | "blocked_missing_destination_parameters" | "blocked_protocol_not_applicable"; missingLegalInputs: string[]; output: null | { destinationTotalCents: number } }>; policy: string };
type StCementSpRoute = { key: string; destination: string; destinationName: string; legalStatus: "agreement_mva_structured" | "agreement_structured_destination_mva_pending" | "not_signatory_to_protocol_11_85"; mvaOriginalBps: number | null; mvaSource: "protocol_fixed_20_percent" | "destination_internal_law_required" | "not_applicable"; calculationStatus: "blocked_destination_parameters" | "blocked_protocol_not_applicable"; missingLegalInputs: string[] };
type StCementSpRoutes = { version: string; fingerprint: string; validation: { passed: boolean; errors: string[] }; metrics: { destinations: number; signatoryRoutes: number; fixedMvaRoutes: number; destinationLawMvaRoutes: number; nonSignatoryRoutes: number; newlyReleasedCalculations: number }; sources: Array<{ title: string; publisher: string; url: string }>; routes: StCementSpRoute[]; policy: string };
type StCementPriorityState = { destination: "RJ" | "ES" | "BA" | "GO" | "MS"; route: string; legalStatus: "synthetic_reference_reproduced" | "state_parameters_structured" | "pmpf_gate_structured"; productScope: string; productExclusions: string[]; mvaOriginalBps: number; publishedAdjustedMvaBpsFor12: number; calculationMethod: "mva_adjusted" | "pmpf_by_gtin_or_mva_fallback"; sourceCodes: string[]; remainingBlockers: string[]; syntheticReference: null | { destinationTotalCents: number } };
type StCementPriorityBatch = { version: string; fingerprint: string; validation: { passed: boolean; errors: string[] }; metrics: { statesInBatch: number; officialStateSources: number; adjustedMvaTablesSourced: number; productExceptionsStructured: number; pmpfGatesStructured: number; syntheticReferencesReproduced: number }; sources: Array<{ code: string; title: string; publisher: string; url: string }>; states: StCementPriorityState[]; policy: string };
type StAutoPartsPriorityRoute = { destination: string; route: string; agreementStatus: "protocol_41_active" | "outside_protocol_41"; agreementReason: string; parameterMethod: "protocol_mva" | "destination_internal_mva" | "destination_own_treatment_required"; mvaOriginalBps: number | null; adjustedMvaBpsFor12: number | null; sourceCodes: string[]; remainingBlockers: string[]; syntheticReference: null | { destinationTotalCents: number } };
type StAutoPartsPriorityBatch = { version: string; fingerprint: string; validation: { passed: boolean; errors: string[] }; metrics: { routesInBatch: number; activeAgreementRoutes: number; outsideProtocolRoutes: number; destinationMvaOverrides: number; productIdentitiesFrozen: number; syntheticReferencesReproduced: number; officialSources: number }; sources: Array<{ code: string; title: string; publisher: string; url: string }>; routes: StAutoPartsPriorityRoute[]; policy: string };
type AutoPartsFactKey = "productIdentityConfirmed" | "automotiveUseConfirmed" | "destinationInternalStConfirmed" | "taxpayerRolesConfirmed" | "noSpecialTreatmentConfirmed" | "priceBasisConfirmed" | "noSpecificRateExceptionConfirmed" | "documentsConfirmed";
type AutoPartsResult = { status: "calculated_reference" | "blocked" | "st_not_applicable_after_state_exclusion"; route: string; operationDate: string; missingFacts: string[]; blockers: string[]; parameters: null | { commercialCondition: "fidelity" | "standard"; importedQualified: boolean; mvaOriginalBps: number; interstateRateBps: number; internalRateBps: number; fcpRateBps: number }; output: null | { mvaAppliedBps: number; stBaseCents: number; ownIcmsCents: number; presumedInternalIcmsCents: number; icmsStCents: number; fcpCents: number; destinationTotalCents: number }; limitation: string };
type StAutoPartsHighUseRoute = { corridorRank: number; direction: "outbound" | "return"; origin: string; destination: string; route: string; agreementStatus: "protocol_41_active" | "outside_protocol_41"; agreementReason: string; directionalSymmetryAssumed: false; parameterMethod: "protocol_mva" | "destination_internal_mva" | "destination_own_treatment_required"; mvaOriginalBps: number | null; adjustedMvaBpsFor12: number | null; calculationStatus: "synthetic_reference_reproduced" | "blocked_destination_parameters" | "blocked_protocol_not_applicable"; sourceCodes: string[]; remainingBlockers: string[]; scheduledReview: null | { effectiveFrom: string; reason: string; sourceCode: string }; syntheticReference: null | { destinationTotalCents: number } };
type StAutoPartsHighUseCorridors = { version: string; fingerprint: string; validation: { passed: boolean; errors: string[] }; metrics: { corridors: number; directedRoutes: number; activeAgreementRoutes: number; outsideProtocolRoutes: number; protocolMvaRoutes: number; destinationMvaRoutes: number; syntheticReferencesReproduced: number; safelyBlocked: number; scheduledLegalReviews: number; officialSources: number }; supportedPeriod: { from: string; to: string }; spExclusionFrom: string; operationFactLabels: Record<AutoPartsFactKey, string>; sources: Array<{ code: string; title: string; publisher: string; url: string }>; routes: StAutoPartsHighUseRoute[]; policy: string };
type ColdBeverageFactKey = "productIdentityConfirmed" | "taxpayerOperationConfirmed" | "responsiblePartyConfirmed" | "noProtocolExceptionConfirmed" | "destinationInternalTreatmentConfirmed" | "officialPriceMethodConfirmed" | "stateRatesConfirmed" | "documentsConfirmed";
type ColdBeverageProductCode = "SOFT_DRINK_PET" | "SOFT_DRINK_CAN" | "ENERGY_CAN" | "ENERGY_PET" | "ISOTONIC" | "WATER_GLASS";
type ColdBeverageProduct = { code: ColdBeverageProductCode; label: string; cest: string; ncms: readonly string[]; family: string };
type ColdBeverageRoute = { corridorRank: number; direction: "outbound" | "return"; origin: string; destination: string; route: string; priorityBasis: "internal_operational_heuristic"; directionalSymmetryAssumed: false; pricingGate: "official_price_first_then_destination_mva" | "official_price_first_then_protocol_mva"; sourceCodes: string[] };
type ColdBeverageApplicability = { route: string; productCode: ColdBeverageProductCode; status: "protocol_scoped_parameters_pending" | "protocol_not_applicable"; reason: string; effectiveExceptionFrom: string | null; pricingGate: ColdBeverageRoute["pricingGate"] };
type ColdBeverageResult = { status: "scoped_parameters_pending" | "protocol_not_applicable" | "blocked"; route: string; operationDate: string; product: ColdBeverageProduct | null; pricingGate: ColdBeverageRoute["pricingGate"] | null; missingFacts: string[]; blockers: string[]; nextChecks: string[]; sourceCodes: string[]; output: null; limitation: string };
type StColdBeveragesPriority = { version: string; fingerprint: string; validation: { passed: boolean; errors: string[] }; metrics: { corridors: number; directedRoutes: number; productIdentities: number; productRouteCells: number; protocolScopedCells: number; explicitExceptionCells: number; finalCalculationsReleased: number; officialSources: number }; supportedPeriod: { from: string; to: string }; spWaterExclusionFrom: string; operationFactLabels: Record<ColdBeverageFactKey, string>; products: ColdBeverageProduct[]; sources: Array<{ code: string; title: string; publisher: string; url: string }>; routes: ColdBeverageRoute[]; applicability: ColdBeverageApplicability[]; policy: string };
type ColdBeverageSpFactKey = "exactProfileConfirmed" | "unlistedBrandEligibilityConfirmed" | "normalTaxRegimeConfirmed" | "taxpayerResaleOperationConfirmed" | "substituteResponsibilityConfirmed" | "noProtocolExceptionConfirmed" | "ownTaxBaseConfirmed" | "noSpecialTreatmentConfirmed" | "documentsConfirmed";
type ColdBeverageSpProfileCode = "UNLISTED_SOFT_DRINK_PET_1751_2000" | "UNLISTED_SOFT_DRINK_CAN_311_360" | "UNLISTED_ENERGY_CAN_311_360" | "UNLISTED_ENERGY_PET_ABOVE_1500" | "UNLISTED_ISOTONIC_PET_401_660";
type ColdBeverageSpProfile = { code: ColdBeverageSpProfileCode; productCode: Exclude<ColdBeverageProductCode, "WATER_GLASS">; label: string; cest: string; brandRule: "demais_marcas_nao_listadas"; packageType: "PET" | "LATA"; volumeRange: string; pmpfCents: number; legalTableItem: string; effectiveFrom: string; effectiveTo: string };
type ColdBeverageSpResult = { status: "calculated_reference" | "pmpf_fallback_required" | "blocked"; route: string; operationDate: string; profile: ColdBeverageSpProfile | null; missingFacts: string[]; blockers: string[]; parameters: null | { quantityUnits: number; pmpfUnitCents: number; pmpfLimitCents: number; interstateRateBps: number; internalRateBps: number; fcpRateBps: number; importedQualified: boolean }; output: null | { stBaseCents: number; ownIcmsCents: number; presumedInternalIcmsCents: number; icmsStCents: number; fcpCents: number; destinationTotalCents: number }; sourceCodes: string[]; limitation: string };
type StColdBeveragesSpDestination = { version: string; fingerprint: string; validation: { passed: boolean; errors: string[] }; metrics: { inboundRoutes: number; exactPmpfProfiles: number; controlledCells: number; reproducedMemories: number; safeFailures: number; officialSources: number }; supportedPeriod: { from: string; to: string }; factLabels: Record<ColdBeverageSpFactKey, string>; routes: Array<{ corridorRank: number; origin: string; destination: "SP"; route: string; agreement: "protocol_11_1991"; domesticInterstateRateBps: 1200; importedQualifiedRateBps: 400; directionalSymmetryAssumed: false }>; profiles: ColdBeverageSpProfile[]; runs: Array<{ key: string; route: string; profileCode: ColdBeverageSpProfileCode; status: "calculated_reference" | "pmpf_fallback_required" | "blocked" }>; sources: Array<{ code: string; title: string; publisher: string; url: string }>; policy: string };
type Scenario = { code: string; tax: string; title: string; status: Status; supported: string[]; blockers: string[] };
type IssTechnicalReview = { status: "passed"; reviewerKind: "platform_technical_review"; reviewedAt: string; sourceCatalogReview: "reviewed"; rateReferenceStatus: "located_for_mapping" | "pending_exact_table"; passedChecks: string[]; professionalReview: "pending"; taxHomologation: "pending"; limitation: string };
type IssDeepProfile = { code: string; ibgeCode: string; city: string; uf: string; stage: "structured"; sourceCodes: string[]; supportedOutputs: string[]; hardStops: string[]; technicalReview: IssTechnicalReview; placeOfIncidence: { generalRule: string; requiredFacts: string[] }; withholding: { conclusion: "requires_facts"; requiredFacts: string[] } };
type IssDeepSource = { code: string; title: string; publisher: string; url: string; checkedAt: string; kind: "municipal_law" | "rate_table" | "operational_guidance" };
type IssTechnicalEvidence = IssTechnicalReview & { profileCode: string; ibgeCode: string; evidenceHash: string };
type AutomaticAssurance = { version: string; checkedAt: string; fingerprint?: string; status: "automatically_verified" | "blocked"; professionalOpinion: false; humanReviewRequired: false; statement: string; metrics: { modules: number; modulesPassed: number; totalRuns: number; referenceReproduced: number; safelyBlocked: number; failed: number }; modules: Array<{ code: string; label: string; passed: boolean; errors: string[] }>; errors: string[] };
type Coverage = { version: string; checkedAt: string; fingerprint: string; automaticAssurance?: AutomaticAssurance; metrics: { states: number; cities: number; deepIssCities: number; stSegments: number; recurringScenarios: number; supported: number; partial: number; notSupported: number; sourceCount: number }; states: StateRow[]; cities: CityRow[]; issDeep: { metrics: { structuredCities: number; officialSources: number; sourceCatalogReviewedCities: number; technicalGateValidatedCities: number; rateReferenceLocatedCities: number; testedCities: number; professionallyApprovedCities: number; automaticHomologation: false }; profiles: IssDeepProfile[]; sources: IssDeepSource[]; technicalEvidence: IssTechnicalEvidence[]; policy: string }; stSegments: Segment[]; stSpMg: { version: string; fingerprint: string; validation: { passed: boolean; errors: string[] }; metrics: { totalSegments: number; legalGatesStructured: number; calculationsValidated: number; calculationsBlocked: number; officialSources: number }; packages: StSpMgPackage[]; policy: string }; stSpOriginMatrix: StSpOriginMatrix; stRepresentativeProducts: { version: string; fingerprint: string; validation: { passed: boolean; errors: string[] }; source: { title: string; url: string }; products: StRepresentativeProduct[]; policy: string }; stSpCalculationValidation: StCalculationValidation; stCementSpRoutes: StCementSpRoutes; stCementPriorityBatch: StCementPriorityBatch; stAutoPartsPriorityBatch: StAutoPartsPriorityBatch; stAutoPartsHighUseCorridors: StAutoPartsHighUseCorridors; stColdBeveragesPriority: StColdBeveragesPriority; stColdBeveragesSpDestination: StColdBeveragesSpDestination; recurringScenarios: Scenario[]; sources: Array<{ code: string; title: string; publisher: string; url: string }> };
type Governance = { identity: { ruleCode: string; ruleVersion: string; ruleHash: string }; automaticAssurance: AutomaticAssurance; approval: null | { reviewerName: string; professionalRole: string; professionalRegistration: string; decidedAt: string; verified: boolean }; executionEnabled: boolean; professionalApprovalVerified: boolean; professionalApprovalRequiredForReferences: false; canApprove: boolean; error?: string };
type Monitor = { checkedAt: string; previousCheckedAt: string | null; rotation: { offset: number; totalSources: number; cycleDays: number }; metrics: { monitored: number; checkedToday: number; checked: number; unavailable: number; changeSignals: number }; sources: Array<{ code: string; title: string; url: string; status: "checked" | "unavailable"; changed: boolean; lastModified: string | null }>; policy: string; error?: string };
type BatchResult = { batchId: string; metrics: { total: number; accepted: number; warning: number; blocked: number }; items: Array<{ filename: string; documentType: string; status: "accepted" | "warning" | "blocked"; sourceHash: string; issues: string[]; summary: Record<string, string | number | boolean | null> }>; message: string; error?: string };

const statusLabel: Record<Status, string> = { supported: "Suportado", partial: "Parcial", not_supported: "Não suportado" };
const tabs = ["panorama", "icms", "iss", "federal", "documents", "governance"] as const;
type Tab = typeof tabs[number];

async function json<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const payload = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Não foi possível concluir a operação.");
  return payload;
}

function StatusPill({ status }: { status: Status }) {
  return <span className={`coverage-status ${status}`}><i />{statusLabel[status]}</span>;
}

function compatibleAutomaticAssurance(coverage: Coverage): AutomaticAssurance {
  if (coverage.automaticAssurance) return coverage.automaticAssurance;
  const validations = [coverage.stSpMg.validation, coverage.stSpOriginMatrix.validation, coverage.stRepresentativeProducts.validation, coverage.stSpCalculationValidation.validation, coverage.stCementSpRoutes.validation, coverage.stCementPriorityBatch.validation, coverage.stAutoPartsPriorityBatch.validation, coverage.stAutoPartsHighUseCorridors.validation, coverage.stColdBeveragesPriority.validation, coverage.stColdBeveragesSpDestination.validation];
  const passed = validations.every((validation) => validation.passed) && coverage.stSpCalculationValidation.metrics.failed === 0;
  return {
    version: coverage.version,
    checkedAt: coverage.checkedAt,
    fingerprint: coverage.stSpCalculationValidation.fingerprint,
    status: passed ? "automatically_verified" : "blocked",
    professionalOpinion: false,
    humanReviewRequired: false,
    statement: "Compatibilidade temporária calculada a partir das validações versionadas recebidas da API.",
    metrics: {
      modules: validations.length,
      modulesPassed: validations.filter((validation) => validation.passed).length,
      totalRuns: coverage.stSpCalculationValidation.metrics.totalRuns,
      referenceReproduced: coverage.stSpCalculationValidation.metrics.referenceReproduced,
      safelyBlocked: coverage.stSpCalculationValidation.metrics.safelyBlocked,
      failed: coverage.stSpCalculationValidation.metrics.failed,
    },
    modules: [],
    errors: validations.flatMap((validation) => validation.errors),
  };
}

export default function NationalCoverageCenter() {
  const [coverage, setCoverage] = useState<Coverage | null>(null);
  const [governance, setGovernance] = useState<Governance | null>(null);
  const [monitor, setMonitor] = useState<Monitor | null>(null);
  const [tab, setTab] = useState<Tab>("panorama");
  const [cityQuery, setCityQuery] = useState("");
  const [origin, setOrigin] = useState("SP");
  const [destination, setDestination] = useState("MG");
  const [importedQualified, setImportedQualified] = useState(false);
  const [icmsResult, setIcmsResult] = useState<{ rateBps: number | null; reason: string } | null>(null);
  const [autoPartsRoute, setAutoPartsRoute] = useState("SP-MG");
  const [autoPartsDate, setAutoPartsDate] = useState("");
  const [autoPartsValue, setAutoPartsValue] = useState("1000.00");
  const [autoPartsOwnBase, setAutoPartsOwnBase] = useState("1000.00");
  const [autoPartsCondition, setAutoPartsCondition] = useState<"" | "fidelity" | "standard">("");
  const [autoPartsImported, setAutoPartsImported] = useState(false);
  const [autoPartsFacts, setAutoPartsFacts] = useState<Record<AutoPartsFactKey, boolean>>({ productIdentityConfirmed: false, automotiveUseConfirmed: false, destinationInternalStConfirmed: false, taxpayerRolesConfirmed: false, noSpecialTreatmentConfirmed: false, priceBasisConfirmed: false, noSpecificRateExceptionConfirmed: false, documentsConfirmed: false });
  const [autoPartsResult, setAutoPartsResult] = useState<AutoPartsResult | null>(null);
  const [beverageRoute, setBeverageRoute] = useState("SP-MG");
  const [beverageDate, setBeverageDate] = useState("2026-07-22");
  const [beverageProduct, setBeverageProduct] = useState<ColdBeverageProductCode>("SOFT_DRINK_PET");
  const [beverageFacts, setBeverageFacts] = useState<Record<ColdBeverageFactKey, boolean>>({ productIdentityConfirmed: false, taxpayerOperationConfirmed: false, responsiblePartyConfirmed: false, noProtocolExceptionConfirmed: false, destinationInternalTreatmentConfirmed: false, officialPriceMethodConfirmed: false, stateRatesConfirmed: false, documentsConfirmed: false });
  const [beverageResult, setBeverageResult] = useState<ColdBeverageResult | null>(null);
  const [beverageSpRoute, setBeverageSpRoute] = useState("MG-SP");
  const [beverageSpProfile, setBeverageSpProfile] = useState<ColdBeverageSpProfileCode>("UNLISTED_SOFT_DRINK_PET_1751_2000");
  const [beverageSpDate, setBeverageSpDate] = useState("2026-07-25");
  const [beverageSpQuantity, setBeverageSpQuantity] = useState("100");
  const [beverageSpOperationValue, setBeverageSpOperationValue] = useState("563.40");
  const [beverageSpOwnBase, setBeverageSpOwnBase] = useState("563.40");
  const [beverageSpImported, setBeverageSpImported] = useState(false);
  const [beverageSpFacts, setBeverageSpFacts] = useState<Record<ColdBeverageSpFactKey, boolean>>({ exactProfileConfirmed: false, unlistedBrandEligibilityConfirmed: false, normalTaxRegimeConfirmed: false, taxpayerResaleOperationConfirmed: false, substituteResponsibilityConfirmed: false, noProtocolExceptionConfirmed: false, ownTaxBaseConfirmed: false, noSpecialTreatmentConfirmed: false, documentsConfirmed: false });
  const [beverageSpResult, setBeverageSpResult] = useState<ColdBeverageSpResult | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [batch, setBatch] = useState<BatchResult | null>(null);

  useEffect(() => {
    void Promise.all([
      json<Coverage>("/api/public/coverage?schema=automatic-assurance-v1", { cache: "no-store" }).then(setCoverage),
      json<Governance>("/api/rule-governance").then(setGovernance),
      json<Monitor>("/api/normative-monitor").then(setMonitor),
    ]).catch((cause: Error) => setError(cause.message));
  }, []);

  const cities = useMemo(() => coverage?.cities.filter((item) => `${item.city} ${item.uf}`.toLocaleLowerCase("pt-BR").includes(cityQuery.toLocaleLowerCase("pt-BR"))) ?? [], [coverage, cityQuery]);
  const issDeepProfiles = useMemo(() => new Map(coverage?.issDeep.profiles.map((item) => [item.ibgeCode, item]) ?? []), [coverage]);
  const issDeepSources = useMemo(() => new Map(coverage?.issDeep.sources.map((item) => [item.code, item]) ?? []), [coverage]);
  const issTechnicalEvidence = useMemo(() => new Map(coverage?.issDeep.technicalEvidence.map((item) => [item.ibgeCode, item]) ?? []), [coverage]);
  const stSpMgPackages = useMemo(() => new Map(coverage?.stSpMg.packages.map((item) => [item.segmentCode, item]) ?? []), [coverage]);
  const spOriginReferenceCount = useMemo(() => new Map(coverage?.stSpOriginMatrix.destinations.map((destination) => [destination.uf, coverage.stSpOriginMatrix.cells.filter((cell) => cell.destination === destination.uf && cell.status === "existing_validated_reference").length]) ?? []), [coverage]);

  const calculateIcms = async (event: FormEvent) => {
    event.preventDefault(); setBusy("icms"); setError(""); setIcmsResult(null);
    try {
      const payload = await json<{ result: { rateBps: number | null; reason: string } }>("/api/national-coverage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ origin, destination, importedQualified }) });
      setIcmsResult(payload.result);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Cálculo bloqueado."); }
    finally { setBusy(""); }
  };

  const calculateAutoParts = async (event: FormEvent) => {
    event.preventDefault(); setBusy("auto-parts"); setError(""); setAutoPartsResult(null);
    const operationCents = Math.round(Number(autoPartsValue.replace(",", ".")) * 100);
    const ownIcmsBaseCents = Math.round(Number(autoPartsOwnBase.replace(",", ".")) * 100);
    try {
      const payload = await json<{ result: AutoPartsResult }>("/api/national-coverage/auto-parts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ route: autoPartsRoute, operationDate: autoPartsDate, operationCents, ownIcmsBaseCents, cest: "01.075.00", ncm: "8708", importedQualified: autoPartsImported, commercialCondition: autoPartsCondition, facts: autoPartsFacts }) });
      setAutoPartsResult(payload.result);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Referência de autopeças bloqueada."); }
    finally { setBusy(""); }
  };

  const classifyBeverage = async (event: FormEvent) => {
    event.preventDefault(); setBusy("beverages"); setError(""); setBeverageResult(null);
    try {
      const payload = await json<{ result: ColdBeverageResult }>("/api/national-coverage/beverages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ route: beverageRoute, productCode: beverageProduct, operationDate: beverageDate, facts: beverageFacts }) });
      setBeverageResult(payload.result);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Enquadramento de bebidas bloqueado."); }
    finally { setBusy(""); }
  };

  const calculateSpDestinationBeverage = async (event: FormEvent) => {
    event.preventDefault(); setBusy("beverages-sp"); setError(""); setBeverageSpResult(null);
    const operationCents = Math.round(Number(beverageSpOperationValue.replace(",", ".")) * 100);
    const ownIcmsBaseCents = Math.round(Number(beverageSpOwnBase.replace(",", ".")) * 100);
    try {
      const payload = await json<{ result: ColdBeverageSpResult }>("/api/national-coverage/beverages/sp-destination", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          route: beverageSpRoute,
          profileCode: beverageSpProfile,
          operationDate: beverageSpDate,
          quantityUnits: Number(beverageSpQuantity),
          operationCents,
          ownIcmsBaseCents,
          importedQualified: beverageSpImported,
          facts: beverageSpFacts,
        }),
      });
      setBeverageSpResult(payload.result);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Referência paulista de bebidas bloqueada."); }
    finally { setBusy(""); }
  };

  const importBatch = async (event: FormEvent) => {
    event.preventDefault(); if (!files.length) return; setBusy("batch"); setError(""); setBatch(null);
    const form = new FormData(); files.forEach((file) => form.append("files", file));
    try { setBatch(await json<BatchResult>("/api/fiscal-imports", { method: "POST", body: form })); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Lote recusado."); }
    finally { setBusy(""); }
  };

  if (!coverage) return <section className="coverage-loading"><span className="loading-spinner" /><div><b>Montando o mapa tributário nacional…</b><p>As regras e os limites estão sendo conferidos.</p></div></section>;
  const automaticAssurance = compatibleAutomaticAssurance(coverage);
  const selectedBeverageSpProfile = coverage.stColdBeveragesSpDestination.profiles.find((profile) => profile.code === beverageSpProfile);

  return <div className="national-coverage-center">
    <section className="coverage-hero">
      <div><span>VERSÃO 69 · BEBIDAS COM DESTINO A SP</span><h1>O que o Margem Clara realmente suporta</h1><p>ICMS, ST, ISS, tributos federais, Reforma, documentos e mudanças normativas em uma matriz pública — sem esconder os cenários ainda parciais.</p></div>
      <div className="coverage-hero-proof"><small>BASE VERSIONADA</small><b>#{coverage.fingerprint}</b><span>{new Date(`${coverage.checkedAt}T12:00:00`).toLocaleDateString("pt-BR")}</span></div>
    </section>

    {error && <div className="coverage-error" role="alert"><span>!</span>{error}<button onClick={() => setError("")}>×</button></div>}

    <section className="coverage-kpis">
      <article><span>ICMS geral</span><strong>{coverage.metrics.states}/27</strong><small>UFs mapeadas</small></article>
      <article><span>ISS profundo</span><strong>{coverage.metrics.deepIssCities}/25</strong><small>{coverage.metrics.cities} municípios indexados</small></article>
      <article><span>ST prioritária</span><strong>{coverage.metrics.stSegments}</strong><small>segmentos controlados</small></article>
      <article><span>Cenários federais</span><strong>{coverage.metrics.recurringScenarios}</strong><small>rotinas recorrentes</small></article>
      <article className={automaticAssurance.status === "automatically_verified" ? "ready" : "locked"}><span>Motor técnico</span><strong>{automaticAssurance.status === "automatically_verified" ? "Verificado" : "Bloqueado"}</strong><small>{automaticAssurance.metrics.totalRuns} células · {automaticAssurance.metrics.failed} falhas</small></article>
    </section>

    <nav className="coverage-tabs" aria-label="Áreas da cobertura">
      {tabs.map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{({ panorama: "Panorama", icms: "ICMS + ST", iss: "ISS", federal: "Federais + Reforma", documents: "Importação em lote", governance: "Monitor + garantia" } as Record<Tab, string>)[item]}</button>)}
    </nav>

    {tab === "panorama" && <section className="coverage-panorama">
      <div className="coverage-legend"><div><StatusPill status="supported" /><p><b>Suportado</b><span>Regra testada e apta dentro do escopo indicado.</span></p></div><div><StatusPill status="partial" /><p><b>Parcial</b><span>Triagem útil, conclusão bloqueada.</span></p></div><div><StatusPill status="not_supported" /><p><b>Não suportado</b><span>Identifica o tema sem calcular.</span></p></div></div>
      <div className="coverage-summary-grid">
        <article><span>27</span><h3>Estados e Distrito Federal</h3><p>Rotas interestaduais nacionais e acesso direto ao portal oficial de cada UF.</p><b>Todos parciais até homologar alíquota interna, produto e exceções.</b></article>
        <article><span>{coverage.metrics.deepIssCities}</span><h3>ISS profundo estruturado</h3><p>Fontes municipais, classificadores, incidência, retenção e portão da alíquota exata.</p><b>Estruturado ainda não significa testado ou homologado.</b></article>
        <article><span>{coverage.stSpOriginMatrix.metrics.structuredCells}</span><h3>Matriz ST com origem em SP</h3><p>26 destinos cruzados com 25 segmentos, cada célula com fonte, evidências e bloqueios.</p><b>{coverage.stSpOriginMatrix.metrics.existingValidatedReferences} referências existentes · {coverage.stSpOriginMatrix.metrics.calculationsBlocked} células aguardam aprofundamento.</b></article>
        <article><span>Diário</span><h3>Monitor de fontes</h3><p>A primeira abertura do dia confere um lote rotativo de fontes primárias e compara cada uma com sua captura anterior.</p><b>O ciclo completo preserva recursos e nenhum sinal altera regra automaticamente.</b></article>
      </div>
      <div className="coverage-public-note"><span>INDICADOR PÚBLICO</span><p>Esta mesma matriz pode ser consultada sem login em <code>/api/public/coverage</code>. Clientes e parceiros conseguem verificar o que é suportado antes de confiar uma operação à plataforma.</p></div>
    </section>}

    {tab === "icms" && <section className="coverage-two-columns">
      <div className="coverage-column">
        <div className="coverage-section-heading"><span>27 UFs</span><h2>ICMS geral nacional</h2><p>A alíquota interestadual é resolvida somente com fatos explícitos; a interna permanece bloqueada até conferência estadual.</p></div>
        <form className="icms-reference-form" onSubmit={calculateIcms}>
          <label>Origem<select value={origin} onChange={(event) => setOrigin(event.target.value)}>{coverage.states.map((item) => <option key={item.uf}>{item.uf}</option>)}</select></label>
          <span>→</span>
          <label>Destino<select value={destination} onChange={(event) => setDestination(event.target.value)}>{coverage.states.map((item) => <option key={item.uf}>{item.uf}</option>)}</select></label>
          <label className="qualified-import"><input type="checkbox" checked={importedQualified} onChange={(event) => setImportedQualified(event.target.checked)} />Mercadoria cumpre os requisitos da Resolução 13/2012</label>
          <button disabled={busy === "icms"}>{busy === "icms" ? "Conferindo…" : "Obter referência"}</button>
        </form>
        {icmsResult && <div className="icms-reference-result"><span>REFERÊNCIA INTERESTADUAL</span><strong>{icmsResult.rateBps === null ? "Bloqueada" : `${(icmsResult.rateBps / 100).toFixed(0)}%`}</strong><p>{icmsResult.reason}</p><small>Não calcula DIFAL, ST, FCP ou imposto líquido.</small></div>}
        <div className="state-matrix">{coverage.states.map((item) => <a href={item.officialPortal} target="_blank" rel="noreferrer" key={item.uf}><b>{item.uf}</b><span>{item.name}</span><StatusPill status={item.status} /><i>↗</i></a>)}</div>
      </div>
      <div className="coverage-column">
        <div className="coverage-section-heading"><span>SEGMENTOS PRIORITÁRIOS</span><h2>Substituição tributária profunda</h2><p>Cada segmento informa com transparência o que já entra na memória e o que ainda bloqueia a conclusão.</p></div>
        <section className="sp-origin-matrix">
          <header><div><span>ORIGEM SÃO PAULO · {coverage.stSpOriginMatrix.version}</span><b>{coverage.stSpOriginMatrix.metrics.structuredCells} combinações estruturadas</b><p>{coverage.stSpOriginMatrix.policy}</p></div><code>#{coverage.stSpOriginMatrix.fingerprint}</code></header>
          <div className="sp-origin-kpis"><span><strong>{coverage.stSpOriginMatrix.metrics.destinations}</strong> destinos</span><span><strong>{coverage.stSpOriginMatrix.metrics.segments}</strong> segmentos</span><span><strong>{coverage.stSpOriginMatrix.metrics.mandatoryFacts}</strong> fatos obrigatórios</span><span><strong>{coverage.stSpOriginMatrix.metrics.calculationsBlocked}</strong> bloqueadas</span></div>
          <details><summary>Ver as 26 rotas estruturadas</summary><div className="sp-route-grid">{coverage.stSpOriginMatrix.destinations.map((item) => <a href={item.officialPortal} target="_blank" rel="noreferrer" key={item.uf}><b>SP→{item.uf}</b><span>25/25 segmentos</span><small>{spOriginReferenceCount.get(item.uf) ? `${spOriginReferenceCount.get(item.uf)} referências existentes` : "cálculo ainda bloqueado"} · fonte oficial ↗</small></a>)}</div></details>
        </section>
        <section className="beverage-priority-ledger">
          <header><div><span>BEBIDAS FRIAS · {coverage.stColdBeveragesPriority.version}</span><b>12 corredores, 24 sentidos e 6 produtos controlados</b><p>{coverage.stColdBeveragesPriority.policy}</p></div><code>#{coverage.stColdBeveragesPriority.fingerprint}</code></header>
          <div className="beverage-kpis"><span><strong>{coverage.stColdBeveragesPriority.metrics.corridors}</strong> corredores</span><span><strong>{coverage.stColdBeveragesPriority.metrics.directedRoutes}</strong> sentidos</span><span><strong>{coverage.stColdBeveragesPriority.metrics.productIdentities}</strong> identidades CEST</span><span className="scoped"><strong>{coverage.stColdBeveragesPriority.metrics.protocolScopedCells}</strong> células no protocolo</span><span className="exception"><strong>{coverage.stColdBeveragesPriority.metrics.explicitExceptionCells}</strong> exceções explícitas</span><span className="locked"><strong>{coverage.stColdBeveragesPriority.metrics.finalCalculationsReleased}</strong> memórias PMPF SP</span></div>
          <div className="beverage-scope-rule"><b>PMPF/pauta primeiro</b><span>Marca, embalagem, capacidade e data podem mudar a base. A MVA só entra quando a norma do destino permitir. A ordem das rotas é uma heurística operacional interna, não uma estatística oficial de NF-e.</span></div>
          <form className="auto-parts-calculator beverage-sp-calculator" onSubmit={calculateSpDestinationBeverage}>
            <header><div><span>DESTINO SÃO PAULO · {coverage.stColdBeveragesSpDestination.version}</span><h3>PMPF vigente com memória em centavos</h3><p>{coverage.stColdBeveragesSpDestination.metrics.controlledCells} combinações reproduzidas: cinco perfis exatos em sete origens prioritárias. Água continua fora deste protocolo.</p></div><small>{new Date(`${coverage.stColdBeveragesSpDestination.supportedPeriod.from}T12:00:00`).toLocaleDateString("pt-BR")}–{new Date(`${coverage.stColdBeveragesSpDestination.supportedPeriod.to}T12:00:00`).toLocaleDateString("pt-BR")}</small></header>
            <div className="beverage-sp-profile-proof"><span>PMPF unitário</span><strong>{selectedBeverageSpProfile ? (selectedBeverageSpProfile.pmpfCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}</strong><small>{selectedBeverageSpProfile?.legalTableItem} · CEST {selectedBeverageSpProfile?.cest}</small></div>
            <div className="auto-parts-calculator-fields beverage-sp-fields">
              <label>Origem → SP<select value={beverageSpRoute} onChange={(event) => { setBeverageSpRoute(event.target.value); setBeverageSpResult(null); }}>{coverage.stColdBeveragesSpDestination.routes.map((route) => <option key={route.route}>{route.route}</option>)}</select></label>
              <label>Perfil exato<select value={beverageSpProfile} onChange={(event) => { const code = event.target.value as ColdBeverageSpProfileCode; const profile = coverage.stColdBeveragesSpDestination.profiles.find((item) => item.code === code); const quantity = Math.max(1, Number(beverageSpQuantity) || 1); const suggested = profile ? ((profile.pmpfCents * quantity * 0.6) / 100).toFixed(2) : ""; setBeverageSpProfile(code); setBeverageSpOperationValue(suggested); setBeverageSpOwnBase(suggested); setBeverageSpResult(null); }}>{coverage.stColdBeveragesSpDestination.profiles.map((profile) => <option value={profile.code} key={profile.code}>{profile.label}</option>)}</select></label>
              <label>Data<input type="date" min={coverage.stColdBeveragesSpDestination.supportedPeriod.from} max={coverage.stColdBeveragesSpDestination.supportedPeriod.to} value={beverageSpDate} onChange={(event) => { setBeverageSpDate(event.target.value); setBeverageSpResult(null); }} required /></label>
              <label>Quantidade de unidades<input type="number" min="1" max="1000000" step="1" value={beverageSpQuantity} onChange={(event) => { setBeverageSpQuantity(event.target.value); setBeverageSpResult(null); }} required /></label>
              <label>Valor da operação<input type="number" min="0.01" max="1000000000" step="0.01" value={beverageSpOperationValue} onChange={(event) => { setBeverageSpOperationValue(event.target.value); setBeverageSpResult(null); }} required /></label>
              <label>Base do ICMS próprio<input type="number" min="0.01" max="1000000000" step="0.01" value={beverageSpOwnBase} onChange={(event) => { setBeverageSpOwnBase(event.target.value); setBeverageSpResult(null); }} required /></label>
            </div>
            <label className="auto-parts-imported"><input type="checkbox" checked={beverageSpImported} onChange={(event) => { setBeverageSpImported(event.target.checked); setBeverageSpResult(null); }} />Mercadoria importada que cumpre integralmente a Resolução do Senado 13/2012 (4%); desmarcada, a rota usa 12%</label>
            <fieldset><legend>Confirme os nove fatos documentados</legend>{(Object.entries(coverage.stColdBeveragesSpDestination.factLabels) as Array<[ColdBeverageSpFactKey, string]>).map(([key, label]) => <label key={key}><input type="checkbox" checked={beverageSpFacts[key]} onChange={(event) => setBeverageSpFacts((current) => ({ ...current, [key]: event.target.checked }))} />{label}</label>)}</fieldset>
            <button disabled={busy === "beverages-sp" || !beverageSpDate || !beverageSpQuantity || !beverageSpOperationValue || !beverageSpOwnBase}>{busy === "beverages-sp" ? "Reproduzindo memória…" : "Calcular PMPF condicionado"}</button>
          </form>
          {beverageSpResult && <section className={`auto-parts-calculator-result beverage-sp-result ${beverageSpResult.status}`}>
            {beverageSpResult.status === "calculated_reference" && beverageSpResult.output && beverageSpResult.parameters ? <><header><span>MEMÓRIA PAULISTA CONDICIONAL · {beverageSpResult.route}</span><strong>{(beverageSpResult.output.destinationTotalCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong><small>ICMS-ST; FCP igual a zero neste recorte de bebidas não alcoólicas</small></header><div><span>Base PMPF<b>{(beverageSpResult.output.stBaseCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</b></span><span>PMPF unitário<b>{(beverageSpResult.parameters.pmpfUnitCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</b></span><span>ICMS próprio<b>{(beverageSpResult.output.ownIcmsCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</b></span><span>ICMS presumido<b>{(beverageSpResult.output.presumedInternalIcmsCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</b></span><span>ICMS-ST<b>{(beverageSpResult.output.icmsStCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</b></span></div><p>Interestadual {(beverageSpResult.parameters.interstateRateBps / 100).toFixed(0)}% · interna {(beverageSpResult.parameters.internalRateBps / 100).toFixed(0)}% · limite de 90% do PMPF: {(beverageSpResult.parameters.pmpfLimitCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.</p></> : <><header><span>{beverageSpResult.status === "pmpf_fallback_required" ? "PMPF LEGALMENTE AFASTADO" : "CÁLCULO BLOQUEADO"}</span><strong>{beverageSpResult.status === "pmpf_fallback_required" ? "Exige IVA-ST de fallback" : "Sem valor exibido"}</strong></header><ul>{beverageSpResult.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul></>}
            <small>{beverageSpResult.limitation}</small>
          </section>}
          <form className="beverage-triage" onSubmit={classifyBeverage}>
            <header><div><span>TRIAGEM TEMPORAL</span><h3>Enquadrar bebida sem inventar alíquota</h3><p>Refrigerantes, energéticos, isotônicos e água em vidro. Cerveja, chope e destilados continuam separados.</p></div><small>Período controlado: 2026</small></header>
            <div className="beverage-fields">
              <label>Rota<select value={beverageRoute} onChange={(event) => { setBeverageRoute(event.target.value); setBeverageResult(null); }}>{coverage.stColdBeveragesPriority.routes.map((route) => <option key={route.route}>{route.route}</option>)}</select></label>
              <label>Produto<select value={beverageProduct} onChange={(event) => { setBeverageProduct(event.target.value as ColdBeverageProductCode); setBeverageResult(null); }}>{coverage.stColdBeveragesPriority.products.map((product) => <option value={product.code} key={product.code}>{product.label} · CEST {product.cest}</option>)}</select></label>
              <label>Data da operação<input type="date" min={coverage.stColdBeveragesPriority.supportedPeriod.from} max={coverage.stColdBeveragesPriority.supportedPeriod.to} value={beverageDate} onChange={(event) => { setBeverageDate(event.target.value); setBeverageResult(null); }} required /></label>
            </div>
            <fieldset><legend>Oito fatos que precisam existir no dossiê</legend>{(Object.entries(coverage.stColdBeveragesPriority.operationFactLabels) as Array<[ColdBeverageFactKey, string]>).map(([key, label]) => <label key={key}><input type="checkbox" checked={beverageFacts[key]} onChange={(event) => setBeverageFacts((current) => ({ ...current, [key]: event.target.checked }))} />{label}</label>)}</fieldset>
            <button disabled={busy === "beverages" || !beverageDate}>{busy === "beverages" ? "Conferindo regra…" : "Conferir enquadramento"}</button>
          </form>
          {beverageResult && <section className={`beverage-result ${beverageResult.status}`}><header><span>{beverageResult.status === "scoped_parameters_pending" ? "PROTOCOLO ALCANÇA A ROTA" : beverageResult.status === "protocol_not_applicable" ? "EXCEÇÃO LEGAL IDENTIFICADA" : "DADOS INSUFICIENTES"}</span><strong>{beverageResult.status === "scoped_parameters_pending" ? "PMPF/MVA ainda bloqueia o valor" : beverageResult.status === "protocol_not_applicable" ? "Usar tratamento próprio do destino" : "Sem conclusão"}</strong></header><ul>{beverageResult.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}{beverageResult.nextChecks.map((check) => <li key={check}>{check}</li>)}</ul><small>{beverageResult.limitation}</small></section>}
          <details className="beverage-route-details" open><summary>Ver os 24 sentidos para o produto selecionado</summary><div className="beverage-route-grid">{coverage.stColdBeveragesPriority.routes.map((route) => { const cell = coverage.stColdBeveragesPriority.applicability.find((item) => item.route === route.route && item.productCode === beverageProduct); return <article key={route.route} className={cell?.status ?? "protocol_not_applicable"}><header><b>{route.origin}→{route.destination}</b><span>PRIORIDADE {String(route.corridorRank).padStart(2, "0")} · {route.direction === "outbound" ? "IDA" : "VOLTA"}</span></header><em>{cell?.status === "protocol_scoped_parameters_pending" ? "ESCOPO PROTOCOLAR" : "EXCEÇÃO / TRATAMENTO PRÓPRIO"}</em><strong>{route.pricingGate === "official_price_first_then_destination_mva" ? `PMPF → MVA de ${route.destination}` : "PMPF → MVA protocolar"}</strong><p>{cell?.reason}</p></article>; })}</div></details>
          <div className="beverage-warning"><b>Limite desta versão</b><span>As 144 células distinguem escopo e exceção por data; 35 memórias com destino a São Paulo foram abertas apenas para os cinco perfis exatos acima. Marca listada, embalagem divergente, água, Simples Nacional e fallback por IVA-ST continuam sem valor.</span></div>
          <footer>{coverage.stColdBeveragesPriority.sources.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.code}>{source.title} · {source.publisher} ↗</a>)}</footer>
        </section>
        <section className="auto-parts-corridor-ledger">
          <header><div><span>CORREDORES PRIORITÁRIOS · {coverage.stAutoPartsHighUseCorridors.version}</span><b>12 pares avaliados como 24 rotas independentes</b><p>{coverage.stAutoPartsHighUseCorridors.policy}</p></div><code>#{coverage.stAutoPartsHighUseCorridors.fingerprint}</code></header>
          <div className="auto-parts-corridor-kpis"><span><strong>{coverage.stAutoPartsHighUseCorridors.metrics.corridors}</strong> corredores</span><span><strong>{coverage.stAutoPartsHighUseCorridors.metrics.directedRoutes}</strong> sentidos auditados</span><span className="active"><strong>{coverage.stAutoPartsHighUseCorridors.metrics.activeAgreementRoutes}</strong> no protocolo atual</span><span className="reference"><strong>{coverage.stAutoPartsHighUseCorridors.metrics.syntheticReferencesReproduced}</strong> memórias sintéticas</span><span className="blocked"><strong>{coverage.stAutoPartsHighUseCorridors.metrics.safelyBlocked}</strong> sem valor final</span></div>
          <div className="auto-parts-direction-rule"><b>Ida ≠ volta</b><span>Cada direção consulta separadamente participação no acordo, regra do destino, MVA, alíquota, FCP e transições futuras. Esta ordem é prioridade interna do produto, não estatística oficial de NF-e.</span></div>
          <form className="auto-parts-calculator" onSubmit={calculateAutoParts}>
            <header><div><span>CALCULADORA TEMPORAL</span><h3>Autopeças nas dez rotas ativas</h3><p>Produto controlado: CEST 01.075.00 · NCM 8708. A data é obrigatória e muda o tratamento com destino a São Paulo.</p></div><small>Período {new Date(`${coverage.stAutoPartsHighUseCorridors.supportedPeriod.from}T12:00:00`).toLocaleDateString("pt-BR")}–{new Date(`${coverage.stAutoPartsHighUseCorridors.supportedPeriod.to}T12:00:00`).toLocaleDateString("pt-BR")}</small></header>
            <div className="auto-parts-calculator-fields">
              <label>Rota<select value={autoPartsRoute} onChange={(event) => { setAutoPartsRoute(event.target.value); setAutoPartsResult(null); }}>{coverage.stAutoPartsHighUseCorridors.routes.filter((route) => route.agreementStatus === "protocol_41_active").map((route) => <option key={route.route}>{route.route}</option>)}</select></label>
              <label>Data da operação<input type="date" min={coverage.stAutoPartsHighUseCorridors.supportedPeriod.from} max={coverage.stAutoPartsHighUseCorridors.supportedPeriod.to} value={autoPartsDate} onChange={(event) => setAutoPartsDate(event.target.value)} required /></label>
              <label>Base inicial da ST<input type="number" min="0.01" max="1000000000" step="0.01" value={autoPartsValue} onChange={(event) => setAutoPartsValue(event.target.value)} required /></label>
              <label>Base do ICMS próprio<input type="number" min="0.01" max="1000000000" step="0.01" value={autoPartsOwnBase} onChange={(event) => setAutoPartsOwnBase(event.target.value)} required /></label>
              <label>Condição comercial<select value={autoPartsCondition} onChange={(event) => setAutoPartsCondition(event.target.value as typeof autoPartsCondition)} required><option value="">Selecione</option><option value="standard">Sem fidelidade</option><option value="fidelity">Com fidelidade comprovada</option></select></label>
            </div>
            <label className="auto-parts-imported"><input type="checkbox" checked={autoPartsImported} onChange={(event) => setAutoPartsImported(event.target.checked)} />Mercadoria importada qualificada na Resolução do Senado 13/2012 (alíquota interestadual de 4%)</label>
            <fieldset><legend>Confirme os oito fatos documentados</legend>{(Object.entries(coverage.stAutoPartsHighUseCorridors.operationFactLabels) as Array<[AutoPartsFactKey, string]>).map(([key, label]) => <label key={key}><input type="checkbox" checked={autoPartsFacts[key]} onChange={(event) => setAutoPartsFacts((current) => ({ ...current, [key]: event.target.checked }))} />{label}</label>)}</fieldset>
            <button disabled={busy === "auto-parts" || !autoPartsDate || !autoPartsCondition || !autoPartsValue || !autoPartsOwnBase}>{busy === "auto-parts" ? "Reproduzindo memória…" : "Calcular referência condicionada"}</button>
          </form>
          {autoPartsResult && <section className={`auto-parts-calculator-result ${autoPartsResult.status}`}>
            {autoPartsResult.status === "calculated_reference" && autoPartsResult.output && autoPartsResult.parameters ? <><header><span>MEMÓRIA CONDICIONAL · {autoPartsResult.route}</span><strong>{(autoPartsResult.output.destinationTotalCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong><small>ICMS-ST + FCP estimados pelo motor determinístico</small></header><div><span>Base ST<b>{(autoPartsResult.output.stBaseCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</b></span><span>MVA aplicada<b>{(autoPartsResult.output.mvaAppliedBps / 100).toFixed(2).replace(".", ",")}%</b></span><span>ICMS próprio<b>{(autoPartsResult.output.ownIcmsCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</b></span><span>ICMS-ST<b>{(autoPartsResult.output.icmsStCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</b></span><span>FCP<b>{(autoPartsResult.output.fcpCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</b></span></div><p>Interestadual {(autoPartsResult.parameters.interstateRateBps / 100).toFixed(0)}% · interna {(autoPartsResult.parameters.internalRateBps / 100).toFixed(2).replace(".", ",")}% · MVA original {(autoPartsResult.parameters.mvaOriginalBps / 100).toFixed(2).replace(".", ",")}%.</p></> : <><header><span>{autoPartsResult.status === "st_not_applicable_after_state_exclusion" ? "TRANSIÇÃO LEGAL" : "CÁLCULO BLOQUEADO"}</span><strong>{autoPartsResult.status === "st_not_applicable_after_state_exclusion" ? "ST paulista não aplicável" : "Sem valor exibido"}</strong></header><ul>{autoPartsResult.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul></>}
            <small>{autoPartsResult.limitation}</small>
          </section>}
          <details className="auto-parts-corridor-details" open><summary>Ver as 24 decisões direcionais</summary><div className="auto-parts-corridor-grid">{coverage.stAutoPartsHighUseCorridors.routes.map((route) => <article key={route.route} className={route.calculationStatus}><header><b>{route.origin}→{route.destination}</b><span>PRIORIDADE {String(route.corridorRank).padStart(2, "0")} · {route.direction === "outbound" ? "IDA" : "VOLTA"}</span></header><em>{route.calculationStatus === "synthetic_reference_reproduced" ? "MEMÓRIA SINTÉTICA" : route.agreementStatus === "protocol_41_active" ? "ACORDO ATIVO · PARÂMETROS PENDENTES" : "FORA DO PROTOCOLO 41/08"}</em><strong>{route.syntheticReference ? (route.syntheticReference.destinationTotalCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : route.parameterMethod === "destination_internal_mva" ? `MVA deve vir de ${route.destination}` : route.parameterMethod === "protocol_mva" ? `MVA original ${(route.mvaOriginalBps! / 100).toFixed(2).replace(".", ",")}% · cálculo bloqueado` : "Exige tratamento próprio do destino"}</strong><p>{route.agreementReason}</p><small>{route.remainingBlockers.length} controles impedem uso automático em operação real</small>{route.scheduledReview && <mark>Revisão obrigatória em {new Date(`${route.scheduledReview.effectiveFrom}T12:00:00`).toLocaleDateString("pt-BR")}: regra paulista muda.</mark>}</article>)}</div></details>
          <div className="auto-parts-corridor-safety"><b>Resultado desta rodada</b><span>10 sentidos estão dentro do âmbito bilateral atual e têm memória sintética reproduzível; 14 falham fechados. Os valores usam operação controlada de R$ 1.000 e não representam imposto devido por um cliente sem os oito fatos documentados.</span></div>
          <footer>{coverage.stAutoPartsHighUseCorridors.sources.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.code}>{source.title} · {source.publisher} ↗</a>)}</footer>
        </section>
        <section className="auto-parts-priority-batch">
          <header><div><span>LOTE COMPLEMENTAR · ORIGEM SP · {coverage.stAutoPartsPriorityBatch.version}</span><b>26 destinos mapeados — não confundir com cobertura nacional de origens</b><p>{coverage.stAutoPartsPriorityBatch.policy}</p></div><code>#{coverage.stAutoPartsPriorityBatch.fingerprint}</code></header>
          <div className="auto-parts-kpis"><span><strong>{coverage.stAutoPartsPriorityBatch.metrics.routesInBatch}</strong> destinos partindo de SP</span><span className="active"><strong>{coverage.stAutoPartsPriorityBatch.metrics.activeAgreementRoutes}</strong> no Protocolo 41/08</span><span className="outside"><strong>{coverage.stAutoPartsPriorityBatch.metrics.outsideProtocolRoutes}</strong> fora do protocolo atual</span><span><strong>{coverage.stAutoPartsPriorityBatch.metrics.destinationMvaOverrides}</strong> usam MVA estadual</span></div>
          <details className="auto-parts-route-details"><summary>Ver enquadramento das 26 rotas</summary><div className="auto-parts-route-grid">{coverage.stAutoPartsPriorityBatch.routes.map((route) => <article key={route.destination} className={route.agreementStatus}><header><b>SP→{route.destination}</b><span>{route.agreementStatus === "protocol_41_active" ? "ACORDO ATIVO" : "TRATAMENTO PRÓPRIO"}</span></header><strong>{route.syntheticReference ? `Referência sintética ${(route.syntheticReference.destinationTotalCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}` : route.parameterMethod === "destination_internal_mva" ? "MVA da legislação estadual" : route.parameterMethod === "protocol_mva" ? `MVA original ${(route.mvaOriginalBps! / 100).toFixed(2).replace(".", ",")}% · valor bloqueado` : "Protocolo 41/08 não aplicável"}</strong><p>{route.agreementReason}</p><small>{route.remainingBlockers.length} verificações impedem uso em operação real</small></article>)}</div></details>
          <div className="auto-parts-safety"><b>Leitura correta</b><span>Rota fora do Protocolo 41/08 não significa isenção. O sistema não herda MVA antiga e exige identificar ST interna, antecipação, DIFAL ou tributação normal. Desde 2026, o CEST 01.015.00 também fica fora deste protocolo quando São Paulo é origem ou destino.</span></div>
          <footer>{coverage.stAutoPartsPriorityBatch.sources.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.code}>{source.title} · {source.publisher} ↗</a>)}</footer>
        </section>
        <section className="cement-route-ledger">
          <header><div><span>CIMENTO SP→BRASIL · {coverage.stCementSpRoutes.version}</span><b>Uma base legal, 26 rotas controladas</b><p>{coverage.stCementSpRoutes.policy}</p></div><code>#{coverage.stCementSpRoutes.fingerprint}</code></header>
          <div className="cement-route-kpis"><span className="scoped"><strong>{coverage.stCementSpRoutes.metrics.signatoryRoutes}</strong> rotas no Protocolo 11/85</span><span><strong>{coverage.stCementSpRoutes.metrics.fixedMvaRoutes}</strong> MVA original de 20%</span><span className="pending"><strong>{coverage.stCementSpRoutes.metrics.destinationLawMvaRoutes}</strong> MVA na lei do destino</span><span className="outside"><strong>{coverage.stCementSpRoutes.metrics.nonSignatoryRoutes}</strong> fora deste protocolo</span></div>
          <div className="cement-release-gate"><strong>{coverage.stCementSpRoutes.metrics.newlyReleasedCalculations}</strong><span>novos valores finais liberados</span><p>Alíquota interna, FCP, base alternativa, benefícios e fatos da operação continuam obrigatórios.</p></div>
          <details><summary>Ver enquadramento das 26 rotas</summary><div className="cement-route-grid">{coverage.stCementSpRoutes.routes.map((route) => <article key={route.key} className={route.legalStatus}><div><b>SP→{route.destination}</b><span>{route.destinationName}</span></div><strong>{route.mvaSource === "protocol_fixed_20_percent" ? "MVA 20%" : route.mvaSource === "destination_internal_law_required" ? "MVA do destino" : "Protocolo não aplicável"}</strong><small>{route.calculationStatus === "blocked_destination_parameters" ? `${route.missingLegalInputs.length} parâmetros ainda bloqueiam o valor` : "Exige fundamento próprio do Amazonas"}</small></article>)}</div></details>
          <footer>{coverage.stCementSpRoutes.sources.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.url}>{source.title} · {source.publisher} ↗</a>)}</footer>
        </section>
        <section className="cement-priority-batch">
          <header><div><span>LOTE ESTADUAL · {coverage.stCementPriorityBatch.version}</span><b>RJ, ES, BA, GO e MS aprofundados</b><p>{coverage.stCementPriorityBatch.policy}</p></div><code>#{coverage.stCementPriorityBatch.fingerprint}</code></header>
          <div className="cement-priority-kpis"><span><strong>{coverage.stCementPriorityBatch.metrics.statesInBatch}</strong> destinos aprofundados</span><span><strong>{coverage.stCementPriorityBatch.metrics.officialStateSources}</strong> fontes estaduais</span><span><strong>{coverage.stCementPriorityBatch.metrics.adjustedMvaTablesSourced}</strong> tabelas de MVA ajustada</span><span><strong>{coverage.stCementPriorityBatch.metrics.pmpfGatesStructured}</strong> portão de PMPF</span></div>
          <div className="cement-priority-grid">{coverage.stCementPriorityBatch.states.map((state) => <article key={state.destination} className={state.legalStatus}><header><b>SP→{state.destination}</b><span>{state.legalStatus === "synthetic_reference_reproduced" ? "REFERÊNCIA SINTÉTICA" : state.legalStatus === "pmpf_gate_structured" ? "PMPF PRIMEIRO" : "PARÂMETROS ESTADUAIS"}</span></header><strong>{state.calculationMethod === "pmpf_by_gtin_or_mva_fallback" ? "PMPF por GTIN antes da MVA" : `MVA ajustada ${(state.publishedAdjustedMvaBpsFor12 / 100).toFixed(2).replace(".", ",")}%`}</strong>{state.productExclusions.length > 0 && <small>Exclusão: {state.productExclusions.join(" · ")}</small>}<p>{state.syntheticReference ? `Memória sintética reproduzida: ${(state.syntheticReference.destinationTotalCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}` : `${state.remainingBlockers.length} verificações ainda bloqueiam o valor final`}</p></article>)}</div>
          <div className="cement-priority-warning"><b>Controle de segurança</b><span>Somente o RJ possui memória sintética reproduzida nesta versão. Nenhum valor de operação real é concluído sem vigência, produto, base, benefícios, regime e documentos do contribuinte.</span></div>
          <footer>{coverage.stCementPriorityBatch.sources.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.code}>{source.title} · {source.publisher} ↗</a>)}</footer>
        </section>
        <section className="st-validation-ledger">
          <header><div><span>VALIDAÇÃO AUTOMÁTICA · {coverage.stSpCalculationValidation.version}</span><b>{coverage.stSpCalculationValidation.metrics.totalRuns}/650 células executadas</b><p>{coverage.stSpCalculationValidation.policy}</p></div><code>#{coverage.stSpCalculationValidation.fingerprint}</code></header>
          <div><span className="reproduced"><strong>{coverage.stSpCalculationValidation.metrics.referenceReproduced}</strong> referências reproduzidas</span><span className="blocked"><strong>{coverage.stSpCalculationValidation.metrics.safelyBlocked}</strong> bloqueios seguros</span><span><strong>{coverage.stSpCalculationValidation.metrics.failed}</strong> falhas do motor</span><span><strong>{coverage.stSpCalculationValidation.metrics.representativeProducts}</strong> produtos congelados</span></div>
          <details><summary>Ver os 25 produtos representativos</summary><div className="representative-product-grid">{coverage.stRepresentativeProducts.products.map((item) => <article key={item.code}><b>{item.description}</b><span>{item.segmentCode}</span><code>CEST {item.cest}</code><small>NCM {item.ncm.join(" · ")}</small></article>)}</div></details>
        </section>
        <section className="st-sp-mg-assurance">
          <div><span>MATRIZ SP→MG · {coverage.stSpMg.version}</span><b>{coverage.stSpMg.metrics.legalGatesStructured}/25 dossiês legais íntegros</b><p>{coverage.stSpMg.policy}</p></div>
          <div><strong>{coverage.stSpMg.metrics.calculationsValidated}</strong><span>cálculo com regra representativa validada</span><strong>{coverage.stSpMg.metrics.calculationsBlocked}</strong><span>valores finais bloqueados com segurança</span></div>
          <code>#{coverage.stSpMg.fingerprint}</code>
        </section>
        <div className="segment-stack">{coverage.stSegments.map((item) => {
          const legal = stSpMgPackages.get(item.code);
          return <article key={item.code}><header><div><small>{item.code}</small><h3>{item.name}</h3></div><span className={`st-legal-status ${legal?.legalStatus ?? "legal_gate_structured"}`}>{legal?.legalStatus === "calculation_validated" ? "CÁLCULO VALIDADO" : "PORTÃO LEGAL"}</span></header><div><b>Rota controlada</b><span>SP → MG · capítulo {legal?.mgChapter ?? "—"} · {legal?.mgChapterTitle ?? "mapeamento pendente"}</span></div><details><summary>Ver dados legais e bloqueios</summary>{legal && <><p><b>Fonte oficial</b><a href={legal.sourceUrl} target="_blank" rel="noreferrer">{legal.sourceTitle} ↗</a></p><p><b>Fatos obrigatórios ({legal.mandatoryFacts.length})</b>{legal.mandatoryFacts.join(" · ")}</p>{legal.representativeRule && <p><b>Regra representativa validada</b>CEST {legal.representativeRule.cest} · NCM {legal.representativeRule.ncm} · MVA original {(legal.representativeRule.mvaOriginalBps / 100).toFixed(2).replace(".", ",")}% · {legal.representativeRule.agreementCode}</p>}<p><b>Antes de concluir</b>{legal.blockers.join(" · ")}</p></>}</details></article>;
        })}</div>
      </div>
    </section>}

    {tab === "iss" && <section className="iss-coverage">
      <div className="coverage-section-heading"><span>15 PROFUNDOS · 50 MUNICÍPIOS INDEXADOS</span><h2>ISS municipal com fonte e portão de cálculo</h2><p>Quinze capitais e polos já têm pacote municipal estruturado. A plataforma nunca converte a faixa legal de 2% a 5% em alíquota exata sem código do serviço, vigência, local de incidência, retenção e aprovação profissional.</p></div>
      <div className="iss-depth-metrics">
        <article><span>Estruturados</span><strong>{coverage.issDeep.metrics.structuredCities}</strong><small>pacotes municipais profundos</small></article>
        <article className="technical"><span>Portões técnicos</span><strong>{coverage.issDeep.metrics.technicalGateValidatedCities}/15</strong><small>6 contratos reproduzíveis por cidade</small></article>
        <article><span>Referência localizada</span><strong>{coverage.issDeep.metrics.rateReferenceLocatedCities}/15</strong><small>Belém ainda exige tabela exata</small></article>
        <article><span>Fontes municipais</span><strong>{coverage.issDeep.metrics.officialSources}</strong><small>catálogos revisados em 15 cidades</small></article>
        <article><span>Casos fiscais</span><strong>{coverage.issDeep.metrics.testedCities}</strong><small>nenhuma operação real validada</small></article>
        <article><span>Homologados</span><strong>{coverage.issDeep.metrics.professionallyApprovedCities}</strong><small>aguardam contador ou tributarista</small></article>
      </div>
      <div className="iss-technical-round"><div><span>RODADA TÉCNICA CONCLUÍDA</span><b>15/15 pacotes passaram nos contratos do software</b><p>Unicidade, HTTPS oficial catalogado, fatos obrigatórios, faixa de 2%–5%, vínculo da fonte, referência exata e aprovação profissional foram exercitados. Esses testes confirmam o bloqueio seguro; não confirmam a alíquota de uma operação.</p></div><div><strong>0</strong><span>homologações fiscais</span><small>o sistema não atribui assinatura profissional ao desenvolvedor</small></div></div>
      <div className="iss-depth-policy"><b>O que “revisado tecnicamente” quer dizer</b><span>estrutura íntegra · fonte catalogada · bloqueios testados · evidência SHA-256 por cidade · cálculo exato ainda depende de caso fiscal e aprovação profissional</span></div>
      <div className="city-search"><input value={cityQuery} onChange={(event) => setCityQuery(event.target.value)} placeholder="Buscar cidade ou UF" /><span>{cities.length} cidades</span></div>
      <div className="city-table"><div className="city-table-head"><span>Município</span><span>IBGE</span><span>Faixa nacional</span><span>Profundidade</span></div>{cities.map((item) => {
        const deepProfile = issDeepProfiles.get(item.ibgeCode);
        const sources = deepProfile?.sourceCodes.map((code) => issDeepSources.get(code)).filter((source): source is IssDeepSource => Boolean(source)) ?? [];
        const technicalEvidence = issTechnicalEvidence.get(item.ibgeCode);
        return <details key={item.ibgeCode} className={deepProfile ? "deep" : "catalogued"}><summary><span><b>{item.city}</b><small>{item.uf}</small></span><code>{item.ibgeCode}</code><strong>2%–5%</strong><em className={`iss-depth-badge ${item.depth}`}>{item.depth === "structured" ? "Profundo estruturado" : "Catalogado"}</em></summary><div><p><b>O sistema já organiza:</b> {item.supported.join(" · ")}</p>{deepProfile && <><div className="iss-review-state"><span className="passed">✓ Técnico validado · {deepProfile.technicalReview.passedChecks.length}/6</span><span className={deepProfile.technicalReview.rateReferenceStatus === "located_for_mapping" ? "located" : "pending"}>{deepProfile.technicalReview.rateReferenceStatus === "located_for_mapping" ? "Referência de alíquota localizada" : "Tabela exata ainda pendente"}</span><span className="pending">Homologação profissional pendente</span>{technicalEvidence && <code title={technicalEvidence.evidenceHash}>Evidência #{technicalEvidence.evidenceHash.slice(0, 12)}</code>}</div><p><b>Incidência:</b> {deepProfile.placeOfIncidence.generalRule}</p><div className="iss-source-links">{sources.map((source) => <a key={source.code} href={source.url} target="_blank" rel="noreferrer"><span>{source.kind === "municipal_law" ? "LEI" : source.kind === "rate_table" ? "TABELA" : "ORIENTAÇÃO"}</span><b>{source.title}</b><small>{source.publisher} · conferida em {new Date(`${source.checkedAt}T12:00:00`).toLocaleDateString("pt-BR")} ↗</small></a>)}</div></>}<p className="iss-blockers"><b>Conclusão bloqueada por:</b> {item.blockers.join(" · ")}</p></div></details>;
      })}</div>
    </section>}

    {tab === "federal" && <section className="federal-scenario-area">
      <div className="coverage-section-heading"><span>CENÁRIOS RECORRENTES</span><h2>Simples, PIS/Cofins, IRPJ/CSLL e retenções</h2><p>A versão 26 já organiza as obrigações federais; esta camada mostra quais cenários possuem triagem, memória ou bloqueio de apuração.</p></div>
      <div className="federal-scenario-grid">{coverage.recurringScenarios.map((item) => <article key={item.code}><header><span>{item.tax}</span><StatusPill status={item.status} /></header><h3>{item.title}</h3><p><b>Disponível</b>{item.supported.join(" · ")}</p><p><b>Exige confirmação</b>{item.blockers.join(" · ")}</p></article>)}</div>
      <section className="official-calculator-card"><div><span>REFORMA TRIBUTÁRIA</span><h2>Calculadora oficial integrada por encaminhamento seguro</h2><p>Abra o motor oficial da Receita para calcular CBS, IBS e Imposto Seletivo com a mesma versão disponibilizada pela Administração Tributária. O Margem Clara não substitui o resultado por estimativa própria.</p><div><b>O que preservamos</b><span>versão da base · fatos da operação · memória oficial · revisão profissional</span></div></div><a href="https://consumo.tributos.gov.br/servico/calcular-tributos-consumo/calculadora/regime-geral" target="_blank" rel="noreferrer">Abrir calculadora oficial <span>↗</span></a></section>
    </section>}

    {tab === "documents" && <section className="batch-import-area">
      <div className="coverage-section-heading"><span>NF-e · NFS-e · SPED</span><h2>Importação em lote com descarte do arquivo bruto</h2><p>Envie até 25 arquivos por lote. A plataforma identifica o formato, registra hash e manifesto de auditoria e não conserva o XML/TXT bruto.</p></div>
      <form className="batch-drop" onSubmit={importBatch}><label><input type="file" multiple accept=".xml,.txt" onChange={(event) => setFiles(Array.from(event.target.files ?? []).slice(0, 25))} /><span>＋</span><b>Selecionar documentos fiscais</b><small>XML NF-e/NFS-e ou TXT SPED · 5 MB por arquivo · 30 MB por lote</small></label>{files.length > 0 && <div className="batch-selection"><span>{files.length} arquivo(s) selecionado(s)</span><small>{(files.reduce((sum, file) => sum + file.size, 0) / 1_000_000).toFixed(2)} MB</small></div>}<button disabled={!files.length || busy === "batch"}>{busy === "batch" ? "Processando lote…" : "Importar e validar lote"}</button></form>
      {batch && <div className="batch-result"><header><div><span>LOTE REGISTRADO</span><h3>{batch.metrics.total} documentos processados</h3><p>{batch.message}</p></div><div><b>{batch.metrics.accepted}</b><small>aceitos</small><b>{batch.metrics.warning}</b><small>revisar</small><b>{batch.metrics.blocked}</b><small>bloqueados</small></div></header><div>{batch.items.map((item) => <article key={`${item.filename}-${item.sourceHash}`} className={item.status}><span>{item.documentType.toUpperCase()}</span><p><b>{item.filename}</b><small>#{item.sourceHash}</small></p><strong>{item.status === "accepted" ? "Aceito" : item.status === "warning" ? "Revisar" : "Bloqueado"}</strong><details><summary>Detalhes</summary>{item.issues.map((issue) => <small key={issue}>{issue}</small>)}</details></article>)}</div></div>}
    </section>}

    {tab === "governance" && <section className="governance-area">
      <div className="monitor-panel"><div className="coverage-section-heading"><span>MONITOR DIÁRIO ROTATIVO</span><h2>Alterações normativas viram sinal, não regra automática</h2><p>{monitor?.policy ?? "Consultando fontes oficiais…"}</p></div>{monitor && <><div className="monitor-kpis"><span><b>{monitor.metrics.monitored}</b>fontes no ciclo</span><span><b>{monitor.metrics.checked}</b>conferidas hoje</span><span className={monitor.metrics.changeSignals ? "alert" : ""}><b>{monitor.metrics.changeSignals}</b>sinais de mudança</span><span><b>{monitor.metrics.unavailable}</b>indisponíveis hoje</span></div><div className="monitor-list">{monitor.sources.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.code}><span className={source.status}>{source.status === "checked" ? "✓" : "!"}</span><p><b>{source.title}</b><small>{source.changed ? "Conteúdo mudou desde a captura anterior — revisar" : source.status === "checked" ? "Sem sinal confirmado" : "Fonte indisponível nesta captura"}</small></p><em>{source.changed ? "Revisar" : "↗"}</em></a>)}</div><small className="monitor-time">Lote {monitor.metrics.checkedToday} de {monitor.metrics.monitored} fontes · ciclo estimado de {monitor.rotation.cycleDays} dias · última captura {new Date(monitor.checkedAt).toLocaleString("pt-BR")}</small></>}</div>
      <div className="approval-panel"><div className="coverage-section-heading"><span>GARANTIA EM DUAS CAMADAS</span><h2>Teste automático agora; responsabilidade no caso concreto</h2><p>A base técnica é liberada por controles reproduzíveis. Nenhuma assinatura humana é exigida para consultar referências condicionais ou executar a bateria automática.</p></div>
        <div className={`automatic-assurance-card ${automaticAssurance.status}`}><span>{automaticAssurance.status === "automatically_verified" ? "✓" : "!"}</span><div><small>VERIFICAÇÃO AUTOMÁTICA · #{automaticAssurance.fingerprint}</small><h3>{automaticAssurance.status === "automatically_verified" ? "Base técnica íntegra" : "Base técnica bloqueada"}</h3><p>{automaticAssurance.metrics.modulesPassed}/{automaticAssurance.metrics.modules} módulos · {automaticAssurance.metrics.totalRuns} células · {automaticAssurance.metrics.referenceReproduced} referências reproduzidas · {automaticAssurance.metrics.safelyBlocked} bloqueios seguros</p></div></div>
        <div className="professional-boundary"><span>RESPONSABILIDADE PROFISSIONAL</span><h3>Não é requisito para testar o motor</h3><p>Continua sendo uma camada separada quando um contador ou tributarista assumir, assinar e entregar uma análise de operação real ao cliente. O software não se apresenta como profissional habilitado.</p>{governance?.professionalApprovalVerified && governance.approval ? <small>Revisão adicional registrada por {governance.approval.reviewerName} · {governance.approval.professionalRegistration} · #{governance.identity.ruleHash}</small> : <small>Nenhuma assinatura adicional nesta versão — isso não bloqueia as referências automáticas.</small>}</div>
      </div>
    </section>}
  </div>;
}

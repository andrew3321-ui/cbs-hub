"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

type Status = "supported" | "partial" | "not_supported";
type StateRow = { uf: string; name: string; region: string; status: Status; officialPortal: string; generalRateBps: number; generalRateEffectiveFrom: string; generalRateSourceCode: string; fundName: string; generalFundRateBps: number | null; supported: string[]; blockers: string[] };
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
type AutoPartsFactKey = "productIdentityConfirmed" | "automotiveUseConfirmed" | "destinationInternalStConfirmed" | "taxpayerRolesConfirmed" | "operationPurposeConfirmed" | "noSpecialTreatmentConfirmed" | "priceBasisConfirmed" | "noSpecificRateExceptionConfirmed" | "documentsConfirmed";
type AutoPartsResult = { status: "calculated_reference" | "blocked" | "st_not_applicable_after_state_exclusion"; route: string; operationDate: string; product: { cest: string; ncm: string; description: string }; missingFacts: string[]; blockers: string[]; parameters: null | { commercialCondition: "fidelity" | "standard"; importedQualified: boolean; mvaOriginalBps: number; interstateRateBps: number; internalRateBps: number; fcpRateBps: number }; output: null | { mvaAppliedBps: number; stBaseCents: number; ownIcmsCents: number; presumedInternalIcmsCents: number; icmsStCents: number; fcpCents: number; destinationTotalCents: number }; sourceCodes: string[]; limitation: string };
type AutoPartsDossierLine = { code: string; label: string; formula: string; basis: string; amountCents: number | null; percentageBps: number | null; sourceCodes: string[]; status: "calculated" | "parameter" | "blocked" };
type AutoPartsDossierPreview = {
  generatedAt: string;
  title: string;
  coverage: { status: Status; label: string; reason: string; representativeScope: string };
  rule: { code: string; version: string; fingerprint: string; checkedAt: string; effectiveFrom: string; effectiveTo: string; scheduledTransition: null | { effectiveFrom: string; description: string } };
  operation: { route: string; operationDate: string; operationCents: number; ownIcmsBaseCents: number; cest: string; ncm: string; productDescription: string; importedQualified: boolean; commercialCondition: string; confirmedFacts: Array<{ code: string; label: string; confirmed: boolean }> };
  calculation: { status: "calculated_conditional" | "needs_information" | "not_applicable"; statusLabel: string; lines: AutoPartsDossierLine[]; blockers: string[]; warnings: string[]; requiredConfirmations: string[]; disclaimer: string };
  evidence: { sources: Array<{ code: string; title: string; publisher: string; url: string; checkedAt: string; proves: string[] }>; limitations: string[] };
  clientReport: { ready: boolean; label: string; deliveryCondition: "professional_review_required" };
};
type AutoPartsDossierRecord = { id: string; status: string; reportUrl: string };
type CompanyOption = { id: number; name: string };
type BeverageDossierPreview = {
  generatedAt: string;
  title: string;
  coverage: { status: Status; label: string; reason: string; representativeScope: string };
  rule: { code: string; version: string; fingerprint: string; checkedAt: string; effectiveFrom: string; effectiveTo: string };
  operation: { route: string; operationDate: string; operationCents: number; ownIcmsBaseCents: number; quantityUnits: number; profileCode: string; productDescription: string; cest: string; ncms: readonly string[]; legalDescription: string; packageType: string; volumeRange: string; commercialUnit: "individual_unit" | "integral_pack" | "not_confirmed"; commercialUnitUnits: number | null; pmpfUnitCents: number | null; importedQualified: boolean; confirmedFacts: Array<{ code: string; label: string; confirmed: boolean }> };
  calculation: { status: "calculated_conditional" | "needs_information"; statusLabel: string; lines: AutoPartsDossierLine[]; blockers: string[]; warnings: string[]; requiredConfirmations: string[]; disclaimer: string };
  evidence: { sources: Array<{ code: string; title: string; publisher: string; url: string; checkedAt: string; proves: string[] }>; limitations: string[] };
  clientReport: { ready: boolean; label: string; deliveryCondition: "professional_review_required" };
};
type StAutoPartsHighUseRoute = { corridorRank: number; direction: "outbound" | "return"; origin: string; destination: string; route: string; agreementStatus: "protocol_41_active" | "outside_protocol_41"; agreementReason: string; responsibleParty: "interstate_sender_as_tax_substitute_subject_to_protocol_exceptions" | null; directionalSymmetryAssumed: false; parameterMethod: "protocol_mva" | "destination_internal_mva" | "destination_own_treatment_required"; mvaOriginalBps: number | null; adjustedMvaBpsFor12: number | null; calculationStatus: "synthetic_reference_reproduced" | "blocked_destination_parameters" | "blocked_protocol_not_applicable"; sourceCodes: string[]; remainingBlockers: string[]; scheduledReview: null | { effectiveFrom: string; reason: string; sourceCode: string }; syntheticReference: null | { destinationTotalCents: number } };
type StAutoPartsProduct = { rank: number; code: string; cest: string; ncmPatterns: readonly string[]; description: string; commercialLabel: string; legalConditions: readonly string[]; exclusions: readonly string[] };
type StAutoPartsProductRouteCell = { key: string; productCode: string; route: string; status: Status; effectiveFrom: string; effectiveTo: string; legalResolution: string; responsibleParty: StAutoPartsHighUseRoute["responsibleParty"]; blockers: string[]; syntheticReference: null | { destinationTotalCents: number } };
type StAutoPartsHighUseCorridors = { version: string; fingerprint: string; validation: { passed: boolean; errors: string[] }; metrics: { corridors: number; directedRoutes: number; controlledProducts: number; newlyControlledProducts: number; productRouteCells: number; supportedProductRouteCells: number; partialProductRouteCells: number; notSupportedProductRouteCells: number; deterministicProductRouteMemories: number; deterministicProductRouteCases: number; calculatedProductRouteCases: number; safelyBlockedProductRouteCases: number; failedProductRouteCases: number; activeAgreementRoutes: number; outsideProtocolRoutes: number; protocolMvaRoutes: number; destinationMvaRoutes: number; syntheticReferencesReproduced: number; safelyBlocked: number; scheduledLegalReviews: number; officialSources: number }; supportedPeriod: { from: string; to: string }; spExclusionFrom: string; operationFactLabels: Record<AutoPartsFactKey, string>; products: StAutoPartsProduct[]; productRouteCells: StAutoPartsProductRouteCell[]; productRouteAuditCases: Array<{ code: string; cellKey: string; kind: string; passed: boolean }>; sources: Array<{ code: string; title: string; publisher: string; url: string }>; routes: StAutoPartsHighUseRoute[]; policy: string };
type ColdBeverageFactKey = "productIdentityConfirmed" | "taxpayerOperationConfirmed" | "responsiblePartyConfirmed" | "noProtocolExceptionConfirmed" | "destinationInternalTreatmentConfirmed" | "officialPriceMethodConfirmed" | "stateRatesConfirmed" | "documentsConfirmed";
type ColdBeverageProductCode = "SOFT_DRINK_PET" | "SOFT_DRINK_CAN" | "ENERGY_CAN" | "ENERGY_PET" | "ISOTONIC" | "WATER_GLASS";
type ColdBeverageProduct = { code: ColdBeverageProductCode; label: string; cest: string; ncms: readonly string[]; family: string };
type ColdBeverageRoute = { corridorRank: number; direction: "outbound" | "return"; origin: string; destination: string; route: string; priorityBasis: "internal_operational_heuristic"; directionalSymmetryAssumed: false; pricingGate: "official_price_first_then_destination_mva" | "official_price_first_then_protocol_mva"; sourceCodes: string[] };
type ColdBeverageApplicability = { route: string; productCode: ColdBeverageProductCode; status: "protocol_scoped_parameters_pending" | "protocol_not_applicable"; reason: string; effectiveExceptionFrom: string | null; pricingGate: ColdBeverageRoute["pricingGate"] };
type ColdBeverageResult = { status: "scoped_parameters_pending" | "protocol_not_applicable" | "blocked"; route: string; operationDate: string; product: ColdBeverageProduct | null; pricingGate: ColdBeverageRoute["pricingGate"] | null; missingFacts: string[]; blockers: string[]; nextChecks: string[]; sourceCodes: string[]; output: null; limitation: string };
type StColdBeveragesPriority = { version: string; fingerprint: string; validation: { passed: boolean; errors: string[] }; metrics: { corridors: number; directedRoutes: number; productIdentities: number; productRouteCells: number; protocolScopedCells: number; explicitExceptionCells: number; finalCalculationsReleased: number; officialSources: number }; supportedPeriod: { from: string; to: string }; spWaterExclusionFrom: string; operationFactLabels: Record<ColdBeverageFactKey, string>; products: ColdBeverageProduct[]; sources: Array<{ code: string; title: string; publisher: string; url: string }>; routes: ColdBeverageRoute[]; applicability: ColdBeverageApplicability[]; policy: string };
type ColdBeverageSpFactKey = "exactProfileConfirmed" | "unlistedBrandEligibilityConfirmed" | "normalTaxRegimeConfirmed" | "taxpayerResaleOperationConfirmed" | "substituteResponsibilityConfirmed" | "noProtocolExceptionConfirmed" | "ownTaxBaseConfirmed" | "noSpecialTreatmentConfirmed" | "documentsConfirmed";
type ColdBeverageSpProfileCode = "UNLISTED_SOFT_DRINK_PET_1751_2000" | "UNLISTED_SOFT_DRINK_CAN_311_360" | "UNLISTED_ENERGY_CAN_311_360" | "UNLISTED_ENERGY_PET_ABOVE_1500" | "UNLISTED_ISOTONIC_PET_401_660" | "COCA_COLA_PET_1751_2000" | "COCA_COLA_CAN_311_360" | "COCA_COLA_ZERO_PET_1751_2000" | "FANTA_PET_1751_2000" | "COCA_COLA_PACK_6_CAN_350";
type ColdBeverageSpProfile = { code: ColdBeverageSpProfileCode; productCode: Exclude<ColdBeverageProductCode, "WATER_GLASS">; label: string; cest: string; ncms: readonly string[]; legalDescription: string; brandRule: "demais_marcas_nao_listadas" | "marca_exata_listada"; packageType: "PET" | "LATA"; volumeRange: string; commercialUnit: "individual_unit" | "integral_pack"; commercialUnitUnits: number; priorityRank: number; priorityBasis: "internal_operational_heuristic"; pmpfCents: number; legalTableItem: string; effectiveFrom: string; effectiveTo: string };
type ColdBeverageSpResult = { status: "calculated_reference" | "pmpf_fallback_required" | "blocked"; route: string; operationDate: string; profile: ColdBeverageSpProfile | null; missingFacts: string[]; blockers: string[]; parameters: null | { quantityUnits: number; pmpfUnitCents: number; pmpfLimitCents: number; interstateRateBps: number; internalRateBps: number; fcpRateBps: number; importedQualified: boolean }; output: null | { stBaseCents: number; ownIcmsCents: number; presumedInternalIcmsCents: number; icmsStCents: number; fcpCents: number; destinationTotalCents: number }; sourceCodes: string[]; limitation: string };
type StColdBeveragesSpDestination = { version: string; fingerprint: string; validation: { passed: boolean; errors: string[] }; metrics: { inboundRoutes: number; exactPmpfProfiles: number; controlledCells: number; reproducedMemories: number; safeFailures: number; officialSources: number; coverage: { supported: number; partial: number; notSupported: number } }; supportedPeriod: { from: string; to: string }; factLabels: Record<ColdBeverageSpFactKey, string>; routes: Array<{ corridorRank: number; origin: string; destination: "SP"; route: string; agreement: "protocol_11_1991"; domesticInterstateRateBps: 1200; importedQualifiedRateBps: 400; directionalSymmetryAssumed: false }>; profiles: ColdBeverageSpProfile[]; runs: Array<{ key: string; route: string; profileCode: ColdBeverageSpProfileCode; status: "calculated_reference" | "pmpf_fallback_required" | "blocked"; coverageStatus: Status }>; sources: Array<{ code: string; title: string; publisher: string; url: string }>; policy: string };
type ColdBeverageSpOriginFactKey = "exactProfileConfirmed" | "normalTaxRegimeConfirmed" | "taxpayerResaleOperationConfirmed" | "substituteResponsibilityConfirmed" | "noProtocolExceptionConfirmed" | "ownTaxBaseConfirmed" | "destinationRatesConfirmed" | "noSpecialTreatmentConfirmed" | "documentsConfirmed";
type ColdBeverageSpOriginProfileCode = "MG_COCA_COLA_PET_2000" | "MG_COCA_COLA_CAN_350" | "MG_RED_BULL_CAN_250_270" | "MG_MONSTER_CAN_473_500" | "MG_GATORADE_PET_500_520" | "RJ_COCA_COLA_PET_1751_2000" | "RJ_COCA_COLA_CAN_271_400" | "RJ_RED_BULL_CAN_UP_TO_310" | "RJ_MONSTER_CAN_361_660" | "RJ_GATORADE_PET_401_660";
type ColdBeverageSpOriginProfile = { code: ColdBeverageSpOriginProfileCode; destination: "MG" | "RJ"; family: "refrigerante" | "energetico" | "isotonico"; label: string; brand: string; packageType: "PET" | "LATA"; volumeRange: string; cest: string; ncms: readonly string[]; legalDescription: string; commercialUnit: "individual_unit"; commercialUnitUnits: 1; pmpfCents: number; legalTableItem: string; effectiveFrom: string; effectiveTo: string };
type ColdBeverageSpOriginResult = { status: "calculated_reference" | "pmpf_fallback_required" | "blocked"; route: string; operationDate: string; profile: ColdBeverageSpOriginProfile | null; missingFacts: string[]; blockers: string[]; parameters: null | { quantityUnits: number; pmpfUnitCents: number; pmpfLimitCents: number; pmpfLimitBps: number; fallbackComparison: "greater_than" | "greater_than_or_equal"; interstateRateBps: number; internalRateBps: number; fcpRateBps: number; importedQualified: boolean }; output: null | { stBaseCents: number; ownIcmsCents: number; presumedInternalIcmsCents: number; icmsStCents: number; fcpCents: number; destinationTotalCents: number }; sourceCodes: string[]; limitation: string };
type StColdBeveragesSpOrigin = { version: string; fingerprint: string; validation: { passed: boolean; errors: string[] }; metrics: { outboundRoutes: number; exactPmpfProfiles: number; controlledCells: number; reproducedMemories: number; safeFailures: number; officialSources: number; coverage: { supported: number; partial: number; notSupported: number } }; supportedPeriod: { from: string; to: string }; factLabels: Record<ColdBeverageSpOriginFactKey, string>; routes: Array<{ route: "SP-MG" | "SP-RJ"; origin: "SP"; destination: "MG" | "RJ"; priorityRank: number; internalRateBps: number; fcpRateBps: number; pmpfLimitBps: number; fallbackComparison: "greater_than" | "greater_than_or_equal" }>; profiles: ColdBeverageSpOriginProfile[]; runs: Array<{ key: string; route: string; profileCode: ColdBeverageSpOriginProfileCode; status: "calculated_reference" | "pmpf_fallback_required" | "blocked"; coverageStatus: Status }>; sources: Array<{ code: string; title: string; publisher: string; url: string }>; policy: string };
type StConstructionElectricalPriority = { version: string; fingerprint: string; validation: { passed: boolean; errors: string[] }; metrics: { priorityProducts: number; productFamilies: number; priorityRoutes: number; controlledCells: number; reproducedMemories: number; safeFailureScenarios: number; officialSources: number; coverage: { supported: number; partial: number; notSupported: number } }; supportedPeriod: { from: string; to: string }; products: Array<{ code: string; priorityRank: number; family: "construction" | "finishing" | "tools" | "electrical"; label: string; cest: string; ncmScope: readonly string[]; description: string; exclusions: readonly string[]; routeParameters: Record<"SP-MG" | "SP-RJ", { mvaOriginalBps: number; publishedAdjustedMvaBpsFor12: number }> }>; routes: Array<{ route: "SP-MG" | "SP-RJ"; origin: "SP"; destination: "MG" | "RJ"; responsibility: "origin_remitter" | "destination_entry_taxpayer"; internalRateBps: number; fcpRateBps: number; explanation: string }>; referenceRuns: Array<{ key: string; route: "SP-MG" | "SP-RJ"; productCode: string; result: { status: "calculated_reference"; coverageStatus: "supported"; responsibility: "origin_remitter" | "destination_entry_taxpayer"; parameters: { mvaOriginalBps: number; mvaAdjustedBps: number; internalRateBps: number; fcpRateBps: number }; output: { destinationTotalCents: number }; sourceCodes: string[] } }>; negativeRuns: Array<{ code: string; result: { status: string; coverageStatus: Status; blockers: string[]; output: null } }>; sources: Array<{ code: string; title: string; publisher: string; url: string }>; policy: string; nationalExpansion: { version: string; checkedAt: string; fingerprint: string; validation: { passed: boolean; errors: string[] }; metrics: { priorityProducts: number; productFamilies: number; priorityRoutes: number; controlledCells: number; reproducedMemories: number; deterministicCases: number; safeFailureScenarios: number; officialSources: number; coverage: { supported: number; partial: number; notSupported: number } }; identities: Array<{ code: string; priorityRank: number; family: string; label: string; cest: string; ncm: string; description: string; presentation: string; exclusions: string[] }>; routes: string[]; cells: Array<{ key: string; productCode: string; route: string; status: Status; method: "mva" | "no_st" | null; responsibility: string | null; effectiveFrom: string | null; output: { destinationTotalCents: number } | null; blockers: string[] }>; sources: Array<{ code: string; title: string; publisher: string; url: string }>; policy: string } };
type StFoodCleaningPetPriority = { version: string; fingerprint: string; validation: { passed: boolean; errors: string[] }; metrics: { priorityProducts: number; productFamilies: number; priorityRoutes: number; controlledCells: number; reproducedMemories: number; mvaMemories: number; pmpfMemories: number; safeFailureScenarios: number; officialSources: number; coverage: { supported: number; partial: number; notSupported: number } }; supportedPeriod: { from: string; to: string }; products: Array<{ code: string; priorityRank: number; family: "food" | "cleaning" | "household_hygiene" | "pet_food"; label: string; cest: string; ncm: string; presentation: string; description: string; exclusions: string[] }>; routes: Array<{ route: string; origin: string; destination: string; coverageStatus: Status; responsibility: "origin_remitter" | null; blockers: readonly string[] }>; referenceRuns: Array<{ key: string; route: string; productCode: string; result: { status: "calculated_reference" | "blocked" | "not_applicable"; coverageStatus: Status; method: "mva" | "pmpf" | null; output: null | { destinationTotalCents: number }; blockers: string[] } }>; sources: Array<{ code: string; title: string; publisher: string; url: string }>; policy: string };
type Scenario = { code: string; tax: string; title: string; status: Status; supported: string[]; blockers: string[] };
type IssTechnicalReview = { status: "passed"; reviewerKind: "platform_technical_review"; reviewedAt: string; sourceCatalogReview: "reviewed"; rateReferenceStatus: "located_for_mapping" | "pending_exact_table"; passedChecks: string[]; professionalReview: "not_claimed"; taxHomologation: "not_claimed"; limitation: string };
type IssSpecialTreatment = { status: "separate_analysis_required"; conclusion: string; requiredFacts: string[]; sourceCodes: string[] };
type IssDeepProfile = { code: string; ibgeCode: string; city: string; uf: string; stage: "structured"; sourceCodes: string[]; serviceCoverageCodes: string[]; supportedOutputs: string[]; hardStops: string[]; technicalReview: IssTechnicalReview; placeOfIncidence: { generalRule: string; requiredFacts: string[] }; withholding: { conclusion: "requires_facts"; requiredFacts: string[] }; specialTreatments: { export: IssSpecialTreatment; professionalSociety: IssSpecialTreatment; specialRegime: IssSpecialTreatment } };
type IssDeepServiceCoverage = { code: string; profileCode: string; ibgeCode: string; lc116Item: string; municipalServiceCode: string | null; description: string; coverageStatus: Status; rate: { status: "exact" | "pending_exact_table"; bps: number | null; rangeBps: [number, number] }; placeOfIncidence: { status: "supported_in_controlled_scenario" | "requires_facts"; conclusion: string }; withholding: { status: "supported_in_controlled_scenario" | "requires_facts"; responsible: "provider" | null; conclusion: string }; controlledScenario: string; exceptions: string[]; benefits: string[]; effectiveFrom: string | null; effectiveTo: string | null; version: string; checkedAt: string; sourceCodes: string[]; exactReferences: string[]; calculationSupported: boolean; blockers: string[]; audit: { municipalClassifierStatus: "exact" | "pending_exact_classifier"; rateEvidenceStatus: "exact_municipal_rule" | "pending_exact_municipal_table"; effectiveRuleStatus: "exact" | "pending_exact_effective_rule"; withholdingResponsibilityStatus: "exact" | "requires_operation_facts"; sourceLinkStatus: "verified_at_least_one_official_source"; verifiedSourceCodes: string[]; pendingSourceCodes: string[]; conclusion: string } };
type IssDeepSource = { code: string; title: string; publisher: string; url: string; checkedAt: string; kind: "municipal_law" | "rate_table" | "operational_guidance"; legalReference: string; linkAudit: { status: "verified_reachable" | "official_server_recheck_required"; auditedAt: string; method: string } };
type IssTechnicalEvidence = IssTechnicalReview & { profileCode: string; ibgeCode: string; evidenceHash: string };
type AutomaticAssurance = { version: string; checkedAt: string; fingerprint?: string; status: "automatically_verified" | "blocked"; professionalOpinion: false; humanReviewRequired: false; statement: string; metrics: { modules: number; modulesPassed: number; totalRuns: number; referenceReproduced: number; safelyBlocked: number; failed: number }; modules: Array<{ code: string; label: string; passed: boolean; errors: string[] }>; errors: string[] };
type RegressionDistribution = { deterministicCases: number; calculatedMemories: number; safelyBlockedCases: number; target: number; targetReached: boolean; caseAccountingValid: boolean };
type FiscalRegressionReport = { reportVersion: string; checkedAt: string; status: "automatically_verified" | "blocked"; fingerprint: string; metrics: { modules: number; modulesPassed: number; deterministicCases: number; calculatedMemories: number; safelyBlockedCases: number; catalogued: number; structured: number; tested: number; approved: number; caseTarget: number; targetReached: boolean; remainingToTarget: number; majorModuleDistribution: Record<string, RegressionDistribution>; importDistribution: RegressionDistribution & { moduleCode: string | null } }; modules: Array<{ code: string; label: string; ruleVersion: string; status: "passed" | "failed"; maturity: { catalogued: boolean; structured: boolean; tested: boolean; approved: boolean } }>; errors: string[] };
type PublicCoverageIndicator = { version: string; checkedAt: string; matrix: Array<{ code: string; tax: string; title: string; dimension: string; jurisdiction: string; status: Status; maturity: { catalogued: boolean; structured: boolean; tested: boolean; approved: boolean }; checkedAt: string; officialSources: Array<{ code: string; title: string; publisher: string; url: string; checkedAt: string }>; regression: { cases: number; failures: number }; objectiveReason: string; blockers: string[]; classificationContract: { status: Status; surfaces: string[] } }>; maturityTotals: { catalogued: number; structured: number; tested: number; approved: number }; statusTotals: Record<Status, number>; regressionTotals: { cases: number; failures: number; modules: number }; changeHistory: Array<{ id: string; changedAt: string; version: string; summary: string; affectedCodes: string[]; clientDataExposed: false }>; privacy: { clientDataIncluded: false; statement: string }; classificationPolicy: { surfaces: string[]; statement: string } };
type StPharmaCosmeticsPriority = { version: string; checkedAt: string; fingerprint: string; validation: { passed: boolean; errors: string[] }; metrics: { rankedProducts: number; rankedRoutes: number; legalRouteProfiles: number; parameterProfiles: number; exactNoStProfiles: number; conditionalProfiles: number; explicitlyUnavailableProfiles: number; controlledCells: number; supportedCells: number; partialCells: number; notSupportedCells: number; deterministicMemories: number; safeFailures: number; verificationCases: number; positiveCases: number; negativeCases: number; temporalCases: number; identityDivergentCases: number; officialSources: number }; priorityEvidence: { method: string; criteria: readonly string[]; sourceCodes: readonly string[] }; products: Array<{ code: string; family: "medicine" | "cosmetics" | "perfumery" | "personal_hygiene"; priorityRank: number; cest: string; ncms: readonly string[]; presentation: string; description: string; federalTreatment: string }>; routes: Array<{ route: string; priorityRank: number }>; legalRoutes: Array<{ route: string; effectiveFrom: string; effectiveTo: string | null; agreementStatus: string; responsibility: string; sourceCodes: readonly string[] }>; stateRules: Array<{ key: string; destination: "SP" | "MG" | "RJ" | "PR" | "SC" | "RS" | "GO" | "BA"; productCode: string; effectiveFrom: string; effectiveTo: string | null; scope: string; responsibility: string; agreementStatus: string; baseMethod: string; mvaOriginal: { status: string; bps: number | null; note: string }; internalRate: { status: string; bps: number | null; note: string }; fcpRate: { status: string; bps: number | null; note: string }; reductions: string[]; benefits: string[]; exceptions: string[]; sourceCodes: string[]; parameterStatus: "exact_no_st" | "complete_conditional" | "explicitly_unavailable"; calculationReleased: boolean }>; cells: Array<{ key: string; route: string; productCode: string; family: string; status: Status; treatment: string; effectiveFrom: string; blockers: string[]; reason: string; parameterStatus: string; agreementStatus: string; responsibility: string }>; sources: Array<{ code: string; title: string; publisher: string; url: string }>; policy: string };
type Coverage = { version: string; checkedAt: string; fingerprint: string; automaticAssurance?: AutomaticAssurance; regressionReport: FiscalRegressionReport; coverageIndicator: PublicCoverageIndicator; sourceCertification: { version: string; checkedAt: string; fingerprint: string; validation: { passed: boolean; errors: string[]; sources: number }; metrics: { total: number; status: { confirmed: number; pending: number; unavailable: number }; sourceClass: { primary: number; official_index: number; official_guidance: number }; taxes: number; jurisdictions: number; impactedRules: number; officialHosts: number }; liveProbe: { uniqueUrls: number; checked: number; pending: number; unavailable: number; policy: string }; affectedRules: Array<{ ruleCode: string; sources: number; confirmed: number; pending: number; unavailable: number }> }; metrics: { states: number; cities: number; deepIssCities: number; stSegments: number; recurringScenarios: number; supported: number; partial: number; notSupported: number; sourceCount: number }; states: StateRow[]; cities: CityRow[]; issDeep: { version: string; checkedAt: string; metrics: { structuredCities: number; officialSources: number; sourceCatalogReviewedCities: number; technicalGateValidatedCities: number; rateReferenceLocatedCities: number; testedCities: number; serviceCoverageRows: number; supportedServiceRules: number; partialServiceRules: number; professionallyApprovedCities: number; automaticHomologation: false }; profiles: IssDeepProfile[]; serviceCoverage: IssDeepServiceCoverage[]; sources: IssDeepSource[]; technicalEvidence: IssTechnicalEvidence[]; policy: string }; stSegments: Segment[]; stSpMg: { version: string; fingerprint: string; validation: { passed: boolean; errors: string[] }; metrics: { totalSegments: number; legalGatesStructured: number; calculationsValidated: number; calculationsBlocked: number; officialSources: number }; packages: StSpMgPackage[]; policy: string }; stSpOriginMatrix: StSpOriginMatrix; stRepresentativeProducts: { version: string; fingerprint: string; validation: { passed: boolean; errors: string[] }; source: { title: string; url: string }; products: StRepresentativeProduct[]; policy: string }; stSpCalculationValidation: StCalculationValidation; stCementSpRoutes: StCementSpRoutes; stCementPriorityBatch: StCementPriorityBatch; stAutoPartsPriorityBatch: StAutoPartsPriorityBatch; stAutoPartsHighUseCorridors: StAutoPartsHighUseCorridors; stColdBeveragesPriority: StColdBeveragesPriority; stColdBeveragesSpDestination: StColdBeveragesSpDestination; stColdBeveragesSpOrigin: StColdBeveragesSpOrigin; stPharmaCosmeticsPriority: StPharmaCosmeticsPriority; stConstructionElectricalPriority: StConstructionElectricalPriority; stFoodCleaningPetPriority: StFoodCleaningPetPriority; recurringScenarios: Scenario[]; sources: Array<{ code: string; title: string; publisher: string; url: string }> };
type Governance = { identity: { ruleCode: string; ruleVersion: string; ruleHash: string }; automaticAssurance: AutomaticAssurance; approval: null | { reviewerName: string; professionalRole: string; professionalRegistration: string; decidedAt: string; verified: boolean }; executionEnabled: boolean; professionalApprovalVerified: boolean; professionalApprovalRequiredForReferences: false; canApprove: boolean; error?: string };
type Monitor = {
  version: string;
  catalogValidation: { passed: boolean; errors: string[]; sources: number };
  operationalStatus: { level: "healthy" | "in_progress" | "attention" | "blocked"; cycleDate: string; timezone: "UTC"; title: string };
  queueBreakdown: { total: number; newSources: number; potentiallyNormative: number; editorial: number; technical: number; unavailable: number; recovered: number; legacyContentChanged: number };
  rotation: { offset: number; totalSources: number; cycleDays: number };
  metrics: {
    monitored: number; checkedToday: number; scheduledToday: number; attemptedToday: number; checked: number; unavailableToday: number; dailyShardsCompleted: number; dailyShardsTotal: number; expectedShardsToday: number; delayedShardsToday: number; failedShardsToday: number; runningShardsToday: number; retriedShardsToday: number; sourcesWithBaseline: number; sourcesWithoutBaseline: number; unavailable: number; changeSignals: number;
    pendingReview: number; awaitingNewVersion: number; invalidatedResults: number; unreadNotifications: number;
    expiringRules: number; expiredRules: number; unverifiableSources: number;
    potentiallyNormative: number; technicalOrEditorial: number; connectorIncidents: number;
  };
  connectorHealth: {
    contract: { passed: boolean; errors: string[]; connectors: number; sourceCodes: number };
    connected: number; parsed: number; blocked: number; openIncidents: number;
    incidents: Array<{ id: string; sourceCode: string; connectorId: string; incidentKind: string; status: string; detectedAt: string; resolvedAt: string | null }>;
  };
  sources: Array<{
    code: string; title: string; publisher: string; jurisdiction: string; legalDevice: string;
    sourceKind: string; url: string; effectiveFrom: string | null; effectiveTo: string | null;
    verificationStatus: string; impactedRuleCodes: string[]; captureStatus: string;
    httpStatus: number | null; checkedAt: string | null; contentFingerprint: string | null;
    normalizedFingerprint: string | null; finalUrl: string | null; accessPath: string; attempts: number;
    bytesHashed: number; alternativeHttpStatus: number | null; failureCode: string | null; criticality: string;
    monitoringFrequency: string; officialAlternativeUrl: string | null; alternativeEvidenceScope: string;
    connectorId: string | null; connectorContractVersion: string | null; artifactKind: string | null;
    parserVersion: string | null; parseStatus: string; detectedVersion: string | null; publishedAt: string | null;
    detectedEffectiveFrom: string | null; promotionStatus: string; contractErrors: string[]; notModified: boolean;
  }>;
  queue: Array<{
    id: string; sourceCode: string; title: string; publisher: string; jurisdiction: string;
    legalDevice: string; sourceUrl: string; changeKind: string; status: string;
    impactedRuleCodes: string[]; detectedAt: string;
  }>;
  changeHistory: Array<{
    id: string; sourceCode: string; title: string; changeKind: string; status: string;
    impactedRuleCodes: string[]; detectedAt: string; resolvedAt: string | null; resolutionReleaseId: string | null;
  }>;
  invalidations: Array<{ id: string; eventId: string; dossierId: string; ruleCode: string; ruleVersion: string; status: string; reason: string; createdAt: string }>;
  rules: Array<{ id: number; code: string; version: string; name: string; approvalStatus: string; effectiveFrom: string; effectiveTo: string; sourceCount: number; fingerprint: string; health: "current" | "future" | "expiring" | "expired" | "missing_source" }>;
  runs: Array<{ id: string; runDate: string; status: string; sourceCount: number; checked: number; unavailable: number; changes: number; attempts: number; startedAt: string; lastAttemptAt: string; finishedAt: string | null; errorCode: string | null }>;
  releases: Array<Record<string, string | number | null>>;
  freshness: {
    version: string;
    generatedAt: string;
    sla: Record<"critical" | "high" | "standard", { hours: number; warningHours: number; label: string }>;
    metrics: { total: number; current: number; partial: number; notSupported: number; dueSoon: number; overdue: number; unavailable: number; notChecked: number; pendingChanges: number; openIncidents: number; level: "current" | "attention" | "degraded" | "insufficient_evidence" };
    sources: Array<{ code: string; title: string; publisher: string; jurisdiction: string; sourceUrl: string; sourceVersion: string; contentFingerprint: string | null; checkedAt: string | null; captureStatus: string; criticality: "critical" | "high" | "standard"; impactedRuleCodes: string[]; pendingChange: boolean; openIncident: boolean; fingerprint: string; status: "current" | "due_soon" | "overdue" | "unavailable" | "not_checked"; reason: string; slaHours: number; warningHours: number; ageMinutes: number | null; deadlineAt: string | null; coverageEffect: Status }>;
    impactedRules: Array<{ code: string; effect: Status; sources: string[]; reasons: string[] }>;
    timing: Record<"detect" | "block" | "correct" | "recertify", { samples: number; averageMinutes: number | null; p95Minutes: number | null; maximumMinutes: number | null }>;
    policy: string;
    observations: Array<Record<string, string | number | null>>;
    alerts: Array<Record<string, string | number | null>>;
    summaries: Array<Record<string, unknown>>;
    incidents: Array<Record<string, string | number | null>>;
    releases: Array<Record<string, string | number | null>>;
  };
  canReviewNormativeChanges: boolean;
  policy: string;
  error?: string;
};
type GovernanceReview = {
  eventId: string;
  professionalRole: "accountant" | "tax_lawyer";
  professionalRegistration: string;
  decision: "no_legal_impact" | "new_version_required" | "superseded_by_new_version";
  decisionNote: string;
  releaseVersion: string;
  releaseSummary: string;
  declarationAccepted: boolean;
};
type BatchResult = {
  batchId: string;
  clientBatchKey: string;
  status: "processing" | "completed";
  progress: { processed: number; total: number; percentage: number };
  metrics: { total: number; accepted: number; warning: number; blocked: number };
  items: Array<{
    ordinal: number;
    filename: string;
    documentType: string;
    status: "accepted" | "warning" | "blocked";
    sourceHash: string;
    evidenceHash: string;
    adapterCode: string | null;
    coverageStatus: "supported" | "partial" | "not_supported";
    calculationEligible: boolean;
    issues: string[];
    issueDetails: Array<{ code: string; severity: string; category: string; message: string }>;
    calculationBlockers: string[];
    summary: Record<string, string | number | boolean | null>;
  }>;
  message: string;
  error?: string;
};

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

function normativeChangeLabel(kind: string, status: string) {
  if (kind === "new_source") return "NOVA FONTE";
  if (kind === "potentially_normative_change") return "POTENCIALMENTE NORMATIVA";
  if (kind === "editorial_change") return "EDITORIAL";
  if (kind === "technical_change") return "TÉCNICA";
  if (kind === "unavailable") return "INDISPONÍVEL";
  if (kind === "recovered") return "RECUPERADA";
  if (kind === "content_changed") return "CONTEÚDO ALTERADO";
  return status === "pending_review" ? "REVISAR" : "NOVA VERSÃO";
}

function freshnessLabel(status: Monitor["freshness"]["sources"][number]["status"]) {
  if (status === "current") return "DENTRO DO SLA";
  if (status === "due_soon") return "REVISÃO PRÓXIMA";
  if (status === "overdue") return "SLA VENCIDO";
  if (status === "unavailable") return "FONTE INDISPONÍVEL";
  return "SEM CAPTURA-BASE";
}

function elapsedLabel(minutes: number | null) {
  if (minutes === null) return "sem amostra";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}min` : `${hours}h`;
}

function BeverageDossierPanel({
  preview,
  dossier,
  companies,
  companyId,
  setCompanyId,
  busy,
  onFreeze,
}: {
  preview: BeverageDossierPreview;
  dossier: AutoPartsDossierRecord | null;
  companies: CompanyOption[];
  companyId: string;
  setCompanyId: (value: string) => void;
  busy: boolean;
  onFreeze: () => void;
}) {
  const money = (value: number | null) => value === null ? "—" : (value / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return <section className="auto-parts-dossier-preview">
    <header><div><span>DOSSIÊ AUDITÁVEL DE BEBIDAS</span><h3>{preview.title}</h3><p>{preview.coverage.reason}</p></div><StatusPill status={preview.coverage.status} /></header>
    <div className="auto-parts-dossier-metadata">
      <article><small>PERFIL EXATO</small><b>{preview.operation.productDescription}</b><span>CEST {preview.operation.cest}</span></article>
      <article><small>VIGÊNCIA</small><b>{preview.rule.effectiveFrom} → {preview.rule.effectiveTo}</b><span>{preview.rule.version}</span></article>
      <article><small>PMPF UNITÁRIO</small><b>{money(preview.operation.pmpfUnitCents)}</b><span>{preview.operation.quantityUnits.toLocaleString("pt-BR")} unidade(s)</span></article>
      <article><small>INTEGRIDADE</small><b>#{preview.rule.fingerprint}</b><span>conferida em {preview.rule.checkedAt}</span></article>
    </div>
    <details><summary>Dados e nove fatos congelados</summary><div className="auto-parts-fact-ledger">{preview.operation.confirmedFacts.map((fact) => <span className={fact.confirmed ? "confirmed" : "pending"} key={fact.code}><i>{fact.confirmed ? "✓" : "!"}</i>{fact.label}</span>)}</div></details>
    <details open><summary>Memória reproduzível em centavos</summary><div className="auto-parts-memory-lines">{preview.calculation.lines.map((line, index) => <article className={line.status} key={line.code}><span>{String(index + 1).padStart(2, "0")}</span><div><small>{line.code}</small><b>{line.label}</b><p>{line.formula}</p><em>{line.basis}</em></div><strong>{line.amountCents !== null ? money(line.amountCents) : line.percentageBps !== null ? `${(line.percentageBps / 100).toFixed(2)}%` : "bloqueado"}</strong></article>)}</div></details>
    <details><summary>Fontes oficiais aplicadas</summary><div className="auto-parts-applied-sources">{preview.evidence.sources.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.code}><span>{source.publisher} · {source.code}</span><b>{source.title} ↗</b><small>Conferida em {source.checkedAt}</small><p>{source.proves.join(" · ")}</p></a>)}</div></details>
    {preview.calculation.blockers.length > 0 && <div className="auto-parts-dossier-blockers">{preview.calculation.blockers.map((blocker) => <span key={blocker}>{blocker}</span>)}</div>}
    <div className="auto-parts-dossier-actions">
      <label>Cliente do relatório<select value={companyId} onChange={(event) => setCompanyId(event.target.value)}><option value="">Sem cliente vinculado</option>{companies.map((company) => <option value={company.id} key={company.id}>{company.name}</option>)}</select></label>
      {!dossier && <button type="button" disabled={busy} onClick={onFreeze}>{busy ? "Congelando…" : "Congelar dossiê"}</button>}
      {dossier && <a href={dossier.reportUrl}>Abrir relatório fiscal →</a>}
      <span>{preview.clientReport.label}</span>
    </div>
    <footer><StatusPill status={preview.coverage.status} /><span>{preview.calculation.disclaimer}</span></footer>
  </section>;
}

function compatibleAutomaticAssurance(coverage: Coverage): AutomaticAssurance {
  if (coverage.automaticAssurance) return coverage.automaticAssurance;
  const validations = [coverage.stSpMg.validation, coverage.stSpOriginMatrix.validation, coverage.stRepresentativeProducts.validation, coverage.stSpCalculationValidation.validation, coverage.stCementSpRoutes.validation, coverage.stCementPriorityBatch.validation, coverage.stAutoPartsPriorityBatch.validation, coverage.stAutoPartsHighUseCorridors.validation, coverage.stColdBeveragesPriority.validation, coverage.stColdBeveragesSpDestination.validation, coverage.stColdBeveragesSpOrigin.validation, coverage.stConstructionElectricalPriority.validation, coverage.stConstructionElectricalPriority.nationalExpansion.validation, coverage.stFoodCleaningPetPriority.validation];
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
  const [freshnessFilter, setFreshnessFilter] = useState<"all" | "attention" | "degraded">("all");
  const [cityQuery, setCityQuery] = useState("");
  const [origin, setOrigin] = useState("SP");
  const [destination, setDestination] = useState("MG");
  const [importedQualified, setImportedQualified] = useState(false);
  const [icmsResult, setIcmsResult] = useState<{ rateBps: number | null; reason: string; destinationProfile: { generalRateBps: number; effectiveFrom: string; fundName: string; generalFundRateBps: number | null; classification: Status } } | null>(null);
  const [autoPartsRoute, setAutoPartsRoute] = useState("SP-MG");
  const [autoPartsProductCode, setAutoPartsProductCode] = useState("GENERAL_VEHICLE_PARTS_8708");
  const [autoPartsDate, setAutoPartsDate] = useState("");
  const [autoPartsValue, setAutoPartsValue] = useState("1000.00");
  const [autoPartsOwnBase, setAutoPartsOwnBase] = useState("1000.00");
  const [autoPartsCondition, setAutoPartsCondition] = useState<"" | "fidelity" | "standard">("");
  const [autoPartsImported, setAutoPartsImported] = useState(false);
  const [autoPartsFacts, setAutoPartsFacts] = useState<Record<AutoPartsFactKey, boolean>>({ productIdentityConfirmed: false, automotiveUseConfirmed: false, destinationInternalStConfirmed: false, taxpayerRolesConfirmed: false, operationPurposeConfirmed: false, noSpecialTreatmentConfirmed: false, priceBasisConfirmed: false, noSpecificRateExceptionConfirmed: false, documentsConfirmed: false });
  const [autoPartsResult, setAutoPartsResult] = useState<AutoPartsResult | null>(null);
  const [autoPartsDossierPreview, setAutoPartsDossierPreview] = useState<AutoPartsDossierPreview | null>(null);
  const [autoPartsDossier, setAutoPartsDossier] = useState<AutoPartsDossierRecord | null>(null);
  const [autoPartsCompanyId, setAutoPartsCompanyId] = useState("");
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
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
  const [beverageSpDossierPreview, setBeverageSpDossierPreview] = useState<BeverageDossierPreview | null>(null);
  const [beverageSpDossier, setBeverageSpDossier] = useState<AutoPartsDossierRecord | null>(null);
  const [beverageSpOriginRoute, setBeverageSpOriginRoute] = useState<"SP-MG" | "SP-RJ">("SP-MG");
  const [beverageSpOriginProfile, setBeverageSpOriginProfile] = useState<ColdBeverageSpOriginProfileCode>("MG_COCA_COLA_PET_2000");
  const [beverageSpOriginDate, setBeverageSpOriginDate] = useState("2026-07-25");
  const [beverageSpOriginQuantity, setBeverageSpOriginQuantity] = useState("100");
  const [beverageSpOriginOperationValue, setBeverageSpOriginOperationValue] = useState("715.80");
  const [beverageSpOriginOwnBase, setBeverageSpOriginOwnBase] = useState("715.80");
  const [beverageSpOriginImported, setBeverageSpOriginImported] = useState(false);
  const [beverageSpOriginFacts, setBeverageSpOriginFacts] = useState<Record<ColdBeverageSpOriginFactKey, boolean>>({ exactProfileConfirmed: false, normalTaxRegimeConfirmed: false, taxpayerResaleOperationConfirmed: false, substituteResponsibilityConfirmed: false, noProtocolExceptionConfirmed: false, ownTaxBaseConfirmed: false, destinationRatesConfirmed: false, noSpecialTreatmentConfirmed: false, documentsConfirmed: false });
  const [beverageSpOriginResult, setBeverageSpOriginResult] = useState<ColdBeverageSpOriginResult | null>(null);
  const [beverageSpOriginDossierPreview, setBeverageSpOriginDossierPreview] = useState<BeverageDossierPreview | null>(null);
  const [beverageSpOriginDossier, setBeverageSpOriginDossier] = useState<AutoPartsDossierRecord | null>(null);
  const [beverageCompanyId, setBeverageCompanyId] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);
  const initialLoadController = useRef<AbortController | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [batch, setBatch] = useState<BatchResult | null>(null);
  const [batchKey, setBatchKey] = useState("");
  const [governanceReview, setGovernanceReview] = useState<GovernanceReview>({
    eventId: "",
    professionalRole: "accountant",
    professionalRegistration: "",
    decision: "no_legal_impact",
    decisionNote: "",
    releaseVersion: "",
    releaseSummary: "",
    declarationAccepted: false,
  });

  const loadCoverage = useCallback(async () => {
    initialLoadController.current?.abort();
    const controller = new AbortController();
    initialLoadController.current = controller;
    setInitialLoading(true);
    setLoadError("");
    const requests = await Promise.allSettled([
      json<Coverage>("/api/public/coverage?schema=automatic-assurance-v1", { cache: "no-store", signal: controller.signal }),
      json<Governance>("/api/rule-governance", { signal: controller.signal }),
      json<Monitor>("/api/normative-monitor", { cache: "no-store", signal: controller.signal }),
      json<{ companies: CompanyOption[] }>("/api/companies", { cache: "no-store", signal: controller.signal }),
    ]);
    if (controller.signal.aborted) return;
    const [coverageRequest, governanceRequest, monitorRequest, companiesRequest] = requests;
    if (coverageRequest.status === "rejected") {
      setLoadError(coverageRequest.reason instanceof Error ? coverageRequest.reason.message : "A base nacional não respondeu.");
      setInitialLoading(false);
      return;
    }
    setCoverage(coverageRequest.value);
    if (governanceRequest.status === "fulfilled") setGovernance(governanceRequest.value);
    if (monitorRequest.status === "fulfilled") {
      setMonitor(monitorRequest.value);
      setGovernanceReview((current) => ({ ...current, eventId: current.eventId || monitorRequest.value.queue[0]?.id || "" }));
    }
    if (companiesRequest.status === "fulfilled") setCompanies(companiesRequest.value.companies.map(({ id, name }) => ({ id, name })));
    const optionalFailures = requests.slice(1).filter((request) => request.status === "rejected").length;
    if (optionalFailures) setError(`${optionalFailures} painel(is) auxiliar(es) não responderam. A cobertura principal continua disponível.`);
    setInitialLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadCoverage(), 0);
    return () => {
      window.clearTimeout(timer);
      initialLoadController.current?.abort();
    };
  }, [loadCoverage]);

  const cities = useMemo(() => coverage?.cities.filter((item) => `${item.city} ${item.uf}`.toLocaleLowerCase("pt-BR").includes(cityQuery.toLocaleLowerCase("pt-BR"))) ?? [], [coverage, cityQuery]);
  const issDeepProfiles = useMemo(() => new Map(coverage?.issDeep.profiles.map((item) => [item.ibgeCode, item]) ?? []), [coverage]);
  const issDeepSources = useMemo(() => new Map(coverage?.issDeep.sources.map((item) => [item.code, item]) ?? []), [coverage]);
  const issServiceCoverage = useMemo(() => {
    const byCity = new Map<string, IssDeepServiceCoverage[]>();
    for (const item of coverage?.issDeep.serviceCoverage ?? []) byCity.set(item.ibgeCode, [...(byCity.get(item.ibgeCode) ?? []), item]);
    return byCity;
  }, [coverage]);
  const issTechnicalEvidence = useMemo(() => new Map(coverage?.issDeep.technicalEvidence.map((item) => [item.ibgeCode, item]) ?? []), [coverage]);
  const stSpMgPackages = useMemo(() => new Map(coverage?.stSpMg.packages.map((item) => [item.segmentCode, item]) ?? []), [coverage]);
  const spOriginReferenceCount = useMemo(() => new Map(coverage?.stSpOriginMatrix.destinations.map((destination) => [destination.uf, coverage.stSpOriginMatrix.cells.filter((cell) => cell.destination === destination.uf && cell.status === "existing_validated_reference").length]) ?? []), [coverage]);

  const calculateIcms = async (event: FormEvent) => {
    event.preventDefault(); setBusy("icms"); setError(""); setIcmsResult(null);
    try {
      const payload = await json<{ result: { rateBps: number | null; reason: string }; destinationProfile: { generalRateBps: number; effectiveFrom: string; fundName: string; generalFundRateBps: number | null; classification: Status } }>("/api/national-coverage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ origin, destination, importedQualified }) });
      setIcmsResult({ ...payload.result, destinationProfile: payload.destinationProfile });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Cálculo bloqueado."); }
    finally { setBusy(""); }
  };

  const autoPartsRequest = (saveDossier = false) => {
    const operationCents = Math.round(Number(autoPartsValue.replace(",", ".")) * 100);
    const ownIcmsBaseCents = Math.round(Number(autoPartsOwnBase.replace(",", ".")) * 100);
    const product = coverage?.stAutoPartsHighUseCorridors.products.find((item) => item.code === autoPartsProductCode);
    return { route: autoPartsRoute, operationDate: autoPartsDate, operationCents, ownIcmsBaseCents, cest: product?.cest ?? "", ncm: product?.ncmPatterns[0] ?? "", importedQualified: autoPartsImported, commercialCondition: autoPartsCondition, facts: autoPartsFacts, saveDossier, companyId: autoPartsCompanyId || null };
  };

  const calculateAutoParts = async (event: FormEvent) => {
    event.preventDefault(); setBusy("auto-parts"); setError(""); setAutoPartsResult(null); setAutoPartsDossierPreview(null); setAutoPartsDossier(null);
    try {
      const payload = await json<{ result: AutoPartsResult; dossierPreview: AutoPartsDossierPreview }>("/api/national-coverage/auto-parts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(autoPartsRequest()) });
      setAutoPartsResult(payload.result);
      setAutoPartsDossierPreview(payload.dossierPreview);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Referência de autopeças bloqueada."); }
    finally { setBusy(""); }
  };

  const freezeAutoPartsDossier = async () => {
    if (!autoPartsDossierPreview) return;
    setBusy("auto-parts-dossier"); setError("");
    try {
      const payload = await json<{ result: AutoPartsResult; dossierPreview: AutoPartsDossierPreview; dossier: AutoPartsDossierRecord }>("/api/national-coverage/auto-parts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(autoPartsRequest(true)) });
      setAutoPartsResult(payload.result);
      setAutoPartsDossierPreview(payload.dossierPreview);
      setAutoPartsDossier(payload.dossier);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível congelar o dossiê de autopeças."); }
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

  const spDestinationBeverageRequest = (saveDossier = false) => {
    const operationCents = Math.round(Number(beverageSpOperationValue.replace(",", ".")) * 100);
    const ownIcmsBaseCents = Math.round(Number(beverageSpOwnBase.replace(",", ".")) * 100);
    return {
      route: beverageSpRoute,
      profileCode: beverageSpProfile,
      operationDate: beverageSpDate,
      quantityUnits: Number(beverageSpQuantity),
      operationCents,
      ownIcmsBaseCents,
      importedQualified: beverageSpImported,
      facts: beverageSpFacts,
      saveDossier,
      companyId: beverageCompanyId || null,
    };
  };

  const clearSpDestinationBeverageResult = () => {
    setBeverageSpResult(null);
    setBeverageSpDossierPreview(null);
    setBeverageSpDossier(null);
  };

  const calculateSpDestinationBeverage = async (event: FormEvent) => {
    event.preventDefault(); setBusy("beverages-sp"); setError(""); setBeverageSpResult(null); setBeverageSpDossierPreview(null); setBeverageSpDossier(null);
    try {
      const payload = await json<{ result: ColdBeverageSpResult; dossierPreview: BeverageDossierPreview }>("/api/national-coverage/beverages/sp-destination", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(spDestinationBeverageRequest()),
      });
      setBeverageSpResult(payload.result);
      setBeverageSpDossierPreview(payload.dossierPreview);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Referência paulista de bebidas bloqueada."); }
    finally { setBusy(""); }
  };

  const freezeSpDestinationBeverageDossier = async () => {
    if (!beverageSpDossierPreview) return;
    setBusy("beverages-sp-dossier"); setError("");
    try {
      const payload = await json<{ result: ColdBeverageSpResult; dossierPreview: BeverageDossierPreview; dossier: AutoPartsDossierRecord }>("/api/national-coverage/beverages/sp-destination", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(spDestinationBeverageRequest(true)),
      });
      setBeverageSpResult(payload.result); setBeverageSpDossierPreview(payload.dossierPreview); setBeverageSpDossier(payload.dossier);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível congelar o dossiê paulista de bebidas."); }
    finally { setBusy(""); }
  };

  const spOriginBeverageRequest = (saveDossier = false) => {
    const operationCents = Math.round(Number(beverageSpOriginOperationValue.replace(",", ".")) * 100);
    const ownIcmsBaseCents = Math.round(Number(beverageSpOriginOwnBase.replace(",", ".")) * 100);
    return {
      route: beverageSpOriginRoute,
      profileCode: beverageSpOriginProfile,
      operationDate: beverageSpOriginDate,
      quantityUnits: Number(beverageSpOriginQuantity),
      operationCents,
      ownIcmsBaseCents,
      importedQualified: beverageSpOriginImported,
      facts: beverageSpOriginFacts,
      saveDossier,
      companyId: beverageCompanyId || null,
    };
  };

  const clearSpOriginBeverageResult = () => {
    setBeverageSpOriginResult(null);
    setBeverageSpOriginDossierPreview(null);
    setBeverageSpOriginDossier(null);
  };

  const calculateSpOriginBeverage = async (event: FormEvent) => {
    event.preventDefault(); setBusy("beverages-sp-origin"); setError(""); setBeverageSpOriginResult(null); setBeverageSpOriginDossierPreview(null); setBeverageSpOriginDossier(null);
    try {
      const payload = await json<{ result: ColdBeverageSpOriginResult; dossierPreview: BeverageDossierPreview }>("/api/national-coverage/beverages/sp-origin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(spOriginBeverageRequest()),
      });
      setBeverageSpOriginResult(payload.result);
      setBeverageSpOriginDossierPreview(payload.dossierPreview);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Nova rota de bebidas bloqueada."); }
    finally { setBusy(""); }
  };

  const freezeSpOriginBeverageDossier = async () => {
    if (!beverageSpOriginDossierPreview) return;
    setBusy("beverages-sp-origin-dossier"); setError("");
    try {
      const payload = await json<{ result: ColdBeverageSpOriginResult; dossierPreview: BeverageDossierPreview; dossier: AutoPartsDossierRecord }>("/api/national-coverage/beverages/sp-origin", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(spOriginBeverageRequest(true)),
      });
      setBeverageSpOriginResult(payload.result); setBeverageSpOriginDossierPreview(payload.dossierPreview); setBeverageSpOriginDossier(payload.dossier);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível congelar o dossiê SP→MG/RJ."); }
    finally { setBusy(""); }
  };

  const importBatch = async (event: FormEvent) => {
    event.preventDefault(); if (!files.length) return; setBusy("batch"); setError(""); setBatch(null);
    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
    const clientBatchKey = batchKey || crypto.randomUUID();
    setBatchKey(clientBatchKey);
    try {
      for (let ordinal = 0; ordinal < files.length; ordinal += 1) {
        const form = new FormData();
        form.append("files", files[ordinal]);
        form.append("clientBatchKey", clientBatchKey);
        form.append("ordinal", String(ordinal));
        form.append("totalFiles", String(files.length));
        form.append("totalBytes", String(totalBytes));
        const result = await json<BatchResult>("/api/fiscal-imports", { method: "POST", body: form });
        setBatch(result);
      }
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Lote recusado."); }
    finally { setBusy(""); }
  };

  const submitGovernanceReview = async (event: FormEvent) => {
    event.preventDefault();
    if (!monitor || !governanceReview.eventId) return;
    const selectedEvent = monitor.queue.find((item) => item.id === governanceReview.eventId);
    if (!selectedEvent) return;
    setBusy("governance-review"); setError("");
    try {
      await json("/api/normative-monitor/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: governanceReview.eventId,
          professionalRole: governanceReview.professionalRole,
          professionalRegistration: governanceReview.professionalRegistration,
          decision: governanceReview.decision,
          decisionNote: governanceReview.decisionNote,
          declarationAccepted: governanceReview.declarationAccepted,
          release: governanceReview.decision === "superseded_by_new_version" ? {
            version: governanceReview.releaseVersion,
            summary: governanceReview.releaseSummary,
            affectedRuleCodes: selectedEvent.impactedRuleCodes,
          } : undefined,
        }),
      });
      const refreshed = await json<Monitor>("/api/normative-monitor", { cache: "no-store" });
      setMonitor(refreshed);
      setGovernanceReview((current) => ({
        ...current,
        eventId: refreshed.queue[0]?.id || "",
        decisionNote: "",
        releaseVersion: "",
        releaseSummary: "",
        declarationAccepted: false,
      }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "A decisão normativa não pôde ser registrada.");
    } finally {
      setBusy("");
    }
  };

  if (!coverage && loadError) return <section className="coverage-load-failure" role="alert"><span>!</span><div><b>Não foi possível montar a cobertura nacional.</b><p>{loadError}</p><button type="button" onClick={() => void loadCoverage()} disabled={initialLoading}>{initialLoading ? "Tentando novamente…" : "Tentar novamente"}</button></div></section>;
  if (!coverage) return <section className="coverage-loading" aria-live="polite"><span className="loading-spinner" /><div><b>Montando o mapa tributário nacional…</b><p>As regras e os limites estão sendo conferidos.</p></div></section>;
  const automaticAssurance = compatibleAutomaticAssurance(coverage);
  const selectedBeverageSpProfile = coverage.stColdBeveragesSpDestination.profiles.find((profile) => profile.code === beverageSpProfile);
  const beverageSpOriginProfiles = coverage.stColdBeveragesSpOrigin.profiles.filter((profile) => `SP-${profile.destination}` === beverageSpOriginRoute);
  const selectedBeverageSpOriginProfile = beverageSpOriginProfiles.find((profile) => profile.code === beverageSpOriginProfile);

  return <div className="national-coverage-center">
    <section className="coverage-hero">
      <div><span>VERSAO 71 · INDICADOR PUBLICO DE COBERTURA</span><h1>O que o CBSHub realmente suporta</h1><p>ICMS, ST, ISS, tributos federais, Reforma, documentos e mudanças normativas em uma matriz publica sem esconder os cenarios ainda parciais.</p></div>
      <div className="coverage-hero-proof"><small>BASE VERSIONADA</small><b>#{coverage.fingerprint}</b><span>{new Date(`${coverage.checkedAt}T12:00:00`).toLocaleDateString("pt-BR")}</span></div>
    </section>

    {error && <div className="coverage-error" role="alert"><span>!</span>{error}<button onClick={() => setError("")}>×</button></div>}

    <section className="coverage-kpis">
      <article><span>ICMS geral</span><strong>{coverage.metrics.states}/27</strong><small>UFs mapeadas</small></article>
      <article><span>ISS profundo</span><strong>{coverage.metrics.deepIssCities}/100</strong><small>{coverage.metrics.cities} municípios indexados</small></article>
      <article><span>ST prioritária</span><strong>{coverage.metrics.stSegments}</strong><small>segmentos controlados</small></article>
      <article><span>Cenários federais</span><strong>{coverage.metrics.recurringScenarios}</strong><small>rotinas recorrentes</small></article>
      <article className={automaticAssurance.status === "automatically_verified" ? "ready" : "locked"}><span>Motor técnico</span><strong>{automaticAssurance.status === "automatically_verified" ? "Verificado" : "Bloqueado"}</strong><small>{automaticAssurance.metrics.totalRuns} células · {automaticAssurance.metrics.failed} falhas</small></article>
    </section>

    <nav className="coverage-tabs" aria-label="Áreas da cobertura">
      {tabs.map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{({ panorama: "Panorama", icms: "ICMS + ST", iss: "ISS", federal: "Federais + Reforma", documents: "Importação em lote", governance: "Monitor + garantia" } as Record<Tab, string>)[item]}</button>)}
    </nav>

    {tab === "panorama" && <section className="coverage-panorama">
      <div className="coverage-legend"><div><StatusPill status="supported" /><p><b>Suportado</b><span>Regra testada e apta dentro do escopo indicado.</span></p></div><div><StatusPill status="partial" /><p><b>Parcial</b><span>Triagem útil, conclusão bloqueada.</span></p></div><div><StatusPill status="not_supported" /><p><b>Não suportado</b><span>Identifica o tema sem calcular.</span></p></div></div>
      <div className="coverage-maturity-matrix">
        <header><div><span>MATURIDADE DA BASE · #{coverage.regressionReport.fingerprint.slice(0, 12)}</span><h3>Estrutura, teste e aprovação são evidências diferentes</h3></div><b className={coverage.regressionReport.status}>{coverage.regressionReport.status === "automatically_verified" ? "Regressão íntegra" : "Execução bloqueada"}</b></header>
        <div><article><span>Catalogados</span><strong>{coverage.regressionReport.metrics.catalogued}/{coverage.regressionReport.metrics.modules}</strong><small>módulos identificados e versionados</small></article><article><span>Estruturados</span><strong>{coverage.regressionReport.metrics.structured}/{coverage.regressionReport.metrics.modules}</strong><small>fontes e portões descritos</small></article><article><span>Testados</span><strong>{coverage.regressionReport.metrics.tested}/{coverage.regressionReport.metrics.modules}</strong><small>{coverage.regressionReport.metrics.deterministicCases} casos determinísticos</small></article><article><span>Aprovados</span><strong>{coverage.regressionReport.metrics.approved}/{coverage.regressionReport.metrics.modules}</strong><small>aprovação profissional pública não presumida</small></article></div>
        <div className="regression-distribution">{[...Object.entries(coverage.regressionReport.metrics.majorModuleDistribution), ["IMPORTACOES", coverage.regressionReport.metrics.importDistribution] as const].map(([tax, distribution]) => <article key={tax}><span>{tax.replace("_", "/")}</span><strong>{distribution.deterministicCases}</strong><small>{distribution.calculatedMemories} memorias · {distribution.safelyBlockedCases} bloqueios · meta {distribution.target}</small></article>)}</div>
      </div>
      <div className="coverage-indicator-panel">
        <header><div><span>INDICADOR PUBLICO NORMALIZADO · {coverage.coverageIndicator.version}</span><h3>Matriz usada por busca, calculo, dossie, relatorio e API</h3></div><b>{coverage.coverageIndicator.matrix.length} linhas</b></header>
        <div className="coverage-indicator-stats">
          <article><span>Status</span><strong>{coverage.coverageIndicator.statusTotals.supported}/{coverage.coverageIndicator.statusTotals.partial}/{coverage.coverageIndicator.statusTotals.not_supported}</strong><small>suportado / parcial / nao suportado</small></article>
          <article><span>Maturidade</span><strong>{coverage.coverageIndicator.maturityTotals.catalogued}/{coverage.coverageIndicator.maturityTotals.structured}/{coverage.coverageIndicator.maturityTotals.tested}/{coverage.coverageIndicator.maturityTotals.approved}</strong><small>catalogado / estruturado / testado / aprovado</small></article>
          <article><span>Regressao</span><strong>{coverage.coverageIndicator.regressionTotals.cases}/{coverage.regressionReport.metrics.caseTarget}</strong><small>{coverage.coverageIndicator.regressionTotals.failures} falhas · meta {coverage.regressionReport.metrics.targetReached ? "atingida" : "pendente"}</small></article>
          <article><span>Fontes recertificadas</span><strong>{coverage.sourceCertification.liveProbe.checked}/{coverage.sourceCertification.liveProbe.uniqueUrls}</strong><small>{coverage.sourceCertification.liveProbe.pending} pendentes · {coverage.sourceCertification.liveProbe.unavailable} indisponível</small></article>
        </div>
        <div className="coverage-indicator-sample">{coverage.coverageIndicator.matrix.slice(0, 5).map((item) => <article key={item.code} className={item.status}><StatusPill status={item.status} /><div><b>{item.title}</b><small>{item.tax} / {item.dimension} / versao {item.version}</small><p>{item.objectiveReason}</p></div><a href={item.officialSources[0]?.url ?? "#"} target="_blank" rel="noreferrer">Fonte</a></article>)}</div>
        <footer><p>{coverage.coverageIndicator.classificationPolicy.statement}</p><small>{coverage.sourceCertification.metrics.total} identidades normativas · {coverage.sourceCertification.metrics.sourceClass.primary} fontes primárias · {coverage.sourceCertification.metrics.impactedRules} grupos de regras afetados · base #{coverage.sourceCertification.fingerprint}</small><small>{coverage.sourceCertification.liveProbe.policy}</small><code>{coverage.coverageIndicator.changeHistory.length} mudancas publicas sem dados de clientes</code></footer>
      </div>
      <div className="coverage-summary-grid">
        <article><span>27</span><h3>Estados e Distrito Federal</h3><p>Alíquotas modais internas versionadas, rotas interestaduais e acesso à fonte oficial de cada UF.</p><b>A cobertura continua parcial: produto, FCP, benefício, DIFAL e exceções não são presumidos.</b></article>
        <article><span>{coverage.metrics.deepIssCities}</span><h3>ISS profundo estruturado</h3><p>Fontes municipais, classificadores, incidência, retenção e portão da alíquota exata.</p><b>Estruturado ainda não significa testado ou homologado.</b></article>
        <article><span>{coverage.stSpOriginMatrix.metrics.structuredCells}</span><h3>Matriz ST com origem em SP</h3><p>26 destinos cruzados com 25 segmentos, cada célula com fonte, evidências e bloqueios.</p><b>{coverage.stSpOriginMatrix.metrics.existingValidatedReferences} referências existentes · {coverage.stSpOriginMatrix.metrics.calculationsBlocked} células aguardam aprofundamento.</b></article>
        <article><span>Diário</span><h3>Monitor de fontes</h3><p>A primeira abertura do dia confere um lote rotativo de fontes primárias e compara cada uma com sua captura anterior.</p><b>O ciclo completo preserva recursos e nenhum sinal altera regra automaticamente.</b></article>
      </div>
      <div className="coverage-public-note"><span>INDICADOR PÚBLICO</span><p>Esta mesma matriz pode ser consultada sem login em <code>/api/public/coverage</code>. Clientes e parceiros conseguem verificar o que é suportado antes de confiar uma operação à plataforma.</p></div>
    </section>}

    {tab === "icms" && <section className="coverage-two-columns">
      <div className="coverage-column">
        <div className="coverage-section-heading"><span>27 UFs</span><h2>ICMS geral nacional</h2><p>Alíquotas modais internas e interestaduais são versionadas; o cálculo só avança com produto, finalidade, FCP e exceções confirmados.</p></div>
        <form className="icms-reference-form" onSubmit={calculateIcms}>
          <label>Origem<select value={origin} onChange={(event) => setOrigin(event.target.value)}>{coverage.states.map((item) => <option key={item.uf}>{item.uf}</option>)}</select></label>
          <span>→</span>
          <label>Destino<select value={destination} onChange={(event) => setDestination(event.target.value)}>{coverage.states.map((item) => <option key={item.uf}>{item.uf}</option>)}</select></label>
          <label className="qualified-import"><input type="checkbox" checked={importedQualified} onChange={(event) => setImportedQualified(event.target.checked)} />Mercadoria cumpre os requisitos da Resolução 13/2012</label>
          <button disabled={busy === "icms"} title={busy === "icms" ? "Aguarde a conferência da rota selecionada." : "Obtém as referências interestadual e modal do destino sem presumir a incidência final."}>{busy === "icms" ? "Conferindo…" : "Obter referências"}</button>
        </form>
        {icmsResult && <div className="icms-reference-result"><span>INTERESTADUAL / MODAL DO DESTINO</span><strong>{icmsResult.rateBps === null ? "Interna" : `${(icmsResult.rateBps / 100).toFixed(icmsResult.rateBps % 100 ? 1 : 0)}%`} · {(icmsResult.destinationProfile.generalRateBps / 100).toFixed(icmsResult.destinationProfile.generalRateBps % 100 ? 1 : 0)}%</strong><p>{icmsResult.reason}</p><small>Modal vigente desde {icmsResult.destinationProfile.effectiveFrom} · {icmsResult.destinationProfile.fundName} separado · DIFAL/ST permanecem condicionados aos fatos.</small></div>}
        <div className="state-matrix">{coverage.states.map((item) => <a href={coverage.sources.find((source) => source.code === item.generalRateSourceCode)?.url ?? item.officialPortal} target="_blank" rel="noreferrer" key={item.uf}><b>{item.uf}</b><span>{item.name} · {(item.generalRateBps / 100).toFixed(item.generalRateBps % 100 ? 1 : 0)}%</span><StatusPill status={item.status} /><i>↗</i></a>)}</div>
      </div>
      <div className="coverage-column">
        <div className="coverage-section-heading"><span>SEGMENTOS PRIORITÁRIOS</span><h2>Substituição tributária profunda</h2><p>Cada segmento informa com transparência o que já entra na memória e o que ainda bloqueia a conclusão.</p></div>
        <section className="sp-origin-matrix">
          <header><div><span>ORIGEM SÃO PAULO · {coverage.stSpOriginMatrix.version}</span><b>{coverage.stSpOriginMatrix.metrics.structuredCells} combinações estruturadas</b><p>{coverage.stSpOriginMatrix.policy}</p></div><code>#{coverage.stSpOriginMatrix.fingerprint}</code></header>
          <div className="sp-origin-kpis"><span><strong>{coverage.stSpOriginMatrix.metrics.destinations}</strong> destinos</span><span><strong>{coverage.stSpOriginMatrix.metrics.segments}</strong> segmentos</span><span><strong>{coverage.stSpOriginMatrix.metrics.mandatoryFacts}</strong> fatos obrigatórios</span><span><strong>{coverage.stSpOriginMatrix.metrics.calculationsBlocked}</strong> bloqueadas</span></div>
          <details><summary>Ver as 26 rotas estruturadas</summary><div className="sp-route-grid">{coverage.stSpOriginMatrix.destinations.map((item) => <a href={item.officialPortal} target="_blank" rel="noreferrer" key={item.uf}><b>SP→{item.uf}</b><span>25/25 segmentos</span><small>{spOriginReferenceCount.get(item.uf) ? `${spOriginReferenceCount.get(item.uf)} referências existentes` : "cálculo ainda bloqueado"} · fonte oficial ↗</small></a>)}</div></details>
        </section>
        <section className="auto-parts-priority-batch">
          <header><div><span>FARMA, COSMÉTICOS, PERFUMARIA E HIGIENE · {coverage.stPharmaCosmeticsPriority.version}</span><b>{coverage.stPharmaCosmeticsPriority.metrics.rankedRoutes} rotas e {coverage.stPharmaCosmeticsPriority.metrics.controlledCells} decisões auditáveis</b><p>{coverage.stPharmaCosmeticsPriority.policy}</p></div><code>#{coverage.stPharmaCosmeticsPriority.fingerprint}</code></header>
          <div className="auto-parts-kpis"><span><strong>{coverage.stPharmaCosmeticsPriority.metrics.rankedProducts}</strong> perfis NCM/CEST</span><span className="active"><strong>{coverage.stPharmaCosmeticsPriority.metrics.supportedCells}</strong> recortes suportados</span><span><strong>{coverage.stPharmaCosmeticsPriority.metrics.verificationCases}</strong> casos reexecutáveis</span><span className="outside"><strong>{coverage.stPharmaCosmeticsPriority.metrics.partialCells + coverage.stPharmaCosmeticsPriority.metrics.notSupportedCells}</strong> decisões bloqueadas</span></div>
          <div className="auto-parts-safety"><b>Liberação por evidência, não por semelhança</b><span>SP, SC e os perfis convencionais confirmados do RS possuem memória de ST igual a zero. PMC, PMPF, MVA, FCP, porta a porta e antecipação só liberam valor com item, apresentação e vigência exatos. PIS/Cofins monofásico permanece separado.</span></div>
          <details open><summary>Ver produtos e rotas priorizados</summary><div className="auto-parts-route-grid">{coverage.stPharmaCosmeticsPriority.products.map((product) => <article key={product.code}><header><b>{product.description}</b><span>PRIORIDADE {String(product.priorityRank).padStart(2, "0")}</span></header><strong>CEST {product.cest}</strong><p>NCM {product.ncms.join(" · ")} · {product.presentation}</p><small>{coverage.stPharmaCosmeticsPriority.cells.filter((cell) => cell.productCode === product.code && cell.status === "supported").length}/{coverage.stPharmaCosmeticsPriority.metrics.rankedRoutes} rotas suportadas no recorte</small></article>)}</div></details>
          <details><summary>Ver as {coverage.stPharmaCosmeticsPriority.metrics.controlledCells} decisões produto × rota</summary><div className="auto-parts-route-grid">{coverage.stPharmaCosmeticsPriority.cells.map((cell) => <article key={cell.key} className={cell.status}><header><b>{cell.route}</b><span>{cell.status === "supported" ? "ST NÃO APLICÁVEL" : cell.status === "partial" ? "CÁLCULO CONDICIONADO" : "NÃO SUPORTADO"}</span></header><strong>{cell.productCode}</strong><p>{cell.reason}</p><small>Vigência controlada desde {new Date(`${cell.effectiveFrom}T12:00:00`).toLocaleDateString("pt-BR")}</small></article>)}</div></details>
          <details><summary>Ver fundamento e responsabilidade das {coverage.stPharmaCosmeticsPriority.metrics.rankedRoutes} rotas</summary><div className="auto-parts-route-grid">{coverage.stPharmaCosmeticsPriority.legalRoutes.map((route) => <article key={route.route}><header><b>{route.route}</b><span>ROTA CATALOGADA</span></header><strong>{route.agreementStatus}</strong><p>{route.responsibility}</p><small>Vigência controlada desde {new Date(`${route.effectiveFrom}T12:00:00`).toLocaleDateString("pt-BR")} · {route.sourceCodes.length} fontes vinculadas</small></article>)}</div></details>
          <details><summary>Ver MVA, alíquota, FCP, benefícios e exceções</summary><div className="auto-parts-route-grid">{coverage.stPharmaCosmeticsPriority.stateRules.map((rule) => <article key={rule.key} className={rule.parameterStatus === "explicitly_unavailable" ? "not_supported" : rule.calculationReleased ? "supported" : "partial"}><header><b>{rule.destination} · {rule.productCode}</b><span>{rule.parameterStatus === "exact_no_st" ? "ST NÃO APLICÁVEL" : rule.parameterStatus === "complete_conditional" ? "PARÂMETROS CONDICIONAIS" : "NÃO SUPORTADO"}</span></header><strong>MVA {rule.mvaOriginal.bps === null ? "caso específico" : `${(rule.mvaOriginal.bps / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}%`} · ICMS {rule.internalRate.bps === null ? "fora da memória" : `${(rule.internalRate.bps / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}%`} · FCP {rule.fcpRate.bps === null ? "fora da memória" : `${(rule.fcpRate.bps / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}%`}</strong><p>{rule.responsibility}</p><small>{rule.baseMethod} · {rule.exceptions.length} exceções controladas · desde {new Date(`${rule.effectiveFrom}T12:00:00`).toLocaleDateString("pt-BR")}</small></article>)}</div></details>
          <footer>{coverage.stPharmaCosmeticsPriority.sources.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.code}>{source.title} · {source.publisher} ↗</a>)}</footer>
        </section>
        <section className="auto-parts-corridor-ledger">
          <header><div><span>CONSTRUÇÃO, FERRAMENTAS E ELÉTRICOS · {coverage.stConstructionElectricalPriority.nationalExpansion.version}</span><b>20 identidades em 18 corredores nacionais</b><p>{coverage.stConstructionElectricalPriority.nationalExpansion.policy}</p></div><code>#{coverage.stConstructionElectricalPriority.nationalExpansion.fingerprint}</code></header>
          <div className="auto-parts-corridor-kpis"><span><strong>{coverage.stConstructionElectricalPriority.nationalExpansion.metrics.productFamilies}</strong> famílias</span><span><strong>{coverage.stConstructionElectricalPriority.nationalExpansion.metrics.priorityProducts}</strong> identidades fiscais</span><span><strong>{coverage.stConstructionElectricalPriority.nationalExpansion.metrics.controlledCells}</strong> células controladas</span><span className="reference"><strong>{coverage.stConstructionElectricalPriority.nationalExpansion.metrics.reproducedMemories}</strong> memórias reproduzidas</span><span className="blocked"><strong>{coverage.stConstructionElectricalPriority.nationalExpansion.metrics.safeFailureScenarios}</strong> bloqueios seguros</span></div>
          <div className="auto-parts-direction-rule"><b>Parâmetro não atravessa destino nem sentido</b><span>SP→MG e SP→RJ preservam as memórias já fechadas. SP→SC registra ST não aplicável porque as seções atuais estão revogadas, sem confundir isso com isenção do ICMS próprio. Todas as demais células ficam parciais ou não suportadas até congelar a disciplina estadual exata.</span></div>
          <div className="auto-parts-corridor-grid">{coverage.stConstructionElectricalPriority.referenceRuns.map((run) => {
            const product = coverage.stConstructionElectricalPriority.products.find((item) => item.code === run.productCode);
            return <article key={run.key} className="supported"><header><b>{run.route} · {product?.label}</b><span>{product?.family.toUpperCase()}</span></header><strong>CEST {product?.cest} · MVA {(run.result.parameters.mvaAdjustedBps / 100).toFixed(2).replace(".", ",")}%</strong><p>Memória de referência: {(run.result.output.destinationTotalCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} · {run.result.responsibility === "origin_remitter" ? "retenção pelo remetente" : "recolhimento pelo destinatário"}</p></article>;
          })}</div>
          <details open><summary>Ver as 20 identidades e exclusões</summary><div className="representative-product-grid">{coverage.stConstructionElectricalPriority.nationalExpansion.identities.map((product) => <article key={product.code}><b>{product.label}</b><span>{product.family}</span><code>CEST {product.cest} · NCM {product.ncm}</code><small>{product.presentation}</small><small>{product.exclusions.join(" · ")}</small></article>)}</div></details>
          <details><summary>Ver as 360 decisões produto × rota</summary><div className="auto-parts-route-grid">{coverage.stConstructionElectricalPriority.nationalExpansion.cells.map((cell) => <article key={cell.key} className={cell.status}><header><b>{cell.route} · {cell.productCode}</b><span>{cell.status === "supported" ? cell.method === "no_st" ? "ST NÃO APLICÁVEL" : "MEMÓRIA DISPONÍVEL" : cell.status === "partial" ? "PARCIAL" : "NÃO SUPORTADO"}</span></header><strong>{cell.output ? `Resultado ST: ${(cell.output.destinationTotalCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}` : "Sem valor liberado"}</strong><p>{cell.blockers.length ? cell.blockers.join(" · ") : "Identidade, vigência, responsabilidade e parâmetros conferidos no recorte."}</p></article>)}</div></details>
          <footer>{coverage.stConstructionElectricalPriority.nationalExpansion.sources.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.code}>{source.title} · {source.publisher} ↗</a>)}</footer>
        </section>
        <section className="auto-parts-corridor-ledger">
          <header><div><span>ALIMENTOS, LIMPEZA E PET FOOD · {coverage.stFoodCleaningPetPriority.version}</span><b>25 identidades auditadas em nove destinos prioritários</b><p>{coverage.stFoodCleaningPetPriority.policy}</p></div><code>#{coverage.stFoodCleaningPetPriority.fingerprint}</code></header>
          <div className="auto-parts-corridor-kpis"><span><strong>{coverage.stFoodCleaningPetPriority.metrics.productFamilies}</strong> grupos segregados</span><span><strong>{coverage.stFoodCleaningPetPriority.metrics.priorityProducts}</strong> produtos exatos</span><span className="reference"><strong>{coverage.stFoodCleaningPetPriority.metrics.reproducedMemories}</strong> memórias SP→MG</span><span><strong>{coverage.stFoodCleaningPetPriority.metrics.pmpfMemories}</strong> pauta PMPF</span><span className="blocked"><strong>{coverage.stFoodCleaningPetPriority.metrics.coverage.partial}</strong> células parciais</span></div>
          <div className="auto-parts-direction-rule"><b>Parâmetro não atravessa fronteira</b><span>A tabela mineira libera somente SP→MG no recorte exato. As outras oito rotas ficam visíveis como parciais, sem MVA, alíquota, FCP/FECP ou responsabilidade emprestados de Minas Gerais ou do sentido inverso.</span></div>
          <details><summary>Ver as {coverage.stFoodCleaningPetPriority.metrics.controlledCells} decisões produto × rota</summary><div className="auto-parts-corridor-grid">{coverage.stFoodCleaningPetPriority.referenceRuns.map((run) => {
            const product = coverage.stFoodCleaningPetPriority.products.find((item) => item.code === run.productCode);
            return <article key={run.key} className={run.result.coverageStatus}><header><b>{run.route} · {product?.label}</b><span>{run.result.method === "pmpf" ? "PMPF" : run.result.method === "mva" ? "MVA" : "PARCIAL"}</span></header><strong>CEST {product?.cest} · NCM {product?.ncm}</strong><p>{run.result.output ? `Memória controlada: ${(run.result.output.destinationTotalCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}` : "Sem valor: parâmetros estaduais ainda não fechados."}</p><small>{product?.presentation}</small></article>;
          })}</div></details>
          <details><summary>Ver separação dos grupos, apresentações e exclusões</summary><div className="representative-product-grid">{coverage.stFoodCleaningPetPriority.products.map((product) => <article key={product.code}><b>{product.label}</b><span>{product.family.replace("_", " ")}</span><code>CEST {product.cest} · NCM {product.ncm}</code><small>{product.presentation}</small><small>{product.exclusions.join(" · ")}</small></article>)}</div></details>
          <footer>{coverage.stFoodCleaningPetPriority.sources.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.code}>{source.title} · {source.publisher} ↗</a>)}</footer>
        </section>
        <section className="beverage-priority-ledger">
          <header><div><span>BEBIDAS FRIAS · {coverage.stColdBeveragesPriority.version}</span><b>{coverage.stColdBeveragesPriority.metrics.corridors} corredores, {coverage.stColdBeveragesPriority.metrics.directedRoutes} sentidos e 6 produtos controlados</b><p>{coverage.stColdBeveragesPriority.policy}</p></div><code>#{coverage.stColdBeveragesPriority.fingerprint}</code></header>
          <div className="beverage-kpis"><span><strong>{coverage.stColdBeveragesPriority.metrics.corridors}</strong> corredores</span><span><strong>{coverage.stColdBeveragesPriority.metrics.directedRoutes}</strong> sentidos</span><span><strong>{coverage.stColdBeveragesPriority.metrics.productIdentities}</strong> identidades CEST</span><span className="scoped"><strong>{coverage.stColdBeveragesPriority.metrics.protocolScopedCells}</strong> células no protocolo</span><span className="exception"><strong>{coverage.stColdBeveragesPriority.metrics.explicitExceptionCells}</strong> exceções explícitas</span><span className="locked"><strong>{coverage.stColdBeveragesPriority.metrics.finalCalculationsReleased}</strong> memórias PMPF</span></div>
          <div className="beverage-scope-rule"><b>PMPF/pauta primeiro</b><span>Marca, embalagem, capacidade e data podem mudar a base. A MVA só entra quando a norma do destino permitir. A ordem das rotas é uma heurística operacional interna, não uma estatística oficial de NF-e.</span></div>
          <form className="auto-parts-calculator beverage-sp-calculator" onSubmit={calculateSpDestinationBeverage}>
            <header><div><span>DESTINO SÃO PAULO · {coverage.stColdBeveragesSpDestination.version}</span><h3>PMPF vigente com memória em centavos</h3><p>{coverage.stColdBeveragesSpDestination.metrics.controlledCells} combinações reproduzidas: dez perfis exatos em {coverage.stColdBeveragesSpDestination.metrics.inboundRoutes} origens prioritárias, incluindo marcas listadas e pack integral. Água continua fora deste protocolo.</p></div><small>{new Date(`${coverage.stColdBeveragesSpDestination.supportedPeriod.from}T12:00:00`).toLocaleDateString("pt-BR")}–{new Date(`${coverage.stColdBeveragesSpDestination.supportedPeriod.to}T12:00:00`).toLocaleDateString("pt-BR")}</small></header>
            <div className="beverage-scope-rule"><b>Cobertura explícita</b><span>Suportadas: {coverage.stColdBeveragesSpDestination.metrics.coverage.supported} · Parciais: {coverage.stColdBeveragesSpDestination.metrics.coverage.partial} · Não suportadas dentro da matriz exata: {coverage.stColdBeveragesSpDestination.metrics.coverage.notSupported}. Combinações fora dos perfis, rotas e vigência não herdam cobertura.</span></div>
            <div className="beverage-sp-profile-proof"><span>PMPF por unidade comercial</span><strong>{selectedBeverageSpProfile ? (selectedBeverageSpProfile.pmpfCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}</strong><small>{selectedBeverageSpProfile?.legalTableItem} · CEST {selectedBeverageSpProfile?.cest} · NCM {selectedBeverageSpProfile?.ncms.join(" / ")} · {selectedBeverageSpProfile?.commercialUnit === "integral_pack" ? `pack integral (${selectedBeverageSpProfile.commercialUnitUnits} itens)` : "unidade individual"}</small></div>
            <div className="auto-parts-calculator-fields beverage-sp-fields">
              <label>Origem → SP<select value={beverageSpRoute} onChange={(event) => { setBeverageSpRoute(event.target.value); clearSpDestinationBeverageResult(); }}>{coverage.stColdBeveragesSpDestination.routes.map((route) => <option key={route.route}>{route.route}</option>)}</select></label>
              <label>Perfil exato<select value={beverageSpProfile} onChange={(event) => { const code = event.target.value as ColdBeverageSpProfileCode; const profile = coverage.stColdBeveragesSpDestination.profiles.find((item) => item.code === code); const quantity = Math.max(1, Number(beverageSpQuantity) || 1); const suggested = profile ? ((profile.pmpfCents * quantity * 0.6) / 100).toFixed(2) : ""; setBeverageSpProfile(code); setBeverageSpOperationValue(suggested); setBeverageSpOwnBase(suggested); clearSpDestinationBeverageResult(); }}>{coverage.stColdBeveragesSpDestination.profiles.map((profile) => <option value={profile.code} key={profile.code}>{profile.label}</option>)}</select></label>
              <label>Data<input type="date" min={coverage.stColdBeveragesSpDestination.supportedPeriod.from} max={coverage.stColdBeveragesSpDestination.supportedPeriod.to} value={beverageSpDate} onChange={(event) => { setBeverageSpDate(event.target.value); clearSpDestinationBeverageResult(); }} required /></label>
              <label>Quantidade de unidades comerciais<input type="number" min="1" max="1000000" step="1" value={beverageSpQuantity} onChange={(event) => { setBeverageSpQuantity(event.target.value); clearSpDestinationBeverageResult(); }} required /></label>
              <label>Valor da operação<input type="number" min="0.01" max="1000000000" step="0.01" value={beverageSpOperationValue} onChange={(event) => { setBeverageSpOperationValue(event.target.value); clearSpDestinationBeverageResult(); }} required /></label>
              <label>Base do ICMS próprio<input type="number" min="0.01" max="1000000000" step="0.01" value={beverageSpOwnBase} onChange={(event) => { setBeverageSpOwnBase(event.target.value); clearSpDestinationBeverageResult(); }} required /></label>
            </div>
            <label className="auto-parts-imported"><input type="checkbox" checked={beverageSpImported} onChange={(event) => { setBeverageSpImported(event.target.checked); clearSpDestinationBeverageResult(); }} />Mercadoria importada que cumpre integralmente a Resolução do Senado 13/2012 (4%); desmarcada, a rota usa 12%</label>
            <fieldset><legend>Confirme os nove fatos documentados</legend>{(Object.entries(coverage.stColdBeveragesSpDestination.factLabels) as Array<[ColdBeverageSpFactKey, string]>).map(([key, label]) => <label key={key}><input type="checkbox" checked={beverageSpFacts[key]} onChange={(event) => { setBeverageSpFacts((current) => ({ ...current, [key]: event.target.checked })); clearSpDestinationBeverageResult(); }} />{label}</label>)}</fieldset>
            <button disabled={busy === "beverages-sp" || !beverageSpDate || !beverageSpQuantity || !beverageSpOperationValue || !beverageSpOwnBase} title={!beverageSpDate || !beverageSpQuantity || !beverageSpOperationValue || !beverageSpOwnBase ? "Preencha data, quantidade, valor da operação e base própria." : busy === "beverages-sp" ? "A memória está sendo reproduzida." : "Executa o cálculo condicionado aos fatos confirmados."}>{busy === "beverages-sp" ? "Reproduzindo memória…" : "Calcular PMPF condicionado"}</button>
          </form>
          {beverageSpResult && <section className={`auto-parts-calculator-result beverage-sp-result ${beverageSpResult.status}`}>
            {beverageSpResult.status === "calculated_reference" && beverageSpResult.output && beverageSpResult.parameters ? <><header><span>MEMÓRIA PAULISTA CONDICIONAL · {beverageSpResult.route}</span><strong>{(beverageSpResult.output.destinationTotalCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong><small>ICMS-ST; FCP igual a zero neste recorte de bebidas não alcoólicas</small></header><div><span>Base PMPF<b>{(beverageSpResult.output.stBaseCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</b></span><span>PMPF unitário<b>{(beverageSpResult.parameters.pmpfUnitCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</b></span><span>ICMS próprio<b>{(beverageSpResult.output.ownIcmsCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</b></span><span>ICMS presumido<b>{(beverageSpResult.output.presumedInternalIcmsCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</b></span><span>ICMS-ST<b>{(beverageSpResult.output.icmsStCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</b></span></div><p>Interestadual {(beverageSpResult.parameters.interstateRateBps / 100).toFixed(0)}% · interna {(beverageSpResult.parameters.internalRateBps / 100).toFixed(0)}% · limite de 90% do PMPF: {(beverageSpResult.parameters.pmpfLimitCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.</p></> : <><header><span>{beverageSpResult.status === "pmpf_fallback_required" ? "PMPF LEGALMENTE AFASTADO" : "CÁLCULO BLOQUEADO"}</span><strong>{beverageSpResult.status === "pmpf_fallback_required" ? "Exige IVA-ST de fallback" : "Sem valor exibido"}</strong></header><ul>{beverageSpResult.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul></>}
            <small>{beverageSpResult.limitation}</small>
          </section>}
          {beverageSpDossierPreview && <BeverageDossierPanel
            preview={beverageSpDossierPreview}
            dossier={beverageSpDossier}
            companies={companies}
            companyId={beverageCompanyId}
            setCompanyId={setBeverageCompanyId}
            busy={busy === "beverages-sp-dossier"}
            onFreeze={() => void freezeSpDestinationBeverageDossier()}
          />}
          <form className="auto-parts-calculator beverage-sp-calculator" onSubmit={calculateSpOriginBeverage}>
            <header><div><span>ORIGEM SÃO PAULO · {coverage.stColdBeveragesSpOrigin.version}</span><h3>Novas rotas com PMPF de MG e RJ</h3><p>Dez perfis de alto giro reproduzidos em centavos, com ICMS-ST e FCP separados e trava de 80% específica de cada destino.</p></div><small>{coverage.stColdBeveragesSpOrigin.metrics.reproducedMemories}/{coverage.stColdBeveragesSpOrigin.metrics.controlledCells} memórias íntegras</small></header>
            <div className="beverage-sp-profile-proof"><span>PMPF unitário do destino</span><strong>{selectedBeverageSpOriginProfile ? (selectedBeverageSpOriginProfile.pmpfCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}</strong><small>{selectedBeverageSpOriginProfile?.legalTableItem} · CEST {selectedBeverageSpOriginProfile?.cest} · NCM {selectedBeverageSpOriginProfile?.ncms.join(" / ")}</small></div>
            <div className="auto-parts-calculator-fields beverage-sp-fields">
              <label>Rota<select value={beverageSpOriginRoute} onChange={(event) => {
                const route = event.target.value as "SP-MG" | "SP-RJ";
                const destination = route.slice(3) as "MG" | "RJ";
                const firstProfile = coverage.stColdBeveragesSpOrigin.profiles.find((profile) => profile.destination === destination);
                const quantity = Math.max(1, Number(beverageSpOriginQuantity) || 1);
                const suggested = firstProfile ? ((firstProfile.pmpfCents * quantity * 0.6) / 100).toFixed(2) : "";
                setBeverageSpOriginRoute(route);
                if (firstProfile) setBeverageSpOriginProfile(firstProfile.code);
                setBeverageSpOriginOperationValue(suggested);
                setBeverageSpOriginOwnBase(suggested);
                clearSpOriginBeverageResult();
              }}>{coverage.stColdBeveragesSpOrigin.routes.map((route) => <option key={route.route}>{route.route}</option>)}</select></label>
              <label>Perfil exato<select value={beverageSpOriginProfile} onChange={(event) => {
                const code = event.target.value as ColdBeverageSpOriginProfileCode;
                const profile = coverage.stColdBeveragesSpOrigin.profiles.find((item) => item.code === code);
                const quantity = Math.max(1, Number(beverageSpOriginQuantity) || 1);
                const suggested = profile ? ((profile.pmpfCents * quantity * 0.6) / 100).toFixed(2) : "";
                setBeverageSpOriginProfile(code);
                setBeverageSpOriginOperationValue(suggested);
                setBeverageSpOriginOwnBase(suggested);
                clearSpOriginBeverageResult();
              }}>{beverageSpOriginProfiles.map((profile) => <option value={profile.code} key={profile.code}>{profile.label}</option>)}</select></label>
              <label>Data<input type="date" min={coverage.stColdBeveragesSpOrigin.supportedPeriod.from} max={coverage.stColdBeveragesSpOrigin.supportedPeriod.to} value={beverageSpOriginDate} onChange={(event) => { setBeverageSpOriginDate(event.target.value); clearSpOriginBeverageResult(); }} required /></label>
              <label>Quantidade de unidades<input type="number" min="1" max="1000000" step="1" value={beverageSpOriginQuantity} onChange={(event) => { setBeverageSpOriginQuantity(event.target.value); clearSpOriginBeverageResult(); }} required /></label>
              <label>Valor da operação<input type="number" min="0.01" max="1000000000" step="0.01" value={beverageSpOriginOperationValue} onChange={(event) => { setBeverageSpOriginOperationValue(event.target.value); clearSpOriginBeverageResult(); }} required /></label>
              <label>Base do ICMS próprio<input type="number" min="0.01" max="1000000000" step="0.01" value={beverageSpOriginOwnBase} onChange={(event) => { setBeverageSpOriginOwnBase(event.target.value); clearSpOriginBeverageResult(); }} required /></label>
            </div>
            <label className="auto-parts-imported"><input type="checkbox" checked={beverageSpOriginImported} onChange={(event) => { setBeverageSpOriginImported(event.target.checked); clearSpOriginBeverageResult(); }} />Mercadoria importada que cumpre integralmente a Resolução do Senado 13/2012 (4%); desmarcada, a rota usa 12%</label>
            <fieldset><legend>Confirme os nove fatos documentados</legend>{(Object.entries(coverage.stColdBeveragesSpOrigin.factLabels) as Array<[ColdBeverageSpOriginFactKey, string]>).map(([key, label]) => <label key={key}><input type="checkbox" checked={beverageSpOriginFacts[key]} onChange={(event) => { setBeverageSpOriginFacts((current) => ({ ...current, [key]: event.target.checked })); clearSpOriginBeverageResult(); }} />{label}</label>)}</fieldset>
            <button disabled={busy === "beverages-sp-origin" || !beverageSpOriginDate || !beverageSpOriginQuantity || !beverageSpOriginOperationValue || !beverageSpOriginOwnBase} title={!beverageSpOriginDate || !beverageSpOriginQuantity || !beverageSpOriginOperationValue || !beverageSpOriginOwnBase ? "Preencha data, quantidade, valor da operação e base própria." : busy === "beverages-sp-origin" ? "A memória está sendo reproduzida." : "Executa o cálculo condicionado aos fatos confirmados."}>{busy === "beverages-sp-origin" ? "Reproduzindo memória…" : `Calcular ${beverageSpOriginRoute}`}</button>
          </form>
          {beverageSpOriginResult && <section className={`auto-parts-calculator-result beverage-sp-result ${beverageSpOriginResult.status}`}>
            {beverageSpOriginResult.status === "calculated_reference" && beverageSpOriginResult.output && beverageSpOriginResult.parameters ? <><header><span>MEMÓRIA DO DESTINO CONDICIONAL · {beverageSpOriginResult.route}</span><strong>{(beverageSpOriginResult.output.destinationTotalCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong><small>ICMS-ST + adicional estadual; valores exibidos separadamente abaixo</small></header><div><span>Base PMPF<b>{(beverageSpOriginResult.output.stBaseCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</b></span><span>PMPF unitário<b>{(beverageSpOriginResult.parameters.pmpfUnitCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</b></span><span>ICMS próprio<b>{(beverageSpOriginResult.output.ownIcmsCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</b></span><span>ICMS presumido<b>{(beverageSpOriginResult.output.presumedInternalIcmsCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</b></span><span>ICMS-ST<b>{(beverageSpOriginResult.output.icmsStCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</b></span><span>FCP/FEM<b>{(beverageSpOriginResult.output.fcpCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</b></span></div><p>Interestadual {(beverageSpOriginResult.parameters.interstateRateBps / 100).toFixed(0)}% · interna {(beverageSpOriginResult.parameters.internalRateBps / 100).toFixed(0)}% · adicional {(beverageSpOriginResult.parameters.fcpRateBps / 100).toFixed(0)}% · limite de 80%: {(beverageSpOriginResult.parameters.pmpfLimitCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.</p></> : <><header><span>{beverageSpOriginResult.status === "pmpf_fallback_required" ? "PMPF LEGALMENTE AFASTADO" : "CÁLCULO BLOQUEADO"}</span><strong>{beverageSpOriginResult.status === "pmpf_fallback_required" ? "Exige MVA do destino" : "Sem valor exibido"}</strong></header><ul>{beverageSpOriginResult.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul></>}
            <small>{beverageSpOriginResult.limitation}</small>
          </section>}
          {beverageSpOriginDossierPreview && <BeverageDossierPanel
            preview={beverageSpOriginDossierPreview}
            dossier={beverageSpOriginDossier}
            companies={companies}
            companyId={beverageCompanyId}
            setCompanyId={setBeverageCompanyId}
            busy={busy === "beverages-sp-origin-dossier"}
            onFreeze={() => void freezeSpOriginBeverageDossier()}
          />}
          <form className="beverage-triage" onSubmit={classifyBeverage}>
            <header><div><span>TRIAGEM TEMPORAL</span><h3>Enquadrar bebida sem inventar alíquota</h3><p>Refrigerantes, energéticos, isotônicos e água em vidro. Cerveja, chope e destilados continuam separados.</p></div><small>Período controlado: 2026</small></header>
            <div className="beverage-fields">
              <label>Rota<select value={beverageRoute} onChange={(event) => { setBeverageRoute(event.target.value); setBeverageResult(null); }}>{coverage.stColdBeveragesPriority.routes.map((route) => <option key={route.route}>{route.route}</option>)}</select></label>
              <label>Produto<select value={beverageProduct} onChange={(event) => { setBeverageProduct(event.target.value as ColdBeverageProductCode); setBeverageResult(null); }}>{coverage.stColdBeveragesPriority.products.map((product) => <option value={product.code} key={product.code}>{product.label} · CEST {product.cest}</option>)}</select></label>
              <label>Data da operação<input type="date" min={coverage.stColdBeveragesPriority.supportedPeriod.from} max={coverage.stColdBeveragesPriority.supportedPeriod.to} value={beverageDate} onChange={(event) => { setBeverageDate(event.target.value); setBeverageResult(null); }} required /></label>
            </div>
            <fieldset><legend>Oito fatos que precisam existir no dossiê</legend>{(Object.entries(coverage.stColdBeveragesPriority.operationFactLabels) as Array<[ColdBeverageFactKey, string]>).map(([key, label]) => <label key={key}><input type="checkbox" checked={beverageFacts[key]} onChange={(event) => setBeverageFacts((current) => ({ ...current, [key]: event.target.checked }))} />{label}</label>)}</fieldset>
            <button disabled={busy === "beverages" || !beverageDate} title={!beverageDate ? "Informe a data da operação para conferir a vigência." : busy === "beverages" ? "A regra está sendo conferida." : "Confere o enquadramento sem presumir fatos ausentes."}>{busy === "beverages" ? "Conferindo regra…" : "Conferir enquadramento"}</button>
          </form>
          {beverageResult && <section className={`beverage-result ${beverageResult.status}`}><header><span>{beverageResult.status === "scoped_parameters_pending" ? "PROTOCOLO ALCANÇA A ROTA" : beverageResult.status === "protocol_not_applicable" ? "EXCEÇÃO LEGAL IDENTIFICADA" : "DADOS INSUFICIENTES"}</span><strong>{beverageResult.status === "scoped_parameters_pending" ? "PMPF/MVA ainda bloqueia o valor" : beverageResult.status === "protocol_not_applicable" ? "Usar tratamento próprio do destino" : "Sem conclusão"}</strong></header><ul>{beverageResult.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}{beverageResult.nextChecks.map((check) => <li key={check}>{check}</li>)}</ul><small>{beverageResult.limitation}</small></section>}
          <details className="beverage-route-details" open><summary>Ver os {coverage.stColdBeveragesPriority.metrics.directedRoutes} sentidos para o produto selecionado</summary><div className="beverage-route-grid">{coverage.stColdBeveragesPriority.routes.map((route) => { const cell = coverage.stColdBeveragesPriority.applicability.find((item) => item.route === route.route && item.productCode === beverageProduct); return <article key={route.route} className={cell?.status ?? "protocol_not_applicable"}><header><b>{route.origin}→{route.destination}</b><span>PRIORIDADE {String(route.corridorRank).padStart(2, "0")} · {route.direction === "outbound" ? "IDA" : "VOLTA"}</span></header><em>{cell?.status === "protocol_scoped_parameters_pending" ? "ESCOPO PROTOCOLAR" : "EXCEÇÃO / TRATAMENTO PRÓPRIO"}</em><strong>{route.pricingGate === "official_price_first_then_destination_mva" ? `PMPF → MVA de ${route.destination}` : "PMPF → MVA protocolar"}</strong><p>{cell?.reason}</p></article>; })}</div></details>
          <div className="beverage-warning"><b>Limite desta versão</b><span>As 144 células distinguem escopo e exceção por data; 35 memórias com destino a São Paulo e 10 memórias SP→MG/RJ foram abertas somente para os perfis exatos acima. Marca ou embalagem divergente, água, Simples Nacional e fallback por MVA/IVA-ST continuam sem valor.</span></div>
          <footer>{[...coverage.stColdBeveragesPriority.sources, ...coverage.stColdBeveragesSpOrigin.sources].map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={`${source.code}-${source.url}`}>{source.title} · {source.publisher} ↗</a>)}</footer>
        </section>
        <section className="auto-parts-corridor-ledger">
          <header><div><span>CORREDORES PRIORITÁRIOS · {coverage.stAutoPartsHighUseCorridors.version}</span><b>12 pares avaliados como 24 rotas independentes</b><p>{coverage.stAutoPartsHighUseCorridors.policy}</p></div><code>#{coverage.stAutoPartsHighUseCorridors.fingerprint}</code></header>
          <div className="auto-parts-corridor-kpis"><span><strong>{coverage.stAutoPartsHighUseCorridors.metrics.controlledProducts}</strong> produtos</span><span><strong>{coverage.stAutoPartsHighUseCorridors.metrics.productRouteCells}</strong> células auditadas</span><span className="active"><strong>{coverage.stAutoPartsHighUseCorridors.metrics.supportedProductRouteCells}</strong> suportadas</span><span className="reference"><strong>{coverage.stAutoPartsHighUseCorridors.metrics.deterministicProductRouteMemories}</strong> memórias em centavos</span><span className="blocked"><strong>{coverage.stAutoPartsHighUseCorridors.metrics.notSupportedProductRouteCells}</strong> bloqueadas</span></div>
          <div className="auto-parts-direction-rule"><b>Ida ≠ volta</b><span>Cada direção consulta separadamente participação no acordo, regra do destino, MVA, alíquota, FCP e transições futuras. Esta ordem é prioridade interna do produto, não estatística oficial de NF-e.</span></div>
          <form className="auto-parts-calculator" onSubmit={calculateAutoParts}>
            <header><div><span>CALCULADORA TEMPORAL</span><h3>Autopeças nas dez rotas ativas</h3><p>Selecione uma das sete identidades fiscais controladas. A descrição legal, o uso automotivo e a ST interna no destino continuam sendo fatos obrigatórios.</p></div><small>Período {new Date(`${coverage.stAutoPartsHighUseCorridors.supportedPeriod.from}T12:00:00`).toLocaleDateString("pt-BR")}–{new Date(`${coverage.stAutoPartsHighUseCorridors.supportedPeriod.to}T12:00:00`).toLocaleDateString("pt-BR")}</small></header>
            <div className="auto-parts-calculator-fields">
              <label>Produto<select value={autoPartsProductCode} onChange={(event) => { setAutoPartsProductCode(event.target.value); setAutoPartsResult(null); setAutoPartsDossierPreview(null); setAutoPartsDossier(null); }}>{coverage.stAutoPartsHighUseCorridors.products.map((product) => <option key={product.code} value={product.code}>{product.commercialLabel} · CEST {product.cest}</option>)}</select></label>
              <label>Rota<select value={autoPartsRoute} onChange={(event) => { setAutoPartsRoute(event.target.value); setAutoPartsResult(null); setAutoPartsDossierPreview(null); setAutoPartsDossier(null); }}>{coverage.stAutoPartsHighUseCorridors.routes.filter((route) => route.agreementStatus === "protocol_41_active").map((route) => <option key={route.route}>{route.route}</option>)}</select></label>
              <label>Data da operação<input type="date" min={coverage.stAutoPartsHighUseCorridors.supportedPeriod.from} max={coverage.stAutoPartsHighUseCorridors.supportedPeriod.to} value={autoPartsDate} onChange={(event) => { setAutoPartsDate(event.target.value); setAutoPartsResult(null); setAutoPartsDossierPreview(null); setAutoPartsDossier(null); }} required /></label>
              <label>Base inicial da ST<input type="number" min="0.01" max="1000000000" step="0.01" value={autoPartsValue} onChange={(event) => { setAutoPartsValue(event.target.value); setAutoPartsResult(null); setAutoPartsDossierPreview(null); setAutoPartsDossier(null); }} required /></label>
              <label>Base do ICMS próprio<input type="number" min="0.01" max="1000000000" step="0.01" value={autoPartsOwnBase} onChange={(event) => { setAutoPartsOwnBase(event.target.value); setAutoPartsResult(null); setAutoPartsDossierPreview(null); setAutoPartsDossier(null); }} required /></label>
              <label>Condição comercial<select value={autoPartsCondition} onChange={(event) => { setAutoPartsCondition(event.target.value as typeof autoPartsCondition); setAutoPartsResult(null); setAutoPartsDossierPreview(null); setAutoPartsDossier(null); }} required><option value="">Selecione</option><option value="standard">Sem fidelidade</option><option value="fidelity">Com fidelidade comprovada</option></select></label>
              <label>Cliente do dossiê<select value={autoPartsCompanyId} onChange={(event) => { setAutoPartsCompanyId(event.target.value); setAutoPartsDossier(null); }}><option value="">Sem vínculo com cliente</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>
            </div>
            <label className="auto-parts-imported"><input type="checkbox" checked={autoPartsImported} onChange={(event) => { setAutoPartsImported(event.target.checked); setAutoPartsResult(null); setAutoPartsDossierPreview(null); setAutoPartsDossier(null); }} />Mercadoria importada qualificada na Resolução do Senado 13/2012 (alíquota interestadual de 4%)</label>
            <fieldset><legend>Confirme os nove fatos documentados</legend>{(Object.entries(coverage.stAutoPartsHighUseCorridors.operationFactLabels) as Array<[AutoPartsFactKey, string]>).map(([key, label]) => <label key={key}><input type="checkbox" checked={autoPartsFacts[key]} onChange={(event) => { setAutoPartsFacts((current) => ({ ...current, [key]: event.target.checked })); setAutoPartsResult(null); setAutoPartsDossierPreview(null); setAutoPartsDossier(null); }} />{label}</label>)}</fieldset>
            <button disabled={busy === "auto-parts" || !autoPartsDate || !autoPartsCondition || !autoPartsValue || !autoPartsOwnBase} title={!autoPartsDate || !autoPartsCondition || !autoPartsValue || !autoPartsOwnBase ? "Informe data, condição comercial, valor e base própria para liberar a referência." : busy === "auto-parts" ? "A memória está sendo reproduzida." : "Executa somente o recorte jurídico controlado."}>{busy === "auto-parts" ? "Reproduzindo memória…" : "Calcular referência condicionada"}</button>
          </form>
          {autoPartsResult && <section className={`auto-parts-calculator-result ${autoPartsResult.status}`}>
            {autoPartsResult.status === "calculated_reference" && autoPartsResult.output && autoPartsResult.parameters ? <><header><span>MEMÓRIA CONDICIONAL · {autoPartsResult.route}</span><strong>{(autoPartsResult.output.destinationTotalCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong><small>ICMS-ST + FCP estimados pelo motor determinístico</small></header><div><span>Base ST<b>{(autoPartsResult.output.stBaseCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</b></span><span>MVA aplicada<b>{(autoPartsResult.output.mvaAppliedBps / 100).toFixed(2).replace(".", ",")}%</b></span><span>ICMS próprio<b>{(autoPartsResult.output.ownIcmsCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</b></span><span>ICMS-ST<b>{(autoPartsResult.output.icmsStCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</b></span><span>FCP<b>{(autoPartsResult.output.fcpCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</b></span></div><p>Interestadual {(autoPartsResult.parameters.interstateRateBps / 100).toFixed(0)}% · interna {(autoPartsResult.parameters.internalRateBps / 100).toFixed(2).replace(".", ",")}% · MVA original {(autoPartsResult.parameters.mvaOriginalBps / 100).toFixed(2).replace(".", ",")}%.</p></> : <><header><span>{autoPartsResult.status === "st_not_applicable_after_state_exclusion" ? "TRANSIÇÃO LEGAL" : "CÁLCULO BLOQUEADO"}</span><strong>{autoPartsResult.status === "st_not_applicable_after_state_exclusion" ? "ST paulista não aplicável" : "Sem valor exibido"}</strong></header><ul>{autoPartsResult.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul></>}
            <small>{autoPartsResult.limitation}</small>
          </section>}
          {autoPartsDossierPreview && <section className="auto-parts-dossier-preview">
            <header>
              <div><span>DOSSIÊ FISCAL · CHECKLIST COMPLETO</span><h3>Resultado explicável e congelável</h3><p>{autoPartsDossierPreview.coverage.reason}</p></div>
              <span className={`coverage-status ${autoPartsDossierPreview.coverage.status}`}><i />{autoPartsDossierPreview.coverage.label}</span>
            </header>
            <div className="auto-parts-dossier-metadata">
              <article><small>REGRA</small><b>{autoPartsDossierPreview.rule.version}</b><span>#{autoPartsDossierPreview.rule.fingerprint}</span></article>
              <article><small>VIGÊNCIA CONTROLADA</small><b>{new Date(`${autoPartsDossierPreview.rule.effectiveFrom}T12:00:00`).toLocaleDateString("pt-BR")}–{new Date(`${autoPartsDossierPreview.rule.effectiveTo}T12:00:00`).toLocaleDateString("pt-BR")}</b><span>fontes conferidas em {new Date(`${autoPartsDossierPreview.rule.checkedAt}T12:00:00`).toLocaleDateString("pt-BR")}</span></article>
              <article><small>PRODUTO</small><b>CEST {autoPartsDossierPreview.operation.cest} · NCM {autoPartsDossierPreview.operation.ncm}</b><span>{autoPartsDossierPreview.operation.productDescription}</span></article>
              <article><small>ENTREGA</small><b>{autoPartsDossierPreview.clientReport.ready ? "Relatório preparado" : "Relatório bloqueado"}</b><span>revisão responsável antes da entrega</span></article>
            </div>
            <details open><summary>Dados utilizados e fatos confirmados</summary>
              <div className="auto-parts-used-data">
                <span><small>Rota</small><b>{autoPartsDossierPreview.operation.route}</b></span>
                <span><small>Data</small><b>{new Date(`${autoPartsDossierPreview.operation.operationDate}T12:00:00`).toLocaleDateString("pt-BR")}</b></span>
                <span><small>Base inicial</small><b>{(autoPartsDossierPreview.operation.operationCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</b></span>
                <span><small>Base própria</small><b>{(autoPartsDossierPreview.operation.ownIcmsBaseCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</b></span>
                <span><small>Origem</small><b>{autoPartsDossierPreview.operation.importedQualified ? "Importada qualificada · 4%" : "Nacional"}</b></span>
                <span><small>Condição</small><b>{autoPartsDossierPreview.operation.commercialCondition === "fidelity" ? "Fidelidade comprovada" : "Sem fidelidade"}</b></span>
              </div>
              <div className="auto-parts-fact-ledger">{autoPartsDossierPreview.operation.confirmedFacts.map((fact) => <span className={fact.confirmed ? "confirmed" : "pending"} key={fact.code}><i>{fact.confirmed ? "✓" : "!"}</i>{fact.label}</span>)}</div>
            </details>
            <details open><summary>Memória de cálculo linha por linha</summary>
              <div className="auto-parts-memory-lines">{autoPartsDossierPreview.calculation.lines.map((line, index) => <article className={line.status} key={line.code}><span>{String(index + 1).padStart(2, "0")}</span><div><small>{line.code}</small><b>{line.label}</b><p>{line.formula}</p><em>{line.basis}</em></div><strong>{line.amountCents !== null ? (line.amountCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : line.percentageBps !== null ? `${(line.percentageBps / 100).toFixed(2).replace(".", ",")}%` : "Bloqueado"}</strong></article>)}</div>
            </details>
            <details open><summary>Fontes oficiais efetivamente aplicadas</summary>
              <div className="auto-parts-applied-sources">{autoPartsDossierPreview.evidence.sources.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.code}><span>{source.publisher}</span><b>{source.title} ↗</b><small>{source.code} · conferida em {new Date(`${source.checkedAt}T12:00:00`).toLocaleDateString("pt-BR")}</small><p>{source.proves.join(" · ")}</p></a>)}</div>
            </details>
            {(autoPartsDossierPreview.calculation.blockers.length > 0 || autoPartsDossierPreview.calculation.requiredConfirmations.length > 0) && <div className="auto-parts-dossier-blockers"><b>Pendências que impedem a conclusão</b>{[...autoPartsDossierPreview.calculation.blockers, ...autoPartsDossierPreview.calculation.requiredConfirmations].filter((item, index, rows) => rows.indexOf(item) === index).map((item) => <span key={item}>{item}</span>)}</div>}
            {autoPartsDossierPreview.rule.scheduledTransition && <div className="auto-parts-dossier-transition"><b>Mudança normativa programada · {new Date(`${autoPartsDossierPreview.rule.scheduledTransition.effectiveFrom}T12:00:00`).toLocaleDateString("pt-BR")}</b><span>{autoPartsDossierPreview.rule.scheduledTransition.description}</span></div>}
            <div className="auto-parts-dossier-actions">
              <button type="button" disabled={busy === "auto-parts-dossier"} onClick={() => void freezeAutoPartsDossier()}>{busy === "auto-parts-dossier" ? "Congelando snapshot…" : "Salvar dossiê versionado"}</button>
              {autoPartsDossier ? <a href={autoPartsDossier.reportUrl} target="_blank" rel="noreferrer">Abrir relatório para o cliente ↗</a> : <span>O relatório será liberado após salvar o snapshot.</span>}
            </div>
            <footer><b>Limite técnico</b><span>{autoPartsDossierPreview.calculation.disclaimer}</span></footer>
          </section>}
          <details className="auto-parts-corridor-details" open><summary>Ver as 24 decisões direcionais</summary><div className="auto-parts-corridor-grid">{coverage.stAutoPartsHighUseCorridors.routes.map((route) => <article key={route.route} className={route.calculationStatus}><header><b>{route.origin}→{route.destination}</b><span>PRIORIDADE {String(route.corridorRank).padStart(2, "0")} · {route.direction === "outbound" ? "IDA" : "VOLTA"}</span></header><em>{route.calculationStatus === "synthetic_reference_reproduced" ? "MEMÓRIA SINTÉTICA" : route.agreementStatus === "protocol_41_active" ? "ACORDO ATIVO · PARÂMETROS PENDENTES" : "FORA DO PROTOCOLO 41/08"}</em><strong>{route.syntheticReference ? (route.syntheticReference.destinationTotalCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : route.parameterMethod === "destination_internal_mva" ? `MVA deve vir de ${route.destination}` : route.parameterMethod === "protocol_mva" ? `MVA original ${(route.mvaOriginalBps! / 100).toFixed(2).replace(".", ",")}% · cálculo bloqueado` : "Exige tratamento próprio do destino"}</strong><p>{route.agreementReason}</p><small>{route.remainingBlockers.length} controles impedem uso automático em operação real</small>{route.scheduledReview && <mark>Revisão obrigatória em {new Date(`${route.scheduledReview.effectiveFrom}T12:00:00`).toLocaleDateString("pt-BR")}: regra paulista muda.</mark>}</article>)}</div></details>
          <div className="auto-parts-corridor-safety"><b>Resultado desta rodada</b><span>10 sentidos estão dentro do âmbito bilateral atual e têm memória sintética reproduzível; 14 falham fechados. Os valores usam operação controlada de R$ 1.000 e não representam imposto devido por um cliente sem os nove fatos documentados.</span></div>
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
      <div className="coverage-section-heading"><span>100 PACOTES MUNICIPAIS ESTRUTURADOS</span><h2>ISS municipal com fonte, status por serviço e cálculo conservador</h2><p>Os 100 municípios prioritários têm pacote fiscal e fonte oficial estruturados. Os 25 recortes exatos já comprovados preservam cálculo controlado; os outros 75 permanecem parciais e sem valor até código, alíquota, vigência, incidência, retenção, regime e exceções coincidirem com uma regra municipal versionada.</p></div>
      <div className="iss-depth-metrics">
        <article><span>Estruturados</span><strong>{coverage.issDeep.metrics.structuredCities}</strong><small>pacotes municipais profundos</small></article>
        <article className="technical"><span>Portões técnicos</span><strong>{coverage.issDeep.metrics.technicalGateValidatedCities}/100</strong><small>8 contratos reproduzíveis por cidade</small></article>
        <article><span>Regras exatas</span><strong>{coverage.issDeep.metrics.supportedServiceRules}</strong><small>recortes controlados com memória</small></article>
        <article><span>Fontes municipais</span><strong>{coverage.issDeep.metrics.officialSources}</strong><small>catálogos revisados em 100 cidades</small></article>
        <article><span>Pacotes exercitados</span><strong>{coverage.issDeep.metrics.testedCities}</strong><small>status e bloqueios reproduzidos</small></article>
        <article><span>Serviços parciais</span><strong>{coverage.issDeep.metrics.partialServiceRules}</strong><small>sem valor final até completar a regra</small></article>
      </div>
      <div className="iss-technical-round"><div><span>RODADA TÉCNICA CONCLUÍDA</span><b>100/100 pacotes passaram nos contratos do software</b><p>Unicidade, fonte HTTPS, fatos obrigatórios, status por serviço, vínculo da evidência, centavos inteiros e separação de tratamentos especiais foram exercitados. O teste prova o comportamento do motor, sem ampliar uma regra além do recorte publicado.</p></div><div><strong>{coverage.issDeep.metrics.supportedServiceRules}</strong><span>regras exatas</span><small>os outros {coverage.issDeep.metrics.partialServiceRules} serviços permanecem bloqueados</small></div></div>
      <div className="iss-depth-policy"><b>Política fail-closed · versão {coverage.issDeep.version}</b><span>{coverage.issDeep.policy}</span></div>
      <div className="city-search"><input value={cityQuery} onChange={(event) => setCityQuery(event.target.value)} placeholder="Buscar cidade ou UF" /><span>{cities.length} cidades</span></div>
      <div className="city-table"><div className="city-table-head"><span>Município</span><span>IBGE</span><span>Faixa nacional</span><span>Profundidade</span></div>{cities.map((item) => {
        const deepProfile = issDeepProfiles.get(item.ibgeCode);
        const sources = deepProfile?.sourceCodes.map((code) => issDeepSources.get(code)).filter((source): source is IssDeepSource => Boolean(source)) ?? [];
        const serviceRules = issServiceCoverage.get(item.ibgeCode) ?? [];
        const technicalEvidence = issTechnicalEvidence.get(item.ibgeCode);
        return <details key={item.ibgeCode} className={deepProfile ? "deep" : "catalogued"}><summary><span><b>{item.city}</b><small>{item.uf}</small></span><code>{item.ibgeCode}</code><strong>2%–5%</strong><em className={`iss-depth-badge ${item.depth}`}>{item.depth === "structured" ? "Profundo estruturado" : "Catalogado"}</em></summary><div><p><b>O sistema já organiza:</b> {item.supported.join(" · ")}</p>{deepProfile && <><div className="iss-review-state"><span className="passed">✓ Técnico validado · {deepProfile.technicalReview.passedChecks.length}/8</span><span className={serviceRules.some((rule) => rule.coverageStatus === "supported") ? "located" : "pending"}>{serviceRules.some((rule) => rule.coverageStatus === "supported") ? "Regra exata em recorte controlado" : "Serviço mapeado como parcial"}</span>{technicalEvidence && <code title={technicalEvidence.evidenceHash}>Evidência #{technicalEvidence.evidenceHash.slice(0, 12)}</code>}</div><p><b>Incidência:</b> {deepProfile.placeOfIncidence.generalRule}</p><div className="iss-service-rules">{serviceRules.map((rule) => <article key={rule.code} className={rule.coverageStatus}><header><span>{rule.coverageStatus === "supported" ? "SUPORTADO" : rule.coverageStatus === "partial" ? "PARCIAL" : "NÃO SUPORTADO"}</span><b>LC 116 · {rule.lc116Item}</b></header><p>{rule.description}</p><small>Código municipal: {rule.municipalServiceCode ?? "pendente"} · alíquota: {rule.rate.bps === null ? "não liberada" : `${(rule.rate.bps / 100).toFixed(2).replace(".", ",")}%`} · versão {rule.version}</small><small>Vigência: {rule.effectiveFrom ?? "a individualizar"} → {rule.effectiveTo ?? "vigente sem termo final catalogado"}</small><p><b>Local:</b> {rule.placeOfIncidence.conclusion}</p><p><b>Responsável:</b> {rule.withholding.conclusion}</p><p><b>Auditoria:</b> {rule.audit.conclusion}</p>{rule.blockers.length > 0 && <p className="iss-blockers"><b>Impede conclusão:</b> {rule.blockers.join(" · ")}</p>}</article>)}</div><details className="iss-special-treatments"><summary>Exportação, sociedades profissionais e regimes especiais</summary><p><b>Exportação:</b> {deepProfile.specialTreatments.export.conclusion}</p><p><b>Sociedade profissional:</b> {deepProfile.specialTreatments.professionalSociety.conclusion}</p><p><b>Regime especial:</b> {deepProfile.specialTreatments.specialRegime.conclusion}</p></details><div className="iss-source-links">{sources.map((source) => <a key={source.code} href={source.url} target="_blank" rel="noreferrer"><span>{source.kind === "municipal_law" ? "LEI" : source.kind === "rate_table" ? "TABELA" : "ORIENTAÇÃO"}</span><b>{source.title}</b><small>{source.legalReference} · {source.linkAudit.status === "verified_reachable" ? "link verificado" : "servidor requer rechecagem"} em {new Date(`${source.checkedAt}T12:00:00`).toLocaleDateString("pt-BR")} ↗</small></a>)}</div></>}<p className="iss-blockers"><b>Conclusão municipal geral ainda bloqueada por:</b> {item.blockers.join(" · ")}</p></div></details>;
      })}</div>
    </section>}

    {tab === "federal" && <section className="federal-scenario-area">
      <div className="coverage-section-heading"><span>CENÁRIOS RECORRENTES</span><h2>Simples, PIS/Cofins, IRPJ/CSLL e retenções</h2><p>A versão 26 já organiza as obrigações federais; esta camada mostra quais cenários possuem triagem, memória ou bloqueio de apuração.</p></div>
      <div className="federal-scenario-grid">{coverage.recurringScenarios.map((item) => <article key={item.code}><header><span>{item.tax}</span><StatusPill status={item.status} /></header><h3>{item.title}</h3><p><b>Disponível</b>{item.supported.join(" · ")}</p><p><b>Exige confirmação</b>{item.blockers.join(" · ")}</p></article>)}</div>
      <section className="official-calculator-card"><div><span>REFORMA TRIBUTÁRIA</span><h2>Calculadora oficial integrada por encaminhamento seguro</h2><p>Abra o motor oficial da Receita para calcular CBS, IBS e Imposto Seletivo com a mesma versão disponibilizada pela Administração Tributária. O CBSHub não substitui o resultado por estimativa própria.</p><div><b>O que preservamos</b><span>versão da base · fatos da operação · memória oficial · revisão profissional</span></div></div><a href="https://consumo.tributos.gov.br/servico/calcular-tributos-consumo/calculadora/regime-geral" target="_blank" rel="noreferrer">Abrir calculadora oficial <span>↗</span></a></section>
    </section>}

    {tab === "documents" && <section className="batch-import-area">
      <div className="coverage-section-heading"><span>NF-e · NFS-e · SPED</span><h2>Importação em lote auditável e retomável</h2><p>Envie até 25 arquivos. Cada documento é processado isoladamente, o progresso fica registrado e o XML/TXT bruto é descartado imediatamente. A importação nunca altera um cálculo final.</p></div>
      <form className="batch-drop" onSubmit={importBatch}><label><input type="file" multiple accept=".xml,.txt" onChange={(event) => { setFiles(Array.from(event.target.files ?? []).slice(0, 25)); setBatchKey(""); setBatch(null); }} /><span>＋</span><b>Selecionar documentos fiscais</b><small>XML NF-e/NFS-e ou TXT SPED · 5 MB por arquivo · 30 MB por lote</small></label>{files.length > 0 && <div className="batch-selection"><span>{files.length} arquivo(s) selecionado(s)</span><small>{(files.reduce((sum, file) => sum + file.size, 0) / 1_000_000).toFixed(2)} MB</small></div>}{batch && <div className="batch-progress" aria-live="polite"><span><i style={{ width: `${batch.progress.percentage}%` }} /></span><b>{batch.progress.processed} de {batch.progress.total} · {batch.progress.percentage}%</b></div>}<button disabled={!files.length || busy === "batch"} title={!files.length ? "Selecione ao menos um XML ou TXT para liberar a importação." : busy === "batch" ? "O lote selecionado está sendo processado." : "Importa no máximo 25 arquivos dentro dos limites informados."}>{busy === "batch" ? `Processando ${batch?.progress.processed ?? 0} de ${files.length}…` : batch?.status === "completed" ? "Validar novamente com idempotência" : "Importar e validar lote"}</button></form>
      {batch && <div className="batch-result"><header><div><span>{batch.status === "completed" ? "LOTE CONCLUÍDO" : "LOTE EM PROCESSAMENTO"}</span><h3>{batch.metrics.total} documentos processados</h3><p>{batch.message}</p></div><div><b>{batch.metrics.accepted}</b><small>aceitos</small><b>{batch.metrics.warning}</b><small>revisar</small><b>{batch.metrics.blocked}</b><small>bloqueados</small></div></header><div>{batch.items.map((item) => <article key={`${item.ordinal}-${item.sourceHash}`} className={item.status}><span>{item.documentType.toUpperCase()}</span><p><b>{item.filename}</b><small>fonte #{item.sourceHash} · evidência #{item.evidenceHash}</small></p><strong>{item.status === "accepted" ? "Aceito" : item.status === "warning" ? "Revisar" : "Bloqueado"}</strong><details><summary>Auditoria e pendências</summary><small><b>Adaptador:</b> {item.adapterCode ?? "não identificado"} · cobertura {item.coverageStatus}</small>{item.issueDetails.map((entry) => <small key={entry.code}><b>{entry.code}</b> · {entry.message}</small>)}<small className="calculation-gate"><b>Não alimenta cálculo final</b> · {item.calculationBlockers[0]}</small></details></article>)}</div></div>}
    </section>}

    {tab === "governance" && <section className="governance-area">
      <div className="monitor-panel"><div className="coverage-section-heading"><span>MONITOR DIÁRIO PERSISTENTE</span><h2>Alterações viram fila, bloqueio e trilha de auditoria</h2><p>{monitor?.policy ?? "Consultando fontes oficiais…"}</p></div>{monitor && <>
        <div className="monitor-kpis">
          <span><b>{monitor.metrics.monitored}</b>fontes catalogadas</span>
          <span><b>{monitor.metrics.attemptedToday}</b>fontes processadas</span>
          <span><b>{monitor.metrics.checked}</b>verificações concluídas</span>
          <span className={monitor.metrics.unavailableToday ? "alert" : ""}><b>{monitor.metrics.unavailableToday}</b>indisponíveis no ciclo</span>
          <span className={monitor.metrics.changeSignals ? "alert" : ""}><b>{monitor.metrics.changeSignals}</b>itens para triagem</span>
          <span className={monitor.metrics.potentiallyNormative ? "alert" : ""}><b>{monitor.metrics.potentiallyNormative}</b>sinais normativos</span>
          <span className={monitor.metrics.invalidatedResults ? "alert" : ""}><b>{monitor.metrics.invalidatedResults}</b>entregas bloqueadas</span>
          <span><b>{monitor.metrics.expiringRules}</b>regras vencendo</span>
          <span className={monitor.metrics.expiredRules ? "alert" : ""}><b>{monitor.metrics.expiredRules}</b>regras vencidas</span>
        </div>
        <div className={`governance-catalog-status ${monitor.catalogValidation.passed ? "passed" : "blocked"}`}>
          <b>{monitor.catalogValidation.passed ? "✓ Estrutura do catálogo válida" : "! Estrutura do catálogo bloqueada"}</b>
          <span>{monitor.catalogValidation.sources} fontes cadastradas para monitoramento diário. Esta validação confirma campos, vínculos e duplicidades — não comprova disponibilidade nem atualização do conteúdo.</span>
        </div>
        <div className={`governance-cycle-status ${monitor.operationalStatus.level}`}>
          <div><b>{monitor.operationalStatus.title}</b><span>Ciclo {monitor.operationalStatus.cycleDate} · referência {monitor.operationalStatus.timezone}</span></div>
          <div className="governance-cycle-metrics">
            <span><b>{monitor.metrics.dailyShardsCompleted}/{monitor.metrics.expectedShardsToday}</b> lotes previstos até agora</span>
            <span><b>{monitor.metrics.dailyShardsCompleted}/{monitor.metrics.dailyShardsTotal}</b> ciclo completo</span>
            <span><b>{monitor.metrics.checked}</b> verificadas</span>
            <span><b>{monitor.metrics.unavailableToday}</b> indisponíveis</span>
            <span><b>{monitor.metrics.sourcesWithoutBaseline}</b> sem captura-base</span>
            {monitor.metrics.retriedShardsToday > 0 && <span><b>{monitor.metrics.retriedShardsToday}</b> lote(s) recuperados por retry</span>}
            {monitor.metrics.delayedShardsToday > 0 && <span className="alert"><b>{monitor.metrics.delayedShardsToday}</b> lote(s) atrasados</span>}
            {monitor.metrics.failedShardsToday > 0 && <span className="alert"><b>{monitor.metrics.failedShardsToday}</b> lote(s) com falha</span>}
          </div>
        </div>
        <div className="governance-queue-summary">
          <b>{monitor.queueBreakdown.total} itens aguardam classificação</b>
          <span>{monitor.queueBreakdown.newSources} fontes novas · {monitor.queueBreakdown.potentiallyNormative} sinais potencialmente normativos · {monitor.queueBreakdown.editorial} editoriais · {monitor.queueBreakdown.technical} técnicos · {monitor.queueBreakdown.unavailable} indisponibilidades · {monitor.queueBreakdown.recovered} recuperações · {monitor.queueBreakdown.legacyContentChanged} alterações legadas</span>
          <small>Item na fila não significa mudança de lei. Nenhuma captura altera regra ou cálculo automaticamente.</small>
        </div>
        <div className={`governance-catalog-status ${monitor.connectorHealth.contract.passed && monitor.connectorHealth.openIncidents === 0 ? "passed" : "blocked"}`}>
          <b>{!monitor.connectorHealth.contract.passed ? "! Contratos dos conectores inválidos" : monitor.connectorHealth.openIncidents > 0 ? "Contratos válidos · operação com pendências" : `${monitor.connectorHealth.contract.connectors} conectores oficiais operacionais`}</b>
          <span>{monitor.connectorHealth.contract.connectors} conectores contratados · NF-e · RTC · CONFAZ · RFB · DOU · {monitor.connectorHealth.parsed} capturas interpretadas · {monitor.connectorHealth.blocked} bloqueadas · {monitor.connectorHealth.openIncidents} incidentes abertos</span>
        </div>
        <section className={`fiscal-freshness-panel ${monitor.freshness.metrics.level}`}>
          <header><div><span>FRESCOR FISCAL · {monitor.freshness.version}</span><h3>Prova temporal por fonte, versão e SLA</h3><p>{monitor.freshness.policy}</p></div><b>{monitor.freshness.metrics.level === "current" ? "ATUAL" : monitor.freshness.metrics.level === "attention" ? "ATENÇÃO" : monitor.freshness.metrics.level === "degraded" ? "REBAIXADA" : "SEM EVIDÊNCIA"}</b></header>
          <div className="fiscal-freshness-kpis">
            <span><b>{monitor.freshness.metrics.current}</b>dentro do SLA</span>
            <span className={monitor.freshness.metrics.partial ? "attention" : ""}><b>{monitor.freshness.metrics.partial}</b>rebaixadas para parcial</span>
            <span className={monitor.freshness.metrics.notSupported ? "blocked" : ""}><b>{monitor.freshness.metrics.notSupported}</b>não suportadas por frescor</span>
            <span className={monitor.freshness.metrics.overdue ? "blocked" : ""}><b>{monitor.freshness.metrics.overdue}</b>SLAs vencidos</span>
            <span className={monitor.freshness.metrics.unavailable ? "blocked" : ""}><b>{monitor.freshness.metrics.unavailable}</b>indisponíveis</span>
            <span className={monitor.freshness.metrics.pendingChanges ? "attention" : ""}><b>{monitor.freshness.metrics.pendingChanges}</b>mudanças pendentes</span>
          </div>
          <div className="fiscal-freshness-sla"><b>SLA por criticidade</b>{(["critical", "high", "standard"] as const).map((level) => <span key={level}><strong>{monitor.freshness.sla[level].label}</strong> {monitor.freshness.sla[level].hours}h · alerta em {monitor.freshness.sla[level].warningHours}h</span>)}</div>
          <div className="fiscal-freshness-filter" aria-label="Filtrar fontes por estado de frescor"><button type="button" className={freshnessFilter === "all" ? "active" : ""} onClick={() => setFreshnessFilter("all")}>Todas ({monitor.freshness.sources.length})</button><button type="button" className={freshnessFilter === "attention" ? "active" : ""} onClick={() => setFreshnessFilter("attention")}>Atenção ({monitor.freshness.metrics.partial})</button><button type="button" className={freshnessFilter === "degraded" ? "active" : ""} onClick={() => setFreshnessFilter("degraded")}>Rebaixadas ({monitor.freshness.metrics.notSupported})</button></div>
          <div className="fiscal-freshness-sources">{monitor.freshness.sources.filter((source) => freshnessFilter === "all" || freshnessFilter === "attention" ? source.coverageEffect === "partial" : source.coverageEffect === "not_supported").slice(0, 100).map((source) => <article className={`${source.status} ${source.coverageEffect}`} key={source.code}><div><span>{freshnessLabel(source.status)}</span><b>{source.code} · {source.criticality}</b><p>{source.title}</p></div><div><small>Conferida: {source.checkedAt ? new Date(source.checkedAt).toLocaleString("pt-BR") : "sem captura"} · versão {source.sourceVersion} · #{source.contentFingerprint ?? "sem hash"}</small><small>SLA: {source.slaHours}h · idade {elapsedLabel(source.ageMinutes)} · impacto: {statusLabel[source.coverageEffect]}</small><p>{source.reason}</p><em>Regras: {source.impactedRuleCodes.join(" · ") || "não vinculadas"}</em></div><a href={source.sourceUrl} target="_blank" rel="noreferrer">Fonte ↗</a></article>)}</div>
          <div className="fiscal-freshness-timing"><b>Tempos de resposta (histórico auditável)</b>{(["detect", "block", "correct", "recertify"] as const).map((metric) => <span key={metric}><strong>{metric === "detect" ? "Detectar" : metric === "block" ? "Bloquear" : metric === "correct" ? "Corrigir" : "Recertificar"}</strong><em>{elapsedLabel(monitor.freshness.timing[metric].averageMinutes)} médio · p95 {elapsedLabel(monitor.freshness.timing[metric].p95Minutes)} · {monitor.freshness.timing[metric].samples} amostra(s)</em></span>)}</div>
          {monitor.canReviewNormativeChanges && <details className="fiscal-freshness-history"><summary>Entregas de alerta, resumos e incidentes</summary><div><p><b>Resumo diário:</b> {monitor.freshness.summaries[0] ? `${String(monitor.freshness.summaries[0].day_key)} · ${String(monitor.freshness.summaries[0].status)} · e-mail ${String(monitor.freshness.summaries[0].email_status)}` : "ainda não gerado"}</p><p><b>Alertas recentes:</b> {monitor.freshness.alerts.slice(0, 5).map((alert) => `${String(alert.source_code ?? "resumo")}: ${String(alert.status)}`).join(" · ") || "nenhum"}</p><p><b>Incidentes normativos:</b> {monitor.freshness.incidents.length} registrado(s) · {monitor.freshness.metrics.openIncidents} aberto(s). Detalhes sensíveis permanecem internos.</p></div></details>}
        </section>
        <section className="governance-subsection">
          <header><div><span>FILA DE ANÁLISE</span><h3>Mudanças detectadas</h3></div><b>{monitor.metrics.pendingReview} aguardam revisão · {monitor.metrics.awaitingNewVersion} aguardam versão</b></header>
          {monitor.queue.length === 0 ? <p className="governance-empty">Nenhum item pendente de triagem. A ausência de sinal não substitui a conferência do caso concreto.</p> : <div className="governance-queue">{monitor.queue.map((item) => <article key={item.id}>
            <span className={item.status}>{normativeChangeLabel(item.changeKind, item.status)}</span>
            <div><b>{item.sourceCode} · {item.jurisdiction}</b><p>{item.legalDevice}</p><small>{item.impactedRuleCodes.join(" · ")} · detectada em {new Date(item.detectedAt).toLocaleString("pt-BR")}</small></div>
            <a href={item.sourceUrl} target="_blank" rel="noreferrer">Fonte ↗</a>
          </article>)}{monitor.queueBreakdown.total > monitor.queue.length && <p className="governance-empty">Exibindo os {monitor.queue.length} itens mais recentes de {monitor.queueBreakdown.total} pendências.</p>}</div>}
        </section>
        {monitor.canReviewNormativeChanges && monitor.queue.length > 0 && <form className="governance-review-form" onSubmit={submitGovernanceReview}>
          <h3>Registrar decisão profissional assinada</h3>
          <label>Mudança<select value={governanceReview.eventId} onChange={(event) => setGovernanceReview({ ...governanceReview, eventId: event.target.value })}>{monitor.queue.map((item) => <option value={item.id} key={item.id}>{item.sourceCode} · {item.status}</option>)}</select></label>
          <div>
            <label>Responsável<select value={governanceReview.professionalRole} onChange={(event) => setGovernanceReview({ ...governanceReview, professionalRole: event.target.value as GovernanceReview["professionalRole"] })}><option value="accountant">Contador</option><option value="tax_lawyer">Tributarista</option></select></label>
            <label>Registro profissional<input value={governanceReview.professionalRegistration} onChange={(event) => setGovernanceReview({ ...governanceReview, professionalRegistration: event.target.value })} placeholder="CRC SP-123456/O-7" /></label>
          </div>
          <label>Decisão<select value={governanceReview.decision} onChange={(event) => setGovernanceReview({ ...governanceReview, decision: event.target.value as GovernanceReview["decision"] })}><option value="no_legal_impact">Sem impacto jurídico nas regras</option><option value="new_version_required">Exige nova versão</option><option value="superseded_by_new_version">Resolvida por nova versão</option></select></label>
          <label>Justificativa técnica<textarea value={governanceReview.decisionNote} onChange={(event) => setGovernanceReview({ ...governanceReview, decisionNote: event.target.value })} minLength={20} maxLength={2000} required /></label>
          {governanceReview.decision === "superseded_by_new_version" && <div>
            <label>Versão nova<input value={governanceReview.releaseVersion} onChange={(event) => setGovernanceReview({ ...governanceReview, releaseVersion: event.target.value })} placeholder="rules-2026.07.2" required /></label>
            <label>Resumo da versão<textarea value={governanceReview.releaseSummary} onChange={(event) => setGovernanceReview({ ...governanceReview, releaseSummary: event.target.value })} minLength={20} maxLength={4000} required /></label>
          </div>}
          <label className="approval-declaration"><input type="checkbox" checked={governanceReview.declarationAccepted} onChange={(event) => setGovernanceReview({ ...governanceReview, declarationAccepted: event.target.checked })} />Confirmo a responsabilidade profissional pela decisão e pela evidência registrada nesta trilha.</label>
          <button disabled={busy === "governance-review" || !governanceReview.declarationAccepted} title={!governanceReview.declarationAccepted ? "Leia e aceite a declaração de responsabilidade para registrar a decisão." : busy === "governance-review" ? "A decisão está sendo assinada." : "Registra a decisão e sua trilha de auditoria."}>{busy === "governance-review" ? "Assinando…" : "Registrar decisão"}</button>
        </form>}
        <section className="governance-subsection">
          <header><div><span>SAÚDE DAS REGRAS</span><h3>Vigência, fonte e fingerprint</h3></div><b>{monitor.rules.length} versões</b></header>
          <div className="governance-rule-grid">{monitor.rules.map((rule) => <article className={rule.health} key={`${rule.code}-${rule.version}`}><span>{rule.health === "current" ? "VIGENTE" : rule.health === "expiring" ? "VENCENDO" : rule.health === "expired" ? "VENCIDA" : rule.health === "future" ? "FUTURA" : "SEM FONTE"}</span><b>{rule.name}</b><small>{rule.code} · {rule.version} · #{rule.fingerprint}</small><em>{rule.effectiveFrom} → {rule.effectiveTo} · {rule.sourceCount} fonte(s)</em></article>)}</div>
        </section>
        <details className="governance-source-catalog"><summary>Ver cadastro canônico e últimas capturas ({monitor.sources.length})</summary><div>{monitor.sources.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.code}><span className={source.captureStatus}>{source.captureStatus === "checked" ? "✓" : source.captureStatus === "unavailable" ? "!" : "·"}</span><p><b>{source.title}</b><small>{source.jurisdiction} · {source.criticality} · monitor diário · vigência {source.effectiveFrom ?? "a individualizar"} · #{source.contentFingerprint ?? "sem captura"} · {source.attempts} tentativa(s){source.notModified ? " · HTTP 304" : ""}{source.failureCode ? ` · ${source.failureCode}` : ""}{source.connectorId ? ` · ${source.connectorId.toUpperCase()} ${source.detectedVersion ?? "sem versão extraída"} · ${source.parseStatus}` : ""}</small></p><em>{source.promotionStatus === "blocked_contract" ? "Contrato bloqueado" : source.connectorId ? "Metadado para revisão" : source.accessPath === "official_alternative" ? "Alternativa técnica" : source.verificationStatus === "rule_evidence" ? "Evidência" : "Monitor"}</em></a>)}</div></details>
        <details className="governance-run-history"><summary>Histórico de mudanças e decisões ({monitor.changeHistory.length})</summary>{monitor.changeHistory.map((event) => <p key={event.id}><b>{event.sourceCode} · {event.changeKind}</b><span>{event.status} · detectada em {new Date(event.detectedAt).toLocaleString("pt-BR")}{event.resolvedAt ? ` · decidida em ${new Date(event.resolvedAt).toLocaleString("pt-BR")}` : " · decisão pendente"}</span></p>)}</details>
        <details className="governance-run-history"><summary>Histórico append-only das execuções ({monitor.runs.length})</summary>{monitor.runs.map((run) => <p key={run.id}><b>{run.runDate}</b><span>{run.status} · {run.checked}/{run.sourceCount} conferidas · {run.unavailable} indisponíveis · {run.changes} mudanças · {run.attempts} tentativa(s){run.errorCode ? ` · ${run.errorCode}` : ""}</span></p>)}</details>
      </>}</div>
      <div className="approval-panel"><div className="coverage-section-heading"><span>GARANTIA EM DUAS CAMADAS</span><h2>Teste automático agora; responsabilidade no caso concreto</h2><p>A base técnica é liberada por controles reproduzíveis. Nenhuma assinatura humana é exigida para consultar referências condicionais ou executar a bateria automática.</p></div>
        <div className={`automatic-assurance-card ${automaticAssurance.status}`}><span>{automaticAssurance.status === "automatically_verified" ? "✓" : "!"}</span><div><small>VERIFICAÇÃO AUTOMÁTICA · #{automaticAssurance.fingerprint}</small><h3>{automaticAssurance.status === "automatically_verified" ? "Base técnica íntegra" : "Base técnica bloqueada"}</h3><p>{automaticAssurance.metrics.modulesPassed}/{automaticAssurance.metrics.modules} módulos · {automaticAssurance.metrics.totalRuns} células · {automaticAssurance.metrics.referenceReproduced} referências reproduzidas · {automaticAssurance.metrics.safelyBlocked} bloqueios seguros</p></div></div>
        <div className="professional-boundary"><span>RESPONSABILIDADE PROFISSIONAL</span><h3>Não é requisito para testar o motor</h3><p>Continua sendo uma camada separada quando um contador ou tributarista assumir, assinar e entregar uma análise de operação real ao cliente. O software não se apresenta como profissional habilitado.</p>{governance?.professionalApprovalVerified && governance.approval ? <small>Revisão adicional registrada por {governance.approval.reviewerName} · {governance.approval.professionalRegistration} · #{governance.identity.ruleHash}</small> : <small>Nenhuma assinatura adicional nesta versão — isso não bloqueia as referências automáticas.</small>}</div>
      </div>
    </section>}
  </div>;
}

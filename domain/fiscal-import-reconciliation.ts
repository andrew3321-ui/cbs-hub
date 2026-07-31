import { ICMS_GENERAL_NATIONAL_VERSION, resolveIcmsGeneralNational, type IcmsUfCode } from "./icms-general-national.ts";
import { issDeepExpansionByIbge, ISS_DEEP_EXPANSION_VERSION } from "./iss-deep-expansion.ts";
import type { NfeAuditResult } from "./nfe-audit.ts";
import { SERVICE_WITHHOLDINGS_DEEP_VERSION, serviceWithholdingProfiles } from "./service-withholdings-deep.ts";
import { TAX_DETERMINATION_ENGINE_VERSION, taxDeterminationBlueprint } from "./tax-determination.ts";

export const FISCAL_IMPORT_RECONCILIATION_VERSION = "fiscal-import-reconciliation.v1";

export type FiscalImportEngineReconciliation = {
  code: string;
  engine: string;
  engineVersion: string;
  status: "matched" | "requires_confirmation" | "blocked";
  documentPath: string;
  facts: Record<string, string | number | boolean | null>;
  resultCode: string;
  blockers: string[];
  sourceCodes: string[];
};

const ufCodes = new Set([
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
]);

function uf(value: string | null): IcmsUfCode | null {
  return value && ufCodes.has(value) ? value as IcmsUfCode : null;
}

export function reconcileNfeWithExistingEngines(audit: NfeAuditResult): FiscalImportEngineReconciliation[] {
  const origin = uf(audit.header.issuerState);
  const destination = uf(audit.header.recipientState);
  const operationDate = audit.header.issuedAt?.slice(0, 10) ?? null;
  return audit.items.map((item) => {
    const facts = {
      origin,
      destination,
      operationDate,
      ncm: item.ncm,
      cest: item.cest,
      cfop: item.cfop,
      cst: item.cst,
      csosn: item.csosn,
      productValueCents: item.productValueCents,
      stDeclared: (item.stBaseCents ?? 0) > 0 || (item.stValueCents ?? 0) > 0,
      difalDeclared: (item.difalDestinationValueCents ?? 0) > 0 || (item.difalOriginValueCents ?? 0) > 0,
      returnOperation: audit.header.isReturn,
    };
    if (!origin || !destination || !operationDate || !item.ncm || item.productValueCents === null) {
      return {
        code: `NFE-ITEM-${item.itemNumber}-ICMS-ENGINE`,
        engine: "ICMS geral nacional",
        engineVersion: ICMS_GENERAL_NATIONAL_VERSION,
        status: "blocked" as const,
        documentPath: item.trace.icms,
        facts,
        resultCode: "minimum_facts_missing",
        blockers: ["UF de origem/destino, data, NCM e valor do item são obrigatórios para consultar o motor."],
        sourceCodes: [],
      };
    }
    const engine = resolveIcmsGeneralNational({
      origin,
      destination,
      recipientType: "taxpayer",
      finalConsumer: false,
      purpose: "resale",
      importedQualified: false,
      operationDate,
      operationValueCents: item.productValueCents,
      ncm: item.ncm,
      generalRateAppliesConfirmed: false,
      noSpecificRateBenefitConfirmed: false,
      stStatus: facts.stDeclared ? "applicable" : "unknown",
      fcpStatus: "unknown",
    });
    return {
      code: `NFE-ITEM-${item.itemNumber}-ICMS-ENGINE`,
      engine: "ICMS geral nacional",
      engineVersion: ICMS_GENERAL_NATIONAL_VERSION,
      status: engine.status === "route_to_st" ? "matched" : "requires_confirmation",
      documentPath: item.trace.icms,
      facts,
      resultCode: engine.status,
      blockers: engine.blockers,
      sourceCodes: engine.sourceCodes,
    };
  });
}

export function reconcileNfseWithExistingEngines(input: {
  municipalityCode: string | null;
  serviceCode: string | null;
  retained: boolean | null;
}): FiscalImportEngineReconciliation[] {
  const city = input.municipalityCode ? issDeepExpansionByIbge.get(input.municipalityCode) ?? null : null;
  const serviceProfile = serviceWithholdingProfiles.find((profile) => profile.lc116Items.includes(input.serviceCode ?? "")) ?? null;
  return [
    {
      code: "NFSE-MUNICIPAL-ISS-ENGINE",
      engine: "ISS municipal estruturado",
      engineVersion: ISS_DEEP_EXPANSION_VERSION,
      status: city ? "matched" : "requires_confirmation",
      documentPath: "NFSe.servico.localIncidencia",
      facts: { municipalityCode: input.municipalityCode, serviceCode: input.serviceCode, retained: input.retained },
      resultCode: city ? city.code : "municipality_not_in_deep_catalog",
      blockers: city ? [...city.blockers] : ["Município não localizado na camada profunda; não presumir alíquota, retenção ou vencimento."],
      sourceCodes: city?.sourceCodes ?? [],
    },
    {
      code: "NFSE-SERVICE-WITHHOLDING-ENGINE",
      engine: "Retenções sobre serviços",
      engineVersion: SERVICE_WITHHOLDINGS_DEEP_VERSION,
      status: serviceProfile ? "matched" : "requires_confirmation",
      documentPath: "NFSe.servico.itemListaServico",
      facts: { serviceCode: input.serviceCode, retained: input.retained },
      resultCode: serviceProfile?.code ?? "service_profile_not_mapped",
      blockers: serviceProfile ? [] : ["O item da NFS-e não identifica sozinho contrato, regime das partes e hipótese de retenção."],
      sourceCodes: serviceProfile?.sourceCodes ?? [],
    },
  ];
}

export function reconcileSpedWithExistingEngines(input: {
  documentRecords: number;
  assessmentRecords: number;
  divergenceCount: number;
}): FiscalImportEngineReconciliation[] {
  const hasDocuments = input.documentRecords > 0;
  const hasAssessment = input.assessmentRecords > 0;
  return [{
    code: "SPED-DOCUMENT-ASSESSMENT-LEDGER",
    engine: "Livro de apuração assistida",
    engineVersion: TAX_DETERMINATION_ENGINE_VERSION,
    status: hasDocuments && hasAssessment && input.divergenceCount === 0 ? "matched" : "requires_confirmation",
    documentPath: "EFD-ICMS-IPI.Blocos-C-E",
    facts: input,
    resultCode: taxDeterminationBlueprint.schemaVersion,
    blockers: [
      ...(hasDocuments ? [] : ["Registros documentais prioritários não localizados."]),
      ...(hasAssessment ? [] : ["Registros de apuração prioritários não localizados."]),
      ...(input.divergenceCount ? ["Divergências estruturais precisam ser resolvidas antes do livro fiscal."] : []),
    ],
    sourceCodes: ["SPED-EFD-GUIDE-3.2.2"],
  }];
}

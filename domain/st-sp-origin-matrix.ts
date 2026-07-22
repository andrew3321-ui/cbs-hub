import { stateCoverage, stSegments, type UfCode } from "./national-tax-coverage.ts";
import { ST_GENERAL_MANDATORY_FACTS, stSpMgLegalPackages, type StLegalFactCode } from "./st-sp-mg-legal.ts";

export const ST_SP_ORIGIN_MATRIX_VERSION = "2026.07.21-v59";
export const ST_SP_ORIGIN_MATRIX_CHECKED_AT = "2026-07-21";

export type StSpOriginCell = {
  key: string;
  origin: "SP";
  destination: Exclude<UfCode, "SP">;
  segmentCode: string;
  status: "structured_blocked" | "existing_validated_reference";
  destinationSourceCode: string;
  requiredEvidence: string[];
  blockers: string[];
};

export const stSpOriginMandatoryFacts: StLegalFactCode[] = [...ST_GENERAL_MANDATORY_FACTS];

export const stSpOriginDestinations = stateCoverage
  .filter((state) => state.uf !== "SP")
  .map((state) => ({ uf: state.uf as Exclude<UfCode, "SP">, name: state.name, officialPortal: state.officialPortal, sourceCode: `SEFAZ-${state.uf}` }));

const existingMgReferences = new Set(stSpMgLegalPackages
  .filter((item) => item.legalStatus === "calculation_validated")
  .map((item) => item.segmentCode));

const requiredEvidence = [
  "ato CONFAZ vigente para a rota e mercadoria, quando exigível",
  "ato de internalização e tabela vigente da UF de destino",
  "correspondência exata entre descrição, NCM e CEST",
  "MVA original/ajustada, PMPF ou preço sugerido aplicável",
  "alíquota interna, alíquota interestadual e FCP confirmados",
  "benefícios, reduções, diferimentos e regimes especiais afastados ou aplicados",
  "responsável, prazo, documento e código de recolhimento definidos",
];

export const stSpOriginCells: StSpOriginCell[] = stSpOriginDestinations.flatMap((destination) => stSegments.map((segment) => {
  const existingValidatedReference = destination.uf === "MG" && existingMgReferences.has(segment.code);
  return {
    key: `SP-${destination.uf}:${segment.code}`,
    origin: "SP" as const,
    destination: destination.uf,
    segmentCode: segment.code,
    status: existingValidatedReference ? "existing_validated_reference" as const : "structured_blocked" as const,
    destinationSourceCode: destination.sourceCode,
    requiredEvidence: [...requiredEvidence],
    blockers: existingValidatedReference ? [
      "a referência existente vale apenas para o recorte CEST/NCM e período já documentado",
      "o cálculo concreto continua dependendo dos valores e fatos completos da operação",
    ] : [
      "acordo e vigência da rota ainda não foram confirmados para este segmento",
      "tabela, parâmetros e exceções da UF de destino ainda não foram extraídos",
      "cálculo desabilitado até a reprodução determinística e a evidência jurídica passarem",
    ],
  };
}));

export function stSpOriginMatrixMetrics() {
  return {
    destinations: stSpOriginDestinations.length,
    segments: stSegments.length,
    structuredCells: stSpOriginCells.length,
    existingValidatedReferences: stSpOriginCells.filter((cell) => cell.status === "existing_validated_reference").length,
    calculationsBlocked: stSpOriginCells.filter((cell) => cell.status === "structured_blocked").length,
    mandatoryFacts: stSpOriginMandatoryFacts.length,
  };
}

export function validateStSpOriginMatrix() {
  const errors: string[] = [];
  const keys = new Set(stSpOriginCells.map((cell) => cell.key));
  const expectedKeys = new Set(stSpOriginDestinations.flatMap((destination) => stSegments.map((segment) => `SP-${destination.uf}:${segment.code}`)));
  if (stSpOriginDestinations.length !== 26) errors.push("matrix_must_have_26_destinations");
  if (stSegments.length !== 25) errors.push("matrix_must_have_25_segments");
  if (stSpOriginCells.length !== 650 || keys.size !== 650) errors.push("matrix_must_have_650_unique_cells");
  if ([...expectedKeys].some((key) => !keys.has(key))) errors.push("matrix_has_missing_route_segment_cell");
  if (stSpOriginDestinations.some((destination) => !destination.officialPortal.startsWith("https://"))) errors.push("destination_must_have_official_https_source");
  if (stSpOriginCells.some((cell) => cell.requiredEvidence.length !== requiredEvidence.length || cell.blockers.length === 0)) errors.push("cell_has_incomplete_legal_gate");
  if (stSpOriginCells.filter((cell) => cell.status === "existing_validated_reference").length !== 3) errors.push("only_three_existing_references_expected");
  return { passed: errors.length === 0, errors };
}

export async function hashStSpOriginMatrix() {
  const payload = JSON.stringify({ version: ST_SP_ORIGIN_MATRIX_VERSION, destinations: stSpOriginDestinations, mandatoryFacts: stSpOriginMandatoryFacts, cells: stSpOriginCells });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

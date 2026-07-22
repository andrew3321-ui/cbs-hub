import { stSpOriginDestinations } from "./st-sp-origin-matrix.ts";
import type { UfCode } from "./national-tax-coverage.ts";

export const ST_CEMENT_SP_ROUTES_VERSION = "2026.07.21-v61";
export const ST_CEMENT_SP_ROUTES_CHECKED_AT = "2026-07-21";

export const ST_CEMENT_PROTOCOL_SOURCE = {
  code: "CONFAZ-PROTOCOL-ICM-11-1985",
  title: "Protocolo ICM 11/85 — cimento de qualquer espécie",
  publisher: "CONFAZ",
  url: "https://www.confaz.fazenda.gov.br/legislacao/protocolos/1985/pt011_85",
  checkedAt: ST_CEMENT_SP_ROUTES_CHECKED_AT,
} as const;

export const ST_CEMENT_PRODUCT_SOURCE = {
  code: "CONFAZ-CONVENIO-ICMS-142-2018-ANNEX-VI",
  title: "Convênio ICMS 142/18 — Anexo VI, cimentos",
  publisher: "CONFAZ",
  url: "https://www.confaz.fazenda.gov.br/legislacao/convenios/2018/CV142_18",
  checkedAt: ST_CEMENT_SP_ROUTES_CHECKED_AT,
} as const;

type DestinationUf = Exclude<UfCode, "SP">;
type CementRouteStatus =
  | "agreement_mva_structured"
  | "agreement_structured_destination_mva_pending"
  | "not_signatory_to_protocol_11_85";

const destinationLawMvaUfs = new Set<DestinationUf>(["AL", "MT", "PR", "RS", "SC", "SE"]);
const protocolSignatories = new Set<UfCode>([
  "AC", "AL", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA",
  "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",
]);

export type StCementSpRoute = {
  key: string;
  origin: "SP";
  destination: DestinationUf;
  destinationName: string;
  product: { segmentCode: "CEMENT"; cest: "05.001.00"; ncm: ["2523"]; description: "Cimento de qualquer espécie" };
  protocol: typeof ST_CEMENT_PROTOCOL_SOURCE.code;
  protocolStatus: "signatory_route" | "destination_not_signatory";
  legalStatus: CementRouteStatus;
  responsibleParty: "industrial_or_importer_as_tax_substitute" | null;
  mvaOriginalBps: 2000 | null;
  mvaSource: "protocol_fixed_20_percent" | "destination_internal_law_required" | "not_applicable";
  calculationStatus: "blocked_destination_parameters" | "blocked_protocol_not_applicable";
  pricingRule: string;
  dueRule: string | null;
  operationConditions: string[];
  exclusions: string[];
  confirmedLegalInputs: string[];
  missingLegalInputs: string[];
  sourceUrls: string[];
};

export const stCementSpRoutes: StCementSpRoute[] = stSpOriginDestinations.map((destination) => {
  const isSignatory = protocolSignatories.has(destination.uf);
  const needsDestinationMva = destinationLawMvaUfs.has(destination.uf);
  const legalStatus: CementRouteStatus = !isSignatory
    ? "not_signatory_to_protocol_11_85"
    : needsDestinationMva
      ? "agreement_structured_destination_mva_pending"
      : "agreement_mva_structured";

  return {
    key: `SP-${destination.uf}:CEMENT`,
    origin: "SP",
    destination: destination.uf,
    destinationName: destination.name,
    product: { segmentCode: "CEMENT", cest: "05.001.00", ncm: ["2523"], description: "Cimento de qualquer espécie" },
    protocol: ST_CEMENT_PROTOCOL_SOURCE.code,
    protocolStatus: isSignatory ? "signatory_route" : "destination_not_signatory",
    legalStatus,
    responsibleParty: isSignatory ? "industrial_or_importer_as_tax_substitute" : null,
    mvaOriginalBps: isSignatory && !needsDestinationMva ? 2000 : null,
    mvaSource: !isSignatory ? "not_applicable" : needsDestinationMva ? "destination_internal_law_required" : "protocol_fixed_20_percent",
    calculationStatus: isSignatory ? "blocked_destination_parameters" : "blocked_protocol_not_applicable",
    pricingRule: isSignatory
      ? "Preço máximo de varejo; na ausência, preço da operação acrescido de IPI, frete, seguro e demais despesas, com MVA ajustada, ressalvada base alternativa determinada pelo destino."
      : "O Protocolo ICM 11/85 não fundamenta esta rota; eventual tratamento no destino exige fonte própria.",
    dueRule: isSignatory ? "Até o décimo dia do mês subsequente ao da saída, em favor da unidade federada de destino." : null,
    operationConditions: isSignatory ? [
      "operação interestadual entre contribuintes do ICMS situados em unidades signatárias",
      "mercadoria classificada na posição NCM 2523",
      "remetente industrial ou importador, observadas as hipóteses do protocolo",
      "saída subsequente ou entrada destinada a uso ou consumo do destinatário",
    ] : [
      "confirmar regra autônoma do destino antes de atribuir responsabilidade ou calcular imposto",
    ],
    exclusions: isSignatory ? [
      "destino a sujeito passivo por substituição da mesma mercadoria",
      "transferência para outro estabelecimento não varejista do sujeito passivo por substituição, conforme a cláusula primeira",
    ] : [],
    confirmedLegalInputs: isSignatory ? [
      "âmbito interestadual do Protocolo ICM 11/85",
      "produto NCM 2523",
      "responsabilidade-base do industrial ou importador",
      needsDestinationMva ? "MVA original remetida à legislação interna do destino" : "MVA-ST original de 20% prevista no protocolo",
      "fórmula de MVA ajustada e ordem de formação da base",
      "prazo-base de recolhimento do protocolo",
    ] : [
      "Amazonas não consta entre os signatários e aderentes consolidados do Protocolo ICM 11/85",
    ],
    missingLegalInputs: isSignatory ? [
      ...(needsDestinationMva ? ["MVA original vigente na legislação interna do destino"] : []),
      "internalização e disciplina vigente na legislação do destino",
      "alíquota interna ou carga efetiva aplicável ao produto",
      "FCP aplicável ao produto e período",
      "preço máximo, média ponderada ou outra base determinada pelo destino",
      "benefícios, reduções, diferimentos e regimes especiais",
      "qualificação concreta do remetente, destinatário, operação e período",
    ] : [
      "fundamento legal interestadual ou regra autônoma vigente no Amazonas",
      "responsável tributário, base, alíquota, FCP, prazo e documento de recolhimento",
      "qualificação concreta do remetente, destinatário, operação e período",
    ],
    sourceUrls: [ST_CEMENT_PROTOCOL_SOURCE.url, ST_CEMENT_PRODUCT_SOURCE.url, destination.officialPortal],
  };
});

export const stCementSpRouteByDestination = new Map(stCementSpRoutes.map((route) => [route.destination, route]));

export function stCementSpRouteMetrics() {
  return {
    destinations: stCementSpRoutes.length,
    signatoryRoutes: stCementSpRoutes.filter((route) => route.protocolStatus === "signatory_route").length,
    fixedMvaRoutes: stCementSpRoutes.filter((route) => route.mvaSource === "protocol_fixed_20_percent").length,
    destinationLawMvaRoutes: stCementSpRoutes.filter((route) => route.mvaSource === "destination_internal_law_required").length,
    nonSignatoryRoutes: stCementSpRoutes.filter((route) => route.protocolStatus === "destination_not_signatory").length,
    newlyReleasedCalculations: 0,
  };
}

export function validateStCementSpRoutes() {
  const errors: string[] = [];
  const metrics = stCementSpRouteMetrics();
  if (metrics.destinations !== 26 || new Set(stCementSpRoutes.map((route) => route.destination)).size !== 26) errors.push("cement_routes_must_cover_26_unique_destinations");
  if (metrics.signatoryRoutes !== 25 || metrics.nonSignatoryRoutes !== 1) errors.push("cement_protocol_signatory_partition_is_invalid");
  if (metrics.fixedMvaRoutes !== 19 || metrics.destinationLawMvaRoutes !== 6) errors.push("cement_mva_partition_is_invalid");
  if (stCementSpRoutes.find((route) => route.destination === "AM")?.legalStatus !== "not_signatory_to_protocol_11_85") errors.push("amazonas_must_not_be_inferred_as_protocol_signatory");
  if (stCementSpRoutes.some((route) => route.mvaSource === "protocol_fixed_20_percent" && route.mvaOriginalBps !== 2000)) errors.push("fixed_protocol_mva_must_be_20_percent");
  if (stCementSpRoutes.some((route) => route.calculationStatus.startsWith("blocked") && route.missingLegalInputs.length === 0)) errors.push("blocked_cement_route_must_explain_missing_inputs");
  if (stCementSpRoutes.some((route) => route.sourceUrls.length !== 3 || route.sourceUrls.some((url) => !url.startsWith("https://")))) errors.push("cement_route_requires_three_https_sources");
  return { passed: errors.length === 0, errors };
}

export async function hashStCementSpRoutes() {
  const payload = JSON.stringify({ version: ST_CEMENT_SP_ROUTES_VERSION, sources: [ST_CEMENT_PROTOCOL_SOURCE, ST_CEMENT_PRODUCT_SOURCE], routes: stCementSpRoutes });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

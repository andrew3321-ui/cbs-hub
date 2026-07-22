import { calculateRepresentativeStMemory } from "./st-sp-mg-legal.ts";

export const ST_CEMENT_PRIORITY_BATCH_VERSION = "2026.07.21-v62";
export const ST_CEMENT_PRIORITY_BATCH_CHECKED_AT = "2026-07-21";

type PriorityUf = "RJ" | "ES" | "BA" | "GO" | "MS";

type CementPrioritySource = {
  code: string;
  title: string;
  publisher: string;
  url: string;
  checkedAt: typeof ST_CEMENT_PRIORITY_BATCH_CHECKED_AT;
  proves: string[];
};

export const stCementPrioritySources: CementPrioritySource[] = [
  {
    code: "RJ-RICMS-LIVRO-II-ANEXO-I",
    title: "RICMS/RJ — Livro II, Anexo I, mercadorias sujeitas à ST",
    publisher: "SEFAZ-RJ",
    url: "https://portal.fazenda.rj.gov.br/icms/wp-content/uploads/sites/42/2023/10/anexo_I_livroII_2.pdf",
    checkedAt: ST_CEMENT_PRIORITY_BATCH_CHECKED_AT,
    proves: ["CEST 05.001.00", "NCM 2523", "MVA original 20%", "MVA ajustada 32% para alíquota interestadual de 12%", "âmbito do Protocolo ICM 11/85"],
  },
  {
    code: "RJ-ICMS-INTERNAL-RATES-FECP",
    title: "Alíquotas internas do ICMS e FECP",
    publisher: "SEFAZ-RJ",
    url: "https://portal.fazenda.rj.gov.br/pagamentos/aliquotas-internas/",
    checkedAt: ST_CEMENT_PRIORITY_BATCH_CHECKED_AT,
    proves: ["alíquota interna padrão de 20%", "adicional geral de FECP de 2%"],
  },
  {
    code: "ES-PORTARIA-35R-ST-CURRENT",
    title: "Portaria nº 35-R — tabela atualizada de substituição tributária",
    publisher: "SEFAZ-ES",
    url: "https://www2.sefaz.es.gov.br/LegislacaoOnline/lpext.dll/infobaselegislacaoonline/portarias/2020/port035-r%20-atualizada.htm?2.0=&f=templates&fn=document-frame.htm",
    checkedAt: ST_CEMENT_PRIORITY_BATCH_CHECKED_AT,
    proves: ["CEST 05.001.00", "NCM 2523", "exclusão do cimento branco", "MVA original 20%", "MVA ajustada 27,23% para alíquota interestadual de 12%"],
  },
  {
    code: "BA-RICMS-ANNEX-I-2026",
    title: "RICMS/BA — Anexo 1 vigente em 2026",
    publisher: "SEFAZ-BA",
    url: "https://mbusca.sefaz.ba.gov.br/ditri/normas_complementares/decretos/decreto_2012_13780_ricms_anexo_1_vigente_2026.pdf",
    checkedAt: ST_CEMENT_PRIORITY_BATCH_CHECKED_AT,
    proves: ["CEST 05.001.00", "NCM 2523", "MVA original 20%", "MVA ajustada 32,83% para alíquota interestadual de 12%", "Protocolo ICM 11/85 exceto Amazonas"],
  },
  {
    code: "GO-DECREE-10799-2025",
    title: "Decreto estadual nº 10.799 — tabela de MVA de cimento",
    publisher: "Secretaria da Economia de Goiás",
    url: "https://appasp.economia.go.gov.br/Legislacao/arquivos/Decretos/D_10799.htm",
    checkedAt: ST_CEMENT_PRIORITY_BATCH_CHECKED_AT,
    proves: ["CEST 05.001.00", "NCM 2523", "MVA original 20%", "MVA ajustada 30,37% para alíquota interestadual de 12%"],
  },
  {
    code: "MS-DECREE-14359-2015",
    title: "Decreto estadual nº 14.359 — Tabela VI, cimentos",
    publisher: "SEFAZ-MS",
    url: "https://aacpdappls.net.ms.gov.br/appls/legislacao/serc/legato.nsf/fd8600de8a55c7fc04256b210079ce25/f59aa0fb393af02a04257f2900442c54",
    checkedAt: ST_CEMENT_PRIORITY_BATCH_CHECKED_AT,
    proves: ["CEST 05.001.00", "NCM 2523", "MVA original 20%", "MVA ajustada 27,23% para alíquota interestadual de 12%"],
  },
  {
    code: "MS-PORTARIA-SAT-3252-2023",
    title: "Portaria/SAT nº 3.252 — PMPF de cimento por produto",
    publisher: "SEFAZ-MS",
    url: "https://aacpdappls.net.ms.gov.br/appls/legislacao/serc/legato.nsf/7382b3a89b695e7a04256b1f00725c1e/ee89650eed4b809804258a780046bf7b",
    checkedAt: ST_CEMENT_PRIORITY_BATCH_CHECKED_AT,
    proves: ["existência de PMPF de cimento por GTIN", "necessidade de consultar a lista vigente antes de usar MVA"],
  },
];

const sourceByCode = new Map(stCementPrioritySources.map((source) => [source.code, source]));

export type StCementPriorityState = {
  destination: PriorityUf;
  route: `SP-${PriorityUf}`;
  legalStatus: "synthetic_reference_reproduced" | "state_parameters_structured" | "pmpf_gate_structured";
  productScope: string;
  productExclusions: string[];
  mvaOriginalBps: 2000;
  publishedAdjustedMvaBpsFor12: number;
  calculationMethod: "mva_adjusted" | "pmpf_by_gtin_or_mva_fallback";
  officialInternalRateBps: number | null;
  officialFcpRateBps: number | null;
  arithmeticCrossCheckRateBps: number;
  arithmeticCrossCheckScope: "consistency_check_not_independent_rate_source";
  sourceCodes: string[];
  confirmedInputs: string[];
  remainingBlockers: string[];
  syntheticReference: null | ReturnType<typeof calculateRepresentativeStMemory>;
};

const referenceInput = {
  operationCents: 100_000,
  ownIcmsBaseCents: 100_000,
  mvaOriginalBps: 2_000,
  interstateRateBps: 1_200,
  internalRateBps: 2_000,
  fcpRateBps: 200,
  adjustMva: true,
};

export const stCementPriorityStates: StCementPriorityState[] = [
  {
    destination: "RJ",
    route: "SP-RJ",
    legalStatus: "synthetic_reference_reproduced",
    productScope: "Cimento, CEST 05.001.00, NCM 2523",
    productExclusions: [],
    mvaOriginalBps: 2000,
    publishedAdjustedMvaBpsFor12: 3200,
    calculationMethod: "mva_adjusted",
    officialInternalRateBps: 2000,
    officialFcpRateBps: 200,
    arithmeticCrossCheckRateBps: 2000,
    arithmeticCrossCheckScope: "consistency_check_not_independent_rate_source",
    sourceCodes: ["RJ-RICMS-LIVRO-II-ANEXO-I", "RJ-ICMS-INTERNAL-RATES-FECP"],
    confirmedInputs: ["produto e rota", "MVA original e ajustada", "alíquota interna padrão", "FECP geral", "alíquota interestadual de 12%"],
    remainingBlockers: ["confirmar ausência de benefício, redução ou regime especial", "confirmar remetente, destinatário, finalidade, período e componentes do valor", "confirmar que a base aplicável ao produto concreto é MVA"],
    syntheticReference: calculateRepresentativeStMemory(referenceInput),
  },
  {
    destination: "ES",
    route: "SP-ES",
    legalStatus: "state_parameters_structured",
    productScope: "Cimento de qualquer espécie, CEST 05.001.00, NCM 2523",
    productExclusions: ["cimento branco"],
    mvaOriginalBps: 2000,
    publishedAdjustedMvaBpsFor12: 2723,
    calculationMethod: "mva_adjusted",
    officialInternalRateBps: null,
    officialFcpRateBps: null,
    arithmeticCrossCheckRateBps: 1700,
    arithmeticCrossCheckScope: "consistency_check_not_independent_rate_source",
    sourceCodes: ["ES-PORTARIA-35R-ST-CURRENT"],
    confirmedInputs: ["produto com exclusão expressa do cimento branco", "MVA original e ajustada", "alíquota interestadual de 12%"],
    remainingBlockers: ["confirmar alíquota interna vigente em fonte autônoma", "confirmar incidência ou não de FCP", "afastar PMPF, benefício, redução e regime especial", "confirmar fatos e valores da operação"],
    syntheticReference: null,
  },
  {
    destination: "BA",
    route: "SP-BA",
    legalStatus: "state_parameters_structured",
    productScope: "Cimento, CEST 05.001.00, NCM 2523",
    productExclusions: [],
    mvaOriginalBps: 2000,
    publishedAdjustedMvaBpsFor12: 3283,
    calculationMethod: "mva_adjusted",
    officialInternalRateBps: null,
    officialFcpRateBps: null,
    arithmeticCrossCheckRateBps: 2050,
    arithmeticCrossCheckScope: "consistency_check_not_independent_rate_source",
    sourceCodes: ["BA-RICMS-ANNEX-I-2026"],
    confirmedInputs: ["produto e rota", "MVA original e ajustada vigentes em 2026", "alíquota interestadual de 12%"],
    remainingBlockers: ["confirmar alíquota interna vigente em fonte autônoma", "confirmar incidência ou não de FCP", "afastar benefício, redução e regime especial", "confirmar fatos e valores da operação"],
    syntheticReference: null,
  },
  {
    destination: "GO",
    route: "SP-GO",
    legalStatus: "state_parameters_structured",
    productScope: "Cimento, CEST 05.001.00, NCM 2523",
    productExclusions: [],
    mvaOriginalBps: 2000,
    publishedAdjustedMvaBpsFor12: 3037,
    calculationMethod: "mva_adjusted",
    officialInternalRateBps: null,
    officialFcpRateBps: null,
    arithmeticCrossCheckRateBps: 1900,
    arithmeticCrossCheckScope: "consistency_check_not_independent_rate_source",
    sourceCodes: ["GO-DECREE-10799-2025"],
    confirmedInputs: ["produto e rota", "MVA original e ajustada da tabela estadual", "alíquota interestadual de 12%"],
    remainingBlockers: ["confirmar alíquota interna vigente em fonte autônoma", "confirmar incidência ou não de FCP", "afastar pauta, benefício, redução e regime especial", "confirmar fatos e valores da operação"],
    syntheticReference: null,
  },
  {
    destination: "MS",
    route: "SP-MS",
    legalStatus: "pmpf_gate_structured",
    productScope: "Cimento, CEST 05.001.00, NCM 2523",
    productExclusions: [],
    mvaOriginalBps: 2000,
    publishedAdjustedMvaBpsFor12: 2723,
    calculationMethod: "pmpf_by_gtin_or_mva_fallback",
    officialInternalRateBps: null,
    officialFcpRateBps: null,
    arithmeticCrossCheckRateBps: 1700,
    arithmeticCrossCheckScope: "consistency_check_not_independent_rate_source",
    sourceCodes: ["MS-DECREE-14359-2015", "MS-PORTARIA-SAT-3252-2023"],
    confirmedInputs: ["produto e rota", "MVA original e ajustada de fallback", "existência de PMPF estadual por GTIN"],
    remainingBlockers: ["consultar PMPF vigente pelo GTIN e apresentação", "confirmar alíquota interna e FECOMP aplicáveis", "afastar benefício, isenção e regime especial", "confirmar fatos e valores da operação"],
    syntheticReference: null,
  },
];

export const stCementPriorityStateByDestination = new Map(stCementPriorityStates.map((state) => [state.destination, state]));

function calculateAdjustedMvaBps(mvaOriginalBps: number, interstateRateBps: number, internalRateBps: number) {
  const numerator = (10_000 + mvaOriginalBps) * (10_000 - interstateRateBps);
  return Math.floor((numerator + Math.floor((10_000 - internalRateBps) / 2)) / (10_000 - internalRateBps)) - 10_000;
}

export function stCementPriorityBatchMetrics() {
  return {
    statesInBatch: stCementPriorityStates.length,
    officialStateSources: stCementPrioritySources.length,
    adjustedMvaTablesSourced: stCementPriorityStates.filter((state) => state.publishedAdjustedMvaBpsFor12 > 0).length,
    productExceptionsStructured: stCementPriorityStates.filter((state) => state.productExclusions.length > 0).length,
    pmpfGatesStructured: stCementPriorityStates.filter((state) => state.calculationMethod === "pmpf_by_gtin_or_mva_fallback").length,
    syntheticReferencesReproduced: stCementPriorityStates.filter((state) => state.syntheticReference !== null).length,
  };
}

export function validateStCementPriorityBatch() {
  const errors: string[] = [];
  if (stCementPriorityStates.length !== 5 || new Set(stCementPriorityStates.map((state) => state.destination)).size !== 5) errors.push("priority_batch_must_have_five_unique_states");
  if (stCementPrioritySources.length !== 7 || new Set(stCementPrioritySources.map((source) => source.code)).size !== 7) errors.push("priority_batch_sources_must_be_unique");
  if (stCementPrioritySources.some((source) => !source.url.startsWith("https://") || source.proves.length === 0)) errors.push("priority_source_must_be_official_https_with_scope");
  for (const state of stCementPriorityStates) {
    if (state.sourceCodes.some((code) => !sourceByCode.has(code))) errors.push(`unknown_priority_source:${state.destination}`);
    if (calculateAdjustedMvaBps(state.mvaOriginalBps, 1200, state.arithmeticCrossCheckRateBps) !== state.publishedAdjustedMvaBpsFor12) errors.push(`adjusted_mva_cross_check_failed:${state.destination}`);
    if (state.remainingBlockers.length === 0) errors.push(`state_must_keep_real_operation_gate:${state.destination}`);
  }
  const rj = stCementPriorityStateByDestination.get("RJ");
  if (rj?.syntheticReference?.mvaAppliedBps !== 3200 || rj.syntheticReference.destinationTotalCents !== 17_040) errors.push("rj_synthetic_reference_did_not_reproduce");
  if (stCementPriorityStates.some((state) => state.destination !== "RJ" && state.syntheticReference !== null)) errors.push("only_rj_can_release_synthetic_reference_in_v62");
  return { passed: errors.length === 0, errors };
}

export async function hashStCementPriorityBatch() {
  const payload = JSON.stringify({ version: ST_CEMENT_PRIORITY_BATCH_VERSION, sources: stCementPrioritySources, states: stCementPriorityStates });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

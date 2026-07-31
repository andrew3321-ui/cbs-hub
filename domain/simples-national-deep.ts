export const SIMPLES_NATIONAL_DEEP_VERSION = "2026.07.31-v93";
export const SIMPLES_NATIONAL_DEEP_CHECKED_AT = "2026-07-31";
export const SIMPLES_NATIONAL_LIMIT_CENTS = 480_000_000;
export const SIMPLES_NATIONAL_2026_SUBLIMIT_CENTS = 360_000_000;

export type SimplesAnnex = "I" | "II" | "III" | "IV" | "V";
export type SimplesSource = {
  code: string;
  title: string;
  publisher: string;
  url: string;
  legalReference: string;
  checkedAt: string;
};
export type SimplesActivityProfile = {
  rank: number;
  cnae: string;
  activity: string;
  annexCandidates: SimplesAnnex[];
  factorR: "required" | "not_applicable";
  treatment: "commerce" | "industry" | "service" | "construction_or_labor_assignment";
  sourceCodes: string[];
  segregations: string[];
  hardStops: string[];
  classificationPolicy: "candidate_requires_effective_activity_confirmation";
  effectiveFrom: "2018-01-01";
  checkedAt: string;
  version: string;
};
export type SimplesCalculationInput = {
  cnae: string;
  declaredAnnex: SimplesAnnex;
  rbt12Cents: number | null;
  monthlyRevenueCents: number | null;
  fs12Cents?: number | null;
  activityConfirmed: boolean;
  annexConfirmed: boolean;
  revenueCompositionConfirmed: boolean;
  periodClosed: boolean;
  eligibilityConfirmed: boolean;
  under2026SublimitConfirmed: boolean;
  noSpecialTreatment: boolean;
  calculationPeriod?: string;
  businessStartedLessThan13Months?: boolean;
  startActivityRbt12AnnualizationConfirmed?: boolean;
};
export type SimplesCalculationLine = {
  code: string;
  label: string;
  formula: string;
  amountCents: number | null;
  rateBps: number | null;
};
export type SimplesCalculationResult = {
  status: "calculated_reference" | "blocked";
  profile: SimplesActivityProfile | null;
  resolvedAnnex: SimplesAnnex | null;
  bracket: number | null;
  factorRBps: number | null;
  lines: SimplesCalculationLine[];
  blockers: string[];
  warnings: string[];
  sourceCodes: string[];
  version: string;
  checkedAt: string;
};

export const simplesNationalSources: SimplesSource[] = [
  {
    code: "SIMPLES-LC-123",
    title: "Lei Complementar nº 123/2006 — texto compilado",
    publisher: "Presidência da República",
    url: "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm",
    legalReference: "arts. 3º, 17 a 20 e Anexos I a V",
    checkedAt: SIMPLES_NATIONAL_DEEP_CHECKED_AT,
  },
  {
    code: "SIMPLES-CGSN-140",
    title: "Resolução CGSN nº 140/2018 — texto compilado",
    publisher: "Receita Federal do Brasil",
    url: "https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=92278&visao=compilado",
    legalReference: "arts. 2º, 9º a 12, 15, 22 e 25 a 28",
    checkedAt: SIMPLES_NATIONAL_DEEP_CHECKED_AT,
  },
  {
    code: "SIMPLES-PERGUNTAO-2026",
    title: "Perguntas e Respostas do Simples Nacional",
    publisher: "Portal do Simples Nacional",
    url: "https://www8.receita.fazenda.gov.br/SimplesNacional/Arquivos/manual/PerguntaoSN.pdf",
    legalReference: "receita bruta, sublimites, atividades, segregações e fator R",
    checkedAt: SIMPLES_NATIONAL_DEEP_CHECKED_AT,
  },
  {
    code: "SIMPLES-SUBLIMITE-2026",
    title: "Sublimite do Simples Nacional para 2026",
    publisher: "Comitê Gestor do Simples Nacional",
    url: "https://www8.receita.fazenda.gov.br/simplesnacional/noticias/NoticiaCompleta.aspx?id=94c10cc2-7eb5-4ef0-bfb2-5479e72caff8",
    legalReference: "Portaria CGSN nº 54/2025 — R$ 3.600.000 em todas as UFs e no DF",
    checkedAt: SIMPLES_NATIONAL_DEEP_CHECKED_AT,
  },
  {
    code: "CNAE-CONCLA",
    title: "Busca oficial da Classificação Nacional de Atividades Econômicas",
    publisher: "IBGE / CONCLA",
    url: "https://concla.ibge.gov.br/busca-online-cnae.html",
    legalReference: "descrições e notas explicativas das subclasses CNAE",
    checkedAt: SIMPLES_NATIONAL_DEEP_CHECKED_AT,
  },
];

type AnnexBracket = {
  fromCents: number;
  toCents: number;
  nominalBps: number;
  deductionCents: number;
};

const limits = [
  [0, 18_000_000],
  [18_000_001, 36_000_000],
  [36_000_001, 72_000_000],
  [72_000_001, 180_000_000],
  [180_000_001, 360_000_000],
  [360_000_001, 480_000_000],
] as const;

function table(rates: readonly number[], deductions: readonly number[]): AnnexBracket[] {
  return limits.map(([fromCents, toCents], index) => ({
    fromCents,
    toCents,
    nominalBps: rates[index],
    deductionCents: deductions[index],
  }));
}

export const simplesAnnexTables: Record<SimplesAnnex, AnnexBracket[]> = {
  I: table([400, 730, 950, 1070, 1430, 1900], [0, 594_000, 1_386_000, 2_250_000, 8_730_000, 37_800_000]),
  II: table([450, 780, 1000, 1120, 1470, 3000], [0, 594_000, 1_386_000, 2_250_000, 8_550_000, 72_000_000]),
  III: table([600, 1120, 1350, 1600, 2100, 3300], [0, 936_000, 1_764_000, 3_564_000, 12_564_000, 64_800_000]),
  IV: table([450, 900, 1020, 1400, 2200, 3300], [0, 810_000, 1_242_000, 3_978_000, 18_378_000, 82_800_000]),
  V: table([1550, 1800, 1950, 2050, 2300, 3050], [0, 450_000, 990_000, 1_710_000, 6_210_000, 54_000_000]),
};

const commonStops = [
  "CNAE não substitui a confirmação da atividade efetivamente exercida",
  "receitas de atividades ou tratamentos diferentes precisam ser segregadas",
  "impedimentos societários, cadastrais, fiscais e de atividade precisam ser descartados",
] as const;
const tradeSegregations = ["ICMS-ST/antecipação com encerramento", "PIS/Cofins monofásico", "exportação", "vendas canceladas e descontos incondicionais"];
const serviceSegregations = ["ISS retido ou devido fora do estabelecimento", "exportação de serviços", "receita sujeita a fator R", "atividade de outro anexo"];

function profile(
  rank: number,
  cnae: string,
  activity: string,
  annexCandidates: SimplesAnnex[],
  factorR: SimplesActivityProfile["factorR"],
  treatment: SimplesActivityProfile["treatment"],
  segregations: string[],
  extraStops: string[] = [],
): SimplesActivityProfile {
  return {
    rank,
    cnae,
    activity,
    annexCandidates,
    factorR,
    treatment,
    sourceCodes: ["SIMPLES-LC-123", "SIMPLES-CGSN-140", "SIMPLES-PERGUNTAO-2026", "CNAE-CONCLA"],
    segregations,
    hardStops: [...commonStops, ...extraStops],
    classificationPolicy: "candidate_requires_effective_activity_confirmation",
    effectiveFrom: "2018-01-01",
    checkedAt: SIMPLES_NATIONAL_DEEP_CHECKED_AT,
    version: SIMPLES_NATIONAL_DEEP_VERSION,
  };
}

export const simplesActivityProfiles: SimplesActivityProfile[] = [
  profile(1, "4711302", "Supermercados", ["I"], "not_applicable", "commerce", tradeSegregations),
  profile(2, "4530703", "Comércio varejista de peças e acessórios novos para veículos", ["I"], "not_applicable", "commerce", tradeSegregations),
  profile(3, "4781400", "Comércio varejista de artigos do vestuário e acessórios", ["I"], "not_applicable", "commerce", tradeSegregations),
  profile(4, "1091102", "Fabricação de produtos de padaria e confeitaria com predominância própria", ["II"], "not_applicable", "industry", [...tradeSegregations, "receita de revenda no Anexo I", "IPI e industrialização por encomenda"]),
  profile(5, "3101200", "Fabricação de móveis com predominância de madeira", ["II"], "not_applicable", "industry", [...tradeSegregations, "receita de revenda no Anexo I", "IPI e benefícios de produto"]),
  profile(6, "6920601", "Atividades de contabilidade", ["III"], "not_applicable", "service", serviceSegregations, ["atividade típica contábil e regra municipal de ISS precisam coincidir"]),
  profile(7, "4520001", "Serviços de manutenção e reparação mecânica de veículos", ["III"], "not_applicable", "service", [...serviceSegregations, "peças e mercadorias comercializadas no Anexo I"]),
  profile(8, "9602501", "Cabeleireiros, manicure e pedicure", ["III"], "not_applicable", "service", [...serviceSegregations, "produtos revendidos no Anexo I", "modelo salão-parceiro"]),
  profile(9, "8599604", "Treinamento em desenvolvimento profissional e gerencial", ["III"], "not_applicable", "service", serviceSegregations),
  profile(10, "6201501", "Desenvolvimento de programas de computador sob encomenda", ["III", "V"], "required", "service", serviceSegregations),
  profile(11, "6204000", "Consultoria em tecnologia da informação", ["III", "V"], "required", "service", serviceSegregations),
  profile(12, "7020400", "Consultoria em gestão empresarial", ["III", "V"], "required", "service", serviceSegregations),
  profile(13, "7311400", "Agências de publicidade", ["III", "V"], "required", "service", [...serviceSegregations, "valores de terceiros e receitas próprias"]),
  profile(14, "7112000", "Serviços de engenharia", ["III", "V"], "required", "service", serviceSegregations, ["obra executada, projeto e cessão de mão de obra não podem ser confundidos"]),
  profile(15, "8630503", "Atividade médica ambulatorial restrita a consultas", ["III", "V"], "required", "service", serviceSegregations),
  profile(16, "8630504", "Atividade odontológica", ["III", "V"], "required", "service", serviceSegregations),
  profile(17, "7500100", "Atividades veterinárias", ["III", "V"], "required", "service", [...serviceSegregations, "medicamentos e mercadorias revendidos"]),
  profile(18, "4120400", "Construção de edifícios", ["IV"], "not_applicable", "construction_or_labor_assignment", serviceSegregations, ["CPP patronal permanece fora do DAS", "empreitada e cessão de mão de obra exigem fatos próprios"]),
  profile(19, "4321500", "Instalação e manutenção elétrica", ["IV"], "not_applicable", "construction_or_labor_assignment", serviceSegregations, ["CPP patronal permanece fora do DAS", "obra e manutenção isolada precisam ser distinguidas"]),
  profile(20, "8121400", "Limpeza em prédios e domicílios", ["IV"], "not_applicable", "construction_or_labor_assignment", serviceSegregations, ["CPP patronal permanece fora do DAS", "cessão de mão de obra e retenção previdenciária"]),
  profile(21, "4723700", "Comércio varejista de bebidas", ["I"], "not_applicable", "commerce", tradeSegregations),
  profile(22, "4744001", "Comércio varejista de ferragens e ferramentas", ["I"], "not_applicable", "commerce", tradeSegregations),
  profile(23, "4772500", "Comércio varejista de cosméticos, perfumaria e higiene pessoal", ["I"], "not_applicable", "commerce", tradeSegregations),
  profile(24, "4771701", "Comércio varejista de produtos farmacêuticos sem manipulação", ["I"], "not_applicable", "commerce", tradeSegregations, ["manipulação de fórmulas possui segregação própria por forma de atendimento"]),
  profile(25, "4751201", "Comércio varejista especializado de equipamentos e suprimentos de informática", ["I"], "not_applicable", "commerce", tradeSegregations),
  profile(26, "4753900", "Comércio varejista especializado de eletrodomésticos e equipamentos de áudio e vídeo", ["I"], "not_applicable", "commerce", tradeSegregations),
  profile(27, "4761003", "Comércio varejista de artigos de papelaria", ["I"], "not_applicable", "commerce", tradeSegregations),
  profile(28, "4789005", "Comércio varejista de produtos saneantes domissanitários", ["I"], "not_applicable", "commerce", tradeSegregations),
  profile(29, "4789004", "Comércio varejista de animais vivos e artigos e alimentos para animais", ["I"], "not_applicable", "commerce", tradeSegregations),
  profile(30, "4742300", "Comércio varejista de material elétrico", ["I"], "not_applicable", "commerce", tradeSegregations),
  profile(31, "1052000", "Fabricação de laticínios", ["II"], "not_applicable", "industry", [...tradeSegregations, "receita de revenda no Anexo I", "benefícios e alíquota zero por produto"]),
  profile(32, "1066000", "Fabricação de alimentos para animais", ["II"], "not_applicable", "industry", [...tradeSegregations, "receita de revenda no Anexo I", "produto e espécie animal"]),
  profile(33, "1105400", "Fabricação de águas envasadas e bebidas não alcoólicas", ["II"], "not_applicable", "industry", [...tradeSegregations, "receita de revenda no Anexo I", "bebida e embalagem exatas"]),
  profile(34, "1412601", "Confecção de peças do vestuário", ["II"], "not_applicable", "industry", [...tradeSegregations, "receita de revenda no Anexo I", "industrialização por encomenda"]),
  profile(35, "2063100", "Fabricação de cosméticos, perfumaria e higiene pessoal", ["II"], "not_applicable", "industry", [...tradeSegregations, "receita de revenda no Anexo I", "tratamento monofásico por produto e papel na cadeia"]),
  profile(36, "2229301", "Fabricação de artefatos de material plástico para construção", ["II"], "not_applicable", "industry", [...tradeSegregations, "receita de revenda no Anexo I", "descrição e finalidade do produto"]),
  profile(37, "2511000", "Fabricação de estruturas metálicas", ["II"], "not_applicable", "industry", [...tradeSegregations, "receita de montagem ou obra", "industrialização por encomenda"]),
  profile(38, "2599399", "Fabricação de outros produtos de metal", ["II"], "not_applicable", "industry", [...tradeSegregations, "receita de revenda no Anexo I", "produto efetivo e IPI"]),
  profile(39, "1622699", "Fabricação de outros artigos de carpintaria para construção", ["II"], "not_applicable", "industry", [...tradeSegregations, "receita de instalação ou obra", "receita de revenda no Anexo I"]),
  profile(40, "3299099", "Fabricação de produtos diversos", ["II"], "not_applicable", "industry", [...tradeSegregations, "produto efetivamente fabricado", "receita de revenda no Anexo I"]),
  profile(41, "6911701", "Serviços advocatícios", ["III", "V"], "required", "service", serviceSegregations),
  profile(42, "7410202", "Design de interiores", ["III", "V"], "required", "service", serviceSegregations),
  profile(43, "8650001", "Atividades de enfermagem", ["III", "V"], "required", "service", serviceSegregations),
  profile(44, "8660700", "Atividades de apoio à gestão de saúde", ["III", "V"], "required", "service", serviceSegregations),
  profile(45, "9511800", "Reparação e manutenção de computadores e periféricos", ["III"], "not_applicable", "service", [...serviceSegregations, "peças e mercadorias comercializadas no Anexo I"]),
  profile(46, "8219999", "Preparação de documentos e serviços especializados de apoio administrativo", ["III"], "not_applicable", "service", serviceSegregations),
  profile(47, "6821801", "Corretagem na compra, venda e avaliação de imóveis", ["III", "V"], "required", "service", serviceSegregations),
  profile(48, "4211101", "Construção de rodovias e ferrovias", ["IV"], "not_applicable", "construction_or_labor_assignment", serviceSegregations, ["CPP patronal permanece fora do DAS", "empreitada e cessão de mão de obra exigem fatos próprios"]),
  profile(49, "4399103", "Obras de alvenaria", ["IV"], "not_applicable", "construction_or_labor_assignment", serviceSegregations, ["CPP patronal permanece fora do DAS", "materiais e subempreitadas precisam ser conciliados"]),
  profile(50, "4221902", "Construção de estações e redes de distribuição de energia elétrica", ["IV"], "not_applicable", "construction_or_labor_assignment", serviceSegregations, ["CPP patronal permanece fora do DAS", "obra, manutenção e cessão de mão de obra precisam ser distinguidas"]),
];

export const simplesActivityProfileByCnae = new Map(simplesActivityProfiles.map((item) => [item.cnae, item]));

export const simplesSegregationRules = [
  { code: "ordinary", label: "Receita comum do anexo confirmado", effect: "entra na memória do anexo somente depois da composição completa", sourceCodes: ["SIMPLES-LC-123", "SIMPLES-CGSN-140"] },
  { code: "icms_st", label: "ICMS-ST ou antecipação com encerramento", effect: "segregar a parcela estadual conforme a hipótese comprovada", sourceCodes: ["SIMPLES-LC-123", "SIMPLES-CGSN-140"] },
  { code: "pis_cofins_monophase", label: "PIS/Cofins monofásico", effect: "segregar somente produto e receita abrangidos pela legislação específica", sourceCodes: ["SIMPLES-LC-123", "SIMPLES-CGSN-140"] },
  { code: "export", label: "Exportação", effect: "separar mercado interno e externo antes da memória", sourceCodes: ["SIMPLES-LC-123", "SIMPLES-CGSN-140", "SIMPLES-PERGUNTAO-2026"] },
  { code: "iss_withheld", label: "ISS retido ou devido a outro município", effect: "segregar município, responsabilidade e valor do serviço", sourceCodes: ["SIMPLES-LC-123", "SIMPLES-CGSN-140"] },
  { code: "mixed_activity", label: "Atividades em anexos diferentes", effect: "manter receita mensal própria para cada atividade e anexo", sourceCodes: ["SIMPLES-LC-123", "SIMPLES-CGSN-140"] },
  { code: "activity_start", label: "Início de atividade", effect: "usar RBT12 proporcional anualizada e limites proporcionais somente após confirmar abertura e meses de atividade", sourceCodes: ["SIMPLES-CGSN-140", "SIMPLES-PERGUNTAO-2026"] },
  { code: "export_goods", label: "Exportação de mercadorias", effect: "separar a receita e desconsiderar apenas os percentuais autorizados pela regra aplicável", sourceCodes: ["SIMPLES-LC-123", "SIMPLES-CGSN-140"] },
  { code: "export_services", label: "Exportação de serviços", effect: "exigir prova de exportação e do resultado no exterior antes de desconsiderar percentuais", sourceCodes: ["SIMPLES-LC-123", "SIMPLES-CGSN-140"] },
  { code: "canceled_sales", label: "Vendas canceladas", effect: "excluir somente cancelamento documentado e conciliado com o período", sourceCodes: ["SIMPLES-CGSN-140", "SIMPLES-PERGUNTAO-2026"] },
  { code: "unconditional_discounts", label: "Descontos incondicionais", effect: "reduzir a receita somente quando constar no documento e não depender de evento posterior", sourceCodes: ["SIMPLES-CGSN-140", "SIMPLES-PERGUNTAO-2026"] },
  { code: "cash_basis_receivables", label: "Regime de caixa", effect: "separar receita recebida da receita auferida e preservar esta última para limites e controles", sourceCodes: ["SIMPLES-CGSN-140", "SIMPLES-PERGUNTAO-2026"] },
  { code: "accounting_fixed_iss", label: "Escritório contábil com ISS fixo", effect: "desconsiderar o percentual do ISS apenas quando a legislação municipal e os fatos autorizarem", sourceCodes: ["SIMPLES-LC-123", "SIMPLES-CGSN-140"] },
  { code: "pharmacy_compounding", label: "Medicamento manipulado", effect: "segregar encomenda pessoal posterior do comércio comum conforme atendimento, prescrição e produção", sourceCodes: ["SIMPLES-LC-123", "SIMPLES-CGSN-140"] },
  { code: "service_withholdings", label: "Retenções sobre serviços", effect: "registrar IRRF, CSRF, INSS e ISS em livros próprios; não deduzir automaticamente do DAS", sourceCodes: ["SIMPLES-LC-123", "SIMPLES-CGSN-140"] },
] as const;

export const simplesEligibilityGates = [
  "receita bruta global dentro do limite de R$ 4.800.000",
  "sócios, participações e receita global de empresas relacionadas conferidos",
  "natureza jurídica e atividade sem vedação aplicável",
  "débitos e cadastros fiscais regularizados para a opção",
  "receitas de matriz e filiais consolidadas",
  "atividade efetiva e anexo confirmados sem decisão automática por CNAE",
  "RBT12 proporcional anualizada confirmada quando houver início de atividade",
  "mercado interno e exportação controlados separadamente",
  "receitas monofásicas, ST, ISS retido e atividades mistas segregadas",
  "retenções reconciliadas em livros próprios sem dedução automática do DAS",
] as const;

export const simplesExclusionRules = [
  { code: "annual_limit", fact: "receita bruta global ultrapassa R$ 4.800.000", consequence: "bloquear o DAS e determinar o efeito temporal do excesso conforme a proporção e o período", sourceCodes: ["SIMPLES-LC-123", "SIMPLES-CGSN-140"] },
  { code: "ownership_structure", fact: "sócio, participação societária ou receita global relacionada incompatível", consequence: "bloquear elegibilidade até conferir toda a estrutura societária", sourceCodes: ["SIMPLES-LC-123", "SIMPLES-CGSN-140"] },
  { code: "forbidden_activity", fact: "atividade efetiva alcançada por vedação legal", consequence: "bloquear opção ou permanência sem inferir apenas pelo CNAE", sourceCodes: ["SIMPLES-LC-123", "SIMPLES-CGSN-140", "CNAE-CONCLA"] },
  { code: "tax_debt_or_registration", fact: "débito ou irregularidade cadastral relevante não saneada", consequence: "bloquear a afirmação de elegibilidade e direcionar para conferência oficial", sourceCodes: ["SIMPLES-LC-123", "SIMPLES-CGSN-140"] },
  { code: "sublimit", fact: "receita acumulada ultrapassa R$ 3.600.000 em 2026", consequence: "separar ICMS e ISS do DAS na data de efeito legal, preservando os demais tributos até análise do limite nacional", sourceCodes: ["SIMPLES-CGSN-140", "SIMPLES-SUBLIMITE-2026"] },
  { code: "public_entity_capital", fact: "ente público participa do capital", consequence: "bloquear elegibilidade até conferir a vedação e a estrutura societária", sourceCodes: ["SIMPLES-LC-123", "SIMPLES-CGSN-140"] },
  { code: "foreign_branch", fact: "filial, sucursal, agência ou representação no País de pessoa jurídica com sede no exterior", consequence: "bloquear elegibilidade no recorte vedado", sourceCodes: ["SIMPLES-LC-123", "SIMPLES-CGSN-140"] },
  { code: "corporate_participation", fact: "outra pessoa jurídica participa do capital fora das hipóteses permitidas", consequence: "bloquear até qualificar sócios e exceções legais", sourceCodes: ["SIMPLES-LC-123", "SIMPLES-CGSN-140"] },
  { code: "individual_partner_global_revenue", fact: "participação do sócio e receita bruta global relacionada não foram consolidadas", consequence: "bloquear até medir participação e receita global", sourceCodes: ["SIMPLES-LC-123", "SIMPLES-CGSN-140"] },
  { code: "foreign_domiciled_partner", fact: "sócio domiciliado no exterior", consequence: "bloquear opção ou permanência conforme a vedação legal", sourceCodes: ["SIMPLES-LC-123", "SIMPLES-CGSN-140"] },
  { code: "financial_or_credit_activity", fact: "atividade financeira, creditícia, factoring ou operação legalmente vedada", consequence: "bloquear sem ampliar a vedação por descrição aproximada", sourceCodes: ["SIMPLES-LC-123", "SIMPLES-CGSN-140"] },
  { code: "electric_energy_chain", fact: "geração, transmissão, distribuição ou comercialização de energia elétrica", consequence: "bloquear quando a atividade efetiva coincidir com a vedação", sourceCodes: ["SIMPLES-LC-123", "SIMPLES-CGSN-140"] },
  { code: "fuel_import_or_manufacture", fact: "importação ou fabricação de combustíveis alcançada por vedação", consequence: "bloquear após classificar produto, operação e papel da empresa", sourceCodes: ["SIMPLES-LC-123", "SIMPLES-CGSN-140"] },
  { code: "vehicle_import_or_manufacture", fact: "importação ou fabricação de automóveis e motocicletas alcançada por vedação", consequence: "bloquear após comprovar atividade efetiva; comércio ou reparo não herda a vedação", sourceCodes: ["SIMPLES-LC-123", "SIMPLES-CGSN-140"] },
  { code: "unresolved_registration", fact: "ausência ou irregularidade de inscrição fiscal exigível não regularizada", consequence: "bloquear afirmação de permanência e registrar o prazo legal aplicável", sourceCodes: ["SIMPLES-LC-123", "SIMPLES-CGSN-140"] },
] as const;

function safeMoney(value: number, field: string, min = 0, max = Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new Error(`invalid_${field}`);
  return value;
}

function roundDivide(numerator: bigint, denominator: bigint) {
  if (denominator <= 0n || numerator < 0n) throw new Error("invalid_simples_ratio");
  const rounded = (numerator + denominator / 2n) / denominator;
  if (rounded > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("unsafe_simples_ratio");
  return Number(rounded);
}

function calculateAnnex(annex: SimplesAnnex, rbt12Cents: number, monthlyRevenueCents: number) {
  const bracketIndex = simplesAnnexTables[annex].findIndex((item) => rbt12Cents >= item.fromCents && rbt12Cents <= item.toCents);
  const bracket = simplesAnnexTables[annex][bracketIndex];
  if (!bracket) throw new Error("rbt12_out_of_simples_limit");
  const effectiveNumerator = BigInt(rbt12Cents) * BigInt(bracket.nominalBps)
    - BigInt(bracket.deductionCents) * 10_000n;
  return {
    bracketIndex,
    bracket,
    effectiveRateBps: roundDivide(effectiveNumerator, BigInt(rbt12Cents)),
    referenceCents: roundDivide(BigInt(monthlyRevenueCents) * effectiveNumerator, BigInt(rbt12Cents) * 10_000n),
  };
}

export function resolveSimplesActivity(cnae: string) {
  return simplesActivityProfileByCnae.get(cnae.replace(/\D/g, "")) ?? null;
}

export function calculateSimplesNationalDeepReference(input: SimplesCalculationInput): SimplesCalculationResult {
  const profile = resolveSimplesActivity(input.cnae);
  const blockers: string[] = [];
  const warnings = [
    "A memória é uma referência determinística e precisa ser reconciliada no PGDAS-D.",
    "CNAE é um indício; contrato, notas fiscais e atividade efetivamente exercida prevalecem.",
  ];
  const rbt12 = input.rbt12Cents;
  const revenue = input.monthlyRevenueCents;

  if (!profile) blockers.push("CNAE fora dos 50 perfis prioritários estruturados");
  if (rbt12 === null) blockers.push("RBT12 não informado");
  if (revenue === null) blockers.push("receita mensal e sua composição não informadas");
  if (!input.activityConfirmed) blockers.push("atividade efetivamente exercida não confirmada");
  if (!input.annexConfirmed) blockers.push("anexo não confirmado pelos fatos da atividade");
  if (!input.revenueCompositionConfirmed) blockers.push("composição e segregações da receita não confirmadas");
  if (!input.periodClosed) blockers.push("período de apuração não fechado");
  if (!input.eligibilityConfirmed) blockers.push("elegibilidade, impedimentos e receita global não conferidos");
  if (!input.under2026SublimitConfirmed) blockers.push("sublimite de ICMS/ISS de 2026 não conferido");
  if (!input.noSpecialTreatment) blockers.push("tratamento especial exige segregação própria no PGDAS-D");
  if (input.calculationPeriod !== undefined && !/^2026-(0[1-9]|1[0-2])$/.test(input.calculationPeriod)) blockers.push("período fora da vigência 2026 desta versão");
  if (input.businessStartedLessThan13Months === true && input.startActivityRbt12AnnualizationConfirmed !== true) blockers.push("RBT12 proporcional anualizada do início de atividade não confirmada");

  if (rbt12 !== null) {
    safeMoney(rbt12, "rbt12", 1);
    if (rbt12 > SIMPLES_NATIONAL_LIMIT_CENTS) blockers.push("RBT12 excede o limite nacional de R$ 4.800.000");
    if (rbt12 > SIMPLES_NATIONAL_2026_SUBLIMIT_CENTS) blockers.push("ICMS e ISS devem ser tratados fora do DAS após o sublimite de 2026");
  }
  if (revenue !== null) safeMoney(revenue, "monthly_revenue");
  if (profile && !profile.annexCandidates.includes(input.declaredAnnex)) blockers.push("anexo declarado incompatível com o perfil candidato");

  let factorRBps: number | null = null;
  let resolvedAnnex: SimplesAnnex | null = profile && profile.annexCandidates.includes(input.declaredAnnex) ? input.declaredAnnex : null;
  if (profile?.factorR === "required") {
    if (rbt12 === null || input.fs12Cents === null || input.fs12Cents === undefined) {
      blockers.push("FS12 ausente para atividade sujeita ao fator R");
      resolvedAnnex = null;
    } else {
      const fs12 = safeMoney(input.fs12Cents, "fs12");
      factorRBps = roundDivide(BigInt(fs12) * 10_000n, BigInt(rbt12));
      const factorAnnex: SimplesAnnex = BigInt(fs12) * 100n >= BigInt(rbt12) * 28n ? "III" : "V";
      resolvedAnnex = factorAnnex;
      if (input.declaredAnnex !== factorAnnex) blockers.push(`fator R conduz ao Anexo ${factorAnnex}, divergente do anexo declarado`);
    }
  } else if (input.fs12Cents !== null && input.fs12Cents !== undefined) {
    safeMoney(input.fs12Cents, "fs12");
    warnings.push("FS12 foi preservada como evidência, mas não altera o anexo deste perfil.");
  }

  if (blockers.length || rbt12 === null || revenue === null || resolvedAnnex === null) {
    return {
      status: "blocked",
      profile,
      resolvedAnnex,
      bracket: null,
      factorRBps,
      lines: [],
      blockers: [...new Set(blockers)],
      warnings,
      sourceCodes: profile?.sourceCodes ?? ["SIMPLES-LC-123", "SIMPLES-CGSN-140"],
      version: SIMPLES_NATIONAL_DEEP_VERSION,
      checkedAt: SIMPLES_NATIONAL_DEEP_CHECKED_AT,
    };
  }

  const calculation = calculateAnnex(resolvedAnnex, rbt12, revenue);
  return {
    status: "calculated_reference",
    profile,
    resolvedAnnex,
    bracket: calculation.bracketIndex + 1,
    factorRBps,
    lines: [
      { code: "rbt12", label: "RBT12", formula: "receita bruta acumulada confirmada", amountCents: rbt12, rateBps: null },
      { code: "monthly_revenue", label: "Receita mensal segregada", formula: "receita ordinária do anexo confirmado", amountCents: revenue, rateBps: null },
      { code: "nominal", label: "Alíquota nominal", formula: `Anexo ${resolvedAnnex}, faixa ${calculation.bracketIndex + 1}`, amountCents: null, rateBps: calculation.bracket.nominalBps },
      { code: "deduction", label: "Parcela a deduzir", formula: `Anexo ${resolvedAnnex}, faixa ${calculation.bracketIndex + 1}`, amountCents: calculation.bracket.deductionCents, rateBps: null },
      { code: "effective", label: "Alíquota efetiva", formula: "(RBT12 × nominal − parcela a deduzir) ÷ RBT12", amountCents: null, rateBps: calculation.effectiveRateBps },
      { code: "reference", label: "DAS de referência", formula: "receita mensal segregada × alíquota efetiva", amountCents: calculation.referenceCents, rateBps: calculation.effectiveRateBps },
    ],
    blockers: [],
    warnings,
    sourceCodes: profile.sourceCodes,
    version: SIMPLES_NATIONAL_DEEP_VERSION,
    checkedAt: SIMPLES_NATIONAL_DEEP_CHECKED_AT,
  };
}

export type SimplesNationalReferenceCase = {
  id: string;
  kind: "activity" | "bracket_boundary" | "factor_r" | "segregation" | "impediment" | "activity_start" | "mandatory_gate";
  relatedCode: string;
  input: SimplesCalculationInput;
  expected: {
    status: SimplesCalculationResult["status"];
    resolvedAnnex: SimplesAnnex | null;
    bracket: number | null;
    referenceCents: number | null;
    factorRBps: number | null;
    blocker: string | null;
  };
};

const POSITIVE_REFERENCE_BY_ANNEX: Record<SimplesAnnex, { referenceCents: number; factorRBps: number | null }> = {
  I: { referenceCents: 882_500, factorRBps: null },
  II: { referenceCents: 932_500, factorRBps: null },
  III: { referenceCents: 1_303_000, factorRBps: null },
  IV: { referenceCents: 1_068_500, factorRBps: null },
  V: { referenceCents: 1_907_500, factorRBps: 0 },
};

const COMPLETE_INPUT = {
  rbt12Cents: 120_000_000,
  monthlyRevenueCents: 10_000_000,
  activityConfirmed: true,
  annexConfirmed: true,
  revenueCompositionConfirmed: true,
  periodClosed: true,
  eligibilityConfirmed: true,
  under2026SublimitConfirmed: true,
  noSpecialTreatment: true,
  calculationPeriod: "2026-07",
} as const;

function positiveInput(profile: SimplesActivityProfile, annex?: SimplesAnnex): SimplesCalculationInput {
  const resolved = annex ?? (profile.factorR === "required" ? "III" : profile.annexCandidates[0]);
  return {
    ...COMPLETE_INPUT,
    cnae: profile.cnae,
    declaredAnnex: resolved,
    fs12Cents: profile.factorR === "required" ? 33_600_000 : null,
  };
}

const activityCases: SimplesNationalReferenceCase[] = simplesActivityProfiles.map((profile) => {
  const annex = profile.factorR === "required" ? "III" : profile.annexCandidates[0];
  return {
    id: `activity:${profile.cnae}`,
    kind: "activity",
    relatedCode: profile.cnae,
    input: positiveInput(profile, annex),
    expected: {
      status: "calculated_reference",
      resolvedAnnex: annex,
      bracket: 4,
      referenceCents: POSITIVE_REFERENCE_BY_ANNEX[annex].referenceCents,
      factorRBps: profile.factorR === "required" ? 2_800 : null,
      blocker: null,
    },
  };
});

const BRACKET_EXPECTATIONS: Record<SimplesAnnex, Array<{ referenceCents: number | null; factorRBps: number | null }>> = {
  I: [{ referenceCents: 40_000, factorRBps: null }, { referenceCents: 56_500, factorRBps: null }, { referenceCents: 75_750, factorRBps: null }, { referenceCents: 94_500, factorRBps: null }, { referenceCents: 118_750, factorRBps: null }, { referenceCents: null, factorRBps: null }],
  II: [{ referenceCents: 45_000, factorRBps: null }, { referenceCents: 61_500, factorRBps: null }, { referenceCents: 80_750, factorRBps: null }, { referenceCents: 99_500, factorRBps: null }, { referenceCents: 123_250, factorRBps: null }, { referenceCents: null, factorRBps: null }],
  III: [{ referenceCents: 60_000, factorRBps: null }, { referenceCents: 86_000, factorRBps: null }, { referenceCents: 110_500, factorRBps: null }, { referenceCents: 140_200, factorRBps: null }, { referenceCents: 175_100, factorRBps: null }, { referenceCents: null, factorRBps: null }],
  IV: [{ referenceCents: 45_000, factorRBps: null }, { referenceCents: 67_500, factorRBps: null }, { referenceCents: 84_750, factorRBps: null }, { referenceCents: 117_900, factorRBps: null }, { referenceCents: 168_950, factorRBps: null }, { referenceCents: null, factorRBps: null }],
  V: [{ referenceCents: 155_000, factorRBps: 0 }, { referenceCents: 167_500, factorRBps: 0 }, { referenceCents: 181_250, factorRBps: 0 }, { referenceCents: 195_500, factorRBps: 0 }, { referenceCents: 212_750, factorRBps: 0 }, { referenceCents: null, factorRBps: 0 }],
};

const bracketRepresentative: Record<SimplesAnnex, SimplesActivityProfile> = {
  I: simplesActivityProfileByCnae.get("4711302")!,
  II: simplesActivityProfileByCnae.get("1091102")!,
  III: simplesActivityProfileByCnae.get("6920601")!,
  IV: simplesActivityProfileByCnae.get("4120400")!,
  V: simplesActivityProfileByCnae.get("6201501")!,
};

const bracketCases: SimplesNationalReferenceCase[] = (Object.keys(simplesAnnexTables) as SimplesAnnex[]).flatMap((annex) =>
  simplesAnnexTables[annex].map((bracket, index) => {
    const sixthBand = index === 5;
    const factorRBps = annex === "V" ? 0 : null;
    return {
      id: `bracket:${annex}:${index + 1}:upper`,
      kind: "bracket_boundary" as const,
      relatedCode: `${annex}-${index + 1}`,
      input: {
        ...positiveInput(bracketRepresentative[annex], annex),
        rbt12Cents: bracket.toCents,
        monthlyRevenueCents: 1_000_000,
        fs12Cents: annex === "V" ? 0 : null,
      },
      expected: {
        status: sixthBand ? "blocked" as const : "calculated_reference" as const,
        resolvedAnnex: annex,
        bracket: sixthBand ? null : index + 1,
        referenceCents: BRACKET_EXPECTATIONS[annex][index].referenceCents,
        factorRBps,
        blocker: sixthBand ? "ICMS e ISS devem ser tratados fora do DAS após o sublimite de 2026" : null,
      },
    };
  }),
);

const factorProfiles = simplesActivityProfiles.filter((profile) => profile.factorR === "required").slice(0, 10);
const factorRCases: SimplesNationalReferenceCase[] = factorProfiles.flatMap((profile) => ([
  {
    id: `factor-r:${profile.cnae}:2800`,
    kind: "factor_r" as const,
    relatedCode: profile.cnae,
    input: { ...positiveInput(profile, "III"), fs12Cents: 33_600_000 },
    expected: { status: "calculated_reference" as const, resolvedAnnex: "III" as const, bracket: 4, referenceCents: 1_303_000, factorRBps: 2_800, blocker: null },
  },
  {
    id: `factor-r:${profile.cnae}:2799`,
    kind: "factor_r" as const,
    relatedCode: profile.cnae,
    input: { ...positiveInput(profile, "V"), fs12Cents: 33_588_000 },
    expected: { status: "calculated_reference" as const, resolvedAnnex: "V" as const, bracket: 4, referenceCents: 1_907_500, factorRBps: 2_799, blocker: null },
  },
]));

const impedimentCases: SimplesNationalReferenceCase[] = simplesExclusionRules.map((rule, index) => {
  const profile = simplesActivityProfiles[index % simplesActivityProfiles.length];
  const annex = profile.factorR === "required" ? "III" : profile.annexCandidates[0];
  return {
    id: `impediment:${rule.code}`,
    kind: "impediment",
    relatedCode: rule.code,
    input: { ...positiveInput(profile, annex), eligibilityConfirmed: false },
    expected: { status: "blocked", resolvedAnnex: annex, bracket: null, referenceCents: null, factorRBps: profile.factorR === "required" ? 2_800 : null, blocker: "elegibilidade, impedimentos e receita global não conferidos" },
  };
});

const segregationCases: SimplesNationalReferenceCase[] = simplesSegregationRules.map((rule, index) => {
  const ordinary = rule.code === "ordinary";
  const profile = simplesActivityProfiles[index % simplesActivityProfiles.length];
  const annex = profile.factorR === "required" ? "III" : profile.annexCandidates[0];
  return {
    id: `segregation:${rule.code}`,
    kind: "segregation",
    relatedCode: rule.code,
    input: { ...positiveInput(profile, annex), revenueCompositionConfirmed: ordinary },
    expected: ordinary
      ? { status: "calculated_reference", resolvedAnnex: annex, bracket: 4, referenceCents: POSITIVE_REFERENCE_BY_ANNEX[annex].referenceCents, factorRBps: profile.factorR === "required" ? 2_800 : null, blocker: null }
      : { status: "blocked", resolvedAnnex: annex, bracket: null, referenceCents: null, factorRBps: profile.factorR === "required" ? 2_800 : null, blocker: "composição e segregações da receita não confirmadas" },
  };
});

const activityStartCases: SimplesNationalReferenceCase[] = simplesActivityProfiles.slice(0, 10).map((profile, index) => {
  const positive = index < 5;
  const annex = profile.factorR === "required" ? "III" : profile.annexCandidates[0];
  return {
    id: `activity-start:${profile.cnae}:${positive ? "annualized" : "missing-annualization"}`,
    kind: "activity_start",
    relatedCode: profile.cnae,
    input: { ...positiveInput(profile, annex), businessStartedLessThan13Months: true, startActivityRbt12AnnualizationConfirmed: positive },
    expected: positive
      ? { status: "calculated_reference", resolvedAnnex: annex, bracket: 4, referenceCents: POSITIVE_REFERENCE_BY_ANNEX[annex].referenceCents, factorRBps: profile.factorR === "required" ? 2_800 : null, blocker: null }
      : { status: "blocked", resolvedAnnex: annex, bracket: null, referenceCents: null, factorRBps: profile.factorR === "required" ? 2_800 : null, blocker: "RBT12 proporcional anualizada do início de atividade não confirmada" },
  };
});

const gateMutations: Array<{ code: string; patch: Partial<SimplesCalculationInput>; blocker: string }> = [
  { code: "activity", patch: { activityConfirmed: false }, blocker: "atividade efetivamente exercida não confirmada" },
  { code: "annex", patch: { annexConfirmed: false }, blocker: "anexo não confirmado pelos fatos da atividade" },
  { code: "composition", patch: { revenueCompositionConfirmed: false }, blocker: "composição e segregações da receita não confirmadas" },
  { code: "period", patch: { periodClosed: false }, blocker: "período de apuração não fechado" },
  { code: "eligibility", patch: { eligibilityConfirmed: false }, blocker: "elegibilidade, impedimentos e receita global não conferidos" },
  { code: "sublimit", patch: { under2026SublimitConfirmed: false }, blocker: "sublimite de ICMS/ISS de 2026 não conferido" },
  { code: "special", patch: { noSpecialTreatment: false }, blocker: "tratamento especial exige segregação própria no PGDAS-D" },
  { code: "rbt12", patch: { rbt12Cents: null }, blocker: "RBT12 não informado" },
  { code: "monthly_revenue", patch: { monthlyRevenueCents: null }, blocker: "receita mensal e sua composição não informadas" },
  { code: "validity", patch: { calculationPeriod: "2027-01" }, blocker: "período fora da vigência 2026 desta versão" },
];

const mandatoryGateCases: SimplesNationalReferenceCase[] = gateMutations.map((mutation, index) => {
  const profile = simplesActivityProfiles[index];
  const input = { ...positiveInput(profile), ...mutation.patch };
  const resolvedAnnex = profile.factorR === "required" ? "III" : profile.annexCandidates[0];
  return {
    id: `gate:${mutation.code}`,
    kind: "mandatory_gate",
    relatedCode: mutation.code,
    input,
    expected: { status: "blocked", resolvedAnnex, bracket: null, referenceCents: null, factorRBps: profile.factorR === "required" ? 2_800 : null, blocker: mutation.blocker },
  };
});

export const simplesNationalReferenceCases: SimplesNationalReferenceCase[] = [
  ...activityCases,
  ...bracketCases,
  ...factorRCases,
  ...impedimentCases,
  ...segregationCases,
  ...activityStartCases,
  ...mandatoryGateCases,
];

export function executeSimplesNationalReferenceCase(referenceCase: SimplesNationalReferenceCase) {
  return calculateSimplesNationalDeepReference(referenceCase.input);
}

export function simplesNationalDeepMetrics() {
  return {
    prioritizedActivities: simplesActivityProfiles.length,
    annexes: Object.keys(simplesAnnexTables).length,
    annexBracketMemories: Object.values(simplesAnnexTables).reduce((total, brackets) => total + brackets.length, 0),
    segregationRules: simplesSegregationRules.length,
    eligibilityGates: simplesEligibilityGates.length,
    exclusionRules: simplesExclusionRules.length,
    deterministicCases: simplesNationalReferenceCases.length,
    calculatedMemories: simplesNationalReferenceCases.filter((item) => item.expected.status === "calculated_reference").length,
    safelyBlockedCases: simplesNationalReferenceCases.filter((item) => item.expected.status === "blocked").length,
  };
}

export function validateSimplesNationalDeep() {
  const errors: string[] = [];
  const knownSourceCodes = new Set(simplesNationalSources.map((item) => item.code));
  if (simplesActivityProfiles.length !== 50) errors.push("fifty_priority_activities_required");
  if (new Set(simplesActivityProfiles.map((item) => item.cnae)).size !== 50) errors.push("duplicate_cnae");
  if (Object.values(simplesAnnexTables).some((brackets) => brackets.length !== 6)) errors.push("six_brackets_per_annex_required");
  if (new Set(simplesNationalSources.map((item) => item.code)).size !== simplesNationalSources.length) errors.push("duplicate_source_code");
  if (!simplesNationalSources.every((item) => item.url.startsWith("https://") && item.checkedAt === SIMPLES_NATIONAL_DEEP_CHECKED_AT)) errors.push("official_source_metadata_invalid");
  if (!simplesActivityProfiles.some((item) => item.annexCandidates.includes("II"))) errors.push("annex_ii_uncovered");
  if (!simplesActivityProfiles.some((item) => item.annexCandidates.includes("IV"))) errors.push("annex_iv_uncovered");
  if (!simplesActivityProfiles.some((item) => item.factorR === "required")) errors.push("factor_r_profiles_missing");
  for (const item of simplesActivityProfiles) {
    if (!/^\d{7}$/.test(item.cnae)) errors.push(`${item.cnae}:invalid_cnae`);
    if (item.sourceCodes.length < 4 || item.segregations.length < 4 || item.hardStops.length < 3) errors.push(`${item.cnae}:profile_incomplete`);
    if (item.effectiveFrom !== "2018-01-01" || item.checkedAt !== SIMPLES_NATIONAL_DEEP_CHECKED_AT || item.version !== SIMPLES_NATIONAL_DEEP_VERSION) errors.push(`${item.cnae}:validity_metadata_incomplete`);
  }
  if (simplesSegregationRules.length !== 15 || simplesSegregationRules.some((item) => item.sourceCodes.length < 2 || item.sourceCodes.some((code) => !knownSourceCodes.has(code)))) errors.push("fifteen_segregation_rules_required");
  if (simplesExclusionRules.length !== 15 || simplesExclusionRules.some((item) => item.sourceCodes.length < 2 || item.sourceCodes.some((code) => !knownSourceCodes.has(code)))) errors.push("fifteen_exclusion_rules_required");

  const completeInput = {
    rbt12Cents: 120_000_000,
    monthlyRevenueCents: 10_000_000,
    activityConfirmed: true,
    annexConfirmed: true,
    revenueCompositionConfirmed: true,
    periodClosed: true,
    eligibilityConfirmed: true,
    under2026SublimitConfirmed: true,
    noSpecialTreatment: true,
  } as const;
  for (const item of simplesActivityProfiles) {
    const declaredAnnex = item.factorR === "required" ? "III" : item.annexCandidates[0];
    const output = calculateSimplesNationalDeepReference({
      ...completeInput,
      cnae: item.cnae,
      declaredAnnex,
      fs12Cents: item.factorR === "required" ? 33_600_000 : null,
    });
    if (output.status !== "calculated_reference" || output.lines.at(-1)?.amountCents === null) errors.push(`${item.cnae}:reference_not_reproduced`);
  }
  const missingRbt = calculateSimplesNationalDeepReference({
    ...completeInput,
    cnae: "4711302",
    declaredAnnex: "I",
    rbt12Cents: null,
  });
  if (missingRbt.status !== "blocked" || !missingRbt.blockers.includes("RBT12 não informado")) errors.push("missing_rbt12_not_blocked");

  if (simplesNationalReferenceCases.length !== 150 || new Set(simplesNationalReferenceCases.map((item) => item.id)).size !== 150) errors.push("one_hundred_fifty_unique_cases_required");
  for (const referenceCase of simplesNationalReferenceCases) {
    const output = executeSimplesNationalReferenceCase(referenceCase);
    const referenceLine = output.lines.find((line) => line.code === "reference") ?? null;
    if (output.status !== referenceCase.expected.status) errors.push(`${referenceCase.id}:status_diverged`);
    if (output.resolvedAnnex !== referenceCase.expected.resolvedAnnex) errors.push(`${referenceCase.id}:annex_diverged`);
    if (output.bracket !== referenceCase.expected.bracket) errors.push(`${referenceCase.id}:bracket_diverged`);
    if ((referenceLine?.amountCents ?? null) !== referenceCase.expected.referenceCents) errors.push(`${referenceCase.id}:cents_diverged`);
    if (output.factorRBps !== referenceCase.expected.factorRBps) errors.push(`${referenceCase.id}:factor_r_diverged`);
    if (referenceCase.expected.blocker !== null && !output.blockers.includes(referenceCase.expected.blocker)) errors.push(`${referenceCase.id}:blocker_diverged`);
    if (referenceCase.expected.status === "blocked" && referenceLine?.amountCents !== undefined) errors.push(`${referenceCase.id}:blocked_case_leaked_das`);
  }

  return { passed: errors.length === 0, errors };
}

export async function hashSimplesNationalDeep() {
  const payload = JSON.stringify({
    version: SIMPLES_NATIONAL_DEEP_VERSION,
    checkedAt: SIMPLES_NATIONAL_DEEP_CHECKED_AT,
    sources: simplesNationalSources,
    annexTables: simplesAnnexTables,
    activities: simplesActivityProfiles,
    segregations: simplesSegregationRules,
    eligibility: simplesEligibilityGates,
    exclusions: simplesExclusionRules,
    referenceCases: simplesNationalReferenceCases,
  });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

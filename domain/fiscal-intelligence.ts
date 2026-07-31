import { pisCofinsDeepSources } from "./pis-cofins-deep.ts";
import { serviceWithholdingProfiles, serviceWithholdingSources } from "./service-withholdings-deep.ts";
import { IPI_TIPI_DEEP_VERSION, ipiTipiDeepSources, ipiTipiPriorityProfiles } from "./ipi-tipi-deep.ts";
import {
  TAX_REFORM_SECTOR_VERSION,
  taxReformSectorProfiles,
  taxReformSectorSources,
} from "./tax-reform-sector-scenarios.ts";

export type FiscalIntelligenceStatus = "out_of_scope" | "needs_information" | "conditional";

export type FiscalFactSource = "question" | "manual" | "default" | "unknown";

export type FiscalTaxCode = "ICMS" | "ISS" | "IPI" | "PIS_COFINS" | "SIMPLES" | "IRPJ_CSLL" | "IBS_CBS" | "WITHHOLDINGS";
export type FiscalSegment = "auto_parts" | "general_goods" | "services" | "industry" | "general_business";

export type FiscalIntelligenceFacts = {
  tax: FiscalTaxCode | null;
  originState: string | null;
  destinationState: string | null;
  segment: FiscalSegment | null;
  productDescription: string | null;
  ncm: string | null;
  cest: string | null;
  productOrigin: "domestic" | "imported" | "unknown";
  importRuleQualification: "qualifies" | "does_not_qualify" | "unknown";
  issuerTaxRegime: "normal" | "simples" | "unknown";
  recipientTaxpayer: "yes" | "no" | "unknown";
  purpose: "resale" | "industrialization" | "use_consumption" | "fixed_asset" | "unknown";
  automotiveUse: "yes" | "no" | "unknown";
  specialTreatment: "none" | "exists" | "unknown";
  operationType: "goods" | "service" | "import" | "export" | "mixed" | "unknown";
  businessActivity: "commerce" | "industry" | "service" | "mixed" | "unknown";
  incomeTaxRegime: "real" | "presumed" | "simples" | "unknown";
  pisCofinsRegime: "cumulative" | "non_cumulative" | "monophase" | "zero_rate" | "unknown";
  serviceItem: string | null;
  cnae: string | null;
  originMunicipality: string | null;
  destinationMunicipality: string | null;
  payerType: "private_legal_entity" | "public_entity" | "individual" | "unknown";
  paymentRecipientType: "legal_entity" | "individual" | "unknown";
  serviceNature: "professional" | "cleaning_maintenance" | "labor_assignment" | "construction" | "general" | "unknown";
  referenceDate: string;
};

export type FiscalIntelligenceOverrides = Partial<Omit<FiscalIntelligenceFacts, "tax" | "segment" | "referenceDate">> & {
  tax?: FiscalTaxCode | null;
  segment?: FiscalSegment | null;
  referenceDate?: string;
};

export type FiscalKnowledgeSource = {
  code: string;
  title: string;
  publisher: string;
  url: string;
  legalReference: string;
  sourceUpdatedAt: string | null;
  checkedAt: string;
  primary: boolean;
};

type ManualRule = {
  code: string;
  title: string;
  conclusion: string;
  sourceCodes: string[];
};

type ProductClassification = {
  code: string;
  ncmPrefix: string;
  cest: string;
  description: string;
  descriptionTerms: string[];
  interstateScope: boolean;
  tableMvaBps: number;
  sourceCodes: string[];
};

export type NationalFiscalTopic = {
  code: string;
  tax: FiscalTaxCode;
  title: string;
  coverageLevel: "operational_reference" | "structured_triage";
  requiredFacts: Array<keyof FiscalIntelligenceFacts>;
  supportedOutputs: string[];
  hardStops: string[];
  sourceCodes: string[];
  examples: string[];
};

export type FiscalIntelligenceDefinition = {
  schemaVersion: "manual-fiscal-intelligence.v1";
  engineVersion: string;
  baseCode: string;
  version: string;
  name: string;
  assuranceLevel: "pilot_conditional";
  coverage: {
    tax: "ICMS";
    originState: "SP";
    destinationState: "MG";
    segment: "auto_parts";
  };
  ontology: Record<string, string[]>;
  rules: ManualRule[];
  productClassifications: ProductClassification[];
  nationalTopics: NationalFiscalTopic[];
  sources: FiscalKnowledgeSource[];
  limitations: string[];
};

export type FiscalFactView = {
  key: keyof FiscalIntelligenceFacts;
  label: string;
  value: string;
  source: FiscalFactSource;
};

export type FiscalClarification = {
  field: keyof FiscalIntelligenceFacts;
  question: string;
  reason: string;
};

export type FiscalFinding = {
  code: string;
  label: string;
  value: string;
  detail: string;
  sourceCodes: string[];
  nature: "own_rate" | "st_scope" | "table_parameter" | "additional_obligation" | "legal_range" | "regime_reference" | "compliance_gate";
};

export type FiscalDecisionTrace = {
  ruleCode: string;
  result: "applied" | "blocked" | "not_applicable";
  detail: string;
};

export type FiscalScenarioBranch = {
  code: string;
  label: string;
  value: string;
  condition: string;
  consequence: string;
  status: "baseline" | "exception" | "additional" | "not_applicable";
  sourceCodes: string[];
};

export type FiscalIntelligenceResult = {
  schemaVersion: "fiscal-intelligence-result.v1";
  engineVersion: string;
  baseCode: string;
  baseVersion: string;
  assuranceLevel: "pilot_conditional";
  status: FiscalIntelligenceStatus;
  statusLabel: string;
  headline: string;
  summary: string;
  facts: FiscalIntelligenceFacts;
  factViews: FiscalFactView[];
  completeness: { known: number; required: number; percentage: number };
  findings: FiscalFinding[];
  scenarioBranches: FiscalScenarioBranch[];
  clarifications: FiscalClarification[];
  decisionTrace: FiscalDecisionTrace[];
  sources: FiscalKnowledgeSource[];
  limitations: string[];
  disclaimer: string;
  topicCode: string;
  coverageLevel: "operational_reference" | "structured_triage";
  calculationEligible: boolean;
};

const CHECKED_AT = "2026-07-30";

const nationalSources: FiscalKnowledgeSource[] = [
  { code: "LC-87-1996", title: "Lei Complementar nº 87/1996 · ICMS", publisher: "Presidência da República", url: "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp87.htm", legalReference: "normas gerais do ICMS; local, contribuinte, base e créditos", sourceUpdatedAt: null, checkedAt: CHECKED_AT, primary: true },
  { code: "LC-116-2003", title: "Lei Complementar nº 116/2003 · ISS", publisher: "Presidência da República", url: "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp116.htm", legalReference: "arts. 1º a 8º-A e lista de serviços", sourceUpdatedAt: null, checkedAt: CHECKED_AT, primary: true },
  { code: "LC-157-2016", title: "Lei Complementar nº 157/2016 · ISS", publisher: "Presidência da República", url: "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp157.htm", legalReference: "alíquota mínima e alterações do local de incidência", sourceUpdatedAt: "2016-12-29", checkedAt: CHECKED_AT, primary: true },
  { code: "D-11158-2022-TIPI", title: "Decreto nº 11.158/2022 · TIPI", publisher: "Presidência da República", url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2022/decreto/d11158.htm", legalReference: "arts. 1º a 4º e anexos da TIPI, com alterações posteriores", sourceUpdatedAt: null, checkedAt: CHECKED_AT, primary: true },
  { code: "RFB-CLASSIF", title: "Classificação Fiscal de Mercadorias · Sistema Classif", publisher: "Receita Federal do Brasil", url: "https://www.gov.br/receitafederal/pt-br/assuntos/aduana-e-comercio-exterior/classificacao-fiscal-de-mercadorias", legalReference: "consulta oficial da NCM, notas legais e orientações de classificação", sourceUpdatedAt: null, checkedAt: CHECKED_AT, primary: false },
  { code: "L-9718-1998", title: "Lei nº 9.718/1998 · Cofins cumulativa", publisher: "Presidência da República", url: "https://www.planalto.gov.br/ccivil_03/leis/l9718.htm", legalReference: "arts. 2º, 3º e 8º", sourceUpdatedAt: null, checkedAt: CHECKED_AT, primary: true },
  { code: "MP-2158-35-2001", title: "MP nº 2.158-35/2001 · PIS/Pasep", publisher: "Presidência da República", url: "https://www.planalto.gov.br/ccivil_03/mpv/2158-35.htm", legalReference: "regime cumulativo e regras especiais do PIS/Pasep e Cofins", sourceUpdatedAt: null, checkedAt: CHECKED_AT, primary: true },
  { code: "L-10637-2002", title: "Lei nº 10.637/2002 · PIS/Pasep não cumulativo", publisher: "Presidência da República", url: "https://www.planalto.gov.br/ccivil_03/leis/2002/l10637compilado.htm", legalReference: "arts. 1º a 3º; incidência e créditos", sourceUpdatedAt: null, checkedAt: CHECKED_AT, primary: true },
  { code: "L-10833-2003", title: "Lei nº 10.833/2003 · Cofins e retenções", publisher: "Presidência da República", url: "https://www.planalto.gov.br/ccivil_03/leis/2003/l10.833compilado.htm", legalReference: "arts. 1º a 3º e 30 a 32", sourceUpdatedAt: null, checkedAt: CHECKED_AT, primary: true },
  { code: "RFB-PIS-COFINS", title: "PIS/Pasep e Cofins · orientação tributária", publisher: "Receita Federal do Brasil", url: "https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/tributos/pis-pasep-cofins", legalReference: "hipóteses de incidência e regimes das contribuições", sourceUpdatedAt: "2023-08-21", checkedAt: CHECKED_AT, primary: false },
  { code: "LC-123-2006", title: "Lei Complementar nº 123/2006 · Simples Nacional", publisher: "Presidência da República", url: "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm", legalReference: "arts. 3º, 17, 18 e anexos", sourceUpdatedAt: null, checkedAt: CHECKED_AT, primary: true },
  { code: "CGSN-140-2018", title: "Resolução CGSN nº 140/2018 · regulamento do Simples", publisher: "Comitê Gestor do Simples Nacional", url: "https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=92278", legalReference: "receitas segregadas, PGDAS-D, anexos, vedações e fator R", sourceUpdatedAt: null, checkedAt: CHECKED_AT, primary: true },
  { code: "CGSN-PORTARIA-54-2025", title: "Portaria CGSN nº 54/2025 · sublimite de 2026", publisher: "Comitê Gestor do Simples Nacional", url: "https://www8.receita.fazenda.gov.br/simplesnacional/noticias/NoticiaCompleta.aspx?id=94c10cc2-7eb5-4ef0-bfb2-5479e72caff8", legalReference: "R$ 3.600.000 para ICMS e ISS em todas as UFs e no DF", sourceUpdatedAt: "2025-11-21", checkedAt: CHECKED_AT, primary: true },
  { code: "CNAE-CONCLA", title: "Classificação Nacional de Atividades Econômicas", publisher: "IBGE / CONCLA", url: "https://concla.ibge.gov.br/busca-online-cnae.html", legalReference: "descrições e notas explicativas das subclasses CNAE", sourceUpdatedAt: null, checkedAt: CHECKED_AT, primary: true },
  { code: "RFB-IRPJ", title: "IRPJ · orientação tributária", publisher: "Receita Federal do Brasil", url: "https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/tributos/IRPJ", legalReference: "alíquota geral e adicional do IRPJ", sourceUpdatedAt: null, checkedAt: CHECKED_AT, primary: false },
  { code: "RFB-CSLL", title: "CSLL · orientação tributária", publisher: "Receita Federal do Brasil", url: "https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/tributos/CSLL", legalReference: "alíquotas e bases real, presumida e arbitrada", sourceUpdatedAt: "2023-08-21", checkedAt: CHECKED_AT, primary: false },
  { code: "L-9249-1995", title: "Lei nº 9.249/1995 · IRPJ e CSLL", publisher: "Presidência da República", url: "https://www.planalto.gov.br/ccivil_03/leis/l9249.htm", legalReference: "arts. 3º, 15 e 20", sourceUpdatedAt: null, checkedAt: CHECKED_AT, primary: true },
  { code: "RFB-BENEFITS-2026", title: "Redução de incentivos e benefícios tributários · perguntas e respostas 2026", publisher: "Receita Federal do Brasil", url: "https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/perguntas-e-respostas/beneficios-fiscais/perguntas-e-respostas-reducao-dos-incentivos-e-beneficios-tributarios.pdf/@@download/file", legalReference: "efeitos de 2026 sobre percentuais de presunção e benefícios", sourceUpdatedAt: "2026-04-30", checkedAt: CHECKED_AT, primary: false },
  { code: "LC-214-2025", title: "Lei Complementar nº 214/2025 · IBS, CBS e IS", publisher: "Presidência da República", url: "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214compilado.htm", legalReference: "instituição, incidência, transição e regimes de IBS/CBS", sourceUpdatedAt: null, checkedAt: CHECKED_AT, primary: true },
  { code: "RFB-RTC-2026", title: "Orientações da Reforma Tributária para 2026", publisher: "Receita Federal do Brasil", url: "https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/reforma-tributaria-do-consumo/orientacoes-2026", legalReference: "destaque documental, obrigações acessórias e dispensa de recolhimento no ano-teste", sourceUpdatedAt: "2026-05-06", checkedAt: CHECKED_AT, primary: false },
  { code: "RFB-REINF-2026", title: "EFD-Reinf · retenções na fonte de pessoa jurídica", publisher: "Receita Federal do Brasil", url: "https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/perguntas-frequentes/sped/efd-reinf/efdr/1-geral/1-17-as-informacoes-sobre", legalReference: "eventos R-4020 e R-4080", sourceUpdatedAt: "2026-04-13", checkedAt: CHECKED_AT, primary: false },
  { code: "RFB-INSS-PJ", title: "Contribuições previdenciárias das pessoas jurídicas", publisher: "Receita Federal do Brasil", url: "https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/tributos/contribuicoes-previdenciarias-pj", legalReference: "retenção em cessão de mão de obra e empreitada", sourceUpdatedAt: null, checkedAt: CHECKED_AT, primary: false },
  ...pisCofinsDeepSources.map((source) => ({ ...source, sourceUpdatedAt: source.effectiveFrom, primary: source.publisher === "Presidência da República" })),
  ...serviceWithholdingSources.map((source) => ({ ...source, sourceUpdatedAt: source.effectiveFrom, primary: source.publisher === "Presidência da República" })),
  ...ipiTipiDeepSources.map((source) => ({ ...source, sourceUpdatedAt: source.effectiveFrom, primary: source.publisher === "Presidência da República" })),
  ...taxReformSectorSources
    .map((source) => ({
      ...source,
      sourceUpdatedAt: null,
      primary: source.publisher === "Presidência da República" || source.publisher === "Comitê Gestor do IBS",
    })),
];

const nationalRules: ManualRule[] = [
  { code: "ICMS-INTERSTATE-NATIONAL-7-12", title: "Referência interestadual nacional", conclusion: "A rota, a origem da mercadoria e a existência de regra especial definem se a referência interestadual é 4%, 7% ou 12%.", sourceCodes: ["RSF-22-1989", "RSF-13-2012"] },
  { code: "ICMS-INTRASTATE-STATE-LAW", title: "Operação interna depende da legislação estadual", conclusion: "A resolução interestadual não fornece a alíquota de uma operação interna.", sourceCodes: ["LC-87-1996"] },
  { code: "ICMS-ST-ROUTE-PRODUCT-GATE", title: "ST exige produto, rota e acordo", conclusion: "NCM, CEST, descrição, finalidade, legislação do destino e acordo vigente precisam coincidir.", sourceCodes: ["LC-87-1996", "CONFAZ-CONVENIO-142-2018"] },
  { code: "ISS-LEGAL-RANGE-2-5", title: "Faixa legal do ISS", conclusion: "A alíquota municipal precisa respeitar os limites legais, mas o percentual exato depende da lei do município competente e do serviço.", sourceCodes: ["LC-116-2003", "LC-157-2016"] },
  { code: "ISS-PLACE-ARTICLE-3", title: "Município competente do ISS", conclusion: "A regra geral e as exceções do art. 3º precisam ser confrontadas com o item da lista de serviços.", sourceCodes: ["LC-116-2003"] },
  { code: "IPI-TIPI-NCM-GATE", title: "IPI depende da TIPI vigente", conclusion: "A alíquota e o tratamento do IPI dependem do NCM completo, das notas da TIPI e da operação de industrialização ou importação.", sourceCodes: ["D-11158-2022-TIPI", "RFB-CLASSIF"] },
  { code: "IPI-TIPI-EXACT-PROFILE", title: "Perfil exato de NCM na TIPI consolidada", conclusion: "A base V83 indexa quinze NCMs exatos e seus Ex conhecidos, mas só libera memória após confirmar descrição, notas, operação, papel, vigência e benefício.", sourceCodes: ["IPI-RFB-TIPI-CONSOLIDATED", "IPI-RFB-NCM", "IPI-RFB-ORIENTATION"] },
  { code: "PIS-COFINS-CUMULATIVE", title: "Referência cumulativa", conclusion: "0,65% de PIS e 3% de Cofins são referências gerais do regime cumulativo, ressalvados regimes monofásicos, alíquota zero, suspensão e outras regras específicas.", sourceCodes: ["L-9718-1998", "MP-2158-35-2001", "RFB-PIS-COFINS"] },
  { code: "PIS-COFINS-NON-CUMULATIVE", title: "Referência não cumulativa", conclusion: "1,65% de PIS e 7,6% de Cofins são referências gerais, e o crédito depende das hipóteses legais e da documentação.", sourceCodes: ["L-10637-2002", "L-10833-2003", "RFB-PIS-COFINS"] },
  { code: "PIS-COFINS-SPECIAL-GATE", title: "Monofásico e tratamentos especiais", conclusion: "Produto, receita e regime especial afastam a aplicação automática das referências gerais.", sourceCodes: ["L-10637-2002", "L-10833-2003"] },
  { code: "PIS-COFINS-PRODUCT-ROLE-GATE", title: "Produto e papel na cadeia", conclusion: "NCM candidato não basta: tabela oficial, descrição, fabricante/importador/revendedor, documento e operação precisam coincidir.", sourceCodes: ["PISCOFINS-IN-2121", "PISCOFINS-RFB-MONOPHASE"] },
  { code: "PIS-COFINS-CREDIT-GATE", title: "Crédito por hipótese legal", conclusion: "O motor separa nove hipóteses recorrentes, mas bloqueia crédito sem incidência na aquisição, documento e vínculo com atividade tributada.", sourceCodes: ["PISCOFINS-L-10637", "PISCOFINS-L-10833", "PISCOFINS-RFB-CREDIT"] },
  { code: "PIS-COFINS-LC224-2026", title: "Benefícios e alíquotas em 2026", conclusion: "Desde 1º de abril de 2026, a LC 224/2025 e suas exceções precisam ser confrontadas antes de afirmar alíquota zero ou reduzida.", sourceCodes: ["PISCOFINS-LC-224", "PISCOFINS-L-10925"] },
  { code: "SIMPLES-DAS-INPUT-GATE", title: "DAS exige receita segregada", conclusion: "CNAE isolado não define DAS: são necessários RBT12, anexo, receita segregada, fator R quando aplicável e tratamentos fora do DAS.", sourceCodes: ["LC-123-2006", "CGSN-140-2018"] },
  { code: "SIMPLES-CNAE-ACTIVITY-GATE", title: "CNAE é candidato, não conclusão de anexo", conclusion: "A base prioriza 20 CNAEs recorrentes, mas contrato, notas e atividade efetivamente exercida precisam confirmar o anexo e as segregações.", sourceCodes: ["LC-123-2006", "CGSN-140-2018", "CNAE-CONCLA"] },
  { code: "SIMPLES-SUBLIMIT-2026", title: "Sublimite nacional de ICMS e ISS em 2026", conclusion: "Acima de R$ 3.600.000 de receita acumulada, ICMS e ISS exigem tratamento fora do DAS conforme os efeitos legais do excesso.", sourceCodes: ["CGSN-140-2018", "CGSN-PORTARIA-54-2025"] },
  { code: "IRPJ-CSLL-NOMINAL-RATES", title: "Alíquotas nominais de IRPJ e CSLL", conclusion: "O IRPJ geral é 15% com adicional quando aplicável; a CSLL geral é 9%, mas ambos incidem sobre bases que dependem do regime e da atividade.", sourceCodes: ["L-9249-1995", "RFB-IRPJ", "RFB-CSLL"] },
  { code: "IRPJ-CSLL-2026-GATE", title: "Alterações de benefícios em 2026", conclusion: "Benefícios e percentuais de presunção podem exigir ajustes específicos em 2026 antes de qualquer cálculo.", sourceCodes: ["RFB-BENEFITS-2026", "L-9249-1995"] },
  { code: "RTC-2026-TEST-YEAR", title: "IBS e CBS no ano-teste de 2026", conclusion: "O documento deve destacar CBS e IBS conforme o leiaute; a dispensa de recolhimento depende do cumprimento das obrigações aplicáveis.", sourceCodes: ["LC-214-2025", "RFB-RTC-2026"] },
  { code: "RTC-SECTOR-REDUCTION-GATE", title: "Reduções e alíquota zero exigem enquadramento exato", conclusion: `A base ${TAX_REFORM_SECTOR_VERSION} separa redução de 30%, redução de 60% e alíquota zero, mas somente libera memória quando operação, setor e classificação no Anexo legal aplicável estiverem comprovados.`, sourceCodes: ["RTC-LC-214-COMPILED", "RTC-RFB-TRANSITION", "RTC-RFB-CALCULATOR"] },
  { code: "RTC-SPECIFIC-REGIME-GATE", title: "Regime específico não herda o regime geral", conclusion: "Serviços financeiros, combustíveis e operações imobiliárias permanecem bloqueados até uma memória própria comprovar base, alíquota, período e exceções do respectivo regime.", sourceCodes: ["RTC-LC-214-COMPILED", "RTC-CGIBS-DERE"] },
  { code: "RTC-TRANSITION-SEPARATE-BOOKS", title: "Transição anual em livros separados", conclusion: "De 2026 a 2033, PIS/Cofins, ICMS/ISS, IPI, CBS, IBS e Imposto Seletivo são mantidos em livros separados; créditos não são compensados por presunção.", sourceCodes: ["RTC-EC-132", "RTC-LC-214-COMPILED", "RTC-RFB-TRANSITION"] },
  { code: "CSRF-SERVICES-4-65", title: "Retenção conjunta em serviços abrangidos", conclusion: "Serviços do art. 30 podem sofrer retenção conjunta de 4,65%, sujeita a natureza do serviço, partes e exceções.", sourceCodes: ["L-10833-2003"] },
  { code: "IRRF-SERVICES-1-1-5", title: "IRRF por natureza do serviço", conclusion: "Serviços profissionais usam referência de 1,5%; limpeza, conservação, segurança, vigilância e locação de mão de obra usam 1%, sempre com hipótese, beneficiário, dispensa e código confirmados.", sourceCodes: ["RET-RIR-2018", "RET-RFB-MAFON"] },
  { code: "CSRF-LIMIT-10", title: "Dispensa da CSRF calculada", conclusion: "A retenção conjunta igual ou inferior a R$ 10 é dispensada; o antigo corte de pagamento de R$ 5.000 não é reutilizado.", sourceCodes: ["RET-L-13137"] },
  { code: "WITHHOLDING-PUBLIC-TABLE", title: "Pagador público usa tabela própria", conclusion: "Órgãos e entidades públicas exigem o enquadramento e a tabela da IN RFB nº 1.234/2012 ou do convênio aplicável.", sourceCodes: ["RET-IN-RFB-1234"] },
  { code: "WITHHOLDING-REINF-EVIDENCE", title: "Escrituração das retenções", conclusion: "Retenções de pessoa jurídica são informadas nos eventos aplicáveis da EFD-Reinf.", sourceCodes: ["RFB-REINF-2026"] },
  { code: "INSS-RETENTION-GATE", title: "Retenção previdenciária em serviços", conclusion: "Cessão de mão de obra e empreitada abrem uma trilha separada de 11% ou 3,5% conforme CPRB, modo de execução, base, deduções e exceções.", sourceCodes: ["RET-L-8212", "RET-IN-RFB-2110", "RET-RFB-REINF"] },
  { code: "ISS-WITHHOLDING-MUNICIPAL-GATE", title: "Retenção de ISS depende do município", conclusion: "Item da LC 116, município competente, lei local, alíquota, responsável, base e vencimento precisam ser confirmados sem herdar conclusões federais.", sourceCodes: ["RET-LC-116", "RET-LC-123"] },
];

const nationalTopics: NationalFiscalTopic[] = [
  { code: "ICMS-NATIONAL", tax: "ICMS", title: "ICMS nacional", coverageLevel: "operational_reference", requiredFacts: ["originState", "destinationState", "productOrigin", "issuerTaxRegime", "recipientTaxpayer", "purpose", "specialTreatment"], supportedOutputs: ["referência interestadual de 4%, 7% ou 12%", "trilhas de DIFAL e ST", "bloqueio de operação interna"], hardStops: ["benefício ou regime especial", "alíquota interna sem lei estadual", "ST sem NCM/CEST e acordo"], sourceCodes: ["RSF-22-1989", "RSF-13-2012", "LC-87-1996", "CONFAZ-CONVENIO-142-2018"], examples: ["Qual o ICMS de mercadoria nacional de SP para BA?", "Venda importada de SC para GO enquadrada na Resolução 13/2012"] },
  { code: "ISS-NATIONAL", tax: "ISS", title: "ISS nacional", coverageLevel: "structured_triage", requiredFacts: ["productDescription", "serviceItem", "originMunicipality", "destinationMunicipality", "issuerTaxRegime", "specialTreatment"], supportedOutputs: ["faixa legal de 2% a 5%", "regra geral e exceções do local", "lista de fatos para lei municipal"], hardStops: ["alíquota exata sem lei municipal", "item de serviço ausente", "retenção municipal não confirmada"], sourceCodes: ["LC-116-2003", "LC-157-2016"], examples: ["Onde é devido o ISS de consultoria prestada de Campinas para Belo Horizonte?", "Qual a faixa de ISS do item 7.02 da LC 116?"] },
  { code: "IPI-NATIONAL", tax: "IPI", title: "IPI e TIPI", coverageLevel: "structured_triage", requiredFacts: ["productDescription", "ncm", "operationType", "businessActivity", "specialTreatment"], supportedOutputs: [`${ipiTipiPriorityProfiles.length} NCMs exatos em ${IPI_TIPI_DEEP_VERSION}`, "taxa nominal e Ex como referência indexada", "industrialização, importação, equiparação e saída não tributada", "base interna e aduaneira em centavos"], hardStops: ["NCM genérico ou descrição divergente", "notas da TIPI e Ex não conferidos", "papel ou operação incompatível", "benefício externo sem regra dedicada"], sourceCodes: ["IPI-D11158-TIPI", "IPI-RFB-TIPI-CONSOLIDATED", "IPI-RFB-NCM", "IPI-RFB-ORIENTATION"], examples: ["Qual o IPI do NCM 8708.99.90?", "Uma importação de máquina industrial tem IPI?", "O Ex 02 do NCM 3304.99.90 está a zero?"] },
  { code: "PIS-COFINS", tax: "PIS_COFINS", title: "PIS e Cofins", coverageLevel: "structured_triage", requiredFacts: ["productDescription", "pisCofinsRegime", "issuerTaxRegime", "businessActivity", "specialTreatment"], supportedOutputs: ["referências cumulativa e não cumulativa", "20 perfis monofásicos/alíquota zero candidatos", "nove hipóteses recorrentes de crédito", "débitos e créditos sem compensação presumida", "controle da LC 224/2025 em 2026"], hardStops: ["produto especial sem NCM exato e tabela oficial", "papel na cadeia ou documento ausente", "crédito sem hipótese legal, incidência e vínculo", "benefício pós-2026 não confirmado"], sourceCodes: ["L-9718-1998", "L-10637-2002", "L-10833-2003", "PISCOFINS-L-10147", "PISCOFINS-L-10485", "PISCOFINS-L-10925", "PISCOFINS-IN-2121", "PISCOFINS-LC-224"], examples: ["Qual a alíquota de PIS e Cofins no regime cumulativo?", "Revenda do NCM 4011.10.00 é monofásica em 2026?", "Lucro real pode tomar crédito de PIS/Cofins sobre insumo?"] },
  { code: "SIMPLES-NACIONAL", tax: "SIMPLES", title: "Simples Nacional", coverageLevel: "structured_triage", requiredFacts: ["cnae", "businessActivity", "productDescription", "specialTreatment"], supportedOutputs: ["20 perfis CNAE prioritários", "trilha dos Anexos I a V e fator R", "segregação de receitas", "limite e sublimite de 2026", "tributos fora do DAS"], hardStops: ["DAS sem RBT12 e composição mensal", "anexo apenas pelo CNAE", "impedimentos não conferidos", "ST, monofásico, exportação ou retenção não segregados"], sourceCodes: ["LC-123-2006", "CGSN-140-2018", "CGSN-PORTARIA-54-2025", "CNAE-CONCLA"], examples: ["Em qual anexo do Simples entra uma consultoria?", "Como o fator R muda a tributação de serviços?", "Qual o efeito do sublimite de 2026?"] },
  { code: "IRPJ-CSLL", tax: "IRPJ_CSLL", title: "IRPJ e CSLL", coverageLevel: "structured_triage", requiredFacts: ["incomeTaxRegime", "businessActivity", "productDescription", "specialTreatment"], supportedOutputs: ["alíquotas nominais", "base conforme regime e atividade", "adicional de IRPJ e alerta 2026"], hardStops: ["base presumida sem separar atividades", "benefício de 2026 não classificado", "instituição financeira não identificada"], sourceCodes: ["L-9249-1995", "RFB-IRPJ", "RFB-CSLL", "RFB-BENEFITS-2026"], examples: ["Quais as alíquotas de IRPJ e CSLL no lucro presumido?", "Prestação de serviços usa qual base presumida?"] },
  { code: "IBS-CBS-2026", tax: "IBS_CBS", title: "IBS e CBS de 2026 a 2033", coverageLevel: "operational_reference", requiredFacts: ["operationType", "businessActivity", "specialTreatment"], supportedOutputs: [`${taxReformSectorProfiles.length} perfis setoriais em ${TAX_REFORM_SECTOR_VERSION}`, "transição anual de 2026 a 2033", "CBS, IBS, ICMS/ISS, PIS/Cofins, IPI e IS em livros separados", "reduções de 30% e 60% e alíquota zero condicionadas ao enquadramento", "144 cenários determinísticos com memória anual"], hardStops: ["tratar destaque de 2026 como saldo a recolher", "classificação setorial ou Anexo legal não comprovados", "crédito sem documento e vínculo", "regime específico financeiro, combustível ou imobiliário sem fórmula própria"], sourceCodes: ["LC-214-2025", "RFB-RTC-2026", "RTC-EC-132", "RTC-RFB-TRANSITION", "RTC-CGIBS-DERE", "RTC-RFB-CALCULATOR"], examples: ["Como destacar IBS e CBS em 2026?", "Como muda a carga de um serviço profissional entre 2027 e 2033?", "A cesta básica tem alíquota zero em 2033?", "Combustível pode usar a fórmula do regime geral?"] },
  { code: "WITHHOLDINGS-SERVICES", tax: "WITHHOLDINGS", title: "Retenções sobre serviços", coverageLevel: "structured_triage", requiredFacts: ["productDescription", "payerType", "paymentRecipientType", "serviceNature", "issuerTaxRegime", "specialTreatment"], supportedOutputs: [`${serviceWithholdingProfiles.length} perfis recorrentes`, "IRRF, CSRF, INSS e ISS em quatro livros independentes", "limites, dispensas, responsáveis e prazos por tributo", "eventos EFD-Reinf e bloqueio do líquido sem simultaneidade"], hardStops: ["percentual sem natureza, partes, regime e fato gerador", "órgão público tratado como tomador privado", "CPRB, cessão, empreitada ou deduções não confirmadas", "ISS sem município, item, lei, alíquota e responsabilidade"], sourceCodes: ["RET-RIR-2018", "RET-RFB-MAFON", "RET-L-10833", "RET-L-13137", "RET-IN-RFB-2110", "RET-IN-RFB-1234", "RET-LC-116", "RET-RFB-REINF"], examples: ["Consultoria entre duas empresas tem IRRF e CSRF?", "Limpeza com cessão de mão de obra exige INSS e ISS retido?", "Órgão público pode usar a retenção privada de 4,65%?"] },
];

export const spMgAutoPartsKnowledge: FiscalIntelligenceDefinition = {
  schemaVersion: "manual-fiscal-intelligence.v1",
  engineVersion: "cbshub-manual-fiscal-1.5.0",
  baseCode: "FISCAL-MANUAL-BR",
  version: "1.6.0",
  name: "Inteligência Fiscal Manual Brasil · V84",
  assuranceLevel: "pilot_conditional",
  coverage: { tax: "ICMS", originState: "SP", destinationState: "MG", segment: "auto_parts" },
  ontology: {
    icms: ["icms", "imposto estadual", "aliquota interestadual"],
    auto_parts: ["autopeca", "autopecas", "peca automotiva", "pecas automotivas", "componente automotivo", "pastilha de freio", "filtro automotivo"],
    resale: ["revenda", "revender", "comercializacao"],
    industrialization: ["industrializacao", "industrializar", "insumo"],
    use_consumption: ["uso e consumo", "uso ou consumo", "consumo proprio"],
    fixed_asset: ["ativo imobilizado", "ativo fixo"],
    iss: ["iss", "issqn", "imposto sobre servicos", "imposto municipal"],
    ipi: ["ipi", "imposto sobre produtos industrializados", "tipi"],
    pis_cofins: ["pis cofins", "pis/pasep", "cofins", "contribuicoes sobre receita"],
    simples: ["simples nacional", "das", "pgdas", "fator r", "anexo iii", "anexo v"],
    irpj_csll: ["irpj", "csll", "lucro presumido", "lucro real", "imposto de renda da empresa"],
    ibs_cbs: ["ibs", "cbs", "ibs cbs", "ibs/cbs", "reforma tributaria", "ano teste", "lc 214"],
    withholdings: ["retencao", "retencoes", "irrf", "csrf", "inss retido", "efd reinf"],
  },
  rules: [
    ...nationalRules,
    {
      code: "ICMS-INTERSTATE-SP-MG-DOMESTIC-12",
      title: "Alíquota interestadual geral",
      conclusion: "Operações interestaduais de SP para MG com mercadoria nacional seguem a alíquota geral de 12%, quando não houver regra especial aplicável.",
      sourceCodes: ["RSF-22-1989"],
    },
    {
      code: "ICMS-INTERSTATE-IMPORTED-4",
      title: "Mercadoria importada sujeita à alíquota de 4%",
      conclusion: "A alíquota de 4% depende do enquadramento da mercadoria importada nas condições da Resolução do Senado nº 13/2012 e de suas exceções.",
      sourceCodes: ["RSF-13-2012"],
    },
    {
      code: "ICMS-ST-AUTO-PARTS-SP-MG",
      title: "Protocolo interestadual de substituição tributária",
      conclusion: "São Paulo e Minas Gerais constam no acordo de ST de autopeças; a incidência concreta depende cumulativamente da descrição, NCM, CEST, uso automotivo e âmbito do item.",
      sourceCodes: ["CONFAZ-PROTOCOL-41-2008", "CONFAZ-CONVENIO-142-2018", "MG-RICMS-ANNEX-VII"],
    },
    {
      code: "ICMS-ST-AUTOMOTIVE-USE",
      title: "Uso especificamente automotivo",
      conclusion: "O enquadramento mineiro de autopeças exige conferir o uso especificamente automotivo e as hipóteses de aplicação e inaplicabilidade do Anexo VII.",
      sourceCodes: ["CONFAZ-PROTOCOL-41-2008", "MG-RICMS-ANNEX-VII", "MG-RICMS-INDEX"],
    },
    {
      code: "ICMS-ST-SIMPLES-APPLIES",
      title: "Substituição tributária e Simples Nacional",
      conclusion: "O Convênio ICMS 142/2018 alcança contribuintes optantes ou não pelo Simples Nacional; isso não autoriza tratar o destaque do ICMS próprio como se o remetente estivesse no regime normal.",
      sourceCodes: ["CONFAZ-CONVENIO-142-2018"],
    },
    {
      code: "ICMS-ST-DESTINATION-EXCEPTIONS",
      title: "Exceções conforme o destino e a finalidade",
      conclusion: "O Protocolo ICMS 41/08 prevê inaplicabilidade para destino industrial e disciplina separadamente uso, consumo e ativo imobilizado.",
      sourceCodes: ["CONFAZ-PROTOCOL-41-2008"],
    },
    {
      code: "ICMS-DIFAL-NON-TAXPAYER",
      title: "Consumidor final não contribuinte",
      conclusion: "A LC 190/2022 atribui ao remetente a diferença entre a alíquota interna do destino e a interestadual quando o destinatário final não for contribuinte.",
      sourceCodes: ["LC-190-2022", "MG-RICMS-ANNEX-I"],
    },
    {
      code: "ICMS-ST-GLASS-SP-EXCEPTION-2026",
      title: "Exceção para vidro automotivo envolvendo São Paulo",
      conclusion: "Desde 1º de janeiro de 2026, o Protocolo ICMS 41/08 não se aplica ao CEST 01.015.00 quando São Paulo for origem ou destino.",
      sourceCodes: ["CONFAZ-PROTOCOL-41-2008", "MG-RICMS-ANNEX-VII"],
    },
  ],
  productClassifications: [
    {
      code: "MG-AUTO-075",
      ncmPrefix: "8708",
      cest: "01.075.00",
      description: "Partes e acessórios dos veículos automóveis das posições 8701 a 8705",
      descriptionTerms: ["parte", "acessório", "acessorio", "veículo automóvel", "veiculo automovel"],
      interstateScope: true,
      tableMvaBps: 7178,
      sourceCodes: ["MG-RICMS-ANNEX-VII"],
    },
    {
      code: "MG-AUTO-065",
      ncmPrefix: "853650",
      cest: "01.065.00",
      description: "Interruptores, seccionadores e comutadores de uso automotivo",
      descriptionTerms: ["interruptor", "seccionador", "comutador"],
      interstateScope: true,
      tableMvaBps: 7178,
      sourceCodes: ["MG-RICMS-ANNEX-VII"],
    },
    {
      code: "MG-AUTO-041",
      ncmPrefix: "84213100",
      cest: "01.041.00",
      description: "Filtros de entrada de ar para motores",
      descriptionTerms: ["filtro de entrada de ar", "filtro de ar"],
      interstateScope: true,
      tableMvaBps: 7178,
      sourceCodes: ["MG-RICMS-ANNEX-VII"],
    },
    {
      code: "MG-AUTO-001",
      ncmPrefix: "38151210",
      cest: "01.001.00",
      description: "Catalisadores em colmeia cerâmica ou metálica para conversão catalítica de gases de escape",
      descriptionTerms: ["catalisador", "colmeia cerâmica", "colmeia metalica"],
      interstateScope: true,
      tableMvaBps: 7178,
      sourceCodes: ["MG-RICMS-ANNEX-VII"],
    },
    {
      code: "MG-AUTO-003",
      ncmPrefix: "39181000",
      cest: "01.003.00",
      description: "Protetores de caçamba",
      descriptionTerms: ["protetor de caçamba", "protetor de cacamba"],
      interstateScope: true,
      tableMvaBps: 7178,
      sourceCodes: ["MG-RICMS-ANNEX-VII"],
    },
    {
      code: "MG-AUTO-004",
      ncmPrefix: "39233000",
      cest: "01.004.00",
      description: "Reservatórios de óleo",
      descriptionTerms: ["reservatório de óleo", "reservatorio de oleo"],
      interstateScope: true,
      tableMvaBps: 7178,
      sourceCodes: ["MG-RICMS-ANNEX-VII"],
    },
    {
      code: "MG-AUTO-007",
      ncmPrefix: "40169300",
      cest: "01.007.00",
      description: "Juntas, gaxetas e outros elementos com função semelhante de vedação",
      descriptionTerms: ["junta", "gaxeta", "vedação", "vedacao"],
      interstateScope: true,
      tableMvaBps: 7178,
      sourceCodes: ["MG-RICMS-ANNEX-VII"],
    },
    {
      code: "MG-AUTO-014",
      ncmPrefix: "6813",
      cest: "01.014.00",
      description: "Guarnições de fricção e artigos semelhantes para freios, embreagens ou outros órgãos de fricção",
      descriptionTerms: ["guarnição de fricção", "guarnicao de friccao", "pastilha", "freio", "embreagem"],
      interstateScope: true,
      tableMvaBps: 7178,
      sourceCodes: ["MG-RICMS-ANNEX-VII"],
    },
    {
      code: "MG-AUTO-015",
      ncmPrefix: "70071100",
      cest: "01.015.00",
      description: "Vidros de dimensões e formatos que permitam aplicação automotiva",
      descriptionTerms: ["vidro automotivo", "para-brisa", "parabrisa"],
      interstateScope: false,
      tableMvaBps: 7178,
      sourceCodes: ["CONFAZ-PROTOCOL-41-2008", "MG-RICMS-ANNEX-VII"],
    },
    {
      code: "MG-AUTO-016",
      ncmPrefix: "70091000",
      cest: "01.016.00",
      description: "Espelhos retrovisores",
      descriptionTerms: ["espelho retrovisor", "retrovisor"],
      interstateScope: true,
      tableMvaBps: 7178,
      sourceCodes: ["MG-RICMS-ANNEX-VII"],
    },
    {
      code: "MG-AUTO-020",
      ncmPrefix: "7320",
      cest: "01.020.00",
      description: "Molas e folhas de molas de ferro ou aço",
      descriptionTerms: ["mola", "folha de mola"],
      interstateScope: true,
      tableMvaBps: 7178,
      sourceCodes: ["MG-RICMS-ANNEX-VII"],
    },
    {
      code: "MG-AUTO-028",
      ncmPrefix: "84073",
      cest: "01.028.00",
      description: "Motores de pistão alternativo dos tipos utilizados para propulsão de veículos",
      descriptionTerms: ["motor", "pistão alternativo", "pistao alternativo"],
      interstateScope: true,
      tableMvaBps: 7178,
      sourceCodes: ["MG-RICMS-ANNEX-VII"],
    },
    {
      code: "MG-AUTO-032",
      ncmPrefix: "841330",
      cest: "01.032.00",
      description: "Bombas para combustíveis, lubrificantes ou líquidos de arrefecimento",
      descriptionTerms: ["bomba de combustível", "bomba de combustivel", "bomba de óleo", "bomba de oleo"],
      interstateScope: true,
      tableMvaBps: 7178,
      sourceCodes: ["MG-RICMS-ANNEX-VII"],
    },
    {
      code: "MG-AUTO-037",
      ncmPrefix: "84212300",
      cest: "01.037.00",
      description: "Aparelhos para filtrar óleos minerais nos motores de ignição",
      descriptionTerms: ["filtro de óleo", "filtro de oleo"],
      interstateScope: true,
      tableMvaBps: 7178,
      sourceCodes: ["MG-RICMS-ANNEX-VII"],
    },
    {
      code: "MG-AUTO-043",
      ncmPrefix: "84254200",
      cest: "01.043.00",
      description: "Macacos hidráulicos para veículos",
      descriptionTerms: ["macaco hidráulico", "macaco hidraulico"],
      interstateScope: true,
      tableMvaBps: 7178,
      sourceCodes: ["MG-RICMS-ANNEX-VII"],
    },
    {
      code: "MG-AUTO-050",
      ncmPrefix: "8483",
      cest: "01.050.00",
      description: "Árvores de transmissão, engrenagens, caixas de transmissão e componentes",
      descriptionTerms: ["árvore de transmissão", "arvore de transmissao", "engrenagem", "caixa de transmissão", "caixa de transmissao"],
      interstateScope: true,
      tableMvaBps: 7178,
      sourceCodes: ["MG-RICMS-ANNEX-VII"],
    },
    {
      code: "MG-AUTO-070",
      ncmPrefix: "853910",
      cest: "01.070.00",
      description: "Faróis e unidades seladas de uso automotivo",
      descriptionTerms: ["farol", "unidade selada"],
      interstateScope: true,
      tableMvaBps: 7178,
      sourceCodes: ["MG-RICMS-ANNEX-VII"],
    },
    {
      code: "MG-AUTO-073",
      ncmPrefix: "85443000",
      cest: "01.073.00",
      description: "Jogos de fios para velas de ignição e outros jogos de fios",
      descriptionTerms: ["fio para vela", "jogo de fios", "fio de ignição", "fio de ignicao"],
      interstateScope: true,
      tableMvaBps: 7178,
      sourceCodes: ["MG-RICMS-ANNEX-VII"],
    },
  ],
  nationalTopics,
  sources: [
    ...nationalSources,
    {
      code: "RSF-22-1989",
      title: "Resolução do Senado Federal nº 22/1989",
      publisher: "Senado Federal",
      url: "https://legis.senado.leg.br/norma/586152/publicacao?tipoDocumento=RSF&tipoTexto=ATU",
      legalReference: "art. 1º e parágrafo único",
      sourceUpdatedAt: null,
      checkedAt: CHECKED_AT,
      primary: true,
    },
    {
      code: "RSF-13-2012",
      title: "Resolução do Senado Federal nº 13/2012",
      publisher: "Senado Federal",
      url: "https://legis.senado.leg.br/norma/586999/publicacao?tipoDocumento=RSF&tipoTexto=ATU",
      legalReference: "arts. 1º a 3º",
      sourceUpdatedAt: null,
      checkedAt: CHECKED_AT,
      primary: true,
    },
    {
      code: "MG-RICMS-INDEX",
      title: "Regulamento do ICMS de Minas Gerais · 2023",
      publisher: "Secretaria de Estado de Fazenda de Minas Gerais",
      url: "https://www.fazenda.mg.gov.br/empresas/legislacao_tributaria/ricms",
      legalReference: "Decreto nº 48.589/2023; atualizado até o Decreto nº 49.252/2026",
      sourceUpdatedAt: "2026-06-29",
      checkedAt: CHECKED_AT,
      primary: true,
    },
    {
      code: "MG-RICMS-ANNEX-I",
      title: "RICMS/MG 2023 · Anexo I · Alíquotas",
      publisher: "Secretaria de Estado de Fazenda de Minas Gerais",
      url: "https://www.fazenda.mg.gov.br/empresas/legislacao_tributaria/ricms2023/anexoi2023.pdf",
      legalReference: "Parte 1, item 7; Parte 2, itens 1 a 3",
      sourceUpdatedAt: "2024-02-28",
      checkedAt: CHECKED_AT,
      primary: true,
    },
    {
      code: "CONFAZ-PROTOCOL-41-2008",
      title: "Protocolo ICMS 41/2008 · Autopeças",
      publisher: "Conselho Nacional de Política Fazendária",
      url: "https://www.confaz.fazenda.gov.br/legislacao/protocolos/2008/pt041_08",
      legalReference: "cláusula primeira, caput e §§ 1º a 3º; alteração do Protocolo 85/2025",
      sourceUpdatedAt: "2026-01-01",
      checkedAt: CHECKED_AT,
      primary: true,
    },
    {
      code: "CONFAZ-CONVENIO-142-2018",
      title: "Convênio ICMS 142/2018 · Substituição tributária",
      publisher: "Conselho Nacional de Política Fazendária",
      url: "https://www.confaz.fazenda.gov.br/legislacao/convenios/2018/CV142_18",
      legalReference: "cláusulas primeira a sétima, décima primeira e décima terceira; Anexo II",
      sourceUpdatedAt: null,
      checkedAt: CHECKED_AT,
      primary: true,
    },
    {
      code: "LC-190-2022",
      title: "Lei Complementar nº 190/2022 · DIFAL",
      publisher: "Presidência da República",
      url: "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp190.htm",
      legalReference: "art. 1º; alterações nos arts. 4º, 11 e 12 da LC 87/1996",
      sourceUpdatedAt: "2022-01-05",
      checkedAt: CHECKED_AT,
      primary: true,
    },
    {
      code: "MG-RICMS-ANNEX-VII",
      title: "RICMS/MG 2023 · Anexo VII · Substituição Tributária",
      publisher: "Secretaria de Estado de Fazenda de Minas Gerais",
      url: "https://www.fazenda.mg.gov.br/empresas/legislacao_tributaria/ricms2023/anexovii2023.pdf",
      legalReference: "Parte 1, Capítulo VII; Parte 2, Capítulo 1",
      sourceUpdatedAt: "2026-06-29",
      checkedAt: CHECKED_AT,
      primary: true,
    },
    {
      code: "SP-ST-AGREEMENTS",
      title: "Convênios e Protocolos de Substituição Tributária",
      publisher: "Secretaria da Fazenda e Planejamento de São Paulo",
      url: "https://legislacao.fazenda.sp.gov.br/Paginas/ConveniosProtocolosSubstituicaoTributaria.aspx",
      legalReference: "Autopeças · Minas Gerais · Protocolo ICMS 41/08",
      sourceUpdatedAt: "2026-05-18",
      checkedAt: CHECKED_AT,
      primary: false,
    },
  ],
  limitations: [
    "A cobertura nacional de ICMS, ISS, IPI, PIS/Cofins, Simples, IRPJ/CSLL, IBS/CBS e retenções é uma triagem estruturada; somente o módulo SP→MG de autopeças possui catálogo especializado NCM/CEST.",
    "O módulo especializado cruza descrição, NCM e CEST em catálogo controlado; ele não substitui a classificação fiscal formal da mercadoria.",
    "MVA de tabela não é o valor do ICMS-ST a recolher; preço, frete, IPI, base, alíquota interna, MVA ajustada e deduções ainda precisam ser calculados e revisados.",
    "Cem por cento de completude significa que todos os fatos mínimos foram respondidos, não certeza jurídica de cem por cento.",
    "Benefícios, regimes especiais, particularidades do Simples Nacional, DIFAL e exceções podem exigir cálculo ou validação adicional.",
    "A base ainda não recebeu homologação profissional externa; por isso, nenhuma resposta é rotulada como definitiva.",
  ],
};

export const fiscalIntelligenceSeed = {
  code: spMgAutoPartsKnowledge.baseCode,
  version: spMgAutoPartsKnowledge.version,
  name: spMgAutoPartsKnowledge.name,
  scope: "BR:MULTITAX:TRIAGE+ICMS:SP>MG:AUTO_PARTS",
  status: "controlled_beta",
  contentJson: JSON.stringify(spMgAutoPartsKnowledge),
  sourceCount: spMgAutoPartsKnowledge.sources.length,
  checkedAt: CHECKED_AT,
};

const stateAliases: Record<string, string[]> = {
  AC: ["ac", "acre"], AL: ["al", "alagoas"], AP: ["ap", "amapa"], AM: ["am", "amazonas"], BA: ["ba", "bahia"],
  CE: ["ce", "ceara"], DF: ["df", "distrito federal"], ES: ["es", "espirito santo"], GO: ["go", "goias"], MA: ["ma", "maranhao"],
  MT: ["mt", "mato grosso"], MS: ["ms", "mato grosso do sul"], MG: ["mg", "minas gerais"], PA: ["pa"], PB: ["pb", "paraiba"],
  PR: ["pr", "parana"], PE: ["pe", "pernambuco"], PI: ["pi", "piaui"], RJ: ["rj", "rio de janeiro"], RN: ["rn", "rio grande do norte"],
  RS: ["rs", "rio grande do sul"], RO: ["ro", "rondonia"], RR: ["rr", "roraima"], SC: ["sc", "santa catarina"],
  SP: ["sp", "sao paulo"], SE: ["sergipe"], TO: ["to", "tocantins"],
};

const requiredOperationalFields: Array<keyof FiscalIntelligenceFacts> = [
  "productDescription",
  "ncm",
  "cest",
  "productOrigin",
  "issuerTaxRegime",
  "recipientTaxpayer",
  "purpose",
  "automotiveUse",
  "specialTreatment",
];

const legacyFactViewFields: Array<keyof FiscalIntelligenceFacts> = [
  "tax", "originState", "destinationState", "segment", "productDescription", "ncm", "cest", "productOrigin",
  "importRuleQualification", "issuerTaxRegime", "recipientTaxpayer", "purpose", "automotiveUse", "specialTreatment", "referenceDate",
];

const clarificationCatalog: Partial<Record<keyof FiscalIntelligenceFacts, FiscalClarification>> = {
  tax: { field: "tax", question: "Qual tributo precisa ser analisado?", reason: "A base inicial só cobre ICMS." },
  originState: { field: "originState", question: "De qual estado a mercadoria sairá?", reason: "A alíquota e os acordos dependem da rota interestadual." },
  destinationState: { field: "destinationState", question: "Para qual estado a mercadoria será enviada?", reason: "A alíquota e os acordos dependem da rota interestadual." },
  segment: { field: "segment", question: "A mercadoria é uma autopeça?", reason: "A cobertura piloto está limitada ao segmento de autopeças." },
  productDescription: { field: "productDescription", question: "Qual é a descrição técnica da mercadoria?", reason: "NCM e CEST não bastam quando a descrição legal não coincide com o produto." },
  ncm: { field: "ncm", question: "Qual é o NCM completo da mercadoria?", reason: "O enquadramento em substituição tributária exige conferir a classificação fiscal." },
  cest: { field: "cest", question: "Qual é o CEST informado para a mercadoria?", reason: "O CEST identifica o item da tabela de substituição tributária." },
  productOrigin: { field: "productOrigin", question: "A mercadoria é nacional ou importada?", reason: "Mercadorias importadas podem seguir a alíquota interestadual de 4%." },
  importRuleQualification: { field: "importRuleQualification", question: "A mercadoria importada se enquadra na Resolução nº 13/2012?", reason: "É preciso saber se não houve industrialização ou se o conteúdo de importação supera 40%, além de conferir exceções." },
  issuerTaxRegime: { field: "issuerTaxRegime", question: "O remetente está no regime normal ou no Simples Nacional?", reason: "O tratamento operacional do destaque e da apuração muda conforme o regime." },
  recipientTaxpayer: { field: "recipientTaxpayer", question: "O destinatário mineiro é contribuinte do ICMS?", reason: "Operações para não contribuinte exigem outra trilha, inclusive análise de DIFAL." },
  purpose: { field: "purpose", question: "A mercadoria será revendida, industrializada, usada/consumida ou imobilizada?", reason: "A finalidade altera a análise da substituição tributária e da entrada." },
  automotiveUse: { field: "automotiveUse", question: "A peça terá uso especificamente automotivo?", reason: "O RICMS/MG restringe este capítulo às mercadorias de uso especificamente automotivo." },
  specialTreatment: { field: "specialTreatment", question: "Existe benefício fiscal, regime especial ou decisão específica para a operação?", reason: "Uma regra particular pode afastar a conclusão geral." },
};

function normalizeText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9.%>]+/g, " ").replace(/\s+/g, " ").trim();
}

function digits(value: string | null | undefined) {
  const normalized = value?.replace(/\D/g, "") ?? "";
  return normalized || null;
}

function normalizeCest(value: string | null | undefined) {
  const normalized = digits(value);
  if (!normalized) return null;
  if (normalized.length !== 7) return normalized;
  return `${normalized.slice(0, 2)}.${normalized.slice(2, 5)}.${normalized.slice(5)}`;
}

function findStateRoute(normalized: string) {
  const positions = Object.entries(stateAliases).flatMap(([state, aliases]) => aliases.map((alias) => {
    const match = new RegExp(`(?:^|\\s)${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\s|$)`).exec(normalized);
    return { state, alias, index: match?.index ?? -1 };
  })).filter((item) => item.index >= 0);
  positions.sort((left, right) => left.index - right.index || right.alias.length - left.alias.length);
  const mostSpecificAtPosition = positions.filter((item, index) => positions.findIndex((candidate) => candidate.index === item.index) === index);
  const distinct = mostSpecificAtPosition.filter((item, index) => mostSpecificAtPosition.findIndex((candidate) => candidate.state === item.state) === index);
  return { originState: distinct[0]?.state ?? null, destinationState: distinct[1]?.state ?? null };
}

function includesAny(normalized: string, terms: string[]) {
  return terms.some((term) => normalized.includes(normalizeText(term)));
}

function extractNcm(question: string) {
  const match = question.match(/\bncm\s*[:#-]?\s*([0-9][0-9.\s]{3,12})/i);
  const value = digits(match?.[1]);
  return value && value.length >= 4 && value.length <= 8 ? value : null;
}

function extractCest(question: string) {
  const match = question.match(/\bcest\s*[:#-]?\s*([0-9][0-9.\s]{5,11})/i);
  const value = digits(match?.[1]);
  return value && value.length === 7 ? normalizeCest(value) : null;
}

function extractServiceItem(question: string) {
  const match = question.match(/(?:item|subitem)\s*([0-9]{1,2}(?:[.,][0-9]{1,2})?)/i);
  return match?.[1]?.replace(",", ".") ?? null;
}

function extractCnae(question: string) {
  const match = question.match(/\bcnae\s*[:#-]?\s*([0-9][0-9.\s/-]{4,12})/i);
  const value = digits(match?.[1]);
  return value && value.length === 7 ? value : null;
}

function detectTax(normalized: string, definition: FiscalIntelligenceDefinition): FiscalTaxCode | null {
  const candidates: Array<[FiscalTaxCode, string]> = [
    ["WITHHOLDINGS", "withholdings"], ["IBS_CBS", "ibs_cbs"], ["ISS", "iss"], ["IPI", "ipi"],
    ["PIS_COFINS", "pis_cofins"], ["IRPJ_CSLL", "irpj_csll"], ["SIMPLES", "simples"], ["ICMS", "icms"],
  ];
  const padded = ` ${normalized} `;
  return candidates.find(([, key]) => (definition.ontology[key] ?? []).some((term) => padded.includes(` ${normalizeText(term)} `)))?.[0] ?? null;
}

function extractProductDescription(question: string, normalized: string, definition: FiscalIntelligenceDefinition) {
  const known = definition.ontology.auto_parts.find((term) => normalized.includes(normalizeText(term)) && !["autopeca", "autopecas", "peca automotiva", "pecas automotivas"].includes(normalizeText(term)));
  if (known) return known;
  const explicit = question.match(/(?:produto|mercadoria|pe[cç]a)\s*[:=-]\s*([^,;.]{3,100})/i)?.[1]?.trim();
  return explicit || null;
}

export function extractFiscalFacts(question: string, overrides: FiscalIntelligenceOverrides = {}, referenceDate = CHECKED_AT, definition = spMgAutoPartsKnowledge) {
  const normalized = normalizeText(question);
  const route = findStateRoute(normalized);
  const tax = detectTax(normalized, definition);
  const autoParts = includesAny(normalized, definition.ontology.auto_parts);
  const hasImported = /\bimportad[oa]s?\b/.test(normalized);
  const hasDomestic = /\b(nacional|nacionais|domestica|domestico)\b/.test(normalized);
  const importPercentage = Number(normalized.match(/(?:conteudo de importacao|conteudo importado)[^0-9]{0,15}(\d{1,3})(?:[.,]\d+)?\s*%/)?.[1]);
  const importQualification = hasImported && (includesAny(normalized, ["sem industrializacao", "nao industrializada", "nao industrializado"]) || importPercentage > 40)
    ? "qualifies"
    : hasImported && Number.isFinite(importPercentage) && importPercentage <= 40
      ? "does_not_qualify"
      : "unknown";
  const nonTaxpayer = includesAny(normalized, ["nao contribuinte", "não contribuinte"]);
  const taxpayer = !nonTaxpayer && /\bcontribuinte(?: do icms)?\b/.test(normalized);
  const mentionsGoods = includesAny(normalized, ["mercadoria", "produto", "venda", "revenda", "comercio"]);
  const mentionsService = includesAny(normalized, ["servico", "servicos", "consultoria", "prestacao"]);
  const businessActivity = includesAny(normalized, ["atividade mista", "receitas mistas"])
    ? "mixed"
    : includesAny(normalized, ["industria", "industrializacao", "fabricacao"])
      ? "industry"
      : includesAny(normalized, ["comercio", "revenda", "lojista"])
        ? "commerce"
        : mentionsService
          ? "service"
          : "unknown";
  const facts: FiscalIntelligenceFacts = {
    tax,
    originState: route.originState,
    destinationState: route.destinationState,
    segment: autoParts ? "auto_parts" : tax === "ISS" || tax === "WITHHOLDINGS" ? "services" : tax === "IPI" ? "industry" : tax === "ICMS" ? "general_goods" : tax ? "general_business" : null,
    productDescription: extractProductDescription(question, normalized, definition),
    ncm: extractNcm(question),
    cest: extractCest(question),
    productOrigin: hasImported ? "imported" : hasDomestic ? "domestic" : "unknown",
    importRuleQualification: importQualification,
    issuerTaxRegime: includesAny(normalized, ["simples nacional", "optante do simples"]) ? "simples" : includesAny(normalized, ["regime normal", "lucro real", "lucro presumido"]) ? "normal" : "unknown",
    recipientTaxpayer: nonTaxpayer ? "no" : taxpayer ? "yes" : "unknown",
    purpose: includesAny(normalized, definition.ontology.resale) ? "resale" : includesAny(normalized, definition.ontology.industrialization) ? "industrialization" : includesAny(normalized, definition.ontology.use_consumption) ? "use_consumption" : includesAny(normalized, definition.ontology.fixed_asset) ? "fixed_asset" : "unknown",
    automotiveUse: includesAny(normalized, ["uso automotivo", "uso especificamente automotivo"]) ? "yes" : "unknown",
    specialTreatment: includesAny(normalized, ["regime especial", "beneficio fiscal", "benefício fiscal"]) ? "exists" : includesAny(normalized, ["sem beneficio", "sem benefício", "sem regime especial"]) ? "none" : "unknown",
    operationType: hasImported ? "import" : includesAny(normalized, ["exportacao", "exportar", "exportada"]) ? "export" : mentionsGoods && mentionsService ? "mixed" : mentionsService ? "service" : mentionsGoods ? "goods" : "unknown",
    businessActivity,
    incomeTaxRegime: includesAny(normalized, ["lucro presumido"]) ? "presumed" : includesAny(normalized, ["lucro real"]) ? "real" : includesAny(normalized, ["simples nacional", "optante do simples"]) ? "simples" : "unknown",
    pisCofinsRegime: includesAny(normalized, ["nao cumulativo", "não cumulativo", "lucro real"]) ? "non_cumulative" : includesAny(normalized, ["regime cumulativo", "lucro presumido"]) ? "cumulative" : includesAny(normalized, ["monofasico", "monofásico"]) ? "monophase" : includesAny(normalized, ["aliquota zero", "alíquota zero"]) ? "zero_rate" : "unknown",
    serviceItem: extractServiceItem(question),
    cnae: extractCnae(question),
    originMunicipality: null,
    destinationMunicipality: null,
    payerType: includesAny(normalized, ["orgao publico pagador", "órgão público pagador", "pagamento por orgao publico"]) ? "public_entity" : includesAny(normalized, ["tomador pessoa juridica", "tomador pj", "empresa tomadora"]) ? "private_legal_entity" : includesAny(normalized, ["tomador pessoa fisica", "tomador pf"]) ? "individual" : "unknown",
    paymentRecipientType: includesAny(normalized, ["prestador pessoa juridica", "prestador pj", "pagamento a empresa"]) ? "legal_entity" : includesAny(normalized, ["prestador pessoa fisica", "prestador pf", "autonomo", "autônomo"]) ? "individual" : "unknown",
    serviceNature: includesAny(normalized, ["consultoria", "assessoria", "servico profissional", "serviço profissional", "contabilidade", "advocacia"]) ? "professional" : includesAny(normalized, ["limpeza", "conservacao", "conservação", "manutencao", "manutenção", "vigilancia", "vigilância"]) ? "cleaning_maintenance" : includesAny(normalized, ["cessao de mao de obra", "cessão de mão de obra", "locacao de mao de obra", "locação de mão de obra"]) ? "labor_assignment" : includesAny(normalized, ["empreitada", "construcao civil", "construção civil"]) ? "construction" : mentionsService ? "general" : "unknown",
    referenceDate,
  };
  const merged = { ...facts, ...overrides };
  return {
    ...merged,
    ncm: digits(merged.ncm),
    cest: normalizeCest(merged.cest),
    productDescription: merged.productDescription?.trim().slice(0, 120) || null,
    serviceItem: merged.serviceItem?.trim().slice(0, 12) || null,
    cnae: digits(merged.cnae),
    originMunicipality: merged.originMunicipality?.trim().slice(0, 80) || null,
    destinationMunicipality: merged.destinationMunicipality?.trim().slice(0, 80) || null,
    referenceDate: /^\d{4}-\d{2}-\d{2}$/.test(merged.referenceDate) ? merged.referenceDate : referenceDate,
  } satisfies FiscalIntelligenceFacts;
}

function knownFact(field: keyof FiscalIntelligenceFacts, value: FiscalIntelligenceFacts[keyof FiscalIntelligenceFacts]) {
  if (["productDescription", "ncm", "cest", "serviceItem", "cnae", "originMunicipality", "destinationMunicipality"].includes(field)) return typeof value === "string" && value.length > 0;
  return value !== null && value !== "unknown";
}

function factLabel(field: keyof FiscalIntelligenceFacts) {
  const labels: Record<keyof FiscalIntelligenceFacts, string> = {
    tax: "Tributo", originState: "Origem", destinationState: "Destino", segment: "Segmento", productDescription: "Mercadoria",
    ncm: "NCM", cest: "CEST", productOrigin: "Origem da mercadoria", importRuleQualification: "Regra de importados", issuerTaxRegime: "Regime do remetente",
    recipientTaxpayer: "Destinatário", purpose: "Finalidade", automotiveUse: "Uso automotivo", specialTreatment: "Tratamento especial",
    operationType: "Tipo de operação", businessActivity: "Atividade", incomeTaxRegime: "Regime de renda", pisCofinsRegime: "Regime PIS/Cofins",
    serviceItem: "Item da LC 116", cnae: "CNAE", originMunicipality: "Município do prestador", destinationMunicipality: "Município do tomador",
    payerType: "Tipo de pagador", paymentRecipientType: "Tipo de beneficiário", serviceNature: "Natureza do serviço", referenceDate: "Data de referência",
  };
  return labels[field];
}

function factValue(field: keyof FiscalIntelligenceFacts, value: FiscalIntelligenceFacts[keyof FiscalIntelligenceFacts]) {
  const values: Record<string, string> = {
    auto_parts: "Autopeças", domestic: "Nacional", imported: "Importada", unknown: "Não informado", qualifies: "Enquadra-se na Res. 13/2012",
    does_not_qualify: "Não se enquadra na Res. 13/2012", normal: "Regime normal", simples: "Simples Nacional", yes: "Sim", no: "Não", resale: "Revenda",
    industrialization: "Industrialização", use_consumption: "Uso/consumo", fixed_asset: "Ativo imobilizado", none: "Nenhum informado", exists: "Existe",
    general_goods: "Mercadorias em geral", services: "Serviços", industry: "Indústria", general_business: "Atividade empresarial",
    goods: "Mercadoria", service: "Serviço", import: "Importação", export: "Exportação", mixed: "Mista", commerce: "Comércio",
    real: "Lucro real", presumed: "Lucro presumido", cumulative: "Cumulativo", non_cumulative: "Não cumulativo", monophase: "Monofásico", zero_rate: "Alíquota zero",
    private_legal_entity: "Pessoa jurídica privada", public_entity: "Órgão/entidade pública", individual: "Pessoa física", legal_entity: "Pessoa jurídica",
    professional: "Serviço profissional", cleaning_maintenance: "Limpeza/manutenção", labor_assignment: "Cessão de mão de obra", construction: "Construção/empreitada", general: "Serviço geral",
  };
  if (value === null) return "Não identificado";
  if (field === "recipientTaxpayer" && value === "yes") return "Contribuinte do ICMS";
  if (field === "recipientTaxpayer" && value === "no") return "Não contribuinte";
  return values[String(value)] ?? String(value);
}

function sourceForFact(questionFacts: FiscalIntelligenceFacts, overrides: FiscalIntelligenceOverrides, field: keyof FiscalIntelligenceFacts): FiscalFactSource {
  if (Object.prototype.hasOwnProperty.call(overrides, field)) return "manual";
  if (field === "referenceDate") return "default";
  return knownFact(field, questionFacts[field]) ? "question" : "unknown";
}

function spMgScenarioBranches(): FiscalScenarioBranch[] {
  return [
    {
      code: "SCENARIO-DOMESTIC-12",
      label: "Mercadoria nacional",
      value: "12%",
      condition: "Operação SP→MG no regime normal, sem regra específica que afaste a regra geral.",
      consequence: "É a referência interestadual geral; não inclui eventual ICMS-ST ou DIFAL.",
      status: "baseline",
      sourceCodes: ["RSF-22-1989", "MG-RICMS-ANNEX-I"],
    },
    {
      code: "SCENARIO-IMPORTED-4",
      label: "Importada enquadrada na Resolução 13/2012",
      value: "4%",
      condition: "Bem importado sem industrialização ou com conteúdo de importação superior a 40%, ressalvadas as exceções legais.",
      consequence: "A documentação de importação e o conteúdo importado precisam sustentar o enquadramento.",
      status: "exception",
      sourceCodes: ["RSF-13-2012", "MG-RICMS-ANNEX-I"],
    },
    {
      code: "SCENARIO-IMPORTED-EXCEPTION-12",
      label: "Importada fora da regra de 4%",
      value: "12%",
      condition: "A mercadoria importada não atende à Resolução 13/2012 ou está em uma de suas exceções.",
      consequence: "Retorna-se à referência interestadual geral, após conferir a documentação.",
      status: "exception",
      sourceCodes: ["RSF-22-1989", "RSF-13-2012", "MG-RICMS-ANNEX-I"],
    },
    {
      code: "SCENARIO-ST-RESALE",
      label: "Revenda com autopeça sujeita a ST",
      value: "12% ou 4% + ICMS-ST",
      condition: "Descrição, NCM, CEST e uso automotivo coincidem; destinatário é contribuinte; não há exceção aplicável.",
      consequence: "A alíquota interestadual é apenas uma camada. O imposto retido exige base, MVA e alíquota interna de MG.",
      status: "additional",
      sourceCodes: ["CONFAZ-PROTOCOL-41-2008", "CONFAZ-CONVENIO-142-2018", "MG-RICMS-ANNEX-VII"],
    },
    {
      code: "SCENARIO-DIFAL-NON-TAXPAYER",
      label: "Consumidor final não contribuinte",
      value: "12% ou 4% + DIFAL",
      condition: "A mercadoria é destinada a consumidor final mineiro não contribuinte do ICMS.",
      consequence: "O remetente analisa a diferença entre a alíquota interna de MG e a interestadual.",
      status: "additional",
      sourceCodes: ["LC-190-2022", "MG-RICMS-ANNEX-I"],
    },
    {
      code: "SCENARIO-DIFAL-USE-ASSET",
      label: "Uso, consumo ou ativo imobilizado",
      value: "Diferencial de alíquotas",
      condition: "O destinatário contribuinte não comprará para revenda, mas para uso, consumo ou imobilização.",
      consequence: "O Protocolo 41/08 trata essa entrada pelo diferencial, não pela MVA das operações subsequentes.",
      status: "additional",
      sourceCodes: ["CONFAZ-PROTOCOL-41-2008", "MG-RICMS-ANNEX-I"],
    },
    {
      code: "SCENARIO-SEVEN-NOT-SP-MG",
      label: "Alíquota de 7%",
      value: "Não se aplica à rota SP→MG",
      condition: "Os 7% valem para saídas do Sul/Sudeste com destino ao Norte, Nordeste, Centro-Oeste ou Espírito Santo.",
      consequence: "Minas Gerais está no Sudeste e não integra a exceção destinada ao Espírito Santo.",
      status: "not_applicable",
      sourceCodes: ["RSF-22-1989", "MG-RICMS-ANNEX-I"],
    },
    {
      code: "SCENARIO-GLASS-SP-2026",
      label: "Vidro automotivo · CEST 01.015.00",
      value: "Sem ST pelo Protocolo 41/08",
      condition: "Desde 1º/01/2026, São Paulo é origem ou destino da remessa desse CEST.",
      consequence: "A exceção não elimina o ICMS próprio; ela afasta especificamente a ST do Protocolo 41/08.",
      status: "not_applicable",
      sourceCodes: ["CONFAZ-PROTOCOL-41-2008", "MG-RICMS-ANNEX-VII"],
    },
  ];
}

export function evaluateFiscalQuestion(question: string, overrides: FiscalIntelligenceOverrides = {}, referenceDate = CHECKED_AT, definition = spMgAutoPartsKnowledge): FiscalIntelligenceResult {
  if (typeof question !== "string" || question.trim().length < 5 || question.length > 500) throw new Error("invalid_fiscal_question");
  assertFiscalIntelligenceDefinition(definition);
  const questionFacts = extractFiscalFacts(question, {}, referenceDate, definition);
  const facts = extractFiscalFacts(question, overrides, referenceDate, definition);
  const factViews = legacyFactViewFields.map((field) => ({
    key: field,
    label: factLabel(field),
    value: factValue(field, facts[field]),
    source: sourceForFact(questionFacts, overrides, field),
  }));
  const scopeFields = ["tax", "originState", "destinationState", "segment"] as Array<keyof FiscalIntelligenceFacts>;
  const scopeMissing = scopeFields.some((field) => !knownFact(field, facts[field]));
  const outOfScope = !scopeMissing && (facts.tax !== definition.coverage.tax || facts.originState !== definition.coverage.originState || facts.destinationState !== definition.coverage.destinationState || facts.segment !== definition.coverage.segment);
  const baseClarifications = (["tax", "originState", "destinationState", "segment"] as Array<keyof FiscalIntelligenceFacts>)
    .filter((field) => !knownFact(field, facts[field]))
    .map((field) => clarificationCatalog[field]!)
    .filter(Boolean);
  const operationalClarifications = requiredOperationalFields
    .filter((field) => !knownFact(field, facts[field]))
    .map((field) => clarificationCatalog[field]!)
    .filter(Boolean);
  if (facts.productOrigin === "imported" && facts.importRuleQualification === "unknown") operationalClarifications.splice(4, 0, clarificationCatalog.importRuleQualification!);
  const blockingClarifications: FiscalClarification[] = [...baseClarifications, ...operationalClarifications];
  const findings: FiscalFinding[] = [];
  const decisionTrace: FiscalDecisionTrace[] = [];

  if (outOfScope || scopeMissing) {
    return buildResult({
      definition, facts, factViews, status: outOfScope ? "out_of_scope" : "needs_information",
      headline: outOfScope ? "Consulta fora da cobertura atual" : "Preciso delimitar a operação antes de pesquisar",
      summary: outOfScope
        ? "A inteligência manual ainda cobre somente ICMS de autopeças em operações de São Paulo para Minas Gerais. Nenhum número foi aplicado fora desse recorte."
        : "A pergunta ainda não identifica todos os elementos mínimos do recorte fiscal. Complete a rota, o tributo e o segmento.",
      findings,
      scenarioBranches: scopeMissing ? spMgScenarioBranches() : [],
      clarifications: blockingClarifications.length ? blockingClarifications : [clarificationCatalog.originState!, clarificationCatalog.destinationState!],
      decisionTrace,
    });
  }

  const scenarioBranches = spMgScenarioBranches();
  const ownRateBlocked = facts.issuerTaxRegime === "simples" || facts.specialTreatment === "exists";
  const unresolvedSpecialCase = facts.recipientTaxpayer === "no" || facts.specialTreatment === "exists";
  if (facts.issuerTaxRegime === "simples") decisionTrace.push({
    ruleCode: "ICMS-ST-SIMPLES-APPLIES",
    result: "applied",
    detail: "O Simples Nacional não afasta a ST. A alíquota interestadual continua relevante para a dedução no cálculo, mas não foi apresentada como destaque de ICMS próprio.",
  });
  if (facts.recipientTaxpayer === "no") decisionTrace.push({
    ruleCode: "ICMS-DIFAL-NON-TAXPAYER",
    result: "applied",
    detail: "A operação exige a trilha de consumidor final não contribuinte e o cálculo do DIFAL com a alíquota interna pertinente em MG.",
  });
  if (facts.specialTreatment === "exists") decisionTrace.push({ ruleCode: "SPECIAL-TREATMENT", result: "blocked", detail: "Benefício ou regime especial precisa prevalecer sobre a regra geral." });
  if (facts.automotiveUse === "no") decisionTrace.push({ ruleCode: "ICMS-ST-AUTOMOTIVE-USE", result: "not_applicable", detail: "A mercadoria informada não tem uso especificamente automotivo." });

  if (!ownRateBlocked && facts.productOrigin === "domestic") {
    findings.push({
      code: "OWN-RATE-12", label: "ICMS próprio interestadual", value: "12%",
      detail: "Referência para mercadoria nacional, remetente no regime normal e operação SP→MG, ressalvadas regras específicas.",
      sourceCodes: ["RSF-22-1989", "MG-RICMS-ANNEX-I"], nature: "own_rate",
    });
    decisionTrace.push({ ruleCode: "ICMS-INTERSTATE-SP-MG-DOMESTIC-12", result: "applied", detail: "Rota Sudeste→Sudeste e mercadoria nacional informada." });
  } else if (!ownRateBlocked && facts.productOrigin === "imported" && facts.importRuleQualification === "qualifies") {
    findings.push({
      code: "OWN-RATE-4", label: "ICMS próprio interestadual", value: "4%",
      detail: "Referência condicionada ao enquadramento informado na Resolução do Senado nº 13/2012 e à inexistência de exceção.",
      sourceCodes: ["RSF-13-2012", "MG-RICMS-ANNEX-I"], nature: "own_rate",
    });
    decisionTrace.push({ ruleCode: "ICMS-INTERSTATE-IMPORTED-4", result: "applied", detail: "O usuário informou condição compatível com a regra de importados." });
  } else if (!ownRateBlocked && facts.productOrigin === "imported" && facts.importRuleQualification === "does_not_qualify") {
    findings.push({
      code: "OWN-RATE-12-IMPORT-EXCEPTION", label: "Referência interestadual fora da regra de 4%", value: "12%",
      detail: "O usuário informou que a mercadoria importada não se enquadra na regra de 4%; ainda é necessário conferir as exceções e a documentação da importação.",
      sourceCodes: ["RSF-22-1989", "RSF-13-2012", "MG-RICMS-ANNEX-I"], nature: "own_rate",
    });
    decisionTrace.push({ ruleCode: "ICMS-INTERSTATE-IMPORTED-4", result: "not_applicable", detail: "Condição informada não alcança a regra de 4%." });
  } else {
    const detail = facts.issuerTaxRegime === "simples"
      ? "No Simples Nacional, 12% ou 4% pode ser parâmetro do cálculo de ST, mas não foi tratado como destaque operacional do ICMS próprio."
      : facts.specialTreatment === "exists"
        ? "O tratamento especial informado precisa ser conferido antes da regra geral."
        : "A origem da mercadoria ainda não foi informada.";
    decisionTrace.push({ ruleCode: "ICMS-OWN-RATE", result: "blocked", detail });
  }

  const classification = definition.productClassifications.find((item) => facts.ncm?.startsWith(item.ncmPrefix) && facts.cest === item.cest);
  const classificationDescriptionMatches = classification && facts.productDescription
    ? classification.descriptionTerms.some((term) => normalizeText(facts.productDescription!).includes(normalizeText(term)))
    : false;
  const stFactsMatch = classification && classificationDescriptionMatches && facts.automotiveUse === "yes";
  const stOperationallyEligible = facts.recipientTaxpayer === "yes" && facts.specialTreatment !== "exists";

  if (classification && stFactsMatch && !classification.interstateScope) {
    decisionTrace.push({
      ruleCode: "ICMS-ST-GLASS-SP-EXCEPTION-2026",
      result: "not_applicable",
      detail: "O CEST 01.015.00 está marcado com exceção para São Paulo; na data de referência, a ST do Protocolo 41/08 não foi aplicada.",
    });
  } else if (classification && stFactsMatch && facts.purpose === "industrialization") {
    decisionTrace.push({
      ruleCode: "ICMS-ST-DESTINATION-EXCEPTIONS",
      result: "not_applicable",
      detail: "A finalidade industrial aciona hipótese de inaplicabilidade do Protocolo 41/08; a operação concreta e a legislação mineira ainda devem ser conferidas.",
    });
  } else if (classification && stFactsMatch && (facts.purpose === "use_consumption" || facts.purpose === "fixed_asset") && stOperationallyEligible) {
    findings.push({
      code: "DIFAL-USE-ASSET",
      label: facts.purpose === "fixed_asset" ? "Entrada para ativo imobilizado" : "Entrada para uso ou consumo",
      value: "Analisar diferencial de alíquotas",
      detail: "O Protocolo 41/08 alcança a entrada pelo imposto correspondente ao diferencial de alíquotas. A MVA de operações subsequentes não foi aplicada.",
      sourceCodes: ["CONFAZ-PROTOCOL-41-2008", "MG-RICMS-ANNEX-I"],
      nature: "additional_obligation",
    });
    decisionTrace.push({
      ruleCode: "ICMS-ST-DESTINATION-EXCEPTIONS",
      result: "applied",
      detail: "A finalidade informada leva à trilha de diferencial de alíquotas, sem aplicar MVA de revenda.",
    });
  } else if (classification && stFactsMatch && facts.purpose === "resale" && stOperationallyEligible) {
    findings.push({
      code: `ST-${classification.code}`, label: "Âmbito interestadual de ST", value: "Enquadramento localizado",
      detail: `${classification.description}. A coincidência de NCM, CEST, descrição e uso ainda deve ser revisada pelo responsável.`,
      sourceCodes: Array.from(new Set([...classification.sourceCodes, "CONFAZ-PROTOCOL-41-2008", "CONFAZ-CONVENIO-142-2018"])), nature: "st_scope",
    });
    findings.push({
      code: `MVA-${classification.code}`, label: "MVA constante da tabela mineira", value: `${(classification.tableMvaBps / 100).toFixed(2).replace(".", ",")}%`,
      detail: "Parâmetro de tabela, não valor do ICMS-ST a recolher. O cálculo ainda depende dos valores da operação, da alíquota interna, de eventual MVA ajustada e das deduções cabíveis.",
      sourceCodes: classification.sourceCodes, nature: "table_parameter",
    });
    decisionTrace.push({ ruleCode: "ICMS-ST-AUTO-PARTS-SP-MG", result: "applied", detail: `Correspondência controlada ${classification.code} por NCM e CEST.` });
  } else if (!facts.ncm || !facts.cest) {
    decisionTrace.push({ ruleCode: "ICMS-ST-AUTO-PARTS-SP-MG", result: "blocked", detail: "NCM e CEST são obrigatórios para procurar o item de ST." });
  } else if (!classification) {
    decisionTrace.push({ ruleCode: "ICMS-ST-AUTO-PARTS-SP-MG", result: "blocked", detail: "A combinação NCM/CEST ainda não existe no catálogo manual desta versão." });
  } else if (!classificationDescriptionMatches) {
    decisionTrace.push({ ruleCode: "ICMS-ST-AUTO-PARTS-SP-MG", result: "blocked", detail: "A descrição informada não reproduz os termos controlados do item legal; a classificação precisa de revisão humana." });
  } else if (facts.automotiveUse !== "yes") {
    decisionTrace.push({ ruleCode: "ICMS-ST-AUTO-PARTS-SP-MG", result: "blocked", detail: "O uso especificamente automotivo ainda não foi confirmado." });
  } else if (facts.recipientTaxpayer === "no") {
    decisionTrace.push({ ruleCode: "ICMS-ST-AUTO-PARTS-SP-MG", result: "not_applicable", detail: "A operação informada é para não contribuinte e segue a trilha de consumidor final/DIFAL, não a retenção por operações subsequentes." });
  } else if (facts.purpose === "unknown") {
    decisionTrace.push({ ruleCode: "ICMS-ST-AUTO-PARTS-SP-MG", result: "blocked", detail: "A finalidade da aquisição precisa ser informada para separar revenda, industrialização, uso/consumo e ativo." });
  } else if (facts.specialTreatment === "exists") {
    decisionTrace.push({ ruleCode: "ICMS-ST-AUTO-PARTS-SP-MG", result: "blocked", detail: "O tratamento especial informado deve ser validado antes do enquadramento de ST." });
  } else {
    decisionTrace.push({ ruleCode: "ICMS-ST-AUTO-PARTS-SP-MG", result: "blocked", detail: "A operação ainda não reúne todas as condições para conclusão da ST." });
  }

  const status: FiscalIntelligenceStatus = unresolvedSpecialCase || blockingClarifications.length > 0 ? "needs_information" : "conditional";
  const headline = findings.find((finding) => finding.nature === "own_rate")
    ? `${findings.find((finding) => finding.nature === "own_rate")!.label}: ${findings.find((finding) => finding.nature === "own_rate")!.value}`
    : "Referência geral: 12% — ainda não conclusiva";
  const summary = status === "conditional"
    ? "A alíquota interestadual e as camadas de ST ou DIFAL foram separadas conforme os fatos informados. A conclusão permanece condicional e exige revisão profissional da classificação, das exceções e do cálculo."
    : "Para SP→MG, 12% é a referência geral para mercadoria nacional e 4% pode valer para importados enquadrados. ST e DIFAL são camadas separadas; complete os fatos para definir qual cenário alcança a operação.";
  return buildResult({ definition, facts, factViews, status, headline, summary, findings, scenarioBranches, clarifications: blockingClarifications, decisionTrace });
}

function buildResult(input: {
  definition: FiscalIntelligenceDefinition;
  facts: FiscalIntelligenceFacts;
  factViews: FiscalFactView[];
  status: FiscalIntelligenceStatus;
  headline: string;
  summary: string;
  findings: FiscalFinding[];
  scenarioBranches: FiscalScenarioBranch[];
  clarifications: FiscalClarification[];
  decisionTrace: FiscalDecisionTrace[];
}): FiscalIntelligenceResult {
  const fields = ["tax", "originState", "destinationState", "segment", ...requiredOperationalFields] as Array<keyof FiscalIntelligenceFacts>;
  if (input.facts.productOrigin === "imported") fields.push("importRuleQualification");
  const known = fields.filter((field) => knownFact(field, input.facts[field])).length;
  const sourceCodes = new Set(input.findings.flatMap((finding) => finding.sourceCodes));
  input.scenarioBranches.flatMap((scenario) => scenario.sourceCodes).forEach((code) => sourceCodes.add(code));
  input.decisionTrace.forEach((trace) => input.definition.rules.find((rule) => rule.code === trace.ruleCode)?.sourceCodes.forEach((code) => sourceCodes.add(code)));
  const sources = input.definition.sources.filter((source) => sourceCodes.has(source.code));
  const statusLabels: Record<FiscalIntelligenceStatus, string> = { out_of_scope: "Fora da cobertura", needs_information: "Dados pendentes", conditional: "Conclusão condicional" };
  return {
    schemaVersion: "fiscal-intelligence-result.v1",
    engineVersion: input.definition.engineVersion,
    baseCode: input.definition.baseCode,
    baseVersion: input.definition.version,
    assuranceLevel: input.definition.assuranceLevel,
    status: input.status,
    statusLabel: statusLabels[input.status],
    headline: input.headline,
    summary: input.summary,
    facts: input.facts,
    factViews: input.factViews,
    completeness: { known, required: fields.length, percentage: Math.round(known / fields.length * 100) },
    findings: input.findings,
    scenarioBranches: input.scenarioBranches,
    clarifications: Array.from(new Map(input.clarifications.map((item) => [item.field, item])).values()),
    decisionTrace: input.decisionTrace,
    sources,
    limitations: input.definition.limitations,
    disclaimer: "Pesquisa fiscal assistida e condicionada aos fatos informados. Não substitui a classificação fiscal da mercadoria, a leitura integral da legislação vigente nem a revisão do contador responsável.",
    topicCode: "ICMS-SP-MG-AUTO-PARTS",
    coverageLevel: "operational_reference",
    calculationEligible: input.status === "conditional",
  };
}

export function parseFiscalIntelligenceDefinition(value: string) {
  const parsed = JSON.parse(value) as FiscalIntelligenceDefinition;
  assertFiscalIntelligenceDefinition(parsed);
  return parsed;
}

function assertFiscalIntelligenceDefinition(definition: FiscalIntelligenceDefinition) {
  const validSources = Array.isArray(definition?.sources) && definition.sources.length >= 4 && definition.sources.every((source) => source.code && source.title && source.publisher && /^https:\/\//.test(source.url) && /^\d{4}-\d{2}-\d{2}$/.test(source.checkedAt));
  const sourceCodes = new Set(definition?.sources?.map((source) => source.code));
  const validRules = Array.isArray(definition?.rules) && definition.rules.length > 0 && definition.rules.every((rule) => rule.code && rule.sourceCodes.length > 0 && rule.sourceCodes.every((code) => sourceCodes.has(code)));
  const validClassifications = Array.isArray(definition?.productClassifications) && definition.productClassifications.every((item) => /^\d{4,8}$/.test(item.ncmPrefix) && /^\d{2}\.\d{3}\.\d{2}$/.test(item.cest) && Array.isArray(item.descriptionTerms) && item.descriptionTerms.length > 0 && Number.isInteger(item.tableMvaBps) && item.tableMvaBps >= 0 && item.tableMvaBps <= 100_000 && item.sourceCodes.every((code) => sourceCodes.has(code)));
  const validTopics = Array.isArray(definition?.nationalTopics) && definition.nationalTopics.length >= 8 && definition.nationalTopics.every((topic) => topic.code && topic.tax && topic.requiredFacts.length > 0 && topic.supportedOutputs.length > 0 && topic.hardStops.length > 0 && topic.examples.length > 0 && topic.sourceCodes.every((code) => sourceCodes.has(code)));
  if (
    definition?.schemaVersion !== "manual-fiscal-intelligence.v1"
    || definition.assuranceLevel !== "pilot_conditional"
    || definition.coverage?.tax !== "ICMS"
    || definition.coverage?.originState !== "SP"
    || definition.coverage?.destinationState !== "MG"
    || definition.coverage?.segment !== "auto_parts"
    || !/^\d+\.\d+\.\d+$/.test(definition.version)
    || !validSources
    || !validRules
    || !validClassifications
    || !validTopics
    || !Array.isArray(definition.limitations)
    || definition.limitations.length < 3
  ) throw new Error("invalid_fiscal_intelligence_definition");
}

export async function hashFiscalIntelligenceContent(contentJson: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(contentJson));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

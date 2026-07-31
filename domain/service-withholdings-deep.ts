export const SERVICE_WITHHOLDINGS_DEEP_VERSION = "2026.07.31-v95";
export const SERVICE_WITHHOLDINGS_DEEP_CHECKED_AT = "2026-07-31";
export const SERVICE_WITHHOLDINGS_DEEP_SUPPORTED_PERIOD = {
  from: "2026-01-01",
  to: "2026-12-31",
} as const;

export type WithholdingPayerType = "private_legal_entity" | "federal_public_body" | "state_or_municipal_public_body" | "individual";
export type WithholdingRegime = "normal" | "simples" | "mei" | "immune_or_exempt" | "not_applicable";
export type InssExecutionMode = "none" | "labor_assignment" | "partial_contract" | "total_contract";
export type InssRateStatus = "not_applicable" | "standard_11" | "cprb_3_5";
export type IssWithholdingStatus = "applies" | "does_not_apply" | "unknown";
export type WithholdingTrackStatus = "calculated_reference" | "not_applicable" | "blocked";

export type ServiceWithholdingSource = {
  code: string;
  title: string;
  publisher: string;
  url: string;
  legalReference: string;
  effectiveFrom: string;
  checkedAt: string;
};

export type ServiceWithholdingProfile = {
  rank: number;
  code: string;
  label: string;
  lc116Items: string[];
  irrfCandidateRateBps: 100 | 150 | null;
  csrfCandidate: boolean;
  inssCandidate: "none" | "labor_assignment_or_contract" | "labor_assignment_only";
  sourceCodes: string[];
  requiredClassification: string[];
  version: string;
};

export type ServiceWithholdingInput = {
  serviceCode: string;
  payerType: WithholdingPayerType;
  payerRegime: WithholdingRegime;
  beneficiaryType: "legal_entity" | "individual";
  beneficiaryRegime: WithholdingRegime;
  calculationDate: string;
  grossPaymentCents: number | null;
  irrfBaseCents: number | null;
  csrfBaseCents: number | null;
  inssBaseCents: number | null;
  issBaseCents: number | null;
  serviceNatureConfirmed: boolean;
  contractAndDocumentConfirmed: boolean;
  paymentOrCreditConfirmed: boolean;
  payerResponsibilityConfirmed: boolean;
  beneficiaryRegimeDocumented: boolean;
  irrfHypothesisConfirmed: boolean;
  csrfHypothesisConfirmed: boolean;
  inssExecutionMode: InssExecutionMode;
  inssExecutionConfirmed: boolean;
  inssRateStatus: InssRateStatus;
  inssRateStatusConfirmed: boolean;
  inssDeductionsCents: number;
  inssDeductionsDocumented: boolean;
  simplesAnnexIVConfirmed: boolean;
  municipalityCode: string | null;
  municipalServiceItem: string | null;
  issWithholdingStatus: IssWithholdingStatus;
  issRateBps: number | null;
  municipalLawConfirmed: boolean;
  publicBodyTableConfirmed: boolean;
  simultaneousDeductionsConfirmed: boolean;
};

export type WithholdingTrack = {
  tax: "IRRF" | "CSRF" | "INSS" | "ISS";
  status: WithholdingTrackStatus;
  rateBps: number | null;
  baseCents: number | null;
  amountCents: number | null;
  taxableEvent: string;
  responsible: string;
  dueRule: string;
  blockers: string[];
  warnings: string[];
  sourceCodes: string[];
  ruleVersion: string;
  effectiveFrom: string;
};

export type ServiceWithholdingRuleControl = {
  code: string;
  tax: WithholdingTrack["tax"];
  version: string;
  effectiveFrom: string;
  taxableEvent: string;
  responsible: string;
  dueRule: string;
  dispensationRule: string;
  sourceCodes: string[];
};

export type ServiceWithholdingReferenceCase = {
  code: string;
  kind: "combined_memory" | "waiver_boundary" | "safe_block";
  profileCode: string;
  input: ServiceWithholdingInput;
  expectedStatus: ServiceWithholdingResult["status"];
  expectedTrackAmounts: Record<WithholdingTrack["tax"], number | null>;
  expectedNetPaymentCents: number | null;
};

export type ServiceWithholdingResult = {
  status: "calculated_reference" | "partially_calculated" | "blocked";
  profile: ServiceWithholdingProfile | null;
  tracks: WithholdingTrack[];
  totalWithheldCents: number | null;
  netPaymentCents: number | null;
  blockers: string[];
  warnings: string[];
  sourceCodes: string[];
  version: string;
  checkedAt: string;
};

export const serviceWithholdingSources: ServiceWithholdingSource[] = [
  {
    code: "RET-RIR-2018",
    title: "Decreto nº 9.580/2018 — Regulamento do Imposto sobre a Renda",
    publisher: "Presidência da República",
    url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/decreto/d9580.htm",
    legalReference: "arts. 714 a 717, 723, 775 e 785",
    effectiveFrom: "2018-11-23",
    checkedAt: SERVICE_WITHHOLDINGS_DEEP_CHECKED_AT,
  },
  {
    code: "RET-RFB-MAFON",
    title: "MAFON — Manual do Imposto sobre a Renda Retido na Fonte",
    publisher: "Receita Federal",
    url: "https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/manuais/irrf/mafon-2023.pdf",
    legalReference: "códigos 1708 e 5944; serviços profissionais, limpeza, conservação, segurança e locação de mão de obra",
    effectiveFrom: "2023-01-01",
    checkedAt: SERVICE_WITHHOLDINGS_DEEP_CHECKED_AT,
  },
  {
    code: "RET-L-10833",
    title: "Lei nº 10.833/2003 — retenção de CSLL, Cofins e PIS/Pasep",
    publisher: "Presidência da República",
    url: "https://www.planalto.gov.br/ccivil_03/leis/2003/l10.833compilado.htm",
    legalReference: "arts. 30 a 36",
    effectiveFrom: "2004-02-01",
    checkedAt: SERVICE_WITHHOLDINGS_DEEP_CHECKED_AT,
  },
  {
    code: "RET-L-13137",
    title: "Lei nº 13.137/2015 — limite e prazo da CSRF",
    publisher: "Presidência da República",
    url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13137.htm",
    legalReference: "art. 24; retenção dispensada quando o valor é igual ou inferior a R$ 10,00 e recolhimento mensal",
    effectiveFrom: "2015-06-22",
    checkedAt: SERVICE_WITHHOLDINGS_DEEP_CHECKED_AT,
  },
  {
    code: "RET-L-11196",
    title: "Lei nº 11.196/2005 — prazos de retenções federais",
    publisher: "Presidência da República",
    url: "https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2005/lei/l11196.htm",
    legalReference: "arts. 70 e 74; recolhimento de IRRF e contribuições retidas",
    effectiveFrom: "2006-01-01",
    checkedAt: SERVICE_WITHHOLDINGS_DEEP_CHECKED_AT,
  },
  {
    code: "RET-IN-SRF-459",
    title: "Instrução Normativa SRF nº 459/2004 — CSRF em serviços",
    publisher: "Receita Federal",
    url: "https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=15365",
    legalReference: "serviços abrangidos, evento de pagamento, dispensas e tratamento do Simples, com alterações posteriores",
    effectiveFrom: "2004-10-29",
    checkedAt: SERVICE_WITHHOLDINGS_DEEP_CHECKED_AT,
  },
  {
    code: "RET-L-8212",
    title: "Lei nº 8.212/1991 — retenção previdenciária",
    publisher: "Presidência da República",
    url: "https://www.planalto.gov.br/ccivil_03/leis/l8212cons.htm",
    legalReference: "art. 31; cessão de mão de obra e recolhimento até o dia 20",
    effectiveFrom: "1991-07-25",
    checkedAt: SERVICE_WITHHOLDINGS_DEEP_CHECKED_AT,
  },
  {
    code: "RET-IN-RFB-2110",
    title: "Instrução Normativa RFB nº 2.110/2022 — contribuições previdenciárias",
    publisher: "Receita Federal",
    url: "https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=126687",
    legalReference: "arts. 110 a 135, com alterações até a IN RFB nº 2.289/2025",
    effectiveFrom: "2022-10-19",
    checkedAt: SERVICE_WITHHOLDINGS_DEEP_CHECKED_AT,
  },
  {
    code: "RET-RFB-REINF",
    title: "EFD-Reinf — prazo oficial do evento R-2010",
    publisher: "Receita Federal",
    url: "https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/perguntas-frequentes/sped/efd-reinf/efdr/2-eventos-da-efd-reinf/2-3-4-qual-prazo-para",
    legalReference: "R-2010 até o dia 15 do mês posterior à emissão da nota ou antes do R-2099; antecipação sem expediente bancário",
    effectiveFrom: "2026-04-13",
    checkedAt: SERVICE_WITHHOLDINGS_DEEP_CHECKED_AT,
  },
  {
    code: "RET-L-12546",
    title: "Lei nº 12.546/2011 — retenção previdenciária na CPRB",
    publisher: "Presidência da República",
    url: "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2011/lei/l12546compilado.htm",
    legalReference: "arts. 7º, § 6º, e 8º, § 5º; retenção de 3,5% somente para atividade e cessão abrangidas",
    effectiveFrom: "2014-06-20",
    checkedAt: SERVICE_WITHHOLDINGS_DEEP_CHECKED_AT,
  },
  {
    code: "RET-IN-RFB-1234",
    title: "Instrução Normativa RFB nº 1.234/2012 — pagamentos por órgãos públicos",
    publisher: "Receita Federal",
    url: "https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=37200",
    legalReference: "tabela própria por natureza do bem ou serviço e ente pagador, com alterações até 2025",
    effectiveFrom: "2012-01-12",
    checkedAt: SERVICE_WITHHOLDINGS_DEEP_CHECKED_AT,
  },
  {
    code: "RET-LC-116",
    title: "Lei Complementar nº 116/2003 — ISS",
    publisher: "Presidência da República",
    url: "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp116.htm",
    legalReference: "arts. 3º, 6º, 7º, 8º e 8º-A e lista anexa, com alterações até a LC nº 218/2025",
    effectiveFrom: "2003-08-01",
    checkedAt: SERVICE_WITHHOLDINGS_DEEP_CHECKED_AT,
  },
  {
    code: "RET-LC-123",
    title: "Lei Complementar nº 123/2006 — retenções do Simples Nacional",
    publisher: "Presidência da República",
    url: "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm",
    legalReference: "art. 21, § 4º, e Anexo IV",
    effectiveFrom: "2007-07-01",
    checkedAt: SERVICE_WITHHOLDINGS_DEEP_CHECKED_AT,
  },
];

export const serviceWithholdingRuleControls: ServiceWithholdingRuleControl[] = [
  {
    code: "RET-CONTROL-IRRF",
    tax: "IRRF",
    version: "IRRF-PJ-2018.11+PRAZO-2006.01",
    effectiveFrom: "2018-11-23",
    taxableEvent: "pagamento ou crédito, o que ocorrer primeiro",
    responsible: "fonte pagadora identificada",
    dueRule: "último dia útil do segundo decêndio do mês subsequente, salvo código com período próprio",
    dispensationRule: "valor calculado igual ou inferior a R$ 10,00 por pagamento ou crédito, quando a hipótese legal permitir",
    sourceCodes: ["RET-RIR-2018", "RET-RFB-MAFON", "RET-L-11196"],
  },
  {
    code: "RET-CONTROL-CSRF",
    tax: "CSRF",
    version: "CSRF-PJ-2015.06",
    effectiveFrom: "2015-06-22",
    taxableEvent: "pagamento à pessoa jurídica beneficiária",
    responsible: "pessoa jurídica pagadora",
    dueRule: "último dia útil do segundo decêndio do mês subsequente ao pagamento",
    dispensationRule: "retenção conjunta igual ou inferior a R$ 10,00; imunidades, isenções e retenções parciais permanecem segregadas",
    sourceCodes: ["RET-L-10833", "RET-L-13137", "RET-IN-SRF-459"],
  },
  {
    code: "RET-CONTROL-INSS",
    tax: "INSS",
    version: "INSS-CESSAO-2022.10+ALTERACOES-2025.10",
    effectiveFrom: "2022-10-19",
    taxableEvent: "emissão da nota fiscal, fatura ou recibo da cessão ou empreitada",
    responsible: "empresa contratante, após classificar execução, atividade e exceções",
    dueRule: "recolhimento até o dia 20 do mês subsequente; R-2010 até o dia 15 ou antes do R-2099, com antecipações legais",
    dispensationRule: "11% como regra estruturada; 3,5% somente com atividade CPRB, cessão e opção anual comprovadas",
    sourceCodes: ["RET-L-8212", "RET-IN-RFB-2110", "RET-L-12546", "RET-RFB-REINF"],
  },
  {
    code: "RET-CONTROL-ISS",
    tax: "ISS",
    version: "ISS-LC116+LEI-MUNICIPAL-OBRIGATORIA",
    effectiveFrom: "2003-08-01",
    taxableEvent: "prestação do serviço no local definido pela LC 116 e pela regra municipal aplicável",
    responsible: "prestador ou terceiro expressamente atribuído por lei municipal",
    dueRule: "data municipal obrigatória; nenhum vencimento nacional é inferido",
    dispensationRule: "retenção, benefício e regime especial somente após lei municipal, item, vigência e responsável confirmados",
    sourceCodes: ["RET-LC-116", "RET-LC-123"],
  },
];

function profile(
  rank: number,
  code: string,
  label: string,
  lc116Items: string[],
  irrfCandidateRateBps: ServiceWithholdingProfile["irrfCandidateRateBps"],
  csrfCandidate: boolean,
  inssCandidate: ServiceWithholdingProfile["inssCandidate"],
): ServiceWithholdingProfile {
  const sourceCodes = ["RET-LC-116"];
  if (irrfCandidateRateBps !== null) sourceCodes.push("RET-RIR-2018", "RET-RFB-MAFON", "RET-L-11196");
  if (csrfCandidate) sourceCodes.push("RET-L-10833", "RET-L-13137", "RET-IN-SRF-459");
  if (inssCandidate !== "none") sourceCodes.push("RET-L-8212", "RET-IN-RFB-2110", "RET-L-12546", "RET-RFB-REINF");
  return {
    rank,
    code,
    label,
    lc116Items,
    irrfCandidateRateBps,
    csrfCandidate,
    inssCandidate,
    sourceCodes,
    requiredClassification: ["contrato e nota fiscal", "atividade efetivamente executada", "partes e regimes", "município e item de serviço", "data do fato gerador"],
    version: SERVICE_WITHHOLDINGS_DEEP_VERSION,
  };
}

export const serviceWithholdingProfiles: ServiceWithholdingProfile[] = [
  profile(1, "ACCOUNTING", "Contabilidade, auditoria e consultoria contábil", ["17.19"], 150, true, "none"),
  profile(2, "LEGAL", "Advocacia e serviços jurídicos", ["17.14"], 150, true, "none"),
  profile(3, "MANAGEMENT_CONSULTING", "Consultoria e assessoria de gestão", ["17.20"], 150, true, "none"),
  profile(4, "ENGINEERING_ARCHITECTURE", "Engenharia, arquitetura e serviços técnicos", ["7.01"], 150, true, "none"),
  profile(5, "IT_CONSULTING", "Análise, consultoria e suporte em tecnologia", ["1.06", "1.07"], 150, true, "none"),
  profile(6, "ADVERTISING", "Propaganda, publicidade e planejamento de campanha", ["17.06"], 150, true, "none"),
  profile(7, "CREDIT_MANAGEMENT", "Assessoria creditícia, gestão e seleção de riscos", ["17.22"], 150, true, "none"),
  profile(8, "CLEANING", "Limpeza e conservação de imóveis", ["7.10"], 100, true, "labor_assignment_or_contract"),
  profile(9, "MAINTENANCE", "Manutenção e conservação recorrente", ["14.01"], null, true, "labor_assignment_only"),
  profile(10, "SECURITY", "Segurança e vigilância", ["11.02"], 100, true, "labor_assignment_or_contract"),
  profile(11, "CASH_TRANSPORT", "Transporte de valores", ["16.02"], null, true, "labor_assignment_only"),
  profile(12, "LABOR_ASSIGNMENT", "Fornecimento e locação de mão de obra", ["17.05"], 100, true, "labor_assignment_or_contract"),
  profile(13, "CIVIL_CONSTRUCTION", "Execução de obra de construção civil", ["7.02", "7.05"], null, false, "labor_assignment_or_contract"),
  profile(14, "INSTALLATION_ASSEMBLY", "Instalação e montagem executadas no tomador", ["7.02", "14.06"], null, false, "labor_assignment_only"),
  profile(15, "TECHNICAL_MAINTENANCE", "Manutenção técnica de máquinas e equipamentos", ["14.01"], null, true, "labor_assignment_only"),
  profile(16, "AUDIT", "Auditoria contábil, financeira e operacional", ["17.19"], 150, true, "none"),
  profile(17, "TAX_ADVISORY", "Consultoria e assessoria tributária", ["17.20"], 150, true, "none"),
  profile(18, "ARCHITECTURE_DESIGN", "Arquitetura, urbanismo e projetos técnicos", ["7.01"], 150, true, "none"),
  profile(19, "AGRONOMY", "Agronomia, levantamentos e assistência técnica", ["7.01"], 150, true, "none"),
  profile(20, "SOFTWARE_DEVELOPMENT", "Programação e desenvolvimento de software", ["1.04"], 150, true, "none"),
  profile(21, "SOFTWARE_SUPPORT", "Suporte técnico e manutenção de programas", ["1.07"], 150, true, "none"),
  profile(22, "DATA_PROCESSING", "Processamento, armazenamento e tratamento de dados", ["1.03"], 150, true, "none"),
  profile(23, "MARKET_RESEARCH", "Pesquisa, coleta e análise de mercado", ["17.01"], 150, true, "none"),
  profile(24, "COLLECTION", "Cobrança e administração de contas a receber", ["17.22"], 150, true, "none"),
  profile(25, "ASSET_ADMINISTRATION", "Administração de bens, negócios e interesses", ["17.12"], 150, true, "none"),
  profile(26, "MEDICAL", "Medicina e consultas em saúde", ["4.01"], 150, true, "none"),
  profile(27, "DENTAL", "Odontologia e serviços correlatos", ["4.12"], 150, true, "none"),
  profile(28, "HEALTH_LABORATORY", "Análises clínicas e serviços laboratoriais", ["4.02"], 150, true, "none"),
  profile(29, "HOSPITAL", "Serviços hospitalares, clínicas e pronto atendimento", ["4.03"], 150, true, "none"),
  profile(30, "RECRUITMENT", "Recrutamento, seleção e colocação de mão de obra", ["17.04"], 150, true, "none"),
  profile(31, "INDUSTRIAL_CLEANING", "Limpeza técnica e industrial recorrente", ["7.10"], 100, true, "labor_assignment_or_contract"),
  profile(32, "CONSERVATION", "Conservação e zeladoria de instalações", ["7.10"], 100, true, "labor_assignment_or_contract"),
  profile(33, "GARDENING", "Jardinagem e conservação de áreas verdes", ["7.11"], 100, true, "labor_assignment_only"),
  profile(34, "PEST_CONTROL", "Dedetização, desinfecção e controle de pragas", ["7.13"], 100, true, "labor_assignment_only"),
  profile(35, "SURVEILLANCE", "Vigilância patrimonial e monitoramento presencial", ["11.02"], 100, true, "labor_assignment_or_contract"),
  profile(36, "ESCORT", "Escolta e proteção de pessoas, bens e cargas", ["11.02"], 100, true, "labor_assignment_only"),
  profile(37, "TEMPORARY_LABOR", "Trabalho temporário e colocação à disposição", ["17.05"], 100, true, "labor_assignment_or_contract"),
  profile(38, "CIVIL_CONSTRUCTION_TOTAL", "Construção civil por empreitada total", ["7.02", "7.05"], null, false, "labor_assignment_or_contract"),
  profile(39, "ELECTRICAL_INSTALLATION", "Instalações elétricas executadas no tomador", ["7.02", "14.06"], null, false, "labor_assignment_only"),
  profile(40, "ELEVATOR_MAINTENANCE", "Manutenção recorrente de elevadores e equipamentos", ["14.01"], null, true, "labor_assignment_only"),
];

function safeCents(value: number | null, field: string) {
  if (value === null) return null;
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`invalid_${field}`);
  return value;
}

function safeRate(value: number | null) {
  if (value === null) return null;
  if (!Number.isSafeInteger(value) || value < 0 || value > 500) throw new Error("invalid_iss_rate");
  return value;
}

function multiplyCents(cents: number, rateBps: number) {
  return Number((BigInt(cents) * BigInt(rateBps) + 5000n) / 10000n);
}

function validIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function track(input: Omit<WithholdingTrack, "warnings" | "blockers" | "ruleVersion" | "effectiveFrom"> & { blockers?: string[]; warnings?: string[] }): WithholdingTrack {
  const control = serviceWithholdingRuleControls.find((item) => item.tax === input.tax);
  if (!control) throw new Error(`missing_${input.tax.toLowerCase()}_rule_control`);
  return {
    ...input,
    blockers: input.blockers ?? [],
    warnings: input.warnings ?? [],
    sourceCodes: [...new Set([...input.sourceCodes, ...control.sourceCodes])],
    ruleVersion: control.version,
    effectiveFrom: control.effectiveFrom,
  };
}

function commonBlockers(input: ServiceWithholdingInput) {
  const blockers: string[] = [];
  if (!input.serviceNatureConfirmed) blockers.push("natureza efetiva do serviço não confirmada");
  if (!input.contractAndDocumentConfirmed) blockers.push("contrato e documento fiscal não conciliados");
  if (!input.payerResponsibilityConfirmed) blockers.push("responsável legal pela retenção não confirmado");
  if (!input.beneficiaryRegimeDocumented) blockers.push("regime e dispensas do beneficiário sem documento");
  return blockers;
}

function irrfTrack(input: ServiceWithholdingInput, profile: ServiceWithholdingProfile): WithholdingTrack {
  const sourceCodes = ["RET-RIR-2018", "RET-RFB-MAFON"];
  const shared = commonBlockers(input);
  if (input.beneficiaryType !== "legal_entity") return track({ tax: "IRRF", status: "blocked", rateBps: null, baseCents: null, amountCents: null, taxableEvent: "pagamento ou crédito", responsible: "fonte pagadora", dueRule: "trilha de pessoa física não modelada neste recorte", sourceCodes, blockers: ["beneficiário pessoa física exige tabela e código próprios"] });
  if (input.payerType === "federal_public_body" || input.payerType === "state_or_municipal_public_body") {
    return track({ tax: "IRRF", status: "blocked", rateBps: null, baseCents: input.irrfBaseCents, amountCents: null, taxableEvent: "pagamento", responsible: "órgão ou entidade pagadora", dueRule: "conforme IN RFB nº 1.234/2012 e convênio aplicável", sourceCodes: ["RET-IN-RFB-1234"], blockers: input.publicBodyTableConfirmed ? ["alíquota da tabela pública não foi informada neste recorte"] : ["tabela pública e natureza do rendimento não confirmadas"] });
  }
  if (input.payerType !== "private_legal_entity") return track({ tax: "IRRF", status: "not_applicable", rateBps: 0, baseCents: input.irrfBaseCents, amountCents: 0, taxableEvent: "pagamento ou crédito", responsible: "fonte pagadora", dueRule: "não aplicável ao pagador informado neste recorte", sourceCodes });
  if (input.beneficiaryRegime === "simples" || input.beneficiaryRegime === "mei" || input.beneficiaryRegime === "immune_or_exempt") {
    return track({ tax: "IRRF", status: "not_applicable", rateBps: 0, baseCents: input.irrfBaseCents, amountCents: 0, taxableEvent: "pagamento ou crédito", responsible: "fonte pagadora", dueRule: "dispensa depende da prova do regime na data do fato", sourceCodes, warnings: ["dispensa condicionada à documentação do beneficiário"] });
  }
  if (profile.irrfCandidateRateBps === null) return track({ tax: "IRRF", status: "not_applicable", rateBps: 0, baseCents: input.irrfBaseCents, amountCents: 0, taxableEvent: "pagamento ou crédito", responsible: "fonte pagadora", dueRule: "não há hipótese geral de IRRF neste perfil estruturado", sourceCodes, warnings: ["outra natureza remuneratória pode abrir regra distinta"] });
  const base = safeCents(input.irrfBaseCents, "irrf_base");
  const blockers = [...shared];
  if (!input.paymentOrCreditConfirmed) blockers.push("data do pagamento ou crédito não confirmada");
  if (!input.irrfHypothesisConfirmed) blockers.push("hipótese e código de receita do IRRF não confirmados");
  if (base === null) blockers.push("base do IRRF não informada");
  if (blockers.length || base === null) return track({ tax: "IRRF", status: "blocked", rateBps: profile.irrfCandidateRateBps, baseCents: base, amountCents: null, taxableEvent: "pagamento ou crédito, o que ocorrer primeiro", responsible: "fonte pagadora", dueRule: "último dia útil do segundo decêndio do mês subsequente", sourceCodes, blockers });
  const calculated = multiplyCents(base, profile.irrfCandidateRateBps);
  const amount = calculated <= 1_000 ? 0 : calculated;
  return track({ tax: "IRRF", status: "calculated_reference", rateBps: profile.irrfCandidateRateBps, baseCents: base, amountCents: amount, taxableEvent: "pagamento ou crédito, o que ocorrer primeiro", responsible: "fonte pagadora", dueRule: "último dia útil do segundo decêndio do mês subsequente", sourceCodes, warnings: calculated <= 1_000 ? ["retenção calculada igual ou inferior a R$ 10,00: dispensa aplicada por pagamento/crédito"] : [] });
}

function csrfTrack(input: ServiceWithholdingInput, profile: ServiceWithholdingProfile): WithholdingTrack {
  const sourceCodes = ["RET-L-10833", "RET-L-13137", "RET-IN-SRF-459"];
  if (input.payerType === "federal_public_body" || input.payerType === "state_or_municipal_public_body") {
    return track({ tax: "CSRF", status: "blocked", rateBps: null, baseCents: input.csrfBaseCents, amountCents: null, taxableEvent: "pagamento", responsible: "órgão ou entidade pagadora", dueRule: "conforme IN RFB nº 1.234/2012 e convênio aplicável", sourceCodes: ["RET-IN-RFB-1234", "RET-L-10833"], blockers: input.publicBodyTableConfirmed ? ["alíquotas públicas por tributo não foram informadas neste recorte"] : ["tabela pública e enquadramento do ente não confirmados"] });
  }
  if (input.payerType !== "private_legal_entity" || input.beneficiaryType !== "legal_entity" || input.payerRegime === "simples" || input.payerRegime === "mei" || input.beneficiaryRegime === "simples" || input.beneficiaryRegime === "mei") {
    return track({ tax: "CSRF", status: "not_applicable", rateBps: 0, baseCents: input.csrfBaseCents, amountCents: 0, taxableEvent: "pagamento", responsible: "pessoa jurídica pagadora", dueRule: "dispensa ou parte fora da hipótese privada PJ→PJ", sourceCodes, warnings: ["regime das partes deve permanecer documentado"] });
  }
  if (!profile.csrfCandidate) return track({ tax: "CSRF", status: "not_applicable", rateBps: 0, baseCents: input.csrfBaseCents, amountCents: 0, taxableEvent: "pagamento", responsible: "pessoa jurídica pagadora", dueRule: "serviço fora do catálogo do art. 30 neste recorte", sourceCodes });
  const base = safeCents(input.csrfBaseCents, "csrf_base");
  const blockers = [...commonBlockers(input)];
  if (!input.paymentOrCreditConfirmed) blockers.push("pagamento da CSRF não confirmado");
  if (!input.csrfHypothesisConfirmed) blockers.push("hipótese de CSRF e eventuais retenções parciais não confirmadas");
  if (base === null) blockers.push("base da CSRF não informada");
  if (blockers.length || base === null) return track({ tax: "CSRF", status: "blocked", rateBps: 465, baseCents: base, amountCents: null, taxableEvent: "pagamento", responsible: "pessoa jurídica pagadora", dueRule: "último dia útil do segundo decêndio do mês subsequente ao pagamento", sourceCodes, blockers });
  const calculated = multiplyCents(base, 465);
  const amount = calculated <= 1_000 ? 0 : calculated;
  return track({ tax: "CSRF", status: "calculated_reference", rateBps: 465, baseCents: base, amountCents: amount, taxableEvent: "pagamento", responsible: "pessoa jurídica pagadora", dueRule: "último dia útil do segundo decêndio do mês subsequente ao pagamento", sourceCodes, warnings: calculated <= 1_000 ? ["retenção conjunta igual ou inferior a R$ 10,00: dispensa aplicada"] : ["4,65% = CSLL 1% + Cofins 3% + PIS/Pasep 0,65%; exceções parciais exigem trilhas separadas"] });
}

function inssTrack(input: ServiceWithholdingInput, profile: ServiceWithholdingProfile): WithholdingTrack {
  const sourceCodes = ["RET-L-8212", "RET-IN-RFB-2110", "RET-RFB-REINF"];
  if (input.inssExecutionMode === "none" && profile.inssCandidate === "none") return track({ tax: "INSS", status: "not_applicable", rateBps: 0, baseCents: input.inssBaseCents, amountCents: 0, taxableEvent: "emissão da nota, fatura ou recibo", responsible: "empresa contratante", dueRule: "sem hipótese previdenciária neste perfil informado", sourceCodes });
  if (input.inssExecutionMode === "total_contract") {
    const blockers = [...commonBlockers(input)];
    if (!input.inssExecutionConfirmed) blockers.push("empreitada total e responsabilidade solidária não confirmadas");
    blockers.push("empreitada total exige decisão documentada sobre retenção facultativa para elisão da solidariedade e exceções do art. 135 da IN RFB 2.110/2022");
    return track({ tax: "INSS", status: "blocked", rateBps: null, baseCents: input.inssBaseCents, amountCents: null, taxableEvent: "emissão da nota, fatura ou recibo", responsible: "contratante ou responsável solidário após classificação da obra", dueRule: "prazo depende da retenção documentada e da escrituração da obra", sourceCodes, blockers });
  }
  const blockers = [...commonBlockers(input)];
  if (profile.inssCandidate === "none") blockers.push("perfil não demonstra cessão de mão de obra ou empreitada sujeita à retenção");
  if (profile.inssCandidate === "labor_assignment_only" && input.inssExecutionMode !== "labor_assignment") blockers.push("perfil exige cessão ou colocação de mão de obra; empreitada parcial não pode ser presumida");
  if (!input.inssExecutionConfirmed || input.inssExecutionMode === "none") blockers.push("modo de execução previdenciário não confirmado");
  if (!input.inssRateStatusConfirmed || input.inssRateStatus === "not_applicable") blockers.push("indicador de CPRB e alíquota previdenciária não confirmados");
  if ((input.beneficiaryRegime === "simples" || input.beneficiaryRegime === "mei") && !input.simplesAnnexIVConfirmed) blockers.push("prestador do Simples exige confirmação do Anexo IV e da hipótese previdenciária");
  const base = safeCents(input.inssBaseCents, "inss_base");
  const deductions = safeCents(input.inssDeductionsCents, "inss_deductions") ?? 0;
  if (base === null) blockers.push("base previdenciária não informada");
  if (deductions > 0 && !input.inssDeductionsDocumented) blockers.push("deduções previdenciárias sem discriminação e documentos");
  if (base !== null && deductions > base) blockers.push("deduções previdenciárias excedem a base");
  const rate = input.inssRateStatus === "cprb_3_5" ? 350 : input.inssRateStatus === "standard_11" ? 1100 : null;
  if (blockers.length || base === null || rate === null) return track({ tax: "INSS", status: "blocked", rateBps: rate, baseCents: base, amountCents: null, taxableEvent: "emissão da nota, fatura ou recibo", responsible: "empresa contratante", dueRule: "dia 20 do mês subsequente, antecipado quando não houver expediente bancário; EFD-Reinf até dia 15", sourceCodes, blockers });
  const taxableBase = base - deductions;
  return track({ tax: "INSS", status: "calculated_reference", rateBps: rate, baseCents: taxableBase, amountCents: multiplyCents(taxableBase, rate), taxableEvent: "emissão da nota, fatura ou recibo", responsible: "empresa contratante", dueRule: "dia 20 do mês subsequente, antecipado quando não houver expediente bancário; EFD-Reinf até dia 15", sourceCodes, warnings: [rate === 350 ? "alíquota de 3,5% depende do indicador CPRB correto no R-2010" : "retenção de 11% deve ser conciliada com R-2010/R-2020 e DCTFWeb"] });
}

function issTrack(input: ServiceWithholdingInput, profile: ServiceWithholdingProfile): WithholdingTrack {
  const sourceCodes = ["RET-LC-116", "RET-LC-123"];
  const base = safeCents(input.issBaseCents, "iss_base");
  const rate = safeRate(input.issRateBps);
  const common = [...commonBlockers(input)];
  if (!input.municipalityCode) common.push("município competente não identificado");
  if (!input.municipalServiceItem || !profile.lc116Items.includes(input.municipalServiceItem)) common.push("item municipal não conciliado com a LC 116");
  if (!input.municipalLawConfirmed) common.push("lei municipal, vigência, responsabilidade e vencimento não confirmados");
  if (input.issWithholdingStatus === "unknown") common.push("retenção de ISS não classificada");
  if (input.issWithholdingStatus === "does_not_apply") {
    if (common.length) return track({ tax: "ISS", status: "blocked", rateBps: rate, baseCents: base, amountCents: null, taxableEvent: "prestação do serviço conforme lei municipal", responsible: "prestador ou responsável atribuído por lei", dueRule: "prazo municipal não pode ser inferido nacionalmente", sourceCodes, blockers: common });
    return track({ tax: "ISS", status: "not_applicable", rateBps: 0, baseCents: base, amountCents: 0, taxableEvent: "prestação do serviço conforme lei municipal", responsible: "prestador", dueRule: "retenção afastada pela lei municipal confirmada", sourceCodes });
  }
  if (base === null) common.push("base municipal não informada");
  if (rate === null || rate < 200 || rate > 500) common.push("alíquota municipal entre 2% e 5% não confirmada");
  if (common.length || base === null || rate === null) return track({ tax: "ISS", status: "blocked", rateBps: rate, baseCents: base, amountCents: null, taxableEvent: "prestação do serviço conforme lei municipal", responsible: "tomador somente quando a lei atribuir responsabilidade", dueRule: "prazo municipal não pode ser inferido nacionalmente", sourceCodes, blockers: common });
  return track({ tax: "ISS", status: "calculated_reference", rateBps: rate, baseCents: base, amountCents: multiplyCents(base, rate), taxableEvent: "prestação do serviço conforme lei municipal", responsible: "tomador identificado na lei municipal", dueRule: "vencimento conforme lei e calendário do município informado", sourceCodes, warnings: ["a faixa nacional não substitui a alíquota, o código e o vencimento municipais"] });
}

export function calculateServiceWithholdings(input: ServiceWithholdingInput): ServiceWithholdingResult {
  if (!validIsoDate(input.calculationDate)) throw new Error("invalid_calculation_date");
  safeCents(input.grossPaymentCents, "gross_payment");
  const profile = serviceWithholdingProfiles.find((item) => item.code === input.serviceCode) ?? null;
  if (!profile) {
    return {
      status: "blocked",
      profile: null,
      tracks: [],
      totalWithheldCents: null,
      netPaymentCents: null,
      blockers: ["serviço fora dos perfis recorrentes estruturados"],
      warnings: [],
      sourceCodes: [],
      version: SERVICE_WITHHOLDINGS_DEEP_VERSION,
      checkedAt: SERVICE_WITHHOLDINGS_DEEP_CHECKED_AT,
    };
  }
  if (
    input.calculationDate < SERVICE_WITHHOLDINGS_DEEP_SUPPORTED_PERIOD.from
    || input.calculationDate > SERVICE_WITHHOLDINGS_DEEP_SUPPORTED_PERIOD.to
  ) {
    return {
      status: "blocked",
      profile,
      tracks: [],
      totalWithheldCents: null,
      netPaymentCents: null,
      blockers: [`data fora da vigência suportada (${SERVICE_WITHHOLDINGS_DEEP_SUPPORTED_PERIOD.from} a ${SERVICE_WITHHOLDINGS_DEEP_SUPPORTED_PERIOD.to})`],
      warnings: ["A regra deve ser versionada novamente antes de calcular outro período."],
      sourceCodes: profile.sourceCodes,
      version: SERVICE_WITHHOLDINGS_DEEP_VERSION,
      checkedAt: SERVICE_WITHHOLDINGS_DEEP_CHECKED_AT,
    };
  }
  const tracks = [irrfTrack(input, profile), csrfTrack(input, profile), inssTrack(input, profile), issTrack(input, profile)];
  const blockers = tracks.flatMap((item) => item.blockers.map((blocker) => `${item.tax}: ${blocker}`));
  const warnings = tracks.flatMap((item) => item.warnings.map((warning) => `${item.tax}: ${warning}`));
  const allResolved = tracks.every((item) => item.status !== "blocked");
  const someCalculated = tracks.some((item) => item.status === "calculated_reference");
  const gross = input.grossPaymentCents;
  const mayCombine = allResolved && input.simultaneousDeductionsConfirmed && gross !== null;
  const totalWithheldCents = mayCombine ? tracks.reduce((sum, item) => sum + (item.amountCents ?? 0), 0) : null;
  return {
    status: blockers.length ? (someCalculated ? "partially_calculated" : "blocked") : "calculated_reference",
    profile,
    tracks,
    totalWithheldCents,
    netPaymentCents: mayCombine && totalWithheldCents !== null && gross !== null ? Math.max(0, gross - totalWithheldCents) : null,
    blockers,
    warnings: [
      ...warnings,
      ...(mayCombine ? [] : ["IRRF, CSRF, INSS e ISS permanecem em livros separados; o líquido só é liberado com simultaneidade e bases confirmadas."]),
    ],
    sourceCodes: [...new Set(tracks.flatMap((item) => item.sourceCodes))],
    version: SERVICE_WITHHOLDINGS_DEEP_VERSION,
    checkedAt: SERVICE_WITHHOLDINGS_DEEP_CHECKED_AT,
  };
}

const baseInput: ServiceWithholdingInput = {
  serviceCode: "ACCOUNTING",
  payerType: "private_legal_entity",
  payerRegime: "normal",
  beneficiaryType: "legal_entity",
  beneficiaryRegime: "normal",
  calculationDate: "2026-07-30",
  grossPaymentCents: 10_000_000,
  irrfBaseCents: 10_000_000,
  csrfBaseCents: 10_000_000,
  inssBaseCents: 10_000_000,
  issBaseCents: 10_000_000,
  serviceNatureConfirmed: true,
  contractAndDocumentConfirmed: true,
  paymentOrCreditConfirmed: true,
  payerResponsibilityConfirmed: true,
  beneficiaryRegimeDocumented: true,
  irrfHypothesisConfirmed: true,
  csrfHypothesisConfirmed: true,
  inssExecutionMode: "none",
  inssExecutionConfirmed: true,
  inssRateStatus: "not_applicable",
  inssRateStatusConfirmed: true,
  inssDeductionsCents: 0,
  inssDeductionsDocumented: true,
  simplesAnnexIVConfirmed: false,
  municipalityCode: "3550308",
  municipalServiceItem: "17.19",
  issWithholdingStatus: "does_not_apply",
  issRateBps: 500,
  municipalLawConfirmed: true,
  publicBodyTableConfirmed: false,
  simultaneousDeductionsConfirmed: true,
};

function referenceInput(profile: ServiceWithholdingProfile, grossPaymentCents: number): ServiceWithholdingInput {
  const totalContract = profile.code === "CIVIL_CONSTRUCTION_TOTAL";
  const previdenciaryCandidate = profile.inssCandidate !== "none";
  return {
    ...baseInput,
    serviceCode: profile.code,
    grossPaymentCents,
    irrfBaseCents: grossPaymentCents,
    csrfBaseCents: grossPaymentCents,
    inssBaseCents: grossPaymentCents,
    issBaseCents: grossPaymentCents,
    municipalServiceItem: profile.lc116Items[0] ?? null,
    issWithholdingStatus: "applies",
    issRateBps: 300,
    inssExecutionMode: totalContract ? "total_contract" : previdenciaryCandidate ? "labor_assignment" : "none",
    inssRateStatus: previdenciaryCandidate && !totalContract ? "standard_11" : "not_applicable",
    simplesAnnexIVConfirmed: true,
  };
}

function expectedAmounts(profile: ServiceWithholdingProfile, cents: number, kind: ServiceWithholdingReferenceCase["kind"]) {
  if (kind === "safe_block") {
    return {
      IRRF: profile.irrfCandidateRateBps === null ? 0 : null,
      CSRF: profile.csrfCandidate ? null : 0,
      INSS: profile.inssCandidate === "none" ? 0 : null,
      ISS: null,
    } satisfies ServiceWithholdingReferenceCase["expectedTrackAmounts"];
  }
  const waiver = kind === "waiver_boundary";
  const irrfCalculated = profile.irrfCandidateRateBps === null ? 0 : multiplyCents(cents, profile.irrfCandidateRateBps);
  const csrfCalculated = profile.csrfCandidate ? multiplyCents(cents, 465) : 0;
  return {
    IRRF: waiver && irrfCalculated <= 1_000 ? 0 : irrfCalculated,
    CSRF: waiver && csrfCalculated <= 1_000 ? 0 : csrfCalculated,
    INSS: profile.code === "CIVIL_CONSTRUCTION_TOTAL" ? null : profile.inssCandidate === "none" ? 0 : multiplyCents(cents, 1100),
    ISS: multiplyCents(cents, 300),
  } satisfies ServiceWithholdingReferenceCase["expectedTrackAmounts"];
}

export const serviceWithholdingReferenceCases: ServiceWithholdingReferenceCase[] = serviceWithholdingProfiles.flatMap((profile) => {
  const combinedInput = referenceInput(profile, 10_000_000);
  const waiverInput = referenceInput(profile, 20_000);
  const totalContract = profile.code === "CIVIL_CONSTRUCTION_TOTAL";
  const combinedAmounts = expectedAmounts(profile, 10_000_000, "combined_memory");
  const waiverAmounts = expectedAmounts(profile, 20_000, "waiver_boundary");
  const combinedTotal = Object.values(combinedAmounts).every((amount) => amount !== null)
    ? Object.values(combinedAmounts).reduce<number>((sum, amount) => sum + (amount ?? 0), 0)
    : null;
  const waiverTotal = Object.values(waiverAmounts).every((amount) => amount !== null)
    ? Object.values(waiverAmounts).reduce<number>((sum, amount) => sum + (amount ?? 0), 0)
    : null;
  return [
    {
      code: `${profile.code}-COMBINED`,
      kind: "combined_memory" as const,
      profileCode: profile.code,
      input: combinedInput,
      expectedStatus: totalContract ? "partially_calculated" as const : "calculated_reference" as const,
      expectedTrackAmounts: combinedAmounts,
      expectedNetPaymentCents: combinedTotal === null ? null : combinedInput.grossPaymentCents! - combinedTotal,
    },
    {
      code: `${profile.code}-WAIVER`,
      kind: "waiver_boundary" as const,
      profileCode: profile.code,
      input: waiverInput,
      expectedStatus: totalContract ? "partially_calculated" as const : "calculated_reference" as const,
      expectedTrackAmounts: waiverAmounts,
      expectedNetPaymentCents: waiverTotal === null ? null : waiverInput.grossPaymentCents! - waiverTotal,
    },
    {
      code: `${profile.code}-BLOCKED`,
      kind: "safe_block" as const,
      profileCode: profile.code,
      input: { ...combinedInput, serviceNatureConfirmed: false, contractAndDocumentConfirmed: false, simultaneousDeductionsConfirmed: false },
      expectedStatus: "blocked" as const,
      expectedTrackAmounts: expectedAmounts(profile, 10_000_000, "safe_block"),
      expectedNetPaymentCents: null,
    },
  ];
});

export function serviceWithholdingsDeepMetrics() {
  const calculatedMemories = serviceWithholdingReferenceCases.filter((referenceCase) => (
    referenceCase.expectedStatus !== "blocked"
  )).length;
  return {
    prioritizedServices: serviceWithholdingProfiles.length,
    contractualProfiles: serviceWithholdingProfiles.length,
    separateLedgers: 4,
    versionedRuleControls: serviceWithholdingRuleControls.length,
    deterministicCases: serviceWithholdingReferenceCases.length,
    calculatedMemories,
    safelyBlockedCases: serviceWithholdingReferenceCases.filter((item) => item.expectedStatus === "blocked").length,
  };
}

export function validateServiceWithholdingsDeep() {
  const errors: string[] = [];
  if (serviceWithholdingProfiles.length !== 40) errors.push("forty_contractual_profiles_required");
  if (new Set(serviceWithholdingProfiles.map((item) => item.code)).size !== serviceWithholdingProfiles.length) errors.push("duplicate_service_profile");
  if (!serviceWithholdingProfiles.every((item, index) => item.rank === index + 1 && item.sourceCodes.length > 0 && item.version === SERVICE_WITHHOLDINGS_DEEP_VERSION)) errors.push("rank_or_evidence_incomplete");
  if (!serviceWithholdingSources.every((item) => item.url.startsWith("https://") && item.checkedAt === SERVICE_WITHHOLDINGS_DEEP_CHECKED_AT)) errors.push("official_source_metadata_invalid");
  const sourceCodes = new Set(serviceWithholdingSources.map((item) => item.code));
  if (serviceWithholdingRuleControls.length !== 4 || new Set(serviceWithholdingRuleControls.map((item) => item.tax)).size !== 4) errors.push("four_versioned_ledger_controls_required");
  if (!serviceWithholdingRuleControls.every((item) => item.version && item.effectiveFrom && item.taxableEvent && item.responsible && item.dueRule && item.dispensationRule && item.sourceCodes.every((code) => sourceCodes.has(code)))) errors.push("versioned_rule_control_incomplete");
  if (serviceWithholdingReferenceCases.length !== 120 || new Set(serviceWithholdingReferenceCases.map((item) => item.code)).size !== 120) errors.push("one_hundred_twenty_reference_cases_required");
  if (!serviceWithholdingProfiles.every((profile) => serviceWithholdingReferenceCases.filter((item) => item.profileCode === profile.code).length === 3)) errors.push("three_cases_per_profile_required");
  for (const referenceCase of serviceWithholdingReferenceCases) {
    const result = calculateServiceWithholdings(referenceCase.input);
    const actualAmounts = Object.fromEntries(result.tracks.map((item) => [item.tax, item.amountCents]));
    if (result.status !== referenceCase.expectedStatus || result.netPaymentCents !== referenceCase.expectedNetPaymentCents || JSON.stringify(actualAmounts) !== JSON.stringify(referenceCase.expectedTrackAmounts)) errors.push(`reference_case_failed:${referenceCase.code}`);
    if (!result.tracks.every((item) => item.ruleVersion && item.effectiveFrom && item.dueRule && item.responsible)) errors.push(`ledger_metadata_failed:${referenceCase.code}`);
  }
  if (serviceWithholdingsDeepMetrics().calculatedMemories < 80) errors.push("eighty_reproduced_memories_required");

  const professional = calculateServiceWithholdings(baseInput);
  if (professional.status !== "calculated_reference" || professional.tracks.find((item) => item.tax === "IRRF")?.amountCents !== 150_000 || professional.tracks.find((item) => item.tax === "CSRF")?.amountCents !== 465_000) errors.push("professional_service_memory_failed");

  const small = calculateServiceWithholdings({ ...baseInput, grossPaymentCents: 20_000, irrfBaseCents: 20_000, csrfBaseCents: 20_000, issBaseCents: 20_000 });
  if (small.tracks.find((item) => item.tax === "IRRF")?.amountCents !== 0 || small.tracks.find((item) => item.tax === "CSRF")?.amountCents !== 0) errors.push("ten_reais_waiver_failed");

  const cleaning = calculateServiceWithholdings({
    ...baseInput,
    serviceCode: "CLEANING",
    municipalServiceItem: "7.10",
    inssExecutionMode: "labor_assignment",
    inssRateStatus: "standard_11",
    inssBaseCents: 9_000_000,
    issWithholdingStatus: "applies",
    issRateBps: 300,
  });
  if (cleaning.tracks.find((item) => item.tax === "IRRF")?.amountCents !== 100_000 || cleaning.tracks.find((item) => item.tax === "INSS")?.amountCents !== 990_000 || cleaning.tracks.find((item) => item.tax === "ISS")?.amountCents !== 300_000) errors.push("cleaning_memory_failed");

  const cprb = calculateServiceWithholdings({ ...cleaning, ...baseInput, serviceCode: "SECURITY", municipalServiceItem: "11.02", inssExecutionMode: "labor_assignment", inssRateStatus: "cprb_3_5", inssBaseCents: 10_000_000 });
  if (cprb.tracks.find((item) => item.tax === "INSS")?.amountCents !== 350_000) errors.push("cprb_memory_failed");

  const simple = calculateServiceWithholdings({ ...baseInput, beneficiaryRegime: "simples" });
  if (simple.tracks.find((item) => item.tax === "IRRF")?.status !== "not_applicable" || simple.tracks.find((item) => item.tax === "CSRF")?.status !== "not_applicable") errors.push("simples_dispensation_failed");

  const publicBody = calculateServiceWithholdings({ ...baseInput, payerType: "federal_public_body", payerRegime: "not_applicable" });
  if (publicBody.tracks.find((item) => item.tax === "IRRF")?.status !== "blocked" || publicBody.tracks.find((item) => item.tax === "CSRF")?.status !== "blocked") errors.push("public_table_gate_failed");

  const missing = calculateServiceWithholdings({ ...baseInput, serviceNatureConfirmed: false, municipalLawConfirmed: false, simultaneousDeductionsConfirmed: false });
  if (missing.status !== "blocked" || missing.netPaymentCents !== null || missing.blockers.length === 0) errors.push("missing_facts_fail_close_failed");

  const beforeSupportedPeriod = calculateServiceWithholdings({ ...baseInput, calculationDate: "2025-12-31" });
  const afterSupportedPeriod = calculateServiceWithholdings({ ...baseInput, calculationDate: "2027-01-01" });
  if (beforeSupportedPeriod.status !== "blocked" || beforeSupportedPeriod.tracks.length !== 0 || beforeSupportedPeriod.netPaymentCents !== null) errors.push("supported_period_lower_gate_failed");
  if (afterSupportedPeriod.status !== "blocked" || afterSupportedPeriod.tracks.length !== 0 || afterSupportedPeriod.netPaymentCents !== null) errors.push("supported_period_upper_gate_failed");

  return { passed: errors.length === 0, errors };
}

export async function hashServiceWithholdingsDeep() {
  const payload = JSON.stringify({
    version: SERVICE_WITHHOLDINGS_DEEP_VERSION,
    checkedAt: SERVICE_WITHHOLDINGS_DEEP_CHECKED_AT,
    supportedPeriod: SERVICE_WITHHOLDINGS_DEEP_SUPPORTED_PERIOD,
    sources: serviceWithholdingSources,
    controls: serviceWithholdingRuleControls,
    profiles: serviceWithholdingProfiles,
    cases: serviceWithholdingReferenceCases,
    metrics: serviceWithholdingsDeepMetrics(),
  });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

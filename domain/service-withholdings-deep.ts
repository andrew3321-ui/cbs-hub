export const SERVICE_WITHHOLDINGS_DEEP_VERSION = "2026.07.31-v82";
export const SERVICE_WITHHOLDINGS_DEEP_CHECKED_AT = "2026-07-30";

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
    title: "Perguntas frequentes da EFD-Reinf",
    publisher: "Receita Federal",
    url: "https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/perguntas-frequentes/sped/efd-reinf/efdr",
    legalReference: "R-2010/R-2020, R-4010/R-4020 e prazo geral até o dia 15 do mês seguinte",
    effectiveFrom: "2026-04-13",
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
  if (irrfCandidateRateBps !== null) sourceCodes.push("RET-RIR-2018", "RET-RFB-MAFON");
  if (csrfCandidate) sourceCodes.push("RET-L-10833", "RET-L-13137", "RET-IN-SRF-459");
  if (inssCandidate !== "none") sourceCodes.push("RET-L-8212", "RET-IN-RFB-2110");
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

function track(input: Omit<WithholdingTrack, "warnings" | "blockers"> & { blockers?: string[]; warnings?: string[] }): WithholdingTrack {
  return { ...input, blockers: input.blockers ?? [], warnings: input.warnings ?? [] };
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
  if (input.inssExecutionMode === "total_contract") return track({ tax: "INSS", status: "not_applicable", rateBps: 0, baseCents: input.inssBaseCents, amountCents: 0, taxableEvent: "emissão da nota, fatura ou recibo", responsible: "empresa contratante", dueRule: "empreitada total segue solidariedade e exceções próprias", sourceCodes, warnings: ["não reutilizar esta dispensa para cessão de mão de obra ou empreitada parcial"] });
  const blockers = [...commonBlockers(input)];
  if (profile.inssCandidate === "none") blockers.push("perfil não demonstra cessão de mão de obra ou empreitada sujeita à retenção");
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

export function serviceWithholdingsDeepMetrics() {
  return {
    prioritizedServices: serviceWithholdingProfiles.length,
    separateLedgers: 4,
    deterministicCases: serviceWithholdingProfiles.length + 12,
    calculatedMemories: 6,
    safelyBlockedCases: serviceWithholdingProfiles.length + 6,
  };
}

export function validateServiceWithholdingsDeep() {
  const errors: string[] = [];
  if (serviceWithholdingProfiles.length !== 15) errors.push("fifteen_priority_services_required");
  if (new Set(serviceWithholdingProfiles.map((item) => item.code)).size !== serviceWithholdingProfiles.length) errors.push("duplicate_service_profile");
  if (!serviceWithholdingProfiles.every((item, index) => item.rank === index + 1 && item.sourceCodes.length > 0 && item.version === SERVICE_WITHHOLDINGS_DEEP_VERSION)) errors.push("rank_or_evidence_incomplete");
  if (!serviceWithholdingSources.every((item) => item.url.startsWith("https://") && item.checkedAt === SERVICE_WITHHOLDINGS_DEEP_CHECKED_AT)) errors.push("official_source_metadata_invalid");

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

  return { passed: errors.length === 0, errors };
}

export async function hashServiceWithholdingsDeep() {
  const payload = JSON.stringify({
    version: SERVICE_WITHHOLDINGS_DEEP_VERSION,
    checkedAt: SERVICE_WITHHOLDINGS_DEEP_CHECKED_AT,
    sources: serviceWithholdingSources,
    profiles: serviceWithholdingProfiles,
    metrics: serviceWithholdingsDeepMetrics(),
  });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

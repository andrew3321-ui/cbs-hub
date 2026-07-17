export const FEDERAL_PME_RULESET_VERSION = "2026.07.17-v26";
export const FEDERAL_PME_CHECKED_AT = "2026-07-17";

export type FederalPmeRegime = "mei" | "simples" | "presumed" | "real";
export type FederalPmeCategory = "regime" | "taxes" | "payroll" | "withholdings" | "sped" | "reform_benefits";
export type FederalPmeStatus = "required" | "conditional" | "monitor" | "not_applicable";

export type FederalPmeProfile = {
  regime: FederalPmeRegime;
  hasEmployees: boolean;
  paysIndividuals: boolean;
  hasServiceWithholdings: boolean;
  hiresLaborAssignmentOrConstruction: boolean;
  manufacturesOrImports: boolean;
  usesListedTaxBenefits: boolean;
  hasFederalTaxesOutsideUnifiedRegime: boolean;
  subjectToCprb: boolean;
  issuesFiscalDocuments: boolean;
  distributesProfits: boolean;
  inactive: boolean;
  keepsFullAccounting: boolean;
};

export type FederalPmeSource = {
  code: string;
  title: string;
  publisher: string;
  url: string;
  legalReference: string;
  checkedAt: string;
};

export type FederalPmeRule = {
  code: string;
  category: FederalPmeCategory;
  title: string;
  cadence: "monthly" | "annual" | "per_event" | "continuous" | "quarterly";
  deadline: string;
  purpose: string;
  action: string;
  risk: "critical" | "high" | "medium";
  sourceCodes: string[];
  evidence: string[];
};

export type FederalPmeAssessmentItem = FederalPmeRule & {
  status: FederalPmeStatus;
  reason: string;
};

const source = (code: string, title: string, publisher: string, url: string, legalReference: string): FederalPmeSource => ({ code, title, publisher, url, legalReference, checkedAt: FEDERAL_PME_CHECKED_AT });

export const federalPmeSources: FederalPmeSource[] = [
  source("LC-123", "Lei Complementar nº 123/2006", "Presidência da República", "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm", "ME/EPP, Simples Nacional, MEI, limites, vedações e anexos"),
  source("CGSN-140", "Resolução CGSN nº 140/2018", "Receita Federal · Simples Nacional", "https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=92278", "PGDAS-D, DEFIS, SIMEI, segregação e fator R"),
  source("MEI-REVENUE", "Limite oficial de faturamento do MEI", "Portal do Empreendedor", "https://www.gov.br/empresas-e-negocios/pt-br/empreendedor/perguntas-frequentes/o-que-e-o-microempreendedor-individual-mei/qual-o-faturamento-anual-do", "R$ 81 mil; limite proporcional; regra própria para MEI caminhoneiro"),
  source("MEI-DASN", "Declaração anual de faturamento do MEI", "Portal do Empreendedor", "https://www.gov.br/empresas-e-negocios/pt-br/empreendedor/servicos-para-mei/declaracao-anual-de-faturamento", "DASN-SIMEI até 31 de maio, inclusive sem faturamento"),
  source("RFB-OMISSIONS", "Controle de omissões de declarações", "Receita Federal", "https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/cobrancas-e-intimacoes/controle-de-entrega-de-declaracoes/orientacoes-sobre-o-termo-de-intimacao-por-omissao-na-entrega-de-declaracoes", "PGDAS-D, DEFIS, DASN-SIMEI, DCTFWeb, ECF e EFD-Contribuições"),
  source("DCTFWEB", "DCTFWeb e MIT", "Receita Federal", "https://www.gov.br/pt-br/servicos/declarar-debitos-e-creditos-tributarios-federais", "eSocial, EFD-Reinf e MIT; prazo mensal no último dia útil do mês seguinte"),
  source("EFD-REINF", "Perguntas frequentes da EFD-Reinf", "Receita Federal", "https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/perguntas-frequentes/sped/efd-reinf/efdr/", "retenções, CPRB, pagamentos e integração com DCTFWeb"),
  source("EFD-REINF-DEADLINE", "Prazo da EFD-Reinf", "Receita Federal", "https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/perguntas-frequentes/sped/efd-reinf/efdr/1-geral/1-12-qual-e-o", "dia 15 do mês seguinte, ressalvado R-3010"),
  source("ESOCIAL", "Legislação para empresas no eSocial", "eSocial", "https://www.gov.br/esocial/pt-br/centrais-de-conteudo/legislacao/empresas", "eventos trabalhistas, previdenciários, periódicos e SST"),
  source("FGTS-DIGITAL", "FGTS Digital", "Ministério do Trabalho e Emprego", "https://www.gov.br/trabalho-e-emprego/pt-br/servicos/empregador/fgtsdigital", "guias com base no eSocial e eventos de reclamatórias em 2026"),
  source("EFD-CONTRIB", "Guia prático da EFD-Contribuições", "Receita Federal · SPED", "https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/manuais/sped/manuais-efd-contribuicoes/versao-atual/guia_pratico_efd_contribuicoes_versao_1_35-18_06_2021.pdf", "PIS, Cofins, CPRB, obrigatoriedade e dispensas do Simples"),
  source("ECD", "Perguntas frequentes da ECD", "Receita Federal · SPED", "https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/perguntas-frequentes/sped/ecd/ecd", "obrigatoriedade, dispensas e escrituração contábil digital"),
  source("ECD-DEADLINE", "Prazo da ECD", "Receita Federal · SPED", "https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/perguntas-frequentes/sped/ecd/ecd/qual-e-o-prazo-para", "último dia útil de junho do ano subsequente"),
  source("ECF", "Obrigatoriedade da ECF", "Receita Federal · SPED", "https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/perguntas-frequentes/sped/ecf/ecf/quais-pessoas-juridicas-estao-obrigadas-1", "lucro real, presumido e arbitrado; exceção do Simples"),
  source("ECF-DEADLINE", "Prazo da ECF", "Receita Federal · SPED", "https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/perguntas-frequentes/sped/ecf/ecf/qual-e-a-data-limite-regular", "último dia útil de julho do ano subsequente"),
  source("IRPJ", "IRPJ · orientação tributária", "Receita Federal", "https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/tributos/IRPJ", "regimes, alíquota nominal e adicional"),
  source("CSLL", "CSLL · orientação tributária", "Receita Federal", "https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/tributos/CSLL", "bases e alíquotas por natureza da pessoa jurídica"),
  source("PIS-COFINS", "PIS/Pasep e Cofins", "Receita Federal", "https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/tributos/pis-pasep-cofins", "cumulatividade, não cumulatividade, créditos e regimes especiais"),
  source("TIPI", "Decreto nº 11.158/2022 · TIPI", "Presidência da República", "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2022/decreto/d11158.htm", "incidência e classificação do IPI por NCM"),
  source("DIRBI", "Benefícios fiscais e Dirbi", "Receita Federal", "https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/perguntas-frequentes/beneficios-fiscais/beneficios-fiscais", "obrigados, dispensas do Simples e benefícios listados"),
  source("RTC-2026", "Orientações da Reforma Tributária para 2026", "Receita Federal", "https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/reforma-tributaria-do-consumo/orientacoes-2026", "destaque de CBS/IBS, documentos fiscais e dispensa condicionada de recolhimento"),
  source("CERTIFICATE", "Certificado digital para pessoas jurídicas", "Receita Federal", "https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/senhas/senhas_backup/certificados-digitais/informacoes-sobre-a-obrigatoriedade-de-utilizacao-de-certificado-digital-com-atualizacoes-da-in-rfb-no-1-036-2010", "assinatura digital de declarações e exceções"),
  source("DTE-2026", "DTE obrigatório para pessoas jurídicas em 2026", "Receita Federal", "https://www.gov.br/receitafederal/pt-br/assuntos/noticias/2026/janeiro/atencao-pessoas-juridicas/", "atribuição automática, ciência tácita, Caixa Postal e DTE-SN"),
];

const rule = (code: string, category: FederalPmeCategory, title: string, cadence: FederalPmeRule["cadence"], deadline: string, purpose: string, action: string, risk: FederalPmeRule["risk"], sourceCodes: string[], evidence: string[]): FederalPmeRule => ({ code, category, title, cadence, deadline, purpose, action, risk, sourceCodes, evidence });

export const federalPmeRules: FederalPmeRule[] = [
  rule("PME-REGIME-LIMIT", "regime", "Monitorar limite e permanência no regime", "continuous", "A cada fechamento mensal e antes de alterações societárias", "Evitar desenquadramento tardio e recolhimentos retroativos.", "Concilie receita bruta acumulada, atividades, sócios, débitos e vedações.", "critical", ["LC-123", "MEI-REVENUE"], ["receita mensal conciliada", "RBT12/receita anual", "atividades e quadro societário"]),
  rule("MEI-DAS", "regime", "DAS do MEI", "monthly", "Calendário do SIMEI", "Recolher os valores fixos do SIMEI.", "Apure a competência no PGMEI e preserve guia, pagamento e relatório de receitas.", "high", ["LC-123", "CGSN-140"], ["DAS emitido", "comprovante de pagamento", "relatório mensal de receitas"]),
  rule("MEI-DASN-SIMEI", "regime", "DASN-SIMEI", "annual", "Até 31 de maio, inclusive sem faturamento", "Declarar o faturamento anual e eventual empregado.", "Transmita a declaração e confronte o total com notas e relatórios mensais.", "critical", ["MEI-DASN", "RFB-OMISSIONS"], ["recibo DASN-SIMEI", "receita anual conciliada"]),
  rule("SIMPLES-PGDAS-D", "regime", "PGDAS-D", "monthly", "Calendário mensal do Simples Nacional", "Declarar receitas e calcular o DAS com segregação correta.", "Envie mesmo sem débitos quando houver obrigação e preserve memória por estabelecimento e atividade.", "critical", ["CGSN-140", "RFB-OMISSIONS"], ["recibo PGDAS-D", "RBT12", "receitas segregadas", "memória do fator R"]),
  rule("SIMPLES-DAS", "regime", "DAS do Simples Nacional", "monthly", "Vencimento conforme calendário oficial", "Recolher os tributos abrangidos pelo regime.", "Confronte DAS com PGDAS-D, retenções, ST, monofásico e tributos fora do regime.", "critical", ["LC-123", "CGSN-140"], ["DAS", "comprovante", "conciliação PGDAS-D"]),
  rule("SIMPLES-DEFIS", "regime", "DEFIS", "annual", "Até o último dia de março", "Prestar informações econômicas e fiscais do ano anterior.", "Concilie estoques, ganhos, distribuição, empregados e receitas antes da transmissão.", "high", ["CGSN-140", "RFB-OMISSIONS"], ["recibo DEFIS", "balancete", "estoques", "distribuição de lucros"]),
  rule("SIMPLES-SEGREGATION", "taxes", "Segregação de receitas do Simples", "monthly", "Antes do fechamento do PGDAS-D", "Evitar tributar no DAS parcelas sujeitas a ST, monofásico, retenção, imunidade ou tributação externa.", "Classifique cada receita por atividade, anexo, fator R e tratamento tributário comprovado.", "critical", ["LC-123", "CGSN-140"], ["receita por CFOP/NFS-e", "NCM e CST", "anexo/fator R", "fundamento da segregação"]),
  rule("DCTFWEB-GENERAL", "sped", "DCTFWeb", "monthly", "Último dia útil do mês seguinte", "Confessar débitos recebidos do eSocial, EFD-Reinf e MIT.", "Feche as escriturações de origem, transmita, confira débitos/créditos e emita o DARF.", "critical", ["DCTFWEB", "EFD-REINF"], ["recibo DCTFWeb", "DARF", "conciliação eSocial/Reinf/MIT"]),
  rule("MIT-FEDERAL-TAXES", "sped", "MIT · tributos federais", "monthly", "Integra o prazo da DCTFWeb", "Incluir débitos que não chegam automaticamente pelo eSocial ou EFD-Reinf.", "Classifique IRPJ, CSLL, PIS, Cofins, IPI e outros códigos aplicáveis antes de fechar a DCTFWeb.", "critical", ["DCTFWEB"], ["arquivo/recibo MIT", "memória por código de receita", "conciliação com razão"]),
  rule("EFD-REINF-R4000", "withholdings", "EFD-Reinf · retenções e pagamentos", "monthly", "Dia 15 do mês seguinte; antecipar sem expediente bancário", "Escriturar IRRF e retenções de PIS/Cofins/CSLL, entre outros rendimentos.", "Classifique beneficiário, natureza do rendimento, base, retenção e evento correto.", "critical", ["EFD-REINF", "EFD-REINF-DEADLINE"], ["R-4010/R-4020", "documentos de pagamento", "conciliação com DCTFWeb"]),
  rule("EFD-REINF-R2000", "withholdings", "EFD-Reinf · serviços com INSS", "monthly", "Dia 15 do mês seguinte; antecipar sem expediente bancário", "Escriturar serviços tomados/prestados com cessão de mão de obra ou empreitada.", "Valide contrato, notas, tipo de serviço, base, deduções e retenção previdenciária.", "critical", ["EFD-REINF", "EFD-REINF-DEADLINE"], ["R-2010/R-2020", "notas e contratos", "base e deduções", "conciliação DCTFWeb"]),
  rule("ESOCIAL-NONPERIODIC", "payroll", "eSocial · admissão, afastamento e desligamento", "per_event", "Prazo próprio de cada evento", "Registrar fatos trabalhistas no tempo correto.", "Mantenha cadastro, contrato, afastamentos e rescisões alinhados à folha.", "critical", ["ESOCIAL"], ["eventos aceitos", "documentos trabalhistas", "retornos sem erro"]),
  rule("ESOCIAL-PAYROLL", "payroll", "eSocial · remuneração e fechamento", "monthly", "Cronograma oficial do eSocial", "Escriturar remunerações, pagamentos e bases previdenciárias.", "Concilie rubricas, lotações, incidências e totalizadores antes do fechamento.", "critical", ["ESOCIAL", "DCTFWEB"], ["S-1200/S-1210", "S-1299", "folha", "totalizadores"]),
  rule("ESOCIAL-SST", "payroll", "eSocial · Saúde e Segurança do Trabalho", "per_event", "Conforme evento e ocorrência", "Manter eventos de ambiente, exposição e saúde ocupacional.", "Integre contabilidade, RH e responsável de SST; não derive risco apenas do CNAE.", "high", ["ESOCIAL"], ["S-2210/S-2220/S-2240", "laudos", "ASO", "CAT"]),
  rule("FGTS-DIGITAL", "payroll", "FGTS Digital", "monthly", "Calendário do FGTS Digital", "Gerar e pagar FGTS com base nos eventos do eSocial.", "Confronte bases, vínculos, desligamentos e guias; trate reclamatórias conforme a data do evento em 2026.", "critical", ["FGTS-DIGITAL", "ESOCIAL"], ["guia FGTS Digital", "pagamento", "conciliação com eSocial"]),
  rule("PAYROLL-DCTFWEB", "payroll", "Contribuições da folha na DCTFWeb", "monthly", "Último dia útil do mês seguinte", "Confessar contribuições previdenciárias e IRRF alimentados pelo eSocial.", "Compare totalizadores do eSocial com DCTFWeb e folha antes do DARF.", "critical", ["DCTFWEB", "ESOCIAL"], ["totalizadores", "DCTFWeb", "DARF", "razão da folha"]),
  rule("IRPJ-CSLL", "taxes", "IRPJ e CSLL fora do Simples", "quarterly", "Conforme regime e opção anual/trimestral", "Apurar bases real ou presumida, adicional e ajustes.", "Separe atividades, receitas, adições, exclusões, compensações e benefícios; alíquota nominal não é carga efetiva.", "critical", ["IRPJ", "CSLL"], ["memória IRPJ/CSLL", "Lalur/Lacs quando aplicável", "DARF", "razão"]),
  rule("PIS-COFINS", "taxes", "PIS/Pasep e Cofins", "monthly", "Calendário federal e DCTFWeb/MIT", "Apurar regime cumulativo ou não cumulativo e tratamentos especiais.", "Segregue monofásico, alíquota zero, suspensão, créditos e retenções com documento.", "critical", ["PIS-COFINS", "EFD-CONTRIB"], ["memória PIS/Cofins", "créditos vinculados", "EFD-Contribuições", "DARF"]),
  rule("IPI-TIPI", "taxes", "IPI e TIPI", "monthly", "Por período de apuração e calendário federal", "Apurar IPI de industrialização/importação conforme NCM e operação.", "Confira TIPI vigente, notas, Ex, benefícios, créditos e estabelecimentos equiparados.", "critical", ["TIPI"], ["NCM/TIPI", "livro de IPI", "memória de débito/crédito", "DARF"]),
  rule("WITHHOLDING-IRRF-CSRF", "withholdings", "IRRF e CSRF sobre pagamentos", "per_event", "No fato gerador e calendário de recolhimento", "Reter e recolher tributos conforme beneficiário e natureza do pagamento.", "Não aplique 4,65% ou IRRF por aproximação; valide serviço, partes, dispensa, limite e momento.", "critical", ["EFD-REINF", "PIS-COFINS"], ["nota/contrato", "natureza do rendimento", "comprovante da retenção", "EFD-Reinf"]),
  rule("INSS-SERVICES", "withholdings", "Retenção previdenciária em serviços", "per_event", "Na emissão/pagamento e escrituração mensal", "Controlar cessão de mão de obra e empreitada separadamente das retenções de renda.", "Valide enquadramento, base, deduções, destaque, compensação e eventos da Reinf.", "critical", ["EFD-REINF"], ["contrato", "nota fiscal", "base/deduções", "R-2010/R-2020"]),
  rule("EFD-CONTRIBUTIONS", "sped", "EFD-Contribuições", "monthly", "Agenda tributária e regra da escrituração", "Escriturar PIS, Cofins e CPRB de forma centralizada pela matriz.", "Concilie documentos, receitas, créditos, retenções e apuração; o Simples é dispensado nos períodos abrangidos.", "critical", ["EFD-CONTRIB"], ["arquivo validado", "recibo", "blocos M", "conciliação com MIT/DCTFWeb"]),
  rule("ECD", "sped", "ECD · Escrituração Contábil Digital", "annual", "Último dia útil de junho do ano subsequente", "Transmitir livros contábeis digitais quando obrigada.", "Confirme obrigação, dispensa do lucro presumido por Livro Caixa e escrituração completa antes de assinar.", "high", ["ECD", "ECD-DEADLINE"], ["livros diário/razão", "assinaturas", "recibo ECD", "balanço conciliado"]),
  rule("ECF", "sped", "ECF · Escrituração Contábil Fiscal", "annual", "Último dia útil de julho do ano subsequente", "Demonstrar apuração de IRPJ/CSLL e informações econômicas.", "Recupere ECD quando aplicável e confronte receitas, bases e débitos com EFD-Contribuições e DCTFWeb.", "critical", ["ECF", "ECF-DEADLINE"], ["arquivo ECF", "recibo", "recuperação ECD", "conciliação DCTFWeb"]),
  rule("DIGITAL-CERTIFICATE", "sped", "Assinatura e procurações digitais", "continuous", "Antes das transmissões", "Garantir acesso e assinatura válidos para obrigações digitais.", "Controle certificado, procurações, responsáveis e vencimentos; aplique exceções do Simples somente quando previstas.", "high", ["CERTIFICATE"], ["certificado válido", "procuração eletrônica", "matriz de acessos"]),
  rule("DTE-MONITORING", "sped", "DTE, DTE-SN e Caixa Postal", "continuous", "Acompanhamento recorrente; comunicações podem gerar ciência tácita", "Receber intimações, avisos e termos dentro do prazo legal.", "Defina responsável, rotina de consulta, alertas e evidência de leitura; Simples/MEI também devem acompanhar DTE-SN e Caixa Postal.", "critical", ["DTE-2026", "LC-123"], ["registro de consulta", "alertas atualizados", "responsável e substituto", "protocolo de tratamento"]),
  rule("DIRBI", "reform_benefits", "Dirbi · benefícios fiscais", "monthly", "Prazo da IN e agenda tributária vigente", "Informar benefícios listados quando utilizados.", "Cruze benefício, período, habilitação, regularidade e exceção do Simples; CPRB pode criar obrigação específica.", "critical", ["DIRBI"], ["benefício e ato legal", "habilitação", "memória do valor usufruído", "recibo Dirbi"]),
  rule("CPRB-REINF", "reform_benefits", "CPRB na EFD-Reinf e DCTFWeb", "monthly", "EFD-Reinf no dia 15 e DCTFWeb no último dia útil seguinte", "Apurar e confessar contribuição previdenciária sobre a receita quando aplicável.", "Valide atividade, receita excluída, transição legal e evento R-2060; não presuma enquadramento por CNAE isolado.", "critical", ["EFD-REINF", "DCTFWEB", "EFD-CONTRIB"], ["enquadramento CPRB", "R-2060", "DCTFWeb", "DARF"]),
  rule("RTC-2026-DOCUMENTS", "reform_benefits", "CBS e IBS nos documentos fiscais de 2026", "per_event", "Desde 1º de janeiro de 2026, conforme nota técnica do documento", "Destacar CBS/IBS e cumprir leiautes do ano-teste quando exigidos.", "Atualize emissor, valide XML e preserve evidência; a dispensa de recolhimento depende do cumprimento acessório.", "critical", ["RTC-2026"], ["XML autorizado", "versão da nota técnica", "validação CBS/IBS", "registro da dispensa"]),
  rule("PROFIT-DISTRIBUTION-REINF", "withholdings", "Lucros e dividendos na EFD-Reinf", "quarterly", "Regra própria do R-4010/R-4020 e prazo aplicável", "Informar rendimentos pagos ou creditados quando exigidos.", "Concilie deliberação, escrituração contábil, beneficiário, período e evento; não use isenção sem lucro comprovado.", "high", ["EFD-REINF", "ECD"], ["ata/deliberação", "balanço", "comprovante", "evento Reinf"]),
  rule("INACTIVITY-CHECK", "sped", "Obrigações em períodos sem movimento ou inativos", "monthly", "Antes de omitir qualquer declaração", "Evitar confundir ausência de receita com dispensa automática.", "Verifique o conceito de inatividade de cada obrigação e envie sem movimento quando exigido.", "high", ["RFB-OMISSIONS", "DCTFWEB", "EFD-CONTRIB"], ["balancete sem movimento", "consulta de obrigatoriedade", "recibo sem movimento"]),
];

const reason = (status: FederalPmeStatus, text: string) => ({ status, reason: text });

function applicability(code: string, profile: FederalPmeProfile): { status: FederalPmeStatus; reason: string } {
  const profitRegime = profile.regime === "real" || profile.regime === "presumed";
  switch (code) {
    case "PME-REGIME-LIMIT": return profile.regime === "mei" || profile.regime === "simples" ? reason("monitor", "O limite e as vedações determinam a permanência no regime.") : reason("monitor", "O porte PME não substitui a conferência do regime de IRPJ e das condições cadastrais.");
    case "MEI-DAS": case "MEI-DASN-SIMEI": return profile.regime === "mei" ? reason("required", "Obrigação própria do SIMEI.") : reason("not_applicable", "O perfil não está no SIMEI.");
    case "SIMPLES-PGDAS-D": case "SIMPLES-DAS": case "SIMPLES-DEFIS": case "SIMPLES-SEGREGATION": return profile.regime === "simples" ? reason("required", "Obrigação central do Simples Nacional.") : reason("not_applicable", "O perfil não é optante pelo Simples Nacional.");
    case "DCTFWEB-GENERAL": return profitRegime || profile.hasEmployees || profile.paysIndividuals || profile.hasServiceWithholdings || profile.hiresLaborAssignmentOrConstruction || profile.subjectToCprb || profile.hasFederalTaxesOutsideUnifiedRegime ? reason("required", "Há fonte de débito no eSocial, EFD-Reinf ou MIT.") : reason("conditional", "Confirme fatos geradores, débitos fora do DAS e necessidade de declaração sem movimento.");
    case "MIT-FEDERAL-TAXES": return profitRegime || profile.hasFederalTaxesOutsideUnifiedRegime ? reason("required", "Existem tributos federais fora do regime unificado a incluir no MIT.") : reason("conditional", "Só se aplica se houver débito federal que não chegue pelo eSocial ou Reinf.");
    case "EFD-REINF-R4000": return profile.hasServiceWithholdings || profile.paysIndividuals || profile.distributesProfits ? reason("required", "O perfil realiza pagamentos/rendimentos que exigem triagem da série R-4000.") : reason("conditional", "Ative quando houver pagamento, crédito ou retenção abrangida.");
    case "EFD-REINF-R2000": case "INSS-SERVICES": return profile.hiresLaborAssignmentOrConstruction ? reason("required", "Há cessão de mão de obra ou empreitada informada.") : reason("not_applicable", "Nenhuma cessão de mão de obra ou empreitada foi informada.");
    case "ESOCIAL-NONPERIODIC": case "ESOCIAL-PAYROLL": case "ESOCIAL-SST": case "FGTS-DIGITAL": return profile.hasEmployees ? reason("required", "A empresa possui empregados.") : reason("not_applicable", "O perfil não informou empregados.");
    case "PAYROLL-DCTFWEB": return profile.hasEmployees || profile.paysIndividuals ? reason("required", "Há folha ou pagamento a pessoa física com reflexo previdenciário/fiscal.") : reason("not_applicable", "Não há folha nem pagamento a pessoa física informado.");
    case "IRPJ-CSLL": case "PIS-COFINS": return profitRegime ? reason("required", "Tributos apurados fora do Simples/SIMEI.") : reason("not_applicable", "No perfil informado, a apuração principal integra o regime unificado, ressalvadas exceções.");
    case "IPI-TIPI": return profile.manufacturesOrImports ? reason("required", "A empresa industrializa ou importa mercadorias.") : reason("conditional", "Pode aplicar-se a estabelecimento equiparado ou operação específica; confirme a atividade.");
    case "WITHHOLDING-IRRF-CSRF": return profile.hasServiceWithholdings || profile.paysIndividuals ? reason("required", "Há pagamentos sujeitos à classificação de retenções.") : reason("conditional", "Ative quando houver pagamento sujeito à retenção.");
    case "EFD-CONTRIBUTIONS": return profitRegime ? reason("required", "Lucro real/presumido está, em regra, no campo da EFD-Contribuições.") : reason("not_applicable", "MEI/Simples é dispensado nos períodos abrangidos pelo regime, ressalvadas situações específicas.");
    case "ECD": return profile.regime === "real" ? reason("required", "O lucro real exige escrituração contábil completa.") : profile.regime === "presumed" ? profile.keepsFullAccounting ? reason("required", "O perfil informou escrituração contábil completa.") : reason("conditional", "Confirme a dispensa por Livro Caixa e demais exceções.") : reason("monitor", "O Simples é dispensado em regra, mas a contabilidade regular sustenta lucros, crédito e gestão.");
    case "ECF": return profitRegime ? reason("required", "Lucro real/presumido está no campo da ECF.") : reason("not_applicable", "Optantes pelo Simples são excepcionados da ECF.");
    case "DIGITAL-CERTIFICATE": return profitRegime || profile.hasEmployees || profile.hasServiceWithholdings || profile.hiresLaborAssignmentOrConstruction ? reason("required", "O conjunto de escriturações exige acesso e assinatura eletrônica controlados.") : reason("monitor", "Confirme a forma de acesso permitida ao MEI/Simples e mantenha procurações válidas.");
    case "DTE-MONITORING": return reason("required", profile.regime === "simples" || profile.regime === "mei" ? "O DTE-SN é obrigatório e a Caixa Postal também recebe comunicações em 2026." : "O DTE é automático e obrigatório para pessoas jurídicas desde janeiro de 2026.");
    case "DIRBI": return profile.usesListedTaxBenefits && (profile.regime !== "simples" || profile.subjectToCprb) ? reason("required", "Foi informado benefício listado e o perfil não está integralmente dispensado.") : profile.usesListedTaxBenefits ? reason("conditional", "Simples é, em regra, dispensado; CPRB e o benefício específico precisam ser verificados.") : reason("not_applicable", "Nenhum benefício fiscal listado foi informado.");
    case "CPRB-REINF": return profile.subjectToCprb ? reason("required", "A empresa informou sujeição à CPRB.") : reason("not_applicable", "O perfil não informou CPRB.");
    case "RTC-2026-DOCUMENTS": return profile.issuesFiscalDocuments ? reason("required", "A empresa emite documentos fiscais alcançados pelos leiautes de 2026.") : reason("conditional", "Confirme se algum fato gerador exige documento eletrônico com CBS/IBS.");
    case "PROFIT-DISTRIBUTION-REINF": return profile.distributesProfits ? reason("required", "O perfil informou distribuição de lucros/dividendos.") : reason("not_applicable", "Nenhuma distribuição foi informada.");
    case "INACTIVITY-CHECK": return profile.inactive ? reason("required", "O perfil foi marcado como inativo/sem movimento.") : reason("monitor", "Use antes de omitir declaração em qualquer mês sem movimento.");
    default: return reason("conditional", "Exige confirmação profissional do fato gerador.");
  }
}

export function assessFederalPme(profile: FederalPmeProfile) {
  const items: FederalPmeAssessmentItem[] = federalPmeRules.map((current) => ({ ...current, ...applicability(current.code, profile) }));
  const applicable = items.filter((item) => item.status !== "not_applicable");
  return {
    version: FEDERAL_PME_RULESET_VERSION,
    checkedAt: FEDERAL_PME_CHECKED_AT,
    profile,
    items,
    applicable,
    metrics: {
      totalCatalog: items.length,
      required: items.filter((item) => item.status === "required").length,
      conditional: items.filter((item) => item.status === "conditional").length,
      monitor: items.filter((item) => item.status === "monitor").length,
      excluded: items.filter((item) => item.status === "not_applicable").length,
      critical: applicable.filter((item) => item.risk === "critical").length,
      sourceCount: federalPmeSources.length,
    },
    disclaimer: "Mapa federal de conformidade, não calendário definitivo nem parecer. Vencimentos excepcionais, atividade, CNAE, município, estado, decisões judiciais, regimes especiais e fatos não informados exigem revisão profissional e consulta à agenda oficial.",
  };
}

export async function hashFederalPmeCatalog() {
  const content = JSON.stringify({ version: FEDERAL_PME_RULESET_VERSION, checkedAt: FEDERAL_PME_CHECKED_AT, sources: federalPmeSources, rules: federalPmeRules });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(content));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function parseFederalPmeProfile(value: unknown): FederalPmeProfile {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_profile");
  const input = value as Record<string, unknown>;
  if (![
    "mei", "simples", "presumed", "real",
  ].includes(String(input.regime))) throw new Error("invalid_regime");
  const booleanFields = ["hasEmployees", "paysIndividuals", "hasServiceWithholdings", "hiresLaborAssignmentOrConstruction", "manufacturesOrImports", "usesListedTaxBenefits", "hasFederalTaxesOutsideUnifiedRegime", "subjectToCprb", "issuesFiscalDocuments", "distributesProfits", "inactive", "keepsFullAccounting"] as const;
  for (const field of booleanFields) if (typeof input[field] !== "boolean") throw new Error(`invalid_${field}`);
  return { regime: input.regime as FederalPmeRegime, ...Object.fromEntries(booleanFields.map((field) => [field, input[field]])) } as FederalPmeProfile;
}

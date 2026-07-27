export const ACCOUNT_ONBOARDING_VERSION = "accountant-onboarding.v1";
export const ACCOUNT_ONBOARDING_STAGE_COUNT = 4;

export type OnboardingWorkspaceType = "individual" | "office";
export type OnboardingTarget =
  | "overview"
  | "companies"
  | "simulator"
  | "reviews"
  | "documents"
  | "team"
  | "intelligence"
  | "taxlab"
  | "coverage"
  | "expansion"
  | "rules"
  | "determination"
  | "academy";

export type OnboardingChecklistItem = {
  id: string;
  title: string;
  evidence: string;
  actionLabel: string;
  target: OnboardingTarget;
};

export type OnboardingModuleGuide = {
  code: string;
  title: string;
  target: OnboardingTarget;
  purpose: string;
  minimumFacts: string[];
  expectedDocuments: string[];
  explicitLimits: string[];
};

const sharedChecklist: OnboardingChecklistItem[] = [
  {
    id: "coverage-understood",
    title: "Entendi os três estados de cobertura",
    evidence: "Se houver uma pendência, o sistema não transforma referência ou triagem em conclusão.",
    actionLabel: "Ver cobertura",
    target: "coverage",
  },
  {
    id: "demo-reviewed",
    title: "Revisei o caso demonstrativo isolado",
    evidence: "A demonstração não cria cliente, não consome capacidade e não pode ser entregue.",
    actionLabel: "Abrir demonstração",
    target: "academy",
  },
  {
    id: "client-created",
    title: "Cadastrei ou conferi o primeiro cliente real",
    evidence: "Nome, regime e setor pertencem ao cliente correto; o CNPJ continua opcional.",
    actionLabel: "Abrir carteira",
    target: "companies",
  },
  {
    id: "documents-checked",
    title: "Separei fatos e documentos da análise",
    evidence: "A fonte da alíquota, a competência e os documentos usados precisam permanecer identificáveis.",
    actionLabel: "Abrir documentos",
    target: "documents",
  },
  {
    id: "first-version-saved",
    title: "Congelei a primeira versão com origem das premissas",
    evidence: "Salvar cria uma versão assinada; alterações posteriores exigem uma nova versão.",
    actionLabel: "Abrir análise",
    target: "simulator",
  },
  {
    id: "approval-flow-understood",
    title: "Entendi quem pode revisar e aprovar",
    evidence: "A aprovação assume responsabilidade pela versão congelada, não reescreve o cálculo.",
    actionLabel: "Revisar fluxo",
    target: "simulator",
  },
  {
    id: "delivery-flow-understood",
    title: "Entendi a entrega rastreável ao cliente",
    evidence: "Somente versão íntegra e aprovada pode gerar link; o link expira e pode ser revogado.",
    actionLabel: "Ver entregas",
    target: "simulator",
  },
];

const officeOnlyChecklist: OnboardingChecklistItem[] = [
  {
    id: "office-roles-understood",
    title: "Distribuí os papéis do escritório",
    evidence: "Preparador, revisor e administrador possuem permissões diferentes; quem preparou não faz a segunda revisão.",
    actionLabel: "Abrir equipe",
    target: "team",
  },
  {
    id: "review-queue-understood",
    title: "Testei a fila com responsável e prazo",
    evidence: "A rodada preserva designação, prazo, comentários, decisão e eventual pedido de correção.",
    actionLabel: "Abrir Central de Revisão",
    target: "reviews",
  },
];

export const onboardingTracks: Record<OnboardingWorkspaceType, OnboardingChecklistItem[]> = {
  individual: sharedChecklist,
  office: [
    ...sharedChecklist.slice(0, 4),
    officeOnlyChecklist[0],
    sharedChecklist[4],
    officeOnlyChecklist[1],
    ...sharedChecklist.slice(5),
  ],
};

export const onboardingModuleGuides: OnboardingModuleGuide[] = [
  {
    code: "OVERVIEW",
    title: "Visão geral",
    target: "overview",
    purpose: "Resumir o cliente selecionado e conduzir a próxima ação da carteira.",
    minimumFacts: ["cliente ativo correto", "última versão disponível", "estado de integridade da versão"],
    expectedDocuments: ["memória da última análise", "documentos vinculados ao trabalho"],
    explicitLimits: ["estimativa inicial não equivale a versão congelada", "gráfico de apoio não substitui a memória assinada"],
  },
  {
    code: "PORTFOLIO",
    title: "Clientes",
    target: "companies",
    purpose: "Separar cada contribuinte, seu regime e o histórico de trabalho.",
    minimumFacts: ["cliente correto", "regime tributário vigente", "setor ou atividade predominante"],
    expectedDocuments: ["comprovante cadastral quando necessário", "contrato ou escopo do atendimento"],
    explicitLimits: ["cadastro não valida situação fiscal", "CNPJ opcional não é prova de enquadramento"],
  },
  {
    code: "WORK_MODE",
    title: "Modo de trabalho e equipe",
    target: "team",
    purpose: "Definir se o fluxo é individual ou de escritório e separar responsabilidades.",
    minimumFacts: ["tipo da conta", "papel de cada usuário", "quem prepara e quem revisa"],
    expectedDocuments: ["política interna de revisão", "identificação profissional usada na aprovação"],
    explicitLimits: ["papel no sistema não comprova habilitação profissional", "modo escritório não é auditoria externa independente"],
  },
  {
    code: "SCENARIO",
    title: "Análise de impacto",
    target: "simulator",
    purpose: "Comparar premissas financeiras e preservar cada versão utilizada na decisão.",
    minimumFacts: ["receita e custos", "alíquotas atual e projetada", "ano-alvo", "origem das premissas"],
    expectedDocuments: ["apuração atual", "memória da alíquota projetada", "estrutura de custos", "contratos ou tabela de preços"],
    explicitLimits: ["é análise de impacto, não apuração fiscal", "alíquota informada não se torna oficial", "prévia não revisada não deve ser entregue"],
  },
  {
    code: "INTELLIGENCE",
    title: "Inteligência fiscal",
    target: "intelligence",
    purpose: "Extrair fatos da pergunta e localizar regras controladas sem IA.",
    minimumFacts: ["tributo", "produto ou serviço", "origem e destino", "regime", "finalidade da operação"],
    expectedDocuments: ["NCM/CEST ou item da LC 116", "documento fiscal", "norma citada pelo cliente quando houver"],
    explicitLimits: ["pergunta curta recebe pendências, não um número conclusivo", "busca não substitui classificação fiscal"],
  },
  {
    code: "LAB",
    title: "Laboratório fiscal",
    target: "taxlab",
    purpose: "Executar memórias determinísticas nos recortes já estruturados.",
    minimumFacts: ["módulo exato", "competência", "bases monetárias", "fatos obrigatórios do tributo"],
    expectedDocuments: ["apuração ou declaração de origem", "memória independente para comparação"],
    explicitLimits: ["caso ouro prova aritmética, não a aplicabilidade ao cliente", "módulo não suportado bloqueia a saída"],
  },
  {
    code: "DOCUMENTS",
    title: "Documentos",
    target: "documents",
    purpose: "Inspecionar NF-e, NFS-e e SPED localmente e vincular evidências ao trabalho.",
    minimumFacts: ["tipo do arquivo", "cliente e competência", "autorização e integridade quando aplicável"],
    expectedDocuments: ["XML autorizado", "arquivo SPED completo", "relatórios de origem"],
    explicitLimits: ["PDF ou comprovante isolado não substitui XML", "inspeção estrutural não confirma obrigação acessória transmitida"],
  },
  {
    code: "COVERAGE",
    title: "Cobertura nacional",
    target: "coverage",
    purpose: "Mostrar publicamente o que a plataforma consegue ou não concluir.",
    minimumFacts: ["tributo e jurisdição", "produto/serviço", "rota e vigência"],
    expectedDocuments: ["fonte oficial vigente", "classificação fiscal ou municipal"],
    explicitLimits: ["mapeamento nacional não significa alíquota interna final", "parcial nunca libera conclusão definitiva"],
  },
  {
    code: "EXPANSION",
    title: "Expansão fiscal",
    target: "expansion",
    purpose: "Acompanhar a fila técnica de novas regras, fontes e testes.",
    minimumFacts: ["item da fila", "estágio técnico", "evidência da evolução"],
    expectedDocuments: ["fonte oficial", "caso regressivo", "registro de alteração"],
    explicitLimits: ["meta interna não aumenta cobertura por si só", "catalogado não significa calculável"],
  },
  {
    code: "RULES",
    title: "Regras fiscais",
    target: "rules",
    purpose: "Consultar versões, vigências, fontes e casos de referência.",
    minimumFacts: ["versão da regra", "período de vigência", "jurisdição"],
    expectedDocuments: ["ato normativo primário", "orientação oficial complementar"],
    explicitLimits: ["regra em triagem ou referência não executa cálculo definitivo", "mudança normativa pode invalidar resultado anterior"],
  },
  {
    code: "DETERMINATION",
    title: "Apuração e Reforma Tributária",
    target: "determination",
    purpose: "Segregar CBS e IBS e projetar a transição de 2026 a 2033 com memória rastreável.",
    minimumFacts: ["valores contábeis atuais", "base tributável", "créditos", "ano e perfil da operação"],
    expectedDocuments: ["livros e apurações atuais", "DF-e", "premissas das alíquotas de referência"],
    explicitLimits: ["não produz valor jurídico líquido enquanto cobertura e conciliação estiverem incompletas", "regimes específicos não herdam a regra padrão"],
  },
  {
    code: "REVIEW",
    title: "Revisão e entrega",
    target: "reviews",
    purpose: "Conferir a versão congelada, assumir responsabilidade e entregar um artefato rastreável.",
    minimumFacts: ["integridade confirmada", "premissas conferidas", "responsável identificado", "escopo comunicado ao cliente"],
    expectedDocuments: ["registro profissional quando exigido pelo fluxo", "nota da decisão", "relatório final"],
    explicitLimits: ["aprovação não corrige premissa errada", "link não deve ser enviado sem conferir cliente e versão"],
  },
  {
    code: "ACADEMY",
    title: "Demonstrações",
    target: "academy",
    purpose: "Aprender a navegação e o fluxo sem usar dados de um cliente real.",
    minimumFacts: ["identificação visível de demonstração", "objetivo do capítulo", "limite do exemplo"],
    expectedDocuments: ["nenhum documento real é necessário", "use apenas os dados sintéticos exibidos"],
    explicitLimits: ["vídeo ou caso demonstrativo não comprova cobertura", "resultado da demonstração não deve ser entregue"],
  },
];

export const onboardingCoverageExplanation = [
  {
    status: "supported",
    label: "Suportado",
    meaning: "Todos os fatos e parâmetros obrigatórios do recorte foram atendidos.",
    consequence: "O módulo pode produzir a saída descrita, ainda sujeita ao fluxo de revisão e ao limite exibido.",
  },
  {
    status: "partial",
    label: "Parcial",
    meaning: "Existe regra ou referência útil, mas falta ao menos um fato, parâmetro ou etapa de validação.",
    consequence: "Pode orientar a investigação; não pode ser apresentado como conclusão definitiva.",
  },
  {
    status: "not_supported",
    label: "Não suportado",
    meaning: "O regime, produto, serviço, rota, vigência ou tratamento está fora do recorte controlado.",
    consequence: "Nenhum valor final deve ser calculado; encaminhe para tratamento externo.",
  },
] as const;

export const onboardingActionWarnings = {
  save: {
    title: "Antes de congelar a versão",
    checks: [
      "Confirme cliente, competência, regime e ano-alvo.",
      "Confira a origem de cada alíquota e valor monetário.",
      "Premissa declarada não equivale a regra oficial validada.",
      "Depois de salvar, correções devem gerar uma nova versão.",
    ],
  },
  approve: {
    title: "Antes de assumir responsabilidade",
    checks: [
      "Reabra a versão congelada e confira sua integridade.",
      "Resolva pendências e limites comunicados pelo módulo.",
      "Aprovar não altera nem corrige o cálculo salvo.",
      "No escritório, preparador e segundo revisor devem ser pessoas diferentes.",
    ],
  },
  deliver: {
    title: "Antes de liberar ao cliente",
    checks: [
      "Confirme cliente, versão e identidade de quem revisou.",
      "Explique premissas, cobertura e limitações no relatório.",
      "Não envie prévia, cenário parcial ou assinatura inválida.",
      "O link expira em 30 dias e deve ser revogado quando perder a finalidade.",
    ],
  },
} as const;

export const isolatedDemonstrationCase = {
  code: "DEMO-MARGIN-IMPACT-001",
  label: "DEMONSTRAÇÃO — Horizonte Autopeças",
  nature: "Projeção gerencial de margem; não é apuração fiscal.",
  coverage: "partial" as const,
  facts: [
    "Receita mensal declarada: R$ 100.000,00",
    "Carga atual declarada: 8,65%",
    "Carga projetada declarada: 13,45%",
    "Custos variáveis: 65% e custos fixos: R$ 10.000,00",
    "Ano-alvo: 2027",
  ],
  documents: [
    "apuração atual do cliente",
    "memória ou fonte da carga projetada",
    "balancete/estrutura de custos",
    "contrato ou tabela de preços",
  ],
  result: {
    currentTaxCents: 865_000,
    projectedTaxCents: 1_345_000,
    monthlyTaxDeltaCents: 480_000,
    currentMarginCents: 1_635_000,
    projectedMarginCents: 1_155_000,
  },
  limits: [
    "As alíquotas são premissas declaradas do exemplo.",
    "O caso não classifica NCM/CEST, não resolve ICMS-ST e não produz tributo a recolher.",
    "Nada desta demonstração é salvo na carteira ou disponibilizado ao cliente.",
  ],
};

export function onboardingTrackFor(workspaceType: OnboardingWorkspaceType) {
  return onboardingTracks[workspaceType];
}

export function sanitizeOnboardingCompletedItems(workspaceType: OnboardingWorkspaceType, values: unknown) {
  if (!Array.isArray(values)) return [];
  const allowed = new Set(onboardingTrackFor(workspaceType).map((item) => item.id));
  return Array.from(new Set(values.filter((value): value is string => typeof value === "string" && allowed.has(value))));
}

export function onboardingCompletionPercentage(workspaceType: OnboardingWorkspaceType, completedItemIds: readonly string[]) {
  const total = onboardingTrackFor(workspaceType).length;
  const completed = sanitizeOnboardingCompletedItems(workspaceType, completedItemIds).length;
  return total === 0 ? 100 : Math.round((completed / total) * 100);
}

export function onboardingIsComplete(workspaceType: OnboardingWorkspaceType, completedItemIds: readonly string[]) {
  return onboardingCompletionPercentage(workspaceType, completedItemIds) === 100;
}

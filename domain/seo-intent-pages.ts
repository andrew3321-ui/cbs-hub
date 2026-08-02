export type SeoIntentPage = {
  slug: string;
  campaign: string;
  title: string;
  description: string;
  eyebrow: string;
  headline: string;
  lead: string;
  primaryKeyword: string;
  relatedKeywords: string[];
  intent: string;
  proofLabel: string;
  proofValue: string;
  proofText: string;
  benefits: Array<{ title: string; text: string }>;
  workflow: Array<{ title: string; text: string }>;
  facts: string[];
  faqs: Array<{ question: string; answer: string }>;
  sources: Array<{ label: string; url: string }>;
};

export const seoIntentPages = {
  "calculadora-reforma-tributaria": {
    slug: "calculadora-reforma-tributaria",
    campaign: "calculadora_reforma_tributaria",
    title: "Calculadora da Reforma Tributária para empresas | CBSHub",
    description: "Estruture cenários de CBS e IBS entre 2026 e 2033 com memória de cálculo, fontes oficiais, versão e pendências explícitas.",
    eyebrow: "REFORMA TRIBUTÁRIA · CÁLCULO RASTREÁVEL",
    headline: "Calcule o impacto da Reforma Tributária sem perder a origem de cada premissa.",
    lead: "O CBSHub organiza fatos, executa memórias determinísticas e preserva a versão usada na análise. O resultado mostra o que foi calculado e o que ainda impede uma conclusão.",
    primaryKeyword: "calculadora reforma tributária",
    relatedKeywords: ["calculadora CBS IBS", "impacto reforma tributária empresa", "transição tributária 2026 2033"],
    intent: "Avaliar uma ferramenta para calcular cenários da Reforma com evidência técnica.",
    proofLabel: "JANELA MODELADA",
    proofValue: "2026 → 2033",
    proofText: "Cronograma anual separado por tributo e versão, sem converter premissa incompleta em imposto devido.",
    benefits: [
      { title: "Memória reproduzível", text: "Entradas, fórmulas, centavos e versão ficam unidos no mesmo snapshot." },
      { title: "Fontes na análise", text: "A memória aponta a base normativa e a data de conferência utilizada." },
      { title: "Limites visíveis", text: "Dados ausentes e regimes não cobertos bloqueiam o total em vez de gerar falsa precisão." },
    ],
    workflow: [
      { title: "Informe a operação", text: "Regime, receita, setor, período e premissas relevantes." },
      { title: "Execute o cenário", text: "O motor calcula apenas o recorte suportado e separa CBS, IBS e tributos legados." },
      { title: "Revise e versione", text: "O contador confere fontes e pendências antes de congelar o relatório." },
    ],
    facts: ["Cálculo inteiro em centavos", "Transição anual explícita", "Snapshot e hash da memória", "Sem valor jurídico quando faltam fatos"],
    faqs: [
      { question: "A calculadora informa o imposto definitivo a pagar?", answer: "Somente quando o recorte possui todos os fatos e regras necessários. Em cenários incompletos, o CBSHub apresenta a memória parcial e bloqueia a conclusão." },
      { question: "Ela substitui a calculadora oficial?", answer: "Não. A integração e a reconciliação com referências oficiais servem como evidência; a análise profissional continua identificando escopo, fonte e versão." },
      { question: "Posso comparar anos da transição?", answer: "Sim. A base modela o cronograma de 2026 a 2033 e mantém cada livro tributário separado." },
    ],
    sources: [
      { label: "Lei Complementar nº 214/2025", url: "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214compilado.htm" },
      { label: "Reforma Tributária do Consumo · Receita Federal", url: "https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/reforma-tributaria-do-consumo" },
    ],
  },
  "cbs-ibs-contadores": {
    slug: "cbs-ibs-contadores",
    campaign: "cbs_ibs_contadores",
    title: "CBS e IBS para contadores: análise e memória | CBSHub",
    description: "Organize débitos, créditos, transição e pendências de CBS e IBS com livros separados, fontes e memória versionada.",
    eyebrow: "CBS + IBS · APURAÇÃO ASSISTIDA",
    headline: "CBS e IBS organizados para revisão contábil, não apenas somados em uma planilha.",
    lead: "Estruture débitos, créditos, ajustes e extinções em livros separados. Créditos pendentes não reduzem o saldo e o ano-teste não vira valor exigível sem respaldo.",
    primaryKeyword: "CBS e IBS para contadores",
    relatedKeywords: ["apuração CBS IBS", "créditos CBS IBS", "ano teste reforma tributária 2026"],
    intent: "Entender e operar a nova apuração de CBS e IBS com controle profissional.",
    proofLabel: "CONTROLE CENTRAL",
    proofValue: "CBS ≠ IBS",
    proofText: "Livros, créditos, ajustes e saldos permanecem segregados durante toda a memória.",
    benefits: [
      { title: "Livros separados", text: "CBS e IBS não são compensados entre si por conveniência operacional." },
      { title: "Crédito condicionado", text: "Elegibilidade, documento e conciliação precisam estar comprovados para reduzir saldo." },
      { title: "Competência preservada", text: "Cada período fecha em nova versão; correções não reescrevem silenciosamente o histórico." },
    ],
    workflow: [
      { title: "Classifique os eventos", text: "Débitos, créditos, ajustes e formas de extinção entram em trilhas distintas." },
      { title: "Concilie evidências", text: "Documentos, classificação e regras de crédito são confrontados antes do saldo." },
      { title: "Feche com ressalvas", text: "Pendências materiais permanecem no relatório e impedem conclusão indevida." },
    ],
    facts: ["Débitos e créditos separados", "Crédito pendente excluído do saldo", "Competência versionada", "Ano-teste tratado com limite explícito"],
    faqs: [
      { question: "O sistema mistura CBS e IBS em um total único?", answer: "Não. Os dois tributos permanecem em livros e memórias separados." },
      { question: "Um crédito informado reduz automaticamente o saldo?", answer: "Não. O crédito precisa cumprir os fatos de elegibilidade, documentação e conciliação definidos para o cenário." },
      { question: "Como o CBSHub trata 2026?", answer: "Como período de teste sujeito às condições oficiais. O sistema não transforma automaticamente os destaques de teste em imposto jurídico a recolher." },
    ],
    sources: [
      { label: "Entenda a Reforma Tributária do Consumo", url: "https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/reforma-tributaria-do-consumo/entenda" },
      { label: "Orientações oficiais para 2026", url: "https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/reforma-tributaria-do-consumo/orientacoes-2026" },
    ],
  },
  "icms-st-contadores": {
    slug: "icms-st-contadores",
    campaign: "icms_st_contadores",
    title: "ICMS-ST para contadores e escritórios | CBSHub",
    description: "Estruture operações de ICMS-ST por produto, NCM, CEST, origem, destino, vigência e método de base com memória auditável.",
    eyebrow: "ICMS-ST · OPERAÇÃO EVIDENCIADA",
    headline: "ICMS-ST começa pela operação correta — não por uma alíquota isolada.",
    lead: "O CBSHub exige produto, classificação, rota, vigência, responsabilidade e método de base antes de liberar uma memória. MVA, PMPF e exceções não são intercambiáveis.",
    primaryKeyword: "ICMS-ST para contadores",
    relatedKeywords: ["cálculo ICMS-ST", "MVA ajustada", "ICMS-ST autopeças bebidas"],
    intent: "Analisar operações recorrentes de ICMS-ST com critérios e fontes por rota.",
    proofLabel: "RECORTES PROFUNDOS",
    proofValue: "rota + produto",
    proofText: "Autopeças e bebidas possuem trilhas prioritárias sem emprestar parâmetro entre estado, item ou período.",
    benefits: [
      { title: "Produto identificado", text: "NCM, CEST, descrição e uso orientam o enquadramento antes da conta." },
      { title: "Rota e vigência", text: "Origem, destino e período selecionam o instrumento e a regra aplicável." },
      { title: "Base sem atalhos", text: "PMPF, pauta, MVA original ou ajustada seguem a ordem e as condições da fonte." },
    ],
    workflow: [
      { title: "Confirme o item", text: "Classificação fiscal, segmento, finalidade e documentos da mercadoria." },
      { title: "Defina a rota", text: "Origem, destino, papéis dos contribuintes e vigência da operação." },
      { title: "Gere a memória", text: "Base, imposto próprio e ST são explicados linha a linha; blockers ficam visíveis." },
    ],
    facts: ["NCM e CEST obrigatórios", "Vigência por rota", "MVA e PMPF não intercambiáveis", "Cálculo bloqueado sem fatos mínimos"],
    faqs: [
      { question: "Basta informar origem e destino para calcular ICMS-ST?", answer: "Não. Produto, NCM/CEST, finalidade, papéis das partes, vigência e método de base podem alterar ou impedir a conclusão." },
      { question: "O CBSHub usa a mesma MVA em qualquer estado?", answer: "Não. Um parâmetro só é usado no produto, rota e período para os quais foi estruturado." },
      { question: "Quais segmentos possuem maior profundidade?", answer: "A base atual prioriza operações recorrentes de autopeças e bebidas, sempre exibindo se o recorte está suportado, parcial ou não suportado." },
    ],
    sources: [
      { label: "Legislação ICMS · CONFAZ", url: "https://www.confaz.fazenda.gov.br/legislacao" },
      { label: "Convênio ICMS 142/2018", url: "https://www.confaz.fazenda.gov.br/legislacao/convenios/2018/CV142_18" },
    ],
  },
  "inteligencia-tributaria-escritorios": {
    slug: "inteligencia-tributaria-escritorios",
    campaign: "inteligencia_tributaria_escritorios",
    title: "Inteligência tributária para escritórios contábeis | CBSHub",
    description: "Centralize pesquisa fiscal, cálculos, fontes, revisão e dossiês para toda a carteira do escritório contábil.",
    eyebrow: "ESCRITÓRIO CONTÁBIL · CONTROLE EM EQUIPE",
    headline: "Transforme conhecimento tributário em um processo que o escritório consegue repetir e revisar.",
    lead: "Da dúvida inicial ao dossiê entregue: regras, fatos, cálculos, documentos e aprovações convivem em uma única trilha por empresa.",
    primaryKeyword: "inteligência tributária para escritórios contábeis",
    relatedKeywords: ["software tributário contabilidade", "pesquisa fiscal para contadores", "gestão tributária escritório"],
    intent: "Selecionar uma plataforma tributária para organizar a operação do escritório.",
    proofLabel: "FLUXO PROFISSIONAL",
    proofValue: "preparar → revisar",
    proofText: "O trabalho identifica quem preparou, quem revisou e qual versão chegou ao cliente.",
    benefits: [
      { title: "Carteira centralizada", text: "Empresas, cenários, documentos e pendências permanecem separados por cliente." },
      { title: "Pesquisa com contexto", text: "A resposta exige fatos mínimos e aponta fonte, recorte e limites da conclusão." },
      { title: "Segregação de funções", text: "Preparação, revisão e entrega registram identidade, momento e versão." },
    ],
    workflow: [
      { title: "Organize a carteira", text: "Cadastre empresas e distribua o trabalho por responsabilidade." },
      { title: "Produza a análise", text: "Use inteligência fiscal, laboratório e documentos no mesmo contexto." },
      { title: "Entregue com controle", text: "Aprovação e compartilhamento preservam autoria, fontes e histórico." },
    ],
    facts: ["Modo individual e escritório", "Revisão segregada", "Fontes oficiais vinculadas", "Histórico por empresa"],
    faqs: [
      { question: "O CBSHub usa inteligência artificial para decidir o tributo?", answer: "Não. A plataforma usa regras determinísticas, fatos estruturados e fontes versionadas. O contador continua responsável pela revisão profissional." },
      { question: "Posso trabalhar sozinho?", answer: "Sim. O mesmo plano atende o profissional independente e o escritório; o modo colaborativo adiciona preparadores, revisores e administradores." },
      { question: "As empresas da carteira ficam misturadas?", answer: "Não. Dados, documentos, análises e permissões são separados por workspace e empresa." },
    ],
    sources: [
      { label: "Metodologia pública do CBSHub", url: "https://cbshub.com.br/metodologia" },
      { label: "Política de privacidade", url: "https://cbshub.com.br/privacidade" },
    ],
  },
  "relatorios-fiscais-rastreaveis": {
    slug: "relatorios-fiscais-rastreaveis",
    campaign: "relatorios_fiscais_rastreaveis",
    title: "Relatórios fiscais rastreáveis para clientes | CBSHub",
    description: "Gere relatórios fiscais com premissas, memória, fontes, pendências, revisão responsável, hash e histórico de versões.",
    eyebrow: "RELATÓRIO FISCAL · VERSÃO E RESPONSABILIDADE",
    headline: "Entregue uma conclusão que mostra de onde veio — e qual versão foi aprovada.",
    lead: "O relatório conecta premissas, memória, fontes e revisão. Alterações relevantes geram nova versão em vez de reescrever silenciosamente o documento entregue.",
    primaryKeyword: "relatórios fiscais rastreáveis",
    relatedKeywords: ["relatório tributário para cliente", "dossiê fiscal", "memória de cálculo tributária"],
    intent: "Padronizar relatórios tributários profissionais e auditáveis para clientes.",
    proofLabel: "INTEGRIDADE DA ENTREGA",
    proofValue: "snapshot + hash",
    proofText: "Entradas e resultados congelados permitem reproduzir a memória da versão aprovada.",
    benefits: [
      { title: "Premissas declaradas", text: "Cada dado usado possui origem, período e responsável identificados." },
      { title: "Memória ligada à fonte", text: "Fórmulas e referências acompanham o resultado, não ficam em arquivos separados." },
      { title: "Entrega revogável", text: "Links públicos são controlados e uma correção cria nova versão preservando a anterior." },
    ],
    workflow: [
      { title: "Congele a análise", text: "O servidor recalcula e registra entradas, resultados e versões dos motores." },
      { title: "Revise a versão", text: "Pendências, evidências e responsabilidade são conferidas antes da aprovação." },
      { title: "Compartilhe com o cliente", text: "A entrega usa link rastreável e pode ser revogada sem apagar o histórico." },
    ],
    facts: ["Snapshot imutável", "Hash SHA-256", "Aprovação identificada", "Link público revogável"],
    faqs: [
      { question: "O cliente consegue alterar o relatório?", answer: "Não. A entrega pública representa uma versão aprovada. Correções são feitas em uma nova versão pelo escritório." },
      { question: "O relatório registra quem revisou?", answer: "Sim. O fluxo registra preparação, revisão, aprovação e entrega conforme o modo de trabalho configurado." },
      { question: "É possível revogar um link compartilhado?", answer: "Sim. O acesso pode ser revogado sem apagar a trilha da versão que foi produzida." },
    ],
    sources: [
      { label: "Metodologia e controles do CBSHub", url: "https://cbshub.com.br/metodologia" },
      { label: "Termos de uso", url: "https://cbshub.com.br/termos" },
    ],
  },
} as const satisfies Record<string, SeoIntentPage>;

export type SeoIntentSlug = keyof typeof seoIntentPages;

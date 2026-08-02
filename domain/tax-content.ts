export const TAX_CONTENT_VERSION = "tax-content.v1.0.0";
export const TAX_CONTENT_REVIEW_WARNING_DAYS = 14;

export type TaxContentFreshness = "current" | "review_due" | "stale";

export type TaxContentSource = {
  code: string;
  title: string;
  publisher: string;
  url: string;
  effectiveFrom: string;
  checkedAt: string;
};

export type TaxContentTopic = {
  slug: string;
  tax: "Reforma Tributária" | "ICMS/ST" | "ISS" | "Simples Nacional" | "PIS/Cofins" | "Retenções" | "IPI/TIPI";
  operation: string;
  audience: string[];
  title: string;
  description: string;
  eyebrow: string;
  headline: string;
  summary: string;
  version: string;
  reviewedAt: string;
  nextReviewAt: string;
  effectiveWindow: string;
  keyFacts: Array<{ title: string; detail: string }>;
  decisionPath: Array<{ title: string; detail: string }>;
  example: { title: string; facts: string[]; outcome: string; toolHref: string; toolLabel: string };
  limits: string[];
  sources: TaxContentSource[];
  history: Array<{ version: string; date: string; change: string }>;
};

const checkedAt = "2026-08-01";

export const taxContentAuthor = {
  name: "CBSHub — Engenharia de regras fiscais",
  role: "Autoria técnica institucional e curadoria de fontes oficiais",
  type: "Organization",
} as const;

export const taxContentTopics = {
  "reforma-tributaria-2026-2033": {
    slug: "reforma-tributaria-2026-2033",
    tax: "Reforma Tributária",
    operation: "Transição do consumo entre 2026 e 2033",
    audience: ["contadores", "tributaristas", "escritórios contábeis"],
    title: "Reforma Tributária 2026–2033: guia técnico para contadores | CBSHub",
    description: "Guia versionado da transição para CBS e IBS entre 2026 e 2033, com fatos mínimos, fontes oficiais, limites e caminho de análise no CBSHub.",
    eyebrow: "GUIA CENTRAL · REFORMA TRIBUTÁRIA",
    headline: "A transição de 2026 a 2033 exige livros separados, vigência e fatos — não uma taxa única.",
    summary: "A Emenda Constitucional nº 132/2023 criou a arquitetura constitucional do novo modelo, e a Lei Complementar nº 214/2025 instituiu IBS, CBS e Imposto Seletivo. O cronograma precisa ser lido por ano, operação e regime. Este guia organiza a triagem; qualquer valor depende da regra vigente e dos fatos documentados.",
    version: "rtc-guide.v1.0.0",
    reviewedAt: checkedAt,
    nextReviewAt: "2026-08-16",
    effectiveWindow: "Transição constitucional e legal de 2026 a 2033; atos posteriores podem alterar etapas e obrigações.",
    keyFacts: [
      { title: "2026 é ano de teste", detail: "Destaques e dispensas dependem do atendimento às condições oficiais. O teste não deve ser promovido automaticamente a saldo exigível." },
      { title: "CBS e IBS são livros distintos", detail: "Débitos, créditos, ajustes e formas de extinção permanecem separados; não existe compensação cruzada por conveniência." },
      { title: "Transição é anual", detail: "Tributos novos e legados mudam de peso ao longo do cronograma. A versão do ano integra a memória de cálculo." },
      { title: "Regimes específicos exigem trilha própria", detail: "Financeiro, combustíveis, imóveis e outros recortes não herdam a fórmula geral sem classificação e ato aplicável." },
    ],
    decisionPath: [
      { title: "Fixe período e operação", detail: "Ano, competência, local, partes, documento e natureza econômica precisam estar explícitos." },
      { title: "Classifique o regime", detail: "Regime geral, diferenciado, específico, favorecido ou hipótese de não incidência seguem memórias independentes." },
      { title: "Separe débitos e créditos", detail: "Crédito só reduz saldo quando elegibilidade, documento e apropriação estiverem comprovados." },
      { title: "Reconcilie a versão", detail: "A memória registra fonte, vigência, fórmula, arredondamento, pendências e divergências com a referência oficial." },
    ],
    example: {
      title: "Comparação controlada de uma empresa de serviços",
      facts: ["ano de 2027", "regime informado", "receita e custos documentados", "sem alíquota de referência presumida"],
      outcome: "O CBSHub separa o cenário atual do projetado, mostra a memória reproduzível e bloqueia o total quando um parâmetro legal ainda não foi publicado ou confirmado.",
      toolHref: "/calculadora-reforma-tributaria",
      toolLabel: "Conhecer a calculadora rastreável",
    },
    limits: ["Não substitui a calculadora oficial nem orientação vinculante.", "Alíquotas de referência pendentes não podem ser estimadas como definitivas.", "Mudança normativa detectada exige nova versão antes de alterar cálculo."],
    sources: [
      { code: "EC-132-2023", title: "Emenda Constitucional nº 132/2023", publisher: "Presidência da República", url: "https://www.planalto.gov.br/ccivil_03/constituicao/emendas/emc/emc132.htm", effectiveFrom: "2023-12-20", checkedAt },
      { code: "LC-214-2025", title: "Lei Complementar nº 214/2025 — texto compilado", publisher: "Presidência da República", url: "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214compilado.htm", effectiveFrom: "2025-01-16", checkedAt },
      { code: "RFB-RTC", title: "Reforma Tributária do Consumo", publisher: "Receita Federal", url: "https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/reforma-tributaria-do-consumo", effectiveFrom: "2026-01-01", checkedAt },
    ],
    history: [{ version: "1.0.0", date: checkedAt, change: "Primeira edição: cronograma, livros, gates de crédito e limites da transição." }],
  },
  "icms-st-operacoes": {
    slug: "icms-st-operacoes",
    tax: "ICMS/ST",
    operation: "Substituição tributária em operações com mercadorias",
    audience: ["contadores", "especialistas em ICMS", "escritórios com varejo e distribuição"],
    title: "ICMS-ST: produto, rota, MVA e responsabilidade | CBSHub",
    description: "Guia técnico de ICMS-ST por NCM, CEST, segmento, origem, destino, vigência, responsabilidade e método de base, sem alíquota isolada.",
    eyebrow: "GUIA PILAR · ICMS/ST",
    headline: "ICMS-ST só fecha quando produto, rota, responsabilidade e base pertencem ao mesmo recorte.",
    summary: "O Convênio ICMS 142/2018 organiza normas gerais e segmentos sujeitos à substituição tributária, mas protocolos, convênios e legislação do destino determinam a aplicação concreta. NCM ou CEST isolado não prova sujeição, MVA ou responsabilidade. A análise também precisa documentar origem, destino, operação, regime, período e eventual benefício antes de produzir memória de cálculo.",
    version: "icms-st-guide.v1.0.0",
    reviewedAt: checkedAt,
    nextReviewAt: "2026-09-01",
    effectiveWindow: "Referência nacional vigente; aplicação depende dos atos e da vigência de cada UF e rota.",
    keyFacts: [
      { title: "NCM e CEST não bastam", detail: "Descrição, segmento, finalidade e enquadramento no ato precisam convergir." },
      { title: "A direção da rota importa", detail: "SP→MG não autoriza reutilizar parâmetros em MG→SP ou em outro destino." },
      { title: "Base tem ordem jurídica", detail: "PMPF, preço tabelado, pauta e MVA não são alternativas livres; a fonte define prioridade e condições." },
      { title: "Responsabilidade é um fato", detail: "Remetente, destinatário, substituto e exceções do acordo devem ser confirmados antes do cálculo." },
    ],
    decisionPath: [
      { title: "Identifique a mercadoria", detail: "Descrição completa, NCM de oito dígitos, CEST, embalagem, volume e uso." },
      { title: "Determine a operação", detail: "Origem, destino, CFOP, contribuinte, revenda, consumidor final e período." },
      { title: "Localize o instrumento", detail: "Convênio, protocolo e norma estadual vigente precisam cobrir produto e direção." },
      { title: "Calcule sem empréstimo", detail: "Base, ICMS próprio, MVA ajustada, ST e FCP usam somente parâmetros do recorte comprovado." },
    ],
    example: {
      title: "Autopeça em operação interestadual",
      facts: ["NCM e CEST exatos", "origem e destino definidos", "revenda entre contribuintes", "vigência documentada"],
      outcome: "A plataforma informa se a rota está suportada, parcial ou não suportada e mantém o cálculo bloqueado quando falta MVA, alíquota interna, FCP ou responsabilidade.",
      toolHref: "/icms-st-contadores",
      toolLabel: "Ver o fluxo de ICMS-ST",
    },
    limits: ["Não há cobertura automática nacional por similaridade de NCM.", "Benefício, isenção, antecipação e regime especial exigem regra dedicada.", "Parâmetro estadual vencido rebaixa o conteúdo e bloqueia a memória."],
    sources: [
      { code: "CONV-142-2018", title: "Convênio ICMS 142/2018", publisher: "CONFAZ", url: "https://www.confaz.fazenda.gov.br/legislacao/convenios/2018/CV142_18", effectiveFrom: "2019-01-01", checkedAt },
      { code: "CONFAZ-LEG", title: "Legislação nacional de ICMS", publisher: "CONFAZ", url: "https://www.confaz.fazenda.gov.br/legislacao", effectiveFrom: "1988-01-01", checkedAt },
    ],
    history: [{ version: "1.0.0", date: checkedAt, change: "Primeira edição: gates de produto, rota, responsabilidade e método de base." }],
  },
  "iss-servicos-municipios": {
    slug: "iss-servicos-municipios",
    tax: "ISS",
    operation: "Prestação e tomada de serviços por município",
    audience: ["contadores", "departamentos fiscais", "escritórios com prestadores de serviços"],
    title: "ISS: local de incidência, código e retenção municipal | CBSHub",
    description: "Guia técnico de ISS com item da LC 116, local de incidência, município competente, código local, alíquota, retenção, deduções e vigência.",
    eyebrow: "GUIA PILAR · ISS",
    headline: "No ISS, a faixa nacional não substitui o código, a lei e a vigência do município competente.",
    summary: "A Lei Complementar nº 116/2003 traz normas gerais e a lista de serviços. A conclusão exige identificar o item, o local de incidência e a legislação municipal vigente. Cadastro local, retenção e deduções podem variar e não devem ser inferidos pela descrição comercial.",
    version: "iss-guide.v1.0.0",
    reviewedAt: checkedAt,
    nextReviewAt: "2026-09-01",
    effectiveWindow: "Norma geral nacional vigente; códigos, alíquotas e obrigações dependem da lei municipal atual.",
    keyFacts: [
      { title: "Item nacional e código local são diferentes", detail: "A lista da LC 116 orienta a incidência; cada município pode usar código operacional próprio." },
      { title: "Local de incidência precisa ser testado", detail: "A regra geral e as exceções do art. 3º devem ser confrontadas com o serviço e as partes." },
      { title: "Retenção depende de hipótese", detail: "Tomador, prestador, cadastro e lei municipal participam da decisão; não se presume retenção." },
      { title: "Deduções exigem base legal", detail: "Materiais, subempreitadas e outras reduções só entram quando a hipótese e a prova forem específicas." },
    ],
    decisionPath: [
      { title: "Descreva o serviço real", detail: "Contrato, nota, execução e resultado prevalecem sobre um rótulo genérico." },
      { title: "Enquadre o item", detail: "Selecione o item da lista nacional e o código municipal correspondente." },
      { title: "Determine o município", detail: "Aplique regra geral e exceções de local, considerando estabelecimento e local da execução." },
      { title: "Confirme valor e obrigação", detail: "Alíquota, retenção, base, deduções, cadastro e vencimento devem vir da fonte municipal vigente." },
    ],
    example: {
      title: "Consultoria entre empresas de municípios distintos",
      facts: ["serviço e subitem confirmados", "prestador e tomador identificados", "local da execução conhecido", "leis municipais vigentes"],
      outcome: "O CBSHub separa a triagem nacional da decisão municipal e bloqueia a alíquota quando código, retenção ou vigência local não estão comprovados.",
      toolHref: "/app",
      toolLabel: "Abrir Inteligência Fiscal",
    },
    limits: ["A faixa legal nacional não é alíquota municipal automática.", "NFS-e não substitui o teste jurídico de incidência.", "Município sem fonte vigente permanece parcial, mesmo que exista cadastro histórico."],
    sources: [
      { code: "LC-116-2003", title: "Lei Complementar nº 116/2003", publisher: "Presidência da República", url: "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp116.htm", effectiveFrom: "2003-08-01", checkedAt },
      { code: "NFSE-NACIONAL", title: "Documentação técnica da NFS-e padrão nacional", publisher: "Portal Nacional da NFS-e", url: "https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica", effectiveFrom: "2022-01-01", checkedAt },
    ],
    history: [{ version: "1.0.0", date: checkedAt, change: "Primeira edição: item, local, código municipal, retenção e deduções." }],
  },
  "simples-nacional-apuracao": {
    slug: "simples-nacional-apuracao",
    tax: "Simples Nacional",
    operation: "Segregação de receitas, anexo e fator R",
    audience: ["contadores de PMEs", "departamentos de apuração", "escritórios contábeis"],
    title: "Simples Nacional: segregação, anexos e fator R | CBSHub",
    description: "Guia técnico do Simples Nacional por atividade, receita, segregação, anexo, fator R, sublimite, retenções e receitas monofásicas ou sujeitas a ST.",
    eyebrow: "GUIA PILAR · SIMPLES NACIONAL",
    headline: "A alíquota efetiva do Simples começa na receita segregada — não no faturamento total isolado.",
    summary: "A Lei Complementar nº 123/2006 institui o regime e define sua estrutura. A apuração depende da atividade, receita bruta acumulada, anexo e segregações. Receitas monofásicas, substituição tributária, exportação e fator R exigem fatos próprios antes do PGDAS-D.",
    version: "simples-guide.v1.0.0",
    reviewedAt: checkedAt,
    nextReviewAt: "2026-09-01",
    effectiveWindow: "Regime vigente; tabelas, resoluções do CGSN e efeitos da Reforma devem ser verificados por competência.",
    keyFacts: [
      { title: "Receita precisa ser segregada", detail: "Comércio, indústria, serviços, exportação, ST e tributação monofásica não compartilham o mesmo tratamento." },
      { title: "Anexo depende da atividade", detail: "CNAE auxilia, mas o serviço efetivamente prestado e as vedações legais definem o enquadramento." },
      { title: "Fator R usa período e folha corretos", detail: "A razão entre folha e receita dos períodos legais precisa de dados completos e reconciliados." },
      { title: "Sublimite separa ICMS e ISS", detail: "Excesso de sublimite pode retirar ICMS/ISS do recolhimento unificado sem excluir os demais tributos." },
    ],
    decisionPath: [
      { title: "Confirme opção e vedações", detail: "Situação cadastral, sócios, atividade e débitos podem impedir ou alterar o tratamento." },
      { title: "Classifique cada receita", detail: "Natureza, atividade, mercado interno, exportação, ST, monofásico e retenção ficam em livros próprios." },
      { title: "Calcule RBT12 e fator R", detail: "Período, início de atividade, folha e encargos precisam fechar com a competência." },
      { title: "Reconcilie com PGDAS-D", detail: "A memória da plataforma deve explicar divergências, não substituir silenciosamente a declaração oficial." },
    ],
    example: {
      title: "Empresa com comércio e serviço",
      facts: ["receitas separadas por atividade", "RBT12 reconciliada", "fator R documentado", "receitas sujeitas a ST identificadas"],
      outcome: "O motor calcula trilhas por anexo e preserva blockers quando a atividade, a folha ou a segregação não fecham.",
      toolHref: "/app",
      toolLabel: "Abrir Apuração Fiscal",
    },
    limits: ["CNAE não substitui a atividade efetivamente exercida.", "O resultado precisa ser reconciliado com o PGDAS-D.", "Receita sem segregação segura bloqueia a alíquota efetiva por atividade."],
    sources: [
      { code: "LC-123-2006", title: "Lei Complementar nº 123/2006", publisher: "Presidência da República", url: "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm", effectiveFrom: "2007-07-01", checkedAt },
      { code: "SIMPLES-PORTAL", title: "Portal do Simples Nacional", publisher: "Receita Federal e CGSN", url: "https://www8.receita.fazenda.gov.br/SimplesNacional/", effectiveFrom: "2007-07-01", checkedAt },
    ],
    history: [{ version: "1.0.0", date: checkedAt, change: "Primeira edição: segregação, anexos, fator R, sublimite e reconciliação." }],
  },
  "pis-cofins-regimes-creditos": {
    slug: "pis-cofins-regimes-creditos",
    tax: "PIS/Cofins",
    operation: "Débitos, créditos e tratamentos especiais",
    audience: ["contadores", "analistas fiscais", "tributaristas federais"],
    title: "PIS e Cofins: regimes, créditos e tratamentos especiais | CBSHub",
    description: "Guia técnico de PIS/Cofins cumulativo e não cumulativo, créditos, monofásico, alíquota zero, suspensão, importação e transição para CBS.",
    eyebrow: "GUIA PILAR · PIS/COFINS",
    headline: "PIS/Cofins exige separar regime, receita, produto e crédito antes de aplicar qualquer percentual.",
    summary: "As Leis nº 10.637/2002 e 10.833/2003 estruturam a não cumulatividade, enquanto a Lei nº 9.718/1998 e regras específicas alcançam outras receitas e regimes. Tratamentos monofásicos, alíquota zero e créditos dependem de NCM, papel na cadeia, documento e vigência.",
    version: "pis-cofins-guide.v1.0.0",
    reviewedAt: checkedAt,
    nextReviewAt: "2026-08-23",
    effectiveWindow: "Regras legadas vigentes durante a transição; efeitos da LC 214/2025 devem ser acompanhados por período.",
    keyFacts: [
      { title: "Regime é anterior à taxa", detail: "Lucro presumido, lucro real, Simples e receitas excluídas da não cumulatividade seguem tratamentos distintos." },
      { title: "Produto especial exige NCM exato", detail: "Monofásico, alíquota zero e suspensão não podem ser inferidos por descrição aproximada." },
      { title: "Crédito não é automático", detail: "Hipótese legal, vínculo com a atividade, documento e método de apropriação precisam estar comprovados." },
      { title: "Débito e crédito ficam separados", detail: "A plataforma preserva livros e pendências antes de chegar ao saldo por contribuição." },
    ],
    decisionPath: [
      { title: "Classifique pessoa e receita", detail: "Regime de IR, atividade, natureza da receita e exclusões legais definem o livro aplicável." },
      { title: "Identifique tratamento do item", detail: "NCM, papel de fabricante, importador, atacadista ou varejista e vigência selecionam a regra especial." },
      { title: "Teste cada crédito", detail: "Aquisição, documento, vinculação, rateio e impedimentos são avaliados hipótese por hipótese." },
      { title: "Feche por contribuição", detail: "PIS e Cofins possuem memórias próprias; compensações e saldos anteriores exigem evidência." },
    ],
    example: {
      title: "Revenda com itens gerais e monofásicos",
      facts: ["receita por item", "NCM completo", "papel na cadeia", "documentos de aquisição"],
      outcome: "A plataforma segrega as receitas e impede que um perfil monofásico candidato vire tratamento confirmado sem enquadramento legal exato.",
      toolHref: "/app",
      toolLabel: "Pesquisar regras de PIS/Cofins",
    },
    limits: ["Alíquotas gerais não cobrem produtos e receitas especiais.", "Crédito informado sem hipótese e documento não reduz saldo.", "A transição para CBS exige versão por competência e não reescreve períodos fechados."],
    sources: [
      { code: "L-10637-2002", title: "Lei nº 10.637/2002 — texto compilado", publisher: "Presidência da República", url: "https://www.planalto.gov.br/ccivil_03/leis/2002/l10637compilado.htm", effectiveFrom: "2002-12-01", checkedAt },
      { code: "L-10833-2003", title: "Lei nº 10.833/2003", publisher: "Presidência da República", url: "https://www.planalto.gov.br/ccivil_03/leis/2003/l10.833.htm", effectiveFrom: "2004-02-01", checkedAt },
      { code: "RFB-PISCOFINS", title: "Legislação e jurisprudência de PIS/Cofins", publisher: "Receita Federal", url: "https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/legislacao/jurisprudencia-vinculante/pis-cofins", effectiveFrom: "2021-01-01", checkedAt },
    ],
    history: [{ version: "1.0.0", date: checkedAt, change: "Primeira edição: regimes, produtos especiais, créditos e transição." }],
  },
  "retencoes-servicos": {
    slug: "retencoes-servicos",
    tax: "Retenções",
    operation: "Pagamentos por serviços e retenções federais",
    audience: ["contadores", "departamentos de contas a pagar", "escritórios com prestadores"],
    title: "Retenções sobre serviços: IRRF, CSLL, PIS e Cofins | CBSHub",
    description: "Guia técnico de retenções em serviços por natureza, partes, documento, pagamento, exceções, base, alíquota, vencimento e compensação.",
    eyebrow: "GUIA PILAR · RETENÇÕES",
    headline: "Retenção não nasce do nome da nota: serviço, partes, pagamento e exceções precisam fechar juntos.",
    summary: "A retenção de CSLL, Cofins e PIS/Pasep em pagamentos entre pessoas jurídicas privadas é disciplinada pela Lei nº 10.833/2003 e pela IN SRF nº 459/2004. IRRF e pagamentos por entes públicos seguem dispositivos próprios. O tipo de serviço, as partes e as exceções precisam ser confirmados antes do percentual.",
    version: "withholdings-guide.v1.0.0",
    reviewedAt: checkedAt,
    nextReviewAt: "2026-08-23",
    effectiveWindow: "Atos federais vigentes; vencimentos e obrigações devem ser validados na competência do pagamento.",
    keyFacts: [
      { title: "O pagamento é um evento relevante", detail: "Documento, competência e data de pagamento precisam ser distinguidos para fato, retenção e recolhimento." },
      { title: "Serviço precisa de enquadramento", detail: "Limpeza, manutenção, segurança, serviços profissionais e outras hipóteses têm definições próprias." },
      { title: "Exceções são cumulativas", detail: "Simples Nacional, isenção, alíquota zero, valor e natureza das partes precisam ser testados sem atalho." },
      { title: "Cada tributo tem memória", detail: "IRRF, CSLL, PIS/Pasep e Cofins não devem aparecer apenas como uma soma sem base individual." },
    ],
    decisionPath: [
      { title: "Reconstrua a contratação", detail: "Contrato, nota, descrição real, prestador, tomador e natureza jurídica das partes." },
      { title: "Classifique cada retenção", detail: "Teste IRRF, contribuições sociais e previdenciária em trilhas independentes." },
      { title: "Aplique exceções e limites", detail: "Regime, dispensa, isenção, valor, destaque e responsabilidade precisam estar documentados." },
      { title: "Concilie recolhimento e compensação", detail: "Código, período, vencimento, pagamento e aproveitamento pelo prestador permanecem rastreáveis." },
    ],
    example: {
      title: "Serviço profissional entre pessoas jurídicas",
      facts: ["contrato e nota reconciliados", "regimes das partes", "data de pagamento", "natureza do serviço confirmada"],
      outcome: "O CBSHub abre uma trilha por tributo e mantém pendentes as retenções cuja hipótese, exceção ou prazo ainda não foi comprovado.",
      toolHref: "/app",
      toolLabel: "Abrir triagem de retenções",
    },
    limits: ["Percentual agregado não substitui a análise por contribuição.", "Prazo não é inferido apenas pela data da nota.", "Regras para órgãos públicos e previdenciárias exigem livros próprios."],
    sources: [
      { code: "L-10833-2003-RET", title: "Lei nº 10.833/2003", publisher: "Presidência da República", url: "https://www.planalto.gov.br/ccivil_03/leis/2003/l10.833.htm", effectiveFrom: "2004-02-01", checkedAt },
      { code: "IN-SRF-459-2004", title: "Instrução Normativa SRF nº 459/2004", publisher: "Receita Federal", url: "https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=15365", effectiveFrom: "2004-10-29", checkedAt },
      { code: "RFB-RET-PISCOFINS", title: "Restituição de PIS/Pasep e Cofins retidos", publisher: "Receita Federal", url: "https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/restituicao-ressarcimento-reembolso-e-compensacao/restituicao/contribuicao-pis-pasep-cofins-retidas-fonte", effectiveFrom: "2015-09-30", checkedAt },
    ],
    history: [{ version: "1.0.0", date: checkedAt, change: "Primeira edição: evento de pagamento, enquadramento, exceções e conciliação." }],
  },
  "ipi-tipi-classificacao": {
    slug: "ipi-tipi-classificacao",
    tax: "IPI/TIPI",
    operation: "Industrialização, importação e classificação fiscal",
    audience: ["contadores industriais", "especialistas em produtos", "escritórios com importadores"],
    title: "IPI e TIPI: classificação, fato gerador e alíquota | CBSHub",
    description: "Guia técnico de IPI por NCM, descrição legal, notas, Ex, papel do estabelecimento, industrialização, importação, base, benefício e vigência da TIPI.",
    eyebrow: "GUIA PILAR · IPI/TIPI",
    headline: "No IPI, o código só funciona com descrição, notas, operação e papel do estabelecimento.",
    summary: "O Decreto nº 11.158/2022 aprovou a TIPI baseada na NCM. A alíquota nominal é apenas uma etapa: classificação, notas de seção e capítulo, Ex, industrialização, equiparação, importação, base e benefício podem mudar ou bloquear a conclusão. Por isso, o código informado deve ser confrontado com a descrição técnica da mercadoria e com a vigência da tabela antes de calcular ou emitir o documento fiscal.",
    version: "ipi-tipi-guide.v1.0.0",
    reviewedAt: checkedAt,
    nextReviewAt: "2026-09-01",
    effectiveWindow: "TIPI com efeitos desde 1º de agosto de 2022, sujeita a alterações posteriores por decreto e atos correlatos.",
    keyFacts: [
      { title: "NCM exige descrição completa", detail: "Código, descrição, notas legais, regras de interpretação e eventual Ex formam uma unidade." },
      { title: "NT não significa zero", detail: "Produto não tributado e alíquota zero possuem efeitos e fundamentos diferentes." },
      { title: "Papel do estabelecimento importa", detail: "Industrial, equiparado, importador e comerciante não praticam automaticamente o mesmo fato gerador." },
      { title: "Benefício precisa de regra própria", detail: "Isenção, suspensão, redução e imunidade não são inferidas da alíquota nominal da TIPI." },
    ],
    decisionPath: [
      { title: "Caracterize o produto", detail: "Composição, função, apresentação, processo produtivo e documentação técnica sustentam a classificação." },
      { title: "Confirme NCM, notas e Ex", detail: "A leitura percorre regras gerais, seção, capítulo, posição, subposição e notas complementares." },
      { title: "Teste operação e contribuinte", detail: "Importação, saída industrial, equiparação, devolução e transferência possuem fatos próprios." },
      { title: "Forme base e tratamento", detail: "Valor tributável, alíquota, crédito, benefício, período e documento fecham a memória." },
    ],
    example: {
      title: "Saída de produto industrializado",
      facts: ["NCM de oito dígitos", "descrição e notas confirmadas", "estabelecimento industrial", "vigência da TIPI"],
      outcome: "O CBSHub só mostra memória numérica quando classificação, incidência, base e benefício pertencem à mesma versão; prefixos e descrições aproximadas permanecem bloqueados.",
      toolHref: "/app",
      toolLabel: "Pesquisar IPI e TIPI",
    },
    limits: ["A plataforma não classifica mercadoria por imagem ou nome comercial.", "Consulta formal de classificação continua sendo o instrumento oficial para dúvida concreta.", "Devolução reproduz o documento original e não cria alíquota autônoma."],
    sources: [
      { code: "DEC-11158-2022", title: "Decreto nº 11.158/2022", publisher: "Presidência da República", url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2022/decreto/d11158.htm", effectiveFrom: "2022-08-01", checkedAt },
      { code: "RFB-TIPI", title: "Tabela de Incidência do IPI — TIPI", publisher: "Receita Federal", url: "https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/legislacao/tipi-tabela-de-incidencia-do-imposto-sobre-produtos-industrializados", effectiveFrom: "2022-08-01", checkedAt },
      { code: "RFB-CLASSIFICACAO", title: "Consulta sobre classificação fiscal de mercadorias", publisher: "Receita Federal", url: "https://www.gov.br/receitafederal/pt-br/assuntos/aduana-e-comercio-exterior/classificacao-fiscal-de-mercadorias/consultas", effectiveFrom: "2021-12-09", checkedAt },
    ],
    history: [{ version: "1.0.0", date: checkedAt, change: "Primeira edição: classificação, incidência, estabelecimento, base e benefícios." }],
  },
} as const satisfies Record<string, TaxContentTopic>;

export type TaxContentSlug = keyof typeof taxContentTopics;

function isoDay(value: string) {
  const parsed = Date.parse(`${value}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(parsed)) throw new Error("invalid_tax_content_date");
  return parsed;
}

export function evaluateTaxContentFreshness(topic: TaxContentTopic, today = new Date().toISOString().slice(0, 10)) {
  const current = isoDay(today);
  const nextReview = isoDay(topic.nextReviewAt);
  const checked = Math.min(...topic.sources.map((source) => isoDay(source.checkedAt)));
  const daysUntilReview = Math.ceil((nextReview - current) / 86_400_000);
  const sourceAgeDays = Math.floor((current - checked) / 86_400_000);
  const freshness: TaxContentFreshness = daysUntilReview < 0 || sourceAgeDays > 90 ? "stale" : daysUntilReview <= TAX_CONTENT_REVIEW_WARNING_DAYS ? "review_due" : "current";
  return {
    freshness,
    daysUntilReview,
    sourceAgeDays,
    operationalStatus: freshness === "current" ? "referência atual" : freshness === "review_due" ? "revisão próxima" : "referência suspensa",
    canPresentAsCurrent: freshness !== "stale",
  } as const;
}

export const taxContentTaxonomy = Object.values(taxContentTopics).map((topic) => ({
  slug: topic.slug,
  tax: topic.tax,
  operation: topic.operation,
  audiences: topic.audience,
}));

export function validateTaxContentCatalog() {
  const errors: string[] = [];
  const slugs = new Set<string>();
  const sourceCodes = new Set<string>();
  for (const topic of Object.values(taxContentTopics)) {
    if (slugs.has(topic.slug)) errors.push(`duplicate_slug:${topic.slug}`);
    slugs.add(topic.slug);
    if (topic.keyFacts.length < 4 || topic.decisionPath.length < 4 || topic.limits.length < 3) errors.push(`shallow_content:${topic.slug}`);
    if (topic.sources.length < 2) errors.push(`missing_sources:${topic.slug}`);
    if (isoDay(topic.reviewedAt) > isoDay(topic.nextReviewAt)) errors.push(`invalid_review_window:${topic.slug}`);
    for (const source of topic.sources) {
      if (!source.url.startsWith("https://")) errors.push(`non_https_source:${source.code}`);
      if (!source.publisher || !source.title || !source.effectiveFrom || !source.checkedAt) errors.push(`incomplete_source:${source.code}`);
      if (sourceCodes.has(source.code)) errors.push(`duplicate_source_code:${source.code}`);
      sourceCodes.add(source.code);
    }
  }
  return { passed: errors.length === 0, errors, topics: slugs.size, sources: sourceCodes.size };
}

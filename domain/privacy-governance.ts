export type PersonalDataInventoryItem = {
  category: string;
  examples: string[];
  purposes: string[];
  legalBases: string[];
  stores: string[];
  retention: string;
  deletionBehavior: string;
};

export const PRIVACY_GOVERNANCE_VERSION = "2026.09.26-v9";

export const personalDataInventory: PersonalDataInventoryItem[] = [
  {
    category: "Identidade e conta",
    examples: ["nome", "e-mail", "tipo de conta"],
    purposes: ["criar e administrar a conta", "comunicação operacional"],
    legalBases: ["execução de contrato (LGPD, art. 7º, V)", "cumprimento de obrigação legal (LGPD, art. 7º, II), quando aplicável"],
    stores: ["users", "workspace_members"],
    retention: "durante a conta; depois, somente registros mínimos exigidos por lei ou para exercício regular de direitos",
    deletionBehavior: "excluído com a conta, preservando apenas comprovante pseudonimizado do atendimento do pedido",
  },
  {
    category: "Autenticação",
    examples: ["hash e salt de senha", "hash da chave de recuperação", "sessão"],
    purposes: ["autenticar", "recuperar acesso", "impedir sequestro de conta"],
    legalBases: ["execução de contrato (LGPD, art. 7º, V)", "legítimo interesse em segurança (LGPD, art. 7º, IX)"],
    stores: ["users", "sessions"],
    retention: "sessões por até 7 dias; credenciais derivadas enquanto a conta existir",
    deletionBehavior: "sessões expiradas são removidas; credenciais são excluídas com a conta",
  },
  {
    category: "Workspace e ativos autorizados",
    examples: ["membros", "papéis", "domínios", "comprovação de autorização"],
    purposes: ["segregar workspaces", "controlar acesso", "validar escopo autorizado"],
    legalBases: ["execução de contrato (LGPD, art. 7º, V)", "cumprimento de obrigação legal (LGPD, art. 7º, II), quando aplicável"],
    stores: ["accounting_workspaces", "workspace_members", "security_agent_scopes"],
    retention: "enquanto o espaço existir ou pelo prazo necessário a obrigações legais explicitamente aplicáveis",
    deletionBehavior: "excluído pelo responsável do espaço; membros não recebem os dados empresariais no pedido individual de acesso",
  },
  {
    category: "Diagnósticos e evidências de segurança",
    examples: ["registros DNS públicos", "cabeçalhos HTTPS", "contagens agregadas informadas pelo operador", "prioridades de correção", "decisões sobre achados", "campanhas autorizadas", "códigos HTTP e presença de marcador sintético em revisão autenticada", "referência de repositório e pull request", "hash de evidências"],
    purposes: ["diagnóstico defensivo", "acompanhamento da postura externa", "planejamento de testes autorizados", "preparação de correção revisável", "evidência técnica"],
    legalBases: ["execução de contrato (LGPD, art. 7º, V)", "cumprimento de obrigação legal (LGPD, art. 7º, II), quando aplicável"],
    stores: ["security_agent_jobs", "security_agent_events", "security_findings", "security_finding_events", "security_campaigns", "security_campaign_events", "security_auth_reviews", "security_auth_contracts", "security_auth_code_maps", "security_auth_regression_drafts", "security_remediation_proposals", "security_remediation_events"],
    retention: "jobs, eventos do agente, revisões autenticadas, mapas de código e receitas de teste por até 365 dias; contratos de autorização, achados e decisões enquanto o workspace existir ou até sua exclusão",
    deletionBehavior: "resultados antigos são removidos pela rotina de retenção; revisões, achados, decisões, mapas, receitas de teste e escopos são exportados e excluídos com o workspace; mapas guardam caminhos, linhas e hashes do commit, não código-fonte; receitas são geradas sem código do cliente; tokens e corpos não são persistidos",
  },
  {
    category: "Cobrança e registros fiscais",
    examples: ["referência da assinatura", "resumo do pagamento", "identificador fiscal mascarado", "número e link da NFS-e", "referências e hashes de PDF/XML"],
    purposes: ["cobrar", "conciliar pagamento", "cumprir obrigações fiscais e contábeis"],
    legalBases: ["execução de contrato (LGPD, art. 7º, V)", "cumprimento de obrigação legal (LGPD, art. 7º, II)"],
    stores: ["billing_accounts", "billing_transactions", "fiscal_issuances", "fiscal_issuance_events"],
    retention: "durante a relação e pelo prazo legal fiscal aplicável, quando houver obrigação de conservação",
    deletionBehavior: "o identificador integral do tomador é removido após o registro da emissão; referências, hashes e trilha ficam limitados à finalidade fiscal e são excluídos quando não houver obrigação de conservação",
  },
  {
    category: "Prevenção de fraude e abuso",
    examples: ["HMAC do dispositivo", "HMAC do ambiente técnico", "HMAC do e-mail", "HMAC de rede"],
    purposes: ["impedir trials repetidos", "limitar abuso automatizado"],
    legalBases: ["legítimo interesse em segurança e prevenção de fraude (LGPD, art. 7º, IX)"],
    stores: ["trial_device_claims", "security_rate_limits"],
    retention: "rate limits por até 2 dias; marcadores do trial por até 365 dias",
    deletionBehavior: "vínculo com usuário e workspace é removido; somente marcadores pseudonimizados permanecem até o fim do prazo",
  },
  {
    category: "Suporte e feedback",
    examples: ["categoria do chamado", "módulo", "empresa relacionada", "descrição minimizada", "código de rastreio", "versão da aplicação"],
    purposes: ["prestar suporte", "investigar divergências", "corrigir falhas sem alterar regras automaticamente"],
    legalBases: ["execução de contrato (LGPD, art. 7º, V)", "legítimo interesse em segurança e melhoria do serviço (LGPD, art. 7º, IX)"],
    stores: ["support_tickets", "support_ticket_events"],
    retention: "enquanto a conta ou o espaço existir, com exclusão junto ao titular ou ao espaço",
    deletionBehavior: "o formulário bloqueia identificadores pessoais e credenciais comuns; chamados do titular são exportados e excluídos com a conta",
  },
  {
    category: "Direitos do titular e incidentes",
    examples: ["tipo e estado do pedido", "registro de incidente", "decisões de notificação"],
    purposes: ["demonstrar atendimento à LGPD", "responder e aprender com incidentes"],
    legalBases: ["cumprimento de obrigação legal (LGPD, art. 7º, II)", "exercício regular de direitos (LGPD, art. 7º, VI)"],
    stores: ["privacy_request_events", "security_incidents", "security_incident_events"],
    retention: "pedidos por 24 meses; incidentes por 5 anos após resolução, sujeitos a revisão",
    deletionBehavior: "sem conteúdo de diagnóstico ou credenciais; identificadores do titular são pseudonimizados",
  },
];


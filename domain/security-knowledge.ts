export const SECURITY_KNOWLEDGE_VERSION = "security-knowledge.2026-09-05.v1";

export type SecurityValidationMethod = "passive_observation" | "manual_log_review" | "authorized_manual_test" | "isolated_runner";

export type SecurityKnowledgeReference = {
  framework: "NIST CSF" | "OWASP WSTG" | "MITRE ATT&CK";
  id: string;
  version: string;
  title: string;
  url: string;
  relationship: "control_objective" | "test_method" | "threat_hypothesis";
};

export type SecurityKnowledgeEntry = {
  evidenceCode: string;
  validationMethod: SecurityValidationMethod;
  interpretation: string;
  boundary: string;
  references: SecurityKnowledgeReference[];
};

const nistUrl = "https://www.nist.gov/document/nist-csf-20-core-withdrawn-csf-11-elements";
const nist = (id: string, title: string): SecurityKnowledgeReference => ({
  framework: "NIST CSF", id, version: "2.0", title, url: nistUrl, relationship: "control_objective",
});
const wstg = (id: string, title: string, url: string, version = "4.2"): SecurityKnowledgeReference => ({
  framework: "OWASP WSTG", id, version, title, url, relationship: "test_method",
});
const attack = (id: string, title: string, url: string): SecurityKnowledgeReference => ({
  framework: "MITRE ATT&CK", id, version: "Enterprise", title, url, relationship: "threat_hypothesis",
});

const inventory = nist("ID.AM-02", "Inventários de software, serviços e sistemas são mantidos");
const riskValidation = nist("ID.RA-01", "Vulnerabilidades são identificadas, validadas e registradas");
const eventAnalysis = nist("DE.AE-02", "Eventos potencialmente adversos são analisados");
const correlation = nist("DE.AE-03", "Informações de eventos são correlacionadas entre múltiplas fontes");

const catalog: Record<string, SecurityKnowledgeEntry> = {
  "public-dns": {
    evidenceCode: "public-dns", validationMethod: "passive_observation",
    interpretation: "Observa se o domínio possui destino público compatível com o diagnóstico seguro.",
    boundary: "Não inventaria ativos, não comprova titularidade de todos os destinos e não avalia serviços expostos.",
    references: [inventory, riskValidation],
  },
  mx: {
    evidenceCode: "mx", validationMethod: "passive_observation",
    interpretation: "Observa a publicação de serviço de recebimento de e-mail no DNS.",
    boundary: "Ausência de MX pode ser intencional; presença não confirma configuração segura do provedor.",
    references: [inventory],
  },
  spf: {
    evidenceCode: "spf", validationMethod: "authorized_manual_test",
    interpretation: "Observa a presença de uma política SPF no domínio principal.",
    boundary: "Presença não valida sintaxe completa, alinhamento, DKIM ou entrega real; exige revisão da política e dos remetentes.",
    references: [riskValidation],
  },
  dmarc: {
    evidenceCode: "dmarc", validationMethod: "authorized_manual_test",
    interpretation: "Observa a presença de uma política DMARC no nome padronizado do domínio.",
    boundary: "Presença não comprova política efetiva, alinhamento ou monitoramento dos relatórios.",
    references: [riskValidation],
  },
  https: {
    evidenceCode: "https", validationMethod: "authorized_manual_test",
    interpretation: "Observa uma resposta HTTPS na página principal e redirecionamentos limitados ao mesmo domínio relacionado.",
    boundary: "Não avalia todas as rotas, versões TLS, cifras, cadeia completa ou resistência a ataques ativos.",
    references: [nist("PR.DS-02", "Dados em trânsito têm confidencialidade, integridade e disponibilidade protegidas"), riskValidation],
  },
  hsts: {
    evidenceCode: "hsts", validationMethod: "authorized_manual_test",
    interpretation: "Observa a presença do cabeçalho Strict-Transport-Security na resposta principal.",
    boundary: "Presença não valida max-age, cobertura de subdomínios, preload ou consistência em todas as respostas.",
    references: [
      nist("PR.DS-02", "Dados em trânsito têm confidencialidade, integridade e disponibilidade protegidas"),
      wstg("WSTG-v42-CONF-07", "Test HTTP Strict Transport Security", "https://wstg.owasp.org/v4.2/4-Web_Application_Security_Testing/02-Configuration_and_Deployment_Management_Testing/07-Test_HTTP_Strict_Transport_Security/"),
    ],
  },
  csp: {
    evidenceCode: "csp", validationMethod: "authorized_manual_test",
    interpretation: "Observa a presença de Content-Security-Policy na resposta principal.",
    boundary: "Presença não comprova que a política é restritiva, aplicada em rotas sensíveis ou resistente a bypass.",
    references: [wstg("WSTG-CONF-12", "Test for Content Security Policy", "https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/02-Configuration_and_Deployment_Management_Testing/12-Test_for_Content_Security_Policy", "latest@2026-09-05")],
  },
  "browser-headers": {
    evidenceCode: "browser-headers", validationMethod: "authorized_manual_test",
    interpretation: "Conta quatro famílias de cabeçalhos defensivos na resposta principal.",
    boundary: "A contagem não valida valores, duplicidade, cobertura de rotas nem eficácia no navegador.",
    references: [wstg("WSTG-CONF-14", "Test Other HTTP Security Header Misconfigurations", "https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/02-Configuration_and_Deployment_Management_Testing/14-Test_Other_HTTP_Security_Header_Misconfigurations", "latest@2026-09-05")],
  },
  "bt-auth": {
    evidenceCode: "bt-auth", validationMethod: "manual_log_review",
    interpretation: "Compara contagens agregadas de sucesso, falha e MFA numa janela informada pelo operador.",
    boundary: "Totais não correlacionam identidade, origem ou sequência; não confirmam força bruta, abuso de conta ou invasão.",
    references: [nist("PR.AA-03", "Usuários, serviços e hardware são autenticados"), eventAnalysis, correlation, attack("T1110", "Brute Force — hipótese a confirmar", "https://attack.mitre.org/techniques/T1110/")],
  },
  "bt-waf": {
    evidenceCode: "bt-waf", validationMethod: "manual_log_review",
    interpretation: "Compara bloqueios declarados do WAF com o total de requisições da mesma janela.",
    boundary: "Bloqueio demonstra ação do controle, não intenção, exploração bem-sucedida ou comprometimento.",
    references: [nist("DE.CM-01", "Redes e serviços de rede são monitorados"), eventAnalysis, correlation],
  },
  "bt-availability": {
    evidenceCode: "bt-availability", validationMethod: "manual_log_review",
    interpretation: "Sinaliza concentração de respostas 5xx em uma janela com volume mínimo.",
    boundary: "Não atribui causa a ataque; deploy, capacidade e dependências devem ser correlacionados.",
    references: [nist("DE.CM-09", "Ambientes de execução e seus dados são monitorados"), eventAnalysis, nist("DE.AE-04", "Impacto e escopo estimados de eventos adversos são determinados")],
  },
  "bt-privilege": {
    evidenceCode: "bt-privilege", validationMethod: "manual_log_review",
    interpretation: "Sinaliza alterações de privilégio declaradas para revisão de autorização e contexto.",
    boundary: "A contagem não identifica autor, aprovação, intenção ou persistência e não confirma comprometimento.",
    references: [nist("PR.AA-05", "Permissões e autorizações são geridas, revisadas e seguem privilégio mínimo"), eventAnalysis, correlation, attack("T1098", "Account Manipulation — hipótese a confirmar", "https://attack.mitre.org/techniques/T1098/")],
  },
};

export function securityKnowledgeForCode(evidenceCode: string): SecurityKnowledgeEntry | null {
  return catalog[evidenceCode] ? structuredClone(catalog[evidenceCode]) : null;
}

export function securityKnowledgeForCodes(evidenceCodes: string[]): SecurityKnowledgeEntry[] {
  return [...new Set(evidenceCodes)].map(securityKnowledgeForCode).filter((entry): entry is SecurityKnowledgeEntry => Boolean(entry));
}

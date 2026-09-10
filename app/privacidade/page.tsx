import type { Metadata } from "next";
import { getCurrentUser, userHasContactEmail } from "../auth";
import PrivacyActions from "./PrivacyActions";
import { privacyContactEmail } from "../platform-controls";
import {
  personalDataInventory,
  PRIVACY_GOVERNANCE_VERSION,
} from "../../domain/privacy-governance";
import { PublicPageBreadcrumb } from "../StructuredData";
import {
  CyberMarketingFooter,
  CyberMarketingHeader,
} from "../CyberMarketingShell";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Privacidade e proteção de dados | CBSHub",
  description:
    "Como o CBSHub minimiza, protege e permite o controle de dados pessoais.",
  alternates: { canonical: "/privacidade" },
  openGraph: {
    title: "Privacidade e proteção de dados | CBSHub",
    description:
      "Como o CBSHub minimiza, protege e permite o controle de dados pessoais.",
    url: "/privacidade",
    type: "website",
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacidade | CBSHub",
    description: "Dados mínimos, finalidade clara e controle do titular.",
  },
};

export default async function PrivacyPage() {
  const user = await getCurrentUser();
  const privacyEmail = privacyContactEmail();
  return (
    <main className="legal-shell">
      <PublicPageBreadcrumb current="Privacidade" path="/privacidade" />
      <div className="legal-grid-backdrop" aria-hidden="true" />
      <CyberMarketingHeader />
      <section className="legal-hero">
        <span>PRIVACIDADE · LGPD · CYBERSECURITY</span>
        <h1>Dados mínimos, finalidade clara e controle do titular.</h1>
        <p>
          O CBSHub trata informações necessárias para contas, workspaces, ativos
          autorizados, diagnósticos defensivos, segurança, prevenção de abuso e
          cobrança. Esta página descreve os controles implementados.
        </p>
      </section>
      <section className="legal-grid">
        <article>
          <span>01</span>
          <h2>Dados tratados</h2>
          <p>
            Identificador da conta, nome e e-mail quando informados, domínios
            autorizados, registros de verificação DNS, resultados de
            diagnóstico, trilhas de auditoria e registros técnicos, financeiros
            e fiscais necessários à operação. Quando a integração GitHub é
            ativada, também são tratados os repositórios autorizados, arquivos
            necessários à análise, commits, achados e propostas de correção.
          </p>
        </article>
        <article>
          <span>02</span>
          <h2>Finalidades</h2>
          <p>
            Autenticar usuários, separar workspaces, comprovar autorização de
            ativos, executar diagnósticos defensivos, produzir evidências
            rastreáveis, prevenir abuso, prestar suporte e cumprir obrigações
            contratuais e legais aplicáveis.
          </p>
        </article>
        <article>
          <span>03</span>
          <h2>Minimização</h2>
          <p>
            O diagnóstico externo coleta sinais públicos necessários à análise
            autorizada. Na integração GitHub, os arquivos são inspecionados
            temporariamente; possíveis credenciais encontradas são ocultadas
            nos resultados. Conteúdos de correções suportadas permanecem
            temporariamente até publicação ou expiração da proposta.
            Senhas em texto e características brutas do
            aparelho não são armazenadas. Na documentação de cobranças, são
            mantidas referências com hash do PDF/XML e identificadores
            mascarados quando possível.
          </p>
        </article>
        <article>
          <span>04</span>
          <h2>Segurança</h2>
          <p>
            Sessões HttpOnly, hash de senha com derivação reforçada, bloqueio de
            origem cruzada, limitação de abuso, assinatura de webhooks,
            segregação por usuário e cabeçalhos defensivos.
          </p>
        </article>
        <article>
          <span>05</span>
          <h2>Retenção</h2>
          <p>
            Sessões expiram em até sete dias. Marcadores pseudonimizados usados
            para impedir testes repetidos podem ser conservados por{" "}
            {"até 365 dias"}, inclusive após a exclusão da conta, sem nome,
            e-mail bruto ou características brutas do aparelho. Os demais dados
            permanecem enquanto necessários ou até exclusão, ressalvadas
            obrigações legais.
          </p>
        </article>
        <article>
          <span>06</span>
          <h2>Compartilhamento</h2>
          <p>
            A hospedagem processa a aplicação e o banco. Provedores de modelos
            podem processar evidências técnicas minimizadas para produzir
            priorização defensiva, e o Mercado Pago participa somente quando
            pagamentos forem ativados. Quando conectado pelo cliente, o GitHub
            fornece acesso aos projetos autorizados. Nomes e versões de pacotes
            suportados são consultados na OSV e no registro npm para avaliar
            alertas e preparar atualizações; o código do repositório não é
            enviado a esses serviços de consulta. A plataforma não vende dados pessoais.
          </p>
        </article>
      </section>
      <section className="legal-rights">
        <span>SEUS DIREITOS</span>
        <h2>Acesso, correção e exclusão sem esconder o processo.</h2>
        <p>
          Você pode consultar e corrigir dados dentro da conta, baixar uma cópia
          estruturada e solicitar exclusão. Registros sujeitos a dever legal
          podem exigir conservação limitada e justificada.
        </p>
        <PrivacyActions
          signedIn={Boolean(user)}
          initialName={user?.firstName ?? ""}
          initialEmail={
            user && userHasContactEmail(user.email) ? user.email : ""
          }
        />
      </section>
      <section className="legal-rights">
        <span>INVENTÁRIO DE DADOS · {PRIVACY_GOVERNANCE_VERSION}</span>
        <h2>O tratamento é documentado por categoria.</h2>
        <div className="legal-grid">
          {personalDataInventory.map((item) => (
            <article key={item.category}>
              <h3>{item.category}</h3>
              <p>
                <b>Exemplos:</b> {item.examples.join(", ")}.
              </p>
              <p>
                <b>Bases:</b> {item.legalBases.join("; ")}.
              </p>
              <p>
                <b>Retenção:</b> {item.retention}.
              </p>
              <p>
                <b>Exclusão:</b> {item.deletionBehavior}.
              </p>
            </article>
          ))}
        </div>
      </section>
      <section className="legal-boundary">
        <b>Canal de privacidade e incidentes</b>
        <p>
          {privacyEmail ? (
            <>
              Solicitações de titulares e comunicações de segurança podem ser
              enviadas para{" "}
              <a href={`mailto:${privacyEmail}`}>{privacyEmail}</a>.
            </>
          ) : (
            <>
              O canal dedicado está em configuração. Direitos autenticados
              continuam disponíveis dentro da conta.
            </>
          )}
        </p>
      </section>
      <section className="legal-boundary">
        <b>Limite técnico responsável</b>
        <p>
          Nenhuma aplicação conectada à internet é invulnerável. Os controles
          reduzem risco e criam barreiras em camadas; monitoramento,
          atualização, resposta a incidentes e revisão profissional continuam
          obrigatórios.
        </p>
      </section>
      <CyberMarketingFooter />
    </main>
  );
}

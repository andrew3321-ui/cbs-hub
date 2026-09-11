import type { Metadata } from "next";
import { platformIdentity } from "../../domain/platform-identity";
import { PublicPageBreadcrumb } from "../StructuredData";
import {
  CyberMarketingFooter,
  CyberMarketingHeader,
} from "../CyberMarketingShell";

export const metadata: Metadata = {
  title: "Termos de uso | CBSHub Cybersecurity",
  description:
    "Termos da CBSHub Cybersecurity para uso defensivo autorizado, contas, evidências, contratação e responsabilidades.",
  alternates: { canonical: "/termos" },
  openGraph: {
    title: "Termos de uso | CBSHub Cybersecurity",
    description:
      "Condições de uso defensivo, autorização de ativos e operação comercial do CBSHub.",
    url: "/termos",
    type: "website",
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Termos de uso | CBSHub Cybersecurity",
    description:
      "Uso autorizado, limites defensivos e responsabilidades documentadas.",
  },
};

export default function TermsPage() {
  return (
    <main className="legal-shell">
      <PublicPageBreadcrumb current="Termos de uso" path="/termos" parent={{ name: "Central de confiança", path: "/seguranca" }} />
      <div className="legal-grid-backdrop" aria-hidden="true" />
      <CyberMarketingHeader />
      <section className="legal-hero">
        <span>TERMOS DE USO · CYBERSECURITY</span>
        <h1>Uso autorizado, limites defensivos.</h1>
        <p>
          Estes termos registram o escopo permitido, a autorização dos ativos,
          os limites do diagnóstico e as condições comerciais da plataforma.
        </p>
      </section>
      <section className="terms-mode live">
        <span>ESCOPO CONTROLADO</span>
        <strong>
          O agente só executa diagnósticos persistentes depois da comprovação do
          domínio por DNS e do aceite expresso do responsável.
        </strong>
      </section>
      <section className="supplier-identity">
        <span>IDENTIFICAÇÃO DO RESPONSÁVEL</span>
        <h2>{platformIdentity.responsibleName}</h2>
        <p>
          Pessoa física responsável pela operação do CBSHub. CPF e endereço
          fiscal não são expostos nesta página pública; os dados obrigatórios
          são apresentados no fluxo contratual quando aplicáveis.
        </p>
        <a href="mailto:supportofficial@cbshub.com.br">
          supportofficial@cbshub.com.br
        </a>
      </section>
      <section className="legal-list">
        <article>
          <h2>1. Finalidade</h2>
          <p>
            A plataforma auxilia equipes a observar a superfície externa de
            ativos autorizados e priorizar correções defensivas. Ela não
            substitui pentest, auditoria, monitoramento interno, resposta a
            incidentes ou revisão de um profissional de segurança.
          </p>
        </article>
        <article>
          <h2>2. Conta e segurança</h2>
          <p>
            O usuário deve proteger sua senha, manter dados corretos e comunicar
            suspeitas. Ações relevantes são vinculadas à conta e podem gerar
            trilha de auditoria.
          </p>
        </article>
        <article>
          <h2>3. Autorização e uso permitido</h2>
          <p>
            O usuário só pode cadastrar sistemas, contas, redes, aplicações e
            domínios que possua, opere ou tenha autorização expressa para
            testar. É proibido usar o CBSHub para exploração, evasão, força
            bruta, negação de serviço, obtenção de credenciais ou qualquer
            atividade ofensiva não autorizada.
          </p>
        </article>
        <article>
          <h2>4. Acesso e contratação</h2>
          <p>
            Recursos de avaliação podem ter limites técnicos e de frequência
            informados no produto. Quando houver oferta paga, preço, capacidade,
            renovação e forma de pagamento serão apresentados antes da
            confirmação; nenhuma cobrança é iniciada sem ação expressa do
            responsável.
          </p>
        </article>
        <article>
          <h2>5. Cancelamento, arrependimento e reembolso</h2>
          <p>
            O proprietário do espaço pode cancelar a renovação do cartão pelo
            canal de suporte antes da próxima cobrança.{" "}
            {"Não oferecemos reembolso comercial voluntário"} após a
            disponibilização ou uso do serviço, exceto em cobranças indevidas,
            duplicadas, falha imputável à plataforma ou demais hipóteses
            obrigatórias. Esta regra não limita{" "}
            {"direitos legais indisponíveis"}. Quando a contratação caracterizar
            relação de consumo à distância, o direito de arrependimento será
            atendido no prazo e nas condições do
            {" artigo 49 do Código de Defesa do Consumidor"}.{" "}
            {"O teste gratuito não elimina direitos previstos em lei"}.
            Solicitações podem ser feitas pelo canal de atendimento publicado na
            identificação do fornecedor.
          </p>
        </article>
        <article>
          <h2>6. Dados e evidências</h2>
          <p>
            O usuário deve ter autorização para inserir dados de terceiros e
            limitar cada escopo ao necessário. Resultados, registros DNS,
            evidências técnicas e trilhas de auditoria são tratados conforme a
            política de privacidade.
          </p>
        </article>
        <article>
          <h2>7. Responsabilidade de segurança</h2>
          <p>
            Resultados automatizados podem conter limitações, incertezas ou
            falsos positivos. Toda recomendação relevante deve passar por
            validação humana antes de alterar sistemas de produção.
          </p>
        </article>
        <article>
          <h2>8. Documento fiscal da assinatura</h2>
          <p>
            O comprovante de pagamento e o recibo de acesso não substituem a
            nota fiscal aplicável. Quando a emissão automática não estiver
            disponível, o documento será processado pelo responsável da
            plataforma; nesse cenário, a CBSHub não promete emissão automática.
            A plataforma conserva somente os registros necessários para comprovar
            a contratação e cumprir as obrigações legais pertinentes.
          </p>
        </article>
      </section>
      <CyberMarketingFooter />
    </main>
  );
}

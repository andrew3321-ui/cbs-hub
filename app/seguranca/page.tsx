import type { Metadata } from "next";
import Link from "next/link";
import {
  CyberMarketingFooter,
  CyberMarketingHeader,
} from "../CyberMarketingShell";
import { PublicPageBreadcrumb } from "../StructuredData";

export const metadata: Metadata = {
  title: "Central de confiança | CBSHub Cybersecurity",
  description:
    "Metodologia, controles de segurança, privacidade, termos e responsabilidade institucional da CBSHub Cybersecurity em um só lugar.",
  alternates: { canonical: "/seguranca" },
  openGraph: {
    title: "Central de confiança | CBSHub Cybersecurity",
    description:
      "Metodologia, controles, privacidade e limites operacionais da CBSHub Cybersecurity.",
    url: "/seguranca",
    type: "website",
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Central de confiança | CBSHub Cybersecurity",
    description:
      "Controles explícitos, limites defensivos e transparência operacional.",
  },
};

const controls = [
  {
    code: "AUTH-01",
    title: "Escopo comprovado",
    text: "O monitoramento persistente exige declaração de autorização e comprovação do domínio por um registro DNS específico.",
  },
  {
    code: "DATA-02",
    title: "Coleta minimizada",
    text: "A plataforma trabalha com sinais técnicos necessários para cada finalidade e evita armazenar perguntas, credenciais ou características brutas do dispositivo.",
  },
  {
    code: "AI-03",
    title: "IA com evidência",
    text: "O modelo recebe contexto defensivo estruturado. Conclusões sem suporte nos fatos coletados são rejeitadas antes de chegar ao usuário.",
  },
  {
    code: "CHANGE-04",
    title: "Mudança sob aprovação",
    text: "Alterações externas sensíveis usam prévia, prazo de aprovação, verificação de drift e rollback; não há autonomia irrestrita.",
  },
  {
    code: "ACCESS-05",
    title: "Privilégio mínimo",
    text: "Workspaces, papéis e consultas mantêm isolamento por organização. Credenciais de conectores são separadas por capacidade e protegidas no servidor.",
  },
  {
    code: "AUDIT-06",
    title: "Trilha operacional",
    text: "Escopos, análises, achados, decisões e propostas relevantes geram registros para investigação e responsabilização.",
  },
] as const;

export default function SecurityTrustPage() {
  return (
    <main className="marketing-page">
      <PublicPageBreadcrumb current="Central de confiança" path="/seguranca" />
      <div className="marketing-grid" aria-hidden="true" />
      <CyberMarketingHeader />
      <section className="marketing-hero trust-hero">
        <span>CENTRAL DE CONFIANÇA · TRANSPARÊNCIA OPERACIONAL</span>
        <h1>
          Confiança não nasce
          <br />
          <em>de uma promessa.</em>
        </h1>
        <p>
          Ela nasce de limites explícitos, acesso mínimo, evidência verificável
          e pessoas responsáveis pelas decisões que podem afetar um ambiente de
          produção.
        </p>
      </section>

      <section className="trust-status">
        <div>
          <span>POSTURA ATUAL</span>
          <h2>Controles implementados e limites publicados</h2>
          <p>
            Esta página descreve o produto existente. Não representa
            certificação independente, conformidade integral ou garantia de
            ausência de vulnerabilidades.
          </p>
        </div>
        <aside>
          <i />
          <span>
            <b>Abertura controlada</b>
            <small>
              O workspace permanece fechado ao público enquanto os controles de
              produção são concluídos.
            </small>
          </span>
        </aside>
      </section>

      <section className="trust-methodology" id="metodologia" aria-labelledby="trust-methodology-title">
        <header>
          <span>METODOLOGIA</span>
          <h2 id="trust-methodology-title">Do ativo autorizado à correção verificável.</h2>
          <p>O fluxo separa coleta, interpretação e mudança para que nenhuma conclusão ou ação ultrapasse a evidência disponível.</p>
        </header>
        <ol>
          <li><b>01</b><span><strong>Autorizar</strong>Comprovar a titularidade ou registrar a autorização do ativo.</span></li>
          <li><b>02</b><span><strong>Observar</strong>Coletar sinais públicos e telemetria permitida, com escopo e limites definidos.</span></li>
          <li><b>03</b><span><strong>Priorizar</strong>Relacionar achados, impacto, confiança e evidência técnica.</span></li>
          <li><b>04</b><span><strong>Corrigir</strong>Preparar mudanças controladas, aprovadas e acompanhadas por auditoria.</span></li>
        </ol>
      </section>

      <section className="trust-controls" id="controles" aria-label="Controles implementados">
        {controls.map((control) => (
          <article key={control.code}>
            <span>{control.code}</span>
            <h2>{control.title}</h2>
            <p>{control.text}</p>
          </article>
        ))}
      </section>

      <section className="trust-boundaries">
        <div>
          <span>LIMITES DE EXECUÇÃO</span>
          <h2>O agente não recebe liberdade irrestrita.</h2>
          <p>
            Força bruta, negação de serviço, persistência, evasão, exfiltração e
            exploração destrutiva permanecem bloqueadas. Testes ativos dependem
            de escopo verificável, janela, técnica permitida, limites e
            condições de parada.
          </p>
        </div>
        <div>
          <span>ALTERAÇÕES EXTERNAS</span>
          <h2>Propor não significa aplicar.</h2>
          <p>
            Integrações defensivas operam primeiro em observação. Uma mudança só
            avança quando existe credencial separada, prévia objetiva e
            confirmação humana válida.
          </p>
        </div>
      </section>

      <section className="trust-disclosure">
        <div>
          <span>RELATO RESPONSÁVEL</span>
          <h2>Encontrou uma vulnerabilidade na CBSHub?</h2>
          <p>
            Envie uma descrição objetiva, impacto observado e forma segura de
            reprodução. Não inclua credenciais, dados pessoais de terceiros nem
            execute ações destrutivas.
          </p>
        </div>
        <a
          className="marketing-button"
          href="mailto:supportofficial@cbshub.com.br?subject=Relato%20respons%C3%A1vel%20de%20seguran%C3%A7a"
        >
          Relatar com segurança <span>→</span>
        </a>
      </section>

      <section className="trust-links" aria-label="Documentos da Central de confiança">
        <article>
          <span>METODOLOGIA</span>
          <h3>Como o produto chega a uma conclusão</h3>
          <p>Conheça as etapas, evidências e limites do diagnóstico defensivo.</p>
          <Link href="/seguranca#metodologia">Ver metodologia →</Link>
        </article>
        <article>
          <span>PRIVACIDADE</span>
          <h3>Finalidades, retenção e direitos</h3>
          <p>
            Veja quais dados são tratados e como solicitar acesso ou exclusão.
          </p>
          <Link href="/privacidade">Ler política →</Link>
        </article>
        <article>
          <span>TERMOS</span>
          <h3>Uso defensivo autorizado</h3>
          <p>Consulte responsabilidades, proibições e condições comerciais.</p>
          <Link href="/termos">Ler termos →</Link>
        </article>
        <article>
          <span>RESPONSÁVEL</span>
          <h3>Quem responde pela plataforma</h3>
          <p>
            Identificação pública sem exposição desnecessária de documentos
            pessoais.
          </p>
          <Link href="/responsavel">Ver responsável →</Link>
        </article>
      </section>
      <CyberMarketingFooter />
    </main>
  );
}

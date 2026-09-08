import type { Metadata } from "next";
import Link from "next/link";
import {
  CyberMarketingFooter,
  CyberMarketingHeader,
} from "../CyberMarketingShell";
import { PublicPageBreadcrumb } from "../StructuredData";

export const metadata: Metadata = {
  title: "Casos de uso | CBSHub Cybersecurity",
  description:
    "Veja como empresas, produtos digitais e equipes técnicas podem organizar postura externa e correções defensivas com a CBSHub.",
  alternates: { canonical: "/casos-de-uso" },
  openGraph: {
    title: "Casos de uso | CBSHub",
    description:
      "Situações reais em que visibilidade externa e priorização defensiva reduzem exposição.",
    url: "/casos-de-uso",
    type: "website",
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Casos de uso | CBSHub",
    description:
      "Postura externa para empresas, SaaS, e-commerce e prestadores autorizados.",
  },
};

const useCases = [
  {
    number: "01",
    audience: "EMPRESAS EM CRESCIMENTO",
    title: "Descobrir o básico que ficou exposto",
    pain: "O site cresceu, fornecedores mudaram e ninguém sabe se DNS, e-mail e HTTPS continuam bem configurados.",
    outcome:
      "A CBSHub reúne os sinais públicos e cria uma ordem de correção compreensível para gestão e tecnologia.",
    checks: [
      "Autenticação de e-mail",
      "HTTPS e navegador",
      "Evidências por domínio",
    ],
  },
  {
    number: "02",
    audience: "PRODUTOS DIGITAIS E SAAS",
    title: "Acompanhar a superfície entre releases",
    pain: "Uma mudança de infraestrutura pode enfraquecer controles sem gerar um erro visível para o time de produto.",
    outcome:
      "O histórico ajuda a detectar mudança de postura, abrir achados e acompanhar decisões sem perder a evidência original.",
    checks: [
      "Postura versionada",
      "Fila de achados",
      "Remediação por proposta",
    ],
  },
  {
    number: "03",
    audience: "E-COMMERCE E OPERAÇÕES ONLINE",
    title: "Reduzir risco antes do pico",
    pain: "Disponibilidade e confiança do domínio afetam diretamente venda, comunicação e reputação da marca.",
    outcome:
      "A plataforma destaca exposições observáveis e permite preparar controles defensivos graduais com validação humana.",
    checks: ["Domínio e e-mail", "Sinais de tráfego", "Proteção gradual"],
  },
  {
    number: "04",
    audience: "CONSULTORIAS E PRESTADORES",
    title: "Organizar ativos autorizados de clientes",
    pain: "Evidências, aprovações e recomendações ficam espalhadas entre mensagens, documentos e ferramentas diferentes.",
    outcome:
      "Cada cliente permanece em escopo comprovado, com decisões rastreáveis e limites claros para qualquer execução.",
    checks: [
      "Autorização por DNS",
      "Trilha de auditoria",
      "Papéis no workspace",
    ],
  },
] as const;

export default function UseCasesPage() {
  return (
    <main className="marketing-page">
      <PublicPageBreadcrumb current="Casos de uso" path="/casos-de-uso" />
      <div className="marketing-grid" aria-hidden="true" />
      <CyberMarketingHeader />
      <section className="marketing-hero use-cases-hero">
        <span>CASOS DE USO · POSTURA EXTERNA</span>
        <h1>
          A mesma exposição.
          <br />
          <em>Dores diferentes.</em>
        </h1>
        <p>
          A CBSHub conecta sinais técnicos ao contexto de quem precisa decidir —
          sem prometer que uma ferramenta substitui toda a operação de
          segurança.
        </p>
      </section>
      <section className="use-case-list">
        {useCases.map((item) => (
          <article key={item.number}>
            <header>
              <span>{item.number}</span>
              <b>{item.audience}</b>
            </header>
            <div>
              <h2>{item.title}</h2>
              <section>
                <span>A DOR</span>
                <p>{item.pain}</p>
              </section>
              <section>
                <span>COM A CBSHUB</span>
                <p>{item.outcome}</p>
              </section>
              <ul>
                {item.checks.map((check) => (
                  <li key={check}>{check}</li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </section>
      <section className="use-case-cta">
        <div>
          <span>COMECE PELO QUE É VISÍVEL</span>
          <h2>Faça a primeira leitura do seu domínio sem cadastro.</h2>
        </div>
        <div>
          <Link className="marketing-button" href="/#diagnostico">
            Executar diagnóstico <span>→</span>
          </Link>
          <Link href="/precos">Ver plano de lançamento</Link>
        </div>
      </section>
      <CyberMarketingFooter />
    </main>
  );
}

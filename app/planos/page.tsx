import Link from "next/link";
import type { Metadata } from "next";
import { platformIdentity } from "../../domain/platform-identity";
import PricingClient from "./PricingClient";
import BrandMark from "../BrandMark";
import { PublicPageBreadcrumb } from "../StructuredData";

export const metadata: Metadata = {
  title: "Planos | CBSHub",
  description: "Planos CBSHub para contadores independentes e escritórios contábeis, com inteligência fiscal, cálculos, documentos e rastreabilidade.",
  alternates: { canonical: "/planos" },
  openGraph: { title: "Planos | CBSHub", description: "Plano profissional com inteligência fiscal, cálculos e dossiês versionados.", url: "/planos", images: ["/og-cbshub.png"], type: "website", locale: "pt_BR" },
  twitter: { card: "summary_large_image", title: "Planos | CBSHub", description: "Conheça o plano profissional do CBSHub.", images: ["/og-cbshub.png"] },
};

export default function PricingPage() {
  return (
    <main className="pricing-shell">
      <PublicPageBreadcrumb current="Planos" path="/planos" />
      <header className="pricing-nav">
        <Link className="landing-brand" href="/" aria-label="CBSHub — início"><BrandMark /><span className="cbs-wordmark"><strong>CBS</strong>Hub</span></Link>
        <div><Link href="/entrar">Entrar</Link><Link className="landing-cta small" href="/cadastro">Testar por 5 dias<span>→</span></Link></div>
      </header>
      <section className="pricing-hero">
        <span className="landing-eyebrow">OPERAÇÃO FISCAL PROFISSIONAL</span>
        <h1>Mais controle para atender sua carteira com segurança e escala.</h1>
        <p>Centralize inteligência fiscal, cálculos, documentos, revisão e rastreabilidade. Trabalhe sozinho no modo independente ou reúna toda a equipe em um workspace de escritório.</p>
        <div className="beta-guarantee"><i /> Teste gratuito por 5 dias · 10 empresas · todos os recursos</div>
      </section>
      <section className="pricing-content"><PricingClient signedIn={false} /></section>
      <section className="pricing-faq">
        <div><span className="landing-eyebrow">DÚVIDAS DIRETAS</span><h2>Sem surpresa na cobrança.</h2></div>
        <article><strong>Como a contratação é confirmada?</strong><p>A disponibilidade é consultada no servidor e a assinatura só começa depois que você escolhe cartão ou Pix e confirma o pagamento no Mercado Pago.</p></article>
        <article><strong>Como funciona o teste gratuito?</strong><p>Ele começa no cadastro, dura 5 dias e libera todos os recursos para até 10 empresas. Não há cobrança automática. O benefício é concedido uma única vez por aparelho.</p></article>
        <article><strong>Quais meios são aceitos?</strong><p>Cartão de crédito com renovação automática ou Pix mensal com QR Code e Copia e Cola gerados pelo Mercado Pago. No Pix, a confirmação entra na próxima renovação mensal.</p></article>
        <article><strong>Qual modo devo escolher?</strong><p>O Independente atende um profissional e até 10 empresas. O Escritório atende até 50 empresas e permite convidar quantas pessoas forem necessárias, sem cobrança por usuário.</p></article>
      </section>
      <footer className="pricing-footer"><span>CBSHub · Plataforma fiscal profissional · Responsável: {platformIdentity.responsibleName}</span><div><Link href="/privacidade">Privacidade</Link><Link href="/termos">Termos</Link><Link href="/responsavel">Responsável</Link><Link href="/">Voltar ao início</Link></div></footer>
    </main>
  );
}

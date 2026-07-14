import Link from "next/link";
import { getCurrentUser } from "../auth";
import PricingClient from "./PricingClient";

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const user = await getCurrentUser();
  return (
    <main className="pricing-shell">
      <header className="pricing-nav">
        <Link className="landing-brand" href="/" aria-label="Margem Clara — início"><span className="landing-brand-mark">mc</span><span>margem<strong>clara</strong></span></Link>
        <div><Link href={user ? "/app" : "/entrar"}>{user ? "Voltar ao painel" : "Entrar"}</Link><Link className="landing-cta small" href={user ? "/app" : "/cadastro"}>{user ? "Abrir aplicativo" : "Criar acesso"}<span>→</span></Link></div>
      </header>
      <section className="pricing-hero">
        <span className="landing-eyebrow">PREÇOS TRANSPARENTES</span>
        <h1>Comece grátis. Pague quando o produto já estiver gerando valor.</h1>
        <p>Durante o beta, todos continuam com acesso gratuito. Os planos abaixo preparam a operação comercial e podem ser ajustados antes do lançamento.</p>
        <div className="beta-guarantee"><i /> Beta gratuito ativo — sem cartão e sem cobrança automática</div>
      </section>
      <section className="pricing-content"><PricingClient signedIn={Boolean(user)} /></section>
      <section className="pricing-faq">
        <div><span className="landing-eyebrow">DÚVIDAS DIRETAS</span><h2>Sem surpresa na cobrança.</h2></div>
        <article><strong>Vou pagar agora?</strong><p>Não. Enquanto a conta de recebimento não estiver conectada, o botão apenas registra interesse e o acesso permanece gratuito.</p></article>
        <article><strong>Quais meios serão aceitos?</strong><p>A primeira versão usa assinatura recorrente do Mercado Pago. O checkout mostra os meios disponíveis para cada cliente.</p></article>
        <article><strong>Posso cancelar?</strong><p>Sim. A central de planos acompanha o status e permite solicitar o cancelamento da renovação.</p></article>
      </section>
      <footer className="pricing-footer"><span>Margem Clara · Beta 2026</span><Link href="/">Voltar ao início</Link></footer>
    </main>
  );
}

import Link from "next/link";
import { platformIdentity } from "../../domain/platform-identity";
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
        <article><strong>Quais meios são aceitos?</strong><p>Cartão de crédito com renovação automática ou Pix mensal com QR Code e Copia e Cola gerados pelo Mercado Pago.</p></article>
        <article><strong>Como funciona o Pix?</strong><p>O Pix não renova sozinho. O acesso só é ativado ou prorrogado depois da confirmação oficial, e um novo código é gerado a cada mês.</p></article>
      </section>
      <footer className="pricing-footer"><span>Margem Clara · Beta gratuito · Responsável: {platformIdentity.responsibleName}</span><div><Link href="/privacidade">Privacidade</Link><Link href="/termos">Termos</Link><Link href="/responsavel">Responsável</Link><Link href="/">Voltar ao início</Link></div></footer>
    </main>
  );
}

import Link from "next/link";
import { platformIdentity } from "../../domain/platform-identity";
import { getCurrentUser } from "../auth";
import PricingClient from "./PricingClient";
import { getPlatformOperationState } from "../platform-controls";

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const user = await getCurrentUser();
  const operation = await getPlatformOperationState();
  return (
    <main className="pricing-shell">
      <header className="pricing-nav">
        <Link className="landing-brand" href="/" aria-label="Margem Clara — início"><span className="landing-brand-mark">mc</span><span>margem<strong>clara</strong></span></Link>
        <div><Link href={user ? "/app" : "/entrar"}>{user ? "Voltar ao painel" : "Entrar"}</Link><Link className="landing-cta small" href={user ? "/app" : "/cadastro"}>{user ? "Abrir aplicativo" : "Criar acesso"}<span>→</span></Link></div>
      </header>
      <section className="pricing-hero">
        <span className="landing-eyebrow">PREÇOS TRANSPARENTES</span>
        <h1>Comece grátis. Pague quando o produto já estiver gerando valor.</h1>
        <p>{operation.betaEnabled ? "Durante o beta integral, todas as contas usam empresas e recursos sem restrição de pacote." : "Fora do beta, os limites de empresas e os módulos disponíveis seguem exatamente o pacote de cada conta."}</p>
        <div className="beta-guarantee"><i />{operation.betaEnabled ? " Beta integral ativo — novas cobranças bloqueadas" : " Operação comercial ativa — planos aplicados pelo servidor"}</div>
      </section>
      <section className="pricing-content"><PricingClient signedIn={Boolean(user)} /></section>
      <section className="pricing-faq">
        <div><span className="landing-eyebrow">DÚVIDAS DIRETAS</span><h2>Sem surpresa na cobrança.</h2></div>
        <article><strong>Vou pagar agora?</strong><p>{operation.paymentsEnabled ? "Somente se você escolher cartão ou Pix e confirmar o pagamento no Mercado Pago." : "Não. Com o beta integral ativo, novas cobranças ficam bloqueadas pelo servidor."}</p></article>
        <article><strong>Quais meios são aceitos?</strong><p>Cartão de crédito com renovação automática ou Pix mensal com QR Code e Copia e Cola gerados pelo Mercado Pago.</p></article>
        <article><strong>Como funciona o Pix?</strong><p>O Pix não renova sozinho. O acesso só é ativado ou prorrogado depois da confirmação oficial, e um novo código é gerado a cada mês.</p></article>
      </section>
      <footer className="pricing-footer"><span>Margem Clara · {operation.betaEnabled ? "Beta integral" : "Planos comerciais"} · Responsável: {platformIdentity.responsibleName}</span><div><Link href="/privacidade">Privacidade</Link><Link href="/termos">Termos</Link><Link href="/responsavel">Responsável</Link><Link href="/">Voltar ao início</Link></div></footer>
    </main>
  );
}

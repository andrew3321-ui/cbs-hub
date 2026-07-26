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
        <div><Link href={user ? "/app" : "/entrar"}>{user ? "Voltar ao painel" : "Entrar"}</Link><Link className="landing-cta small" href={user ? "/app" : "/cadastro"}>{user ? "Abrir aplicativo" : "Testar por 5 dias"}<span>→</span></Link></div>
      </header>
      <section className="pricing-hero">
        <span className="landing-eyebrow">OPERAÇÃO FISCAL PROFISSIONAL</span>
        <h1>Mais controle para atender sua carteira com segurança e escala.</h1>
        <p>Centralize inteligência fiscal, cálculos, documentos, revisão e rastreabilidade em uma única plataforma. O plano inclui 30 empresas e cresce junto com a sua operação.</p>
        <div className="beta-guarantee"><i /> Teste gratuito por 5 dias · 10 empresas · todos os recursos</div>
      </section>
      <section className="pricing-content"><PricingClient signedIn={Boolean(user)} /></section>
      <section className="pricing-faq">
        <div><span className="landing-eyebrow">DÚVIDAS DIRETAS</span><h2>Sem surpresa na cobrança.</h2></div>
        <article><strong>Como a contratação é confirmada?</strong><p>{operation.paymentsEnabled ? "A assinatura só começa depois que você escolhe cartão ou Pix e confirma o pagamento no Mercado Pago." : "Novas contratações estão temporariamente indisponíveis. Nenhuma cobrança será iniciada enquanto o pagamento estiver bloqueado."}</p></article>
        <article><strong>Como funciona o teste gratuito?</strong><p>Ele começa no cadastro, dura 5 dias e libera todos os recursos para até 10 empresas. Não há cobrança automática. O benefício é concedido uma única vez por aparelho.</p></article>
        <article><strong>Quais meios são aceitos?</strong><p>Cartão de crédito com renovação automática ou Pix mensal com QR Code e Copia e Cola gerados pelo Mercado Pago.</p></article>
        <article><strong>Como aumento minha carteira?</strong><p>Adicione blocos de 10 empresas por R$ 100 mensais. No cartão, o novo valor vai para as próximas cobranças; no Pix, entra na próxima renovação.</p></article>
      </section>
      <footer className="pricing-footer"><span>Margem Clara · Plataforma fiscal profissional · Responsável: {platformIdentity.responsibleName}</span><div><Link href="/privacidade">Privacidade</Link><Link href="/termos">Termos</Link><Link href="/responsavel">Responsável</Link><Link href="/">Voltar ao início</Link></div></footer>
    </main>
  );
}

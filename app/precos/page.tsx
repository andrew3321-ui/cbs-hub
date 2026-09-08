import type { Metadata } from "next";
import Link from "next/link";
import { cyberLaunchOffer, formatCyberPrice } from "../../domain/cyber-commercial";
import { CyberMarketingFooter, CyberMarketingHeader } from "../CyberMarketingShell";
import { PublicPageBreadcrumb } from "../StructuredData";

export const metadata: Metadata = {
  title: "Preços | CBSHub Cybersecurity",
  description: "Conheça o plano de lançamento da CBSHub para diagnóstico externo, monitoramento contínuo e evidências de segurança.",
  alternates: { canonical: "/precos" },
  openGraph: { title: "Preços | CBSHub Cybersecurity", description: "Um plano claro para acompanhar até três domínios autorizados.", url: "/precos", type: "website", locale: "pt_BR" },
  twitter: { card: "summary_large_image", title: "Preços | CBSHub Cybersecurity", description: "Plano de lançamento transparente para postura externa e defesa contínua." },
};

export default function PricingPage() {
  return <main className="marketing-page"><PublicPageBreadcrumb current="Preços" path="/precos" /><div className="marketing-grid" aria-hidden="true" />
    <CyberMarketingHeader />
    <section className="marketing-hero pricing-hero"><span>EARLY ACCESS · ABERTURA CONTROLADA</span><h1>Um plano direto.<br /><em>Sem surpresa na cobrança.</em></h1><p>A CBSHub está sendo liberada por etapas. Você pode reservar sua conta agora; a contratação só será confirmada quando o workspace estiver pronto para uso.</p></section>
    <section className="pricing-layout">
      <article className="pricing-primary-card"><header><span>PLANO DE LANÇAMENTO</span><b>Para pequenas equipes e empresas</b></header><div className="pricing-number"><strong>{formatCyberPrice()}</strong><span>por mês<br />por workspace</span></div><p>Visibilidade e acompanhamento defensivo para até {cyberLaunchOffer.domainLimit} domínios sob sua administração ou autorização.</p><ul><li><b>Postura externa passiva</b><span>DNS, e-mail, HTTPS e defesas do navegador.</span></li><li><b>Priorização assistida por IA</b><span>Achados organizados por evidência e impacto.</span></li><li><b>Monitoramento contínuo</b><span>Novos sinais entram na fila operacional.</span></li><li><b>Histórico rastreável</b><span>Evidências, decisões e mudanças versionadas.</span></li><li><b>Cloudflare controlada</b><span>Auditoria e propostas com aprovação humana.</span></li></ul><Link className="marketing-button" href="/cadastro">Reservar meu workspace <span>→</span></Link><small>Nenhum cartão é solicitado e nenhuma cobrança começa durante a abertura controlada.</small></article>
      <aside className="pricing-side"><article><span>INCLUÍDO</span><h2>Até 3 domínios</h2><p>Use o mesmo workspace para acompanhar a empresa principal, uma aplicação e outro ativo autorizado.</p></article><article><span>ANTES DE CONTRATAR</span><h2>Diagnóstico público</h2><p>Faça uma primeira leitura passiva sem cadastro e veja o formato dos achados.</p><Link href="/#diagnostico">Executar diagnóstico →</Link></article><article><span>TRANSPARÊNCIA</span><h2>O que ainda não prometemos</h2><p>O produto não substitui pentest profissional, SOC, auditoria formal ou resposta humana a incidentes.</p></article></aside>
    </section>
    <section className="marketing-faq"><header><span>DÚVIDAS COMERCIAIS</span><h2>Antes de reservar</h2></header><div><article><h3>Vou pagar agora?</h3><p>Não. Durante a abertura controlada a CBSHub não solicita cartão nem inicia cobrança.</p></article><article><h3>Quando começam os cinco dias?</h3><p>O período de avaliação fica reservado e só começa após a liberação do workspace.</p></article><article><h3>O preço já está garantido?</h3><p>R$ 297/mês é a oferta de lançamento apresentada hoje. Qualquer contratação exige sua confirmação expressa com preço e condições exibidos novamente.</p></article><article><h3>Posso cancelar?</h3><p>Quando os pagamentos forem ativados, o responsável poderá interromper a renovação conforme os termos apresentados na contratação.</p></article></div></section>
    <CyberMarketingFooter />
  </main>;
}

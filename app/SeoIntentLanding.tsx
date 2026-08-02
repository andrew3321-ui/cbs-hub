import Link from "next/link";
import { seoIntentPages, type SeoIntentPage } from "../domain/seo-intent-pages";
import { buildBreadcrumbStructuredData, buildSeoIntentPageStructuredData } from "../domain/seo-structured-data";
import BrandMark from "./BrandMark";
import SeoTrackedCta from "./SeoTrackedCta";
import { StructuredData } from "./StructuredData";

export default function SeoIntentLanding({ page }: { page: SeoIntentPage }) {
  const path = `/${page.slug}`;
  const ctaHref = `/cadastro?utm_source=google&utm_medium=organic&utm_campaign=${page.campaign}`;
  const related = Object.values(seoIntentPages).filter((candidate) => candidate.slug !== page.slug).slice(0, 3);
  return <main className="seo-intent-shell">
    <StructuredData value={buildSeoIntentPageStructuredData({ path, title: page.title, description: page.description, keywords: [page.primaryKeyword, ...page.relatedKeywords] })} />
    <StructuredData value={buildBreadcrumbStructuredData([{ name: "Início", path: "/" }, { name: page.headline, path }])} />
    <header className="seo-intent-nav">
      <Link className="cbs-lockup" href="/" aria-label="CBSHub — início"><BrandMark /><span className="cbs-wordmark"><strong>CBS</strong>Hub</span></Link>
      <nav><Link href="/metodologia">Metodologia</Link><Link href="/planos">Planos</Link><Link href="/entrar">Entrar</Link></nav>
      <SeoTrackedCta href={ctaHref} campaign={page.campaign} className="seo-intent-nav-cta">Testar por 5 dias →</SeoTrackedCta>
    </header>

    <section className="seo-intent-hero">
      <div><span className="seo-intent-eyebrow">{page.eyebrow}</span><h1>{page.headline}</h1><p>{page.lead}</p><div className="seo-intent-actions"><SeoTrackedCta href={ctaHref} campaign={page.campaign} className="seo-intent-primary">Começar teste completo →</SeoTrackedCta><Link href="/metodologia">Ver metodologia</Link></div><small>5 dias · até 10 empresas · sem cartão</small></div>
      <aside><span>{page.proofLabel}</span><strong>{page.proofValue}</strong><p>{page.proofText}</p><ul>{page.facts.map((fact) => <li key={fact}>✓ {fact}</li>)}</ul></aside>
    </section>

    <section className="seo-intent-section"><div className="seo-intent-section-title"><span>VALOR OPERACIONAL</span><h2>O que muda no trabalho</h2></div><div className="seo-intent-grid">{page.benefits.map((benefit, index) => <article key={benefit.title}><em>0{index + 1}</em><h3>{benefit.title}</h3><p>{benefit.text}</p></article>)}</div></section>

    <section className="seo-intent-section seo-intent-workflow"><div className="seo-intent-section-title"><span>DA ENTRADA À ENTREGA</span><h2>Um processo que pode ser conferido</h2></div><ol>{page.workflow.map((step, index) => <li key={step.title}><b>{String(index + 1).padStart(2, "0")}</b><div><h3>{step.title}</h3><p>{step.text}</p></div></li>)}</ol></section>

    <section className="seo-intent-section seo-intent-proof"><div><span>INTENÇÃO ATENDIDA</span><h2>{page.intent}</h2><p>O conteúdo desta página representa recursos existentes no CBSHub. A plataforma não promete cobertura total e identifica como suportado, parcial ou não suportado cada recorte técnico.</p></div><SeoTrackedCta href={ctaHref} campaign={`${page.campaign}_proof`} className="seo-intent-primary">Validar com uma empresa →</SeoTrackedCta></section>

    <section className="seo-intent-section seo-intent-faq"><div className="seo-intent-section-title"><span>DÚVIDAS OBJETIVAS</span><h2>Antes de começar</h2></div>{page.faqs.map((item) => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</section>

    <section className="seo-intent-sources"><span>REFERÊNCIAS E TRANSPARÊNCIA</span><div>{page.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.label} ↗</a>)}</div><p>Fontes externas são apresentadas para conferência. A vigência e a aplicabilidade dependem dos fatos da operação.</p></section>

    <nav className="seo-intent-related" aria-label="Soluções relacionadas"><span>EXPLORE OUTROS FLUXOS</span><div>{related.map((item) => <Link key={item.slug} href={`/${item.slug}`}>{item.primaryKeyword} →</Link>)}</div></nav>

    <section className="seo-intent-final"><h2>Leve uma operação real para um fluxo rastreável.</h2><p>Teste todos os recursos durante cinco dias e confira se o método cabe na rotina do seu escritório.</p><SeoTrackedCta href={ctaHref} campaign={`${page.campaign}_final`} className="seo-intent-primary">Criar meu espaço profissional →</SeoTrackedCta></section>
    <footer className="seo-intent-footer"><span>CBSHub · Inteligência tributária rastreável</span><div><Link href="/privacidade">Privacidade</Link><Link href="/termos">Termos</Link><a href="mailto:supportofficial@cbshub.com.br">Suporte</a></div></footer>
  </main>;
}

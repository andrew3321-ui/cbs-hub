import type { Metadata } from "next";
import Link from "next/link";
import { evaluateTaxContentFreshness, taxContentTaxonomy, taxContentTopics, TAX_CONTENT_VERSION } from "../../domain/tax-content";
import { buildBreadcrumbStructuredData, buildTaxContentCollectionStructuredData } from "../../domain/seo-structured-data";
import { StructuredData } from "../StructuredData";
import { TaxContentNavigation } from "../TaxContentNavigation";

export const metadata: Metadata = {
  title: "Central de conteúdo tributário para contadores | CBSHub",
  description: "Guias técnicos versionados de Reforma Tributária, ICMS/ST, ISS, Simples, PIS/Cofins, retenções e IPI com fontes oficiais, vigência e limites.",
  alternates: { canonical: "/conteudos" },
  openGraph: { title: "Central de conteúdo tributário | CBSHub", description: "Fontes oficiais, fatos mínimos, vigência e histórico em guias técnicos para contadores.", url: "/conteudos", images: [{ url: "/og-cbshub.png", width: 1734, height: 907 }], type: "website", locale: "pt_BR" },
  twitter: { card: "summary_large_image", title: "Central de conteúdo tributário | CBSHub", description: "Guias técnicos versionados e atualizados para contadores.", images: ["/og-cbshub.png"] },
};

const topics = Object.values(taxContentTopics);

export default function TaxContentHubPage() {
  return <main className="tax-content-shell tax-content-hub">
    <StructuredData value={buildTaxContentCollectionStructuredData(topics.map((topic) => ({ path: `/conteudos/${topic.slug}`, title: topic.title })))} />
    <StructuredData value={buildBreadcrumbStructuredData([{ name: "Início", path: "/" }, { name: "Conteúdos", path: "/conteudos" }])} />
    <TaxContentNavigation />
    <section className="tax-content-hub-hero"><span>CENTRAL TÉCNICA · {TAX_CONTENT_VERSION}</span><h1>Conteúdo tributário que mostra fonte, vigência, versão e limite.</h1><p>Use a central para estruturar uma análise antes de entrar no cálculo. Cada guia separa referência pública de conclusão fiscal e é automaticamente rebaixado quando sua janela de revisão vence.</p><div><b>{topics.length} guias pilares</b><b>{new Set(topics.flatMap((topic) => topic.sources.map((source) => source.code))).size} fontes oficiais</b><b>{taxContentTaxonomy.length} recortes catalogados</b></div></section>
    <section className="tax-content-section"><header><span>TAXONOMIA OPERACIONAL</span><h2>Escolha por tributo e operação</h2></header><div className="tax-content-hub-grid">{topics.map((topic) => {
      const freshness = evaluateTaxContentFreshness(topic);
      return <Link href={`/conteudos/${topic.slug}`} key={topic.slug} className={`freshness-${freshness.freshness}`}><span>{topic.tax}</span><h2>{topic.operation}</h2><p>{topic.description}</p><footer><small>{freshness.operationalStatus} · v{topic.version}</small><b>Ver guia →</b></footer></Link>;
    })}</div></section>
    <section className="tax-content-section tax-content-governance"><div><span>GOVERNANÇA DE CONTEÚDO</span><h2>Nenhuma página permanece “atual” por inércia.</h2></div><ol><li><b>01</b><p>Fontes oficiais registram identidade, vigência e data da última conferência.</p></li><li><b>02</b><p>A janela de revisão gera aviso antes do vencimento.</p></li><li><b>03</b><p>Conteúdo vencido é rebaixado para referência suspensa até nova versão.</p></li></ol></section>
    <footer className="tax-content-footer"><span>CBSHub · Conteúdo técnico versionado</span><div><Link href="/metodologia">Metodologia</Link><Link href="/privacidade">Privacidade</Link><a href="mailto:supportofficial@cbshub.com.br">Suporte</a></div></footer>
  </main>;
}

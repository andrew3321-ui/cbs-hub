import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { citableAssets, ORGANIC_AUTHORITY_VERSION, organicAuthorityPolicy } from "../../domain/organic-authority";
import { PublicPageBreadcrumb, StructuredData } from "../StructuredData";

export const metadata: Metadata = {
  title: "Imprensa e recursos oficiais | CBSHub",
  description: "Press kit, identidade visual e ativos públicos citáveis da CBSHub para imprensa, entidades e parceiros editoriais.",
  alternates: { canonical: "/imprensa" },
  openGraph: { title: "CBSHub — imprensa e recursos oficiais", description: "Identidade, imagens e referências públicas verificáveis da plataforma.", url: "/imprensa", images: [{ url: "/og-cbshub.png", width: 1734, height: 907 }], type: "website", locale: "pt_BR" },
  twitter: { card: "summary_large_image", title: "CBSHub — imprensa e recursos oficiais", description: "Identidade, imagens e referências públicas verificáveis da plataforma.", images: ["/og-cbshub.png"] },
};

const descriptions = {
  short: "A CBSHub é uma plataforma de inteligência tributária determinística para contadores, tributaristas e escritórios contábeis.",
  full: "A CBSHub organiza fatos fiscais, regras versionadas, fontes oficiais, cálculos determinísticos e dossiês rastreáveis em um único ambiente. A plataforma informa limites e pendências em vez de apresentar uma conclusão quando faltam dados para sustentá-la.",
};

export default function PressKitPage() {
  const updatedAt = "13/08/2026";
  return <main className="press-shell">
    <PublicPageBreadcrumb current="Imprensa e recursos oficiais" path="/imprensa" />
    <StructuredData value={{ "@context": "https://schema.org", "@type": "Organization", name: "CBSHub", url: "https://cbshub.com.br", logo: "https://cbshub.com.br/cbshub-icon-1024.png", email: "supportofficial@cbshub.com.br", sameAs: [] }} />
    <header className="press-nav"><Link href="/" className="press-brand"><Image src="/cbshub-icon.svg" alt="" width="42" height="42" /><b>CBSHub</b></Link><nav><Link href="/conteudos">Conteúdos</Link><Link href="/metodologia">Metodologia</Link><Link href="/cadastro">Testar por 5 dias</Link></nav></header>
    <section className="press-hero"><span>IMPRENSA E RECURSOS OFICIAIS · {ORGANIC_AUTHORITY_VERSION}</span><h1>Materiais verificáveis para citar, apresentar e compartilhar a CBSHub.</h1><p>Esta página reúne descrições aprovadas, identidade visual, contatos e ativos públicos. Todo material aponta para páginas estáveis, com autoria institucional e data de revisão.</p><div><b>Atualizado em {updatedAt}</b><b>Responsável editorial: CBSHub</b><b>Contato: supportofficial@cbshub.com.br</b></div></section>
    <section className="press-section press-descriptions"><header><span>DESCRIÇÕES APROVADAS</span><h2>Sobre a CBSHub</h2></header><div><article><b>Versão curta</b><p>{descriptions.short}</p></article><article><b>Versão completa</b><p>{descriptions.full}</p></article></div></section>
    <section className="press-section"><header><span>ATIVOS CITÁVEIS</span><h2>Referências públicas com URL permanente</h2></header><div className="press-assets">{citableAssets.map((asset) => <Link key={asset.href} href={asset.href}><span>{asset.category}</span><h3>{asset.title}</h3><p>{asset.description}</p><b>Abrir referência →</b></Link>)}</div></section>
    <section className="press-section press-downloads"><header><span>IDENTIDADE VISUAL</span><h2>Arquivos oficiais</h2></header><div><a href="/cbshub-icon.svg" download><Image src="/cbshub-icon.svg" width="64" height="64" alt="Ícone CBSHub" /><b>Ícone vetorial</b><small>SVG · fundos claros ou escuros</small></a><a href="/cbshub-icon-1024.png" download><Image src="/cbshub-icon-1024.png" width="64" height="64" alt="Ícone CBSHub em PNG" /><b>Ícone social</b><small>PNG · 1024 × 1024</small></a><a href="/og-cbshub.png" download><Image src="/og-cbshub.png" width="64" height="64" alt="Imagem institucional CBSHub" /><b>Imagem institucional</b><small>PNG · compartilhamento e imprensa</small></a></div></section>
    <section className="press-section press-policy"><div><span>POLÍTICA DE DISTRIBUIÇÃO</span><h2>Autoridade conquistada, nunca fabricada.</h2><p>A CBSHub não compra links, não participa de redes privadas e não envia comentários automatizados. Menções são registradas somente com URL pública, contexto e data de conferência.</p></div><ul>{organicAuthorityPolicy.prohibited.map((item) => <li key={item}>× {item}</li>)}</ul></section>
    <footer className="press-footer"><div><b>CBSHub</b><span>Inteligência tributária determinística</span></div><div><a href="mailto:supportofficial@cbshub.com.br">supportofficial@cbshub.com.br</a><Link href="/privacidade">Privacidade</Link><Link href="/termos">Termos</Link></div></footer>
  </main>;
}

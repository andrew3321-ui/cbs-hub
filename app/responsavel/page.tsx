import Link from "next/link";
import { platformIdentity } from "../../domain/platform-identity";
import BrandMark from "../BrandMark";
import type { Metadata } from "next";
import { PublicPageBreadcrumb } from "../StructuredData";

export const metadata: Metadata = {
  title: "Responsável pela plataforma | CBSHub",
  description: "Identificação pública do responsável pela plataforma CBSHub, com proteção dos documentos pessoais.",
  alternates: { canonical: "/responsavel" },
  openGraph: { title: "Responsável pela plataforma | CBSHub", description: "Identificação institucional e limites da declaração pública do CBSHub.", url: "/responsavel", type: "website", locale: "pt_BR" },
  twitter: { card: "summary_large_image", title: "Responsável pela plataforma | CBSHub", description: "Identificação institucional pública do CBSHub." },
};

export default function PlatformOwnerPage() {
  return (
    <main className="ownership-shell">
      <PublicPageBreadcrumb current="Responsável pela plataforma" path="/responsavel" />
      <header className="ownership-nav">
        <Link className="landing-brand" href="/"><BrandMark /><span className="cbs-wordmark"><strong>CBS</strong>Hub</span></Link>
        <div><Link href="/#como-funciona">Como funciona</Link><Link className="ownership-app-link" href="/app">Abrir plataforma →</Link></div>
      </header>

      <section className="ownership-card">
        <div className="ownership-heading">
          <span>IDENTIFICAÇÃO INSTITUCIONAL · {platformIdentity.version}</span>
          <h1>Responsável pela plataforma</h1>
          <p>O CBSHub é atualmente conduzido por pessoa física. Esta página identifica publicamente o responsável sem expor CPF, endereço ou outros documentos pessoais.</p>
        </div>
        <div className="ownership-registration">
          <span>RESPONSÁVEL DECLARADO</span>
          <strong>{platformIdentity.responsibleName}</strong>
          <b>Pessoa física · documento não exibido publicamente</b>
          <small>Condições comerciais e de contratação publicadas nos Termos de Uso</small>
        </div>
        <div className="ownership-checks">
          <article className="valid"><span>✓</span><p><b>Responsável identificado</b><small>Nome informado publicamente para contato institucional e prestação de contas.</small></p></article>
          <article className="valid"><span>✓</span><p><b>Documentos pessoais protegidos</b><small>CPF, endereço e dados privados não são expostos nesta página pública.</small></p></article>
        </div>
        <div className="ownership-boundary">
          <b>Escopo desta declaração</b>
          <p>Esta identificação registra quem declara conduzir a operação da plataforma. Ela não equivale ao registro da marca ou do domínio e não comprova isoladamente a titularidade do código-fonte. Antes de qualquer contratação paga, a identificação fiscal obrigatória do fornecedor deverá constar nos termos e no fluxo comercial.</p>
        </div>
        <div className="ownership-actions"><a href="/api/public/ownership" target="_blank" rel="noreferrer">Ver registro público estruturado <span>↗</span></a><Link href="/#como-funciona">Conhecer os controles da plataforma <span>→</span></Link></div>
      </section>

      <footer className="ownership-footer"><span>CBSHub · Responsável: {platformIdentity.responsibleName}</span><div><Link href="/privacidade">Privacidade</Link> · <Link href="/termos">Termos</Link> · <Link href="/">Voltar ao início</Link></div></footer>
    </main>
  );
}

import Link from "next/link";
import { platformIdentity } from "../../domain/platform-identity";

export const metadata = {
  title: "Responsável pela plataforma | Margem Clara",
  description: "Identificação pública do responsável pela plataforma Margem Clara, com proteção dos documentos pessoais.",
};

export default function PlatformOwnerPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: platformIdentity.responsibleName,
    description: `Responsável declarado pela operação da plataforma ${platformIdentity.brand}`,
  };

  return (
    <main className="ownership-shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <header className="ownership-nav">
        <Link className="landing-brand" href="/"><span className="landing-brand-mark">mc</span><span>margem<strong>clara</strong></span></Link>
        <div><Link href="/metodologia">Metodologia</Link><Link className="ownership-app-link" href="/app">Abrir plataforma →</Link></div>
      </header>

      <section className="ownership-card">
        <div className="ownership-heading">
          <span>IDENTIFICAÇÃO INSTITUCIONAL · {platformIdentity.version}</span>
          <h1>Responsável pela plataforma</h1>
          <p>A Margem Clara é atualmente conduzida por pessoa física. Esta página identifica publicamente o responsável sem expor CPF, endereço ou outros documentos pessoais.</p>
        </div>
        <div className="ownership-registration">
          <span>RESPONSÁVEL DECLARADO</span>
          <strong>{platformIdentity.responsibleName}</strong>
          <b>Pessoa física · documento não exibido publicamente</b>
          <small>Beta gratuito sem cobrança automática ativa</small>
        </div>
        <div className="ownership-checks">
          <article className="valid"><span>✓</span><p><b>Responsável identificado</b><small>Nome informado publicamente para contato institucional e prestação de contas.</small></p></article>
          <article className="valid"><span>✓</span><p><b>Documentos pessoais protegidos</b><small>CPF, endereço e dados privados não são expostos nesta página pública.</small></p></article>
        </div>
        <div className="ownership-boundary">
          <b>Escopo desta declaração</b>
          <p>Esta identificação registra quem declara conduzir a operação da plataforma. Ela não equivale ao registro da marca ou do domínio e não comprova isoladamente a titularidade do código-fonte. Antes de qualquer contratação paga, a identificação fiscal obrigatória do fornecedor deverá constar nos termos e no fluxo comercial.</p>
        </div>
        <div className="ownership-actions"><a href="/api/public/ownership" target="_blank" rel="noreferrer">Ver registro público estruturado <span>↗</span></a><Link href="/metodologia">Conhecer os controles da plataforma <span>→</span></Link></div>
      </section>

      <footer className="ownership-footer"><span>Margem Clara · Responsável: {platformIdentity.responsibleName}</span><Link href="/">Voltar ao início</Link></footer>
    </main>
  );
}

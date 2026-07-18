import Link from "next/link";
import { platformIdentity, RECEITA_CNPJ_LOOKUP_URL } from "../../domain/platform-identity";

export const metadata = {
  title: "Responsável pela plataforma | Margem Clara",
  description: "Identificação cadastral declarada pelo responsável pela plataforma Margem Clara.",
};

export default function PlatformOwnerPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: platformIdentity.brand,
    identifier: { "@type": "PropertyValue", propertyID: "CNPJ", value: platformIdentity.cnpj },
  };

  return (
    <main className="ownership-shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <header className="ownership-nav">
        <Link className="landing-brand" href="/"><span className="landing-brand-mark">mc</span><span>margem<strong>clara</strong></span></Link>
        <div><Link href="/metodologia">Metodologia</Link><Link className="ownership-app-link" href="/app">Abrir plataforma →</Link></div>
      </header>

      <section className="ownership-card">
        <div className="ownership-heading"><span>IDENTIFICAÇÃO INSTITUCIONAL · {platformIdentity.version}</span><h1>Responsável declarado pela plataforma</h1><p>Este registro identifica o CNPJ informado pelo titular do Margem Clara, sem transformar uma autodeclaração em validação cadastral oficial.</p></div>
        <div className="ownership-registration">
          <span>TITULAR CADASTRAL DECLARADO</span>
          <strong>{platformIdentity.formattedCnpj}</strong>
          <small>CNPJ numérico · declarado em 18/07/2026</small>
        </div>
        <div className="ownership-checks">
          <article className="valid"><span>✓</span><p><b>Dígitos verificadores válidos</b><small>Estrutura numérica conferida pelo sistema.</small></p></article>
          <article className="pending"><span>!</span><p><b>Cadastro oficial não verificado</b><small>Razão social e situação cadastral ainda não foram importadas da Receita Federal.</small></p></article>
        </div>
        <div className="ownership-boundary"><b>O que este registro significa</b><p>O CNPJ está anexado à identidade pública do produto como informação fornecida pelo titular. Este registro não substitui contrato social, comprovante de inscrição, registro de marca ou outro documento capaz de provar propriedade jurídica.</p></div>
        <div className="ownership-actions"><a href={RECEITA_CNPJ_LOOKUP_URL} target="_blank" rel="noreferrer">Consultar comprovante na Receita Federal <span>↗</span></a><a href="/api/public/ownership" target="_blank" rel="noreferrer">Ver registro público estruturado <span>↗</span></a></div>
      </section>

      <footer className="ownership-footer"><span>Margem Clara · CNPJ {platformIdentity.formattedCnpj}</span><Link href="/">Voltar ao início</Link></footer>
    </main>
  );
}

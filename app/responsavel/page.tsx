import Link from "next/link";
import { platformIdentity, RECEITA_CNPJ_LOOKUP_URL } from "../../domain/platform-identity";

export const metadata = {
  title: "Responsável pela plataforma | Margem Clara",
  description: "Identificação cadastral verificada do responsável pela plataforma Margem Clara.",
};

export default function PlatformOwnerPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: platformIdentity.legalName,
    alternateName: platformIdentity.brand,
    taxID: platformIdentity.formattedCnpj,
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
        <div className="ownership-heading"><span>IDENTIFICAÇÃO INSTITUCIONAL · {platformIdentity.version}</span><h1>Responsável cadastral da plataforma</h1><p>O CNPJ, a razão social e a situação ativa foram conferidos em comprovante oficial da Receita Federal apresentado pelo responsável.</p></div>
        <div className="ownership-registration">
          <span>IDENTIDADE EMPRESARIAL DOCUMENTADA</span>
          <strong>{platformIdentity.legalName}</strong>
          <b>CNPJ {platformIdentity.formattedCnpj}</b>
          <small>Comprovante emitido pela Receita Federal em 17/07/2026 às 21:42:07</small>
        </div>
        <div className="ownership-checks">
          <article className="valid"><span>✓</span><p><b>Situação cadastral ativa</b><small>Status constante no comprovante oficial apresentado.</small></p></article>
          <article className="valid"><span>✓</span><p><b>Razão social conferida</b><small>Identidade empresarial vinculada ao CNPJ completo.</small></p></article>
        </div>
        <div className="ownership-boundary"><b>Limite jurídico desta verificação</b><p>O documento comprova a existência, a razão social e a situação cadastral ativa na data de emissão. Ele não comprova isoladamente a titularidade jurídica da marca Margem Clara, do domínio ou do código-fonte, que dependem de registros e instrumentos próprios.</p></div>
        <div className="ownership-actions"><a href={RECEITA_CNPJ_LOOKUP_URL} target="_blank" rel="noreferrer">Consultar comprovante na Receita Federal <span>↗</span></a><a href="/api/public/ownership" target="_blank" rel="noreferrer">Ver registro público estruturado <span>↗</span></a></div>
      </section>

      <footer className="ownership-footer"><span>Margem Clara · CNPJ {platformIdentity.formattedCnpj}</span><Link href="/">Voltar ao início</Link></footer>
    </main>
  );
}

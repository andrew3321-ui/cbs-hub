import type { Metadata } from "next";
import Link from "next/link";
import BrandMark from "../BrandMark";
import CybersecurityPreview from "../CybersecurityPreview";
import "./cybersecurity.css";

export const metadata: Metadata = {
  title: "CBSHub Cybersecurity — Diagnóstico de exposição digital",
  description: "Faça uma verificação passiva do domínio da sua empresa e identifique sinais de exposição em DNS, e-mail, HTTPS e cabeçalhos de segurança.",
  alternates: { canonical: "/cyberseguranca" },
  openGraph: {
    title: "CBSHub Cybersecurity — Encontre exposições antes que virem incidentes",
    description: "Diagnóstico passivo de domínio, e-mail e site para pequenas e médias empresas.",
    url: "/cyberseguranca",
    locale: "pt_BR",
    type: "website",
  },
};

export default function CybersecurityPage() {
  return (
    <main className="cyber-page">
      <header className="cyber-nav">
        <Link className="cyber-lockup" href="/cyberseguranca" aria-label="CBSHub Cybersecurity — início">
          <BrandMark />
          <span><strong>CBS</strong>Hub <small>Cybersecurity</small></span>
        </Link>
        <nav aria-label="Navegação de cybersecurity">
          <a href="#diagnostico">Diagnóstico</a>
          <a href="#protege">O que verificamos</a>
          <a href="#metodo">Como funciona</a>
        </nav>
        <div className="cyber-nav-actions">
          <Link className="cyber-login" href="/entrar">Entrar</Link>
          <a className="cyber-button cyber-button-small" href="#diagnostico">Verificar domínio <span>→</span></a>
        </div>
      </header>

      <section className="cyber-hero">
        <div className="cyber-hero-copy">
          <span className="cyber-eyebrow"><i /> Nova frente CBSHub</span>
          <h1>Descubra o que deixa sua empresa <em>exposta</em> antes que vire incidente.</h1>
          <p>
            Uma primeira leitura de segurança do seu domínio, e-mail e site — clara o suficiente
            para decidir o que corrigir primeiro, sem instalar nada e sem alterar seu ambiente.
          </p>
          <div className="cyber-hero-actions">
            <a className="cyber-button" href="#diagnostico">Fazer diagnóstico inicial <span>↓</span></a>
            <a className="cyber-quiet-link" href="#metodo">Entender a verificação</a>
          </div>
          <ul className="cyber-assurances" aria-label="Condições da verificação">
            <li><b>Passiva</b><span>sem exploração</span></li>
            <li><b>Imediata</b><span>resultado em instantes</span></li>
            <li><b>Sem cadastro</b><span>para o primeiro diagnóstico</span></li>
          </ul>
        </div>

        <div className="cyber-hero-visual" aria-hidden="true">
          <div className="cyber-orbit cyber-orbit-one" />
          <div className="cyber-orbit cyber-orbit-two" />
          <div className="cyber-shield">
            <BrandMark />
            <span>SUPERFÍCIE DIGITAL</span>
            <strong>VISÍVEL</strong>
            <small>DNS · E-mail · Web</small>
          </div>
          <div className="cyber-signal cyber-signal-a"><i /> SPF e DMARC</div>
          <div className="cyber-signal cyber-signal-b"><i /> HTTPS e HSTS</div>
          <div className="cyber-signal cyber-signal-c"><i /> DNS público</div>
        </div>
      </section>

      <section className="cyber-diagnosis-section" id="diagnostico">
        <div className="cyber-section-heading">
          <span>DIAGNÓSTICO INICIAL</span>
          <h2>Veja sua superfície como ela aparece do lado de fora.</h2>
          <p>Informe apenas o domínio público. A CBSHub consulta configurações publicamente acessíveis e não executa testes invasivos.</p>
        </div>
        <CybersecurityPreview />
      </section>

      <section className="cyber-checks-section" id="protege">
        <div className="cyber-section-heading cyber-section-heading-light">
          <span>SINAIS QUE IMPORTAM</span>
          <h2>Uma leitura simples para riscos que costumam passar despercebidos.</h2>
        </div>
        <div className="cyber-check-grid">
          <article><b>01</b><h3>Domínio e DNS</h3><p>Confere resolução pública e indícios básicos da infraestrutura exposta.</p></article>
          <article><b>02</b><h3>Proteção do e-mail</h3><p>Verifica MX, SPF e DMARC, controles importantes contra falsificação do seu domínio.</p></article>
          <article><b>03</b><h3>Segurança do site</h3><p>Analisa HTTPS e cabeçalhos que reduzem classes comuns de abuso no navegador.</p></article>
          <article><b>04</b><h3>Próxima ação</h3><p>Transforma achados técnicos em uma ordem de correção compreensível.</p></article>
        </div>
      </section>

      <section className="cyber-method" id="metodo">
        <div>
          <span className="cyber-eyebrow"><i /> Segurança com escopo claro</span>
          <h2>Primeiro enxergar. Depois priorizar. Só então proteger continuamente.</h2>
        </div>
        <ol>
          <li><b>1</b><span><strong>Descoberta passiva</strong>Leitura dos controles públicos, sem acesso à rede interna.</span></li>
          <li><b>2</b><span><strong>Priorização</strong>Separação entre proteção adequada, atenção e exposição.</span></li>
          <li><b>3</b><span><strong>Plano de proteção</strong>A evolução da CBSHub conectará monitoramento e evidências em um só workspace.</span></li>
        </ol>
      </section>

      <section className="cyber-final-cta">
        <div><span>COMECE PELO QUE JÁ ESTÁ VISÍVEL</span><h2>Sua primeira decisão de segurança pode levar menos de um minuto.</h2></div>
        <a className="cyber-button cyber-button-light" href="#diagnostico">Verificar meu domínio <span>↑</span></a>
      </section>

      <footer className="cyber-footer">
        <div className="cyber-lockup"><BrandMark /><span><strong>CBS</strong>Hub <small>Cybersecurity</small></span></div>
        <p>Diagnóstico informativo. Não substitui pentest, auditoria ou resposta a incidentes.</p>
        <div><Link href="/privacidade">Privacidade</Link><Link href="/termos">Termos</Link><Link href="/">Produto fiscal</Link></div>
      </footer>
    </main>
  );
}

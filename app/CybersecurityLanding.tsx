import Link from "next/link";
import BrandMark from "./BrandMark";
import CybersecurityPreview from "./CybersecurityPreview";

export default function CybersecurityLanding({ homePath = "/" }: { homePath?: string }) {
  return (
    <main className="cyber-page">
      <div className="cyber-grid-overlay" aria-hidden="true" />
      <header className="cyber-nav">
        <Link className="cyber-lockup" href={homePath} aria-label="CBSHub Cybersecurity — início">
          <BrandMark />
          <span><strong>CBS</strong>Hub <small>Cybersecurity</small></span>
        </Link>
        <nav aria-label="Navegação de cybersecurity">
          <a href="#diagnostico">Diagnóstico</a><a href="#protege">Superfície de ataque</a><a href="#metodo">Como funciona</a>
        </nav>
        <div className="cyber-nav-actions"><Link className="cyber-login" href="/entrar">Entrar</Link><a className="cyber-button cyber-button-small" href="#diagnostico">Escanear domínio <span>→</span></a></div>
      </header>

      <section className="cyber-hero">
        <div className="cyber-hero-copy">
          <span className="cyber-eyebrow"><i /> Cyber posture intelligence</span>
          <h1>Encontre sua exposição <em>antes do atacante.</em></h1>
          <p>A CBSHub transforma sinais públicos do seu domínio, e-mail e site em um mapa claro de risco — para sua empresa saber o que corrigir primeiro, sem instalar nada.</p>
          <div className="cyber-hero-actions"><a className="cyber-button" href="#diagnostico">Iniciar diagnóstico gratuito <span>↓</span></a><a className="cyber-quiet-link" href="#metodo">Como protegemos o escopo</a></div>
          <ul className="cyber-assurances" aria-label="Condições da verificação">
            <li><b>100% passiva</b><span>nenhuma exploração</span></li><li><b>Resposta imediata</b><span>prioridades em instantes</span></li><li><b>Zero cadastro</b><span>no primeiro diagnóstico</span></li>
          </ul>
        </div>

        <div className="cyber-hero-visual" aria-hidden="true">
          <div className="cyber-orbit cyber-orbit-one" /><div className="cyber-orbit cyber-orbit-two" /><div className="cyber-scan-line" />
          <div className="cyber-shield"><BrandMark /><span>ATTACK SURFACE</span><strong>MONITORED</strong><small>DNS · EMAIL · WEB</small></div>
          <div className="cyber-signal cyber-signal-a"><i /> SPF + DMARC <b>OK</b></div><div className="cyber-signal cyber-signal-b"><i /> HTTPS + HSTS <b>SCAN</b></div><div className="cyber-signal cyber-signal-c"><i /> DNS PÚBLICO <b>LIVE</b></div>
        </div>
      </section>

      <section className="cyber-threat-strip" aria-label="Camadas observadas"><span><i /> DOMAIN POSTURE</span><span><i /> EMAIL AUTH</span><span><i /> WEB HARDENING</span><span><i /> EXTERNAL EXPOSURE</span></section>

      <section className="cyber-diagnosis-section" id="diagnostico">
        <div className="cyber-section-heading"><span>EXTERNAL ATTACK SURFACE · SCAN 01</span><h2>Veja sua empresa como alguém de fora consegue enxergar.</h2><p>Informe apenas o domínio público. A CBSHub consulta configurações publicamente acessíveis e não executa testes invasivos.</p></div>
        <CybersecurityPreview />
      </section>

      <section className="cyber-checks-section" id="protege">
        <div className="cyber-section-heading cyber-section-heading-light"><span>VISIBILIDADE PRIMEIRO. PROTEÇÃO DEPOIS.</span><h2>Controles esquecidos viram portas de entrada.</h2></div>
        <div className="cyber-check-grid">
          <article><b>01 / DISCOVER</b><h3>Domínio e DNS</h3><p>Identifica resolução pública e sinais básicos da infraestrutura visível na internet.</p></article>
          <article><b>02 / AUTHENTICATE</b><h3>Proteção do e-mail</h3><p>Verifica MX, SPF e DMARC contra falsificação e abuso do domínio corporativo.</p></article>
          <article><b>03 / HARDEN</b><h3>Segurança do site</h3><p>Analisa HTTPS e cabeçalhos que reduzem classes comuns de ataque no navegador.</p></article>
          <article><b>04 / PRIORITIZE</b><h3>Próxima ação</h3><p>Traduz achados técnicos em uma ordem de correção compreensível para a empresa.</p></article>
        </div>
      </section>

      <section className="cyber-method" id="metodo">
        <div><span className="cyber-eyebrow"><i /> Continuous cyber posture</span><h2>Descobrir. Priorizar. Corrigir. Acompanhar.</h2><p className="cyber-method-intro">A nova CBSHub nasce para tirar a segurança do campo das suposições e transformar exposição em decisões rastreáveis.</p></div>
        <ol><li><b>01</b><span><strong>Descoberta passiva</strong>Leitura dos controles públicos, sem acesso à rede interna.</span></li><li><b>02</b><span><strong>Priorização por risco</strong>Separação objetiva entre proteção adequada, atenção e exposição.</span></li><li><b>03</b><span><strong>Plano de proteção</strong>Monitoramento e evidências conectados em um único workspace.</span></li></ol>
      </section>

      <section className="cyber-final-cta"><div><span>START WITH VISIBILITY</span><h2>Sua primeira decisão de segurança pode levar menos de um minuto.</h2></div><a className="cyber-button cyber-button-light" href="#diagnostico">Analisar meu domínio <span>↑</span></a></section>

      <footer className="cyber-footer"><div className="cyber-lockup"><BrandMark /><span><strong>CBS</strong>Hub <small>Cybersecurity</small></span></div><p>Diagnóstico informativo. Não substitui pentest, auditoria ou resposta a incidentes.<br />Suporte: <a href="mailto:supportofficial@cbshub.com.br">supportofficial@cbshub.com.br</a></p><div><Link href="/privacidade">Privacidade</Link><Link href="/termos">Termos</Link><Link href="/app?guest=1">Produto fiscal</Link></div></footer>
    </main>
  );
}

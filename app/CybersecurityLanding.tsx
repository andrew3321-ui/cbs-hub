import Link from "next/link";
import CybersecurityPreview from "./CybersecurityPreview";
import { CyberMarketingFooter, CyberMarketingHeader } from "./CyberMarketingShell";

export default function CybersecurityLanding() {
  return (
    <main className="cyber-page">
      <div className="cyber-grid-overlay" aria-hidden="true" />
      <CyberMarketingHeader />

      <section className="cyber-hero">
        <div className="cyber-hero-copy">
          <span className="cyber-eyebrow"><i /> Visibilidade para decidir com segurança</span>
          <h1>Entenda sua exposição. <em>Priorize o que importa.</em></h1>
          <p>Veja os controles públicos do seu domínio, e-mail e aplicações em um relatório claro. Acompanhe evidências e saiba por onde começar a correção.</p>
          <div className="cyber-hero-actions"><a className="cyber-button" href="#diagnostico">Iniciar diagnóstico gratuito <span>↓</span></a><a className="cyber-quiet-link" href="#metodo">Como protegemos o escopo</a></div>
          <ul className="cyber-assurances" aria-label="Condições da verificação">
            <li><b>100% passiva</b><span>nenhuma exploração</span></li><li><b>Resposta imediata</b><span>prioridades em instantes</span></li><li><b>Zero cadastro</b><span>no primeiro diagnóstico</span></li>
          </ul>
        </div>

        <div className="cyber-hero-visual" aria-label="Exemplo ilustrativo de um relatório de postura externa">
          <div className="cyber-preview-window"><div className="cyber-preview-window-head"><span className="cyber-preview-window-mark">C</span><span><b>Visão da superfície</b><small>Exemplo ilustrativo · empresa.com.br</small></span><i>Relatório</i></div><div className="cyber-preview-window-body"><div className="cyber-preview-window-title"><span>ANÁLISE EXTERNA</span><strong>O que está visível agora</strong><p>Controles públicos organizados por prioridade e evidência.</p></div><div className="cyber-preview-window-metrics"><div><span>Domínio e DNS</span><strong>Observado</strong><small>Resolução pública disponível</small></div><div><span>Proteção de e-mail</span><strong>Revisar</strong><small>SPF e DMARC em análise</small></div><div><span>Segurança web</span><strong>Verificar</strong><small>HTTPS e cabeçalhos</small></div></div><div className="cyber-preview-window-bottom"><span><i /> Evidências ligadas à fonte</span><span>Ver prioridades <b>↗</b></span></div></div></div>
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

      <section className="cyber-final-cta"><div><span>COMECE COM VISIBILIDADE</span><h2>Transforme sinais dispersos em uma lista clara de prioridades.</h2></div><div className="cyber-final-actions"><Link className="cyber-button cyber-button-light" href="/produto">Conhecer o produto <span>→</span></Link><Link className="cyber-final-link" href="/precos">Ver planos</Link></div></section>

      <CyberMarketingFooter />
    </main>
  );
}

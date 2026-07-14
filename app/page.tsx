import Link from "next/link";
import { getCurrentUser } from "./auth";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const user = await getCurrentUser();
  const primaryPath = user ? "/app" : "/cadastro";
  const loginPath = user ? "/app" : "/entrar";
  const demoPath = user ? "/app?view=academy" : "/cadastro";

  return (
    <main className="landing-shell">
      <header className="landing-nav">
        <Link className="landing-brand" href="/" aria-label="Margem Clara — início">
          <span className="landing-brand-mark">mc</span>
          <span>margem<strong>clara</strong></span>
        </Link>
        <nav aria-label="Navegação da apresentação">
          <a href="#produto">Produto</a>
          <a href="#como-funciona">Como funciona</a>
          <a href="#demonstracoes">Demonstrações</a>
          <Link href="/planos">Planos</Link>
        </nav>
        <div className="landing-nav-actions">
          <Link className="landing-login" href={loginPath}>{user ? "Ir para o painel" : "Entrar"}</Link>
          <Link className="landing-cta small" href={primaryPath}>{user ? "Continuar análise" : "Começar gratuitamente"}<span>→</span></Link>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <span className="landing-pill"><i /> Reforma tributária sem decisões no escuro</span>
          <h1>Veja o impacto tributário <em>antes</em> que ele apareça na margem.</h1>
          <p>Transforme dados fiscais em cenários claros de preço, imposto e rentabilidade para cada empresa da sua carteira.</p>
          <div className="landing-hero-actions">
            <Link className="landing-cta" href={primaryPath}>{user ? "Abrir meu painel" : "Criar acesso gratuito"}<span>→</span></Link>
            <a className="landing-watch" href="#demonstracoes"><span className="play-dot">▶</span> Ver como funciona</a>
          </div>
          <div className="landing-trust">
            <span><b>01</b> Sem cartão</span>
            <span><b>02</b> Dados separados por empresa</span>
            <span><b>03</b> Primeira análise em minutos</span>
          </div>
        </div>

        <div className="landing-product-stage" aria-label="Prévia do painel Margem Clara">
          <div className="stage-orbit orbit-one" />
          <div className="stage-orbit orbit-two" />
          <div className="landing-product-window">
            <div className="product-window-top">
              <span className="mini-brand"><i>mc</i> margem<b>clara</b></span>
              <span className="window-company">Aurora Consultoria⌄</span>
              <span className="window-avatar">AC</span>
            </div>
            <div className="product-window-body">
              <aside>
                <span className="active">⌂ <b>Visão geral</b></span>
                <span>▦ <b>Empresas</b></span>
                <span>↗ <b>Simulador</b></span>
                <span>▤ <b>Documentos</b></span>
              </aside>
              <div className="window-content">
                <p className="window-kicker">EMPRESA ATIVA · SIMPLES NACIONAL</p>
                <h2>Aurora Consultoria Ltda.</h2>
                <div className="window-alert"><span>↘</span><div><small>ALERTA DE MARGEM</small><b>Margem pode cair 4,8 p.p.</b></div><button>Simular reajuste</button></div>
                <div className="window-metrics">
                  <article><small>Receita analisada</small><b>R$ 284.650</b><em>cenário atualizado</em></article>
                  <article><small>Projeção IBS + CBS</small><b>R$ 38.288</b><em className="risk">+ R$ 13.665</em></article>
                  <article><small>Margem projetada</small><b>19,4%</b><em className="risk">↓ 4,8 p.p.</em></article>
                </div>
                <div className="window-lower">
                  <div className="fake-chart"><span style={{height:"28%"}} /><span style={{height:"45%"}} /><span style={{height:"38%"}} /><span style={{height:"67%"}} /><span style={{height:"54%"}} /><span style={{height:"82%"}} /><span style={{height:"69%"}} /></div>
                  <div className="window-decision"><small>PRÓXIMA DECISÃO</small><b>Reajuste recomendado</b><strong>5,6%</strong><p>Protege a margem atual no cenário projetado.</p></div>
                </div>
              </div>
            </div>
          </div>
          <div className="floating-proof proof-risk"><span>Margem protegida</span><b>+ R$ 12.940</b></div>
          <div className="floating-proof proof-time"><span>Tempo de análise</span><b>03 min</b></div>
        </div>
      </section>

      <section className="landing-proof-strip" aria-label="Benefícios principais">
        <p>Feito para quem precisa <strong>explicar o impacto</strong>, não apenas calcular.</p>
        <div><span>Contadores consultivos</span><i /> <span>PMEs de serviços</span><i /> <span>Times financeiros</span><i /> <span>Gestores comerciais</span></div>
      </section>

      <section className="landing-section product-section" id="produto">
        <div className="section-heading">
          <span className="landing-eyebrow">DO DADO À DECISÃO</span>
          <h2>Uma visão que a planilha não consegue entregar.</h2>
          <p>Concentre a carteira, compare cenários e traduza a mudança tributária em ações comerciais objetivas.</p>
        </div>
        <div className="benefit-grid">
          <article className="benefit-card featured"><span className="benefit-number">01</span><div className="benefit-icon">▦</div><h3>Carteira priorizada por risco</h3><p>Veja quais empresas estão protegidas, pendentes ou com margem ameaçada antes de abrir cada análise.</p><div className="risk-list"><span><i className="red" /> Horizonte Digital <b>Em risco</b></span><span><i className="green" /> Aurora Consultoria <b>Protegida</b></span><span><i /> Norte Logística <b>Sem análise</b></span></div></article>
          <article className="benefit-card"><span className="benefit-number">02</span><div className="benefit-icon">↗</div><h3>Simulação em linguagem de negócio</h3><p>Teste alíquotas, custos e reajustes. O sistema mostra o efeito em reais e a decisão recomendada.</p><div className="mini-result"><small>REAJUSTE PARA PROTEGER A MARGEM</small><strong>5,6%</strong><span>Aplicar ao cenário →</span></div></article>
          <article className="benefit-card"><span className="benefit-number">03</span><div className="benefit-icon">XML</div><h3>Receita extraída dos documentos</h3><p>Leia XMLs localmente, reconheça os valores e leve a base identificada direto para a simulação.</p><div className="document-line"><span>XML</span><div><b>42 documentos lidos</b><small>R$ 284.650 identificados</small></div><em>✓</em></div></article>
        </div>
      </section>

      <section className="landing-section steps-section" id="como-funciona">
        <div className="section-heading left">
          <span className="landing-eyebrow">SIMPLES DE COMEÇAR</span>
          <h2>Da primeira empresa ao plano de ação.</h2>
        </div>
        <div className="steps-grid">
          <article><span>1</span><small>ORGANIZE</small><h3>Cadastre a empresa</h3><p>Registre regime, setor e CNPJ para manter cada cliente em seu próprio contexto.</p></article>
          <article><span>2</span><small>SIMULE</small><h3>Informe as premissas</h3><p>Receita, carga atual, projeção e custos viram um cenário comparável em segundos.</p></article>
          <article><span>3</span><small>DECIDA</small><h3>Proteja a margem</h3><p>Receba a faixa de reajuste e um resumo executivo pronto para a conversa com o cliente.</p></article>
        </div>
      </section>

      <section className="landing-section demo-section" id="demonstracoes">
        <div className="section-heading demo-heading">
          <div><span className="landing-eyebrow">APRENDA VENDO</span><h2>Demonstrações que acompanham você dentro do produto.</h2></div>
          <p>Vídeos interativos, curtos e com capítulos mostram o caminho completo sem tirar você da plataforma.</p>
        </div>
        <div className="demo-teaser-grid">
          <article><div className="teaser-screen teal"><span className="teaser-play">▶</span><small>COMECE AQUI</small><b>Da empresa ao diagnóstico</b><em>1:48</em></div><h3>Primeira análise completa</h3><p>Cadastre um cliente e crie um cenário base.</p></article>
          <article><div className="teaser-screen lime"><span className="teaser-play">▶</span><small>SIMULADOR</small><b>Teste o reajuste ideal</b><em>2:12</em></div><h3>Proteção de margem</h3><p>Entenda o cálculo e aplique a recomendação.</p></article>
          <article><div className="teaser-screen coral"><span className="teaser-play">▶</span><small>CARTEIRA</small><b>Priorize quem precisa agir</b><em>1:35</em></div><h3>Gestão multiempresa</h3><p>Use o risco para organizar a próxima conversa.</p></article>
        </div>
        <Link className="landing-cta centered" href={demoPath}>{user ? "Abrir central de demonstrações" : "Entrar e assistir gratuitamente"}<span>→</span></Link>
      </section>

      <section className="landing-final-cta">
        <div><span className="landing-eyebrow">MARGEM CLARA</span><h2>Troque a incerteza por uma decisão explicável.</h2><p>Comece com uma empresa, simule o impacto e mostre o caminho para proteger a rentabilidade.</p></div>
        <Link className="landing-cta light" href={primaryPath}>{user ? "Voltar ao painel" : "Criar acesso gratuito"}<span>→</span></Link>
      </section>

      <footer className="landing-footer">
        <Link className="landing-brand" href="/"><span className="landing-brand-mark">mc</span><span>margem<strong>clara</strong></span></Link>
        <p>Inteligência tributária para decisões comerciais mais claras.</p>
        <span><Link href="/planos">Planos</Link> · © 2026 Margem Clara</span>
      </footer>
    </main>
  );
}

import Link from "next/link";
import BrandMark from "./BrandMark";
import LandingHeroShowcase from "./LandingHeroShowcase";
import { getCurrentUser } from "./auth";
import { coverageMetrics } from "../domain/national-tax-coverage";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const user = await getCurrentUser();
  const coverage = coverageMetrics();
  const primaryPath = user ? "/app" : "/cadastro";
  const loginPath = user ? "/app" : "/entrar";
  const demoPath = user ? "/app?view=academy" : "/cadastro";

  return (
    <main className="cbs-landing">
      <header className="cbs-landing-nav">
        <Link className="cbs-lockup" href="/" aria-label="CBSHub — início">
          <BrandMark />
          <span className="cbs-wordmark"><strong>CBS</strong>Hub</span>
        </Link>

        <nav aria-label="Navegação principal">
          <a href="#plataforma">Plataforma</a>
          <a href="#fluxo">Como funciona</a>
          <a href="#cobertura">Cobertura</a>
          <a href="#confiabilidade">Confiabilidade</a>
          <Link href="/planos">Planos</Link>
        </nav>

        <div className="cbs-nav-actions">
          <Link className="cbs-text-link" href={loginPath}>{user ? "Abrir painel" : "Entrar"}</Link>
          <Link className="cbs-button cbs-button-small" href={primaryPath}>
            {user ? "Continuar" : "Teste por 5 dias"} <span>→</span>
          </Link>
        </div>
      </header>

      <section className="cbs-hero">
        <div className="cbs-hero-copy">
          <span className="cbs-kicker"><i /> Central de inteligência tributária</span>
          <h1>Da regra fiscal à decisão <em>defendível.</em></h1>
          <p>
            Pesquise normas, estruture os fatos da operação, execute cálculos determinísticos
            e entregue dossiês com fonte, memória e versão — em um único ambiente.
          </p>

          <div className="cbs-hero-actions">
            <Link className="cbs-button" href={primaryPath}>
              {user ? "Abrir meu workspace" : "Começar teste completo"} <span>→</span>
            </Link>
            <a className="cbs-secondary-action" href="#plataforma">
              Explorar a plataforma <span>↓</span>
            </a>
          </div>

          <div className="cbs-trial-proof" aria-label="Condições do teste">
            <span><b>5 dias</b><small>acesso completo</small></span>
            <span><b>10 empresas</b><small>para validar o fluxo</small></span>
            <span><b>Sem cartão</b><small>cadastro direto</small></span>
          </div>
        </div>

        <LandingHeroShowcase />
      </section>

      <section className="cbs-audience-bar" aria-label="Público do CBSHub">
        <p>Um workspace fiscal para quem precisa <strong>pesquisar, calcular, revisar e responder.</strong></p>
        <div>
          <span>Escritórios contábeis</span><i />
          <span>Contadores consultivos</span><i />
          <span>Tributaristas</span><i />
          <span>Responsáveis técnicos</span>
        </div>
      </section>

      <section className="cbs-section cbs-platform-section" id="plataforma">
        <div className="cbs-section-heading">
          <span className="cbs-eyebrow">UM HUB, QUATRO CAMADAS</span>
          <h2>Mais do que encontrar uma alíquota.</h2>
          <p>O CBSHub transforma uma dúvida fiscal em um processo documentado, com limites explícitos em cada etapa.</p>
        </div>

        <div className="cbs-capability-grid">
          <article className="cbs-capability-card cbs-capability-featured">
            <span className="cbs-card-index">01</span>
            <div className="cbs-card-icon">⌕</div>
            <h3>Inteligência fiscal estruturada</h3>
            <p>Faça a pergunta em linguagem natural. O motor identifica tributo, rota, produto e os fatos que ainda faltam — sem IA e sem inventar conclusões.</p>
            <div className="cbs-search-sample">
              <span>ICMS-ST · SP → MG · autopeças</span>
              <b>9 fatos identificados</b>
            </div>
          </article>

          <article className="cbs-capability-card">
            <span className="cbs-card-index">02</span>
            <div className="cbs-card-icon">∑</div>
            <h3>Cálculo determinístico</h3>
            <p>Fórmulas em centavos, parâmetros versionados e bloqueio automático quando um dado jurídico essencial não está confirmado.</p>
            <div className="cbs-memory-sample">
              <span>Base da operação</span><b>R$ 10.000,00</b>
              <span>Memória</span><b>6 etapas</b>
              <span>Arredondamento</span><b>Verificado</b>
            </div>
          </article>

          <article className="cbs-capability-card">
            <span className="cbs-card-index">03</span>
            <div className="cbs-card-icon">≡</div>
            <h3>Dossiê fiscal versionado</h3>
            <p>Resultado, premissas, fontes oficiais, vigência, pendências e hash reunidos em uma entrega rastreável para o cliente.</p>
            <div className="cbs-dossier-sample">
              <i>✓</i><span><b>Versão íntegra</b><small>Pronta para revisão responsável</small></span>
            </div>
          </article>

          <article className="cbs-capability-card">
            <span className="cbs-card-index">04</span>
            <div className="cbs-card-icon">◇</div>
            <h3>Cobertura sem maquiagem</h3>
            <p>Cada cenário é classificado como suportado, parcial ou não suportado. O que falta para concluir aparece antes de qualquer número.</p>
            <div className="cbs-coverage-sample">
              <span className="supported">Suportado</span>
              <span className="partial">Parcial</span>
              <span className="blocked">Não suportado</span>
            </div>
          </article>
        </div>
      </section>

      <section className="cbs-coverage-section" id="cobertura">
        <div className="cbs-coverage-copy">
          <span className="cbs-eyebrow">COBERTURA PÚBLICA E VERSIONADA</span>
          <h2>Você sabe onde pode confiar — e onde precisa conferir.</h2>
          <p>
            A matriz pública separa mapeamento nacional, recortes profundos e cenários ainda
            incompletos. Nenhuma meta interna é apresentada como regra pronta.
          </p>
          <a href="/api/public/coverage" target="_blank" rel="noreferrer">Consultar indicador público <span>↗</span></a>
        </div>
        <div className="cbs-coverage-metrics">
          <article><small>ICMS GERAL</small><b>{coverage.states}<em>/27</em></b><span>UFs mapeadas</span></article>
          <article><small>ISS PROFUNDO</small><b>{coverage.cities}</b><span>cidades prioritárias</span></article>
          <article><small>ST PRIORITÁRIA</small><b>{coverage.stSegments}</b><span>segmentos controlados</span></article>
          <article><small>FONTES</small><b>{coverage.sourceCount}</b><span>referências primárias</span></article>
        </div>
      </section>

      <section className="cbs-section cbs-workflow-section" id="fluxo">
        <div className="cbs-section-heading cbs-section-heading-left">
          <span className="cbs-eyebrow">DO QUESTIONAMENTO À ENTREGA</span>
          <h2>Um fluxo que acompanha o raciocínio técnico.</h2>
        </div>
        <div className="cbs-workflow-grid">
          <article><span>01</span><div><small>PERGUNTE</small><h3>Descreva a operação</h3><p>Rota, produto, regime, finalidade e período entram no mesmo contexto.</p></div></article>
          <article><span>02</span><div><small>ESTRUTURE</small><h3>Complete os fatos</h3><p>O sistema mostra exatamente o que falta antes de liberar uma conclusão.</p></div></article>
          <article><span>03</span><div><small>REVISE</small><h3>Confira regra e memória</h3><p>Fonte, vigência, fórmula e versão ficam lado a lado para conferência.</p></div></article>
          <article><span>04</span><div><small>ENTREGUE</small><h3>Compartilhe o dossiê</h3><p>O cliente recebe um resultado congelado, rastreável e com limites claros.</p></div></article>
        </div>
      </section>

      <section className="cbs-assurance-section" id="confiabilidade">
        <div className="cbs-assurance-copy">
          <span className="cbs-eyebrow">CONFIABILIDADE OPERACIONAL</span>
          <h2>O sistema prefere bloquear a adivinhar.</h2>
          <p>
            Regras fiscais mudam. Por isso, cada resposta depende de fatos mínimos, fonte oficial,
            período de vigência e testes regressivos. Se um elo não confere, o resultado não é liberado.
          </p>
          <Link href="/metodologia">Conhecer a metodologia <span>→</span></Link>
        </div>
        <div className="cbs-assurance-board">
          <div><span>01</span><p><b>Fontes oficiais</b><small>Links, dispositivos e datas de conferência</small></p><em>ATIVO</em></div>
          <div><span>02</span><p><b>Reexecução automática</b><small>Casos de referência a cada mudança</small></p><em>914 CASOS</em></div>
          <div><span>03</span><p><b>Integridade de versão</b><small>Hash identifica qualquer alteração</small></p><em>SHA-256</em></div>
          <div><span>04</span><p><b>Revisão responsável</b><small>Autoria e decisão preservadas na entrega</small></p><em>RASTREÁVEL</em></div>
        </div>
      </section>

      <section className="cbs-section cbs-personas-section">
        <div className="cbs-section-heading">
          <span className="cbs-eyebrow">FEITO PARA O TRABALHO FISCAL REAL</span>
          <h2>Cada profissional entra pelo problema que precisa resolver.</h2>
        </div>
        <div className="cbs-persona-grid">
          <article><small>CONTADOR CONSULTIVO</small><h3>Responda clientes com mais contexto.</h3><p>Transforme dúvidas recorrentes em análises documentadas, comparáveis e prontas para explicar.</p></article>
          <article><small>TRIBUTARISTA</small><h3>Concentre regra, cálculo e evidência.</h3><p>Reduza o tempo gasto procurando fontes e reconstruindo memórias em arquivos separados.</p></article>
          <article><small>ESCRITÓRIO CONTÁBIL</small><h3>Padronize a qualidade da equipe.</h3><p>Separe preparação, revisão e entrega sem perder autoria, histórico ou controle da carteira.</p></article>
        </div>
      </section>

      <section className="cbs-final-cta">
        <div>
          <span className="cbs-eyebrow">TESTE O FLUXO COMPLETO</span>
          <h2>Comece com uma dúvida fiscal real.</h2>
          <p>Cinco dias, até 10 empresas e todos os módulos liberados. Sem cartão no cadastro.</p>
        </div>
        <div className="cbs-final-actions">
          <Link className="cbs-button cbs-button-light" href={primaryPath}>
            {user ? "Voltar ao workspace" : "Criar meu acesso"} <span>→</span>
          </Link>
          <Link href={demoPath}>{user ? "Ver demonstrações" : "Conhecer por dentro"}</Link>
        </div>
      </section>

      <footer className="cbs-footer">
        <Link className="cbs-lockup" href="/">
          <BrandMark />
          <span className="cbs-wordmark"><strong>CBS</strong>Hub</span>
        </Link>
        <p>Suporte: <a href="mailto:supportofficial@cbshub.com.br">supportofficial@cbshub.com.br</a></p>
        <nav aria-label="Links institucionais">
          <Link href="/privacidade">Privacidade</Link>
          <Link href="/termos">Termos</Link>
          <Link href="/metodologia">Metodologia</Link>
          <Link href="/planos">Planos</Link>
        </nav>
        <small>© 2026 CBSHub</small>
      </footer>
    </main>
  );
}

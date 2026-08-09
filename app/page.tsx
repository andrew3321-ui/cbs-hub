import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import BrandMark from "./BrandMark";
import LandingHeroShowcase from "./LandingHeroShowcase";
import LandingVideoShowcase from "./LandingVideoShowcase";
import { getCurrentUser } from "./auth";
import { coverageMetrics } from "../domain/national-tax-coverage";
import { buildHomeStructuredData } from "../domain/seo-structured-data";
import { StructuredData } from "./StructuredData";
import LandingTrackedCta from "./LandingTrackedCta";
import { fiscalShowcaseSummary } from "./fiscal-showcase.generated";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "CBSHub — Pesquisa, cálculo e relatório fiscal em um só fluxo",
  description: "Reduza o tempo gasto procurando normas, refazendo cálculos e montando relatórios. Organize fatos, fontes oficiais, memória e entrega fiscal no mesmo fluxo.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "CBSHub — Pare de refazer a análise fiscal do zero",
    description: "Da pesquisa da norma ao relatório para o cliente: fatos, cálculo, fontes e histórico em um só fluxo para contadores e tributaristas.",
    url: "/",
    images: [{ url: "/og-cbshub.png", width: 1734, height: 907, alt: "CBSHub — pesquisa, cálculo e relatório fiscal em um só fluxo" }],
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CBSHub — Pesquisa, cálculo e relatório fiscal em um só fluxo",
    description: "Menos tempo procurando, recalculando e reescrevendo. Mais contexto pronto para revisar e entregar.",
    images: ["/og-cbshub.png"],
  },
};

type LandingPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const campaignKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

export default async function LandingPage({ searchParams }: LandingPageProps) {
  const user = await getCurrentUser();
  const incomingParams = await searchParams;
  const campaignParams = new URLSearchParams();
  for (const key of campaignKeys) {
    const rawValue = incomingParams[key];
    const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
    if (value?.trim()) campaignParams.set(key, value.trim().slice(0, 120));
  }
  if (!user && campaignParams.size > 0) redirect(`/app?guest=1&${campaignParams.toString()}`);
  const coverage = coverageMetrics();
  const primaryPath = user ? "/app" : "/app?guest=1";
  const loginPath = user ? "/app" : "/entrar";
  const demoPath = user ? "/app?view=academy" : "#fluxo";

  return (
    <main className="cbs-landing">
      <StructuredData value={buildHomeStructuredData()} />
      <header className="cbs-landing-nav">
        <Link className="cbs-lockup" href="/" aria-label="CBSHub — início">
          <BrandMark />
          <span className="cbs-wordmark"><strong>CBS</strong>Hub</span>
        </Link>

        <nav aria-label="Navegação principal">
          <a href="#economia">O que economiza</a>
          <a href="#plataforma">Funcionalidades</a>
          <a href="#fluxo">Como funciona</a>
          <a href="#cobertura">Cobertura</a>
          <a href="#confiabilidade">Confiabilidade</a>
          <Link href="/planos">Planos</Link>
        </nav>

        <div className="cbs-nav-actions">
          <Link className="cbs-text-link" href={loginPath}>{user ? "Abrir painel" : "Entrar"}</Link>
          <LandingTrackedCta className="cbs-button cbs-button-small" href={primaryPath} campaign="home_nav_trial">
            {user ? "Continuar" : "Experimentar agora"} <span>→</span>
          </LandingTrackedCta>
        </div>
      </header>

      <section className="cbs-hero">
        <div className="cbs-hero-copy">
          <span className="cbs-kicker"><i /> Menos abas, planilhas e retrabalho</span>
          <h1>Pare de refazer a análise fiscal <em>do zero.</em></h1>
          <p>
            Reúna pesquisa da norma, fatos da operação, cálculo, revisão e relatório no mesmo fluxo.
            Responda mais rápido ao cliente com a fonte oficial, a memória e o histórico prontos para conferir.
          </p>

          <div className="cbs-hero-scope" aria-label="Áreas disponíveis no CBSHub">
            <span>ICMS e ST</span><span>ISS e retenções</span><span>Simples e federais</span><span>IBS/CBS e Reforma</span>
          </div>

          <div className="cbs-hero-actions">
            <LandingTrackedCta className="cbs-button" href={primaryPath} campaign="home_hero_real_case">
              {user ? "Abrir meu workspace" : "Testar com um caso real"} <span>→</span>
            </LandingTrackedCta>
            <a className="cbs-secondary-action" href="#economia">
              Ver onde economiza tempo <span>↓</span>
            </a>
          </div>

          <div className="cbs-trial-proof" aria-label="Condições do teste">
            <span><b>5 dias</b><small>acesso completo</small></span>
            <span><b>10 empresas</b><small>para validar o fluxo</small></span>
            <span><b>Sem cadastro</b><small>Sem cartão ao continuar</small></span>
          </div>
        </div>

        <LandingHeroShowcase authenticated={Boolean(user)} />
      </section>

      <LandingVideoShowcase />

      <section className="cbs-audience-bar" aria-label="Público do CBSHub">
        <p>A dúvida chega em uma linha. <strong>A resposta não precisa ficar espalhada em seis lugares.</strong></p>
        <div>
          <span>Escritórios contábeis</span><i />
          <span>Contadores consultivos</span><i />
          <span>Tributaristas</span><i />
          <span>Responsáveis técnicos</span>
        </div>
      </section>

      <section className="cbs-time-section" id="economia">
        <div className="cbs-time-heading">
          <span className="cbs-eyebrow">O TEMPO SOME NO TRABALHO FRAGMENTADO</span>
          <h2>O trabalho não é só calcular. É encontrar, conferir, explicar e provar.</h2>
          <p>
            Quando cada etapa vive em um portal, uma planilha ou um arquivo diferente, toda nova dúvida
            obriga você a reconstruir o contexto. O CBSHub preserva esse contexto do início à entrega.
          </p>
        </div>

        <div className="cbs-time-comparison">
          <div className="cbs-fragmented-work">
            <div className="cbs-comparison-label"><i /> SEM UM FLUXO CONECTADO</div>
            <h3>Uma pergunta curta vira uma sequência de tarefas manuais.</h3>
            <div className="cbs-pain-list">
              <span><b>01</b><p>Vasculhar portais e localizar a norma aplicável.</p></span>
              <span><b>02</b><p>Reunir rota, produto, regime, período e finalidade.</p></span>
              <span><b>03</b><p>Transferir parâmetros e remontar o cálculo na planilha.</p></span>
              <span><b>04</b><p>Conferir fonte, vigência, exceções e arredondamento.</p></span>
              <span><b>05</b><p>Reescrever a explicação e montar o relatório do cliente.</p></span>
              <span><b>06</b><p>Procurar depois qual versão sustentou aquela resposta.</p></span>
            </div>
          </div>

          <div className="cbs-connected-work">
            <div className="cbs-comparison-label"><i /> COM O CBSHUB</div>
            <h3>O mesmo contexto acompanha a análise inteira.</h3>
            <div className="cbs-connected-flow" aria-label="Fluxo conectado do CBSHub">
              <span><small>PERGUNTA</small><b>Estrutura os fatos</b></span><i>→</i>
              <span><small>REGRA</small><b>Expõe fonte e vigência</b></span><i>→</i>
              <span><small>CÁLCULO</small><b>Preserva a memória</b></span><i>→</i>
              <span><small>ENTREGA</small><b>Gera o dossiê versionado</b></span>
            </div>
            <div className="cbs-time-payoff">
              <strong>Menos tempo remontando.</strong>
              <p>Mais tempo para revisar, orientar o cliente e conduzir a decisão com evidência.</p>
            </div>
            <LandingTrackedCta className="cbs-inline-cta" href={primaryPath} campaign="home_time_saving_case">
              Levar uma dúvida real para o CBSHub <span>→</span>
            </LandingTrackedCta>
          </div>
        </div>
      </section>

      <section className="cbs-section cbs-platform-section" id="plataforma">
        <div className="cbs-section-heading">
          <span className="cbs-eyebrow">FUNCIONALIDADES QUE ELIMINAM RETRABALHO</span>
          <h2>Da primeira pesquisa ao relatório, sem recomeçar no meio.</h2>
          <p>Cada módulo resolve uma parte do trabalho e entrega seu contexto para a etapa seguinte.</p>
        </div>

        <div className="cbs-capability-grid">
          <article className="cbs-capability-card cbs-capability-featured">
            <span className="cbs-card-index">01</span>
            <div className="cbs-card-icon">⌕</div>
            <h3>Encontre a regra e saiba o que ainda falta</h3>
            <p>Faça a pergunta em linguagem natural. O motor identifica tributo, rota, produto e os fatos pendentes — sem IA e sem inventar uma conclusão.</p>
            <div className="cbs-search-sample">
              <span>ICMS-ST · SP → MG · autopeças</span>
              <b>9 fatos identificados</b>
            </div>
          </article>

          <article className="cbs-capability-card">
            <span className="cbs-card-index">02</span>
            <div className="cbs-card-icon">∑</div>
            <h3>Calcule sem remontar a planilha</h3>
            <p>Use fórmulas reproduzíveis em centavos, parâmetros versionados e bloqueio automático quando um dado jurídico essencial não estiver confirmado.</p>
            <div className="cbs-memory-sample">
              <span>Base da operação</span><b>R$ 10.000,00</b>
              <span>Memória</span><b>6 etapas</b>
              <span>Arredondamento</span><b>Verificado</b>
            </div>
          </article>

          <article className="cbs-capability-card">
            <span className="cbs-card-index">03</span>
            <div className="cbs-card-icon">≡</div>
            <h3>Gere a entrega sem reescrever tudo</h3>
            <p>Resultado, premissas, fontes oficiais, vigência, pendências e hash ficam reunidos em um dossiê rastreável para o cliente.</p>
            <div className="cbs-dossier-sample">
              <i>✓</i><span><b>Versão íntegra</b><small>Pronta para revisão responsável</small></span>
            </div>
          </article>

          <article className="cbs-capability-card">
            <span className="cbs-card-index">04</span>
            <div className="cbs-card-icon">◇</div>
            <h3>Saiba quando não concluir</h3>
            <p>Cada cenário é classificado como suportado, parcial ou não suportado. O que impede a conclusão aparece antes de qualquer número.</p>
            <div className="cbs-coverage-sample">
              <span className="supported">Suportado</span>
              <span className="partial">Parcial</span>
              <span className="blocked">Não suportado</span>
            </div>
          </article>
        </div>

        <div className="cbs-available-now">
          <div>
            <span className="cbs-eyebrow">O QUE VOCÊ JÁ PODE USAR NO TESTE</span>
            <h3>Ferramentas para o trabalho que acontece depois da pesquisa.</h3>
          </div>
          <div className="cbs-available-grid">
            <article><span>XML</span><h4>Auditar NF-e em lote</h4><p>Confira estrutura, chave, protocolo, totais, itens e divergências — com o XML bruto descartado após o processamento.</p></article>
            <article><span>RTC</span><h4>Projetar IBS e CBS</h4><p>Compare carga atual, transição, custos e margem com premissas visíveis para a Reforma Tributária.</p></article>
            <article><span>PME</span><h4>Mapear obrigações federais</h4><p>Organize tributos, retenções, folha, SPED e declarações conforme o perfil e o regime da empresa.</p></article>
            <article><span>↻</span><h4>Acompanhar mudanças normativas</h4><p>Transforme sinais das fontes oficiais em fila de triagem, bloqueio e trilha de decisão.</p></article>
            <article><span>10</span><h4>Organizar a carteira</h4><p>Mantenha empresas, cenários e documentos separados, com até 10 empresas liberadas durante o teste.</p></article>
            <article><span>↗</span><h4>Revisar e compartilhar</h4><p>Preserve autoria, aprovação, versão e contexto até o dossiê entregue ao cliente.</p></article>
          </div>
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
          <Link href="/cobertura">Abrir a matriz pública completa <span>→</span></Link>
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
          <h2>Preencha uma vez. Preserve o contexto até a entrega.</h2>
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
          <div><span>02</span><p><b>Reexecução automática</b><small>{fiscalShowcaseSummary.moduleCount} módulos fiscais a cada mudança</small></p><em>{fiscalShowcaseSummary.deterministicCases.toLocaleString("pt-BR")} CASOS</em></div>
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
          <article><small>CONTADOR CONSULTIVO</small><h3>Responda sem começar do zero.</h3><p>Transforme dúvidas recorrentes em análises documentadas, comparáveis e prontas para explicar ao cliente.</p></article>
          <article><small>TRIBUTARISTA</small><h3>Pare de reconstruir a memória.</h3><p>Mantenha norma, fatos, cálculo, data e evidência conectados no mesmo caso para revisar com mais agilidade.</p></article>
          <article><small>ESCRITÓRIO CONTÁBIL</small><h3>Evite que a equipe repita trabalho.</h3><p>Separe preparação, revisão e entrega sem perder autoria, histórico ou controle da carteira.</p></article>
        </div>
      </section>

      <section className="cbs-final-cta">
        <div>
          <span className="cbs-eyebrow">NÃO PRECISA MIGRAR SUA ROTINA PARA TESTAR</span>
          <h2>Traga a dúvida que você resolveria hoje em planilha.</h2>
          <p>Use o fluxo completo por cinco dias, com até 10 empresas e sem cartão. Compare o caminho até a entrega.</p>
        </div>
        <div className="cbs-final-actions">
          <LandingTrackedCta className="cbs-button cbs-button-light" href={primaryPath} campaign="home_final_real_case">
            {user ? "Voltar ao workspace" : "Testar com meu caso real"} <span>→</span>
          </LandingTrackedCta>
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
          <Link href="/cobertura">Cobertura pública</Link>
          <Link href="/planos">Planos</Link>
          <Link href="/conteudos">Conteúdos tributários</Link>
          <Link href="/calculadora-reforma-tributaria">Reforma Tributária</Link>
          <Link href="/cbs-ibs-contadores">CBS e IBS</Link>
          <Link href="/icms-st-contadores">ICMS-ST</Link>
          <Link href="/inteligencia-tributaria-escritorios">Inteligência tributária</Link>
          <Link href="/relatorios-fiscais-rastreaveis">Relatórios fiscais</Link>
        </nav>
        <small>© 2026 CBSHub</small>
      </footer>
    </main>
  );
}

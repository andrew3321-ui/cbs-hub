"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import BrandMark from "../BrandMark";
import { fiscalShowcaseSummary } from "../fiscal-showcase.generated";
import FiscalIntelligence from "./FiscalIntelligence";

type GuestSection = "overview" | "intelligence" | "laboratory" | "coverage" | "reports" | "guide";
type Props = { registerHref: string; loginHref: string };

const analysisExamples = [
  { tax: "ICMS/ST", title: "Venda interestadual de autopeças", question: "Qual o tratamento de ICMS-ST para autopeças de SP para MG?", detail: "Rota, segmento, fatos pendentes e fonte oficial." },
  { tax: "IBS + CBS", title: "Destaque no ano-teste de 2026", question: "Como destacar IBS e CBS em 2026?", detail: "Percentuais de teste sem inventar imposto líquido." },
  { tax: "ISS", title: "Consultoria entre municípios", question: "Onde é devido o ISS de consultoria entre Campinas e Belo Horizonte?", detail: "Incidência, município e lei local necessária." },
];

const guestGuideSteps = [
  { code: "01", title: "Escolha a empresa", detail: "Use a empresa demonstrativa ou ajuste regime, CNAE, UF e receita antes da consulta." },
  { code: "02", title: "Descreva a operação", detail: "Escreva a dúvida em linguagem comum e confirme somente os fatos que realmente conhece." },
  { code: "03", title: "Confira a trilha", detail: "Veja resultado, pendências, regras aplicadas, fontes oficiais, vigência e versão da base." },
  { code: "04", title: "Reproduza e entregue", detail: "Quando suportado, execute a memória de cálculo e transforme a análise em dossiê rastreável." },
];

const GUEST_GUIDE_SEEN_KEY = "cbshub_guest_guide_seen_v2";

function metricPayload(eventType: string, reason: string) {
  const url = new URL(window.location.href);
  return JSON.stringify({
    eventType,
    pathname: url.pathname,
    source: url.searchParams.get("utm_source") ?? "",
    medium: url.searchParams.get("utm_medium") ?? "",
    campaign: url.searchParams.get("utm_campaign") ?? "",
    reason,
  });
}

function track(eventType: string, reason: string) {
  const body = metricPayload(eventType, reason);
  if (navigator.sendBeacon) navigator.sendBeacon("/api/analytics/collect", new Blob([body], { type: "application/json" }));
  else void fetch("/api/analytics/collect", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => undefined);
}

export default function GuestCBSHubApp({ registerHref, loginHref }: Props) {
  const [section, setSection] = useState<GuestSection>("overview");
  const [question, setQuestion] = useState(analysisExamples[0].question);
  const [showGuide, setShowGuide] = useState(false);
  const [guideStep, setGuideStep] = useState(0);
  const [showCompanyEditor, setShowCompanyEditor] = useState(false);
  const [gateReason, setGateReason] = useState("");
  const [company, setCompany] = useState({
    name: "Empresa demonstrativa",
    issuerTaxRegime: "",
    cnae: "",
    state: "",
    monthlyRevenue: "",
  });

  useEffect(() => {
    track("experiment_view", "guest_app");
    const params = new URLSearchParams(window.location.search);
    const requestedSection = params.get("view");
    const validRequestedSection = requestedSection === "intelligence" || requestedSection === "laboratory" || requestedSection === "coverage" || requestedSection === "reports" || requestedSection === "guide"
      ? requestedSection
      : null;
    let shouldOpenGuide = true;
    try {
      shouldOpenGuide = window.localStorage.getItem(GUEST_GUIDE_SEEN_KEY) !== "1";
    } catch {
      shouldOpenGuide = true;
    }
    const guideFrame = window.requestAnimationFrame(() => {
      if (validRequestedSection) setSection(validRequestedSection);
      if (shouldOpenGuide) {
        setGuideStep(0);
        setShowGuide(true);
      }
    });
    return () => {
      if (guideFrame) window.cancelAnimationFrame(guideFrame);
    };
  }, []);

  function openSection(next: GuestSection) {
    setSection(next);
  }

  function openAnalysis(nextQuestion: string) {
    setQuestion(nextQuestion);
    setSection("intelligence");
  }

  function requireAccount(reason: string) {
    setGateReason(reason);
    track("experiment_gate", reason);
  }

  function updateCompany(field: keyof typeof company, value: string) {
    setCompany((current) => ({ ...current, [field]: value }));
  }

  function openGuide() {
    setGuideStep(0);
    setShowGuide(true);
  }

  function closeGuide() {
    try {
      window.localStorage.setItem(GUEST_GUIDE_SEEN_KEY, "1");
    } catch {
      // O guia continua funcional mesmo quando o navegador bloqueia armazenamento local.
    }
    setShowGuide(false);
  }

  return <main className="app-shell guest-app-shell">
    <aside className="sidebar guest-sidebar">
      <div className="brand" aria-label="CBSHub"><BrandMark className="brand-mark" /><span><strong>CBS</strong>Hub</span></div>
      <nav className="main-nav" aria-label="Navegação principal">
        <button className={section === "overview" ? "active" : ""} onClick={() => openSection("overview")}><span className="nav-icon">⌂</span>Visão geral</button>
        <button onClick={() => { setSection("overview"); setShowCompanyEditor(true); }}><span className="nav-icon">▦</span>Clientes</button>
        <button onClick={() => openSection("intelligence")}><span className="nav-icon">↗</span>Análises</button>
        <button onClick={() => requireAccount("documents")}><span className="nav-icon">▤</span>Documentos</button>
        <button onClick={() => requireAccount("workspace_mode")}><span className="nav-icon">◎</span>Modo de trabalho</button>
        <button className={section === "intelligence" ? "active" : ""} onClick={() => openSection("intelligence")}><span className="nav-icon">⌕</span>Inteligência fiscal</button>
        <button className={section === "laboratory" ? "active" : ""} onClick={() => openSection("laboratory")}><span className="nav-icon">∑</span>Laboratório fiscal</button>
        <button className={section === "coverage" ? "active" : ""} onClick={() => openSection("coverage")}><span className="nav-icon">◇</span>Cobertura nacional</button>
        <button className={section === "reports" ? "active" : ""} onClick={() => openSection("reports")}><span className="nav-icon">≋</span>Relatório fiscal</button>
        <button className={section === "guide" ? "active" : ""} onClick={openGuide}><span className="nav-icon">▷</span>Guia inicial</button>
      </nav>
      <div className="guest-sidebar-progress"><span>AMBIENTE DE DEMONSTRAÇÃO</span><strong>Use o produto antes do cadastro</strong><p>O trabalho fica somente neste navegador até você criar a conta.</p></div>
    </aside>

    <section className="workspace guest-workspace">
      <header className="topbar guest-topbar">
        <div className="guest-active-company">
          <p className="company-label">CLIENTE ATIVO</p>
          <button className="company-select" type="button" onClick={() => setShowCompanyEditor((current) => !current)}>{company.name || "Empresa demonstrativa"}<span>⌄</span></button>
        </div>
        <div className="topbar-actions guest-topbar-actions">
          <button className="guest-guide-chip" type="button" onClick={openGuide}><i>▷</i><span><b>Guia inicial</b><small>Conheça o fluxo</small></span></button>
          <span className="workspace-chip independent"><i />Modo independente</span>
          <span className="year-chip"><i /> Ano 2027 · premissa informada</span>
          <button className="notification" type="button" aria-label="Notificações">•</button>
          <nav className="guest-account-actions" aria-label="Entrar ou criar conta"><Link href={loginHref}>Entrar</Link><Link className="guest-create-account" href={registerHref} onClick={() => track("experiment_signup_click", "topbar")}>Criar conta <span>→</span></Link></nav>
        </div>
      </header>

      {showCompanyEditor && <section className="guest-company-popover" aria-label="Configurar empresa demonstrativa">
        <header><div><span>EMPRESA EM ANÁLISE</span><b>Ajuste os dados do caso</b></div><button type="button" onClick={() => setShowCompanyEditor(false)} aria-label="Fechar empresa">×</button></header>
        <div>
          <label>Nome ou apelido<input value={company.name} maxLength={80} onChange={(event) => updateCompany("name", event.target.value)} /></label>
          <label>Regime<select value={company.issuerTaxRegime} onChange={(event) => updateCompany("issuerTaxRegime", event.target.value)}><option value="">A confirmar</option><option value="simples">Simples Nacional</option><option value="normal">Regime normal</option></select></label>
          <label>CNAE<input value={company.cnae} maxLength={16} onChange={(event) => updateCompany("cnae", event.target.value)} placeholder="4530-7/03" /></label>
          <label>UF<select value={company.state} onChange={(event) => updateCompany("state", event.target.value)}><option value="">Selecione</option>{["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"].map((state) => <option key={state}>{state}</option>)}</select></label>
          <label>Receita mensal<input value={company.monthlyRevenue} maxLength={24} inputMode="decimal" onChange={(event) => updateCompany("monthlyRevenue", event.target.value)} placeholder="R$ 120.000" /></label>
        </div>
        <footer><small>Os dados ficam somente neste navegador.</small><button type="button" onClick={() => { setShowCompanyEditor(false); setSection("intelligence"); }}>Analisar esta empresa →</button></footer>
      </section>}

      {section === "overview" && <div className="page-content guest-overview-page guest-product-overview">
        <div className="page-heading">
          <div><p className="kicker">EMPRESA ATIVA · AMBIENTE DE DEMONSTRAÇÃO</p><h1>{company.name || "Empresa demonstrativa"}</h1><p>Explore o fluxo real da CBSHub e transforme uma operação fiscal em análise rastreável.</p></div>
          <button className="primary-button" onClick={() => openSection("intelligence")}>Abrir análise <span>→</span></button>
        </div>
        <section className="guest-dashboard-alert"><span>↘</span><div><small>PRÓXIMA DECISÃO</small><h2>Confirme os fatos antes de assumir uma conclusão</h2><p>O sistema separa referência, cálculo, pendência e fonte para você revisar sem depender de planilhas soltas.</p></div><button type="button" onClick={() => openSection("intelligence")}>Analisar operação</button></section>
        <section className="guest-dashboard-metrics">
          <article><span>Receita analisada</span><strong>{company.monthlyRevenue || "R$ 250.000"}</strong><small>premissa editável</small></article>
          <article><span>Módulos fiscais</span><strong>{fiscalShowcaseSummary.moduleCount}</strong><small>recortes controlados</small></article>
          <article><span>Memórias reproduzíveis</span><strong>{fiscalShowcaseSummary.calculatedMemories.toLocaleString("pt-BR")}</strong><small>com versão e fórmula</small></article>
          <article><span>Base regressiva</span><strong>{fiscalShowcaseSummary.deterministicCases.toLocaleString("pt-BR")}</strong><small>casos reexecutados</small></article>
        </section>
        <section className="guest-dashboard-grid">
          <article className="guest-dashboard-chart"><header><div><small>FLUXO DA ANÁLISE</small><h2>Da pergunta à evidência</h2></div><span>Base atual</span></header><div>{[42, 58, 51, 72, 66, 83, 78, 92].map((height, index) => <i key={height} style={{ height: `${height}%` }}><b style={{ height: `${Math.max(18, height - 18)}%` }} />{index % 2 === 0 && <small>{String(index + 1).padStart(2, "0")}</small>}</i>)}</div></article>
          <article className="guest-dashboard-actions"><header><small>COMECE POR AQUI</small><h2>Complete uma análise real</h2></header><button onClick={() => openSection("intelligence")}><span>01</span><div><b>Pesquisar uma operação</b><small>Fatos, regras e fontes oficiais</small></div><em>→</em></button><button onClick={() => openSection("laboratory")}><span>02</span><div><b>Usar um caso guiado</b><small>Exemplos próximos da rotina</small></div><em>→</em></button><button onClick={() => openSection("reports")}><span>03</span><div><b>Ver a entrega final</b><small>Dossiê com integridade</small></div><em>→</em></button></article>
        </section>
      </div>}

      {section === "intelligence" && <div className="guest-intelligence-page">
        <FiscalIntelligence key={question} guestMode operationLimit={2} companyContext={company} onAccountRequired={requireAccount} />
      </div>}

      {section === "laboratory" && <div className="page-content guest-lab-page">
        <div className="page-heading"><div><p className="kicker">OPERAÇÕES GUIADAS</p><h1>Comece por um caso próximo da sua rotina.</h1><p>Escolha uma operação e leve a pergunta pronta para o motor fiscal.</p></div></div>
        <section className="guest-operation-grid">{analysisExamples.map((example, index) => <article key={example.tax}><span>{String(index + 1).padStart(2, "0")}</span><small>{example.tax}</small><h2>{example.title}</h2><p>{example.detail}</p><button onClick={() => openAnalysis(example.question)}>Testar esta operação <b>→</b></button></article>)}</section>
        <section className="guest-locked-action"><div><span>XML, NF-e E SPED</span><h2>Importe documentos e deixe o sistema estruturar os fatos.</h2><p>A importação exige uma conta para manter os arquivos separados e protegidos por workspace.</p></div><button onClick={() => requireAccount("document_import")}>Experimentar com minha conta →</button></section>
      </div>}

      {section === "coverage" && <div className="page-content guest-coverage-page">
        <div className="page-heading"><div><p className="kicker">COBERTURA TRANSPARENTE</p><h1>Veja onde o sistema conclui e onde ele bloqueia.</h1><p>A CBSHub não transforma lacuna legal em número. Cada módulo informa o alcance e as pendências.</p></div><code>#{fiscalShowcaseSummary.fingerprint.slice(0, 12)}</code></div>
        <section className="guest-coverage-metrics"><article><span>BASE REGRESSIVA</span><strong>{fiscalShowcaseSummary.deterministicCases.toLocaleString("pt-BR")}</strong><small>casos reexecutados</small></article><article><span>MEMÓRIAS</span><strong>{fiscalShowcaseSummary.calculatedMemories.toLocaleString("pt-BR")}</strong><small>resultados reproduzíveis</small></article><article><span>BLOQUEIOS SEGUROS</span><strong>{fiscalShowcaseSummary.safelyBlockedCases.toLocaleString("pt-BR")}</strong><small>sem valor fabricado</small></article></section>
        <section className="guest-module-grid">{["ICMS e ST", "ISS municipal", "Simples Nacional", "PIS e Cofins", "IPI e TIPI", "IRPJ e CSLL", "Retenções", "IBS e CBS"].map((module, index) => <article key={module}><i>{index < 5 ? "✓" : "◐"}</i><div><b>{module}</b><small>{index < 5 ? "Base estruturada e versionada" : "Recortes controlados e bloqueio seguro"}</small></div><span>Verificado</span></article>)}</section>
      </div>}

      {section === "reports" && <div className="page-content guest-report-page">
        <div className="page-heading"><div><p className="kicker">ENTREGA RASTREÁVEL</p><h1>O cliente recebe a conclusão. Você preserva a prova.</h1><p>Veja a estrutura do dossiê que acompanha cada análise concluída.</p></div></div>
        <article className="guest-report-sheet"><header><div><BrandMark /><span><b>CBSHub</b><small>DOSSIÊ FISCAL VERSIONADO</small></span></div><code>#998b5a674d5b</code></header><h2>Tratamento fiscal da operação</h2><p className="guest-report-status">SUPORTADO NO RECORTE · SUJEITO AOS FATOS CONFIRMADOS</p><section>{["Resultado objetivo", "Dados utilizados", "Memória de cálculo", "Fonte oficial com link", "Data de vigência", "Versão da regra", "Pendências visíveis"].map((item) => <span key={item}><i>✓</i>{item}</span>)}</section><footer><div><small>FONTE PRIMÁRIA</small><b>Norma vinculada à versão</b></div><div><small>INTEGRIDADE</small><b>Hash reproduzível</b></div><button onClick={() => requireAccount("generate_report")}>Gerar com meu caso →</button></footer></article>
      </div>}

      {section === "guide" && <div className="page-content guest-guide-page"><div className="page-heading"><div><p className="kicker">GUIA COMPLETO</p><h1>Veja o fluxo inteiro antes de começar.</h1><p>Da empresa à análise, revisão e entrega versionada.</p></div></div><GuestGuideVideo /><GuestGuideSteps /><div className="guest-guide-actions"><button className="primary-button" onClick={() => openSection("intelligence")}>Agora quero testar <span>→</span></button><Link href={registerHref} onClick={() => track("experiment_signup_click", "guide")}>Criar minha conta de 5 dias</Link></div></div>}
    </section>

    {showGuide && <div className="guest-guide-backdrop" role="presentation" onMouseDown={closeGuide}><section className="guest-guide-modal" role="dialog" aria-modal="true" aria-labelledby="guest-guide-title" onMouseDown={(event) => event.stopPropagation()}><header><div><span>GUIA DE BOAS-VINDAS · {guideStep + 1} DE {guestGuideSteps.length + 1}</span><h2 id="guest-guide-title">{guideStep === 0 ? "Conheça o fluxo real da CBSHub." : guestGuideSteps[guideStep - 1].title}</h2></div><button onClick={closeGuide} aria-label="Fechar guia">×</button></header>{guideStep === 0 ? <GuestGuideVideo /> : <section className="guest-guide-step"><span>{guestGuideSteps[guideStep - 1].code}</span><div><small>COMO FUNCIONA</small><h3>{guestGuideSteps[guideStep - 1].title}</h3><p>{guestGuideSteps[guideStep - 1].detail}</p><div className="guest-guide-step-preview"><i /><i /><i /><i /></div></div></section>}<div className="guest-guide-progress" aria-label="Progresso do guia">{[0, ...guestGuideSteps.map((_, index) => index + 1)].map((step) => <i className={step <= guideStep ? "active" : ""} key={step} />)}</div><footer><button className="secondary-button" onClick={guideStep === 0 ? closeGuide : () => setGuideStep((current) => current - 1)}>{guideStep === 0 ? "Explorar sozinho" : "Voltar"}</button>{guideStep < guestGuideSteps.length ? <button className="primary-button" onClick={() => setGuideStep((current) => current + 1)}>Continuar <span>→</span></button> : <button className="primary-button" onClick={() => { closeGuide(); setSection("intelligence"); }}>Testar uma operação <span>→</span></button>}</footer></section></div>}

    {gateReason && <div className="guest-gate-backdrop" role="presentation" onMouseDown={() => setGateReason("")}><section className="guest-registration-gate" role="dialog" aria-modal="true" aria-labelledby="guest-gate-title" onMouseDown={(event) => event.stopPropagation()}><button className="guest-gate-close" onClick={() => setGateReason("")} aria-label="Fechar convite">×</button><span>CONTINUE SEM PERDER O QUE EXPLOROU</span><h2 id="guest-gate-title">Crie seu acesso para avançar.</h2><p>São 5 dias com todos os recursos, até 10 empresas e nenhum cartão solicitado. Sua próxima etapa será aberta dentro do workspace.</p><Link href={registerHref} onClick={() => track("experiment_signup_click", gateReason)}>Continuar gratuitamente <b>→</b></Link><small>Já tem conta? <Link href={loginHref}>Entrar agora</Link></small></section></div>}
  </main>;
}

function GuestGuideVideo() {
  return <div className="guest-guide-video"><video controls playsInline preload="metadata" poster="/media/cbshub-overview-completo-v2-poster.jpg"><source src="/media/cbshub-overview-completo-v2.webm" type="video/webm" /></video><div><span><i /> DEMONSTRAÇÃO REAL</span><b>Do cadastro à entrega revisável</b></div></div>;
}

function GuestGuideSteps() {
  return <section className="guest-guide-step-grid" aria-label="Etapas do guia">{guestGuideSteps.map((step) => <article key={step.code}><span>{step.code}</span><div><b>{step.title}</b><p>{step.detail}</p></div></article>)}</section>;
}

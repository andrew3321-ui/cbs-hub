"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import BrandMark from "../BrandMark";
import LandingFiscalPreview from "../LandingFiscalPreview";
import { fiscalShowcaseSummary } from "../fiscal-showcase.generated";

type GuestSection = "overview" | "intelligence" | "laboratory" | "coverage" | "reports" | "guide";
type Props = { registerHref: string; loginHref: string };

const analysisExamples = [
  { tax: "ICMS/ST", title: "Venda interestadual de autopeças", question: "Qual o tratamento de ICMS-ST para autopeças de SP para MG?", detail: "Rota, segmento, fatos pendentes e fonte oficial." },
  { tax: "IBS + CBS", title: "Destaque no ano-teste de 2026", question: "Como destacar IBS e CBS em 2026?", detail: "Percentuais de teste sem inventar imposto líquido." },
  { tax: "ISS", title: "Consultoria entre municípios", question: "Onde é devido o ISS de consultoria entre Campinas e Belo Horizonte?", detail: "Incidência, município e lei local necessária." },
];

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
  const [showGuide, setShowGuide] = useState(true);
  const [gateReason, setGateReason] = useState("");

  useEffect(() => { track("experiment_view", "guest_app"); }, []);

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

  return <main className="app-shell guest-app-shell">
    <aside className="sidebar guest-sidebar">
      <div className="brand" aria-label="CBSHub"><BrandMark className="brand-mark" /><span><strong>CBS</strong>Hub</span></div>
      <nav className="main-nav" aria-label="Experimentação do CBSHub">
        <button className={section === "overview" ? "active" : ""} onClick={() => openSection("overview")}><span className="nav-icon">⌂</span>Visão geral</button>
        <button className={section === "intelligence" ? "active" : ""} onClick={() => openSection("intelligence")}><span className="nav-icon">⌕</span>Inteligência fiscal</button>
        <button className={section === "laboratory" ? "active" : ""} onClick={() => openSection("laboratory")}><span className="nav-icon">∑</span>Operações guiadas</button>
        <button className={section === "coverage" ? "active" : ""} onClick={() => openSection("coverage")}><span className="nav-icon">◇</span>Cobertura</button>
        <button className={section === "reports" ? "active" : ""} onClick={() => openSection("reports")}><span className="nav-icon">▤</span>Relatório</button>
        <button className={section === "guide" ? "active" : ""} onClick={() => openSection("guide")}><span className="nav-icon">▷</span>Guia completo</button>
      </nav>
      <div className="guest-sidebar-progress"><span>AMBIENTE VISITANTE</span><strong>Explore antes de criar a conta</strong><p>Dados demonstrativos e operações públicas. Nenhuma empresa real é acessada.</p></div>
    </aside>

    <section className="workspace guest-workspace">
      <header className="topbar guest-topbar">
        <div className="guest-topbar-mode"><span>AMBIENTE DE TESTE</span><small>sem cadastro</small></div>
        <Link className="guest-topbar-brand" href="/" aria-label="CBSHub — página inicial"><BrandMark /><b><strong>CBS</strong>Hub</b></Link>
        <nav aria-label="Entrar ou criar conta"><Link href={loginHref}>Já tenho conta</Link><Link className="guest-create-account" href={registerHref} onClick={() => track("experiment_signup_click", "topbar")}>Criar acesso <span>→</span></Link></nav>
      </header>

      {section === "overview" && <div className="page-content guest-overview-page">
        <section className="guest-welcome-hero">
          <div><p className="kicker">CBSHUB EM MODO VISITANTE</p><h1>Traga uma operação real. Veja o trabalho tomar forma.</h1><p>Pesquise uma dúvida fiscal, confira o recorte encontrado e explore como fontes, cálculo e relatório se conectam antes de criar sua conta.</p><div><button className="primary-button" onClick={() => openSection("intelligence")}>Testar uma operação <span>→</span></button><button className="secondary-button" onClick={() => setShowGuide(true)}>Assistir ao guia</button></div></div>
          <aside><span>O QUE VOCÊ PODE FAZER AGORA</span><strong>3 operações públicas</strong><p>Depois, continue com 5 dias completos, até 10 empresas e nenhum cartão.</p><i>{fiscalShowcaseSummary.deterministicCases.toLocaleString("pt-BR")} casos regressivos</i></aside>
        </section>
        <section className="guest-journey-grid">
          <button onClick={() => openSection("intelligence")}><span>01</span><small>USE DE VERDADE</small><b>Pesquise uma dúvida fiscal</b><p>Receba triagem, fatos identificados, pendências e fonte.</p><em>Abrir inteligência →</em></button>
          <button onClick={() => openSection("laboratory")}><span>02</span><small>ESCOLHA UM CASO</small><b>Reproduza operações comuns</b><p>Autopeças, Reforma Tributária e ISS em fluxos guiados.</p><em>Ver operações →</em></button>
          <button onClick={() => openSection("reports")}><span>03</span><small>VEJA A ENTREGA</small><b>Conheça o relatório rastreável</b><p>Resultado, dados usados, memória, fonte, vigência e versão.</p><em>Visualizar relatório →</em></button>
        </section>
        <section className="guest-proof-strip"><span><b>{fiscalShowcaseSummary.moduleCount}</b> módulos controlados</span><span><b>{fiscalShowcaseSummary.calculatedMemories.toLocaleString("pt-BR")}</b> memórias reproduzíveis</span><span><b>5 dias</b> de acesso completo</span><span><b>Sem cartão</b> para começar</span></section>
      </div>}

      {section === "intelligence" && <div className="page-content guest-intelligence-page">
        <div className="page-heading"><div><p className="kicker">INTELIGÊNCIA FISCAL · EXPERIÊNCIA REAL</p><h1>Descreva a operação em linguagem comum.</h1><p>A pergunta passa pelo mesmo motor público determinístico usado na demonstração da plataforma.</p></div><span className="guest-live-badge"><i /> MOTOR ATIVO</span></div>
        <LandingFiscalPreview key={question} authenticated={false} surface="workspace" operationLimit={3} initialQuestion={question} />
        <section className="guest-after-preview"><div><span>AO CRIAR SUA CONTA</span><b>Confirme os fatos e avance até a memória completa.</b></div><button onClick={() => requireAccount("save_analysis")}>Salvar esta análise →</button></section>
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

      {section === "guide" && <div className="page-content guest-guide-page"><div className="page-heading"><div><p className="kicker">GUIA COMPLETO</p><h1>Veja o fluxo inteiro antes de começar.</h1><p>Do cadastro da empresa à análise, revisão e entrega versionada.</p></div></div><GuestGuideVideo /><div className="guest-guide-actions"><button className="primary-button" onClick={() => openSection("intelligence")}>Agora quero testar <span>→</span></button><Link href={registerHref} onClick={() => track("experiment_signup_click", "guide")}>Criar minha conta de 5 dias</Link></div></div>}
    </section>

    {showGuide && <div className="guest-guide-backdrop" role="presentation" onMouseDown={() => setShowGuide(false)}><section className="guest-guide-modal" role="dialog" aria-modal="true" aria-labelledby="guest-guide-title" onMouseDown={(event) => event.stopPropagation()}><header><div><span>GUIA DE BOAS-VINDAS</span><h2 id="guest-guide-title">Conheça o fluxo completo em pouco mais de um minuto.</h2></div><button onClick={() => setShowGuide(false)} aria-label="Fechar guia">×</button></header><GuestGuideVideo /><footer><button className="secondary-button" onClick={() => setShowGuide(false)}>Explorar sozinho</button><button className="primary-button" onClick={() => { setShowGuide(false); setSection("intelligence"); }}>Testar uma operação <span>→</span></button></footer></section></div>}

    {gateReason && <div className="guest-gate-backdrop" role="presentation" onMouseDown={() => setGateReason("")}><section className="guest-registration-gate" role="dialog" aria-modal="true" aria-labelledby="guest-gate-title" onMouseDown={(event) => event.stopPropagation()}><button className="guest-gate-close" onClick={() => setGateReason("")} aria-label="Fechar convite">×</button><span>CONTINUE SEM PERDER O QUE EXPLOROU</span><h2 id="guest-gate-title">Crie seu acesso para avançar.</h2><p>São 5 dias com todos os recursos, até 10 empresas e nenhum cartão solicitado. Sua próxima etapa será aberta dentro do workspace.</p><Link href={registerHref} onClick={() => track("experiment_signup_click", gateReason)}>Continuar gratuitamente <b>→</b></Link><small>Já tem conta? <Link href={loginHref}>Entrar agora</Link></small></section></div>}
  </main>;
}

function GuestGuideVideo() {
  return <div className="guest-guide-video"><video controls playsInline preload="metadata" poster="/media/cbshub-overview-completo-v2-poster.jpg"><source src="/media/cbshub-overview-completo-v2.webm" type="video/webm" /></video><div><span><i /> DEMONSTRAÇÃO REAL</span><b>Do cadastro à entrega revisável</b></div></div>;
}

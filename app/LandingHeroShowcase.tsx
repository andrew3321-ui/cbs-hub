"use client";

import { useEffect, useState } from "react";
import BrandMark from "./BrandMark";
import LandingFiscalPreview from "./LandingFiscalPreview";
import { fiscalShowcaseSummary } from "./fiscal-showcase.generated";

type ShowcaseSlide = "product" | "scenarios" | "preview";

const formatNumber = (value: number) => new Intl.NumberFormat("pt-BR").format(value);
const compactCoverageVersion = fiscalShowcaseSummary.coverageVersion.match(/v(\d+)$/i)?.[1] ?? fiscalShowcaseSummary.coverageVersion;

const illustrativeScenarios = [
  { role: "Contador consultivo", text: "A rota, o produto e as pendências permanecem reunidos antes de qualquer número ser apresentado." },
  { role: "Escritório contábil", text: "Quem prepara e quem revisa trabalham sobre a mesma versão, sem reconstruir o contexto em outra planilha." },
  { role: "Tributarista independente", text: "A fonte oficial e a vigência acompanham a análise, reduzindo a procura posterior pela base da resposta." },
  { role: "Responsável técnico", text: "Quando falta um fato jurídico essencial, a entrega é bloqueada e a pendência aparece de forma explícita." },
  { role: "Equipe fiscal", text: "XML, memória e relatório avançam no mesmo fluxo, preservando o que foi conferido em cada etapa." },
  { role: "Escritório em expansão", text: "Casos recorrentes deixam uma memória versionada que pode ser revisada sem começar novamente do zero." },
] as const;

function ProductPreview() {
  return <>
    <div className="cbs-preview-window">
      <div className="cbs-preview-topbar">
        <span className="cbs-preview-lockup"><BrandMark /><b>CBSHub</b></span>
        <span className="cbs-preview-context">Almeida &amp; Torres Tributário</span>
        <span className="cbs-preview-user">AT</span>
      </div>

      <div className="cbs-preview-body">
        <aside className="cbs-preview-sidebar">
          <span className="active"><i>⌕</i> Inteligência</span>
          <span><i>∑</i> Laboratório</span>
          <span><i>◇</i> Cobertura</span>
          <span><i>≡</i> Dossiês</span>
          <span><i>⇧</i> Importações</span>
          <span><i>↻</i> Monitor</span>
          <span><i>RTC</i> Reforma</span>
        </aside>

        <div className="cbs-preview-content">
          <div className="cbs-preview-heading">
            <div><small>INTELIGÊNCIA FISCAL</small><b>Analise uma operação</b></div>
            <span>Base V{compactCoverageVersion} · {fiscalShowcaseSummary.moduleCount} módulos</span>
          </div>

          <div className="cbs-query-box">
            <small>DESCREVA A OPERAÇÃO</small>
            <p>Qual o tratamento de ICMS-ST para autopeças de SP para MG?</p>
            <button type="button" aria-label="Pesquisar regra demonstrativa">Pesquisar regras <span>→</span></button>
          </div>

          <div className="cbs-case-facts">
            <span><small>ORIGEM</small><b>SP</b></span>
            <span><small>DESTINO</small><b>MG</b></span>
            <span><small>SEGMENTO</small><b>Autopeças</b></span>
            <span><small>OPERAÇÃO</small><b>Revenda</b></span>
          </div>

          <div className="cbs-result-card">
            <div className="cbs-result-status">
              <span><i /> SUPORTADO NO RECORTE</span>
              <small>Fatos mínimos 9/9</small>
            </div>
            <div className="cbs-result-main">
              <div>
                <small>TRATAMENTO IDENTIFICADO</small>
                <b>ICMS interestadual + trilha de ST</b>
                <p>A conclusão final permanece vinculada ao NCM, CEST e período da operação.</p>
              </div>
              <strong>12%<small>referência interestadual</small></strong>
            </div>
            <div className="cbs-source-line">
              <span>FONTE OFICIAL</span>
              <b>Protocolo ICMS 41/2008</b>
              <em>Vigência conferida ↗</em>
            </div>
          </div>

          <div className="cbs-preview-module-strip" aria-label="Módulos fiscais disponíveis">
            <small>OUTROS MÓDULOS NO MESMO FLUXO</small>
            <div>
              <span>ICMS/ST</span><span>ISS</span><span>Retenções</span><span>Simples</span>
              <span>PIS/Cofins</span><span>IPI/TIPI</span><span>IBS/CBS</span><span>NF-e/XML</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div className="cbs-floating-card cbs-floating-tests">
      <span>REGRESSÃO AUTOMÁTICA</span>
      <b>{formatNumber(fiscalShowcaseSummary.deterministicCases)} casos determinísticos</b>
      <small>{fiscalShowcaseSummary.moduleCount} módulos reexecutados a cada versão</small>
    </div>
    <div className="cbs-floating-card cbs-floating-version">
      <span>MEMÓRIA VERSIONADA</span>
      <b>#{fiscalShowcaseSummary.fingerprint.slice(0, 12)}</b>
      <small>{formatNumber(fiscalShowcaseSummary.calculatedMemories)} memórias reproduzíveis</small>
    </div>
  </>;
}

function IllustrativeScenarios() {
  const repeated = [...illustrativeScenarios, ...illustrativeScenarios];
  return <div className="cbs-scenario-panel">
    <div className="cbs-scenario-heading">
      <span><i /> COMO O FLUXO MUDA NA PRÁTICA</span>
      <h2>Menos reconstrução. Mais contexto pronto para revisar.</h2>
      <p>Cenários ilustrativos de uso — não são depoimentos de clientes.</p>
    </div>
    <div className="cbs-scenario-marquee" aria-label="Cenários ilustrativos de uso">
      <div className="cbs-scenario-track">
        {repeated.map((scenario, index) => <article aria-hidden={index >= illustrativeScenarios.length} key={`${scenario.role}-${index}`}>
          <span>“</span><p>{scenario.text}</p><small>CENÁRIO ILUSTRATIVO · {scenario.role}</small>
        </article>)}
      </div>
    </div>
    <div className="cbs-scenario-trust"><span>Sem números inventados</span><span>Sem promessa automática</span><span>Com limites explícitos</span></div>
  </div>;
}

export default function LandingHeroShowcase({ authenticated }: { authenticated: boolean }) {
  const [activeSlide, setActiveSlide] = useState<ShowcaseSlide>("product");
  const [engaged, setEngaged] = useState(false);

  useEffect(() => {
    if (engaged || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const delay = activeSlide === "product" ? 2500 : activeSlide === "scenarios" ? 5000 : 9000;
    const timer = window.setTimeout(() => {
      setActiveSlide((current) => current === "product" ? "scenarios" : current === "scenarios" ? "preview" : "product");
    }, delay);
    return () => window.clearTimeout(timer);
  }, [activeSlide, engaged]);

  function selectSlide(slide: ShowcaseSlide) {
    setActiveSlide(slide);
  }

  return (
    <div className={`cbs-product-preview cbs-showcase cbs-showcase-${activeSlide}`} aria-label="Conheça e experimente o CBSHub">
      <div className="cbs-preview-glow" />

      <div className={`cbs-showcase-slide cbs-showcase-product-slide ${activeSlide === "product" ? "is-active" : ""}`} aria-hidden={activeSlide !== "product"}>
        <ProductPreview />
      </div>

      <div className={`cbs-showcase-slide cbs-showcase-scenario-slide ${activeSlide === "scenarios" ? "is-active" : ""}`} aria-hidden={activeSlide !== "scenarios"} onMouseEnter={() => setEngaged(true)} onMouseLeave={() => setEngaged(false)}>
        <IllustrativeScenarios />
      </div>

      <div className={`cbs-showcase-slide cbs-showcase-preview-slide ${activeSlide === "preview" ? "is-active" : ""}`} aria-hidden={activeSlide !== "preview"}>
        <div className="cbs-showcase-preview-shell">
          <LandingFiscalPreview authenticated={authenticated} onEngagement={() => setEngaged(true)} />
        </div>
      </div>

      <div className="cbs-showcase-controls" role="group" aria-label="Escolha o conteúdo em destaque">
        <button type="button" className={activeSlide === "product" ? "is-active" : ""} onClick={() => selectSlide("product")} aria-pressed={activeSlide === "product"}><i /> Produto</button>
        <button type="button" className={activeSlide === "scenarios" ? "is-active" : ""} onClick={() => selectSlide("scenarios")} aria-pressed={activeSlide === "scenarios"}><i /> Na prática</button>
        <button type="button" className={activeSlide === "preview" ? "is-active" : ""} onClick={() => selectSlide("preview")} aria-pressed={activeSlide === "preview"}><i /> Testar agora</button>
      </div>
    </div>
  );
}

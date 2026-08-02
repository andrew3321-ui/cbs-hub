"use client";

import { useEffect, useRef, useState } from "react";
import BrandMark from "./BrandMark";
import { fiscalShowcaseSummary } from "./fiscal-showcase.generated";

type ShowcaseSlide = "product" | "tour";

const formatNumber = (value: number) => new Intl.NumberFormat("pt-BR").format(value);
const compactCoverageVersion = fiscalShowcaseSummary.coverageVersion.match(/v(\d+)$/i)?.[1] ?? fiscalShowcaseSummary.coverageVersion;

const tourMessages = [
  {
    at: 0,
    eyebrow: "VISÃO GERAL DO TRABALHO",
    title: "Do cenário bruto à análise pronta para revisão.",
    description: "Veja a carteira, as premissas e os próximos passos ganharem forma em um único fluxo.",
  },
  {
    at: 24,
    eyebrow: "INTELIGÊNCIA COM RASTREABILIDADE",
    title: "A resposta chega acompanhada da prova.",
    description: "Fontes, fatos considerados e memória de cálculo permanecem visíveis durante a decisão.",
  },
  {
    at: 54,
    eyebrow: "ENTREGA QUE PRESERVA CONTEXTO",
    title: "O trabalho avança sem perder o histórico.",
    description: "Versões, revisão e documentos seguem conectados até a entrega para o cliente.",
  },
] as const;

export default function LandingHeroShowcase() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [activeSlide, setActiveSlide] = useState<ShowcaseSlide>("product");
  const [tourPhase, setTourPhase] = useState(0);
  const [progress, setProgress] = useState(0);
  const [videoEnabled, setVideoEnabled] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (reducedMotion || connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType ?? "")) return;

    const timer = window.setTimeout(() => { setVideoEnabled(true); setActiveSlide("tour"); }, 2000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (activeSlide === "tour") {
      void video.play().catch(() => {
        // A poster frame remains visible if the browser blocks autoplay.
      });
      return;
    }

    video.pause();
  }, [activeSlide]);

  const selectSlide = (slide: ShowcaseSlide) => {
    if (slide === "tour") setVideoEnabled(true);
    if (slide === "tour" && videoRef.current) {
      if (activeSlide !== "tour") {
        videoRef.current.currentTime = 0;
        setTourPhase(0);
        setProgress(0);
      } else if (videoRef.current.paused) {
        void videoRef.current.play();
      }
    }
    setActiveSlide(slide);
  };

  const updateTour = () => {
    const video = videoRef.current;
    if (!video) return;

    const nextPhase = video.currentTime >= tourMessages[2].at
      ? 2
      : video.currentTime >= tourMessages[1].at
        ? 1
        : 0;

    if (nextPhase !== tourPhase) setTourPhase(nextPhase);
    setProgress(video.duration ? (video.currentTime / video.duration) * 100 : 0);
  };

  const message = tourMessages[tourPhase];

  return (
    <div
      className={`cbs-product-preview cbs-showcase cbs-showcase-${activeSlide}`}
      aria-label="Demonstração da inteligência fiscal CBSHub"
    >
      <div className="cbs-preview-glow" />

      <div className={`cbs-showcase-product-slide ${activeSlide === "product" ? "is-active" : ""}`}>
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
      </div>

      <div
        className={`cbs-showcase-video-slide ${activeSlide === "tour" ? "is-active" : ""}`}
        aria-hidden={activeSlide !== "tour"}
      >
        <div className="cbs-showcase-video-shell">
          <video
            ref={videoRef}
            muted
            playsInline
            preload="none"
            poster="/media/cbshub-overview-completo-v2-poster.jpg"
            onTimeUpdate={updateTour}
            onEnded={() => selectSlide("product")}
            aria-label="Demonstração completa do fluxo do CBSHub"
          >
            {videoEnabled && <source src="/media/cbshub-overview-completo-v2.webm" type="video/webm" />}
          </video>

          <div className="cbs-showcase-video-shade" />
          <div className="cbs-showcase-video-copy" aria-live="polite">
            <span><i /> {message.eyebrow}</span>
            <strong>{message.title}</strong>
            <p>{message.description}</p>
          </div>
          <div className="cbs-showcase-video-proof">
            <span>DEMONSTRAÇÃO REAL</span>
            <b>Do cadastro à entrega</b>
          </div>
          <div className="cbs-showcase-progress" aria-hidden="true">
            <i style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div className="cbs-showcase-controls" role="group" aria-label="Escolha a demonstração">
        <button
          type="button"
          className={activeSlide === "product" ? "is-active" : ""}
          onClick={() => selectSlide("product")}
          aria-pressed={activeSlide === "product"}
        >
          <i /> Visão do produto
        </button>
        <button
          type="button"
          className={activeSlide === "tour" ? "is-active" : ""}
          onClick={() => selectSlide("tour")}
          aria-pressed={activeSlide === "tour"}
        >
          <i /> Ver em operação <small>1:26</small>
        </button>
      </div>
    </div>
  );
}

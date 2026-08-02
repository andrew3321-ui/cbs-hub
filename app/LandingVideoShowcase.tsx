"use client";

import { useEffect, useRef, useState } from "react";

const messages = [
  { at: 0, eyebrow: "VISÃO GERAL DO TRABALHO", title: "Do cenário bruto à análise pronta para revisão.", description: "Veja carteira, premissas e próximos passos ganharem forma em um único fluxo." },
  { at: 24, eyebrow: "INTELIGÊNCIA COM RASTREABILIDADE", title: "A resposta chega acompanhada da prova.", description: "Fontes, fatos considerados e memória permanecem visíveis durante a decisão." },
  { at: 54, eyebrow: "ENTREGA QUE PRESERVA CONTEXTO", title: "O trabalho avança sem perder o histórico.", description: "Versões, revisão e documentos seguem conectados até a entrega para o cliente." },
] as const;

export default function LandingVideoShowcase() {
  const stageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const stage = stageRef.current;
    const video = videoRef.current;
    if (!stage || !video) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType ?? "")) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) {
        video.pause();
        return;
      }
      if (!reducedMotion) void video.play().catch(() => undefined);
    }, { threshold: .35 });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  function update() {
    const video = videoRef.current;
    if (!video) return;
    const nextPhase = video.currentTime >= messages[2].at ? 2 : video.currentTime >= messages[1].at ? 1 : 0;
    if (nextPhase !== phase) setPhase(nextPhase);
    setProgress(video.duration ? video.currentTime / video.duration * 100 : 0);
  }

  const message = messages[phase];
  return <section className="cbs-video-section" id="demonstracao">
    <div className="cbs-video-section-heading">
      <span className="cbs-eyebrow">DEMONSTRAÇÃO REAL DA PLATAFORMA</span>
      <h2>Veja o contexto avançar sem voltar para a estaca zero.</h2>
      <p>Um percurso completo, do cadastro da empresa à análise revisável e à entrega versionada.</p>
    </div>
    <div className="cbs-video-stage" ref={stageRef}>
      <div className="cbs-showcase-video-shell">
        <video
          ref={videoRef}
          muted
          playsInline
          controls
          preload="none"
          poster="/media/cbshub-overview-completo-v2-poster.jpg"
          onTimeUpdate={update}
          onEnded={() => { if (videoRef.current) { videoRef.current.currentTime = 0; setPhase(0); setProgress(0); } }}
          aria-label="Demonstração completa do fluxo do CBSHub"
        >
          <source src="/media/cbshub-overview-completo-v2.webm" type="video/webm" />
        </video>
        <div className="cbs-showcase-video-shade" />
        <div className="cbs-showcase-video-copy" aria-live="polite">
          <span><i /> {message.eyebrow}</span>
          <strong>{message.title}</strong>
          <p>{message.description}</p>
        </div>
        <div className="cbs-showcase-video-proof"><span>FLUXO COMPLETO</span><b>Do cadastro à entrega</b></div>
        <div className="cbs-showcase-progress" aria-hidden="true"><i style={{ width: `${progress}%` }} /></div>
      </div>
    </div>
  </section>;
}

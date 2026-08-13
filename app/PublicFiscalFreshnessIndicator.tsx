"use client";

import { useEffect, useState } from "react";

type Indicator = {
  version: string;
  level: "current" | "attention" | "degraded" | "insufficient_evidence";
  checkedSources: number;
  attentionSources: number;
  degradedSources: number;
  totalSources: number;
  pendingChanges: number;
  openIncidents: number;
  mostRecentCheckAt: string | null;
  explanation: string;
  privacy: string;
};

const label: Record<Indicator["level"], string> = { current: "Frescor monitorado", attention: "Recorte em atenção", degraded: "Recorte rebaixado", insufficient_evidence: "Evidência em formação" };

export function PublicFiscalFreshnessIndicator() {
  const [indicator, setIndicator] = useState<Indicator | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/public/fiscal-freshness", { signal: controller.signal })
      .then((response) => response.ok ? response.json() as Promise<Indicator> : null)
      .then((value) => { if (value) setIndicator(value); })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);
  if (!indicator) return <section className="public-freshness-indicator loading" aria-live="polite"><span>PROVA TEMPORAL</span><p>Consultando o indicador público de frescor fiscal.</p></section>;
  const checked = indicator.mostRecentCheckAt ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "UTC" }).format(new Date(indicator.mostRecentCheckAt)) : "ainda sem captura";
  return <section className={`public-freshness-indicator ${indicator.level}`} aria-label="Indicador público de frescor fiscal">
    <header><div><span>FRESCOR PÚBLICO · {indicator.version}</span><h2>{label[indicator.level]}</h2><p>{indicator.explanation}</p></div><b>{indicator.level === "current" ? "ATUAL" : indicator.level === "attention" ? "ATENÇÃO" : indicator.level === "degraded" ? "REBAIXADA" : "EM FORMAÇÃO"}</b></header>
    <div><article><strong>{indicator.checkedSources}</strong><span>fontes dentro do SLA</span></article><article><strong>{indicator.attentionSources}</strong><span>recortes em atenção</span></article><article><strong>{indicator.degradedSources}</strong><span>recortes rebaixados</span></article><article><strong>{indicator.pendingChanges}</strong><span>mudanças em triagem</span></article></div>
    <footer><span>Última conferência disponível: {checked} UTC</span><span>{indicator.openIncidents} incidente(s) aberto(s)</span><small>{indicator.privacy}</small></footer>
  </section>;
}

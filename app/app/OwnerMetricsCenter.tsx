"use client";

import { useEffect, useMemo, useState } from "react";

type Daily = { date: string; pageViews: number; visitors: number; sessions: number; signups: number; activeUsers: number; trialsStarted: number; trialsDenied: number; paymentsApproved: number; grossAmountCents: number };
type Payload = {
  generatedAt: string;
  window: { days: number; startDate: string; endDate: string };
  definitions: Record<string, string>;
  acquisition: { pageViews: number; visitors: number; sessions: number; sources: Array<{ source: string; medium: string; pageViews: number; visitors: number }> };
  users: { total: number; signups: number; dau: number; wau: number; mau: number };
  trials: { started: number; active: number; expired: number; denied: number; converted: number; signupToTrialPercent: number; trialToPayerPercent: number };
  billing: { activePayers: number; mrrCents: number; grossAmountCents: number; delinquent: number; canceled: number; paymentFailures: number };
  funnel: Array<{ key: string; label: string; value: number }>;
  daily: Daily[];
  privacy: { rawIpStored: boolean; rawUserAgentStored: boolean; pseudonymousIdentifiers: boolean; eventRetentionDays: number; dailyRetentionDays: number };
};

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const compact = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });

export default function OwnerMetricsCenter() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Payload | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setMessage("");
    fetch(`/api/admin/metrics?days=${days}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json() as Payload & { error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Métricas indisponíveis.");
        return payload;
      })
      .then(setData)
      .catch((error) => { if (error instanceof Error && error.name !== "AbortError") setMessage(error.message); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [days]);

  const chartMax = useMemo(() => Math.max(1, ...(data?.daily.map((row) => Math.max(row.visitors, row.signups, row.trialsStarted)) ?? [1])), [data]);
  if (!data && loading) return <div className="page-content owner-metrics-page"><div className="billing-admin-loading">Consolidando métricas operacionais…</div></div>;
  if (!data) return <div className="page-content owner-metrics-page"><div className="billing-admin-loading">{message || "Métricas indisponíveis."}</div></div>;

  return <div className="page-content owner-metrics-page">
    <div className="page-heading owner-metrics-heading">
      <div><p className="kicker">VISÃO DO PROPRIETÁRIO · DADOS MINIMIZADOS</p><h1>Métricas da plataforma</h1><p>Acompanhe aquisição, ativação, trials e receita com definições estáveis e dados operacionais conciliados.</p></div>
      <div className="owner-period" aria-label="Período das métricas">{[7, 30, 90].map((value) => <button type="button" className={days === value ? "active" : ""} onClick={() => setDays(value)} key={value}>{value} dias</button>)}</div>
    </div>
    {message && <div className="toast" role="status">{message}</div>}

    <section className="owner-metric-grid" aria-label="Resumo da plataforma">
      <article><span>VISITANTES</span><strong>{compact.format(data.acquisition.visitors)}</strong><small>{compact.format(data.acquisition.pageViews)} visualizações qualificadas</small></article>
      <article><span>CADASTROS</span><strong>{data.users.signups}</strong><small>{data.users.total} contas acumuladas</small></article>
      <article><span>USUÁRIOS ATIVOS</span><strong>{data.users.mau}</strong><small>DAU {data.users.dau} · WAU {data.users.wau} · MAU {data.users.mau}</small></article>
      <article><span>TRIALS ATIVOS</span><strong>{data.trials.active}</strong><small>{data.trials.started} iniciados no período</small></article>
      <article className="money"><span>PAGADORES ATIVOS</span><strong>{data.billing.activePayers}</strong><small>{data.billing.delinquent} com renovação pendente</small></article>
      <article className="money"><span>MRR CONTRATADO</span><strong>{money.format(data.billing.mrrCents / 100)}</strong><small>{money.format(data.billing.grossAmountCents / 100)} recebido no período</small></article>
    </section>

    <div className="owner-metrics-layout">
      <section className="panel owner-funnel-panel">
        <div className="panel-heading"><div><span className="eyebrow">FUNIL DO PERÍODO</span><h3>Da visita ao pagamento</h3></div><span className="editable-chip">{data.window.startDate.split("-").reverse().join("/")}—{data.window.endDate.split("-").reverse().join("/")}</span></div>
        <div className="owner-funnel">{data.funnel.map((stage, index) => {
          const base = data.funnel[0]?.value || 0;
          const width = base ? Math.max(4, (stage.value / base) * 100) : 4;
          return <article key={stage.key}><span>{String(index + 1).padStart(2, "0")}</span><p><b>{stage.label}</b><small>{stage.value} registro(s)</small></p><div><i style={{ width: `${Math.min(100, width)}%` }} /></div></article>;
        })}</div>
        <div className="owner-conversion"><article><span>CADASTRO → TRIAL</span><b>{data.trials.signupToTrialPercent.toLocaleString("pt-BR")}%</b></article><article><span>TRIAL → PAGADOR</span><b>{data.trials.trialToPayerPercent.toLocaleString("pt-BR")}%</b></article><article><span>TRIALS EXPIRADOS</span><b>{data.trials.expired}</b></article><article><span>TRIALS NEGADOS</span><b>{data.trials.denied}</b></article></div>
      </section>

      <section className="panel owner-health-panel">
        <div className="panel-heading"><div><span className="eyebrow">SAÚDE COMERCIAL</span><h3>Receita e retenção</h3></div></div>
        <div className="owner-health-list"><article><span>Receita confirmada</span><b>{money.format(data.billing.grossAmountCents / 100)}</b></article><article><span>Inadimplentes</span><b>{data.billing.delinquent}</b></article><article><span>Falhas de pagamento</span><b>{data.billing.paymentFailures}</b></article><article><span>Cancelamentos no período</span><b>{data.billing.canceled}</b></article></div>
      </section>
    </div>

    <section className="panel owner-series-panel">
      <div className="panel-heading"><div><span className="eyebrow">EVOLUÇÃO DIÁRIA</span><h3>Aquisição e ativação</h3></div><div className="owner-legend"><span><i className="visitors" />Visitantes</span><span><i className="signups" />Cadastros</span><span><i className="trials" />Trials</span></div></div>
      <div className="owner-series" aria-label="Série diária">{data.daily.map((row) => <div className="owner-series-day" title={`${row.date}: ${row.visitors} visitantes, ${row.signups} cadastros, ${row.trialsStarted} trials`} key={row.date}><div><i className="visitors" style={{ height: `${Math.max(2, row.visitors / chartMax * 100)}%` }} /><i className="signups" style={{ height: `${Math.max(2, row.signups / chartMax * 100)}%` }} /><i className="trials" style={{ height: `${Math.max(2, row.trialsStarted / chartMax * 100)}%` }} /></div><span>{row.date.slice(8)}</span></div>)}</div>
    </section>

    <div className="owner-metrics-layout owner-bottom-layout">
      <section className="panel owner-sources-panel"><div className="panel-heading"><div><span className="eyebrow">ORIGEM DO TRÁFEGO</span><h3>Fontes qualificadas</h3></div></div><div className="owner-source-list">{data.acquisition.sources.map((source) => <article key={`${source.source}:${source.medium}`}><p><b>{source.source}</b><small>{source.medium}</small></p><strong>{source.visitors}</strong><span>visitantes · {source.pageViews} views</span></article>)}{!data.acquisition.sources.length && <div className="billing-empty"><b>A coleta começa nesta versão</b><p>As fontes aparecerão após as primeiras visitas qualificadas.</p></div>}</div></section>
      <section className="panel owner-privacy-panel"><div className="panel-heading"><div><span className="eyebrow">DEFINIÇÕES E PRIVACIDADE</span><h3>Métrica sem caixa-preta</h3></div></div><div className="owner-definition-list">{Object.entries(data.definitions).map(([key, value]) => <article key={key}><b>{key}</b><p>{value}</p></article>)}</div><div className="owner-privacy-proof"><span>✓ IP bruto não armazenado</span><span>✓ User-agent bruto não armazenado</span><span>✓ Eventos por {data.privacy.eventRetentionDays} dias</span><span>✓ Agregados por {data.privacy.dailyRetentionDays} dias</span></div></section>
    </div>
    <p className="owner-generated">Atualizado em {new Date(data.generatedAt).toLocaleString("pt-BR")}{loading ? " · atualizando…" : ""}</p>
  </div>;
}

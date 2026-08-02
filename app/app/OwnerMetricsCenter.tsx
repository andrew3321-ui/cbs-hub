"use client";

import { useEffect, useMemo, useState } from "react";

type Daily = { date: string; pageViews: number; visitors: number; sessions: number; signups: number; activeUsers: number; trialsStarted: number; trialsDenied: number; paymentsApproved: number; grossAmountCents: number };
type Payload = {
  generatedAt: string;
  window: { days: number; startDate: string; endDate: string };
  definitions: Record<string, string>;
  acquisition: { pageViews: number; visitors: number; sessions: number; sources: Array<{ source: string; medium: string; pageViews: number; visitors: number }>; seoCtas: Array<{ pathGroup: string; campaign: string; clicks: number; visitors: number }>; organic: { visitors: number; signups: number; trials: number; payers: number } };
  users: { total: number; signups: number; dau: number; wau: number; mau: number };
  trials: { started: number; active: number; expired: number; denied: number; converted: number; signupToTrialPercent: number; trialToPayerPercent: number };
  billing: { activePayers: number; mrrCents: number; grossAmountCents: number; delinquent: number; canceled: number; paymentFailures: number };
  funnel: Array<{ key: string; label: string; value: number }>;
  signupFunnel: { stages: Array<{ key: string; label: string; attempts: number; people: number }>; failures: Array<{ eventType: string; reason: string; attempts: number; people: number }> };
  daily: Daily[];
  privacy: { rawIpStored: boolean; rawUserAgentStored: boolean; pseudonymousIdentifiers: boolean; eventRetentionDays: number; dailyRetentionDays: number };
  searchConsole: {
    configured: boolean; siteUrl: string; retentionDays: number;
    range: { startDate: string; endDate: string };
    current: { clicks: number; impressions: number; ctrPercent: number; position: number };
    pages: Array<{ page: string; clicks: number; impressions: number; ctr: number; position: number }>;
    opportunities: Array<{ label: string; page: string; impressions: number; clicks: number; ctrPercent: number; position: number; score: number }>;
    indexation: { snapshotDate: string | null; indexedPages: number; expectedPages: number; discoveredPages: number; unknownPages: number; blockedPages: number; inspectionErrors: number; pendingPages: number; pages: Array<{ page: string; verdict: string; coverageState: string; indexingState: string; pageFetchState: string; lastCrawlTime: string | null; stage: string }> };
    alerts: Array<{ severity: "warning" | "critical"; code: string; title: string; detail: string }>;
    lastSync: { status?: string; completedAt?: string; metricRows?: number; inspectedPages?: number; errorCode?: string } | null;
  };
};

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const compact = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });
const signupFailureLabels: Record<string, string> = {
  weak_password: "Senha fora dos requisitos",
  password_mismatch: "Confirmação de senha divergente",
  before_api_response: "Falha no navegador ou na rede",
  invalid_name: "Nome inválido ou ausente",
  invalid_email: "E-mail inválido ou ausente",
  invalid_password: "Senha inválida ou ausente",
  invalid_confirm_password: "Confirmação ausente",
  invalid_input: "Dados recusados pela validação",
  office_name_required: "Nome do escritório ausente",
  email_exists: "E-mail já cadastrado",
  register_failed: "Falha interna no cadastro",
};

export default function OwnerMetricsCenter() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Payload | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [syncingSearch, setSyncingSearch] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
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
  function changePeriod(value: number) {
    if (value === days) return;
    setLoading(true);
    setMessage("");
    setDays(value);
  }
  async function syncSearchConsole() {
    setSyncingSearch(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/search-console", { method: "POST", headers: { "Content-Type": "application/json" } });
      const payload = await response.json() as { error?: string; code?: string };
      if (!response.ok) throw new Error(payload.error ?? `Sincronização indisponível (${payload.code ?? response.status}).`);
      const refreshed = await fetch(`/api/admin/metrics?days=${days}`, { cache: "no-store" });
      const refreshedPayload = await refreshed.json() as Payload & { error?: string };
      if (!refreshed.ok) throw new Error(refreshedPayload.error ?? "Não foi possível atualizar as métricas.");
      setData(refreshedPayload);
      setMessage("Search Console sincronizada com sucesso.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível sincronizar a Search Console."); }
    finally { setSyncingSearch(false); }
  }
  if (!data && loading) return <div className="page-content owner-metrics-page"><div className="billing-admin-loading">Consolidando métricas operacionais…</div></div>;
  if (!data) return <div className="page-content owner-metrics-page"><div className="billing-admin-loading">{message || "Métricas indisponíveis."}</div></div>;

  return <div className="page-content owner-metrics-page">
    <div className="page-heading owner-metrics-heading">
      <div><p className="kicker">VISÃO DO PROPRIETÁRIO · DADOS MINIMIZADOS</p><h1>Métricas da plataforma</h1><p>Acompanhe aquisição, ativação, trials e receita com definições estáveis e dados operacionais conciliados.</p></div>
      <div className="owner-period" aria-label="Período das métricas">{[7, 30, 90].map((value) => <button type="button" className={days === value ? "active" : ""} onClick={() => changePeriod(value)} key={value}>{value} dias</button>)}</div>
    </div>
    {message && <div className="toast" role="status">{message}</div>}

    <section className="owner-metric-grid" aria-label="Resumo da plataforma">
      <article><span>VISITAS ÚNICAS/DIA</span><strong>{compact.format(data.acquisition.visitors)}</strong><small>{compact.format(data.acquisition.pageViews)} visualizações qualificadas</small></article>
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

    <section className="panel owner-signup-funnel-panel">
      <div className="panel-heading"><div><span className="eyebrow">FUNIL DO CADASTRO · DIAGNÓSTICO</span><h3>Onde o visitante interrompe a criação da conta</h3><p className="owner-panel-copy">Eventos novos passam a ser coletados nesta versão. Valores digitados, senha e e-mail nunca entram na telemetria.</p></div><span className="editable-chip">API + NAVEGADOR</span></div>
      <div className="owner-signup-stages">{data.signupFunnel.stages.map((stage, index) => {
        const base = data.signupFunnel.stages[0]?.people || 0;
        const conversion = index === 0 ? 100 : base ? Math.round(stage.people * 10_000 / base) / 100 : 0;
        return <article key={stage.key}><span>{String(index + 1).padStart(2, "0")}</span><div><b>{stage.label}</b><small>{stage.people} visitante(s) · {stage.attempts} evento(s)</small></div><strong>{conversion.toLocaleString("pt-BR")}%</strong></article>;
      })}</div>
      <div className="owner-signup-failures"><header><b>Fricções e falhas classificadas</b><span>{data.signupFunnel.failures.reduce((sum, item) => sum + item.attempts, 0)} ocorrência(s)</span></header>{data.signupFunnel.failures.length ? <div>{data.signupFunnel.failures.map((failure) => <article key={`${failure.eventType}:${failure.reason}`}><span>{failure.eventType === "signup_client_error" ? "NAVEGADOR" : "SERVIDOR"}</span><b>{signupFailureLabels[failure.reason] ?? failure.reason.replaceAll("_", " ")}</b><small>{failure.people} visitante(s) · {failure.attempts} tentativa(s)</small></article>)}</div> : <p>Nenhuma fricção foi registrada desde a ativação deste funil.</p>}</div>
    </section>

    <section className="panel owner-series-panel">
      <div className="panel-heading"><div><span className="eyebrow">EVOLUÇÃO DIÁRIA</span><h3>Aquisição e ativação</h3></div><div className="owner-legend"><span><i className="visitors" />Visitas únicas</span><span><i className="signups" />Cadastros</span><span><i className="trials" />Trials</span></div></div>
      <div className="owner-series" aria-label="Série diária">{data.daily.map((row) => <div className="owner-series-day" title={`${row.date}: ${row.visitors} visitas únicas, ${row.signups} cadastros, ${row.trialsStarted} trials`} key={row.date}><div><i className="visitors" style={{ height: `${Math.max(2, row.visitors / chartMax * 100)}%` }} /><i className="signups" style={{ height: `${Math.max(2, row.signups / chartMax * 100)}%` }} /><i className="trials" style={{ height: `${Math.max(2, row.trialsStarted / chartMax * 100)}%` }} /></div><span>{row.date.slice(8)}</span></div>)}</div>
    </section>

    <section className="panel owner-search-console-panel">
      <div className="panel-heading"><div><span className="eyebrow">GOOGLE SEARCH CONSOLE · SOMENTE LEITURA</span><h3>Busca orgânica e indexação</h3><p className="owner-panel-copy">Consultas agregadas nunca são ligadas a usuários. Atribuição do funil usa apenas o navegador pseudonimizado e uma janela de 30 dias.</p></div><button type="button" className="secondary-button" onClick={syncSearchConsole} disabled={syncingSearch || !data.searchConsole.configured}>{syncingSearch ? "Sincronizando…" : "Sincronizar agora"}</button></div>
      {!data.searchConsole.configured && <div className="owner-search-setup"><b>Integração preparada, credencial pendente</b><p>Cadastre no Worker a conta de serviço com escopo <code>webmasters.readonly</code> e conceda acesso à propriedade {data.searchConsole.siteUrl}. Nenhuma chave é enviada ao navegador.</p></div>}
      <div className="owner-search-summary">
        <article><span>IMPRESSÕES</span><strong>{compact.format(data.searchConsole.current.impressions)}</strong><small>{data.searchConsole.range.startDate} — {data.searchConsole.range.endDate}</small></article>
        <article><span>CLIQUES ORGÂNICOS</span><strong>{compact.format(data.searchConsole.current.clicks)}</strong><small>CTR {data.searchConsole.current.ctrPercent.toLocaleString("pt-BR")}%</small></article>
        <article><span>POSIÇÃO MÉDIA</span><strong>{data.searchConsole.current.position ? data.searchConsole.current.position.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) : "—"}</strong><small>ponderada por impressões</small></article>
        <article><span>INDEXAÇÃO</span><strong>{data.searchConsole.indexation.indexedPages}/{data.searchConsole.indexation.expectedPages}</strong><small>{data.searchConsole.indexation.snapshotDate ? `inspeção ${data.searchConsole.indexation.snapshotDate}` : "aguarda primeira inspeção"}</small></article>
      </div>
      <div className="owner-indexation-status" aria-label="Estados da indexação"><article className="indexed"><b>{data.searchConsole.indexation.indexedPages}</b><span>indexadas</span></article><article className="discovered"><b>{data.searchConsole.indexation.discoveredPages}</b><span>descobertas, aguardando</span></article><article className="unknown"><b>{data.searchConsole.indexation.unknownPages}</b><span>ainda não descobertas</span></article><article className="blocked"><b>{data.searchConsole.indexation.blockedPages + data.searchConsole.indexation.inspectionErrors}</b><span>bloqueios ou erros técnicos</span></article></div>
      <div className="owner-search-funnel" aria-label="Funil orgânico"><article><span>01</span><b>{data.acquisition.organic.visitors}</b><small>visitas orgânicas</small></article><i>→</i><article><span>02</span><b>{data.acquisition.organic.signups}</b><small>cadastros atribuídos</small></article><i>→</i><article><span>03</span><b>{data.acquisition.organic.trials}</b><small>trials atribuídos</small></article><i>→</i><article><span>04</span><b>{data.acquisition.organic.payers}</b><small>pagadores atribuídos</small></article></div>
      {!!data.searchConsole.alerts.length && <div className="owner-search-alerts">{data.searchConsole.alerts.map((alert) => <article className={alert.severity} key={alert.code}><b>{alert.title}</b><p>{alert.detail}</p></article>)}</div>}
      <div className="owner-search-columns">
        <div><h4>Oportunidades de CTR</h4><div className="owner-search-list">{data.searchConsole.opportunities.map((item) => <article key={`${item.label}:${item.page}`}><p><b>{item.label}</b><small>{new URL(item.page).pathname}</small></p><span>{item.impressions} imp. · CTR {item.ctrPercent.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% · pos. {item.position.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}</span></article>)}{!data.searchConsole.opportunities.length && <p className="owner-search-empty">O ranking aparecerá após a primeira importação com volume suficiente.</p>}</div></div>
        <div><h4>Páginas na busca</h4><div className="owner-search-list">{data.searchConsole.pages.slice(0, 10).map((item) => <article key={item.page}><p><b>{new URL(item.page).pathname || "/"}</b><small>{item.clicks} clique(s)</small></p><span>{item.impressions} imp. · CTR {item.ctr.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% · pos. {item.position.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}</span></article>)}{!data.searchConsole.pages.length && <p className="owner-search-empty">Nenhuma métrica oficial importada neste período.</p>}</div></div>
      </div>
      <p className="owner-search-footnote">Última sincronização: {data.searchConsole.lastSync?.completedAt ? new Date(data.searchConsole.lastSync.completedAt).toLocaleString("pt-BR") : "não executada"} · retenção agregada: {data.searchConsole.retentionDays} dias · rotina recomendada: revisar alertas, oportunidades, páginas e conversões toda semana.</p>
    </section>

    <div className="owner-metrics-layout owner-bottom-layout">
      <section className="panel owner-sources-panel"><div className="panel-heading"><div><span className="eyebrow">ORIGEM E INTENÇÃO</span><h3>Fontes e CTAs orgânicos</h3></div></div><div className="owner-source-list">{data.acquisition.sources.map((source) => <article key={`${source.source}:${source.medium}`}><p><b>{source.source}</b><small>{source.medium}</small></p><strong>{source.visitors}</strong><span>visitas únicas/dia · {source.pageViews} views</span></article>)}{data.acquisition.seoCtas.map((cta) => <article key={`${cta.pathGroup}:${cta.campaign}`}><p><b>{cta.campaign}</b><small>{cta.pathGroup}</small></p><strong>{cta.clicks}</strong><span>cliques · {cta.visitors} visitantes/dia</span></article>)}{!data.acquisition.sources.length && !data.acquisition.seoCtas.length && <div className="billing-empty"><b>A coleta começa nesta versão</b><p>As fontes e CTAs aparecerão após as primeiras visitas qualificadas.</p></div>}</div></section>
      <section className="panel owner-privacy-panel"><div className="panel-heading"><div><span className="eyebrow">DEFINIÇÕES E PRIVACIDADE</span><h3>Métrica sem caixa-preta</h3></div></div><div className="owner-definition-list">{Object.entries(data.definitions).map(([key, value]) => <article key={key}><b>{key}</b><p>{value}</p></article>)}</div><div className="owner-privacy-proof"><span>✓ IP bruto não armazenado</span><span>✓ User-agent bruto não armazenado</span><span>✓ Eventos por {data.privacy.eventRetentionDays} dias</span><span>✓ Agregados por {data.privacy.dailyRetentionDays} dias</span></div></section>
    </div>
    <p className="owner-generated">Atualizado em {new Date(data.generatedAt).toLocaleString("pt-BR")}{loading ? " · atualizando…" : ""}</p>
  </div>;
}

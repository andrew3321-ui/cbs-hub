"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import BrandMark from "../BrandMark";

type Verification = { type: string; name: string; value: string };
type Scope = { id: string; domain: string; status: "pending" | "verified"; verifiedAt: string | null; monitoringEnabled: boolean; nextScanAt: string | null; lastScanAt: string | null; verification: Verification | null };
type Check = { code: string; title: string; status: string; detail: string; action: string };
type Assessment = { executiveSummary: string; riskLevel: string; priorities: Array<{ title: string; severity: string; why: string; recommendation: string; evidenceCodes: string[] }>; positiveSignals: string[]; limitations: string[] };
type Job = { id: string; scopeId: string; trigger: string; status: string; scan: { posture?: { score: number }; checks?: Check[]; fingerprint?: string } | null; assessment: Assessment | null; provider: string | null; model: string | null; errorCode: string | null; startedAt: string; completedAt: string | null };
type AgentData = { canManage: boolean; aiConfigured: boolean; scopes: Scope[]; jobs: Job[] };

const severityLabel: Record<string, string> = { critical: "Crítico", high: "Alto", medium: "Médio", low: "Baixo" };

async function fetchAgentData() {
  const response = await fetch("/api/security-agent", { cache: "no-store" });
  const payload = await response.json() as AgentData & { error?: string };
  if (!response.ok) throw new Error(payload.error || "Não foi possível carregar o agente.");
  return payload;
}

export default function SecurityAgentCenter() {
  const [data, setData] = useState<AgentData | null>(null);
  const [domain, setDomain] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() { setData(await fetchAgentData()); }

  useEffect(() => {
    let active = true;
    void fetchAgentData().then((payload) => { if (active) setData(payload); }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Falha ao carregar."); });
    return () => { active = false; };
  }, []);

  const latestByScope = useMemo(() => {
    const entries = new Map<string, Job>();
    for (const job of data?.jobs ?? []) if (!entries.has(job.scopeId)) entries.set(job.scopeId, job);
    return entries;
  }, [data]);

  async function act(action: string, payload: Record<string, unknown>) {
    setBusy(`${action}:${String(payload.scopeId ?? domain)}`);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/security-agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...payload }) });
      const result = await response.json() as { error?: string; verified?: boolean };
      if (!response.ok) throw new Error(result.error || (response.status === 409 ? "A alteração ainda não foi confirmada." : "Operação não concluída."));
      if (action === "create_scope") { setDomain(""); setAuthorized(false); setMessage("Escopo criado. Publique o registro TXT indicado para comprovar a titularidade."); }
      if (action === "verify_scope") setMessage("Titularidade confirmada. O agente está liberado para este domínio.");
      if (action === "run_scan") setMessage("Diagnóstico concluído e registrado na trilha de auditoria.");
      if (action === "set_monitoring") setMessage(payload.enabled ? "Monitoramento passivo diário ativado." : "Monitoramento automático pausado.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Operação não concluída.");
    } finally { setBusy(""); }
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    await act("create_scope", { domain, authorizationConfirmed: authorized });
  }

  return (
    <main className="security-agent-page">
      <header className="security-agent-topbar">
        <Link href="/" className="security-agent-brand"><BrandMark /><span><b>CBS</b>Hub <small>Security Agent</small></span></Link>
        <div><span className={`security-agent-provider ${data?.aiConfigured ? "online" : "fallback"}`}><i />{data?.aiConfigured ? "OpenAI conectada" : "Motor defensivo local"}</span><Link href="/app">Abrir workspace</Link></div>
      </header>

      <section className="security-agent-hero">
        <span>AUTHORIZED SECURITY VALIDATION · V1</span>
        <h1>Um agente defensivo para transformar sinais externos em prioridade de correção.</h1>
        <p>Cadastre apenas ativos sob sua administração ou autorização expressa. A primeira versão executa diagnóstico passivo de DNS, e-mail, HTTPS e defesas do navegador — sem exploração, força bruta ou varredura de portas.</p>
      </section>

      {error ? <div className="security-agent-alert error" role="alert">{error}</div> : null}
      {message ? <div className="security-agent-alert success">{message}</div> : null}

      <section className="security-agent-grid">
        <form className="security-agent-panel security-agent-onboard" onSubmit={create}>
          <div className="security-agent-panel-title"><span>01</span><div><b>Autorizar um domínio</b><small>Comprovação de titularidade via DNS</small></div></div>
          <label htmlFor="agent-domain">Domínio público</label>
          <div className="security-agent-domain"><span>https://</span><input id="agent-domain" value={domain} onChange={(event) => setDomain(event.target.value)} placeholder="empresa.com.br" required disabled={!data?.canManage} /></div>
          <label className="security-agent-consent"><input type="checkbox" checked={authorized} onChange={(event) => setAuthorized(event.target.checked)} required disabled={!data?.canManage} /><span>Confirmo que administro este domínio ou possuo autorização expressa do responsável para avaliá-lo.</span></label>
          <button type="submit" disabled={!data?.canManage || busy.startsWith("create_scope")}>{busy.startsWith("create_scope") ? "Criando escopo…" : "Gerar verificação DNS"}<b>→</b></button>
          {!data?.canManage ? <small>Somente proprietário ou administrador do workspace pode autorizar novos ativos.</small> : null}
        </form>

        <aside className="security-agent-panel security-agent-guardrails">
          <div className="security-agent-panel-title"><span>02</span><div><b>Limites do agente</b><small>Guardrails aplicados no servidor</small></div></div>
          <ul><li><i />Escopo bloqueado até confirmar o TXT</li><li><i />Somente coleta passiva e pública</li><li><i />Saída estruturada, auditada e rastreável</li><li><i />Sem exploração, DoS, credenciais ou evasão</li><li><i />Chave da API isolada no Cloudflare Worker</li></ul>
        </aside>
      </section>

      <section className="security-agent-assets">
        <div className="security-agent-section-title"><span>ATIVOS AUTORIZADOS</span><h2>Escopos e monitoramento</h2></div>
        {!data ? <div className="security-agent-empty">Carregando os escopos…</div> : null}
        {data && !data.scopes.length ? <div className="security-agent-empty">Nenhum domínio autorizado ainda. Comece gerando a verificação DNS.</div> : null}
        {data?.scopes.map((scope) => {
          const latest = latestByScope.get(scope.id);
          return (
            <article className="security-agent-asset" key={scope.id}>
              <div className="security-agent-asset-head"><div><span className={`security-agent-status ${scope.status}`}>{scope.status === "verified" ? "VERIFICADO" : "AGUARDANDO DNS"}</span><h3>{scope.domain}</h3><small>{scope.lastScanAt ? `Última leitura: ${new Date(scope.lastScanAt).toLocaleString("pt-BR")}` : "Nenhum diagnóstico persistente executado"}</small></div>{latest?.scan?.posture ? <div className="security-agent-score"><b>{latest.scan.posture.score}</b><span>/100</span></div> : null}</div>
              {scope.verification ? <div className="security-agent-dns"><b>Publique e mantenha este registro no DNS</b><dl><div><dt>Tipo</dt><dd>{scope.verification.type}</dd></div><div><dt>Nome</dt><dd>{scope.verification.name}</dd></div><div><dt>Valor</dt><dd>{scope.verification.value}</dd></div></dl></div> : null}
              <div className="security-agent-actions">
                {scope.status === "pending" ? <button disabled={busy.startsWith("verify_scope")} onClick={() => void act("verify_scope", { scopeId: scope.id })}>Confirmar DNS</button> : <button disabled={busy.startsWith("run_scan")} onClick={() => void act("run_scan", { scopeId: scope.id })}>{busy === `run_scan:${scope.id}` ? "Analisando…" : "Executar agora"}</button>}
                {scope.status === "verified" ? <label><input type="checkbox" checked={scope.monitoringEnabled} onChange={(event) => void act("set_monitoring", { scopeId: scope.id, enabled: event.target.checked })} /> Monitorar diariamente</label> : null}
              </div>
              {latest?.assessment ? <div className="security-agent-report"><div className="security-agent-report-head"><span>RELATÓRIO · {latest.provider === "openai" ? "OPENAI" : "MOTOR CBSHUB"}</span><b className={`risk-${latest.assessment.riskLevel}`}>{severityLabel[latest.assessment.riskLevel] ?? latest.assessment.riskLevel}</b></div><p>{latest.assessment.executiveSummary}</p><div className="security-agent-priorities">{latest.assessment.priorities.map((priority, index) => <div key={`${priority.title}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span><section><b>{priority.title}</b><p>{priority.why}</p><small>{priority.recommendation}</small></section></div>)}</div><footer>Motor: {latest.model} · Evidência: {latest.scan?.fingerprint ?? "registrada"} · Validação humana recomendada</footer></div> : null}
            </article>
          );
        })}
      </section>
    </main>
  );
}

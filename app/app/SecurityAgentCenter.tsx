"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import BrandMark from "../BrandMark";
import SecurityOperationsPanel from "./SecurityOperationsPanel";
import type { OperationalPlaybook } from "../../domain/security-operations";
import SecurityFindingsBoard, { type SecurityFinding, type SecurityMember } from "./SecurityFindingsBoard";
import SecurityDeliveryPanel, { type SecurityCampaign, type SecurityRemediation } from "./SecurityDeliveryPanel";
import type { SecurityTechniqueId } from "../../domain/security-campaign-policy";
import SecurityDefensePanel, { type DefenseAction, type DefenseConnector, type DefenseIncident, type DefensePosture, type DefenseProposal } from "./SecurityDefensePanel";

type Verification = { type: string; name: string; value: string };
type Scope = { id: string; domain: string; status: "pending" | "verified"; verifiedAt: string | null; authorizationExpiresAt: string | null; authorizationCurrent: boolean; monitoringEnabled: boolean; nextScanAt: string | null; lastScanAt: string | null; verification: Verification | null };
type Check = { code: string; title: string; status: string; detail: string; action: string };
type Assessment = { executiveSummary: string; riskLevel: string; confidence?: string; priorities: Array<{ title: string; severity: string; why: string; recommendation: string; evidenceCodes: string[] }>; positiveSignals: string[]; uncertainties?: string[]; limitations: string[] };
type Job = { id: string; scopeId: string; trigger: string; mode: string; playbooks: OperationalPlaybook[]; status: string; scan: { posture?: { score?: number }; checks?: Check[]; fingerprint?: string } | null; assessment: Assessment | null; provider: string | null; model: string | null; primaryModel: string | null; reviewModel: string | null; reviewReason: string | null; providerUsage: unknown; errorCode: string | null; findingSyncStatus: string; findingSyncError: string | null; startedAt: string; completedAt: string | null };
type Technique = { label: string; execution: string; risk: string; requiresRepository: boolean; requiresTestCredentials: boolean };
type AgentData = { canManage: boolean; aiConfigured: boolean; modelRouting: { primary: string; review: string }; scopes: Scope[]; jobs: Job[]; findings: SecurityFinding[]; members: SecurityMember[]; campaigns: SecurityCampaign[]; remediations: SecurityRemediation[]; defenseConnectors: DefenseConnector[]; defenseIncidents: DefenseIncident[]; defenseActions: DefenseAction[]; defensePostures: DefensePosture[]; defenseProposals: DefenseProposal[]; techniqueCatalog: Record<SecurityTechniqueId, Technique>; integrations: { isolatedRunner: boolean; repositoryConnector: boolean; cloudflareCredentialVault: boolean } };

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

  useEffect(() => {
    if (!data?.jobs.some((job) => job.status === "queued" || job.status === "running")) return;
    const timer = window.setInterval(() => {
      void fetchAgentData().then(setData).catch(() => undefined);
    }, 2500);
    return () => window.clearInterval(timer);
  }, [data]);

  const latestByScope = useMemo(() => {
    const entries = new Map<string, Job>();
    for (const job of data?.jobs ?? []) if (!entries.has(job.scopeId)) entries.set(job.scopeId, job);
    return entries;
  }, [data]);

  async function act(action: string, payload: Record<string, unknown>): Promise<Record<string, unknown> | undefined> {
    setBusy(`${action}:${String(payload.scopeId ?? domain)}`);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/security-agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...payload }) });
      const result = await response.json() as Record<string, unknown> & { error?: string; verified?: boolean; job?: { status?: string } };
      if (!response.ok) throw new Error(result.error || (response.status === 409 ? "A alteração ainda não foi confirmada." : "Operação não concluída."));
      if (action === "create_scope") { setDomain(""); setAuthorized(false); setMessage("Escopo criado. Publique o registro TXT indicado para comprovar a titularidade."); }
      if (action === "verify_scope") setMessage("Titularidade confirmada. O agente está liberado para este domínio.");
      if (action === "run_scan") setMessage(result.job?.status === "queued" ? "Diagnóstico autorizado e enviado para processamento seguro." : "Diagnóstico concluído e registrado na trilha de auditoria.");
      if (action === "triage_telemetry") setMessage(result.job?.status === "queued" ? "Eventos enviados para triagem. O resultado aparecerá neste ativo." : "Triagem concluída e registrada na auditoria.");
      if (action === "set_monitoring") setMessage(payload.enabled ? "Monitoramento passivo diário ativado." : "Monitoramento automático pausado.");
      if (action === "renew_authorization") setMessage("Autorização do escopo renovada por 90 dias e registrada na auditoria.");
      if (action === "update_finding") setMessage("Achado atualizado e decisão registrada na trilha de auditoria.");
      if (action === "create_campaign") setMessage("Rascunho criado. Revise limites e técnicas antes de aprovar.");
      if (action === "approve_campaign") setMessage("Campanha aprovada, sem iniciar execução externa.");
      if (action === "dispatch_campaign") setMessage("Diagnóstico passivo iniciado dentro da janela aprovada.");
      if (action === "cancel_campaign") setMessage("Campanha cancelada e registrada na auditoria.");
      if (action === "create_remediation") setMessage("Proposta de correção criada sem alterar o repositório.");
      if (action === "decide_remediation") setMessage("Decisão sobre a proposta registrada. Nenhuma alteração externa foi executada.");
      if (action === "create_defense_connector") setMessage("Canal de telemetria criado. Armazene a credencial exibida antes de sair da página.");
      if (action === "set_defense_connector") setMessage(payload.enabled ? "Ingestão defensiva retomada." : "Ingestão defensiva pausada.");
      if (action === "update_defense_incident") setMessage("Estado do incidente atualizado na trilha de auditoria.");
      if (action === "revoke_defense_action") setMessage("Resposta automática revogada imediatamente.");
      if (action === "connect_cloudflare") setMessage("Zona Cloudflare validada e conectada em modo somente observação.");
      if (action === "check_cloudflare") setMessage("Acesso à zona e permissões do conector foram verificados novamente.");
      if (action === "sync_cloudflare") setMessage("Eventos recentes da Cloudflare foram coletados e correlacionados sem armazenar o IP de origem.");
      if (action === "audit_cloudflare") setMessage("Postura do WAF auditada. O score e as propostas foram atualizados sem alterar a zona.");
      if (action === "connect_cloudflare_write") setMessage("Credencial separada de escrita validada por leitura e armazenada no cofre. Nenhuma regra foi alterada.");
      if (action === "disconnect_cloudflare_write") setMessage("Credencial de escrita apagada. Regras existentes permaneceram intactas.");
      if (action === "configure_cloudflare_proposal") setMessage("Prévia determinística criada para uma rota exata. Nenhuma alteração externa foi feita.");
      if (action === "approve_cloudflare_proposal") setMessage("Diff aprovado por 30 minutos. A Cloudflare ainda não foi alterada.");
      if (action === "apply_cloudflare_proposal") setMessage("Regra aplicada e relida na Cloudflare. O recurso exato ficou disponível para rollback.");
      if (action === "rollback_cloudflare_proposal") setMessage("A regra criada pelo CBSHub foi removida da Cloudflare.");
      if (action === "disconnect_cloudflare") setMessage("Conector Cloudflare removido e credencial criptografada apagada.");
      await load();
      return result;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Operação não concluída.");
    } finally { setBusy(""); }
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    await act("create_scope", { domain, authorizationConfirmed: authorized });
  }

  return (
    <main className="security-workspace-shell">
      <aside className="security-workspace-sidebar">
        <Link href="/" className="security-agent-brand"><BrandMark /><span><b>CBS</b>Hub <small>Cybersecurity</small></span></Link>
        <div className="security-workspace-product"><i /><span>DEFENSIVE PLATFORM</span><b>Command center</b></div>
        <nav aria-label="Navegação do workspace de segurança">
          <a href="#overview" className="active"><span>01</span><b>Visão geral</b></a>
          <a href="#authorize"><span>02</span><b>Autorizar ativo</b></a>
          <a href="#assets"><span>03</span><b>Superfície monitorada</b></a>
          <a href="#guardrails"><span>04</span><b>Controles do agente</b></a>
        </nav>
        <div className="security-workspace-sidebar-foot"><span>AMBIENTE PROTEGIDO</span><p>Coleta passiva, escopo autorizado e trilha auditável.</p><Link href="/sair">Encerrar sessão →</Link></div>
      </aside>

      <section className="security-workspace-main">
        <header className="security-agent-topbar">
          <div><span>SECURITY WORKSPACE</span><b>External posture</b></div>
          <div><span className={`security-agent-provider ${data?.aiConfigured ? "online" : "fallback"}`}><i />{data?.aiConfigured ? `${data.modelRouting.primary} · revisão ${data.modelRouting.review}` : "Motor defensivo local"}</span><Link href="/">Diagnóstico público</Link></div>
        </header>

        <div className="security-agent-page">

      <section className="security-agent-hero" id="overview">
        <span>AUTHORIZED SECURITY VALIDATION · V1</span>
        <h1>Investigue sinais. Prepare testes. Priorize a resposta.</h1>
        <p>Analise DNS, e-mail e HTTPS dos seus ativos, prepare a validação dos controles e faça a triagem de eventos de autenticação e WAF. Cada recomendação fica ligada às evidências disponíveis.</p>
      </section>

      {error ? <div className="security-agent-alert error" role="alert">{error}</div> : null}
      {message ? <div className="security-agent-alert success">{message}</div> : null}

      <section className="security-agent-grid" id="authorize">
        <form className="security-agent-panel security-agent-onboard" onSubmit={create}>
          <div className="security-agent-panel-title"><span>01</span><div><b>Autorizar um domínio</b><small>Comprovação de titularidade via DNS</small></div></div>
          <label htmlFor="agent-domain">Domínio público</label>
          <div className="security-agent-domain"><span>https://</span><input id="agent-domain" value={domain} onChange={(event) => setDomain(event.target.value)} placeholder="empresa.com.br" required disabled={!data?.canManage} /></div>
          <label className="security-agent-consent"><input type="checkbox" checked={authorized} onChange={(event) => setAuthorized(event.target.checked)} required disabled={!data?.canManage} /><span>Confirmo que administro este domínio ou possuo autorização expressa do responsável para avaliá-lo.</span></label>
          <button type="submit" disabled={!data?.canManage || busy.startsWith("create_scope")}>{busy.startsWith("create_scope") ? "Criando escopo…" : "Gerar verificação DNS"}<b>→</b></button>
          {!data?.canManage ? <small>Somente proprietário ou administrador do workspace pode autorizar novos ativos.</small> : null}
        </form>

        <aside className="security-agent-panel security-agent-guardrails" id="guardrails">
          <div className="security-agent-panel-title"><span>02</span><div><b>Limites do agente</b><small>Guardrails aplicados no servidor</small></div></div>
          <ul><li><i />Escopo bloqueado até confirmar o TXT</li><li><i />Somente coleta passiva e pública</li><li><i />Saída estruturada, auditada e rastreável</li><li><i />Sem exploração, DoS, credenciais ou evasão</li><li><i />Chave da API isolada no Cloudflare Worker</li></ul>
        </aside>
      </section>

      <section className="security-agent-assets" id="assets">
        <div className="security-agent-section-title"><span>ATIVOS AUTORIZADOS</span><h2>Escopos e monitoramento</h2></div>
        {!data ? <div className="security-agent-empty">Carregando os escopos…</div> : null}
        {data && !data.scopes.length ? <div className="security-agent-empty">Nenhum domínio autorizado ainda. Comece gerando a verificação DNS.</div> : null}
        {data?.scopes.map((scope) => {
          const latest = latestByScope.get(scope.id);
          const authorizationExpired = !scope.authorizationCurrent;
          const jobActive = latest?.status === "queued" || latest?.status === "running";
          return (
            <article className="security-agent-asset" key={scope.id}>
              <div className="security-agent-asset-head"><div><span className={`security-agent-status ${scope.status}`}>{scope.status === "verified" ? "VERIFICADO" : "AGUARDANDO DNS"}</span><h3>{scope.domain}</h3><small>{scope.lastScanAt ? `Última leitura: ${new Date(scope.lastScanAt).toLocaleString("pt-BR")}` : "Nenhum diagnóstico persistente executado"}</small><small>{authorizationExpired ? "Autorização de avaliação expirada" : `Autorização válida até ${new Date(scope.authorizationExpiresAt!).toLocaleDateString("pt-BR")}`}</small></div>{typeof latest?.scan?.posture?.score === "number" ? <div className="security-agent-score"><b>{latest.scan.posture.score}</b><span>/100</span></div> : null}</div>
              {scope.verification ? <div className="security-agent-dns"><b>Publique e mantenha este registro no DNS</b><dl><div><dt>Tipo</dt><dd>{scope.verification.type}</dd></div><div><dt>Nome</dt><dd>{scope.verification.name}</dd></div><div><dt>Valor</dt><dd>{scope.verification.value}</dd></div></dl></div> : null}
              <div className="security-agent-actions">
                {scope.status === "pending" ? <button disabled={busy.startsWith("verify_scope")} onClick={() => void act("verify_scope", { scopeId: scope.id })}>Confirmar DNS</button> : <button disabled={busy.startsWith("run_scan") || jobActive || authorizationExpired} onClick={() => void act("run_scan", { scopeId: scope.id })}>{jobActive ? latest?.status === "queued" ? "Na fila…" : "Analisando…" : busy === `run_scan:${scope.id}` ? "Agendando…" : "Executar agora"}</button>}
                {scope.status === "verified" ? <label><input type="checkbox" checked={scope.monitoringEnabled} disabled={authorizationExpired} onChange={(event) => void act("set_monitoring", { scopeId: scope.id, enabled: event.target.checked })} /> Monitorar diariamente</label> : null}
                {authorizationExpired ? <button className="secondary" onClick={() => { if (window.confirm("Confirmo novamente que administro este domínio ou possuo autorização expressa para avaliá-lo.")) void act("renew_authorization", { scopeId: scope.id, authorizationConfirmed: true }); }}>Renovar autorização</button> : null}
              </div>
              {jobActive ? <div className="security-agent-alert success">{latest?.status === "queued" ? "Execução aguardando processamento." : latest?.mode === "blue_team" ? "Triagem dos eventos em andamento." : "Coleta passiva e análise em andamento."}</div> : null}
              {latest?.status === "failed" ? <p className="security-agent-alert error" role="alert">A análise falhou. Verifique a autorização e tente novamente. Código: {latest.errorCode ?? "SCAN_FAILED"}</p> : null}
              {latest?.status === "completed" && latest.findingSyncStatus === "failed" ? <p className="security-agent-alert error" role="alert">A análise terminou, mas a fila de achados não foi sincronizada. Código: {latest.findingSyncError ?? "FINDING_SYNC_FAILED"}</p> : null}
              {latest?.assessment && latest.status === "completed" ? <div className="security-agent-report"><div className="security-agent-report-head"><span>{latest.mode === "blue_team" ? "BLUE TEAM · CONTAGENS INFORMADAS" : "DIAGNÓSTICO PASSIVO"} · {latest.provider?.startsWith("openai") ? latest.reviewModel ? "OPENAI · REVISADO" : "OPENAI" : "MOTOR CBSHUB"}</span><b className={`risk-${latest.assessment.riskLevel}`}>{severityLabel[latest.assessment.riskLevel] ?? latest.assessment.riskLevel}</b></div><p>{latest.assessment.executiveSummary}</p><div className="security-agent-priorities">{latest.assessment.priorities.map((priority, index) => <div key={`${priority.title}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span><section><b>{priority.title}</b><p>{priority.why}</p><small>{priority.recommendation}</small><p>Evidência: {priority.evidenceCodes.join(", ")}</p></section></div>)}</div>{latest.assessment.limitations.map((limitation) => <p key={limitation} className="security-operations-note">{limitation}</p>)}<footer>Motor: {latest.primaryModel ?? latest.model}{latest.reviewModel ? ` → ${latest.reviewModel} (revisão automática)` : ""} · Confiança: {latest.assessment.confidence ?? "não informada"} · Evidência: {latest.scan?.fingerprint ?? "registrada"} · Validação humana recomendada</footer></div> : null}
              <SecurityDefensePanel scopeId={scope.id} disabled={!data?.canManage || Boolean(busy) || scope.status !== "verified"} cloudflareCredentialVault={Boolean(data?.integrations.cloudflareCredentialVault)} connectors={data?.defenseConnectors ?? []} incidents={data?.defenseIncidents ?? []} actions={data?.defenseActions ?? []} postures={data?.defensePostures ?? []} proposals={data?.defenseProposals ?? []} onAction={act} />
              <SecurityOperationsPanel scopeId={scope.id} disabled={!data?.canManage || Boolean(busy) || jobActive || scope.status !== "verified" || authorizationExpired} playbooks={latest?.playbooks ?? []} mode={latest?.mode} onTriage={act} />
              <SecurityFindingsBoard scopeId={scope.id} findings={data?.findings ?? []} members={data?.members ?? []} disabled={!data?.canManage || Boolean(busy)} onUpdate={async (action, payload) => { await act(action, payload); }} />
              {data ? <SecurityDeliveryPanel scopeId={scope.id} disabled={!data.canManage || Boolean(busy) || scope.status !== "verified" || authorizationExpired} campaigns={data.campaigns} remediations={data.remediations} findings={data.findings} techniqueCatalog={data.techniqueCatalog} integrations={data.integrations} onAction={act} /> : null}
            </article>
          );
        })}
      </section>
        </div>
      </section>
    </main>
  );
}

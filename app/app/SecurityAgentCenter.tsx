"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import BrandMark from "../BrandMark";
import SecurityOperationsPanel from "./SecurityOperationsPanel";
import SecurityRepositoriesPanel from "./SecurityRepositoriesPanel";
import type { OperationalPlaybook } from "../../domain/security-operations";
import SecurityFindingsBoard, { type SecurityFinding, type SecurityMember } from "./SecurityFindingsBoard";
import SecurityDeliveryPanel, { type SecurityCampaign, type SecurityRemediation } from "./SecurityDeliveryPanel";
import type { SecurityTechniqueId } from "../../domain/security-campaign-policy";
import SecurityDefensePanel, { type DefenseAction, type DefenseConnector, type DefenseIncident, type DefensePosture, type DefenseProposal } from "./SecurityDefensePanel";

export type WorkspaceView = "overview" | "authorize" | "assets" | "operations" | "repositories";

type Verification = { type: string; name: string; value: string };
type Scope = { id: string; domain: string; status: "pending" | "verified"; verifiedAt: string | null; authorizationExpiresAt: string | null; authorizationCurrent: boolean; monitoringEnabled: boolean; nextScanAt: string | null; lastScanAt: string | null; verification: Verification | null };
type Check = { code: string; title: string; status: string; detail: string; action: string };
type Assessment = { executiveSummary: string; riskLevel: string; confidence?: string; priorities: Array<{ title: string; severity: string; why: string; recommendation: string; evidenceCodes: string[] }>; positiveSignals: string[]; uncertainties?: string[]; limitations: string[] };
type Job = { id: string; scopeId: string; trigger: string; mode: string; playbooks: OperationalPlaybook[]; status: string; scan: { posture?: { score?: number }; checks?: Check[]; fingerprint?: string } | null; assessment: Assessment | null; provider: string | null; model: string | null; primaryModel: string | null; reviewModel: string | null; reviewReason: string | null; providerUsage: unknown; errorCode: string | null; findingSyncStatus: string; findingSyncError: string | null; startedAt: string; completedAt: string | null };
type Technique = { label: string; execution: string; risk: string; requiresRepository: boolean; requiresTestCredentials: boolean };
type AgentData = { canManage: boolean; aiConfigured: boolean; modelRouting: { primary: string; review: string }; scopes: Scope[]; jobs: Job[]; findings: SecurityFinding[]; members: SecurityMember[]; campaigns: SecurityCampaign[]; remediations: SecurityRemediation[]; defenseConnectors: DefenseConnector[]; defenseIncidents: DefenseIncident[]; defenseActions: DefenseAction[]; defensePostures: DefensePosture[]; defenseProposals: DefenseProposal[]; techniqueCatalog: Record<SecurityTechniqueId, Technique>; integrations: { isolatedRunner: boolean; repositoryConnector: boolean; cloudflareCredentialVault: boolean } };

const severityLabel: Record<string, string> = { critical: "Crítico", high: "Alto", medium: "Médio", low: "Baixo" };
const navigation: Array<{ view: WorkspaceView; href: string; label: string; icon: string }> = [
  { view: "overview", href: "/app", label: "Visão geral", icon: "overview" },
  { view: "authorize", href: "/app/autorizar", label: "Autorizar ativo", icon: "shield" },
  { view: "assets", href: "/app/ativos", label: "Ativos monitorados", icon: "radar" },
  { view: "operations", href: "/app/operacoes", label: "Operações", icon: "controls" },
  { view: "repositories", href: "/app/projetos", label: "Projetos", icon: "code" },
];
const pageCopy: Record<WorkspaceView, { eyebrow: string; title: string; description: string }> = {
  overview: { eyebrow: "Central de segurança", title: "Riscos claros. Respostas com contexto.", description: "Acompanhe sua superfície, as investigações em andamento e as decisões que precisam de atenção em um único lugar." },
  authorize: { eyebrow: "Novo escopo", title: "Autorize um ativo com segurança.", description: "Comprove a titularidade pelo DNS antes de qualquer coleta. A autorização fica registrada, tem prazo e pode ser revogada." },
  assets: { eyebrow: "Superfície externa", title: "Monitore o que está exposto.", description: "Execute diagnósticos, acompanhe a postura de cada domínio e mantenha a análise recorrente sob seu controle." },
  operations: { eyebrow: "Centro de operações", title: "Avalie seu ativo sem configurar cada teste.", description: "Depois de confirmar a titularidade, inicie um diagnóstico automático. Achados e próximos passos aparecem aqui; integrações e testes controlados ficam nas opções avançadas." },
  repositories: { eyebrow: "Segurança de aplicações", title: "Do código à correção revisável.", description: "Conecte projetos autorizados, encontre riscos e prepare mudanças rastreáveis sem escrever diretamente na branch principal." },
};

function WorkspaceIcon({ name }: { name: string }) {
  if (name === "shield") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 5 6v5c0 4.6 2.8 8.2 7 10 4.2-1.8 7-5.4 7-10V6l-7-3Z" /><path d="m9.5 12 1.7 1.7 3.6-4" /></svg>;
  if (name === "radar") return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /><path d="m12 12 6-6" /></svg>;
  if (name === "controls") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></svg>;
  if (name === "code") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 5l-4 14" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" /></svg>;
}

async function fetchAgentData() {
  const response = await fetch("/api/security-agent", { cache: "no-store" });
  const payload = await response.json() as AgentData & { error?: string };
  if (!response.ok) throw new Error(payload.error || "Não foi possível carregar o workspace.");
  return payload;
}

export default function SecurityAgentCenter({ view = "overview" }: { view?: WorkspaceView }) {
  const [data, setData] = useState<AgentData | null>(null);
  const [domain, setDomain] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() { setData(await fetchAgentData()); }

  useEffect(() => {
    if (view === "repositories") return;
    let active = true;
    void fetchAgentData().then((payload) => { if (active) setData(payload); }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Falha ao carregar."); });
    return () => { active = false; };
  }, [view]);

  useEffect(() => {
    if (!data?.jobs.some((job) => job.status === "queued" || job.status === "running")) return;
    const timer = window.setInterval(() => { void fetchAgentData().then(setData).catch(() => undefined); }, 2500);
    return () => window.clearInterval(timer);
  }, [data]);

  const latestByScope = useMemo(() => {
    const entries = new Map<string, Job>();
    for (const job of data?.jobs ?? []) if (!entries.has(job.scopeId)) entries.set(job.scopeId, job);
    return entries;
  }, [data]);

  async function act(action: string, payload: Record<string, unknown>): Promise<Record<string, unknown> | undefined> {
    setBusy(`${action}:${String(payload.scopeId ?? domain)}`); setError(""); setMessage("");
    try {
      const response = await fetch("/api/security-agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...payload }) });
      const result = await response.json() as Record<string, unknown> & { error?: string; job?: { status?: string } };
      if (!response.ok) throw new Error(result.error || (response.status === 409 ? "A alteração ainda não foi confirmada." : "Operação não concluída."));
      if (action === "create_scope") { setDomain(""); setAuthorized(false); setMessage("Escopo criado. Publique o registro TXT indicado para comprovar a titularidade."); }
      if (action === "verify_scope") setMessage("Titularidade confirmada. O ativo está liberado para diagnóstico.");
      if (action === "run_scan") setMessage(result.job?.status === "queued" ? "Diagnóstico enviado para processamento seguro." : "Diagnóstico concluído e registrado.");
      if (action === "triage_telemetry") setMessage(result.job?.status === "queued" ? "Eventos enviados para triagem." : "Triagem concluída e registrada.");
      if (action === "set_monitoring") setMessage(payload.enabled ? "Monitoramento passivo diário ativado." : "Monitoramento automático pausado.");
      if (action === "renew_authorization") setMessage("Autorização renovada por 90 dias.");
      if (action === "update_finding") setMessage("Achado atualizado e decisão registrada.");
      if (action === "create_campaign") setMessage("Rascunho criado. Revise os limites antes de aprovar.");
      if (action === "start_guided_campaign") setMessage("Validação web agendada. Você pode acompanhar ou cancelar a campanha nas opções avançadas.");
      if (action === "approve_campaign") setMessage("Campanha aprovada, sem iniciar execução externa.");
      if (action === "dispatch_campaign") setMessage("Diagnóstico iniciado dentro da janela aprovada.");
      if (action === "cancel_campaign") setMessage("Campanha cancelada.");
      if (action === "create_remediation") setMessage("Proposta de correção criada sem alterar o repositório.");
      if (action === "decide_remediation") setMessage("Decisão registrada. Nenhuma alteração externa foi executada.");
      if (action === "create_defense_connector") setMessage("Canal de telemetria criado. Guarde a credencial exibida.");
      if (action === "set_defense_connector") setMessage(payload.enabled ? "Ingestão defensiva retomada." : "Ingestão defensiva pausada.");
      if (action === "update_defense_incident") setMessage("Estado do incidente atualizado.");
      if (action === "revoke_defense_action") setMessage("Resposta automática revogada.");
      if (action === "connect_cloudflare") setMessage("Zona Cloudflare conectada em modo somente observação.");
      if (action === "check_cloudflare") setMessage("Acesso e permissões verificados novamente.");
      if (action === "sync_cloudflare") setMessage("Eventos recentes coletados e correlacionados.");
      if (action === "audit_cloudflare") setMessage("Postura do WAF atualizada sem alterar a zona.");
      if (action === "connect_cloudflare_write") setMessage("Credencial separada de escrita armazenada. Nenhuma regra foi alterada.");
      if (action === "disconnect_cloudflare_write") setMessage("Credencial de escrita apagada.");
      if (action === "configure_cloudflare_proposal") setMessage("Prévia determinística criada. Nenhuma alteração externa foi feita.");
      if (action === "approve_cloudflare_proposal") setMessage("Alteração aprovada por 30 minutos, ainda sem publicação.");
      if (action === "apply_cloudflare_proposal") setMessage("Regra aplicada e verificada na Cloudflare.");
      if (action === "rollback_cloudflare_proposal") setMessage("Regra criada pelo CBSHub removida da Cloudflare.");
      if (action === "disconnect_cloudflare") setMessage("Conector removido e credencial apagada.");
      await load(); return result;
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Operação não concluída."); }
    finally { setBusy(""); }
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    await act("create_scope", { domain, authorizationConfirmed: authorized });
  }

  const copy = pageCopy[view];
  const verifiedScopes = data?.scopes.filter((scope) => scope.status === "verified").length ?? 0;
  const monitoredScopes = data?.scopes.filter((scope) => scope.monitoringEnabled).length ?? 0;
  const openFindings = data?.findings.filter((finding) => ["open", "investigating"].includes(finding.status)).length ?? 0;
  const openIncidents = data?.defenseIncidents.filter((incident) => !["resolved", "closed"].includes(incident.status)).length ?? 0;

  function renderScope(scope: Scope, includeOperations: boolean) {
    const latest = latestByScope.get(scope.id);
    const authorizationExpired = !scope.authorizationCurrent;
    const jobActive = latest?.status === "queued" || latest?.status === "running";
    const guidedCampaign = data?.campaigns.find((campaign) => campaign.scopeId === scope.id && campaign.guided);
    const guidedActive = Boolean(guidedCampaign && ["approved", "queued", "running"].includes(guidedCampaign.status));
    if (includeOperations) return (
      <article className="security-agent-control-scope" key={scope.id}>
        <header className="security-agent-control-head"><div><span className={`security-agent-status ${scope.status}`}>{scope.status === "verified" ? "Verificado" : "Aguardando DNS"}</span><h2>{scope.domain}</h2><p>{authorizationExpired ? "A autorização precisa ser renovada antes de novas ações." : "Diagnóstico automático, evidências e decisões deste ativo."}</p></div><Link href="/app/ativos">Ver monitoramento →</Link></header>
        <div className="security-automatic-evaluation"><div><span>AVALIAÇÃO AUTOMÁTICA</span><h3>{latest?.status === "completed" ? "Diagnóstico pronto para revisão" : "Comece pela superfície externa"}</h3><p>A plataforma coleta sinais públicos do domínio autorizado, correlaciona evidências e sugere prioridades. Não executa exploração, força bruta nem altera o site.</p>{latest?.status === "completed" ? <small>Última análise: {new Date(latest.completedAt ?? latest.startedAt).toLocaleString("pt-BR")}. {latest.assessment?.executiveSummary ?? "Abra Ativos monitorados para ver as evidências."}</small> : null}{latest?.status === "failed" ? <small role="alert">A última tentativa falhou ({latest.errorCode ?? "falha técnica"}). Você pode tentar novamente.</small> : null}<small>Eventos internos de autenticação e WAF só entram na triagem quando uma fonte de telemetria é conectada; ausência de dados não significa ausência de ataques.</small></div><div className="security-automatic-actions"><button disabled={!data?.canManage || Boolean(busy) || jobActive || scope.status !== "verified" || authorizationExpired} onClick={() => void act("run_scan", { scopeId: scope.id })}>{jobActive ? "Avaliação em andamento…" : "Iniciar avaliação"}</button><label><input type="checkbox" checked={scope.monitoringEnabled} disabled={!data?.canManage || Boolean(busy) || scope.status !== "verified" || authorizationExpired} onChange={(event) => void act("set_monitoring", { scopeId: scope.id, enabled: event.target.checked })} /> Reavaliar diariamente</label><Link href="/app/ativos">Ver evidências →</Link></div></div>
        <section className="security-guided-validation" aria-label="Validação web guiada"><div><span>VALIDAÇÃO CONTROLADA</span><h3>Verifique os controles web sem configurar uma campanha.</h3><p>Até 20 requisições, no máximo 10 por minuto. Navegação GET/HEAD, TLS, CORS e métodos anunciados — sem login, exploração, alteração de dados ou varredura de portas.</p>{guidedCampaign ? <small>Última campanha: {guidedCampaign.status === "approved" && guidedCampaign.autoDispatch ? `agendada para ${new Date(guidedCampaign.windowStart).toLocaleString("pt-BR")}` : guidedCampaign.status === "queued" || guidedCampaign.status === "running" ? "em execução" : guidedCampaign.status === "completed" ? "concluída" : guidedCampaign.status === "failed" ? "falhou; verifique o detalhe em Configuração avançada" : guidedCampaign.status}. A autorização é verificada novamente antes de iniciar.</small> : <small>A execução inicia em uma janela de cerca de 6 a 66 minutos após a confirmação e pode ser cancelada antes do envio.</small>}</div><button disabled={!data?.canManage || Boolean(busy) || scope.status !== "verified" || authorizationExpired || guidedActive || !data?.integrations.isolatedRunner} onClick={() => { if (window.confirm(`Confirmo que administro ${scope.domain} ou tenho autorização expressa para validação web limitada neste domínio. Agendar até 20 requisições (máximo 10/min), sem credenciais, exploração ou escrita?`)) void act("start_guided_campaign", { scopeId: scope.id, executionConfirmed: true }); }}>{guidedActive ? "Validação em andamento" : data?.integrations.isolatedRunner ? "Agendar validação web" : "Runner indisponível"}</button></section>
        <SecurityFindingsBoard scopeId={scope.id} findings={data?.findings ?? []} members={data?.members ?? []} disabled={!data?.canManage || Boolean(busy)} onUpdate={async (action, payload) => { await act(action, payload); }} />
        <details className="security-advanced-tools"><summary>Configuração avançada <span>Telemetria, Cloudflare e validação controlada</span></summary><div><SecurityDefensePanel scopeId={scope.id} disabled={!data?.canManage || Boolean(busy) || scope.status !== "verified"} cloudflareCredentialVault={Boolean(data?.integrations.cloudflareCredentialVault)} connectors={data?.defenseConnectors ?? []} incidents={data?.defenseIncidents ?? []} actions={data?.defenseActions ?? []} postures={data?.defensePostures ?? []} proposals={data?.defenseProposals ?? []} onAction={act} />
        <SecurityOperationsPanel scopeId={scope.id} disabled={!data?.canManage || Boolean(busy) || jobActive || scope.status !== "verified" || authorizationExpired} playbooks={latest?.playbooks ?? []} mode={latest?.mode} onTriage={act} />
        {data ? <SecurityDeliveryPanel scopeId={scope.id} disabled={!data.canManage || Boolean(busy) || scope.status !== "verified" || authorizationExpired} campaigns={data.campaigns} remediations={data.remediations} findings={data.findings} techniqueCatalog={data.techniqueCatalog} integrations={data.integrations} onAction={act} /> : null}</div></details>
      </article>
    );
    return (
      <article className="security-agent-asset" key={scope.id}>
        <div className="security-agent-asset-head"><div><span className={`security-agent-status ${scope.status}`}>{scope.status === "verified" ? "Verificado" : "Aguardando DNS"}</span><h3>{scope.domain}</h3><small>{scope.lastScanAt ? `Última leitura: ${new Date(scope.lastScanAt).toLocaleString("pt-BR")}` : "Nenhum diagnóstico executado"}</small><small>{authorizationExpired ? "Autorização expirada" : `Autorizado até ${new Date(scope.authorizationExpiresAt!).toLocaleDateString("pt-BR")}`}</small></div>{typeof latest?.scan?.posture?.score === "number" ? <div className="security-agent-score"><b>{latest.scan.posture.score}</b><span>/100</span></div> : null}</div>
        {scope.verification ? <div className="security-agent-dns"><b>Registro necessário no DNS</b><dl><div><dt>Tipo</dt><dd>{scope.verification.type}</dd></div><div><dt>Nome</dt><dd>{scope.verification.name}</dd></div><div><dt>Valor</dt><dd>{scope.verification.value}</dd></div></dl></div> : null}
        <div className="security-agent-actions">
          {scope.status === "pending" ? <button disabled={busy.startsWith("verify_scope")} onClick={() => void act("verify_scope", { scopeId: scope.id })}>Confirmar DNS</button> : <button disabled={busy.startsWith("run_scan") || jobActive || authorizationExpired} onClick={() => void act("run_scan", { scopeId: scope.id })}>{jobActive ? latest?.status === "queued" ? "Na fila…" : "Analisando…" : busy === `run_scan:${scope.id}` ? "Agendando…" : "Executar diagnóstico"}</button>}
          {scope.status === "verified" ? <label><input type="checkbox" checked={scope.monitoringEnabled} disabled={authorizationExpired} onChange={(event) => void act("set_monitoring", { scopeId: scope.id, enabled: event.target.checked })} /> Monitorar diariamente</label> : null}
          {authorizationExpired ? <button className="secondary" onClick={() => { if (window.confirm("Confirmo novamente que administro este domínio ou possuo autorização expressa para avaliá-lo.")) void act("renew_authorization", { scopeId: scope.id, authorizationConfirmed: true }); }}>Renovar autorização</button> : null}
          {scope.status === "verified" ? <Link href="/app/operacoes">Abrir operações →</Link> : null}
        </div>
        {jobActive ? <div className="security-agent-alert success">{latest?.status === "queued" ? "Execução aguardando processamento." : "Análise em andamento."}</div> : null}
        {latest?.status === "failed" ? <p className="security-agent-alert error" role="alert">A análise falhou. Código: {latest.errorCode ?? "SCAN_FAILED"}</p> : null}
        {latest?.status === "completed" && latest.findingSyncStatus === "failed" ? <p className="security-agent-alert error" role="alert">A análise terminou, mas os achados não foram sincronizados. Código: {latest.findingSyncError ?? "FINDING_SYNC_FAILED"}</p> : null}
        {latest?.assessment && latest.status === "completed" ? <div className="security-agent-report"><div className="security-agent-report-head"><span>{latest.mode === "blue_team" ? "Triagem defensiva" : "Diagnóstico passivo"}{latest.reviewModel ? " · revisão concluída" : ""}</span><b className={`risk-${latest.assessment.riskLevel}`}>{severityLabel[latest.assessment.riskLevel] ?? latest.assessment.riskLevel}</b></div><p>{latest.assessment.executiveSummary}</p><div className="security-agent-priorities">{latest.assessment.priorities.map((priority, index) => <div key={`${priority.title}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span><section><b>{priority.title}</b><p>{priority.why}</p><small>{priority.recommendation}</small><p>Evidência: {priority.evidenceCodes.join(", ")}</p></section></div>)}</div>{latest.assessment.limitations.map((limitation) => <p key={limitation} className="security-operations-note">{limitation}</p>)}<footer>Confiança: {latest.assessment.confidence ?? "não informada"} · Evidência: {latest.scan?.fingerprint ?? "registrada"} · Validação humana recomendada</footer></div> : null}
      </article>
    );
  }

  return <main className="security-workspace-shell">
    <aside className="security-workspace-sidebar">
      <Link href="/app" className="security-agent-brand"><BrandMark /><span><b>CBS</b> Hub<small>Cybersecurity</small></span></Link>
      <div className="security-workspace-product"><i /><span>Status do workspace</span><b>Operação protegida</b></div>
      <nav aria-label="Navegação do workspace de segurança">{navigation.map((item) => <Link href={item.href} className={view === item.view ? "active" : ""} aria-current={view === item.view ? "page" : undefined} key={item.view}><span><WorkspaceIcon name={item.icon} /></span><b>{item.label}</b></Link>)}</nav>
      <div className="security-workspace-sidebar-foot"><span>Ambiente protegido</span><p>Escopo autorizado, evidências preservadas e decisões auditáveis.</p><Link href="/sair">Encerrar sessão →</Link></div>
    </aside>

    <section className="security-workspace-main">
      <header className="security-agent-topbar"><div><span>Workspace de segurança</span><b>{navigation.find((item) => item.view === view)?.label}</b></div><div><span className="security-agent-provider online"><i />Proteções ativas</span><Link href="/">Diagnóstico público</Link></div></header>
      <div className="security-agent-page">
        <section className="security-agent-hero"><span>{copy.eyebrow}</span><h1>{copy.title}</h1><p>{copy.description}</p></section>
        {error ? <div className="security-agent-alert error" role="alert">{error}</div> : null}
        {message ? <div className="security-agent-alert success" role="status">{message}</div> : null}

        {view === "overview" ? <section className="security-overview">
          <div className="security-overview-stats"><article><span>Ativos autorizados</span><b>{data ? verifiedScopes : "—"}</b><small>domínios com titularidade confirmada</small></article><article><span>Monitoramento ativo</span><b>{data ? monitoredScopes : "—"}</b><small>rotinas recorrentes habilitadas</small></article><article><span>Achados em aberto</span><b>{data ? openFindings : "—"}</b><small>itens aguardando tratamento</small></article><article><span>Incidentes ativos</span><b>{data ? openIncidents : "—"}</b><small>eventos em investigação ou contenção</small></article></div>
          <div className="security-overview-grid"><article className="security-overview-primary"><span>Próximo passo</span><h2>{verifiedScopes ? "Revise a postura dos seus ativos" : "Adicione seu primeiro ativo"}</h2><p>{verifiedScopes ? "Execute um novo diagnóstico ou abra as operações para tratar evidências recentes." : "A validação por DNS confirma o escopo antes de iniciar qualquer diagnóstico."}</p><Link href={verifiedScopes ? "/app/ativos" : "/app/autorizar"}>{verifiedScopes ? "Ver ativos" : "Autorizar ativo"} →</Link></article><nav aria-label="Acessos rápidos"><Link href="/app/ativos"><WorkspaceIcon name="radar" /><span><b>Superfície monitorada</b><small>Postura, diagnósticos e recorrência</small></span><em>→</em></Link><Link href="/app/operacoes"><WorkspaceIcon name="controls" /><span><b>Operações</b><small>Incidentes, evidências e respostas</small></span><em>→</em></Link><Link href="/app/projetos"><WorkspaceIcon name="code" /><span><b>Projetos</b><small>Código, dependências e correções</small></span><em>→</em></Link></nav></div>
        </section> : null}

        {view === "authorize" ? <section className="security-agent-grid security-authorization-layout"><form className="security-agent-panel security-agent-onboard" onSubmit={create}><div className="security-agent-panel-title"><span>01</span><div><b>Informar domínio público</b><small>Use apenas ativos próprios ou expressamente autorizados</small></div></div><label htmlFor="agent-domain">Domínio público</label><div className="security-agent-domain"><span>https://</span><input id="agent-domain" value={domain} onChange={(event) => setDomain(event.target.value)} placeholder="empresa.com.br" required disabled={!data?.canManage} /></div><label className="security-agent-consent"><input type="checkbox" checked={authorized} onChange={(event) => setAuthorized(event.target.checked)} required disabled={!data?.canManage} /><span>Confirmo que administro este domínio ou possuo autorização expressa do responsável para avaliá-lo.</span></label><button type="submit" disabled={!data?.canManage || busy.startsWith("create_scope")}>{busy.startsWith("create_scope") ? "Criando escopo…" : "Gerar verificação DNS"}<b>→</b></button>{!data?.canManage ? <small>Somente proprietário ou administrador pode autorizar novos ativos.</small> : null}</form><aside className="security-agent-panel security-authorization-steps"><span>Como funciona</span><ol><li><b>1</b><div><strong>Crie o escopo</strong><p>Informe o domínio e declare a autorização.</p></div></li><li><b>2</b><div><strong>Publique o TXT</strong><p>Adicione o registro fornecido no provedor do DNS.</p></div></li><li><b>3</b><div><strong>Confirme e monitore</strong><p>Após a validação, libere diagnósticos e recorrência.</p></div></li></ol><small>Nenhuma análise é iniciada antes da confirmação do DNS.</small></aside></section> : null}

        {view === "assets" ? <section className="security-agent-assets security-agent-module"><div className="security-agent-section-title"><span>Ativos autorizados</span><h2>Escopos e monitoramento</h2></div>{!data ? <div className="security-agent-empty">Carregando os ativos…</div> : null}{data && !data.scopes.length ? <div className="security-agent-empty"><b>Nenhum domínio autorizado</b><p>Comece criando um escopo e validando a titularidade pelo DNS.</p><Link href="/app/autorizar">Autorizar primeiro ativo →</Link></div> : null}{data?.scopes.map((scope) => renderScope(scope, false))}</section> : null}

        {view === "operations" ? <section className="security-agent-assets security-agent-module security-operations-module"><div className="security-agent-section-title"><span>Controles do workspace</span><h2>Operações por ativo</h2></div><aside className="security-guardrail-summary"><div><WorkspaceIcon name="shield" /><span><b>Execução sob controle</b><small>Escopo confirmado, limites rígidos e aprovação humana.</small></span></div><ul><li>Sem força bruta, evasão ou exploração destrutiva</li><li>Telemetria e evidências minimizadas</li><li>Alterações externas sempre revisáveis</li></ul></aside>{!data ? <div className="security-agent-empty">Carregando as operações…</div> : null}{data && !data.scopes.length ? <div className="security-agent-empty"><b>Nenhum ativo disponível</b><p>Autorize um domínio para habilitar os controles operacionais.</p><Link href="/app/autorizar">Autorizar ativo →</Link></div> : null}{data?.scopes.map((scope) => renderScope(scope, true))}</section> : null}

        {view === "repositories" ? <section className="security-repositories-page"><SecurityRepositoriesPanel /></section> : null}
      </div>
    </section>
  </main>;
}

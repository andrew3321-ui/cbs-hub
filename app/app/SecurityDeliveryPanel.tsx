"use client";

import { useEffect, useState, type FormEvent } from "react";
import { SECURITY_ACTIVE_RUNNER_MAX_TOTAL_REQUESTS, type SecurityTechniqueId } from "../../domain/security-campaign-policy";
import type { RunnerExecutionResult } from "../../security-runner/executor";
import type { SecurityFinding } from "./SecurityFindingsBoard";

type Technique = { label: string; execution: string; risk: string; requiresRepository: boolean; requiresTestCredentials: boolean };
type RunnerResult = Partial<RunnerExecutionResult>;
export type SecurityCampaign = { id: string; scopeId: string; name: string; environment: string; techniques: SecurityTechniqueId[]; policyVersion: string; windowStart: string; windowEnd: string; maxRequestsPerMinute: number; maxTotalRequests: number; status: string; autoDispatch?: boolean; guided?: boolean; readiness: { ready?: boolean; blockers?: string[] } | null; agentJobId?: string | null; runnerJobId?: string | null; runnerResult?: RunnerResult | null; runnerErrorCode?: string | null; runnerCompletedAt?: string | null; executor?: string | null; approvedAt: string | null };
export type SecurityRemediation = { id: string; scopeId: string; findingId: string; provider: string; repository: string; baseBranch: string; strategy: string; status: string; externalPrUrl: string | null };

const blockerLabels: Record<string, string> = { ISOLATED_RUNNER_NOT_CONFIGURED: "runner isolado ainda não conectado", REPOSITORY_CONNECTOR_NOT_CONFIGURED: "integração de repositório ainda não conectada" };
const corsLabels: Record<string, string> = {
  inconclusive: "Inconclusivo nesta resposta",
  not_advertised: "Não anunciado nesta resposta",
  restricted: "Origem da sonda não permitida",
  wildcard: "Qualquer origem anunciada",
  reflected_origin: "Origem da sonda refletida",
  credentialed_origin_reflection: "Origem refletida com credenciais",
};
const stopLabels: Record<string, string> = {
  target_rate_limited: "O alvo solicitou redução de tráfego (HTTP 429)",
  request_budget_reached: "Orçamento de requisições atingido",
  execution_window_expired: "Janela autorizada encerrada",
  execution_time_limit: "Limite de tempo atingido",
  unexpected_authentication: "Autenticação inesperada observada",
  consecutive_server_errors: "Sequência de erros 5xx observada",
  error_rate_threshold: "Taxa de erros atingiu o limite aprovado",
};

function RunnerResultCard({ result, maxTotalRequests }: { result: RunnerResult; maxTotalRequests: number }) {
  const probe = result.webProbe;
  const cookieAttributes = probe ? [probe.cookies.secureObserved ? "Secure" : null, probe.cookies.httpOnlyObserved ? "HttpOnly" : null, probe.cookies.sameSiteObserved ? "SameSite" : null].filter(Boolean) : [];
  return <div className="security-runner-result">
    <b>Evidências da validação isolada</b>
    <dl>
      <div><dt>Requisições</dt><dd>{result.budget?.consumed ?? 0}/{result.budget?.totalRequests ?? maxTotalRequests}</dd></div>
      <div><dt>HTTPS</dt><dd>{result.transport?.httpsReachable ? `confirmado · HTTP ${result.transport.status}` : "não confirmado"}</dd></div>
      <div><dt>Páginas HTML</dt><dd>{result.crawl?.htmlPages ?? 0}</dd></div>
      <div><dt>Cobertura HSTS / CSP</dt><dd>{result.crawl ? `${result.crawl.hstsCoveragePercent}% / ${result.crawl.cspCoveragePercent}%` : "não medida"}</dd></div>
    </dl>
    {probe ? <section className="security-web-probe-result" aria-label="Resultado da sonda adversarial web">
      <header><b>Sonda adversarial web</b><span>{probe.requestsCompleted}/2 respostas observadas</span></header>
      <dl>
        <div><dt>CORS</dt><dd>{corsLabels[probe.cors.verdict] ?? "Inconclusivo"}</dd></div>
        <div><dt>Métodos sensíveis anunciados</dt><dd>{probe.methods.responseObserved ? probe.methods.riskyAdvertised.join(", ") || "Não anunciados" : "Inconclusivo"}</dd></div>
        <div><dt>Atributos de cookies observados</dt><dd>{probe.cookies.observed ? cookieAttributes.join(" · ") || "Nenhum dos três atributos" : "Cookie não observado"}</dd></div>
      </dl>
      {probe.signals.length ? <ul className="security-runner-signals">{probe.signals.map((signal) => <li key={signal.code} data-severity={signal.severity}><span>{signal.severity === "high" ? "Alta" : signal.severity === "medium" ? "Média" : "Baixa"} prioridade de revisão</span><b>{signal.title}</b><p>{signal.detail}</p></li>)}</ul> : <p className="security-probe-empty">Nenhum sinal de revisão nas respostas observadas. Isso não comprova ausência de vulnerabilidades.</p>}
      <small>Apenas HEAD e OPTIONS na raiz autorizada. Não executa os métodos anunciados, não envia credenciais e não armazena nomes ou valores de cookies.</small>
    </section> : null}
    {result.stopReason ? <p className="security-runner-stop">Interrompido: {stopLabels[result.stopReason] ?? result.stopReason.replaceAll("_", " ")}.</p> : null}
    <small>{result.limitation}</small>
  </div>;
}

export default function SecurityDeliveryPanel({ scopeId, disabled, campaigns, remediations, findings, techniqueCatalog, integrations, onAction }: {
  scopeId: string; disabled: boolean; campaigns: SecurityCampaign[]; remediations: SecurityRemediation[]; findings: SecurityFinding[];
  techniqueCatalog: Record<SecurityTechniqueId, Technique>; integrations: { isolatedRunner: boolean; repositoryConnector: boolean };
  onAction: (action: string, payload: Record<string, unknown>) => Promise<unknown>;
}) {
  const [campaignError, setCampaignError] = useState("");
  const [environment, setEnvironment] = useState("production");
  const [defaultWindow, setDefaultWindow] = useState({ start: "", end: "" });
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => { const timer = window.setInterval(() => setClock(Date.now()), 30_000); return () => window.clearInterval(timer); }, []);
  const scopedCampaigns = campaigns.filter((item) => item.scopeId === scopeId);
  const scopedRemediations = remediations.filter((item) => item.scopeId === scopeId);
  const openFindings = findings.filter((item) => item.scopeId === scopeId && ["open", "investigating"].includes(item.status));

  async function createCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setCampaignError("");
    const form = new FormData(event.currentTarget);
    const techniques = form.getAll("techniques").map(String) as SecurityTechniqueId[];
    const start = new Date(String(form.get("windowStart"))), end = new Date(String(form.get("windowEnd")));
    if (!techniques.length || !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) { setCampaignError("Escolha ao menos uma técnica e uma janela válida."); return; }
    if (new Set(techniques.map((id) => techniqueCatalog[id]?.execution)).size !== 1) { setCampaignError("Agrupe somente técnicas do mesmo executor em cada campanha."); return; }
    await onAction("create_campaign", { scopeId, campaign: {
      name: form.get("name"), environment: form.get("environment"), techniques,
      windowStart: start.toISOString(), windowEnd: end.toISOString(),
      maxRequestsPerMinute: Number(form.get("maxRequestsPerMinute")), maxTotalRequests: Number(form.get("maxTotalRequests")),
      stopConditions: { errorRatePercent: Number(form.get("errorRatePercent")), consecutiveServerErrors: Number(form.get("consecutiveServerErrors")), unexpectedAuthentication: true },
      authorizationConfirmed: form.get("authorizationConfirmed") === "on",
    } });
  }

  async function createRemediation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await onAction("create_remediation", { scopeId, target: { findingId: form.get("findingId"), provider: "github", repository: form.get("repository"), baseBranch: form.get("baseBranch"), approvalConfirmed: form.get("repositoryAuthorization") === "on" } });
  }

  return <section className="security-delivery">
    <div className="security-delivery-title"><div><span>VALIDAÇÃO ADVERSARIAL AUTORIZADA</span><h3>Testes ofensivos e correções</h3></div><div className="security-integration-state"><b className={integrations.isolatedRunner ? "ready" : "blocked"}>Runner {integrations.isolatedRunner ? "conectado" : "bloqueado"}</b><b className={integrations.repositoryConnector ? "ready" : "blocked"}>GitHub {integrations.repositoryConnector ? "conectado" : "bloqueado"}</b></div></div>
    <p>Valide controles com sondas seguras, sem payload de exploração. Defina o escopo, aprove a campanha e inicie na janela autorizada; cada execução permanece limitada e auditável.</p>
    <details onToggle={(event) => { if (!event.currentTarget.open || defaultWindow.start) return; const local = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16); setDefaultWindow({ start: local(new Date(Date.now() + 15 * 60_000)), end: local(new Date(Date.now() + 75 * 60_000)) }); }}><summary>Personalizar validação controlada · avançado</summary>
      <p>Preset conservador: ambiente de produção, até 20 requisições e interrupção automática diante de erros. Revise a janela e aprove a campanha antes de iniciar. A avaliação automática principal não exige este formulário.</p>
      <form onSubmit={createCampaign}><fieldset disabled={disabled}>
        <div className="security-delivery-grid"><label>Nome<input name="name" minLength={4} maxLength={80} required defaultValue="Validação web controlada" /></label><label>Ambiente<select name="environment" value={environment} onChange={(event) => setEnvironment(event.target.value)}><option value="production">Produção</option><option value="staging">Homologação</option><option value="lab">Laboratório</option></select></label><label>Início<input name="windowStart" type="datetime-local" required defaultValue={defaultWindow.start} key={`start-${defaultWindow.start}`} /></label><label>Fim<input name="windowEnd" type="datetime-local" required defaultValue={defaultWindow.end} key={`end-${defaultWindow.end}`} /></label><label>Máx. req./minuto<input name="maxRequestsPerMinute" type="number" min="1" max={environment === "production" ? 30 : 60} defaultValue="10" required /></label><label>Máx. total<input name="maxTotalRequests" type="number" min="1" max={SECURITY_ACTIVE_RUNNER_MAX_TOTAL_REQUESTS} defaultValue="20" required /><small>Runner ativo: teto rígido de {SECURITY_ACTIVE_RUNNER_MAX_TOTAL_REQUESTS} requisições.</small></label><label>Parar com taxa 5xx (%)<input name="errorRatePercent" type="number" min="1" max="20" defaultValue="10" required /></label><label>Parar após 5xx consecutivos<input name="consecutiveServerErrors" type="number" min="1" max="20" defaultValue="3" required /></label></div>
        <div className="security-techniques"><b>Técnicas permitidas nesta campanha — use somente técnicas do mesmo executor</b>{Object.entries(techniqueCatalog).map(([id, technique]) => <label key={id}><input type="checkbox" name="techniques" value={id} defaultChecked={["safe_web_crawl", "tls_configuration_review", "web_control_probe"].includes(id)} /><span><b>{technique.label}</b><small>{technique.execution.replaceAll("_", " ")} · {technique.risk.replaceAll("_", " ")}{technique.requiresTestCredentials ? " · exige conta de teste" : ""}</small></span></label>)}</div>
        <label className="security-operations-consent"><input type="checkbox" name="authorizationConfirmed" required />Confirmo novamente a autorização, a janela, os limites e que existe responsável disponível para interromper a campanha.</label>
        {campaignError ? <p role="alert">{campaignError}</p> : null}<button type="submit">Criar rascunho de campanha</button>
      </fieldset></form>
    </details>
    {scopedCampaigns.length ? <div className="security-campaign-list">{scopedCampaigns.map((campaign) => { const withinWindow = clock >= Date.parse(campaign.windowStart) && clock <= Date.parse(campaign.windowEnd); const passiveReady = campaign.status === "approved" && campaign.techniques.length === 1 && campaign.techniques[0] === "passive_external_posture" && withinWindow; const runnerReady = !campaign.guided && campaign.status === "approved" && campaign.readiness?.ready === true && campaign.techniques.every((id) => techniqueCatalog[id]?.execution === "isolated_runner" && !techniqueCatalog[id]?.requiresTestCredentials) && withinWindow; const result = campaign.runnerResult && Object.keys(campaign.runnerResult).length ? campaign.runnerResult : null; return <article key={campaign.id}><header><div><b>{campaign.name}</b><small>{campaign.environment} · {new Date(campaign.windowStart).toLocaleString("pt-BR")} — {new Date(campaign.windowEnd).toLocaleTimeString("pt-BR")}</small></div><span>{campaign.guided && campaign.autoDispatch ? "agendada" : campaign.status}</span></header><p>{campaign.techniques.map((id) => techniqueCatalog[id]?.label ?? id).join(" · ")}</p>{campaign.readiness?.blockers?.length ? <p className="security-delivery-blocked">Não executável: {campaign.readiness.blockers.map((item) => blockerLabels[item] ?? item).join("; ")}.</p> : <p className="security-delivery-ready">Política sem bloqueios de integração conhecidos.</p>}{campaign.agentJobId || campaign.runnerJobId ? <p>Execução vinculada: {campaign.agentJobId ?? campaign.runnerJobId} · {campaign.executor ?? "existing_passive"}</p> : null}{campaign.runnerErrorCode ? <p className="security-delivery-blocked">Runner interrompido: {campaign.runnerErrorCode}.</p> : null}{result ? <RunnerResultCard result={result} maxTotalRequests={campaign.maxTotalRequests} /> : null}<footer>{campaign.status === "draft" ? <button onClick={() => { if (window.confirm("Aprovar esta campanha com a janela, técnicas, limites e condições de parada exibidos? A aprovação não inicia execução.")) void onAction("approve_campaign", { scopeId, campaignId: campaign.id, approvalConfirmed: true }); }}>Aprovar configuração</button> : null}{passiveReady ? <button onClick={() => { if (window.confirm("Iniciar agora o diagnóstico passivo dentro da janela aprovada?")) void onAction("dispatch_campaign", { scopeId, campaignId: campaign.id, executionConfirmed: true }); }}>Iniciar diagnóstico passivo</button> : null}{runnerReady ? <button onClick={() => { if (window.confirm("Enviar esta campanha limitada ao runner isolado? Os limites e o kill switch definidos no manifesto permanecem obrigatórios.")) void onAction("dispatch_campaign", { scopeId, campaignId: campaign.id, executionConfirmed: true }); }}>Iniciar validação isolada</button> : null}{["draft", "approved"].includes(campaign.status) ? <button className="secondary" onClick={() => void onAction("cancel_campaign", { scopeId, campaignId: campaign.id })}>Cancelar</button> : null}</footer></article>; })}</div> : null}
    <details><summary>Preparar correção por pull request</summary>
      <p>A proposta apenas vincula um achado a um repositório autorizado. Nenhuma branch, commit ou PR é criado enquanto a integração GitHub estiver bloqueada.</p>
      <form onSubmit={createRemediation}><fieldset disabled={disabled || !openFindings.length}><div className="security-delivery-grid"><label>Achado<select name="findingId" required><option value="">Selecione</option>{openFindings.map((finding) => <option value={finding.id} key={finding.id}>{finding.title} · {finding.evidenceCode}</option>)}</select></label><label>Repositório GitHub<input name="repository" required placeholder="organizacao/projeto" /></label><label>Branch base<input name="baseBranch" required defaultValue="main" /></label></div><label className="security-operations-consent"><input type="checkbox" name="repositoryAuthorization" required />Confirmo que este repositório pertence à organização ou foi autorizado e que toda mudança deverá ocorrer por pull request revisável.</label><button type="submit">Criar proposta de correção</button>{!openFindings.length ? <p>É necessário um achado aberto ou em investigação.</p> : null}</fieldset></form>
    </details>
    {scopedRemediations.length ? <div className="security-campaign-list">{scopedRemediations.map((proposal) => <article key={proposal.id}><header><div><b>{proposal.repository}</b><small>{proposal.baseBranch} · achado {proposal.findingId}</small></div><span>{proposal.status}</span></header><p>Estratégia obrigatória: {proposal.strategy.replaceAll("_", " ")}. Alteração externa: não executada.</p><footer>{proposal.status === "draft" ? <><button onClick={() => { if (window.confirm("Aprovar a preparação desta correção? O merge continuará dependente de revisão humana.")) void onAction("decide_remediation", { scopeId, remediationId: proposal.id, decision: "approve", approvalConfirmed: true }); }}>Aprovar proposta</button><button className="secondary" onClick={() => void onAction("decide_remediation", { scopeId, remediationId: proposal.id, decision: "reject", approvalConfirmed: false })}>Rejeitar</button></> : null}{proposal.externalPrUrl ? <a href={proposal.externalPrUrl} target="_blank" rel="noreferrer">Abrir pull request</a> : null}</footer></article>)}</div> : null}
  </section>;
}

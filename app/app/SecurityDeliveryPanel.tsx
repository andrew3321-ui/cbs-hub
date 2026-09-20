"use client";

import { useEffect, useState, type FormEvent } from "react";
import { SECURITY_ACTIVE_RUNNER_MAX_TOTAL_REQUESTS, type SecurityTechniqueId } from "../../domain/security-campaign-policy";
import type { RunnerExecutionResult } from "../../security-runner/executor";

type Technique = { label: string; execution: string; risk: string; requiresRepository: boolean; requiresTestCredentials: boolean };
type RunnerResult = Partial<RunnerExecutionResult>;
type SpecialistFragment = { fragment: { summary: string; evidenceCodes: string[]; uncertainties: string[]; nextFocus: string }; model: string; usage: { inputTokens: number; outputTokens: number } };
export type SecurityCampaign = { id: string; scopeId: string; name: string; environment: string; techniques: SecurityTechniqueId[]; policyVersion: string; windowStart: string; windowEnd: string; maxRequestsPerMinute: number; maxTotalRequests: number; status: string; autoDispatch?: boolean; guided?: boolean; readiness: { ready?: boolean; blockers?: string[] } | null; agentJobId?: string | null; runnerJobId?: string | null; runnerResult?: RunnerResult | null; runnerErrorCode?: string | null; runnerCompletedAt?: string | null; specialistStatus?: string; specialistResult?: Partial<Record<"surface" | "controls" | "remediation", SpecialistFragment>> | null; specialistErrorCode?: string | null; executor?: string | null; approvedAt: string | null };
export type SecurityCampaignEvent = { id: string; campaignId: string; eventType: string; details: { stage?: string; counts?: Record<string, number>; method?: string; action?: string; status?: number; errorCategory?: string } | null; createdAt: string };
export type SecurityRemediation = { id: string; scopeId: string; findingId: string; provider: string; repository: string; baseBranch: string; strategy: string; status: string; externalPrUrl: string | null };
const campaignStatusLabels: Record<string, string> = { draft: "Rascunho", approved: "Aprovada", queued: "Na fila", running: "Em execução", completed: "Concluída", review: "Interrompida para revisão", failed: "Falhou", cancelled: "Cancelada" };

const blockerLabels: Record<string, string> = { ISOLATED_RUNNER_NOT_CONFIGURED: "runner isolado ainda não conectado", REPOSITORY_CONNECTOR_NOT_CONFIGURED: "integração de repositório ainda não conectada" };
const runnerErrorLabels: Record<string, string> = {
  CAMPAIGN_RUNNER_REJECTED: "O serviço de execução recusou a campanha antes de iniciar as sondas.",
  CAMPAIGN_RUNNER_POLICY_MISMATCH: "A versão da política do serviço de execução não corresponde à campanha.",
  CAMPAIGN_RUNNER_SIGNATURE_INVALID: "A autenticação entre os serviços falhou.",
  CAMPAIGN_RUNNER_SIGNING_KEY_NOT_CONFIGURED: "A autenticação do serviço de execução não está configurada.",
  CAMPAIGN_RUNNER_QUEUE_DISPATCH_FAILED: "A fila do serviço de execução estava indisponível.",
  CAMPAIGN_RUNNER_IDEMPOTENCY_CONFLICT: "A campanha já possui um manifesto diferente no serviço de execução.",
};
const campaignEventLabels: Record<string, string> = {
  "campaign.created": "Campanha configurada",
  "campaign.approved": "Escopo e limites aprovados",
  "campaign.guided_scheduled": "Validação agendada",
  "campaign.dispatched": "Enviada ao runner isolado",
  "runner.queued": "Execução entrou na fila",
  "runner.stage_started": "Etapa iniciada",
  "runner.stage_completed": "Etapa concluída",
  "runner.stage_skipped": "Etapa não executada após parada segura",
  "runner.request_completed": "Requisição concluída",
  "runner.request_failed": "Requisição falhou",
  "runner.completed": "Sondas concluídas",
  "runner.stopped": "Sondas interrompidas pelo limite",
  "runner.failed": "Execução falhou",
  "campaign.runner_status_changed": "Estado da campanha atualizado",
  "campaign.guided_dispatch_failed": "Agendamento recusado",
  "campaign.specialists_queued": "Especialistas aguardando processamento",
  "campaign.specialist_started": "Agente iniciou a revisão",
  "campaign.specialist_completed": "Agente concluiu o fragmento",
  "campaign.specialists_completed": "Revisão especializada concluída",
  "campaign.specialists_failed": "Revisão especializada falhou",
};
const campaignStageLabels: Record<string, string> = {
  ownership_verification: "Comprovação DNS",
  web_control_probe: "Controles web",
  safe_web_crawl: "Navegação segura",
  tls_configuration_review: "Transporte HTTPS",
  surface: "Especialista em superfície",
  controls: "Especialista em controles",
  remediation: "Especialista em priorização",
};
const requestErrorLabels: Record<string, string> = { timeout: "tempo limite", network_or_tls: "rede ou TLS", response_read: "leitura da resposta" };
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
  error_rate_threshold: "Taxa de erros atingiu o limite aprovado; resultado inconclusivo",
};

function RunnerResultCard({ result, maxTotalRequests }: { result: RunnerResult; maxTotalRequests: number }) {
  const probe = result.webProbe;
  const noHttpResponse = (result.requests?.errors ?? 0) > 0 && (result.requests?.successful ?? 0) === 0;
  const cookieAttributes = probe ? [probe.cookies.secureObserved ? "Secure" : null, probe.cookies.httpOnlyObserved ? "HttpOnly" : null, probe.cookies.sameSiteObserved ? "SameSite" : null].filter(Boolean) : [];
  return <div className="security-runner-result">
    <b>Evidências da validação isolada</b>
    <dl>
      <div><dt>Requisições</dt><dd>{result.budget?.consumed ?? 0}/{result.budget?.totalRequests ?? maxTotalRequests}</dd></div>
      <div><dt>HTTPS</dt><dd>{result.transport?.httpsReachable ? `confirmado · HTTP ${result.transport.status}` : noHttpResponse ? "inconclusivo · sem resposta HTTP" : "não confirmado"}</dd></div>
      <div><dt>Páginas HTML</dt><dd>{result.crawl?.htmlPages ?? 0}</dd></div>
      <div><dt>Cobertura HSTS / CSP</dt><dd>{result.crawl?.htmlPages ? `${result.crawl.hstsCoveragePercent}% / ${result.crawl.cspCoveragePercent}%` : "não medida"}</dd></div>
    </dl>
    {probe ? <section className="security-web-probe-result" aria-label="Resultado da sonda adversarial web">
      <header><b>Sonda adversarial web</b><span>{probe.requestsCompleted}/2 respostas observadas</span></header>
      <dl>
        <div><dt>CORS</dt><dd>{corsLabels[probe.cors.verdict] ?? "Inconclusivo"}</dd></div>
        <div><dt>Métodos sensíveis anunciados</dt><dd>{probe.methods.responseObserved ? probe.methods.riskyAdvertised.join(", ") || "Não anunciados" : "Inconclusivo"}</dd></div>
        <div><dt>Atributos de cookies observados</dt><dd>{probe.cookies.observed ? cookieAttributes.join(" · ") || "Nenhum dos três atributos" : "Cookie não observado"}</dd></div>
      </dl>
      {probe.signals.length ? <ul className="security-runner-signals">{probe.signals.map((signal) => <li key={signal.code} data-severity={signal.severity}><span>{signal.severity === "high" ? "Alta" : signal.severity === "medium" ? "Média" : "Baixa"} prioridade de revisão</span><b>{signal.title}</b><p>{signal.detail}</p></li>)}</ul> : <p className="security-probe-empty">{probe.requestsCompleted ? "Nenhum sinal de revisão nas respostas observadas. Isso não comprova ausência de vulnerabilidades." : "Nenhuma resposta HTTP foi observada nesta sonda; CORS, métodos e cookies não puderam ser avaliados."}</p>}
      <small>Apenas HEAD e OPTIONS na raiz autorizada. Não executa os métodos anunciados, não envia credenciais e não armazena nomes ou valores de cookies.</small>
    </section> : null}
    {noHttpResponse ? <p className="security-runner-stop">Todas as {result.requests?.errors} tentativas falharam antes de receber um status HTTP. Isso pode ocorrer por falha de conexão, TLS ou tempo limite; esta execução não identifica qual deles ocorreu.</p> : null}
    {result.stopReason ? <p className="security-runner-stop">Interrompido: {stopLabels[result.stopReason] ?? result.stopReason.replaceAll("_", " ")}.</p> : null}
    <small>{result.limitation}</small>
  </div>;
}

function CampaignTimeline({ events }: { events: SecurityCampaignEvent[] }) {
  if (!events.length) return null;
  return <details className="security-campaign-timeline" open><summary>Log auditável · {events.length} eventos</summary><p>Ações reais do runner e etapas dos especialistas. Não há shell remoto nem comandos livres executados pela IA.</p><ol>{events.slice(-40).map((event) => {
    const stage = event.details?.stage ? campaignStageLabels[event.details.stage] ?? "Etapa técnica" : null;
    const label = campaignEventLabels[event.eventType] ?? "Atualização registrada";
    const counts = event.details?.counts;
    const measured = counts && Object.entries(counts).filter(([, value]) => Number.isFinite(value)).map(([key, value]) => `${key === "pagesVisited" ? "páginas" : key === "requestsCompleted" ? "sondas" : key === "signals" ? "sinais" : key === "htmlPages" ? "páginas HTML" : key === "httpsReachable" ? "HTTPS" : "medida"}: ${value}`).join(" · ");
    const action = event.details?.action ? `${event.details.method ?? "HTTP"} · ${event.details.action}` : null;
    const outcome = event.details?.status ? `HTTP ${event.details.status}` : event.details?.errorCategory ? `falha · ${requestErrorLabels[event.details.errorCategory] ?? "não classificada"}` : null;
    return <li key={event.id}><time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleTimeString("pt-BR")}</time><span>{action ?? (stage ? `${stage} · ${label}` : label)}{outcome ? ` · ${outcome}` : ""}{measured ? ` · ${measured}` : ""}</span></li>;
  })}</ol>{events.length > 40 ? <small>Exibindo as 40 atualizações mais recentes.</small> : null}</details>;
}

function SpecialistResultCard({ campaign }: { campaign: SecurityCampaign }) {
  if (!campaign.specialistStatus || campaign.specialistStatus === "not_requested" || (campaign.specialistStatus === "pending" && campaign.status !== "completed")) return null;
  const results = campaign.specialistResult ?? {};
  return <section className="security-specialist-result"><b>Revisão por agentes especializados</b><small>Interpretação das sondas limitadas já executadas. Não equivale a pentest autenticado completo nem confirma exploração.</small>
    {(["surface", "controls", "remediation"] as const).map((stage) => results[stage]?.fragment ? <article key={stage}><strong>{campaignStageLabels[stage]}</strong><p>{results[stage]!.fragment.summary}</p><small>Evidências: {results[stage]!.fragment.evidenceCodes.join(", ") || "nenhuma citada"}</small></article> : null)}
    {campaign.specialistStatus === "pending" ? <p>Aguardando a fila e a disponibilidade dos modelos para iniciar a revisão.</p> : null}
    {campaign.specialistStatus === "running" || campaign.specialistStatus === "queued" ? <p>Revisão em andamento. As etapas aparecem no registro acima.</p> : null}
    {campaign.specialistStatus === "failed" ? <p>Revisão por IA não concluída ({campaign.specialistErrorCode ?? "falha técnica"}). Os resultados das sondas continuam disponíveis.</p> : null}
  </section>;
}

export default function SecurityDeliveryPanel({ scopeId, scopeDomain, disabled, campaigns, campaignEvents, techniqueCatalog, integrations, onAction }: {
  scopeId: string; scopeDomain: string; disabled: boolean; campaigns: SecurityCampaign[]; campaignEvents: SecurityCampaignEvent[];
  techniqueCatalog: Record<SecurityTechniqueId, Technique>; integrations: { isolatedRunner: boolean; repositoryConnector: boolean };
  onAction: (action: string, payload: Record<string, unknown>) => Promise<unknown>;
}) {
  const [campaignError, setCampaignError] = useState("");
  const [environment, setEnvironment] = useState("production");
  const [defaultWindow, setDefaultWindow] = useState({ start: "", end: "" });
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => { const timer = window.setInterval(() => setClock(Date.now()), 30_000); return () => window.clearInterval(timer); }, []);
  const scopedCampaigns = campaigns.filter((item) => item.scopeId === scopeId);
  const guidedActive = scopedCampaigns.some((item) => item.guided && ["approved", "queued", "running"].includes(item.status));

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

  return <section className="security-delivery">
    <div className="security-delivery-title"><div><span>VALIDAÇÃO AUTORIZADA</span><h3>Testes controlados e execução</h3></div><div className="security-integration-state"><b className={integrations.isolatedRunner ? "ready" : "blocked"}>Runner {integrations.isolatedRunner ? "conectado" : "bloqueado"}</b></div></div>
    <p>Valide controles com sondas seguras, sem payload de exploração. Defina o escopo, aprove a campanha e inicie na janela autorizada; cada execução permanece limitada e auditável.</p>
    <div className="security-guided-validation"><div><span>INÍCIO RÁPIDO</span><h3>Validação web guiada</h3><p>Até 20 requisições, no máximo 10 por minuto. GET/HEAD/OPTIONS, sem credenciais, exploração ou escrita. Agendamento em cerca de 6 a 66 minutos.</p></div><button disabled={disabled || guidedActive || !integrations.isolatedRunner} onClick={() => { if (window.confirm(`Confirmo que administro ${scopeDomain} ou tenho autorização expressa para validação web limitada neste domínio. Agendar até 20 requisições (máximo 10/min), sem credenciais, exploração ou escrita?`)) void onAction("start_guided_campaign", { scopeId, executionConfirmed: true }); }}>{guidedActive ? "Validação agendada ou em andamento" : integrations.isolatedRunner ? "Agendar validação web" : "Runner indisponível"}</button></div>
    <details onToggle={(event) => { if (!event.currentTarget.open || defaultWindow.start) return; const local = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16); setDefaultWindow({ start: local(new Date(Date.now() + 15 * 60_000)), end: local(new Date(Date.now() + 75 * 60_000)) }); }}><summary>Personalizar validação controlada · avançado</summary>
      <p>Preset conservador: ambiente de produção, até 20 requisições e interrupção automática diante de erros. Revise a janela e aprove a campanha antes de iniciar. A avaliação automática principal não exige este formulário.</p>
      <form onSubmit={createCampaign}><fieldset disabled={disabled}>
        <div className="security-delivery-grid"><label>Nome<input name="name" minLength={4} maxLength={80} required defaultValue="Validação web controlada" /></label><label>Ambiente<select name="environment" value={environment} onChange={(event) => setEnvironment(event.target.value)}><option value="production">Produção</option><option value="staging">Homologação</option><option value="lab">Laboratório</option></select></label><label>Início<input name="windowStart" type="datetime-local" required defaultValue={defaultWindow.start} key={`start-${defaultWindow.start}`} /></label><label>Fim<input name="windowEnd" type="datetime-local" required defaultValue={defaultWindow.end} key={`end-${defaultWindow.end}`} /></label><label>Máx. req./minuto<input name="maxRequestsPerMinute" type="number" min="1" max={environment === "production" ? 30 : 60} defaultValue="10" required /></label><label>Máx. total<input name="maxTotalRequests" type="number" min="1" max={SECURITY_ACTIVE_RUNNER_MAX_TOTAL_REQUESTS} defaultValue="20" required /><small>Runner ativo: teto rígido de {SECURITY_ACTIVE_RUNNER_MAX_TOTAL_REQUESTS} requisições.</small></label><label>Parar com taxa 5xx (%)<input name="errorRatePercent" type="number" min="1" max="20" defaultValue="10" required /></label><label>Parar após 5xx consecutivos<input name="consecutiveServerErrors" type="number" min="1" max="20" defaultValue="3" required /></label></div>
        <div className="security-techniques"><b>Técnicas permitidas nesta campanha — use somente técnicas do mesmo executor</b>{Object.entries(techniqueCatalog).map(([id, technique]) => <label key={id}><input type="checkbox" name="techniques" value={id} defaultChecked={["safe_web_crawl", "tls_configuration_review", "web_control_probe"].includes(id)} /><span><b>{technique.label}</b><small>{technique.execution.replaceAll("_", " ")} · {technique.risk.replaceAll("_", " ")}{technique.requiresTestCredentials ? " · exige conta de teste" : ""}</small></span></label>)}</div>
        <label className="security-operations-consent"><input type="checkbox" name="authorizationConfirmed" required />Confirmo novamente a autorização, a janela, os limites e que existe responsável disponível para interromper a campanha.</label>
        {campaignError ? <p role="alert">{campaignError}</p> : null}<button type="submit">Criar rascunho de campanha</button>
      </fieldset></form>
    </details>
    {scopedCampaigns.length ? <div className="security-campaign-list">{scopedCampaigns.map((campaign) => { const withinWindow = clock >= Date.parse(campaign.windowStart) && clock <= Date.parse(campaign.windowEnd); const passiveReady = campaign.status === "approved" && campaign.techniques.length === 1 && campaign.techniques[0] === "passive_external_posture" && withinWindow; const runnerReady = !campaign.guided && campaign.status === "approved" && campaign.readiness?.ready === true && campaign.techniques.every((id) => techniqueCatalog[id]?.execution === "isolated_runner" && !techniqueCatalog[id]?.requiresTestCredentials) && withinWindow; const result = campaign.runnerResult && Object.keys(campaign.runnerResult).length ? campaign.runnerResult : null; return <article key={campaign.id}><header><div><b>{campaign.name}</b><small>{campaign.environment} · {new Date(campaign.windowStart).toLocaleString("pt-BR")} — {new Date(campaign.windowEnd).toLocaleTimeString("pt-BR")}</small></div><span>{campaign.guided && campaign.autoDispatch && campaign.status === "approved" ? "Agendada" : campaignStatusLabels[campaign.status] ?? campaign.status}</span></header><p>{campaign.techniques.map((id) => techniqueCatalog[id]?.label ?? id).join(" · ")}</p>{campaign.readiness?.blockers?.length ? <p className="security-delivery-blocked">Não executável: {campaign.readiness.blockers.map((item) => blockerLabels[item] ?? item).join("; ")}.</p> : <p className="security-delivery-ready">Política sem bloqueios de integração conhecidos.</p>}{campaign.agentJobId || campaign.runnerJobId ? <p>Execução vinculada: {campaign.agentJobId ?? campaign.runnerJobId} · {campaign.executor ?? "existing_passive"}</p> : null}{campaign.runnerErrorCode ? <p className="security-delivery-blocked">{campaign.runnerJobId ? "Execução interrompida" : "Validação não iniciada"}: {runnerErrorLabels[campaign.runnerErrorCode] ?? campaign.runnerErrorCode}</p> : null}<CampaignTimeline events={campaignEvents.filter((event) => event.campaignId === campaign.id).reverse()} />{result ? <RunnerResultCard result={result} maxTotalRequests={campaign.maxTotalRequests} /> : null}<SpecialistResultCard campaign={campaign} /><footer>{campaign.status === "draft" ? <button onClick={() => { if (window.confirm("Aprovar esta campanha com a janela, técnicas, limites e condições de parada exibidos? A aprovação não inicia execução.")) void onAction("approve_campaign", { scopeId, campaignId: campaign.id, approvalConfirmed: true }); }}>Aprovar configuração</button> : null}{passiveReady ? <button onClick={() => { if (window.confirm("Iniciar agora o diagnóstico passivo dentro da janela aprovada?")) void onAction("dispatch_campaign", { scopeId, campaignId: campaign.id, executionConfirmed: true }); }}>Iniciar diagnóstico passivo</button> : null}{runnerReady ? <button onClick={() => { if (window.confirm("Enviar esta campanha limitada ao runner isolado? Os limites e o kill switch definidos no manifesto permanecem obrigatórios.")) void onAction("dispatch_campaign", { scopeId, campaignId: campaign.id, executionConfirmed: true }); }}>Iniciar validação isolada</button> : null}{["draft", "approved"].includes(campaign.status) ? <button className="secondary" onClick={() => void onAction("cancel_campaign", { scopeId, campaignId: campaign.id })}>Cancelar</button> : null}</footer></article>; })}</div> : null}
  </section>;
}

"use client";

import { type FormEvent, useMemo, useState } from "react";

export type DefenseConnector = { id: string; scopeId: string; provider: string; mode: string; enforcement: string; status: string; zoneId: string | null; capabilities: { zoneRead?: boolean; rulesetsRead?: boolean; analyticsRead?: boolean; rulesetsEdit?: boolean; automaticChanges?: boolean } | null; lastHealthAt: string | null; lastErrorCode: string | null; lastSignalAt: string | null; syncCursorAt: string | null; lastSyncAt: string | null; nextSyncAt: string | null; eventsIngestedTotal: number; writeCredentialConfigured?: boolean; writeCapabilities?: Record<string, unknown> | null; writeLastHealthAt?: string | null; writeLastErrorCode?: string | null; createdAt: string; updatedAt: string };
export type DefenseIncident = { id: string; scopeId: string; category: string; severity: string; status: string; title: string; summary: string; occurrenceCount: number; autoContained: boolean; firstObservedAt: string; lastObservedAt: string; updatedAt: string };
export type DefenseAction = { id: string; scopeId: string; incidentId: string; actionType: string; autonomy: string; status: string; reason: string; enforcement: string; expiresAt: string | null; createdAt: string; updatedAt: string };
export type DefensePostureCheck = { code: string; title: string; status: "pass" | "warning" | "fail"; severity: string; evidence: string; recommendation: string };
export type DefensePosture = { id: string; scopeId: string; connectorId: string; score: number; grade: string; checks: DefensePostureCheck[] | null; configSummary: Record<string, number | boolean> | null; fingerprint: string; observedAt: string };
export type DefenseProposal = { id: string; scopeId: string; connectorId: string; category: string; status: string; risk: string; title: string; rationale: string; preview: Record<string, unknown> | null; rollback: Record<string, unknown> | null; baseFingerprint?: string | null; approvalExpiresAt?: string | null; externalRulesetId?: string | null; externalRuleId?: string | null; applyErrorCode?: string | null; createdAt: string; updatedAt: string };

type ConnectorSecret = { id: string; ingestSecret: string; signatureHeader: string; timestampHeader: string; enforcement: string };

const statusLabels: Record<string, string> = { active: "ativo", paused: "pausado", pending: "aguardando revisão", expired: "expirado", revoked: "revogado", open: "aberto", investigating: "investigando", contained: "contido", resolved: "resolvido" };

export default function SecurityDefensePanel({ scopeId, disabled, cloudflareCredentialVault, connectors, incidents, actions, postures, proposals, onAction }: {
  scopeId: string;
  disabled: boolean;
  cloudflareCredentialVault: boolean;
  connectors: DefenseConnector[];
  incidents: DefenseIncident[];
  actions: DefenseAction[];
  postures: DefensePosture[];
  proposals: DefenseProposal[];
  onAction: (action: string, payload: Record<string, unknown>) => Promise<Record<string, unknown> | undefined>;
}) {
  const [secret, setSecret] = useState<ConnectorSecret | null>(null);
  const scopedConnectors = useMemo(() => connectors.filter((item) => item.scopeId === scopeId), [connectors, scopeId]);
  const scopedIncidents = useMemo(() => incidents.filter((item) => item.scopeId === scopeId), [incidents, scopeId]);
  const scopedActions = useMemo(() => actions.filter((item) => item.scopeId === scopeId), [actions, scopeId]);
  const connector = scopedConnectors.find((item) => item.provider === "signed_webhook");
  const cloudflare = scopedConnectors.find((item) => item.provider === "cloudflare");
  const posture = postures.find((item) => item.scopeId === scopeId && item.connectorId === cloudflare?.id);
  const scopedProposals = proposals.filter((item) => item.scopeId === scopeId && item.connectorId === cloudflare?.id && !["cancelled", "rolled_back"].includes(item.status));

  async function provision() {
    if (!window.confirm(connector ? "Rotacionar a credencial atual? O coletor deixará de aceitar a credencial anterior imediatamente." : "Criar um canal assinado para receber sinais deste ativo?")) return;
    const result = await onAction("create_defense_connector", { scopeId });
    const created = result?.connector as ConnectorSecret | undefined;
    if (created?.ingestSecret) setSecret(created);
  }

  async function connectCloudflare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    if (values.get("authorization") !== "on") return;
    const result = await onAction("connect_cloudflare", { scopeId, apiToken: values.get("apiToken") });
    if (result) form.reset();
  }

  async function disconnectCloudflare() {
    if (!cloudflare || !window.confirm("Desconectar esta zona? A credencial criptografada será apagada imediatamente e nenhuma alteração será feita na Cloudflare.")) return;
    await onAction("disconnect_cloudflare", { scopeId, connectorId: cloudflare.id });
  }

  async function connectCloudflareWrite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cloudflare) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    if (values.get("writeAuthorization") !== "on") return;
    const result = await onAction("connect_cloudflare_write", { scopeId, connectorId: cloudflare.id, apiToken: values.get("writeApiToken") });
    if (result) form.reset();
  }

  async function configureProposal(event: FormEvent<HTMLFormElement>, proposal: DefenseProposal) {
    event.preventDefault();
    if (!cloudflare) return;
    const values = new FormData(event.currentTarget);
    await onAction("configure_cloudflare_proposal", { scopeId, connectorId: cloudflare.id, proposalId: proposal.id, route: values.get("route"), requestsPerMinute: Number(values.get("requestsPerMinute")) });
  }

  return <section className="security-defense">
    <div className="security-defense-title">
      <div><span>DEFESA CONTÍNUA</span><h3>Detecção e resposta 24 horas</h3></div>
      <div className="security-integration-state">
        <b className={cloudflare?.status === "active" ? "ready" : "blocked"}>{cloudflare ? `Cloudflare ${statusLabels[cloudflare.status] ?? cloudflare.status}` : "Cloudflare desconectada"}</b>
        <b className={connector?.status === "active" ? "ready" : "blocked"}>{connector ? "telemetria assinada" : "sem telemetria"}</b>
      </div>
    </div>
    <p>Conecte a zona autorizada em modo somente leitura. Uma credencial de escrita separada pode ser adicionada apenas para mudanças controladas: prévia determinística, aprovação humana com validade curta, detecção de drift, verificação pós-aplicação e rollback da regra exata criada.</p>
    <div className="security-cloudflare-connector">
      <header><div><span>CLOUDFLARE · CONECTOR NATIVO</span><b>{cloudflare ? "Zona vinculada ao escopo" : "Conectar a infraestrutura do cliente"}</b></div><em className={cloudflare?.status === "active" ? "ready" : "blocked"}>{cloudflare ? statusLabels[cloudflare.status] ?? cloudflare.status : "não conectado"}</em></header>
      {cloudflare ? <>
        <dl>
          <div><dt>Zona</dt><dd>{cloudflare.zoneId ?? "não informada"}</dd></div>
          <div><dt>Último teste</dt><dd>{cloudflare.lastHealthAt ? new Date(cloudflare.lastHealthAt).toLocaleString("pt-BR") : "pendente"}</dd></div>
          <div><dt>Eventos de segurança</dt><dd>{cloudflare.capabilities?.analyticsRead ? "leitura confirmada" : "permissão ausente"}</dd></div>
          <div><dt>Eventos coletados</dt><dd>{cloudflare.eventsIngestedTotal ?? 0}</dd></div>
          <div><dt>Última coleta</dt><dd>{cloudflare.lastSyncAt ? new Date(cloudflare.lastSyncAt).toLocaleString("pt-BR") : "pendente"}</dd></div>
          <div><dt>Próxima coleta</dt><dd>{cloudflare.nextSyncAt ? new Date(cloudflare.nextSyncAt).toLocaleString("pt-BR") : "aguardando"}</dd></div>
          <div><dt>Rulesets</dt><dd>{cloudflare.capabilities?.rulesetsRead ? "leitura confirmada" : "permissão opcional ausente"}</dd></div>
          <div><dt>Escrita controlada</dt><dd>{cloudflare.writeCredentialConfigured ? "credencial separada conectada" : "desativada"}</dd></div>
        </dl>
        {cloudflare.lastErrorCode ? <p className="security-connector-error">Conexão requer atenção: {cloudflare.lastErrorCode}</p> : null}
        <div className="security-defense-actions"><button disabled={disabled || cloudflare.status !== "active"} onClick={() => void onAction("sync_cloudflare", { scopeId, connectorId: cloudflare.id })}>Coletar eventos agora</button><button disabled={disabled || cloudflare.status !== "active"} onClick={() => void onAction("audit_cloudflare", { scopeId, connectorId: cloudflare.id })}>Auditar postura</button><button className="secondary" disabled={disabled} onClick={() => void onAction("check_cloudflare", { scopeId, connectorId: cloudflare.id })}>Testar conexão</button><button className="secondary" disabled={disabled} onClick={() => void disconnectCloudflare()}>Desconectar</button></div>
        <details className="security-write-control"><summary>Credencial de escrita controlada <b>{cloudflare.writeCredentialConfigured ? "conectada" : "desativada"}</b></summary>
          {cloudflare.writeCredentialConfigured ? <div><p>Esta credencial só pode criar uma regra de rate limiting com Managed Challenge em rota exata e remover a mesma regra no rollback. Ela nunca é usada por decisões automáticas ou pela IA.</p><div className="security-defense-actions"><button className="secondary" disabled={disabled} onClick={() => { if (window.confirm("Apagar somente a credencial de escrita? Regras já aplicadas não serão removidas.")) void onAction("disconnect_cloudflare_write", { scopeId, connectorId: cloudflare.id }); }}>Remover credencial de escrita</button></div></div> : <form onSubmit={(event) => void connectCloudflareWrite(event)}>
            <label>API Token exclusivo de escrita<input name="writeApiToken" type="password" autoComplete="new-password" minLength={20} maxLength={512} required disabled={disabled || !cloudflareCredentialVault} placeholder="Token restrito a esta zona" /></label>
            <small>Crie outro token, limitado somente a esta zona, com Zone: Read, Zone WAF: Read e Zone WAF: Write. A conexão executa apenas leituras; a permissão de escrita só é usada após duas confirmações explícitas.</small>
            <label className="security-cloudflare-consent"><input name="writeAuthorization" type="checkbox" required disabled={disabled || !cloudflareCredentialVault} /> Autorizo o armazenamento cifrado desta credencial separada para mudanças aprovadas.</label>
            <button disabled={disabled || !cloudflareCredentialVault}>Conectar credencial de escrita</button>
          </form>}
        </details>
        {posture ? <div className="security-posture-control-plane">
          <header><div><span>EDGE POSTURE · SOMENTE LEITURA</span><b>Configuração Cloudflare observada</b><small>{new Date(posture.observedAt).toLocaleString("pt-BR")} · evidência {posture.fingerprint.slice(0, 12)}</small></div><strong className={`grade-${posture.grade}`}>{posture.score}<small>/100</small></strong></header>
          <div className="security-posture-checks">{(posture.checks ?? []).map((check) => <article key={check.code} className={check.status}><span>{check.status === "pass" ? "OK" : check.status === "warning" ? "ATENÇÃO" : "LACUNA"}</span><b>{check.title}</b><p>{check.evidence}</p><small>{check.recommendation}</small></article>)}</div>
          {scopedProposals.length ? <details><summary>Propostas controladas <b>{scopedProposals.length}</b></summary><div className="security-defense-list">{scopedProposals.map((proposal) => {
            const configured = proposal.preview?.operation === "create_rate_limit_managed_challenge" && proposal.preview?.externalMutation === true;
            const rollbackAvailable = Boolean(proposal.externalRulesetId && proposal.externalRuleId && ["applied", "failed"].includes(proposal.status));
            return <article key={proposal.id}><header><span className={`finding-severity ${proposal.risk}`}>{proposal.risk}</span><div><b>{proposal.title}</b><small>{proposal.category.replaceAll("_", " ")} · {proposal.status.replaceAll("_", " ")}</small></div></header><p>{proposal.rationale}</p>
              {proposal.category === "rate_limit" && proposal.status === "draft" && !configured ? <form className="security-change-form" onSubmit={(event) => void configureProposal(event, proposal)}><label>Rota exata<input name="route" defaultValue="/api/auth/login" pattern="/[A-Za-z0-9/_{}.-]+" required /></label><label>Requisições por minuto<input name="requestsPerMinute" type="number" min="20" max="10000" defaultValue="60" required /></label><button disabled={disabled || !cloudflare.writeCredentialConfigured}>Gerar prévia exata</button></form> : null}
              {configured ? <div className="security-change-preview"><b>Diff proposto</b><dl><div><dt>Rota</dt><dd>{String(proposal.preview?.route)}</dd></div><div><dt>Limite</dt><dd>{String(proposal.preview?.requestsPerMinute)} req/min por IP</dd></div><div><dt>Ação</dt><dd>Managed Challenge, somente acima do limite</dd></div><div><dt>Escopo</dt><dd>caminho exato · sem curingas</dd></div></dl></div> : null}
              {configured && proposal.status === "draft" ? <button disabled={disabled} onClick={() => { if (window.confirm("Aprovar este diff exato por 30 minutos? Isto ainda não altera a Cloudflare.")) void onAction("approve_cloudflare_proposal", { scopeId, connectorId: cloudflare.id, proposalId: proposal.id, approvalConfirmed: true }); }}>Aprovar prévia por 30 minutos</button> : null}
              {proposal.status === "approved" ? <button disabled={disabled} onClick={() => { if (window.confirm("Aplicar agora esta regra exata na Cloudflare? A configuração será relida antes e qualquer drift cancelará a execução.")) void onAction("apply_cloudflare_proposal", { scopeId, connectorId: cloudflare.id, proposalId: proposal.id, executionConfirmed: true }); }}>Aplicar regra aprovada</button> : null}
              {rollbackAvailable ? <button className="secondary" disabled={disabled} onClick={() => { if (window.confirm("Remover exclusivamente a regra criada por esta proposta?")) void onAction("rollback_cloudflare_proposal", { scopeId, connectorId: cloudflare.id, proposalId: proposal.id, rollbackConfirmed: true }); }}>Rollback da regra criada</button> : null}
              {proposal.applyErrorCode ? <p className="security-connector-error">Aplicação requer atenção: {proposal.applyErrorCode}</p> : null}
              <footer><small>{proposal.status === "applied" ? "Aplicada e verificada na Cloudflare; rollback disponível." : proposal.status === "approved" ? `Aprovação válida até ${proposal.approvalExpiresAt ? new Date(proposal.approvalExpiresAt).toLocaleString("pt-BR") : "prazo informado"}.` : configured ? "Prévia pronta; nenhuma mudança externa executada." : "Recomendação somente informativa."}</small></footer>
            </article>;
          })}</div></details> : null}
        </div> : <p className="security-defense-meta">Execute a auditoria para criar o primeiro snapshot versionado da configuração e as propostas controladas.</p>}
      </> : <form onSubmit={(event) => void connectCloudflare(event)}>
        <label>API Token da zona<input name="apiToken" type="password" autoComplete="new-password" minLength={20} maxLength={512} required disabled={disabled || !cloudflareCredentialVault} placeholder="Cole o token restrito à zona autorizada" /></label>
        <small>Crie um token dedicado com Account Analytics: Read, Zone: Read e Zone WAF: Read, limitado somente a este domínio. O token será criptografado no servidor e nunca será devolvido pela API.</small>
        <label className="security-cloudflare-consent"><input name="authorization" type="checkbox" required disabled={disabled || !cloudflareCredentialVault} /> Confirmo que o token pertence ao ativo autorizado e foi criado com privilégio mínimo.</label>
        {!cloudflareCredentialVault ? <p className="security-connector-error">O cofre de credenciais precisa ser configurado no Worker antes da conexão.</p> : null}
        <button disabled={disabled || !cloudflareCredentialVault}>Validar e conectar</button>
      </form>}
    </div>
    <p>O canal abaixo recebe sinais assinados de WAF, autenticação, SIEM ou EDR. Apenas bloqueios temporários de origem, com alta confiança, podem ser automáticos no próprio CBSHub; persistência, evasão, exfiltração e atividade destrutiva exigem investigação humana.</p>
    <div className="security-defense-actions">
      <button disabled={disabled} onClick={() => void provision()}>{connector ? "Rotacionar credencial" : "Ativar canal de telemetria"}</button>
      {connector ? <button className="secondary" disabled={disabled} onClick={() => void onAction("set_defense_connector", { scopeId, connectorId: connector.id, enabled: connector.status !== "active" })}>{connector.status === "active" ? "Pausar ingestão" : "Retomar ingestão"}</button> : null}
    </div>
    {connector ? <p className="security-defense-meta">Último sinal: {connector.lastSignalAt ? new Date(connector.lastSignalAt).toLocaleString("pt-BR") : "ainda não recebido"} · modo {connector.mode === "protect" ? "proteção" : "observação"}</p> : null}
    {secret ? <div className="security-defense-secret" role="status">
      <b>Credencial exibida agora</b>
      <p>Copie e armazene em um cofre. Ela não será devolvida nas próximas consultas.</p>
      <dl><div><dt>Endpoint</dt><dd>/api/security/telemetry</dd></div><div><dt>Conector</dt><dd>{secret.id}</dd></div><div><dt>Segredo HMAC</dt><dd>{secret.ingestSecret}</dd></div><div><dt>Assinatura</dt><dd>{secret.signatureHeader}</dd></div><div><dt>Horário</dt><dd>{secret.timestampHeader}</dd></div></dl>
      <button className="secondary" onClick={() => setSecret(null)}>Já armazenei</button>
    </div> : null}
    <details>
      <summary>Incidentes recentes <b>{scopedIncidents.filter((item) => !["resolved"].includes(item.status)).length}</b></summary>
      {!scopedIncidents.length ? <p>Nenhum incidente recebido por este canal.</p> : <div className="security-defense-list">{scopedIncidents.slice(0, 12).map((incident) => <article key={incident.id}>
        <header><span className={`finding-severity ${incident.severity}`}>{incident.severity}</span><div><b>{incident.title}</b><small>{incident.category} · {incident.occurrenceCount} evento(s)</small></div><em>{statusLabels[incident.status] ?? incident.status}</em></header>
        <p>{incident.summary}</p>
        <footer><small>Último sinal: {new Date(incident.lastObservedAt).toLocaleString("pt-BR")}{incident.autoContained ? " · contenção automática temporária" : ""}</small>{incident.status !== "resolved" ? <select aria-label={`Atualizar ${incident.title}`} value={incident.status} disabled={disabled} onChange={(event) => void onAction("update_defense_incident", { scopeId, incidentId: incident.id, status: event.target.value })}><option value="open">Aberto</option><option value="investigating">Investigando</option><option value="contained">Contido</option><option value="resolved">Resolvido</option></select> : null}</footer>
      </article>)}</div>}
    </details>
    <details>
      <summary>Respostas e decisões <b>{scopedActions.filter((item) => ["active", "pending"].includes(item.status)).length}</b></summary>
      {!scopedActions.length ? <p>Nenhuma resposta registrada.</p> : <div className="security-defense-list">{scopedActions.slice(0, 12).map((action) => <article key={action.id}>
        <header><span className={`security-response-state ${action.status}`}>{statusLabels[action.status] ?? action.status}</span><div><b>{action.actionType.replaceAll("_", " ")}</b><small>{action.autonomy.replaceAll("_", " ")} · {action.enforcement.replaceAll("_", " ")}</small></div></header>
        <p>{action.reason}</p>
        <footer><small>{action.expiresAt ? `Expira em ${new Date(action.expiresAt).toLocaleString("pt-BR")}` : "Sem alteração automática aplicada"}</small>{action.status === "active" ? <button className="secondary" disabled={disabled} onClick={() => void onAction("revoke_defense_action", { scopeId, actionId: action.id })}>Revogar agora</button> : null}</footer>
      </article>)}</div>}
    </details>
  </section>;
}

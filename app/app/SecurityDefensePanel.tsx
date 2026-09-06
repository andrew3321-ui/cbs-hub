"use client";

import { useMemo, useState } from "react";

export type DefenseConnector = { id: string; scopeId: string; provider: string; mode: string; enforcement: string; status: string; lastSignalAt: string | null; createdAt: string; updatedAt: string };
export type DefenseIncident = { id: string; scopeId: string; category: string; severity: string; status: string; title: string; summary: string; occurrenceCount: number; autoContained: boolean; firstObservedAt: string; lastObservedAt: string; updatedAt: string };
export type DefenseAction = { id: string; scopeId: string; incidentId: string; actionType: string; autonomy: string; status: string; reason: string; enforcement: string; expiresAt: string | null; createdAt: string; updatedAt: string };

type ConnectorSecret = { id: string; ingestSecret: string; signatureHeader: string; timestampHeader: string; enforcement: string };

const statusLabels: Record<string, string> = { active: "ativo", paused: "pausado", pending: "aguardando revisão", expired: "expirado", revoked: "revogado", open: "aberto", investigating: "investigando", contained: "contido", resolved: "resolvido" };

export default function SecurityDefensePanel({ scopeId, disabled, connectors, incidents, actions, onAction }: {
  scopeId: string;
  disabled: boolean;
  connectors: DefenseConnector[];
  incidents: DefenseIncident[];
  actions: DefenseAction[];
  onAction: (action: string, payload: Record<string, unknown>) => Promise<Record<string, unknown> | undefined>;
}) {
  const [secret, setSecret] = useState<ConnectorSecret | null>(null);
  const scopedConnectors = useMemo(() => connectors.filter((item) => item.scopeId === scopeId), [connectors, scopeId]);
  const scopedIncidents = useMemo(() => incidents.filter((item) => item.scopeId === scopeId), [incidents, scopeId]);
  const scopedActions = useMemo(() => actions.filter((item) => item.scopeId === scopeId), [actions, scopeId]);
  const connector = scopedConnectors[0];

  async function provision() {
    if (!window.confirm(connector ? "Rotacionar a credencial atual? O coletor deixará de aceitar a credencial anterior imediatamente." : "Criar um canal assinado para receber sinais deste ativo?")) return;
    const result = await onAction("create_defense_connector", { scopeId });
    const created = result?.connector as ConnectorSecret | undefined;
    if (created?.ingestSecret) setSecret(created);
  }

  return <section className="security-defense">
    <div className="security-defense-title">
      <div><span>DEFESA CONTÍNUA</span><h3>Detecção e resposta 24 horas</h3></div>
      <div className="security-integration-state">
        <b className={connector?.status === "active" ? "ready" : "blocked"}>{connector ? statusLabels[connector.status] ?? connector.status : "sem telemetria"}</b>
        <b className={connector?.enforcement === "cbshub_edge" ? "ready" : "blocked"}>{connector?.enforcement === "cbshub_edge" ? "bloqueio no edge CBSHub" : "somente observação"}</b>
      </div>
    </div>
    <p>Recebe sinais assinados de WAF, autenticação, SIEM ou EDR. Apenas bloqueios temporários de origem, com alta confiança, podem ser automáticos; persistência, evasão, exfiltração e atividade destrutiva sempre exigem investigação humana.</p>
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

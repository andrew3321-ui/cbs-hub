"use client";

import { useState, type FormEvent } from "react";

import type { SecurityKnowledgeEntry } from "../../domain/security-knowledge";

export type SecurityFinding = { id: string; scopeId: string; evidenceCode: string; title: string; severity: string; status: string; assignedUserId: number | null; dueAt: string | null; resolutionSummary: string; occurrenceCount: number; firstObservedAt: string; lastObservedAt: string; closedAt: string | null; knowledge?: SecurityKnowledgeEntry | null };
export type SecurityMember = { id: number; role: string; label: string };

const statusLabels: Record<string, string> = { open: "Aberto", investigating: "Em investigação", mitigated: "Mitigado", accepted_risk: "Risco aceito", false_positive: "Falso positivo" };
const closed = new Set(["mitigated", "accepted_risk", "false_positive"]);

export default function SecurityFindingsBoard({ scopeId, findings, members, disabled, onUpdate }: { scopeId: string; findings: SecurityFinding[]; members: SecurityMember[]; disabled: boolean; onUpdate: (action: string, payload: Record<string, unknown>) => Promise<void> }) {
  const [editing, setEditing] = useState("");
  const scoped = findings.filter((finding) => finding.scopeId === scopeId);
  async function submit(event: FormEvent<HTMLFormElement>, finding: SecurityFinding) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await onUpdate("update_finding", { scopeId, findingId: finding.id, status: form.get("status"), assignedUserId: form.get("assignedUserId") || null, dueAt: form.get("dueAt") || null, resolutionSummary: form.get("resolutionSummary") });
    setEditing("");
  }
  return <div className="security-findings">
    <div className="security-findings-title"><span>GESTÃO DE ACHADOS</span><b>{scoped.filter((finding) => !closed.has(finding.status)).length} pendente(s)</b></div>
    {!scoped.length ? <p>Nenhum achado operacional foi criado. Eles aparecem após um diagnóstico ou uma triagem com sinais de atenção.</p> : scoped.map((finding) => <article key={finding.id}>
      <header><span className={`finding-severity ${finding.severity}`}>{finding.severity}</span><div><h4>{finding.title}</h4><small>{finding.evidenceCode} · observado {finding.occurrenceCount} vez(es) · último em {new Date(finding.lastObservedAt).toLocaleString("pt-BR")}</small></div><b>{statusLabels[finding.status] ?? finding.status}</b></header>
      {finding.knowledge ? <details className="finding-knowledge"><summary>Base de validação e limites</summary><p>{finding.knowledge.interpretation}</p><p><b>Limite:</b> {finding.knowledge.boundary}</p><p><b>Método:</b> {finding.knowledge.validationMethod.replaceAll("_", " ")}</p><p>{finding.knowledge.references.map((reference, index) => <span key={`${reference.framework}-${reference.id}`}>{index ? " · " : ""}<a href={reference.url} target="_blank" rel="noreferrer">{reference.framework} {reference.id}</a></span>)}</p></details> : null}
      {editing !== finding.id ? <div className="security-finding-actions"><span>{finding.assignedUserId ? `Responsável: ${members.find((member) => member.id === finding.assignedUserId)?.label ?? finding.assignedUserId}` : "Sem responsável"}{finding.dueAt ? ` · prazo ${new Date(finding.dueAt).toLocaleDateString("pt-BR")}` : ""}</span><button disabled={disabled} onClick={() => setEditing(finding.id)}>Atualizar</button></div> : <form onSubmit={(event) => void submit(event, finding)}>
        <label>Status<select name="status" defaultValue={finding.status}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Responsável<select name="assignedUserId" defaultValue={finding.assignedUserId ?? ""}><option value="">Sem responsável</option>{members.map((member) => <option key={member.id} value={member.id}>{member.label}</option>)}</select></label>
        <label>Prazo<input name="dueAt" type="date" defaultValue={finding.dueAt?.slice(0, 10) ?? ""} /></label>
        <label className="finding-resolution">Validação ou decisão<textarea name="resolutionSummary" maxLength={500} defaultValue={finding.resolutionSummary} placeholder="Obrigatório ao mitigar, aceitar o risco ou marcar falso positivo. Não inclua senhas ou tokens." /></label>
        <div><button type="submit" disabled={disabled}>Salvar</button><button type="button" onClick={() => setEditing("")}>Cancelar</button></div>
      </form>}
    </article>)}
  </div>;
}

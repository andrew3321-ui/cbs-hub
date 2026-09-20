"use client";

import { useEffect, useState, type FormEvent } from "react";

type Finding = { id: string; scopeId: string; title: string; evidenceCode: string; status: string };
type Proposal = { id: string; scopeId: string; findingId: string; repository: string; baseBranch: string; status: string; externalPrUrl: string | null };
type AgentData = { canManage: boolean; findings: Finding[]; remediations: Proposal[] };

async function fetchAgentData() {
  const response = await fetch("/api/security-agent", { cache: "no-store" });
  const result = await response.json() as AgentData & { error?: string };
  if (!response.ok) throw new Error(result.error || "Não foi possível carregar os achados dos ativos.");
  return result;
}

export default function SecurityProjectRemediationPanel({ repository, baseBranch, authorized }: { repository: string; baseBranch: string; authorized: boolean }) {
  const [data, setData] = useState<AgentData | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setData(await fetchAgentData());
  }

  useEffect(() => {
    let active = true;
    void fetchAgentData().then((result) => { if (active) setData(result); }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Falha ao carregar achados."); });
    return () => { active = false; };
  }, []);

  async function act(action: string, payload: Record<string, unknown>) {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/security-agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...payload }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "A proposta não foi atualizada.");
      setMessage(action === "create_remediation" ? "Proposta registrada. Nenhuma branch ou PR foi criado." : "Decisão registrada. Nenhuma mudança foi publicada no repositório.");
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao atualizar proposta."); }
    finally { setBusy(false); }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const finding = data?.findings.find((item) => item.id === form.get("findingId"));
    if (!finding) { setError("Selecione um achado válido."); return; }
    void act("create_remediation", { scopeId: finding.scopeId, target: { findingId: finding.id, provider: "github", repository, baseBranch, approvalConfirmed: form.get("repositoryAuthorization") === "on" } });
  }

  const findings = data?.findings.filter((finding) => ["open", "investigating"].includes(finding.status)) ?? [];
  const proposals = data?.remediations.filter((proposal) => proposal.repository.toLowerCase() === repository.toLowerCase()) ?? [];
  return <section className="security-delivery repository-remediation" aria-label="Propostas para o projeto">
    <div className="security-delivery-title"><div><span>ACHADOS DO ATIVO → PROJETO</span><h3>Preparar correção revisável</h3></div></div>
    <p>Associe um achado de domínio a este projeto conectado. Esta etapa cria apenas uma proposta auditável; não edita código, não abre branch nem PR. Para dependências suportadas, use “Preparar correção” no achado do código acima.</p>
    {error ? <p role="alert">{error}</p> : null}{message ? <p role="status">{message}</p> : null}
    <form onSubmit={submit}><fieldset disabled={busy || !data?.canManage || !authorized || !findings.length}><div className="security-delivery-grid"><label>Achado do ativo<select name="findingId" required><option value="">Selecione</option>{findings.map((finding) => <option value={finding.id} key={finding.id}>{finding.title} · {finding.evidenceCode}</option>)}</select></label><label>Repositório<input value={repository} readOnly aria-label="Repositório GitHub selecionado" /></label><label>Branch base<input value={baseBranch} readOnly aria-label="Branch base do projeto" /></label></div><label className="security-operations-consent"><input type="checkbox" name="repositoryAuthorization" required />Confirmo que este projeto implementa o ativo do achado e que qualquer mudança deverá passar por PR revisável.</label><button type="submit">Criar proposta</button>{!authorized ? <p>Autorize a análise deste projeto antes de vinculá-lo a um achado.</p> : !findings.length ? <p>Não há achados de domínio abertos ou em investigação.</p> : null}</fieldset></form>
    {proposals.length ? <div className="security-campaign-list">{proposals.map((proposal) => <article key={proposal.id}><header><div><b>{proposal.repository}</b><small>{proposal.baseBranch} · achado {proposal.findingId}</small></div><span>{proposal.status === "approved" ? "Aprovada" : proposal.status === "rejected" ? "Rejeitada" : "Rascunho"}</span></header><p>Proposta vinculada ao projeto. Nenhuma alteração externa foi executada por esta proposta.</p><footer>{proposal.status === "draft" ? <><button disabled={busy || !data?.canManage} onClick={() => { if (window.confirm("Aprovar esta proposta? Isso ainda não cria branch nem PR.")) void act("decide_remediation", { scopeId: proposal.scopeId, remediationId: proposal.id, decision: "approve", approvalConfirmed: true }); }}>Aprovar proposta</button><button className="secondary" disabled={busy || !data?.canManage} onClick={() => void act("decide_remediation", { scopeId: proposal.scopeId, remediationId: proposal.id, decision: "reject", approvalConfirmed: false })}>Rejeitar</button></> : null}{proposal.externalPrUrl ? <a href={proposal.externalPrUrl} target="_blank" rel="noreferrer">Abrir pull request</a> : null}</footer></article>)}</div> : null}
  </section>;
}

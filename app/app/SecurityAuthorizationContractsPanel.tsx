"use client";

import { useState, type FormEvent } from "react";
import SecurityAuthorizationCodeMapPanel from "./SecurityAuthorizationCodeMapPanel";

export type AuthorizationContract = { id: string; scopeId: string; title: string; path: string; reviewMode: "vertical" | "horizontal";
  specVersion: string; specSha256: string; baselineReviewId: string; createdAt: string };
type Baseline = { id: string; scopeId: string; path: string; reviewMode: string; status: string; verdict: string | null; markerObserved: { anonymous: boolean | null; privileged: boolean | null } };
type Proof = { runs: { reviewId: string; createdAt: string; outcome: string }[] };
const outcomes: Record<string, string> = { respected: "Regra respeitada nesta amostra", violated: "Regra violada pelo marcador de teste", inconclusive: "Inconclusivo — não significa protegido" };

export default function SecurityAuthorizationContractsPanel({ contracts, reviews, canManage, busy, onCreated, onUse }: {
  contracts: AuthorizationContract[]; reviews: Baseline[]; canManage: boolean; busy: boolean;
  onCreated(contract: AuthorizationContract): void; onUse(contract: AuthorizationContract): void;
}) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [proofs, setProofs] = useState<Record<string, Proof>>({});
  const [loadingProof, setLoadingProof] = useState<string | null>(null);
  const eligible = reviews.filter((review) => review.status === "completed" && review.markerObserved.privileged === true
    && review.markerObserved.anonymous === false && ["verified_test_marker_exposure", "access_restricted"].includes(review.verdict ?? ""));

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/security/auth-contracts", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: String(data.get("title") ?? "").trim(), baselineReviewId: data.get("baselineReviewId"), confirmed: data.get("confirmed") === "on" }) });
      const result = await response.json() as { contract?: AuthorizationContract; error?: string };
      if (!response.ok || !result.contract) throw new Error(result.error || "Contrato não salvo.");
      onCreated(result.contract); form.reset(); setMessage("Regra salva. Para repetir, selecione Usar contrato e informe novos tokens e o mesmo marcador.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Contrato não salvo."); }
    finally { setSaving(false); }
  }

  async function history(contractId: string) {
    setLoadingProof(contractId); setMessage("");
    try {
      const response = await fetch(`/api/security/auth-contracts?contractId=${encodeURIComponent(contractId)}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Histórico indisponível.");
      const proof = await response.json() as Proof;
      setProofs((current) => ({ ...current, [contractId]: proof }));
    } catch { setMessage("Não foi possível carregar as evidências do contrato."); }
    finally { setLoadingProof(null); }
  }

  return <section className="security-authorization-contracts" aria-labelledby="authorization-contracts-heading">
    <header><span>REGRESSÃO DE SEGURANÇA / V1</span><h4 id="authorization-contracts-heading">Transforme uma análise em uma regra repetível</h4>
      <p>A mesma rota, comparação e marcador sintético ficam vinculados a uma especificação imutável. Anônimo e outra conta devem ser bloqueados; a conta dona precisa acessar o marcador como controle positivo.</p></header>
    {message ? <p role="status">{message}</p> : null}
    {canManage && eligible.length ? <form onSubmit={(event) => void save(event)} className="security-contract-create">
      <label>Análise de referência<select name="baselineReviewId" required>{eligible.map((review) => <option key={review.id} value={review.id}>{review.reviewMode === "horizontal" ? "Isolamento entre identidades" : "Separação de papéis"} · {review.path} · {review.id.slice(-8)}</option>)}</select></label>
      <label>Nome da regra<input name="title" placeholder="Isolamento do relatório de teste" required minLength={3} maxLength={80} /><small>Não inclua nomes pessoais, tokens ou dados de clientes.</small></label>
      <label className="security-contract-confirm"><input name="confirmed" type="checkbox" required />Confirmo que o recurso é sintético e deve ser restrito à conta dona ou ao papel privilegiado.</label>
      <button disabled={saving || busy} type="submit">{saving ? "Salvando…" : "Salvar contrato"}</button>
    </form> : <p className="security-contract-empty">{canManage ? "Execute uma comparação com marcador sintético e controle positivo para salvar sua primeira regra." : "Um administrador pode salvar novas regras de acesso."}</p>}
    <div className="security-contract-list">{contracts.map((contract) => <article key={contract.id}>
      <div className="security-contract-heading"><strong>{contract.title}</strong><span>GET · {contract.reviewMode === "horizontal" ? "Horizontal" : "Vertical"}</span></div>
      <p>{contract.path}</p><small>Especificação v1 · SHA-256 {contract.specSha256.slice(0, 16)}…</small>
      <div className="security-contract-actions"><button type="button" disabled={!canManage || busy || saving} onClick={() => onUse(contract)}>Usar contrato</button>
        <button type="button" disabled={loadingProof !== null} onClick={() => void history(contract.id)}>{loadingProof === contract.id ? "Carregando…" : "Ver histórico"}</button>
        <a href={`/api/security/auth-contracts?contractId=${encodeURIComponent(contract.id)}&download=1`}>Exportar evidências</a></div>
      {proofs[contract.id] ? <ol className="security-contract-history">{proofs[contract.id].runs.length ? proofs[contract.id].runs.map((run) => <li key={run.reviewId}><time dateTime={run.createdAt}>{new Date(run.createdAt).toLocaleString("pt-BR")}</time><span>{outcomes[run.outcome] ?? outcomes.inconclusive}</span></li>) : <li>Ainda não há execuções vinculadas. A análise de referência não é contada como nova execução.</li>}</ol> : null}
      <SecurityAuthorizationCodeMapPanel contractId={contract.id} canManage={canManage} busy={busy || saving} />
    </article>)}</div>
    <small className="security-contract-limit">Execução sob demanda com autorização vigente e credenciais novas. O mapa de código vincula uma implementação ao commit do scan, não à versão implantada. Não fecha achados automaticamente.</small>
  </section>;
}

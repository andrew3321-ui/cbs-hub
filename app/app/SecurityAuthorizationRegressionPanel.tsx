"use client";
import { useEffect, useState, type FormEvent } from "react";
type Candidate = { codeMapId: string; title: string; path: string; baseSha: string; sourceFile: string };
type Draft = { id: string; codeMapId: string; baseSha: string; bundleSha256: string; scanState: string; createdAt: string };
type Catalog = { candidates: Candidate[]; drafts: Draft[] };
type Bundle = { files: { path: string; content: string }[] };
const endpoint = "/api/security/auth-contracts/regression";
async function fetchCatalog(repositoryId: string) {
  const response = await fetch(`${endpoint}?repositoryId=${encodeURIComponent(repositoryId)}`, { cache: "no-store" });
  const data = await response.json() as Catalog & { error?: string };
  if (!response.ok) throw new Error(data.error || "Rascunhos indisponíveis.");
  return data;
}
export default function SecurityAuthorizationRegressionPanel({ repositoryId, canManage, disabled }: { repositoryId: string; canManage: boolean; disabled: boolean }) {
  const [catalog, setCatalog] = useState<Catalog | null>(null), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const [preview, setPreview] = useState<{ draftId: string; bundle: Bundle } | null>(null);
  useEffect(() => {
    let active = true;
    void fetchCatalog(repositoryId).then(data => { if (active) setCatalog(data); }).catch(error => { if (active) setMessage(error instanceof Error ? error.message : "Rascunhos indisponíveis."); });
    return () => { active = false; };
  }, [repositoryId]);
  async function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget, data = new FormData(form);
    setBusy(true); setMessage("");
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ codeMapId: data.get("codeMapId"), reviewConfirmed: data.get("confirmed") === "on" }) });
      const result = await response.json() as { draft?: Draft; error?: string };
      if (!response.ok || !result.draft) throw new Error(result.error || "Rascunho não preparado.");
      setCatalog(await fetchCatalog(repositoryId)); form.reset();
      setMessage("Receita de teste preparada. O adaptador ainda precisa de integração e revisão; nenhum teste do projeto ou PR foi executado.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Rascunho não preparado."); }
    finally { setBusy(false); }
  }
  async function inspect(id: string) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`${endpoint}?draftId=${encodeURIComponent(id)}`, { cache: "no-store" });
      const result = await response.json() as Bundle & { error?: string };
      if (!response.ok) throw new Error(result.error || "Prévia indisponível.");
      setPreview({ draftId: id, bundle: result });
    } catch (error) { setMessage(error instanceof Error ? error.message : "Prévia indisponível."); }
    finally { setBusy(false); }
  }
  return <section className="repository-regression">
    <header><span>DA REGRA AO CI</span><h3>Testes de regressão de autorização</h3><p>Prepare uma receita de teste ligada ao commit mapeado. O adaptador deve chamar a lógica real da aplicação em uma fixture isolada — não simular uma proteção que o projeto não tem.</p></header>
    {message ? <p role="status">{message}</p> : null}
    {catalog && canManage && catalog.candidates.length ? <form onSubmit={(event) => void prepare(event)}>
      <label>Regra mapeada<select name="codeMapId" required>{catalog.candidates.map(candidate => <option key={candidate.codeMapId} value={candidate.codeMapId}>{candidate.title} · {candidate.path} · {candidate.baseSha.slice(0, 8)}</option>)}</select></label>
      <label className="security-contract-confirm"><input type="checkbox" name="confirmed" required />Vou revisar e integrar o adaptador a uma fixture sintética isolada, sem produção ou credenciais reais.</label>
      <button type="submit" disabled={busy || disabled}>Preparar receita de teste</button>
    </form> : <p>{catalog?.candidates.length ? "Um administrador pode preparar novas receitas." : "Salve uma regra na validação autenticada, relacione-a ao código e mantenha o scan atualizado para preparar um teste."}</p>}
    <div className="repository-regression-list">{catalog?.drafts.map(draft => <article key={draft.id}>
      <div className="security-contract-heading"><strong>Commit {draft.baseSha.slice(0, 12)}</strong><span>Adaptador obrigatório · teste não executado</span></div>
      {draft.scanState === "newer_scan_available" ? <p className="security-code-map-warning">Existe um scan mais novo. Este rascunho é histórico; não comprova o código atual.</p> : draft.scanState === "scan_unavailable" ? <p>Sem scan atual disponível.</p> : null}
      <small>Pacote SHA-256: {draft.bundleSha256}</small>
      <div className="security-contract-actions"><button type="button" disabled={busy} onClick={() => void inspect(draft.id)}>Revisar arquivos</button><a href={`${endpoint}?draftId=${encodeURIComponent(draft.id)}&download=zip`}>Baixar pacote ZIP</a></div>
      {preview?.draftId === draft.id ? <div className="repository-regression-preview">{preview.bundle.files.map(file => <details key={file.path}><summary>{file.path}</summary><pre><code>{file.content}</code></pre></details>)}</div> : null}
    </article>)}</div>
    <small>O teste falha enquanto o adaptador não for implementado. Não há alteração automática de arquivos, workflows, branch ou PR. Sem chamadas adicionais de IA, sem prova de deploy e sem fechamento automático de achados.</small>
  </section>;
}

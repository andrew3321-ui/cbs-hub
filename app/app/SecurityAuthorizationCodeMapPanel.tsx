"use client";

import { useState, type FormEvent } from "react";

type Candidate = { repositoryId: string; repositoryName: string; sourceJobId: string; sourceFile: string; commitSha: string };
type Mapping = { id: string; status: string; commitSha: string; sourceFile: string; scanState?: string; evidenceSha256: string | null;
  result: null | { repositoryName: string; files: { path: string; role: string; references: { category: string; line: number }[] }[];
    coverage: { sourceFilesRead: number; unresolvedImports: number; skippedByBudget: number } }; errorCode: string | null };
type Catalog = { candidates: Candidate[]; mappings: Mapping[] };
const categories: Record<string, string> = { authentication: "Autenticação", authorization: "Permissões", tenant_or_owner: "Conta / proprietário" };
function codeLink(repository: string, commit: string, path: string, line?: number) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository) || repository.includes("..") || !/^[a-f0-9]{40}$/.test(commit)) return undefined;
  return `https://github.com/${repository}/blob/${commit}/${path.split("/").map(encodeURIComponent).join("/")}${line ? `#L${line}` : ""}`;
}

export default function SecurityAuthorizationCodeMapPanel({ contractId, canManage, busy }: { contractId: string; canManage: boolean; busy: boolean }) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  async function load() {
    const response = await fetch(`/api/security/auth-contracts/code-map?contractId=${encodeURIComponent(contractId)}`, { cache: "no-store" });
    const data = await response.json() as Catalog & { error?: string };
    if (!response.ok) throw new Error(data.error || "Mapas indisponíveis.");
    setCatalog(data);
  }
  async function open() {
    setLoading(true); setMessage("");
    try { await load(); } catch (error) { setMessage(error instanceof Error ? error.message : "Mapas indisponíveis."); }
    finally { setLoading(false); }
  }
  async function map(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget, data = new FormData(form);
    const candidate = catalog?.candidates[Number(data.get("candidate"))];
    if (!candidate) return;
    setLoading(true); setMessage("");
    try {
      const response = await fetch("/api/security/auth-contracts/code-map", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        contractId, repositoryId: candidate.repositoryId, sourceJobId: candidate.sourceJobId, sourceFile: candidate.sourceFile, relationshipConfirmed: data.get("confirmed") === "on",
      }) });
      const result = await response.json() as { mapping?: Mapping; error?: string };
      if (!response.ok || !result.mapping) throw new Error(result.error || "Mapeamento indisponível.");
      form.reset(); await load();
      setMessage(result.mapping.status === "pending" ? "Mapeamento em processamento. Atualize em instantes para consultar o resultado." : "Commit mapeado. Revise as referências abaixo antes de propor uma correção.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Mapeamento indisponível."); }
    finally { setLoading(false); }
  }
  return <div className="security-code-map">
    <div className="security-contract-actions"><button type="button" disabled={loading || busy} onClick={() => void open()}>{loading ? "Consultando…" : catalog ? "Atualizar mapa de código" : "Relacionar ao código"}</button></div>
    {message ? <p role="status">{message}</p> : null}
    {catalog ? <>
      <p>Leia a implementação no commit do último scan. Até 4 arquivos, somente imports diretos e nenhuma chamada adicional de IA.</p>
      {canManage && catalog.candidates.length ? <form className="security-code-map-form" onSubmit={(event) => void map(event)}>
        <label>Rota candidata<select name="candidate" required>{catalog.candidates.map((candidate, index) => <option key={`${candidate.sourceJobId}:${candidate.sourceFile}`} value={index}>{candidate.repositoryName} · {candidate.sourceFile} · {candidate.commitSha.slice(0, 8)}</option>)}</select></label>
        <label className="security-contract-confirm"><input type="checkbox" name="confirmed" required />Confirmo que este repositório implementa a rota no domínio autorizado. Isso não comprova a versão implantada.</label>
        <button disabled={loading || busy} type="submit">Mapear commit autorizado</button>
      </form> : <p>{catalog.candidates.length ? "Um administrador pode vincular a implementação." : "Nenhuma implementação GET compatível no último scan dos repositórios autorizados. Conecte e analise o projeto em Projetos."}</p>}
      <div className="security-code-map-results">{catalog.mappings.map((mapping) => <section key={mapping.id}>
        <div className="security-contract-heading"><strong>Commit {mapping.commitSha.slice(0, 12)}</strong><span>{mapping.status === "completed" ? "Mapeado" : mapping.status === "pending" ? "Em processamento" : "Não concluído"}</span></div>
        {mapping.scanState === "newer_scan_available" ? <p className="security-code-map-warning">Há um scan mais novo. Este mapa permanece ligado ao commit anterior.</p> : mapping.scanState === "authorization_or_scan_unavailable" ? <p>Autorização ou scan atual indisponível. Exibindo somente o registro histórico.</p> : null}
        {mapping.result ? <><ul>{mapping.result.files.map((file) => <li key={file.path}>
          <a href={codeLink(mapping.result!.repositoryName, mapping.commitSha, file.path)} target="_blank" rel="noopener noreferrer">{file.path}</a><small>{file.role === "route" ? "Rota de entrada" : "Import direto"}</small>
          <div className="security-code-map-references">{file.references.length ? file.references.map((reference) => <a key={`${reference.category}:${reference.line}`} href={codeLink(mapping.result!.repositoryName, mapping.commitSha, file.path, reference.line)} target="_blank" rel="noopener noreferrer">{categories[reference.category] ?? "Referência"} · L{reference.line}</a>) : <span>Nenhuma referência lexical reconhecida. Isso não comprova ausência de controle.</span>}</div>
        </li>)}</ul><small>{mapping.result.coverage.sourceFilesRead} arquivos lidos · {mapping.result.coverage.unresolvedImports} imports não resolvidos · {mapping.result.coverage.skippedByBudget} fora do orçamento.<br />Evidência SHA-256: {mapping.evidenceSha256}</small></> : mapping.errorCode ? <p>Leitura interrompida: {mapping.errorCode}. Nenhum mapa completo foi produzido.</p> : null}
      </section>)}</div>
      <small>Inventário lexical, não análise semântica: referências não provam controle de acesso. Não lê dependências transitivas, não cria commits e não confirma o deploy. Código-fonte não é armazenado nem enviado à IA.</small>
    </> : null}
  </div>;
}

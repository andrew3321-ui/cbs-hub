"use client";

import { FormEvent, useEffect, useState } from "react";
import SecurityAuthorizationContractsPanel, { type AuthorizationContract } from "./SecurityAuthorizationContractsPanel";

type Scope = { id: string; domain: string; status: "pending" | "verified"; authorizationCurrent: boolean };
type Fragment = { summary: string; evidenceCodes: string[]; uncertainties: string[]; nextStep: string };
type Candidate = { path: string; repositoryId: string; repositoryName: string; sourceFile: string; priority: string };
type Review = { id: string; scopeId: string; path: string; reviewMode: "vertical" | "horizontal"; contractId: string | null; contractOutcome: string | null; status: string; statuses: { anonymous: number | null; limited: number | null; privileged: number | null }; markerObserved: { anonymous: boolean | null; limited: boolean | null; privileged: boolean | null }; verdict: string | null; retestOfId: string | null; retestOutcome: string | null; analysisStatus: string; analysis: { access?: Fragment; review?: Fragment } | null; analysisErrorCode: string | null; createdAt: string };

const verdictLabels: Record<string, string> = {
  verified_test_marker_exposure: "Marcador de teste observado pela conta limitada — acesso a confirmar e corrigir",
  potential_access_gap: "Possível diferença de acesso — revisão humana necessária",
  access_restricted: "Restrição observada para a conta limitada",
  public_or_inconclusive: "Caminho público ou resultado inconclusivo",
  inconclusive: "Inconclusivo",
};

export default function SecurityAuthenticatedReviewPanel({ scopes, canManage, runnerConnected, aiConfigured }: { scopes: Scope[]; canManage: boolean; runnerConnected: boolean; aiConfigured: boolean }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [contracts, setContracts] = useState<AuthorizationContract[]>([]);
  const [contractChoice, setContractChoice] = useState<Record<string, string>>({});
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [candidateSource, setCandidateSource] = useState<Record<string, string>>({});
  const [retestChoice, setRetestChoice] = useState<Record<string, string>>({});
  const [reviewModes, setReviewModes] = useState<Record<string, "vertical" | "horizontal">>({});
  const [paths, setPaths] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let mounted = true;
    const refresh = () => { void fetch("/api/security/auth-review", { cache: "no-store" }).then((response) => response.ok ? response.json() : null).then((result: { reviews?: Review[]; candidates?: Candidate[] } | null) => { if (mounted && result?.reviews) setReviews(result.reviews); if (mounted && result?.candidates) setCandidates(result.candidates); }).catch(() => undefined); };
    void fetch("/api/security/auth-contracts", { cache: "no-store" }).then((response) => response.ok ? response.json() : null).then((result: { contracts?: AuthorizationContract[] } | null) => { if (mounted && result?.contracts) setContracts(result.contracts); }).catch(() => undefined);
    refresh();
    const timer = window.setInterval(refresh, 15_000);
    return () => { mounted = false; window.clearInterval(timer); };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>, scope: Scope) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const path = String(data.get("path") ?? "").trim();
    const retestOfId = retestChoice[scope.id] || null;
    const contract = contracts.find((item) => item.id === contractChoice[scope.id]);
    const reviewMode = contract?.reviewMode ?? (retestOfId ? reviews.find((review) => review.id === retestOfId)?.reviewMode ?? "vertical" : reviewModes[scope.id] ?? "vertical");
    const repoNotice = candidateSource[scope.id] ? ` Confirma também que o repositório ${candidateSource[scope.id]} corresponde ao serviço publicado em ${scope.domain}.` : "";
    if (!window.confirm(`Confirma que ${scope.domain}${path} é um caminho somente de leitura, que as duas credenciais são de contas de teste autorizadas para comparação ${reviewMode === "horizontal" ? "entre identidades do mesmo papel" : "entre papéis"}, que o marcador (se informado) é sintético e que aceita três requisições GET limitadas${retestOfId ? " para retestar a exposição anterior" : ""}?${repoNotice}`)) return;
    setBusy(scope.id); setMessage("");
    try {
      const response = await fetch("/api/security/auth-review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scopeId: scope.id, path, reviewMode, limitedToken: String(data.get("limitedToken") ?? ""), privilegedToken: String(data.get("privilegedToken") ?? ""), marker: String(data.get("marker") ?? "").trim(), ...(retestOfId ? { retestOfId } : {}), ...(contract ? { contractId: contract.id } : {}), executionConfirmed: true }) });
      const result = await response.json() as { error?: string; verdict?: string };
      if (!response.ok) throw new Error(result.error || "Validação não concluída.");
      setMessage(verdictLabels[result.verdict ?? ""] ?? "Validação concluída. Revise os códigos HTTP abaixo.");
      const refreshed = await fetch("/api/security/auth-review", { cache: "no-store" });
      if (refreshed.ok) setReviews(((await refreshed.json()) as { reviews: Review[] }).reviews);
      setRetestChoice((current) => ({ ...current, [scope.id]: "" }));
      setCandidateSource((current) => ({ ...current, [scope.id]: "" }));
      setPaths((current) => ({ ...current, [scope.id]: "" }));
    } catch (error) { setMessage(error instanceof Error ? error.message : "Validação não concluída."); }
    finally { form.reset(); setBusy(null); }
  }

  const completedVertical = reviews.filter((review) => review.status === "completed" && review.reviewMode === "vertical").length;
  const completedHorizontal = reviews.filter((review) => review.status === "completed" && review.reviewMode === "horizontal").length;
  return <section className="security-auth-review" aria-labelledby="security-auth-review-heading">
    <header><span>VALIDAÇÃO AUTENTICADA / ACESSO</span><h3 id="security-auth-review-heading">Verifique acesso entre papéis e identidades</h3><p>Escolha um recurso de teste exclusivo de um papel privilegiado (vertical) ou de uma das duas contas com o mesmo papel (horizontal). O runner fará três leituras no mesmo domínio: anônima, outra conta e conta dona do recurso. São guardados apenas códigos HTTP e a presença de um marcador sintético — nunca tokens ou corpos das respostas.</p></header>
    <div className="security-auth-review-notice" role="note">Cobertura registrada neste workspace: {completedVertical} comparação(ões) verticais e {completedHorizontal} horizontais concluídas. Sessão, injeção, upload, lógica de negócio e outras rotas não são testadas por este fluxo; resultado sem achado não equivale a ausência de vulnerabilidades.</div>
    <div className="security-auth-review-notice">Use somente tokens temporários de contas criadas para teste. Para uma evidência mais forte, crie um recurso de teste restrito contendo um marcador CBSTEST- exclusivo e informe-o abaixo. Não use senha real, cookie de sessão ou dados de clientes.</div>
    {!aiConfigured ? <div className="security-auth-review-notice">A coleta limitada continua disponível, mas a análise pelos especialistas depende da chave da API configurada no Worker.</div> : null}
    {message ? <p role="status" className="security-auth-review-message">{message}</p> : null}
    <SecurityAuthorizationContractsPanel contracts={contracts} reviews={reviews} canManage={canManage} busy={busy !== null}
      onCreated={(contract) => setContracts((current) => [contract, ...current.filter((item) => item.id !== contract.id)])}
      onUse={(contract) => { const scope = scopes.find((item) => item.id === contract.scopeId && item.status === "verified" && item.authorizationCurrent); if (!scope) { setMessage("Renove a autorização do domínio antes de repetir o contrato."); return; } setContractChoice((current) => ({ ...current, [scope.id]: contract.id })); setRetestChoice((current) => ({ ...current, [scope.id]: "" })); setCandidateSource((current) => ({ ...current, [scope.id]: "" })); document.getElementById(`auth-scope-${scope.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }); }} />
    {scopes.filter((scope) => scope.status === "verified" && scope.authorizationCurrent).map((scope) => {
      const contract = contracts.find((item) => item.id === contractChoice[scope.id]);
      const selectedMode = contract?.reviewMode ?? (retestChoice[scope.id] ? reviews.find((review) => review.id === retestChoice[scope.id])?.reviewMode ?? "vertical" : reviewModes[scope.id] ?? "vertical");
      return <div className="security-auth-review-scope" id={`auth-scope-${scope.id}`} key={scope.id}>
      <h4>{scope.domain}</h4>
      <form onSubmit={(event) => void submit(event, scope)} autoComplete="off">
        {contracts.some((item) => item.scopeId === scope.id) ? <label className="security-auth-review-retest-select">Contrato de autorização<select disabled={busy !== null} value={contractChoice[scope.id] ?? ""} onChange={(event) => { setContractChoice((current) => ({ ...current, [scope.id]: event.target.value })); setRetestChoice((current) => ({ ...current, [scope.id]: "" })); setCandidateSource((current) => ({ ...current, [scope.id]: "" })); }}><option value="">Comparação avulsa</option>{contracts.filter((item) => item.scopeId === scope.id).map((item) => <option key={item.id} value={item.id}>{item.title} · {item.path}</option>)}</select></label> : null}
        <label>Tipo de comparação<select value={selectedMode} disabled={Boolean(retestChoice[scope.id] || contract)} onChange={(event) => setReviewModes((current) => ({ ...current, [scope.id]: event.target.value as "vertical" | "horizontal" }))}><option value="vertical">Vertical · papéis diferentes</option><option value="horizontal">Horizontal · mesmo papel</option></select></label>
        {candidates.length && !retestChoice[scope.id] && !contract ? <label>Rota GET sugerida pelo repositório autorizado<select value="" onChange={(event) => { const candidate = candidates.find((item) => `${item.repositoryId}:${item.path}` === event.target.value); if (!candidate) return; setPaths((current) => ({ ...current, [scope.id]: candidate.path })); setCandidateSource((current) => ({ ...current, [scope.id]: candidate.repositoryName })); }}><option value="">Selecionar rota ou digitar abaixo</option>{candidates.map((candidate) => <option key={`${candidate.repositoryId}:${candidate.path}`} value={`${candidate.repositoryId}:${candidate.path}`}>{candidate.repositoryName} · {candidate.path}</option>)}</select><small>O inventário de código não prova que a rota esteja publicada neste domínio nem que seja somente de leitura. Confirme ambos antes da execução.</small></label> : null}
        <label>Caminho protegido, sem parâmetros<input name="path" placeholder="/area-restrita/relatorio" required minLength={2} maxLength={160} readOnly={Boolean(retestChoice[scope.id] || contract)} value={contract?.path ?? (retestChoice[scope.id] ? reviews.find((review) => review.id === retestChoice[scope.id])?.path ?? "" : paths[scope.id] ?? "")} onChange={(event) => { setPaths((current) => ({ ...current, [scope.id]: event.target.value })); setCandidateSource((current) => ({ ...current, [scope.id]: "" })); }} /></label>
        <label>{selectedMode === "horizontal" ? "Token da outra conta de teste" : "Token da conta limitada"}<input name="limitedToken" type="password" autoComplete="off" required minLength={16} maxLength={2048} /></label>
        <label>{selectedMode === "horizontal" ? "Token da conta dona do recurso" : "Token da conta privilegiada"}<input name="privilegedToken" type="password" autoComplete="off" required minLength={16} maxLength={2048} /></label>
        <label>Marcador sintético {retestChoice[scope.id] || contract ? "(o mesmo da referência)" : "(opcional)"}<input name="marker" placeholder="CBSTEST-exemplo123456" autoComplete="off" required={Boolean(retestChoice[scope.id] || contract)} maxLength={80} /></label>
        {!contract && reviews.some((review) => review.scopeId === scope.id && review.verdict === "verified_test_marker_exposure") ? <label className="security-auth-review-retest-select">Retestar exposição anterior<select disabled={busy !== null} value={retestChoice[scope.id] ?? ""} onChange={(event) => setRetestChoice((current) => ({ ...current, [scope.id]: event.target.value }))}><option value="">Nova validação</option>{reviews.filter((review) => review.scopeId === scope.id && review.verdict === "verified_test_marker_exposure").map((review) => <option key={review.id} value={review.id}>{review.path} · {new Date(review.createdAt).toLocaleString("pt-BR")}</option>)}</select></label> : null}
        <button type="submit" disabled={!canManage || !runnerConnected || busy !== null}>{busy === scope.id ? "Verificando…" : contract ? "Verificar regra" : "Comparar acessos"}</button>
      </form>
      {retestChoice[scope.id] ? <small>O reteste exige novos tokens de teste e o mesmo marcador. Só a ausência do marcador para a conta limitada, com acesso privilegiado confirmado, indica que a exposição não foi reproduzida nesta amostra.</small> : null}
      {!runnerConnected ? <small>Runner isolado indisponível. Nenhuma credencial será enviada.</small> : null}
      {reviews.filter((review) => review.scopeId === scope.id).slice(0, 5).map((review) => <article key={review.id}><div><strong>{review.reviewMode === "horizontal" ? "Horizontal" : "Vertical"} · {review.path}</strong><time dateTime={review.createdAt}>{new Date(review.createdAt).toLocaleString("pt-BR")}</time></div><p>{review.status === "completed" ? (verdictLabels[review.verdict ?? ""] ?? "Revisão necessária").replace("conta limitada", review.reviewMode === "horizontal" ? "outra conta de teste" : "conta limitada") : review.status === "failed" ? "Execução falhou; nenhum achado afirmado" : "Execução em andamento"}</p><small>Anônimo: {review.statuses.anonymous ?? "—"} · {review.reviewMode === "horizontal" ? "Outra conta" : "Limitado"}: {review.statuses.limited ?? "—"} · {review.reviewMode === "horizontal" ? "Dono" : "Privilegiado"}: {review.statuses.privileged ?? "—"}{review.markerObserved.privileged !== null ? ` · Marcador: ${review.markerObserved.limited ? "observado por quem não deveria" : "não observado por quem não deveria"}` : ""}</small>
        {review.contractId ? <p className="security-auth-review-retest-result">Contrato {review.contractId.slice(-8)}: {review.contractOutcome === "respected" ? "regra respeitada nesta amostra" : review.contractOutcome === "violated" ? "regra violada pelo marcador sintético" : "inconclusivo — não significa protegido"}</p> : null}
        {review.retestOfId ? <p className="security-auth-review-retest-result">Reteste de {review.retestOfId.slice(-8)}: {review.retestOutcome === "no_longer_observed" ? "exposição não reproduzida nesta amostra" : review.retestOutcome === "still_observed" ? "marcador ainda observado pela conta limitada" : "resultado inconclusivo"}</p> : null}
        {review.status === "completed" ? <div className="security-auth-review-agent-stages"><span>01 · Coleta concluída</span><span>02 · Analista: {review.analysis?.access ? "concluído" : review.analysisStatus === "failed" ? "falhou" : "aguardando"}</span><span>03 · Revisor: {review.analysis?.review ? "concluído" : review.analysisStatus === "failed" ? "não concluído" : review.analysisStatus === "running" && review.analysis?.access ? "em andamento" : "aguardando"}</span><span>04 · Reteste: {review.retestOfId ? "executado" : "sob demanda"}</span></div> : null}
        {review.analysis?.access ? <details className="security-auth-review-agent-result"><summary>Análise do controle de acesso</summary><p>{review.analysis.access.summary}</p><small>Evidências: {review.analysis.access.evidenceCodes.join(", ") || "nenhuma citada"}</small></details> : null}
        {review.analysis?.review ? <details className="security-auth-review-agent-result"><summary>Revisão independente</summary><p>{review.analysis.review.summary}</p><small>Próximo passo: {{ human_review: "revisão humana", fix_access_control: "revisar controle de acesso", retest: "retestar", monitor: "monitorar" }[review.analysis.review.nextStep] ?? "revisão humana"}</small>{review.analysis.review.uncertainties.length ? <small>Limites: {review.analysis.review.uncertainties.join(" · ")}</small> : null}</details> : null}
        {review.analysisStatus === "failed" ? <small>A análise automática falhou ({review.analysisErrorCode ?? "AUTH_AGENT_ANALYSIS_FAILED"}). O resultado do runner permanece disponível para revisão humana.</small> : null}
      </article>)}
    </div>; })}
  </section>;
}

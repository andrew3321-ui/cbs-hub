"use client";

import { useEffect, useMemo, useState } from "react";

type Candidate = {
  question: string;
  facts: Record<string, string>;
  result: {
    status: string;
    topicCode: string;
    completeness: { known: number; required: number; percentage: number };
    clarifications: unknown[];
    sources: unknown[];
  };
};

type HomologationEvent = { id: number; eventType: string; note: string; createdAt: string };
type HomologationCase = {
  id: string;
  title: string;
  question: string;
  topicCode: string;
  status: "draft" | "ready_for_review" | "approved" | "changes_requested" | "rejected";
  assuranceLevel: string;
  createdByUserId: number;
  assignedReviewerUserId: number | null;
  decisionByUserId: number | null;
  createdByName: string;
  assignedReviewerName: string | null;
  decisionByName: string | null;
  professionalRegistration: string | null;
  comparisonOutcome: string | null;
  independentConclusion: string;
  reviewNote: string;
  snapshotHash: string;
  decisionSignature: string | null;
  baseVersion: string;
  dueAt: string | null;
  decidedAt: string | null;
  createdAt: string;
  integrityStatus: "verified" | "blocked";
  validityStatus: "not_applicable" | "current" | "requires_revalidation";
  regressionStatus: "not_applicable" | "passed" | "failed" | "requires_revalidation";
  snapshot: null | {
    engine: { headline: string; summary: string; findings: Array<{ code: string; label: string; value: string }> };
    evidence: { sources: Array<{ code: string; title: string; url: string }> };
  };
  events: HomologationEvent[];
};

type CenterPayload = {
  cases: HomologationCase[];
  eligibleReviewers: Array<{ userId: number; name: string; role: string }>;
  context: { currentUserId: number; currentUserName: string; workspaceType: "individual" | "office"; role: string; canPrepare: boolean; canReview: boolean; currentBaseVersion: string };
  metrics: { total: number; drafts: number; awaitingReview: number; approved: number; current: number; needsRevalidation: number; regressionFailures: number; rejected: number };
};

const statusLabels: Record<HomologationCase["status"], string> = {
  draft: "Validado pelo motor",
  ready_for_review: "Aguardando revisão",
  approved: "Homologado",
  changes_requested: "Ajustes solicitados",
  rejected: "Rejeitado",
};

const dateLabel = (value: string | null) => value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "—";

async function jsonRequest(url: string, body?: Record<string, unknown>) {
  const response = await fetch(url, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : { cache: "no-store" });
  const payload = await response.json() as Record<string, unknown>;
  if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "A operação não pôde ser concluída.");
  return payload;
}

export default function FiscalHomologationCenter({ candidate }: { candidate: Candidate | null }) {
  const [data, setData] = useState<CenterPayload | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reviewerUserId, setReviewerUserId] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [comparisonOutcome, setComparisonOutcome] = useState("matches");
  const [independentConclusion, setIndependentConclusion] = useState("");
  const [note, setNote] = useState("");
  const [registration, setRegistration] = useState("");
  const [sourcesConfirmed, setSourcesConfirmed] = useState(false);
  const [independentlyChecked, setIndependentlyChecked] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  const load = async (preferredId?: string) => {
    const payload = await jsonRequest("/api/fiscal-homologations") as unknown as CenterPayload;
    setData(payload);
    setSelectedId((current) => preferredId && payload.cases.some((item) => item.id === preferredId) ? preferredId : payload.cases.some((item) => item.id === current) ? current : payload.cases[0]?.id ?? "");
  };

  useEffect(() => {
    let cancelled = false;
    fetch("/api/fiscal-homologations", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json() as CenterPayload & { error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Não foi possível carregar os casos.");
        return payload;
      })
      .then((payload) => {
        if (cancelled) return;
        setData(payload);
        setSelectedId(payload.cases[0]?.id ?? "");
      })
      .catch((cause: Error) => { if (!cancelled) setError(cause.message); });
    return () => { cancelled = true; };
  }, []);

  const selected = useMemo(() => data?.cases.find((item) => item.id === selectedId) ?? null, [data, selectedId]);
  const candidateEligible = Boolean(candidate && candidate.result.status === "conditional" && candidate.result.completeness.percentage === 100 && candidate.result.completeness.known === candidate.result.completeness.required && candidate.result.clarifications.length === 0 && candidate.result.sources.length > 0 && candidate.result.topicCode !== "TOPIC-ROUTER");
  const mayReviewSelected = Boolean(selected && data?.context.canReview && selected.status === "ready_for_review" && selected.assignedReviewerUserId === data.context.currentUserId);

  const perform = async (body: Record<string, unknown>, message: string, preferredId?: string) => {
    setBusy(true); setError(""); setSuccess("");
    try {
      const response = await jsonRequest(body.action === "create" ? "/api/fiscal-homologations" : "/api/fiscal-homologations/review", body.action === "create" ? { question: body.question, facts: body.facts } : body);
      const responseCase = response.case as { id?: string } | undefined;
      await load(responseCase?.id ?? preferredId);
      setSuccess(message);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "A operação não pôde ser concluída.");
    } finally {
      setBusy(false);
    }
  };

  const freezeCandidate = () => candidate && void perform({ action: "create", question: candidate.question, facts: candidate.facts }, "Caso congelado. Ele ainda precisa de revisão profissional.");
  const submitReview = () => selected && void perform({ caseId: selected.id, action: "submit", reviewerUserId: Number(reviewerUserId), dueAt }, data?.context.workspaceType === "office" ? "Caso enviado para revisão independente." : "Autorrevisão profissional iniciada.", selected.id);
  const decide = (action: "approve" | "changes_requested" | "reject") => selected && void perform({ caseId: selected.id, action, comparisonOutcome, independentConclusion, note, professionalRegistration: registration, sourcesConfirmed, independentlyChecked, acknowledged }, action === "approve" ? "Caso homologado e assinado." : action === "reject" ? "Caso rejeitado com trilha registrada." : "Ajustes solicitados com trilha registrada.", selected.id);

  return <section className="fiscal-homologation-center" aria-labelledby="homologation-title">
    <div className="homologation-heading">
      <div><span className="eyebrow">VERSÃO 25 · CENTRAL DE HOMOLOGAÇÃO</span><h2 id="homologation-title">Transforme testes reais em referências confiáveis</h2><p>O motor prepara e congela o caso. Um profissional compara a conclusão com sua apuração independente antes de homologar.</p></div>
      <span className="homologation-mode">{data?.context.workspaceType === "office" ? "Escritório · revisão segregada" : "Independente · autorrevisão identificada"}</span>
    </div>

    <div className="homologation-trust-line"><b>Validação do motor ≠ homologação profissional</b><span>Nenhum caso entra na biblioteca aprovada sem CRC, conclusão independente, fontes confirmadas, hash íntegro e assinatura do servidor.</span></div>

    <div className="homologation-metrics">
      <article><span>Casos</span><strong>{data?.metrics.total ?? 0}</strong></article>
      <article><span>Em revisão</span><strong>{data?.metrics.awaitingReview ?? 0}</strong></article>
      <article><span>Homologados</span><strong>{data?.metrics.approved ?? 0}</strong></article>
      <article className="positive"><span>Vigentes</span><strong>{data?.metrics.current ?? 0}</strong></article>
      <article className={data?.metrics.needsRevalidation ? "warning" : ""}><span>Revalidar</span><strong>{data?.metrics.needsRevalidation ?? 0}</strong></article>
    </div>

    <div className={`homologation-candidate ${candidateEligible ? "eligible" : "blocked"}`}>
      <div><small>CONSULTA ATUAL</small><b>{candidate?.question || "Faça uma consulta e preencha todos os fatos para abrir um caso."}</b><span>{candidate ? `${candidate.result.topicCode} · ${candidate.result.completeness.percentage}% dos fatos · ${candidate.result.sources.length} fontes aplicadas` : "O servidor repetirá a análise antes de congelar o snapshot."}</span></div>
      <button type="button" disabled={busy || !candidateEligible || !data?.context.canPrepare} onClick={freezeCandidate}>{busy ? "Processando…" : candidateEligible ? "Congelar caso para homologação" : "Complete a consulta primeiro"}</button>
    </div>

    {error && <div className="homologation-message error" role="alert">{error}</div>}
    {success && <div className="homologation-message success" role="status">{success}</div>}

    <div className="homologation-workspace">
      <aside className="homologation-queue">
        <div><small>BIBLIOTECA VERSIONADA</small><b>{data?.cases.length ?? 0} casos rastreáveis</b></div>
        {data?.cases.length ? data.cases.map((item) => <button type="button" className={selectedId === item.id ? "active" : ""} onClick={() => setSelectedId(item.id)} key={item.id}>
          <span><i className={item.status} />{statusLabels[item.status]}</span><b>{item.title}</b><small>{item.createdByName} · {dateLabel(item.createdAt)}</small>
        </button>) : <p>Nenhum caso congelado ainda.</p>}
      </aside>

      <div className="homologation-detail">
        {!selected ? <div className="homologation-empty"><b>A biblioteca começa com uma consulta completa</b><p>Ela não nasce com “200 casos inventados”: cresce com decisões reais e reproduzíveis dos profissionais que testarem a plataforma.</p></div> : <>
          <div className="homologation-case-head">
            <div><span className={`homologation-status ${selected.status}`}>{statusLabels[selected.status]}</span><h3>{selected.title}</h3><p>{selected.question}</p></div>
            <div><small>SNAPSHOT</small><code>#{selected.snapshotHash.slice(0, 12)}</code><span className={selected.integrityStatus}>{selected.integrityStatus === "verified" ? "Integridade verificada" : "Integridade bloqueada"}</span></div>
          </div>

          <div className="homologation-case-grid">
            <article><span>Preparador</span><b>{selected.createdByName}</b></article>
            <article><span>Revisor</span><b>{selected.assignedReviewerName ?? "Ainda não atribuído"}</b></article>
            <article><span>Base fiscal</span><b>{selected.baseVersion}</b></article>
            <article><span>Validade / regressão</span><b>{selected.regressionStatus === "passed" ? "Vigente · teste passou" : selected.regressionStatus === "failed" ? "Divergência detectada" : selected.validityStatus === "requires_revalidation" ? "Requer revalidação" : "Ainda não aplicável"}</b></article>
          </div>

          {selected.snapshot && <div className="homologation-engine-result"><small>CONCLUSÃO CONGELADA DO MOTOR</small><b>{selected.snapshot.engine.headline}</b><p>{selected.snapshot.engine.summary}</p><span>{selected.snapshot.engine.findings.length} achados · {selected.snapshot.evidence.sources.length} fontes</span></div>}

          {selected.status === "draft" && data?.context.canPrepare && <div className="homologation-action-box">
            <div><small>ETAPA 2 · ATRIBUIR REVISÃO</small><h4>{data.context.workspaceType === "office" ? "Escolha outro profissional" : "Inicie sua autorrevisão identificada"}</h4><p>{data.context.workspaceType === "office" ? "O criador do caso não aparece como opção válida para a decisão." : "O sistema marcará que não houve segregação entre preparador e revisor."}</p></div>
            {data.context.workspaceType === "office" && <div className="homologation-submit-fields"><label>Revisor<select value={reviewerUserId} onChange={(event) => setReviewerUserId(event.target.value)}><option value="">Selecione</option>{data.eligibleReviewers.filter((reviewer) => reviewer.userId !== selected.createdByUserId).map((reviewer) => <option key={reviewer.userId} value={reviewer.userId}>{reviewer.name} · {reviewer.role}</option>)}</select></label><label>Prazo<input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} /></label></div>}
            <button type="button" disabled={busy || (data.context.workspaceType === "office" && (!reviewerUserId || !dueAt))} onClick={submitReview}>{data.context.workspaceType === "office" ? "Enviar para revisão independente" : "Iniciar autorrevisão profissional"}</button>
          </div>}

          {mayReviewSelected && <div className="homologation-review-form">
            <div><small>ETAPA 3 · DECISÃO PROFISSIONAL</small><h4>Compare sem copiar a resposta do motor</h4><p>Refaça o enquadramento e o cálculo por sua metodologia; depois registre abaixo o que encontrou.</p></div>
            <label>Resultado da comparação<select value={comparisonOutcome} onChange={(event) => setComparisonOutcome(event.target.value)}><option value="matches">Coincide integralmente</option><option value="partially_matches">Coincide parcialmente</option><option value="diverges">Diverge</option></select></label>
            <label>Conclusão independente<textarea rows={4} maxLength={2000} value={independentConclusion} onChange={(event) => setIndependentConclusion(event.target.value)} placeholder="Descreva seu enquadramento, premissas e resultado independente…" /></label>
            <label>Justificativa técnica<textarea rows={3} maxLength={1500} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Registre ressalvas, documentos conferidos e motivo da decisão…" /></label>
            <label>CRC do responsável<input maxLength={30} value={registration} onChange={(event) => setRegistration(event.target.value)} placeholder="Ex.: CRC-SP 123456/O-0" /></label>
            <div className="homologation-checks">
              <label><input type="checkbox" checked={sourcesConfirmed} onChange={(event) => setSourcesConfirmed(event.target.checked)} />Conferi as fontes normativas aplicadas.</label>
              <label><input type="checkbox" checked={independentlyChecked} onChange={(event) => setIndependentlyChecked(event.target.checked)} />Refiz o enquadramento/cálculo de forma independente.</label>
              <label><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} />Assumo a responsabilidade por esta decisão profissional.</label>
            </div>
            <div className="homologation-decision-buttons"><button type="button" className="approve" disabled={busy || comparisonOutcome !== "matches" || !sourcesConfirmed || !independentlyChecked || !acknowledged} onClick={() => decide("approve")}>Homologar e assinar</button><button type="button" disabled={busy} onClick={() => decide("changes_requested")}>Solicitar ajustes</button><button type="button" className="reject" disabled={busy} onClick={() => decide("reject")}>Rejeitar</button></div>
          </div>}

          {selected.status === "ready_for_review" && !mayReviewSelected && <div className="homologation-pending"><b>Aguardando {selected.assignedReviewerName ?? "o revisor atribuído"}</b><span>{selected.dueAt ? `Prazo: ${dateLabel(selected.dueAt)}` : "Sem prazo externo no modo independente."}</span></div>}

          {selected.status === "approved" && <div className={`homologation-seal ${selected.validityStatus}`}>
            <span>✓</span><div><small>CASO PROFISSIONALMENTE HOMOLOGADO</small><h4>{selected.decisionByName} · {selected.professionalRegistration}</h4><p>{selected.independentConclusion}</p><code>assinatura #{selected.decisionSignature?.slice(0, 16)} · {dateLabel(selected.decidedAt)}</code></div>
          </div>}

          {["changes_requested", "rejected"].includes(selected.status) && <div className="homologation-outcome"><b>{statusLabels[selected.status]}</b><p>{selected.reviewNote}</p><span>Crie uma nova versão após corrigir a consulta ou as premissas; o histórico anterior permanece imutável.</span></div>}

          <details className="homologation-events"><summary>Trilha de auditoria · {selected.events.length} eventos</summary>{selected.events.map((event) => <article key={event.id}><span>{dateLabel(event.createdAt)}</span><b>{event.eventType.replace("fiscal_homologation.", "")}</b><p>{event.note}</p></article>)}</details>
        </>}
      </div>
    </div>
  </section>;
}

"use client";

import { useEffect, useMemo, useState } from "react";

type CalculationLine = {
  code: string;
  label: string;
  formula: string;
  basis: string;
  amountCents: number | null;
  percentageBps: number | null;
  status: "calculated" | "parameter" | "not_applicable" | "blocked";
};

type DossierSnapshot = {
  generatedAt: string;
  title: string;
  assurance: { factsComplete: boolean; ratesConfirmed: boolean; calculationStatus: string };
  determination: { headline: string; baseCode: string; baseVersion: string };
  calculation: {
    status: "calculated_conditional" | "needs_information" | "not_applicable";
    statusLabel: string;
    calculationType: string;
    parameters: { interstateRateBps: number | null; internalRateBps: number; fcpRateBps: number; mvaOriginalBps: number | null; mvaAppliedBps: number | null; mvaWasAdjusted: boolean };
    totals: { operationCompositionCents: number; ownIcmsReferenceCents: number | null; stBaseCents: number | null; presumedInternalIcmsCents: number | null; icmsStCents: number | null; difalCents: number | null; fcpCents: number | null; destinationTotalCents: number | null };
    lines: CalculationLine[];
    blockers: string[];
    warnings: string[];
    requiredConfirmations: string[];
    disclaimer: string;
  };
};

type DossierEvent = { id: number; eventType: string; note: string; createdAt: string };
type Dossier = {
  id: string;
  title: string;
  status: "draft" | "ready_for_review" | "approved" | "changes_requested" | "rejected";
  inputHash: string;
  createdByUserId: number;
  assignedReviewerUserId: number | null;
  decisionByUserId: number | null;
  createdByName: string;
  assignedReviewerName: string | null;
  decisionByName: string | null;
  professionalRegistration: string | null;
  reviewNote: string;
  dueAt: string | null;
  decidedAt: string | null;
  createdAt: string;
  snapshot: DossierSnapshot | null;
  events: DossierEvent[];
};

type QueueResponse = {
  error?: string;
  dossiers: Dossier[];
  eligibleReviewers: Array<{ userId: number; name: string; role: string }>;
  context: { currentUserId: number; currentUserName: string; workspaceType: "individual" | "office"; role: string; canPrepare: boolean; canReview: boolean };
  metrics: { total: number; awaitingReview: number; approved: number; blocked: number };
};

type CalculationForm = {
  operationPrice: string;
  discountsGranted: string;
  freight: string;
  insurance: string;
  ipi: string;
  otherExpenses: string;
  ownIcmsBase: string;
  internalRate: string;
  fcpRate: string;
  ratesConfirmed: boolean;
};

const initialCalculation: CalculationForm = {
  operationPrice: "1.000,00",
  discountsGranted: "0,00",
  freight: "0,00",
  insurance: "0,00",
  ipi: "0,00",
  otherExpenses: "0,00",
  ownIcmsBase: "1.000,00",
  internalRate: "18,00",
  fcpRate: "0,00",
  ratesConfirmed: false,
};

const statusLabels: Record<Dossier["status"], string> = {
  draft: "Rascunho técnico",
  ready_for_review: "Aguardando homologação",
  approved: "Homologado",
  changes_requested: "Ajustes solicitados",
  rejected: "Rejeitado",
};

function decimalNumber(value: string) {
  const compact = value.trim().replace(/\s/g, "");
  const normalized = compact.includes(",") ? compact.replace(/\./g, "").replace(",", ".") : compact;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error("Informe somente valores numéricos positivos.");
  return parsed;
}

function moneyCents(value: string) {
  return Math.round(decimalNumber(value) * 100);
}

function rateBps(value: string) {
  return Math.round(decimalNumber(value) * 100);
}

function money(value: number | null) {
  return value === null ? "—" : (value / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function percent(value: number | null) {
  return value === null ? "—" : `${(value / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

function timestamp(value: string) {
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function futureDate() {
  const date = new Date(Date.now() + 3 * 86_400_000);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export default function FiscalDossierWorkbench({ question, facts, completeness }: { question: string; facts: Record<string, string>; completeness: number }) {
  const [form, setForm] = useState<CalculationForm>(initialCalculation);
  const [queue, setQueue] = useState<QueueResponse | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [reviewerUserId, setReviewerUserId] = useState("");
  const [dueAt, setDueAt] = useState(futureDate);
  const [registration, setRegistration] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);

  const active = useMemo(() => queue?.dossiers.find((dossier) => dossier.id === activeId) ?? queue?.dossiers[0] ?? null, [activeId, queue]);

  async function refresh(preferredId?: string) {
    setLoading(true);
    try {
      const response = await fetch("/api/fiscal-dossiers", { cache: "no-store" });
      const data = await response.json() as QueueResponse;
      if (!response.ok) throw new Error(data.error ?? "Não foi possível carregar os dossiês.");
      setQueue(data);
      if (preferredId) setActiveId(preferredId);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar os dossiês.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/fiscal-dossiers", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json() as QueueResponse;
        if (!response.ok) throw new Error(data.error ?? "Não foi possível carregar os dossiês.");
        return data;
      })
      .then((data) => { if (!cancelled) setQueue(data); })
      .catch((cause: Error) => { if (!cancelled) setError(cause.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  function update(field: keyof CalculationForm, value: string | boolean) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function createDossier() {
    setSaving(true);
    setError("");
    try {
      if (!form.ratesConfirmed) throw new Error("Confirme as alíquotas e o tratamento do FCP antes de congelar a memória.");
      const calculation = {
        operationPriceCents: moneyCents(form.operationPrice),
        discountsGrantedCents: moneyCents(form.discountsGranted),
        freightCents: moneyCents(form.freight),
        insuranceCents: moneyCents(form.insurance),
        ipiCents: moneyCents(form.ipi),
        otherExpensesCents: moneyCents(form.otherExpenses),
        ownIcmsBaseCents: moneyCents(form.ownIcmsBase),
        internalRateBps: rateBps(form.internalRate),
        fcpRateBps: rateBps(form.fcpRate),
        ratesConfirmed: true,
        priceMethod: "mva",
      };
      const response = await fetch("/api/fiscal-dossiers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question, facts, calculation }) });
      const data = await response.json() as { error?: string; dossier?: Dossier };
      if (!response.ok || !data.dossier) throw new Error(data.error ?? "Não foi possível gerar o dossiê.");
      await refresh(data.dossier.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível gerar o dossiê.");
    } finally {
      setSaving(false);
    }
  }

  async function reviewAction(action: "submit" | "approve" | "changes_requested" | "reject") {
    if (!active) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/fiscal-dossiers/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dossierId: active.id, action, reviewerUserId: reviewerUserId ? Number(reviewerUserId) : undefined, dueAt, professionalRegistration: registration, note: reviewNote, acknowledged }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Não foi possível registrar esta etapa.");
      await refresh(active.id);
      setReviewNote("");
      setAcknowledged(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível registrar esta etapa.");
    } finally {
      setSaving(false);
    }
  }

  const canDecide = Boolean(active && queue?.context.canReview && active.status === "ready_for_review" && active.assignedReviewerUserId === queue.context.currentUserId && (queue.context.workspaceType === "individual" || active.createdByUserId !== queue.context.currentUserId));

  return (
    <section className="panel fiscal-dossier-workbench">
      <div className="dossier-heading">
        <div><span className="eyebrow">VERSÃO 22 · DOSSIÊ FISCAL AUDITÁVEL</span><h3>Do enquadramento à memória de cálculo homologada</h3><p>O servidor recalcula a operação, congela premissas e fontes em um snapshot e gera um hash único antes da revisão profissional.</p></div>
        <span className="dossier-assurance">CÁLCULO CONDICIONAL · NÃO É GUIA DE RECOLHIMENTO</span>
      </div>

      <div className="dossier-metrics">
        <div><small>FATOS CONFIRMADOS</small><strong>{completeness}%</strong></div>
        <div><small>AGUARDANDO REVISÃO</small><strong>{queue?.metrics.awaitingReview ?? "—"}</strong></div>
        <div><small>HOMOLOGADOS</small><strong>{queue?.metrics.approved ?? "—"}</strong></div>
        <div><small>MODELO DE CONTROLE</small><strong>{queue?.context.workspaceType === "office" ? "Dupla revisão" : "Autorrevisão"}</strong></div>
      </div>

      <div className="dossier-create-grid">
        <div className="dossier-inputs">
          <div className="dossier-section-title"><span>01</span><div><b>Composição monetária</b><p>Valores efetivos da operação, em reais.</p></div></div>
          <div className="dossier-field-grid">
            <label>Preço praticado<input inputMode="decimal" value={form.operationPrice} onChange={(event) => update("operationPrice", event.target.value)} /></label>
            <label>Descontos concedidos<input inputMode="decimal" value={form.discountsGranted} onChange={(event) => update("discountsGranted", event.target.value)} /></label>
            <label>Frete cobrado<input inputMode="decimal" value={form.freight} onChange={(event) => update("freight", event.target.value)} /></label>
            <label>Seguro<input inputMode="decimal" value={form.insurance} onChange={(event) => update("insurance", event.target.value)} /></label>
            <label>IPI<input inputMode="decimal" value={form.ipi} onChange={(event) => update("ipi", event.target.value)} /></label>
            <label>Outras despesas<input inputMode="decimal" value={form.otherExpenses} onChange={(event) => update("otherExpenses", event.target.value)} /></label>
          </div>
        </div>
        <div className="dossier-inputs">
          <div className="dossier-section-title"><span>02</span><div><b>Parâmetros confirmados</b><p>Nenhum percentual é presumido silenciosamente.</p></div></div>
          <div className="dossier-field-grid compact">
            <label>Base do ICMS próprio<input inputMode="decimal" value={form.ownIcmsBase} onChange={(event) => update("ownIcmsBase", event.target.value)} /></label>
            <label>Alíquota interna MG (%)<input inputMode="decimal" value={form.internalRate} onChange={(event) => update("internalRate", event.target.value)} /></label>
            <label>FCP confirmado (%)<input inputMode="decimal" value={form.fcpRate} onChange={(event) => update("fcpRate", event.target.value)} /></label>
          </div>
          <label className="dossier-confirm"><input type="checkbox" checked={form.ratesConfirmed} onChange={(event) => update("ratesConfirmed", event.target.checked)} /><span><b>Confirmei a alíquota interna e a incidência ou não de FCP</b><small>Esta marcação fica registrada dentro do snapshot.</small></span></label>
          <button type="button" className="primary-button dossier-create-button" disabled={saving || completeness !== 100 || !form.ratesConfirmed || !queue?.context.canPrepare} onClick={() => void createDossier()}>{saving ? "Executando controles…" : "Calcular e congelar dossiê"}<span>→</span></button>
          {completeness !== 100 && <p className="dossier-block-message">Complete 100% dos fatos da operação para liberar o cálculo.</p>}
        </div>
      </div>

      {error && <div className="dossier-error" role="alert"><b>Controle interrompido</b><span>{error}</span></div>}

      <div className="dossier-output-grid">
        <div className="dossier-memory">
          <div className="dossier-section-title"><span>03</span><div><b>Memória reproduzível</b><p>{active ? `${statusLabels[active.status]} · ${active.inputHash.slice(0, 12)}` : "Gere um dossiê para ver fórmulas, bases e valores."}</p></div></div>
          {loading ? <div className="dossier-loading">Verificando snapshots e fila…</div> : active?.snapshot ? (
            <>
              <div className="dossier-memory-summary">
                <div><small>RESULTADO DESTINO</small><strong>{money(active.snapshot.calculation.totals.destinationTotalCents)}</strong><span>{active.snapshot.calculation.statusLabel}</span></div>
                <div><small>BASE ST / CÁLCULO</small><strong>{money(active.snapshot.calculation.totals.stBaseCents)}</strong><span>MVA aplicada {percent(active.snapshot.calculation.parameters.mvaAppliedBps)}</span></div>
                <div><small>DEDUÇÃO PRÓPRIA</small><strong>{money(active.snapshot.calculation.totals.ownIcmsReferenceCents)}</strong><span>Interestadual {percent(active.snapshot.calculation.parameters.interstateRateBps)}</span></div>
              </div>
              {active.snapshot.calculation.blockers.length > 0 && <div className="dossier-blockers"><b>Cálculo bloqueado</b>{active.snapshot.calculation.blockers.map((blocker) => <span key={blocker}>{blocker}</span>)}</div>}
              <div className="calculation-lines">{active.snapshot.calculation.lines.map((line, index) => <article key={line.code}><span>{String(index + 1).padStart(2, "0")}</span><div><small>{line.code}</small><b>{line.label}</b><p>{line.formula}</p><em>{line.basis}</em></div><strong>{line.amountCents !== null ? money(line.amountCents) : percent(line.percentageBps)}</strong></article>)}</div>
              <div className="dossier-hash"><span>SHA-256</span><code>{active.inputHash}</code><small>Qualquer alteração de premissa gera outro identificador.</small></div>
            </>
          ) : <div className="dossier-empty">Nenhuma memória congelada neste espaço contábil.</div>}
        </div>

        <aside className="dossier-review">
          <div className="dossier-section-title"><span>04</span><div><b>Homologação profissional</b><p>Decisão humana sem reescrever o cálculo.</p></div></div>
          {active ? <>
            <div className={`dossier-status ${active.status}`}><i /><div><small>ESTADO ATUAL</small><b>{statusLabels[active.status]}</b><span>Preparado por {active.createdByName}</span></div></div>
            {active.status === "draft" && queue?.context.workspaceType === "office" && <div className="dossier-review-form"><label>Revisor responsável<select value={reviewerUserId} onChange={(event) => setReviewerUserId(event.target.value)}><option value="">Selecione outro profissional</option>{queue.eligibleReviewers.filter((reviewer) => reviewer.userId !== active.createdByUserId).map((reviewer) => <option key={reviewer.userId} value={reviewer.userId}>{reviewer.name} · {reviewer.role}</option>)}</select></label><label>Prazo<input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} /></label></div>}
            {active.status === "draft" && <button type="button" className="primary-button" disabled={saving || active.snapshot?.calculation.status !== "calculated_conditional" || (queue?.context.workspaceType === "office" && !reviewerUserId)} onClick={() => void reviewAction("submit")}>{queue?.context.workspaceType === "office" ? "Enviar para revisão independente" : "Iniciar autorrevisão profissional"}</button>}
            {active.status === "ready_for_review" && <div className="review-assignment"><small>RESPONSÁVEL PELA DECISÃO</small><b>{active.assignedReviewerName}</b>{active.dueAt && <span>Prazo: {timestamp(active.dueAt)}</span>}</div>}
            {canDecide && <div className="dossier-review-form"><label>Registro profissional<input value={registration} onChange={(event) => setRegistration(event.target.value)} maxLength={40} placeholder="CRC SP-123456/O-7" /></label><label>Conclusão técnica<textarea rows={4} maxLength={1500} value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} placeholder="Registre conferências, ressalvas ou motivo dos ajustes." /></label><label className="dossier-confirm"><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} /><span><b>Revisei fatos, fontes, parâmetros e fórmulas</b><small>Obrigatório somente para homologar.</small></span></label><div className="dossier-decision-buttons"><button type="button" disabled={saving || reviewNote.trim().length < 10 || !registration.trim() || !acknowledged} onClick={() => void reviewAction("approve")}>Homologar</button><button type="button" disabled={saving || reviewNote.trim().length < 10} onClick={() => void reviewAction("changes_requested")}>Pedir ajustes</button><button type="button" disabled={saving || reviewNote.trim().length < 10} onClick={() => void reviewAction("reject")}>Rejeitar</button></div></div>}
            {active.status === "approved" && <div className="dossier-approval-seal"><span>✓</span><div><small>HOMOLOGAÇÃO INTERNA REGISTRADA</small><b>{active.decisionByName} · {active.professionalRegistration}</b><p>{active.reviewNote}</p><em>Registro profissional autodeclarado · {active.decidedAt ? timestamp(active.decidedAt) : ""}</em></div></div>}
            {["changes_requested", "rejected"].includes(active.status) && <div className="dossier-decision-note"><b>{active.decisionByName ?? "Responsável"}</b><p>{active.reviewNote}</p><small>O snapshot permanece intacto. Para corrigir, gere um novo dossiê.</small></div>}
            <div className="dossier-events"><small>TRILHA DE EVENTOS</small>{active.events.slice(0, 5).map((event) => <div key={event.id}><i /><span><b>{event.eventType.replace("fiscal_dossier.", "")}</b><small>{timestamp(event.createdAt)}</small></span></div>)}</div>
          </> : <div className="dossier-empty">A fila aparecerá depois do primeiro snapshot.</div>}
        </aside>
      </div>

      {queue && queue.dossiers.length > 0 && <div className="dossier-queue"><div><small>HISTÓRICO VERSIONADO</small><b>{queue.dossiers.length} dossiê{queue.dossiers.length > 1 ? "s" : ""} recente{queue.dossiers.length > 1 ? "s" : ""}</b></div><div>{queue.dossiers.map((dossier) => <button type="button" className={dossier.id === active?.id ? "active" : ""} onClick={() => setActiveId(dossier.id)} key={dossier.id}><span className={dossier.status}>{statusLabels[dossier.status]}</span><b>{dossier.title}</b><code>#{dossier.inputHash.slice(0, 8)}</code></button>)}</div></div>}
    </section>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReportBlockConfig } from "../../domain/report-builder";
import ReportBuilderPanel from "./ReportBuilderPanel";

type Company = { id: number; name: string };
type PendingItem = { id: string; text: string; resolved: boolean };
type Report = {
  id: string; companyId: number; companyName: string; periodKey: string; createdByUserId: number; creatorName: string;
  assignedName: string | null; reviewerUserId: number | null; reviewerName: string | null; status: string; revision: number;
  executiveSummary: string; conclusion: string; indicators: Record<string, string | number>; pendingItems: PendingItem[];
  templateKey: string; templateVersion: number; blocks: ReportBlockConfig[]; commercialNotes: string; recommendations: string[];
  snapshotHash: string | null; updatedAt: string; linkCount?: number;
};
type Link = { id: string; artifact_type: string; artifact_id: string; artifact_label: string; artifact_hash: string; artifact_version: string | null; artifact_status: string };
type Candidate = { id: string; type: string; label: string; hash: string; version: string | null; status: string };
type Member = { userId: number; name: string; role: string };
type EventRow = { id: number; actorName: string; eventType: string; note: string; createdAt: string };
type Revision = { id: string; revision: number; snapshotHash: string; createdByUserId: number; createdAt: string };

const statusLabels: Record<string, string> = { draft: "Em elaboração", ready_for_review: "Pronto para revisão", changes_requested: "Ajustes solicitados", approved: "Aprovado" };
const artifactLabels: Record<string, string> = { document: "Documento", dossier: "Dossiê", tax_period: "Apuração", rule_set: "Regra", scenario: "Cálculo" };

function currentPeriod() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatPeriod(value: string) {
  const [year, month] = value.split("-");
  return `${month}/${year}`;
}

async function readJson<T>(response: Response) {
  return await response.json() as T & { error?: string; code?: string };
}

export default function ReportCenter({ companies, activeCompanyId, userId, workspaceRole }: { companies: Company[]; activeCompanyId: number | null; userId: number; workspaceRole: "owner" | "admin" | "preparer" | "reviewer" }) {
  const [period, setPeriod] = useState(currentPeriod);
  const [companyId, setCompanyId] = useState(activeCompanyId ?? companies[0]?.id ?? 0);
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [links, setLinks] = useState<Link[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [reviewerId, setReviewerId] = useState(0);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState<"idle" | "dirty" | "saving" | "saved" | "conflict">("idle");
  const [error, setError] = useState("");
  const requestSequence = useRef(0);

  const canCreate = workspaceRole !== "reviewer";
  const canEdit = report ? (workspaceRole === "owner" || workspaceRole === "admin" || (workspaceRole === "preparer" && report.createdByUserId === userId)) && !["ready_for_review", "approved"].includes(report.status) : false;

  const loadReports = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/reports?period=${encodeURIComponent(period)}${companyId ? `&companyId=${companyId}` : ""}`, { cache: "no-store" });
      const data = await readJson<{ reports?: Report[] }>(response);
      if (!response.ok) throw new Error(data.error || "Falha ao carregar relatórios.");
      setReports(data.reports ?? []);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao carregar relatórios."); }
    finally { setLoading(false); }
  }, [companyId, period]);

  const loadDetail = useCallback(async (id: string) => {
    const sequence = ++requestSequence.current;
    setDetailLoading(true); setError("");
    try {
      const response = await fetch(`/api/reports?id=${encodeURIComponent(id)}`, { cache: "no-store" });
      const data = await readJson<{ report?: Report; links?: Link[]; candidates?: Candidate[]; members?: Member[]; events?: EventRow[]; revisions?: Revision[] }>(response);
      if (!response.ok || !data.report) throw new Error(data.error || "Falha ao abrir o relatório.");
      if (sequence !== requestSequence.current) return;
      setReport(data.report); setLinks(data.links ?? []); setCandidates(data.candidates ?? []); setMembers(data.members ?? []); setEvents(data.events ?? []); setRevisions(data.revisions ?? []);
      setReviewerId(data.report.reviewerUserId ?? 0); setSaving("idle");
    } catch (cause) { if (sequence === requestSequence.current) setError(cause instanceof Error ? cause.message : "Falha ao abrir o relatório."); }
    finally { if (sequence === requestSequence.current) setDetailLoading(false); }
  }, []);

  useEffect(() => { const timer = window.setTimeout(() => void loadReports(), 0); return () => window.clearTimeout(timer); }, [loadReports]);
  useEffect(() => { const timer = window.setTimeout(() => { if (selectedId) void loadDetail(selectedId); }, 0); return () => window.clearTimeout(timer); }, [loadDetail, selectedId]);

  const save = useCallback(async (draft: Report) => {
    setSaving("saving");
    try {
      const response = await fetch("/api/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "autosave", reportId: draft.id, expectedRevision: draft.revision, executiveSummary: draft.executiveSummary, conclusion: draft.conclusion, indicators: draft.indicators, pendingItems: draft.pendingItems, templateKey: draft.templateKey, templateVersion: draft.templateVersion, blocks: draft.blocks, commercialNotes: draft.commercialNotes, recommendations: draft.recommendations }) });
      const data = await readJson<{ revision?: number; snapshotHash?: string; updatedAt?: string }>(response);
      if (!response.ok || !data.revision || !data.snapshotHash) {
        if (response.status === 409) { setSaving("conflict"); throw new Error("Este relatório recebeu outra versão. Recarregue para não perder trabalho."); }
        throw new Error(data.error || "Não foi possível salvar.");
      }
      setReport((current) => current?.id === draft.id && current.revision === draft.revision ? { ...current, revision: data.revision!, snapshotHash: data.snapshotHash!, updatedAt: data.updatedAt ?? current.updatedAt } : current);
      setSaving("saved"); setError("");
      window.setTimeout(() => setSaving((current) => current === "saved" ? "idle" : current), 1800);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível salvar."); if (saving !== "conflict") setSaving((current) => current === "conflict" ? current : "dirty"); }
  }, [saving]);

  useEffect(() => {
    if (saving !== "dirty" || !report || !canEdit) return;
    const timer = window.setTimeout(() => void save(report), 900);
    return () => window.clearTimeout(timer);
  }, [canEdit, report, save, saving]);

  function changeDraft(patch: Partial<Report>) {
    if (!report || !canEdit) return;
    const draft = { ...report, ...patch };
    setReport(draft); setSaving("dirty");
  }

  async function createReport() {
    setError("");
    try {
      const response = await fetch("/api/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create", companyId, periodKey: period }) });
      const data = await readJson<{ reportId?: string }>(response);
      if (!response.ok || !data.reportId) throw new Error(data.error || "Não foi possível abrir a competência.");
      await loadReports(); setSelectedId(data.reportId);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível abrir a competência."); }
  }

  async function toggleLink(candidate: Candidate) {
    if (!report || !canEdit) return;
    const linked = links.some((item) => item.artifact_type === candidate.type && item.artifact_id === candidate.id);
    try {
      const response = await fetch("/api/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: linked ? "unlink" : "link", reportId: report.id, artifactType: candidate.type, artifactId: candidate.id }) });
      const data = await readJson<{ links?: Link[] }>(response);
      if (!response.ok) throw new Error(data.error || "Não foi possível atualizar o vínculo.");
      setLinks(data.links ?? []); setSaving("dirty");
      await save({ ...report });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível atualizar o vínculo."); }
  }

  async function submitReview() {
    if (!report || !reviewerId) return;
    if (saving === "dirty") await save(report);
    try {
      const fresh = await fetch(`/api/reports?id=${encodeURIComponent(report.id)}`, { cache: "no-store" });
      const current = await readJson<{ report?: Report }>(fresh);
      if (!fresh.ok || !current.report) throw new Error(current.error || "Não foi possível confirmar a versão salva.");
      const response = await fetch("/api/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "submit_review", reportId: report.id, reviewerUserId: reviewerId }) });
      const data = await readJson<{ status?: string }>(response);
      if (!response.ok) throw new Error(data.error || "Não foi possível enviar para revisão.");
      await loadDetail(report.id); await loadReports();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível enviar para revisão."); }
  }

  const groupedCandidates = useMemo(() => Object.entries(candidates.reduce<Record<string, Candidate[]>>((groups, item) => {
    (groups[item.type] ??= []).push(item);
    return groups;
  }, {})), [candidates]);
  const reviewers = members.filter((member) => ["owner", "admin", "reviewer"].includes(member.role) && (member.userId !== report?.createdByUserId || workspaceRole === "owner" && members.length === 1));

  return <div className="page-content report-center-page">
    <div className="page-heading report-center-heading">
      <div><p className="kicker">CENTRAL DE RELATÓRIOS · COMPETÊNCIA E CARTEIRA</p><h1>Feche o mês sem planilhas paralelas</h1><p>Conecte evidências reais, registre o parecer e envie uma versão reproduzível para revisão.</p></div>
      <div className="report-filters"><label>Competência<input type="month" value={period} onChange={(event) => setPeriod(event.target.value)} /></label><label>Empresa<select value={companyId} onChange={(event) => setCompanyId(Number(event.target.value))}>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>{canCreate && <button className="primary-button" onClick={() => void createReport()} disabled={!companyId}>Abrir competência</button>}</div>
    </div>
    {error && <div className="toast error" role="alert">{error} <button type="button" onClick={() => report ? void loadDetail(report.id) : void loadReports()}>Tentar novamente</button></div>}
    <section className="report-center-layout">
      <aside className="panel report-portfolio" aria-label="Carteira de relatórios">
        <div className="panel-heading"><div><span className="eyebrow">CARTEIRA · {formatPeriod(period)}</span><h3>Status do fechamento</h3></div><span>{reports.length}</span></div>
        {loading ? <div className="report-empty">Carregando carteira…</div> : !reports.length ? <div className="report-empty"><strong>Nenhum relatório nesta competência</strong><p>Abra a competência para iniciar o trabalho da empresa selecionada.</p></div> : reports.map((item) => <button type="button" className={`report-list-item ${selectedId === item.id ? "active" : ""}`} onClick={() => setSelectedId(item.id)} key={item.id}><span><b>{item.companyName}</b><small>{item.creatorName} · v{item.revision}</small></span><em className={`report-status ${item.status}`}>{statusLabels[item.status] ?? item.status}</em><small>{item.pendingItems.filter((pending) => !pending.resolved).length} pendência(s) · {item.linkCount ?? 0} vínculo(s)</small></button>)}
      </aside>

      <section className="panel report-workspace">
        {!selectedId ? <div className="report-empty report-empty-large"><strong>Selecione um relatório da carteira</strong><p>O editor reúne parecer, pendências, artefatos vinculados e histórico imutável.</p></div> : detailLoading || !report ? <div className="report-empty report-empty-large">Carregando relatório…</div> : <>
          <div className="report-title-row"><div><span className="eyebrow">{report.companyName} · {formatPeriod(report.periodKey)}</span><h2>Relatório de competência</h2><p>Preparado por {report.creatorName}{report.reviewerName ? ` · revisão: ${report.reviewerName}` : ""}</p></div><div><em className={`report-status ${report.status}`}>{statusLabels[report.status]}</em><span className={`save-state ${saving}`}>{saving === "saving" ? "Salvando…" : saving === "dirty" ? "Alterações pendentes" : saving === "saved" ? "Salvo com hash" : saving === "conflict" ? "Conflito de versão" : `v${report.revision}`}</span></div></div>
          <div className="report-integrity"><span>SNAPSHOT</span><b>{report.snapshotHash ? `#${report.snapshotHash.slice(0, 12)}` : "Aguardando primeiro autosave"}</b><small>Os vínculos entram pelo hash registrado, não por associação presumida.</small></div>
          <div className="report-editor-grid">
            <label>Resumo executivo<textarea value={report.executiveSummary} onChange={(event) => changeDraft({ executiveSummary: event.target.value })} disabled={!canEdit} placeholder="Contexto da competência, fatos relevantes e variações observadas." /></label>
            <label>Conclusão técnica<textarea value={report.conclusion} onChange={(event) => changeDraft({ conclusion: event.target.value })} disabled={!canEdit} placeholder="Conclusão sustentada pelas evidências vinculadas (mínimo recomendado: 10 caracteres)." /></label>
          </div>
          <section className="report-indicators"><div className="panel-heading"><div><span className="eyebrow">INDICADORES DA COMPETÊNCIA</span><h3>Números e sinais usados no parecer</h3></div>{canEdit && Object.keys(report.indicators).length < 12 && <button type="button" onClick={() => changeDraft({ indicators: { ...report.indicators, [`Indicador ${Object.keys(report.indicators).length + 1}`]: "" } })}>+ Adicionar</button>}</div>{!Object.keys(report.indicators).length ? <p className="report-inline-empty">Nenhum indicador registrado.</p> : Object.entries(report.indicators).map(([key, indicatorValue]) => <div className="report-indicator-row" key={key}><input aria-label="Nome do indicador" value={key} disabled /><input aria-label={`Valor de ${key}`} value={String(indicatorValue)} disabled={!canEdit} onChange={(event) => changeDraft({ indicators: { ...report.indicators, [key]: event.target.value } })} />{canEdit && <button type="button" aria-label={`Remover ${key}`} onClick={() => changeDraft({ indicators: Object.fromEntries(Object.entries(report.indicators).filter(([name]) => name !== key)) })}>×</button>}</div>)}</section>
          <section className="report-pending"><div className="panel-heading"><div><span className="eyebrow">PENDÊNCIAS</span><h3>O que impede a conclusão</h3></div>{canEdit && <button type="button" onClick={() => changeDraft({ pendingItems: [...report.pendingItems, { id: crypto.randomUUID(), text: "Nova pendência", resolved: false }] })}>+ Adicionar</button>}</div>{!report.pendingItems.length ? <p className="report-inline-empty">Nenhuma pendência registrada.</p> : report.pendingItems.map((item, index) => <div className="report-pending-row" key={item.id}><input aria-label={`Resolver pendência ${index + 1}`} type="checkbox" checked={item.resolved} disabled={!canEdit} onChange={(event) => changeDraft({ pendingItems: report.pendingItems.map((row) => row.id === item.id ? { ...row, resolved: event.target.checked } : row) })} /><input value={item.text} disabled={!canEdit} onChange={(event) => changeDraft({ pendingItems: report.pendingItems.map((row) => row.id === item.id ? { ...row, text: event.target.value } : row) })} />{canEdit && <button type="button" aria-label="Remover pendência" onClick={() => changeDraft({ pendingItems: report.pendingItems.filter((row) => row.id !== item.id) })}>×</button>}</div>)}</section>
          <section className="report-artifacts"><div className="panel-heading"><div><span className="eyebrow">EVIDÊNCIAS EXPLÍCITAS</span><h3>Documentos, cálculos, regras e dossiês</h3></div><span>{links.length} vinculados</span></div>{!candidates.length ? <p className="report-inline-empty">Nenhum artefato elegível foi encontrado para esta empresa e competência.</p> : groupedCandidates.map(([type, items]) => <div className="artifact-group" key={type}><b>{artifactLabels[type] ?? type}</b><div>{items!.map((candidate) => { const linked = links.some((item) => item.artifact_type === candidate.type && item.artifact_id === candidate.id); return <button type="button" disabled={!canEdit} className={linked ? "linked" : ""} onClick={() => void toggleLink(candidate)} key={`${candidate.type}-${candidate.id}`}><span>{candidate.label}<small>{candidate.version ?? "sem versão"} · {candidate.status}</small></span><em>{linked ? "Vinculado ✓" : "Vincular"}</em></button>; })}</div></div>)}</section>
          <ReportBuilderPanel report={report} links={links} canEdit={canEdit} onChange={changeDraft} onReload={async () => { await loadDetail(report.id); await loadReports(); }} />
          <section className="report-review-submit"><label>Revisor responsável<select value={reviewerId} onChange={(event) => setReviewerId(Number(event.target.value))} disabled={!canEdit}><option value={0}>Selecione</option>{reviewers.map((member) => <option key={member.userId} value={member.userId}>{member.name} · {member.role}</option>)}</select></label><button className="primary-button" type="button" disabled={!canEdit || !reviewerId || saving === "saving" || report.pendingItems.some((item) => !item.resolved) || report.conclusion.trim().length < 10} onClick={() => void submitReview()}>Enviar para revisão →</button></section>
          <div className="report-history-grid"><section><span className="eyebrow">VERSÕES IMUTÁVEIS</span>{!revisions.length ? <p>Nenhuma versão salva.</p> : revisions.slice(0, 8).map((item) => <article key={item.id}><b>v{item.revision}</b><code>#{item.snapshotHash.slice(0, 12)}</code><time>{new Date(item.createdAt).toLocaleString("pt-BR")}</time></article>)}</section><section><span className="eyebrow">TRILHA DE AUDITORIA</span>{!events.length ? <p>Nenhum evento registrado.</p> : events.slice(0, 8).map((item) => <article key={item.id}><b>{item.actorName}</b><span>{item.note || item.eventType}</span><time>{new Date(item.createdAt).toLocaleString("pt-BR")}</time></article>)}</section></div>
        </>}
      </section>
    </section>
  </div>;
}

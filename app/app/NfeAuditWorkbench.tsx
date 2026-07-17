"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";

type DocumentSummary = {
  id: string;
  companyId: number | null;
  dossierId: string | null;
  filename: string;
  sourceHash: string;
  accessKey: string | null;
  schemaVersion: string | null;
  profileVersion: string;
  status: "structurally_consistent" | "validated_with_warnings" | "blocked";
  authorizationCode: string | null;
  authorizationLabel: string | null;
  issuedAt: string | null;
  emitterName: string | null;
  emitterTaxIdMasked: string | null;
  emitterState: string | null;
  recipientName: string | null;
  recipientTaxIdMasked: string | null;
  recipientState: string | null;
  itemCount: number;
  totalProductCents: number | null;
  totalInvoiceCents: number | null;
  uploaderName: string;
  createdAt: string;
};

type AuditIssue = { code: string; severity: "blocker" | "warning" | "info"; scope: string; message: string; path: string | null; itemNumber: number | null };
type AuditItem = {
  itemNumber: number;
  productCode: string | null;
  description: string | null;
  ncm: string | null;
  cest: string | null;
  cfop: string | null;
  originCode: string | null;
  cst: string | null;
  csosn: string | null;
  productValueCents: number | null;
  icmsRateBps: number | null;
  icmsValueCents: number | null;
  stValueCents: number | null;
  fcpStValueCents: number | null;
  ibsValueCents: number | null;
  cbsValueCents: number | null;
  trace: Record<string, string>;
};

type Audit = {
  status: DocumentSummary["status"];
  statusLabel: string;
  assurance: string;
  documentType: string;
  schemaVersion: string | null;
  profileVersion: string;
  header: { accessKey: string | null; model: string | null; issuedAt: string | null; environment: string; operationNature: string | null; issuerName: string | null; issuerState: string | null; issuerTaxIdMasked: string | null; recipientName: string | null; recipientState: string | null; recipientTaxIdMasked: string | null };
  authorization: { protocol: string | null; statusCode: string | null; statusReason: string | null; authorized: boolean; receivedAt: string | null };
  totals: { itemProductSumCents: number; declaredProductCents: number | null; invoiceCents: number | null; icmsCents: number; stCents: number; fcpStCents: number; ibsCents: number; cbsCents: number };
  items: AuditItem[];
  issues: AuditIssue[];
  checks: Array<{ code: string; label: string; status: "passed" | "warning" | "blocked"; detail: string }>;
  sources: Array<{ code: string; title: string; url: string; checkedAt: string }>;
  limitations: string[];
};

type Comparison = {
  status: "aligned" | "divergent" | "not_compared";
  statusLabel: string;
  dossierId: string | null;
  dossierHash: string | null;
  divergentCount: number;
  checks: Array<{ code: string; label: string; xmlValue: string; dossierValue: string; status: "match" | "divergent" | "not_comparable"; detail: string }>;
};

type DocumentDetail = DocumentSummary & {
  audit: Audit;
  comparison: Comparison;
  events: Array<{ id: number; eventType: string; note: string; createdAt: string }>;
};

type QueueData = {
  error?: string;
  documents: DocumentSummary[];
  dossiers: Array<{ id: string; title: string; status: string; inputHash: string; createdAt: string }>;
  context: { currentUserId: number; workspaceType: "individual" | "office"; role: string; canImport: boolean };
  metrics: { total: number; blocked: number; consistent: number; totalInvoiceCents: number };
};

const statusLabels: Record<DocumentSummary["status"], string> = {
  structurally_consistent: "Estrutura consistente",
  validated_with_warnings: "Revisar alertas",
  blocked: "Documento bloqueado",
};

function money(value: number | null) {
  return value === null ? "—" : (value / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function percent(value: number | null) {
  return value === null ? "—" : `${(value / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

function timestamp(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : value;
}

export default function NfeAuditWorkbench({ companyId, companyName, onUseTotal }: { companyId: number | null; companyName: string | null; onUseTotal?: (totalCents: number) => void }) {
  const [queue, setQueue] = useState<QueueData | null>(null);
  const [detail, setDetail] = useState<DocumentDetail | null>(null);
  const [dossierId, setDossierId] = useState("");
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  function queueUrl() {
    return companyId ? `/api/fiscal-documents?companyId=${companyId}` : "/api/fiscal-documents";
  }

  async function refreshQueue() {
    const response = await fetch(queueUrl(), { cache: "no-store" });
    const data = await response.json() as QueueData;
    if (!response.ok) throw new Error(data.error ?? "Não foi possível carregar a auditoria XML.");
    setQueue(data);
    return data;
  }

  useEffect(() => {
    let cancelled = false;
    fetch(companyId ? `/api/fiscal-documents?companyId=${companyId}` : "/api/fiscal-documents", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json() as QueueData;
        if (!response.ok) throw new Error(data.error ?? "Não foi possível carregar a auditoria XML.");
        return data;
      })
      .then((data) => { if (!cancelled) setQueue(data); })
      .catch((cause: Error) => { if (!cancelled) setError(cause.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [companyId]);

  async function openDocument(id: string) {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/fiscal-documents?id=${encodeURIComponent(id)}`, { cache: "no-store" });
      const data = await response.json() as { error?: string; document?: DocumentDetail };
      if (!response.ok || !data.document) throw new Error(data.error ?? "Não foi possível abrir o documento.");
      setDetail(data.document);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível abrir o documento.");
    } finally {
      setLoading(false);
    }
  }

  async function importFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).filter((file) => file.name.toLowerCase().endsWith(".xml")).slice(0, 20);
    event.target.value = "";
    if (!files.length) {
      setError("Selecione arquivos XML de NF-e.");
      return;
    }
    setImporting(true);
    setError("");
    let lastDetail: DocumentDetail | null = null;
    const failures: string[] = [];
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      setProgress(`Auditando ${index + 1} de ${files.length} · ${file.name}`);
      try {
        if (file.size > 5 * 1024 * 1024) throw new Error("excede 5 MB");
        const body = new FormData();
        body.append("file", file);
        if (companyId) body.append("companyId", String(companyId));
        if (dossierId) body.append("dossierId", dossierId);
        const response = await fetch("/api/fiscal-documents", { method: "POST", body });
        const data = await response.json() as { error?: string; document?: DocumentDetail };
        if (!response.ok || !data.document) throw new Error(data.error ?? "falha na auditoria");
        lastDetail = data.document;
      } catch (cause) {
        failures.push(`${file.name}: ${cause instanceof Error ? cause.message : "falha"}`);
      }
    }
    try {
      await refreshQueue();
      if (lastDetail) setDetail(lastDetail);
      if (failures.length) setError(`${files.length - failures.length} processado(s); ${failures.length} recusado(s). ${failures.slice(0, 2).join(" · ")}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível atualizar o histórico.");
    } finally {
      setProgress("");
      setImporting(false);
    }
  }

  const blockers = detail?.audit.issues.filter((current) => current.severity === "blocker") ?? [];
  const warnings = detail?.audit.issues.filter((current) => current.severity === "warning") ?? [];

  return (
    <div className="nfe-audit-page">
      <section className="nfe-audit-hero">
        <div><span>VERSÃO 23 · EVIDÊNCIA DOCUMENTAL</span><h1>Auditoria determinística de NF-e XML</h1><p>O servidor confere estrutura, chave, protocolo, totais e itens. O XML bruto é processado em memória e descartado; somente hash, campos rastreáveis e divergências são preservados.</p></div>
        <div className="nfe-audit-hero-badge"><i>XML</i><span><b>PERFIL ESTRUTURAL</b><small>Não substitui validação XSD integral</small></span></div>
      </section>

      <section className="nfe-audit-controls panel">
        <div className="nfe-audit-target"><small>CONTEXTO DA IMPORTAÇÃO</small><strong>{companyName || "Carteira do escritório"}</strong><span>{companyId ? `Cliente #${companyId}` : "Sem cliente vinculado"}</span></div>
        <label>Dossiê V22 para conciliar<select value={dossierId} onChange={(event) => setDossierId(event.target.value)}><option value="">Auditar sem comparar</option>{queue?.dossiers.map((dossier) => <option value={dossier.id} key={dossier.id}>{dossier.title} · #{dossier.inputHash.slice(0, 8)}</option>)}</select></label>
        <div className="nfe-audit-import"><button type="button" className="primary-button" disabled={importing || !queue?.context.canImport} onClick={() => fileInput.current?.click()}>{importing ? "Processando…" : "Selecionar NF-e XML"}<span>↑</span></button><input ref={fileInput} type="file" accept=".xml,text/xml,application/xml" multiple onChange={(event) => void importFiles(event)} /><small>Até 20 arquivos · 5 MB cada · UTF-8</small></div>
      </section>

      {progress && <div className="nfe-audit-progress"><i /><span>{progress}</span></div>}
      {error && <div className="nfe-audit-error" role="alert"><b>Auditoria interrompida ou parcial</b><span>{error}</span></div>}

      <section className="nfe-audit-metrics">
        <article><span>Documentos auditados</span><strong>{queue?.metrics.total ?? "—"}</strong><small>Neste contexto</small></article>
        <article><span>Estrutura consistente</span><strong>{queue?.metrics.consistent ?? "—"}</strong><small>Podem seguir para revisão</small></article>
        <article className={(queue?.metrics.blocked ?? 0) > 0 ? "risk" : ""}><span>Bloqueados</span><strong>{queue?.metrics.blocked ?? "—"}</strong><small>Não devem alimentar cálculo</small></article>
        <article><span>Valor documental</span><strong>{money(queue?.metrics.totalInvoiceCents ?? null)}</strong><small>Exclui XMLs bloqueados</small></article>
      </section>

      <div className="nfe-audit-layout">
        <section className="panel nfe-audit-detail">
          <div className="panel-heading"><div><span className="eyebrow">DOCUMENTO ATIVO</span><h3>{detail?.filename ?? "Selecione ou importe uma NF-e"}</h3></div>{detail && <span className={`nfe-document-status ${detail.status}`}><i />{statusLabels[detail.status]}</span>}</div>
          {loading && !detail ? <div className="nfe-audit-empty">Verificando histórico documental…</div> : detail ? <>
            <div className="nfe-document-identity">
              <div><small>EMITENTE</small><b>{detail.audit.header.issuerName ?? "Não identificado"}</b><span>{detail.audit.header.issuerTaxIdMasked ?? "—"} · {detail.audit.header.issuerState ?? "UF?"}</span></div>
              <span>→</span>
              <div><small>DESTINATÁRIO</small><b>{detail.audit.header.recipientName ?? "Não identificado"}</b><span>{detail.audit.header.recipientTaxIdMasked ?? "—"} · {detail.audit.header.recipientState ?? "UF?"}</span></div>
              <div><small>AUTORIZAÇÃO</small><b>cStat {detail.audit.authorization.statusCode ?? "—"}</b><span>{detail.audit.authorization.statusReason ?? "Sem protocolo"}</span></div>
            </div>

            <div className="nfe-document-totals">
              <div><small>PRODUTOS</small><strong>{money(detail.audit.totals.declaredProductCents)}</strong></div>
              <div><small>ICMS PRÓPRIO</small><strong>{money(detail.audit.totals.icmsCents)}</strong></div>
              <div><small>ICMS-ST + FCP</small><strong>{money(detail.audit.totals.stCents + detail.audit.totals.fcpStCents)}</strong></div>
              <div><small>IBS + CBS</small><strong>{money(detail.audit.totals.ibsCents + detail.audit.totals.cbsCents)}</strong></div>
              <div><small>TOTAL NF-e</small><strong>{money(detail.audit.totals.invoiceCents)}</strong></div>
            </div>

            <div className="nfe-check-grid">{detail.audit.checks.map((check) => <article className={check.status} key={check.code}><span>{check.status === "passed" ? "✓" : check.status === "blocked" ? "!" : "i"}</span><div><small>{check.code}</small><b>{check.label}</b><p>{check.detail}</p></div></article>)}</div>

            {(blockers.length > 0 || warnings.length > 0) && <div className="nfe-issues"><div><span>BLOQUEIOS</span><strong>{blockers.length}</strong></div><div><span>ALERTAS</span><strong>{warnings.length}</strong></div><section>{detail.audit.issues.filter((current) => current.severity !== "info").slice(0, 12).map((current) => <article className={current.severity} key={`${current.code}-${current.itemNumber ?? 0}`}><span>{current.severity === "blocker" ? "!" : "△"}</span><div><b>{current.message}</b><small>{current.code}{current.itemNumber ? ` · item ${current.itemNumber}` : ""}{current.path ? ` · ${current.path}` : ""}</small></div></article>)}</section></div>}

            <div className="nfe-item-heading"><div><span className="eyebrow">RASTREAMENTO POR ITEM</span><h3>{detail.audit.items.length} item(ns) extraído(s)</h3></div>{onUseTotal && detail.status !== "blocked" && detail.audit.totals.invoiceCents !== null && <button type="button" onClick={() => onUseTotal(detail.audit.totals.invoiceCents!)}>Usar total no cenário →</button>}</div>
            <div className="nfe-item-table-wrap"><table className="nfe-item-table"><thead><tr><th>Item</th><th>Descrição</th><th>NCM / CEST</th><th>CFOP / CST</th><th>ICMS</th><th>ST + FCP</th><th>IBS + CBS</th><th>vProd</th></tr></thead><tbody>{detail.audit.items.map((item) => <tr key={item.itemNumber}><td>{item.itemNumber}</td><td><b>{item.description ?? "Sem descrição"}</b><small>{item.productCode ?? "—"}</small></td><td><b>{item.ncm ?? "—"}</b><small>{item.cest ?? "CEST não informado"}</small></td><td><b>{item.cfop ?? "—"}</b><small>{item.cst ? `CST ${item.cst}` : item.csosn ? `CSOSN ${item.csosn}` : "—"}</small></td><td><b>{percent(item.icmsRateBps)}</b><small>{money(item.icmsValueCents)}</small></td><td><b>{money((item.stValueCents ?? 0) + (item.fcpStValueCents ?? 0))}</b></td><td><b>{money((item.ibsValueCents ?? 0) + (item.cbsValueCents ?? 0))}</b></td><td><b>{money(item.productValueCents)}</b></td></tr>)}</tbody></table></div>

            <section className={`nfe-comparison ${detail.comparison.status}`}><div className="nfe-comparison-heading"><div><span>CONCILIAÇÃO COM DOSSIÊ V22</span><h3>{detail.comparison.statusLabel}</h3></div>{detail.comparison.dossierHash && <code>#{detail.comparison.dossierHash.slice(0, 12)}</code>}</div>{detail.comparison.checks.length ? <div>{detail.comparison.checks.map((check) => <article className={check.status} key={check.code}><span>{check.status === "match" ? "✓" : check.status === "divergent" ? "!" : "—"}</span><div><b>{check.label}</b><p>XML: {check.xmlValue} · Dossiê: {check.dossierValue}</p><small>{check.detail}</small></div></article>)}</div> : <p>Selecione um dossiê antes da importação para comparar rota, NCM, CEST, alíquota, valores e ICMS-ST.</p>}</section>

            <div className="nfe-evidence-footer"><div><span>HASH DO XML</span><code>{detail.sourceHash}</code><small>O XML bruto não foi armazenado.</small></div><div>{detail.audit.sources.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.code}>{source.title}<span>↗</span></a>)}</div></div>
          </> : <div className="nfe-audit-empty"><span>XML</span><b>Importe uma NF-e autorizada</b><p>A V23 não usa DANFE em PDF nem imagem. Utilize o XML completo com `nfeProc` e protocolo.</p></div>}
        </section>

        <aside className="panel nfe-audit-history">
          <div className="panel-heading"><div><span className="eyebrow">HISTÓRICO IMUTÁVEL</span><h3>Últimas auditorias</h3></div><span>{queue?.documents.length ?? 0}</span></div>
          {queue?.documents.length ? <div>{queue.documents.map((document) => <button type="button" className={detail?.id === document.id ? "active" : ""} onClick={() => void openDocument(document.id)} key={document.id}><span className={`nfe-history-status ${document.status}`}><i />{statusLabels[document.status]}</span><b>{document.filename}</b><p>{document.emitterState ?? "?"} → {document.recipientState ?? "?"} · {document.itemCount} item(ns)</p><strong>{money(document.totalInvoiceCents)}</strong><small>#{document.sourceHash.slice(0, 10)} · {timestamp(document.createdAt)}</small></button>)}</div> : <div className="nfe-history-empty">Nenhuma NF-e auditada para este cliente.</div>}
          <section className="nfe-privacy-note"><span>⌁</span><div><b>Minimização de dados</b><p>Identificadores fiscais aparecem mascarados. O banco recebe somente hash e evidências extraídas, nunca o XML original.</p></div></section>
        </aside>
      </div>
    </div>
  );
}

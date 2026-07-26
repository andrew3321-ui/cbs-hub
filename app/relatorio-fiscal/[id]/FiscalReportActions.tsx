"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Share = {
  id: number;
  url: string;
  active: boolean;
  note: string | null;
  expiresAt: string;
  revokedAt: string | null;
  views: number;
  lastViewedAt: string | null;
  createdAt: string;
};

export default function FiscalReportActions({ dossierId, status }: { dossierId: string; status: string }) {
  const [open, setOpen] = useState(false);
  const [shares, setShares] = useState<Share[]>([]);
  const [expiryDays, setExpiryDays] = useState("30");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const activeShare = useMemo(() => shares.find((share) => share.active) ?? null, [shares]);

  async function loadShares() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/fiscal-dossier-shares?dossierId=${encodeURIComponent(dossierId)}`, { cache: "no-store" });
      const data = await response.json() as { error?: string; shares?: Share[] };
      if (!response.ok) throw new Error(data.error ?? "Não foi possível carregar os links.");
      setShares(data.shares ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar os links.");
    } finally {
      setLoading(false);
    }
  }

  async function openSharing() {
    setOpen(true);
    await loadShares();
  }

  async function createShare() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/fiscal-dossier-shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dossierId, expiryDays: Number(expiryDays), note }),
      });
      const data = await response.json() as { error?: string; share?: Share };
      if (!response.ok || !data.share) throw new Error(data.error ?? "Não foi possível gerar o link.");
      setShares((current) => [data.share!, ...current.map((share) => share.active ? { ...share, active: false, revokedAt: new Date().toISOString() } : share)]);
      setCopied(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível gerar o link.");
    } finally {
      setLoading(false);
    }
  }

  async function copyShare() {
    if (!activeShare) return;
    try {
      await navigator.clipboard.writeText(activeShare.url);
      setCopied(true);
    } catch {
      setError("Não foi possível copiar automaticamente. Selecione o endereço e copie.");
    }
  }

  async function revokeShare() {
    if (!activeShare) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/fiscal-dossier-shares?id=${activeShare.id}`, { method: "DELETE" });
      const data = await response.json() as { error?: string; revokedAt?: string };
      if (!response.ok) throw new Error(data.error ?? "Não foi possível revogar o link.");
      setShares((current) => current.map((share) => share.id === activeShare.id ? { ...share, active: false, revokedAt: data.revokedAt ?? new Date().toISOString() } : share));
      setCopied(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível revogar o link.");
    } finally {
      setLoading(false);
    }
  }

  return <>
    <div className="public-report-actions">
      <Link href="/app">Voltar ao sistema</Link>
      <button type="button" disabled={status !== "approved"} title={status === "approved" ? "Criar link revogável" : "Aprove o dossiê antes de compartilhar"} onClick={() => void openSharing()}>Compartilhar</button>
      <button type="button" onClick={() => window.print()}>Imprimir / salvar PDF</button>
    </div>
    {open && <div className="fiscal-share-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="fiscal-share-dialog" role="dialog" aria-modal="true" aria-labelledby="fiscal-share-title">
        <header><div><span>ENTREGA RASTREÁVEL</span><h2 id="fiscal-share-title">Compartilhar dossiê aprovado</h2><p>O cliente acessa somente este snapshot. Um novo link revoga automaticamente o anterior.</p></div><button type="button" aria-label="Fechar" onClick={() => setOpen(false)}>×</button></header>
        {error && <div className="fiscal-share-error" role="alert">{error}</div>}
        {loading && shares.length === 0 ? <div className="fiscal-share-loading">Verificando compartilhamentos…</div> : activeShare ? <>
          <div className="fiscal-share-active">
            <span>LINK ATIVO</span>
            <input aria-label="Link público do dossiê" readOnly value={activeShare.url} onFocus={(event) => event.currentTarget.select()} />
            <div><small>Expira em {new Date(activeShare.expiresAt).toLocaleDateString("pt-BR")} · {activeShare.views} visualização{activeShare.views === 1 ? "" : "ões"}</small><strong>{activeShare.lastViewedAt ? `Último acesso ${new Date(activeShare.lastViewedAt).toLocaleString("pt-BR")}` : "Ainda não acessado"}</strong></div>
          </div>
          <footer><button type="button" className="danger" disabled={loading} onClick={() => void revokeShare()}>Revogar link</button><button type="button" disabled={loading} onClick={() => void copyShare()}>{copied ? "Link copiado ✓" : "Copiar link"}</button></footer>
        </> : <>
          <div className="fiscal-share-form">
            <label>Validade<select value={expiryDays} onChange={(event) => setExpiryDays(event.target.value)}><option value="7">7 dias</option><option value="30">30 dias</option><option value="90">90 dias</option></select></label>
            <label>Mensagem opcional<textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={240} rows={3} placeholder="Ex.: Dossiê preparado para conferência da operação informada." /></label>
          </div>
          <footer><button type="button" onClick={() => setOpen(false)}>Cancelar</button><button type="button" disabled={loading} onClick={() => void createShare()}>{loading ? "Gerando…" : "Gerar link seguro"}</button></footer>
        </>}
      </section>
    </div>}
  </>;
}

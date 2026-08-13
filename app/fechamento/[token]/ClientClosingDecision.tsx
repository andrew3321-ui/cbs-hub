"use client";

import { useEffect, useState } from "react";
import BrandMark from "../../BrandMark";

type Delivery = { companyName: string; periodKey: string; revision: number; snapshotHash: string; executiveSummary: string; conclusion: string; indicators: Record<string, string | number>; pendingItems: Array<{ text: string; resolved: boolean }>; reviewerName: string; professionalRegistration: string; approvedAt: string; expiresAt: string; decision: string | null; decisionNote: string; decidedAt: string | null };

const decisionLabels: Record<string, string> = { accepted: "Aceito pelo cliente", rejected: "Recusado pelo cliente", changes_requested: "Alterações solicitadas" };

export default function ClientClosingDecision({ token }: { token: string }) {
  const [delivery, setDelivery] = useState<Delivery | null>(null); const [branding, setBranding] = useState({ officeName: "CBSHub", primaryColor: "#073c3b", accentColor: "#b8f04c" }); const [error, setError] = useState(""); const [choice, setChoice] = useState(""); const [note, setNote] = useState(""); const [saving, setSaving] = useState(false);
  useEffect(() => { void fetch(`/api/monthly-closing/client?token=${encodeURIComponent(token)}`, { cache: "no-store" }).then(async (response) => { const data = await response.json() as { delivery?: Delivery; branding?: typeof branding; error?: string }; if (!response.ok || !data.delivery) throw new Error(data.error || "Entrega indisponível."); setDelivery(data.delivery); if (data.branding) setBranding(data.branding); }).catch((cause) => setError(cause instanceof Error ? cause.message : "Entrega indisponível.")); }, [token]);
  async function decide() { if (!choice || saving) return; setSaving(true); setError(""); try { const response = await fetch("/api/monthly-closing/client", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, decision: choice, note }) }); const data = await response.json() as { decision?: string; decidedAt?: string; error?: string }; if (!response.ok || !data.decision) throw new Error(data.error || "Não foi possível registrar."); setDelivery((current) => current ? { ...current, decision: data.decision!, decisionNote: note, decidedAt: data.decidedAt ?? null } : current); } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível registrar."); } finally { setSaving(false); } }
  if (error && !delivery) return <main className="closing-client-unavailable"><BrandMark /><section><span>ENTREGA INDISPONÍVEL</span><h1>Este link não pode mais ser utilizado.</h1><p>{error}</p></section></main>;
  if (!delivery) return <main className="closing-client-loading">Validando entrega assinada…</main>;
  return <main className="closing-client-shell" style={{ "--closing-primary": branding.primaryColor, "--closing-accent": branding.accentColor } as React.CSSProperties}>
    <header><div><BrandMark /><b>CBSHub</b></div><span>{branding.officeName}</span><small>Entrega segura · expira em {new Date(delivery.expiresAt).toLocaleDateString("pt-BR")}</small></header>
    <article className="closing-client-document">
      <div className="closing-client-title"><div><span>FECHAMENTO MENSAL</span><h1>{delivery.companyName}</h1><p>Competência {delivery.periodKey.split("-").reverse().join("/")} · versão {delivery.revision}</p></div><code>#{delivery.snapshotHash.slice(0, 16)}</code></div>
      <section><span>RESUMO EXECUTIVO</span><p>{delivery.executiveSummary || "Sem resumo executivo registrado."}</p></section>
      <section><span>INDICADORES</span><div className="closing-client-indicators">{Object.entries(delivery.indicators).map(([key, value]) => <article key={key}><small>{key}</small><strong>{String(value)}</strong></article>)}</div></section>
      <section><span>CONCLUSÃO TÉCNICA</span><p>{delivery.conclusion}</p></section>
      <section className="closing-client-signature"><span>REVISÃO RESPONSÁVEL</span><strong>{delivery.reviewerName}</strong><p>{delivery.professionalRegistration} · aprovado em {new Date(delivery.approvedAt).toLocaleString("pt-BR")}</p></section>
      {delivery.decision ? <section className={`closing-client-decision ${delivery.decision}`}><span>DECISÃO REGISTRADA</span><h2>{decisionLabels[delivery.decision]}</h2>{delivery.decisionNote && <p>{delivery.decisionNote}</p>}<small>Registro permanente em {delivery.decidedAt ? new Date(delivery.decidedAt).toLocaleString("pt-BR") : "agora"}</small></section> : <section className="closing-client-response"><span>CONFIRMAÇÃO DO CLIENTE</span><h2>Como deseja prosseguir?</h2><div>{[["accepted", "Aceitar entrega"], ["changes_requested", "Solicitar alterações"], ["rejected", "Recusar"]].map(([value, label]) => <button className={choice === value ? "active" : ""} onClick={() => setChoice(value)} key={value}>{label}</button>)}</div>{choice && choice !== "accepted" && <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Descreva o motivo ou a alteração necessária (mínimo 10 caracteres)" />}<button className="primary-button" disabled={!choice || (choice !== "accepted" && note.trim().length < 10) || saving} onClick={() => void decide()}>{saving ? "Registrando…" : "Confirmar decisão →"}</button>{error && <p className="closing-client-error">{error}</p>}</section>}
    </article>
  </main>;
}

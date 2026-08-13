"use client";

import { useEffect, useMemo, useState } from "react";

type AuthorityPayload = {
  generatedAt: string;
  assets: Array<{ title: string; description: string; href: string; category: string; trackedUrl: string }>;
  targets: Array<{ name: string; domain: string; category: string; rationale: string }>;
  policy: { monthlyRoutine: readonly string[]; prohibited: readonly string[] };
  links: Array<{ id: string; sourceUrl: string; sourceDomain: string; targetPath: string; context: string; acquisitionMethod: string; status: string; firstSeenAt: string; lastVerifiedAt: string; resultNote: string }>;
  cycles: Array<{ id: string; cycleMonth: string; status: string; outreachCount: number; mentionsFound: number; verifiedLinks: number; notes: string }>;
  referrals: Array<{ source: string; medium: string; campaign: string; pageViews: number; visitors: number }>;
};

const initialLink = { sourceUrl: "", targetPath: "/conteudos", context: "", acquisitionMethod: "citation", status: "verified", resultNote: "" };

export default function OrganicAuthorityCenter() {
  const [data, setData] = useState<AuthorityPayload | null>(null);
  const [message, setMessage] = useState("");
  const [link, setLink] = useState(initialLink);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const existingCycle = useMemo(() => data?.cycles.find((cycle) => cycle.cycleMonth === currentMonth), [data, currentMonth]);
  const [cycle, setCycle] = useState({ cycleMonth: currentMonth, status: "open", outreachCount: 0, mentionsFound: 0, verifiedLinks: 0, notes: "" });

  async function load() {
    const response = await fetch("/api/admin/organic-authority?days=90", { cache: "no-store" });
    const payload = await response.json() as AuthorityPayload & { error?: string };
    if (!response.ok) throw new Error(payload.error ?? "Autoridade orgânica indisponível.");
    setData(payload);
  }
  useEffect(() => {
    let active = true;
    fetch("/api/admin/organic-authority?days=90", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json() as AuthorityPayload & { error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Autoridade orgânica indisponível.");
        return payload;
      })
      .then((payload) => {
        if (!active) return;
        setData(payload);
        const saved = payload.cycles.find((item) => item.cycleMonth === currentMonth);
        if (saved) setCycle({ cycleMonth: saved.cycleMonth, status: saved.status, outreachCount: saved.outreachCount, mentionsFound: saved.mentionsFound, verifiedLinks: saved.verifiedLinks, notes: saved.notes });
      })
      .catch((error) => { if (active) setMessage(error instanceof Error ? error.message : "Falha ao carregar."); });
    return () => { active = false; };
  }, [currentMonth]);

  async function submit(body: Record<string, unknown>) {
    setMessage("");
    const response = await fetch("/api/admin/organic-authority", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const payload = await response.json() as { error?: string };
    if (!response.ok) throw new Error(payload.error ?? "Não foi possível salvar.");
    await load(); setMessage("Registro salvo com evidência auditável.");
  }
  async function saveLink(event: React.FormEvent) { event.preventDefault(); try { await submit({ action: "save_link", ...link }); setLink(initialLink); } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível salvar."); } }
  async function saveCycle(event: React.FormEvent) { event.preventDefault(); try { await submit({ action: "save_cycle", ...cycle }); } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível salvar."); } }

  if (!data) return <section className="panel owner-authority-panel"><div className="billing-admin-loading">{message || "Consolidando autoridade orgânica…"}</div></section>;
  const verified = data.links.filter((item) => item.status === "verified");
  const visitors = data.referrals.reduce((sum, item) => sum + Number(item.visitors || 0), 0);
  return <section className="panel owner-authority-panel">
    <div className="panel-heading"><div><span className="eyebrow">AUTORIDADE ORGÂNICA · EVIDÊNCIA REAL</span><h3>Ativos, distribuição e links conquistados</h3><p className="owner-panel-copy">O painel só contabiliza URLs externas registradas e tráfego de referência observado. Alvos abaixo são oportunidades editoriais, não parcerias declaradas.</p></div><a className="secondary-button" href="/imprensa" target="_blank" rel="noreferrer">Abrir press kit</a></div>
    {message && <div className="toast" role="status">{message}</div>}
    <div className="owner-search-summary"><article><span>ATIVOS CITÁVEIS</span><strong>{data.assets.length}</strong><small>URLs públicas estáveis</small></article><article><span>LINKS VERIFICADOS</span><strong>{verified.length}</strong><small>{new Set(verified.map((item) => item.sourceDomain)).size} domínio(s)</small></article><article><span>REFERÊNCIAS · 90 DIAS</span><strong>{visitors}</strong><small>visitantes únicos/dia agregados</small></article><article><span>CICLO ATUAL</span><strong>{existingCycle?.status === "completed" ? "Fechado" : "Aberto"}</strong><small>{existingCycle?.verifiedLinks ?? 0} links conferidos</small></article></div>
    <div className="owner-authority-grid">
      <div><h4>Ativos prontos para compartilhar</h4><div className="owner-authority-assets">{data.assets.map((asset) => <article key={asset.href}><div><b>{asset.title}</b><small>{asset.description}</small></div><button type="button" onClick={() => navigator.clipboard.writeText(asset.trackedUrl)}>Copiar URL UTM</button></article>)}</div></div>
      <div><h4>Mapa de distribuição legítima</h4><div className="owner-authority-targets">{data.targets.map((target) => <article key={target.domain}><b>{target.name}</b><span>{target.category} · {target.domain}</span><small>{target.rationale}</small></article>)}</div></div>
    </div>
    <div className="owner-authority-grid owner-authority-forms">
      <form onSubmit={saveLink}><h4>Registrar link conquistado</h4><input aria-label="URL da menção" type="url" required placeholder="https://dominio.com.br/artigo" value={link.sourceUrl} onChange={(event) => setLink({ ...link, sourceUrl: event.target.value })} /><select aria-label="Página citada" value={link.targetPath} onChange={(event) => setLink({ ...link, targetPath: event.target.value })}>{data.assets.map((asset) => <option value={asset.href} key={asset.href}>{asset.title}</option>)}</select><textarea aria-label="Contexto editorial" required minLength={12} placeholder="Como e por que a CBSHub foi citada" value={link.context} onChange={(event) => setLink({ ...link, context: event.target.value })} /><div><select aria-label="Método de aquisição" value={link.acquisitionMethod} onChange={(event) => setLink({ ...link, acquisitionMethod: event.target.value })}><option value="citation">Citação editorial</option><option value="editorial">Conteúdo editorial</option><option value="press">Imprensa</option><option value="partnership">Parceria legítima</option><option value="relevant_directory">Diretório relevante</option><option value="professional_community">Comunidade profissional</option></select><select aria-label="Estado do link" value={link.status} onChange={(event) => setLink({ ...link, status: event.target.value })}><option value="verified">Verificado</option><option value="lost">Perdido</option><option value="rejected">Rejeitado</option></select></div><input aria-label="Resultado observado" placeholder="Resultado ou observação opcional" value={link.resultNote} onChange={(event) => setLink({ ...link, resultNote: event.target.value })} /><button type="submit" className="primary-button">Salvar evidência</button></form>
      <form onSubmit={saveCycle}><h4>Rotina mensal de outreach</h4><div className="owner-authority-routine">{data.policy.monthlyRoutine.map((item, index) => <span key={item}>{index + 1}. {item}</span>)}</div><div><input aria-label="Abordagens" type="number" min="0" value={cycle.outreachCount} onChange={(event) => setCycle({ ...cycle, outreachCount: Number(event.target.value) })} /><input aria-label="Menções encontradas" type="number" min="0" value={cycle.mentionsFound} onChange={(event) => setCycle({ ...cycle, mentionsFound: Number(event.target.value) })} /><input aria-label="Links verificados" type="number" min="0" value={cycle.verifiedLinks} onChange={(event) => setCycle({ ...cycle, verifiedLinks: Number(event.target.value) })} /></div><textarea aria-label="Notas do ciclo" placeholder="Ações, retornos e próximos passos" value={cycle.notes} onChange={(event) => setCycle({ ...cycle, notes: event.target.value })} /><select aria-label="Estado do ciclo" value={cycle.status} onChange={(event) => setCycle({ ...cycle, status: event.target.value })}><option value="open">Em andamento</option><option value="completed">Concluído</option></select><button type="submit" className="primary-button">Atualizar ciclo {currentMonth}</button></form>
    </div>
    <div className="owner-authority-ledger"><h4>Links e resultados registrados</h4>{data.links.length ? data.links.map((item) => <article key={item.id}><div><b>{item.sourceDomain}</b><a href={item.sourceUrl} target="_blank" rel="noreferrer">{item.sourceUrl}</a></div><span>{item.acquisitionMethod} · {item.targetPath}</span><strong className={item.status}>{item.status}</strong><small>{item.context} · conferido em {item.lastVerifiedAt.slice(0, 10).split("-").reverse().join("/")}</small></article>) : <p className="owner-search-empty">Nenhum backlink foi inventado ou presumido. Registre somente depois de verificar a URL pública.</p>}</div>
    <p className="owner-search-footnote">Política ativa: sem compra de links, redes privadas, spam ou diretórios irrelevantes. Tráfego de referência usa identificadores pseudonimizados e retenção já definida nas métricas da plataforma.</p>
  </section>;
}

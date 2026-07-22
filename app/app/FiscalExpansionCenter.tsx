"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

type Scope = "icms" | "iss" | "st" | "federal" | "sources";
type Stage = "catalogued" | "source_connected" | "structured" | "tested" | "automatically_verified" | "blocked";
type Progress = { stage: Stage; evidenceNote: string; evidenceReference: string | null; evidenceHash: string | null; updatedAt: string };
type Item = {
  code: string;
  scope: Scope;
  title: string;
  jurisdiction: string;
  supportStatus: "supported" | "partial" | "not_supported";
  stage: Stage;
  priorityScore: number;
  sourceUrl: string | null;
  sourceTitle: string | null;
  blockers: string[];
  gates: string[];
  progress: Progress | null;
};
type ExpansionPayload = {
  version: string;
  targets: { month: string; icmsBundles: number; issDeepCities: number; stRouteBundles: number; officialSources: number; testedBundles: number; automaticTests: number };
  metrics: {
    totalItems: number;
    progressPercent: number;
    counts: Record<Stage, number>;
    actual: Record<"icmsBundles" | "issDeepCities" | "stRouteBundles" | "officialSources" | "testedBundles" | "automaticTests", number>;
    gaps: Record<"icmsBundles" | "issDeepCities" | "stRouteBundles" | "officialSources" | "testedBundles" | "automaticTests", number>;
  };
  items: Item[];
  events: Array<{ id: number; itemCode: string; fromStage: Stage; toStage: Stage; evidenceNote: string; evidenceHash: string | null; createdAt: string }>;
  stageLabels: Record<Stage, string>;
  permissions: { role: string; canPrepare: boolean };
  policy: { automaticVerification: true; statement: string };
};

const scopes: Array<Scope | "all"> = ["all", "icms", "iss", "st", "federal", "sources"];
const scopeLabels: Record<Scope | "all", string> = { all: "Todas", icms: "ICMS", iss: "ISS", st: "ST", federal: "Federais", sources: "Fontes" };
const stageOrder: Stage[] = ["catalogued", "source_connected", "structured", "tested", "automatically_verified"];

async function requestJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const payload = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Não foi possível concluir a operação.");
  return payload;
}

function nextStage(stage: Stage) {
  if (["automatically_verified", "blocked"].includes(stage)) return null;
  return stageOrder[stageOrder.indexOf(stage) + 1] ?? null;
}

export default function FiscalExpansionCenter() {
  const [data, setData] = useState<ExpansionPayload | null>(null);
  const [scope, setScope] = useState<Scope | "all">("all");
  const [selectedCode, setSelectedCode] = useState("");
  const [evidenceNote, setEvidenceNote] = useState("");
  const [evidenceReference, setEvidenceReference] = useState("");
  const [gatesAcknowledged, setGatesAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void requestJson<ExpansionPayload>("/api/fiscal-expansion").then((payload) => {
      setData(payload);
      setSelectedCode(payload.items.find((item) => nextStage(item.stage))?.code ?? "");
    }).catch((cause: Error) => setError(cause.message));
  }, []);

  const queue = useMemo(() => data?.items
    .filter((item) => nextStage(item.stage) && (scope === "all" || item.scope === scope))
    .sort((a, b) => b.priorityScore - a.priorityScore || a.code.localeCompare(b.code)) ?? [], [data, scope]);
  const selected = data?.items.find((item) => item.code === selectedCode) ?? queue[0] ?? null;
  const targetStage = selected ? nextStage(selected.stage) : null;
  const automaticRun = targetStage === "automatically_verified";
  const canAdvance = Boolean(data && selected && targetStage && data.permissions.canPrepare);

  const advance = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected || !targetStage) return;
    setBusy(true); setError("");
    try {
      const payload = await requestJson<ExpansionPayload>("/api/fiscal-expansion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "advance", itemCode: selected.code, expectedStage: selected.stage, evidenceNote, evidenceReference, gatesAcknowledged }),
      });
      setData(payload);
      setEvidenceNote(""); setEvidenceReference(""); setGatesAcknowledged(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Evolução não registrada."); }
    finally { setBusy(false); }
  };

  if (!data) return <section className="expansion-loading"><span className="loading-spinner" /><div><b>Preparando a esteira fiscal…</b><p>Carregando metas, fontes e controles automáticos.</p></div></section>;

  const targetCards = [
    ["ICMS", "icmsBundles", "UFs catalogadas"],
    ["ISS profundo", "issDeepCities", "cidades estruturadas"],
    ["ST", "stRouteBundles", "rotas/segmentos estruturados"],
    ["Fontes", "officialSources", "oficiais conectadas"],
    ["Testes", "testedBundles", "pacotes estruturados"],
    ["Automático", "automaticTests", "cenários reexecutados"],
  ] as const;

  return <div className="fiscal-expansion-center">
    <section className="expansion-hero">
      <div><span>VERSÃO 56 · VERIFICAÇÃO FISCAL AUTOMÁTICA</span><h1>Cobertura cresce com prova, não com promessa</h1><p>Fontes oficiais, regras versionadas e cenários sintéticos são conectados a uma bateria que o servidor reexecuta sem depender de usuários voluntários.</p></div>
      <div className="expansion-guard"><b>SEM IA</b><span>sem API paga</span><small>verificação automática rastreável</small></div>
    </section>

    {error && <div className="expansion-error" role="alert"><b>!</b><span>{error}</span><button onClick={() => setError("")}>×</button></div>}

    <section className="expansion-monthly">
      <header><div><span>META INTERNA · {data.targets.month.split("-").reverse().join("/")}</span><h2>Ganho mensal de cobertura</h2></div><div><strong>{data.metrics.progressPercent}%</strong><small>maturidade ponderada da fila</small></div></header>
      <div className="expansion-target-grid">{targetCards.map(([label, key, detail]) => {
        const actual = data.metrics.actual[key]; const target = data.targets[key]; const percent = Math.min(100, Math.round(actual / target * 100));
        return <article key={key}><span>{label}</span><p><strong>{actual}</strong><small>/ {target}</small></p><div><i style={{ width: `${percent}%` }} /></div><em>{data.metrics.gaps[key] ? `faltam ${data.metrics.gaps[key]} · ${detail}` : `meta atingida · ${detail}`}</em></article>;
      })}</div>
    </section>

    <section className="expansion-funnel">
      {stageOrder.map((stage, index) => <div key={stage}><span>{String(index + 1).padStart(2, "0")}</span><p><b>{data.stageLabels[stage]}</b><small>{data.metrics.counts[stage]} itens</small></p>{index < stageOrder.length - 1 && <i>→</i>}</div>)}
    </section>

    <section className="expansion-workspace">
      <div className="expansion-queue">
        <header><div><span>FILA PRIORIZADA</span><h2>Próximas evidências</h2></div><b>{queue.length} itens</b></header>
        <nav>{scopes.map((item) => <button key={item} className={scope === item ? "active" : ""} onClick={() => setScope(item)}>{scopeLabels[item]}</button>)}</nav>
        <div className="expansion-queue-list">{queue.slice(0, 40).map((item, index) => <button key={item.code} className={selected?.code === item.code ? "active" : ""} onClick={() => { setSelectedCode(item.code); setEvidenceNote(""); setEvidenceReference(""); setGatesAcknowledged(false); }}>
          <span>{String(index + 1).padStart(2, "0")}</span><p><b>{item.title}</b><small>{item.code} · {item.jurisdiction}</small></p><em>{data.stageLabels[item.stage]}</em><i>›</i>
        </button>)}</div>
      </div>

      <aside className="expansion-inspector">{selected && targetStage ? <>
        <header><span>{scopeLabels[selected.scope]} · PRIORIDADE {selected.priorityScore}</span><h2>{selected.title}</h2><p>{selected.code} · {selected.jurisdiction}</p></header>
        <div className="expansion-transition"><span>{data.stageLabels[selected.stage]}</span><i>→</i><strong>{data.stageLabels[targetStage]}</strong></div>
        <div className="expansion-gates"><b>Portões obrigatórios do pacote</b>{selected.gates.map((gate) => <span key={gate}>○ {gate}</span>)}</div>
        <details><summary>Bloqueios conhecidos ({selected.blockers.length})</summary>{selected.blockers.map((blocker) => <p key={blocker}>• {blocker}</p>)}</details>
        {selected.sourceUrl && <a className="expansion-source" href={selected.sourceUrl} target="_blank" rel="noreferrer"><span>FONTE CONECTADA</span><b>{selected.sourceTitle ?? selected.sourceUrl}</b><small>{selected.sourceUrl} ↗</small></a>}
        <form onSubmit={advance}>
          {automaticRun ? <div className="expansion-auto-run"><b>Execução no servidor</b><p>Ao continuar, a plataforma reexecuta toda a bateria determinística e grava a versão e o hash da evidência. Nenhum campo manual libera esse estado.</p></div> : <>
            <label>Referência verificável<input value={evidenceReference} onChange={(event) => setEvidenceReference(event.target.value)} placeholder="URL oficial, regra versionada ou conjunto de testes" /></label>
            <label>Memória da evidência<textarea value={evidenceNote} onChange={(event) => setEvidenceNote(event.target.value)} placeholder="Descreva a fonte, vigência, fatos e exceções encontrados." rows={4} /></label>
            <label className="expansion-check"><input type="checkbox" checked={gatesAcknowledged} onChange={(event) => setGatesAcknowledged(event.target.checked)} /><span>Conferi os critérios aplicáveis e aceito o registro imutável do hash desta evidência.</span></label>
          </>}
          <button disabled={!canAdvance || busy || (!automaticRun && (evidenceNote.trim().length < 30 || evidenceReference.trim().length < 4 || !gatesAcknowledged))}>{!canAdvance ? "Papel sem permissão" : busy ? "Executando controles…" : automaticRun ? "Executar verificação automática" : `Avançar para ${data.stageLabels[targetStage]}`}</button>
        </form>
      </> : <div className="expansion-empty"><span>✓</span><h3>Nenhum item preparável neste filtro</h3><p>Itens verificados ficam versionados e exigem nova execução quando a base muda.</p></div>}</aside>
    </section>

    <section className="expansion-audit"><header><div><span>TRILHA RECENTE</span><h2>Evidências versionadas</h2></div><p>{data.policy.statement}</p></header>{data.events.length ? <div>{data.events.slice(0, 12).map((event) => <article key={event.id}><span>#{event.evidenceHash?.slice(0, 10) ?? "sem-hash"}</span><p><b>{event.itemCode}</b><small>{event.evidenceNote}</small></p><strong>{data.stageLabels[event.fromStage]} → {data.stageLabels[event.toStage]}</strong><time>{new Date(event.createdAt).toLocaleString("pt-BR")}</time></article>)}</div> : <div className="expansion-no-events">A trilha será preenchida ao registrar a primeira evidência e a primeira execução automática.</div>}</section>
  </div>;
}

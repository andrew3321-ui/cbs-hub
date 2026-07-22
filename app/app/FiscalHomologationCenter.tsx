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

type AutomaticCase = {
  code: string;
  title: string;
  moduleLabel: string;
  profile: string;
  scenario: string;
  operationPeriod: string;
  kind: "calculated_reference" | "expected_block";
  status: "automatically_verified" | "blocked";
  outputStatus: string;
  summary: string;
  checksPassed: number;
  checksTotal: number;
  sourceCount: number;
  officialSourceCount: number;
  blockers: string[];
  controls: Array<{ code: string; label: string; passed: boolean }>;
  expectedConclusion: string;
};

type AssurancePayload = {
  version: string;
  simulationVersion: string;
  baseHash: string;
  checkedAt: string;
  policy: { automation: string; humanReviewRequired: false; professionalOpinion: false; statement: string; controls: string[] };
  cases: AutomaticCase[];
  metrics: { total: number; automaticallyVerified: number; blocked: number; calculatedReferences: number; expectedBlocks: number; officialSources: number; distinctModules: number };
  context: { workspaceType: "individual" | "office"; role: string };
};

function checkedAtLabel(value?: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export default function FiscalHomologationCenter({ candidate }: { candidate: Candidate | null }) {
  const [data, setData] = useState<AssurancePayload | null>(null);
  const [selectedCode, setSelectedCode] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/fiscal-homologations", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json() as AssurancePayload & { error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Não foi possível executar a verificação automática.");
        return payload;
      })
      .then((payload) => {
        if (cancelled) return;
        setData(payload);
        setSelectedCode(payload.cases[0]?.code ?? "");
      })
      .catch((cause: Error) => { if (!cancelled) setError(cause.message); });
    return () => { cancelled = true; };
  }, []);

  const selected = useMemo(() => data?.cases.find((item) => item.code === selectedCode) ?? data?.cases[0] ?? null, [data, selectedCode]);
  const candidateReady = Boolean(candidate && candidate.result.completeness.percentage === 100 && candidate.result.clarifications.length === 0 && candidate.result.sources.length > 0 && candidate.result.status !== "blocked");

  return <section className="fiscal-homologation-center automatic-assurance-center" aria-labelledby="homologation-title">
    <div className="homologation-heading">
      <div><span className="eyebrow">VERSÃO 55 · VERIFICAÇÃO AUTOMÁTICA</span><h2 id="homologation-title">A plataforma testa a própria base, sem pedir trabalho ao cliente</h2><p>O servidor reexecuta cenários sintéticos, compara os resultados com expectativas versionadas e bloqueia respostas quando os fatos mínimos não estão presentes.</p></div>
      <span className="homologation-mode">{data?.context.workspaceType === "office" ? "Escritório · controle automático" : "Independente · controle automático"}</span>
    </div>

    <div className="homologation-trust-line automatic">
      <b>Verificação automática ≠ parecer profissional</b>
      <span>{data?.policy.statement ?? "O sistema só afirma o que consegue provar por execução, evidência e integridade."}</span>
    </div>

    <div className="homologation-metrics automatic-metrics">
      <article className="positive"><span>Verificados</span><strong>{data?.metrics.automaticallyVerified ?? 0}</strong><small>cenários reproduzidos</small></article>
      <article><span>Controles</span><strong>{data?.metrics.total ?? 0}</strong><small>casos na bateria</small></article>
      <article><span>Bloqueios seguros</span><strong>{data?.metrics.expectedBlocks ?? 0}</strong><small>faltas de fatos testadas</small></article>
      <article><span>Referências</span><strong>{data?.metrics.calculatedReferences ?? 0}</strong><small>cálculos esperados</small></article>
      <article><span>Módulos</span><strong>{data?.metrics.distinctModules ?? 0}</strong><small>recortes exercitados</small></article>
    </div>

    <section className="automatic-assurance-policy" aria-label="Controles aplicados">
      <div><small>BASE CONTROLADA</small><b>#{data?.baseHash.slice(0, 16) ?? "carregando"}</b><span>{data ? `Executada em ${checkedAtLabel(data.checkedAt)}` : "Executando no servidor…"}</span></div>
      <div><small>O QUE O SISTEMA CONFERE</small><p>{data?.policy.controls.map((control) => <span key={control}>✓ {control}</span>)}</p></div>
    </section>

    {candidate && <section className={`automatic-query-status ${candidateReady ? "ready" : "blocked"}`}>
      <div><small>CONSULTA ATUAL</small><b>{candidate.question}</b><span>{candidate.result.topicCode} · {candidate.result.completeness.percentage}% dos fatos · {candidate.result.sources.length} fontes aplicadas</span></div>
      <p>{candidateReady ? "A resposta contém os fatos e fontes mínimos do recorte. Ainda assim, a bateria automática valida o motor e as regras versionadas — não confirma documentos ou fatos particulares de um contribuinte." : "A resposta permanece bloqueada até que todos os fatos obrigatórios e fontes aplicáveis estejam presentes."}</p>
    </section>}

    {error && <div className="homologation-message error" role="alert">{error}</div>}

    <details className="homologation-simulation-suite" open>
      <summary>
        <div><small>BATERIA {data?.simulationVersion ?? "V55"} · DADOS FICTÍCIOS</small><b>Resultado dos cenários de referência</b><span>Não há cadastro de contribuinte, assinatura humana nem aprovação manual nesta etapa.</span></div>
        <strong>{data?.metrics.automaticallyVerified ?? 0}/{data?.metrics.total ?? 0}<small>verificados</small></strong>
      </summary>
      <div className="simulation-policy"><b>Critério de aprovação</b><span>Um cenário só fica verde se todos os valores e bloqueios esperados forem reproduzidos, houver fonte rastreável e ao menos uma origem pública oficial identificada.</span></div>
      <div className="simulation-case-grid automatic-case-grid">
        {data?.cases.map((item) => <button className={`${item.status} ${selected?.code === item.code ? "active" : ""}`} type="button" key={item.code} onClick={() => setSelectedCode(item.code)}>
          <header><span>{item.moduleLabel}</span><i className={item.kind}>{item.kind === "expected_block" ? "BLOQUEIO ESPERADO" : "CÁLCULO ESPERADO"}</i></header>
          <h3>{item.title}</h3>
          <p><b>{item.profile}</b>{item.scenario}</p>
          <div className="simulation-result"><span>{item.status === "automatically_verified" ? "✓ Verificado automaticamente" : "× Controle bloqueado"}</span><b>{item.checksPassed}/{item.checksTotal} testes</b><small>{item.sourceCount} fontes · {item.officialSourceCount} públicas · {item.operationPeriod}</small></div>
        </button>)}
      </div>
    </details>

    <section className="automatic-case-detail" aria-live="polite">
      {!selected ? <p>Carregando a bateria de verificação…</p> : <>
        <div className="automatic-case-head"><div><span className={selected.status}>{selected.status === "automatically_verified" ? "VERIFICADO AUTOMATICAMENTE" : "BLOQUEADO"}</span><h3>{selected.title}</h3><p>{selected.summary}</p></div><code>{selected.code}</code></div>
        <div className="automatic-control-grid">
          {selected.controls.map((control) => <article className={control.passed ? "passed" : "failed"} key={control.code}><b>{control.passed ? "✓" : "!"}</b><span>{control.label}</span></article>)}
        </div>
        {selected.blockers.length > 0 && <div className="automatic-blockers"><b>Bloqueios exercitados pelo cenário</b>{selected.blockers.map((blocker) => <span key={blocker}>{blocker}</span>)}</div>}
        <div className="automatic-expectation"><small>CONCLUSÃO DE REFERÊNCIA</small><p>{selected.expectedConclusion}</p><span>Esta conclusão é a expectativa do caso sintético. O resultado de uma empresa real depende das suas notas, enquadramento, período, exceções e legislação vigente.</span></div>
      </>}
    </section>
  </section>;
}

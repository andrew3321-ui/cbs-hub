"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Status = "supported" | "partial" | "not_supported";
type StateRow = { uf: string; name: string; region: string; status: Status; officialPortal: string; supported: string[]; blockers: string[] };
type CityRow = { ibgeCode: string; city: string; uf: string; status: Status; rangeBps: [number, number]; depth: "structured" | "catalogued"; officialSourceCodes: string[]; structuredAt: string | null; supported: string[]; blockers: string[] };
type Segment = { code: string; name: string; status: Status; routes: string[]; supported: string[]; blockers: string[] };
type Scenario = { code: string; tax: string; title: string; status: Status; supported: string[]; blockers: string[] };
type IssDeepProfile = { code: string; ibgeCode: string; city: string; uf: string; stage: "structured"; sourceCodes: string[]; supportedOutputs: string[]; hardStops: string[]; placeOfIncidence: { generalRule: string; requiredFacts: string[] }; withholding: { conclusion: "requires_facts"; requiredFacts: string[] } };
type IssDeepSource = { code: string; title: string; publisher: string; url: string; checkedAt: string; kind: "municipal_law" | "rate_table" | "operational_guidance" };
type Coverage = { version: string; checkedAt: string; fingerprint: string; metrics: { states: number; cities: number; deepIssCities: number; stSegments: number; recurringScenarios: number; supported: number; partial: number; notSupported: number; sourceCount: number }; states: StateRow[]; cities: CityRow[]; issDeep: { metrics: { structuredCities: number; officialSources: number; testedCities: number; professionallyApprovedCities: number; automaticHomologation: false }; profiles: IssDeepProfile[]; sources: IssDeepSource[]; policy: string }; stSegments: Segment[]; recurringScenarios: Scenario[]; sources: Array<{ code: string; title: string; publisher: string; url: string }> };
type Governance = { identity: { ruleCode: string; ruleVersion: string; ruleHash: string }; approval: null | { reviewerName: string; professionalRole: string; professionalRegistration: string; decidedAt: string; verified: boolean }; executionEnabled: boolean; canApprove: boolean; error?: string };
type Monitor = { checkedAt: string; previousCheckedAt: string | null; rotation: { offset: number; totalSources: number; cycleDays: number }; metrics: { monitored: number; checkedToday: number; checked: number; unavailable: number; changeSignals: number }; sources: Array<{ code: string; title: string; url: string; status: "checked" | "unavailable"; changed: boolean; lastModified: string | null }>; policy: string; error?: string };
type BatchResult = { batchId: string; metrics: { total: number; accepted: number; warning: number; blocked: number }; items: Array<{ filename: string; documentType: string; status: "accepted" | "warning" | "blocked"; sourceHash: string; issues: string[]; summary: Record<string, string | number | boolean | null> }>; message: string; error?: string };

const statusLabel: Record<Status, string> = { supported: "Suportado", partial: "Parcial", not_supported: "Não suportado" };
const tabs = ["panorama", "icms", "iss", "federal", "documents", "governance"] as const;
type Tab = typeof tabs[number];

async function json<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const payload = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Não foi possível concluir a operação.");
  return payload;
}

function StatusPill({ status }: { status: Status }) {
  return <span className={`coverage-status ${status}`}><i />{statusLabel[status]}</span>;
}

export default function NationalCoverageCenter() {
  const [coverage, setCoverage] = useState<Coverage | null>(null);
  const [governance, setGovernance] = useState<Governance | null>(null);
  const [monitor, setMonitor] = useState<Monitor | null>(null);
  const [tab, setTab] = useState<Tab>("panorama");
  const [cityQuery, setCityQuery] = useState("");
  const [origin, setOrigin] = useState("SP");
  const [destination, setDestination] = useState("MG");
  const [importedQualified, setImportedQualified] = useState(false);
  const [icmsResult, setIcmsResult] = useState<{ rateBps: number | null; reason: string } | null>(null);
  const [registration, setRegistration] = useState("");
  const [professionalRole, setProfessionalRole] = useState("accountant");
  const [declaration, setDeclaration] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [batch, setBatch] = useState<BatchResult | null>(null);

  useEffect(() => {
    void Promise.all([
      json<Coverage>("/api/public/coverage").then(setCoverage),
      json<Governance>("/api/rule-governance").then(setGovernance),
      json<Monitor>("/api/normative-monitor").then(setMonitor),
    ]).catch((cause: Error) => setError(cause.message));
  }, []);

  const cities = useMemo(() => coverage?.cities.filter((item) => `${item.city} ${item.uf}`.toLocaleLowerCase("pt-BR").includes(cityQuery.toLocaleLowerCase("pt-BR"))) ?? [], [coverage, cityQuery]);
  const issDeepProfiles = useMemo(() => new Map(coverage?.issDeep.profiles.map((item) => [item.ibgeCode, item]) ?? []), [coverage]);
  const issDeepSources = useMemo(() => new Map(coverage?.issDeep.sources.map((item) => [item.code, item]) ?? []), [coverage]);

  const calculateIcms = async (event: FormEvent) => {
    event.preventDefault(); setBusy("icms"); setError(""); setIcmsResult(null);
    try {
      const payload = await json<{ result: { rateBps: number | null; reason: string } }>("/api/national-coverage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ origin, destination, importedQualified }) });
      setIcmsResult(payload.result);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Cálculo bloqueado."); }
    finally { setBusy(""); }
  };

  const approve = async (event: FormEvent) => {
    event.preventDefault(); if (!governance) return; setBusy("approval"); setError("");
    try {
      setGovernance(await json<Governance>("/api/rule-governance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ professionalRole, professionalRegistration: registration, declarationAccepted: declaration, ruleHash: governance.identity.ruleHash }) }));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Aprovação não registrada."); }
    finally { setBusy(""); }
  };

  const importBatch = async (event: FormEvent) => {
    event.preventDefault(); if (!files.length) return; setBusy("batch"); setError(""); setBatch(null);
    const form = new FormData(); files.forEach((file) => form.append("files", file));
    try { setBatch(await json<BatchResult>("/api/fiscal-imports", { method: "POST", body: form })); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Lote recusado."); }
    finally { setBusy(""); }
  };

  if (!coverage) return <section className="coverage-loading"><span className="loading-spinner" /><div><b>Montando o mapa tributário nacional…</b><p>As regras e os limites estão sendo conferidos.</p></div></section>;

  return <div className="national-coverage-center">
    <section className="coverage-hero">
      <div><span>VERSÃO 52 · ISS MUNICIPAL PROFUNDO</span><h1>O que o Margem Clara realmente suporta</h1><p>ICMS, ST, ISS, tributos federais, Reforma, documentos e mudanças normativas em uma matriz pública — sem esconder os cenários ainda parciais.</p></div>
      <div className="coverage-hero-proof"><small>BASE VERSIONADA</small><b>#{coverage.fingerprint}</b><span>{new Date(`${coverage.checkedAt}T12:00:00`).toLocaleDateString("pt-BR")}</span></div>
    </section>

    {error && <div className="coverage-error" role="alert"><span>!</span>{error}<button onClick={() => setError("")}>×</button></div>}

    <section className="coverage-kpis">
      <article><span>ICMS geral</span><strong>{coverage.metrics.states}/27</strong><small>UFs mapeadas</small></article>
      <article><span>ISS profundo</span><strong>{coverage.metrics.deepIssCities}/25</strong><small>{coverage.metrics.cities} municípios indexados</small></article>
      <article><span>ST prioritária</span><strong>{coverage.metrics.stSegments}</strong><small>segmentos controlados</small></article>
      <article><span>Cenários federais</span><strong>{coverage.metrics.recurringScenarios}</strong><small>rotinas recorrentes</small></article>
      <article className={governance?.executionEnabled ? "ready" : "locked"}><span>Execução</span><strong>{governance?.executionEnabled ? "Liberada" : "Bloqueada"}</strong><small>{governance?.executionEnabled ? "aprovação íntegra" : "aguarda profissional"}</small></article>
    </section>

    <nav className="coverage-tabs" aria-label="Áreas da cobertura">
      {tabs.map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{({ panorama: "Panorama", icms: "ICMS + ST", iss: "ISS", federal: "Federais + Reforma", documents: "Importação em lote", governance: "Monitor + aprovação" } as Record<Tab, string>)[item]}</button>)}
    </nav>

    {tab === "panorama" && <section className="coverage-panorama">
      <div className="coverage-legend"><div><StatusPill status="supported" /><p><b>Suportado</b><span>Regra testada e apta após aprovação.</span></p></div><div><StatusPill status="partial" /><p><b>Parcial</b><span>Triagem útil, conclusão bloqueada.</span></p></div><div><StatusPill status="not_supported" /><p><b>Não suportado</b><span>Identifica o tema sem calcular.</span></p></div></div>
      <div className="coverage-summary-grid">
        <article><span>27</span><h3>Estados e Distrito Federal</h3><p>Rotas interestaduais nacionais e acesso direto ao portal oficial de cada UF.</p><b>Todos parciais até homologar alíquota interna, produto e exceções.</b></article>
        <article><span>{coverage.metrics.deepIssCities}</span><h3>ISS profundo estruturado</h3><p>Fontes municipais, classificadores, incidência, retenção e portão da alíquota exata.</p><b>Estruturado ainda não significa testado ou homologado.</b></article>
        <article><span>8</span><h3>Segmentos de ST</h3><p>Autopeças avança com rota profunda SP→MG; demais funis já exigem NCM/CEST e fatos.</p><b>Protocolos por rota ainda são homologados individualmente.</b></article>
        <article><span>Diário</span><h3>Monitor de fontes</h3><p>A primeira abertura do dia confere um lote rotativo de fontes primárias e compara cada uma com sua captura anterior.</p><b>O ciclo completo preserva recursos e nenhum sinal altera regra automaticamente.</b></article>
      </div>
      <div className="coverage-public-note"><span>INDICADOR PÚBLICO</span><p>Esta mesma matriz pode ser consultada sem login em <code>/api/public/coverage</code>. Clientes e parceiros conseguem verificar o que é suportado antes de confiar uma operação à plataforma.</p></div>
    </section>}

    {tab === "icms" && <section className="coverage-two-columns">
      <div className="coverage-column">
        <div className="coverage-section-heading"><span>27 UFs</span><h2>ICMS geral nacional</h2><p>A alíquota interestadual é resolvida somente com fatos explícitos; a interna permanece bloqueada até conferência estadual.</p></div>
        <form className="icms-reference-form" onSubmit={calculateIcms}>
          <label>Origem<select value={origin} onChange={(event) => setOrigin(event.target.value)}>{coverage.states.map((item) => <option key={item.uf}>{item.uf}</option>)}</select></label>
          <span>→</span>
          <label>Destino<select value={destination} onChange={(event) => setDestination(event.target.value)}>{coverage.states.map((item) => <option key={item.uf}>{item.uf}</option>)}</select></label>
          <label className="qualified-import"><input type="checkbox" checked={importedQualified} onChange={(event) => setImportedQualified(event.target.checked)} />Mercadoria cumpre os requisitos da Resolução 13/2012</label>
          <button disabled={busy === "icms"}>{busy === "icms" ? "Conferindo…" : "Obter referência"}</button>
        </form>
        {icmsResult && <div className="icms-reference-result"><span>REFERÊNCIA INTERESTADUAL</span><strong>{icmsResult.rateBps === null ? "Bloqueada" : `${(icmsResult.rateBps / 100).toFixed(0)}%`}</strong><p>{icmsResult.reason}</p><small>Não calcula DIFAL, ST, FCP ou imposto líquido.</small></div>}
        <div className="state-matrix">{coverage.states.map((item) => <a href={item.officialPortal} target="_blank" rel="noreferrer" key={item.uf}><b>{item.uf}</b><span>{item.name}</span><StatusPill status={item.status} /><i>↗</i></a>)}</div>
      </div>
      <div className="coverage-column">
        <div className="coverage-section-heading"><span>SEGMENTOS PRIORITÁRIOS</span><h2>Substituição tributária profunda</h2><p>Cada segmento informa com transparência o que já entra na memória e o que ainda bloqueia a conclusão.</p></div>
        <div className="segment-stack">{coverage.stSegments.map((item) => <article key={item.code}><header><div><small>{item.code}</small><h3>{item.name}</h3></div><StatusPill status={item.status} /></header><div><b>Rotas</b><span>{item.routes.join(" · ")}</span></div><details><summary>Ver cobertura e bloqueios</summary><p><b>Suportado agora</b>{item.supported.join(" · ")}</p><p><b>Antes de concluir</b>{item.blockers.join(" · ")}</p></details></article>)}</div>
      </div>
    </section>}

    {tab === "iss" && <section className="iss-coverage">
      <div className="coverage-section-heading"><span>15 PROFUNDOS · 50 MUNICÍPIOS INDEXADOS</span><h2>ISS municipal com fonte e portão de cálculo</h2><p>Quinze capitais e polos já têm pacote municipal estruturado. A plataforma nunca converte a faixa legal de 2% a 5% em alíquota exata sem código do serviço, vigência, local de incidência, retenção e aprovação profissional.</p></div>
      <div className="iss-depth-metrics">
        <article><span>Estruturados</span><strong>{coverage.issDeep.metrics.structuredCities}</strong><small>pacotes municipais profundos</small></article>
        <article><span>Fontes municipais</span><strong>{coverage.issDeep.metrics.officialSources}</strong><small>leis, tabelas e orientações oficiais</small></article>
        <article><span>Testados</span><strong>{coverage.issDeep.metrics.testedCities}</strong><small>aguardam casos de referência</small></article>
        <article><span>Aprovados</span><strong>{coverage.issDeep.metrics.professionallyApprovedCities}</strong><small>nenhuma homologação automática</small></article>
      </div>
      <div className="iss-depth-policy"><b>O que “profundo” quer dizer agora</b><span>fonte oficial conectada · classificador municipal exigido · incidência e retenção estruturadas · cálculo exato bloqueado até evidência e revisão</span></div>
      <div className="city-search"><input value={cityQuery} onChange={(event) => setCityQuery(event.target.value)} placeholder="Buscar cidade ou UF" /><span>{cities.length} cidades</span></div>
      <div className="city-table"><div className="city-table-head"><span>Município</span><span>IBGE</span><span>Faixa nacional</span><span>Profundidade</span></div>{cities.map((item) => {
        const deepProfile = issDeepProfiles.get(item.ibgeCode);
        const sources = deepProfile?.sourceCodes.map((code) => issDeepSources.get(code)).filter((source): source is IssDeepSource => Boolean(source)) ?? [];
        return <details key={item.ibgeCode} className={deepProfile ? "deep" : "catalogued"}><summary><span><b>{item.city}</b><small>{item.uf}</small></span><code>{item.ibgeCode}</code><strong>2%–5%</strong><em className={`iss-depth-badge ${item.depth}`}>{item.depth === "structured" ? "Profundo estruturado" : "Catalogado"}</em></summary><div><p><b>O sistema já organiza:</b> {item.supported.join(" · ")}</p>{deepProfile && <><p><b>Incidência:</b> {deepProfile.placeOfIncidence.generalRule}</p><div className="iss-source-links">{sources.map((source) => <a key={source.code} href={source.url} target="_blank" rel="noreferrer"><span>{source.kind === "municipal_law" ? "LEI" : source.kind === "rate_table" ? "TABELA" : "ORIENTAÇÃO"}</span><b>{source.title}</b><small>{source.publisher} · conferida em {new Date(`${source.checkedAt}T12:00:00`).toLocaleDateString("pt-BR")} ↗</small></a>)}</div></>}<p className="iss-blockers"><b>Conclusão bloqueada por:</b> {item.blockers.join(" · ")}</p></div></details>;
      })}</div>
    </section>}

    {tab === "federal" && <section className="federal-scenario-area">
      <div className="coverage-section-heading"><span>CENÁRIOS RECORRENTES</span><h2>Simples, PIS/Cofins, IRPJ/CSLL e retenções</h2><p>A versão 26 já organiza as obrigações federais; esta camada mostra quais cenários possuem triagem, memória ou bloqueio de apuração.</p></div>
      <div className="federal-scenario-grid">{coverage.recurringScenarios.map((item) => <article key={item.code}><header><span>{item.tax}</span><StatusPill status={item.status} /></header><h3>{item.title}</h3><p><b>Disponível</b>{item.supported.join(" · ")}</p><p><b>Exige confirmação</b>{item.blockers.join(" · ")}</p></article>)}</div>
      <section className="official-calculator-card"><div><span>REFORMA TRIBUTÁRIA</span><h2>Calculadora oficial integrada por encaminhamento seguro</h2><p>Abra o motor oficial da Receita para calcular CBS, IBS e Imposto Seletivo com a mesma versão disponibilizada pela Administração Tributária. O Margem Clara não substitui o resultado por estimativa própria.</p><div><b>O que preservamos</b><span>versão da base · fatos da operação · memória oficial · revisão profissional</span></div></div><a href="https://consumo.tributos.gov.br/servico/calcular-tributos-consumo/calculadora/regime-geral" target="_blank" rel="noreferrer">Abrir calculadora oficial <span>↗</span></a></section>
    </section>}

    {tab === "documents" && <section className="batch-import-area">
      <div className="coverage-section-heading"><span>NF-e · NFS-e · SPED</span><h2>Importação em lote com descarte do arquivo bruto</h2><p>Envie até 25 arquivos por lote. A plataforma identifica o formato, registra hash e manifesto de auditoria e não conserva o XML/TXT bruto.</p></div>
      <form className="batch-drop" onSubmit={importBatch}><label><input type="file" multiple accept=".xml,.txt" onChange={(event) => setFiles(Array.from(event.target.files ?? []).slice(0, 25))} /><span>＋</span><b>Selecionar documentos fiscais</b><small>XML NF-e/NFS-e ou TXT SPED · 5 MB por arquivo · 30 MB por lote</small></label>{files.length > 0 && <div className="batch-selection"><span>{files.length} arquivo(s) selecionado(s)</span><small>{(files.reduce((sum, file) => sum + file.size, 0) / 1_000_000).toFixed(2)} MB</small></div>}<button disabled={!files.length || busy === "batch"}>{busy === "batch" ? "Processando lote…" : "Importar e validar lote"}</button></form>
      {batch && <div className="batch-result"><header><div><span>LOTE REGISTRADO</span><h3>{batch.metrics.total} documentos processados</h3><p>{batch.message}</p></div><div><b>{batch.metrics.accepted}</b><small>aceitos</small><b>{batch.metrics.warning}</b><small>revisar</small><b>{batch.metrics.blocked}</b><small>bloqueados</small></div></header><div>{batch.items.map((item) => <article key={`${item.filename}-${item.sourceHash}`} className={item.status}><span>{item.documentType.toUpperCase()}</span><p><b>{item.filename}</b><small>#{item.sourceHash}</small></p><strong>{item.status === "accepted" ? "Aceito" : item.status === "warning" ? "Revisar" : "Bloqueado"}</strong><details><summary>Detalhes</summary>{item.issues.map((issue) => <small key={issue}>{issue}</small>)}</details></article>)}</div></div>}
    </section>}

    {tab === "governance" && <section className="governance-area">
      <div className="monitor-panel"><div className="coverage-section-heading"><span>MONITOR DIÁRIO ROTATIVO</span><h2>Alterações normativas viram sinal, não regra automática</h2><p>{monitor?.policy ?? "Consultando fontes oficiais…"}</p></div>{monitor && <><div className="monitor-kpis"><span><b>{monitor.metrics.monitored}</b>fontes no ciclo</span><span><b>{monitor.metrics.checked}</b>conferidas hoje</span><span className={monitor.metrics.changeSignals ? "alert" : ""}><b>{monitor.metrics.changeSignals}</b>sinais de mudança</span><span><b>{monitor.metrics.unavailable}</b>indisponíveis hoje</span></div><div className="monitor-list">{monitor.sources.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.code}><span className={source.status}>{source.status === "checked" ? "✓" : "!"}</span><p><b>{source.title}</b><small>{source.changed ? "Conteúdo mudou desde a captura anterior — revisar" : source.status === "checked" ? "Sem sinal confirmado" : "Fonte indisponível nesta captura"}</small></p><em>{source.changed ? "Revisar" : "↗"}</em></a>)}</div><small className="monitor-time">Lote {monitor.metrics.checkedToday} de {monitor.metrics.monitored} fontes · ciclo estimado de {monitor.rotation.cycleDays} dias · última captura {new Date(monitor.checkedAt).toLocaleString("pt-BR")}</small></>}</div>
      <div className="approval-panel"><div className="coverage-section-heading"><span>PORTÃO PROFISSIONAL</span><h2>Aprovação obrigatória da versão</h2><p>Uma regra só pode executar depois que contador ou tributarista aceita a declaração e assina exatamente o hash desta versão.</p></div>{governance?.executionEnabled && governance.approval ? <div className="approval-complete"><span>✓</span><h3>Versão aprovada e íntegra</h3><p>{governance.approval.reviewerName}</p><b>{governance.approval.professionalRegistration}</b><small>{new Date(governance.approval.decidedAt).toLocaleString("pt-BR")} · #{governance.identity.ruleHash}</small></div> : <form onSubmit={approve}><label>Responsabilidade profissional<select value={professionalRole} onChange={(event) => setProfessionalRole(event.target.value)}><option value="accountant">Contador</option><option value="tax_lawyer">Tributarista</option></select></label><label>Registro profissional<input value={registration} onChange={(event) => setRegistration(event.target.value)} placeholder="CRC SP-123456/O-7 ou OAB SP-123456" /></label><label className="approval-declaration"><input type="checkbox" checked={declaration} onChange={(event) => setDeclaration(event.target.checked)} /><span>Declaro que revisei o escopo, as fontes, os bloqueios e os limites da versão <b>{governance?.identity.ruleVersion}</b>. Esta aprovação não transforma itens parciais em suportados.</span></label><button disabled={!governance?.canApprove || !declaration || busy === "approval"}>{!governance?.canApprove ? "Papel sem permissão" : busy === "approval" ? "Assinando…" : "Aprovar versão assinada"}</button><small>Hash completo é validado no servidor; a tela mostra #{governance?.identity.ruleHash ?? "…"}.</small></form>}</div>
    </section>}
  </div>;
}

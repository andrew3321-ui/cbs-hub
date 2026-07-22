"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Status = "supported" | "partial" | "not_supported";
type StateRow = { uf: string; name: string; region: string; status: Status; officialPortal: string; supported: string[]; blockers: string[] };
type CityRow = { ibgeCode: string; city: string; uf: string; status: Status; rangeBps: [number, number]; depth: "structured" | "catalogued"; officialSourceCodes: string[]; structuredAt: string | null; supported: string[]; blockers: string[] };
type Segment = { code: string; name: string; status: Status; routes: string[]; supported: string[]; blockers: string[] };
type StSpMgPackage = { segmentCode: string; segmentName: string; route: "SP-MG"; mgChapter: string; mgChapterTitle: string; sourceUrl: string; sourceTitle: string; checkedAt: string; legalStatus: "calculation_validated" | "legal_gate_structured"; calculationMethod: "mva" | "pmpf_or_mva" | "special_regime" | "depends_on_product"; mandatoryFacts: string[]; representativeRule: null | { cest: string; ncm: string; description: string; mvaOriginalBps: number; agreementCode: string; effectiveFrom: string; sourceExcerpt: string }; blockers: string[] };
type StSpOriginMatrix = { version: string; fingerprint: string; validation: { passed: boolean; errors: string[] }; metrics: { destinations: number; segments: number; structuredCells: number; existingValidatedReferences: number; calculationsBlocked: number; mandatoryFacts: number }; mandatoryFacts: string[]; destinations: Array<{ uf: string; name: string; officialPortal: string; sourceCode: string }>; cells: Array<{ key: string; destination: string; segmentCode: string; status: "structured_blocked" | "existing_validated_reference" }>; policy: string };
type StRepresentativeProduct = { code: string; segmentCode: string; description: string; cest: string; ncm: string[]; warning: string };
type StCalculationValidation = { version: string; fingerprint: string; validation: { passed: boolean; errors: string[] }; metrics: { totalRuns: number; referenceReproduced: number; safelyBlocked: number; failed: number; representativeProducts: number; cementAgreementScoped: number; cementFixedMvaSourced: number; cementDestinationLawMvaPending: number; cementOutsideProtocol: number; cementPriorityStates: number; cementStateSources: number; cementAdjustedMvaTables: number; cementSyntheticReferences: number; autoPartsPriorityRoutes: number; autoPartsActiveAgreementRoutes: number; autoPartsOutsideProtocolRoutes: number; autoPartsSyntheticReferences: number }; runs: Array<{ key: string; productCode: string; status: "reference_reproduced" | "blocked_missing_legal_parameters" | "blocked_missing_destination_parameters" | "blocked_protocol_not_applicable"; missingLegalInputs: string[]; output: null | { destinationTotalCents: number } }>; policy: string };
type StCementSpRoute = { key: string; destination: string; destinationName: string; legalStatus: "agreement_mva_structured" | "agreement_structured_destination_mva_pending" | "not_signatory_to_protocol_11_85"; mvaOriginalBps: number | null; mvaSource: "protocol_fixed_20_percent" | "destination_internal_law_required" | "not_applicable"; calculationStatus: "blocked_destination_parameters" | "blocked_protocol_not_applicable"; missingLegalInputs: string[] };
type StCementSpRoutes = { version: string; fingerprint: string; validation: { passed: boolean; errors: string[] }; metrics: { destinations: number; signatoryRoutes: number; fixedMvaRoutes: number; destinationLawMvaRoutes: number; nonSignatoryRoutes: number; newlyReleasedCalculations: number }; sources: Array<{ title: string; publisher: string; url: string }>; routes: StCementSpRoute[]; policy: string };
type StCementPriorityState = { destination: "RJ" | "ES" | "BA" | "GO" | "MS"; route: string; legalStatus: "synthetic_reference_reproduced" | "state_parameters_structured" | "pmpf_gate_structured"; productScope: string; productExclusions: string[]; mvaOriginalBps: number; publishedAdjustedMvaBpsFor12: number; calculationMethod: "mva_adjusted" | "pmpf_by_gtin_or_mva_fallback"; sourceCodes: string[]; remainingBlockers: string[]; syntheticReference: null | { destinationTotalCents: number } };
type StCementPriorityBatch = { version: string; fingerprint: string; validation: { passed: boolean; errors: string[] }; metrics: { statesInBatch: number; officialStateSources: number; adjustedMvaTablesSourced: number; productExceptionsStructured: number; pmpfGatesStructured: number; syntheticReferencesReproduced: number }; sources: Array<{ code: string; title: string; publisher: string; url: string }>; states: StCementPriorityState[]; policy: string };
type StAutoPartsPriorityRoute = { destination: "RJ" | "PR" | "SC" | "RS" | "GO" | "BA"; route: string; agreementStatus: "protocol_41_active" | "outside_protocol_41"; agreementReason: string; parameterMethod: "protocol_mva" | "destination_internal_mva" | "destination_own_treatment_required"; mvaOriginalBps: number | null; adjustedMvaBpsFor12: number | null; sourceCodes: string[]; remainingBlockers: string[]; syntheticReference: null | { destinationTotalCents: number } };
type StAutoPartsPriorityBatch = { version: string; fingerprint: string; validation: { passed: boolean; errors: string[] }; metrics: { routesInBatch: number; activeAgreementRoutes: number; outsideProtocolRoutes: number; destinationMvaOverrides: number; productIdentitiesFrozen: number; syntheticReferencesReproduced: number; officialSources: number }; sources: Array<{ code: string; title: string; publisher: string; url: string }>; routes: StAutoPartsPriorityRoute[]; policy: string };
type Scenario = { code: string; tax: string; title: string; status: Status; supported: string[]; blockers: string[] };
type IssTechnicalReview = { status: "passed"; reviewerKind: "platform_technical_review"; reviewedAt: string; sourceCatalogReview: "reviewed"; rateReferenceStatus: "located_for_mapping" | "pending_exact_table"; passedChecks: string[]; professionalReview: "pending"; taxHomologation: "pending"; limitation: string };
type IssDeepProfile = { code: string; ibgeCode: string; city: string; uf: string; stage: "structured"; sourceCodes: string[]; supportedOutputs: string[]; hardStops: string[]; technicalReview: IssTechnicalReview; placeOfIncidence: { generalRule: string; requiredFacts: string[] }; withholding: { conclusion: "requires_facts"; requiredFacts: string[] } };
type IssDeepSource = { code: string; title: string; publisher: string; url: string; checkedAt: string; kind: "municipal_law" | "rate_table" | "operational_guidance" };
type IssTechnicalEvidence = IssTechnicalReview & { profileCode: string; ibgeCode: string; evidenceHash: string };
type AutomaticAssurance = { version: string; checkedAt: string; fingerprint?: string; status: "automatically_verified" | "blocked"; professionalOpinion: false; humanReviewRequired: false; statement: string; metrics: { modules: number; modulesPassed: number; totalRuns: number; referenceReproduced: number; safelyBlocked: number; failed: number }; modules: Array<{ code: string; label: string; passed: boolean; errors: string[] }>; errors: string[] };
type Coverage = { version: string; checkedAt: string; fingerprint: string; automaticAssurance: AutomaticAssurance; metrics: { states: number; cities: number; deepIssCities: number; stSegments: number; recurringScenarios: number; supported: number; partial: number; notSupported: number; sourceCount: number }; states: StateRow[]; cities: CityRow[]; issDeep: { metrics: { structuredCities: number; officialSources: number; sourceCatalogReviewedCities: number; technicalGateValidatedCities: number; rateReferenceLocatedCities: number; testedCities: number; professionallyApprovedCities: number; automaticHomologation: false }; profiles: IssDeepProfile[]; sources: IssDeepSource[]; technicalEvidence: IssTechnicalEvidence[]; policy: string }; stSegments: Segment[]; stSpMg: { version: string; fingerprint: string; validation: { passed: boolean; errors: string[] }; metrics: { totalSegments: number; legalGatesStructured: number; calculationsValidated: number; calculationsBlocked: number; officialSources: number }; packages: StSpMgPackage[]; policy: string }; stSpOriginMatrix: StSpOriginMatrix; stRepresentativeProducts: { version: string; fingerprint: string; validation: { passed: boolean; errors: string[] }; source: { title: string; url: string }; products: StRepresentativeProduct[]; policy: string }; stSpCalculationValidation: StCalculationValidation; stCementSpRoutes: StCementSpRoutes; stCementPriorityBatch: StCementPriorityBatch; stAutoPartsPriorityBatch: StAutoPartsPriorityBatch; recurringScenarios: Scenario[]; sources: Array<{ code: string; title: string; publisher: string; url: string }> };
type Governance = { identity: { ruleCode: string; ruleVersion: string; ruleHash: string }; automaticAssurance: AutomaticAssurance; approval: null | { reviewerName: string; professionalRole: string; professionalRegistration: string; decidedAt: string; verified: boolean }; executionEnabled: boolean; professionalApprovalVerified: boolean; professionalApprovalRequiredForReferences: false; canApprove: boolean; error?: string };
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
  const issTechnicalEvidence = useMemo(() => new Map(coverage?.issDeep.technicalEvidence.map((item) => [item.ibgeCode, item]) ?? []), [coverage]);
  const stSpMgPackages = useMemo(() => new Map(coverage?.stSpMg.packages.map((item) => [item.segmentCode, item]) ?? []), [coverage]);
  const spOriginReferenceCount = useMemo(() => new Map(coverage?.stSpOriginMatrix.destinations.map((destination) => [destination.uf, coverage.stSpOriginMatrix.cells.filter((cell) => cell.destination === destination.uf && cell.status === "existing_validated_reference").length]) ?? []), [coverage]);

  const calculateIcms = async (event: FormEvent) => {
    event.preventDefault(); setBusy("icms"); setError(""); setIcmsResult(null);
    try {
      const payload = await json<{ result: { rateBps: number | null; reason: string } }>("/api/national-coverage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ origin, destination, importedQualified }) });
      setIcmsResult(payload.result);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Cálculo bloqueado."); }
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
      <div><span>VERSÃO 64 · GARANTIA AUTOMÁTICA SEM FALSA HOMOLOGAÇÃO</span><h1>O que o Margem Clara realmente suporta</h1><p>ICMS, ST, ISS, tributos federais, Reforma, documentos e mudanças normativas em uma matriz pública — sem esconder os cenários ainda parciais.</p></div>
      <div className="coverage-hero-proof"><small>BASE VERSIONADA</small><b>#{coverage.fingerprint}</b><span>{new Date(`${coverage.checkedAt}T12:00:00`).toLocaleDateString("pt-BR")}</span></div>
    </section>

    {error && <div className="coverage-error" role="alert"><span>!</span>{error}<button onClick={() => setError("")}>×</button></div>}

    <section className="coverage-kpis">
      <article><span>ICMS geral</span><strong>{coverage.metrics.states}/27</strong><small>UFs mapeadas</small></article>
      <article><span>ISS profundo</span><strong>{coverage.metrics.deepIssCities}/25</strong><small>{coverage.metrics.cities} municípios indexados</small></article>
      <article><span>ST prioritária</span><strong>{coverage.metrics.stSegments}</strong><small>segmentos controlados</small></article>
      <article><span>Cenários federais</span><strong>{coverage.metrics.recurringScenarios}</strong><small>rotinas recorrentes</small></article>
      <article className={coverage.automaticAssurance.status === "automatically_verified" ? "ready" : "locked"}><span>Motor técnico</span><strong>{coverage.automaticAssurance.status === "automatically_verified" ? "Verificado" : "Bloqueado"}</strong><small>{coverage.automaticAssurance.metrics.totalRuns} células · {coverage.automaticAssurance.metrics.failed} falhas</small></article>
    </section>

    <nav className="coverage-tabs" aria-label="Áreas da cobertura">
      {tabs.map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{({ panorama: "Panorama", icms: "ICMS + ST", iss: "ISS", federal: "Federais + Reforma", documents: "Importação em lote", governance: "Monitor + garantia" } as Record<Tab, string>)[item]}</button>)}
    </nav>

    {tab === "panorama" && <section className="coverage-panorama">
      <div className="coverage-legend"><div><StatusPill status="supported" /><p><b>Suportado</b><span>Regra testada e apta dentro do escopo indicado.</span></p></div><div><StatusPill status="partial" /><p><b>Parcial</b><span>Triagem útil, conclusão bloqueada.</span></p></div><div><StatusPill status="not_supported" /><p><b>Não suportado</b><span>Identifica o tema sem calcular.</span></p></div></div>
      <div className="coverage-summary-grid">
        <article><span>27</span><h3>Estados e Distrito Federal</h3><p>Rotas interestaduais nacionais e acesso direto ao portal oficial de cada UF.</p><b>Todos parciais até homologar alíquota interna, produto e exceções.</b></article>
        <article><span>{coverage.metrics.deepIssCities}</span><h3>ISS profundo estruturado</h3><p>Fontes municipais, classificadores, incidência, retenção e portão da alíquota exata.</p><b>Estruturado ainda não significa testado ou homologado.</b></article>
        <article><span>{coverage.stSpOriginMatrix.metrics.structuredCells}</span><h3>Matriz ST com origem em SP</h3><p>26 destinos cruzados com 25 segmentos, cada célula com fonte, evidências e bloqueios.</p><b>{coverage.stSpOriginMatrix.metrics.existingValidatedReferences} referências existentes · {coverage.stSpOriginMatrix.metrics.calculationsBlocked} células aguardam aprofundamento.</b></article>
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
        <section className="sp-origin-matrix">
          <header><div><span>ORIGEM SÃO PAULO · {coverage.stSpOriginMatrix.version}</span><b>{coverage.stSpOriginMatrix.metrics.structuredCells} combinações estruturadas</b><p>{coverage.stSpOriginMatrix.policy}</p></div><code>#{coverage.stSpOriginMatrix.fingerprint}</code></header>
          <div className="sp-origin-kpis"><span><strong>{coverage.stSpOriginMatrix.metrics.destinations}</strong> destinos</span><span><strong>{coverage.stSpOriginMatrix.metrics.segments}</strong> segmentos</span><span><strong>{coverage.stSpOriginMatrix.metrics.mandatoryFacts}</strong> fatos obrigatórios</span><span><strong>{coverage.stSpOriginMatrix.metrics.calculationsBlocked}</strong> bloqueadas</span></div>
          <details><summary>Ver as 26 rotas estruturadas</summary><div className="sp-route-grid">{coverage.stSpOriginMatrix.destinations.map((item) => <a href={item.officialPortal} target="_blank" rel="noreferrer" key={item.uf}><b>SP→{item.uf}</b><span>25/25 segmentos</span><small>{spOriginReferenceCount.get(item.uf) ? `${spOriginReferenceCount.get(item.uf)} referências existentes` : "cálculo ainda bloqueado"} · fonte oficial ↗</small></a>)}</div></details>
        </section>
        <section className="auto-parts-priority-batch">
          <header><div><span>AUTOPEÇAS · {coverage.stAutoPartsPriorityBatch.version}</span><b>Seis rotas comerciais sem herdar protocolo revogado</b><p>{coverage.stAutoPartsPriorityBatch.policy}</p></div><code>#{coverage.stAutoPartsPriorityBatch.fingerprint}</code></header>
          <div className="auto-parts-kpis"><span><strong>{coverage.stAutoPartsPriorityBatch.metrics.routesInBatch}</strong> rotas prioritárias</span><span className="active"><strong>{coverage.stAutoPartsPriorityBatch.metrics.activeAgreementRoutes}</strong> no Protocolo 41/08</span><span className="outside"><strong>{coverage.stAutoPartsPriorityBatch.metrics.outsideProtocolRoutes}</strong> fora do protocolo atual</span><span><strong>{coverage.stAutoPartsPriorityBatch.metrics.officialSources}</strong> fontes oficiais</span></div>
          <div className="auto-parts-route-grid">{coverage.stAutoPartsPriorityBatch.routes.map((route) => <article key={route.destination} className={route.agreementStatus}><header><b>SP→{route.destination}</b><span>{route.agreementStatus === "protocol_41_active" ? "ACORDO ATIVO" : "TRATAMENTO PRÓPRIO"}</span></header><strong>{route.syntheticReference ? `Referência sintética ${(route.syntheticReference.destinationTotalCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}` : route.parameterMethod === "destination_internal_mva" ? "MVA da legislação estadual" : "Protocolo 41/08 não aplicável"}</strong><p>{route.agreementReason}</p><small>{route.remainingBlockers.length} verificações impedem uso em operação real</small></article>)}</div>
          <div className="auto-parts-safety"><b>Leitura correta</b><span>SC, RS e GO estarem fora do protocolo não transforma a operação em isenta. O sistema bloqueia a MVA antiga e exige identificar tributação normal, antecipação, DIFAL ou outro tratamento vigente.</span></div>
          <footer>{coverage.stAutoPartsPriorityBatch.sources.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.code}>{source.title} · {source.publisher} ↗</a>)}</footer>
        </section>
        <section className="cement-route-ledger">
          <header><div><span>CIMENTO SP→BRASIL · {coverage.stCementSpRoutes.version}</span><b>Uma base legal, 26 rotas controladas</b><p>{coverage.stCementSpRoutes.policy}</p></div><code>#{coverage.stCementSpRoutes.fingerprint}</code></header>
          <div className="cement-route-kpis"><span className="scoped"><strong>{coverage.stCementSpRoutes.metrics.signatoryRoutes}</strong> rotas no Protocolo 11/85</span><span><strong>{coverage.stCementSpRoutes.metrics.fixedMvaRoutes}</strong> MVA original de 20%</span><span className="pending"><strong>{coverage.stCementSpRoutes.metrics.destinationLawMvaRoutes}</strong> MVA na lei do destino</span><span className="outside"><strong>{coverage.stCementSpRoutes.metrics.nonSignatoryRoutes}</strong> fora deste protocolo</span></div>
          <div className="cement-release-gate"><strong>{coverage.stCementSpRoutes.metrics.newlyReleasedCalculations}</strong><span>novos valores finais liberados</span><p>Alíquota interna, FCP, base alternativa, benefícios e fatos da operação continuam obrigatórios.</p></div>
          <details><summary>Ver enquadramento das 26 rotas</summary><div className="cement-route-grid">{coverage.stCementSpRoutes.routes.map((route) => <article key={route.key} className={route.legalStatus}><div><b>SP→{route.destination}</b><span>{route.destinationName}</span></div><strong>{route.mvaSource === "protocol_fixed_20_percent" ? "MVA 20%" : route.mvaSource === "destination_internal_law_required" ? "MVA do destino" : "Protocolo não aplicável"}</strong><small>{route.calculationStatus === "blocked_destination_parameters" ? `${route.missingLegalInputs.length} parâmetros ainda bloqueiam o valor` : "Exige fundamento próprio do Amazonas"}</small></article>)}</div></details>
          <footer>{coverage.stCementSpRoutes.sources.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.url}>{source.title} · {source.publisher} ↗</a>)}</footer>
        </section>
        <section className="cement-priority-batch">
          <header><div><span>LOTE ESTADUAL · {coverage.stCementPriorityBatch.version}</span><b>RJ, ES, BA, GO e MS aprofundados</b><p>{coverage.stCementPriorityBatch.policy}</p></div><code>#{coverage.stCementPriorityBatch.fingerprint}</code></header>
          <div className="cement-priority-kpis"><span><strong>{coverage.stCementPriorityBatch.metrics.statesInBatch}</strong> destinos aprofundados</span><span><strong>{coverage.stCementPriorityBatch.metrics.officialStateSources}</strong> fontes estaduais</span><span><strong>{coverage.stCementPriorityBatch.metrics.adjustedMvaTablesSourced}</strong> tabelas de MVA ajustada</span><span><strong>{coverage.stCementPriorityBatch.metrics.pmpfGatesStructured}</strong> portão de PMPF</span></div>
          <div className="cement-priority-grid">{coverage.stCementPriorityBatch.states.map((state) => <article key={state.destination} className={state.legalStatus}><header><b>SP→{state.destination}</b><span>{state.legalStatus === "synthetic_reference_reproduced" ? "REFERÊNCIA SINTÉTICA" : state.legalStatus === "pmpf_gate_structured" ? "PMPF PRIMEIRO" : "PARÂMETROS ESTADUAIS"}</span></header><strong>{state.calculationMethod === "pmpf_by_gtin_or_mva_fallback" ? "PMPF por GTIN antes da MVA" : `MVA ajustada ${(state.publishedAdjustedMvaBpsFor12 / 100).toFixed(2).replace(".", ",")}%`}</strong>{state.productExclusions.length > 0 && <small>Exclusão: {state.productExclusions.join(" · ")}</small>}<p>{state.syntheticReference ? `Memória sintética reproduzida: ${(state.syntheticReference.destinationTotalCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}` : `${state.remainingBlockers.length} verificações ainda bloqueiam o valor final`}</p></article>)}</div>
          <div className="cement-priority-warning"><b>Controle de segurança</b><span>Somente o RJ possui memória sintética reproduzida nesta versão. Nenhum valor de operação real é concluído sem vigência, produto, base, benefícios, regime e documentos do contribuinte.</span></div>
          <footer>{coverage.stCementPriorityBatch.sources.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.code}>{source.title} · {source.publisher} ↗</a>)}</footer>
        </section>
        <section className="st-validation-ledger">
          <header><div><span>VALIDAÇÃO AUTOMÁTICA · {coverage.stSpCalculationValidation.version}</span><b>{coverage.stSpCalculationValidation.metrics.totalRuns}/650 células executadas</b><p>{coverage.stSpCalculationValidation.policy}</p></div><code>#{coverage.stSpCalculationValidation.fingerprint}</code></header>
          <div><span className="reproduced"><strong>{coverage.stSpCalculationValidation.metrics.referenceReproduced}</strong> referências reproduzidas</span><span className="blocked"><strong>{coverage.stSpCalculationValidation.metrics.safelyBlocked}</strong> bloqueios seguros</span><span><strong>{coverage.stSpCalculationValidation.metrics.failed}</strong> falhas do motor</span><span><strong>{coverage.stSpCalculationValidation.metrics.representativeProducts}</strong> produtos congelados</span></div>
          <details><summary>Ver os 25 produtos representativos</summary><div className="representative-product-grid">{coverage.stRepresentativeProducts.products.map((item) => <article key={item.code}><b>{item.description}</b><span>{item.segmentCode}</span><code>CEST {item.cest}</code><small>NCM {item.ncm.join(" · ")}</small></article>)}</div></details>
        </section>
        <section className="st-sp-mg-assurance">
          <div><span>MATRIZ SP→MG · {coverage.stSpMg.version}</span><b>{coverage.stSpMg.metrics.legalGatesStructured}/25 dossiês legais íntegros</b><p>{coverage.stSpMg.policy}</p></div>
          <div><strong>{coverage.stSpMg.metrics.calculationsValidated}</strong><span>cálculo com regra representativa validada</span><strong>{coverage.stSpMg.metrics.calculationsBlocked}</strong><span>valores finais bloqueados com segurança</span></div>
          <code>#{coverage.stSpMg.fingerprint}</code>
        </section>
        <div className="segment-stack">{coverage.stSegments.map((item) => {
          const legal = stSpMgPackages.get(item.code);
          return <article key={item.code}><header><div><small>{item.code}</small><h3>{item.name}</h3></div><span className={`st-legal-status ${legal?.legalStatus ?? "legal_gate_structured"}`}>{legal?.legalStatus === "calculation_validated" ? "CÁLCULO VALIDADO" : "PORTÃO LEGAL"}</span></header><div><b>Rota controlada</b><span>SP → MG · capítulo {legal?.mgChapter ?? "—"} · {legal?.mgChapterTitle ?? "mapeamento pendente"}</span></div><details><summary>Ver dados legais e bloqueios</summary>{legal && <><p><b>Fonte oficial</b><a href={legal.sourceUrl} target="_blank" rel="noreferrer">{legal.sourceTitle} ↗</a></p><p><b>Fatos obrigatórios ({legal.mandatoryFacts.length})</b>{legal.mandatoryFacts.join(" · ")}</p>{legal.representativeRule && <p><b>Regra representativa validada</b>CEST {legal.representativeRule.cest} · NCM {legal.representativeRule.ncm} · MVA original {(legal.representativeRule.mvaOriginalBps / 100).toFixed(2).replace(".", ",")}% · {legal.representativeRule.agreementCode}</p>}<p><b>Antes de concluir</b>{legal.blockers.join(" · ")}</p></>}</details></article>;
        })}</div>
      </div>
    </section>}

    {tab === "iss" && <section className="iss-coverage">
      <div className="coverage-section-heading"><span>15 PROFUNDOS · 50 MUNICÍPIOS INDEXADOS</span><h2>ISS municipal com fonte e portão de cálculo</h2><p>Quinze capitais e polos já têm pacote municipal estruturado. A plataforma nunca converte a faixa legal de 2% a 5% em alíquota exata sem código do serviço, vigência, local de incidência, retenção e aprovação profissional.</p></div>
      <div className="iss-depth-metrics">
        <article><span>Estruturados</span><strong>{coverage.issDeep.metrics.structuredCities}</strong><small>pacotes municipais profundos</small></article>
        <article className="technical"><span>Portões técnicos</span><strong>{coverage.issDeep.metrics.technicalGateValidatedCities}/15</strong><small>6 contratos reproduzíveis por cidade</small></article>
        <article><span>Referência localizada</span><strong>{coverage.issDeep.metrics.rateReferenceLocatedCities}/15</strong><small>Belém ainda exige tabela exata</small></article>
        <article><span>Fontes municipais</span><strong>{coverage.issDeep.metrics.officialSources}</strong><small>catálogos revisados em 15 cidades</small></article>
        <article><span>Casos fiscais</span><strong>{coverage.issDeep.metrics.testedCities}</strong><small>nenhuma operação real validada</small></article>
        <article><span>Homologados</span><strong>{coverage.issDeep.metrics.professionallyApprovedCities}</strong><small>aguardam contador ou tributarista</small></article>
      </div>
      <div className="iss-technical-round"><div><span>RODADA TÉCNICA CONCLUÍDA</span><b>15/15 pacotes passaram nos contratos do software</b><p>Unicidade, HTTPS oficial catalogado, fatos obrigatórios, faixa de 2%–5%, vínculo da fonte, referência exata e aprovação profissional foram exercitados. Esses testes confirmam o bloqueio seguro; não confirmam a alíquota de uma operação.</p></div><div><strong>0</strong><span>homologações fiscais</span><small>o sistema não atribui assinatura profissional ao desenvolvedor</small></div></div>
      <div className="iss-depth-policy"><b>O que “revisado tecnicamente” quer dizer</b><span>estrutura íntegra · fonte catalogada · bloqueios testados · evidência SHA-256 por cidade · cálculo exato ainda depende de caso fiscal e aprovação profissional</span></div>
      <div className="city-search"><input value={cityQuery} onChange={(event) => setCityQuery(event.target.value)} placeholder="Buscar cidade ou UF" /><span>{cities.length} cidades</span></div>
      <div className="city-table"><div className="city-table-head"><span>Município</span><span>IBGE</span><span>Faixa nacional</span><span>Profundidade</span></div>{cities.map((item) => {
        const deepProfile = issDeepProfiles.get(item.ibgeCode);
        const sources = deepProfile?.sourceCodes.map((code) => issDeepSources.get(code)).filter((source): source is IssDeepSource => Boolean(source)) ?? [];
        const technicalEvidence = issTechnicalEvidence.get(item.ibgeCode);
        return <details key={item.ibgeCode} className={deepProfile ? "deep" : "catalogued"}><summary><span><b>{item.city}</b><small>{item.uf}</small></span><code>{item.ibgeCode}</code><strong>2%–5%</strong><em className={`iss-depth-badge ${item.depth}`}>{item.depth === "structured" ? "Profundo estruturado" : "Catalogado"}</em></summary><div><p><b>O sistema já organiza:</b> {item.supported.join(" · ")}</p>{deepProfile && <><div className="iss-review-state"><span className="passed">✓ Técnico validado · {deepProfile.technicalReview.passedChecks.length}/6</span><span className={deepProfile.technicalReview.rateReferenceStatus === "located_for_mapping" ? "located" : "pending"}>{deepProfile.technicalReview.rateReferenceStatus === "located_for_mapping" ? "Referência de alíquota localizada" : "Tabela exata ainda pendente"}</span><span className="pending">Homologação profissional pendente</span>{technicalEvidence && <code title={technicalEvidence.evidenceHash}>Evidência #{technicalEvidence.evidenceHash.slice(0, 12)}</code>}</div><p><b>Incidência:</b> {deepProfile.placeOfIncidence.generalRule}</p><div className="iss-source-links">{sources.map((source) => <a key={source.code} href={source.url} target="_blank" rel="noreferrer"><span>{source.kind === "municipal_law" ? "LEI" : source.kind === "rate_table" ? "TABELA" : "ORIENTAÇÃO"}</span><b>{source.title}</b><small>{source.publisher} · conferida em {new Date(`${source.checkedAt}T12:00:00`).toLocaleDateString("pt-BR")} ↗</small></a>)}</div></>}<p className="iss-blockers"><b>Conclusão bloqueada por:</b> {item.blockers.join(" · ")}</p></div></details>;
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
      <div className="approval-panel"><div className="coverage-section-heading"><span>GARANTIA EM DUAS CAMADAS</span><h2>Teste automático agora; responsabilidade no caso concreto</h2><p>A base técnica é liberada por controles reproduzíveis. Nenhuma assinatura humana é exigida para consultar referências condicionais ou executar a bateria automática.</p></div>
        <div className={`automatic-assurance-card ${coverage.automaticAssurance.status}`}><span>{coverage.automaticAssurance.status === "automatically_verified" ? "✓" : "!"}</span><div><small>VERIFICAÇÃO AUTOMÁTICA · #{coverage.automaticAssurance.fingerprint}</small><h3>{coverage.automaticAssurance.status === "automatically_verified" ? "Base técnica íntegra" : "Base técnica bloqueada"}</h3><p>{coverage.automaticAssurance.metrics.modulesPassed}/{coverage.automaticAssurance.metrics.modules} módulos · {coverage.automaticAssurance.metrics.totalRuns} células · {coverage.automaticAssurance.metrics.referenceReproduced} referências reproduzidas · {coverage.automaticAssurance.metrics.safelyBlocked} bloqueios seguros</p></div></div>
        <div className="professional-boundary"><span>RESPONSABILIDADE PROFISSIONAL</span><h3>Não é requisito para testar o motor</h3><p>Continua sendo uma camada separada quando um contador ou tributarista assumir, assinar e entregar uma análise de operação real ao cliente. O software não se apresenta como profissional habilitado.</p>{governance?.professionalApprovalVerified && governance.approval ? <small>Revisão adicional registrada por {governance.approval.reviewerName} · {governance.approval.professionalRegistration} · #{governance.identity.ruleHash}</small> : <small>Nenhuma assinatura adicional nesta versão — isso não bloqueia as referências automáticas.</small>}</div>
      </div>
    </section>}
  </div>;
}

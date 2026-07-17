"use client";

import { useEffect, useMemo, useState } from "react";

type Regime = "mei" | "simples" | "presumed" | "real";
type Status = "required" | "conditional" | "monitor" | "not_applicable";
type Category = "regime" | "taxes" | "payroll" | "withholdings" | "sped" | "reform_benefits";
type Profile = { regime: Regime; hasEmployees: boolean; paysIndividuals: boolean; hasServiceWithholdings: boolean; hiresLaborAssignmentOrConstruction: boolean; manufacturesOrImports: boolean; usesListedTaxBenefits: boolean; hasFederalTaxesOutsideUnifiedRegime: boolean; subjectToCprb: boolean; issuesFiscalDocuments: boolean; distributesProfits: boolean; inactive: boolean; keepsFullAccounting: boolean };
type Source = { code: string; title: string; publisher: string; url: string; legalReference: string; checkedAt: string };
type Item = { code: string; category: Category; title: string; cadence: string; deadline: string; purpose: string; action: string; risk: "critical" | "high" | "medium"; sourceCodes: string[]; evidence: string[]; status: Status; reason: string };
type Assessment = { version: string; checkedAt: string; profile: Profile; items: Item[]; applicable: Item[]; metrics: { totalCatalog: number; required: number; conditional: number; monitor: number; excluded: number; critical: number; sourceCount: number }; disclaimer: string };
type ApiResponse = { assessment: Assessment; sources: Source[]; fingerprint: string; error?: string };

const defaultProfile: Profile = { regime: "simples", hasEmployees: true, paysIndividuals: false, hasServiceWithholdings: true, hiresLaborAssignmentOrConstruction: false, manufacturesOrImports: false, usesListedTaxBenefits: false, hasFederalTaxesOutsideUnifiedRegime: false, subjectToCprb: false, issuesFiscalDocuments: true, distributesProfits: true, inactive: false, keepsFullAccounting: true };
const categoryLabels: Record<Category, string> = { regime: "Regime e enquadramento", taxes: "Tributos federais", payroll: "Folha e trabalho", withholdings: "Retenções", sped: "SPED e declarações", reform_benefits: "Reforma e benefícios" };
const statusLabels: Record<Status, string> = { required: "Obrigatória", conditional: "Confirmar", monitor: "Monitorar", not_applicable: "Não aplicável" };
const cadenceLabels: Record<string, string> = { monthly: "Mensal", annual: "Anual", per_event: "Por evento", continuous: "Contínua", quarterly: "Trimestral" };
const booleanQuestions: Array<{ key: Exclude<keyof Profile, "regime">; title: string; hint: string }> = [
  { key: "hasEmployees", title: "Possui empregados", hint: "Folha, eSocial, SST e FGTS" },
  { key: "paysIndividuals", title: "Paga pessoas físicas", hint: "Autônomos e outros rendimentos" },
  { key: "hasServiceWithholdings", title: "Realiza retenções", hint: "IRRF, PIS, Cofins e CSLL" },
  { key: "hiresLaborAssignmentOrConstruction", title: "Cessão/empreitada", hint: "Serviços com trilha previdenciária" },
  { key: "manufacturesOrImports", title: "Industrializa ou importa", hint: "IPI, TIPI e escrituração" },
  { key: "usesListedTaxBenefits", title: "Usa benefício fiscal", hint: "Dirbi e habilitações" },
  { key: "hasFederalTaxesOutsideUnifiedRegime", title: "Tributos fora do DAS", hint: "Débitos federais via MIT" },
  { key: "subjectToCprb", title: "Sujeita à CPRB", hint: "R-2060 e DCTFWeb" },
  { key: "issuesFiscalDocuments", title: "Emite documentos fiscais", hint: "Leiautes CBS/IBS de 2026" },
  { key: "distributesProfits", title: "Distribui lucros", hint: "Contabilidade e EFD-Reinf" },
  { key: "inactive", title: "Sem movimento/inativa", hint: "Dispensa deve ser comprovada" },
  { key: "keepsFullAccounting", title: "Contabilidade completa", hint: "ECD, balanços e lucros" },
];

async function evaluate(profile: Profile) {
  const response = await fetch("/api/federal-pme-compliance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profile }) });
  const payload = await response.json() as ApiResponse;
  if (!response.ok) throw new Error(payload.error ?? "Não foi possível montar o mapa federal.");
  return payload;
}

export default function FederalPmeCompliance() {
  const [profile, setProfile] = useState(defaultProfile);
  const [payload, setPayload] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState<Category | "all">("all");
  const [status, setStatus] = useState<Exclude<Status, "not_applicable"> | "all">("all");
  const [showExcluded, setShowExcluded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    evaluate(defaultProfile).then((result) => { if (!cancelled) setPayload(result); }).catch((cause: Error) => { if (!cancelled) setError(cause.message); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const run = async () => {
    setLoading(true); setError("");
    try { setPayload(await evaluate(profile)); } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível montar o mapa federal."); } finally { setLoading(false); }
  };

  const items = useMemo(() => (showExcluded ? payload?.assessment.items : payload?.assessment.applicable)?.filter((item) => (category === "all" || item.category === category) && (status === "all" || item.status === status)) ?? [], [payload, category, status, showExcluded]);
  const sources = new Map(payload?.sources.map((current) => [current.code, current]) ?? []);

  return <section className="federal-pme-hub" aria-labelledby="federal-pme-title">
    <header className="federal-pme-heading">
      <div><span>VERSÃO 26 · COBERTURA FEDERAL PARA PMEs</span><h2 id="federal-pme-title">Mapa federal essencial por perfil da empresa</h2><p>O sistema cruza regime, folha, retenções, operação e benefícios para mostrar o que deve entrar na rotina — e o que ainda precisa de confirmação profissional.</p></div>
      <div><small>BASE CONFERIDA</small><b>{payload ? new Date(`${payload.assessment.checkedAt}T12:00:00`).toLocaleDateString("pt-BR") : "verificando…"}</b><code>#{payload?.fingerprint ?? "—"}</code></div>
    </header>

    <div className="federal-boundary"><b>Escopo protegido</b><span>Regras federais essenciais para PMEs. ICMS, ISS, obrigações estaduais/municipais, regimes setoriais e situações especiais continuam em trilhas próprias.</span></div>

    <div className="federal-profile-layout">
      <aside className="federal-profile-form">
        <div><small>01 · PERFIL DA EMPRESA</small><h3>Quais fatos mudam a obrigação?</h3><p>Nenhuma regra é marcada como obrigatória apenas pelo nome da empresa ou por aproximação.</p></div>
        <label>Regime tributário<select value={profile.regime} onChange={(event) => setProfile((current) => ({ ...current, regime: event.target.value as Regime }))}><option value="mei">MEI / SIMEI</option><option value="simples">Simples Nacional</option><option value="presumed">Lucro Presumido</option><option value="real">Lucro Real</option></select></label>
        <div className="federal-switch-list">{booleanQuestions.map((question) => <label className={profile[question.key] ? "active" : ""} key={question.key}><input type="checkbox" checked={profile[question.key]} onChange={(event) => setProfile((current) => ({ ...current, [question.key]: event.target.checked }))} /><span><b>{question.title}</b><small>{question.hint}</small></span><i /></label>)}</div>
        <button type="button" disabled={loading} onClick={() => void run()}>{loading ? "Cruzando regras…" : "Atualizar mapa federal"}</button>
      </aside>

      <div className="federal-results">
        {error && <div className="federal-error" role="alert">{error}</div>}
        {payload && <>
          <div className="federal-metrics">
            <article><span>Catálogo federal</span><strong>{payload.assessment.metrics.totalCatalog}</strong><small>controles essenciais</small></article>
            <article className="required"><span>Obrigatórias</span><strong>{payload.assessment.metrics.required}</strong><small>pelo perfil informado</small></article>
            <article className="conditional"><span>Confirmar</span><strong>{payload.assessment.metrics.conditional}</strong><small>dependem de fato adicional</small></article>
            <article><span>Monitorar</span><strong>{payload.assessment.metrics.monitor}</strong><small>controle preventivo</small></article>
            <article><span>Fontes oficiais</span><strong>{payload.assessment.metrics.sourceCount}</strong><small>com vínculo por regra</small></article>
          </div>

          <div className="federal-filters">
            <div><button className={category === "all" ? "active" : ""} onClick={() => setCategory("all")}>Todas</button>{Object.entries(categoryLabels).map(([key, label]) => <button className={category === key ? "active" : ""} onClick={() => setCategory(key as Category)} key={key}>{label}</button>)}</div>
            <div><select aria-label="Filtrar por situação" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="all">Todas as situações</option><option value="required">Obrigatórias</option><option value="conditional">Confirmar</option><option value="monitor">Monitorar</option></select><label><input type="checkbox" checked={showExcluded} onChange={(event) => setShowExcluded(event.target.checked)} />Exibir não aplicáveis ({payload.assessment.metrics.excluded})</label></div>
          </div>

          <div className="federal-obligation-list">{items.map((item) => <article className={`${item.status} risk-${item.risk}`} key={item.code}>
            <div className="federal-obligation-head"><span className="federal-rule-index">{item.code}</span><span className={`federal-rule-status ${item.status}`}>{statusLabels[item.status]}</span><span className="federal-rule-cadence">{cadenceLabels[item.cadence] ?? item.cadence}</span></div>
            <div className="federal-obligation-body"><div><small>{categoryLabels[item.category]}</small><h3>{item.title}</h3><p>{item.purpose}</p></div><div className="federal-deadline"><small>PRAZO/ROTINA</small><b>{item.deadline}</b></div></div>
            <div className="federal-reason"><b>Por que entrou neste mapa</b><span>{item.reason}</span></div>
            <div className="federal-action"><b>Próxima ação</b><span>{item.action}</span></div>
            <details><summary>Ver evidências e fontes</summary><div className="federal-evidence"><section><small>EVIDÊNCIAS PARA GUARDAR</small>{item.evidence.map((entry) => <span key={entry}>✓ {entry}</span>)}</section><section><small>FONTES OFICIAIS VINCULADAS</small>{item.sourceCodes.map((code) => { const current = sources.get(code); return current ? <a href={current.url} target="_blank" rel="noreferrer" key={code}><b>{current.title}</b><span>{current.legalReference}</span></a> : null; })}</section></div></details>
          </article>)}</div>
          {!items.length && <div className="federal-empty">Nenhuma regra corresponde aos filtros atuais.</div>}

          <footer className="federal-disclaimer"><b>Limite de responsabilidade</b><p>{payload.assessment.disclaimer}</p><span>{payload.assessment.version}</span></footer>
        </>}
      </div>
    </div>
  </section>;
}

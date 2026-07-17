"use client";

import { FormEvent, useEffect, useState } from "react";
import FiscalDossierWorkbench from "./FiscalDossierWorkbench";
import FiscalHomologationCenter from "./FiscalHomologationCenter";

type KnowledgeSource = {
  code: string;
  title: string;
  publisher: string;
  url: string;
  legalReference: string;
  checkedAt: string;
  sourceUpdatedAt: string | null;
  primary: boolean;
};

type KnowledgeMeta = {
  code: string;
  version: string;
  name: string;
  status: string;
  scope: string;
  assuranceLevel: string;
  engineVersion: string;
  fingerprint: string;
  checkedAt: string;
  sourceCount: number;
  ruleCount: number;
  classificationCount: number;
  topicCount: number;
};

type TopicMeta = { code: string; tax: string; title: string; coverageLevel: "operational_reference" | "structured_triage"; supportedOutputs: string[]; hardStops: string[]; examples: string[] };

type FiscalResult = {
  status: "out_of_scope" | "needs_information" | "conditional";
  statusLabel: string;
  headline: string;
  summary: string;
  assuranceLevel: string;
  engineVersion: string;
  baseVersion: string;
  facts: Record<string, string | null>;
  factViews: Array<{ key: string; label: string; value: string; source: "question" | "manual" | "default" | "unknown" }>;
  completeness: { known: number; required: number; percentage: number };
  findings: Array<{ code: string; label: string; value: string; detail: string; nature: "own_rate" | "st_scope" | "table_parameter" | "additional_obligation" | "legal_range" | "regime_reference" | "compliance_gate" }>;
  scenarioBranches: Array<{
    code: string;
    label: string;
    value: string;
    condition: string;
    consequence: string;
    status: "baseline" | "exception" | "additional" | "not_applicable";
    sourceCodes: string[];
  }>;
  clarifications: Array<{ field: string; question: string; reason: string }>;
  decisionTrace: Array<{ ruleCode: string; result: "applied" | "blocked" | "not_applicable"; detail: string }>;
  sources: KnowledgeSource[];
  limitations: string[];
  disclaimer: string;
  topicCode: string;
  coverageLevel: "operational_reference" | "structured_triage";
  calculationEligible: boolean;
};

type FactForm = {
  tax: string;
  originState: string;
  destinationState: string;
  productDescription: string;
  ncm: string;
  cest: string;
  productOrigin: string;
  importRuleQualification: string;
  issuerTaxRegime: string;
  recipientTaxpayer: string;
  purpose: string;
  automotiveUse: string;
  specialTreatment: string;
  operationType: string;
  businessActivity: string;
  incomeTaxRegime: string;
  pisCofinsRegime: string;
  serviceItem: string;
  cnae: string;
  originMunicipality: string;
  destinationMunicipality: string;
  payerType: string;
  paymentRecipientType: string;
  serviceNature: string;
};

const emptyFacts: FactForm = {
  tax: "",
  originState: "",
  destinationState: "",
  productDescription: "",
  ncm: "",
  cest: "",
  productOrigin: "",
  importRuleQualification: "",
  issuerTaxRegime: "",
  recipientTaxpayer: "",
  purpose: "",
  automotiveUse: "",
  specialTreatment: "",
  operationType: "",
  businessActivity: "",
  incomeTaxRegime: "",
  pisCofinsRegime: "",
  serviceItem: "",
  cnae: "",
  originMunicipality: "",
  destinationMunicipality: "",
  payerType: "",
  paymentRecipientType: "",
  serviceNature: "",
};

const completeReferenceFacts: FactForm = {
  ...emptyFacts,
  tax: "ICMS",
  originState: "SP",
  destinationState: "MG",
  productDescription: "Partes e acessórios dos veículos automóveis",
  ncm: "8708",
  cest: "01.075.00",
  productOrigin: "domestic",
  importRuleQualification: "",
  issuerTaxRegime: "normal",
  recipientTaxpayer: "yes",
  purpose: "resale",
  automotiveUse: "yes",
  specialTreatment: "none",
};

const defaultQuestion = "Qual a alíquota de ICMS para autopeças de SP para MG?";

const sourceLabels = { question: "extraído da pergunta", manual: "confirmado manualmente", default: "definido pelo sistema", unknown: "pendente" } as const;
const stateOptions = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];

function dateLabel(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR");
}

function buildFacts(form: FactForm) {
  return Object.fromEntries(Object.entries(form).filter(([, value]) => value.trim().length > 0));
}

export default function FiscalIntelligence() {
  const [question, setQuestion] = useState(defaultQuestion);
  const [form, setForm] = useState<FactForm>(emptyFacts);
  const [knowledge, setKnowledge] = useState<KnowledgeMeta | null>(null);
  const [catalogSources, setCatalogSources] = useState<KnowledgeSource[]>([]);
  const [examples, setExamples] = useState<string[]>([]);
  const [topics, setTopics] = useState<TopicMeta[]>([]);
  const [result, setResult] = useState<FiscalResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/fiscal-intelligence")
      .then(async (response) => {
        const data = await response.json() as { error?: string; knowledge?: KnowledgeMeta; sources?: KnowledgeSource[]; examples?: string[]; topics?: TopicMeta[] };
        if (!response.ok || !data.knowledge) throw new Error(data.error ?? "Base indisponível");
        return data;
      })
      .then((data) => {
        if (cancelled) return;
        setKnowledge(data.knowledge ?? null);
        setCatalogSources(data.sources ?? []);
        setExamples(data.examples ?? []);
        setTopics(data.topics ?? []);
      })
      .catch((cause: Error) => !cancelled && setError(cause.message))
      .finally(() => !cancelled && setCatalogLoading(false));
    return () => { cancelled = true; };
  }, []);

  function updateFact(field: keyof FactForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function search(nextQuestion = question, nextForm = form) {
    if (nextQuestion.trim().length < 5) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/fiscal-intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: nextQuestion.trim(), facts: buildFacts(nextForm) }),
      });
      const data = await response.json() as { error?: string; result?: FiscalResult; knowledge?: Pick<KnowledgeMeta, "fingerprint" | "checkedAt"> };
      if (!response.ok || !data.result) throw new Error(data.error ?? "Não foi possível concluir a pesquisa.");
      setResult(data.result);
      setKnowledge((current) => current && data.knowledge ? { ...current, ...data.knowledge } : current);
      const parsed = data.result.facts;
      setForm((current) => {
        const next = { ...current };
        for (const field of Object.keys(next) as Array<keyof FactForm>) {
          const value = parsed[field];
          if (!next[field] && typeof value === "string" && value !== "unknown") next[field] = value;
        }
        return next;
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível concluir a pesquisa.");
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void search();
  }

  function runExample(example: string) {
    setQuestion(example);
    setForm(emptyFacts);
    setResult(null);
    void search(example, emptyFacts);
  }

  function runCompleteReferenceCase() {
    setQuestion(defaultQuestion);
    setForm(completeReferenceFacts);
    setResult(null);
    void search(defaultQuestion, completeReferenceFacts);
  }

  function runTopic(topic: TopicMeta) {
    const nextQuestion = topic.examples[0] ?? `Quero analisar ${topic.title}`;
    const nextForm = { ...emptyFacts, tax: topic.tax };
    setQuestion(nextQuestion);
    setForm(nextForm);
    setResult(null);
    void search(nextQuestion, nextForm);
  }

  const activeTax = String(result?.facts.tax ?? form.tax ?? "");
  const isSpecializedAutoParts = result?.topicCode === "ICMS-SP-MG-AUTO-PARTS";

  return (
    <div className="page-content fiscal-intelligence-page">
      <div className="page-heading intelligence-heading">
        <div>
          <p className="kicker">V24 · INTELIGÊNCIA FISCAL DETERMINÍSTICA</p>
          <h1>Pergunte em linguagem comum. Confira a trilha jurídica.</h1>
          <p>Sem IA generativa: a resposta nasce de fatos estruturados, regras manuais e fontes oficiais versionadas.</p>
        </div>
        <span className="manual-engine-badge"><i /> MOTOR MANUAL · 8 MÓDULOS</span>
      </div>

      <section className="intelligence-scope-strip" aria-label="Cobertura atual da inteligência fiscal">
        <div><span>COBERTURA ATUAL</span><strong>Brasil · {knowledge?.topicCount ?? 8} módulos + especialização SP → MG</strong></div>
        <div><span>BASE</span><strong>{knowledge ? `${knowledge.version} · #${knowledge.fingerprint}` : "verificando…"}</strong></div>
        <div><span>FONTES CONFERIDAS</span><strong>{knowledge ? `${knowledge.sourceCount} · ${dateLabel(knowledge.checkedAt)}` : "—"}</strong></div>
        <div><span>GARANTIA</span><strong>Condicional · revisão humana</strong></div>
      </section>

      {!catalogLoading && topics.length > 0 && <section className="v24-topic-grid" aria-label="Módulos da inteligência fiscal">
        {topics.map((topic) => <button type="button" onClick={() => runTopic(topic)} key={topic.code} className={result?.topicCode === topic.code ? "active" : ""}>
          <span>{topic.tax}</span><strong>{topic.title}</strong><small>{topic.coverageLevel === "operational_reference" ? "Referência operacional" : "Triagem estruturada"}</small><p>{topic.supportedOutputs[0]}</p>
        </button>)}
      </section>}

      <form className="intelligence-search panel" onSubmit={submit}>
        <label htmlFor="fiscal-question">Descreva a operação e a sua dúvida</label>
        <div className="intelligence-search-row">
          <textarea id="fiscal-question" maxLength={500} rows={2} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ex.: qual a alíquota de ICMS para autopeças de SP para MG?" />
          <button className="primary-button" disabled={loading || catalogLoading || question.trim().length < 5}>{loading ? "Analisando…" : "Pesquisar regras"}<span>→</span></button>
        </div>
        <div className="intelligence-examples"><span>TESTAR PERGUNTA:</span>{examples.map((example) => <button type="button" onClick={() => runExample(example)} key={example}>{example}</button>)}<button className="complete-case-button" type="button" onClick={runCompleteReferenceCase}>Preencher caso demonstrativo · 100% dos fatos</button></div>
      </form>

      {error && <div className="intelligence-error" role="alert"><b>Consulta interrompida</b><span>{error}</span></div>}
      {catalogLoading && <section className="panel rules-loading"><span className="loading-spinner" /><div><b>Verificando a base manual…</b><p>Conteúdo, versão e hash estão sendo comparados antes de liberar a pesquisa.</p></div></section>}

      {!catalogLoading && !result && !error && (
        <section className="intelligence-welcome-grid">
          <article className="panel intelligence-welcome-main"><span className="intelligence-shield">§</span><div><small>COMPORTAMENTO SEGURO</small><h2>O sistema não completa lacunas com suposições</h2><p>Escolha um módulo ou escreva a dúvida. Se faltarem NCM, item de serviço, regime, município, finalidade ou outra condição decisiva, o motor bloqueia a conclusão e abre somente os campos relevantes.</p></div></article>
          <article className="panel intelligence-process"><small>COMO DECIDE</small><ol><li><b>1</b><span>Extrai os fatos da pergunta</span></li><li><b>2</b><span>Verifica o recorte suportado</span></li><li><b>3</b><span>Aplica regras sem texto livre</span></li><li><b>4</b><span>Expõe fontes e bloqueios</span></li></ol></article>
        </section>
      )}

      {result && (
        <>
          <section className={`intelligence-result-hero ${result.status}`}>
            <div className="result-assurance"><span className={`result-status ${result.status}`}><i /> {result.statusLabel}</span><code>{result.engineVersion} · base {result.baseVersion}</code></div>
            <div className="result-hero-body"><div><p>MÓDULO {result.topicCode}</p><h2>{result.headline}</h2><span>{result.summary}</span><small className="result-coverage-label">{result.coverageLevel === "operational_reference" ? "Referência operacional" : "Triagem estruturada"} · {result.calculationEligible ? "apto a cálculo condicional" : "sem cálculo definitivo"}</small></div><div className="result-completeness"><strong>{result.completeness.percentage}%</strong><span>fatos mínimos preenchidos</span><small>{result.completeness.known} de {result.completeness.required} · não é garantia jurídica</small></div></div>
            <div className="result-progress"><i style={{ width: `${result.completeness.percentage}%` }} /></div>
          </section>

          {isSpecializedAutoParts ? <FiscalDossierWorkbench question={question} facts={buildFacts(form)} completeness={result.completeness.percentage} /> : <section className="v24-broad-safety-note"><b>Este módulo organiza a revisão; não fecha a apuração.</b><span>As faixas, alíquotas nominais e eventos exibidos precisam ser reconciliados com cadastro, documento fiscal, período e legislação local antes de qualquer entrega ao cliente.</span></section>}

          {result.scenarioBranches.length > 0 && <section className="panel intelligence-scenarios"><div className="panel-heading"><div><span className="eyebrow">MAPA COMPLETO DA PERGUNTA</span><h3>Qual número pode aparecer — e em qual condição</h3><p>A pergunta isolada não define uma única carga. Estes cenários são referências normativas; somente os achados abaixo foram aplicados aos fatos confirmados.</p></div><span>{result.scenarioBranches.length} cenários</span></div><div className="scenario-grid">{result.scenarioBranches.map((scenario) => <article className={scenario.status} key={scenario.code}><small>{scenario.label}</small><strong>{scenario.value}</strong><b>Quando</b><p>{scenario.condition}</p><b>Efeito</b><p>{scenario.consequence}</p><code>{scenario.code}</code></article>)}</div></section>}

          <div className="intelligence-workbench">
            <div className="intelligence-result-column">
              {result.findings.length > 0 && <section className="panel intelligence-findings"><div className="panel-heading"><div><span className="eyebrow">ACHADOS ESTRUTURADOS</span><h3>Faixas, referências e bloqueios sem mistura de conceitos</h3></div><span>{result.findings.length}</span></div><div className="finding-list">{result.findings.map((finding) => <article className={finding.nature} key={finding.code}><span>{finding.nature === "own_rate" ? "%" : finding.nature === "st_scope" ? "ST" : finding.nature === "table_parameter" ? "MVA" : finding.nature === "legal_range" ? "↔" : finding.nature === "regime_reference" ? "§" : finding.nature === "compliance_gate" ? "✓" : "+"}</span><div><small>{finding.label}</small><strong>{finding.value}</strong><p>{finding.detail}</p></div><code>{finding.code}</code></article>)}</div></section>}

              <section className="panel intelligence-facts"><div className="panel-heading"><div><span className="eyebrow">FATOS DA OPERAÇÃO</span><h3>O que o motor realmente considerou</h3></div></div><div className="fact-grid">{result.factViews.filter((fact) => fact.key !== "referenceDate").map((fact) => <article className={fact.source === "unknown" ? "unknown" : ""} key={fact.key}><span>{fact.label}</span><b>{fact.value}</b><small>{sourceLabels[fact.source]}</small></article>)}</div></section>

              <section className="panel decision-trace"><div className="panel-heading"><div><span className="eyebrow">TRILHA DE DECISÃO</span><h3>Regras aplicadas e bloqueadas</h3></div></div>{result.decisionTrace.length ? <div>{result.decisionTrace.map((trace) => <article key={`${trace.ruleCode}-${trace.result}`}><span className={trace.result}>{trace.result === "applied" ? "✓" : trace.result === "blocked" ? "!" : "—"}</span><div><b>{trace.ruleCode}</b><p>{trace.detail}</p></div></article>)}</div> : <p className="empty-trace">Nenhuma regra aplicada fora da cobertura.</p>}</section>
            </div>

            <aside className="panel intelligence-fact-form">
              <div className="fact-form-heading"><span>FICHA DE CONFIRMAÇÃO</span><h3>Complete o que a pergunta não disse</h3><p>Os dados abaixo substituem a extração textual e ficam marcados como confirmação manual.</p></div>
              {result.clarifications.length > 0 && <div className="clarification-summary"><b>{result.clarifications.length} pendência{result.clarifications.length > 1 ? "s" : ""}</b>{result.clarifications.slice(0, 4).map((item) => <span key={item.field}>{item.question}</span>)}</div>}
              <label>Módulo tributário<select value={form.tax || activeTax} onChange={(event) => updateFact("tax", event.target.value)}><option value="">Selecione</option><option value="ICMS">ICMS</option><option value="ISS">ISS</option><option value="IPI">IPI</option><option value="PIS_COFINS">PIS/Cofins</option><option value="SIMPLES">Simples Nacional</option><option value="IRPJ_CSLL">IRPJ/CSLL</option><option value="IBS_CBS">IBS/CBS</option><option value="WITHHOLDINGS">Retenções de serviços</option></select></label>

              {(activeTax === "ICMS" || activeTax === "IPI" || activeTax === "PIS_COFINS" || activeTax === "SIMPLES" || activeTax === "IRPJ_CSLL" || activeTax === "WITHHOLDINGS") && <label>Descrição da operação<input value={form.productDescription} onChange={(event) => updateFact("productDescription", event.target.value)} maxLength={160} placeholder="Mercadoria, serviço ou atividade analisada" /></label>}

              {activeTax === "ICMS" && <>
                <div className="fact-form-pair"><label>UF de origem<select value={form.originState} onChange={(event) => updateFact("originState", event.target.value)}><option value="">Selecione</option>{stateOptions.map((state) => <option value={state} key={state}>{state}</option>)}</select></label><label>UF de destino<select value={form.destinationState} onChange={(event) => updateFact("destinationState", event.target.value)}><option value="">Selecione</option>{stateOptions.map((state) => <option value={state} key={state}>{state}</option>)}</select></label></div>
                <div className="fact-form-pair"><label>NCM<input inputMode="numeric" value={form.ncm} onChange={(event) => updateFact("ncm", event.target.value)} maxLength={12} placeholder="8421.31.00" /></label><label>CEST<input inputMode="numeric" value={form.cest} onChange={(event) => updateFact("cest", event.target.value)} maxLength={10} placeholder="01.041.00" /></label></div>
                <label>Origem da mercadoria<select value={form.productOrigin} onChange={(event) => updateFact("productOrigin", event.target.value)}><option value="">Selecione</option><option value="domestic">Nacional</option><option value="imported">Importada</option></select></label>
                {form.productOrigin === "imported" && <label>Regra da Resolução 13/2012<select value={form.importRuleQualification} onChange={(event) => updateFact("importRuleQualification", event.target.value)}><option value="">Precisa conferir</option><option value="qualifies">Enquadra-se na regra de 4%</option><option value="does_not_qualify">Não se enquadra na regra de 4%</option></select></label>}
                <label>Destinatário<select value={form.recipientTaxpayer} onChange={(event) => updateFact("recipientTaxpayer", event.target.value)}><option value="">Selecione</option><option value="yes">Contribuinte do ICMS</option><option value="no">Não contribuinte</option></select></label>
                <label>Finalidade<select value={form.purpose} onChange={(event) => updateFact("purpose", event.target.value)}><option value="">Selecione</option><option value="resale">Revenda</option><option value="industrialization">Industrialização</option><option value="use_consumption">Uso ou consumo</option><option value="fixed_asset">Ativo imobilizado</option></select></label>
                {isSpecializedAutoParts && <label>Uso especificamente automotivo<select value={form.automotiveUse} onChange={(event) => updateFact("automotiveUse", event.target.value)}><option value="">Selecione</option><option value="yes">Sim</option><option value="no">Não</option></select></label>}
              </>}

              {activeTax === "ISS" && <>
                <label>Descrição do serviço<input value={form.productDescription} onChange={(event) => updateFact("productDescription", event.target.value)} maxLength={160} placeholder="Ex.: consultoria empresarial" /></label>
                <label>Item da LC 116<input value={form.serviceItem} onChange={(event) => updateFact("serviceItem", event.target.value)} maxLength={12} placeholder="Ex.: 17.01" /></label>
                <div className="fact-form-pair"><label>Município do prestador<input value={form.originMunicipality} onChange={(event) => updateFact("originMunicipality", event.target.value)} maxLength={80} /></label><label>Município devido<input value={form.destinationMunicipality} onChange={(event) => updateFact("destinationMunicipality", event.target.value)} maxLength={80} /></label></div>
              </>}

              {activeTax === "IPI" && <>
                <label>NCM completo<input inputMode="numeric" value={form.ncm} onChange={(event) => updateFact("ncm", event.target.value)} maxLength={12} placeholder="8 dígitos" /></label>
                <label>Tipo da operação<select value={form.operationType} onChange={(event) => updateFact("operationType", event.target.value)}><option value="">Selecione</option><option value="goods">Saída de mercadoria</option><option value="import">Importação</option><option value="export">Exportação</option></select></label>
              </>}

              {activeTax === "PIS_COFINS" && <label>Regime de PIS/Cofins<select value={form.pisCofinsRegime} onChange={(event) => updateFact("pisCofinsRegime", event.target.value)}><option value="">Selecione</option><option value="cumulative">Cumulativo</option><option value="non_cumulative">Não cumulativo</option><option value="monophase">Monofásico</option><option value="zero_rate">Alíquota zero</option></select></label>}

              {(activeTax === "SIMPLES" || activeTax === "IRPJ_CSLL") && <>
                <label>CNAE principal ou atividade<input value={form.cnae} onChange={(event) => updateFact("cnae", event.target.value)} maxLength={16} placeholder="Ex.: 6201-5/01" /></label>
                <label>Tipo de atividade<select value={form.businessActivity} onChange={(event) => updateFact("businessActivity", event.target.value)}><option value="">Selecione</option><option value="commerce">Comércio</option><option value="industry">Indústria</option><option value="service">Serviço</option><option value="mixed">Mista</option></select></label>
              </>}

              {activeTax === "IRPJ_CSLL" && <label>Regime de IRPJ/CSLL<select value={form.incomeTaxRegime} onChange={(event) => updateFact("incomeTaxRegime", event.target.value)}><option value="">Selecione</option><option value="real">Lucro Real</option><option value="presumed">Lucro Presumido</option><option value="simples">Simples Nacional</option></select></label>}

              {activeTax === "IBS_CBS" && <>
                <label>Tipo da operação<select value={form.operationType} onChange={(event) => updateFact("operationType", event.target.value)}><option value="">Selecione</option><option value="goods">Mercadoria</option><option value="service">Serviço</option><option value="import">Importação</option><option value="export">Exportação</option><option value="mixed">Mista</option></select></label>
                <label>Atividade<select value={form.businessActivity} onChange={(event) => updateFact("businessActivity", event.target.value)}><option value="">Selecione</option><option value="commerce">Comércio</option><option value="industry">Indústria</option><option value="service">Serviço</option><option value="mixed">Mista</option></select></label>
              </>}

              {activeTax === "WITHHOLDINGS" && <>
                <label>Pagador<select value={form.payerType} onChange={(event) => updateFact("payerType", event.target.value)}><option value="">Selecione</option><option value="private_legal_entity">Pessoa jurídica privada</option><option value="public_entity">Órgão ou entidade pública</option><option value="individual">Pessoa física</option></select></label>
                <label>Prestador/beneficiário<select value={form.paymentRecipientType} onChange={(event) => updateFact("paymentRecipientType", event.target.value)}><option value="">Selecione</option><option value="legal_entity">Pessoa jurídica</option><option value="individual">Pessoa física</option></select></label>
                <label>Natureza do serviço<select value={form.serviceNature} onChange={(event) => updateFact("serviceNature", event.target.value)}><option value="">Selecione</option><option value="professional">Serviço profissional</option><option value="cleaning_maintenance">Limpeza ou manutenção</option><option value="labor_assignment">Cessão de mão de obra</option><option value="construction">Construção civil</option><option value="general">Outro serviço</option></select></label>
              </>}

              {(activeTax === "ICMS" || activeTax === "ISS" || activeTax === "PIS_COFINS" || activeTax === "WITHHOLDINGS") && <label>Regime do prestador/remetente<select value={form.issuerTaxRegime} onChange={(event) => updateFact("issuerTaxRegime", event.target.value)}><option value="">Selecione</option><option value="normal">Regime normal</option><option value="simples">Simples Nacional</option></select></label>}
              <label>Benefício ou regime especial<select value={form.specialTreatment} onChange={(event) => updateFact("specialTreatment", event.target.value)}><option value="">Precisa conferir</option><option value="none">Não existe</option><option value="exists">Existe</option></select></label>
              <button type="button" className="primary-button" disabled={loading} onClick={() => void search()}>{loading ? "Reavaliando…" : "Reavaliar com estes fatos"}</button>
              <button type="button" className="clear-facts" onClick={() => { setForm(emptyFacts); setResult(null); }}>Limpar ficha</button>
            </aside>
          </div>

          <section className="panel intelligence-sources"><div className="panel-heading"><div><span className="eyebrow">EVIDÊNCIA NORMATIVA</span><h3>Fontes efetivamente usadas nesta resposta</h3></div><code>#{knowledge?.fingerprint ?? "—"}</code></div>{result.sources.length ? <div className="intelligence-source-grid">{result.sources.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.code}><span>↗</span><div><small>{source.primary ? "FONTE PRIMÁRIA" : "COMPILAÇÃO OFICIAL"}</small><b>{source.title}</b><p>{source.legalReference}</p><em>{source.publisher} · conferida em {dateLabel(source.checkedAt)}</em></div></a>)}</div> : <p className="no-result-sources">Nenhuma fonte foi aplicada porque a consulta ainda está fora do recorte ou sem fatos mínimos.</p>}<div className="intelligence-disclaimer"><b>Limite de responsabilidade da resposta</b><p>{result.disclaimer}</p></div></section>
        </>
      )}

      {!catalogLoading && <FiscalHomologationCenter candidate={result ? { question, facts: buildFacts(form), result } : null} />}

      {!catalogLoading && catalogSources.length > 0 && <section className="knowledge-catalog-note"><span>BASE CONTROLADA</span><p>{knowledge?.topicCount ?? 0} módulos · {knowledge?.ruleCount ?? 0} regras manuais · {knowledge?.classificationCount ?? 0} combinações NCM/CEST · {catalogSources.length} fontes oficiais. Cada resposta preserva base, versão, trilha e bloqueios.</p></section>}
    </div>
  );
}

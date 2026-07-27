"use client";

import { type FormEvent, useState } from "react";
import type { TaxReformImpactReport } from "../../domain/tax-reform-impact";

type Props = { initialClientLabel: string };

type FormState = {
  clientLabel: string;
  targetYear: string;
  taxableBase: string;
  currentPisCofins: string;
  currentIcmsIss: string;
  currentIpi: string;
  cbsReferenceRate: string;
  ibsReferenceRate: string;
  projectedCbsCredits: string;
  projectedIbsCredits: string;
  selectiveTax: string;
  taxRegime: string;
  operationProfile: string;
  ancillaryObligationsStatus: string;
  ipiTreatment: string;
  sourceNote: string;
};

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
const date = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

function moneyToCents(value: string) {
  const clean = value.trim();
  if (!clean) return null;
  const normalized = clean.includes(",") ? clean.replace(/\./g, "").replace(",", ".") : clean;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) : Number.NaN;
}

function percentageToBps(value: string) {
  const clean = value.trim();
  if (!clean) return null;
  const parsed = Number(clean.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) : Number.NaN;
}

function formatCents(value: number | null) {
  return value === null ? "Bloqueado" : currency.format(value / 100);
}

function formatBps(value: number | null) {
  return value === null ? "pendente" : `${(value / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

function coverageLabel(value: TaxReformImpactReport["coverage"]) {
  return value === "supported" ? "Suportado" : value === "partial" ? "Parcial" : "Não suportado";
}

function defaultForm(initialClientLabel: string): FormState {
  return {
    clientLabel: initialClientLabel,
    targetYear: "2026",
    taxableBase: "100000,00",
    currentPisCofins: "3650,00",
    currentIcmsIss: "12000,00",
    currentIpi: "0,00",
    cbsReferenceRate: "9,00",
    ibsReferenceRate: "18,00",
    projectedCbsCredits: "0,00",
    projectedIbsCredits: "0,00",
    selectiveTax: "0,00",
    taxRegime: "regular",
    operationProfile: "standard",
    ancillaryObligationsStatus: "confirmed_compliant",
    ipiTreatment: "not_applicable",
    sourceNote: "Valores líquidos extraídos da apuração mensal conferida.",
  };
}

export default function TaxReformImpact({ initialClientLabel }: Props) {
  const [form, setForm] = useState<FormState>(() => defaultForm(initialClientLabel));
  const [report, setReport] = useState<TaxReformImpactReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const futureYear = Number(form.targetYear) > 2026;

  function field<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/tax-reform-impact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientLabel: form.clientLabel,
          targetYear: Number(form.targetYear),
          taxableBaseCents: moneyToCents(form.taxableBase),
          currentPisCofinsCents: moneyToCents(form.currentPisCofins),
          currentIcmsIssCents: moneyToCents(form.currentIcmsIss),
          currentIpiCents: moneyToCents(form.currentIpi),
          cbsReferenceRateBps: futureYear ? percentageToBps(form.cbsReferenceRate) : null,
          ibsReferenceRateBps: futureYear ? percentageToBps(form.ibsReferenceRate) : null,
          projectedCbsCreditsCents: futureYear ? moneyToCents(form.projectedCbsCredits) : null,
          projectedIbsCreditsCents: futureYear ? moneyToCents(form.projectedIbsCredits) : null,
          selectiveTaxCents: futureYear ? moneyToCents(form.selectiveTax) : null,
          taxRegime: form.taxRegime,
          operationProfile: form.operationProfile,
          ancillaryObligationsStatus: form.ancillaryObligationsStatus,
          ipiTreatment: form.ipiTreatment,
          sourceNote: form.sourceNote,
        }),
      });
      const payload = await response.json() as { report?: TaxReformImpactReport; error?: string };
      if (!response.ok || !payload.report) throw new Error(payload.error ?? "Não foi possível gerar a análise.");
      setReport(payload.report);
    } catch (cause) {
      setReport(null);
      setError(cause instanceof Error ? cause.message : "Não foi possível gerar a análise.");
    } finally {
      setLoading(false);
    }
  }

  function downloadReport() {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `margem-clara-reforma-${report.inputs.clientLabel || "cliente"}-${report.rule.targetYear}-${report.reportHash.slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <section className="panel rtc-impact" aria-labelledby="rtc-impact-title">
      <div className="panel-heading rtc-impact-heading">
        <div>
          <span className="eyebrow">REFORMA TRIBUTÁRIA · TRANSIÇÃO 2026–2033</span>
          <h2 id="rtc-impact-title">Impacto financeiro com memória rastreável</h2>
          <p>Compare a carga atual com a etapa escolhida sem transformar premissas em alíquotas legais definitivas.</p>
        </div>
        <span className="rtc-safety-chip">Centavos + pontos-base</span>
      </div>

      <form className="rtc-form" onSubmit={submit}>
        <div className="rtc-form-grid">
          <label><span>Cliente</span><input value={form.clientLabel} maxLength={120} onChange={(event) => field("clientLabel", event.target.value)} /></label>
          <label><span>Ano-alvo</span><select value={form.targetYear} onChange={(event) => field("targetYear", event.target.value)}>
            {[2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033].map((year) => <option key={year}>{year}</option>)}
          </select></label>
          <label><span>Regime</span><select value={form.taxRegime} onChange={(event) => field("taxRegime", event.target.value)}>
            <option value="regular">Regime regular</option><option value="simples">Simples Nacional</option><option value="mei">MEI</option><option value="specific">Regime específico</option>
          </select></label>
          <label><span>Perfil da operação</span><select value={form.operationProfile} onChange={(event) => field("operationProfile", event.target.value)}>
            <option value="standard">Operação padrão</option><option value="reduced_rate">Alíquota reduzida</option><option value="specific_regime">Regime específico</option><option value="fuel">Combustíveis</option><option value="financial">Serviços financeiros</option><option value="real_estate">Imóveis</option>
          </select></label>
        </div>

        <fieldset>
          <legend>Dados atuais da competência</legend>
          <div className="rtc-form-grid money">
            <label><span>Base tributável (R$)</span><input inputMode="decimal" value={form.taxableBase} onChange={(event) => field("taxableBase", event.target.value)} /></label>
            <label><span>PIS/Cofins atual (R$)</span><input inputMode="decimal" value={form.currentPisCofins} onChange={(event) => field("currentPisCofins", event.target.value)} /></label>
            <label><span>ICMS/ISS atual (R$)</span><input inputMode="decimal" value={form.currentIcmsIss} onChange={(event) => field("currentIcmsIss", event.target.value)} /></label>
            <label><span>IPI atual (R$)</span><input inputMode="decimal" value={form.currentIpi} onChange={(event) => field("currentIpi", event.target.value)} /></label>
          </div>
        </fieldset>

        {futureYear ? <fieldset>
          <legend>Premissas do ano-alvo</legend>
          <div className="rtc-form-grid money">
            <label><span>CBS de referência (%)</span><input inputMode="decimal" value={form.cbsReferenceRate} onChange={(event) => field("cbsReferenceRate", event.target.value)} /></label>
            <label><span>IBS integral de referência (%)</span><input inputMode="decimal" value={form.ibsReferenceRate} onChange={(event) => field("ibsReferenceRate", event.target.value)} /></label>
            <label><span>Créditos CBS projetados (R$)</span><input inputMode="decimal" value={form.projectedCbsCredits} onChange={(event) => field("projectedCbsCredits", event.target.value)} /></label>
            <label><span>Créditos IBS projetados (R$)</span><input inputMode="decimal" value={form.projectedIbsCredits} onChange={(event) => field("projectedIbsCredits", event.target.value)} /></label>
            <label><span>Imposto Seletivo confirmado (R$)</span><input inputMode="decimal" value={form.selectiveTax} onChange={(event) => field("selectiveTax", event.target.value)} /></label>
            <label><span>Tratamento do IPI</span><select value={form.ipiTreatment} onChange={(event) => field("ipiTreatment", event.target.value)}>
              <option value="not_applicable">Sem exceção ZFM</option><option value="zfm_exception">Exceção ZFM confirmada</option><option value="unknown">Não conferido</option>
            </select></label>
          </div>
        </fieldset> : <fieldset>
          <legend>Condição documental de 2026</legend>
          <label className="rtc-wide-field"><span>Obrigações acessórias aplicáveis</span><select value={form.ancillaryObligationsStatus} onChange={(event) => field("ancillaryObligationsStatus", event.target.value)}>
            <option value="confirmed_compliant">Cumprimento confirmado</option><option value="not_confirmed">Não confirmado</option><option value="unknown">Ainda desconhecido</option>
          </select></label>
        </fieldset>}

        <label className="rtc-wide-field"><span>Origem contábil das premissas</span><textarea value={form.sourceNote} maxLength={500} onChange={(event) => field("sourceNote", event.target.value)} /></label>
        {error && <div className="rtc-form-error" role="alert">{error}</div>}
        <button className="rtc-submit" disabled={loading}>{loading ? "Calculando e conferindo…" : "Calcular impacto rastreável"}</button>
      </form>

      {report && <article className="rtc-report" aria-live="polite">
        <header className="rtc-report-header">
          <div><span>RELATÓRIO PARA O CLIENTE · {report.format}</span><h3>{report.inputs.clientLabel || "Cliente não identificado"} · {report.rule.targetYear}</h3><p>Gerado em {date.format(new Date(report.generatedAt))}</p></div>
          <div className={`rtc-coverage ${report.coverage}`}><small>Cobertura</small><strong>{coverageLabel(report.coverage)}</strong></div>
        </header>

        <div className="rtc-result-objective"><span>RESULTADO OBJETIVO</span><p>{report.resultObjective}</p></div>
        <div className="rtc-comparison" aria-label="Comparação atual e transição">
          <article><span>Cenário atual</span><strong>{formatCents(report.current.totalCents)}</strong><small>taxa efetiva {formatBps(report.current.effectiveRateBps)}</small></article>
          <article><span>Transição {report.rule.targetYear}</span><strong>{formatCents(report.transition.totalExposureCents)}</strong><small>taxa efetiva {formatBps(report.transition.effectiveRateBps)}</small></article>
          <article className={report.impact.direction}><span>Impacto mensal</span><strong>{formatCents(report.impact.monthlyDeltaCents)}</strong><small>anual: {formatCents(report.impact.annualDeltaCents)}</small></article>
        </div>

        <div className="rtc-applied-rules">
          <div><span>CBS aplicada</span><b>{formatBps(report.rates.cbsAppliedRateBps)}</b></div>
          <div><span>IBS da etapa</span><b>{formatBps(report.rates.ibsAppliedRateBps)}</b></div>
          <div><span>ICMS/ISS remanescente</span><b>{formatBps(report.rates.legacyIcmsIssShareBps)}</b></div>
          <div><span>Vigência</span><b>{report.rule.effectiveFrom} a {report.rule.effectiveTo}</b></div>
        </div>

        <section className="rtc-memory">
          <div className="rtc-subheading"><span>MEMÓRIA DE CÁLCULO</span><h4>Fórmula, dado utilizado e resultado</h4></div>
          <div className="rtc-memory-table">
            {report.memory.map((line) => <article key={line.code}>
              <div><b>{line.label}</b><small>{line.code} · {line.nature}</small></div>
              <p>{line.formula}<small>{line.dataUsed}</small></p>
              <strong>{formatCents(line.amountCents)}</strong>
            </article>)}
          </div>
        </section>

        {(report.issues.length > 0 || report.pendingFacts.length > 0) && <section className="rtc-pending">
          <div className="rtc-subheading"><span>PENDÊNCIAS E BLOQUEIOS</span><h4>O que impede uma conclusão</h4></div>
          {report.issues.map((issue) => <p key={issue.code} className={issue.severity}><b>{issue.severity === "blocker" ? "Bloqueio" : "Alerta"} · {issue.code}</b><span>{issue.message}</span></p>)}
        </section>}

        <section className="rtc-premises">
          <div className="rtc-subheading"><span>DADOS E PREMISSAS</span><h4>Registro usado nesta versão</h4></div>
          <dl>
            <div><dt>Base tributável</dt><dd>{formatCents(report.inputs.taxableBaseCents)}</dd></div>
            <div><dt>PIS/Cofins atual</dt><dd>{formatCents(report.inputs.currentPisCofinsCents)}</dd></div>
            <div><dt>ICMS/ISS atual</dt><dd>{formatCents(report.inputs.currentIcmsIssCents)}</dd></div>
            <div><dt>IPI atual</dt><dd>{formatCents(report.inputs.currentIpiCents)}</dd></div>
            <div><dt>CBS de referência</dt><dd>{formatBps(report.inputs.cbsReferenceRateBps)}</dd></div>
            <div><dt>IBS integral de referência</dt><dd>{formatBps(report.inputs.ibsReferenceRateBps)}</dd></div>
            <div><dt>Créditos CBS</dt><dd>{formatCents(report.inputs.projectedCbsCreditsCents)}</dd></div>
            <div><dt>Créditos IBS</dt><dd>{formatCents(report.inputs.projectedIbsCreditsCents)}</dd></div>
            <div><dt>Imposto Seletivo</dt><dd>{formatCents(report.inputs.selectiveTaxCents)}</dd></div>
            <div><dt>Regime</dt><dd>{report.inputs.taxRegime}</dd></div>
            <div><dt>Perfil</dt><dd>{report.inputs.operationProfile}</dd></div>
            <div><dt>Obrigações 2026</dt><dd>{report.inputs.ancillaryObligationsStatus}</dd></div>
            <div><dt>Tratamento do IPI</dt><dd>{report.inputs.ipiTreatment}</dd></div>
          </dl>
          <p><b>Origem informada:</b> {report.inputs.sourceNote}</p>
        </section>

        <section className="rtc-sources">
          <div className="rtc-subheading"><span>FONTES OFICIAIS</span><h4>Regra, vigência e versão rastreáveis</h4></div>
          <div>{report.sources.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.code}><span>↗</span><p><b>{source.title}</b><small>{source.publisher} · {source.legalReference} · conferida em {new Date(`${source.checkedAt}T12:00:00`).toLocaleDateString("pt-BR")}</small></p></a>)}</div>
        </section>

        <footer className="rtc-assurance">
          <div><span>Motor</span><code>{report.engineVersion}</code></div><div><span>Metodologia</span><code>{report.methodologyVersion}</code></div><div><span>Regra</span><code>{report.rule.code}@{report.rule.version}</code></div><div><span>Hash dos dados</span><code>#{report.inputHash.slice(0, 16)}</code></div><div><span>Hash do relatório</span><code>#{report.reportHash.slice(0, 16)}</code></div>
        </footer>
        <p className="rtc-legal-boundary">{report.legalBoundary} Valor líquido jurídico a recolher: <b>não produzido</b>.</p>
        <div className="rtc-report-actions"><button type="button" onClick={() => window.print()}>Imprimir / salvar PDF</button><button type="button" onClick={downloadReport}>Baixar versão auditável (JSON)</button></div>
      </article>}
    </section>
  );
}

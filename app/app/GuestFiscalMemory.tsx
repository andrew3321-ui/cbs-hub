"use client";

import { useState } from "react";

type CalculationLine = {
  code: string;
  label: string;
  formula: string;
  basis: string;
  amountCents: number | null;
  percentageBps: number | null;
  status: "calculated" | "parameter" | "not_applicable" | "blocked";
};

type CalculationMemory = {
  status: "calculated_conditional" | "needs_information" | "not_applicable";
  statusLabel: string;
  calculationType: string;
  totals: {
    operationCompositionCents: number;
    ownIcmsReferenceCents: number | null;
    stBaseCents: number | null;
    presumedInternalIcmsCents: number | null;
    icmsStCents: number | null;
    difalCents: number | null;
    fcpCents: number | null;
    destinationTotalCents: number | null;
  };
  lines: CalculationLine[];
  blockers: string[];
  disclaimer: string;
};

type Props = {
  question: string;
  facts: Record<string, string>;
  onAccountRequired: (reason: string) => void;
};

const initialForm = {
  operationPrice: "1.000,00",
  discountsGranted: "0,00",
  freight: "0,00",
  insurance: "0,00",
  ipi: "0,00",
  otherExpenses: "0,00",
  ownIcmsBase: "1.000,00",
  internalRate: "18,00",
  fcpRate: "0,00",
  ratesConfirmed: false,
};

function decimal(value: string) {
  const compact = value.trim().replace(/\s/g, "");
  const normalized = compact.includes(",") ? compact.replace(/\./g, "").replace(",", ".") : compact;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error("Informe valores numéricos positivos.");
  return parsed;
}

function cents(value: string) {
  return Math.round(decimal(value) * 100);
}

function bps(value: string) {
  return Math.round(decimal(value) * 100);
}

function money(value: number | null) {
  return value === null ? "—" : (value / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function GuestFiscalMemory({ question, facts, onAccountRequired }: Props) {
  const [form, setForm] = useState(initialForm);
  const [memory, setMemory] = useState<CalculationMemory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function update(field: keyof typeof initialForm, value: string | boolean) {
    setForm((current) => ({ ...current, [field]: value }));
    setMemory(null);
  }

  async function calculate() {
    setLoading(true);
    setError("");
    try {
      const calculation = {
        operationPriceCents: cents(form.operationPrice),
        discountsGrantedCents: cents(form.discountsGranted),
        freightCents: cents(form.freight),
        insuranceCents: cents(form.insurance),
        ipiCents: cents(form.ipi),
        otherExpensesCents: cents(form.otherExpenses),
        ownIcmsBaseCents: cents(form.ownIcmsBase),
        internalRateBps: bps(form.internalRate),
        fcpRateBps: bps(form.fcpRate),
        ratesConfirmed: form.ratesConfirmed,
        priceMethod: "mva",
      };
      const response = await fetch("/api/public/fiscal-intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, facts, calculation }),
        cache: "no-store",
      });
      const data = await response.json() as { error?: string; calculation?: CalculationMemory };
      if (!response.ok || !data.calculation) throw new Error(data.error ?? "Não foi possível calcular esta memória.");
      setMemory(data.calculation);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível calcular esta memória.");
    } finally {
      setLoading(false);
    }
  }

  return <section className="panel guest-fiscal-memory">
    <div className="dossier-heading">
      <div><span className="eyebrow">MEMÓRIA CONDICIONAL · TESTE PÚBLICO</span><h3>Transforme o enquadramento em uma memória reproduzível</h3><p>Preencha valores reais da operação. Nada é salvo; o cálculo usa o mesmo motor determinístico da área autenticada.</p></div>
      <span className="dossier-assurance">REVISÃO PROFISSIONAL OBRIGATÓRIA</span>
    </div>
    <div className="guest-memory-grid">
      <div className="guest-memory-inputs">
        <div className="dossier-field-grid">
          <label>Valor da operação<input inputMode="decimal" value={form.operationPrice} onChange={(event) => update("operationPrice", event.target.value)} /></label>
          <label>Base do ICMS próprio<input inputMode="decimal" value={form.ownIcmsBase} onChange={(event) => update("ownIcmsBase", event.target.value)} /></label>
          <label>Descontos<input inputMode="decimal" value={form.discountsGranted} onChange={(event) => update("discountsGranted", event.target.value)} /></label>
          <label>Frete<input inputMode="decimal" value={form.freight} onChange={(event) => update("freight", event.target.value)} /></label>
          <label>Seguro<input inputMode="decimal" value={form.insurance} onChange={(event) => update("insurance", event.target.value)} /></label>
          <label>IPI<input inputMode="decimal" value={form.ipi} onChange={(event) => update("ipi", event.target.value)} /></label>
          <label>Outras despesas<input inputMode="decimal" value={form.otherExpenses} onChange={(event) => update("otherExpenses", event.target.value)} /></label>
          <label>Alíquota interna (%)<input inputMode="decimal" value={form.internalRate} onChange={(event) => update("internalRate", event.target.value)} /></label>
          <label>FCP (%)<input inputMode="decimal" value={form.fcpRate} onChange={(event) => update("fcpRate", event.target.value)} /></label>
        </div>
        <label className="guest-memory-confirm"><input type="checkbox" checked={form.ratesConfirmed} onChange={(event) => update("ratesConfirmed", event.target.checked)} /><span>Confirmei a alíquota interna e o tratamento do FCP para esta mercadoria.</span></label>
        <button className="primary-button" type="button" disabled={loading || !form.ratesConfirmed} onClick={() => void calculate()}>{loading ? "Calculando…" : "Executar memória de cálculo"}<span>→</span></button>
        {error && <p className="guest-memory-error" role="alert">{error}</p>}
      </div>

      <div className="guest-memory-result">
        {!memory && <div className="guest-memory-empty"><span>03</span><b>O resultado aparecerá aqui</b><p>O motor expõe fórmula, base, percentuais, bloqueios e totais sem ocultar premissas.</p></div>}
        {memory && <>
          <header className={memory.status}><span>{memory.statusLabel}</span><strong>{money(memory.totals.destinationTotalCents)}</strong><small>Total condicionado no destino</small></header>
          <div className="guest-memory-totals"><span><small>Composição</small><b>{money(memory.totals.operationCompositionCents)}</b></span><span><small>ICMS próprio</small><b>{money(memory.totals.ownIcmsReferenceCents)}</b></span><span><small>Base ST/DIFAL</small><b>{money(memory.totals.stBaseCents)}</b></span><span><small>ICMS-ST</small><b>{money(memory.totals.icmsStCents ?? memory.totals.difalCents)}</b></span></div>
          {memory.blockers.length > 0 && <div className="guest-memory-blockers"><b>O que ainda impede uma conclusão:</b>{memory.blockers.map((blocker) => <span key={blocker}>! {blocker}</span>)}</div>}
          <div className="guest-memory-lines">{memory.lines.slice(0, 5).map((line) => <article key={line.code}><span>{line.status === "calculated" ? "✓" : "§"}</span><div><b>{line.label}</b><small>{line.formula}</small></div><strong>{line.amountCents !== null ? money(line.amountCents) : line.percentageBps !== null ? `${(line.percentageBps / 100).toLocaleString("pt-BR")}%` : "—"}</strong></article>)}</div>
          <p className="guest-memory-disclaimer">{memory.disclaimer}</p>
          <button className="guest-save-dossier" type="button" onClick={() => onAccountRequired("save_dossier")}>Salvar empresa, memória e fontes <span>→</span></button>
        </>}
      </div>
    </div>
  </section>;
}

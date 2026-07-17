"use client";

import { useMemo, useState } from "react";

type Module = "simples_annex_i" | "pis_cofins" | "iss" | "icms_difal" | "rtc_2026";
type Calculation = {
  result: {
    title: string; status: "calculated_reference" | "blocked"; summary: string; engineVersion: string; disclaimer: string;
    lines: Array<{ code: string; label: string; formula: string; amountCents: number | null; rateBps?: number | null }>;
    issues: Array<{ code: string; severity: "blocker" | "warning"; message: string }>;
    sources: Array<{ code: string; title: string; publisher: string; url: string; checkedAt: string }>;
    facts: Array<{ label: string; confirmed: boolean }>;
  };
  audit: { inputHash: string; engineVersion: string; calculatedAt: string };
  governance: { professionalApprovalVerified: boolean; eligibleForProfessionalUse: boolean; message: string };
};

const modules: Array<{ id: Module; short: string; title: string; description: string }> = [
  { id: "simples_annex_i", short: "SN", title: "Simples · Anexo I", description: "Faixa, alíquota efetiva e DAS de referência." },
  { id: "pis_cofins", short: "P/C", title: "PIS e Cofins", description: "Débitos, créditos e saldo por regime." },
  { id: "iss", short: "ISS", title: "ISS municipal", description: "Base, deduções, retenção e taxa confirmada." },
  { id: "icms_difal", short: "ICMS", title: "DIFAL + FCP", description: "Comparativo interestadual parametrizado." },
  { id: "rtc_2026", short: "RTC", title: "IBS/CBS 2026", description: "Destaque de teste e limite comparável." },
];

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const asCents = (value: string) => Math.round((Number(value.replace(",", ".")) || 0) * 100);
const rateBps = (value: string) => Math.round((Number(value.replace(",", ".")) || 0) * 100);

export default function DeterministicTaxLab() {
  const [module, setModule] = useState<Module>("simples_annex_i");
  const [values, setValues] = useState<Record<string, string | boolean>>({
    rbt12: "1500000", monthlyRevenue: "120000", annexConfirmed: false, revenueSegregated: false, periodClosed: false, noSpecialTreatment: false,
    regime: "cumulative", taxableRevenue: "100000", creditBase: "0", regimeConfirmed: false, revenueClassified: false, specialTreatmentsExcluded: false, creditsDocumented: false,
    serviceBase: "100000", deductions: "0", municipalRate: "3", withheld: false, serviceItemConfirmed: false, placeConfirmed: false, municipalRateConfirmed: false, municipalLawReference: "",
    icmsBase: "100000", origin: "SP", destination: "MG", importedQualified: false, destinationInternalRate: "18", fcpRate: "2", finalConsumer: false, recipientNonTaxpayer: false, destinationLawReference: "", ratesConfirmed: false,
    rtcBase: "100000", pisCofinsPayable: "3650", yearConfirmed: false, accessoryObligationsConfirmed: false, operationClassified: false,
  });
  const [calculation, setCalculation] = useState<Calculation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const selected = modules.find((item) => item.id === module)!;

  const set = (key: string, value: string | boolean) => setValues((current) => ({ ...current, [key]: value }));
  const text = (key: string) => String(values[key] ?? "");
  const yes = (key: string) => Boolean(values[key]);

  const payload = useMemo(() => {
    if (module === "simples_annex_i") return { module, rbt12Cents: asCents(text("rbt12")), monthlySegregatedRevenueCents: asCents(text("monthlyRevenue")), annexConfirmed: yes("annexConfirmed"), revenueSegregated: yes("revenueSegregated"), periodClosed: yes("periodClosed"), noSpecialTreatment: yes("noSpecialTreatment") };
    if (module === "pis_cofins") return { module, regime: text("regime"), taxableRevenueCents: asCents(text("taxableRevenue")), eligibleCreditBaseCents: asCents(text("creditBase")), regimeConfirmed: yes("regimeConfirmed"), revenueClassified: yes("revenueClassified"), specialTreatmentsExcluded: yes("specialTreatmentsExcluded"), creditsDocumented: yes("creditsDocumented") };
    if (module === "iss") return { module, serviceBaseCents: asCents(text("serviceBase")), deductionsCents: asCents(text("deductions")), municipalRateBps: rateBps(text("municipalRate")), withheld: yes("withheld"), serviceItemConfirmed: yes("serviceItemConfirmed"), placeConfirmed: yes("placeConfirmed"), municipalRateConfirmed: yes("municipalRateConfirmed"), municipalLawReference: text("municipalLawReference") };
    if (module === "icms_difal") return { module, baseCents: asCents(text("icmsBase")), origin: text("origin"), destination: text("destination"), importedQualified: yes("importedQualified"), destinationInternalRateBps: rateBps(text("destinationInternalRate")), fcpRateBps: rateBps(text("fcpRate")), finalConsumer: yes("finalConsumer"), recipientNonTaxpayer: yes("recipientNonTaxpayer"), destinationLawReference: text("destinationLawReference"), ratesConfirmed: yes("ratesConfirmed") };
    return { module, taxableOperationCents: asCents(text("rtcBase")), pisCofinsPayableCents: asCents(text("pisCofinsPayable")), yearConfirmed: yes("yearConfirmed"), accessoryObligationsConfirmed: yes("accessoryObligationsConfirmed"), operationClassified: yes("operationClassified") };
  }, [module, values]);

  async function calculate() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/deterministic-tax-lab", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json() as Calculation & { error?: string };
      if (!response.ok) throw new Error(data.error || "Não foi possível concluir o cálculo.");
      setCalculation(data);
    } catch (caught) {
      setCalculation(null); setError(caught instanceof Error ? caught.message : "Não foi possível concluir o cálculo.");
    } finally { setLoading(false); }
  }

  function switchModule(next: Module) { setModule(next); setCalculation(null); setError(""); }

  return (
    <div className="tax-lab page-content">
      <header className="tax-lab-hero">
        <div><span className="eyebrow">MOTOR DETERMINÍSTICO · SEM IA</span><h1>Laboratório Fiscal</h1><p>Transforme fatos confirmados em cálculos reproduzíveis, com fórmula, fonte oficial e trilha de bloqueios.</p></div>
        <div className="tax-lab-assurance"><strong>5</strong><span>módulos auditáveis</span><small>nenhum custo por consulta</small></div>
      </header>

      <section className="tax-lab-modules" aria-label="Módulos de cálculo">
        {modules.map((item) => <button type="button" key={item.id} className={module === item.id ? "active" : ""} onClick={() => switchModule(item.id)}><span>{item.short}</span><strong>{item.title}</strong><small>{item.description}</small></button>)}
      </section>

      <div className="tax-lab-grid">
        <section className="tax-lab-form">
          <div className="tax-lab-section-heading"><div><span className="eyebrow">ENTRADAS CONTROLADAS</span><h2>{selected.title}</h2></div><span className="deterministic-badge">∑ fórmula fixa</span></div>
          {module === "simples_annex_i" && <>
            <div className="field-pair"><Field label="RBT12" value={text("rbt12")} onChange={(v) => set("rbt12", v)} prefix="R$" /><Field label="Receita segregada no mês" value={text("monthlyRevenue")} onChange={(v) => set("monthlyRevenue", v)} prefix="R$" /></div>
            <Checks items={[["annexConfirmed", "Atividade de comércio confirmada no Anexo I"], ["revenueSegregated", "Receita segregada por tratamento"], ["periodClosed", "RBT12 e período conferidos"], ["noSpecialTreatment", "Tratamentos especiais excluídos"]]} values={values} set={set} />
          </>}
          {module === "pis_cofins" && <>
            <label className="tax-lab-field"><span>Regime</span><select value={text("regime")} onChange={(e) => set("regime", e.target.value)}><option value="cumulative">Cumulativo</option><option value="non_cumulative">Não cumulativo</option></select></label>
            <div className="field-pair"><Field label="Receita tributável" value={text("taxableRevenue")} onChange={(v) => set("taxableRevenue", v)} prefix="R$" /><Field label="Base de créditos elegíveis" value={text("creditBase")} onChange={(v) => set("creditBase", v)} prefix="R$" /></div>
            <Checks items={[["regimeConfirmed", "Regime tributário confirmado"], ["revenueClassified", "Receitas classificadas"], ["specialTreatmentsExcluded", "Monofásico, zero, suspensão e exportação excluídos"], ["creditsDocumented", "Créditos documentados, quando aplicável"]]} values={values} set={set} />
          </>}
          {module === "iss" && <>
            <div className="field-pair"><Field label="Preço do serviço" value={text("serviceBase")} onChange={(v) => set("serviceBase", v)} prefix="R$" /><Field label="Deduções documentadas" value={text("deductions")} onChange={(v) => set("deductions", v)} prefix="R$" /></div>
            <div className="field-pair"><Field label="Alíquota municipal" value={text("municipalRate")} onChange={(v) => set("municipalRate", v)} suffix="%" /><Field label="Lei municipal / URL oficial" value={text("municipalLawReference")} onChange={(v) => set("municipalLawReference", v)} /></div>
            <Checks items={[["serviceItemConfirmed", "Item da lista de serviços confirmado"], ["placeConfirmed", "Município de incidência confirmado"], ["municipalRateConfirmed", "Taxa conferida na lei municipal"], ["withheld", "ISS retido pelo tomador"]]} values={values} set={set} />
          </>}
          {module === "icms_difal" && <>
            <div className="field-pair"><Field label="Base da operação" value={text("icmsBase")} onChange={(v) => set("icmsBase", v)} prefix="R$" /><div className="route-fields"><Field label="Origem" value={text("origin")} onChange={(v) => set("origin", v.toUpperCase().slice(0, 2))} /><Field label="Destino" value={text("destination")} onChange={(v) => set("destination", v.toUpperCase().slice(0, 2))} /></div></div>
            <div className="field-pair"><Field label="Alíquota interna do destino" value={text("destinationInternalRate")} onChange={(v) => set("destinationInternalRate", v)} suffix="%" /><Field label="FCP confirmado" value={text("fcpRate")} onChange={(v) => set("fcpRate", v)} suffix="%" /></div>
            <Field label="Lei / consulta oficial da UF de destino" value={text("destinationLawReference")} onChange={(v) => set("destinationLawReference", v)} />
            <Checks items={[["finalConsumer", "Consumidor final"], ["recipientNonTaxpayer", "Destinatário não contribuinte"], ["ratesConfirmed", "Taxas do destino conferidas"], ["importedQualified", "Mercadoria importada qualificada à regra de 4%"]]} values={values} set={set} />
          </>}
          {module === "rtc_2026" && <>
            <div className="field-pair"><Field label="Base tributável da operação" value={text("rtcBase")} onChange={(v) => set("rtcBase", v)} prefix="R$" /><Field label="PIS/Cofins a pagar informado" value={text("pisCofinsPayable")} onChange={(v) => set("pisCofinsPayable", v)} prefix="R$" /></div>
            <Checks items={[["yearConfirmed", "Período de teste de 2026"], ["operationClassified", "Operação e base classificadas"], ["accessoryObligationsConfirmed", "Condições e obrigações acessórias verificadas"]]} values={values} set={set} />
          </>}
          <div className="tax-lab-action"><button type="button" onClick={calculate} disabled={loading}>{loading ? "Calculando…" : "Gerar memória auditável"}<span>→</span></button><small>O motor mostra bloqueios em vez de preencher fatos desconhecidos.</small></div>
          {error && <p className="tax-lab-error">{error}</p>}
        </section>

        <aside className="tax-lab-output">
          {!calculation ? <div className="tax-lab-empty"><span>∑</span><h3>A memória aparecerá aqui</h3><p>Preencha os valores, confirme apenas os fatos verificados e execute o módulo.</p><ul><li>cálculo em centavos</li><li>fórmula linha a linha</li><li>fontes oficiais vinculadas</li><li>bloqueio por falta de evidência</li></ul></div> : <Result calculation={calculation} />}
        </aside>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, prefix, suffix }: { label: string; value: string; onChange: (value: string) => void; prefix?: string; suffix?: string }) {
  return <label className="tax-lab-field"><span>{label}</span><div>{prefix && <small>{prefix}</small>}<input value={value} onChange={(event) => onChange(event.target.value)} inputMode={prefix || suffix ? "decimal" : "text"} />{suffix && <small>{suffix}</small>}</div></label>;
}

function Checks({ items, values, set }: { items: string[][]; values: Record<string, string | boolean>; set: (key: string, value: boolean) => void }) {
  return <div className="tax-lab-checks">{items.map(([key, label]) => <label key={key}><input type="checkbox" checked={Boolean(values[key])} onChange={(event) => set(key, event.target.checked)} /><span aria-hidden="true">✓</span><p>{label}</p></label>)}</div>;
}

function Result({ calculation }: { calculation: Calculation }) {
  const blocked = calculation.result.status === "blocked";
  return <div className="tax-lab-result">
    <div className={`tax-lab-status ${blocked ? "blocked" : "ready"}`}><span>{blocked ? "!" : "✓"}</span><div><small>{blocked ? "REVISÃO BLOQUEADA" : "REFERÊNCIA CALCULADA"}</small><strong>{calculation.result.title}</strong><p>{calculation.result.summary}</p></div></div>
    <div className="tax-lab-lines"><h3>Memória de cálculo</h3>{calculation.result.lines.map((line) => <div key={line.code}><p><strong>{line.label}</strong><small>{line.formula}</small></p><b>{line.amountCents === null ? (line.rateBps == null ? "não determinado" : `${(line.rateBps / 100).toFixed(2)}%`) : money.format(line.amountCents / 100)}</b></div>)}</div>
    {calculation.result.issues.length > 0 && <div className="tax-lab-issues"><h3>Controles e pendências</h3>{calculation.result.issues.map((issue) => <p key={issue.code} className={issue.severity}><span>{issue.severity === "blocker" ? "!" : "i"}</span>{issue.message}</p>)}</div>}
    <div className="tax-lab-governance"><strong>{calculation.governance.professionalApprovalVerified ? "Governança profissional ativa" : "Sem selo profissional"}</strong><p>{calculation.governance.message}</p></div>
    <div className="tax-lab-sources"><h3>Fontes oficiais</h3>{calculation.result.sources.map((source) => <a key={source.code} href={source.url} target="_blank" rel="noreferrer"><span><strong>{source.title}</strong><small>{source.publisher} · conferida em {new Date(`${source.checkedAt}T12:00:00`).toLocaleDateString("pt-BR")}</small></span><b>↗</b></a>)}</div>
    <footer><span>Motor {calculation.result.engineVersion}</span><span>Hash {calculation.audit.inputHash.slice(0, 12)}</span><p>{calculation.result.disclaimer}</p></footer>
  </div>;
}

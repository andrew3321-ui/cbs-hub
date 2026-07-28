import type { ReactNode } from "react";
import Link from "next/link";
import type { AutoPartsDossierSnapshot } from "../../domain/auto-parts-dossier";
import type { ColdBeverageDossierSnapshot } from "../../domain/cold-beverage-dossier";
import BrandMark from "../BrandMark";

type ReportDossier = {
  id: string;
  status: string;
  inputHash: string;
  professionalRegistration: string | null;
  decidedAt: string | null;
};

type ReportCompany = {
  name: string;
  taxRegime: string;
  sector: string;
} | null | undefined;

type SharedProps = {
  dossier: ReportDossier;
  company: ReportCompany;
  preparerName: string;
  reviewerName: string | null;
  actions: ReactNode;
  deliveryNote?: string | null;
};

type Props = SharedProps & (
  | { kind: "auto-parts"; snapshot: AutoPartsDossierSnapshot }
  | { kind: "beverage"; snapshot: ColdBeverageDossierSnapshot }
);

const money = (value: number | null | undefined) => value == null ? "—" : (value / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const percent = (value: number | null | undefined) => value == null ? "—" : `${(value / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
const date = (value: string) => new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR");
const timestamp = (value: string) => new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

export default function FiscalDossierReportDocument(props: Props) {
  const { dossier, snapshot, company, preparerName, reviewerName, actions, deliveryNote } = props;
  const isBeverage = props.kind === "beverage";
  const dossierLabel = isBeverage ? "DOSSIÊ FISCAL DE BEBIDAS" : "DOSSIÊ FISCAL DE AUTOPEÇAS";
  const taxEyebrow = isBeverage ? `ICMS-ST · BEBIDAS · ${snapshot.operation.route}` : `ICMS-ST · AUTOPEÇAS · ${snapshot.operation.route}`;
  const statusLabel = dossier.status === "approved" ? "Revisado e aprovado" : dossier.status === "ready_for_review" ? "Em revisão responsável" : dossier.status === "changes_requested" ? "Ajustes solicitados" : dossier.status === "rejected" ? "Rejeitado" : "Rascunho técnico";
  const total = snapshot.calculation.totals.destinationTotalCents;

  return <main className="public-report-shell fiscal-client-report-shell">
    <header className="public-report-nav">
      <Link className="report-brand" href="/"><BrandMark />CBSHub</Link>
      <div><span>{dossierLabel}</span><small>Snapshot íntegro · #{dossier.inputHash.slice(0, 12)}</small></div>
      {actions}
    </header>

    <article className="public-report-document fiscal-client-report">
      <section className="report-hero">
        <div><span className="report-eyebrow">{taxEyebrow}</span><h1>{company?.name ?? snapshot.title}</h1><p>{company ? `${company.taxRegime} · ${company.sector} · ` : ""}operação em {date(snapshot.operation.operationDate)}</p></div>
        <div className={`report-verdict ${snapshot.coverage.status === "supported" ? "protected" : "attention"}`}><span>COBERTURA {snapshot.coverage.label.toUpperCase()}</span><strong>{total === null ? "Sem valor final" : money(total)}</strong><small>{snapshot.calculation.statusLabel}</small></div>
      </section>

      {deliveryNote && <section className="fiscal-report-delivery-note"><span>MENSAGEM DO RESPONSÁVEL</span><p>{deliveryNote}</p></section>}

      <section className="report-assurance versioned">
        <div><span>ESTADO DO DOSSIÊ</span><strong>{statusLabel}</strong><small>{dossier.status === "approved" ? `${reviewerName ?? "Responsável"} · ${dossier.professionalRegistration}${dossier.decidedAt ? ` · ${timestamp(dossier.decidedAt)}` : ""}` : "Exige revisão profissional antes da entrega definitiva"}</small></div>
        <div><span>REGRA E VIGÊNCIA</span><strong>{snapshot.rule.version}</strong><small>{date(snapshot.rule.effectiveFrom)} a {date(snapshot.rule.effectiveTo)} · conferida em {date(snapshot.rule.checkedAt)}</small></div>
        <div><span>INTEGRIDADE</span><strong>SHA-256 verificado</strong><small>{dossier.inputHash}</small></div>
        <Link href="/metodologia">Metodologia e limites →</Link>
      </section>

      <section className="fiscal-report-scope">
        <span>ESCOPO EXATO</span><h2>{snapshot.coverage.representativeScope}</h2><p>{snapshot.coverage.reason}</p>
      </section>

      <section className="report-unit-metrics fiscal-input-metrics">
        <div><span>Valor da operação</span><strong>{money(snapshot.operation.operationCents)}</strong></div>
        <div><span>Base do ICMS próprio</span><strong>{money(snapshot.operation.ownIcmsBaseCents)}</strong></div>
        <div><span>Alíquota interestadual</span><strong>{percent(snapshot.calculation.parameters.interstateRateBps)}</strong></div>
        <div><span>Alíquota interna</span><strong>{percent(snapshot.calculation.parameters.internalRateBps)}</strong></div>
        <div><span>Redução de base</span><strong>{percent(snapshot.calculation.parameters.baseReductionBps)}</strong><small>{snapshot.calculation.parameters.baseReductionStatus === "not_applicable_confirmed" ? "afastada nos fatos confirmados" : "pendente"}</small></div>
        {props.kind === "beverage" ? <>
          <div><span>PMPF unitário</span><strong>{money(props.snapshot.calculation.parameters.pmpfUnitCents)}</strong></div>
          <div><span>Quantidade</span><strong>{props.snapshot.operation.quantityUnits.toLocaleString("pt-BR")}</strong></div>
        </> : <>
          <div><span>MVA original</span><strong>{percent(props.snapshot.calculation.parameters.mvaOriginalBps)}</strong></div>
          <div><span>MVA aplicada</span><strong>{percent(props.snapshot.calculation.parameters.mvaAppliedBps)}</strong></div>
        </>}
      </section>

      <section className="fiscal-report-memory">
        <div><span>MEMÓRIA REPRODUZÍVEL</span><h2>Fórmulas, bases e arredondamentos</h2><p>Todos os valores foram processados em centavos; cada linha preserva a fórmula e o fundamento utilizado.</p></div>
        <div>{snapshot.calculation.lines.map((line, index) => <article className={line.status} key={line.code}><span>{String(index + 1).padStart(2, "0")}</span><div><small>{line.code}</small><b>{line.label}</b><p>{line.formula}</p><em>{line.basis}</em></div><strong>{line.amountCents !== null ? money(line.amountCents) : percent(line.percentageBps)}</strong></article>)}</div>
      </section>

      <section className="report-metrics fiscal-result-metrics">
        <article><span>Base presumida</span><strong>{money(snapshot.calculation.totals.stBaseCents)}</strong><small>base do ICMS-ST</small></article>
        <article><span>ICMS próprio</span><strong>{money(snapshot.calculation.totals.ownIcmsReferenceCents)}</strong><small>dedução de referência</small></article>
        <article><span>ICMS-ST</span><strong>{money(snapshot.calculation.totals.icmsStCents)}</strong><small>resultado condicionado</small></article>
        <article className="accent"><span>ICMS-ST + FCP</span><strong>{money(total)}</strong><small>total destinado ao estado</small></article>
      </section>

      {snapshot.calculation.blockers.length > 0 && <section className="fiscal-report-blockers"><span>PENDÊNCIAS QUE IMPEDEM A CONCLUSÃO</span>{snapshot.calculation.blockers.map((blocker) => <p key={blocker}>{blocker}</p>)}</section>}

      <section className="fiscal-report-facts">
        <div><span>DADOS CONFIRMADOS</span><h2>Fatos preservados no snapshot</h2></div>
        <div>{snapshot.operation.confirmedFacts.map((fact) => <span className={fact.confirmed ? "confirmed" : "pending"} key={fact.code}><b>{fact.confirmed ? "✓" : "!"}</b>{fact.label}</span>)}</div>
      </section>

      <section className="fiscal-report-sources">
        <div><span>FONTES OFICIAIS APLICADAS</span><h2>Evidência vinculada ao resultado</h2></div>
        <div>{snapshot.evidence.sources.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.code}><small>{source.publisher} · {source.code}</small><b>{source.title} ↗</b><span>Conferida em {date(source.checkedAt)}</span><p>{source.proves.join(" · ")}</p></a>)}</div>
      </section>

      {snapshot.rule.scheduledTransition && <section className="fiscal-report-transition"><span>MUDANÇA NORMATIVA PROGRAMADA</span><b>{date(snapshot.rule.scheduledTransition.effectiveFrom)}</b><p>{snapshot.rule.scheduledTransition.description}</p></section>}

      <section className="report-next-actions"><div><span>LIMITES DE USO</span><h2>Antes da entrega definitiva</h2></div><ol><li><b>01</b><span><strong>Conferir produto e documentos</strong><small>{isBeverage ? "Marca, embalagem, volume, CEST e GTIN precisam coincidir exatamente com a pauta." : "O recorte não se estende automaticamente a outros NCM ou CEST."}</small></span></li><li><b>02</b><span><strong>Revisar fontes e vigência</strong><small>Alteração normativa exige uma nova versão do dossiê.</small></span></li><li><b>03</b><span><strong>Registrar responsabilidade</strong><small>O software produz memória técnica; a conclusão do caso concreto permanece com o profissional.</small></span></li></ol></section>

      <footer className="report-document-footer"><span>Preparado por <b>{preparerName}</b>{reviewerName ? <> · revisado por <b>{reviewerName}</b></> : null} no CBSHub</span><small>Snapshot gerado em {timestamp(snapshot.generatedAt)}{dossier.decidedAt ? ` e aprovado em ${timestamp(dossier.decidedAt)}` : ""}. {snapshot.calculation.disclaimer}</small><Link href="/metodologia">Metodologia e fontes →</Link></footer>
    </article>
  </main>;
}

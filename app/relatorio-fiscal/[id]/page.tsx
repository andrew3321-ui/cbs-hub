import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { isAutoPartsDossierSnapshot } from "../../../domain/auto-parts-dossier";
import { isColdBeverageDossierSnapshot } from "../../../domain/cold-beverage-dossier";
import { ensureScenarioSchema, getDb } from "../../../db";
import { companies, fiscalDossiers, users } from "../../../db/schema";
import { getCurrentUser } from "../../auth";
import { getWorkspaceContext, sha256Hex } from "../../workspace";
import FiscalReportActions from "./FiscalReportActions";

export const dynamic = "force-dynamic";

const money = (value: number | null | undefined) => value == null ? "—" : (value / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const percent = (value: number | null | undefined) => value == null ? "—" : `${(value / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
const date = (value: string) => new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR");

function unavailable(title: string, detail: string) {
  return <main className="public-report-unavailable"><Link className="report-brand" href="/"><span>mc</span>margem<b>clara</b></Link><section><span>RELATÓRIO INDISPONÍVEL</span><h1>{title}</h1><p>{detail}</p><Link href="/app">Voltar ao sistema →</Link></section></main>;
}

export default async function FiscalReportPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return unavailable("Entre para acessar este dossiê.", "O relatório contém dados técnicos do espaço contábil e não é um link público.");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return unavailable("Identificador inválido.", "Gere novamente o relatório a partir da Cobertura Nacional.");
  await ensureScenarioSchema();
  const workspace = await getWorkspaceContext(user.id);
  if (!workspace) return unavailable("Espaço contábil não encontrado.", "A conta atual não possui acesso a este relatório.");
  const db = getDb();
  const [dossier] = await db.select().from(fiscalDossiers).where(and(eq(fiscalDossiers.id, id), eq(fiscalDossiers.workspaceId, workspace.id))).limit(1);
  if (!dossier) return unavailable("Dossiê não encontrado.", "O registro pode pertencer a outro espaço contábil ou ter sido removido.");
  if (await sha256Hex(dossier.snapshotJson) !== dossier.inputHash) return unavailable("Integridade não confirmada.", "O conteúdo armazenado não corresponde ao hash do snapshot e foi bloqueado.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(dossier.snapshotJson);
  } catch {
    return unavailable("Snapshot inválido.", "O relatório não pôde ser reconstruído com segurança.");
  }
  const autoPartsSnapshot = isAutoPartsDossierSnapshot(parsed) ? parsed : null;
  const beverageSnapshot = isColdBeverageDossierSnapshot(parsed) ? parsed : null;
  if (!autoPartsSnapshot && !beverageSnapshot) return unavailable("Modelo de relatório incompatível.", "O snapshot não pertence a um dossiê fiscal suportado por esta versão.");
  const snapshot = autoPartsSnapshot ?? beverageSnapshot!;
  const isBeverage = Boolean(beverageSnapshot);
  const dossierLabel = isBeverage ? "DOSSIÊ FISCAL DE BEBIDAS" : "DOSSIÊ FISCAL DE AUTOPEÇAS";
  const taxEyebrow = isBeverage ? `ICMS-ST · BEBIDAS · ${snapshot.operation.route}` : `ICMS-ST · AUTOPEÇAS · ${snapshot.operation.route}`;
  const [company] = dossier.companyId ? await db.select({ name: companies.name, taxRegime: companies.taxRegime, sector: companies.sector }).from(companies).where(and(eq(companies.id, dossier.companyId), eq(companies.workspaceId, workspace.id))).limit(1) : [];
  const [preparer] = await db.select({ name: users.name }).from(users).where(eq(users.id, dossier.createdByUserId)).limit(1);
  const [reviewer] = dossier.decisionByUserId ? await db.select({ name: users.name }).from(users).where(eq(users.id, dossier.decisionByUserId)).limit(1) : [];
  const statusLabel = dossier.status === "approved" ? "Revisado e aprovado" : dossier.status === "ready_for_review" ? "Em revisão responsável" : dossier.status === "changes_requested" ? "Ajustes solicitados" : dossier.status === "rejected" ? "Rejeitado" : "Rascunho técnico";
  const total = snapshot.calculation.totals.destinationTotalCents;

  return <main className="public-report-shell fiscal-client-report-shell">
    <header className="public-report-nav">
      <Link className="report-brand" href="/"><span>mc</span>margem<b>clara</b></Link>
      <div><span>{dossierLabel}</span><small>Snapshot íntegro · #{dossier.inputHash.slice(0, 12)}</small></div>
      <FiscalReportActions />
    </header>

    <article className="public-report-document fiscal-client-report">
      <section className="report-hero">
        <div><span className="report-eyebrow">{taxEyebrow}</span><h1>{company?.name ?? snapshot.title}</h1><p>{company ? `${company.taxRegime} · ${company.sector} · ` : ""}operação em {date(snapshot.operation.operationDate)}</p></div>
        <div className={`report-verdict ${snapshot.coverage.status === "supported" ? "protected" : "attention"}`}><span>COBERTURA {snapshot.coverage.label.toUpperCase()}</span><strong>{total === null ? "Sem valor final" : money(total)}</strong><small>{snapshot.calculation.statusLabel}</small></div>
      </section>

      <section className="report-assurance versioned">
        <div><span>ESTADO DO DOSSIÊ</span><strong>{statusLabel}</strong><small>{dossier.status === "approved" ? `${reviewer?.name ?? "Responsável"} · ${dossier.professionalRegistration}` : "Exige revisão profissional antes da entrega definitiva"}</small></div>
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
        {beverageSnapshot ? <>
          <div><span>PMPF unitário</span><strong>{money(beverageSnapshot.calculation.parameters.pmpfUnitCents)}</strong></div>
          <div><span>Quantidade</span><strong>{beverageSnapshot.operation.quantityUnits.toLocaleString("pt-BR")}</strong></div>
        </> : <>
          <div><span>MVA original</span><strong>{percent(autoPartsSnapshot!.calculation.parameters.mvaOriginalBps)}</strong></div>
          <div><span>MVA aplicada</span><strong>{percent(autoPartsSnapshot!.calculation.parameters.mvaAppliedBps)}</strong></div>
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

      <footer className="report-document-footer"><span>Preparado por <b>{preparer?.name ?? "Profissional"}</b> no Margem Clara</span><small>{snapshot.calculation.disclaimer}</small><Link href="/metodologia">Metodologia e fontes →</Link></footer>
    </article>
  </main>;
}

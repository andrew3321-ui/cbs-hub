import { and, eq, gt, isNull, sql } from "drizzle-orm";
import Link from "next/link";
import { ensureScenarioSchema, getDb } from "../../../db";
import { companies, reportShares, scenarios, users } from "../../../db/schema";
import ReportActions from "./ReportActions";

export const dynamic = "force-dynamic";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const date = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

function unavailable() {
  return <main className="public-report-unavailable"><Link className="report-brand" href="/"><span>mc</span>margem<b>clara</b></Link><section><span>LINK INDISPONÍVEL</span><h1>Este relatório não está mais acessível.</h1><p>O link pode ter expirado ou sido revogado por quem preparou a análise.</p><Link href="/">Conhecer o Margem Clara →</Link></section></main>;
}

export default async function PublicReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f]{48}$/.test(token)) return unavailable();
  await ensureScenarioSchema();
  const db = getDb();
  const [report] = await db.select({ shareId: reportShares.id, note: reportShares.note, expiresAt: reportShares.expiresAt, views: reportShares.views, createdAt: reportShares.createdAt, scenarioName: scenarios.name, revenueCents: scenarios.revenueCents, currentRateBps: scenarios.currentRateBps, newRateBps: scenarios.newRateBps, costRateBps: scenarios.costRateBps, priceAdjustmentBps: scenarios.priceAdjustmentBps, scenarioCreatedAt: scenarios.createdAt, companyName: companies.name, taxRegime: companies.taxRegime, sector: companies.sector, authorName: users.name }).from(reportShares).innerJoin(scenarios, eq(reportShares.scenarioId, scenarios.id)).innerJoin(companies, eq(reportShares.companyId, companies.id)).innerJoin(users, eq(reportShares.ownerUserId, users.id)).where(and(eq(reportShares.token, token), isNull(reportShares.revokedAt), gt(reportShares.expiresAt, new Date().toISOString()))).limit(1);
  if (!report) return unavailable();

  await db.update(reportShares).set({ views: sql`${reportShares.views} + 1`, lastViewedAt: new Date().toISOString() }).where(eq(reportShares.id, report.shareId));

  const revenue = report.revenueCents / 100;
  const currentRate = report.currentRateBps / 100;
  const newRate = report.newRateBps / 100;
  const costRate = report.costRateBps / 100;
  const adjustment = report.priceAdjustmentBps / 100;
  const projectedRevenue = revenue * (1 + adjustment / 100);
  const currentTax = revenue * currentRate / 100;
  const projectedTax = projectedRevenue * newRate / 100;
  const costs = revenue * costRate / 100;
  const currentMargin = revenue - costs - currentTax;
  const projectedMargin = projectedRevenue - costs - projectedTax;
  const currentMarginRate = revenue ? currentMargin / revenue * 100 : 0;
  const projectedMarginRate = projectedRevenue ? projectedMargin / projectedRevenue * 100 : 0;
  const protectedMargin = projectedMargin >= currentMargin;
  const requiredPriceIncrease = newRate >= 100 ? 0 : Math.max(0, (((1 - currentRate / 100) / (1 - newRate / 100)) - 1) * 100);

  return (
    <main className="public-report-shell">
      <header className="public-report-nav">
        <Link className="report-brand" href="/"><span>mc</span>margem<b>clara</b></Link>
        <div><span>RELATÓRIO EXECUTIVO COMPARTILHADO</span><small>Somente leitura · expira em {date.format(new Date(report.expiresAt))}</small></div>
        <ReportActions />
      </header>

      <article className="public-report-document">
        <section className="report-hero">
          <div><span className="report-eyebrow">ANÁLISE DE IMPACTO TRIBUTÁRIO</span><h1>{report.companyName}</h1><p>{report.taxRegime} · {report.sector} · cenário “{report.scenarioName}”</p></div>
          <div className={`report-verdict ${protectedMargin ? "protected" : "attention"}`}><span>{protectedMargin ? "MARGEM PROTEGIDA" : "AÇÃO RECOMENDADA"}</span><strong>{protectedMargin ? "Cenário sustentável" : "Revisar preço"}</strong><small>{protectedMargin ? `Reajuste de ${adjustment.toFixed(1).replace(".", ",")}% compensa a transição` : `Reajuste estimado de ${requiredPriceIncrease.toFixed(1).replace(".", ",")}%`}</small></div>
        </section>

        {report.note && <section className="report-note"><span>NOTA DE QUEM PREPAROU</span><p>“{report.note}”</p><small>{report.authorName}</small></section>}

        <section className="report-metrics">
          <article><span>Receita analisada</span><strong>{money.format(revenue)}</strong><small>base mensal informada</small></article>
          <article><span>Tributos atuais</span><strong>{money.format(currentTax)}</strong><small>alíquota de {currentRate.toFixed(2).replace(".", ",")}%</small></article>
          <article className="accent"><span>Projeção IBS + CBS</span><strong>{money.format(projectedTax)}</strong><small>{projectedTax >= currentTax ? "+" : "−"} {money.format(Math.abs(projectedTax - currentTax))}</small></article>
          <article><span>Margem projetada</span><strong>{projectedMarginRate.toFixed(1).replace(".", ",")}%</strong><small>{projectedMarginRate >= currentMarginRate ? "+" : "−"} {Math.abs(projectedMarginRate - currentMarginRate).toFixed(1).replace(".", ",")} p.p.</small></article>
        </section>

        <section className="report-analysis-grid">
          <article className="report-comparison-card"><div><span>COMPARAÇÃO DE MARGEM</span><h2>Do cenário atual ao projetado</h2></div><div className="report-bars"><div><span>Atual</span><b>{money.format(currentMargin)}</b><i><em style={{width:`${Math.max(5,Math.min(100,currentMarginRate*3))}%`}} /></i><small>{currentMarginRate.toFixed(1).replace(".", ",")}% da receita</small></div><div><span>Projetada</span><b>{money.format(projectedMargin)}</b><i><em className={protectedMargin ? "good" : "risk"} style={{width:`${Math.max(5,Math.min(100,projectedMarginRate*3))}%`}} /></i><small>{projectedMarginRate.toFixed(1).replace(".", ",")}% da receita reajustada</small></div></div></article>
          <article className="report-decision-card"><span>DECISÃO SUGERIDA</span><strong>{protectedMargin ? `${adjustment.toFixed(1).replace(".", ",")}%` : `${requiredPriceIncrease.toFixed(1).replace(".", ",")}%`}</strong><h2>{protectedMargin ? "Reajuste informado" : "Reajuste de equilíbrio"}</h2><p>{protectedMargin ? "O preço projetado preserva a margem estimada mesmo com a nova carga tributária." : "Este é o aumento aproximado necessário para neutralizar apenas o efeito da mudança de alíquota."}</p></article>
        </section>

        <section className="report-next-actions"><div><span>PRÓXIMOS PASSOS</span><h2>Transforme o diagnóstico em ação</h2></div><ol><li><b>01</b><span><strong>Validar premissas</strong><small>Confirme receita, custos e créditos aplicáveis.</small></span></li><li><b>02</b><span><strong>Revisar contratos</strong><small>Mapeie cláusulas e datas de renovação.</small></span></li><li><b>03</b><span><strong>Definir comunicação</strong><small>Apresente o reajuste com antecedência e contexto.</small></span></li></ol></section>

        <footer className="report-document-footer"><span>Preparado por <b>{report.authorName}</b> no Margem Clara</span><small>Estimativa gerencial baseada nas premissas informadas. Consulte um profissional para validação fiscal definitiva.</small><Link href="/cadastro">Crie sua análise gratuitamente →</Link></footer>
      </article>
    </main>
  );
}

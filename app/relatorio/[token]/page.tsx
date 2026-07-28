import { and, eq, gt, isNull, sql } from "drizzle-orm";
import Link from "next/link";
import { ensureScenarioSchema, getDb } from "../../../db";
import { companies, reportShares, scenarioApprovals, scenarios, users } from "../../../db/schema";
import { calculateScenarioValues } from "../../scenario-calculations";
import { approvalRecordFromStored } from "../../scenario-approval-core";
import { parseScenarioSnapshot, rateSourceLabel, valuesFromSnapshot, type RateSource } from "../../scenario-reliability";
import { signedRecordFromScenario, verifyScenarioApprovalRecord, verifyScenarioRecord } from "../../scenario-signing";
import ReportActions from "./ReportActions";
import BrandMark from "../../BrandMark";

export const dynamic = "force-dynamic";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const date = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

function unavailable() {
  return <main className="public-report-unavailable"><Link className="report-brand" href="/"><BrandMark />CBSHub</Link><section><span>LINK INDISPONÍVEL</span><h1>Este relatório não está mais acessível.</h1><p>O link pode ter expirado ou sido revogado por quem preparou a análise.</p><Link href="/">Conhecer o CBSHub →</Link></section></main>;
}

function integrityBlocked() {
  return <main className="public-report-unavailable integrity-blocked"><Link className="report-brand" href="/"><BrandMark />CBSHub</Link><section><span>INTEGRIDADE NÃO CONFIRMADA</span><h1>Este relatório foi bloqueado por segurança.</h1><p>A assinatura criptográfica do registro não confere. Nenhum número será exibido até que uma nova versão íntegra seja criada.</p><Link href="/metodologia">Entender os controles →</Link></section></main>;
}

export default async function PublicReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f]{48}$/.test(token)) return unavailable();
  await ensureScenarioSchema();
  const db = getDb();
  const [report] = await db.select({
    shareId: reportShares.id, note: reportShares.note, expiresAt: reportShares.expiresAt, views: reportShares.views, createdAt: reportShares.createdAt,
    scenarioName: scenarios.name, revenueCents: scenarios.revenueCents, currentRateBps: scenarios.currentRateBps, newRateBps: scenarios.newRateBps, costRateBps: scenarios.costRateBps, fixedCostsCents: scenarios.fixedCostsCents, volumeLossBps: scenarios.volumeLossBps, priceAdjustmentBps: scenarios.priceAdjustmentBps,
    targetYear: scenarios.targetYear, rateSource: scenarios.rateSource, sourceNote: scenarios.sourceNote, reviewStatus: scenarios.reviewStatus, calculationVersion: scenarios.calculationVersion, methodologyVersion: scenarios.methodologyVersion, inputHash: scenarios.inputHash, snapshotJson: scenarios.snapshotJson, calculatedAt: scenarios.calculatedAt, signatureVersion: scenarios.signatureVersion, recordSignature: scenarios.recordSignature, supersedesScenarioId: scenarios.supersedesScenarioId,
    companyId: scenarios.companyId, ownerUserId: reportShares.ownerUserId, preparedByUserId: scenarios.preparedByUserId,
    scenarioCreatedAt: scenarios.createdAt, companyName: companies.name, taxRegime: companies.taxRegime, sector: companies.sector, authorName: users.name,
    approval: scenarioApprovals,
  }).from(reportShares).innerJoin(scenarios, eq(reportShares.scenarioId, scenarios.id)).innerJoin(companies, eq(reportShares.companyId, companies.id)).innerJoin(users, eq(reportShares.ownerUserId, users.id)).leftJoin(scenarioApprovals, eq(scenarioApprovals.scenarioId, scenarios.id)).where(and(eq(reportShares.token, token), isNull(reportShares.revokedAt), gt(reportShares.expiresAt, new Date().toISOString()))).limit(1);
  if (!report) return unavailable();
  const [preparer] = report.preparedByUserId ? await db.select({ name: users.name }).from(users).where(eq(users.id, report.preparedByUserId)).limit(1) : [];
  const preparerName = preparer?.name ?? report.authorName;

  const signedRecord = signedRecordFromScenario({ ...report, name: report.scenarioName }, report.ownerUserId);
  const integrityVerified = Boolean(signedRecord && await verifyScenarioRecord(signedRecord, report.recordSignature, report.signatureVersion));
  if (report.calculationVersion !== "legacy" && !integrityVerified) return integrityBlocked();
  const approvalRecord = report.approval ? approvalRecordFromStored(report.approval) : null;
  const approvalVerified = Boolean(approvalRecord && report.approval && await verifyScenarioApprovalRecord(approvalRecord, report.approval.approvalSignature, report.approval.signatureVersion));
  if (["responsible_approved", "delivered"].includes(report.reviewStatus) && !approvalVerified) return integrityBlocked();

  await db.update(reportShares).set({ views: sql`${reportShares.views} + 1`, lastViewedAt: new Date().toISOString() }).where(eq(reportShares.id, report.shareId));

  const revenue = report.revenueCents / 100;
  const currentRate = report.currentRateBps / 100;
  const newRate = report.newRateBps / 100;
  const costRate = report.costRateBps / 100;
  const fixedCosts = report.fixedCostsCents / 100;
  const volumeLoss = report.volumeLossBps / 100;
  const adjustment = report.priceAdjustmentBps / 100;
  const frozenSnapshot = parseScenarioSnapshot(report.snapshotJson);
  const figures = frozenSnapshot
    ? valuesFromSnapshot(frozenSnapshot)
    : calculateScenarioValues({ revenue, currentRate, newRate, costRate, fixedCosts, volumeLoss, priceAdjustment: adjustment });
  const { currentTax, projectedTax, currentMargin, projectedMargin, currentMarginRate, projectedMarginRate, requiredPriceIncrease, breakEvenRevenue, marginOfSafetyRate, annualImpact } = figures;
  const protectedMargin = projectedMargin >= currentMargin;
  const versioned = Boolean(frozenSnapshot && report.inputHash && report.calculationVersion !== "legacy" && integrityVerified);
  const officeSecondReview = report.approval?.assuranceLevel === "office_second_person_review";
  const reviewLabel = report.reviewStatus === "delivered"
    ? officeSecondReview ? "Entregue após revisão segregada" : "Entregue ao cliente"
    : report.reviewStatus === "responsible_approved"
      ? officeSecondReview ? "Revisado por segundo profissional do escritório" : "Revisado pelo responsável técnico"
      : report.reviewStatus === "ready_for_review"
        ? "Em revisão interna"
        : "Em elaboração";
  const reviewDetail = approvalVerified && report.approval
    ? `${report.approval.reviewerName} · ${report.approval.professionalRegistration} · ${officeSecondReview ? `revisão interna distinta de ${preparerName}` : "revisão do próprio responsável"} · registro autodeclarado`
    : report.reviewStatus === "ready_for_review"
      ? "O escritório ainda não concluiu sua revisão responsável."
      : "Documento ainda não liberado para entrega.";
  const sourceLabel = rateSourceLabel(report.rateSource as RateSource);

  return (
    <main className="public-report-shell">
      <header className="public-report-nav">
        <Link className="report-brand" href="/"><BrandMark />CBSHub</Link>
        <div><span>RELATÓRIO EXECUTIVO COMPARTILHADO</span><small>Somente leitura · expira em {date.format(new Date(report.expiresAt))}</small></div>
        <ReportActions />
      </header>

      <article className="public-report-document">
        <section className="report-hero">
          <div><span className="report-eyebrow">ANÁLISE DE IMPACTO TRIBUTÁRIO · {report.targetYear}</span><h1>{report.companyName}</h1><p>{report.taxRegime} · {report.sector} · cenário “{report.scenarioName}”</p></div>
          <div className={`report-verdict ${protectedMargin ? "protected" : "attention"}`}><span>{protectedMargin ? "RESULTADO MATEMÁTICO PROTEGIDO" : "AÇÃO INDICADA PELO CÁLCULO"}</span><strong>{protectedMargin ? "Cenário sustenta a margem" : "Revisar preço"}</strong><small>{protectedMargin ? `Reajuste informado de ${adjustment.toFixed(1).replace(".", ",")}%` : `Reajuste de equilíbrio de ${requiredPriceIncrease.toFixed(1).replace(".", ",")}%`}</small></div>
        </section>

        <section className={`report-assurance ${versioned ? "versioned" : "legacy"} ${approvalVerified ? "approved" : ""}`}>
          <div><span>REVISÃO DO ESCRITÓRIO</span><strong>{reviewLabel}</strong><small>{reviewDetail}</small></div>
          <div><span>ORIGEM DA ALÍQUOTA</span><strong>{sourceLabel}</strong><small>{report.sourceNote}</small></div>
          <div><span>INTEGRIDADE</span><strong>{versioned ? `Assinatura verificada · ${report.calculationVersion}` : "Registro legado não assinado"}</strong><small>{report.inputHash ? `SHA-256 ${report.inputHash.slice(0, 12)}…` : "Sem hash de entrada"}</small></div>
          <Link href="/metodologia">Ver metodologia e limitações →</Link>
        </section>

        {report.note && <section className="report-note"><span>NOTA DE QUEM PREPAROU</span><p>“{report.note}”</p><small>{preparerName}</small></section>}

        <section className="report-metrics">
          <article><span>Receita analisada</span><strong>{money.format(revenue)}</strong><small>base mensal informada</small></article>
          <article><span>Ponto de equilíbrio</span><strong>{Number.isFinite(breakEvenRevenue) ? money.format(breakEvenRevenue) : "Inviável"}</strong><small>receita mínima projetada</small></article>
          <article className="accent"><span>IBS + CBS informados · {report.targetYear}</span><strong>{money.format(projectedTax)}</strong><small>{projectedTax >= currentTax ? "+" : "−"} {money.format(Math.abs(projectedTax - currentTax))}</small></article>
          <article><span>Impacto em 12 meses</span><strong>{annualImpact >= 0 ? "+ " : "− "}{money.format(Math.abs(annualImpact))}</strong><small>margem de segurança {marginOfSafetyRate.toFixed(1).replace(".", ",")}%</small></article>
        </section>

        <section className="report-unit-metrics"><div><span>Alíquota atual</span><strong>{currentRate.toFixed(2).replace(".", ",")}%</strong></div><div><span>Alíquota projetada informada</span><strong>{newRate.toFixed(2).replace(".", ",")}%</strong></div><div><span>Custos variáveis</span><strong>{costRate.toFixed(1).replace(".", ",")}%</strong></div><div><span>Queda de volume prevista</span><strong>{volumeLoss.toFixed(1).replace(".", ",")}%</strong></div></section>

        <section className="report-analysis-grid">
          <article className="report-comparison-card"><div><span>COMPARAÇÃO DE MARGEM</span><h2>Do cenário atual ao projetado</h2></div><div className="report-bars"><div><span>Atual</span><b>{money.format(currentMargin)}</b><i><em style={{width:`${Math.max(5,Math.min(100,currentMarginRate*3))}%`}} /></i><small>{currentMarginRate.toFixed(1).replace(".", ",")}% da receita</small></div><div><span>Projetada</span><b>{money.format(projectedMargin)}</b><i><em className={protectedMargin ? "good" : "risk"} style={{width:`${Math.max(5,Math.min(100,projectedMarginRate*3))}%`}} /></i><small>{projectedMarginRate.toFixed(1).replace(".", ",")}% da receita reajustada</small></div></div></article>
          <article className="report-decision-card"><span>RESULTADO DO MOTOR</span><strong>{protectedMargin ? `${adjustment.toFixed(1).replace(".", ",")}%` : `${requiredPriceIncrease.toFixed(1).replace(".", ",")}%`}</strong><h2>{protectedMargin ? "Reajuste informado" : "Reajuste de equilíbrio"}</h2><p>{protectedMargin ? `O cálculo preserva o resultado mesmo com ${volumeLoss.toFixed(1).replace(".", ",")}% de queda no volume.` : "Este aumento aproxima o resultado projetado do atual sob as premissas registradas."}</p></article>
        </section>

        <section className="report-next-actions"><div><span>CONTROLES DE ENTREGA</span><h2>Como usar este documento</h2></div><ol><li><b>01</b><span><strong>Confirmar as premissas com o cliente</strong><small>Receita, custos e expectativas comerciais continuam sendo dados declarados.</small></span></li><li><b>02</b><span><strong>Respeitar o escopo da análise</strong><small>A revisão responsável não equivale a homologação da autoridade fiscal.</small></span></li><li><b>03</b><span><strong>Preservar a versão entregue</strong><small>Qualquer correção deve gerar uma nova versão e uma nova revisão.</small></span></li></ol></section>

        <footer className="report-document-footer"><span>Preparado por <b>{preparerName}</b>{officeSecondReview && report.approval ? <> · revisado por <b>{report.approval.reviewerName}</b></> : null} no CBSHub</span><small>Resultado congelado em {report.calculatedAt ? date.format(new Date(report.calculatedAt)) : "data não registrada"}{approvalVerified && report.approval ? ` e revisado em ${date.format(new Date(report.approval.decidedAt))}` : ""}. Estado: “{reviewLabel}”.</small><Link href="/metodologia">Metodologia e fontes →</Link></footer>
      </article>
    </main>
  );
}

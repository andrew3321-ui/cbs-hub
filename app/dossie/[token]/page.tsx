import { and, eq, gt, isNull, sql } from "drizzle-orm";
import Link from "next/link";
import { isAutoPartsDossierSnapshot } from "../../../domain/auto-parts-dossier";
import { isColdBeverageDossierSnapshot } from "../../../domain/cold-beverage-dossier";
import { ensureScenarioSchema, getDb } from "../../../db";
import { companies, fiscalDossierShares, fiscalDossiers, users } from "../../../db/schema";
import FiscalDossierReportDocument from "../../relatorio-fiscal/FiscalDossierReportDocument";
import { sha256Hex } from "../../workspace";
import PublicFiscalReportActions from "./PublicFiscalReportActions";

export const dynamic = "force-dynamic";

function unavailable() {
  return <main className="public-report-unavailable"><Link className="report-brand" href="/"><span>mc</span>margem<b>clara</b></Link><section><span>LINK INDISPONÍVEL</span><h1>Este dossiê não está mais acessível.</h1><p>O link pode ter expirado ou sido revogado pelo profissional responsável.</p><Link href="/">Conhecer o Margem Clara →</Link></section></main>;
}

function integrityBlocked() {
  return <main className="public-report-unavailable integrity-blocked"><Link className="report-brand" href="/"><span>mc</span>margem<b>clara</b></Link><section><span>INTEGRIDADE NÃO CONFIRMADA</span><h1>Este dossiê foi bloqueado por segurança.</h1><p>O conteúdo armazenado não corresponde ao hash da versão aprovada. Nenhum cálculo será exibido.</p><Link href="/metodologia">Entender os controles →</Link></section></main>;
}

export default async function PublicFiscalDossierPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f]{48}$/.test(token)) return unavailable();
  await ensureScenarioSchema();
  const db = getDb();
  const [record] = await db.select({ share: fiscalDossierShares, dossier: fiscalDossiers }).from(fiscalDossierShares).innerJoin(fiscalDossiers, eq(fiscalDossierShares.dossierId, fiscalDossiers.id)).where(and(
    eq(fiscalDossierShares.token, token),
    isNull(fiscalDossierShares.revokedAt),
    gt(fiscalDossierShares.expiresAt, new Date().toISOString()),
  )).limit(1);
  if (!record || record.dossier.status !== "approved" || !record.dossier.decisionByUserId || !record.dossier.professionalRegistration || !record.dossier.decidedAt) return unavailable();
  if (await sha256Hex(record.dossier.snapshotJson) !== record.dossier.inputHash) return integrityBlocked();

  let parsed: unknown;
  try {
    parsed = JSON.parse(record.dossier.snapshotJson);
  } catch {
    return integrityBlocked();
  }
  const autoPartsSnapshot = isAutoPartsDossierSnapshot(parsed) ? parsed : null;
  const beverageSnapshot = isColdBeverageDossierSnapshot(parsed) ? parsed : null;
  if (!autoPartsSnapshot && !beverageSnapshot) return integrityBlocked();

  const [company] = record.dossier.companyId ? await db.select({ name: companies.name, taxRegime: companies.taxRegime, sector: companies.sector }).from(companies).where(and(eq(companies.id, record.dossier.companyId), eq(companies.workspaceId, record.dossier.workspaceId))).limit(1) : [];
  const people = await db.select({ id: users.id, name: users.name }).from(users).where(sql`${users.id} IN (${record.dossier.createdByUserId}, ${record.dossier.decisionByUserId})`);
  const names = new Map(people.map((person) => [person.id, person.name]));
  await db.update(fiscalDossierShares).set({ views: sql`${fiscalDossierShares.views} + 1`, lastViewedAt: new Date().toISOString() }).where(eq(fiscalDossierShares.id, record.share.id));

  const shared = {
    dossier: record.dossier,
    company,
    preparerName: names.get(record.dossier.createdByUserId) ?? "Profissional",
    reviewerName: names.get(record.dossier.decisionByUserId) ?? "Responsável",
    deliveryNote: record.share.note,
    actions: <PublicFiscalReportActions />,
  };
  return autoPartsSnapshot
    ? <FiscalDossierReportDocument {...shared} kind="auto-parts" snapshot={autoPartsSnapshot} />
    : <FiscalDossierReportDocument {...shared} kind="beverage" snapshot={beverageSnapshot!} />;
}

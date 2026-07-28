import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { isAutoPartsDossierSnapshot } from "../../../domain/auto-parts-dossier";
import { isColdBeverageDossierSnapshot } from "../../../domain/cold-beverage-dossier";
import { ensureScenarioSchema, getDb } from "../../../db";
import { companies, fiscalDossiers, users } from "../../../db/schema";
import { getCurrentUser } from "../../auth";
import FiscalDossierReportDocument from "../FiscalDossierReportDocument";
import { getWorkspaceContext, sha256Hex } from "../../workspace";
import FiscalReportActions from "./FiscalReportActions";
import BrandMark from "../../BrandMark";

export const dynamic = "force-dynamic";

function unavailable(title: string, detail: string) {
  return <main className="public-report-unavailable"><Link className="report-brand" href="/"><BrandMark />CBSHub</Link><section><span>RELATÓRIO INDISPONÍVEL</span><h1>{title}</h1><p>{detail}</p><Link href="/app">Voltar ao sistema →</Link></section></main>;
}

export default async function FiscalReportPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return unavailable("Entre para acessar este dossiê.", "Use o link público emitido pelo responsável ou entre no espaço contábil.");
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

  const [company] = dossier.companyId ? await db.select({ name: companies.name, taxRegime: companies.taxRegime, sector: companies.sector }).from(companies).where(and(eq(companies.id, dossier.companyId), eq(companies.workspaceId, workspace.id))).limit(1) : [];
  const [preparer] = await db.select({ name: users.name }).from(users).where(eq(users.id, dossier.createdByUserId)).limit(1);
  const [reviewer] = dossier.decisionByUserId ? await db.select({ name: users.name }).from(users).where(eq(users.id, dossier.decisionByUserId)).limit(1) : [];
  const shared = {
    dossier,
    company,
    preparerName: preparer?.name ?? "Profissional",
    reviewerName: reviewer?.name ?? null,
    actions: <FiscalReportActions dossierId={dossier.id} status={dossier.status} />,
  };

  return autoPartsSnapshot
    ? <FiscalDossierReportDocument {...shared} kind="auto-parts" snapshot={autoPartsSnapshot} />
    : <FiscalDossierReportDocument {...shared} kind="beverage" snapshot={beverageSnapshot!} />;
}

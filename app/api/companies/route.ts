import { asc, eq, max } from "drizzle-orm";
import { ensureScenarioSchema, getDb } from "../../../db";
import { companies, scenarios } from "../../../db/schema";
import { getCurrentUser } from "../../auth";
import { signedRecordFromScenario, verifyScenarioRecord } from "../../scenario-signing";
import { withApiTelemetry } from "../../api-infrastructure";

const allowedRegimes = new Set(["Simples Nacional", "Lucro Presumido", "Lucro Real", "MEI"]);

async function getCompanies() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para acessar sua carteira." }, { status: 401 });
  try {
    await ensureScenarioSchema();
    const db = getDb();
    const latestScenarioIds = db.select({ companyId: scenarios.companyId, scenarioId: max(scenarios.id).as("scenario_id") }).from(scenarios).groupBy(scenarios.companyId).as("latest_scenario_ids");
    const rows = await db.select({ company: companies, latestScenario: scenarios }).from(companies).leftJoin(latestScenarioIds, eq(companies.id, latestScenarioIds.companyId)).leftJoin(scenarios, eq(scenarios.id, latestScenarioIds.scenarioId)).where(eq(companies.ownerUserId, user.id)).orderBy(asc(companies.name));
    const enriched = await Promise.all(rows.map(async ({ company, latestScenario }) => {
      if (!latestScenario) return { ...company, latestScenario: null };
      const { recordSignature, ...publicScenario } = latestScenario;
      if (latestScenario.calculationVersion === "legacy") return { ...company, latestScenario: { ...publicScenario, integrityStatus: "legacy" } };
      const signedRecord = signedRecordFromScenario(latestScenario, user.id);
      const integrityStatus = signedRecord && await verifyScenarioRecord(signedRecord, recordSignature, latestScenario.signatureVersion) ? "verified" : "invalid";
      return { ...company, latestScenario: { ...publicScenario, integrityStatus } };
    }));
    return Response.json({ companies: enriched });
  } catch {
    return Response.json({ error: "Não foi possível carregar a carteira." }, { status: 500 });
  }
}

async function createCompany(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para cadastrar empresas." }, { status: 401 });
  try {
    await ensureScenarioSchema();
    const payload = (await request.json()) as Record<string, unknown>;
    const name = typeof payload.name === "string" ? payload.name.trim().slice(0, 100) : "";
    const cnpj = typeof payload.cnpj === "string" ? payload.cnpj.replace(/\D/g, "").slice(0, 14) : "";
    const taxRegime = typeof payload.taxRegime === "string" ? payload.taxRegime : "";
    const sector = typeof payload.sector === "string" ? payload.sector.trim().slice(0, 80) : "";

    if (!name || !allowedRegimes.has(taxRegime) || !sector || (cnpj && cnpj.length !== 14)) {
      return Response.json({ error: "Revise os dados da empresa." }, { status: 400 });
    }

    const [company] = await getDb().insert(companies).values({ name, cnpj: cnpj || null, taxRegime, sector, ownerUserId: user.id }).returning();
    return Response.json({ company: { ...company, latestScenario: null } }, { status: 201 });
  } catch {
    return Response.json({ error: "Não foi possível cadastrar a empresa." }, { status: 500 });
  }
}

export const GET = withApiTelemetry("GET /api/companies", getCompanies);
export const POST = withApiTelemetry("POST /api/companies", createCompany);

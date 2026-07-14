import { asc, desc, eq } from "drizzle-orm";
import { ensureScenarioSchema, getDb } from "../../../db";
import { companies, scenarios } from "../../../db/schema";

const allowedRegimes = new Set(["Simples Nacional", "Lucro Presumido", "Lucro Real", "MEI"]);

export async function GET() {
  try {
    await ensureScenarioSchema();
    const db = getDb();
    const rows = await db.select().from(companies).orderBy(asc(companies.name));
    const enriched = await Promise.all(rows.map(async (company) => {
      const [latestScenario] = await db.select().from(scenarios).where(eq(scenarios.companyId, company.id)).orderBy(desc(scenarios.createdAt), desc(scenarios.id)).limit(1);
      return { ...company, latestScenario: latestScenario ?? null };
    }));
    return Response.json({ companies: enriched });
  } catch {
    return Response.json({ error: "Não foi possível carregar a carteira." }, { status: 500 });
  }
}

export async function POST(request: Request) {
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

    const [company] = await getDb().insert(companies).values({ name, cnpj: cnpj || null, taxRegime, sector }).returning();
    return Response.json({ company: { ...company, latestScenario: null } }, { status: 201 });
  } catch {
    return Response.json({ error: "Não foi possível cadastrar a empresa." }, { status: 500 });
  }
}

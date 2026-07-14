import { and, desc, eq } from "drizzle-orm";
import { ensureScenarioSchema, getDb } from "../../../db";
import { companies, reportShares, scenarios } from "../../../db/schema";
import { getCurrentUser } from "../../auth";

function validInteger(value: unknown, min: number, max: number) {
  return Number.isInteger(value) && Number(value) >= min && Number(value) <= max;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para acessar os cenários." }, { status: 401 });
  try {
    await ensureScenarioSchema();
    const companyId = Number(new URL(request.url).searchParams.get("companyId"));
    const db = getDb();
    let rows;
    if (Number.isInteger(companyId) && companyId > 0) {
      const [ownedCompany] = await db.select({ id: companies.id }).from(companies).where(and(eq(companies.id, companyId), eq(companies.ownerUserId, user.id))).limit(1);
      if (!ownedCompany) return Response.json({ error: "Empresa não encontrada." }, { status: 404 });
      rows = await db.select().from(scenarios).where(eq(scenarios.companyId, companyId)).orderBy(desc(scenarios.createdAt), desc(scenarios.id)).limit(40);
    } else {
      rows = await db.select({ id: scenarios.id, name: scenarios.name, revenueCents: scenarios.revenueCents, currentRateBps: scenarios.currentRateBps, newRateBps: scenarios.newRateBps, costRateBps: scenarios.costRateBps, priceAdjustmentBps: scenarios.priceAdjustmentBps, companyId: scenarios.companyId, createdAt: scenarios.createdAt }).from(scenarios).innerJoin(companies, eq(scenarios.companyId, companies.id)).where(eq(companies.ownerUserId, user.id)).orderBy(desc(scenarios.createdAt), desc(scenarios.id)).limit(100);
    }
    return Response.json({ scenarios: rows });
  } catch {
    return Response.json({ error: "O histórico ainda não está disponível." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para salvar cenários." }, { status: 401 });
  try {
    await ensureScenarioSchema();
    const payload = (await request.json()) as Record<string, unknown>;
    const name = typeof payload.name === "string" ? payload.name.trim().slice(0, 80) : "";
    const priceAdjustmentBps = payload.priceAdjustmentBps ?? 0;
    if (!name || !validInteger(payload.companyId, 1, 1_000_000_000) || !validInteger(payload.revenueCents, 100_000, 10_000_000_000) || !validInteger(payload.currentRateBps, 0, 10_000) || !validInteger(payload.newRateBps, 0, 10_000) || !validInteger(payload.costRateBps, 0, 10_000) || !validInteger(priceAdjustmentBps, 0, 10_000)) {
      return Response.json({ error: "Revise os valores do cenário." }, { status: 400 });
    }

    const companyId = Number(payload.companyId);
    const [ownedCompany] = await getDb().select({ id: companies.id }).from(companies).where(and(eq(companies.id, companyId), eq(companies.ownerUserId, user.id))).limit(1);
    if (!ownedCompany) return Response.json({ error: "Empresa não encontrada." }, { status: 404 });

    const [scenario] = await getDb().insert(scenarios).values({
      name,
      revenueCents: Number(payload.revenueCents),
      currentRateBps: Number(payload.currentRateBps),
      newRateBps: Number(payload.newRateBps),
      costRateBps: Number(payload.costRateBps),
      priceAdjustmentBps: Number(priceAdjustmentBps),
      companyId,
    }).returning();

    return Response.json({ scenario }, { status: 201 });
  } catch {
    return Response.json({ error: "Não foi possível salvar o cenário." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para excluir cenários." }, { status: 401 });
  try {
    await ensureScenarioSchema();
    const id = Number(new URL(request.url).searchParams.get("id"));
    if (!Number.isInteger(id) || id <= 0) {
      return Response.json({ error: "Cenário inválido." }, { status: 400 });
    }
    const db = getDb();
    const [ownedScenario] = await db.select({ id: scenarios.id }).from(scenarios).innerJoin(companies, eq(scenarios.companyId, companies.id)).where(and(eq(scenarios.id, id), eq(companies.ownerUserId, user.id))).limit(1);
    if (!ownedScenario) return Response.json({ error: "Cenário não encontrado." }, { status: 404 });
    await db.delete(reportShares).where(eq(reportShares.scenarioId, id));
    await db.delete(scenarios).where(eq(scenarios.id, id));
    return Response.json({ deleted: true });
  } catch {
    return Response.json({ error: "Não foi possível excluir o cenário." }, { status: 500 });
  }
}

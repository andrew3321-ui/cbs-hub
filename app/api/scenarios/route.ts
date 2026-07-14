import { desc, eq } from "drizzle-orm";
import { ensureScenarioSchema, getDb } from "../../../db";
import { scenarios } from "../../../db/schema";

function validInteger(value: unknown, min: number, max: number) {
  return Number.isInteger(value) && Number(value) >= min && Number(value) <= max;
}

export async function GET(request: Request) {
  try {
    await ensureScenarioSchema();
    const companyId = Number(new URL(request.url).searchParams.get("companyId"));
    const query = getDb().select().from(scenarios);
    const rows = Number.isInteger(companyId) && companyId > 0
      ? await query.where(eq(scenarios.companyId, companyId)).orderBy(desc(scenarios.createdAt), desc(scenarios.id)).limit(40)
      : await query.orderBy(desc(scenarios.createdAt), desc(scenarios.id)).limit(100);
    return Response.json({ scenarios: rows });
  } catch {
    return Response.json({ error: "O histórico ainda não está disponível." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureScenarioSchema();
    const payload = (await request.json()) as Record<string, unknown>;
    const name = typeof payload.name === "string" ? payload.name.trim().slice(0, 80) : "";
    const priceAdjustmentBps = payload.priceAdjustmentBps ?? 0;
    if (!name || !validInteger(payload.companyId, 1, 1_000_000_000) || !validInteger(payload.revenueCents, 100_000, 10_000_000_000) || !validInteger(payload.currentRateBps, 0, 10_000) || !validInteger(payload.newRateBps, 0, 10_000) || !validInteger(payload.costRateBps, 0, 10_000) || !validInteger(priceAdjustmentBps, 0, 10_000)) {
      return Response.json({ error: "Revise os valores do cenário." }, { status: 400 });
    }

    const [scenario] = await getDb().insert(scenarios).values({
      name,
      revenueCents: Number(payload.revenueCents),
      currentRateBps: Number(payload.currentRateBps),
      newRateBps: Number(payload.newRateBps),
      costRateBps: Number(payload.costRateBps),
      priceAdjustmentBps: Number(priceAdjustmentBps),
      companyId: Number(payload.companyId),
    }).returning();

    return Response.json({ scenario }, { status: 201 });
  } catch {
    return Response.json({ error: "Não foi possível salvar o cenário." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await ensureScenarioSchema();
    const id = Number(new URL(request.url).searchParams.get("id"));
    if (!Number.isInteger(id) || id <= 0) {
      return Response.json({ error: "Cenário inválido." }, { status: 400 });
    }
    await getDb().delete(scenarios).where(eq(scenarios.id, id));
    return Response.json({ deleted: true });
  } catch {
    return Response.json({ error: "Não foi possível excluir o cenário." }, { status: 500 });
  }
}

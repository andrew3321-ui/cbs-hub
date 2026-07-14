import { and, eq } from "drizzle-orm";
import { ensureScenarioSchema, getDb } from "../../../../db";
import { auditEvents, companies, scenarios } from "../../../../db/schema";
import { getCurrentUser } from "../../../auth";
import { signedRecordFromScenario, verifyScenarioRecord } from "../../../scenario-signing";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para encaminhar a revisão." }, { status: 401 });
  try {
    await ensureScenarioSchema();
    const payload = (await request.json()) as Record<string, unknown>;
    const scenarioId = Number(payload.scenarioId);
    if (!Number.isInteger(scenarioId) || scenarioId <= 0) return Response.json({ error: "Cenário inválido." }, { status: 400 });

    const db = getDb();
    const [owned] = await db.select({ scenario: scenarios }).from(scenarios).innerJoin(companies, eq(scenarios.companyId, companies.id)).where(and(eq(scenarios.id, scenarioId), eq(companies.ownerUserId, user.id))).limit(1);
    const scenario = owned?.scenario;
    if (!scenario) return Response.json({ error: "Cenário não encontrado." }, { status: 404 });
    if (!scenario.snapshotJson || !scenario.inputHash || scenario.calculationVersion === "legacy") return Response.json({ error: "Este registro é anterior à blindagem. Carregue as premissas e salve uma nova versão." }, { status: 409 });
    const signedRecord = signedRecordFromScenario(scenario, user.id);
    if (!signedRecord || !(await verifyScenarioRecord(signedRecord, scenario.recordSignature, scenario.signatureVersion))) return Response.json({ error: "A verificação criptográfica falhou. Este registro foi bloqueado e não pode seguir para revisão." }, { status: 409 });
    if (scenario.reviewStatus === "ready_for_review") return Response.json({ scenario: { id: scenario.id, reviewStatus: scenario.reviewStatus } });

    await db.update(scenarios).set({ reviewStatus: "ready_for_review" }).where(eq(scenarios.id, scenarioId));
    await db.insert(auditEvents).values({ ownerUserId: user.id, companyId: scenario.companyId, scenarioId, eventType: "scenario.ready_for_review", eventData: JSON.stringify({ name: scenario.name, inputHash: scenario.inputHash, calculationVersion: scenario.calculationVersion, methodologyVersion: scenario.methodologyVersion }) });
    return Response.json({ scenario: { id: scenario.id, reviewStatus: "ready_for_review" } });
  } catch {
    return Response.json({ error: "Não foi possível encaminhar o cenário para revisão." }, { status: 500 });
  }
}

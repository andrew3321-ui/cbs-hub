import { desc } from "drizzle-orm";
import { ensureScenarioSchema, getDb } from "../../../../../db";
import { privacyRequestEvents } from "../../../../../db/schema";
import { withApiTelemetry } from "../../../../api-infrastructure";
import { getPlatformAdminUser } from "../../../../platform-admin";

async function listPrivacyRequests() {
  const admin = await getPlatformAdminUser();
  if (!admin) return Response.json({ error: "Área restrita ao administrador da plataforma." }, { status: 403 });
  await ensureScenarioSchema();
  const rows = await getDb().select({
    id: privacyRequestEvents.id,
    subjectHash: privacyRequestEvents.subjectHash,
    workspaceHash: privacyRequestEvents.workspaceHash,
    action: privacyRequestEvents.action,
    status: privacyRequestEvents.status,
    requestId: privacyRequestEvents.requestId,
    createdAt: privacyRequestEvents.createdAt,
    retainUntil: privacyRequestEvents.retainUntil,
  }).from(privacyRequestEvents).orderBy(desc(privacyRequestEvents.createdAt), desc(privacyRequestEvents.id)).limit(1000);
  return Response.json({ requests: rows }, { headers: { "Cache-Control": "no-store" } });
}

export const GET = withApiTelemetry("GET /api/admin/security/privacy-requests", listPrivacyRequests);

import { and, eq } from "drizzle-orm";
import {
  ACCOUNT_ONBOARDING_STAGE_COUNT,
  ACCOUNT_ONBOARDING_VERSION,
  onboardingCompletionPercentage,
  onboardingIsComplete,
  onboardingTrackFor,
  sanitizeOnboardingCompletedItems,
} from "../../../domain/account-onboarding";
import { ensureScenarioSchema, getDb } from "../../../db";
import { workspaceOnboardingProgress } from "../../../db/schema";
import { withApiTelemetry } from "../../api-infrastructure";
import { getCurrentUser } from "../../auth";
import { getWorkspaceContext } from "../../workspace";

function parseStoredItems(value: string | null | undefined, workspaceType: "individual" | "office") {
  try {
    return sanitizeOnboardingCompletedItems(workspaceType, JSON.parse(value ?? "[]"));
  } catch {
    return [];
  }
}

function normalizeStage(value: unknown) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return 0;
  return Math.min(ACCOUNT_ONBOARDING_STAGE_COUNT - 1, Math.max(0, parsed));
}

function publicProgress(
  workspaceType: "individual" | "office",
  stored?: typeof workspaceOnboardingProgress.$inferSelect,
) {
  const completedItemIds = parseStoredItems(stored?.completedItemIdsJson, workspaceType);
  return {
    version: ACCOUNT_ONBOARDING_VERSION,
    workspaceType,
    currentStage: normalizeStage(stored?.currentStage ?? 0),
    completedItemIds,
    completedItems: completedItemIds.length,
    totalItems: onboardingTrackFor(workspaceType).length,
    completionPercentage: onboardingCompletionPercentage(workspaceType, completedItemIds),
    dismissedAt: stored?.dismissedAt ?? null,
    completedAt: stored?.completedAt ?? null,
    isComplete: onboardingIsComplete(workspaceType, completedItemIds),
    updatedAt: stored?.updatedAt ?? null,
  };
}

async function contextOrResponse() {
  const user = await getCurrentUser();
  if (!user) return { response: Response.json({ error: "Faça login para acessar o guia inicial." }, { status: 401 }) };
  await ensureScenarioSchema();
  const workspace = await getWorkspaceContext(user.id);
  if (!workspace) return { response: Response.json({ error: "Espaço profissional não encontrado." }, { status: 403 }) };
  return { user, workspace };
}

async function getOnboarding() {
  const context = await contextOrResponse();
  if ("response" in context) return context.response;
  const [stored] = await getDb().select().from(workspaceOnboardingProgress).where(and(
    eq(workspaceOnboardingProgress.workspaceId, context.workspace.id),
    eq(workspaceOnboardingProgress.userId, context.user.id),
    eq(workspaceOnboardingProgress.onboardingVersion, ACCOUNT_ONBOARDING_VERSION),
  )).limit(1);
  return Response.json({
    progress: publicProgress(context.workspace.type, stored),
  }, { headers: { "Cache-Control": "no-store" } });
}

async function updateOnboarding(request: Request) {
  const context = await contextOrResponse();
  if ("response" in context) return context.response;
  try {
    const payload = await request.json() as Record<string, unknown>;
    const hasCompletedItems = Object.hasOwn(payload, "completedItemIds");
    const hasCurrentStage = Object.hasOwn(payload, "currentStage");
    const hasDismissed = typeof payload.dismissed === "boolean";
    if (hasCompletedItems && !Array.isArray(payload.completedItemIds)) {
      return Response.json({ error: "O estado do checklist é inválido." }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }
    const db = getDb();
    const [stored] = await db.select().from(workspaceOnboardingProgress).where(and(
      eq(workspaceOnboardingProgress.workspaceId, context.workspace.id),
      eq(workspaceOnboardingProgress.userId, context.user.id),
      eq(workspaceOnboardingProgress.onboardingVersion, ACCOUNT_ONBOARDING_VERSION),
    )).limit(1);
    const completedItemIds = hasCompletedItems
      ? sanitizeOnboardingCompletedItems(context.workspace.type, payload.completedItemIds)
      : parseStoredItems(stored?.completedItemIdsJson, context.workspace.type);
    const currentStage = hasCurrentStage ? normalizeStage(payload.currentStage) : normalizeStage(stored?.currentStage ?? 0);
    const now = new Date().toISOString();
    const dismissedAt = hasDismissed ? payload.dismissed === true ? now : null : stored?.dismissedAt ?? null;
    const completedAt = onboardingIsComplete(context.workspace.type, completedItemIds) ? stored?.completedAt ?? now : null;
    const id = stored?.id ?? crypto.randomUUID();
    const updateSet: Partial<typeof workspaceOnboardingProgress.$inferInsert> = {
      workspaceType: context.workspace.type,
      updatedAt: now,
    };
    if (hasCompletedItems) {
      updateSet.completedItemIdsJson = JSON.stringify(completedItemIds);
      updateSet.completedAt = completedAt;
    }
    if (hasCurrentStage) updateSet.currentStage = currentStage;
    if (hasDismissed) updateSet.dismissedAt = dismissedAt;

    await db.insert(workspaceOnboardingProgress).values({
      id,
      workspaceId: context.workspace.id,
      userId: context.user.id,
      onboardingVersion: ACCOUNT_ONBOARDING_VERSION,
      workspaceType: context.workspace.type,
      currentStage,
      completedItemIdsJson: JSON.stringify(completedItemIds),
      dismissedAt,
      completedAt,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: [
        workspaceOnboardingProgress.workspaceId,
        workspaceOnboardingProgress.userId,
        workspaceOnboardingProgress.onboardingVersion,
      ],
      set: updateSet,
    });

    const [saved] = await db.select().from(workspaceOnboardingProgress).where(and(
      eq(workspaceOnboardingProgress.workspaceId, context.workspace.id),
      eq(workspaceOnboardingProgress.userId, context.user.id),
      eq(workspaceOnboardingProgress.onboardingVersion, ACCOUNT_ONBOARDING_VERSION),
    )).limit(1);
    if (!saved) throw new Error("onboarding_progress_not_persisted");
    return Response.json({ progress: publicProgress(context.workspace.type, saved) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return Response.json({ error: "O estado enviado não é um JSON válido." }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }
    throw error;
  }
}

export const GET = withApiTelemetry("GET /api/onboarding", getOnboarding);
export const PATCH = withApiTelemetry("PATCH /api/onboarding", updateOnboarding);

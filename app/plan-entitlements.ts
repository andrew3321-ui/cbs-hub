import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { billingAccounts, trialDeviceClaims, users } from "../db/schema";
import { applyPlanUsage, resolveWorkspacePlan, type BillingAccessSnapshot, type WorkspaceEntitlements } from "../domain/plan-entitlements";
import { isPlatformAdminEmail } from "./platform-admin";
import { getPlatformOperationState } from "./platform-controls";
import type { WorkspaceContext } from "./workspace";

export async function getWorkspaceEntitlements(workspace: WorkspaceContext, now = Date.now()): Promise<WorkspaceEntitlements> {
  const db = getDb();
  const [[billingAccount], [trial], [owner], operation, scopeCount] = await Promise.all([
    db.select({ planKey: billingAccounts.planKey, status: billingAccounts.status, providerSubscriptionId: billingAccounts.providerSubscriptionId, nextPaymentAt: billingAccounts.nextPaymentAt }).from(billingAccounts).where(eq(billingAccounts.userId, workspace.ownerUserId)).limit(1),
    db.select({ startedAt: trialDeviceClaims.startedAt, endsAt: trialDeviceClaims.endsAt, status: trialDeviceClaims.status }).from(trialDeviceClaims).where(eq(trialDeviceClaims.workspaceId, workspace.id)).limit(1),
    db.select({ email: users.email }).from(users).where(eq(users.id, workspace.ownerUserId)).limit(1),
    getPlatformOperationState(),
    env.DB.prepare("SELECT COUNT(*) AS total FROM security_agent_scopes WHERE workspace_id = ? AND status <> 'revoked'").bind(workspace.id).first<{ total: number }>(),
  ]);
  const plan = resolveWorkspacePlan({
    platformOwner: Boolean(owner?.email && isPlatformAdminEmail(owner.email)),
    betaEnabled: operation.betaEnabled,
    billing: (billingAccount ?? null) as BillingAccessSnapshot,
    trial: trial ?? null,
  }, now);
  return applyPlanUsage(plan, billingAccount ?? null, Number(scopeCount?.total ?? 0), trial ?? null, now);
}

export function scopeLimitResponse(entitlements: WorkspaceEntitlements) {
  return Response.json({
    error: `O workspace atingiu o limite de ${entitlements.scopeLimit ?? "escopos"} domínios ativos. Revogue um escopo antigo antes de autorizar outro.`,
    code: "PLAN_SCOPE_LIMIT",
    entitlements,
  }, { status: 409 });
}

export function officePlanRequiredResponse(entitlements: WorkspaceEntitlements) {
  return Response.json({
    error: "A colaboração com equipe ainda não está liberada para este workspace.",
    code: "PLAN_TEAM_REQUIRED",
    entitlements,
  }, { status: 403 });
}

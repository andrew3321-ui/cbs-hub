import { count, eq } from "drizzle-orm";
import { getDb } from "../db";
import { billingAccounts, companies } from "../db/schema";
import { applyPlanUsage, resolveEffectivePlan, type BillingAccessSnapshot, type WorkspaceEntitlements } from "../domain/plan-entitlements";
import type { WorkspaceContext } from "./workspace";

export async function getWorkspaceEntitlements(workspace: WorkspaceContext, now = Date.now()): Promise<WorkspaceEntitlements> {
  const db = getDb();
  const [[billingAccount], [portfolio]] = await Promise.all([
    db.select({
      planKey: billingAccounts.planKey,
      status: billingAccounts.status,
      providerSubscriptionId: billingAccounts.providerSubscriptionId,
      nextPaymentAt: billingAccounts.nextPaymentAt,
    }).from(billingAccounts).where(eq(billingAccounts.userId, workspace.ownerUserId)).limit(1),
    db.select({ total: count() }).from(companies).where(eq(companies.workspaceId, workspace.id)),
  ]);
  const snapshot: BillingAccessSnapshot = billingAccount ?? null;
  return applyPlanUsage(resolveEffectivePlan(snapshot, now), snapshot, Number(portfolio?.total ?? 0));
}

export function companyLimitResponse(entitlements: WorkspaceEntitlements) {
  return Response.json({
    error: entitlements.companyLimitExceeded
      ? `Sua carteira possui ${entitlements.companyCount} empresas, acima do limite de ${entitlements.companyLimit} do plano ${entitlements.name}. Nenhum dado foi removido, mas novos cadastros estão bloqueados.`
      : `O plano ${entitlements.name} permite até ${entitlements.companyLimit} ${entitlements.companyLimit === 1 ? "empresa" : "empresas"}. Faça upgrade para ampliar a carteira.`,
    code: "PLAN_COMPANY_LIMIT",
    entitlements,
  }, { status: 409 });
}

export function officePlanRequiredResponse(entitlements: WorkspaceEntitlements) {
  return Response.json({
    error: "Convites, papéis e revisão por outra pessoa exigem o plano Escritório ativo.",
    code: "PLAN_OFFICE_REQUIRED",
    entitlements,
  }, { status: 403 });
}

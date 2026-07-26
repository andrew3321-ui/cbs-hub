import { count, eq } from "drizzle-orm";
import { getDb } from "../db";
import { billingAccounts, companies, trialDeviceClaims, users } from "../db/schema";
import { applyPlanUsage, resolveWorkspacePlan, type BillingAccessSnapshot, type PlanFeatureKey, type WorkspaceEntitlements } from "../domain/plan-entitlements";
import { isPlatformAdminEmail } from "./platform-admin";
import { getPlatformOperationState } from "./platform-controls";
import { getCurrentUser } from "./auth";
import { getWorkspaceContext, type WorkspaceContext } from "./workspace";

export async function getWorkspaceEntitlements(workspace: WorkspaceContext, now = Date.now()): Promise<WorkspaceEntitlements> {
  const db = getDb();
  const [[billingAccount], [trial], [portfolio], [owner], operation] = await Promise.all([
    db.select({
      planKey: billingAccounts.planKey,
      status: billingAccounts.status,
      providerSubscriptionId: billingAccounts.providerSubscriptionId,
      nextPaymentAt: billingAccounts.nextPaymentAt,
      companyAddonBlocks: billingAccounts.companyAddonBlocks,
      pendingCompanyAddonBlocks: billingAccounts.pendingCompanyAddonBlocks,
    }).from(billingAccounts).where(eq(billingAccounts.userId, workspace.ownerUserId)).limit(1),
    db.select({
      startedAt: trialDeviceClaims.startedAt,
      endsAt: trialDeviceClaims.endsAt,
      status: trialDeviceClaims.status,
    }).from(trialDeviceClaims).where(eq(trialDeviceClaims.workspaceId, workspace.id)).limit(1),
    db.select({ total: count() }).from(companies).where(eq(companies.workspaceId, workspace.id)),
    db.select({ email: users.email }).from(users).where(eq(users.id, workspace.ownerUserId)).limit(1),
    getPlatformOperationState(),
  ]);
  const snapshot: BillingAccessSnapshot = billingAccount ?? null;
  const plan = resolveWorkspacePlan({
    platformOwner: Boolean(owner?.email && isPlatformAdminEmail(owner.email)),
    betaEnabled: operation.betaEnabled,
    billing: snapshot,
    trial: trial ?? null,
  }, now);
  return applyPlanUsage(plan, snapshot, Number(portfolio?.total ?? 0), trial ?? null, now);
}

export function companyLimitResponse(entitlements: WorkspaceEntitlements) {
  const limit = entitlements.companyLimit;
  return Response.json({
    error: limit === null
      ? "O cadastro não pôde ser concluído agora."
      : entitlements.companyLimitExceeded
        ? `Sua carteira possui ${entitlements.companyCount} empresas, acima do limite de ${limit} do plano ${entitlements.name}. Nenhum dado foi removido, mas novos cadastros estão bloqueados.`
        : entitlements.trialActive
          ? `O teste profissional permite até ${limit} empresas durante 5 dias. Para ampliar a carteira, contrate o plano Margem Clara.`
          : `O plano ${entitlements.name} permite até ${limit} ${limit === 1 ? "empresa" : "empresas"}. Contrate mais um bloco de ${entitlements.companyAddonBlockSize} empresas para ampliar a carteira.`,
    code: "PLAN_COMPANY_LIMIT",
    entitlements,
  }, { status: 409 });
}

export function featureRequiredResponse(entitlements: WorkspaceEntitlements, feature: PlanFeatureKey) {
  const officeOnly = feature === "officeCollaborationEnabled";
  return Response.json({
    error: officeOnly
      ? "Convites, papéis e revisão por outra pessoa exigem o plano Margem Clara ativo."
      : "Este recurso exige o plano Margem Clara ativo.",
    code: officeOnly ? "PLAN_OFFICE_REQUIRED" : "PLAN_FEATURE_REQUIRED",
    requiredPlan: "unico",
    feature,
    entitlements,
  }, { status: 403 });
}

export async function workspaceFeatureResponse(userId: number, feature: PlanFeatureKey) {
  const workspace = await getWorkspaceContext(userId);
  if (!workspace) return Response.json({ error: "Espaço profissional não encontrado." }, { status: 403 });
  const entitlements = await getWorkspaceEntitlements(workspace);
  return entitlements[feature] ? null : featureRequiredResponse(entitlements, feature);
}

type FeatureProtectedHandler = (request: Request) => Promise<Response>;

export function withWorkspaceFeature(feature: PlanFeatureKey, handler: FeatureProtectedHandler): FeatureProtectedHandler {
  return async (request) => {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Faça login para acessar este recurso." }, { status: 401 });
    const blocked = await workspaceFeatureResponse(user.id, feature);
    return blocked ?? handler(request);
  };
}

export function officePlanRequiredResponse(entitlements: WorkspaceEntitlements) {
  return featureRequiredResponse(entitlements, "officeCollaborationEnabled");
}

import { env } from "cloudflare:workers";
import { normalizeProfessionalRegistration, professionalRegistrationError } from "../../professional-registration";
import { getActiveNationalRuleApproval, RULE_APPROVAL_DECLARATION_VERSION, signRuleApproval } from "../../fiscal-rule-approval";
import { ensureScenarioSchema } from "../../../db";
import { withApiTelemetry } from "../../api-infrastructure";
import { getCurrentUser } from "../../auth";
import { canReviewScenarios, getWorkspaceContext } from "../../workspace";

async function status() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para consultar a governança." }, { status: 401 });
  const workspace = await getWorkspaceContext(user.id);
  if (!workspace) return Response.json({ error: "Espaço contábil não encontrado." }, { status: 403 });
  const result = await getActiveNationalRuleApproval(workspace.id);
  return Response.json({ identity: { ...result.identity, ruleHash: result.identity.ruleHash.slice(0, 12) }, approval: result.approval ? { reviewerName: result.approval.reviewerName, professionalRole: result.approval.professionalRole, professionalRegistration: result.approval.professionalRegistration, decidedAt: result.approval.decidedAt, verified: result.verified } : null, executionEnabled: result.verified, canApprove: canReviewScenarios(workspace.role) }, { headers: { "Cache-Control": "no-store" } });
}

async function approve(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para aprovar regras." }, { status: 401 });
  const workspace = await getWorkspaceContext(user.id);
  if (!workspace || !canReviewScenarios(workspace.role)) return Response.json({ error: "Seu papel não permite aprovar regras fiscais." }, { status: 403 });
  try {
    const body = await request.json() as Record<string, unknown>;
    if (body.declarationAccepted !== true) return Response.json({ error: "A declaração técnica precisa ser aceita." }, { status: 400 });
    const professionalRole = String(body.professionalRole ?? "");
    if (!["accountant", "tax_lawyer"].includes(professionalRole)) return Response.json({ error: "Selecione contador ou tributarista." }, { status: 400 });
    const professionalRegistration = normalizeProfessionalRegistration(String(body.professionalRegistration ?? ""));
    const registrationError = professionalRegistrationError(professionalRegistration);
    if (registrationError) return Response.json({ error: registrationError }, { status: 400 });
    const active = await getActiveNationalRuleApproval(workspace.id);
    if (String(body.ruleHash ?? "") !== active.identity.ruleHash.slice(0, 12)) return Response.json({ error: "A base mudou. Reabra a governança antes de aprovar." }, { status: 409 });
    if (active.verified) return status();
    const decidedAt = new Date().toISOString();
    const record = { workspaceId: workspace.id, ruleCode: active.identity.ruleCode, ruleVersion: active.identity.ruleVersion, ruleHash: active.identity.ruleHash, approvedByUserId: user.id, reviewerName: user.name, professionalRole, professionalRegistration, decision: "approved", declarationVersion: RULE_APPROVAL_DECLARATION_VERSION, decidedAt };
    const signature = await signRuleApproval(record);
    await ensureScenarioSchema();
    await env.DB.prepare("INSERT INTO fiscal_rule_approvals (id, workspace_id, rule_code, rule_version, rule_hash, approved_by_user_id, reviewer_name, professional_role, professional_registration, decision, declaration_version, decision_signature, decided_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', ?, ?, ?, ?)")
      .bind(crypto.randomUUID(), workspace.id, record.ruleCode, record.ruleVersion, record.ruleHash, user.id, user.name, professionalRole, professionalRegistration, RULE_APPROVAL_DECLARATION_VERSION, signature, decidedAt, decidedAt).run();
    return status();
  } catch (cause) {
    const message = cause instanceof Error && cause.message === "rule_approval_signing_key_unavailable" ? "A chave de assinatura da governança não está configurada." : "Não foi possível registrar a aprovação.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export const GET = withApiTelemetry("GET /api/rule-governance", status);
export const POST = withApiTelemetry("POST /api/rule-governance", approve);

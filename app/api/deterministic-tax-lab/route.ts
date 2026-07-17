import { calculateTaxLab, DETERMINISTIC_TAX_LAB_VERSION, type LabInput } from "../../../domain/deterministic-tax-lab";
import { getActiveNationalRuleApproval } from "../../fiscal-rule-approval";
import { withApiTelemetry } from "../../api-infrastructure";
import { getCurrentUser } from "../../auth";
import { getWorkspaceContext, sha256Hex } from "../../workspace";

async function calculate(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para usar o laboratório fiscal." }, { status: 401 });
  const workspace = await getWorkspaceContext(user.id);
  if (!workspace) return Response.json({ error: "Espaço contábil não encontrado." }, { status: 403 });

  try {
    const input = await request.json() as LabInput;
    const calculated = calculateTaxLab(input);
    const inputHash = await sha256Hex(JSON.stringify({ engineVersion: DETERMINISTIC_TAX_LAB_VERSION, input }));
    let governanceVerified = false;
    let governanceFingerprint: string | null = null;
    try {
      const approval = await getActiveNationalRuleApproval(workspace.id);
      governanceVerified = approval.verified;
      governanceFingerprint = approval.identity.ruleHash.slice(0, 12);
    } catch {
      // O cálculo de referência permanece disponível, mas nunca recebe selo profissional sem governança verificável.
    }
    return Response.json({
      result: calculated,
      audit: { inputHash, engineVersion: DETERMINISTIC_TAX_LAB_VERSION, calculatedAt: new Date().toISOString() },
      governance: {
        professionalApprovalVerified: governanceVerified,
        rulesFingerprint: governanceFingerprint,
        eligibleForProfessionalUse: governanceVerified && calculated.status === "calculated_reference",
        message: governanceVerified
          ? "Governança profissional ativa. Ainda é necessário revisar os fatos desta operação."
          : "Resultado de referência sem selo profissional. Aprove a versão das regras e revise os fatos antes de usar.",
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "invalid_input";
    const messages: Record<string, string> = {
      rbt12_out_of_annex_i: "O RBT12 está fora do limite do Anexo I suportado pelo laboratório.",
      unsupported_module: "Este módulo de cálculo ainda não é suportado.",
    };
    return Response.json({ error: messages[reason] ?? "Revise os valores e fatos obrigatórios do cálculo.", code: reason }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
}

export const POST = withApiTelemetry("POST /api/deterministic-tax-lab", calculate);

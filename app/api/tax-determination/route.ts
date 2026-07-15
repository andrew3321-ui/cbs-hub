import { and, count, eq } from "drizzle-orm";
import {
  calculateTaxDetermination,
  hashTaxDeterminationBlueprint,
  TAX_DETERMINATION_ENGINE_VERSION,
  taxDeterminationBlueprint,
  taxDeterminationCasePasses,
  taxDeterminationReferenceCases,
} from "../../../domain/tax-determination";
import { ensureScenarioSchema, getDb } from "../../../db";
import { taxPeriods } from "../../../db/schema";
import { withApiTelemetry } from "../../api-infrastructure";
import { getCurrentUser } from "../../auth";
import { getWorkspaceContext } from "../../workspace";

async function getTaxDeterminationModel() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para consultar o modelo de apuração." }, { status: 401 });

  try {
    await ensureScenarioSchema();
    const workspace = await getWorkspaceContext(user.id);
    if (!workspace) return Response.json({ error: "Espaço profissional não encontrado." }, { status: 403 });
    const db = getDb();
    const [[periodTotal], [closedTotal]] = await Promise.all([
      db.select({ value: count() }).from(taxPeriods).where(eq(taxPeriods.ownerUserId, workspace.ownerUserId)),
      db.select({ value: count() }).from(taxPeriods).where(and(eq(taxPeriods.ownerUserId, workspace.ownerUserId), eq(taxPeriods.status, "closed"))),
    ]);
    const fingerprint = await hashTaxDeterminationBlueprint();
    const referenceCases = taxDeterminationReferenceCases.map((referenceCase) => {
      const output = calculateTaxDetermination(referenceCase.input);
      return {
        code: referenceCase.code,
        title: referenceCase.title,
        passed: taxDeterminationCasePasses(referenceCase),
        legalEffect: referenceCase.input.legalEffect,
        closingReady: output.closingReady,
        cbsPreliminaryDebitCents: output.ledgers.CBS.preliminaryDebitBalanceCents,
        ibsPreliminaryDebitCents: output.ledgers.IBS.preliminaryDebitBalanceCents,
        cbsNetPayableCents: output.ledgers.CBS.netPayableCents,
        ibsNetPayableCents: output.ledgers.IBS.netPayableCents,
        issueCodes: output.issues.map((issue) => issue.code),
      };
    });
    const casesPassed = referenceCases.every((referenceCase) => referenceCase.passed);
    const simulationExample = calculateTaxDetermination(taxDeterminationReferenceCases[0].input);

    return Response.json({
      blueprint: taxDeterminationBlueprint,
      fingerprint: fingerprint.slice(0, 12),
      engineVersion: TAX_DETERMINATION_ENGINE_VERSION,
      integrityStatus: casesPassed ? "verified" : "invalid",
      casesPassed,
      referenceCases,
      execution: {
        status: "blocked",
        netPayableEnabled: false,
        reasons: [
          "Modelo ainda em revisão profissional",
          "Nenhuma versão normativa de cálculo está aprovada",
          "Integrações oficiais e conciliação em três vias ainda não estão habilitadas",
          "Competências de 2026 têm caráter de simulação neste modelo",
        ],
      },
      simulationExample: {
        period: simulationExample.period,
        legalEffect: simulationExample.legalEffect,
        cbs: simulationExample.ledgers.CBS,
        ibs: simulationExample.ledgers.IBS,
        netPayableEnabled: simulationExample.netPayableEnabled,
      },
      workspace: {
        totalPeriods: periodTotal?.value ?? 0,
        closedPeriods: closedTotal?.value ?? 0,
        writesEnabled: false,
      },
    }, { headers: { "Cache-Control": "private, max-age=60" } });
  } catch {
    return Response.json({ error: "Não foi possível verificar o modelo de apuração." }, { status: 500 });
  }
}

export const GET = withApiTelemetry("GET /api/tax-determination", getTaxDeterminationModel);

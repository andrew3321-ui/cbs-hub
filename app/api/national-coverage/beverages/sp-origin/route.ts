import {
  hashStColdBeverageSpOrigin,
  resolveColdBeverageSpOriginOperation,
  ST_COLD_BEVERAGES_SP_ORIGIN_VERSION,
  type ColdBeverageSpOriginFacts,
  type ColdBeverageSpOriginOperationInput,
} from "../../../../../domain/st-cold-beverages-sp-origin";
import { validateNationalCoverageAutomatically } from "../../../../../domain/national-coverage-automatic-assurance";
import { withApiTelemetry } from "../../../../api-infrastructure";
import { getCurrentUser } from "../../../../auth";
import { ColdBeverageDossierError, prepareColdBeverageDossier } from "../../../../cold-beverage-dossier-service";
import { withWorkspaceFeature } from "../../../../plan-entitlements";
import { getWorkspaceContext } from "../../../../workspace";

async function calculateSpOriginBeverage(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para calcular as novas rotas de bebidas." }, { status: 401 });
  const workspace = await getWorkspaceContext(user.id);
  if (!workspace) return Response.json({ error: "Espaço contábil não encontrado." }, { status: 403 });
  const assurance = validateNationalCoverageAutomatically();
  if (assurance.status !== "automatically_verified") {
    return Response.json({
      error: "Execução bloqueada: a verificação automática encontrou uma falha de integridade na base.",
      code: "automatic_assurance_failed",
      details: assurance.errors,
    }, { status: 503 });
  }
  try {
    const body = await request.json() as Record<string, unknown>;
    const rawFacts = body.facts && typeof body.facts === "object" ? body.facts as Record<string, unknown> : {};
    const facts = Object.fromEntries(
      Object.entries(rawFacts).map(([key, value]) => [key, value === true]),
    ) as ColdBeverageSpOriginFacts;
    const input: ColdBeverageSpOriginOperationInput = {
      route: String(body.route ?? ""),
      profileCode: String(body.profileCode ?? ""),
      operationDate: String(body.operationDate ?? ""),
      quantityUnits: Number(body.quantityUnits),
      operationCents: Number(body.operationCents),
      ownIcmsBaseCents: Number(body.ownIcmsBaseCents),
      importedQualified: body.importedQualified === true,
      facts,
    };
    const result = resolveColdBeverageSpOriginOperation(input);
    const fingerprint = (await hashStColdBeverageSpOrigin()).slice(0, 12);
    const dossier = await prepareColdBeverageDossier({
      scope: "sp_origin",
      input,
      result,
      fingerprint,
      saveDossier: body.saveDossier === true,
      companyIdValue: body.companyId,
      workspace,
      userId: user.id,
    });
    return Response.json({
      result,
      ...dossier,
      rule: {
        version: ST_COLD_BEVERAGES_SP_ORIGIN_VERSION,
        fingerprint,
        assurance: assurance.status,
      },
    }, { status: body.saveDossier === true && "dossier" in dossier && dossier.idempotent === false ? 201 : 200, headers: { "Cache-Control": "no-store" } });
  } catch (cause) {
    if (cause instanceof ColdBeverageDossierError) {
      const errors = {
        forbidden: ["Seu papel não permite congelar dossiês fiscais.", 403],
        invalid_company: ["Cliente inválido.", 400],
        company_not_found: ["O cliente não pertence a este espaço contábil.", 404],
        persistence_conflict: ["O dossiê não foi persistido integralmente.", 409],
      } as const;
      const [error, status] = errors[cause.code];
      return Response.json({ error }, { status });
    }
    return Response.json({ error: "Não foi possível ler os fatos da nova rota de bebidas." }, { status: 400 });
  }
}

export const POST = withApiTelemetry(
  "POST /api/national-coverage/beverages/sp-origin",
  withWorkspaceFeature("nationalCoverageEnabled", calculateSpOriginBeverage),
);

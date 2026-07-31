import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import { createAutoPartsDossierSnapshot } from "../../../../domain/auto-parts-dossier";
import {
  hashStAutoPartsHighUseCorridors,
  resolveAutoPartsPriorityOperation,
  ST_AUTO_PARTS_HIGH_USE_CORRIDORS_VERSION,
  type AutoPartsOperationFacts,
  type AutoPartsOperationInput,
} from "../../../../domain/st-auto-parts-high-use-corridors";
import { validateNationalCoverageAutomatically } from "../../../../domain/national-coverage-automatic-assurance";
import { ensureScenarioSchema, getDb } from "../../../../db";
import { companies, fiscalDossiers } from "../../../../db/schema";
import { withApiTelemetry } from "../../../api-infrastructure";
import { getCurrentUser } from "../../../auth";
import { withWorkspaceFeature } from "../../../plan-entitlements";
import { canPrepareScenarios, getWorkspaceContext } from "../../../workspace";

async function calculateAutoParts(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Faça login para calcular a referência de autopeças." }, { status: 401 });
  const workspace = await getWorkspaceContext(user.id);
  if (!workspace) return Response.json({ error: "Espaço contábil não encontrado." }, { status: 403 });
  const assurance = validateNationalCoverageAutomatically();
  if (assurance.status !== "automatically_verified") {
    return Response.json({ error: "Execução bloqueada: a verificação automática encontrou uma falha de integridade na base.", code: "automatic_assurance_failed", details: assurance.errors }, { status: 503 });
  }
  try {
    const body = await request.json() as Record<string, unknown>;
    const rawFacts = body.facts && typeof body.facts === "object" ? body.facts as Record<string, unknown> : {};
    const facts = Object.fromEntries(Object.entries(rawFacts).map(([key, value]) => [key, value === true])) as AutoPartsOperationFacts;
    const input: AutoPartsOperationInput = {
      route: String(body.route ?? ""),
      operationDate: String(body.operationDate ?? ""),
      operationCents: Number(body.operationCents),
      ownIcmsBaseCents: Number(body.ownIcmsBaseCents),
      cest: String(body.cest ?? ""),
      ncm: String(body.ncm ?? ""),
      importedQualified: body.importedQualified === true,
      productOrigin: body.productOrigin === "imported" ? "imported" : body.productOrigin === "domestic" ? "domestic" : undefined,
      importRuleQualification: ["not_applicable", "qualifies", "does_not_qualify", "unknown"].includes(String(body.importRuleQualification))
        ? String(body.importRuleQualification) as AutoPartsOperationInput["importRuleQualification"]
        : undefined,
      commercialCondition: String(body.commercialCondition ?? "") as AutoPartsOperationInput["commercialCondition"],
      facts,
    };
    const result = resolveAutoPartsPriorityOperation(input);
    const fingerprint = (await hashStAutoPartsHighUseCorridors()).slice(0, 12);
    const { snapshot, inputHash } = await createAutoPartsDossierSnapshot(input, result, fingerprint);
    const responseBase = {
      result,
      dossierPreview: snapshot,
      inputHash,
      rule: { version: ST_AUTO_PARTS_HIGH_USE_CORRIDORS_VERSION, fingerprint, assurance: assurance.status },
    };
    if (body.saveDossier !== true) {
      return Response.json(responseBase, { headers: { "Cache-Control": "no-store" } });
    }

    if (!canPrepareScenarios(workspace.role)) return Response.json({ error: "Seu papel não permite congelar dossiês fiscais." }, { status: 403 });
    await ensureScenarioSchema();
    const companyId = body.companyId === undefined || body.companyId === null || body.companyId === "" ? null : Number(body.companyId);
    if (companyId !== null && (!Number.isInteger(companyId) || companyId <= 0)) return Response.json({ error: "Cliente inválido." }, { status: 400 });
    if (companyId !== null) {
      const [company] = await getDb().select({ id: companies.id }).from(companies).where(and(eq(companies.id, companyId), eq(companies.workspaceId, workspace.id))).limit(1);
      if (!company) return Response.json({ error: "O cliente não pertence a este espaço contábil." }, { status: 404 });
    }
    const [existing] = await getDb().select({ id: fiscalDossiers.id, status: fiscalDossiers.status }).from(fiscalDossiers).where(and(eq(fiscalDossiers.workspaceId, workspace.id), eq(fiscalDossiers.inputHash, inputHash))).limit(1);
    if (existing) {
      return Response.json({
        ...responseBase,
        dossier: { id: existing.id, status: existing.status, reportUrl: `/relatorio-fiscal/${existing.id}` },
        idempotent: true,
      }, { headers: { "Cache-Control": "no-store" } });
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const eventData = JSON.stringify({
      inputHash,
      coverageStatus: snapshot.coverage.status,
      calculationStatus: snapshot.calculation.status,
      baseVersion: snapshot.rule.version,
      engineVersion: snapshot.engineVersion,
      sourceCodes: snapshot.evidence.sources.map((source) => source.code),
    });
    const results = await env.DB.batch([
      env.DB.prepare("INSERT INTO fiscal_dossiers (id, workspace_id, owner_user_id, company_id, created_by_user_id, title, question, status, base_code, base_version, engine_version, facts_json, calculation_input_json, snapshot_json, input_hash, review_note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, '', ?, ?)")
        .bind(id, workspace.id, workspace.ownerUserId, companyId, user.id, snapshot.title, snapshot.question, snapshot.rule.code, snapshot.rule.version, snapshot.engineVersion, JSON.stringify(input.facts), JSON.stringify(input), JSON.stringify(snapshot), inputHash, now, now),
      env.DB.prepare("INSERT INTO fiscal_dossier_events (dossier_id, workspace_id, actor_user_id, event_type, note, event_data, created_at) SELECT id, workspace_id, ?, 'fiscal_dossier.auto_parts_created', 'Dossiê de autopeças congelado com fontes e memória reproduzível.', ?, ? FROM fiscal_dossiers WHERE id = ?")
        .bind(user.id, eventData, now, id),
    ]);
    if (results[0].meta.changes !== 1 || results[1].meta.changes !== 1) return Response.json({ error: "O dossiê não foi persistido integralmente." }, { status: 409 });
    return Response.json({
      ...responseBase,
      dossier: { id, status: "draft", reportUrl: `/relatorio-fiscal/${id}` },
      idempotent: false,
    }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Não foi possível ler, calcular ou congelar os fatos da operação de autopeças." }, { status: 400 });
  }
}

export const POST = withApiTelemetry("POST /api/national-coverage/auto-parts", withWorkspaceFeature("nationalCoverageEnabled", calculateAutoParts));

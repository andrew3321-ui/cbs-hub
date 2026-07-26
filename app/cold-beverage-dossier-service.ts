import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import {
  createColdBeverageDossierSnapshot,
  type ColdBeverageDossierScope,
} from "../domain/cold-beverage-dossier";
import type {
  ColdBeverageSpOperationInput,
  ColdBeverageSpOperationResult,
} from "../domain/st-cold-beverages-sp-destination";
import type {
  ColdBeverageSpOriginOperationInput,
  ColdBeverageSpOriginOperationResult,
} from "../domain/st-cold-beverages-sp-origin";
import { ensureScenarioSchema, getDb } from "../db";
import { companies, fiscalDossiers } from "../db/schema";
import { canPrepareScenarios, type WorkspaceRole } from "./workspace";

type SupportedInput = ColdBeverageSpOperationInput | ColdBeverageSpOriginOperationInput;
type SupportedResult = ColdBeverageSpOperationResult | ColdBeverageSpOriginOperationResult;

type WorkspaceForDossier = {
  id: number;
  ownerUserId: number;
  role: WorkspaceRole;
};

export class ColdBeverageDossierError extends Error {
  constructor(
    public readonly code: "forbidden" | "invalid_company" | "company_not_found" | "persistence_conflict",
  ) {
    super(code);
  }
}

export async function prepareColdBeverageDossier(options: {
  scope: ColdBeverageDossierScope;
  input: SupportedInput;
  result: SupportedResult;
  fingerprint: string;
  saveDossier: boolean;
  companyIdValue: unknown;
  workspace: WorkspaceForDossier;
  userId: number;
}) {
  const { snapshot, inputHash } = await createColdBeverageDossierSnapshot(
    options.scope,
    options.input,
    options.result,
    options.fingerprint,
  );
  const preview = { dossierPreview: snapshot, inputHash };
  if (!options.saveDossier) return preview;
  if (!canPrepareScenarios(options.workspace.role)) throw new ColdBeverageDossierError("forbidden");

  await ensureScenarioSchema();
  const companyId = options.companyIdValue === undefined
    || options.companyIdValue === null
    || options.companyIdValue === ""
    ? null
    : Number(options.companyIdValue);
  if (companyId !== null && (!Number.isInteger(companyId) || companyId <= 0)) {
    throw new ColdBeverageDossierError("invalid_company");
  }
  if (companyId !== null) {
    const [company] = await getDb()
      .select({ id: companies.id })
      .from(companies)
      .where(and(eq(companies.id, companyId), eq(companies.workspaceId, options.workspace.id)))
      .limit(1);
    if (!company) throw new ColdBeverageDossierError("company_not_found");
  }

  const [existing] = await getDb()
    .select({ id: fiscalDossiers.id, status: fiscalDossiers.status })
    .from(fiscalDossiers)
    .where(and(eq(fiscalDossiers.workspaceId, options.workspace.id), eq(fiscalDossiers.inputHash, inputHash)))
    .limit(1);
  if (existing) {
    return {
      ...preview,
      dossier: { id: existing.id, status: existing.status, reportUrl: `/relatorio-fiscal/${existing.id}` },
      idempotent: true,
    };
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
      .bind(id, options.workspace.id, options.workspace.ownerUserId, companyId, options.userId, snapshot.title, snapshot.question, snapshot.rule.code, snapshot.rule.version, snapshot.engineVersion, JSON.stringify(options.input.facts), JSON.stringify(options.input), JSON.stringify(snapshot), inputHash, now, now),
    env.DB.prepare("INSERT INTO fiscal_dossier_events (dossier_id, workspace_id, actor_user_id, event_type, note, event_data, created_at) SELECT id, workspace_id, ?, 'fiscal_dossier.cold_beverage_created', 'Dossiê de bebidas congelado com perfil, pauta e memória reproduzível.', ?, ? FROM fiscal_dossiers WHERE id = ?")
      .bind(options.userId, eventData, now, id),
  ]);
  if (results[0].meta.changes !== 1 || results[1].meta.changes !== 1) {
    throw new ColdBeverageDossierError("persistence_conflict");
  }
  return {
    ...preview,
    dossier: { id, status: "draft", reportUrl: `/relatorio-fiscal/${id}` },
    idempotent: false,
  };
}

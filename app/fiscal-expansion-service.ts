import { env } from "cloudflare:workers";
import type { ExpansionProgress, ExpansionStage } from "../domain/fiscal-expansion";

let expansionSchemaReady: Promise<void> | undefined;

type ProgressRow = {
  item_code: string;
  stage: string;
  evidence_note: string;
  evidence_reference: string | null;
  evidence_hash: string | null;
  updated_by_user_id: number;
  updated_at: string;
};

export type ExpansionEvent = {
  id: number;
  itemCode: string;
  actorUserId: number;
  fromStage: ExpansionStage;
  toStage: ExpansionStage;
  evidenceNote: string;
  evidenceReference: string | null;
  evidenceHash: string | null;
  createdAt: string;
};

export function ensureFiscalExpansionSchema() {
  if (!env.DB) throw new Error("Cloudflare D1 binding `DB` is unavailable.");
  const ready = expansionSchemaReady ??= (async () => {
    await env.DB.batch([
      env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS fiscal_expansion_progress (
          id TEXT PRIMARY KEY NOT NULL,
          workspace_id INTEGER NOT NULL,
          item_code TEXT NOT NULL,
          stage TEXT DEFAULT 'catalogued' NOT NULL,
          evidence_note TEXT DEFAULT '' NOT NULL,
          evidence_reference TEXT,
          evidence_hash TEXT,
          updated_by_user_id INTEGER NOT NULL,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
        )
      `),
      env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS fiscal_expansion_progress_workspace_item_idx ON fiscal_expansion_progress (workspace_id, item_code)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS fiscal_expansion_progress_workspace_stage_idx ON fiscal_expansion_progress (workspace_id, stage, updated_at)"),
      env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS fiscal_expansion_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          workspace_id INTEGER NOT NULL,
          item_code TEXT NOT NULL,
          actor_user_id INTEGER NOT NULL,
          from_stage TEXT NOT NULL,
          to_stage TEXT NOT NULL,
          evidence_note TEXT NOT NULL,
          evidence_reference TEXT,
          evidence_hash TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
        )
      `),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS fiscal_expansion_events_workspace_created_idx ON fiscal_expansion_events (workspace_id, created_at, id)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS fiscal_expansion_events_item_created_idx ON fiscal_expansion_events (item_code, created_at, id)"),
      env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS fiscal_expansion_events_workspace_item_hash_idx ON fiscal_expansion_events (workspace_id, item_code, evidence_hash)"),
    ]);
  })().catch((cause) => {
    expansionSchemaReady = undefined;
    throw cause;
  });
  return ready;
}

function isStoredStage(value: string): value is ExpansionStage {
  return ["catalogued", "source_connected", "structured", "tested", "awaiting_professional", "homologated", "blocked"].includes(value);
}

export async function listExpansionProgress(workspaceId: number): Promise<ExpansionProgress[]> {
  await ensureFiscalExpansionSchema();
  const result = await env.DB.prepare("SELECT item_code, stage, evidence_note, evidence_reference, evidence_hash, updated_by_user_id, updated_at FROM fiscal_expansion_progress WHERE workspace_id = ? ORDER BY updated_at DESC")
    .bind(workspaceId).all<ProgressRow>();
  return (result.results ?? []).flatMap((row: ProgressRow) => isStoredStage(row.stage) ? [{
    itemCode: row.item_code,
    stage: row.stage,
    evidenceNote: row.evidence_note,
    evidenceReference: row.evidence_reference,
    evidenceHash: row.evidence_hash,
    updatedAt: row.updated_at,
    updatedByUserId: row.updated_by_user_id,
  }] : []);
}

export async function listExpansionEvents(workspaceId: number, limit = 20): Promise<ExpansionEvent[]> {
  await ensureFiscalExpansionSchema();
  const result = await env.DB.prepare("SELECT id, item_code, actor_user_id, from_stage, to_stage, evidence_note, evidence_reference, evidence_hash, created_at FROM fiscal_expansion_events WHERE workspace_id = ? ORDER BY id DESC LIMIT ?")
    .bind(workspaceId, limit).all<Record<string, string | number | null>>();
  return (result.results ?? []).flatMap((row: Record<string, string | number | null>) => {
    const fromStage = String(row.from_stage);
    const toStage = String(row.to_stage);
    if (!isStoredStage(fromStage) || !isStoredStage(toStage)) return [];
    return [{
      id: Number(row.id),
      itemCode: String(row.item_code),
      actorUserId: Number(row.actor_user_id),
      fromStage,
      toStage,
      evidenceNote: String(row.evidence_note),
      evidenceReference: row.evidence_reference ? String(row.evidence_reference) : null,
      evidenceHash: row.evidence_hash ? String(row.evidence_hash) : null,
      createdAt: String(row.created_at),
    }];
  });
}

export async function saveExpansionTransition(input: {
  workspaceId: number;
  itemCode: string;
  actorUserId: number;
  fromStage: ExpansionStage;
  toStage: ExpansionStage;
  evidenceNote: string;
  evidenceReference: string | null;
  evidenceHash: string;
  expectedUpdatedAt: string | null;
}) {
  await ensureFiscalExpansionSchema();
  const now = new Date().toISOString();
  const id = `${input.workspaceId}:${input.itemCode}`;
  const existing = await env.DB.prepare("SELECT stage, updated_at FROM fiscal_expansion_progress WHERE workspace_id = ? AND item_code = ? LIMIT 1")
    .bind(input.workspaceId, input.itemCode).first<{ stage: string; updated_at: string }>();
  if (existing && (existing.stage !== input.fromStage || (input.expectedUpdatedAt && existing.updated_at !== input.expectedUpdatedAt))) {
    throw new Error("expansion_progress_conflict");
  }
  if (!existing && input.expectedUpdatedAt) throw new Error("expansion_progress_conflict");
  const write = existing
    ? env.DB.prepare("UPDATE fiscal_expansion_progress SET stage = ?, evidence_note = ?, evidence_reference = ?, evidence_hash = ?, updated_by_user_id = ?, updated_at = ? WHERE workspace_id = ? AND item_code = ? AND stage = ? AND updated_at = ?")
      .bind(input.toStage, input.evidenceNote, input.evidenceReference, input.evidenceHash, input.actorUserId, now, input.workspaceId, input.itemCode, input.fromStage, existing.updated_at)
    : env.DB.prepare("INSERT OR IGNORE INTO fiscal_expansion_progress (id, workspace_id, item_code, stage, evidence_note, evidence_reference, evidence_hash, updated_by_user_id, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(id, input.workspaceId, input.itemCode, input.toStage, input.evidenceNote, input.evidenceReference, input.evidenceHash, input.actorUserId, now);
  await env.DB.batch([
    write,
    env.DB.prepare(`
      INSERT OR IGNORE INTO fiscal_expansion_events (workspace_id, item_code, actor_user_id, from_stage, to_stage, evidence_note, evidence_reference, evidence_hash, created_at)
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?
      WHERE EXISTS (
        SELECT 1 FROM fiscal_expansion_progress
        WHERE workspace_id = ? AND item_code = ? AND stage = ? AND evidence_hash = ? AND updated_at = ?
      )
    `).bind(input.workspaceId, input.itemCode, input.actorUserId, input.fromStage, input.toStage, input.evidenceNote, input.evidenceReference, input.evidenceHash, now, input.workspaceId, input.itemCode, input.toStage, input.evidenceHash, now),
  ]);
  const saved = await env.DB.prepare("SELECT evidence_hash FROM fiscal_expansion_progress WHERE workspace_id = ? AND item_code = ? LIMIT 1")
    .bind(input.workspaceId, input.itemCode).first<{ evidence_hash: string | null }>();
  if (saved?.evidence_hash !== input.evidenceHash) throw new Error("expansion_progress_conflict");
}

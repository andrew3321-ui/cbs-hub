import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import { NATIONAL_COVERAGE_AUTOMATIC_ASSURANCE_VERSION, hashNationalCoverageAutomaticAssurance } from "../domain/national-coverage-automatic-assurance";
import { getDb } from "../db";
import { fiscalRuleApprovals } from "../db/schema";

export const NATIONAL_RULE_CODE = "NATIONAL-COVERAGE-V27";
export const RULE_APPROVAL_DECLARATION_VERSION = "fiscal-rule-approval.v1";

let approvalSchemaReady: Promise<unknown> | undefined;

export function ensureFiscalRuleApprovalSchema() {
  approvalSchemaReady ??= env.DB.batch([
    env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS fiscal_rule_approvals (
        id TEXT PRIMARY KEY NOT NULL,
        workspace_id INTEGER NOT NULL,
        rule_code TEXT NOT NULL,
        rule_version TEXT NOT NULL,
        rule_hash TEXT NOT NULL,
        approved_by_user_id INTEGER NOT NULL,
        reviewer_name TEXT NOT NULL,
        professional_role TEXT NOT NULL,
        professional_registration TEXT NOT NULL,
        decision TEXT DEFAULT 'approved' NOT NULL,
        declaration_version TEXT NOT NULL,
        decision_signature TEXT NOT NULL,
        decided_at TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `),
    env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS fiscal_rule_approvals_workspace_rule_hash_idx ON fiscal_rule_approvals (workspace_id, rule_code, rule_version, rule_hash)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS fiscal_rule_approvals_workspace_decided_idx ON fiscal_rule_approvals (workspace_id, decided_at, id)"),
  ]);
  return approvalSchemaReady.catch((error) => {
    approvalSchemaReady = undefined;
    throw error;
  });
}

type ApprovalRecord = {
  workspaceId: number;
  ruleCode: string;
  ruleVersion: string;
  ruleHash: string;
  approvedByUserId: number;
  reviewerName: string;
  professionalRole: string;
  professionalRegistration: string;
  decision: string;
  declarationVersion: string;
  decidedAt: string;
};

function secret() {
  const value = String((env as unknown as { SCENARIO_SIGNING_KEY_V1?: string }).SCENARIO_SIGNING_KEY_V1 ?? "").trim();
  if (value.length < 32) throw new Error("rule_approval_signing_key_unavailable");
  return value;
}

function canonical(record: ApprovalRecord) {
  return JSON.stringify({ workspaceId: record.workspaceId, ruleCode: record.ruleCode, ruleVersion: record.ruleVersion, ruleHash: record.ruleHash, approvedByUserId: record.approvedByUserId, reviewerName: record.reviewerName, professionalRole: record.professionalRole, professionalRegistration: record.professionalRegistration, decision: record.decision, declarationVersion: record.declarationVersion, decidedAt: record.decidedAt });
}

export async function signRuleApproval(record: ApprovalRecord) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(canonical(record)));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function verifyRuleApproval(record: ApprovalRecord, signature: string) {
  const expected = await signRuleApproval(record);
  if (expected.length !== signature.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) difference |= expected.charCodeAt(index) ^ signature.charCodeAt(index);
  return difference === 0;
}

export async function currentNationalRuleIdentity() {
  return { ruleCode: NATIONAL_RULE_CODE, ruleVersion: NATIONAL_COVERAGE_AUTOMATIC_ASSURANCE_VERSION, ruleHash: await hashNationalCoverageAutomaticAssurance() };
}

export async function getActiveNationalRuleApproval(workspaceId: number) {
  await ensureFiscalRuleApprovalSchema();
  const identity = await currentNationalRuleIdentity();
  const [row] = await getDb().select().from(fiscalRuleApprovals).where(and(eq(fiscalRuleApprovals.workspaceId, workspaceId), eq(fiscalRuleApprovals.ruleCode, identity.ruleCode), eq(fiscalRuleApprovals.ruleVersion, identity.ruleVersion), eq(fiscalRuleApprovals.ruleHash, identity.ruleHash))).limit(1);
  if (!row) return { identity, approval: null, verified: false };
  const record: ApprovalRecord = { workspaceId: row.workspaceId, ruleCode: row.ruleCode, ruleVersion: row.ruleVersion, ruleHash: row.ruleHash, approvedByUserId: row.approvedByUserId, reviewerName: row.reviewerName, professionalRole: row.professionalRole, professionalRegistration: row.professionalRegistration, decision: row.decision, declarationVersion: row.declarationVersion, decidedAt: row.decidedAt };
  return { identity, approval: row, verified: row.decision === "approved" && await verifyRuleApproval(record, row.decisionSignature) };
}

import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const companies = sqliteTable("companies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  cnpj: text("cnpj"),
  taxRegime: text("tax_regime").notNull(),
  sector: text("sector").notNull().default("Serviços"),
  ownerUserId: integer("owner_user_id"),
  workspaceId: integer("workspace_id"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("companies_owner_name_idx").on(table.ownerUserId, table.name),
  index("companies_workspace_name_idx").on(table.workspaceId, table.name),
]);

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  passwordSalt: text("password_salt").notNull(),
  recoveryKeyHash: text("recovery_key_hash").notNull(),
  failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
  lockedUntil: text("locked_until"),
  accountType: text("account_type").notNull().default("individual"),
  suggestedPlanKey: text("suggested_plan_key").notNull().default("pro"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const accountingWorkspaces = sqliteTable("accounting_workspaces", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  workspaceType: text("workspace_type").notNull().default("individual"),
  ownerUserId: integer("owner_user_id").notNull(),
  suggestedPlanKey: text("suggested_plan_key").notNull().default("pro"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("accounting_workspaces_owner_idx").on(table.ownerUserId),
]);

export const workspaceMembers = sqliteTable("workspace_members", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workspaceId: integer("workspace_id").notNull(),
  userId: integer("user_id").notNull(),
  role: text("role").notNull().default("preparer"),
  status: text("status").notNull().default("active"),
  joinedAt: text("joined_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("workspace_members_user_idx").on(table.userId),
  uniqueIndex("workspace_members_workspace_user_idx").on(table.workspaceId, table.userId),
  index("workspace_members_workspace_status_idx").on(table.workspaceId, table.status, table.id),
]);

export const workspaceInvitations = sqliteTable("workspace_invitations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workspaceId: integer("workspace_id").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull().default("reviewer"),
  tokenHash: text("token_hash").notNull(),
  invitedByUserId: integer("invited_by_user_id").notNull(),
  status: text("status").notNull().default("pending"),
  expiresAt: text("expires_at").notNull(),
  acceptedByUserId: integer("accepted_by_user_id"),
  acceptedAt: text("accepted_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("workspace_invitations_token_idx").on(table.tokenHash),
  index("workspace_invitations_workspace_status_idx").on(table.workspaceId, table.status, table.createdAt),
]);

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: integer("user_id").notNull(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("sessions_user_expires_idx").on(table.userId, table.expiresAt), index("sessions_expires_at_idx").on(table.expiresAt)]);

export const scenarios = sqliteTable("scenarios", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  revenueCents: integer("revenue_cents").notNull(),
  currentRateBps: integer("current_rate_bps").notNull(),
  newRateBps: integer("new_rate_bps").notNull(),
  costRateBps: integer("cost_rate_bps").notNull(),
  fixedCostsCents: integer("fixed_costs_cents").notNull().default(0),
  volumeLossBps: integer("volume_loss_bps").notNull().default(0),
  priceAdjustmentBps: integer("price_adjustment_bps").notNull().default(0),
  targetYear: integer("target_year").notNull().default(2027),
  rateSource: text("rate_source").notNull().default("legacy_unverified"),
  sourceNote: text("source_note").notNull().default("Registro anterior ao versionamento de premissas."),
  reviewStatus: text("review_status").notNull().default("draft"),
  calculationVersion: text("calculation_version").notNull().default("legacy"),
  methodologyVersion: text("methodology_version").notNull().default("legacy"),
  inputHash: text("input_hash"),
  snapshotJson: text("snapshot_json"),
  calculatedAt: text("calculated_at"),
  signatureVersion: text("signature_version").notNull().default("legacy"),
  recordSignature: text("record_signature"),
  requestKey: text("request_key"),
  companyId: integer("company_id").notNull().default(1),
  preparedByUserId: integer("prepared_by_user_id"),
  supersedesScenarioId: integer("supersedes_scenario_id"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("scenarios_request_key_idx").on(table.requestKey),
  index("scenarios_company_created_idx").on(table.companyId, table.createdAt, table.id),
  index("scenarios_prepared_by_idx").on(table.preparedByUserId, table.createdAt, table.id),
  uniqueIndex("scenarios_supersedes_idx").on(table.supersedesScenarioId),
]);

export const scenarioApprovals = sqliteTable("scenario_approvals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  scenarioId: integer("scenario_id").notNull(),
  companyId: integer("company_id").notNull(),
  ownerUserId: integer("owner_user_id").notNull(),
  reviewerUserId: integer("reviewer_user_id").notNull(),
  reviewerName: text("reviewer_name").notNull(),
  reviewerEmail: text("reviewer_email").notNull(),
  professionalRegistration: text("professional_registration").notNull(),
  assuranceLevel: text("assurance_level").notNull().default("responsible_self_review"),
  credentialVerification: text("credential_verification").notNull().default("self_declared"),
  decision: text("decision").notNull().default("approved"),
  declarationVersion: text("declaration_version").notNull(),
  scenarioInputHash: text("scenario_input_hash").notNull(),
  scenarioRecordSignature: text("scenario_record_signature").notNull(),
  decisionNote: text("decision_note").notNull().default(""),
  signatureVersion: text("signature_version").notNull(),
  approvalSignature: text("approval_signature").notNull(),
  decidedAt: text("decided_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("scenario_approvals_scenario_idx").on(table.scenarioId),
  index("scenario_approvals_owner_company_decided_idx").on(table.ownerUserId, table.companyId, table.decidedAt, table.id),
]);

export const scenarioReviewRounds = sqliteTable("scenario_review_rounds", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workspaceId: integer("workspace_id").notNull(),
  scenarioId: integer("scenario_id").notNull(),
  companyId: integer("company_id").notNull(),
  ownerUserId: integer("owner_user_id").notNull(),
  preparedByUserId: integer("prepared_by_user_id").notNull(),
  assignedReviewerUserId: integer("assigned_reviewer_user_id"),
  requestedByUserId: integer("requested_by_user_id").notNull(),
  roundNumber: integer("round_number").notNull().default(1),
  status: text("status").notNull().default("pending"),
  dueAt: text("due_at"),
  decisionByUserId: integer("decision_by_user_id"),
  decisionNote: text("decision_note").notNull().default(""),
  decidedAt: text("decided_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("scenario_review_rounds_scenario_idx").on(table.scenarioId),
  index("scenario_review_rounds_workspace_status_due_idx").on(table.workspaceId, table.status, table.dueAt, table.id),
  index("scenario_review_rounds_reviewer_status_idx").on(table.assignedReviewerUserId, table.status, table.id),
  index("scenario_review_rounds_company_created_idx").on(table.companyId, table.createdAt, table.id),
]);

export const scenarioReviewComments = sqliteTable("scenario_review_comments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  reviewRoundId: integer("review_round_id").notNull(),
  workspaceId: integer("workspace_id").notNull(),
  scenarioId: integer("scenario_id").notNull(),
  authorUserId: integer("author_user_id").notNull(),
  kind: text("kind").notNull().default("comment"),
  body: text("body").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("scenario_review_comments_round_created_idx").on(table.reviewRoundId, table.createdAt, table.id),
  index("scenario_review_comments_workspace_scenario_idx").on(table.workspaceId, table.scenarioId, table.id),
]);

export const auditEvents = sqliteTable("audit_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ownerUserId: integer("owner_user_id").notNull(),
  companyId: integer("company_id"),
  scenarioId: integer("scenario_id"),
  eventType: text("event_type").notNull(),
  eventData: text("event_data").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("audit_events_owner_company_created_idx").on(table.ownerUserId, table.companyId, table.createdAt, table.id)]);

export const fiscalRuleSets = sqliteTable("fiscal_rule_sets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull(),
  version: text("version").notNull(),
  name: text("name").notNull(),
  jurisdiction: text("jurisdiction").notNull(),
  status: text("status").notNull().default("draft"),
  effectiveFrom: text("effective_from").notNull(),
  effectiveTo: text("effective_to").notNull(),
  contentJson: text("content_json").notNull(),
  contentHash: text("content_hash").notNull(),
  sourceCount: integer("source_count").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("fiscal_rule_sets_code_version_idx").on(table.code, table.version),
  index("fiscal_rule_sets_status_effective_idx").on(table.status, table.effectiveFrom, table.effectiveTo),
]);

export const fiscalRuleApprovals = sqliteTable("fiscal_rule_approvals", {
  id: text("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull(),
  ruleCode: text("rule_code").notNull(),
  ruleVersion: text("rule_version").notNull(),
  ruleHash: text("rule_hash").notNull(),
  approvedByUserId: integer("approved_by_user_id").notNull(),
  reviewerName: text("reviewer_name").notNull(),
  professionalRole: text("professional_role").notNull(),
  professionalRegistration: text("professional_registration").notNull(),
  decision: text("decision").notNull().default("approved"),
  declarationVersion: text("declaration_version").notNull(),
  decisionSignature: text("decision_signature").notNull(),
  decidedAt: text("decided_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("fiscal_rule_approvals_workspace_rule_hash_idx").on(table.workspaceId, table.ruleCode, table.ruleVersion, table.ruleHash),
  index("fiscal_rule_approvals_workspace_decided_idx").on(table.workspaceId, table.decidedAt, table.id),
]);

export const fiscalExpansionProgress = sqliteTable("fiscal_expansion_progress", {
  id: text("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull(),
  itemCode: text("item_code").notNull(),
  stage: text("stage").notNull().default("catalogued"),
  evidenceNote: text("evidence_note").notNull().default(""),
  evidenceReference: text("evidence_reference"),
  evidenceHash: text("evidence_hash"),
  updatedByUserId: integer("updated_by_user_id").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("fiscal_expansion_progress_workspace_item_idx").on(table.workspaceId, table.itemCode),
  index("fiscal_expansion_progress_workspace_stage_idx").on(table.workspaceId, table.stage, table.updatedAt),
]);

export const fiscalExpansionEvents = sqliteTable("fiscal_expansion_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workspaceId: integer("workspace_id").notNull(),
  itemCode: text("item_code").notNull(),
  actorUserId: integer("actor_user_id").notNull(),
  fromStage: text("from_stage").notNull(),
  toStage: text("to_stage").notNull(),
  evidenceNote: text("evidence_note").notNull(),
  evidenceReference: text("evidence_reference"),
  evidenceHash: text("evidence_hash"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("fiscal_expansion_events_workspace_created_idx").on(table.workspaceId, table.createdAt, table.id),
  index("fiscal_expansion_events_item_created_idx").on(table.itemCode, table.createdAt, table.id),
  uniqueIndex("fiscal_expansion_events_workspace_item_hash_idx").on(table.workspaceId, table.itemCode, table.evidenceHash),
]);

export const fiscalReferenceCases = sqliteTable("fiscal_reference_cases", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ruleSetId: integer("rule_set_id").notNull(),
  code: text("code").notNull(),
  title: text("title").notNull(),
  inputJson: text("input_json").notNull(),
  expectedJson: text("expected_json").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("fiscal_reference_cases_rule_code_idx").on(table.ruleSetId, table.code),
  index("fiscal_reference_cases_rule_set_idx").on(table.ruleSetId),
]);

export const fiscalKnowledgeBases = sqliteTable("fiscal_knowledge_bases", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull(),
  version: text("version").notNull(),
  name: text("name").notNull(),
  scope: text("scope").notNull(),
  status: text("status").notNull().default("pilot"),
  contentJson: text("content_json").notNull(),
  contentHash: text("content_hash").notNull(),
  sourceCount: integer("source_count").notNull().default(0),
  checkedAt: text("checked_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("fiscal_knowledge_bases_code_version_idx").on(table.code, table.version),
  index("fiscal_knowledge_bases_status_checked_idx").on(table.status, table.checkedAt, table.id),
]);

export const fiscalDossiers = sqliteTable("fiscal_dossiers", {
  id: text("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull(),
  ownerUserId: integer("owner_user_id").notNull(),
  companyId: integer("company_id"),
  createdByUserId: integer("created_by_user_id").notNull(),
  assignedReviewerUserId: integer("assigned_reviewer_user_id"),
  decisionByUserId: integer("decision_by_user_id"),
  title: text("title").notNull(),
  question: text("question").notNull(),
  status: text("status").notNull().default("draft"),
  baseCode: text("base_code").notNull(),
  baseVersion: text("base_version").notNull(),
  engineVersion: text("engine_version").notNull(),
  factsJson: text("facts_json").notNull(),
  calculationInputJson: text("calculation_input_json").notNull(),
  snapshotJson: text("snapshot_json").notNull(),
  inputHash: text("input_hash").notNull(),
  professionalRegistration: text("professional_registration"),
  reviewNote: text("review_note").notNull().default(""),
  dueAt: text("due_at"),
  decidedAt: text("decided_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("fiscal_dossiers_workspace_status_created_idx").on(table.workspaceId, table.status, table.createdAt, table.id),
  index("fiscal_dossiers_reviewer_status_due_idx").on(table.assignedReviewerUserId, table.status, table.dueAt, table.id),
  index("fiscal_dossiers_company_created_idx").on(table.companyId, table.createdAt, table.id),
  uniqueIndex("fiscal_dossiers_workspace_hash_idx").on(table.workspaceId, table.inputHash),
]);

export const fiscalDossierEvents = sqliteTable("fiscal_dossier_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  dossierId: text("dossier_id").notNull(),
  workspaceId: integer("workspace_id").notNull(),
  actorUserId: integer("actor_user_id").notNull(),
  eventType: text("event_type").notNull(),
  note: text("note").notNull().default(""),
  eventData: text("event_data").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("fiscal_dossier_events_dossier_created_idx").on(table.dossierId, table.createdAt, table.id),
  index("fiscal_dossier_events_workspace_created_idx").on(table.workspaceId, table.createdAt, table.id),
]);

export const fiscalDocuments = sqliteTable("fiscal_documents", {
  id: text("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull(),
  ownerUserId: integer("owner_user_id").notNull(),
  companyId: integer("company_id"),
  uploadedByUserId: integer("uploaded_by_user_id").notNull(),
  dossierId: text("dossier_id"),
  filename: text("filename").notNull(),
  sourceHash: text("source_hash").notNull(),
  accessKey: text("access_key"),
  schemaVersion: text("schema_version"),
  profileVersion: text("profile_version").notNull(),
  status: text("status").notNull(),
  authorizationCode: text("authorization_code"),
  authorizationLabel: text("authorization_label"),
  issuedAt: text("issued_at"),
  emitterName: text("emitter_name"),
  emitterTaxIdHash: text("emitter_tax_id_hash"),
  emitterTaxIdMasked: text("emitter_tax_id_masked"),
  emitterState: text("emitter_state"),
  recipientName: text("recipient_name"),
  recipientTaxIdHash: text("recipient_tax_id_hash"),
  recipientTaxIdMasked: text("recipient_tax_id_masked"),
  recipientState: text("recipient_state"),
  itemCount: integer("item_count").notNull().default(0),
  totalProductCents: integer("total_product_cents"),
  totalInvoiceCents: integer("total_invoice_cents"),
  auditJson: text("audit_json").notNull(),
  comparisonJson: text("comparison_json").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("fiscal_documents_workspace_hash_profile_idx").on(table.workspaceId, table.sourceHash, table.profileVersion),
  index("fiscal_documents_workspace_status_created_idx").on(table.workspaceId, table.status, table.createdAt, table.id),
  index("fiscal_documents_workspace_access_key_idx").on(table.workspaceId, table.accessKey, table.createdAt),
  index("fiscal_documents_company_created_idx").on(table.companyId, table.createdAt, table.id),
  index("fiscal_documents_dossier_created_idx").on(table.dossierId, table.createdAt, table.id),
]);

export const fiscalDocumentEvents = sqliteTable("fiscal_document_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  documentId: text("document_id").notNull(),
  workspaceId: integer("workspace_id").notNull(),
  actorUserId: integer("actor_user_id").notNull(),
  eventType: text("event_type").notNull(),
  note: text("note").notNull().default(""),
  eventData: text("event_data").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("fiscal_document_events_document_created_idx").on(table.documentId, table.createdAt, table.id),
  index("fiscal_document_events_workspace_created_idx").on(table.workspaceId, table.createdAt, table.id),
]);

export const fiscalHomologationCases = sqliteTable("fiscal_homologation_cases", {
  id: text("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull(),
  ownerUserId: integer("owner_user_id").notNull(),
  createdByUserId: integer("created_by_user_id").notNull(),
  assignedReviewerUserId: integer("assigned_reviewer_user_id"),
  decisionByUserId: integer("decision_by_user_id"),
  title: text("title").notNull(),
  question: text("question").notNull(),
  topicCode: text("topic_code").notNull(),
  status: text("status").notNull().default("draft"),
  assuranceLevel: text("assurance_level").notNull().default("engine_verified"),
  baseCode: text("base_code").notNull(),
  baseVersion: text("base_version").notNull(),
  baseHash: text("base_hash").notNull(),
  engineVersion: text("engine_version").notNull(),
  snapshotJson: text("snapshot_json").notNull(),
  snapshotHash: text("snapshot_hash").notNull(),
  expectedJson: text("expected_json").notNull().default("{}"),
  comparisonOutcome: text("comparison_outcome"),
  independentConclusion: text("independent_conclusion").notNull().default(""),
  professionalRegistration: text("professional_registration"),
  reviewNote: text("review_note").notNull().default(""),
  dueAt: text("due_at"),
  decidedAt: text("decided_at"),
  signatureVersion: text("signature_version"),
  decisionSignature: text("decision_signature"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("fiscal_homologation_workspace_snapshot_idx").on(table.workspaceId, table.snapshotHash),
  index("fiscal_homologation_workspace_status_created_idx").on(table.workspaceId, table.status, table.createdAt, table.id),
  index("fiscal_homologation_reviewer_status_due_idx").on(table.assignedReviewerUserId, table.status, table.dueAt, table.id),
  index("fiscal_homologation_topic_status_idx").on(table.topicCode, table.status, table.id),
]);

export const fiscalHomologationEvents = sqliteTable("fiscal_homologation_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  caseId: text("case_id").notNull(),
  workspaceId: integer("workspace_id").notNull(),
  actorUserId: integer("actor_user_id").notNull(),
  eventType: text("event_type").notNull(),
  note: text("note").notNull().default(""),
  eventData: text("event_data").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("fiscal_homologation_events_case_created_idx").on(table.caseId, table.createdAt, table.id),
  index("fiscal_homologation_events_workspace_created_idx").on(table.workspaceId, table.createdAt, table.id),
]);

export const taxPeriods = sqliteTable("tax_periods", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ownerUserId: integer("owner_user_id").notNull(),
  companyId: integer("company_id").notNull(),
  periodKey: text("period_key").notNull(),
  taxRegime: text("tax_regime").notNull(),
  legalEffect: text("legal_effect").notNull().default("simulation_2026"),
  status: text("status").notNull().default("draft"),
  activeRevision: integer("active_revision").notNull().default(1),
  ruleSetId: integer("rule_set_id"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("tax_periods_owner_company_period_idx").on(table.ownerUserId, table.companyId, table.periodKey),
  index("tax_periods_owner_status_period_idx").on(table.ownerUserId, table.status, table.periodKey, table.id),
]);

export const taxLedgerEntries = sqliteTable("tax_ledger_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  periodId: integer("period_id").notNull(),
  ownerUserId: integer("owner_user_id").notNull(),
  sourceKey: text("source_key").notNull(),
  tax: text("tax").notNull(),
  entryKind: text("entry_kind").notNull(),
  amountCents: integer("amount_cents").notNull(),
  sourceType: text("source_type").notNull(),
  sourceDocumentKey: text("source_document_key"),
  creditStatus: text("credit_status").notNull().default("not_applicable"),
  evidenceStatus: text("evidence_status").notNull().default("pending"),
  classificationStatus: text("classification_status").notNull().default("pending"),
  classificationJson: text("classification_json").notNull().default("{}"),
  occurredAt: text("occurred_at").notNull(),
  extinguishmentMethod: text("extinguishment_method"),
  reversalOfEntryId: integer("reversal_of_entry_id"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("tax_ledger_entries_period_source_idx").on(table.periodId, table.sourceKey),
  index("tax_ledger_entries_period_tax_date_idx").on(table.periodId, table.tax, table.occurredAt, table.id),
  index("tax_ledger_entries_owner_period_idx").on(table.ownerUserId, table.periodId, table.id),
]);

export const taxReconciliationSnapshots = sqliteTable("tax_reconciliation_snapshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  periodId: integer("period_id").notNull(),
  ownerUserId: integer("owner_user_id").notNull(),
  sourceType: text("source_type").notNull(),
  tax: text("tax").notNull(),
  debitsCents: integer("debits_cents").notNull(),
  creditsCents: integer("credits_cents").notNull(),
  extinguishmentsCents: integer("extinguishments_cents").notNull(),
  evidenceHash: text("evidence_hash").notNull(),
  capturedAt: text("captured_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("tax_reconciliation_period_source_tax_capture_idx").on(table.periodId, table.sourceType, table.tax, table.capturedAt),
  index("tax_reconciliation_owner_period_idx").on(table.ownerUserId, table.periodId, table.id),
]);

export const taxPeriodClosures = sqliteTable("tax_period_closures", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  periodId: integer("period_id").notNull(),
  ownerUserId: integer("owner_user_id").notNull(),
  revision: integer("revision").notNull(),
  status: text("status").notNull().default("ready_for_review"),
  ruleSetId: integer("rule_set_id"),
  calculationVersion: text("calculation_version").notNull(),
  snapshotJson: text("snapshot_json").notNull(),
  inputHash: text("input_hash").notNull(),
  signatureVersion: text("signature_version").notNull(),
  recordSignature: text("record_signature").notNull(),
  reviewerReference: text("reviewer_reference"),
  reviewedAt: text("reviewed_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("tax_period_closures_period_revision_idx").on(table.periodId, table.revision),
  index("tax_period_closures_owner_status_idx").on(table.ownerUserId, table.status, table.id),
]);

export const billingAccounts = sqliteTable("billing_accounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().unique(),
  planKey: text("plan_key").notNull().default("beta"),
  provider: text("provider").notNull().default("mercado_pago"),
  externalReference: text("external_reference").notNull().unique(),
  providerSubscriptionId: text("provider_subscription_id"),
  status: text("status").notNull().default("beta"),
  checkoutUrl: text("checkout_url"),
  nextPaymentAt: text("next_payment_at"),
  lastSyncedAt: text("last_synced_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const reportShares = sqliteTable("report_shares", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  token: text("token").notNull().unique(),
  scenarioId: integer("scenario_id").notNull(),
  companyId: integer("company_id").notNull(),
  ownerUserId: integer("owner_user_id").notNull(),
  note: text("note"),
  expiresAt: text("expires_at").notNull(),
  revokedAt: text("revoked_at"),
  views: integer("views").notNull().default(0),
  lastViewedAt: text("last_viewed_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("report_shares_owner_company_created_idx").on(table.ownerUserId, table.companyId, table.createdAt, table.id),
  index("report_shares_scenario_owner_idx").on(table.scenarioId, table.ownerUserId),
]);

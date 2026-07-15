import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const companies = sqliteTable("companies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  cnpj: text("cnpj"),
  taxRegime: text("tax_regime").notNull(),
  sector: text("sector").notNull().default("Serviços"),
  ownerUserId: integer("owner_user_id"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("companies_owner_name_idx").on(table.ownerUserId, table.name)]);

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  passwordSalt: text("password_salt").notNull(),
  recoveryKeyHash: text("recovery_key_hash").notNull(),
  failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
  lockedUntil: text("locked_until"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

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
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("scenarios_request_key_idx").on(table.requestKey),
  index("scenarios_company_created_idx").on(table.companyId, table.createdAt, table.id),
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

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
  passwordIterations: integer("password_iterations").notNull().default(100000),
  recoveryKeyHash: text("recovery_key_hash").notNull(),
  failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
  lockedUntil: text("locked_until"),
  accountType: text("account_type").notNull().default("individual"),
  suggestedPlanKey: text("suggested_plan_key").notNull().default("unico"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const trialDeviceClaims = sqliteTable("trial_device_claims", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").unique(),
  workspaceId: integer("workspace_id").unique(),
  deviceHash: text("device_hash").notNull().unique(),
  fingerprintHash: text("fingerprint_hash").notNull().unique(),
  emailHash: text("email_hash").notNull().unique(),
  networkHash: text("network_hash").notNull(),
  status: text("status").notNull().default("active"),
  startedAt: text("started_at").notNull(),
  endsAt: text("ends_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("trial_device_claims_network_created_idx").on(table.networkHash, table.createdAt),
  index("trial_device_claims_status_ends_idx").on(table.status, table.endsAt),
]);

export const platformSettings = sqliteTable("platform_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  revision: integer("revision").notNull().default(1),
  updatedByUserId: integer("updated_by_user_id"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const securityRateLimits = sqliteTable("security_rate_limits", {
  bucketKey: text("bucket_key").primaryKey(),
  windowStartedAt: integer("window_started_at").notNull(),
  requestCount: integer("request_count").notNull().default(0),
  blockedUntil: integer("blocked_until"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("security_rate_limits_updated_idx").on(table.updatedAt),
]);

export const accountingWorkspaces = sqliteTable("accounting_workspaces", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  workspaceType: text("workspace_type").notNull().default("individual"),
  ownerUserId: integer("owner_user_id").notNull(),
  suggestedPlanKey: text("suggested_plan_key").notNull().default("unico"),
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

export const workspaceOnboardingProgress = sqliteTable("workspace_onboarding_progress", {
  id: text("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull(),
  userId: integer("user_id").notNull(),
  onboardingVersion: text("onboarding_version").notNull(),
  workspaceType: text("workspace_type").notNull(),
  currentStage: integer("current_stage").notNull().default(0),
  completedItemIdsJson: text("completed_item_ids_json").notNull().default("[]"),
  dismissedAt: text("dismissed_at"),
  completedAt: text("completed_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("workspace_onboarding_user_version_idx").on(table.workspaceId, table.userId, table.onboardingVersion),
  index("workspace_onboarding_workspace_updated_idx").on(table.workspaceId, table.updatedAt, table.id),
  index("workspace_onboarding_user_completed_idx").on(table.userId, table.completedAt, table.id),
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

export const normativeSources = sqliteTable("normative_sources", {
  id: text("id").primaryKey(),
  code: text("code").notNull(),
  catalogVersion: text("catalog_version").notNull(),
  title: text("title").notNull(),
  publisher: text("publisher").notNull(),
  jurisdiction: text("jurisdiction").notNull(),
  legalDevice: text("legal_device").notNull(),
  sourceKind: text("source_kind").notNull(),
  sourceUrl: text("source_url").notNull(),
  effectiveFrom: text("effective_from"),
  effectiveTo: text("effective_to"),
  verificationStatus: text("verification_status").notNull(),
  impactedRuleCodesJson: text("impacted_rule_codes_json").notNull().default("[]"),
  metadataHash: text("metadata_hash").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("normative_sources_metadata_hash_idx").on(table.metadataHash),
  index("normative_sources_code_created_idx").on(table.code, table.createdAt, table.id),
  index("normative_sources_jurisdiction_kind_idx").on(table.jurisdiction, table.sourceKind, table.id),
]);

export const normativeMonitorRuns = sqliteTable("normative_monitor_runs", {
  id: text("id").primaryKey(),
  runDate: text("run_date").notNull(),
  status: text("status").notNull().default("running"),
  catalogVersion: text("catalog_version").notNull(),
  sourceCount: integer("source_count").notNull().default(0),
  checkedCount: integer("checked_count").notNull().default(0),
  unavailableCount: integer("unavailable_count").notNull().default(0),
  changeCount: integer("change_count").notNull().default(0),
  startedAt: text("started_at").notNull(),
  finishedAt: text("finished_at"),
  errorCode: text("error_code"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("normative_monitor_runs_date_catalog_idx").on(table.runDate, table.catalogVersion),
  index("normative_monitor_runs_status_date_idx").on(table.status, table.runDate, table.id),
]);

export const normativeSourceSnapshots = sqliteTable("normative_source_snapshots", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull(),
  sourceVersionId: text("source_version_id").notNull(),
  sourceCode: text("source_code").notNull(),
  captureStatus: text("capture_status").notNull(),
  httpStatus: integer("http_status"),
  contentHash: text("content_hash"),
  previousContentHash: text("previous_content_hash"),
  etag: text("etag"),
  lastModified: text("last_modified"),
  checkedAt: text("checked_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("normative_source_snapshots_run_source_idx").on(table.runId, table.sourceCode),
  index("normative_source_snapshots_source_checked_idx").on(table.sourceCode, table.checkedAt, table.id),
  index("normative_source_snapshots_hash_idx").on(table.contentHash, table.id),
]);

export const normativeChangeEvents = sqliteTable("normative_change_events", {
  id: text("id").primaryKey(),
  sourceCode: text("source_code").notNull(),
  previousSnapshotId: text("previous_snapshot_id"),
  currentSnapshotId: text("current_snapshot_id").notNull(),
  changeKind: text("change_kind").notNull(),
  status: text("status").notNull().default("pending_review"),
  impactedRuleCodesJson: text("impacted_rule_codes_json").notNull().default("[]"),
  detectedAt: text("detected_at").notNull(),
  resolvedAt: text("resolved_at"),
  resolutionReleaseId: text("resolution_release_id"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("normative_change_events_current_snapshot_idx").on(table.currentSnapshotId),
  index("normative_change_events_status_detected_idx").on(table.status, table.detectedAt, table.id),
  index("normative_change_events_source_detected_idx").on(table.sourceCode, table.detectedAt, table.id),
]);

export const normativeChangeReviews = sqliteTable("normative_change_reviews", {
  id: text("id").primaryKey(),
  changeEventId: text("change_event_id").notNull(),
  workspaceId: integer("workspace_id").notNull(),
  reviewerUserId: integer("reviewer_user_id").notNull(),
  reviewerName: text("reviewer_name").notNull(),
  professionalRole: text("professional_role").notNull(),
  professionalRegistration: text("professional_registration").notNull(),
  decision: text("decision").notNull(),
  decisionNote: text("decision_note").notNull(),
  releaseVersion: text("release_version"),
  releaseHash: text("release_hash"),
  declarationVersion: text("declaration_version").notNull(),
  decisionSignature: text("decision_signature").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("normative_change_reviews_event_created_idx").on(table.changeEventId, table.createdAt, table.id),
  index("normative_change_reviews_workspace_created_idx").on(table.workspaceId, table.createdAt, table.id),
]);

export const fiscalRuleReleases = sqliteTable("fiscal_rule_releases", {
  id: text("id").primaryKey(),
  version: text("version").notNull(),
  manifestJson: text("manifest_json").notNull(),
  manifestHash: text("manifest_hash").notNull(),
  previousReleaseHash: text("previous_release_hash"),
  sourceChangeEventId: text("source_change_event_id"),
  releaseKind: text("release_kind").notNull().default("normative_change"),
  status: text("status").notNull().default("approved"),
  approvedByUserId: integer("approved_by_user_id").notNull(),
  professionalRegistration: text("professional_registration").notNull(),
  approvalSignature: text("approval_signature").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("fiscal_rule_releases_version_idx").on(table.version),
  uniqueIndex("fiscal_rule_releases_manifest_hash_idx").on(table.manifestHash),
  index("fiscal_rule_releases_event_created_idx").on(table.sourceChangeEventId, table.createdAt, table.id),
]);

export const fiscalResultInvalidations = sqliteTable("fiscal_result_invalidations", {
  id: text("id").primaryKey(),
  changeEventId: text("change_event_id").notNull(),
  workspaceId: integer("workspace_id").notNull(),
  ownerUserId: integer("owner_user_id").notNull(),
  dossierId: text("dossier_id").notNull(),
  ruleCode: text("rule_code").notNull(),
  ruleVersion: text("rule_version").notNull(),
  status: text("status").notNull().default("open"),
  reason: text("reason").notNull(),
  notifiedAt: text("notified_at"),
  resolvedAt: text("resolved_at"),
  resolutionReleaseId: text("resolution_release_id"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("fiscal_result_invalidations_event_dossier_idx").on(table.changeEventId, table.dossierId),
  index("fiscal_result_invalidations_workspace_status_idx").on(table.workspaceId, table.status, table.createdAt),
  index("fiscal_result_invalidations_dossier_status_idx").on(table.dossierId, table.status, table.id),
]);

export const governanceNotifications = sqliteTable("governance_notifications", {
  id: text("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull(),
  recipientUserId: integer("recipient_user_id").notNull(),
  notificationType: text("notification_type").notNull(),
  subjectType: text("subject_type").notNull(),
  subjectId: text("subject_id").notNull(),
  message: text("message").notNull(),
  readAt: text("read_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("governance_notifications_recipient_subject_idx").on(table.recipientUserId, table.notificationType, table.subjectType, table.subjectId),
  index("governance_notifications_workspace_unread_idx").on(table.workspaceId, table.readAt, table.createdAt),
]);

export const normativeGovernanceAuditEvents = sqliteTable("normative_governance_audit_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  changeEventId: text("change_event_id"),
  workspaceId: integer("workspace_id"),
  actorUserId: integer("actor_user_id"),
  eventType: text("event_type").notNull(),
  eventData: text("event_data").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("normative_governance_audit_change_created_idx").on(table.changeEventId, table.createdAt, table.id),
  index("normative_governance_audit_workspace_created_idx").on(table.workspaceId, table.createdAt, table.id),
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

export const fiscalDossierShares = sqliteTable("fiscal_dossier_shares", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  token: text("token").notNull().unique(),
  dossierId: text("dossier_id").notNull(),
  workspaceId: integer("workspace_id").notNull(),
  ownerUserId: integer("owner_user_id").notNull(),
  companyId: integer("company_id"),
  createdByUserId: integer("created_by_user_id").notNull(),
  note: text("note"),
  expiresAt: text("expires_at").notNull(),
  revokedAt: text("revoked_at"),
  views: integer("views").notNull().default(0),
  lastViewedAt: text("last_viewed_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("fiscal_dossier_shares_workspace_created_idx").on(table.workspaceId, table.createdAt, table.id),
  index("fiscal_dossier_shares_dossier_created_idx").on(table.dossierId, table.createdAt, table.id),
  index("fiscal_dossier_shares_owner_created_idx").on(table.ownerUserId, table.createdAt, table.id),
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

export const fiscalImportBatches = sqliteTable("fiscal_import_batches", {
  id: text("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull(),
  ownerUserId: integer("owner_user_id").notNull(),
  uploadedByUserId: integer("uploaded_by_user_id").notNull(),
  clientBatchKey: text("client_batch_key").notNull(),
  profileVersion: text("profile_version").notNull(),
  evidenceVersion: text("evidence_version").notNull(),
  status: text("status").notNull().default("processing"),
  totalFiles: integer("total_files").notNull(),
  processedFiles: integer("processed_files").notNull().default(0),
  acceptedFiles: integer("accepted_files").notNull().default(0),
  warningFiles: integer("warning_files").notNull().default(0),
  blockedFiles: integer("blocked_files").notNull().default(0),
  totalBytes: integer("total_bytes").notNull(),
  rawFilesPersisted: integer("raw_files_persisted", { mode: "boolean" }).notNull().default(false),
  evidenceHash: text("evidence_hash"),
  startedAt: text("started_at").notNull(),
  completedAt: text("completed_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("fiscal_import_batches_workspace_key_profile_idx").on(table.workspaceId, table.clientBatchKey, table.profileVersion),
  index("fiscal_import_batches_workspace_status_updated_idx").on(table.workspaceId, table.status, table.updatedAt, table.id),
  index("fiscal_import_batches_uploader_created_idx").on(table.uploadedByUserId, table.createdAt, table.id),
]);

export const fiscalImportItems = sqliteTable("fiscal_import_items", {
  id: text("id").primaryKey(),
  batchId: text("batch_id").notNull(),
  workspaceId: integer("workspace_id").notNull(),
  ordinal: integer("ordinal").notNull(),
  filename: text("filename").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  sourceHash: text("source_hash").notNull(),
  documentType: text("document_type").notNull(),
  status: text("status").notNull(),
  profileVersion: text("profile_version").notNull(),
  evidenceVersion: text("evidence_version").notNull(),
  adapterCode: text("adapter_code"),
  adapterVersion: text("adapter_version"),
  coverageStatus: text("coverage_status").notNull(),
  municipalityCode: text("municipality_code"),
  competenceStart: text("competence_start"),
  competenceEnd: text("competence_end"),
  calculationEligible: integer("calculation_eligible", { mode: "boolean" }).notNull().default(false),
  rawFilePersisted: integer("raw_file_persisted", { mode: "boolean" }).notNull().default(false),
  summaryJson: text("summary_json").notNull().default("{}"),
  issuesJson: text("issues_json").notNull().default("[]"),
  calculationBlockersJson: text("calculation_blockers_json").notNull().default("[]"),
  officialSourceCodesJson: text("official_source_codes_json").notNull().default("[]"),
  evidenceJson: text("evidence_json").notNull().default("{}"),
  evidenceHash: text("evidence_hash").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("fiscal_import_items_batch_ordinal_idx").on(table.batchId, table.ordinal),
  index("fiscal_import_items_workspace_hash_profile_idx").on(table.workspaceId, table.sourceHash, table.profileVersion),
  index("fiscal_import_items_batch_status_idx").on(table.batchId, table.status, table.ordinal),
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
  companyAddonBlocks: integer("company_addon_blocks").notNull().default(0),
  pendingCompanyAddonBlocks: integer("pending_company_addon_blocks").notNull().default(0),
  status: text("status").notNull().default("beta"),
  checkoutUrl: text("checkout_url"),
  nextPaymentAt: text("next_payment_at"),
  lastSyncedAt: text("last_synced_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const billingTransactions = sqliteTable("billing_transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  billingAccountId: integer("billing_account_id").notNull(),
  userId: integer("user_id").notNull(),
  provider: text("provider").notNull().default("mercado_pago"),
  providerInvoiceId: text("provider_invoice_id").notNull(),
  providerPaymentId: text("provider_payment_id"),
  externalReference: text("external_reference").notNull(),
  status: text("status").notNull().default("pending"),
  statusDetail: text("status_detail").notNull().default(""),
  grossAmountCents: integer("gross_amount_cents").notNull(),
  feeAmountCents: integer("fee_amount_cents"),
  netAmountCents: integer("net_amount_cents"),
  currency: text("currency").notNull().default("BRL"),
  paymentMethod: text("payment_method"),
  approvedAt: text("approved_at"),
  providerSummaryJson: text("provider_summary_json").notNull().default("{}"),
  lastSyncedAt: text("last_synced_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("billing_transactions_provider_invoice_idx").on(table.providerInvoiceId),
  uniqueIndex("billing_transactions_provider_payment_idx").on(table.providerPaymentId),
  index("billing_transactions_user_status_idx").on(table.userId, table.status, table.approvedAt),
  index("billing_transactions_account_created_idx").on(table.billingAccountId, table.createdAt, table.id),
]);

export const fiscalIssuances = sqliteTable("fiscal_issuances", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  transactionId: integer("transaction_id").notNull(),
  userId: integer("user_id").notNull(),
  requestKey: text("request_key"),
  customerType: text("customer_type").notNull().default("unknown"),
  customerName: text("customer_name").notNull().default(""),
  customerTaxId: text("customer_tax_id"),
  customerTaxIdMasked: text("customer_tax_id_masked"),
  customerTaxIdHash: text("customer_tax_id_hash"),
  noteRequested: integer("note_requested", { mode: "boolean" }).notNull().default(false),
  serviceCode: text("service_code"),
  serviceDescription: text("service_description").notNull(),
  competenceMonth: text("competence_month").notNull(),
  amountCents: integer("amount_cents").notNull(),
  status: text("status").notNull().default("pending_data"),
  adapterCode: text("adapter_code").notNull().default("manual"),
  providerDocumentId: text("provider_document_id"),
  nfseNumber: text("nfse_number"),
  nfseKey: text("nfse_key"),
  verificationUrl: text("verification_url"),
  pdfReference: text("pdf_reference"),
  pdfSha256: text("pdf_sha256"),
  xmlReference: text("xml_reference"),
  xmlSha256: text("xml_sha256"),
  failureCode: text("failure_code"),
  failureReason: text("failure_reason"),
  issuedAt: text("issued_at"),
  canceledAt: text("canceled_at"),
  cancelReason: text("cancel_reason"),
  lastAttemptAt: text("last_attempt_at"),
  attemptCount: integer("attempt_count").notNull().default(0),
  internalNote: text("internal_note").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("fiscal_issuances_transaction_idx").on(table.transactionId),
  uniqueIndex("fiscal_issuances_request_key_idx").on(table.requestKey),
  uniqueIndex("fiscal_issuances_provider_document_idx").on(table.adapterCode, table.providerDocumentId),
  index("fiscal_issuances_status_competence_idx").on(table.status, table.competenceMonth, table.id),
  index("fiscal_issuances_user_created_idx").on(table.userId, table.createdAt, table.id),
]);

export const fiscalIssuanceEvents = sqliteTable("fiscal_issuance_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  issuanceId: integer("issuance_id").notNull(),
  transactionId: integer("transaction_id").notNull(),
  actorUserId: integer("actor_user_id"),
  eventType: text("event_type").notNull(),
  fromStatus: text("from_status"),
  toStatus: text("to_status"),
  reasonCode: text("reason_code"),
  note: text("note").notNull().default(""),
  adapterCode: text("adapter_code").notNull().default("manual"),
  eventDataJson: text("event_data_json").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("fiscal_issuance_events_issuance_created_idx").on(table.issuanceId, table.createdAt, table.id),
  index("fiscal_issuance_events_transaction_created_idx").on(table.transactionId, table.createdAt, table.id),
]);

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

export const privacyRequestEvents = sqliteTable("privacy_request_events", {
  id: text("id").primaryKey(),
  subjectHash: text("subject_hash").notNull(),
  workspaceHash: text("workspace_hash"),
  action: text("action").notNull(),
  status: text("status").notNull(),
  requestId: text("request_id").notNull(),
  detailsJson: text("details_json").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  retainUntil: text("retain_until").notNull(),
}, (table) => [
  index("privacy_request_events_subject_created_idx").on(table.subjectHash, table.createdAt, table.id),
  index("privacy_request_events_retention_idx").on(table.retainUntil, table.id),
]);

export const securityIncidents = sqliteTable("security_incidents", {
  id: text("id").primaryKey(),
  severity: text("severity").notNull(),
  category: text("category").notNull(),
  status: text("status").notNull().default("open"),
  summary: text("summary").notNull(),
  impactSummary: text("impact_summary").notNull().default(""),
  personalDataInvolved: integer("personal_data_involved", { mode: "boolean" }).notNull().default(false),
  authorityNotification: text("authority_notification").notNull().default("pending_assessment"),
  dataSubjectNotification: text("data_subject_notification").notNull().default("pending_assessment"),
  detectedAt: text("detected_at").notNull(),
  containedAt: text("contained_at"),
  resolvedAt: text("resolved_at"),
  reportedByUserId: integer("reported_by_user_id"),
  requestId: text("request_id").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  retainUntil: text("retain_until").notNull(),
}, (table) => [
  index("security_incidents_status_severity_idx").on(table.status, table.severity, table.detectedAt, table.id),
  index("security_incidents_retention_idx").on(table.retainUntil, table.id),
]);

export const securityIncidentEvents = sqliteTable("security_incident_events", {
  id: text("id").primaryKey(),
  incidentId: text("incident_id").notNull(),
  actorUserId: integer("actor_user_id"),
  eventType: text("event_type").notNull(),
  detailsJson: text("details_json").notNull().default("{}"),
  requestId: text("request_id").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("security_incident_events_incident_created_idx").on(table.incidentId, table.createdAt, table.id),
]);

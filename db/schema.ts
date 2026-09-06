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
  firstName: text("first_name"),
  username: text("username").notNull().unique(),
  accountCode: text("account_code").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  passwordSalt: text("password_salt").notNull(),
  passwordIterations: integer("password_iterations").notNull().default(100000),
  recoveryKeyHash: text("recovery_key_hash").notNull(),
  failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
  lockedUntil: text("locked_until"),
  accountType: text("account_type").notNull().default("individual"),
  suggestedPlanKey: text("suggested_plan_key").notNull().default("pro"),
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

export const platformMetricEvents = sqliteTable("platform_metric_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  eventType: text("event_type").notNull(),
  eventDate: text("event_date").notNull(),
  occurredAt: text("occurred_at").notNull(),
  userId: integer("user_id"),
  visitorHash: text("visitor_hash"),
  sessionHash: text("session_hash"),
  pathGroup: text("path_group").notNull().default("other"),
  source: text("source").notNull().default("direct"),
  medium: text("medium").notNull().default("none"),
  campaign: text("campaign").notNull().default(""),
  dedupeKey: text("dedupe_key").notNull(),
  metadataJson: text("metadata_json").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("platform_metric_events_dedupe_idx").on(table.dedupeKey),
  index("platform_metric_events_date_type_idx").on(table.eventDate, table.eventType),
  index("platform_metric_events_user_date_idx").on(table.userId, table.eventDate, table.eventType),
  index("platform_metric_events_source_date_idx").on(table.source, table.eventDate),
]);

export const platformMetricDaily = sqliteTable("platform_metric_daily", {
  metricDate: text("metric_date").primaryKey(),
  pageViews: integer("page_views").notNull().default(0),
  visitors: integer("visitors").notNull().default(0),
  sessions: integer("sessions").notNull().default(0),
  signups: integer("signups").notNull().default(0),
  activeUsers: integer("active_users").notNull().default(0),
  trialsStarted: integer("trials_started").notNull().default(0),
  trialsDenied: integer("trials_denied").notNull().default(0),
  paymentsApproved: integer("payments_approved").notNull().default(0),
  grossAmountCents: integer("gross_amount_cents").notNull().default(0),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const searchConsoleMetrics = sqliteTable("search_console_metrics", {
  id: text("id").primaryKey(),
  metricDate: text("metric_date").notNull(),
  query: text("query").notNull().default(""),
  page: text("page").notNull().default(""),
  country: text("country").notNull().default(""),
  device: text("device").notNull().default(""),
  clicks: integer("clicks").notNull().default(0),
  impressions: integer("impressions").notNull().default(0),
  ctrMicros: integer("ctr_micros").notNull().default(0),
  positionMicros: integer("position_micros").notNull().default(0),
  syncedAt: text("synced_at").notNull(),
}, (table) => [
  index("search_console_metrics_date_idx").on(table.metricDate),
  index("search_console_metrics_page_date_idx").on(table.page, table.metricDate),
  index("search_console_metrics_query_date_idx").on(table.query, table.metricDate),
]);

export const searchConsoleIndexSnapshots = sqliteTable("search_console_index_snapshots", {
  id: text("id").primaryKey(),
  snapshotDate: text("snapshot_date").notNull(),
  page: text("page").notNull(),
  verdict: text("verdict").notNull().default("VERDICT_UNSPECIFIED"),
  coverageState: text("coverage_state").notNull().default(""),
  robotsTxtState: text("robots_txt_state").notNull().default("ROBOTS_TXT_STATE_UNSPECIFIED"),
  indexingState: text("indexing_state").notNull().default("INDEXING_STATE_UNSPECIFIED"),
  pageFetchState: text("page_fetch_state").notNull().default("PAGE_FETCH_STATE_UNSPECIFIED"),
  lastCrawlTime: text("last_crawl_time"),
  googleCanonical: text("google_canonical"),
  userCanonical: text("user_canonical"),
  crawledAs: text("crawled_as"),
  inspectedAt: text("inspected_at").notNull(),
}, (table) => [
  uniqueIndex("search_console_index_snapshots_date_page_idx").on(table.snapshotDate, table.page),
  index("search_console_index_snapshots_page_date_idx").on(table.page, table.snapshotDate),
  index("search_console_index_snapshots_verdict_date_idx").on(table.verdict, table.snapshotDate),
]);

export const searchConsoleSyncRuns = sqliteTable("search_console_sync_runs", {
  id: text("id").primaryKey(),
  status: text("status").notNull(),
  startedAt: text("started_at").notNull(),
  completedAt: text("completed_at"),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  metricRows: integer("metric_rows").notNull().default(0),
  inspectedPages: integer("inspected_pages").notNull().default(0),
  errorCode: text("error_code"),
  detailsJson: text("details_json").notNull().default("{}"),
}, (table) => [
  index("search_console_sync_runs_started_idx").on(table.startedAt, table.id),
  index("search_console_sync_runs_status_started_idx").on(table.status, table.startedAt),
]);

export const organicAuthorityLinks = sqliteTable("organic_authority_links", {
  id: text("id").primaryKey(),
  sourceUrl: text("source_url").notNull(),
  sourceDomain: text("source_domain").notNull(),
  targetPath: text("target_path").notNull(),
  context: text("context").notNull(),
  acquisitionMethod: text("acquisition_method").notNull(),
  status: text("status").notNull().default("verified"),
  firstSeenAt: text("first_seen_at").notNull(),
  lastVerifiedAt: text("last_verified_at").notNull(),
  resultNote: text("result_note").notNull().default(""),
  createdByUserId: integer("created_by_user_id").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("organic_authority_links_source_idx").on(table.sourceUrl),
  index("organic_authority_links_status_verified_idx").on(table.status, table.lastVerifiedAt),
  index("organic_authority_links_domain_idx").on(table.sourceDomain, table.status),
]);

export const organicOutreachCycles = sqliteTable("organic_outreach_cycles", {
  id: text("id").primaryKey(),
  cycleMonth: text("cycle_month").notNull(),
  status: text("status").notNull().default("open"),
  outreachCount: integer("outreach_count").notNull().default(0),
  mentionsFound: integer("mentions_found").notNull().default(0),
  verifiedLinks: integer("verified_links").notNull().default(0),
  notes: text("notes").notNull().default(""),
  createdByUserId: integer("created_by_user_id").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("organic_outreach_cycles_month_idx").on(table.cycleMonth),
  index("organic_outreach_cycles_status_month_idx").on(table.status, table.cycleMonth),
]);

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

export const declarativeRuleVersions = sqliteTable("declarative_rule_versions", {
  id: text("id").primaryKey(),
  ruleCode: text("rule_code").notNull(),
  version: text("version").notNull(),
  schemaVersion: text("schema_version").notNull(),
  definitionJson: text("definition_json").notNull(),
  selectorKey: text("selector_key").notNull(),
  effectiveFrom: text("effective_from").notNull(),
  effectiveTo: text("effective_to").notNull(),
  priority: integer("priority").notNull().default(0),
  contentHash: text("content_hash").notNull(),
  predecessorHash: text("predecessor_hash"),
  status: text("status").notNull().default("draft"),
  regressionFingerprint: text("regression_fingerprint"),
  validatedAt: text("validated_at"),
  canaryAt: text("canary_at"),
  activatedAt: text("activated_at"),
  revokedAt: text("revoked_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("declarative_rule_versions_code_version_idx").on(table.ruleCode, table.version),
  uniqueIndex("declarative_rule_versions_hash_idx").on(table.contentHash),
  index("declarative_rule_versions_selector_period_idx").on(table.selectorKey, table.effectiveFrom, table.effectiveTo, table.priority),
  index("declarative_rule_versions_status_updated_idx").on(table.status, table.updatedAt),
]);

export const declarativeRuleEvents = sqliteTable("declarative_rule_events", {
  id: text("id").primaryKey(),
  ruleVersionId: text("rule_version_id").notNull(),
  eventType: text("event_type").notNull(),
  fromStatus: text("from_status"),
  toStatus: text("to_status"),
  evidenceJson: text("evidence_json").notNull().default("{}"),
  actorUserId: integer("actor_user_id"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("declarative_rule_events_version_created_idx").on(table.ruleVersionId, table.createdAt, table.id),
  index("declarative_rule_events_type_created_idx").on(table.eventType, table.createdAt, table.id),
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
  criticality: text("criticality").notNull().default("standard"),
  monitoringFrequency: text("monitoring_frequency").notNull().default("daily"),
  alternativeUrl: text("alternative_url"),
  alternativeEvidenceScope: text("alternative_evidence_scope").notNull().default("not_available"),
  connectorId: text("connector_id"),
  connectorContractVersion: text("connector_contract_version"),
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
  attemptCount: integer("attempt_count").notNull().default(1),
  startedAt: text("started_at").notNull(),
  lastAttemptAt: text("last_attempt_at"),
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
  normalizedContentHash: text("normalized_content_hash"),
  finalUrl: text("final_url"),
  accessPath: text("access_path").notNull().default("none"),
  attempts: integer("attempts").notNull().default(0),
  bytesHashed: integer("bytes_hashed").notNull().default(0),
  alternativeHttpStatus: integer("alternative_http_status"),
  failureCode: text("failure_code"),
  etag: text("etag"),
  lastModified: text("last_modified"),
  notModified: integer("not_modified", { mode: "boolean" }).notNull().default(false),
  connectorId: text("connector_id"),
  artifactKind: text("artifact_kind"),
  parserVersion: text("parser_version"),
  parseStatus: text("parse_status").notNull().default("not_applicable"),
  detectedVersion: text("detected_version"),
  publishedAt: text("published_at"),
  detectedEffectiveFrom: text("detected_effective_from"),
  promotionStatus: text("promotion_status").notNull().default("not_applicable"),
  contractErrorsJson: text("contract_errors_json").notNull().default("[]"),
  checkedAt: text("checked_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("normative_source_snapshots_run_source_idx").on(table.runId, table.sourceCode),
  index("normative_source_snapshots_source_checked_idx").on(table.sourceCode, table.checkedAt, table.id),
  index("normative_source_snapshots_hash_idx").on(table.contentHash, table.id),
]);

export const normativeSourceIncidents = sqliteTable("normative_source_incidents", {
  id: text("id").primaryKey(),
  sourceCode: text("source_code").notNull(),
  snapshotId: text("snapshot_id").notNull(),
  connectorId: text("connector_id").notNull(),
  incidentKind: text("incident_kind").notNull(),
  status: text("status").notNull().default("open"),
  detailsJson: text("details_json").notNull().default("{}"),
  detectedAt: text("detected_at").notNull(),
  resolvedAt: text("resolved_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("normative_source_incidents_snapshot_kind_idx").on(table.snapshotId, table.incidentKind),
  index("normative_source_incidents_source_status_idx").on(table.sourceCode, table.status, table.detectedAt, table.id),
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

export const fiscalImpactRuns = sqliteTable("fiscal_impact_runs", {
  id: text("id").primaryKey(),
  changeEventId: text("change_event_id").notNull(),
  sourceCode: text("source_code").notNull(),
  status: text("status").notNull().default("queued"),
  impactedRuleCodesJson: text("impacted_rule_codes_json").notNull().default("[]"),
  regressionFingerprint: text("regression_fingerprint"),
  affectedCompanies: integer("affected_companies").notNull().default(0),
  affectedCompetences: integer("affected_competences").notNull().default(0),
  affectedArtifacts: integer("affected_artifacts").notNull().default(0),
  blockedArtifacts: integer("blocked_artifacts").notNull().default(0),
  historicalNotices: integer("historical_notices").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  finishedAt: text("finished_at"),
}, (table) => [
  uniqueIndex("fiscal_impact_runs_change_event_idx").on(table.changeEventId),
  index("fiscal_impact_runs_status_created_idx").on(table.status, table.createdAt, table.id),
]);

export const fiscalImpactNodes = sqliteTable("fiscal_impact_nodes", {
  id: text("id").primaryKey(),
  impactRunId: text("impact_run_id").notNull(),
  nodeKey: text("node_key").notNull(),
  nodeType: text("node_type").notNull(),
  externalId: text("external_id").notNull(),
  workspaceId: integer("workspace_id"),
  companyId: integer("company_id"),
  competence: text("competence"),
  immutableSnapshot: integer("immutable_snapshot", { mode: "boolean" }).notNull().default(false),
  contentHash: text("content_hash"),
  metadataJson: text("metadata_json").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("fiscal_impact_nodes_run_key_idx").on(table.impactRunId, table.nodeKey),
  index("fiscal_impact_nodes_workspace_company_idx").on(table.workspaceId, table.companyId, table.competence),
  index("fiscal_impact_nodes_type_external_idx").on(table.nodeType, table.externalId),
]);

export const fiscalImpactEdges = sqliteTable("fiscal_impact_edges", {
  id: text("id").primaryKey(),
  impactRunId: text("impact_run_id").notNull(),
  edgeKey: text("edge_key").notNull(),
  fromNodeKey: text("from_node_key").notNull(),
  toNodeKey: text("to_node_key").notNull(),
  relation: text("relation").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("fiscal_impact_edges_run_key_idx").on(table.impactRunId, table.edgeKey),
  index("fiscal_impact_edges_from_idx").on(table.impactRunId, table.fromNodeKey),
  index("fiscal_impact_edges_to_idx").on(table.impactRunId, table.toNodeKey),
]);

export const fiscalReexecutionJobs = sqliteTable("fiscal_reexecution_jobs", {
  id: text("id").primaryKey(),
  impactRunId: text("impact_run_id").notNull(),
  artifactType: text("artifact_type").notNull(),
  artifactId: text("artifact_id").notNull(),
  workspaceId: integer("workspace_id").notNull(),
  companyId: integer("company_id"),
  competence: text("competence"),
  disposition: text("disposition").notNull(),
  status: text("status").notNull().default("queued"),
  idempotencyKey: text("idempotency_key").notNull(),
  beforeContentHash: text("before_content_hash").notNull(),
  afterContentHash: text("after_content_hash"),
  beforeRuleVersion: text("before_rule_version").notNull(),
  afterRuleVersion: text("after_rule_version"),
  diffJson: text("diff_json").notNull().default("{}"),
  attempts: integer("attempts").notNull().default(0),
  lockToken: text("lock_token"),
  lockedAt: text("locked_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  finishedAt: text("finished_at"),
}, (table) => [
  uniqueIndex("fiscal_reexecution_jobs_idempotency_idx").on(table.idempotencyKey),
  index("fiscal_reexecution_jobs_run_status_idx").on(table.impactRunId, table.status, table.createdAt),
  index("fiscal_reexecution_jobs_workspace_company_idx").on(table.workspaceId, table.companyId, table.competence),
]);

export const fiscalImpactRunEvents = sqliteTable("fiscal_impact_run_events", {
  id: text("id").primaryKey(),
  impactRunId: text("impact_run_id").notNull(),
  eventType: text("event_type").notNull(),
  eventDataJson: text("event_data_json").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("fiscal_impact_run_events_run_created_idx").on(table.impactRunId, table.createdAt, table.id),
  index("fiscal_impact_run_events_type_created_idx").on(table.eventType, table.createdAt, table.id),
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

export const coverageDemandSignals = sqliteTable("coverage_demand_signals", {
  id: text("id").primaryKey(),
  monthKey: text("month_key").notNull(),
  dimensionType: text("dimension_type").notNull(),
  dimensionKey: text("dimension_key").notNull(),
  taxScope: text("tax_scope").notNull(),
  occurrenceCount: integer("occurrence_count").notNull().default(0),
  supportedCount: integer("supported_count").notNull().default(0),
  partialCount: integer("partial_count").notNull().default(0),
  blockedCount: integer("blocked_count").notNull().default(0),
  firstSeenAt: text("first_seen_at").notNull(),
  lastSeenAt: text("last_seen_at").notNull(),
}, (table) => [
  uniqueIndex("coverage_demand_signals_month_dimension_idx").on(table.monthKey, table.dimensionType, table.dimensionKey, table.taxScope),
  index("coverage_demand_signals_month_scope_idx").on(table.monthKey, table.taxScope, table.occurrenceCount),
]);

export const coverageDemandClaims = sqliteTable("coverage_demand_claims", {
  id: text("id").primaryKey(),
  signalId: text("signal_id").notNull(),
  monthKey: text("month_key").notNull(),
  workspaceHash: text("workspace_hash").notNull(),
  revenueCents: integer("revenue_cents").notNull().default(0),
  hitCount: integer("hit_count").notNull().default(1),
  firstSeenAt: text("first_seen_at").notNull(),
  lastSeenAt: text("last_seen_at").notNull(),
}, (table) => [
  uniqueIndex("coverage_demand_claims_signal_workspace_idx").on(table.signalId, table.workspaceHash),
  index("coverage_demand_claims_month_signal_idx").on(table.monthKey, table.signalId),
]);

export const coverageMonthlyBacklog = sqliteTable("coverage_monthly_backlog", {
  id: text("id").primaryKey(),
  monthKey: text("month_key").notNull(),
  itemCode: text("item_code").notNull(),
  dimensionType: text("dimension_type").notNull(),
  dimensionKey: text("dimension_key").notNull(),
  taxScope: text("tax_scope").notNull(),
  priorityScore: integer("priority_score").notNull(),
  frequencyCount: integer("frequency_count").notNull().default(0),
  workspaceCount: integer("workspace_count").notNull().default(0),
  revenueCents: integer("revenue_cents").notNull().default(0),
  blockedCount: integer("blocked_count").notNull().default(0),
  partialCount: integer("partial_count").notNull().default(0),
  supportedCount: integer("supported_count").notNull().default(0),
  riskScore: integer("risk_score").notNull(),
  sourceHealthBps: integer("source_health_bps").notNull(),
  currentCoverageBps: integer("current_coverage_bps").notNull(),
  projectedGainBps: integer("projected_gain_bps").notNull().default(0),
  verifiedGainBps: integer("verified_gain_bps").notNull().default(0),
  expectedCaseCount: integer("expected_case_count").notNull().default(0),
  sourceCodesJson: text("source_codes_json").notNull().default("[]"),
  ruleCodesJson: text("rule_codes_json").notNull().default("[]"),
  testCodesJson: text("test_codes_json").notNull().default("[]"),
  implementationRef: text("implementation_ref").notNull().default(""),
  justificationJson: text("justification_json").notNull().default("[]"),
  fingerprint: text("fingerprint").notNull(),
  status: text("status").notNull().default("planned"),
  refreshedAt: text("refreshed_at").notNull(),
  verifiedAt: text("verified_at"),
}, (table) => [
  uniqueIndex("coverage_monthly_backlog_month_item_idx").on(table.monthKey, table.itemCode),
  index("coverage_monthly_backlog_month_priority_idx").on(table.monthKey, table.priorityScore, table.itemCode),
]);

export const coverageExpansionGoals = sqliteTable("coverage_expansion_goals", {
  id: text("id").primaryKey(),
  monthKey: text("month_key").notNull(),
  taxScope: text("tax_scope").notNull(),
  targetGainBps: integer("target_gain_bps").notNull(),
  startingCoverageBps: integer("starting_coverage_bps").notNull(),
  projectedGainBps: integer("projected_gain_bps").notNull().default(0),
  verifiedGainBps: integer("verified_gain_bps").notNull().default(0),
  backlogCount: integer("backlog_count").notNull().default(0),
  fingerprint: text("fingerprint").notNull(),
  refreshedAt: text("refreshed_at").notNull(),
}, (table) => [
  uniqueIndex("coverage_expansion_goals_month_scope_idx").on(table.monthKey, table.taxScope),
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

export const fiscalIntelligenceMetrics = sqliteTable("fiscal_intelligence_metrics", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workspaceId: integer("workspace_id").notNull(),
  actorUserId: integer("actor_user_id").notNull(),
  eventType: text("event_type").notNull(),
  outcome: text("outcome").notNull(),
  coverageStatus: text("coverage_status").notNull(),
  topicCode: text("topic_code"),
  baseVersion: text("base_version"),
  durationMs: integer("duration_ms").notNull(),
  questionLengthBucket: text("question_length_bucket").notNull(),
  factCount: integer("fact_count").notNull().default(0),
  sourceCount: integer("source_count").notNull().default(0),
  clarificationCount: integer("clarification_count").notNull().default(0),
  errorCode: text("error_code"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("fiscal_intelligence_metrics_workspace_created_idx").on(table.workspaceId, table.createdAt, table.id),
  index("fiscal_intelligence_metrics_workspace_coverage_idx").on(table.workspaceId, table.coverageStatus, table.createdAt, table.id),
  index("fiscal_intelligence_metrics_outcome_created_idx").on(table.outcome, table.createdAt, table.id),
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

export const reportWorkItems = sqliteTable("report_work_items", {
  id: text("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull(),
  companyId: integer("company_id").notNull(),
  periodKey: text("period_key").notNull(),
  createdByUserId: integer("created_by_user_id").notNull(),
  assignedUserId: integer("assigned_user_id"),
  reviewerUserId: integer("reviewer_user_id"),
  status: text("status").notNull().default("draft"),
  revision: integer("revision").notNull().default(1),
  executiveSummary: text("executive_summary").notNull().default(""),
  conclusion: text("conclusion").notNull().default(""),
  indicatorsJson: text("indicators_json").notNull().default("{}"),
  pendingItemsJson: text("pending_items_json").notNull().default("[]"),
  templateKey: text("template_key").notNull().default("monthly-pme"),
  templateVersion: integer("template_version").notNull().default(1),
  blocksJson: text("blocks_json").notNull().default("[]"),
  commercialNotes: text("commercial_notes").notNull().default(""),
  recommendationsJson: text("recommendations_json").notNull().default("[]"),
  snapshotHash: text("snapshot_hash"),
  dueAt: text("due_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("report_work_items_workspace_company_period_idx").on(table.workspaceId, table.companyId, table.periodKey),
  index("report_work_items_workspace_status_period_idx").on(table.workspaceId, table.status, table.periodKey, table.id),
  index("report_work_items_workspace_assignee_idx").on(table.workspaceId, table.assignedUserId, table.status, table.id),
  index("report_work_items_workspace_reviewer_idx").on(table.workspaceId, table.reviewerUserId, table.status, table.id),
]);

export const reportWorkItemLinks = sqliteTable("report_work_item_links", {
  id: text("id").primaryKey(),
  reportId: text("report_id").notNull(),
  workspaceId: integer("workspace_id").notNull(),
  companyId: integer("company_id").notNull(),
  artifactType: text("artifact_type").notNull(),
  artifactId: text("artifact_id").notNull(),
  artifactLabel: text("artifact_label").notNull(),
  artifactHash: text("artifact_hash").notNull(),
  artifactVersion: text("artifact_version"),
  artifactStatus: text("artifact_status").notNull(),
  createdByUserId: integer("created_by_user_id").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("report_work_item_links_report_artifact_idx").on(table.reportId, table.artifactType, table.artifactId),
  index("report_work_item_links_workspace_report_idx").on(table.workspaceId, table.reportId, table.createdAt, table.id),
]);

export const reportWorkItemRevisions = sqliteTable("report_work_item_revisions", {
  id: text("id").primaryKey(),
  reportId: text("report_id").notNull(),
  workspaceId: integer("workspace_id").notNull(),
  companyId: integer("company_id").notNull(),
  periodKey: text("period_key").notNull(),
  revision: integer("revision").notNull(),
  snapshotJson: text("snapshot_json").notNull(),
  snapshotHash: text("snapshot_hash").notNull(),
  createdByUserId: integer("created_by_user_id").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("report_work_item_revisions_report_revision_idx").on(table.reportId, table.revision),
  index("report_work_item_revisions_workspace_report_idx").on(table.workspaceId, table.reportId, table.revision),
]);

export const reportWorkItemEvents = sqliteTable("report_work_item_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  reportId: text("report_id").notNull(),
  workspaceId: integer("workspace_id").notNull(),
  actorUserId: integer("actor_user_id").notNull(),
  eventType: text("event_type").notNull(),
  note: text("note").notNull().default(""),
  eventData: text("event_data").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("report_work_item_events_report_created_idx").on(table.reportId, table.createdAt, table.id),
  index("report_work_item_events_workspace_created_idx").on(table.workspaceId, table.createdAt, table.id),
]);

export const reportTemplates = sqliteTable("report_templates", {
  id: text("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull(),
  name: text("name").notNull(),
  serviceType: text("service_type").notNull(),
  clientType: text("client_type").notNull(),
  blocksJson: text("blocks_json").notNull(),
  version: integer("version").notNull().default(1),
  createdByUserId: integer("created_by_user_id").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("report_templates_workspace_name_idx").on(table.workspaceId, table.name),
  index("report_templates_workspace_service_idx").on(table.workspaceId, table.serviceType, table.clientType, table.updatedAt),
]);

export const reportWorkspaceBranding = sqliteTable("report_workspace_branding", {
  workspaceId: integer("workspace_id").primaryKey(),
  brandingJson: text("branding_json").notNull(),
  version: integer("version").notNull().default(1),
  updatedByUserId: integer("updated_by_user_id").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const reportApprovals = sqliteTable("report_approvals", {
  id: text("id").primaryKey(),
  reportId: text("report_id").notNull(),
  workspaceId: integer("workspace_id").notNull(),
  revision: integer("revision").notNull(),
  snapshotHash: text("snapshot_hash").notNull(),
  reviewerUserId: integer("reviewer_user_id").notNull(),
  reviewerName: text("reviewer_name").notNull(),
  professionalRegistration: text("professional_registration").notNull(),
  signatureVersion: text("signature_version").notNull(),
  approvalSignature: text("approval_signature").notNull(),
  decidedAt: text("decided_at").notNull(),
}, (table) => [
  uniqueIndex("report_approvals_report_revision_idx").on(table.reportId, table.revision),
  index("report_approvals_workspace_decided_idx").on(table.workspaceId, table.decidedAt, table.id),
]);

export const reportExports = sqliteTable("report_exports", {
  id: text("id").primaryKey(),
  reportId: text("report_id").notNull(),
  workspaceId: integer("workspace_id").notNull(),
  revision: integer("revision").notNull(),
  snapshotHash: text("snapshot_hash").notNull(),
  templateKey: text("template_key").notNull(),
  templateVersion: integer("template_version").notNull(),
  pdfSha256: text("pdf_sha256").notNull(),
  createdByUserId: integer("created_by_user_id").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("report_exports_report_revision_idx").on(table.reportId, table.revision, table.createdAt, table.id),
  index("report_exports_workspace_created_idx").on(table.workspaceId, table.createdAt, table.id),
]);

export const monthlyClosingConfigs = sqliteTable("monthly_closing_configs", {
  id: text("id").primaryKey(), workspaceId: integer("workspace_id").notNull(), companyId: integer("company_id").notNull(), active: integer("active", { mode: "boolean" }).notNull().default(true),
  dueDay: integer("due_day").notNull().default(10), preparationSlaHours: integer("preparation_sla_hours").notNull().default(72), reviewSlaHours: integer("review_sla_hours").notNull().default(48),
  preparerUserId: integer("preparer_user_id"), reviewerUserId: integer("reviewer_user_id"), requiredDocumentCount: integer("required_document_count").notNull().default(1),
  requireSnapshot: integer("require_snapshot", { mode: "boolean" }).notNull().default(true), requireConclusion: integer("require_conclusion", { mode: "boolean" }).notNull().default(true),
  createdByUserId: integer("created_by_user_id").notNull(), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`), updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("monthly_closing_configs_workspace_company_idx").on(table.workspaceId, table.companyId), index("monthly_closing_configs_workspace_active_idx").on(table.workspaceId, table.active, table.companyId)]);

export const monthlyClosingCycles = sqliteTable("monthly_closing_cycles", {
  id: text("id").primaryKey(), workspaceId: integer("workspace_id").notNull(), companyId: integer("company_id").notNull(), periodKey: text("period_key").notNull(), reportId: text("report_id").notNull(), configId: text("config_id").notNull(), stage: text("stage").notNull().default("preparation"), dueAt: text("due_at").notNull(), preparationDueAt: text("preparation_due_at").notNull(), reviewDueAt: text("review_due_at"), deliveredAt: text("delivered_at"), decidedAt: text("decided_at"), clientDecision: text("client_decision"), clientNote: text("client_note").notNull().default(""), acceptedReportRevision: integer("accepted_report_revision"), acceptedSnapshotHash: text("accepted_snapshot_hash"), reopenedFromRevision: integer("reopened_from_revision"), reopenedAt: text("reopened_at"), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`), updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("monthly_closing_cycles_workspace_company_period_idx").on(table.workspaceId, table.companyId, table.periodKey), index("monthly_closing_cycles_workspace_stage_due_idx").on(table.workspaceId, table.stage, table.dueAt, table.id), index("monthly_closing_cycles_report_idx").on(table.reportId, table.periodKey)]);

export const monthlyClosingEvents = sqliteTable("monthly_closing_events", {
  id: text("id").primaryKey(), cycleId: text("cycle_id").notNull(), workspaceId: integer("workspace_id").notNull(), actorType: text("actor_type").notNull(), actorUserId: integer("actor_user_id"), eventType: text("event_type").notNull(), eventDataJson: text("event_data_json").notNull().default("{}"), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("monthly_closing_events_cycle_created_idx").on(table.cycleId, table.createdAt, table.id), index("monthly_closing_events_workspace_created_idx").on(table.workspaceId, table.createdAt, table.id)]);

export const monthlyClosingReminders = sqliteTable("monthly_closing_reminders", {
  id: text("id").primaryKey(), cycleId: text("cycle_id").notNull(), workspaceId: integer("workspace_id").notNull(), reminderKind: text("reminder_kind").notNull(), dedupeKey: text("dedupe_key").notNull(), recipientUserId: integer("recipient_user_id"), status: text("status").notNull().default("queued"), createdByUserId: integer("created_by_user_id").notNull(), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("monthly_closing_reminders_dedupe_idx").on(table.workspaceId, table.dedupeKey), index("monthly_closing_reminders_cycle_created_idx").on(table.cycleId, table.createdAt, table.id)]);

export const monthlyClosingShares = sqliteTable("monthly_closing_shares", {
  id: text("id").primaryKey(), cycleId: text("cycle_id").notNull(), workspaceId: integer("workspace_id").notNull(), reportId: text("report_id").notNull(), reportRevision: integer("report_revision").notNull(), snapshotHash: text("snapshot_hash").notNull(), tokenHash: text("token_hash").notNull(), expiresAt: text("expires_at").notNull(), revokedAt: text("revoked_at"), viewedAt: text("viewed_at"), viewCount: integer("view_count").notNull().default(0), decision: text("decision"), decisionNote: text("decision_note").notNull().default(""), decidedAt: text("decided_at"), createdByUserId: integer("created_by_user_id").notNull(), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("monthly_closing_shares_token_hash_idx").on(table.tokenHash), index("monthly_closing_shares_cycle_created_idx").on(table.cycleId, table.createdAt, table.id)]);

export const spreadsheetImportProfiles = sqliteTable("spreadsheet_import_profiles", {
  id: text("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull(),
  name: text("name").notNull(),
  model: text("model").notNull(),
  columnMappingJson: text("column_mapping_json").notNull(),
  createdByUserId: integer("created_by_user_id").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("spreadsheet_import_profiles_workspace_name_idx").on(table.workspaceId, table.name),
  index("spreadsheet_import_profiles_workspace_model_idx").on(table.workspaceId, table.model, table.updatedAt, table.id),
]);

export const spreadsheetImportBatches = sqliteTable("spreadsheet_import_batches", {
  id: text("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull(),
  companyId: integer("company_id").notNull(),
  periodKey: text("period_key").notNull(),
  profileId: text("profile_id"),
  createdByUserId: integer("created_by_user_id").notNull(),
  filename: text("filename").notNull(),
  format: text("format").notNull(),
  sourceHash: text("source_hash").notNull(),
  model: text("model").notNull(),
  status: text("status").notNull().default("committed"),
  totalRows: integer("total_rows").notNull(),
  acceptedRows: integer("accepted_rows").notNull(),
  invalidRows: integer("invalid_rows").notNull(),
  duplicateRows: integer("duplicate_rows").notNull(),
  divergentRows: integer("divergent_rows").notNull(),
  formulaCellsDiscarded: integer("formula_cells_discarded").notNull(),
  rawFilePersisted: integer("raw_file_persisted", { mode: "boolean" }).notNull().default(false),
  reportJson: text("report_json").notNull(),
  rolledBackAt: text("rolled_back_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("spreadsheet_import_batches_workspace_source_idx").on(table.workspaceId, table.companyId, table.periodKey, table.sourceHash, table.status),
  index("spreadsheet_import_batches_workspace_company_period_idx").on(table.workspaceId, table.companyId, table.periodKey, table.createdAt, table.id),
]);

export const spreadsheetImportRows = sqliteTable("spreadsheet_import_rows", {
  id: text("id").primaryKey(),
  batchId: text("batch_id").notNull(),
  workspaceId: integer("workspace_id").notNull(),
  companyId: integer("company_id").notNull(),
  periodKey: text("period_key").notNull(),
  rowNumber: integer("row_number").notNull(),
  documentKey: text("document_key").notNull(),
  recordType: text("record_type").notNull(),
  normalizedJson: text("normalized_json").notNull(),
  evidenceHash: text("evidence_hash").notNull(),
  status: text("status").notNull(),
  issuesJson: text("issues_json").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("spreadsheet_import_rows_batch_row_idx").on(table.batchId, table.rowNumber),
  index("spreadsheet_import_rows_reconcile_idx").on(table.workspaceId, table.companyId, table.periodKey, table.documentKey, table.recordType),
]);

export const spreadsheetImportEvents = sqliteTable("spreadsheet_import_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  batchId: text("batch_id").notNull(),
  workspaceId: integer("workspace_id").notNull(),
  actorUserId: integer("actor_user_id").notNull(),
  eventType: text("event_type").notNull(),
  eventData: text("event_data").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("spreadsheet_import_events_batch_created_idx").on(table.batchId, table.createdAt, table.id),
  index("spreadsheet_import_events_workspace_created_idx").on(table.workspaceId, table.createdAt, table.id),
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

export const supportTickets = sqliteTable("support_tickets", {
  id: text("id").primaryKey(),
  protocol: text("protocol").notNull(),
  workspaceId: integer("workspace_id").notNull(),
  reporterUserId: integer("reporter_user_id").notNull(),
  companyId: integer("company_id"),
  category: text("category").notNull(),
  moduleCode: text("module_code").notNull(),
  releaseId: text("release_id").notNull(),
  releaseTag: text("release_tag").notNull(),
  traceCode: text("trace_code"),
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  consentVersion: text("consent_version").notNull(),
  status: text("status").notNull().default("open"),
  responseDueAt: text("response_due_at").notNull(),
  resolvedAt: text("resolved_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("support_tickets_protocol_idx").on(table.protocol),
  index("support_tickets_workspace_status_idx").on(table.workspaceId, table.status, table.createdAt, table.id),
  index("support_tickets_reporter_created_idx").on(table.reporterUserId, table.createdAt, table.id),
]);

export const supportTicketEvents = sqliteTable("support_ticket_events", {
  id: text("id").primaryKey(),
  ticketId: text("ticket_id").notNull(),
  actorUserId: integer("actor_user_id"),
  eventType: text("event_type").notNull(),
  fromStatus: text("from_status"),
  toStatus: text("to_status"),
  requestId: text("request_id").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("support_ticket_events_ticket_created_idx").on(table.ticketId, table.createdAt, table.id),
]);

export const rtcCalculatorVersions = sqliteTable("rtc_calculator_versions", {
  id: text("id").primaryKey(),
  applicationVersion: text("application_version").notNull(),
  databaseVersion: text("database_version").notNull(),
  databaseDate: text("database_date").notNull(),
  environment: text("environment").notNull(),
  packageManifestJson: text("package_manifest_json").notNull(),
  packageLicenseStatus: text("package_license_status").notNull(),
  status: text("status").notNull().default("candidate"),
  fingerprint: text("fingerprint").notNull(),
  detectedAt: text("detected_at").notNull(),
  canaryAt: text("canary_at"),
  activatedAt: text("activated_at"),
  revokedAt: text("revoked_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("rtc_calculator_versions_app_db_idx").on(table.applicationVersion, table.databaseVersion, table.environment),
  index("rtc_calculator_versions_status_updated_idx").on(table.status, table.updatedAt, table.id),
]);

export const rtcCalculatorDatasets = sqliteTable("rtc_calculator_datasets", {
  id: text("id").primaryKey(),
  versionId: text("version_id").notNull(),
  datasetCode: text("dataset_code").notNull(),
  datasetKind: text("dataset_kind").notNull(),
  effectiveDate: text("effective_date").notNull(),
  recordCount: integer("record_count").notNull(),
  contentHash: text("content_hash").notNull(),
  payloadJson: text("payload_json").notNull(),
  capturedAt: text("captured_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("rtc_calculator_datasets_version_code_idx").on(table.versionId, table.datasetCode),
  index("rtc_calculator_datasets_code_captured_idx").on(table.datasetCode, table.capturedAt, table.id),
]);

export const rtcCalculatorReconciliations = sqliteTable("rtc_calculator_reconciliations", {
  id: text("id").primaryKey(),
  versionId: text("version_id").notNull(),
  corpusVersion: text("corpus_version").notNull(),
  status: text("status").notNull(),
  caseCount: integer("case_count").notNull(),
  datasetCount: integer("dataset_count").notNull(),
  differenceCount: integer("difference_count").notNull(),
  differencesJson: text("differences_json").notNull().default("[]"),
  reportJson: text("report_json").notNull().default("{}"),
  fingerprint: text("fingerprint").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("rtc_calculator_reconciliations_version_fingerprint_idx").on(table.versionId, table.fingerprint),
  index("rtc_calculator_reconciliations_status_created_idx").on(table.status, table.createdAt, table.id),
]);

export const rtcCalculatorEvents = sqliteTable("rtc_calculator_events", {
  id: text("id").primaryKey(),
  versionId: text("version_id").notNull(),
  eventType: text("event_type").notNull(),
  fromStatus: text("from_status"),
  toStatus: text("to_status"),
  evidenceJson: text("evidence_json").notNull().default("{}"),
  actorUserId: integer("actor_user_id"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("rtc_calculator_events_version_created_idx").on(table.versionId, table.createdAt, table.id),
]);

export const fiscalFreshnessObservations = sqliteTable("fiscal_freshness_observations", {
  id: text("id").primaryKey(),
  dayKey: text("day_key").notNull(),
  sourceCode: text("source_code").notNull(),
  criticality: text("criticality").notNull(),
  freshnessStatus: text("freshness_status").notNull(),
  coverageEffect: text("coverage_effect").notNull(),
  slaHours: integer("sla_hours").notNull(),
  ageMinutes: integer("age_minutes"),
  deadlineAt: text("deadline_at"),
  captureStatus: text("capture_status").notNull(),
  sourceVersion: text("source_version").notNull(),
  sourceUrl: text("source_url").notNull(),
  reason: text("reason").notNull(),
  impactedRuleCodesJson: text("impacted_rule_codes_json").notNull().default("[]"),
  fingerprint: text("fingerprint").notNull(),
  observedAt: text("observed_at").notNull(),
}, (table) => [
  uniqueIndex("fiscal_freshness_observations_day_source_idx").on(table.dayKey, table.sourceCode),
  index("fiscal_freshness_observations_status_observed_idx").on(table.freshnessStatus, table.observedAt, table.sourceCode),
]);

export const fiscalAlertDeliveries = sqliteTable("fiscal_alert_deliveries", {
  id: text("id").primaryKey(),
  alertKey: text("alert_key").notNull(),
  sourceCode: text("source_code"),
  severity: text("severity").notNull(),
  channel: text("channel").notNull().default("email"),
  recipient: text("recipient").notNull(),
  subject: text("subject").notNull(),
  status: text("status").notNull().default("queued"),
  payloadHash: text("payload_hash").notNull(),
  attemptCount: integer("attempt_count").notNull().default(0),
  providerRef: text("provider_ref"),
  errorCode: text("error_code"),
  firstQueuedAt: text("first_queued_at").notNull(),
  lastAttemptAt: text("last_attempt_at"),
  sentAt: text("sent_at"),
}, (table) => [
  uniqueIndex("fiscal_alert_deliveries_alert_key_idx").on(table.alertKey),
  index("fiscal_alert_deliveries_status_queued_idx").on(table.status, table.firstQueuedAt, table.id),
]);

export const fiscalDailySummaries = sqliteTable("fiscal_daily_summaries", {
  id: text("id").primaryKey(),
  dayKey: text("day_key").notNull(),
  status: text("status").notNull(),
  metricsJson: text("metrics_json").notNull().default("{}"),
  sourceVersionsHash: text("source_versions_hash").notNull(),
  generatedAt: text("generated_at").notNull(),
  emailStatus: text("email_status").notNull().default("pending"),
}, (table) => [
  uniqueIndex("fiscal_daily_summaries_day_idx").on(table.dayKey),
]);

export const securityAgentScopes = sqliteTable("security_agent_scopes", {
  id: text("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull(),
  domain: text("domain").notNull(),
  status: text("status").notNull().default("pending"),
  verificationToken: text("verification_token").notNull(),
  createdByUserId: integer("created_by_user_id").notNull(),
  verifiedAt: text("verified_at"),
  monitoringEnabled: integer("monitoring_enabled", { mode: "boolean" }).notNull().default(false),
  nextScanAt: text("next_scan_at"),
  lastScanAt: text("last_scan_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("security_agent_scopes_active_domain_idx").on(table.workspaceId, table.domain).where(sql`${table.status} <> 'revoked'`),
  index("security_agent_scopes_monitoring_due_idx").on(table.monitoringEnabled, table.status, table.nextScanAt, table.id),
]);

export const securityAgentJobs = sqliteTable("security_agent_jobs", {
  id: text("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull(),
  scopeId: text("scope_id").notNull(),
  triggerKind: text("trigger_kind").notNull(),
  scanMode: text("scan_mode").notNull().default("passive"),
  status: text("status").notNull().default("queued"),
  evidenceJson: text("evidence_json").notNull().default("{}"),
  assessmentJson: text("assessment_json").notNull().default("{}"),
  provider: text("provider"),
  model: text("model"),
  providerResponseId: text("provider_response_id"),
  errorCode: text("error_code"),
  startedAt: text("started_at").notNull(),
  completedAt: text("completed_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("security_agent_jobs_workspace_started_idx").on(table.workspaceId, table.startedAt, table.id),
  index("security_agent_jobs_scope_started_idx").on(table.scopeId, table.startedAt, table.id),
]);

export const securityAgentEvents = sqliteTable("security_agent_events", {
  id: text("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull(),
  scopeId: text("scope_id").notNull(),
  actorUserId: integer("actor_user_id"),
  eventType: text("event_type").notNull(),
  detailsJson: text("details_json").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("security_agent_events_scope_created_idx").on(table.scopeId, table.createdAt, table.id),
  index("security_agent_events_workspace_created_idx").on(table.workspaceId, table.createdAt, table.id),
]);

export const securityDefenseConnectors = sqliteTable("security_defense_connectors", {
  id: text("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull(),
  scopeId: text("scope_id").notNull(),
  provider: text("provider").notNull().default("signed_webhook"),
  mode: text("mode").notNull().default("observe"),
  enforcement: text("enforcement").notNull().default("observe_only"),
  status: text("status").notNull().default("active"),
  keySalt: text("key_salt").notNull(),
  lastSignalAt: text("last_signal_at"),
  createdByUserId: integer("created_by_user_id").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("security_defense_connectors_scope_provider_idx").on(table.scopeId, table.provider),
  index("security_defense_connectors_workspace_status_idx").on(table.workspaceId, table.status, table.updatedAt, table.id),
]);

export const securityDefenseSignals = sqliteTable("security_defense_signals", {
  id: text("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull(),
  scopeId: text("scope_id").notNull(),
  connectorId: text("connector_id").notNull(),
  externalEventId: text("external_event_id").notNull(),
  signalType: text("signal_type").notNull(),
  confidence: text("confidence").notNull(),
  severity: text("severity").notNull(),
  occurrenceCount: integer("occurrence_count").notNull(),
  windowSeconds: integer("window_seconds").notNull(),
  sourceHash: text("source_hash"),
  resource: text("resource").notNull(),
  summary: text("summary").notNull(),
  attributesJson: text("attributes_json").notNull().default("{}"),
  decisionJson: text("decision_json").notNull(),
  policyVersion: text("policy_version").notNull(),
  occurredAt: text("occurred_at").notNull(),
  receivedAt: text("received_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("security_defense_signals_connector_event_idx").on(table.connectorId, table.externalEventId),
  index("security_defense_signals_scope_occurred_idx").on(table.scopeId, table.occurredAt, table.id),
]);

export const securityDefenseIncidents = sqliteTable("security_defense_incidents", {
  id: text("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull(),
  scopeId: text("scope_id").notNull(),
  correlationKey: text("correlation_key").notNull(),
  category: text("category").notNull(),
  severity: text("severity").notNull(),
  status: text("status").notNull().default("open"),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  occurrenceCount: integer("occurrence_count").notNull().default(1),
  autoContained: integer("auto_contained", { mode: "boolean" }).notNull().default(false),
  firstObservedAt: text("first_observed_at").notNull(),
  lastObservedAt: text("last_observed_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("security_defense_incidents_scope_correlation_idx").on(table.scopeId, table.correlationKey),
  index("security_defense_incidents_workspace_status_idx").on(table.workspaceId, table.status, table.severity, table.lastObservedAt, table.id),
]);

export const securityResponseActions = sqliteTable("security_response_actions", {
  id: text("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull(),
  scopeId: text("scope_id").notNull(),
  incidentId: text("incident_id").notNull(),
  actionType: text("action_type").notNull(),
  autonomy: text("autonomy").notNull(),
  status: text("status").notNull(),
  targetHash: text("target_hash"),
  reason: text("reason").notNull(),
  enforcement: text("enforcement").notNull(),
  expiresAt: text("expires_at"),
  decidedByUserId: integer("decided_by_user_id"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("security_response_actions_scope_status_idx").on(table.scopeId, table.status, table.expiresAt, table.id),
  index("security_response_actions_target_active_idx").on(table.targetHash, table.status, table.expiresAt, table.id),
]);

export const securityDefenseEvents = sqliteTable("security_defense_events", {
  id: text("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull(),
  scopeId: text("scope_id").notNull(),
  incidentId: text("incident_id"),
  actionId: text("action_id"),
  actorUserId: integer("actor_user_id"),
  eventType: text("event_type").notNull(),
  detailsJson: text("details_json").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("security_defense_events_scope_created_idx").on(table.scopeId, table.createdAt, table.id),
  index("security_defense_events_incident_created_idx").on(table.incidentId, table.createdAt, table.id),
]);

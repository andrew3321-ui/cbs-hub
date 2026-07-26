CREATE TABLE `fiscal_result_invalidations` (
	`id` text PRIMARY KEY NOT NULL,
	`change_event_id` text NOT NULL,
	`workspace_id` integer NOT NULL,
	`owner_user_id` integer NOT NULL,
	`dossier_id` text NOT NULL,
	`rule_code` text NOT NULL,
	`rule_version` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`reason` text NOT NULL,
	`notified_at` text,
	`resolved_at` text,
	`resolution_release_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fiscal_result_invalidations_event_dossier_idx` ON `fiscal_result_invalidations` (`change_event_id`,`dossier_id`);--> statement-breakpoint
CREATE INDEX `fiscal_result_invalidations_workspace_status_idx` ON `fiscal_result_invalidations` (`workspace_id`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `fiscal_result_invalidations_dossier_status_idx` ON `fiscal_result_invalidations` (`dossier_id`,`status`,`id`);--> statement-breakpoint
CREATE TABLE `fiscal_rule_releases` (
	`id` text PRIMARY KEY NOT NULL,
	`version` text NOT NULL,
	`manifest_json` text NOT NULL,
	`manifest_hash` text NOT NULL,
	`previous_release_hash` text,
	`source_change_event_id` text,
	`release_kind` text DEFAULT 'normative_change' NOT NULL,
	`status` text DEFAULT 'approved' NOT NULL,
	`approved_by_user_id` integer NOT NULL,
	`professional_registration` text NOT NULL,
	`approval_signature` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fiscal_rule_releases_version_idx` ON `fiscal_rule_releases` (`version`);--> statement-breakpoint
CREATE UNIQUE INDEX `fiscal_rule_releases_manifest_hash_idx` ON `fiscal_rule_releases` (`manifest_hash`);--> statement-breakpoint
CREATE INDEX `fiscal_rule_releases_event_created_idx` ON `fiscal_rule_releases` (`source_change_event_id`,`created_at`,`id`);--> statement-breakpoint
CREATE TABLE `governance_notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` integer NOT NULL,
	`recipient_user_id` integer NOT NULL,
	`notification_type` text NOT NULL,
	`subject_type` text NOT NULL,
	`subject_id` text NOT NULL,
	`message` text NOT NULL,
	`read_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `governance_notifications_recipient_subject_idx` ON `governance_notifications` (`recipient_user_id`,`notification_type`,`subject_type`,`subject_id`);--> statement-breakpoint
CREATE INDEX `governance_notifications_workspace_unread_idx` ON `governance_notifications` (`workspace_id`,`read_at`,`created_at`);--> statement-breakpoint
CREATE TABLE `normative_change_events` (
	`id` text PRIMARY KEY NOT NULL,
	`source_code` text NOT NULL,
	`previous_snapshot_id` text,
	`current_snapshot_id` text NOT NULL,
	`change_kind` text NOT NULL,
	`status` text DEFAULT 'pending_review' NOT NULL,
	`impacted_rule_codes_json` text DEFAULT '[]' NOT NULL,
	`detected_at` text NOT NULL,
	`resolved_at` text,
	`resolution_release_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `normative_change_events_current_snapshot_idx` ON `normative_change_events` (`current_snapshot_id`);--> statement-breakpoint
CREATE INDEX `normative_change_events_status_detected_idx` ON `normative_change_events` (`status`,`detected_at`,`id`);--> statement-breakpoint
CREATE INDEX `normative_change_events_source_detected_idx` ON `normative_change_events` (`source_code`,`detected_at`,`id`);--> statement-breakpoint
CREATE TABLE `normative_change_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`change_event_id` text NOT NULL,
	`workspace_id` integer NOT NULL,
	`reviewer_user_id` integer NOT NULL,
	`reviewer_name` text NOT NULL,
	`professional_role` text NOT NULL,
	`professional_registration` text NOT NULL,
	`decision` text NOT NULL,
	`decision_note` text NOT NULL,
	`release_version` text,
	`release_hash` text,
	`declaration_version` text NOT NULL,
	`decision_signature` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `normative_change_reviews_event_created_idx` ON `normative_change_reviews` (`change_event_id`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `normative_change_reviews_workspace_created_idx` ON `normative_change_reviews` (`workspace_id`,`created_at`,`id`);--> statement-breakpoint
CREATE TABLE `normative_governance_audit_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`change_event_id` text,
	`workspace_id` integer,
	`actor_user_id` integer,
	`event_type` text NOT NULL,
	`event_data` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `normative_governance_audit_change_created_idx` ON `normative_governance_audit_events` (`change_event_id`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `normative_governance_audit_workspace_created_idx` ON `normative_governance_audit_events` (`workspace_id`,`created_at`,`id`);--> statement-breakpoint
CREATE TABLE `normative_monitor_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`run_date` text NOT NULL,
	`status` text DEFAULT 'running' NOT NULL,
	`catalog_version` text NOT NULL,
	`source_count` integer DEFAULT 0 NOT NULL,
	`checked_count` integer DEFAULT 0 NOT NULL,
	`unavailable_count` integer DEFAULT 0 NOT NULL,
	`change_count` integer DEFAULT 0 NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text,
	`error_code` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `normative_monitor_runs_date_catalog_idx` ON `normative_monitor_runs` (`run_date`,`catalog_version`);--> statement-breakpoint
CREATE INDEX `normative_monitor_runs_status_date_idx` ON `normative_monitor_runs` (`status`,`run_date`,`id`);--> statement-breakpoint
CREATE TABLE `normative_source_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`source_version_id` text NOT NULL,
	`source_code` text NOT NULL,
	`capture_status` text NOT NULL,
	`http_status` integer,
	`content_hash` text,
	`previous_content_hash` text,
	`etag` text,
	`last_modified` text,
	`checked_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `normative_source_snapshots_run_source_idx` ON `normative_source_snapshots` (`run_id`,`source_code`);--> statement-breakpoint
CREATE INDEX `normative_source_snapshots_source_checked_idx` ON `normative_source_snapshots` (`source_code`,`checked_at`,`id`);--> statement-breakpoint
CREATE INDEX `normative_source_snapshots_hash_idx` ON `normative_source_snapshots` (`content_hash`,`id`);--> statement-breakpoint
CREATE TABLE `normative_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`catalog_version` text NOT NULL,
	`title` text NOT NULL,
	`publisher` text NOT NULL,
	`jurisdiction` text NOT NULL,
	`legal_device` text NOT NULL,
	`source_kind` text NOT NULL,
	`source_url` text NOT NULL,
	`effective_from` text,
	`effective_to` text,
	`verification_status` text NOT NULL,
	`impacted_rule_codes_json` text DEFAULT '[]' NOT NULL,
	`metadata_hash` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `normative_sources_metadata_hash_idx` ON `normative_sources` (`metadata_hash`);--> statement-breakpoint
CREATE INDEX `normative_sources_code_created_idx` ON `normative_sources` (`code`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `normative_sources_jurisdiction_kind_idx` ON `normative_sources` (`jurisdiction`,`source_kind`,`id`);
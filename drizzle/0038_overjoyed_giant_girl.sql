CREATE TABLE `rtc_calculator_datasets` (
	`id` text PRIMARY KEY NOT NULL,
	`version_id` text NOT NULL,
	`dataset_code` text NOT NULL,
	`dataset_kind` text NOT NULL,
	`effective_date` text NOT NULL,
	`record_count` integer NOT NULL,
	`content_hash` text NOT NULL,
	`payload_json` text NOT NULL,
	`captured_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rtc_calculator_datasets_version_code_idx` ON `rtc_calculator_datasets` (`version_id`,`dataset_code`);--> statement-breakpoint
CREATE INDEX `rtc_calculator_datasets_code_captured_idx` ON `rtc_calculator_datasets` (`dataset_code`,`captured_at`,`id`);--> statement-breakpoint
CREATE TABLE `rtc_calculator_events` (
	`id` text PRIMARY KEY NOT NULL,
	`version_id` text NOT NULL,
	`event_type` text NOT NULL,
	`from_status` text,
	`to_status` text,
	`evidence_json` text DEFAULT '{}' NOT NULL,
	`actor_user_id` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `rtc_calculator_events_version_created_idx` ON `rtc_calculator_events` (`version_id`,`created_at`,`id`);--> statement-breakpoint
CREATE TABLE `rtc_calculator_reconciliations` (
	`id` text PRIMARY KEY NOT NULL,
	`version_id` text NOT NULL,
	`corpus_version` text NOT NULL,
	`status` text NOT NULL,
	`case_count` integer NOT NULL,
	`dataset_count` integer NOT NULL,
	`difference_count` integer NOT NULL,
	`differences_json` text DEFAULT '[]' NOT NULL,
	`report_json` text DEFAULT '{}' NOT NULL,
	`fingerprint` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rtc_calculator_reconciliations_version_fingerprint_idx` ON `rtc_calculator_reconciliations` (`version_id`,`fingerprint`);--> statement-breakpoint
CREATE INDEX `rtc_calculator_reconciliations_status_created_idx` ON `rtc_calculator_reconciliations` (`status`,`created_at`,`id`);--> statement-breakpoint
CREATE TABLE `rtc_calculator_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`application_version` text NOT NULL,
	`database_version` text NOT NULL,
	`database_date` text NOT NULL,
	`environment` text NOT NULL,
	`package_manifest_json` text NOT NULL,
	`package_license_status` text NOT NULL,
	`status` text DEFAULT 'candidate' NOT NULL,
	`fingerprint` text NOT NULL,
	`detected_at` text NOT NULL,
	`canary_at` text,
	`activated_at` text,
	`revoked_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rtc_calculator_versions_app_db_idx` ON `rtc_calculator_versions` (`application_version`,`database_version`,`environment`);--> statement-breakpoint
CREATE INDEX `rtc_calculator_versions_status_updated_idx` ON `rtc_calculator_versions` (`status`,`updated_at`,`id`);
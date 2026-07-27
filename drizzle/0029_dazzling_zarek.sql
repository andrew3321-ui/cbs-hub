CREATE TABLE `fiscal_import_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` integer NOT NULL,
	`owner_user_id` integer NOT NULL,
	`uploaded_by_user_id` integer NOT NULL,
	`client_batch_key` text NOT NULL,
	`profile_version` text NOT NULL,
	`evidence_version` text NOT NULL,
	`status` text DEFAULT 'processing' NOT NULL,
	`total_files` integer NOT NULL,
	`processed_files` integer DEFAULT 0 NOT NULL,
	`accepted_files` integer DEFAULT 0 NOT NULL,
	`warning_files` integer DEFAULT 0 NOT NULL,
	`blocked_files` integer DEFAULT 0 NOT NULL,
	`total_bytes` integer NOT NULL,
	`raw_files_persisted` integer DEFAULT false NOT NULL,
	`evidence_hash` text,
	`started_at` text NOT NULL,
	`completed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fiscal_import_batches_workspace_key_profile_idx` ON `fiscal_import_batches` (`workspace_id`,`client_batch_key`,`profile_version`);--> statement-breakpoint
CREATE INDEX `fiscal_import_batches_workspace_status_updated_idx` ON `fiscal_import_batches` (`workspace_id`,`status`,`updated_at`,`id`);--> statement-breakpoint
CREATE INDEX `fiscal_import_batches_uploader_created_idx` ON `fiscal_import_batches` (`uploaded_by_user_id`,`created_at`,`id`);--> statement-breakpoint
CREATE TABLE `fiscal_import_items` (
	`id` text PRIMARY KEY NOT NULL,
	`batch_id` text NOT NULL,
	`workspace_id` integer NOT NULL,
	`ordinal` integer NOT NULL,
	`filename` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`source_hash` text NOT NULL,
	`document_type` text NOT NULL,
	`status` text NOT NULL,
	`profile_version` text NOT NULL,
	`evidence_version` text NOT NULL,
	`adapter_code` text,
	`adapter_version` text,
	`coverage_status` text NOT NULL,
	`municipality_code` text,
	`competence_start` text,
	`competence_end` text,
	`calculation_eligible` integer DEFAULT false NOT NULL,
	`raw_file_persisted` integer DEFAULT false NOT NULL,
	`summary_json` text DEFAULT '{}' NOT NULL,
	`issues_json` text DEFAULT '[]' NOT NULL,
	`calculation_blockers_json` text DEFAULT '[]' NOT NULL,
	`official_source_codes_json` text DEFAULT '[]' NOT NULL,
	`evidence_json` text DEFAULT '{}' NOT NULL,
	`evidence_hash` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fiscal_import_items_batch_ordinal_idx` ON `fiscal_import_items` (`batch_id`,`ordinal`);--> statement-breakpoint
CREATE INDEX `fiscal_import_items_workspace_hash_profile_idx` ON `fiscal_import_items` (`workspace_id`,`source_hash`,`profile_version`);--> statement-breakpoint
CREATE INDEX `fiscal_import_items_batch_status_idx` ON `fiscal_import_items` (`batch_id`,`status`,`ordinal`);
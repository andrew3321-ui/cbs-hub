CREATE TABLE `fiscal_dossier_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`dossier_id` text NOT NULL,
	`workspace_id` integer NOT NULL,
	`actor_user_id` integer NOT NULL,
	`event_type` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`event_data` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `fiscal_dossier_events_dossier_created_idx` ON `fiscal_dossier_events` (`dossier_id`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `fiscal_dossier_events_workspace_created_idx` ON `fiscal_dossier_events` (`workspace_id`,`created_at`,`id`);--> statement-breakpoint
CREATE TABLE `fiscal_dossiers` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` integer NOT NULL,
	`owner_user_id` integer NOT NULL,
	`company_id` integer,
	`created_by_user_id` integer NOT NULL,
	`assigned_reviewer_user_id` integer,
	`decision_by_user_id` integer,
	`title` text NOT NULL,
	`question` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`base_code` text NOT NULL,
	`base_version` text NOT NULL,
	`engine_version` text NOT NULL,
	`facts_json` text NOT NULL,
	`calculation_input_json` text NOT NULL,
	`snapshot_json` text NOT NULL,
	`input_hash` text NOT NULL,
	`professional_registration` text,
	`review_note` text DEFAULT '' NOT NULL,
	`due_at` text,
	`decided_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `fiscal_dossiers_workspace_status_created_idx` ON `fiscal_dossiers` (`workspace_id`,`status`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `fiscal_dossiers_reviewer_status_due_idx` ON `fiscal_dossiers` (`assigned_reviewer_user_id`,`status`,`due_at`,`id`);--> statement-breakpoint
CREATE INDEX `fiscal_dossiers_company_created_idx` ON `fiscal_dossiers` (`company_id`,`created_at`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `fiscal_dossiers_workspace_hash_idx` ON `fiscal_dossiers` (`workspace_id`,`input_hash`);
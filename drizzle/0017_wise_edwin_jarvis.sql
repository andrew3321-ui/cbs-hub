CREATE TABLE `fiscal_homologation_cases` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` integer NOT NULL,
	`owner_user_id` integer NOT NULL,
	`created_by_user_id` integer NOT NULL,
	`assigned_reviewer_user_id` integer,
	`decision_by_user_id` integer,
	`title` text NOT NULL,
	`question` text NOT NULL,
	`topic_code` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`assurance_level` text DEFAULT 'engine_verified' NOT NULL,
	`base_code` text NOT NULL,
	`base_version` text NOT NULL,
	`base_hash` text NOT NULL,
	`engine_version` text NOT NULL,
	`snapshot_json` text NOT NULL,
	`snapshot_hash` text NOT NULL,
	`expected_json` text DEFAULT '{}' NOT NULL,
	`comparison_outcome` text,
	`independent_conclusion` text DEFAULT '' NOT NULL,
	`professional_registration` text,
	`review_note` text DEFAULT '' NOT NULL,
	`due_at` text,
	`decided_at` text,
	`signature_version` text,
	`decision_signature` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fiscal_homologation_workspace_snapshot_idx` ON `fiscal_homologation_cases` (`workspace_id`,`snapshot_hash`);--> statement-breakpoint
CREATE INDEX `fiscal_homologation_workspace_status_created_idx` ON `fiscal_homologation_cases` (`workspace_id`,`status`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `fiscal_homologation_reviewer_status_due_idx` ON `fiscal_homologation_cases` (`assigned_reviewer_user_id`,`status`,`due_at`,`id`);--> statement-breakpoint
CREATE INDEX `fiscal_homologation_topic_status_idx` ON `fiscal_homologation_cases` (`topic_code`,`status`,`id`);--> statement-breakpoint
CREATE TABLE `fiscal_homologation_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`case_id` text NOT NULL,
	`workspace_id` integer NOT NULL,
	`actor_user_id` integer NOT NULL,
	`event_type` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`event_data` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `fiscal_homologation_events_case_created_idx` ON `fiscal_homologation_events` (`case_id`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `fiscal_homologation_events_workspace_created_idx` ON `fiscal_homologation_events` (`workspace_id`,`created_at`,`id`);
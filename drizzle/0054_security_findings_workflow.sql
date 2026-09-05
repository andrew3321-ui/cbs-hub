CREATE TABLE `security_findings` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` integer NOT NULL,
	`scope_id` text NOT NULL,
	`source_job_id` text NOT NULL,
	`evidence_code` text NOT NULL,
	`title` text NOT NULL,
	`severity` text NOT NULL CHECK (`severity` IN ('critical','high','medium','low')),
	`status` text DEFAULT 'open' NOT NULL CHECK (`status` IN ('open','investigating','mitigated','accepted_risk','false_positive')),
	`assigned_user_id` integer,
	`due_at` text,
	`resolution_summary` text DEFAULT '' NOT NULL,
	`occurrence_count` integer DEFAULT 1 NOT NULL CHECK (`occurrence_count` >= 1),
	`first_observed_at` text NOT NULL,
	`last_observed_at` text NOT NULL,
	`closed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `security_findings_scope_evidence_idx` ON `security_findings` (`scope_id`,`evidence_code`);
--> statement-breakpoint
CREATE INDEX `security_findings_workspace_status_idx` ON `security_findings` (`workspace_id`,`status`,`severity`,`updated_at`,`id`);
--> statement-breakpoint
CREATE INDEX `security_findings_scope_status_idx` ON `security_findings` (`scope_id`,`status`,`last_observed_at`,`id`);
--> statement-breakpoint
CREATE TABLE `security_finding_events` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` integer NOT NULL,
	`finding_id` text NOT NULL,
	`actor_user_id` integer,
	`event_type` text NOT NULL,
	`from_status` text,
	`to_status` text,
	`details_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `security_finding_events_finding_created_idx` ON `security_finding_events` (`finding_id`,`created_at`,`id`);
--> statement-breakpoint
CREATE INDEX `security_finding_events_workspace_created_idx` ON `security_finding_events` (`workspace_id`,`created_at`,`id`);
--> statement-breakpoint
ALTER TABLE `security_agent_jobs` ADD COLUMN `finding_sync_status` text DEFAULT 'pending' NOT NULL;
--> statement-breakpoint
ALTER TABLE `security_agent_jobs` ADD COLUMN `finding_sync_error` text;

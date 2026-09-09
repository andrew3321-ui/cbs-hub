ALTER TABLE `security_campaigns` ADD COLUMN `runner_result_json` text DEFAULT '{}' NOT NULL;
--> statement-breakpoint
ALTER TABLE `security_campaigns` ADD COLUMN `runner_error_code` text;
--> statement-breakpoint
ALTER TABLE `security_campaigns` ADD COLUMN `runner_completed_at` text;
--> statement-breakpoint
CREATE TABLE `security_runner_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`workspace_id` integer NOT NULL,
	`scope_domain` text NOT NULL,
	`manifest_json` text NOT NULL,
	`manifest_fingerprint` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL CHECK (`status` IN ('queued','running','completed','stopped','failed')),
	`attempt_count` integer DEFAULT 0 NOT NULL CHECK (`attempt_count` BETWEEN 0 AND 3),
	`request_count` integer DEFAULT 0 NOT NULL CHECK (`request_count` BETWEEN 0 AND 25),
	`error_count` integer DEFAULT 0 NOT NULL CHECK (`error_count` BETWEEN 0 AND 25),
	`result_json` text DEFAULT '{}' NOT NULL,
	`error_code` text,
	`lease_expires_at` text,
	`started_at` text,
	`completed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `security_runner_jobs_campaign_idx` ON `security_runner_jobs` (`campaign_id`);
--> statement-breakpoint
CREATE INDEX `security_runner_jobs_status_created_idx` ON `security_runner_jobs` (`status`,`created_at`,`id`);
--> statement-breakpoint
CREATE TABLE `security_runner_events` (
	`id` text PRIMARY KEY NOT NULL,
	`runner_job_id` text NOT NULL,
	`campaign_id` text NOT NULL,
	`event_type` text NOT NULL,
	`details_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `security_runner_events_job_created_idx` ON `security_runner_events` (`runner_job_id`,`created_at`,`id`);

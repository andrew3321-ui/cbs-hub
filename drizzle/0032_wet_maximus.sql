CREATE TABLE `fiscal_intelligence_metrics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workspace_id` integer NOT NULL,
	`actor_user_id` integer NOT NULL,
	`event_type` text NOT NULL,
	`outcome` text NOT NULL,
	`coverage_status` text NOT NULL,
	`topic_code` text,
	`base_version` text,
	`duration_ms` integer NOT NULL,
	`question_length_bucket` text NOT NULL,
	`fact_count` integer DEFAULT 0 NOT NULL,
	`source_count` integer DEFAULT 0 NOT NULL,
	`clarification_count` integer DEFAULT 0 NOT NULL,
	`error_code` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `fiscal_intelligence_metrics_workspace_created_idx` ON `fiscal_intelligence_metrics` (`workspace_id`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `fiscal_intelligence_metrics_workspace_coverage_idx` ON `fiscal_intelligence_metrics` (`workspace_id`,`coverage_status`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `fiscal_intelligence_metrics_outcome_created_idx` ON `fiscal_intelligence_metrics` (`outcome`,`created_at`,`id`);
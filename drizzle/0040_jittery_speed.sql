ALTER TABLE `normative_monitor_runs` ADD `attempt_count` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `normative_monitor_runs` ADD `last_attempt_at` text;--> statement-breakpoint
ALTER TABLE `normative_source_snapshots` ADD `failure_code` text;
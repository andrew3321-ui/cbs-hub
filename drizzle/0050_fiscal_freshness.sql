CREATE TABLE `fiscal_freshness_observations` (
	`id` text PRIMARY KEY NOT NULL,
	`day_key` text NOT NULL,
	`source_code` text NOT NULL,
	`criticality` text NOT NULL,
	`freshness_status` text NOT NULL,
	`coverage_effect` text NOT NULL,
	`sla_hours` integer NOT NULL,
	`age_minutes` integer,
	`deadline_at` text,
	`capture_status` text NOT NULL,
	`source_version` text NOT NULL,
	`source_url` text NOT NULL,
	`reason` text NOT NULL,
	`impacted_rule_codes_json` text DEFAULT '[]' NOT NULL,
	`fingerprint` text NOT NULL,
	`observed_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fiscal_freshness_observations_day_source_idx` ON `fiscal_freshness_observations` (`day_key`,`source_code`);
--> statement-breakpoint
CREATE INDEX `fiscal_freshness_observations_status_observed_idx` ON `fiscal_freshness_observations` (`freshness_status`,`observed_at`,`source_code`);
--> statement-breakpoint
CREATE TABLE `fiscal_alert_deliveries` (
	`id` text PRIMARY KEY NOT NULL,
	`alert_key` text NOT NULL,
	`source_code` text,
	`severity` text NOT NULL,
	`channel` text DEFAULT 'email' NOT NULL,
	`recipient` text NOT NULL,
	`subject` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`payload_hash` text NOT NULL,
	`attempt_count` integer DEFAULT 0 NOT NULL,
	`provider_ref` text,
	`error_code` text,
	`first_queued_at` text NOT NULL,
	`last_attempt_at` text,
	`sent_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fiscal_alert_deliveries_alert_key_idx` ON `fiscal_alert_deliveries` (`alert_key`);
--> statement-breakpoint
CREATE INDEX `fiscal_alert_deliveries_status_queued_idx` ON `fiscal_alert_deliveries` (`status`,`first_queued_at`,`id`);
--> statement-breakpoint
CREATE TABLE `fiscal_daily_summaries` (
	`id` text PRIMARY KEY NOT NULL,
	`day_key` text NOT NULL,
	`status` text NOT NULL,
	`metrics_json` text DEFAULT '{}' NOT NULL,
	`source_versions_hash` text NOT NULL,
	`generated_at` text NOT NULL,
	`email_status` text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fiscal_daily_summaries_day_idx` ON `fiscal_daily_summaries` (`day_key`);

CREATE TABLE `platform_metric_daily` (
	`metric_date` text PRIMARY KEY NOT NULL,
	`page_views` integer DEFAULT 0 NOT NULL,
	`visitors` integer DEFAULT 0 NOT NULL,
	`sessions` integer DEFAULT 0 NOT NULL,
	`signups` integer DEFAULT 0 NOT NULL,
	`active_users` integer DEFAULT 0 NOT NULL,
	`trials_started` integer DEFAULT 0 NOT NULL,
	`trials_denied` integer DEFAULT 0 NOT NULL,
	`payments_approved` integer DEFAULT 0 NOT NULL,
	`gross_amount_cents` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `platform_metric_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_type` text NOT NULL,
	`event_date` text NOT NULL,
	`occurred_at` text NOT NULL,
	`user_id` integer,
	`visitor_hash` text,
	`session_hash` text,
	`path_group` text DEFAULT 'other' NOT NULL,
	`source` text DEFAULT 'direct' NOT NULL,
	`medium` text DEFAULT 'none' NOT NULL,
	`campaign` text DEFAULT '' NOT NULL,
	`dedupe_key` text NOT NULL,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `platform_metric_events_dedupe_idx` ON `platform_metric_events` (`dedupe_key`);--> statement-breakpoint
CREATE INDEX `platform_metric_events_date_type_idx` ON `platform_metric_events` (`event_date`,`event_type`);--> statement-breakpoint
CREATE INDEX `platform_metric_events_user_date_idx` ON `platform_metric_events` (`user_id`,`event_date`,`event_type`);--> statement-breakpoint
CREATE INDEX `platform_metric_events_source_date_idx` ON `platform_metric_events` (`source`,`event_date`);
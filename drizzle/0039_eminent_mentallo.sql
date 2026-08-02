CREATE TABLE `search_console_index_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`snapshot_date` text NOT NULL,
	`page` text NOT NULL,
	`verdict` text DEFAULT 'VERDICT_UNSPECIFIED' NOT NULL,
	`coverage_state` text DEFAULT '' NOT NULL,
	`robots_txt_state` text DEFAULT 'ROBOTS_TXT_STATE_UNSPECIFIED' NOT NULL,
	`indexing_state` text DEFAULT 'INDEXING_STATE_UNSPECIFIED' NOT NULL,
	`page_fetch_state` text DEFAULT 'PAGE_FETCH_STATE_UNSPECIFIED' NOT NULL,
	`last_crawl_time` text,
	`google_canonical` text,
	`user_canonical` text,
	`crawled_as` text,
	`inspected_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `search_console_index_snapshots_date_page_idx` ON `search_console_index_snapshots` (`snapshot_date`,`page`);--> statement-breakpoint
CREATE INDEX `search_console_index_snapshots_page_date_idx` ON `search_console_index_snapshots` (`page`,`snapshot_date`);--> statement-breakpoint
CREATE INDEX `search_console_index_snapshots_verdict_date_idx` ON `search_console_index_snapshots` (`verdict`,`snapshot_date`);--> statement-breakpoint
CREATE TABLE `search_console_metrics` (
	`id` text PRIMARY KEY NOT NULL,
	`metric_date` text NOT NULL,
	`query` text DEFAULT '' NOT NULL,
	`page` text DEFAULT '' NOT NULL,
	`country` text DEFAULT '' NOT NULL,
	`device` text DEFAULT '' NOT NULL,
	`clicks` integer DEFAULT 0 NOT NULL,
	`impressions` integer DEFAULT 0 NOT NULL,
	`ctr_micros` integer DEFAULT 0 NOT NULL,
	`position_micros` integer DEFAULT 0 NOT NULL,
	`synced_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `search_console_metrics_date_idx` ON `search_console_metrics` (`metric_date`);--> statement-breakpoint
CREATE INDEX `search_console_metrics_page_date_idx` ON `search_console_metrics` (`page`,`metric_date`);--> statement-breakpoint
CREATE INDEX `search_console_metrics_query_date_idx` ON `search_console_metrics` (`query`,`metric_date`);--> statement-breakpoint
CREATE TABLE `search_console_sync_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`started_at` text NOT NULL,
	`completed_at` text,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`metric_rows` integer DEFAULT 0 NOT NULL,
	`inspected_pages` integer DEFAULT 0 NOT NULL,
	`error_code` text,
	`details_json` text DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `search_console_sync_runs_started_idx` ON `search_console_sync_runs` (`started_at`,`id`);--> statement-breakpoint
CREATE INDEX `search_console_sync_runs_status_started_idx` ON `search_console_sync_runs` (`status`,`started_at`);
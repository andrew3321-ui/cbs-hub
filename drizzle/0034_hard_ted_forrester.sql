ALTER TABLE `normative_source_snapshots` ADD `normalized_content_hash` text;--> statement-breakpoint
ALTER TABLE `normative_source_snapshots` ADD `final_url` text;--> statement-breakpoint
ALTER TABLE `normative_source_snapshots` ADD `access_path` text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `normative_source_snapshots` ADD `attempts` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `normative_source_snapshots` ADD `bytes_hashed` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `normative_source_snapshots` ADD `alternative_http_status` integer;--> statement-breakpoint
ALTER TABLE `normative_sources` ADD `criticality` text DEFAULT 'standard' NOT NULL;--> statement-breakpoint
ALTER TABLE `normative_sources` ADD `monitoring_frequency` text DEFAULT 'daily' NOT NULL;--> statement-breakpoint
ALTER TABLE `normative_sources` ADD `alternative_url` text;--> statement-breakpoint
ALTER TABLE `normative_sources` ADD `alternative_evidence_scope` text DEFAULT 'not_available' NOT NULL;
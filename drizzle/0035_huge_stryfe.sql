CREATE TABLE `normative_source_incidents` (
	`id` text PRIMARY KEY NOT NULL,
	`source_code` text NOT NULL,
	`snapshot_id` text NOT NULL,
	`connector_id` text NOT NULL,
	`incident_kind` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`details_json` text DEFAULT '{}' NOT NULL,
	`detected_at` text NOT NULL,
	`resolved_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `normative_source_incidents_snapshot_kind_idx` ON `normative_source_incidents` (`snapshot_id`,`incident_kind`);--> statement-breakpoint
CREATE INDEX `normative_source_incidents_source_status_idx` ON `normative_source_incidents` (`source_code`,`status`,`detected_at`,`id`);--> statement-breakpoint
ALTER TABLE `normative_source_snapshots` ADD `not_modified` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `normative_source_snapshots` ADD `connector_id` text;--> statement-breakpoint
ALTER TABLE `normative_source_snapshots` ADD `artifact_kind` text;--> statement-breakpoint
ALTER TABLE `normative_source_snapshots` ADD `parser_version` text;--> statement-breakpoint
ALTER TABLE `normative_source_snapshots` ADD `parse_status` text DEFAULT 'not_applicable' NOT NULL;--> statement-breakpoint
ALTER TABLE `normative_source_snapshots` ADD `detected_version` text;--> statement-breakpoint
ALTER TABLE `normative_source_snapshots` ADD `published_at` text;--> statement-breakpoint
ALTER TABLE `normative_source_snapshots` ADD `detected_effective_from` text;--> statement-breakpoint
ALTER TABLE `normative_source_snapshots` ADD `promotion_status` text DEFAULT 'not_applicable' NOT NULL;--> statement-breakpoint
ALTER TABLE `normative_source_snapshots` ADD `contract_errors_json` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `normative_sources` ADD `connector_id` text;--> statement-breakpoint
ALTER TABLE `normative_sources` ADD `connector_contract_version` text;
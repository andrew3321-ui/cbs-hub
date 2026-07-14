CREATE TABLE `audit_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_user_id` integer NOT NULL,
	`company_id` integer,
	`scenario_id` integer,
	`event_type` text NOT NULL,
	`event_data` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE `scenarios` ADD `target_year` integer DEFAULT 2027 NOT NULL;--> statement-breakpoint
ALTER TABLE `scenarios` ADD `rate_source` text DEFAULT 'legacy_unverified' NOT NULL;--> statement-breakpoint
ALTER TABLE `scenarios` ADD `source_note` text DEFAULT 'Registro anterior ao versionamento de premissas.' NOT NULL;--> statement-breakpoint
ALTER TABLE `scenarios` ADD `review_status` text DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE `scenarios` ADD `calculation_version` text DEFAULT 'legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE `scenarios` ADD `methodology_version` text DEFAULT 'legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE `scenarios` ADD `input_hash` text;--> statement-breakpoint
ALTER TABLE `scenarios` ADD `snapshot_json` text;--> statement-breakpoint
ALTER TABLE `scenarios` ADD `calculated_at` text;
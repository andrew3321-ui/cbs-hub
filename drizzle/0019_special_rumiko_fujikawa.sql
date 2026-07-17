CREATE TABLE `fiscal_expansion_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workspace_id` integer NOT NULL,
	`item_code` text NOT NULL,
	`actor_user_id` integer NOT NULL,
	`from_stage` text NOT NULL,
	`to_stage` text NOT NULL,
	`evidence_note` text NOT NULL,
	`evidence_reference` text,
	`evidence_hash` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `fiscal_expansion_events_workspace_created_idx` ON `fiscal_expansion_events` (`workspace_id`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `fiscal_expansion_events_item_created_idx` ON `fiscal_expansion_events` (`item_code`,`created_at`,`id`);--> statement-breakpoint
CREATE TABLE `fiscal_expansion_progress` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` integer NOT NULL,
	`item_code` text NOT NULL,
	`stage` text DEFAULT 'catalogued' NOT NULL,
	`evidence_note` text DEFAULT '' NOT NULL,
	`evidence_reference` text,
	`evidence_hash` text,
	`updated_by_user_id` integer NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fiscal_expansion_progress_workspace_item_idx` ON `fiscal_expansion_progress` (`workspace_id`,`item_code`);--> statement-breakpoint
CREATE INDEX `fiscal_expansion_progress_workspace_stage_idx` ON `fiscal_expansion_progress` (`workspace_id`,`stage`,`updated_at`);
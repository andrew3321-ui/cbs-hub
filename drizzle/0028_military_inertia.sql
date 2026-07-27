CREATE TABLE `workspace_onboarding_progress` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`onboarding_version` text NOT NULL,
	`workspace_type` text NOT NULL,
	`current_stage` integer DEFAULT 0 NOT NULL,
	`completed_item_ids_json` text DEFAULT '[]' NOT NULL,
	`dismissed_at` text,
	`completed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workspace_onboarding_user_version_idx` ON `workspace_onboarding_progress` (`workspace_id`,`user_id`,`onboarding_version`);--> statement-breakpoint
CREATE INDEX `workspace_onboarding_workspace_updated_idx` ON `workspace_onboarding_progress` (`workspace_id`,`updated_at`,`id`);--> statement-breakpoint
CREATE INDEX `workspace_onboarding_user_completed_idx` ON `workspace_onboarding_progress` (`user_id`,`completed_at`,`id`);
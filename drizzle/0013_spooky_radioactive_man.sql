CREATE TABLE `scenario_review_comments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`review_round_id` integer NOT NULL,
	`workspace_id` integer NOT NULL,
	`scenario_id` integer NOT NULL,
	`author_user_id` integer NOT NULL,
	`kind` text DEFAULT 'comment' NOT NULL,
	`body` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `scenario_review_comments_round_created_idx` ON `scenario_review_comments` (`review_round_id`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `scenario_review_comments_workspace_scenario_idx` ON `scenario_review_comments` (`workspace_id`,`scenario_id`,`id`);--> statement-breakpoint
CREATE TABLE `scenario_review_rounds` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workspace_id` integer NOT NULL,
	`scenario_id` integer NOT NULL,
	`company_id` integer NOT NULL,
	`owner_user_id` integer NOT NULL,
	`prepared_by_user_id` integer NOT NULL,
	`assigned_reviewer_user_id` integer,
	`requested_by_user_id` integer NOT NULL,
	`round_number` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`due_at` text,
	`decision_by_user_id` integer,
	`decision_note` text DEFAULT '' NOT NULL,
	`decided_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `scenario_review_rounds_scenario_idx` ON `scenario_review_rounds` (`scenario_id`);--> statement-breakpoint
CREATE INDEX `scenario_review_rounds_workspace_status_due_idx` ON `scenario_review_rounds` (`workspace_id`,`status`,`due_at`,`id`);--> statement-breakpoint
CREATE INDEX `scenario_review_rounds_reviewer_status_idx` ON `scenario_review_rounds` (`assigned_reviewer_user_id`,`status`,`id`);--> statement-breakpoint
CREATE INDEX `scenario_review_rounds_company_created_idx` ON `scenario_review_rounds` (`company_id`,`created_at`,`id`);--> statement-breakpoint
ALTER TABLE `scenarios` ADD `supersedes_scenario_id` integer;--> statement-breakpoint
CREATE UNIQUE INDEX `scenarios_supersedes_idx` ON `scenarios` (`supersedes_scenario_id`);
CREATE TABLE IF NOT EXISTS `fiscal_reference_cases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`rule_set_id` integer NOT NULL,
	`code` text NOT NULL,
	`title` text NOT NULL,
	`input_json` text NOT NULL,
	`expected_json` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `fiscal_reference_cases_rule_code_idx` ON `fiscal_reference_cases` (`rule_set_id`,`code`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `fiscal_reference_cases_rule_set_idx` ON `fiscal_reference_cases` (`rule_set_id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `fiscal_rule_sets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`version` text NOT NULL,
	`name` text NOT NULL,
	`jurisdiction` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`effective_from` text NOT NULL,
	`effective_to` text NOT NULL,
	`content_json` text NOT NULL,
	`content_hash` text NOT NULL,
	`source_count` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `fiscal_rule_sets_code_version_idx` ON `fiscal_rule_sets` (`code`,`version`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `fiscal_rule_sets_status_effective_idx` ON `fiscal_rule_sets` (`status`,`effective_from`,`effective_to`);

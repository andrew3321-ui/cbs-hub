CREATE TABLE `fiscal_knowledge_bases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`version` text NOT NULL,
	`name` text NOT NULL,
	`scope` text NOT NULL,
	`status` text DEFAULT 'pilot' NOT NULL,
	`content_json` text NOT NULL,
	`content_hash` text NOT NULL,
	`source_count` integer DEFAULT 0 NOT NULL,
	`checked_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fiscal_knowledge_bases_code_version_idx` ON `fiscal_knowledge_bases` (`code`,`version`);--> statement-breakpoint
CREATE INDEX `fiscal_knowledge_bases_status_checked_idx` ON `fiscal_knowledge_bases` (`status`,`checked_at`,`id`);
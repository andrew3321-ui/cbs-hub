CREATE TABLE `organic_authority_links` (
	`id` text PRIMARY KEY NOT NULL,
	`source_url` text NOT NULL,
	`source_domain` text NOT NULL,
	`target_path` text NOT NULL,
	`context` text NOT NULL,
	`acquisition_method` text NOT NULL,
	`status` text DEFAULT 'verified' NOT NULL,
	`first_seen_at` text NOT NULL,
	`last_verified_at` text NOT NULL,
	`result_note` text DEFAULT '' NOT NULL,
	`created_by_user_id` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `organic_authority_links_source_idx` ON `organic_authority_links` (`source_url`);
--> statement-breakpoint
CREATE INDEX `organic_authority_links_status_verified_idx` ON `organic_authority_links` (`status`,`last_verified_at`);
--> statement-breakpoint
CREATE INDEX `organic_authority_links_domain_idx` ON `organic_authority_links` (`source_domain`,`status`);
--> statement-breakpoint
CREATE TABLE `organic_outreach_cycles` (
	`id` text PRIMARY KEY NOT NULL,
	`cycle_month` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`outreach_count` integer DEFAULT 0 NOT NULL,
	`mentions_found` integer DEFAULT 0 NOT NULL,
	`verified_links` integer DEFAULT 0 NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_by_user_id` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `organic_outreach_cycles_month_idx` ON `organic_outreach_cycles` (`cycle_month`);
--> statement-breakpoint
CREATE INDEX `organic_outreach_cycles_status_month_idx` ON `organic_outreach_cycles` (`status`,`cycle_month`);

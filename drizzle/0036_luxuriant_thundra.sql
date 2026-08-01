CREATE TABLE `declarative_rule_events` (
	`id` text PRIMARY KEY NOT NULL,
	`rule_version_id` text NOT NULL,
	`event_type` text NOT NULL,
	`from_status` text,
	`to_status` text,
	`evidence_json` text DEFAULT '{}' NOT NULL,
	`actor_user_id` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `declarative_rule_events_version_created_idx` ON `declarative_rule_events` (`rule_version_id`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `declarative_rule_events_type_created_idx` ON `declarative_rule_events` (`event_type`,`created_at`,`id`);--> statement-breakpoint
CREATE TABLE `declarative_rule_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`rule_code` text NOT NULL,
	`version` text NOT NULL,
	`schema_version` text NOT NULL,
	`definition_json` text NOT NULL,
	`selector_key` text NOT NULL,
	`effective_from` text NOT NULL,
	`effective_to` text NOT NULL,
	`priority` integer DEFAULT 0 NOT NULL,
	`content_hash` text NOT NULL,
	`predecessor_hash` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`regression_fingerprint` text,
	`validated_at` text,
	`canary_at` text,
	`activated_at` text,
	`revoked_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `declarative_rule_versions_code_version_idx` ON `declarative_rule_versions` (`rule_code`,`version`);--> statement-breakpoint
CREATE UNIQUE INDEX `declarative_rule_versions_hash_idx` ON `declarative_rule_versions` (`content_hash`);--> statement-breakpoint
CREATE INDEX `declarative_rule_versions_selector_period_idx` ON `declarative_rule_versions` (`selector_key`,`effective_from`,`effective_to`,`priority`);--> statement-breakpoint
CREATE INDEX `declarative_rule_versions_status_updated_idx` ON `declarative_rule_versions` (`status`,`updated_at`);
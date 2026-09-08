CREATE TABLE `security_defense_posture_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` integer NOT NULL,
	`scope_id` text NOT NULL,
	`connector_id` text NOT NULL,
	`provider` text DEFAULT 'cloudflare' NOT NULL CHECK (`provider` IN ('cloudflare')),
	`score` integer NOT NULL CHECK (`score` BETWEEN 0 AND 100),
	`grade` text NOT NULL CHECK (`grade` IN ('strong','adequate','attention','critical')),
	`checks_json` text DEFAULT '[]' NOT NULL,
	`config_summary_json` text DEFAULT '{}' NOT NULL,
	`config_fingerprint` text NOT NULL,
	`observed_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `security_defense_posture_connector_fingerprint_idx` ON `security_defense_posture_snapshots` (`connector_id`,`config_fingerprint`);
--> statement-breakpoint
CREATE INDEX `security_defense_posture_scope_observed_idx` ON `security_defense_posture_snapshots` (`scope_id`,`observed_at`,`id`);
--> statement-breakpoint
CREATE TABLE `security_defense_change_proposals` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` integer NOT NULL,
	`scope_id` text NOT NULL,
	`connector_id` text NOT NULL,
	`category` text NOT NULL CHECK (`category` IN ('managed_rules','rate_limit','exception_review')),
	`status` text DEFAULT 'draft' NOT NULL CHECK (`status` IN ('draft','awaiting_approval','approved','applying','applied','failed','rolled_back','cancelled')),
	`risk` text NOT NULL CHECK (`risk` IN ('low','medium','high')),
	`title` text NOT NULL,
	`rationale` text NOT NULL,
	`preview_json` text DEFAULT '{}' NOT NULL,
	`rollback_json` text DEFAULT '{}' NOT NULL,
	`idempotency_key` text NOT NULL,
	`approved_by_user_id` integer,
	`approved_at` text,
	`applied_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `security_defense_proposals_connector_key_idx` ON `security_defense_change_proposals` (`connector_id`,`idempotency_key`);
--> statement-breakpoint
CREATE INDEX `security_defense_proposals_scope_status_idx` ON `security_defense_change_proposals` (`scope_id`,`status`,`risk`,`updated_at`,`id`);

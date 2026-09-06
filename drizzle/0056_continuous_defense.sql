ALTER TABLE `security_campaigns` ADD COLUMN `executor` text;
--> statement-breakpoint
ALTER TABLE `security_campaigns` ADD COLUMN `runner_job_id` text;
--> statement-breakpoint
CREATE UNIQUE INDEX `security_campaigns_runner_job_idx` ON `security_campaigns` (`runner_job_id`) WHERE `runner_job_id` IS NOT NULL;
--> statement-breakpoint
CREATE TABLE `security_defense_connectors` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` integer NOT NULL,
	`scope_id` text NOT NULL,
	`provider` text DEFAULT 'signed_webhook' NOT NULL CHECK (`provider` IN ('signed_webhook')),
	`mode` text DEFAULT 'observe' NOT NULL CHECK (`mode` IN ('observe','protect')),
	`enforcement` text DEFAULT 'observe_only' NOT NULL CHECK (`enforcement` IN ('observe_only','cbshub_edge')),
	`status` text DEFAULT 'active' NOT NULL CHECK (`status` IN ('active','paused','revoked','error')),
	`key_salt` text NOT NULL,
	`last_signal_at` text,
	`created_by_user_id` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `security_defense_connectors_scope_provider_idx` ON `security_defense_connectors` (`scope_id`,`provider`);
--> statement-breakpoint
CREATE INDEX `security_defense_connectors_workspace_status_idx` ON `security_defense_connectors` (`workspace_id`,`status`,`updated_at`,`id`);
--> statement-breakpoint
CREATE TABLE `security_defense_signals` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` integer NOT NULL,
	`scope_id` text NOT NULL,
	`connector_id` text NOT NULL,
	`external_event_id` text NOT NULL,
	`signal_type` text NOT NULL,
	`confidence` text NOT NULL CHECK (`confidence` IN ('low','medium','high')),
	`severity` text NOT NULL CHECK (`severity` IN ('critical','high','medium','low')),
	`occurrence_count` integer NOT NULL CHECK (`occurrence_count` BETWEEN 1 AND 1000000),
	`window_seconds` integer NOT NULL CHECK (`window_seconds` BETWEEN 1 AND 3600),
	`source_hash` text,
	`resource` text NOT NULL,
	`summary` text NOT NULL,
	`attributes_json` text DEFAULT '{}' NOT NULL,
	`decision_json` text NOT NULL,
	`policy_version` text NOT NULL,
	`occurred_at` text NOT NULL,
	`received_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `security_defense_signals_connector_event_idx` ON `security_defense_signals` (`connector_id`,`external_event_id`);
--> statement-breakpoint
CREATE INDEX `security_defense_signals_scope_occurred_idx` ON `security_defense_signals` (`scope_id`,`occurred_at`,`id`);
--> statement-breakpoint
CREATE TABLE `security_defense_incidents` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` integer NOT NULL,
	`scope_id` text NOT NULL,
	`correlation_key` text NOT NULL,
	`category` text NOT NULL,
	`severity` text NOT NULL CHECK (`severity` IN ('critical','high','medium','low')),
	`status` text DEFAULT 'open' NOT NULL CHECK (`status` IN ('open','investigating','contained','resolved')),
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`occurrence_count` integer DEFAULT 1 NOT NULL CHECK (`occurrence_count` >= 1),
	`auto_contained` integer DEFAULT 0 NOT NULL,
	`first_observed_at` text NOT NULL,
	`last_observed_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `security_defense_incidents_scope_correlation_idx` ON `security_defense_incidents` (`scope_id`,`correlation_key`);
--> statement-breakpoint
CREATE INDEX `security_defense_incidents_workspace_status_idx` ON `security_defense_incidents` (`workspace_id`,`status`,`severity`,`last_observed_at`,`id`);
--> statement-breakpoint
CREATE TABLE `security_response_actions` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` integer NOT NULL,
	`scope_id` text NOT NULL,
	`incident_id` text NOT NULL,
	`action_type` text NOT NULL CHECK (`action_type` IN ('temporary_source_block','investigate')),
	`autonomy` text NOT NULL CHECK (`autonomy` IN ('automatic_reversible','human_approval')),
	`status` text NOT NULL CHECK (`status` IN ('pending','active','expired','revoked','failed')),
	`target_hash` text,
	`reason` text NOT NULL,
	`enforcement` text NOT NULL CHECK (`enforcement` IN ('observe_only','cbshub_edge')),
	`expires_at` text,
	`decided_by_user_id` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `security_response_actions_scope_status_idx` ON `security_response_actions` (`scope_id`,`status`,`expires_at`,`id`);
--> statement-breakpoint
CREATE INDEX `security_response_actions_target_active_idx` ON `security_response_actions` (`target_hash`,`status`,`expires_at`,`id`);
--> statement-breakpoint
CREATE TABLE `security_defense_events` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` integer NOT NULL,
	`scope_id` text NOT NULL,
	`incident_id` text,
	`action_id` text,
	`actor_user_id` integer,
	`event_type` text NOT NULL,
	`details_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `security_defense_events_scope_created_idx` ON `security_defense_events` (`scope_id`,`created_at`,`id`);
--> statement-breakpoint
CREATE INDEX `security_defense_events_incident_created_idx` ON `security_defense_events` (`incident_id`,`created_at`,`id`);

CREATE TABLE `security_agent_scopes` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` integer NOT NULL,
	`domain` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`verification_token` text NOT NULL,
	`created_by_user_id` integer NOT NULL,
	`verified_at` text,
	`monitoring_enabled` integer DEFAULT 0 NOT NULL,
	`next_scan_at` text,
	`last_scan_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `security_agent_scopes_active_domain_idx` ON `security_agent_scopes` (`workspace_id`,`domain`) WHERE `status` <> 'revoked';
--> statement-breakpoint
CREATE INDEX `security_agent_scopes_monitoring_due_idx` ON `security_agent_scopes` (`monitoring_enabled`,`status`,`next_scan_at`,`id`);
--> statement-breakpoint
CREATE TABLE `security_agent_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` integer NOT NULL,
	`scope_id` text NOT NULL,
	`trigger_kind` text NOT NULL,
	`scan_mode` text DEFAULT 'passive' NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`evidence_json` text DEFAULT '{}' NOT NULL,
	`assessment_json` text DEFAULT '{}' NOT NULL,
	`provider` text,
	`model` text,
	`provider_response_id` text,
	`error_code` text,
	`started_at` text NOT NULL,
	`completed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `security_agent_jobs_workspace_started_idx` ON `security_agent_jobs` (`workspace_id`,`started_at`,`id`);
--> statement-breakpoint
CREATE INDEX `security_agent_jobs_scope_started_idx` ON `security_agent_jobs` (`scope_id`,`started_at`,`id`);
--> statement-breakpoint
CREATE TABLE `security_agent_events` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` integer NOT NULL,
	`scope_id` text NOT NULL,
	`actor_user_id` integer,
	`event_type` text NOT NULL,
	`details_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `security_agent_events_scope_created_idx` ON `security_agent_events` (`scope_id`,`created_at`,`id`);
--> statement-breakpoint
CREATE INDEX `security_agent_events_workspace_created_idx` ON `security_agent_events` (`workspace_id`,`created_at`,`id`);

CREATE TABLE `security_campaigns` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` integer NOT NULL,
	`scope_id` text NOT NULL,
	`created_by_user_id` integer,
	`name` text NOT NULL,
	`environment` text NOT NULL CHECK (`environment` IN ('lab','staging','production')),
	`techniques_json` text NOT NULL,
	`policy_version` text NOT NULL,
	`window_start` text NOT NULL,
	`window_end` text NOT NULL,
	`max_requests_per_minute` integer NOT NULL CHECK (`max_requests_per_minute` BETWEEN 1 AND 60),
	`max_total_requests` integer NOT NULL CHECK (`max_total_requests` BETWEEN 1 AND 2000),
	`stop_conditions_json` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL CHECK (`status` IN ('draft','approved','queued','running','review','completed','cancelled','failed')),
	`readiness_json` text DEFAULT '{}' NOT NULL,
	`agent_job_id` text,
	`approved_by_user_id` integer,
	`approved_at` text,
	`cancelled_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `security_campaigns_workspace_status_idx` ON `security_campaigns` (`workspace_id`,`status`,`window_start`,`id`);
--> statement-breakpoint
CREATE INDEX `security_campaigns_scope_created_idx` ON `security_campaigns` (`scope_id`,`created_at`,`id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `security_campaigns_agent_job_idx` ON `security_campaigns` (`agent_job_id`) WHERE `agent_job_id` IS NOT NULL;
--> statement-breakpoint
CREATE TABLE `security_campaign_events` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` integer NOT NULL,
	`campaign_id` text NOT NULL,
	`actor_user_id` integer,
	`event_type` text NOT NULL,
	`details_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `security_campaign_events_campaign_created_idx` ON `security_campaign_events` (`campaign_id`,`created_at`,`id`);
--> statement-breakpoint
CREATE TABLE `security_remediation_proposals` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` integer NOT NULL,
	`scope_id` text NOT NULL,
	`finding_id` text NOT NULL,
	`created_by_user_id` integer,
	`provider` text NOT NULL CHECK (`provider` IN ('github')),
	`repository_full_name` text NOT NULL,
	`base_branch` text NOT NULL,
	`strategy` text DEFAULT 'pull_request_only' NOT NULL CHECK (`strategy` = 'pull_request_only'),
	`status` text DEFAULT 'draft' NOT NULL CHECK (`status` IN ('draft','approved','applying','pr_opened','merged','rejected','failed')),
	`approved_by_user_id` integer,
	`approved_at` text,
	`external_pr_url` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `security_remediation_active_finding_idx` ON `security_remediation_proposals` (`finding_id`) WHERE `status` NOT IN ('merged','rejected','failed');
--> statement-breakpoint
CREATE INDEX `security_remediation_workspace_status_idx` ON `security_remediation_proposals` (`workspace_id`,`status`,`updated_at`,`id`);
--> statement-breakpoint
CREATE TABLE `security_remediation_events` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` integer NOT NULL,
	`remediation_id` text NOT NULL,
	`actor_user_id` integer,
	`event_type` text NOT NULL,
	`details_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `security_remediation_events_proposal_created_idx` ON `security_remediation_events` (`remediation_id`,`created_at`,`id`);

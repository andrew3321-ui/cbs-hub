CREATE TABLE `fiscal_impact_edges` (
	`id` text PRIMARY KEY NOT NULL,
	`impact_run_id` text NOT NULL,
	`edge_key` text NOT NULL,
	`from_node_key` text NOT NULL,
	`to_node_key` text NOT NULL,
	`relation` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fiscal_impact_edges_run_key_idx` ON `fiscal_impact_edges` (`impact_run_id`,`edge_key`);--> statement-breakpoint
CREATE INDEX `fiscal_impact_edges_from_idx` ON `fiscal_impact_edges` (`impact_run_id`,`from_node_key`);--> statement-breakpoint
CREATE INDEX `fiscal_impact_edges_to_idx` ON `fiscal_impact_edges` (`impact_run_id`,`to_node_key`);--> statement-breakpoint
CREATE TABLE `fiscal_impact_nodes` (
	`id` text PRIMARY KEY NOT NULL,
	`impact_run_id` text NOT NULL,
	`node_key` text NOT NULL,
	`node_type` text NOT NULL,
	`external_id` text NOT NULL,
	`workspace_id` integer,
	`company_id` integer,
	`competence` text,
	`immutable_snapshot` integer DEFAULT false NOT NULL,
	`content_hash` text,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fiscal_impact_nodes_run_key_idx` ON `fiscal_impact_nodes` (`impact_run_id`,`node_key`);--> statement-breakpoint
CREATE INDEX `fiscal_impact_nodes_workspace_company_idx` ON `fiscal_impact_nodes` (`workspace_id`,`company_id`,`competence`);--> statement-breakpoint
CREATE INDEX `fiscal_impact_nodes_type_external_idx` ON `fiscal_impact_nodes` (`node_type`,`external_id`);--> statement-breakpoint
CREATE TABLE `fiscal_impact_run_events` (
	`id` text PRIMARY KEY NOT NULL,
	`impact_run_id` text NOT NULL,
	`event_type` text NOT NULL,
	`event_data_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `fiscal_impact_run_events_run_created_idx` ON `fiscal_impact_run_events` (`impact_run_id`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `fiscal_impact_run_events_type_created_idx` ON `fiscal_impact_run_events` (`event_type`,`created_at`,`id`);--> statement-breakpoint
CREATE TABLE `fiscal_impact_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`change_event_id` text NOT NULL,
	`source_code` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`impacted_rule_codes_json` text DEFAULT '[]' NOT NULL,
	`regression_fingerprint` text,
	`affected_companies` integer DEFAULT 0 NOT NULL,
	`affected_competences` integer DEFAULT 0 NOT NULL,
	`affected_artifacts` integer DEFAULT 0 NOT NULL,
	`blocked_artifacts` integer DEFAULT 0 NOT NULL,
	`historical_notices` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`finished_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fiscal_impact_runs_change_event_idx` ON `fiscal_impact_runs` (`change_event_id`);--> statement-breakpoint
CREATE INDEX `fiscal_impact_runs_status_created_idx` ON `fiscal_impact_runs` (`status`,`created_at`,`id`);--> statement-breakpoint
CREATE TABLE `fiscal_reexecution_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`impact_run_id` text NOT NULL,
	`artifact_type` text NOT NULL,
	`artifact_id` text NOT NULL,
	`workspace_id` integer NOT NULL,
	`company_id` integer,
	`competence` text,
	`disposition` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`idempotency_key` text NOT NULL,
	`before_content_hash` text NOT NULL,
	`after_content_hash` text,
	`before_rule_version` text NOT NULL,
	`after_rule_version` text,
	`diff_json` text DEFAULT '{}' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`lock_token` text,
	`locked_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`finished_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fiscal_reexecution_jobs_idempotency_idx` ON `fiscal_reexecution_jobs` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `fiscal_reexecution_jobs_run_status_idx` ON `fiscal_reexecution_jobs` (`impact_run_id`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `fiscal_reexecution_jobs_workspace_company_idx` ON `fiscal_reexecution_jobs` (`workspace_id`,`company_id`,`competence`);
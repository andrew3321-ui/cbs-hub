CREATE TABLE `coverage_demand_signals` (
	`id` text PRIMARY KEY NOT NULL,
	`month_key` text NOT NULL,
	`dimension_type` text NOT NULL,
	`dimension_key` text NOT NULL,
	`tax_scope` text NOT NULL,
	`occurrence_count` integer DEFAULT 0 NOT NULL,
	`supported_count` integer DEFAULT 0 NOT NULL,
	`partial_count` integer DEFAULT 0 NOT NULL,
	`blocked_count` integer DEFAULT 0 NOT NULL,
	`first_seen_at` text NOT NULL,
	`last_seen_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `coverage_demand_signals_month_dimension_idx` ON `coverage_demand_signals` (`month_key`,`dimension_type`,`dimension_key`,`tax_scope`);
--> statement-breakpoint
CREATE INDEX `coverage_demand_signals_month_scope_idx` ON `coverage_demand_signals` (`month_key`,`tax_scope`,`occurrence_count`);
--> statement-breakpoint
CREATE TABLE `coverage_demand_claims` (
	`id` text PRIMARY KEY NOT NULL,
	`signal_id` text NOT NULL,
	`month_key` text NOT NULL,
	`workspace_hash` text NOT NULL,
	`revenue_cents` integer DEFAULT 0 NOT NULL,
	`hit_count` integer DEFAULT 1 NOT NULL,
	`first_seen_at` text NOT NULL,
	`last_seen_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `coverage_demand_claims_signal_workspace_idx` ON `coverage_demand_claims` (`signal_id`,`workspace_hash`);
--> statement-breakpoint
CREATE INDEX `coverage_demand_claims_month_signal_idx` ON `coverage_demand_claims` (`month_key`,`signal_id`);
--> statement-breakpoint
CREATE TABLE `coverage_monthly_backlog` (
	`id` text PRIMARY KEY NOT NULL,
	`month_key` text NOT NULL,
	`item_code` text NOT NULL,
	`dimension_type` text NOT NULL,
	`dimension_key` text NOT NULL,
	`tax_scope` text NOT NULL,
	`priority_score` integer NOT NULL,
	`frequency_count` integer DEFAULT 0 NOT NULL,
	`workspace_count` integer DEFAULT 0 NOT NULL,
	`revenue_cents` integer DEFAULT 0 NOT NULL,
	`blocked_count` integer DEFAULT 0 NOT NULL,
	`partial_count` integer DEFAULT 0 NOT NULL,
	`supported_count` integer DEFAULT 0 NOT NULL,
	`risk_score` integer NOT NULL,
	`source_health_bps` integer NOT NULL,
	`current_coverage_bps` integer NOT NULL,
	`projected_gain_bps` integer DEFAULT 0 NOT NULL,
	`verified_gain_bps` integer DEFAULT 0 NOT NULL,
	`expected_case_count` integer DEFAULT 0 NOT NULL,
	`source_codes_json` text DEFAULT '[]' NOT NULL,
	`rule_codes_json` text DEFAULT '[]' NOT NULL,
	`test_codes_json` text DEFAULT '[]' NOT NULL,
	`implementation_ref` text DEFAULT '' NOT NULL,
	`justification_json` text DEFAULT '[]' NOT NULL,
	`fingerprint` text NOT NULL,
	`status` text DEFAULT 'planned' NOT NULL,
	`refreshed_at` text NOT NULL,
	`verified_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `coverage_monthly_backlog_month_item_idx` ON `coverage_monthly_backlog` (`month_key`,`item_code`);
--> statement-breakpoint
CREATE INDEX `coverage_monthly_backlog_month_priority_idx` ON `coverage_monthly_backlog` (`month_key`,`priority_score`,`item_code`);
--> statement-breakpoint
CREATE TABLE `coverage_expansion_goals` (
	`id` text PRIMARY KEY NOT NULL,
	`month_key` text NOT NULL,
	`tax_scope` text NOT NULL,
	`target_gain_bps` integer NOT NULL,
	`starting_coverage_bps` integer NOT NULL,
	`projected_gain_bps` integer DEFAULT 0 NOT NULL,
	`verified_gain_bps` integer DEFAULT 0 NOT NULL,
	`backlog_count` integer DEFAULT 0 NOT NULL,
	`fingerprint` text NOT NULL,
	`refreshed_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `coverage_expansion_goals_month_scope_idx` ON `coverage_expansion_goals` (`month_key`,`tax_scope`);

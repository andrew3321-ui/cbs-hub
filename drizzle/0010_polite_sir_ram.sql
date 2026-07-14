CREATE TABLE IF NOT EXISTS `tax_ledger_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`period_id` integer NOT NULL,
	`owner_user_id` integer NOT NULL,
	`source_key` text NOT NULL,
	`tax` text NOT NULL,
	`entry_kind` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`source_type` text NOT NULL,
	`source_document_key` text,
	`credit_status` text DEFAULT 'not_applicable' NOT NULL,
	`evidence_status` text DEFAULT 'pending' NOT NULL,
	`classification_status` text DEFAULT 'pending' NOT NULL,
	`classification_json` text DEFAULT '{}' NOT NULL,
	`occurred_at` text NOT NULL,
	`extinguishment_method` text,
	`reversal_of_entry_id` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `tax_ledger_entries_period_source_idx` ON `tax_ledger_entries` (`period_id`,`source_key`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `tax_ledger_entries_period_tax_date_idx` ON `tax_ledger_entries` (`period_id`,`tax`,`occurred_at`,`id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `tax_ledger_entries_owner_period_idx` ON `tax_ledger_entries` (`owner_user_id`,`period_id`,`id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `tax_period_closures` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`period_id` integer NOT NULL,
	`owner_user_id` integer NOT NULL,
	`revision` integer NOT NULL,
	`status` text DEFAULT 'ready_for_review' NOT NULL,
	`rule_set_id` integer,
	`calculation_version` text NOT NULL,
	`snapshot_json` text NOT NULL,
	`input_hash` text NOT NULL,
	`signature_version` text NOT NULL,
	`record_signature` text NOT NULL,
	`reviewer_reference` text,
	`reviewed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `tax_period_closures_period_revision_idx` ON `tax_period_closures` (`period_id`,`revision`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `tax_period_closures_owner_status_idx` ON `tax_period_closures` (`owner_user_id`,`status`,`id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `tax_periods` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_user_id` integer NOT NULL,
	`company_id` integer NOT NULL,
	`period_key` text NOT NULL,
	`tax_regime` text NOT NULL,
	`legal_effect` text DEFAULT 'simulation_2026' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`active_revision` integer DEFAULT 1 NOT NULL,
	`rule_set_id` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `tax_periods_owner_company_period_idx` ON `tax_periods` (`owner_user_id`,`company_id`,`period_key`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `tax_periods_owner_status_period_idx` ON `tax_periods` (`owner_user_id`,`status`,`period_key`,`id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `tax_reconciliation_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`period_id` integer NOT NULL,
	`owner_user_id` integer NOT NULL,
	`source_type` text NOT NULL,
	`tax` text NOT NULL,
	`debits_cents` integer NOT NULL,
	`credits_cents` integer NOT NULL,
	`extinguishments_cents` integer NOT NULL,
	`evidence_hash` text NOT NULL,
	`captured_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `tax_reconciliation_period_source_tax_capture_idx` ON `tax_reconciliation_snapshots` (`period_id`,`source_type`,`tax`,`captured_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `tax_reconciliation_owner_period_idx` ON `tax_reconciliation_snapshots` (`owner_user_id`,`period_id`,`id`);

CREATE TABLE IF NOT EXISTS `scenario_approvals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`scenario_id` integer NOT NULL,
	`company_id` integer NOT NULL,
	`owner_user_id` integer NOT NULL,
	`reviewer_user_id` integer NOT NULL,
	`reviewer_name` text NOT NULL,
	`reviewer_email` text NOT NULL,
	`professional_registration` text NOT NULL,
	`assurance_level` text DEFAULT 'responsible_self_review' NOT NULL,
	`credential_verification` text DEFAULT 'self_declared' NOT NULL,
	`decision` text DEFAULT 'approved' NOT NULL,
	`declaration_version` text NOT NULL,
	`scenario_input_hash` text NOT NULL,
	`scenario_record_signature` text NOT NULL,
	`decision_note` text DEFAULT '' NOT NULL,
	`signature_version` text NOT NULL,
	`approval_signature` text NOT NULL,
	`decided_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `scenario_approvals_scenario_idx` ON `scenario_approvals` (`scenario_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `scenario_approvals_owner_company_decided_idx` ON `scenario_approvals` (`owner_user_id`,`company_id`,`decided_at`,`id`);

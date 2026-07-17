CREATE TABLE `fiscal_rule_approvals` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` integer NOT NULL,
	`rule_code` text NOT NULL,
	`rule_version` text NOT NULL,
	`rule_hash` text NOT NULL,
	`approved_by_user_id` integer NOT NULL,
	`reviewer_name` text NOT NULL,
	`professional_role` text NOT NULL,
	`professional_registration` text NOT NULL,
	`decision` text DEFAULT 'approved' NOT NULL,
	`declaration_version` text NOT NULL,
	`decision_signature` text NOT NULL,
	`decided_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fiscal_rule_approvals_workspace_rule_hash_idx` ON `fiscal_rule_approvals` (`workspace_id`,`rule_code`,`rule_version`,`rule_hash`);--> statement-breakpoint
CREATE INDEX `fiscal_rule_approvals_workspace_decided_idx` ON `fiscal_rule_approvals` (`workspace_id`,`decided_at`,`id`);
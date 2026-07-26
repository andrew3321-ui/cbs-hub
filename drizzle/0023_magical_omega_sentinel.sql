ALTER TABLE `billing_accounts` ADD `company_addon_blocks` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `billing_accounts` ADD `pending_company_addon_blocks` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE `users` SET `suggested_plan_key` = 'unico';--> statement-breakpoint
UPDATE `accounting_workspaces` SET `suggested_plan_key` = 'unico';

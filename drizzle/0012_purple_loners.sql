CREATE TABLE `accounting_workspaces` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`workspace_type` text DEFAULT 'individual' NOT NULL,
	`owner_user_id` integer NOT NULL,
	`suggested_plan_key` text DEFAULT 'pro' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `accounting_workspaces_owner_idx` ON `accounting_workspaces` (`owner_user_id`);--> statement-breakpoint
CREATE TABLE `workspace_invitations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workspace_id` integer NOT NULL,
	`email` text NOT NULL,
	`role` text DEFAULT 'reviewer' NOT NULL,
	`token_hash` text NOT NULL,
	`invited_by_user_id` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`expires_at` text NOT NULL,
	`accepted_by_user_id` integer,
	`accepted_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workspace_invitations_token_idx` ON `workspace_invitations` (`token_hash`);--> statement-breakpoint
CREATE INDEX `workspace_invitations_workspace_status_idx` ON `workspace_invitations` (`workspace_id`,`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `workspace_members` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workspace_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`role` text DEFAULT 'preparer' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`joined_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workspace_members_user_idx` ON `workspace_members` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `workspace_members_workspace_user_idx` ON `workspace_members` (`workspace_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `workspace_members_workspace_status_idx` ON `workspace_members` (`workspace_id`,`status`,`id`);--> statement-breakpoint
ALTER TABLE `companies` ADD `workspace_id` integer;--> statement-breakpoint
CREATE INDEX `companies_workspace_name_idx` ON `companies` (`workspace_id`,`name`);--> statement-breakpoint
ALTER TABLE `scenarios` ADD `prepared_by_user_id` integer;--> statement-breakpoint
CREATE INDEX `scenarios_prepared_by_idx` ON `scenarios` (`prepared_by_user_id`,`created_at`,`id`);--> statement-breakpoint
ALTER TABLE `users` ADD `account_type` text DEFAULT 'individual' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `suggested_plan_key` text DEFAULT 'pro' NOT NULL;--> statement-breakpoint
INSERT INTO `accounting_workspaces` (`name`, `workspace_type`, `owner_user_id`, `suggested_plan_key`)
SELECT 'Espaço profissional de ' || `users`.`name`, 'individual', `users`.`id`, 'pro'
FROM `users`
WHERE NOT EXISTS (SELECT 1 FROM `accounting_workspaces` WHERE `accounting_workspaces`.`owner_user_id` = `users`.`id`);--> statement-breakpoint
INSERT OR IGNORE INTO `workspace_members` (`workspace_id`, `user_id`, `role`, `status`)
SELECT `id`, `owner_user_id`, 'owner', 'active' FROM `accounting_workspaces`;--> statement-breakpoint
UPDATE `companies`
SET `workspace_id` = (
	SELECT `workspace_members`.`workspace_id` FROM `workspace_members`
	WHERE `workspace_members`.`user_id` = `companies`.`owner_user_id`
	LIMIT 1
)
WHERE `workspace_id` IS NULL AND `owner_user_id` IS NOT NULL;--> statement-breakpoint
UPDATE `scenarios`
SET `prepared_by_user_id` = (
	SELECT `companies`.`owner_user_id` FROM `companies` WHERE `companies`.`id` = `scenarios`.`company_id`
)
WHERE `prepared_by_user_id` IS NULL;

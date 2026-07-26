CREATE TABLE `fiscal_dossier_shares` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`token` text NOT NULL,
	`dossier_id` text NOT NULL,
	`workspace_id` integer NOT NULL,
	`owner_user_id` integer NOT NULL,
	`company_id` integer,
	`created_by_user_id` integer NOT NULL,
	`note` text,
	`expires_at` text NOT NULL,
	`revoked_at` text,
	`views` integer DEFAULT 0 NOT NULL,
	`last_viewed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fiscal_dossier_shares_token_unique` ON `fiscal_dossier_shares` (`token`);--> statement-breakpoint
CREATE INDEX `fiscal_dossier_shares_workspace_created_idx` ON `fiscal_dossier_shares` (`workspace_id`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `fiscal_dossier_shares_dossier_created_idx` ON `fiscal_dossier_shares` (`dossier_id`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `fiscal_dossier_shares_owner_created_idx` ON `fiscal_dossier_shares` (`owner_user_id`,`created_at`,`id`);
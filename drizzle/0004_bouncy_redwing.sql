CREATE TABLE `report_shares` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`token` text NOT NULL,
	`scenario_id` integer NOT NULL,
	`company_id` integer NOT NULL,
	`owner_user_id` integer NOT NULL,
	`note` text,
	`expires_at` text NOT NULL,
	`revoked_at` text,
	`views` integer DEFAULT 0 NOT NULL,
	`last_viewed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `report_shares_token_unique` ON `report_shares` (`token`);
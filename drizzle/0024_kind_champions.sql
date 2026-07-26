CREATE TABLE `trial_device_claims` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`workspace_id` integer,
	`device_hash` text NOT NULL,
	`fingerprint_hash` text NOT NULL,
	`email_hash` text NOT NULL,
	`network_hash` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`started_at` text NOT NULL,
	`ends_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `trial_device_claims_user_id_unique` ON `trial_device_claims` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `trial_device_claims_workspace_id_unique` ON `trial_device_claims` (`workspace_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `trial_device_claims_device_hash_unique` ON `trial_device_claims` (`device_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `trial_device_claims_fingerprint_hash_unique` ON `trial_device_claims` (`fingerprint_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `trial_device_claims_email_hash_unique` ON `trial_device_claims` (`email_hash`);--> statement-breakpoint
CREATE INDEX `trial_device_claims_network_created_idx` ON `trial_device_claims` (`network_hash`,`created_at`);--> statement-breakpoint
CREATE INDEX `trial_device_claims_status_ends_idx` ON `trial_device_claims` (`status`,`ends_at`);
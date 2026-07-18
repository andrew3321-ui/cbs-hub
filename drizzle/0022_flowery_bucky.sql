CREATE TABLE `platform_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`updated_by_user_id` integer,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
INSERT INTO `platform_settings` (`key`, `value`, `revision`) VALUES ('beta_enabled', 'true', 1);
--> statement-breakpoint
CREATE TABLE `security_rate_limits` (
	`bucket_key` text PRIMARY KEY NOT NULL,
	`window_started_at` integer NOT NULL,
	`request_count` integer DEFAULT 0 NOT NULL,
	`blocked_until` integer,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `security_rate_limits_updated_idx` ON `security_rate_limits` (`updated_at`);--> statement-breakpoint
ALTER TABLE `users` ADD `password_iterations` integer DEFAULT 100000 NOT NULL;

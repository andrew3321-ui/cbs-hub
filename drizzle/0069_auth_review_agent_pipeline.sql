ALTER TABLE `security_auth_reviews` ADD COLUMN `retest_of_id` text;
--> statement-breakpoint
ALTER TABLE `security_auth_reviews` ADD COLUMN `marker_sha256` text;
--> statement-breakpoint
ALTER TABLE `security_auth_reviews` ADD COLUMN `retest_outcome` text;
--> statement-breakpoint
ALTER TABLE `security_auth_reviews` ADD COLUMN `analysis_status` text DEFAULT 'pending' NOT NULL;
--> statement-breakpoint
ALTER TABLE `security_auth_reviews` ADD COLUMN `analysis_dispatched_at` text;
--> statement-breakpoint
ALTER TABLE `security_auth_reviews` ADD COLUMN `analysis_lease_expires_at` text;
--> statement-breakpoint
ALTER TABLE `security_auth_reviews` ADD COLUMN `analysis_attempt_count` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `security_auth_reviews` ADD COLUMN `analysis_json` text DEFAULT '{}' NOT NULL;
--> statement-breakpoint
ALTER TABLE `security_auth_reviews` ADD COLUMN `analysis_error_code` text;
--> statement-breakpoint
CREATE INDEX `security_auth_reviews_retest_idx` ON `security_auth_reviews` (`retest_of_id`);

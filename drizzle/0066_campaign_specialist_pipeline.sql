ALTER TABLE `security_campaigns` ADD COLUMN `specialist_status` text DEFAULT 'not_requested' NOT NULL;
--> statement-breakpoint
ALTER TABLE `security_campaigns` ADD COLUMN `specialist_result_json` text DEFAULT '{}' NOT NULL;
--> statement-breakpoint
ALTER TABLE `security_campaigns` ADD COLUMN `specialist_error_code` text;
--> statement-breakpoint
ALTER TABLE `security_campaigns` ADD COLUMN `specialist_attempt_count` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `security_campaigns` ADD COLUMN `specialist_lease_expires_at` text;
--> statement-breakpoint
ALTER TABLE `security_campaigns` ADD COLUMN `specialist_dispatched_at` text;
--> statement-breakpoint
CREATE INDEX `security_campaigns_specialist_due_idx` ON `security_campaigns` (`specialist_status`, `status`, `updated_at`, `id`);

ALTER TABLE `security_agent_scopes` ADD COLUMN `authorization_basis` text DEFAULT 'dns_control' NOT NULL;
--> statement-breakpoint
ALTER TABLE `security_agent_scopes` ADD COLUMN `authorization_attested_at` text;
--> statement-breakpoint
ALTER TABLE `security_agent_scopes` ADD COLUMN `authorization_expires_at` text;
--> statement-breakpoint
ALTER TABLE `security_agent_scopes` ADD COLUMN `authorization_version` text DEFAULT '2026-09-04.v1' NOT NULL;
--> statement-breakpoint
UPDATE `security_agent_scopes`
SET `authorization_attested_at` = COALESCE(`authorization_attested_at`, `created_at`),
    `authorization_expires_at` = COALESCE(`authorization_expires_at`, datetime('now', '+90 days'))
WHERE `status` <> 'revoked';
--> statement-breakpoint
ALTER TABLE `security_agent_jobs` ADD COLUMN `requested_by_user_id` integer;
--> statement-breakpoint
ALTER TABLE `security_agent_jobs` ADD COLUMN `queued_at` text;
--> statement-breakpoint
ALTER TABLE `security_agent_jobs` ADD COLUMN `dispatched_at` text;
--> statement-breakpoint
ALTER TABLE `security_agent_jobs` ADD COLUMN `attempt_count` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `security_agent_jobs` ADD COLUMN `lease_expires_at` text;
--> statement-breakpoint
CREATE INDEX `security_agent_jobs_queue_idx` ON `security_agent_jobs` (`status`,`dispatched_at`,`queued_at`,`id`);

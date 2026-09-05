ALTER TABLE `security_agent_jobs` ADD COLUMN `primary_model` text;
--> statement-breakpoint
ALTER TABLE `security_agent_jobs` ADD COLUMN `review_model` text;
--> statement-breakpoint
ALTER TABLE `security_agent_jobs` ADD COLUMN `review_reason` text;
--> statement-breakpoint
ALTER TABLE `security_agent_jobs` ADD COLUMN `provider_usage_json` text DEFAULT '{}' NOT NULL;

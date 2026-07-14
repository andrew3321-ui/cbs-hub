ALTER TABLE `scenarios` ADD `request_key` text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `scenarios_request_key_idx` ON `scenarios` (`request_key`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `scenarios_company_created_idx` ON `scenarios` (`company_id`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `audit_events_owner_company_created_idx` ON `audit_events` (`owner_user_id`,`company_id`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `companies_owner_name_idx` ON `companies` (`owner_user_id`,`name`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `report_shares_owner_company_created_idx` ON `report_shares` (`owner_user_id`,`company_id`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `report_shares_scenario_owner_idx` ON `report_shares` (`scenario_id`,`owner_user_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `sessions_user_expires_idx` ON `sessions` (`user_id`,`expires_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `sessions_expires_at_idx` ON `sessions` (`expires_at`);

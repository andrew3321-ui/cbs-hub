ALTER TABLE `security_defense_connectors` ADD `write_credential_ciphertext` text;
--> statement-breakpoint
ALTER TABLE `security_defense_connectors` ADD `write_credential_iv` text;
--> statement-breakpoint
ALTER TABLE `security_defense_connectors` ADD `write_capabilities_json` text DEFAULT '{}' NOT NULL;
--> statement-breakpoint
ALTER TABLE `security_defense_connectors` ADD `write_last_health_at` text;
--> statement-breakpoint
ALTER TABLE `security_defense_connectors` ADD `write_last_error_code` text;
--> statement-breakpoint
ALTER TABLE `security_defense_change_proposals` ADD `base_fingerprint` text;
--> statement-breakpoint
ALTER TABLE `security_defense_change_proposals` ADD `approval_expires_at` text;
--> statement-breakpoint
ALTER TABLE `security_defense_change_proposals` ADD `external_ruleset_id` text;
--> statement-breakpoint
ALTER TABLE `security_defense_change_proposals` ADD `external_rule_id` text;
--> statement-breakpoint
ALTER TABLE `security_defense_change_proposals` ADD `apply_error_code` text;
--> statement-breakpoint
CREATE INDEX `security_defense_proposals_approval_expiry_idx` ON `security_defense_change_proposals` (`status`,`approval_expires_at`,`id`);

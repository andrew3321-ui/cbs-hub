PRAGMA defer_foreign_keys=ON;
--> statement-breakpoint
CREATE TABLE `security_defense_connectors_next` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` integer NOT NULL,
	`scope_id` text NOT NULL,
	`provider` text DEFAULT 'signed_webhook' NOT NULL CHECK (`provider` IN ('signed_webhook','cloudflare')),
	`mode` text DEFAULT 'observe' NOT NULL CHECK (`mode` IN ('observe','protect')),
	`enforcement` text DEFAULT 'observe_only' NOT NULL CHECK (`enforcement` IN ('observe_only','cbshub_edge')),
	`status` text DEFAULT 'active' NOT NULL CHECK (`status` IN ('active','paused','revoked','error')),
	`key_salt` text NOT NULL,
	`credential_ciphertext` text,
	`credential_iv` text,
	`external_account_id` text,
	`external_zone_id` text,
	`capabilities_json` text DEFAULT '{}' NOT NULL,
	`last_health_at` text,
	`last_error_code` text,
	`last_signal_at` text,
	`created_by_user_id` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
INSERT INTO `security_defense_connectors_next`
  (`id`,`workspace_id`,`scope_id`,`provider`,`mode`,`enforcement`,`status`,`key_salt`,`last_signal_at`,`created_by_user_id`,`created_at`,`updated_at`)
SELECT `id`,`workspace_id`,`scope_id`,`provider`,`mode`,`enforcement`,`status`,`key_salt`,`last_signal_at`,`created_by_user_id`,`created_at`,`updated_at`
FROM `security_defense_connectors`;
--> statement-breakpoint
DROP TABLE `security_defense_connectors`;
--> statement-breakpoint
ALTER TABLE `security_defense_connectors_next` RENAME TO `security_defense_connectors`;
--> statement-breakpoint
CREATE UNIQUE INDEX `security_defense_connectors_scope_provider_idx` ON `security_defense_connectors` (`scope_id`,`provider`);
--> statement-breakpoint
CREATE INDEX `security_defense_connectors_workspace_status_idx` ON `security_defense_connectors` (`workspace_id`,`status`,`updated_at`,`id`);


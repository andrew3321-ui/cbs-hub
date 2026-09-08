ALTER TABLE `security_defense_connectors` ADD `sync_cursor_at` text;
--> statement-breakpoint
ALTER TABLE `security_defense_connectors` ADD `last_sync_at` text;
--> statement-breakpoint
ALTER TABLE `security_defense_connectors` ADD `next_sync_at` text;
--> statement-breakpoint
ALTER TABLE `security_defense_connectors` ADD `sync_lease_until` text;
--> statement-breakpoint
ALTER TABLE `security_defense_connectors` ADD `events_ingested_total` integer DEFAULT 0 NOT NULL CHECK (`events_ingested_total` >= 0);
--> statement-breakpoint
CREATE INDEX `security_defense_connectors_sync_due_idx` ON `security_defense_connectors` (`provider`,`status`,`next_sync_at`,`sync_lease_until`);
